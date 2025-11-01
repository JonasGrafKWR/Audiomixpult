const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let mainWindow;
let tray;
let port;
let config = {
  comPort: null,
  sliders: [
    { id: 0, name: 'Master', app: 'master' },
    { id: 1, name: 'Slider 1', app: null },
    { id: 2, name: 'Slider 2', app: null },
    { id: 3, name: 'Slider 3', app: null },
    { id: 4, name: 'Slider 4', app: null }
  ]
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: true,
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile('index.html');

  // Öffne DevTools automatisch für Debugging
  mainWindow.webContents.openDevTools();

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Audiomixpult Control',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Audiomixpult Control');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// COM-Ports auflisten
ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer,
      productId: port.productId,
      vendorId: port.vendorId
    }));
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

// Arduino verbinden
ipcMain.handle('connect-arduino', async (event, portPath) => {
  try {
    // Alten Port schließen, falls vorhanden
    if (port && port.isOpen) {
      port.close();
    }

    port = new SerialPort({
      path: portPath,
      baudRate: 9600
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (data) => {
      // Arduino sendet Daten im Format: "value1|value2|value3|value4|value5"
      const values = data.trim().split('|').map(v => parseInt(v));
      mainWindow.webContents.send('slider-values', values);
    });

    port.on('error', (err) => {
      console.error('Serial port error:', err);
      mainWindow.webContents.send('connection-error', err.message);
    });

    config.comPort = portPath;
    return { success: true };
  } catch (error) {
    console.error('Connection error:', error);
    return { success: false, error: error.message };
  }
});

// Konfiguration speichern
ipcMain.handle('save-config', async (event, newConfig) => {
  config = { ...config, ...newConfig };
  // Hier könntest du die Config in eine Datei speichern
  return { success: true };
});

// Konfiguration laden
ipcMain.handle('load-config', async () => {
  return config;
});

// Laufende Prozesse mit Audio abrufen
ipcMain.handle('get-audio-sessions', async () => {
  try {
    console.log('🔍 Searching for audio processes...');
    
    // Super einfacher PowerShell-Befehl: Nur Prozesse mit Fenstern
    const psCommand = `Get-Process | Where-Object MainWindowTitle | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json`;
    
    console.log('📡 Executing PowerShell command...');
    const { stdout, stderr } = await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5,
      timeout: 10000
    });

    console.log('📥 PowerShell stdout length:', stdout.length);
    
    if (stderr && stderr.trim()) {
      console.error('⚠️ PowerShell stderr:', stderr);
    }

    let processes = [];
    try {
      const cleanOutput = stdout.trim();
      if (!cleanOutput || cleanOutput === '' || cleanOutput === 'null') {
        console.warn('⚠️ Empty PowerShell output - stdout was:', cleanOutput);
        return getDefaultSessions();
      }
      
      const parsed = JSON.parse(cleanOutput);
      processes = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      console.log(`📦 Raw processes found: ${processes.length}`);
      
      // Log erste 5 Prozesse zum Debugging
      if (processes.length > 0) {
        console.log('First 5 processes:', processes.slice(0, 5).map(p => p.ProcessName).join(', '));
      }
    } catch (e) {
      console.error('❌ Error parsing process list:', e.message);
      console.log('Raw stdout length:', stdout.length);
      console.log('First 500 chars:', stdout.substring(0, 500));
      return getDefaultSessions();
    }

    // Bekannte Audio-Programme (auch ohne Fenster)
    const audioApps = [
      'spotify', 'discord', 'teamspeak', 'zoom', 'teams', 'skype',
      'chrome', 'firefox', 'msedge', 'opera', 'brave',
      'vlc', 'wmplayer', 'groove', 'itunes', 'foobar2000', 'winamp',
      'amazonmusic', 'amazon', 'music', 'deezer', 'tidal', 'qobuz', 'musicbee',
      'steam', 'origin', 'uplay', 'epicgameslauncher', 'gog',
      'obs64', 'obs32', 'streamlabs', 'xsplit'
    ];

    // System-Prozesse die ignoriert werden sollen
    const systemProcesses = [
      'svchost', 'dwm', 'csrss', 'lsass', 'services', 'system', 'registry',
      'smss', 'wininit', 'winlogon', 'fontdrvhost', 'conhost', 'runtimebroker',
      'dllhost', 'searchindexer', 'securityhealthservice', 'sgrm', 'sihost',
      'taskhostw', 'textinputhost', 'wudfhost', 'audiodg', 'dashost', 'msmpseng',
      'nissrv', 'spoolsv', 'wlanext', 'wmiprvse', 'searchapp', 'startmenuexperiencehost',
      'shellexperiencehost', 'applicationframehost', 'ctfmon', 'unsecapp', 'electron'
    ];

    // Filtere und formatiere die Prozesse
    console.log('🔍 Filtering processes...');
    console.log('Total processes to filter:', processes.length);
    
    const audioSessions = processes
      .filter(proc => {
        if (!proc || !proc.ProcessName) {
          console.log('❌ Skipping null/unnamed process');
          return false;
        }
        const name = proc.ProcessName.toLowerCase();
        
        // Überspringe System-Prozesse
        if (systemProcesses.includes(name)) {
          console.log(`⏭️ Skipping system process: ${name}`);
          return false;
        }
        
        // Debug-Log für alle Prozesse mit Fenster
        if (proc.MainWindowTitle && proc.MainWindowTitle.trim() !== '') {
          console.log(`🪟 Process with window: ${proc.ProcessName} - "${proc.MainWindowTitle}"`);
        }
        
        // Debug-Log für potenzielle Musik-Apps
        if (name.includes('amazon') || name.includes('music')) {
          console.log(`🎵 Found music app: ${proc.ProcessName} (Window: "${proc.MainWindowTitle}")`);
        }
        
        const hasWindow = proc.MainWindowTitle && proc.MainWindowTitle.trim() !== '';
        const isAudioApp = audioApps.some(app => name.includes(app));
        
        if (hasWindow || isAudioApp) {
          console.log(`✅ Including: ${proc.ProcessName}`);
          return true;
        }
        
        return false;
      })
      .map(proc => {
        const processName = proc.ProcessName || 'Unknown';
        const displayName = proc.MainWindowTitle || processName;
        
        return {
          name: processName,
          displayName: displayName,
          executable: processName.toLowerCase() + '.exe',
          path: proc.Path || null,
          pid: proc.Id,
          company: null
        };
      })
      // Entferne Duplikate basierend auf ProcessName (nur den ersten behalten)
      .filter((proc, index, self) => 
        index === self.findIndex(p => p.name.toLowerCase() === proc.name.toLowerCase())
      )
      // Sortiere: Audio-Apps zuerst, dann alphabetisch
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aIsAudio = audioApps.some(app => aName.includes(app));
        const bIsAudio = audioApps.some(app => bName.includes(app));
        
        if (aIsAudio && !bIsAudio) return -1;
        if (!aIsAudio && bIsAudio) return 1;
        return aName.localeCompare(bName);
      });

    // Füge System-Audio hinzu
    audioSessions.unshift({
      name: 'System',
      displayName: 'System Sounds',
      executable: 'system',
      path: null,
      pid: null
    });

    console.log(`✓ Found ${audioSessions.length} audio sessions:`, audioSessions.map(s => s.name).join(', '));
    return audioSessions;
    
  } catch (error) {
    console.error('Error getting audio sessions:', error);
    return getDefaultSessions();
  }
});

// Fallback für Fehler
function getDefaultSessions() {
  return [
    {
      name: 'System',
      displayName: 'System Sounds',
      executable: 'system',
      path: null,
      pid: null
    }
  ];
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (port && port.isOpen) {
    port.close();
  }
});
