// --- IoT Car WebSocket Controls ---
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//${location.host}/ws/car`);

ws.onopen = () => console.log("🔌 Connected to IoT Car WebSocket!");
ws.onerror = (err) => console.error("WebSocket Error:", err);
ws.onclose = (event) => console.warn("🔌 WebSocket closed:", event);
async function sendCommand(cmd) {
    try {
        await fetch(`/command?cmd=${cmd}`, { method: 'POST' });
        console.log(`📤 Queued Command: ${cmd}`);
    } catch (err) {
        console.error("Failed to queue command:", err);
    }
}

let commandInterval = null;
let activeCommand = null;

function startCommand(cmd) {
    if (activeCommand === cmd) return;
    activeCommand = cmd;
    sendCommand(cmd);
}

function stopCommand(cmd) {
    // If a specific cmd is provided, only stop if it matches the active command
    // Otherwise (like for buttons), always stop if there's any active command
    if (activeCommand && (!cmd || activeCommand === cmd)) {
        activeCommand = null;
        sendCommand('S');
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
    const cmd = keyMap[key];
    if (cmd) {
        keysHeld[key] = false;
        stopCommand(cmd);
        
        // Resume if another key is still held
        for (const k in keysHeld) {
            if (keysHeld[k]) {
                startCommand(keyMap[k]);
                break;
            }
        }
    }
});

// --- Queue Debug Display ---
async function updateQueueDisplay() {
    try {
        const response = await fetch('/api/queue');
        const data = await response.json();
        
        const sizeEl = document.getElementById('queue-size');
        const commandsEl = document.getElementById('queue-commands');
        
        if (sizeEl && commandsEl) {
            sizeEl.textContent = data.queue_size;
            
            if (data.queue_size === 0) {
                commandsEl.textContent = '(empty)';
            } else {
                commandsEl.innerHTML = data.commands
                    .map(cmd => `<div style="padding: 4px 0;">→ ${cmd}</div>`)
                    .join('');
            }
        }
    } catch (error) {
        console.error("Failed to fetch queue status:", error);
    }
}

// Update queue display every 500ms
setInterval(updateQueueDisplay, 500);
