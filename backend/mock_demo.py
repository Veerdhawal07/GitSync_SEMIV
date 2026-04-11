import asyncio
from backend.database.connection import AsyncSessionLocal
from backend.models.schema import Repository, Conflict
from sqlalchemy import select
import os

async def mock_demo():
    async with AsyncSessionLocal() as db:
        repo = (await db.execute(select(Repository).where(Repository.repo_name == 'demo'))).scalars().first()
        if not repo:
            print('Repo demo not found!')
            return
            
        c = Conflict(
            repository_id=repo.id,
            file_path='src/components/Button.tsx',
            conflict_diff='''<<<<<<< HEAD
export const Button = () => <button className="bg-blue-500">Click</button>;
=======
export const Button = () => <button className="btn-primary">Click Here</button>;
>>>>>>> feature-branch''',
            resolved=False
        )
        db.add(c)
        await db.commit()
        print('Conflict injected for demo!')
        
if __name__ == '__main__':
    asyncio.run(mock_demo())
