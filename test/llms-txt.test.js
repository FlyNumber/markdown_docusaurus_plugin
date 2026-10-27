const test = require('node:test');
const assert = require('node:assert/strict');
const { extractTitle, renderLlmsTxt } = require('../lib/llms-txt');

test('extractTitle: front matter title, quoted or not', () => {
  assert.equal(extractTitle('---\ntitle: Getting Started\n---\n# Other\n', '/x'), 'Getting Started');
  assert.equal(extractTitle('---\nsidebar_position: 1\ntitle: "Quoted: Title"\n---\nbody', '/x'), 'Quoted: Title');
  assert.equal(extractTitle("---\ntitle: 'Single'\n---\n", '/x'), 'Single');
});

test('extractTitle: falls back to the first H1 after front matter, then to the fallback', () => {
  assert.equal(extractTitle('---\nimage: /img/a.png\n---\n\nimport X from "y";\n\n# Frequently Asked Questions\n\ntext', '/docs/faq'), 'Frequently Asked Questions');
  assert.equal(extractTitle('# Title {#custom-id}\n', '/x'), 'Title');
  assert.equal(extractTitle('no headings here\n## only h2\n', '/docs/x'), '/docs/x');
});

test('extractTitle: handles a BOM, block-scalar titles, and ignores title: lines inside other values', () => {
  assert.equal(extractTitle('﻿---\ntitle: With BOM\n---\n', '/x'), 'With BOM');
  assert.equal(extractTitle('---\ntitle: >-\n  Folded title\n  continues\n---\n', '/x'), 'Folded title continues');
  assert.equal(extractTitle('---\ndescription: |\n  title: Fake\n  more\ntitle: Real\n---\n', '/x'), 'Real');
});

test('extractTitle: ignores a # inside a fenced code block', () => {
  assert.equal(extractTitle('```sh\n# comment\n```\n# Real\n', '/x'), 'Real');
});

test('renderLlmsTxt: title, tagline and one line per entry', () => {
  const out = renderLlmsTxt({
    title: 'Ex Docs',
    tagline: 'All about Ex',
    entries: [
      { title: 'Intro', url: 'https://ex.test/docs/index.md' },
      { title: 'FAQ', url: 'https://ex.test/docs/faq.md' },
    ],
  });
  assert.equal(out, '# Ex Docs\n\n> All about Ex\n\n## Docs\n\n- [Intro](https://ex.test/docs/index.md)\n- [FAQ](https://ex.test/docs/faq.md)\n');
});

test('renderLlmsTxt: URLs with parentheses or spaces use angle-bracket destinations; backslashes in titles are escaped', () => {
  const out = renderLlmsTxt({ title: 'Ex', tagline: '', entries: [
    { title: 'Paren', url: 'https://x.test/docs/a)b.md' },
    { title: 'Back\\slash [x]', url: 'https://x.test/docs/c d.md' },
    { title: 'Plain', url: 'https://x.test/docs/e.md' },
  ] });
  assert.equal(out, '# Ex\n\n## Docs\n\n- [Paren](<https://x.test/docs/a)b.md>)\n- [Back\\\\slash \\[x\\]](<https://x.test/docs/c d.md>)\n- [Plain](https://x.test/docs/e.md)\n');
});

test('renderLlmsTxt: omits the tagline block when empty and escapes brackets in titles', () => {
  const out = renderLlmsTxt({ title: 'Ex', tagline: '', entries: [{ title: 'A [b]', url: 'https://ex.test/a.md' }] });
  assert.equal(out, '# Ex\n\n## Docs\n\n- [A \\[b\\]](https://ex.test/a.md)\n');
});
