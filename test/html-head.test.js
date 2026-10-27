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

test('insertAlternateLink: a "</head>" inside a script string in the body is not a head close', () => {
  const html = '<html><head><title>x</title></head><body><script>const s = "</head>";</script></body></html>';
  const out = insertAlternateLink(html, 'https://ex.test/x.md');
  assert.equal(out, '<html><head><title>x</title><link rel="alternate" type="text/markdown" href="https://ex.test/x.md"></head><body><script>const s = "</head>";</script></body></html>');
});

test('insertAlternateLink: example link markup in the body does not suppress insertion', () => {
  const html = '<html><head></head><body><code>&lt;link rel="alternate" type="text/markdown"&gt;</code><script>x = \'rel="alternate" type="text/markdown"\';</script></body></html>';
  const out = insertAlternateLink(html, 'https://ex.test/x.md');
  assert.ok(out.includes('<link rel="alternate" type="text/markdown" href="https://ex.test/x.md"></head>'));
});

test('insertAlternateLink: an existing link with reordered attributes is not duplicated', () => {
  const html = '<html><head><link type="text/markdown" rel="alternate" href="https://ex.test/x.md"></head><body></body></html>';
  assert.equal(insertAlternateLink(html, 'https://ex.test/x.md'), html);
});

test('insertAlternateLink: matches </HEAD> case-insensitively and only the first one', () => {
  const html = '<html><HEAD></HEAD><body><!-- </head> --></body></html>';
  const out = insertAlternateLink(html, 'https://ex.test/x.md');
  assert.equal(out, '<html><HEAD><link rel="alternate" type="text/markdown" href="https://ex.test/x.md"></HEAD><body><!-- </head> --></body></html>');
});
