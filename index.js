const fs = require('fs-extra');
const path = require('path');

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

// Clean markdown content for raw display - remove MDX/Docusaurus-specific syntax
function cleanMarkdownForDisplay(content, filepath) {
  // Get the directory path for this file (relative to docs root)
  const fileDir = filepath.replace(/[^/]*$/, ''); // Remove filename, keep directory

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

  // 10. Convert relative image paths to absolute paths from /docs/ root (Claude style)
  // Matches: ![alt](./img/file.png) or ![alt](img/file.png)
  content = content.replace(
    /!\[([^\]]*)\]\((\.\/)?img\/([^)]+)\)/g,
    (match, alt, relPrefix, filename) => {
      // Convert to absolute path: /docs/path/to/file/img/filename
      return `![${alt}](/docs/${fileDir}img/${filename})`;
    }
  );

  // 11. Remove any leading blank lines
  content = content.replace(/^\s*\n/, '');

  return content;
}

// Recursively find all markdown files in a directory
function findMarkdownFiles(dir, fileList = [], baseDir = dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList, baseDir);
    } else if (file.endsWith('.md')) {
      // Store relative path from base directory
      const relativePath = path.relative(baseDir, filePath);
      fileList.push(relativePath);
    }
  });

  return fileList;
}

// Copy image directories from docs to build
async function copyImageDirectories(docsDir, buildDir) {
  const imageDirs = [];

  // Recursively find all 'img' directories in docs
  function findImgDirs(dir, baseDir = dir) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file === 'img') {
          // Found an img directory, store its relative path
          const relativePath = path.relative(baseDir, dir);
          imageDirs.push({ source: filePath, relativePath });
        } else {
          // Continue searching in subdirectories
          findImgDirs(filePath, baseDir);
        }
      }
    });
  }

  // Find all img directories
  findImgDirs(docsDir);

  // Copy each img directory to build
  let copiedCount = 0;
  for (const { source, relativePath } of imageDirs) {
    const destination = path.join(buildDir, relativePath, 'img');

    try {
      await fs.copy(source, destination);
      const imageCount = fs.readdirSync(source).length;
      console.log(`  ✓ Copied: ${relativePath}/img/ (${imageCount} images)`);
      copiedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to copy ${relativePath}/img/:`, error.message);
    }
  }

  return copiedCount;
}

module.exports = function markdownSourcePlugin(context, options) {
  return {
    name: 'markdown-source-plugin',

    async postBuild({ outDir }) {
      const docsDir = path.join(context.siteDir, 'docs');
      const buildDir = outDir;

      console.log('[markdown-source-plugin] Copying markdown source files...');

      // Find all markdown files in docs directory
      const mdFiles = findMarkdownFiles(docsDir);

      let copiedCount = 0;

      // Process each markdown file to build directory
      for (const mdFile of mdFiles) {
        const sourcePath = path.join(docsDir, mdFile);
        const destPath = path.join(buildDir, mdFile);

        try {
          // Ensure destination directory exists
          await fs.ensureDir(path.dirname(destPath));

          // Read the markdown file
          const content = await fs.readFile(sourcePath, 'utf8');

          // Clean markdown for raw display
          const cleanedContent = cleanMarkdownForDisplay(content, mdFile);

          // Write the cleaned content
          await fs.writeFile(destPath, cleanedContent, 'utf8');
          copiedCount++;

          console.log(`  ✓ Processed: ${mdFile}`);
        } catch (error) {
          console.error(`  ✗ Failed to process ${mdFile}:`, error.message);
        }
      }

      console.log(`[markdown-source-plugin] Successfully copied ${copiedCount} markdown files`);

      // Copy image directories
      console.log('[markdown-source-plugin] Copying image directories...');
      const imgDirCount = await copyImageDirectories(docsDir, buildDir);
      console.log(`[markdown-source-plugin] Successfully copied ${imgDirCount} image directories`);
    },
  };
};
