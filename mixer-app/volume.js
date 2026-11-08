// Übersetzt Reglerwerte (0-1023) in Lautstärkebefehle.
//
// Wichtig: Der LETZTE Wert eines Reglers geht nie verloren. Neue Werte überschreiben nur
// den wartenden Wert, abgeschickt wird gebündelt im festen Takt. Schlägt ein Befehl
// fehl oder gibt es das Zielprogramm noch nicht, wird der Wert später erneut gesetzt.

const MAX_RAW = 1023;
const SNAP_RAW = 3;          // Werte nahe an den Anschlägen rasten auf 0 bzw. 1023 ein
const MIN_STEP_RAW = 6;      // kleinere Schwankungen (ca. 0,6 %) werden ignoriert

function snap(raw) {
  const r = Math.max(0, Math.min(MAX_RAW, Math.round(raw)));
  if (r <= SNAP_RAW) return 0;
  if (r >= MAX_RAW - SNAP_RAW) return MAX_RAW;
  return r;
}

/** Rohwert (0-1023) -> Lautstärke 0.00-1.00 mit zwei Nachkommastellen (wie deej). */
function toScalar(raw) {
  return Math.round((snap(raw) / MAX_RAW) * 100) / 100;
}

class VolumeMixer {
  /**
   * @param {object} opts
   * @param {(target: string, scalar: number) => Promise<{matched?: number}>} opts.apply
   * @param {number} [opts.intervalMs]  Takt, in dem gesammelte Werte abgeschickt werden
   * @param {number} [opts.retryMs]     Wartezeit nach einem fehlgeschlagenen Befehl
   * @param {number} [opts.resyncMs]    Wie oft Ziele ohne laufende Session neu versucht werden
   * @param {(msg: string) => void} [opts.warn]
   */
  constructor({ apply, intervalMs = 30, retryMs = 500, resyncMs = 2000, warn = () => {} }) {
    this.apply = apply;
    this.intervalMs = intervalMs;
    this.retryMs = retryMs;
    this.resyncMs = resyncMs;
    this.warn = warn;

    this.targets = [];        // Ziel je Regler (String oder null)
    this.raw = [];            // letzter bekannter Rohwert je Regler
    this.lastApplied = [];    // zuletzt erfolgreich abgeschickter (eingerasteter) Rohwert
    this.pending = new Set();
    this.unmatched = new Set();
    this.timer = null;
    this.resyncTimer = null;
    this.stopped = false;
  }

  /** Setzt die Zuordnung der Regler zu Zielen und wendet die aktuellen Reglerstellungen neu an. */
  setTargets(targets) {
    this.targets = targets.map((t) => (t ? String(t) : null));
    this.lastApplied = [];
    this.unmatched.clear();
    this.raw.forEach((value, i) => {
      if (value !== undefined) this.pending.add(i);
    });
    this._schedule(0);
    this._startResync();
  }

  /** Neuer Rohwert eines Reglers (0-1023). */
  update(index, raw) {
    if (!Number.isFinite(raw)) return;
    this.raw[index] = raw;
    this.pending.add(index);
    this._schedule(this.intervalMs);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    clearInterval(this.resyncTimer);
    this.timer = null;
    this.resyncTimer = null;
  }

  _startResync() {
    if (this.resyncTimer || this.stopped) return;
    this.resyncTimer = setInterval(() => {
      if (this.unmatched.size === 0) return;
      this.unmatched.forEach((i) => {
        this.lastApplied[i] = undefined;   // erneut setzen, auch bei gleichem Wert
        this.pending.add(i);
      });
      this.unmatched.clear();
      this._schedule(0);
    }, this.resyncMs);
    if (this.resyncTimer.unref) this.resyncTimer.unref();
  }

  _schedule(delay) {
    if (this.stopped) return;
    if (this.timer && delay > 0) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._flush(), delay);
  }

  _flush() {
    this.timer = null;
    const indices = [...this.pending];
    this.pending.clear();
    for (const i of indices) this._applyOne(i);
  }

  _applyOne(i) {
    const target = this.targets[i];
    const raw = this.raw[i];
    if (!target || raw === undefined) return;

    const value = snap(raw);
    const last = this.lastApplied[i];
    if (last !== undefined) {
      if (value === last) return;
      const atEnd = value === 0 || value === MAX_RAW;
      if (!atEnd && Math.abs(value - last) < MIN_STEP_RAW) return;
    }

    this.lastApplied[i] = value;
    Promise.resolve()
      .then(() => this.apply(target, toScalar(value)))
      .then((result) => {
        if (result && result.matched === 0) this.unmatched.add(i);
      })
      .catch((err) => {
        this.warn(`Lautstärke für "${target}" konnte nicht gesetzt werden: ${err.message}`);
        // Wert später erneut versuchen, damit die letzte Position nicht verloren geht
        if (this.lastApplied[i] === value) this.lastApplied[i] = undefined;
        this.pending.add(i);
        this._schedule(this.retryMs);
      });
  }
}

module.exports = { VolumeMixer, toScalar, snap };
