import asyncio
import websockets

async def test_car_connection():
    uri = "ws://localhost:5678/ws/car"
    print(f"📡 Connecting to simulating IoT Car at {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected! I am now acting as the ESP32.")
            print("👉 Go to your webpage http://localhost:6789 and click the Car Control D-Pad!")
            print("-" * 50)
            
            while True:
                # Wait to receive a command from the server
                command = await websocket.recv()
                print(f"🚗 ESP32 Received Command: {repr(command)}")
                
    except websockets.exceptions.ConnectionClosed:
        print("❌ Connection was closed by the server.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_car_connection())
    except KeyboardInterrupt:
        print("\n👋 Stopped listening.")
