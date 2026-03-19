// --- IoT Car WebSocket Controls ---
const ws = new WebSocket(`ws://${location.host}/ws/car`);

// --- Log System ---
const logContainer = document.getElementById('log-container');
const MAX_LOG_ENTRIES = 5;

const CMD_LABELS = {
    'F': 'Forward',
    'B': 'Backward',
    'L': 'Turn Left',
    'R': 'Turn Right',
    'S': 'Stop',
    'C': 'Head Left',
    'D': 'Head Right',
    '1': 'Auto Turn',
    'V': 'Auto ON',
    'v': 'Auto OFF',
    'I': 'LED Toggle',
};

function getTimeStr() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function addLog(cmd, type = 'cmd') {
    const entry = document.createElement('div');
    entry.className = `log-entry${type === 'info' ? ' log-info' : type === 'error' ? ' log-error' : ''}`;

    if (type === 'cmd') {
        const label = CMD_LABELS[cmd] || cmd;
        entry.innerHTML = `<span class="log-time">${getTimeStr()}</span><span class="log-cmd">[${cmd}]</span> ${label}`;
    } else {
        entry.innerHTML = `<span class="log-time">${getTimeStr()}</span>${cmd}`;
    }

    logContainer.appendChild(entry);

    // Trim old entries
    while (logContainer.children.length > MAX_LOG_ENTRIES) {
        logContainer.removeChild(logContainer.firstChild);
    }

    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- UI Status Updater ---
function updateStatusUI(status) {
    // Update Head Degree
    const headContainer = document.getElementById('val-head-container');
    const headTurret = document.getElementById('val-head-turret');
    const headText = document.getElementById('val-head-text');
    if (status.head !== undefined) {
        headText.textContent = status.head + '°';
        // Map ESP servo degree to CSS rotation. 
        // 90 - status.head -> Inverted logical degree mapped to CSS (90=M, 0=L/R flipped, 180=L/R flipped)
        const cssRot = 90 - status.head;
        headTurret.style.transform = `rotate(${cssRot}deg)`;
        headContainer.classList.remove('blur-val');
    }

    // Update Distance
    const distEl = document.getElementById('val-dist');
    if (status.dist !== undefined) {
        distEl.textContent = typeof status.dist === 'number' ? status.dist.toFixed(1) : status.dist;
        distEl.classList.remove('blur-val');
        
        // Color code distance (closer = redder)
        if (typeof status.dist === 'number') {
            if (status.dist < 15) distEl.style.color = '#ff6b6b';      // Danger: Too close (Red)
            else if (status.dist < 40) distEl.style.color = '#f1c40f'; // Warning: Getting close (Yellow)
            else distEl.style.color = '#00ff88';                       // Safe: Far away (Green)
        }
    }

    // Update Mode
    const modeEl = document.getElementById('val-mode');
    if (status.auto !== undefined) {
        modeEl.textContent = status.auto ? 'Auto' : 'Manual';
        modeEl.classList.remove('blur-val');
        if (status.auto) {
            modeEl.style.color = '#00ff88';
        } else {
            modeEl.style.color = '#c9d1d9';
        }
    }
}

// --- Fetch Initial Status ---
fetch('/api/status')
    .then(res => res.json())
    .then(status => updateStatusUI(status))
    .catch(err => console.error("Initial status err:", err));

// --- Status handling now moved to WebSocket ---

// --- Ping System ---
let pingStart = 0;
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        pingStart = Date.now();
        ws.send('PING\n');
    }
}, 2000);

// --- WebSocket ---
ws.onopen = () => {
    console.log("🔌 Connected to IoT Car WebSocket!");
    addLog('WebSocket connected', 'info');
    document.getElementById('conn-indicator').style.backgroundColor = '#00ff88';
    document.getElementById('conn-indicator').style.boxShadow = '0 0 10px #00ff88';
};
ws.onerror = (err) => {
    console.error("WebSocket Error:", err);
    addLog('WebSocket error!', 'error');
};
ws.onclose = () => {
    addLog('WebSocket disconnected', 'error');
    document.getElementById('conn-indicator').style.backgroundColor = '#ff6b6b';
    document.getElementById('conn-indicator').style.boxShadow = '0 0 10px #ff6b6b';
    
    // Blur values on disconnect
    document.getElementById('val-dist').classList.add('blur-val');
    document.getElementById('val-mode').classList.add('blur-val');
    document.getElementById('val-head-container')?.classList.add('blur-val');
    document.getElementById('val-ping')?.classList.add('blur-val');
};

