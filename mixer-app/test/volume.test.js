// Tests für die Lautstärke-Logik. Ausführen: npm test (Node 18 oder höher)
const test = require('node:test');
const assert = require('node:assert');
const { VolumeMixer, toScalar, snap } = require('../volume');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function makeMixer(applyImpl, opts = {}) {
  const calls = [];
  const apply = async (target, scalar) => {
    calls.push([target, scalar]);
    return applyImpl ? applyImpl(target, scalar, calls) : { matched: 1 };
  };
  const mixer = new VolumeMixer({ apply, intervalMs: 10, retryMs: 20, resyncMs: 30, ...opts });
  return { mixer, calls };
}

test('toScalar und snap: Anschläge sind exakt 0 und 1', () => {
  assert.strictEqual(toScalar(0), 0);
  assert.strictEqual(toScalar(1023), 1);
  assert.strictEqual(toScalar(2), 0);
  assert.strictEqual(toScalar(1021), 1);
  assert.strictEqual(toScalar(512), 0.5);
  assert.strictEqual(snap(-5), 0);
  assert.strictEqual(snap(5000), 1023);
});

test('der letzte Wert geht nie verloren (schnelle Folge von Werten)', async () => {
  const { mixer, calls } = makeMixer();
  mixer.setTargets(['master']);
  await wait(15);
  calls.length = 0;
  for (let v = 100; v <= 900; v += 10) mixer.update(0, v);   // schnelle Bewegung
  await wait(60);
  assert.ok(calls.length >= 1);
  assert.deepStrictEqual(calls[calls.length - 1], ['master', toScalar(900)]);
  assert.ok(calls.length < 10, 'Werte sollen gebündelt werden');
  mixer.stop();
});

test('0 % und 100 % werden erreicht, auch bei kleiner Änderung zum Anschlag', async () => {
  const { mixer, calls } = makeMixer();
  mixer.setTargets(['master']);
  mixer.update(0, 8);
  await wait(30);
  mixer.update(0, 0);
  await wait(30);
  assert.deepStrictEqual(calls[calls.length - 1], ['master', 0]);
  mixer.update(0, 1020);
  await wait(30);
  mixer.update(0, 1023);
  await wait(30);
  assert.deepStrictEqual(calls[calls.length - 1], ['master', 1]);
  mixer.stop();
});

test('Zittern um wenige Punkte löst keinen neuen Befehl aus', async () => {
  const { mixer, calls } = makeMixer();
  mixer.setTargets(['master']);
  mixer.update(0, 500);
  await wait(30);
  const n = calls.length;
  mixer.update(0, 502);
  mixer.update(0, 499);
  mixer.update(0, 503);
  await wait(30);
  assert.strictEqual(calls.length, n);
  mixer.stop();
});

test('nicht zugeordnete Regler bewirken nichts', async () => {
  const { mixer, calls } = makeMixer();
  mixer.setTargets([null, 'spotify.exe']);
  mixer.update(0, 700);
  await wait(30);
  assert.strictEqual(calls.length, 0);
  mixer.stop();
});

test('neue Zuordnung wendet die aktuelle Reglerstellung sofort an', async () => {
  const { mixer, calls } = makeMixer();
  mixer.setTargets([null]);
  mixer.update(0, 600);
  await wait(30);
  assert.strictEqual(calls.length, 0);
  mixer.setTargets(['discord.exe']);
  await wait(30);
  assert.deepStrictEqual(calls, [['discord.exe', toScalar(600)]]);
  mixer.stop();
});

test('schlägt ein Befehl fehl, wird der letzte Wert erneut gesetzt', async () => {
  let failures = 2;
  const { mixer, calls } = makeMixer(async () => {
    if (failures-- > 0) throw new Error('Helfer nicht aktiv');
    return { matched: 1 };
  }, { warn: () => {} });
  mixer.setTargets(['master']);
  mixer.update(0, 800);
  await wait(150);
  assert.ok(calls.length >= 3);
  assert.deepStrictEqual(calls[calls.length - 1], ['master', toScalar(800)]);
  mixer.stop();
});

test('Programm ohne Audio-Session wird später erneut versucht', async () => {
  let sessionExists = false;
  const { mixer, calls } = makeMixer(async () => ({ matched: sessionExists ? 1 : 0 }));
  mixer.setTargets(['spotify.exe']);
  mixer.update(0, 400);
  await wait(60);
  const before = calls.length;
  sessionExists = true;
  await wait(120);
  assert.ok(calls.length > before, 'erneuter Versuch erwartet');
  const afterFound = calls.length;
  await wait(120);
  assert.strictEqual(calls.length, afterFound, 'danach keine weiteren Versuche');
  mixer.stop();
});
