const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanMarkdownForDisplay,
  convertTabsToMarkdown,
  convertDetailsToMarkdown,
} = require('../lib/clean-markdown');

// --- Tabs / TabItem ---

test('Tabs: reverse-order TabItem attrs (label before value) still convert', () => {
  const input = '<Tabs><TabItem label="Apple" value="apple">Body A</TabItem></Tabs>';
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.match(result, /\*\*Apple:\*\*/);
  assert.match(result, /Body A/);
});

test('Tabs: mixed-order across TabItems (one label-first, one value-first) both convert', () => {
  const input =
    '<Tabs>' +
    '<TabItem label="A" value="a">First</TabItem>' +
    '<TabItem value="b" label="B">Second</TabItem>' +
    '</Tabs>';
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.match(result, /\*\*A:\*\*[\s\S]*First/);
  assert.match(result, /\*\*B:\*\*[\s\S]*Second/);
});

test('convertTabsToMarkdown: returns original block when no TabItems parse', () => {
  const input = '<Tabs><BrokenItem /></Tabs>';
  assert.equal(convertTabsToMarkdown(input), input);
});

// --- Imports ---

test('imports: multi-line import is removed', () => {
  const input = "import {\n  Foo,\n  Bar,\n} from './x';\n\n# Heading";
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.ok(!result.includes('Foo'), 'import body should be gone');
  assert.ok(!result.includes('import'), 'import keyword should be gone');
  assert.match(result, /^# Heading/m);
});

test('imports: side-effect import is removed', () => {
  const input = "import './x.css';\n\n# Heading";
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.ok(!result.includes('import'));
  assert.match(result, /^# Heading/m);
});

// --- Component scrubber ---

test('component scrubber: <Outer><Inner>x</Inner></Outer> removes both with no orphan', () => {
  const input = 'before <Outer><Inner>x</Inner></Outer> after';
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.ok(!result.includes('</Outer>'), 'Outer closing tag should not survive');
  assert.ok(!result.includes('</Inner>'), 'Inner closing tag should not survive');
  assert.ok(!result.includes('<Outer>'), 'Outer opening tag should not survive');
});

// --- YouTube iframe ---

test('YouTube iframe: title-before-src order is converted to text link', () => {
  const input =
    '<iframe title="My Video" src="https://www.youtube.com/embed/abc123" frameborder="0"></iframe>';
  const result = cleanMarkdownForDisplay(input, '/docs/');
  assert.match(
    result,
    /Watch the video: \[My Video\]\(https:\/\/www\.youtube\.com\/watch\?v=abc123\)/
  );
});

// --- <details> ---

test('details: opening tag with attribute (<details open>) is converted', () => {
  const input = '<details open><summary>Hello</summary>\nbody text\n</details>';
  const result = convertDetailsToMarkdown(input);
  assert.match(result, /### Hello/);
  assert.match(result, /body text/);
});

test('details: summary with mixed inline content extracts text', () => {
  const input =
    '<details><summary><strong>Title</strong> with extra</summary>\nbody\n</details>';
  const result = convertDetailsToMarkdown(input);
  assert.match(result, /### Title with extra/);
});

test('details: 4-space indented code in body is preserved (no whitespace destruction)', () => {
  const input = [
    '<details>',
    '<summary>Hello</summary>',
    '',
    '    indented_code()',
    '',
    '</details>',
  ].join('\n');
  const result = convertDetailsToMarkdown(input);
  assert.match(result, /### Hello/);
  assert.match(result, /    indented_code\(\)/);
});

test('details: blank lines inside body are preserved (no filter)', () => {
  const input = [
    '<details>',
    '<summary>Hello</summary>',
    '',
    'first paragraph',
    '',
    'second paragraph',
    '',
    '</details>',
  ].join('\n');
  const result = convertDetailsToMarkdown(input);
  assert.match(result, /first paragraph\n\nsecond paragraph/);
});
