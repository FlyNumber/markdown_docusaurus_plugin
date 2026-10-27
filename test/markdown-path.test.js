const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getMarkdownUrl, getHtmlOutputPath } = require('../lib/markdown-path');

test('getHtmlOutputPath: trailing-slash routes map to <route>index.html', () => {
  assert.equal(getHtmlOutputPath('/docs/', undefined), '/docs/index.html');
  assert.equal(getHtmlOutputPath('/docs/', false), '/docs/index.html');
});

test('getHtmlOutputPath: default and trailingSlash:true map to <route>/index.html', () => {
  assert.equal(getHtmlOutputPath('/docs/faq', undefined), '/docs/faq/index.html');
  assert.equal(getHtmlOutputPath('/docs/faq', true), '/docs/faq/index.html');
});

test('getHtmlOutputPath: trailingSlash:false maps to <route>.html', () => {
  assert.equal(getHtmlOutputPath('/docs/faq', false), '/docs/faq.html');
});

test('getHtmlOutputPath: routes that already end in .html/.htm are written as-is', () => {
  assert.equal(getHtmlOutputPath('/docs/guide.html', undefined), '/docs/guide.html');
  assert.equal(getHtmlOutputPath('/docs/guide.html', false), '/docs/guide.html');
  assert.equal(getHtmlOutputPath('/docs/guide.HTM', true), '/docs/guide.HTM');
});

test('non-trailing-slash routes append .md to the path', () => {
  assert.equal(getMarkdownUrl('/docs/intro'), '/docs/intro.md');
  assert.equal(getMarkdownUrl('/docs/guides/foo'), '/docs/guides/foo.md');
});

test('trailing-slash routes resolve to index.md (avoids intro.md collision)', () => {
  assert.equal(getMarkdownUrl('/docs/'), '/docs/index.md');
  assert.equal(getMarkdownUrl('/docs/guides/'), '/docs/guides/index.md');
  assert.equal(getMarkdownUrl('/'), '/index.md');
});
