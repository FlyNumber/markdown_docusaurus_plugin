const fs = require('fs-extra');
const path = require('path');
const { getMarkdownUrl } = require('./lib/markdown-path');

/**
 * Docusaurus plugin to copy raw markdown files to build output
 * This allows users to view markdown source by appending .md to URLs
 */

// Convert Tabs/TabItem components to readable markdown format
function convertTabsToMarkdown(content) {
  const tabsPattern = /<Tabs[^>]*>([\s\S]*?)<\/Tabs>/g;

  return content.replace(tabsPattern, (fullMatch, tabsContent) => {
    const tabItemPattern = /<TabItem\s+[^>]*value="([^"]*)"[^>]*label="([^"]*)"[^>]*>([\s\S]*?)<\/TabItem>/g;

    let result = [];
    let match;

    while ((match = tabItemPattern.exec(tabsContent)) !== null) {
      const [, value, label, itemContent] = match;

      // Clean up indentation from the tab content
      const cleanContent = itemContent
        .split('\n')
        .map(line => line.replace(/^\s{4}/, '')) // Remove 4-space indentation
        .join('\n')
        .trim();

      result.push(`**${label}:**\n\n${cleanContent}`);
    }

    return result.join('\n\n---\n\n');
  });
}

// Convert details/summary components to readable markdown format
function convertDetailsToMarkdown(content) {
  const detailsPattern = /<details>\s*<summary>(<strong>)?([^<]+)(<\/strong>)?<\/summary>([\s\S]*?)<\/details>/g;

  return content.replace(detailsPattern, (fullMatch, strongOpen, summaryText, strongClose, detailsContent) => {
    // Clean up the details content
    const cleanContent = detailsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();

    return `### ${summaryText.trim()}\n\n${cleanContent}`;
  });
}

// Flatten nested Docusaurus route tree into a flat array
function flattenRoutes(routes) {
  return routes.flatMap(route => [
    route,
    ...(route.routes ? flattenRoutes(route.routes) : []),
  ]);
}

// Strip baseUrl prefix from a URL path to get build-relative path
function stripBaseUrl(urlPath, baseUrl) {
  if (baseUrl !== '/' && urlPath.startsWith(baseUrl)) {
    return urlPath.slice(baseUrl.length);
  }
  return urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
}

// Clean markdown content for raw display - remove MDX/Docusaurus-specific syntax
function cleanMarkdownForDisplay(content, routeDir) {

  // 1. Strip YAML front matter (--- at start, content, then ---)
  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  // 2. Remove import statements (MDX imports)
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');

  // 3. Convert HTML images to markdown
  // Pattern: <p align="center"><img src={require('./path').default} alt="..." width="..." /></p>
  content = content.replace(
    /<p align="center">\s*\n?\s*<img src=\{require\(['"]([^'"]+)['"]\)\.default\} alt="([^"]*)"(?:\s+width="[^"]*")?\s*\/>\s*\n?\s*<\/p>/g,
    (match, imagePath, alt) => {
      // Clean the path: remove @site/static prefix
      const cleanPath = imagePath.replace('@site/static/', '/');
      return `![${alt}](${cleanPath})`;
    }
  );

  // 4. Convert YouTube iframes to text links
  content = content.replace(
    /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^"]*"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/g,
    'Watch the video: [$2](https://www.youtube.com/watch?v=$1)'
  );

  // 5. Clean HTML5 video tags - keep HTML but add fallback text
  content = content.replace(
    /<video[^>]*>\s*<source src=["']([^"']+)["'][^>]*>\s*<\/video>/g,
    '<video controls>\n  <source src="$1" type="video/mp4" />\n  <p>Video demonstration: $1</p>\n</video>'
  );

  // 6. Remove <Head> components with structured data (SEO metadata not needed in raw markdown)
  content = content.replace(/<Head>[\s\S]*?<\/Head>/g, '');

  // 7. Convert Tabs/TabItem components to readable markdown (preserve content)
  content = convertTabsToMarkdown(content);

  // 8. Convert details/summary components to readable markdown (preserve content)
  content = convertDetailsToMarkdown(content);

  // 9. Remove custom React/MDX components (FAQStructuredData, etc.)
  // Matches both self-closing and paired tags: <Component ... /> or <Component ...>...</Component>
  // This runs AFTER Tabs/details conversion to preserve their content
  content = content.replace(/<[A-Z][a-zA-Z]*[\s\S]*?(?:\/>|<\/[A-Z][a-zA-Z]*>)/g, '');

  // 10. Convert relative image paths to absolute paths using route URL directory
  // Matches: ![alt](./img/file.png) or ![alt](img/file.png)
  content = content.replace(
    /!\[([^\]]*)\]\((\.\/)?img\/([^)]+)\)/g,
    (match, alt, relPrefix, filename) => {
      return `![${alt}](${routeDir}img/${filename})`;
    }
  );

  // 11. Remove any leading blank lines
  content = content.replace(/^\s*\n/, '');

  return content;
}

