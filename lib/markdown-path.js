function getMarkdownUrl(routePath) {
  return routePath.endsWith('/')
    ? routePath + 'index.md'
    : routePath + '.md';
}

// Where Docusaurus writes the HTML for a route, following its trailingSlash rules.
function getHtmlOutputPath(routePath, trailingSlash) {
  if (routePath.endsWith('/')) return routePath + 'index.html';
  if (trailingSlash === false) return routePath + '.html';
  return routePath + '/index.html';
}

module.exports = { getMarkdownUrl, getHtmlOutputPath };
