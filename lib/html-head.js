// Advertise a page's markdown twin to crawlers that understand
// <link rel="alternate" type="text/markdown"> (the convention Mintlify,
// Anthropic, Bun and Cloudflare docs follow). Applied to built HTML in postBuild.

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function alternateLinkTag(href) {
  return `<link rel="alternate" type="text/markdown" href="${escapeAttr(href)}">`;
}

// Inserts the tag before the first </head>. Idempotent (a markdown alternate
// link already in the head, in any attribute order, means no change); HTML
// without a head is returned unchanged. Only the head section is inspected, so
// strings inside body scripts cannot suppress or misplace the insertion.
function insertAlternateLink(html, href) {
  const match = /<\/head\s*>/i.exec(html);
  if (!match) return html;
  const head = html.slice(0, match.index);
  if (/<link\b[^>]*\btype="text\/markdown"[^>]*>/i.test(head)) return html;
  return head + alternateLinkTag(href) + html.slice(match.index);
}

module.exports = { alternateLinkTag, insertAlternateLink };
