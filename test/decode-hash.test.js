const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeHashSafely } = require('../lib/decode-hash');

test('decodes a normal hash with leading #', () => {
  assert.equal(decodeHashSafely('#install'), 'install');
});

test('decodes a URL-encoded hash', () => {
  assert.equal(decodeHashSafely('#hello%20world'), 'hello world');
});

test('decodes UTF-8 percent encoding', () => {
  assert.equal(decodeHashSafely('#%E4%B8%AD'), '中');
});

test('returns null on malformed percent encoding (no throw)', () => {
  assert.equal(decodeHashSafely('#%foo'), null);
  assert.equal(decodeHashSafely('#%'), null);
  assert.equal(decodeHashSafely('#%E4'), null);
});

test('handles hash without leading #', () => {
  assert.equal(decodeHashSafely('install'), 'install');
});

test('returns null for empty / nullish input', () => {
  assert.equal(decodeHashSafely(''), null);
  assert.equal(decodeHashSafely('#'), null);
  assert.equal(decodeHashSafely(null), null);
  assert.equal(decodeHashSafely(undefined), null);
});
