# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-24

### Breaking Changes
- **Eliminated manual file copying requirement** - Plugin now uses Docusaurus native APIs
- Users upgrading from v1.x must remove manually copied theme files (`src/theme/Root.js` and `src/components/MarkdownActionsDropdown/`)
- Component directory structure changed: `src/` → `theme/` and `components/`
- Components now bundled with plugin instead of user's project

### Added
- `getThemePath()` plugin API to automatically provide theme components
- `.gitignore` file for cleaner development experience
- Comprehensive migration guide in README for v1.x users
- Zero-config installation - just add plugin to docusaurus.config.js

### Changed
- Plugin now provides components via Docusaurus plugin APIs instead of requiring manual copying
- Updated README with simplified installation instructions
- Component imports now use relative paths instead of `@site` alias
- Updated troubleshooting guide to reflect new architecture
- Updated advanced configuration examples to use swizzling

### Improved
- Much better developer experience - no manual file management needed
- Components automatically update when plugin updates (no stale copied files)
- Cleaner project structure - plugin consumers don't need theme overrides
- Standard Docusaurus plugin pattern - follows best practices

### Technical Details
- Uses Docusaurus `getThemePath()` lifecycle method
- Components bundled at: `theme/Root.js` and `components/MarkdownActionsDropdown/`
- Tested in production with 58 markdown files and 10 image directories
- Compatible with Docusaurus v3.x

### Migration from v1.x
1. Remove manually copied files: `src/theme/Root.js` and `src/components/MarkdownActionsDropdown/`
2. Update the plugin: `npm update docusaurus-markdown-source-plugin`
3. Rebuild: `npm run build`
4. CSS in `custom.css` remains unchanged

## [1.0.0] - 2025-11-24

### Added
- Initial release of docusaurus-markdown-source-plugin
- Build-time plugin that copies markdown files to build output
- Automatic cleaning of Docusaurus-specific syntax (front matter, imports, MDX components)
- Conversion of HTML elements back to markdown equivalents
- Conversion of relative image paths to absolute paths from /docs/ root
- Automatic copying of image directories to build output
- React dropdown component for viewing and copying markdown
- "View as Markdown" feature - opens raw markdown in new tab
- "Copy Page as Markdown" feature - copies markdown to clipboard
- Dynamic injection into article headers via Root.js theme override
- Click-outside-to-close dropdown behavior
- Mobile-responsive dropdown positioning
- RTL language support for dropdown menu
- Comprehensive deployment guides for:
  - Vercel
  - Netlify
  - Cloudflare Pages
  - Apache
  - Nginx
- SEO-safe HTTP headers configuration examples
- CSS customization support via custom.css
- Support for Tabs/TabItem component conversion
- Support for details/summary component conversion
- YouTube iframe to text link conversion
- HTML5 video tag handling
- Zero-config setup with sensible defaults

### Documentation
- Comprehensive README with installation instructions
- Quick start guide
- Deployment configuration for all major platforms
- Troubleshooting guide
- Advanced configuration examples (blog support, custom URL patterns)
- CSS customization guide
- Live example at flynumber.com/docs

### Technical Details
- Dependencies: fs-extra ^11.0.0
- Peer dependencies: @docusaurus/core ^3.0.0, react ^18.0.0
- Requires Node.js >=18.0.0
- Compatible with Docusaurus v3.x
- Uses React 18's createRoot API for component injection

[2.0.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.0.0
[1.0.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v1.0.0
