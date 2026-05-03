function recordImgMapping(map, src, dest) {
  let dests = map.get(src);
  if (!dests) {
    dests = new Set();
    map.set(src, dests);
  }
  dests.add(dest);
}

module.exports = { recordImgMapping };
