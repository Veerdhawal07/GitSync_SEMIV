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
    return repo
