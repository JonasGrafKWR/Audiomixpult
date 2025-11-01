const { ipcRenderer } = require('electron');

// State
let config = {
    sliders: []
};
let connectedPort = null;
let autoRefreshInterval = null;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const cancelSettings = document.getElementById('cancelSettings');
const refreshApps = document.getElementById('refreshApps');
const comPortSelect = document.getElementById('comPortSelect');
const connectBtn = document.getElementById('connectBtn');
const refreshPortsBtn = document.getElementById('refreshPortsBtn');
const runningPrograms = document.getElementById('runningPrograms');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    setupDragAndDrop();
    setupEventListeners();
    refreshPorts();
    refreshAudioSessions();
    
    // Auto-refresh alle 5 Sekunden
    autoRefreshInterval = setInterval(refreshAudioSessions, 5000);
});

// Load Configuration
async function loadConfig() {
    config = await ipcRenderer.invoke('load-config');
    updateUI();
}

// Save Configuration
async function saveConfig() {
    await ipcRenderer.invoke('save-config', config);
}

// Update UI from config
function updateUI() {
    config.sliders.forEach((slider, index) => {
        const channel = document.querySelector(`[data-slider="${index}"]`);
        if (channel && slider.app) {
            assignAppToSlider(channel, slider.app, slider.name || slider.app);
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Settings Modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        refreshPorts();
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    cancelSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Click outside modal to close
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Refresh Apps
    refreshApps.addEventListener('click', refreshAudioSessions);

    // Connect Arduino
    connectBtn.addEventListener('click', connectArduino);
    refreshPortsBtn.addEventListener('click', refreshPorts);

    // Autostart Checkbox
    const autostartCheckbox = document.getElementById('autostartCheckbox');
    if (autostartCheckbox) {
        // Lade aktuellen Status
        ipcRenderer.invoke('get-autostart').then(enabled => {
            autostartCheckbox.checked = enabled;
        });

        // Bei Änderung speichern
        autostartCheckbox.addEventListener('change', async (e) => {
            const result = await ipcRenderer.invoke('set-autostart', e.target.checked);
            if (!result.success) {
                alert('Fehler beim Setzen des Autostarts: ' + (result.error || 'Unbekannter Fehler'));
                e.target.checked = !e.target.checked; // Zurücksetzen
            }
        });
    }

    // Remove button for sliders
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const channel = e.target.closest('.mixer-channel');
            const sliderId = channel.dataset.slider;
            removeAppFromSlider(channel);
            config.sliders[sliderId] = { id: sliderId, name: null, app: null };
            saveConfig();
        });
    });

    // Channel name inputs
    document.querySelectorAll('.channel-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const channel = e.target.closest('.mixer-channel');
            const sliderId = channel.dataset.slider;
            if (config.sliders[sliderId]) {
                config.sliders[sliderId].name = e.target.value;
                saveConfig();
            }
        });
    });
}

// Drag and Drop
function setupDragAndDrop() {
    // Make program items draggable
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('program-item')) {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('app', e.target.dataset.app);
            e.dataTransfer.setData('name', e.target.querySelector('.program-name').textContent);
            e.dataTransfer.setData('icon', e.target.querySelector('.program-icon').textContent);
        }
    });

    // Drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');

            const app = e.dataTransfer.getData('app');
            const name = e.dataTransfer.getData('name');
            const icon = e.dataTransfer.getData('icon');
            const sliderId = zone.dataset.slider;

            assignAppToSlider(zone.closest('.mixer-channel'), app, name, icon);

            // Update config
            config.sliders[sliderId] = {
                id: parseInt(sliderId),
                name: name,
                app: app
            };
            saveConfig();
        });
    });
}

// Assign app to slider
function assignAppToSlider(channel, app, name, icon = '🔊') {
    const dropZone = channel.querySelector('.drop-zone');
    const placeholder = dropZone.querySelector('.drop-placeholder');
    const assignedApp = dropZone.querySelector('.assigned-app');
    const channelName = channel.querySelector('.channel-name');

    placeholder.style.display = 'none';
    assignedApp.style.display = 'flex';
    assignedApp.innerHTML = `
        <span class="app-icon">${icon}</span>
        <span class="app-name">${name}</span>
    `;

    if (channelName) {
        channelName.value = name;
    }
}

// Remove app from slider
function removeAppFromSlider(channel) {
    const dropZone = channel.querySelector('.drop-zone');
    const placeholder = dropZone.querySelector('.drop-placeholder');
    const assignedApp = dropZone.querySelector('.assigned-app');
    const sliderId = channel.dataset.slider;

    placeholder.style.display = 'flex';
    assignedApp.style.display = 'none';
    assignedApp.innerHTML = '';

    // Reset slider value display
    const sliderValue = channel.querySelector('.slider-value');
    const sliderFill = channel.querySelector('.slider-fill');
    sliderValue.textContent = '0%';
    sliderFill.style.height = '0%';
}

// Refresh COM Ports
async function refreshPorts() {
    const ports = await ipcRenderer.invoke('list-ports');
    comPortSelect.innerHTML = '<option value="">Wähle einen Port...</option>';

    ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port.path;
        option.textContent = `${port.path} ${port.manufacturer || ''}`;
        comPortSelect.appendChild(option);
    });

    if (config.comPort) {
        comPortSelect.value = config.comPort;
    }
}

