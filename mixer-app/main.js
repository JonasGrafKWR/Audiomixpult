const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const execPromise = util.promisify(exec);

// Single Instance Lock - verhindert mehrfache App-Starts
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Wenn zweite Instanz gestartet wird, zeige Hauptfenster
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;
let tray;
let port;
let config = {
  comPort: null,
  sliders: [
    { id: 0, name: 'Kanal 1 (A0)', app: null },
    { id: 1, name: 'Kanal 2 (A1)', app: null },
    { id: 2, name: 'Master (A2)', app: 'master' },  // Master in der Mitte
    { id: 3, name: 'Kanal 4 (A3)', app: null },
    { id: 4, name: 'Kanal 5 (A4)', app: null }
  ]
};

// Lautstärke-Steuerung (NirCmd-basiert für bessere Performance)
let lastVolumes = [0, 0, 0, 0, 0];
let isSettingVolume = false;

async function setSystemVolume(volume) {
  if (isSettingVolume) return;  // Verhindere Überlappung
  
  try {
    isSettingVolume = true;
    const volumePercent = Math.round((volume / 1023) * 100);
    
    // NirCmd für direkte Lautstärke-Kontrolle (schneller als SendKeys)
    const nircmdPath = path.join(__dirname, 'assets', 'nircmd.exe');
    
    // Fallback: PowerShell mit direktem Audio-API Zugriff
    const psCommand = `
    $wshShell = New-Object -ComObject WScript.Shell;
    $wshShell.SendKeys([char]173);
    Start-Sleep -Milliseconds 50;
    [console]::beep(440, 50);
    $target = ${volumePercent};
    $steps = [Math]::Round($target / 2);
    for($i=0; $i -lt $steps; $i++) {
      $wshShell.SendKeys([char]175);
      Start-Sleep -Milliseconds 10;
    }
    `.replace(/\n/g, ' ');
    
    // Versuche erst NirCmd, dann PowerShell
    if (fs.existsSync(nircmdPath)) {
      await execPromise(`"${nircmdPath}" setsysvolume ${Math.round(volumePercent * 655.35)}`);
    } else {
      // PowerShell Fallback
      exec(`powershell -NoProfile -Command "${psCommand}"`, (err) => {
        if (err) console.error('Volume error:', err.message);
      });
    }
    
    console.log(`🔊 System-Lautstärke: ${volumePercent}%`);
  } catch (err) {
    console.error('Fehler beim Setzen der Lautstärke:', err.message);
  } finally {
    setTimeout(() => { isSettingVolume = false; }, 100);
  }
}

// Lautstärke-Änderungen anwenden (alle Slider aktiv)
function applyVolumeChanges(values) {
  config.sliders.forEach((slider, index) => {
    if (values[index] === undefined) return;
    
    const diff = Math.abs(values[index] - lastVolumes[index]);
    
    // Bei größerer Änderung (>1% = ~10 Punkte) Lautstärke anpassen
    if (diff > 10) {
      if (slider.app === 'master') {
        // Master-Slider steuert System-Lautstärke
        setSystemVolume(values[index]);
      } else if (slider.app && slider.app !== 'master') {
        // Andere Slider: Später für per-App-Lautstärke
        console.log(`🎵 Kanal ${index + 1} (${slider.app}): ${Math.round((values[index] / 1023) * 100)}%`);
      }
      lastVolumes[index] = values[index];
    }
  });
}

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
  // Tray Icon vorübergehend deaktiviert
  // tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  
  /* const contextMenu = Menu.buildFromTemplate([
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
  }); */
}

// Autostart Funktionen
function getAutostartEnabled() {
  if (process.platform !== 'win32') return false;
  
  const startupFolder = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const shortcutPath = path.join(startupFolder, 'Audiomixpult Control.lnk');
  
  return fs.existsSync(shortcutPath);
}

async function setAutostart(enabled) {
  if (process.platform !== 'win32') return { success: false, error: 'Nur Windows unterstützt' };
  
  const startupFolder = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const shortcutPath = path.join(startupFolder, 'Audiomixpult Control.lnk');
  const exePath = app.getPath('exe');
  
  try {
    if (enabled) {
      // Erstelle Verknüpfung mit PowerShell
      const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${path.dirname(exePath).replace(/\\/g, '\\\\')}"
$Shortcut.Description = "Audiomixpult Control - Arduino Audio Mixer"
$Shortcut.Save()
`;
      await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`);
      return { success: true };
    } else {
      // Lösche Verknüpfung
      if (fs.existsSync(shortcutPath)) {
        fs.unlinkSync(shortcutPath);
      }
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// IPC Handlers

// Autostart Status abfragen
ipcMain.handle('get-autostart', async () => {
  return getAutostartEnabled();
});

// Autostart ein/ausschalten
ipcMain.handle('set-autostart', async (event, enabled) => {
  return await setAutostart(enabled);
});

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
      const rawValues = data.trim().split('|').map(v => parseInt(v));
      
      // Invertiere Slider 5 (Index 4) - er ist falsch herum verkabelt
      const values = rawValues.map((val, idx) => {
        if (idx === 4) {
          return 1023 - val;  // Slider 5 umkehren
        }
        return val;
      });
      
      mainWindow.webContents.send('slider-values', values);
      
      // Wende Lautstärke-Änderungen an
      applyVolumeChanges(values);
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
  // createTray(); // Vorübergehend deaktiviert

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
