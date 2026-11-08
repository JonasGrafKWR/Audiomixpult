// Konfiguration der App: wird als JSON im userData-Ordner gespeichert
// (unter Windows: %APPDATA%\audiomixpult-control\config.json).

const fs = require('fs');
const path = require('path');

const SLIDER_COUNT = 5;
const PROFILE_NAMES = ['default', 'gaming', 'streaming', 'work'];
const MAX_NAME_LENGTH = 40;
const MAX_APP_LENGTH = 260;

function defaultSliders() {
  return Array.from({ length: SLIDER_COUNT }, (_, i) => ({
    id: i,
    name: `Slider ${i + 1}`,
    app: i === 0 ? 'master' : null
  }));
}

function defaultConfig() {
  return {
    comPort: null,
    autoConnect: true,
    minimizeToTray: true,
    currentProfile: 'default',
    sliders: defaultSliders(),
    profiles: {}
  };
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

/** Prüft eine Reglerliste und füllt fehlende Einträge auf. */
function sanitizeSliders(list) {
  const result = defaultSliders().map((d) => ({ ...d, app: null }));
  if (!Array.isArray(list)) return null;
  for (let i = 0; i < SLIDER_COUNT; i++) {
    const s = list[i];
    if (!s || typeof s !== 'object') continue;
    const name = cleanString(s.name, MAX_NAME_LENGTH);
    const app = cleanString(s.app, MAX_APP_LENGTH);
    result[i] = { id: i, name: name || `Slider ${i + 1}`, app: app || null };
  }
  return result;
}

/** Macht aus beliebigen (z. B. beschädigten) Daten eine gültige Konfiguration. */
function sanitize(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;

  const comPort = cleanString(raw.comPort, 32);
  const profile = PROFILE_NAMES.includes(raw.currentProfile) ? raw.currentProfile : 'default';

  const profiles = {};
  if (raw.profiles && typeof raw.profiles === 'object') {
    for (const name of PROFILE_NAMES) {
      const s = sanitizeSliders(raw.profiles[name]);
      if (s) profiles[name] = s;
    }
  }

  return {
    comPort: /^COM\d{1,3}$/i.test(comPort) ? comPort.toUpperCase() : null,
    autoConnect: raw.autoConnect !== false,
    minimizeToTray: raw.minimizeToTray !== false,
    currentProfile: profile,
    sliders: sanitizeSliders(raw.sliders) || base.sliders,
    profiles
  };
}

class ConfigStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = defaultConfig();
  }

  load() {
    try {
      const text = fs.readFileSync(this.filePath, 'utf8');
      this.data = sanitize(JSON.parse(text));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Beschädigte Datei sichern, statt sie stillschweigend zu überschreiben
        try { fs.renameSync(this.filePath, `${this.filePath}.defekt`); } catch { /* egal */ }
        console.warn(`Konfiguration konnte nicht gelesen werden (${err.message}), Standardwerte werden verwendet`);
      }
      this.data = defaultConfig();
    }
    return this.data;
  }

  get() {
    return this.data;
  }

  /** Übernimmt Änderungen (werden geprüft) und speichert sofort. */
  update(partial) {
    this.data = sanitize({ ...this.data, ...partial });
    this.save();
    return this.data;
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);   // ersetzt die Datei in einem Schritt
    } catch (err) {
      console.warn(`Konfiguration konnte nicht gespeichert werden: ${err.message}`);
    }
  }
}

module.exports = { ConfigStore, sanitize, defaultConfig, SLIDER_COUNT, PROFILE_NAMES };
