const test = require('node:test');
const assert = require('node:assert/strict');
const { insertAlternateLink, alternateLinkTag } = require('../lib/html-head');

const page = '<!doctype html><html><head><title>Doc</title></head><body><p>hi</p></body></html>';

test('alternateLinkTag: builds the link with an escaped href', () => {
  assert.equal(
    alternateLinkTag('https://ex.test/docs/a&b.md'),
    '<link rel="alternate" type="text/markdown" href="https://ex.test/docs/a&amp;b.md">'
  );
});

test('insertAlternateLink: inserts the tag right before </head>', () => {
  const out = insertAlternateLink(page, 'https://ex.test/docs/doc.md');
  assert.equal(out, '<!doctype html><html><head><title>Doc</title><link rel="alternate" type="text/markdown" href="https://ex.test/docs/doc.md"></head><body><p>hi</p></body></html>');
});

test('insertAlternateLink: is idempotent', () => {
  const once = insertAlternateLink(page, 'https://ex.test/docs/doc.md');
  assert.equal(insertAlternateLink(once, 'https://ex.test/docs/doc.md'), once);
});

test('insertAlternateLink: leaves HTML without </head> untouched', () => {
  assert.equal(insertAlternateLink('<p>no head</p>', 'https://ex.test/x.md'), '<p>no head</p>');
});

test('insertAlternateLink: matches </HEAD> case-insensitively and only the first one', () => {
  const html = '<html><HEAD></HEAD><body><!-- </head> --></body></html>';
  const out = insertAlternateLink(html, 'https://ex.test/x.md');
  assert.equal(out, '<html><HEAD><link rel="alternate" type="text/markdown" href="https://ex.test/x.md"></HEAD><body><!-- </head> --></body></html>');
});
