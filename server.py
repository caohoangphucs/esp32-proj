import os
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Dict, Optional

app = FastAPI(title="ESP32 Car Controller Server (FastAPI)")

# Allow ESP32 and other origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.command_history: list[str] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Send all previous commands to the newly connected client
        for command in self.command_history:
            try:
                await websocket.send_text(command)
            except:
                pass

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Add command to history
        self.command_history.append(message)
        
        # Broadcast to all connected clients
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/api/docs")
async def websocket_docs():
    """
    WebSocket Car Controller Documentation
    
    **WebSocket Endpoint**: `/ws/car`
    
    **Description**: Connect to receive all car commands. When a client connects, it receives 
    all previous commands from history, then receives new commands in real-time.
    
    **Commands**:
    - `F`: Move forward
    - `B`: Move backward
    - `L`: Turn left
    - `R`: Turn right
    - `S`: Stop
    
    **Message Format**: Plain text command strings (e.g., "F", "B", "L", "R", "S")
    
    **Example Connection**:
    ```
    ws://localhost:8000/ws/car
    ```
    
    **Behavior**:
    1. On connection: Client receives all previously sent commands
    2. During session: Client receives new commands as they arrive
    3. On disconnect: Client is removed from active connections
    """
    return {
        "endpoint": "/ws/car",
        "description": "WebSocket endpoint for car commands",
        "protocol": "ws://",
        "commands": ["F (Forward)", "B (Backward)", "L (Left)", "R (Right)", "S (Stop)"]
    }

@app.websocket("/ws/car")
async def websocket_car_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for ESP32 car commands.
    
    Connects to receive all car control commands. On connection,
    the client receives all previously sent commands, then receives
    new commands in real-time as other clients send them.
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"🎮 Car Command Received: {data.strip()}")
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("🔌 A WebSocket client disconnected.")

# Serve the static files (index.html, style.css, script.js)
current_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/", StaticFiles(directory=current_dir, html=True), name="static")

if __name__ == '__main__':
    print("🚀 FastAPI Car Controller Server is running!")
    print("🌐 View controller at: http://localhost:5678")
    print("🎮 Use car controls to send commands")
    uvicorn.run("server:app", host="0.0.0.0", port=5678)