ws.onmessage = (event) => {
    const data = event.data.trim();
    
    if (data === "PONG") {
        const ping = Date.now() - pingStart;
        const pingEl = document.getElementById('val-ping');
        if (pingEl) {
            pingEl.textContent = ping;
            pingEl.classList.remove('blur-val');
            // Colors: Green for good, yellow for fair, red for bad ping
            if (ping < 50) pingEl.style.color = '#00ff88';
            else if (ping < 150) pingEl.style.color = '#f1c40f';
            else pingEl.style.color = '#ff6b6b';
        }
        return;
    }
    
    // Check if it's a JSON status update
    if (data.startsWith('{') && data.endsWith('}')) {
        try {
            const status = JSON.parse(data);
            updateStatusUI(status);
            return; // Exit after processing status so it doesn't log
        } catch (e) {
            console.error("Failed to parse status JSON:", e);
        }
    }
    
    // Otherwise it's a command echo, we can just log it or ignore it.
    // Kept ignored for now to keep log clean.
};

function sendCommand(cmd) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(cmd + '\n');
        addLog(cmd);
    }
}

// --- Continuous Hold (for movement buttons) ---
let commandInterval = null;
let activeCommand = null;

function startCommand(cmd) {
    if (activeCommand === cmd) return;
    stopCommand(false);

    activeCommand = cmd;
    sendCommand(cmd);
    commandInterval = setInterval(() => sendCommand(cmd), 100);
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

// --- Movement D-Pad (hold to repeat) ---
const holdButtons = ['btn-up', 'btn-down', 'btn-left', 'btn-right', 'btn-stop', 'btn-head-left', 'btn-head-right'];

holdButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const cmd = btn.dataset.cmd;

    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (cmd === 'S') {
            stopCommand();
        } else {
            startCommand(cmd);
        }
    });

    btn.addEventListener('pointerup', () => {
        btn.classList.remove('active');
        if (cmd !== 'S') stopCommand();
    });
    btn.addEventListener('pointerleave', () => {
        btn.classList.remove('active');
        if (cmd !== 'S') stopCommand();
    });
    btn.addEventListener('pointercancel', () => {
        btn.classList.remove('active');
        if (cmd !== 'S') stopCommand();
    });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

// --- Action Buttons (single press) ---
const actionButtons = ['btn-auto-turn', 'btn-auto-on', 'btn-auto-off', 'btn-led'];

actionButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const cmd = btn.dataset.cmd;

    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        sendCommand(cmd);
    });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

// --- Keyboard Controls ---
const KEY_MAP = {
    'w': 'F', 'W': 'F',
    'a': 'L', 'A': 'L',
    's': 'B', 'S': 'B',
    'd': 'R', 'D': 'R',
    'c': 'C',
    'e': 'D',
    '1': '1',
    'i': 'I',
    'I': 'I',
};

const keysDown = new Set();

document.addEventListener('keydown', (e) => {
    if (keysDown.has(e.key)) return;
    keysDown.add(e.key);

    const cmd = KEY_MAP[e.key];
    if (cmd) {
        if (['F', 'B', 'L', 'R', 'C', 'D'].includes(cmd)) {
            startCommand(cmd);
        } else {
            sendCommand(cmd);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keysDown.delete(e.key);
    const cmd = KEY_MAP[e.key];
    if (cmd && ['F', 'B', 'L', 'R', 'C', 'D'].includes(cmd)) {
        stopCommand();
    }
});

// --- Clear Log ---
document.getElementById('btn-clear-log')?.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLog('Log cleared', 'info');
});
