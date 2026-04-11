from fastapi import Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database.connection import get_db
from backend.models.schema import User

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # First, get from headers
    supabase_user_id = request.headers.get("x-supabase-user-id")
    
    if not supabase_user_id:
        # Fallback for MVP if not provided: user ID 1
        return await _get_or_create_fallback_user(db)
        
    # Check if user exists with this github_id (treating supabase_user_id as github_id for now)
    stmt = select(User).where(User.github_id == supabase_user_id)
    user = (await db.execute(stmt)).scalars().first()
    
    if not user:
        # Create user if missing
        email = request.headers.get("x-supabase-user-email", f"{supabase_user_id}@gitsync.com")
        username = request.headers.get("x-github-username", "github_user")
        
        user = User(
            github_id=supabase_user_id,
            email=email,
            github_username=username
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except Exception:
            await db.rollback()
            # If concurrent creation happened, try fetching again
            stmt = select(User).where(User.github_id == supabase_user_id)
            user = (await db.execute(stmt)).scalars().first()
            if not user:
                raise HTTPException(status_code=500, detail="Could not create user")
                
    return user

async def _get_or_create_fallback_user(db: AsyncSession) -> User:
    stmt = select(User).where(User.id == 1)
    user = (await db.execute(stmt)).scalars().first()
    if not user:
        user = User(id=1, email="test@gitsync.com", github_username="testuser", github_id="fallback")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
