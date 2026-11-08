// Serielle Verbindung zum Arduino mit automatischem Wiederverbinden.
// Protokoll (siehe Haupt-README): Zeilen "w1|w2|w3|w4|w5\r\n", Werte 0-1023.

const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const LINE_PATTERN = /^\d{1,4}(\|\d{1,4})*$/;
const MAX_RAW = 1023;

/** Zerlegt eine Zeile in Zahlen. Gibt null zurück, wenn sie nicht zum Protokoll passt. */
function parseLine(line) {
  const text = String(line).trim();
  if (!LINE_PATTERN.test(text)) return null;
  const values = text.split('|').map((v) => parseInt(v, 10));
  // Die erste Zeile nach dem Verbinden kann abgeschnitten sein (z. B. "4558|925|...")
  if (values.some((v) => v > MAX_RAW)) return null;
  return values;
}

function friendlyError(err) {
  const msg = err && err.message ? err.message : String(err);
  if (/denied|Zugriff|busy|EACCES/i.test(msg)) {
    return 'Port belegt (läuft deej, der Serial Monitor oder die Arduino IDE?)';
  }
  if (/not found|File not found|ENOENT|Datei/i.test(msg)) {
    return 'Port nicht gefunden (Arduino angesteckt? COM-Nummer geändert?)';
  }
  return msg;
}

/**
 * Ereignisse:
 *  - 'values' (Array<number>)   neue Reglerwerte
 *  - 'status' ({state, port, message})  state: disconnected | connecting | connected | error
 */
class SerialLink extends EventEmitter {
  constructor({ baudRate = 9600, retryMs = 3000 } = {}) {
    super();
    this.baudRate = baudRate;
    this.retryMs = retryMs;
    this.path = null;
    this.port = null;
    this.wanted = false;
    this.retryTimer = null;
    this.status = { state: 'disconnected', port: null, message: '' };
  }

  _setStatus(state, message = '') {
    const next = { state, port: this.path, message };
    const same = next.state === this.status.state && next.message === this.status.message && next.port === this.status.port;
    this.status = next;
    if (!same) this.emit('status', next);
  }

  /** Verbindet mit dem Port und stellt die Verbindung bei Abbrüchen automatisch wieder her. */
  connect(path) {
    this._closePort();
    clearTimeout(this.retryTimer);
    this.path = path;
    this.wanted = true;
    this._open();
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.retryTimer);
    this._closePort();
    this._setStatus('disconnected');
  }

  _closePort() {
    const port = this.port;
    this.port = null;
    if (port) {
      port.removeAllListeners();
      port.on('error', () => {});
      if (port.isOpen) port.close(() => {});
    }
  }

  _scheduleRetry() {
    clearTimeout(this.retryTimer);
    if (!this.wanted) return;
    this.retryTimer = setTimeout(() => this._open(), this.retryMs);
  }

  _open() {
    if (!this.wanted || !this.path) return;
    this._setStatus('connecting');

    const port = new SerialPort({ path: this.path, baudRate: this.baudRate, autoOpen: false });
    this.port = port;
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
    parser.on('data', (line) => {
      const values = parseLine(line);
      if (values) this.emit('values', values);
    });

    port.on('error', (err) => {
      if (port !== this.port) return;
      this._setStatus('error', friendlyError(err));
    });
    port.on('close', () => {
      if (port !== this.port) return;
      this.port = null;
      if (this.wanted) {
        if (this.status.state !== 'error') this._setStatus('error', 'Verbindung verloren, verbinde neu ...');
        this._scheduleRetry();
      }
    });

    port.open((err) => {
      if (port !== this.port) return;
      if (err) {
        this.port = null;
        this._setStatus('error', friendlyError(err));
        this._scheduleRetry();
        return;
      }
      this._setStatus('connected');
    });
  }

  static async listPorts() {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer || '',
      vendorId: p.vendorId || '',
      productId: p.productId || ''
    }));
  }
}

module.exports = { SerialLink, parseLine, friendlyError };
