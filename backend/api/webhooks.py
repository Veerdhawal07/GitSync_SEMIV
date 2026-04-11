import hmac
import hashlib
import os
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.connection import get_db
from backend.models.schema import WebhookEvent, Repository
from backend.workers.merge_worker import process_push_event

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
        # Ensure we capture standard full_name user/repo format
        repo_name = payload.get("repository", {}).get("name")
        full_name = payload.get("repository", {}).get("full_name")
        branch = payload.get("ref", "").split("/")[-1]
        
        print(f"Webhook received: {event_type} for {full_name}")
        ngrok_url = os.getenv("NGROK_URL", "<YOUR_NGROK_URL>")
        print(f"Webhook URL for GitHub: {ngrok_url}/webhooks/github")
        
        stmt = select(Repository).where(Repository.repo_name == full_name)
        repo = (await db.execute(stmt)).scalars().first()
        
        if repo:
            import json
            event = WebhookEvent(repository_id=repo.id, payload=json.dumps(payload), status="received")
            db.add(event)
            await db.commit()
            
            # Queue background worker without DB session to avoid detached instances or concurrency errors
            background_tasks.add_task(process_push_event, repo.id, branch, payload)
            
            return {"status": "accepted", "message": "Push event queued for processing"}
            
    return {"status": "ignored", "message": "Event not handled"}
