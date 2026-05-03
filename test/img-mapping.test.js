const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordImgMapping } = require('../lib/img-mapping');

test('new src adds entry with a single-element Set of destinations', () => {
  const m = new Map();
  recordImgMapping(m, 'src1', 'dest1');
  assert.ok(m.get('src1') instanceof Set);
  assert.deepEqual([...m.get('src1')], ['dest1']);
});

test('same src with a different dest grows the Set (per-route destination)', () => {
  const m = new Map();
  recordImgMapping(m, 'src1', 'dest1');
  recordImgMapping(m, 'src1', 'dest2');
  assert.deepEqual([...m.get('src1')].sort(), ['dest1', 'dest2']);
});

test('same src with the same dest does not duplicate', () => {
  const m = new Map();
  recordImgMapping(m, 'src1', 'dest1');
  recordImgMapping(m, 'src1', 'dest1');
  assert.equal(m.get('src1').size, 1);
});

test('different src creates independent entries', () => {
  const m = new Map();
  recordImgMapping(m, 'src1', 'dest1');
  recordImgMapping(m, 'src2', 'dest2');
  assert.deepEqual([...m.get('src1')], ['dest1']);
  assert.deepEqual([...m.get('src2')], ['dest2']);
});
