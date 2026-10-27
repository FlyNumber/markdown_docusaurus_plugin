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

// Inserts the tag before the first </head>. Idempotent; HTML without a head is
// returned unchanged.
function insertAlternateLink(html, href) {
  if (/rel="alternate"\s+type="text\/markdown"/i.test(html)) return html;
  const match = /<\/head\s*>/i.exec(html);
  if (!match) return html;
  return html.slice(0, match.index) + alternateLinkTag(href) + html.slice(match.index);
}

module.exports = { alternateLinkTag, insertAlternateLink };
