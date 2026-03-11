// Default View: Global overview or a specific location (e.g., San Francisco)
const defaultLat = 37.7749;
const defaultLng = -122.4194;

// 1. Initialize the Leaflet Map
const map = L.map('map', {
    zoomControl: false // We will move the zoom control later
}).setView([15, 0], 2); // Start globally zoomed out

// 2. Add Satellite Base Map Layer (Esri World Imagery)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
}).addTo(map);

// Add zoom control back in at the bottom right
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// 3. Define the custom glowing dot marker
const customIcon = L.divIcon({
    className: 'custom-icon-wrapper',
    html: '<div class="custom-pin"></div>',
    iconSize: [20, 20], // Overall div size, not the inner dot
    iconAnchor: [10, 10], // Anchor to the center of the 20x20 div wrapper
    popupAnchor: [0, -15] // Open popup slightly above
});

// Variable to track the current active marker
let currentMarker = null;

// Function to handle moving the map and plotting the dot
function updateMapLocation(lat, lng) {
    if (currentMarker) {
        // Just move the existing marker
        currentMarker.setLatLng([lat, lng]);

        // Update the popup
        currentMarker.bindPopup(
            `<b>ESP32 Active Signal</b><br>
             <span style="color:#8b949e">Lat:</span> <span style="color:#fff">${lat.toFixed(6)}</span><br>
             <span style="color:#8b949e">Lng:</span> <span style="color:#fff">${lng.toFixed(6)}</span>`
        );

        // Check if the current map view already contains the marker
        if (!map.getBounds().contains([lat, lng])) {
            // Only pan map if marker is driven out of the screen
            map.panTo([lat, lng], {
                animate: true,
                duration: 0.5
            });
        }
    } else {
        // Create new marker on first successful fetch
        currentMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        // Add a stylish popup
        currentMarker.bindPopup(
            `<b>ESP32 Active Signal</b><br>
             <span style="color:#8b949e">Lat:</span> <span style="color:#fff">${lat.toFixed(6)}</span><br>
             <span style="color:#8b949e">Lng:</span> <span style="color:#fff">${lng.toFixed(6)}</span>`
        ).openPopup();

        // Smoothly fly to the new coordinates
        map.flyTo([lat, lng], 15, {
            animate: true,
            duration: 0.5
        });
    }
}

// (Inputs were removed)

// --- Auto-Sync Logic ---
// Fetch and update location automatically every 500ms without refreshing
setInterval(async () => {
    try {
        const response = await fetch('/api/location');
        if (!response.ok) return; // Skip if server gives a 404 or an error

        const data = await response.json();

        // If the server has a valid location
        if (data.lat !== null && data.lng !== null) {
            // Compare with current map state to avoid constantly moving map to same location
            let isNewLocation = true;
            if (currentMarker) {
                const currentPos = currentMarker.getLatLng();
                if (currentPos.lat === data.lat && currentPos.lng === data.lng) {
                    isNewLocation = false;
                }
            }

            if (isNewLocation) {
                console.log(`📡 New location received from ESP32: ${data.lat}, ${data.lng}`);

                // Plot it on the map automatically!
                updateMapLocation(data.lat, data.lng);
            }
        }
    } catch (error) {
        // Silently ignore network errors to prevent spamming the console
        // (Server might just be restarting)
    }
}, 500);

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
