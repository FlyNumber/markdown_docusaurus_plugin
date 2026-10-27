const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../index');

test('validateOptions: bare registration gets id "default" and keeps raw options', () => {
  const out = plugin.validateOptions({ options: {} });
  assert.equal(out.id, 'default');
  assert.equal(out.aiProviders, undefined);
  assert.equal(out.docsPath, undefined);
});

test('validateOptions: explicit "default" id and other keys are preserved', () => {
  const out = plugin.validateOptions({ options: { id: 'default', docsPath: 'guides', aiProviders: ['claude'] } });
  assert.equal(out.id, 'default');
  assert.equal(out.docsPath, 'guides');
  assert.deepEqual(out.aiProviders, ['claude']);
});

test('validateOptions: non-default or malformed ids are rejected because Root reads the default instance', () => {
  assert.throws(() => plugin.validateOptions({ options: { id: 'second' } }), /\[markdown-source-plugin\] .*id "second".*default/);
  assert.throws(() => plugin.validateOptions({ options: { id: 42 } }), /\[markdown-source-plugin\] .*id 42.*default/);
});

test('validateOptions: bad config throws at config time', () => {
  assert.throws(() => plugin.validateOptions({ options: { aiProviders: ['nope'] } }), /\[markdown-source-plugin\]/);
  assert.throws(() => plugin.validateOptions({ options: { aiPrompt: 'no placeholder' } }), /\[markdown-source-plugin\]/);
});

async function globalDataFor(rawOptions) {
  const options = plugin.validateOptions({ options: rawOptions });
  const instance = plugin({ siteDir: '/tmp' }, options);
  let data;
  await instance.contentLoaded({ actions: { setGlobalData: d => { data = d; } } });
  return data;
}

test('contentLoaded: publishes normalized docsPath, aiProviders and aiPrompt', async () => {
  const data = await globalDataFor({ docsPath: 'guides', aiProviders: ['claude', { label: 'Open in X', url: 'https://x.test/?q={prompt}' }] });
  assert.equal(data.docsPath, '/guides/');
  assert.deepEqual(data.aiProviders.map(p => p.id), ['claude', 'custom-1']);
  assert.equal(data.aiProviders[0].context, 'markdown');
  assert.equal(data.aiPrompt, 'Read from {url} so I can ask questions about it.');
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
});

test('contentLoaded: defaults for bare registration', async () => {
  const data = await globalDataFor({});
  assert.equal(data.docsPath, '/docs/');
  assert.equal(data.aiProviders.length, 5);
});

test('contentLoaded: aiProviders false publishes an empty list', async () => {
  const data = await globalDataFor({ aiProviders: false });
  assert.deepEqual(data.aiProviders, []);
});
