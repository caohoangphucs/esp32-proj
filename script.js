// --- IoT Car WebSocket Controls ---
const ws = new WebSocket(`ws://${location.host}/ws/car`);

// --- Log System ---
const logContainer = document.getElementById('log-container');
const MAX_LOG_ENTRIES = 80;

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

// --- WebSocket ---
ws.onopen = () => {
    console.log("🔌 Connected to IoT Car WebSocket!");
    addLog('WebSocket connected', 'info');
};
ws.onerror = (err) => {
    console.error("WebSocket Error:", err);
    addLog('WebSocket error!', 'error');
};
ws.onclose = () => {
    addLog('WebSocket disconnected', 'error');
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
const holdButtons = ['btn-up', 'btn-down', 'btn-left', 'btn-right', 'btn-stop'];

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
const actionButtons = ['btn-head-left', 'btn-head-right', 'btn-auto-turn', 'btn-auto-on', 'btn-auto-off'];

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
};

const keysDown = new Set();

document.addEventListener('keydown', (e) => {
    if (keysDown.has(e.key)) return;
    keysDown.add(e.key);

    const cmd = KEY_MAP[e.key];
    if (cmd) {
        if (['F', 'B', 'L', 'R'].includes(cmd)) {
            startCommand(cmd);
        } else {
            sendCommand(cmd);
        }
    }
});

document.addEventListener('keyup', (e) => {
    keysDown.delete(e.key);
    const cmd = KEY_MAP[e.key];
    if (cmd && ['F', 'B', 'L', 'R'].includes(cmd)) {
        stopCommand();
    }
});

// --- Clear Log ---
document.getElementById('btn-clear-log')?.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLog('Log cleared', 'info');
});
