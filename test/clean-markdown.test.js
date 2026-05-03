const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cleanMarkdownForDisplay } = require('../lib/clean-markdown');

test('preserves Tabs example inside a fenced code block', () => {
  const input = [
    '# How to use Tabs',
    '',
    '```mdx',
    "import Tabs from '@theme/Tabs';",
    '',
    '<Tabs>',
    '  <TabItem value="a" label="A">Body A</TabItem>',
    '</Tabs>',
    '```',
    '',
    "That's it.",
  ].join('\n');

  const result = cleanMarkdownForDisplay(input, '/docs/');

  // Fence content must be intact
  assert.match(result, /<Tabs>/);
  assert.match(result, /<\/Tabs>/);
  assert.match(result, /<TabItem value="a" label="A">Body A<\/TabItem>/);
  assert.match(result, /import Tabs from '@theme\/Tabs';/);
});

test('still converts Tabs that appear OUTSIDE a fenced code block', () => {
  const input = '<Tabs><TabItem value="a" label="A">Body</TabItem></Tabs>';
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.ok(!result.includes('<Tabs>'), 'Tabs tag should be converted away');
  assert.match(result, /\*\*A:\*\*/);
  assert.match(result, /Body/);
});

test('strips YAML front matter at top, but does not touch --- inside fences', () => {
  const input = [
    '---',
    'title: Real Front Matter',
    '---',
    '',
    '# Heading',
    '',
    '```yaml',
    '---',
    'this: is fence content',
    '---',
    '```',
  ].join('\n');

  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.ok(!result.includes('Real Front Matter'), 'top front matter should be stripped');
  assert.match(result, /this: is fence content/, 'fence content with --- should be preserved');
});
