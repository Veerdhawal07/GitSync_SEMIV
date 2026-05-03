from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.models.schema import Repository, User
from backend.api.deps import get_current_user

router = APIRouter()

class RepoConnectRequest(BaseModel):
    repo_name: str
    github_repo_id: str
    clone_url: str

@router.get("/")
async def list_repositories(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Repository).where(Repository.owner_id == current_user.id)
    repos = (await db.execute(stmt)).scalars().all()
    return {"repositories": repos}

@router.post("/connect")
async def connect_repository(req: RepoConnectRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(Repository).where(Repository.github_repo_id == req.github_repo_id)
    exists = (await db.execute(stmt)).scalars().first()
    if exists:
        raise HTTPException(status_code=400, detail="Repository already connected")
        
    repo = Repository(
        owner_id=current_user.id,
        repo_name=req.repo_name,
        github_repo_id=req.github_repo_id,
        clone_url=req.clone_url,
        webhook_status=True
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
from backend.services.git_engine import GitEngine
from backend.services.ai_service import generate_repo_uml
import os

git_engine = GitEngine()

@router.post("/{repo_id}/generate-uml")
async def get_repo_uml(repo_id: int, type: str = "Class", db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify ownership
    stmt = select(Repository).where(Repository.id == repo_id, Repository.owner_id == current_user.id)
    repo = (await db.execute(stmt)).scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        # Clone repo to analyze
        repo_path = git_engine.clone_repo(repo.clone_url, repo.repo_name)
        
        # Get file structure (simple tree)
        file_tree = []
        for root, dirs, files in os.walk(repo_path):
            if ".git" in dirs:
                dirs.remove(".git")
            level = root.replace(repo_path, '').count(os.sep)
            indent = ' ' * 4 * level
            file_tree.append(f"{indent}{os.path.basename(root)}/")
            sub_indent = ' ' * 4 * (level + 1)
            for f in files[:10]: # Limit files per dir for prompt length
                file_tree.append(f"{sub_indent}{f}")
        
        structure_str = "\n".join(file_tree[:100]) # Limit overall lines
        
        # Call AI service with specific type
        uml_result = await generate_repo_uml(repo.repo_name, structure_str, uml_type=type)
        return uml_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
