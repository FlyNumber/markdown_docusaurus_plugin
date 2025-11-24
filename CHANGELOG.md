# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v1.0.0
