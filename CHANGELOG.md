# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.5] - 2026-05-03

### Fixed
- **`intro.md` collision on `slug: '/'` routes** — sites with both `docs/intro.md` and a doc routed to `/docs/` had their build output collide on `intro.md`, with the second route silently overwriting the first. Trailing-slash routes now resolve to `index.md` in both the build writer and the dropdown URL.
- **Code fences corrupted by MDX/Docusaurus transforms** — `cleanMarkdownForDisplay` ran every regex over raw content with no fence awareness, so docs demonstrating Docusaurus syntax inside fenced code blocks had imports stripped, `<Tabs>` blocks rewritten, and components removed from their own examples. Transforms now skip backtick and tilde fences (length ≥ 3, ≤3 leading spaces, supports CRLF and unclosed fences) via a placeholder-based protection that also handles legitimate `<Tabs>` blocks containing fenced code.
- **Image directories only copied to the first route's destination** — when sibling docs in the same source dir routed to different URL spaces (e.g. via `slug:`), `imgDirsToCopy` locked the destination from the first route, leaving silent broken images on other routes. Switched to `Map<src, Set<dest>>` so each source dir is copied to every destination it serves.
- **`<TabItem>` and YouTube iframe regexes rejected valid attribute orders** — `<TabItem>` required `value` before `label`; reverse-order items silently emptied the entire `<Tabs>` block. YouTube iframe required `src` before `title`. Both now capture the attribute string and parse fields independently with single- or double-quote support. If no `<TabItem>`s parse, the original `<Tabs>` block is preserved instead of being silently deleted.
- **Multi-line and side-effect imports survived stripping** — the import stripper used `.*?` which cannot cross newlines, so `import {\n  Foo\n} from './x';` survived. Side-effect imports like `import './x.css';` weren't matched. Both are now removed.
- **Component scrubber left orphan close tags** — the closing-tag alternation matched any uppercase tag, so siblings like `<Outer><Inner>x</Inner></Outer>` left `</Outer>` orphaned. Added a backreference so paired tags must share a name. Deeply nested same-name components remain a known regex limitation.
- **`<details>` regex was too strict and destroyed body whitespace** — rejected attributes on the opening tag (`<details open>`), rejected mixed-content summaries, and the body cleanup trimmed every line and dropped blanks, breaking 4-space indents in code and intentional blank-line separators. Now allows attrs on `<details>`/`<summary>`, strips inline tags from the summary text, and only trims outer blank padding from the body.
- **`Root.js` `decodeURIComponent` crash on malformed hash** — a URL with malformed percent encoding like `#%foo` threw `URIError` synchronously and silently lost the anchor scroll. Now wrapped in a `decodeHashSafely` helper that returns null and short-circuits the scroll attempt.
- **`Root.js` scroll-to-anchor timer and listener leaks** — four `setTimeout`s and a `window 'load'` listener were never cleaned up. Quickly clicking different hash links piled up timers, and stale timers could scroll the page out from under the user after navigation. The effect now returns a cleanup that clears every scheduled timer and removes the listener.
- **Dropdown copy-reset timer auto-closed the menu** — the 2 s reset timer unconditionally called `setIsOpen(false)`, so a user who reopened the dropdown during the cooldown saw it close again with no input. The timer was also never cleared on unmount or before a new copy. Now tracked in a `useRef`, cleared on unmount and at the top of each new copy, and only resets the "Copied!" label.

### Internal
- Added a `node --test` based test suite (zero new dependencies). Run with `npm test`.
- Extracted `cleanMarkdownForDisplay`, `getMarkdownUrl`, fence-protection, image-mapping, and hash-decoding into focused `lib/` modules for testability.

## [2.2.4] - 2026-03-19

### Fixed
- **Dropdown chevron not vertically centered** — added inline-flex alignment to the button so the SVG chevron centers with the text across all browsers (fixes #2)
- Increased chevron spacing from 4px to 6px for better visual balance

## [2.2.3] - 2026-03-12

### Fixed
- **Dropdown not appearing on client-side navigation** — the MutationObserver introduced in 2.2.1 short-circuited when it found stale DOM during React transitions, causing the button to vanish after page swaps. Observer now stays active to catch content swaps and re-inject reliably.
- Track exact container instance via ref instead of global querySelector to prevent cleanup collisions during page transitions
- Observe `document.body` instead of `<main>` element to survive layout swaps during navigation
- Unmount stale React roots before creating new ones to prevent memory leaks

### Documentation
- Added note clarifying the dropdown only appears on doc content pages, not category/index pages
- Updated peer dependencies to support React 19 (`^18.0.0 || ^19.0.0`) — re-applied from #5

## [2.2.1] - 2026-03-11

### Fixed
- **Faster dropdown appearance on cold page load** — replaced fixed retry timeouts with MutationObserver that injects the button the instant the article header appears after hydration
- Properly unmount React root on cleanup to prevent memory leaks

## [2.2.0] - 2026-03-11

### Added
- **Configurable `docsPath` option** for sites that don't host docs under `/docs/` (fixes #3)
  - Default: `'/docs/'` (no behavior change for existing users)
  - Example: `['docusaurus-markdown-source-plugin', { docsPath: '/' }]`
  - Supports docs-only subdomains, custom route base paths, etc.
- `contentLoaded` hook exposing plugin options to theme components via Docusaurus global data

### Changed
- Runtime components now read `docsPath` from plugin global data instead of hardcoding `/docs/`
- Updated README: replaced swizzle instructions with `docsPath` configuration docs

## [2.1.0] - 2026-03-03

### Changed
- **Refactored build processing to use Docusaurus route metadata** instead of filesystem scanning
- Plugin now reads `route.metadata.sourceFilePath` from `postBuild` routes prop
- Automatically handles custom `routeBasePath`, versioned docs, and i18n configurations
- Image path rewriting now uses actual route URLs instead of hardcoded `/docs/` prefix
- Removed `findMarkdownFiles()` and `copyImageDirectories()` internal functions

### Fixed
- Image paths in cleaned markdown now correctly reflect the site's URL structure
- Plugin no longer assumes docs live at the `/docs/` URL path

## [2.0.1] - 2025-11-24

### Documentation
- Added button screenshot to README showing the dropdown UI
- Removed unnecessary v1.x migration guide (no users existed before v2.0.0)
- Simplified Advanced Configuration section
- Removed complex swizzling instructions for blog support
- Added honest note about customization trade-offs

### Improved
- Screenshot now displays at 400px width for better README viewing
- Cleaner, more focused documentation
- More transparent about current limitations and future plans

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

[2.2.5]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.5
[2.2.4]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.4
[2.2.3]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.3
[2.2.2]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.2
[2.2.1]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.1
[2.2.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.2.0
[2.1.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.1.0
[2.0.1]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.0.1
[2.0.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v2.0.0
[1.0.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/releases/tag/v1.0.0
