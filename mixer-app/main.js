const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const { ConfigStore, SLIDER_COUNT } = require('./config');
const { SerialLink } = require('./serial');
const { AudioHelper } = require('./audio');
const { VolumeMixer } = require('./volume');

const DEV = process.argv.includes('--dev');
const START_HIDDEN = process.argv.includes('--hidden');

// Erlaubte externe Links (der Oberfläche wird nur ein Schlüssel übergeben, nie eine URL)
const EXTERNAL_LINKS = {
  github: 'https://github.com/JonasGrafKWR/Audiomixpult',
  docs: 'https://github.com/JonasGrafKWR/Audiomixpult#readme'
};

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Nur eine Instanz zulassen
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) showWindow();
  });
}

// ---------------------------------------------------------------------------
// Bausteine: Konfiguration, Audio, Lautstärke, Serial
// ---------------------------------------------------------------------------

let configStore;
let audio;
let mixer;
const link = new SerialLink();

function helperPath() {
  // In der gebauten App liegt das Skript außerhalb des asar-Archivs (asarUnpack)
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'audio-helper.ps1')
    : path.join(__dirname, 'assets', 'audio-helper.ps1');
}

function applyConfigToMixer() {
  mixer.setTargets(configStore.get().sliders.map((s) => s.app));
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

// ---------------------------------------------------------------------------
// Fenster und Tray
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');
  if (DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Keine fremden Fenster, keine Navigation weg von der App
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  mainWindow.once('ready-to-show', () => {
    if (!(START_HIDDEN && tray)) mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    // Mit Tray läuft die App im Hintergrund weiter, sonst wird sie beendet
    if (!isQuitting && tray && configStore.get().minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

function createTray() {
  try {
    let icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    if (icon.isEmpty()) return;
    icon = icon.resize({ width: 16, height: 16 });
    tray = new Tray(icon);
  } catch (err) {
    console.warn(`Tray konnte nicht erstellt werden: ${err.message}`);
    tray = null;
    return;
  }

  tray.setToolTip('Audiomixpult Control');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Audiomixpult Control öffnen', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Beenden', click: () => quitApp() }
  ]));
  tray.on('click', () => showWindow());
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

ipcMain.handle('load-config', () => configStore.get());

ipcMain.handle('get-status', () => link.status);

ipcMain.handle('save-config', (_event, newConfig) => {
  // Nur Felder übernehmen, die die Oberfläche verwaltet. COM-Port und Auto-Connect setzt
  // der Hauptprozess selbst (sonst überschreibt ein veralteter Stand der Oberfläche sie).
  const allowed = {};
  for (const key of ['sliders', 'profiles', 'currentProfile', 'minimizeToTray']) {
    if (newConfig && key in newConfig) allowed[key] = newConfig[key];
  }
  const cfg = configStore.update(allowed);
  applyConfigToMixer();
  return { success: true, config: cfg };
});

ipcMain.handle('list-ports', async () => {
  try {
    return await SerialLink.listPorts();
  } catch (err) {
    console.error('Ports konnten nicht gelesen werden:', err.message);
    return [];
  }
});

ipcMain.handle('connect-arduino', (_event, portPath) => {
  if (typeof portPath !== 'string' || !/^COM\d{1,3}$/i.test(portPath)) {
    return { success: false, error: 'Ungültiger COM-Port' };
  }
  const port = portPath.toUpperCase();
  configStore.update({ comPort: port, autoConnect: true });
  link.connect(port);
  return { success: true };
});

ipcMain.handle('get-audio-sessions', async () => {
  try {
    const names = await audio.list();
    return names.map((exe) => ({ executable: exe, displayName: exe.replace(/\.exe$/i, '') }));
  } catch (err) {
    console.warn(`Programmliste nicht verfügbar: ${err.message}`);
    return [];
  }
});

ipcMain.handle('get-autostart', () => app.getLoginItemSettings().openAtLogin);

ipcMain.handle('set-autostart', (_event, enabled) => {
  if (process.platform !== 'win32') return { success: false, error: 'Nur unter Windows unterstützt' };
  if (!app.isPackaged) return { success: false, error: 'Autostart ist nur in der gebauten App möglich' };
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled, args: ['--hidden'] });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', (_event, key) => {
  const url = EXTERNAL_LINKS[key];
  if (url) shell.openExternal(url);
});

// ---------------------------------------------------------------------------
// Start und Ende
// ---------------------------------------------------------------------------

if (gotTheLock) {
  app.whenReady().then(() => {
    configStore = new ConfigStore(path.join(app.getPath('userData'), 'config.json'));
    configStore.load();

    audio = new AudioHelper(helperPath(), { log: (m) => console.log(m), warn: (m) => console.warn(m) });
    audio.start();
    mixer = new VolumeMixer({ apply: (target, scalar) => audio.set(target, scalar), warn: (m) => console.warn(m) });
    applyConfigToMixer();

    link.on('values', (values) => {
      values.slice(0, SLIDER_COUNT).forEach((value, i) => mixer.update(i, value));
      send('slider-values', values);
    });
    link.on('status', (status) => send('connection-status', status));

    createTray();
    createWindow();

    const cfg = configStore.get();
    if (cfg.autoConnect && cfg.comPort) link.connect(cfg.comPort);

    app.on('activate', () => showWindow());
  });
}

app.on('window-all-closed', () => {
  // Mit Tray bleibt die App im Hintergrund aktiv
  if (!tray) quitApp();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (mixer) mixer.stop();
  link.disconnect();
  if (audio) audio.stop();
});
