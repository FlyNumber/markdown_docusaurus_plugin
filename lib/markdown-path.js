function getMarkdownUrl(routePath) {
  return routePath.endsWith('/')
    ? routePath + 'index.md'
    : routePath + '.md';
}

module.exports = { getMarkdownUrl };
