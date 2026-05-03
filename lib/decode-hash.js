function decodeHashSafely(hash) {
  if (!hash) return null;
  const id = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!id) return null;
  try {
    return decodeURIComponent(id);
  } catch {
    return null;
  }
}

module.exports = { decodeHashSafely };
