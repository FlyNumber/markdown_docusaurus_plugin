const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transformOutsideCodeFences } = require('../lib/fence-transform');

const upper = (s) => s.toUpperCase();

test('applies transform to plain text with no fences', () => {
  assert.equal(transformOutsideCodeFences('hello world', upper), 'HELLO WORLD');
});

test('preserves content inside backtick fences, transforms outside', () => {
  const input = 'before\n```\ninside fence\n```\nafter';
  const expected = 'BEFORE\n```\ninside fence\n```\nAFTER';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('preserves content inside tilde fences', () => {
  const input = 'before\n~~~\ninside fence\n~~~\nafter';
  const expected = 'BEFORE\n~~~\ninside fence\n~~~\nAFTER';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('length-4 fence is not closed by a length-3 fence inside', () => {
  const input = 'a\n````\n```\ninside\n```\n````\nb';
  const expected = 'A\n````\n```\ninside\n```\n````\nB';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('opener with up to 3 leading spaces is treated as a fence', () => {
  const input = 'a\n   ```\ninside\n   ```\nb';
  const expected = 'A\n   ```\ninside\n   ```\nB';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('opener with 4+ leading spaces is NOT a fence (indented code by markdown rules, but we do not protect it here)', () => {
  // 4-space indent in CommonMark is an indented code block, not a fenced one. We let
  // the regexes hit it — but the marker on its own should not flip our state machine.
  const input = '    ```\nstill outside\n    ```\nafter';
  const result = transformOutsideCodeFences(input, upper);
  assert.equal(result, '    ```\nSTILL OUTSIDE\n    ```\nAFTER');
});

test('preserves CRLF line endings', () => {
  const input = 'a\r\n```\r\ncode\r\n```\r\nb';
  const expected = 'A\r\n```\r\ncode\r\n```\r\nB';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('multiple fences: each protects its own content', () => {
  const input = 'a\n```\nx\n```\nb\n```\ny\n```\nc';
  const expected = 'A\n```\nx\n```\nB\n```\ny\n```\nC';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('unclosed fence: rest of content is treated as code', () => {
  const input = 'before\n```\nnever closed\nmore code';
  const expected = 'BEFORE\n```\nnever closed\nmore code';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});

test('mixed fence markers: backtick opener is not closed by tilde', () => {
  const input = 'a\n```\n~~~\nstill code\n```\nb';
  const expected = 'A\n```\n~~~\nstill code\n```\nB';
  assert.equal(transformOutsideCodeFences(input, upper), expected);
});
