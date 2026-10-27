// llms.txt generation (https://llmstxt.org): a root index that lists every
// markdown twin so crawlers and agents can find them without parsing HTML.
const { transformOutsideCodeFences } = require('./fence-transform');

const frontMatterRe = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// Title from front matter `title:`, else the first H1 outside code fences,
// else the fallback (normally the route path).
function extractTitle(rawContent, fallback) {
  let body = rawContent;
  const fm = frontMatterRe.exec(rawContent);
  if (fm) {
    body = rawContent.slice(fm[0].length);
    const titleLine = /^title:\s*(.+?)\s*$/m.exec(fm[1]);
    if (titleLine) {
      const title = unquote(titleLine[1]);
      if (title) return title;
    }
  }

  let heading = null;
  transformOutsideCodeFences(body, (segment) => {
    // Fenced blocks arrive as placeholders that swallow their trailing newline;
    // turn them into line breaks so a heading right after a fence still starts a line.
    const flat = segment.replace(/\x00FENCE\d+\x00/g, '\n');
    const m = /^#[ \t]+(.+?)[ \t]*$/m.exec(flat);
    if (m) heading = m[1].replace(/\s*\{#[^}]*\}\s*$/, '').trim();
    return segment;
  });
  return heading || fallback;
}

function escapeLinkText(text) {
  return String(text).replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function renderLlmsTxt({ title, tagline, entries }) {
  let out = `# ${title}\n\n`;
  if (tagline && String(tagline).trim()) out += `> ${String(tagline).trim()}\n\n`;
  out += '## Docs\n\n';
  for (const entry of entries) {
    out += `- [${escapeLinkText(entry.title)}](${entry.url})\n`;
  }
  return out;
}

module.exports = { extractTitle, renderLlmsTxt };
