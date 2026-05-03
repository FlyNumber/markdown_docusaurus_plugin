const { transformOutsideCodeFences } = require('./fence-transform');

function convertTabsToMarkdown(content) {
  const tabsPattern = /<Tabs[^>]*>([\s\S]*?)<\/Tabs>/g;

  return content.replace(tabsPattern, (fullMatch, tabsContent) => {
    const tabItemPattern = /<TabItem\s+[^>]*value="([^"]*)"[^>]*label="([^"]*)"[^>]*>([\s\S]*?)<\/TabItem>/g;

    let result = [];
    let match;

    while ((match = tabItemPattern.exec(tabsContent)) !== null) {
      const [, value, label, itemContent] = match;

      const cleanContent = itemContent
        .split('\n')
        .map(line => line.replace(/^\s{4}/, ''))
        .join('\n')
        .trim();

      result.push(`**${label}:**\n\n${cleanContent}`);
    }

    return result.join('\n\n---\n\n');
  });
}

function convertDetailsToMarkdown(content) {
  const detailsPattern = /<details>\s*<summary>(<strong>)?([^<]+)(<\/strong>)?<\/summary>([\s\S]*?)<\/details>/g;

  return content.replace(detailsPattern, (fullMatch, strongOpen, summaryText, strongClose, detailsContent) => {
    const cleanContent = detailsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();

    return `### ${summaryText.trim()}\n\n${cleanContent}`;
  });
}

function cleanMarkdownForDisplay(content, routeDir) {
  // Strip YAML front matter (always at top, before any fence)
  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  // Run all MDX/JSX transforms with fenced code blocks protected so docs
  // demonstrating Docusaurus syntax keep their examples intact.
  content = transformOutsideCodeFences(content, (segment) => {
    // Remove import statements (MDX imports)
    segment = segment.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');

    // Convert HTML images: <p align="center"><img src={require('./path').default} alt="..." /></p>
    segment = segment.replace(
      /<p align="center">\s*\n?\s*<img src=\{require\(['"]([^'"]+)['"]\)\.default\} alt="([^"]*)"(?:\s+width="[^"]*")?\s*\/>\s*\n?\s*<\/p>/g,
      (match, imagePath, alt) => {
        const cleanPath = imagePath.replace('@site/static/', '/');
        return `![${alt}](${cleanPath})`;
      }
    );

    // Convert YouTube iframes to text links
    segment = segment.replace(
      /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^"]*"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/g,
      'Watch the video: [$2](https://www.youtube.com/watch?v=$1)'
    );

    // Clean HTML5 video tags - keep HTML but add fallback text
    segment = segment.replace(
      /<video[^>]*>\s*<source src=["']([^"']+)["'][^>]*>\s*<\/video>/g,
      '<video controls>\n  <source src="$1" type="video/mp4" />\n  <p>Video demonstration: $1</p>\n</video>'
    );

    // Remove <Head> components with structured data
    segment = segment.replace(/<Head>[\s\S]*?<\/Head>/g, '');

    // Convert Tabs/TabItem to readable markdown (preserve content)
    segment = convertTabsToMarkdown(segment);

    // Convert details/summary to readable markdown (preserve content)
    segment = convertDetailsToMarkdown(segment);

    // Remove custom React/MDX components
    segment = segment.replace(/<[A-Z][a-zA-Z]*[\s\S]*?(?:\/>|<\/[A-Z][a-zA-Z]*>)/g, '');

    // Convert relative image paths to absolute paths using route URL directory
    segment = segment.replace(
      /!\[([^\]]*)\]\((\.\/)?img\/([^)]+)\)/g,
      (match, alt, relPrefix, filename) => `![${alt}](${routeDir}img/${filename})`
    );

    return segment;
  });

  // Remove any leading blank lines
  content = content.replace(/^\s*\n/, '');

  return content;
}

module.exports = {
  cleanMarkdownForDisplay,
  convertTabsToMarkdown,
  convertDetailsToMarkdown,
};
