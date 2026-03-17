// --- IoT Car WebSocket Controls ---
const ws = new WebSocket(`ws://${location.host}/ws/car`);

ws.onopen = () => console.log("🔌 Connected to IoT Car WebSocket!");
ws.onerror = (err) => console.error("WebSocket Error:", err);

function sendCommand(cmd) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(cmd + '\n');
        console.log(`📤 Sent Command: ${cmd}`);
    }
}

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
