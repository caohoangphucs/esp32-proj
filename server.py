import os
from fastapi import FastAPI, Request

from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Dict, Optional
from collections import deque
import asyncio

app = FastAPI(title="ESP32 Car Controller Server (FastAPI)")

# Allow ESP32 and other origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandQueue:
    def __init__(self, max_size=100):
        self.queue: deque = deque(maxlen=max_size)
        self.lock = asyncio.Lock()

    async def add_command(self, command: str):
        """Add command to queue"""
        async with self.lock:
            self.queue.append(command.strip())
            print(f"📥 Command added to queue: {command.strip()} (Queue size: {len(self.queue)})")

    async def get_commands(self) -> list[str]:
        """Get all commands from queue and clear it"""
        async with self.lock:
            commands = list(self.queue)
            self.queue.clear()
            return commands

    async def get_command_count(self) -> int:
        """Get current queue size"""
        async with self.lock:
            return len(self.queue)

    async def peek_queue(self) -> dict:
        """Peek at queue without clearing it - for debug display"""
        async with self.lock:
            return {
                "size": len(self.queue),
                "commands": list(self.queue)
            }

command_queue = CommandQueue()

@app.get("/api/docs")
async def api_docs():
    """
    Car Command Polling API Documentation
    
    **Endpoint**: `GET /command`
    
    **POST Command**: `POST /command` - Submit commands (F/B/L/R/S)
    
    **Description**: Polling-based system. Commands are queued on the server.
    Clients poll the `/command` endpoint to retrieve pending commands.
    
    **Commands**:
    - `F`: Move forward
    - `B`: Move backward
    - `L`: Turn left
    - `R`: Turn right
    - `S`: Stop
    
    **Workflow**:
    1. Frontend sends command via POST /command?cmd=F
    2. Command gets added to queue
    3. ESP32/client polls GET /command
    4. Server returns all pending commands
    5. Queue is cleared after polling
    """
    return {
        "polling_endpoint": "GET /command",
        "submit_endpoint": "POST /command?cmd=F",
        "description": "Polling-based command queue system",
        "commands": ["F (Forward)", "B (Backward)", "L (Left)", "R (Right)", "S (Stop)"]
    }

@app.get("/command")
async def get_commands():
    """Poll for pending commands - returns all queued commands and clears queue"""
    commands = await command_queue.get_commands()
    queue_size = await command_queue.get_command_count()
    print(f"📤 Commands polled: {commands} (Queue now has {queue_size} items)")
    return {"commands": commands}

@app.post("/command")
async def post_command(cmd: str):
    """Submit a command to the queue"""
    if not cmd or len(cmd) > 1:
        return {"status": "error", "message": "Command must be a single character"}
    
    await command_queue.add_command(cmd)
    return {"status": "success", "message": f"Command '{cmd}' queued"}

@app.get("/api/queue")
async def get_queue_status():
    """Get current queue status for debugging"""
    queue_info = await command_queue.peek_queue()
    return {
        "status": "ok",
        "queue_size": queue_info["size"],
        "commands": queue_info["commands"]
    }



# Serve static files
current_dir = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
async def root():
    """Serve index.html"""
    return FileResponse(os.path.join(current_dir, "index.html"), media_type="text/html")

@app.get("/style.css")
async def get_style():
    """Serve CSS"""
    return FileResponse(os.path.join(current_dir, "style.css"), media_type="text/css")

@app.get("/script.js")
async def get_script():
    """Serve JavaScript"""
    return FileResponse(os.path.join(current_dir, "script.js"), media_type="application/javascript")

# Fallback for any other static files
app.mount("/static", StaticFiles(directory=current_dir), name="static")

if __name__ == '__main__':
    print("🚀 FastAPI Car Controller Server is running!")
    print("🌐 View controller at: http://localhost:5678")
    print("🎮 Use car controls to send commands")
    uvicorn.run("server:app", host="0.0.0.0", port=5678)
