// Anbindung an den dauerhaft laufenden PowerShell-Audio-Helfer (assets/audio-helper.ps1).
// Statt pro Lautstärkeänderung einen neuen Prozess zu starten, läuft ein einziger
// Prozess, der Befehle als JSON-Zeilen über stdin bekommt.

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const REQUEST_TIMEOUT_MS = 5000;
const RESTART_DELAYS_MS = [500, 1000, 2000, 5000, 10000];

class AudioHelper {
  /**
   * @param {string} scriptPath  Pfad zu audio-helper.ps1
   * @param {{log?: Function, warn?: Function}} [logger]
   */
  constructor(scriptPath, logger = {}) {
    this.scriptPath = scriptPath;
    this.log = logger.log || (() => {});
    this.warn = logger.warn || (() => {});
    this.child = null;
    this.ready = false;
    this.stopped = false;
    this.nextId = 1;
    this.pending = new Map();
    this.waitingForReady = [];
    this.restartCount = 0;
    this.restartTimer = null;
  }

  start() {
    if (process.platform !== 'win32') {
      this.warn('Audio-Helfer: nur unter Windows verfügbar');
      return;
    }
    if (!fs.existsSync(this.scriptPath)) {
      this.warn(`Audio-Helfer: Skript nicht gefunden: ${this.scriptPath}`);
      return;
    }
    this.stopped = false;
    this.ready = false;

    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;

    readline.createInterface({ input: child.stdout }).on('line', (line) => this._onLine(line));
    child.stderr.on('data', (d) => this.warn(`Audio-Helfer stderr: ${String(d).trim()}`));
    child.stdin.on('error', () => { /* Prozess schon beendet */ });
    child.on('error', (err) => this.warn(`Audio-Helfer konnte nicht starten: ${err.message}`));
    child.on('exit', (code) => this._onExit(child, code));
  }

  _onLine(line) {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.ready) {
      this.ready = true;
      this.restartCount = 0;
      this.log('Audio-Helfer bereit');
      this.waitingForReady.splice(0).forEach((fn) => fn());
      return;
    }
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.error) entry.reject(new Error(msg.error));
    else entry.resolve(msg);
  }

  _onExit(child, code) {
    if (child !== this.child) return;
    this.child = null;
    this.ready = false;
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Audio-Helfer beendet'));
    }
    this.pending.clear();
    if (this.stopped) return;
    const delay = RESTART_DELAYS_MS[Math.min(this.restartCount, RESTART_DELAYS_MS.length - 1)];
    this.restartCount++;
    this.warn(`Audio-Helfer beendet (Code ${code}), Neustart in ${delay} ms`);
    this.restartTimer = setTimeout(() => this.start(), delay);
  }

  /** Sendet einen Befehl und wartet auf die Antwort. */
  request(cmd, payload = {}) {
    return new Promise((resolve, reject) => {
      const send = () => {
        if (!this.child || !this.child.stdin.writable) {
          reject(new Error('Audio-Helfer nicht aktiv'));
          return;
        }
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error('Audio-Helfer antwortet nicht'));
        }, REQUEST_TIMEOUT_MS);
        this.pending.set(id, { resolve, reject, timer });
        this.child.stdin.write(JSON.stringify({ id, cmd, ...payload }) + '\n');
      };
      if (this.ready) send();
      else if (this.child) this.waitingForReady.push(send);
      else reject(new Error('Audio-Helfer nicht aktiv'));
    });
  }

  /** Setzt die Lautstärke eines Ziels (master, mic, system oder Prozessname), value 0..1. */
  set(target, value) {
    return this.request('set', { target, value });
  }

  get(target) {
    return this.request('get', { target }).then((r) => r.value);
  }

  /** Programme mit Audio-Session, z. B. ["msedge.exe", "spotify.exe"]. */
  list() {
    return this.request('list').then((r) => r.sessions || []);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.restartTimer);
    const child = this.child;
    if (!child) return;
    try { child.stdin.end(); } catch { /* egal */ }
    setTimeout(() => { try { child.kill(); } catch { /* egal */ } }, 500).unref();
  }
}

module.exports = { AudioHelper };
