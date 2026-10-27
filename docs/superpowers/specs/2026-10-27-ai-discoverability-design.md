# Making the markdown twins discoverable to AI search engines — design

Date: 2026-10-27. Target release: 2.4.0 (blog support moves to the next minor).

## Intent

The `.md` twins exist for LLMs, but index-based assistants (Perplexity, Google AI Mode, ChatGPT search when a page is already indexed) never see them: the headers this plugin recommended marked every twin `noindex` for all crawlers, nothing links to the twins server-side, and no sitemap or llms.txt lists them. Live-fetch assistants (ChatGPT given a URL, Claude) read them fine (verified 2026-10-27 against Cloudflare's request log).

Goal: let AI crawlers find and index the twins while Google, Bing and DuckDuckGo keep ignoring them, so there is no duplicate-content SEO cost. Then, once PerplexityBot shows up in the logs fetching twins, the Perplexity row can move to the markdown URL too.

## Decided

1. **Per-bot `noindex` header (site config, documented in the README).** Replace `X-Robots-Tag: noindex, nofollow` on `*.md` with `X-Robots-Tag: googlebot: noindex, nofollow, bingbot: noindex, nofollow, duckduckbot: noindex, nofollow`. The same per-bot form the README already used for images. Everyone else (PerplexityBot, OAI-SearchBot, ClaudeBot, Applebot, …) may index.
2. **`<link rel="alternate" type="text/markdown" href="<absolute .md URL>">` in every page that has a twin (plugin, always on).** Mintlify, Anthropic, Bun and Cloudflare docs all emit it. Done in `postBuild` by inserting the tag before `</head>` of the built HTML file of each processed route, so only pages with a twin get it and nothing is added to the client bundle. Idempotent. HTML path follows Docusaurus output rules: route ending in `/` → `<route>index.html`; `trailingSlash: false` → `<route>.html`; otherwise `<route>/index.html`.
3. **`llms.txt` at the build root (plugin, `llmsTxt: true` by default, `false` disables).** Per the llms.txt convention: `# <siteConfig.title>`, optional `> <tagline>`, then a `## Docs` list of `- [Title](absolute .md URL)` for every twin, in route order. Title comes from front matter `title`, else the first `# ` heading of the cleaned markdown, else the route path. Lives at `<baseUrl>llms.txt` (`/docs/llms.txt` on a `/docs/` site). Opt-out exists so a site already generating llms.txt with another plugin is not overwritten.
4. **Perplexity's row stays on the HTML page URL** until Cloudflare logs show PerplexityBot fetching `.md` twins; then flip in a patch.
5. No new options beyond `llmsTxt`. No sitemap entries for twins (Google would read them; peers do not list them). No HTTP `Link` header requirement.

## Out of scope

Blog support (next minor), llms-full.txt, per-bot header automation on hosts, Perplexity default flip.

## Tests

`node --test`: `getHtmlOutputPath` for the three trailing-slash modes; `insertAlternateLink` inserts once, escapes the href, is idempotent, leaves HTML without `</head>` untouched; `extractTitle` for quoted/unquoted front matter titles, H1 fallback, route fallback; `renderLlmsTxt` output shape with and without tagline; a postBuild integration test on a temp site (two docs, one category route, `baseUrl: '/'` and `'/docs/'`) asserting twins, inserted links with absolute hrefs, llms.txt content, and `llmsTxt: false`.

## Verification

fly_docs build: every docs page's HTML carries the link; `/docs/llms.txt` lists 99 entries; headers changed in `vercel.json` (fly_docs and fly_blog); live check after deploy with `curl -I` for the per-bot header. Codex review before release.
