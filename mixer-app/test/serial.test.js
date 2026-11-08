const test = require('node:test');
const assert = require('node:assert');
const { parseLine, friendlyError } = require('../serial');

test('gültige Zeilen werden zerlegt (auch mit \\r\\n)', () => {
  assert.deepStrictEqual(parseLine('0|240|1023|0|483'), [0, 240, 1023, 0, 483]);
  assert.deepStrictEqual(parseLine('0|240|1023|0|483\r\n'), [0, 240, 1023, 0, 483]);
});

test('ungültige oder abgeschnittene Zeilen werden verworfen', () => {
  assert.strictEqual(parseLine(''), null);
  assert.strictEqual(parseLine('abc'), null);
  assert.strictEqual(parseLine('1|2|'), null);
  assert.strictEqual(parseLine('4558|925|41|643|220'), null);   // Wert > 1023
  assert.strictEqual(parseLine('Slider #1: 100 mV'), null);
});

test('Fehlermeldungen werden verständlich', () => {
  assert.match(friendlyError(new Error('Opening COM6: Access denied')), /belegt/);
  assert.match(friendlyError(new Error('Opening COM9: File not found')), /nicht gefunden/);
  assert.strictEqual(friendlyError(new Error('anderes Problem')), 'anderes Problem');
});