// Normalize docsPath option to a consistent format for pathname matching
// Accepts: '/docs/', '/docs', 'docs', '/' → returns '/docs/' or '/'
function normalizeDocsPath(input) {
  if (!input || typeof input !== 'string') return '/docs/';
  if (input === '/') return '/';
  let p = input;
  if (!p.startsWith('/')) p = '/' + p;
  if (!p.endsWith('/')) p += '/';
  return p;
}

module.exports = function markdownSourcePlugin(context, options = {}) {
  return {
    name: 'markdown-source-plugin',

    // Provide theme components from the plugin (eliminates need for manual copying)
    getThemePath() {
      return path.resolve(__dirname, './theme');
    },

    async contentLoaded({ actions }) {
      const docsPath = normalizeDocsPath(options.docsPath || '/docs/');
      actions.setGlobalData({ docsPath });
    },

    async postBuild({ outDir, routes, baseUrl }) {
      console.log('[markdown-source-plugin] Processing markdown source files...');

      // Flatten nested routes and filter to markdown sources
      const allRoutes = flattenRoutes(routes);
      const mdRoutes = allRoutes.filter(route => {
        const src = route.metadata?.sourceFilePath;
        return src && (src.endsWith('.md') || src.endsWith('.mdx'));
      });

      console.log(`[markdown-source-plugin] Found ${mdRoutes.length} markdown routes`);

      let copiedCount = 0;
      const imgDirsToCopy = new Map(); // sourceImgDir -> destImgDir

      for (const route of mdRoutes) {
        const sourceRelPath = route.metadata.sourceFilePath;
        const sourcePath = path.join(context.siteDir, sourceRelPath);

        // Get route URL directory for image path rewriting
        const routeDir = route.path.endsWith('/')
          ? route.path
          : route.path.replace(/[^/]+$/, '');

        // Construct the fetch URL the client dropdown will request
        const fetchUrl = getMarkdownUrl(route.path);

        // Strip baseUrl to get build-relative path
        const buildRelPath = stripBaseUrl(fetchUrl, baseUrl);
        const destPath = path.join(outDir, buildRelPath);

        try {
          await fs.ensureDir(path.dirname(destPath));
          const content = await fs.readFile(sourcePath, 'utf8');
          const cleanedContent = cleanMarkdownForDisplay(content, routeDir);
          await fs.writeFile(destPath, cleanedContent, 'utf8');
          copiedCount++;
          console.log(`  ✓ Processed: ${sourceRelPath} → ${buildRelPath}`);
        } catch (error) {
          console.error(`  ✗ Failed to process ${sourceRelPath}:`, error.message);
        }

        // Track img directories near this source file for copying
        const sourceDir = path.dirname(sourcePath);
        const imgDir = path.join(sourceDir, 'img');
        if (!imgDirsToCopy.has(imgDir)) {
          const imgOutRelDir = stripBaseUrl(routeDir, baseUrl);
          imgDirsToCopy.set(imgDir, path.join(outDir, imgOutRelDir, 'img'));
        }
      }

      console.log(`[markdown-source-plugin] Successfully processed ${copiedCount} markdown files`);

      // Copy image directories
      console.log('[markdown-source-plugin] Copying image directories...');
      let imgDirCount = 0;
      for (const [source, dest] of imgDirsToCopy) {
        if (await fs.pathExists(source)) {
          try {
            await fs.copy(source, dest);
            const imageCount = fs.readdirSync(source).length;
            console.log(`  ✓ Copied: ${path.relative(context.siteDir, source)} (${imageCount} files)`);
            imgDirCount++;
          } catch (error) {
            console.error(`  ✗ Failed to copy ${path.relative(context.siteDir, source)}:`, error.message);
          }
        }
      }
      console.log(`[markdown-source-plugin] Successfully copied ${imgDirCount} image directories`);
    },
  };
};
