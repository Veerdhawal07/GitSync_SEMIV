import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.services.git_engine import GitEngine
from sqlalchemy.orm import selectinload
import urllib.request
import json
from backend.services.git_engine import GitEngine
from backend.models.schema import Repository, User
# Let's import properly

from backend.models.schema import MergeOperation, Conflict
from backend.websocket.manager import manager

from backend.database.connection import AsyncSessionLocal

git_engine = GitEngine()

async def process_merge_event(repo_id: int, source_branch: str, target_branch: str, payload: dict):
    """
    Background worker that fetches code, checks if branches differ,
    and attempts to merge source_branch into target_branch.
    """
    async with AsyncSessionLocal() as db:
        stmt = select(Repository).options(selectinload(Repository.owner)).where(Repository.id == repo_id)
        result = await db.execute(stmt)
        repo = result.scalars().first()
        
        if not repo:
            print(f"Worker Error: Repository {repo_id} not found")
            return
            
        try:
            print(f"Starting merge check for {repo.repo_name}: {source_branch} -> {target_branch}")
            merge_op = MergeOperation(
                repository_id=repo.id, 
                source_branch=source_branch, 
                target_branch=target_branch, 
                status="started"
            )
            db.add(merge_op)
            await db.commit()
            await manager.broadcast_to_repo(repo.id, {
                "type": "MERGE_STARTED", 
                "source_branch": source_branch,
                "target_branch": target_branch
            })

            repo_path = git_engine.clone_repo(repo.clone_url, repo.repo_name, target_branch)
            # Ensure target branch is up to date
            git_engine.fetch_and_pull(repo_path, target_branch)
            
            if source_branch != target_branch:
                print(f"Attempting merge: {source_branch} into {target_branch}")
                res = git_engine.merge_branch(source_branch, target_branch, repo_path)
                
                if not res["success"]:
                    print(f"Conflict detected in {repo.repo_name} during merge of {source_branch} -> {target_branch}")
                    # Conflict occurred! Read files BEFORE aborting - state is still active
                    merge_op.status = "conflict"
                    conflicting_files = git_engine.get_conflicting_files(repo_path)
                    
                    for fpath in conflicting_files:
                        diff_content = git_engine.get_conflicted_file_content(repo_path, fpath)
                        # Sanitize null bytes (UTF-16 artifacts from Windows echo or binary files)
                        safe_diff = diff_content.replace('\x00', '')
                        
                        new_conflict = Conflict(
                            repository_id=repo.id,
                            file_path=fpath,
                            conflict_diff=safe_diff,
                            resolved=False
                        )
                        db.add(new_conflict)
                    
                    # Now safe to abort
                    git_engine.abort_merge(repo_path)
                    await db.commit()
                    
                    # Create an issue on GitHub if token exists
                    if repo.owner and repo.owner.github_token:
                        token = repo.owner.github_token
                        full_name = repo.clone_url.split('github.com/')[-1].replace('.git', '')
                        url = f"https://api.github.com/repos/{full_name}/issues"
                        headers = {
                            "Authorization": f"Bearer {token}",
                            "Accept": "application/vnd.github.v3+json",
                            "User-Agent": "GitSync-App"
                        }
                        issue_body = f"GitSync has detected a merge conflict while attempting to merge `{source_branch}` into `{target_branch}`.\n\n**Conflicting files:**\n" + "\n".join([f"- {f}" for f in conflicting_files])
                        data = {"title": f"Merge Conflict Detected: {source_branch} -> {target_branch}", "body": issue_body}
                        try:
                            import asyncio
                            def post_issue():
                                import urllib.request
                                import json
                                req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
                                with urllib.request.urlopen(req) as response:
                                    return response.read()
                            await asyncio.to_thread(post_issue)
                        except Exception as e:
                            print(f"Failed to create GitHub issue: {e}")
                            
                    await manager.broadcast_to_repo(repo.id, {
                        "type": "CONFLICT_DETECTED", 
                        "source_branch": source_branch,
                        "target_branch": target_branch
                    })
                    return

            print(f"Merge check successful for {repo.repo_name}: {source_branch} -> {target_branch}")
            merge_op.status = "success"
            await db.commit()
            await manager.broadcast_to_repo(repo.id, {
                "type": "MERGE_SUCCESS", 
                "source_branch": source_branch,
                "target_branch": target_branch
            })
            
        except Exception as e:
            print(f"Error in merge worker: {e}")
            traceback.print_exc()
            await db.rollback()
            try:
                merge_op.status = f"failed: {str(e)[:100]}"
                db.add(merge_op)
                await db.commit()
            except Exception as nested_e:
                print(f"Failed to save failed status: {nested_e}")
