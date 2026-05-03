const fenceOpenerRe = /^ {0,3}(`{3,}|~{3,})/;

function transformOutsideCodeFences(content, transform) {
  const lines = content.split('\n');
  const fences = [];
  let buffer = '';
  let fenceContent = '';
  let inFence = false;
  let fenceMarker = '';
  let fenceLen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sep = i < lines.length - 1 ? '\n' : '';

    if (!inFence) {
      const m = line.match(fenceOpenerRe);
      if (m) {
        inFence = true;
        fenceMarker = m[1][0];
        fenceLen = m[1].length;
        fenceContent = line + sep;
      } else {
        buffer += line + sep;
      }
    } else {
      fenceContent += line + sep;
      const closerRe = new RegExp('^ {0,3}' + fenceMarker + '{' + fenceLen + ',}\\s*$');
      if (closerRe.test(line)) {
        const idx = fences.length;
        fences.push(fenceContent);
        buffer += '\x00FENCE' + idx + '\x00';
        inFence = false;
        fenceContent = '';
      }
    }
  }

  if (inFence) {
    const idx = fences.length;
    fences.push(fenceContent);
    buffer += '\x00FENCE' + idx + '\x00';
  }

  let transformed = transform(buffer);
  for (let i = 0; i < fences.length; i++) {
    transformed = transformed.replace('\x00FENCE' + i + '\x00', () => fences[i]);
  }
  return transformed;
}

module.exports = { transformOutsideCodeFences };
