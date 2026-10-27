# AI Actions in the Markdown Dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 2.3.0: "Open in ChatGPT / Claude / Gemini / Perplexity / Grok" rows in the existing dropdown, the issue #12 React warning fixed, Docusaurus 4 peer range after a canary build, docs refreshed, Codex-reviewed.

**Architecture:** A pure CommonJS module `lib/ai-providers.js` owns the provider table, option validation and href building, so it is unit-testable with `node --test` like the other `lib/` modules. `index.js` exports `validateOptions` (validate, default `id`, return the user's options) so bad config fails at `docusaurus build` time, and `contentLoaded` normalizes the raw options once and ships them to the browser through the existing `setGlobalData` path. `Root.js` passes them as props to the dropdown, which renders the new rows as anchors with inline SVG marks.

**Tech Stack:** Plain JavaScript, React 18/19, Docusaurus 3 plugin APIs (`validateOptions`, `contentLoaded`, `setGlobalData`, `getThemePath`), `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-26-ai-actions-design.md`

**Review history:** Codex plan review 1 (gpt-6-astra, 2026-10-26) returned 12 findings, verdict "proceed with fixes"; all are folded in below (blocker: `id` defaulting in `validateOptions`; dev-mode verification of #12; tarball name; scratch-site `docsPath`; absolute-URL validation; strict custom-entry schema; README migration/blog copy; test fixes; a11y disclosure; exit-status handling).

**Amendment 2026-10-27 (after execution):** release-candidate testing and a peer survey changed two defaults: Perplexity's context is now `page` (it could not retrieve the `noindex` `.md` twin and answered from its indexed HTML copy) and the default prompt is `Read from {url} so I can ask questions about it.` The spec is updated. Test examples and browser expectations below that still show `Read {url}` or a markdown URL for Perplexity are superseded and kept only as the record of what was executed.

## Global Constraints

- No new runtime dependency; `fs-extra` stays the only one. Icons are inline path data, never fetched.
- Existing rows, trigger label "Open Markdown", injection mechanism and `docsPath` behaviour unchanged.
- Built-in ids and order: `chatgpt`, `claude`, `gemini`, `perplexity`, `grok`. Default prompt: `Read {url} so I can ask questions about it.`
- `chatgpt`, `gemini`, `grok` and custom entries receive the HTML page URL; `claude`, `perplexity` and custom entries with `context: 'markdown'` receive the markdown URL.
- Placeholders: `{url}` in the prompt, `{prompt}` in a URL template. Nothing else. Substitution uses `split`/`join`, never `String.replace` with a string pattern.
- Custom entry keys: exactly `label`, `url`, optional `context` (`'page'` | `'markdown'`). `url` must be an absolute `http:`/`https:` URL after substitution.
- Error messages start with `[markdown-source-plugin]` and name the option.
- One plugin instance; `validateOptions` defaults `id` to `'default'`.
- Version 2.3.0. CommonJS in `lib/` and `index.js`; ESM + JSX only in `theme/` and `components/`.
- Shell steps that pipe a build into `tail` must preserve the build's exit status (`set -o pipefail` or `${PIPESTATUS[0]}`).

## Review Focus

1. A page URL containing spaces, `&`, `#`, `%20` or Unicode in the prompt must survive encoding: the assistant receives the exact URL. Pinned in Task 1 (`reads back the exact prompt through URLSearchParams`).
2. A site with `baseUrl: '/sub/'` must produce `https://host/sub/docs/x.md`, not `https://host/docs/x.md`. Pinned in Task 1 (`full pathname is used, so baseUrl survives`).
3. `aiProviders: false` and `aiProviders: []` must both remove the divider, not leave an orphan separator, while the two original rows stay. Pinned in Task 1 and verified in Task 6 on the scratch site with `docsPath: '/'` kept.
4. Rapid client-side navigation between docs must not throw from a deferred unmount whose container is already gone, and must end with exactly one dropdown. Pinned in Task 5 under `docusaurus start`.
5. A URL template containing `$&` or a prompt containing `{url}` twice must be substituted literally and fully. Pinned in Task 1 (`$& in a template is literal`, `every {url} occurrence is replaced`).

---

### Task 1: `lib/ai-providers.js` — provider table, option validation, href building

**Files:**
- Create: `lib/ai-providers.js`
- Test: `test/ai-providers.test.js`

**Interfaces:**
- Produces:
  - `BUILT_IN_PROVIDERS: Array<{ id, label, url, context: 'page' | 'markdown' }>` in the order of the Global Constraints, with the URL templates from the spec table.
  - `DEFAULT_PROMPT: string`
  - `normalizeAiOptions(options: { aiProviders?: unknown, aiPrompt?: unknown }) => { aiProviders: Provider[], aiPrompt: string }` — raw user options in, normalized out; throws `Error` on invalid input. Built-ins are copied from the table. Custom entries become `{ id: 'custom-<index>', label, url, context }` where index is the entry's position in the array and `context` defaults to `'page'`. The function is not re-applied to its own output.
  - `buildAiLinks({ aiProviders: Provider[], aiPrompt: string, pageUrl: string, markdownUrl: string }) => Array<{ id, label, href }>`

- [ ] **Step 1: Write the failing tests**

```js
// test/ai-providers.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { BUILT_IN_PROVIDERS, DEFAULT_PROMPT, normalizeAiOptions, buildAiLinks } = require('../lib/ai-providers');

const IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'];
const promptFor = url => `Read ${url} so I can ask questions about it.`;
const qOf = href => new URL(href).searchParams.get('q');

test('built-in table: five ids in spec order with context split', () => {
  assert.deepEqual(BUILT_IN_PROVIDERS.map(p => p.id), IDS);
  assert.deepEqual(BUILT_IN_PROVIDERS.map(p => p.context), ['page', 'markdown', 'page', 'markdown', 'page']);
  for (const p of BUILT_IN_PROVIDERS) assert.ok(p.url.includes('{prompt}'), p.id);
  assert.equal(BUILT_IN_PROVIDERS[0].url, 'https://chatgpt.com/?hints=search&q={prompt}');
  assert.equal(BUILT_IN_PROVIDERS[1].url, 'https://claude.ai/new?q={prompt}');
  assert.equal(BUILT_IN_PROVIDERS[2].url, 'https://www.google.com/search?udm=50&q={prompt}');
  assert.equal(BUILT_IN_PROVIDERS[3].url, 'https://www.perplexity.ai/search/new?q={prompt}');
  assert.equal(BUILT_IN_PROVIDERS[4].url, 'https://grok.com/?q={prompt}');
});

test('normalize: undefined gives all built-ins and the default prompt', () => {
  const out = normalizeAiOptions({});
  assert.deepEqual(out.aiProviders.map(p => p.id), IDS);
  assert.equal(out.aiPrompt, DEFAULT_PROMPT);
  assert.equal(DEFAULT_PROMPT, 'Read {url} so I can ask questions about it.');
});

test('normalize: subset and reorder are honoured; built-ins are copies', () => {
  const out = normalizeAiOptions({ aiProviders: ['claude', 'chatgpt'] });
  assert.deepEqual(out.aiProviders.map(p => p.id), ['claude', 'chatgpt']);
  assert.notEqual(out.aiProviders[1], BUILT_IN_PROVIDERS[0]);
  assert.deepEqual(out.aiProviders[1], BUILT_IN_PROVIDERS[0]);
});

test('normalize: false and [] both yield an empty list', () => {
  assert.deepEqual(normalizeAiOptions({ aiProviders: false }).aiProviders, []);
  assert.deepEqual(normalizeAiOptions({ aiProviders: [] }).aiProviders, []);
});

test('normalize: custom entry gets custom-<index> id and page context by default', () => {
  const out = normalizeAiOptions({ aiProviders: ['chatgpt', { label: 'Open in Mistral', url: 'https://chat.mistral.ai/chat?q={prompt}' }] });
  assert.deepEqual(out.aiProviders[1], { id: 'custom-1', label: 'Open in Mistral', url: 'https://chat.mistral.ai/chat?q={prompt}', context: 'page' });
});

test('normalize: custom entry may opt into the markdown URL', () => {
  const out = normalizeAiOptions({ aiProviders: [{ label: 'Open in Kagi', url: 'https://kagi.com/assistant?q={prompt}', context: 'markdown' }] });
  assert.equal(out.aiProviders[0].context, 'markdown');
});

test('normalize: rejects unknown id, listing the valid ids', () => {
  assert.throws(() => normalizeAiOptions({ aiProviders: ['copilot'] }), /\[markdown-source-plugin\] .*aiProviders.*"copilot".*chatgpt, claude, gemini, perplexity, grok/);
});

test('normalize: rejects duplicate built-in ids', () => {
  assert.throws(() => normalizeAiOptions({ aiProviders: ['claude', 'claude'] }), /\[markdown-source-plugin\] .*aiProviders.*duplicate.*"claude"/);
});

test('normalize: rejects malformed custom entries', () => {
  const bad = [
    [{ url: 'https://x.test/?q={prompt}' }, /aiProviders.*label/],
    [{ label: '', url: 'https://x.test/?q={prompt}' }, /aiProviders.*label/],
    [{ label: 'X', url: 'https://x.test/' }, /aiProviders.*\{prompt\}/],
    [{ label: 'X', url: 'javascript:alert(1)//{prompt}' }, /aiProviders.*http/],
    [{ label: 'X', url: 'data:text/html,{prompt}' }, /aiProviders.*http/],
    [{ label: 'X', url: '/relative?q={prompt}' }, /aiProviders.*http/],
    [{ label: 'X', url: 'not a url {prompt}' }, /aiProviders.*http/],
    [{ label: 'X', url: 'https://x.test/?q={prompt}', context: 'html' }, /aiProviders.*context/],
    [{ label: 'X', url: 'https://x.test/?q={prompt}', icon: 'x' }, /aiProviders.*icon/],
    [{ label: 'X', url: 'https://x.test/?q={prompt}', id: 'claude' }, /aiProviders.*id/],
  ];
  for (const [entry, re] of bad) assert.throws(() => normalizeAiOptions({ aiProviders: [entry] }), re, JSON.stringify(entry));
});

test('normalize: rejects non-array aiProviders and bad aiPrompt', () => {
  assert.throws(() => normalizeAiOptions({ aiProviders: 'chatgpt' }), /\[markdown-source-plugin\] .*aiProviders/);
  assert.throws(() => normalizeAiOptions({ aiProviders: [42] }), /\[markdown-source-plugin\] .*aiProviders/);
  assert.throws(() => normalizeAiOptions({ aiPrompt: '' }), /\[markdown-source-plugin\] .*aiPrompt/);
  assert.throws(() => normalizeAiOptions({ aiPrompt: 'Summarise this page.' }), /aiPrompt.*\{url\}/);
  assert.throws(() => normalizeAiOptions({ aiPrompt: 42 }), /aiPrompt/);
});

const ctx = { pageUrl: 'https://docs.test/docs/intro', markdownUrl: 'https://docs.test/docs/intro.md' };

test('buildAiLinks: each built-in gets its context URL inside the prompt, read back exactly', () => {
  const { aiProviders, aiPrompt } = normalizeAiOptions({});
  const links = buildAiLinks({ aiProviders, aiPrompt, ...ctx });
  const byId = Object.fromEntries(links.map(l => [l.id, l.href]));
  assert.equal(qOf(byId.chatgpt), promptFor(ctx.pageUrl));
  assert.equal(new URL(byId.chatgpt).searchParams.get('hints'), 'search');
  assert.equal(new URL(byId.chatgpt).origin + new URL(byId.chatgpt).pathname, 'https://chatgpt.com/');
  assert.equal(qOf(byId.claude), promptFor(ctx.markdownUrl));
  assert.equal(new URL(byId.claude).pathname, '/new');
  assert.equal(qOf(byId.gemini), promptFor(ctx.pageUrl));
  assert.equal(new URL(byId.gemini).searchParams.get('udm'), '50');
  assert.equal(qOf(byId.perplexity), promptFor(ctx.markdownUrl));
  assert.equal(new URL(byId.perplexity).pathname, '/search/new');
  assert.equal(qOf(byId.grok), promptFor(ctx.pageUrl));
  assert.deepEqual(links.map(l => l.label), ['Open in ChatGPT', 'Open in Claude', 'Open in Gemini', 'Open in Perplexity', 'Open in Grok']);
});

test('buildAiLinks: reads back the exact prompt through URLSearchParams for hostile URLs', () => {
  const { aiProviders, aiPrompt } = normalizeAiOptions({ aiProviders: ['claude'] });
  for (const md of [
    'https://d.test/a b&c.md',
    'https://d.test/docs/caf%C3%A9.md',
    'https://d.test/docs/café.md',
    'https://d.test/docs/x.md#section',
    'https://d.test/docs/100%.md',
  ]) {
    const [link] = buildAiLinks({ aiProviders, aiPrompt, pageUrl: 'x', markdownUrl: md });
    assert.equal(qOf(link.href), promptFor(md), md);
    assert.equal(link.href.slice(0, 'https://claude.ai/new?q='.length), 'https://claude.ai/new?q=');
  }
});

test('buildAiLinks: full pathname is used, so baseUrl survives', () => {
  const { aiProviders, aiPrompt } = normalizeAiOptions({ aiProviders: ['chatgpt', 'claude'] });
  const links = buildAiLinks({ aiProviders, aiPrompt, pageUrl: 'https://h.test/sub/docs/x', markdownUrl: 'https://h.test/sub/docs/x.md' });
  assert.equal(qOf(links[0].href), promptFor('https://h.test/sub/docs/x'));
  assert.equal(qOf(links[1].href), promptFor('https://h.test/sub/docs/x.md'));
});

test('buildAiLinks: every {url} occurrence is replaced and $& in a template is literal', () => {
  const { aiProviders, aiPrompt } = normalizeAiOptions({
    aiPrompt: 'Open {url} then summarise {url}.',
    aiProviders: [{ label: 'Open in X', url: 'https://x.test/?pre=$&&q={prompt}' }],
  });
  const [link] = buildAiLinks({ aiProviders, aiPrompt, ...ctx });
  const u = new URL(link.href);
  assert.equal(u.searchParams.get('q'), `Open ${ctx.pageUrl} then summarise ${ctx.pageUrl}.`);
  assert.equal(u.searchParams.get('pre'), '$');
});

test('buildAiLinks: custom entries honour their context', () => {
  const { aiProviders, aiPrompt } = normalizeAiOptions({ aiProviders: [
    { label: 'A', url: 'https://a.test/?q={prompt}' },
    { label: 'B', url: 'https://b.test/?q={prompt}', context: 'markdown' },
  ] });
  const links = buildAiLinks({ aiProviders, aiPrompt, ...ctx });
  assert.deepEqual(links.map(l => l.id), ['custom-0', 'custom-1']);
  assert.equal(qOf(links[0].href), promptFor(ctx.pageUrl));
  assert.equal(qOf(links[1].href), promptFor(ctx.markdownUrl));
});

test('buildAiLinks: empty provider list yields []', () => {
  assert.deepEqual(buildAiLinks({ aiProviders: [], aiPrompt: DEFAULT_PROMPT, ...ctx }), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/ai-providers.test.js`
Expected: FAIL, `Cannot find module '../lib/ai-providers'`

- [ ] **Step 3: Implement `lib/ai-providers.js`**

Export `BUILT_IN_PROVIDERS`, `DEFAULT_PROMPT`, `normalizeAiOptions`, `buildAiLinks`. Validation of a custom `url`: substitute `{prompt}` with the literal `x`, then `new URL(candidate)` must parse and have protocol `http:` or `https:`; keep the original template. Object entries: reject any key outside `label`, `url`, `context`. Every thrown message starts with `[markdown-source-plugin]` and names the option.

- [ ] **Step 4: Run the full suite**

Run: `npm test` — Expected: all pass, 36 existing + the new tests.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-providers.js test/ai-providers.test.js docs/superpowers
git commit -m "feat: add AI provider table, option validation and href builder"
```

---

### Task 2: `index.js` — `validateOptions` export and global data

**Files:**
- Modify: `index.js` (plugin factory `contentLoaded`; new export)
- Test: `test/plugin-options.test.js`

**Interfaces:**
- Consumes: `normalizeAiOptions` from Task 1; existing `normalizeDocsPath`.
- Produces: `module.exports.validateOptions({ options }) => options` returning `{ ...options, id: options.id ?? 'default' }` after `normalizeAiOptions(options)` and `normalizeDocsPath(options.docsPath)` have been called for their validation (the returned object keeps the user's raw `aiProviders`/`aiPrompt`/`docsPath`). `contentLoaded` calls `setGlobalData({ docsPath: normalizeDocsPath(options.docsPath), ...normalizeAiOptions(options) })`.

- [ ] **Step 1: Write the failing tests**

```js
// test/plugin-options.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../index');

test('validateOptions: bare registration gets id "default" and keeps raw options', () => {
  const out = plugin.validateOptions({ options: {} });
  assert.equal(out.id, 'default');
  assert.equal(out.aiProviders, undefined);
  assert.equal(out.docsPath, undefined);
});

test('validateOptions: explicit id and other keys are preserved', () => {
  const out = plugin.validateOptions({ options: { id: 'second', docsPath: 'guides', aiProviders: ['claude'] } });
  assert.equal(out.id, 'second');
  assert.equal(out.docsPath, 'guides');
  assert.deepEqual(out.aiProviders, ['claude']);
});

test('validateOptions: bad config throws at config time', () => {
  assert.throws(() => plugin.validateOptions({ options: { aiProviders: ['nope'] } }), /\[markdown-source-plugin\]/);
  assert.throws(() => plugin.validateOptions({ options: { aiPrompt: 'no placeholder' } }), /\[markdown-source-plugin\]/);
});

async function globalDataFor(rawOptions) {
  const options = plugin.validateOptions({ options: rawOptions });
  const instance = plugin({ siteDir: '/tmp' }, options);
  let data;
  await instance.contentLoaded({ actions: { setGlobalData: d => { data = d; } } });
  return data;
}

test('contentLoaded: publishes normalized docsPath, aiProviders and aiPrompt', async () => {
  const data = await globalDataFor({ docsPath: 'guides', aiProviders: ['claude', { label: 'Open in X', url: 'https://x.test/?q={prompt}' }] });
  assert.equal(data.docsPath, '/guides/');
  assert.deepEqual(data.aiProviders.map(p => p.id), ['claude', 'custom-1']);
  assert.equal(data.aiProviders[0].context, 'markdown');
  assert.equal(data.aiPrompt, 'Read {url} so I can ask questions about it.');
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
});

test('contentLoaded: defaults for bare registration', async () => {
  const data = await globalDataFor({});
  assert.equal(data.docsPath, '/docs/');
  assert.equal(data.aiProviders.length, 5);
});

test('contentLoaded: aiProviders false publishes an empty list', async () => {
  const data = await globalDataFor({ aiProviders: false });
  assert.deepEqual(data.aiProviders, []);
});
```

- [ ] **Step 2: Run to verify they fail** — `node --test test/plugin-options.test.js` → `plugin.validateOptions is not a function`

- [ ] **Step 3: Implement**

In `index.js`: `function validateOptions({ options = {} })` runs `normalizeDocsPath(options.docsPath)` and `normalizeAiOptions(options)` for validation, then returns `{ ...options, id: options.id ?? 'default' }`. In `contentLoaded`, build the global data from `normalizeAiOptions(options)` and `normalizeDocsPath(options.docsPath)`. Attach `module.exports.validateOptions = validateOptions;` after the factory export.

- [ ] **Step 4: Run the full suite** — `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add index.js test/plugin-options.test.js
git commit -m "feat: validate aiProviders/aiPrompt at config time and expose them as global data"
```

---

### Task 3: `theme/Root.js` — fix issue #12 and pass props

**Files:**
- Modify: `theme/Root.js` (`cleanup`, `injectDropdown`, `usePluginData` destructure, effect deps)

**Interfaces:**
- Consumes: global data `{ docsPath, aiProviders, aiPrompt }` from Task 2.
- Produces: `<MarkdownActionsDropdown aiProviders={aiProviders} aiPrompt={aiPrompt} />` rendered into the injected container.

- [ ] **Step 1: Replace both synchronous `unmount()` calls with a deferred unmount**

Add `function unmountLater(root) { setTimeout(() => root.unmount(), 0); }` at module scope. In `cleanup()` and in the stale-root branch of `injectDropdown()`, call `unmountLater(dropdownRootRef.current)` and null the ref. Container removal stays synchronous.

- [ ] **Step 2: Pass the new props**

Destructure `aiProviders` and `aiPrompt` from `usePluginData('markdown-source-plugin')`; render `<MarkdownActionsDropdown aiProviders={aiProviders} aiPrompt={aiPrompt} />`; add both to the effect dependency array.

- [ ] **Step 3: Syntax check**

Run: `npx --yes esbuild theme/Root.js --loader:.js=jsx --log-level=error > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add theme/Root.js
git commit -m "fix: defer dropdown root unmount so React is not unmounting mid-render (#12)"
```

---

### Task 4: Dropdown rows, icons, disclosure semantics

**Files:**
- Create: `lib/ai-icons.js` — `ICON_PATHS: { [builtInId]: string }` for the five built-in ids, `GENERIC_ICON_PATH`
- Create: `components/MarkdownActionsDropdown/ProviderIcon.js` — `export default function ProviderIcon({ id })`
- Modify: `components/MarkdownActionsDropdown/index.js`
- Test: `test/ai-icons.test.js`

**Interfaces:**
- Consumes: `buildAiLinks`, `BUILT_IN_PROVIDERS`, `DEFAULT_PROMPT` from Task 1; props from Task 3.
- Produces: the rendered rows. `ProviderIcon` renders `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" style={{ marginRight: '8px', verticalAlign: 'middle' }}><path d={ICON_PATHS[id] || GENERIC_ICON_PATH} /></svg>`; only the five built-in ids map to brand marks, so `custom-N` ids always get the generic mark.

- [ ] **Step 1: Write the failing test**

```js
// test/ai-icons.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { ICON_PATHS, GENERIC_ICON_PATH } = require('../lib/ai-icons');
const { BUILT_IN_PROVIDERS } = require('../lib/ai-providers');

test('icon table covers exactly the built-in ids, plus a generic path', () => {
  assert.deepEqual(Object.keys(ICON_PATHS).sort(), BUILT_IN_PROVIDERS.map(p => p.id).sort());
  for (const [id, d] of Object.entries(ICON_PATHS)) assert.ok(d.startsWith('M'), id);
  assert.ok(GENERIC_ICON_PATH.startsWith('M'));
  assert.equal(ICON_PATHS['custom-0'], undefined);
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test test/ai-icons.test.js` → `Cannot find module '../lib/ai-icons'`

- [ ] **Step 3: Implement `lib/ai-icons.js`**

Path data from `@lobehub/icons-static-svg` 1.101.0 (MIT): `openai` → `chatgpt`, `claude`, `gemini`, `perplexity`, `grok`. Header comment with source and licence. `GENERIC_ICON_PATH` is a four-point star: `M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z`.

- [ ] **Step 4: Implement `ProviderIcon.js` and the rows**

In the component: accept `{ aiProviders = BUILT_IN_PROVIDERS, aiPrompt = DEFAULT_PROMPT }` (compatibility defaults per spec); compute `origin = window.location.origin` guarded like `currentPath`, `pageUrl = origin + currentPath`, `markdownUrlAbs = origin + markdownUrl`; `aiLinks = buildAiLinks({ aiProviders, aiPrompt, pageUrl, markdownUrl: markdownUrlAbs })`. After the copy row, when `aiLinks.length > 0`, render `<li role="separator"><hr style={{ margin: '0.3rem 0', border: 0, borderTop: '1px solid var(--ifm-color-emphasis-200)' }} /></li>` then one `<li key={link.id}><a className="dropdown__link" href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)}><ProviderIcon id={link.id} />{link.label}</a></li>` per link.

Disclosure semantics: remove `aria-haspopup`; give the `<ul>` an id from `useId()` when available (React 18+) and set `aria-controls` on the trigger; add a `keydown` listener while open that closes on `Escape` and calls `.focus()` on the trigger (keep a `triggerRef`). Change `handleOpenMarkdown` to `window.open(markdownUrl, '_blank', 'noopener,noreferrer')`.

- [ ] **Step 5: Run tests and syntax check**

Run: `npm test && npx --yes esbuild components/MarkdownActionsDropdown/index.js components/MarkdownActionsDropdown/ProviderIcon.js --loader:.js=jsx --log-level=error --outdir=/tmp/esb-check && echo OK`
Expected: all tests pass, `OK`.

- [ ] **Step 6: Commit**

```bash
git add lib/ai-icons.js components/MarkdownActionsDropdown test/ai-icons.test.js
git commit -m "feat: add Open in ChatGPT/Claude/Gemini/Perplexity/Grok rows to the dropdown"
```

---

### Task 5: Verify on Docusaurus 3.10 (fly_docs): #12 in dev mode, rows in prod, destinations, screenshot

**Files:**
- Modify: `.github/images/button_screenshot.png` (replace)
- Touches outside the repo: `/Users/naderjaber/Desktop/fly_docs/node_modules/docusaurus-markdown-source-plugin/` only (no fly_docs git changes; `build/` and `.docusaurus/` are gitignored there)

- [ ] **Step 1: Reproduce #12 with the unchanged 2.2.5 in dev mode**

fly_docs still has 2.2.5 installed. Run `npm start -- --port 3001 --no-open` in fly_docs in the background. In chrome-devtools open `http://localhost:3001/docs/`, clear console, click three sidebar links quickly, then list console messages. Expected: at least one "Attempted to synchronously unmount a root while React was already rendering". Record the count. Stop the dev server.

- [ ] **Step 2: Install the working tree and repeat**

Run: `rsync -a --delete --exclude node_modules --exclude .git --exclude test --exclude docs /Users/naderjaber/Desktop/markdown_docusaurus_plugin/ /Users/naderjaber/Desktop/fly_docs/node_modules/docusaurus-markdown-source-plugin/`, then `npm start` again. Same clicks, plus: navigate from a doc to the site home and back, and to `/legacy/` and back. Expected: zero occurrences of the warning; after timers settle, `document.querySelectorAll('.markdown-actions-container').length === 1` and the Claude link's href contains the final page's `.md` path.

- [ ] **Step 3: Production build and row check**

Run in fly_docs: `set -o pipefail; npm run build 2>&1 | tail -20` — Expected: exit 0 and `[markdown-source-plugin] Successfully processed N markdown files`. Then `npm run serve -- --port 3001` in the background, open `http://localhost:3001/docs/`, click "Open Markdown". Snapshot: rows in order View, Copy, separator, ChatGPT, Claude, Gemini, Perplexity, Grok. Read each anchor's `href` and decode `q`: ChatGPT/Gemini/Grok contain `http://localhost:3001/docs/`; Claude/Perplexity contain `http://localhost:3001/docs/index.md`. Press Escape: list closes, trigger has focus.

- [ ] **Step 4: Destination smoke test (isolated browser context)**

Generate the five hrefs for a public page: `node -e "const a=require('./lib/ai-providers');const {aiProviders,aiPrompt}=a.normalizeAiOptions({});console.log(JSON.stringify(a.buildAiLinks({aiProviders,aiPrompt,pageUrl:'https://www.flynumber.com/docs/faq',markdownUrl:'https://www.flynumber.com/docs/faq.md'}),null,1))"`. Open each in chrome-devtools with `isolatedContext: 'ai-smoke'` and snapshot. Expected per destination: the prompt text visible in the composer, or a sign-in wall. An error page or a blank composer is a finding to record in the README (and to reconsider that provider's template). Close the pages.

- [ ] **Step 5: Screenshot**

With the menu open on a doc page at desktop width, screenshot the header region and save over `.github/images/button_screenshot.png` at roughly 800px wide (README displays it at 400).

- [ ] **Step 6: Commit**

```bash
git add .github/images/button_screenshot.png
git commit -m "docs: refresh dropdown screenshot with AI assistant rows"
```

---

### Task 6: Docusaurus 4 canary build and peer range

**Files:**
- Modify: `package.json` (`peerDependencies["@docusaurus/core"]`)
- Scratch site: `<scratchpad>/v4site` (scaffolded; `docusaurus.config.js` has `routeBasePath: '/'` and `docsPath: '/'`)

- [ ] **Step 1: Pack and install the current tree**

Run in the plugin repo: `TGZ=$(npm pack --json --pack-destination <scratchpad>/pack | node -p "JSON.parse(require('fs').readFileSync(0,'utf8'))[0].filename")`; in v4site: `npm exec --yes --package=node@24 -c "npm install --legacy-peer-deps --no-audit --no-fund ../pack/$TGZ"`. Confirm `node_modules/docusaurus-markdown-source-plugin/lib/ai-providers.js` exists.

- [ ] **Step 2: Build under Node 24**

Run: `npm exec --yes --package=node@24 -c 'npm run build' > build.log 2>&1; echo EXIT=$?` then `tail -25 build.log`.
Expected: `EXIT=0`, `Successfully processed 2 markdown files`; `build/index.md` and `build/guide/setup.md` exist; `setup.md` keeps the fenced `import` line and converts `<Tabs>` to `**npm:**` / `**yarn:**`.

- [ ] **Step 3: Serve and check the dropdown on canary**

Run: `npm exec --yes --package=node@24 -c 'npm run serve -- --port 3002'` in the background; open `http://localhost:3002/` in chrome-devtools; confirm the trigger, two original rows, separator and five AI rows; console has no errors. Then edit only the plugin options to `{ docsPath: '/', aiProviders: [] }` (keep `docsPath: '/'`), rebuild, confirm the trigger and the two original rows remain and there is no separator. Repeat with `aiProviders: false`. Restore the default config afterwards.

- [ ] **Step 4: Record versions and widen the peer range**

Run: `node -p "['@docusaurus/core','react'].map(n=>n+' '+require('./node_modules/'+n+'/package.json').version).join(', ')"` in v4site and keep the output with the Node version for the CHANGELOG. If every build passed: `"@docusaurus/core": "^3.0.0 || ^4.0.0-0"`. If not, leave `^3.0.0` and record the failure for the CHANGELOG.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: accept Docusaurus 4 (incl. prereleases) as a peer"
```

---

### Task 7: Docs, changelog, version

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md` (2.3.0 entry + link)
- Modify: `CLAUDE.md` (local, gitignored)
- Modify: `package.json` (`"version": "2.3.0"`)

- [ ] **Step 1: README**

Features: add `🤖 **Open in ChatGPT / Claude / Gemini / Perplexity / Grok**: one click opens the assistant with a prompt linking to the page`. New section "AI assistant actions" under Advanced Configuration with: the default config block from the spec; the five-row table (id, label, URL the assistant receives); the paragraph on why ChatGPT, Gemini and Grok get the HTML page and that "Open in Gemini" opens Google's AI Mode (a Gemini-powered Search experience) because gemini.google.com has no prefill parameter; the public-access note (assistants fetch the URL themselves, so localhost, previews and private sites will not work); a custom-entry example `{ label, url }` with one sentence on optional `context: 'markdown'`; `aiProviders: []` to hide. Replace "Blog Support" with "Blog pages are not supported: the classic theme renders the blog header outside `.markdown`, so the injection point does not exist there." Add "Upgrading from 2.2.x": no config change needed; if you copied the plugin's `Root` into `src/theme`, delete it (a copy fails to build and would hide the new rows); to add your own `Root` logic, wrap `@theme-original/Root`. Add any destination caveat found in Task 5 step 4.

- [ ] **Step 2: CHANGELOG**

```markdown
## [2.3.0] - 2026-10-26

### Added
- **Open in ChatGPT / Claude / Gemini / Perplexity / Grok** rows in the dropdown, on by default ...
- `aiProviders` and `aiPrompt` options, validated at config time via a `validateOptions` export ...
- Docusaurus 4 accepted as a peer dependency (`^3.0.0 || ^4.0.0-0`); verified against <versions from Task 6> ...

### Fixed
- **React warning "Attempted to synchronously unmount a root" on client-side navigation** (#12) ...
- "View as Markdown" opens with `noopener,noreferrer`.

### Changed
- Dropdown trigger uses disclosure semantics (`aria-controls`, Escape closes and restores focus) ...
```
plus `[2.3.0]: https://github.com/FlyNumber/markdown_docusaurus_plugin/compare/v2.2.5...v2.3.0` in the link list.

- [ ] **Step 3: CLAUDE.md and version bump**

CLAUDE.md: tests exist (`npm test`), `lib/` layout, `validateOptions`, the options, the Codex review path via `fly-codex`, the canary test recipe. Bump `package.json` to 2.3.0. Run `npm test`.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md package.json
git commit -m "chore: release 2.3.0"
```

---

### Task 8: Codex code review gate

- [ ] **Step 1: Write the review prompt** to `<scratchpad>/codex/code-review-1.md`: role, the spec and plan paths, `git diff v2.2.5..HEAD` inline, the plan-review findings list so the reviewer can confirm each was addressed, instructions to report `severity | file:line | problem | why it matters | suggested fix`, then a verdict `SHIP` / `SHIP WITH FIXES` / `NO`.

- [ ] **Step 2: Run** `fly-codex <scratchpad>/codex/code-review-1.md --dir /Users/naderjaber/Desktop/markdown_docusaurus_plugin --sandbox read-only --timeout 1800` in the background; tail the log it prints.

- [ ] **Step 3: Triage** with superpowers:receiving-code-review: verify each finding against the code before acting. Fix real ones with a test where one applies, commit as `fix:` or `refactor:`.

- [ ] **Step 4: Second pass** with `--resume <session>` carrying the follow-up diff, until the verdict is `SHIP`.

---

### Task 9: Release

- [ ] **Step 1:** `git log --oneline v2.2.5..HEAD`, `npm test`, `npm pack --dry-run` (confirm `lib/ai-providers.js`, `lib/ai-icons.js`, `components/MarkdownActionsDropdown/ProviderIcon.js` are in the tarball and `docs/` is not).
- [ ] **Step 2:** Confirm with the owner, then `git push origin main` and `gh release create v2.3.0 --title "v2.3.0 — AI assistant actions" --notes-file <CHANGELOG excerpt>`.
- [ ] **Step 3:** Hand off: `npm publish` is manual. Suggested follow-ups: reply on #12 and close, reply on #7 and close, bump fly_docs to 2.3.0 after publish.
