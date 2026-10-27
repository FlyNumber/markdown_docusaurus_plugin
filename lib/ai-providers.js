// AI assistant "Open in …" rows: provider table, option validation, href building.
//
// `context` says which URL the assistant receives inside the prompt:
//   'page'     — the HTML page URL. ChatGPT rejects .md URLs in a prefilled
//                prompt; Perplexity answers from its search index, which never
//                contains the (noindexed) .md twin; Google AI Mode and Grok get
//                the safe choice too.
//   'markdown' — the clean .md URL this plugin generates. Claude fetches the
//                user-supplied URL live, so it benefits from the clean input.
const { getMarkdownUrl } = require('./markdown-path');

const BUILT_IN_PROVIDERS = [
  { id: 'chatgpt', label: 'Open in ChatGPT', url: 'https://chatgpt.com/?hints=search&q={prompt}', context: 'page' },
  { id: 'claude', label: 'Open in Claude', url: 'https://claude.ai/new?q={prompt}', context: 'markdown' },
  { id: 'gemini', label: 'Open in Gemini', url: 'https://www.google.com/search?udm=50&q={prompt}', context: 'page' },
  { id: 'perplexity', label: 'Open in Perplexity', url: 'https://www.perplexity.ai/search/new?q={prompt}', context: 'page' },
  { id: 'grok', label: 'Open in Grok', url: 'https://grok.com/?q={prompt}', context: 'page' },
];

// Same wording Mintlify, Neon and PostHog use, so assistants see a familiar prompt.
const DEFAULT_PROMPT = 'Read from {url} so I can ask questions about it.';

const PREFIX = '[markdown-source-plugin]';
const VALID_IDS = BUILT_IN_PROVIDERS.map(p => p.id);
const CUSTOM_KEYS = ['label', 'url', 'context'];

function fail(message) {
  throw new Error(`${PREFIX} ${message}`);
}

// Literal substitution: never String.replace with a string pattern, which
// would interpret `$&` and friends inside the replacement.
function replaceAll(str, token, value) {
  return str.split(token).join(value);
}

function isAbsoluteHttpUrl(template) {
  let parsed;
  try {
    parsed = new URL(replaceAll(template, '{prompt}', 'x'));
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

function normalizeCustomEntry(entry, index) {
  const unknown = Object.keys(entry).filter(key => !CUSTOM_KEYS.includes(key));
  if (unknown.length > 0) {
    fail(
      `aiProviders[${index}] has unsupported key${unknown.length > 1 ? 's' : ''} ` +
      `${unknown.map(key => `"${key}"`).join(', ')}. A custom entry accepts "label", "url" ` +
      `and an optional "context" ('page' | 'markdown').`
    );
  }
  if (typeof entry.label !== 'string' || entry.label.trim() === '') {
    fail(`aiProviders[${index}].label must be a non-empty string.`);
  }
  if (typeof entry.url !== 'string' || !entry.url.includes('{prompt}')) {
    fail(`aiProviders[${index}].url must be a string containing the {prompt} placeholder.`);
  }
  if (!isAbsoluteHttpUrl(entry.url)) {
    fail(`aiProviders[${index}].url must be an absolute http(s) URL, got "${entry.url}".`);
  }
  if (entry.context !== undefined && entry.context !== 'page' && entry.context !== 'markdown') {
    fail(`aiProviders[${index}].context must be 'page' or 'markdown', got ${JSON.stringify(entry.context)}.`);
  }
  return {
    id: `custom-${index}`,
    label: entry.label,
    url: entry.url,
    context: entry.context === 'markdown' ? 'markdown' : 'page',
  };
}

function normalizeProviders(aiProviders) {
  if (aiProviders === undefined) return BUILT_IN_PROVIDERS.map(p => ({ ...p }));
  if (aiProviders === false) return [];
  if (!Array.isArray(aiProviders)) {
    fail(`aiProviders must be an array of built-in ids and/or custom entries, or false; got ${typeof aiProviders}.`);
  }
  const seen = new Set();
  // Array.from visits holes (as undefined) where .map would skip them; a hole
  // would otherwise survive validation, serialize to null in global data and
  // crash buildAiLinks in the browser.
  return Array.from(aiProviders, (entry, index) => {
    if (typeof entry === 'string') {
      const builtIn = BUILT_IN_PROVIDERS.find(p => p.id === entry);
      if (!builtIn) {
        fail(`aiProviders[${index}]: unknown id "${entry}". Built-in ids: ${VALID_IDS.join(', ')}.`);
      }
      if (seen.has(entry)) fail(`aiProviders: duplicate id "${entry}".`);
      seen.add(entry);
      return { ...builtIn };
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return normalizeCustomEntry(entry, index);
    }
    fail(`aiProviders[${index}] must be a built-in id string or a { label, url } object; got ${JSON.stringify(entry)}.`);
  });
}

function normalizePrompt(aiPrompt) {
  if (aiPrompt === undefined) return DEFAULT_PROMPT;
  if (typeof aiPrompt !== 'string' || aiPrompt.trim() === '') {
    fail('aiPrompt must be a non-empty string containing the {url} placeholder.');
  }
  if (!aiPrompt.includes('{url}')) {
    fail(`aiPrompt must contain the {url} placeholder, got "${aiPrompt}".`);
  }
  return aiPrompt;
}

// Raw user options in, normalized shape out. Throws on invalid input.
function normalizeAiOptions(options = {}) {
  const { aiProviders, aiPrompt } = options || {};
  return {
    aiProviders: normalizeProviders(aiProviders),
    aiPrompt: normalizePrompt(aiPrompt),
  };
}

// Absolute URLs for the current page from window.location parts. The full
// pathname is kept, so a site baseUrl like /sub/ survives.
function resolveContextUrls({ origin, pathname }) {
  return {
    pageUrl: origin + pathname,
    markdownUrl: origin + getMarkdownUrl(pathname),
  };
}

function buildAiLinks({ aiProviders = [], aiPrompt = DEFAULT_PROMPT, pageUrl, markdownUrl }) {
  return aiProviders.map(provider => {
    const contextUrl = provider.context === 'markdown' ? markdownUrl : pageUrl;
    const prompt = replaceAll(aiPrompt, '{url}', contextUrl);
    return {
      id: provider.id,
      label: provider.label,
      href: replaceAll(provider.url, '{prompt}', encodeURIComponent(prompt)),
    };
  });
}

module.exports = {
  BUILT_IN_PROVIDERS,
  DEFAULT_PROMPT,
  normalizeAiOptions,
  resolveContextUrls,
  buildAiLinks,
};
