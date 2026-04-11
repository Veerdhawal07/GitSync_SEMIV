from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Ensure the parent directory is in the Python path so 'from backend...' imports work regardless of CWD.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.database.connection import engine, Base
from backend.api import repos, webhooks, conflicts
from backend.websocket.manager import manager

app = FastAPI(title="GitSync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repos.router, prefix="/repos", tags=["Repositories"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(conflicts.router, prefix="/conflicts", tags=["Conflicts"])

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)

@app.websocket("/ws/repo/{repo_id}")
async def websocket_endpoint(websocket: WebSocket, repo_id: int):
    await manager.connect(websocket, repo_id)
    try:
        while True:
            # Just keep connection alive and allow arbitrary client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, repo_id)

@app.get("/")
def root():
    return {"message": "GitSync Backend is running"}
