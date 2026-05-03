import hmac
import hashlib
import os
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.connection import get_db
from backend.models.schema import WebhookEvent, Repository
from backend.workers.merge_worker import process_merge_event

router = APIRouter()

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    if not signature_header:
        return False
    hash_object = hmac.new(GITHUB_WEBHOOK_SECRET.encode('utf-8'), msg=payload_body, digestmod=hashlib.sha256)
    expected_signature = "sha256=" + hash_object.hexdigest()
    return hmac.compare_digest(expected_signature, signature_header)

@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    payload_body = await request.body()
    signature = request.headers.get("x-hub-signature-256")

    if GITHUB_WEBHOOK_SECRET and not verify_signature(payload_body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    event_type = request.headers.get("X-GitHub-Event")
    payload = await request.json()
    if event_type == "push":
        repo_name = payload.get("repository", {}).get("name")
        full_name = payload.get("repository", {}).get("full_name")
        source_branch = payload.get("ref", "").split("/")[-1]
        default_branch = payload.get("repository", {}).get("default_branch", "main")
        github_repo_id = str(payload.get("repository", {}).get("id", ""))
        
        print(f"Webhook received: {event_type} for {full_name} ({source_branch})")
        
        from sqlalchemy.orm import selectinload
        stmt = select(Repository).options(selectinload(Repository.owner)).where(
            (Repository.github_repo_id == github_repo_id) | 
            (Repository.repo_name == repo_name)
        )
        repo = (await db.execute(stmt)).scalars().first()
        
        if repo:
            import json
            import urllib.request
            event = WebhookEvent(repository_id=repo.id, payload=json.dumps(payload), status="received")
            db.add(event)
            await db.commit()
            
            # 1. Always check against default branch
            background_tasks.add_task(process_merge_event, repo.id, source_branch, default_branch, payload)
            
            # 2. Check for other target branches via open PRs
            if source_branch != default_branch and repo.owner and repo.owner.github_token:
                try:
                    # Fetch open PRs where this branch is the head
                    owner_name = full_name.split('/')[0]
                    url = f"https://api.github.com/repos/{full_name}/pulls?head={owner_name}:{source_branch}&state=open"
                    headers = {
                        "Authorization": f"Bearer {repo.owner.github_token}",
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "GitSync-App"
                    }
                    
                    async def fetch_prs_and_queue():
                        try:
                            import asyncio
                            def get_prs():
                                req = urllib.request.Request(url, headers=headers)
                                with urllib.request.urlopen(req) as response:
                                    return json.loads(response.read().decode())
                            
                            prs = await asyncio.to_thread(get_prs)
                            for pr in prs:
                                target = pr.get("base", {}).get("ref")
                                if target and target != default_branch:
                                    print(f"Found PR target: {source_branch} -> {target}. Queuing check.")
                                    # Call directly since we are already in a background task
                                    await process_merge_event(repo.id, source_branch, target, payload)
                        except Exception as e:
                            print(f"Failed to fetch extra PRs for multi-branch tracking: {e}")

                    background_tasks.add_task(fetch_prs_and_queue)
                    
                except Exception as e:
                    print(f"Error setting up multi-branch tracking: {e}")

            return {"status": "accepted", "message": f"Push event ({source_branch}) queued with PR tracking"}

    elif event_type == "pull_request":
        full_name = payload.get("repository", {}).get("full_name")
        action = payload.get("action")
        repo_name = payload.get("repository", {}).get("name")
        github_repo_id = str(payload.get("repository", {}).get("id", ""))
        
        if action in ["opened", "synchronize", "reopened"]:
            pr = payload.get("pull_request", {})
            source_branch = pr.get("head", {}).get("ref")
            target_branch = pr.get("base", {}).get("ref")
            
            print(f"Webhook received: pull_request ({action}) for {full_name} ({source_branch} -> {target_branch})")
            stmt = select(Repository).where(
                (Repository.github_repo_id == github_repo_id) | 
                (Repository.repo_name == repo_name)
            )
            repo = (await db.execute(stmt)).scalars().first()
            
            if repo and source_branch and target_branch:
                import json
                event = WebhookEvent(repository_id=repo.id, payload=json.dumps(payload), status="received")
                db.add(event)
                await db.commit()
                
                # Check for conflicts using PR branches
                background_tasks.add_task(process_merge_event, repo.id, source_branch, target_branch, payload)
                return {"status": "accepted", "message": f"PR event ({action}) queued"}

    return {"status": "ignored", "message": "Event not handled"}
