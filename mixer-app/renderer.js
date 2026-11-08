// Oberfläche. Läuft ohne Node-Zugriff, Kommunikation nur über window.api (preload.js).
// Alle Texte (auch Programm- und Gerätenamen) werden per textContent gesetzt, nie als HTML.

const SLIDER_COUNT = 5;
const PROFILE_NAMES = ['default', 'gaming', 'streaming', 'work'];

const SYSTEM_TARGETS = {
  master: { label: 'Master', icon: '🔊' },
  mic: { label: 'Mikrofon', icon: '🎤' },
  system: { label: 'Systemklänge', icon: '🔔' }
};

let config = null;
let status = { state: 'disconnected', port: null, message: '' };

const $ = (id) => document.getElementById(id);
const channels = () => document.querySelectorAll('.mixer-channel');

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function targetInfo(app) {
  if (SYSTEM_TARGETS[app]) return SYSTEM_TARGETS[app];
  return { label: String(app).replace(/\.exe$/i, ''), icon: iconFor(app) };
}

function iconFor(app) {
  const name = String(app).toLowerCase();
  if (/chrome|edge|firefox|opera|brave/.test(name)) return '🌐';
  if (name.includes('discord')) return '💬';
  if (name.includes('teams')) return '👥';
  if (name.includes('zoom')) return '📹';
  if (name.includes('skype')) return '📞';
  if (name.includes('teamspeak')) return '🎙️';
  if (/spotify|amazon|music|deezer|tidal|qobuz|itunes|musicbee|foobar|winamp|groove/.test(name)) return '🎧';
  if (/vlc|media|player/.test(name)) return '🎬';
  if (/obs|stream/.test(name)) return '🎥';
  if (/game|steam|epic|origin|uplay|gog|simulator/.test(name)) return '🎮';
  if (/code|studio/.test(name)) return '💻';
  return '🎵';
}

async function saveConfig() {
  const result = await window.api.invoke('save-config', config);
  if (result && result.config) config = result.config;
}

// ---------------------------------------------------------------------------
// Regler-Kanäle
// ---------------------------------------------------------------------------

function renderChannel(index) {
  const channel = document.querySelector(`.mixer-channel[data-slider="${index}"]`);
  if (!channel) return;
  const slider = config.sliders[index];
  const placeholder = channel.querySelector('.drop-placeholder');
  const assigned = channel.querySelector('.assigned-app');
  const nameInput = channel.querySelector('.channel-name');

  assigned.replaceChildren();
  if (slider.app) {
    const info = targetInfo(slider.app);
    assigned.append(el('span', 'app-icon', info.icon), el('span', 'app-name', info.label));
    assigned.title = slider.app;
    assigned.style.display = 'flex';
    placeholder.style.display = 'none';
  } else {
    assigned.style.display = 'none';
    placeholder.style.display = 'flex';
  }
  if (document.activeElement !== nameInput) nameInput.value = slider.name;
}

function renderAllChannels() {
  for (let i = 0; i < SLIDER_COUNT; i++) renderChannel(i);
}

function updateSliderDisplay(index, value) {
  const channel = document.querySelector(`.mixer-channel[data-slider="${index}"]`);
  if (!channel) return;
  const percentage = Math.max(0, Math.min(100, Math.round((value / 1023) * 100)));
  channel.querySelector('.slider-value').textContent = `${percentage}%`;
  channel.querySelector('.slider-fill').style.height = `${percentage}%`;
  channel.querySelector('.slider-thumb').style.bottom = `${percentage}%`;
}

async function assignTarget(index, app, label) {
  config.sliders[index] = { id: index, name: label, app };
  renderChannel(index);
  await saveConfig();
}

async function clearChannel(index) {
  config.sliders[index] = { id: index, name: `Slider ${index + 1}`, app: null };
  renderChannel(index);
  await saveConfig();
}

function setupChannels() {
  channels().forEach((channel) => {
    const index = Number(channel.dataset.slider);

    channel.querySelector('.btn-remove').addEventListener('click', () => clearChannel(index));

    channel.querySelector('.channel-name').addEventListener('change', async (e) => {
      const name = e.target.value.trim().slice(0, 40) || `Slider ${index + 1}`;
      config.sliders[index].name = name;
      e.target.value = name;
      await saveConfig();
    });

    const zone = channel.querySelector('.drop-zone');
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const app = e.dataTransfer.getData('app');
      const label = e.dataTransfer.getData('label');
      if (app) assignTarget(index, app, label || targetInfo(app).label);
    });
  });

  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest ? e.target.closest('.program-item') : null;
    if (!item) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('app', item.dataset.app);
    e.dataTransfer.setData('label', item.querySelector('.program-name').textContent);
  });
}

// ---------------------------------------------------------------------------
// Programmliste (Programme mit Audio-Session)
// ---------------------------------------------------------------------------

