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

// Reads a top-level `title:` from front matter text. Handles quoted scalars and
// `>`/`|` block scalars (continuation lines are indented, so a `title:` inside
// another key's block never matches at column 0).
function frontMatterTitle(frontMatter) {
  const lines = frontMatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^title:[ \t]*(.*?)[ \t]*$/.exec(lines[i]);
    if (!m) continue;
    const value = m[1];
    if (/^[>|][-+]?$/.test(value)) {
      const parts = [];
      for (let j = i + 1; j < lines.length && /^[ \t]+\S/.test(lines[j]); j++) parts.push(lines[j].trim());
      return parts.join(' ');
    }
    return unquote(value);
  }
  return '';
}

// Title from front matter `title:`, else the first H1 outside code fences,
// else the fallback (normally the route path).
function extractTitle(rawContent, fallback) {
  const source = rawContent.replace(/^﻿/, '');
  let body = source;
  const fm = frontMatterRe.exec(source);
  if (fm) {
    body = source.slice(fm[0].length);
    const title = frontMatterTitle(fm[1]);
    if (title) return title;
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
  return String(text).replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

// A destination containing parentheses, spaces or angle brackets would break
// the `[text](url)` form, so wrap it in angle brackets as CommonMark allows.
function linkDestination(url) {
  return /[()\s<>]/.test(url) ? `<${url}>` : url;
}

function renderLlmsTxt({ title, tagline, entries }) {
  let out = `# ${title}\n\n`;
  if (tagline && String(tagline).trim()) out += `> ${String(tagline).trim()}\n\n`;
  out += '## Docs\n\n';
  for (const entry of entries) {
    out += `- [${escapeLinkText(entry.title)}](${linkDestination(entry.url)})\n`;
  }
  return out;
}

module.exports = { extractTitle, renderLlmsTxt };
