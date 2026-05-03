const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getMarkdownUrl } = require('../lib/markdown-path');

test('non-trailing-slash routes append .md to the path', () => {
  assert.equal(getMarkdownUrl('/docs/intro'), '/docs/intro.md');
  assert.equal(getMarkdownUrl('/docs/guides/foo'), '/docs/guides/foo.md');
});

test('trailing-slash routes resolve to index.md (avoids intro.md collision)', () => {
  assert.equal(getMarkdownUrl('/docs/'), '/docs/index.md');
  assert.equal(getMarkdownUrl('/docs/guides/'), '/docs/guides/index.md');
  assert.equal(getMarkdownUrl('/'), '/index.md');
});
