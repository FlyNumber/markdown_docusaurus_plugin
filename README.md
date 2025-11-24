# Docusaurus Markdown Source Plugin

A lightweight Docusaurus plugin that exposes your markdown files as raw `.md` URLs, perfect for LLMs and documentation tools.

[![npm version](https://img.shields.io/npm/v/docusaurus-markdown-source-plugin.svg)](https://www.npmjs.com/package/docusaurus-markdown-source-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔗 **Direct `.md` URL Access**: Append `.md` to any docs URL to view raw markdown
- 📋 **Copy to Clipboard**: One-click copy of markdown content
- 🎨 **Clean UI**: Dropdown menu in article headers
- 🤖 **LLM-Friendly**: Clean markdown output optimized for AI assistants
- 🖼️ **Image Support**: Handles images with absolute paths
- 🔒 **SEO-Safe**: Proper headers prevent duplicate content indexing
- ⚡ **Zero Config**: Works out-of-the-box with sensible defaults

## Live Example

See it in action at [flynumber.com/docs/](https://www.flynumber.com/docs/) - try clicking the "Open Markdown" dropdown next to any page title!

## Screenshot

<img src=".github/images/button_screenshot.png" alt="Open Markdown Dropdown" width="400" />

## Installation

```bash
npm install docusaurus-markdown-source-plugin
```

Or with yarn:

```bash
yarn add docusaurus-markdown-source-plugin
```

## Quick Start

### 1. Add the Plugin

Edit your `docusaurus.config.js` (or `.ts`):

```javascript
module.exports = {
  // ... your existing config
  plugins: [
    'docusaurus-markdown-source-plugin',
    // ... your other plugins
  ],
};
```

**That's it!** The plugin automatically provides all necessary components. No manual file copying required.

### 2. Add Dropdown Styles (Optional)

Add these styles to your `src/css/custom.css`:

```css
/* Markdown Actions Dropdown Styles */

/* Style the article header as flexbox */
article .markdown header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  overflow: visible;
}

/* Allow h1 to grow and take available space */
article .markdown header h1 {
  flex: 1 1 auto;
  margin: 0;
}

/* Container for the markdown actions dropdown */
.markdown-actions-container {
  flex-shrink: 0;
  margin-left: auto;
  position: relative;
}

/* Ensure dropdown wrapper has proper positioning */
.markdown-actions-container .dropdown {
  position: relative;
}

/* Base dropdown menu styles */
.markdown-actions-container .dropdown__menu {
  z-index: 1000;
  min-width: 220px;
  right: auto;
  left: 0;
}

/* Add hover effect for dropdown items */
.dropdown__link:hover {
  background-color: var(--ifm-hover-overlay);
}

/* Responsive adjustments for mobile */
@media (max-width: 768px) {
  .markdown-actions-container {
    margin-right: clamp(0px, 0.5rem, 1rem);
    margin-bottom: 1rem;
  }

  .markdown-actions-container .button {
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
  }

  /* Right-align menu on mobile to prevent cutoff */
  .markdown-actions-container .dropdown__menu {
    right: 0;
    left: auto;
    min-width: min(220px, calc(100vw - 2rem));
    max-width: calc(100vw - 2rem);
    padding-bottom: 0.75rem;
  }
}

/* RTL language support */
[dir="rtl"] .markdown-actions-container {
  margin-left: 0;
  margin-right: auto;
}

[dir="rtl"] .markdown-actions-container .dropdown__menu {
  right: auto;
  left: 0;
}

@media (max-width: 768px) {
  [dir="rtl"] .markdown-actions-container .dropdown__menu {
    left: 0;
    right: auto;
  }
}
```

### 3. Build and Test

```bash
npm run build
npm run serve
```

Visit any docs page - you should see the "Open Markdown" dropdown in the header!

## How It Works

1. **Build Time**: The plugin processes all markdown files in `docs/` during build:
   - Removes Docusaurus-specific syntax (front matter, imports, MDX components)
   - Converts HTML elements back to markdown
   - Converts relative image paths to absolute paths
   - Copies image directories to build output

2. **Runtime**: The React component adds a dropdown menu to each docs page with two actions:
   - **View as Markdown**: Opens the raw markdown file in a new tab
   - **Copy Page as Markdown**: Copies the markdown source to clipboard

3. **Server**: Proper HTTP headers prevent search engines from indexing .md files while allowing AI assistants to access them

## Deployment Configuration

To prevent duplicate content SEO issues and ensure proper content delivery, configure your server to send appropriate headers for `.md` files.

### Vercel

Create or edit `vercel.json` in your project root:

```json
{
  "headers": [
    {
      "source": "/(.*)\\.md",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/plain; charset=utf-8"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Robots-Tag",
          "value": "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, must-revalidate"
        }
      ]
    },
    {
      "source": "/docs/(.*)/img/(.*)",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, immutable"
        }
      ]
    }
  ]
}
```

### Netlify

Create or edit `netlify.toml` in your project root:

```toml
[[headers]]
  for = "/*.md"
  [headers.values]
    Content-Type = "text/plain; charset=utf-8"
    X-Content-Type-Options = "nosniff"
    X-Robots-Tag = "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
    Cache-Control = "public, max-age=3600, must-revalidate"

[[headers]]
  for = "/docs/*/img/*"
  [headers.values]
    X-Robots-Tag = "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
    Cache-Control = "public, max-age=86400, immutable"
```

### Cloudflare Pages

Create `_headers` file in your `build` directory (or configure build to copy it):

```
/*.md
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff
  X-Robots-Tag: googlebot: noindex, nofollow, bingbot: noindex, nofollow
  Cache-Control: public, max-age=3600, must-revalidate

/docs/*/img/*
  X-Robots-Tag: googlebot: noindex, nofollow, bingbot: noindex, nofollow
  Cache-Control: public, max-age=86400, immutable
```

### Apache

Create or edit `.htaccess` in your build directory:

```apache
<FilesMatch "\\.md$">
  Header set Content-Type "text/plain; charset=utf-8"
  Header set X-Content-Type-Options "nosniff"
  Header set X-Robots-Tag "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
  Header set Cache-Control "public, max-age=3600, must-revalidate"
</FilesMatch>

<LocationMatch "^/docs/.*/img/.*">
  Header set X-Robots-Tag "googlebot: noindex, nofollow, bingbot: noindex, nofollow"
  Header set Cache-Control "public, max-age=86400, immutable"
</LocationMatch>
```

### Nginx

Add to your `nginx.conf` or site configuration:

```nginx
location ~* \.md$ {
  add_header Content-Type "text/plain; charset=utf-8";
  add_header X-Content-Type-Options "nosniff";
  add_header X-Robots-Tag "googlebot: noindex, nofollow, bingbot: noindex, nofollow";
  add_header Cache-Control "public, max-age=3600, must-revalidate";
}

location ~* ^/docs/.*/img/.* {
  add_header X-Robots-Tag "googlebot: noindex, nofollow, bingbot: noindex, nofollow";
  add_header Cache-Control "public, max-age=86400, immutable";
}
```

### Why These Headers Matter

| Header | Purpose |
|--------|---------|
| `Content-Type: text/plain` | Tells browsers to display as plain text, not HTML |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing for security |
| `X-Robots-Tag: noindex, nofollow` | Prevents search engines from indexing (avoids duplicate content SEO issues) while allowing AI assistants to access |
| `Cache-Control` | Balances performance (caching) with content freshness |

## CSS Customization

You can customize the dropdown appearance by overriding these CSS classes in your `custom.css`:

```css
/* Change button style */
.markdown-actions-container .button {
  /* Your custom styles */
}

/* Change dropdown menu style */
.markdown-actions-container .dropdown__menu {
  /* Your custom styles */
}

/* Change dropdown item hover color */
.dropdown__link:hover {
  background-color: your-color;
}
```

## Troubleshooting

### Dropdown Not Appearing

1. **Check plugin installation**: Ensure the plugin is in your `docusaurus.config.js` plugins array.

2. **Rebuild your site**: After installing, run `npm run build` to ensure the plugin is loaded.

3. **Check browser console**: Look for any errors that might indicate component loading issues.

4. **Verify path configuration**: The default path is `/docs/`. If your docs use a different path (e.g., `/documentation/`), you may need to swizzle the component and customize it.

5. **Check DOM structure**: Open DevTools and run:
   ```javascript
   document.querySelector('article .markdown header')
   ```
   If it returns `null`, your theme has a different structure and may require swizzling for customization.

### 404 When Accessing .md URLs

1. **Verify plugin execution**: Check build logs for:
   ```
   [markdown-source-plugin] Copying markdown source files...
   ```

2. **Check build output**: Run:
   ```bash
   find build -name "*.md" -type f
   ```
   If no files appear, the plugin didn't run.

3. **Verify plugin registration**: Ensure the plugin is in the `plugins` array in `docusaurus.config.js`.

### Headers Not Being Sent

1. **Verify configuration file**: Ensure it's in the correct location for your platform.

2. **Clear CDN cache**: After deploying header changes, you may need to purge your CDN cache.

3. **Test headers**: Use curl to verify:
   ```bash
   curl -I https://yourdomain.com/docs/page.md
   ```

### Copy to Clipboard Not Working

1. **Requires HTTPS**: The Clipboard API only works on HTTPS or localhost.

2. **Check browser support**: Modern browsers support the Clipboard API, but very old browsers may not.

3. **Check permissions**: Some browsers require user permission for clipboard access.

## Advanced Configuration

### Custom Paths and Blog Support

The plugin currently supports the default `/docs/` path out of the box.

For blog support or custom paths, you can swizzle the components if needed:

```bash
npm run swizzle docusaurus-markdown-source-plugin Root -- --eject
```

**Note:** Swizzling means you'll manually maintain these files and won't receive automatic updates. Native configuration support for custom paths is planned for a future release.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT © FlyNumber

## Support

- **Issues**: [GitHub Issues](https://github.com/FlyNumber/markdown_docusaurus_plugin/issues)
- **Documentation**: [Implementation Guide](https://github.com/FlyNumber/markdown_docusaurus_plugin)
- **Live Example**: [flynumber.com/docs](https://www.flynumber.com/docs)

## Related

- [Docusaurus](https://docusaurus.io/) - The documentation framework this plugin extends
- [FlyNumber](https://www.flynumber.com/) - Cloud phone system and documentation platform

---

Made with ❤️ by [FlyNumber](https://www.flynumber.com)
