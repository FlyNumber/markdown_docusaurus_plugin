const test = require('node:test');
const assert = require('node:assert/strict');
const { ICON_PATHS, GENERIC_ICON_PATH } = require('../lib/ai-icons');
const { BUILT_IN_PROVIDERS } = require('../lib/ai-providers');

test('icon table covers exactly the built-in ids, plus a generic path', () => {
  assert.deepEqual(Object.keys(ICON_PATHS).sort(), BUILT_IN_PROVIDERS.map(p => p.id).sort());
  for (const [id, d] of Object.entries(ICON_PATHS)) assert.ok(d.startsWith('M'), id);
  assert.ok(GENERIC_ICON_PATH.startsWith('M'));
  assert.equal(ICON_PATHS['custom-0'], undefined);
});
