const fs = require('fs-extra');
const path = require('path');
const { getMarkdownUrl } = require('./lib/markdown-path');
const { cleanMarkdownForDisplay } = require('./lib/clean-markdown');

/**
 * Docusaurus plugin to copy raw markdown files to build output
 * This allows users to view markdown source by appending .md to URLs
 */

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