// Connect to Arduino
async function connectArduino() {
    const portPath = comPortSelect.value;
    
    if (!portPath) {
        alert('Bitte wähle einen COM-Port aus!');
        return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Verbinde...';

    const result = await ipcRenderer.invoke('connect-arduino', portPath);

    if (result.success) {
        connectedPort = portPath;
        updateConnectionStatus(true, portPath);
        
        document.getElementById('connectionInfo').style.display = 'block';
        document.getElementById('portStatus').textContent = 'Verbunden';
        document.getElementById('portName').textContent = portPath;
        
        connectBtn.textContent = 'Verbunden';
        setTimeout(() => {
            settingsModal.style.display = 'none';
        }, 1000);
    } else {
        alert('Verbindung fehlgeschlagen: ' + result.error);
        connectBtn.disabled = false;
        connectBtn.textContent = 'Verbinden';
    }
}

// Update connection status
function updateConnectionStatus(connected, port = null) {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');

    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = `Verbunden (${port})`;
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Nicht verbunden';
    }
}

// Refresh audio sessions
async function refreshAudioSessions() {
    refreshApps.disabled = true;
    refreshApps.textContent = '⏳';
    
    try {
        const sessions = await ipcRenderer.invoke('get-audio-sessions');
        
        runningPrograms.innerHTML = '';
        
        if (sessions.length === 0) {
            runningPrograms.innerHTML = '<p style="padding: 10px; color: #888; text-align: center;">Keine Programme gefunden</p>';
            return;
        }
        
        sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'program-item';
            item.draggable = true;
            item.dataset.app = session.executable || session.name;
            item.dataset.type = session.name === 'System' ? 'system' : 'app';
            item.title = session.path || session.displayName;
            
            // Icon basierend auf dem Programm
            let icon = '🎵';
            const name = session.name.toLowerCase();
            
            if (session.name === 'System') icon = '🔊';
            // Browser
            else if (name.includes('chrome') || name.includes('edge') || name.includes('firefox') || name.includes('opera') || name.includes('brave')) icon = '🌐';
            // Kommunikation
            else if (name.includes('discord')) icon = '💬';
            else if (name.includes('teams')) icon = '👥';
            else if (name.includes('zoom')) icon = '📹';
            else if (name.includes('skype')) icon = '📞';
            else if (name.includes('teamspeak')) icon = '🎙️';
            // Musik/Streaming
            else if (name.includes('spotify')) icon = '🎧';
            else if (name.includes('amazon') && name.includes('music')) icon = '🎧';
            else if (name.includes('deezer') || name.includes('tidal') || name.includes('qobuz')) icon = '🎧';
            else if (name.includes('itunes') || name.includes('musicbee') || name.includes('foobar') || name.includes('winamp')) icon = '🎧';
            else if (name.includes('groove')) icon = '🎧';
            // Video/Media
            else if (name.includes('vlc') || name.includes('media') || name.includes('player')) icon = '🎬';
            else if (name.includes('netflix') || name.includes('youtube')) icon = '📺';
            else if (name.includes('obs') || name.includes('stream')) icon = '🎥';
            // Gaming
            else if (name.includes('game') || name.includes('steam') || name.includes('epic') || name.includes('origin') || name.includes('uplay') || name.includes('gog')) icon = '🎮';
            // Development
            else if (name.includes('code') || name.includes('studio') || name.includes('visual')) icon = '💻';
            // Office
            else if (name.includes('excel') || name.includes('word') || name.includes('powerpoint') || name.includes('outlook')) icon = '📊';
            
            item.innerHTML = `
                <span class="program-icon">${icon}</span>
                <div class="program-info">
                    <span class="program-name">${session.displayName}</span>
                    ${session.executable ? `<span class="program-exe">${session.executable}</span>` : ''}
                </div>
            `;
            
            runningPrograms.appendChild(item);
        });
        
        console.log(`✓ ${sessions.length} Programme geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Programme:', error);
        runningPrograms.innerHTML = '<p style="padding: 10px; color: #f88; text-align: center;">Fehler beim Laden</p>';
    } finally {
        refreshApps.disabled = false;
        refreshApps.textContent = '🔄';
    }
}

// Handle slider values from Arduino
ipcRenderer.on('slider-values', (event, values) => {
    values.forEach((value, index) => {
        updateSliderDisplay(index, value);
    });
});

// Update slider display
function updateSliderDisplay(sliderId, value) {
    const channel = document.querySelector(`[data-slider="${sliderId}"]`);
    if (!channel) return;

    const percentage = Math.round((value / 1023) * 100);
    const sliderValue = channel.querySelector('.slider-value');
    const sliderFill = channel.querySelector('.slider-fill');
    const sliderThumb = channel.querySelector('.slider-thumb');

    if (sliderValue) {
        sliderValue.textContent = `${percentage}%`;
    }

    if (sliderFill) {
        sliderFill.style.height = `${percentage}%`;
    }

    if (sliderThumb) {
        sliderThumb.style.bottom = `${percentage}%`;
    }
}

// Handle connection errors
ipcRenderer.on('connection-error', (event, error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
    connectBtn.disabled = false;
    connectBtn.textContent = 'Verbinden';
});

// External links
document.getElementById('githubLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    require('electron').shell.openExternal('https://github.com/JonasGrafKWR/Audiomixpult');
});

document.getElementById('docsLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    require('electron').shell.openExternal('https://github.com/JonasGrafKWR/Audiomixpult#readme');
});
