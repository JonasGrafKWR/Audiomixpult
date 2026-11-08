// Brücke zwischen Oberfläche und Hauptprozess.
// Die Oberfläche läuft ohne Node-Zugriff (contextIsolation) und darf nur diese Kanäle benutzen.

const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = [
  'load-config',
  'save-config',
  'get-status',
  'list-ports',
  'connect-arduino',
  'get-audio-sessions',
  'get-autostart',
  'set-autostart',
  'open-external'
];

const EVENT_CHANNELS = ['slider-values', 'connection-status'];

contextBridge.exposeInMainWorld('api', {
  invoke(channel, ...args) {
    if (!INVOKE_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`Kanal nicht erlaubt: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel, callback) {
    if (!EVENT_CHANNELS.includes(channel)) return () => {};
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});
