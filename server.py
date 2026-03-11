import os
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Dict, Optional

# Global state to store the latest location
current_location: Dict[str, Optional[float]] = {"lat": None, "lng": None}

app = FastAPI(title="ESP32 Map Auto-Sync Server (FastAPI)")

# Allow ESP32 and other origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel

class LocationUpdate(BaseModel):
    lat: float
    lng: float

@app.get("/api/location")
async def get_location():
    return current_location

@app.post("/api/location")
async def update_location(location: LocationUpdate):
    try:
        lat = location.lat
        lng = location.lng

        # We know lat and lng are present because Pydantic enforces it as required fields now
        current_location['lat'] = float(lat)
        current_location['lng'] = float(lng)
        print(f"📍 New Location Received: {lat}, {lng}")
        return {"status": "success", "message": "Location updated"}
    except Exception as e:
        return JSONResponse(
            status_code=400, 
            content={"status": "error", "message": f"Bad Request: {str(e)}"}
        )

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/car")
async def websocket_car_endpoint(websocket: WebSocket):
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
    print("🚀 FastAPI Auto-sync Map Server is running!")
    print("🌐 View the map at: http://localhost:8000")
    print("📡 Update location by sending POST /api/location")
    uvicorn.run("server:app", host="0.0.0.0", port=8000)
