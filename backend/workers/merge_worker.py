import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.services.git_engine import GitEngine
from backend.models.schema import Repository

# Due to import issues, we will load MergeOperation, Conflict lazily or just write a basic schema string format for status updates
# Let's import properly

from backend.models.schema import MergeOperation, Conflict
from backend.websocket.manager import manager

from backend.database.connection import AsyncSessionLocal

git_engine = GitEngine()

async def process_push_event(repo_id: int, branch: str, payload: dict):
    """
    Background worker that fetches code, checks if branch is not main,
    and attempts to merge into main.
    """
    async with AsyncSessionLocal() as db:
        stmt = select(Repository).where(Repository.id == repo_id)
        result = await db.execute(stmt)
        repo = result.scalars().first()
        
        if not repo:
            return
            
        try:
            merge_op = MergeOperation(repo_id=repo.id, status="started")
            db.add(merge_op)
            await db.commit()
            await manager.broadcast_to_repo(repo.id, {"type": "MERGE_STARTED", "branch": branch})

            repo_path = git_engine.clone_repo(repo.clone_url, repo.repo_name)
            git_engine.fetch_and_pull(repo_path, "main")
            
            if branch != "main":
                res = git_engine.merge_branch(branch, "main", repo_path)
                
                if not res["success"]:
                    # Conflict occurred
                    merge_op.status = "conflict"
                    git_engine.abort_merge(repo_path)
                    
                    # reproduce conflict to get files
                    git_engine.merge_branch(branch, "main", repo_path) 
                    conflicting_files = git_engine.get_conflicting_files(repo_path)
                    
                    for fpath in conflicting_files:
                        diff_content = git_engine.get_conflicted_file_content(repo_path, fpath)
                        new_conflict = Conflict(
                            repository_id=repo.id,
                            file_path=fpath,
                            conflict_diff=diff_content,
                            resolved=False
                        )
                        db.add(new_conflict)
                        
                    git_engine.abort_merge(repo_path)
                    await db.commit()
                    
                    await manager.broadcast_to_repo(repo.id, {"type": "CONFLICT_DETECTED", "branch": branch})
                    return

            merge_op.status = "success"
            await db.commit()
            await manager.broadcast_to_repo(repo.id, {"type": "MERGE_SUCCESS", "branch": branch})
            
        except Exception as e:
            print(f"Error in merge worker: {e}")
            traceback.print_exc()
            merge_op.status = "failed"
            await db.commit()