async function refreshAudioSessions() {
  const button = $('refreshApps');
  const list = $('runningPrograms');
  button.disabled = true;
  try {
    const sessions = await window.api.invoke('get-audio-sessions');
    list.replaceChildren();
    if (sessions.length === 0) {
      list.append(el('p', 'help-text', 'Keine Programme mit Ton gefunden. Ein Programm erscheint, sobald es Ton ausgibt.'));
      return;
    }
    sessions.forEach((session) => {
      const item = el('div', 'program-item');
      item.draggable = true;
      item.dataset.app = session.executable;
      item.title = session.executable;

      const info = el('div', 'program-info');
      info.append(el('span', 'program-name', session.displayName), el('span', 'program-exe', session.executable));
      item.append(el('span', 'program-icon', iconFor(session.executable)), info);
      list.append(item);
    });
  } catch (err) {
    list.replaceChildren(el('p', 'help-text', 'Programmliste konnte nicht geladen werden.'));
  } finally {
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Verbindung
// ---------------------------------------------------------------------------

const STATUS_TEXT = {
  disconnected: () => 'Nicht verbunden',
  connecting: () => `Verbinde mit ${status.port || ''} ...`,
  connected: () => `Verbunden (${status.port})`,
  error: () => status.message || 'Verbindungsfehler'
};

function renderStatus() {
  const dot = $('connectionStatus').querySelector('.status-dot');
  dot.classList.remove('connected', 'connecting', 'error');
  if (status.state !== 'disconnected') dot.classList.add(status.state);

  const text = (STATUS_TEXT[status.state] || STATUS_TEXT.disconnected)();
  const textEl = $('connectionStatus').querySelector('.status-text');
  textEl.textContent = text;
  textEl.title = text;

  const info = $('connectionInfo');
  info.style.display = status.state === 'disconnected' ? 'none' : 'block';
  $('portStatus').textContent = text;
  $('portName').textContent = status.port || '-';

  const busy = status.state === 'connecting';
  $('connectBtn').disabled = busy;
  $('connectBtn').textContent = status.state === 'connected' ? 'Neu verbinden' : (busy ? 'Verbinde ...' : 'Verbinden');
}

async function refreshPorts() {
  const select = $('comPortSelect');
  const ports = await window.api.invoke('list-ports');
  select.replaceChildren(new Option('Wähle einen Port...', ''));
  ports.forEach((p) => select.append(new Option(`${p.path} ${p.manufacturer}`.trim(), p.path)));
  if (config && config.comPort) {
    if (!ports.some((p) => p.path === config.comPort)) {
      select.append(new Option(`${config.comPort} (nicht gefunden)`, config.comPort));
    }
    select.value = config.comPort;
  }
}

async function connectArduino() {
  const port = $('comPortSelect').value;
  if (!port) {
    $('portStatus').textContent = 'Bitte einen COM-Port auswählen.';
    $('connectionInfo').style.display = 'block';
    return;
  }
  const result = await window.api.invoke('connect-arduino', port);
  if (!result.success) {
    status = { state: 'error', port, message: result.error || 'Verbindung fehlgeschlagen' };
    renderStatus();
  }
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

function renderProfileSelect() {
  $('profileSelect').value = config.currentProfile;
}

async function loadProfile(name) {
  config.currentProfile = name;
  const stored = config.profiles[name];
  if (stored) {
    config.sliders = stored.map((s) => ({ ...s }));
    renderAllChannels();
    $('profileHint').textContent = 'Zuordnung des Profils geladen.';
  } else {
    $('profileHint').textContent = 'Für dieses Profil ist noch nichts gespeichert. Mit "Profil speichern" ablegen.';
  }
  await saveConfig();
}

async function saveProfile() {
  const name = $('profileSelect').value;
  config.currentProfile = name;
  config.profiles[name] = config.sliders.map((s) => ({ ...s }));
  await saveConfig();
  $('profileHint').textContent = 'Aktuelle Zuordnung im Profil gespeichert.';
}

function setupSettings() {
  const modal = $('settingsModal');
  const close = () => { modal.style.display = 'none'; };

  $('settingsBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
    refreshPorts();
  });
  $('closeSettings').addEventListener('click', close);
  $('cancelSettings').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  $('refreshApps').addEventListener('click', refreshAudioSessions);
  $('connectBtn').addEventListener('click', connectArduino);
  $('refreshPortsBtn').addEventListener('click', refreshPorts);

  // Autostart
  const autostart = $('autostartCheckbox');
  window.api.invoke('get-autostart').then((enabled) => { autostart.checked = !!enabled; });
  autostart.addEventListener('change', async (e) => {
    const result = await window.api.invoke('set-autostart', e.target.checked);
    if (!result.success) {
      e.target.checked = !e.target.checked;
      $('autostartHelp').textContent = `Autostart nicht möglich: ${result.error || 'unbekannter Fehler'}`;
    }
  });

  // In Taskleiste minimieren
  const tray = $('minimizeToTrayCheckbox');
  tray.checked = config.minimizeToTray;
  tray.addEventListener('change', async (e) => {
    config.minimizeToTray = e.target.checked;
    await saveConfig();
  });

  // Profile
  renderProfileSelect();
  $('profileSelect').addEventListener('change', (e) => loadProfile(e.target.value));
  $('saveProfileBtn').addEventListener('click', saveProfile);

  // Externe Links (nur über feste Schlüssel, die URL kennt der Hauptprozess)
  $('githubLink').addEventListener('click', (e) => { e.preventDefault(); window.api.invoke('open-external', 'github'); });
  $('docsLink').addEventListener('click', (e) => { e.preventDefault(); window.api.invoke('open-external', 'docs'); });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  config = await window.api.invoke('load-config');
  status = await window.api.invoke('get-status');

  setupChannels();
  setupSettings();
  renderAllChannels();
  renderStatus();
  refreshPorts();
  refreshAudioSessions();

  window.api.on('slider-values', (values) => {
    values.slice(0, SLIDER_COUNT).forEach((value, i) => updateSliderDisplay(i, value));
  });
  window.api.on('connection-status', (next) => {
    status = next;
    renderStatus();
    if (next.state === 'connected') $('settingsModal').style.display = 'none';
  });

  // Programmliste alle 5 Sekunden aktualisieren, solange das Fenster sichtbar ist
  setInterval(() => {
    if (document.visibilityState === 'visible') refreshAudioSessions();
  }, 5000);
});
