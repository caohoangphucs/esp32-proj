function sendCommand(cmd) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Send plain character without newline to match ESP32 switch-case
        ws.send(cmd);
        console.log(`📤 Sent Command: ${cmd}`);
    }
}

// Global variable for WebSocket to allow access in reconnection
let ws = null;

function connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${wsProtocol}//${location.host}/ws/car`);

    ws.onopen = () => {
        console.log("🔌 Connected to IoT Car WebSocket!");
        document.querySelector('.status-indicator')?.classList.add('online');
    };

    ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
    };

    ws.onclose = (event) => {
        console.warn("🔌 WebSocket closed. Retrying in 2s...", event);
        document.querySelector('.status-indicator')?.classList.remove('online');
        setTimeout(connectWebSocket, 2000);
    };

    ws.onmessage = (msg) => {
        console.log("📥 Received from Server:", msg.data);
    };
}

// Initial connection
connectWebSocket();

let commandInterval = null;
let activeCommand = null;

function startCommand(cmd) {
    if (activeCommand === cmd) return; // Prevent double trigger
    stopCommand(false); // Clear previous if sliding finger between buttons
    
    activeCommand = cmd;
    sendCommand(cmd); // Send initially
    commandInterval = setInterval(() => sendCommand(cmd), 100); // Repeat while held
}

function stopCommand(shouldSendStop = true) {
    if (commandInterval) {
        clearInterval(commandInterval);
        commandInterval = null;
    }
    if (activeCommand) {
        activeCommand = null;
        if (shouldSendStop) sendCommand('S');
    }
}

const btnUp = document.getElementById('btn-up');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');

if (btnUp && btnDown && btnLeft && btnRight) {
    // Pointerdown to start holding command
    btnUp.addEventListener('pointerdown', () => startCommand('F'));
    btnDown.addEventListener('pointerdown', () => startCommand('B'));
    btnLeft.addEventListener('pointerdown', () => startCommand('L'));
    btnRight.addEventListener('pointerdown', () => startCommand('R'));

    // Send Stop when releasing or dragging off the button
    [btnUp, btnDown, btnLeft, btnRight].forEach(btn => {
        btn.addEventListener('pointerup', () => stopCommand());
        btn.addEventListener('pointerleave', () => stopCommand());
        btn.addEventListener('pointercancel', () => stopCommand()); // Fallback for mobile touch cancel
        
        // Prevent default browser behaviors like right-click menus on long press
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
}

// Keyboard Support - W/A/S/D keys
const keyMap = { 'w': 'F', 'a': 'L', 's': 'B', 'd': 'R' };
const keysHeld = {};

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key] && !keysHeld[key]) {
        keysHeld[key] = true;
        console.log(`⌨️ Key down: ${key} -> ${keyMap[key]}`);
        startCommand(keyMap[key]);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
        keysHeld[key] = false;
        if (!Object.values(keysHeld).some(v => v)) {
            stopCommand();
        }
    }
});
