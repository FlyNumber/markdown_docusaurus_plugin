# AI actions in the markdown dropdown — design

Date: 2026-10-26. Target release: 2.3.0.

## Intent

A reader on a docs page should be able to hand that page to an AI assistant in one click and start asking questions. The plugin already exposes clean per-page markdown; this release adds "Open in ChatGPT / Claude / Gemini / Perplexity" rows to the existing dropdown so the plugin matches what Mintlify, Bun and competing Docusaurus plugins ship today. The same release fixes the open React warning (issue #12) and prepares the package for Docusaurus 4.

Owner direction: all the assistants visible by default, the two existing markdown rows unchanged, nothing clever. "Simple, clean."

## Goals

- New rows in the existing dropdown, after a divider: one per enabled assistant, opening a new tab with a prompt already filled in.
- Zero-config default shows all five built-in assistants. One option trims the list or hides it; one option changes the prompt.
- A site can add an assistant the plugin does not know about with a label and a URL template.
- Issue #12 fixed: no React warning on client-side navigation.
- Peer range widened to Docusaurus 4 once a canary build passes.
- README, CHANGELOG and CLAUDE.md current.

## Non-goals

- llms.txt generation, MCP install actions, PDF export, label/i18n options, swizzle surface (PR #10 stays separate).
- Changing the trigger label "Open Markdown", the two existing rows, or the injection mechanism.
- Per-provider prompt overrides or placeholders beyond `{url}`.

## Anti-goals

- External network requests for icons or scripts. Icons are inline SVG.
- Any new runtime dependency.
- Breaking existing config: a site with `docsPath` only must build and behave as before, plus the new rows.

## Decided

### Menu

Existing rows stay first and unchanged: "View as Markdown", "Copy Page as Markdown". Then a thin divider (inline-styled `<hr>` inside an `<li>`; Infima has no divider class). Then one row per enabled assistant, in the order configured. Each row is a real `<a class="dropdown__link" target="_blank" rel="noopener noreferrer">` with a 16px inline SVG brand mark and the label "Open in <Name>". Links are anchors, not buttons, so middle-click and copy-link work. Clicking closes the menu.

The trigger follows the disclosure pattern rather than announcing a menu it does not implement: `aria-haspopup` is dropped, `aria-expanded` stays, `aria-controls` points at the list's id, and Escape closes the list and returns focus to the trigger. Nothing else about keyboard handling changes.

### Built-in assistants

| id | label | URL template | URL handed to the assistant |
|---|---|---|---|
| `chatgpt` | Open in ChatGPT | `https://chatgpt.com/?hints=search&q={prompt}` | HTML page URL |
| `claude` | Open in Claude | `https://claude.ai/new?q={prompt}` | markdown URL |
| `gemini` | Open in Gemini | `https://www.google.com/search?udm=50&q={prompt}` | HTML page URL |
| `perplexity` | Open in Perplexity | `https://www.perplexity.ai/search/new?q={prompt}` | markdown URL |
| `grok` | Open in Grok | `https://grok.com/?q={prompt}` | HTML page URL |

Why the split: ChatGPT rejects `.md` URLs in a prefilled prompt (Neon and Bun both link it to the HTML page; `hints=search` makes it browse rather than answer from memory). Google's Gemini web app has no prefill parameter, so "Open in Gemini" opens Google AI Mode, which is Gemini-powered and reads the HTML page; the README says so. Claude and Perplexity are known to accept the clean markdown URL, which is the whole point of the plugin, so they get it. Grok has no evidence either way, so it gets the HTML page URL, the safe choice.

Icons come from `@lobehub/icons-static-svg` 1.101.0 (MIT), which has consistent 24x24 `currentColor` marks for all five. The path data is inlined; the package is not a dependency.

### Prompt

Default: `Read {url} so I can ask questions about it.` The only placeholder is `{url}`; it resolves per assistant to the page or markdown URL as in the table. The prompt is URL-encoded with `encodeURIComponent` before substitution into `{prompt}`.

Page URL is `window.location.origin + window.location.pathname` at render time. Markdown URL is `origin + getMarkdownUrl(pathname)`, the same helper the existing rows use.

### Options

```js
['docusaurus-markdown-source-plugin', {
  docsPath: '/docs/',                       // unchanged
  aiProviders: ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'],   // default: all five, this order
  aiPrompt: 'Read {url} so I can ask questions about it.',       // default
}]
```

- `aiProviders`: array. Each entry is a built-in id string or a custom object with exactly these keys: `label` (non-empty string), `url` (string containing `{prompt}`), optional `context` (`'page'`, the default, or `'markdown'`). Any other key, any other `context` value, or a `url` that is not an absolute `http:`/`https:` URL once `{prompt}` is substituted (checked with `new URL()`, so `javascript:`, `data:` and relative templates are rejected) throws. A custom entry receives the HTML page URL unless `context: 'markdown'` is set. Custom entries always get the generic "sparkle" mark; their internal ids are generated and never collide with built-in ids. `[]` or `false` removes the divider and all AI rows.
- `aiPrompt`: non-empty string containing `{url}`.
- Validation runs at config load through the plugin's `validateOptions` export, with plain checks and no Joi. It throws with a message that names the option and the accepted shape (unknown built-in ids list the valid ids) and otherwise returns the user's options unchanged except for `id`, which it defaults to `'default'` because Docusaurus uses a custom validator's return value as-is and keys global data by `options.id`. One plugin instance is supported; `Root` reads the default id.

### Data flow

`validateOptions` validates and defaults `id`. `contentLoaded` normalizes the raw options with the pure `normalizeAiOptions` (raw shape in, normalized shape out; it is the only normalization point) and puts `{ docsPath, aiProviders: [{ id, label, url, context }], aiPrompt }` into global data (plain JSON only). `Root.js` reads it and passes `aiProviders` and `aiPrompt` as props to `MarkdownActionsDropdown`. The dropdown calls a pure helper in `lib/ai-providers.js` to turn props plus the current location into `[{ id, label, href }]`.

Props rather than a second `usePluginData` call inside the dropdown is a choice, not a necessity: Docusaurus creates its context with a static default that already contains global data, so the hook would work in the separate root too. Props keep the component's inputs explicit and match the swizzle direction of PR #10. As a compatibility policy, the props default to the five built-ins and the default prompt, so a site that still renders `<MarkdownActionsDropdown />` bare from an old copied `Root` gets the rows. The README's upgrade note tells such sites to delete the copied `Root` rather than re-copy it (a copy fails to build on the plugin-relative imports, as noted in PR #10). The README's "Blog Support" section is replaced by a plain statement that blog pages are not supported: the classic theme renders the blog `<header>` as a sibling of `.markdown`, so the injection selector cannot match it whatever `docsPath` is set to.

### Bug fix: issue #12

`Root.js` calls `root.unmount()` synchronously inside the effect cleanup and inside `injectDropdown()`. Effect cleanup runs during React's commit phase, which triggers "Attempted to synchronously unmount a root while React was already rendering". Both unmounts move to `setTimeout(() => root.unmount(), 0)`. The container element is still removed synchronously. "View as Markdown" also gains `noopener,noreferrer` on its `window.open`.

The warning is development-only, so it is reproduced and then verified under `docusaurus start` on fly_docs, not on a production build: first with the unchanged 2.2.5 code to see it, then with the fix to see it gone, across rapid navigation between docs and navigation away from docs, ending with exactly one live dropdown showing the final page's URLs. Production builds are checked separately for rendering.

### Docusaurus 4

Build a throwaway site on `@docusaurus/core@canary` with the plugin installed from an `npm pack` tarball (never a symlink: the plugin's own `node_modules` would shadow React; the tarball name is read from `npm pack --json`, not assumed). The canary needs Node 24.21+, obtained with `npm exec --yes --package=node@24 -c '...'`, which leaves the machine's Node and nvm untouched. Build commands keep their exit status (no bare `| tail`). If the build writes the `.md` files and the dropdown renders, widen `peerDependencies["@docusaurus/core"]` to `^3.0.0 || ^4.0.0-0`: the `-0` suffix makes the range match `4.0.0-canary-*` prereleases today as well as 4.0.0 final when it ships (plain `^4.0.0` excludes prereleases by semver rules). The CHANGELOG records the installed `@docusaurus/core`, React and Node versions read from the scratch site at verification time. If it fails, keep `^3.0.0` and note what broke. Baseline, 2026-10-26: 2.2.5 already builds on `4.0.0-canary-7002` and converts Tabs and fences correctly.

### Docs and release

- README: new "AI assistant actions" section with the options table, the five built-ins, the HTML-vs-markdown note, a custom-entry example, and a refreshed screenshot of the menu. Feature list gains a line. Copy says each row "opens the assistant with a prompt linking to this page", never that the page is loaded; "Open in Gemini" is explained as Google's AI Mode next to the table; a note says the site must be publicly reachable for the assistant to read it (localhost, previews and private sites will not work). "Blog Support" becomes "Blog pages are not supported". An "Upgrading from 2.2.x" note: no config change needed; delete any copied `Root`.
- Smoke test of the five destinations with a public flynumber.com page URL, in an isolated browser context so no signed-in account is touched: each destination must show the prompt in its input or a sign-in wall, never an error page.
- CHANGELOG: 2.3.0 entry (Added, Fixed, Changed) plus version link.
- CLAUDE.md: tests exist (`npm test`, `node --test`), `lib/` layout, the new option, Codex review path.
- Version bump to 2.3.0. Commit, push and GitHub release follow the documented process; `npm publish` stays manual.

### Review gate

Code review by Codex through `fly-codex` on the account default `gpt-6-astra` at `xhigh`, read-only sandbox, with the diff and the spec. Findings are fixed and a second pass runs if the first pass found anything substantive.

### Tests

`node --test`, no new dependencies:

- `lib/ai-providers`: built-in table shape; option normalization for defaults, subset, reorder, `[]`, `false`, custom entry with and without `context`; rejection messages for unknown id, duplicate id, missing label, url without `{prompt}`, non-http(s) or relative url, unknown key, bad `context`, prompt without `{url}`; href building for each built-in, verified by reading the `q` parameter back with `URLSearchParams` and comparing to the expected prompt; a `/sub/docs/` pathname, a percent-encoded pathname, Unicode, `#`, `$&` in the URL, a prompt with `{url}` twice; custom entry hrefs for both contexts.
- `index.js`: `validateOptions` defaults `id`, keeps an explicit id, throws on bad config; `contentLoaded` publishes the normalized trio from raw options.
- Existing suites keep passing.
- Root.js fix is verified by hand in dev mode as described under the bug fix.

## Left to the builder

- Exact SVG path data (lobehub icons, MIT) and the generic mark for custom entries.
- Divider colour and spacing (use Infima variables).
- Whether the screenshot is captured from fly_docs or a scratch site.
- Internal naming inside `lib/ai-providers.js`.
