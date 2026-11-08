const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ConfigStore, sanitize, defaultConfig } = require('../config');

function tmpFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audiomix-test-'));
  return path.join(dir, 'config.json');
}

test('Standardkonfiguration hat 5 Regler, Regler 1 ist Master', () => {
  const cfg = defaultConfig();
  assert.strictEqual(cfg.sliders.length, 5);
  assert.strictEqual(cfg.sliders[0].app, 'master');
  assert.strictEqual(cfg.sliders[1].app, null);
});

test('sanitize repariert ungültige Daten', () => {
  const cfg = sanitize({
    comPort: 'rm -rf /',
    currentProfile: 'unbekannt',
    sliders: [{ name: 123, app: { x: 1 } }, null, { name: 'A'.repeat(100), app: 'spotify.exe' }],
    profiles: { gaming: 'kaputt', work: [{ name: 'Büro', app: 'teams.exe' }] }
  });
  assert.strictEqual(cfg.comPort, null);
  assert.strictEqual(cfg.currentProfile, 'default');
  assert.strictEqual(cfg.sliders.length, 5);
  assert.strictEqual(cfg.sliders[0].app, null);
  assert.strictEqual(cfg.sliders[2].name.length, 40);
  assert.strictEqual(cfg.sliders[2].app, 'spotify.exe');
  assert.strictEqual(cfg.profiles.gaming, undefined);
  assert.strictEqual(cfg.profiles.work[0].app, 'teams.exe');
  assert.strictEqual(cfg.profiles.work.length, 5);
});

test('COM-Port wird normalisiert', () => {
  assert.strictEqual(sanitize({ comPort: 'com6' }).comPort, 'COM6');
  assert.strictEqual(sanitize({ comPort: 'COM123456' }).comPort, null);
});

test('Speichern und Laden ergeben dieselbe Konfiguration', () => {
  const file = tmpFile();
  const a = new ConfigStore(file);
  a.load();
  a.update({ comPort: 'COM6', sliders: [{ name: 'Musik', app: 'spotify.exe' }] });
  const b = new ConfigStore(file);
  b.load();
  assert.strictEqual(b.get().comPort, 'COM6');
  assert.strictEqual(b.get().sliders[0].app, 'spotify.exe');
  assert.strictEqual(b.get().sliders[0].name, 'Musik');
  assert.ok(!fs.existsSync(`${file}.tmp`), 'keine temporäre Datei zurücklassen');
});

test('beschädigte Datei führt zu Standardwerten und wird gesichert', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{ das ist kein json');
  const store = new ConfigStore(file);
  store.load();
  assert.deepStrictEqual(store.get(), defaultConfig());
  assert.ok(fs.existsSync(`${file}.defekt`));
});
