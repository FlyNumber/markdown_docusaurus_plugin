const fs = require('fs-extra');
const path = require('path');
const { getMarkdownUrl } = require('./lib/markdown-path');
const { cleanMarkdownForDisplay } = require('./lib/clean-markdown');
const { recordImgMapping } = require('./lib/img-mapping');
const { normalizeAiOptions } = require('./lib/ai-providers');

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
      // Plain JSON only: this is serialized into the client bundle and read by
      // theme/Root.js through usePluginData('markdown-source-plugin').
      actions.setGlobalData({
        docsPath: normalizeDocsPath(options.docsPath),
        ...normalizeAiOptions(options),
      });
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
      const imgDirsToCopy = new Map(); // sourceImgDir -> Set<destImgDir>

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

        // Track img directories near this source file for copying. A single source
        // dir may need to be copied to multiple destinations when sibling docs in the
        // same dir are routed to different URL spaces (e.g. via slug:).
        const sourceDir = path.dirname(sourcePath);
        const imgDir = path.join(sourceDir, 'img');
        const imgOutRelDir = stripBaseUrl(routeDir, baseUrl);
        recordImgMapping(imgDirsToCopy, imgDir, path.join(outDir, imgOutRelDir, 'img'));
      }

      console.log(`[markdown-source-plugin] Successfully processed ${copiedCount} markdown files`);

      // Copy image directories. Each source dir may have multiple destinations.
      console.log('[markdown-source-plugin] Copying image directories...');
      let imgDirCount = 0;
      for (const [source, dests] of imgDirsToCopy) {
        if (!(await fs.pathExists(source))) continue;
        const imageCount = fs.readdirSync(source).length;
        for (const dest of dests) {
          try {
            await fs.copy(source, dest);
            console.log(`  ✓ Copied: ${path.relative(context.siteDir, source)} → ${path.relative(outDir, dest)} (${imageCount} files)`);
            imgDirCount++;
          } catch (error) {
            console.error(`  ✗ Failed to copy ${path.relative(context.siteDir, source)} → ${path.relative(outDir, dest)}:`, error.message);
          }
        }
      }
      console.log(`[markdown-source-plugin] Successfully copied ${imgDirCount} image directories`);
    },
  };
};

// Docusaurus calls this at config load and uses the return value as the
// plugin's options verbatim (it does not add `id` afterwards, and global data
// is keyed by `options.id`), so default the id here. Validation throws so a
// typo in aiProviders/aiPrompt fails `docusaurus build` with a clear message.
function validateOptions({ options = {} }) {
  const id = options.id ?? 'default';
  if (id !== 'default') {
    throw new Error(
      `[markdown-source-plugin] Unsupported plugin id ${JSON.stringify(options.id)}: ` +
      'only one instance is supported and its id must be "default" (theme/Root.js reads the default instance).'
    );
  }
  normalizeDocsPath(options.docsPath);
  normalizeAiOptions(options);
  return { ...options, id };
}

module.exports.validateOptions = validateOptions;
