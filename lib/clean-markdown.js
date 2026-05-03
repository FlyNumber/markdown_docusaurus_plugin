const { transformOutsideCodeFences } = require('./fence-transform');

const tabItemPattern = /<TabItem\b([^>]*)>([\s\S]*?)<\/TabItem>/g;
const valueAttrRe = /\bvalue\s*=\s*["']([^"']*)["']/;
const labelAttrRe = /\blabel\s*=\s*["']([^"']*)["']/;

function convertTabsToMarkdown(content) {
  const tabsPattern = /<Tabs[^>]*>([\s\S]*?)<\/Tabs>/g;

  return content.replace(tabsPattern, (fullMatch, tabsContent) => {
    const result = [];
    tabItemPattern.lastIndex = 0;
    let match;
    while ((match = tabItemPattern.exec(tabsContent)) !== null) {
      const [, attrs, itemContent] = match;
      const labelMatch = attrs.match(labelAttrRe);
      if (!labelMatch) continue;
      const label = labelMatch[1];

      const cleanContent = itemContent
        .split('\n')
        .map(line => line.replace(/^\s{4}/, ''))
        .join('\n')
        .trim();

      result.push(`**${label}:**\n\n${cleanContent}`);
    }

    if (result.length === 0) return fullMatch;
    return result.join('\n\n---\n\n');
  });
}

function convertDetailsToMarkdown(content) {
  const detailsPattern = /<details(?:\s[^>]*)?>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;

  return content.replace(detailsPattern, (fullMatch, summaryHtml, body) => {
    const summaryText = summaryHtml.replace(/<[^>]+>/g, '').trim();
    const cleanBody = body.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    return `### ${summaryText}\n\n${cleanBody}`;
  });
}

function cleanMarkdownForDisplay(content, routeDir) {
  // Strip YAML front matter (always at top, before any fence)
  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  content = transformOutsideCodeFences(content, (segment) => {
    // Remove import statements (default, named multi-line, and side-effect)
    segment = segment.replace(
      /^import\s+(?:[\s\S]*?from\s+)?['"][^'"\n]*['"];?\s*$/gm,
      ''
    );

    // Convert HTML images: <p align="center"><img src={require('./path').default} alt="..." /></p>
    segment = segment.replace(
      /<p align="center">\s*\n?\s*<img src=\{require\(['"]([^'"]+)['"]\)\.default\} alt="([^"]*)"(?:\s+width="[^"]*")?\s*\/>\s*\n?\s*<\/p>/g,
      (match, imagePath, alt) => {
        const cleanPath = imagePath.replace('@site/static/', '/');
        return `![${alt}](${cleanPath})`;
      }
    );

    // Convert YouTube iframes to text links (attribute order independent, single or double quotes)
    segment = segment.replace(
      /<iframe([^>]*)>[\s\S]*?<\/iframe>/g,
      (fullMatch, attrs) => {
        const srcMatch = attrs.match(
          /\bsrc\s*=\s*["']https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^"']*["']/
        );
        if (!srcMatch) return fullMatch;
        const titleMatch = attrs.match(/\btitle\s*=\s*["']([^"']*)["']/);
        const title = titleMatch ? titleMatch[1] : 'Video';
        return `Watch the video: [${title}](https://www.youtube.com/watch?v=${srcMatch[1]})`;
      }
    );

    // Clean HTML5 video tags
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

    // Remove custom React/MDX components (paired tags use a backreference so different
    // sibling components do not produce orphan close tags)
    segment = segment.replace(/<([A-Z]\w*)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g, '');

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
