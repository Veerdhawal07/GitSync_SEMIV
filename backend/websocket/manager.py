from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # repo_id -> list of active connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, repo_id: int):
        await websocket.accept()
        if repo_id not in self.active_connections:
            self.active_connections[repo_id] = []
        self.active_connections[repo_id].append(websocket)

    def disconnect(self, websocket: WebSocket, repo_id: int):
        if repo_id in self.active_connections:
            try:
                self.active_connections[repo_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[repo_id]:
                del self.active_connections[repo_id]

    async def broadcast_to_repo(self, repo_id: int, message: dict):
        if repo_id in self.active_connections:
            for connection in self.active_connections[repo_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending ws message: {e}")

manager = ConnectionManager()
