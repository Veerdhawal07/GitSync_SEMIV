from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.models.schema import Conflict, Repository, User, MergeOperation
from backend.services.ai_service import ai_resolve_conflict
from backend.services.git_engine import GitEngine
from backend.api.deps import get_current_user

router = APIRouter()
git_engine = GitEngine()

class ApplyFixRequest(BaseModel):
    merged_code: str

@router.get("/{repo_id}")
async def list_conflicts(repo_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    stmt_repo = select(Repository).where(Repository.id == repo_id, Repository.owner_id == current_user.id)
    repo = (await db.execute(stmt_repo)).scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found or access denied")
        
    stmt = select(Conflict).where(Conflict.repository_id == repo_id, Conflict.resolved == False)
    result = await db.execute(stmt)
    conflicts = result.scalars().all()
    return {"conflicts": conflicts}

@router.post("/resolve/{conflict_id}")
async def suggest_resolution(conflict_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Conflict).where(Conflict.id == conflict_id)
    result = await db.execute(stmt)
    conflict = result.scalars().first()
    
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
        
    try:
        suggestion = await ai_resolve_conflict(conflict.file_path, conflict.conflict_diff)
        return {"suggestion": suggestion.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply/{conflict_id}")
async def apply_resolution(conflict_id: int, request: ApplyFixRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Conflict).where(Conflict.id == conflict_id)
    result = await db.execute(stmt)
    conflict = result.scalars().first()
    
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
        
    stmt_repo = select(Repository).where(Repository.id == conflict.repository_id)
    repo = (await db.execute(stmt_repo)).scalars().first()
    
    # Get the last merge operation to know which branches to use
    stmt_op = select(MergeOperation).where(
        MergeOperation.repository_id == repo.id, 
        MergeOperation.status == "conflict"
    ).order_by(MergeOperation.created_at.desc())
    op = (await db.execute(stmt_op)).scalars().first()
    
    source_branch = op.source_branch if op else "main"   # e.g. ultra-conflict-branch
    target_branch = op.target_branch if op else "main"   # e.g. main

    try:
        repo_path = git_engine.clone_repo(repo.clone_url, repo.repo_name)
        
        # Sync both branches cleanly
        git_engine.fetch_and_pull(repo_path, target_branch)
        git_engine.fetch_and_pull(repo_path, source_branch)
        
        # Recreate conflict: checkout source branch, merge target into it
        git_engine.checkout_branch(source_branch, repo_path)
        git_engine.merge_branch(target_branch, source_branch, repo_path)
        
        # Apply the AI resolution
        res = git_engine.apply_patch(conflict.file_path, request.merged_code, repo_path)
        if not res.get("success"):
            raise HTTPException(status_code=500, detail=f"Failed to apply patch: {res.get('error')}")
        
        # Commit and push the resolution
        commit_res = git_engine.commit_resolution(repo_path, message="Merge conflict resolved by GitSync AI")
        if not commit_res.get("success"):
            raise HTTPException(status_code=500, detail=f"Commit failed: {commit_res.get('error')}")
        
        push_res = git_engine.push_branch(source_branch, repo_path)
        if not push_res.get("success"):
            raise HTTPException(status_code=500, detail=f"Push failed: {push_res.get('error')}")

        # Mark conflict as resolved
        conflict.resolved = True
        if op:
            op.status = "resolved"
        await db.commit()

        return {"status": "success", "message": f"Conflict in {conflict.file_path} resolved and pushed to {source_branch}."}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apply resolution failed: {str(e)}")
