# Docusaurus Markdown Source Plugin

A lightweight Docusaurus plugin that exposes your markdown files as raw `.md` URLs, perfect for LLMs and documentation tools.

[![npm version](https://img.shields.io/npm/v/docusaurus-markdown-source-plugin.svg)](https://www.npmjs.com/package/docusaurus-markdown-source-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔗 **Direct `.md` URL Access**: Append `.md` to any docs URL to view raw markdown
- 📋 **Copy to Clipboard**: One-click copy of markdown content
- 🤖 **Open in ChatGPT / Claude / Gemini / Perplexity / Grok**: One click opens the assistant with a prompt linking to the page
- 🎨 **Clean UI**: Dropdown menu in article headers
- 🤖 **LLM-Friendly**: Clean markdown output optimized for AI assistants
- 🖼️ **Image Support**: Handles images with absolute paths
- 🔒 **SEO-Safe**: Proper headers prevent duplicate content indexing
- ⚡ **Zero Config**: Works out-of-the-box with sensible defaults

## Live Example

See it in action at [flynumber.com/docs/](https://www.flynumber.com/docs/) - try clicking the "Open Markdown" dropdown next to any page title!

## Screenshot

<img src=".github/images/button_screenshot.png" alt="Open Markdown dropdown with View as Markdown, Copy Page as Markdown and Open in ChatGPT, Claude, Gemini, Perplexity and Grok" width="560" />

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

1. **Build Time**: The plugin uses Docusaurus route metadata to discover and process markdown files during build:
   - Reads `route.metadata.sourceFilePath` from the route tree — no filesystem scanning
   - Removes Docusaurus-specific syntax (front matter, imports, MDX components)
   - Converts HTML elements back to markdown
   - Converts relative image paths to absolute paths using actual route URLs
   - Copies image directories to build output
   - Automatically handles custom `routeBasePath`, versioned docs, and i18n

2. **Runtime**: The React component adds a dropdown menu to each docs page with:
   - **View as Markdown**: Opens the raw markdown file in a new tab
   - **Copy Page as Markdown**: Copies the markdown source to clipboard
   - **Open in ChatGPT / Claude / Gemini / Perplexity / Grok**: Opens the assistant with a prompt linking to this page (see [AI Assistant Actions](#ai-assistant-actions))

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

> **Note:** The dropdown only appears on **doc content pages** — not on category/index pages (e.g., `/docs/category/...`). Category pages don't contain markdown content, so there's no markdown to expose.

1. **Check plugin installation**: Ensure the plugin is in your `docusaurus.config.js` plugins array.

2. **Rebuild your site**: After installing, run `npm run build` to ensure the plugin is loaded.

3. **Check browser console**: Look for any errors that might indicate component loading issues.

4. **Verify path configuration**: The default path is `/docs/`. If your docs use a different path, configure the `docsPath` option (see Advanced Configuration).

5. **Check DOM structure**: Open DevTools and run:
   ```javascript
   document.querySelector('article .markdown header')
   ```
   If it returns `null`, your theme has a different structure and may require swizzling for customization.

### 404 When Accessing .md URLs

1. **Verify plugin execution**: Check build logs for:
   ```
   [markdown-source-plugin] Processing markdown source files...
   ```

2. **Check build output**: Run:
   ```bash
   find build -name "*.md" -type f
   ```
   If no files appear, the plugin didn't run.

3. **Check route count**: Look for this in your build logs:
   ```
   [markdown-source-plugin] Found 68 markdown routes
   ```
   If it says 0 routes, your docs plugin may not be providing `sourceFilePath` metadata.

4. **Verify plugin registration**: Ensure the plugin is in the `plugins` array in `docusaurus.config.js`.

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

### AI Assistant Rows Missing or Pointing at localhost

1. **Check the option**: `aiProviders: []` or `false` hides the rows on purpose.

2. **Rebuild after config changes**: the list is fixed at build time.

3. **Links use the live origin**: on `localhost` the assistant receives `http://localhost:3000/...`, which it cannot fetch. Deploy to a public URL to test end to end.

4. **Copied Root**: see [Upgrading from 2.2.x](#upgrading-from-22x).

## Advanced Configuration

### Custom Docs Path

By default, the dropdown appears on pages under `/docs/`. If your docs use a different URL prefix (e.g., you've set `routeBasePath: '/'` for a docs-only subdomain), configure the `docsPath` option:

```javascript
module.exports = {
  plugins: [
    ['docusaurus-markdown-source-plugin', {
      docsPath: '/',  // Show dropdown on all pages (docs-only site)
    }],
  ],
};
```

Common configurations:

| Setup | `docsPath` value |
|-------|-----------------|
| Default Docusaurus | `'/docs/'` (default) |
| Docs-only subdomain (`docs.example.com`) | `'/'` |
| Custom path (`/documentation/`) | `'/documentation/'` |

> **Note:** When `docsPath` is `'/'`, the dropdown appears on any page that has a docs article header. This is intended for docs-only sites.

### AI Assistant Actions

Since 2.3.0 the dropdown also offers **Open in ChatGPT / Claude / Gemini / Perplexity / Grok**. Each row opens the assistant in a new tab with a prompt already filled in that links to the current page, so the reader can start asking questions straight away. All five are on by default; no configuration is required.

```javascript
module.exports = {
  plugins: [
    ['docusaurus-markdown-source-plugin', {
      aiProviders: ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'], // default; order is the menu order
      aiPrompt: 'Read from {url} so I can ask questions about it.',      // default; must contain {url}
    }],
  ],
};
```

| id | Menu label | URL the assistant receives |
|----|------------|----------------------------|
| `chatgpt` | Open in ChatGPT | HTML page URL |
| `claude` | Open in Claude | Markdown `.md` URL |
| `gemini` | Open in Gemini | HTML page URL |
| `perplexity` | Open in Perplexity | HTML page URL |
| `grok` | Open in Grok | HTML page URL |

**Why not the `.md` URL everywhere?** ChatGPT rejects `.md` links in a prefilled prompt, so it gets the HTML page plus a hint to browse the web. Perplexity gets the HTML page as a compatibility choice: in our testing it could not retrieve the `.md` twin and answered from its indexed copy of the HTML page instead (the twins are `noindex` under the headers recommended below). Claude fetches the URL you give it live and is handed the clean markdown this plugin generates, the convention Mintlify, Bun and PostHog docs follow. Grok and Gemini get the HTML page as the safe choice. "Open in Gemini" opens Google's AI Mode (a Gemini-powered Search experience) because gemini.google.com has no way to prefill a prompt from a link.

**The assistant fetches the page itself.** The prompt only contains a link, built from the browser's current origin. The site must be publicly reachable: on `localhost`, on deploy previews behind authentication, or on private sites the assistant cannot read the page. Whether a given assistant actually retrieves the page is up to that assistant. Claude requires sign-in; Grok asks the reader to confirm the pre-filled message before sending; Google and Perplexity may show a bot check to automated browsers.

**Trim or reorder** by listing only the ids you want. **Hide the section** with `aiProviders: []` (or `false`). **Add an assistant** with a custom entry:

```javascript
aiProviders: [
  'chatgpt',
  'claude',
  { label: 'Open in Mistral', url: 'https://chat.mistral.ai/chat?q={prompt}' },
],
```

A custom entry has a `label`, a `url` template containing `{prompt}` (the URL-encoded prompt is substituted in), and optionally `context: 'markdown'` to hand it the `.md` URL instead of the HTML page. Custom entries render with a generic icon. Invalid entries fail the build with a message naming the problem.

### Blog Pages

Blog pages are not supported. The classic theme renders the blog post header outside the `.markdown` container, so the injection point this plugin targets (`article .markdown header`) does not exist on blog posts, whatever `docsPath` is set to.

### Upgrading from 2.2.x

No configuration changes are needed; the five assistant rows appear automatically (set `aiProviders: []` to opt out). If you ever copied the plugin's `Root` component into your site's `src/theme` folder, delete that copy: it shadows the plugin's `Root`, fails to build on the plugin's internal imports, and would hide the new rows. To add your own logic around the plugin's `Root`, wrap it instead:

```javascript
// src/theme/Root.js
import React from 'react';
import PluginRoot from '@theme-original/Root';

export default function Root({ children }) {
  return <PluginRoot>{children}</PluginRoot>;
}
```

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
- [FlyNumber](https://www.flynumber.com/) - Cloud phone system and local phone numbers

---

Made with ❤️ by [FlyNumber](https://www.flynumber.com)
