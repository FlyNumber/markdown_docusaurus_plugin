const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const plugin = require('../index');

const HTML = '<!doctype html><html><head><title>t</title></head><body></body></html>';

function makeSite({ baseUrl, trailingSlash }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdsp-'));
  const siteDir = path.join(root, 'site');
  const outDir = path.join(root, 'build');
  fs.mkdirSync(path.join(siteDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(siteDir, 'docs', 'intro.md'), '---\ntitle: Intro Title\n---\n\nHello.\n');
  fs.writeFileSync(path.join(siteDir, 'docs', 'guide.md'), '# Guide Heading\n\nBody.\n');
  const prefix = baseUrl === '/' ? '' : baseUrl.slice(1, -1) + '/';
  // Docusaurus writes HTML under outDir without the baseUrl prefix
  for (const dir of ['intro', 'guide']) {
    const htmlDir = path.join(outDir, dir);
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, 'index.html'), HTML);
  }
  const routes = [
    { path: `${baseUrl}intro`, metadata: { sourceFilePath: 'docs/intro.md' } },
    { path: `${baseUrl}guide`, metadata: { sourceFilePath: 'docs/guide.md' } },
    { path: `${baseUrl}category/misc` },
  ];
  const siteConfig = { url: 'https://ex.test', title: 'Ex Docs', tagline: 'All about Ex', trailingSlash };
  return { root, siteDir, outDir, routes, siteConfig, prefix };
}

async function run(site, rawOptions = {}) {
  const options = plugin.validateOptions({ options: rawOptions });
  const instance = plugin({ siteDir: site.siteDir, siteConfig: site.siteConfig }, options);
  const log = console.log; const err = console.error;
  console.log = () => {}; console.error = () => {};
  try {
    await instance.postBuild({ outDir: site.outDir, routes: site.routes, baseUrl: site.siteConfig.baseUrl || '/', siteConfig: site.siteConfig });
  } finally {
    console.log = log; console.error = err;
  }
}

test('postBuild: writes twins, inserts the alternate link into each page, and writes llms.txt (baseUrl /)', async () => {
  const site = makeSite({ baseUrl: '/', trailingSlash: undefined });
  await run(site);
  assert.ok(fs.existsSync(path.join(site.outDir, 'intro.md')));
  assert.ok(fs.existsSync(path.join(site.outDir, 'guide.md')));
  const introHtml = fs.readFileSync(path.join(site.outDir, 'intro', 'index.html'), 'utf8');
  assert.ok(introHtml.includes('<link rel="alternate" type="text/markdown" href="https://ex.test/intro.md"></head>'), introHtml);
  const guideHtml = fs.readFileSync(path.join(site.outDir, 'guide', 'index.html'), 'utf8');
  assert.ok(guideHtml.includes('href="https://ex.test/guide.md"'));
  const llms = fs.readFileSync(path.join(site.outDir, 'llms.txt'), 'utf8');
  assert.equal(llms, '# Ex Docs\n\n> All about Ex\n\n## Docs\n\n- [Intro Title](https://ex.test/intro.md)\n- [Guide Heading](https://ex.test/guide.md)\n');
});

test('postBuild: honours baseUrl /docs/ for HTML paths, hrefs and llms.txt location', async () => {
  const site = makeSite({ baseUrl: '/docs/', trailingSlash: undefined });
  site.siteConfig.baseUrl = '/docs/';
  await run(site);
  const introHtml = fs.readFileSync(path.join(site.outDir, 'intro', 'index.html'), 'utf8');
  assert.ok(introHtml.includes('href="https://ex.test/docs/intro.md"'), introHtml);
  const llms = fs.readFileSync(path.join(site.outDir, 'llms.txt'), 'utf8');
  assert.ok(llms.includes('- [Intro Title](https://ex.test/docs/intro.md)'));
  assert.ok(llms.includes('- [Guide Heading](https://ex.test/docs/guide.md)'));
});

test('postBuild: llmsTxt false writes no llms.txt but still inserts links', async () => {
  const site = makeSite({ baseUrl: '/', trailingSlash: undefined });
  await run(site, { llmsTxt: false });
  assert.ok(!fs.existsSync(path.join(site.outDir, 'llms.txt')));
  assert.ok(fs.readFileSync(path.join(site.outDir, 'intro', 'index.html'), 'utf8').includes('rel="alternate"'));
});

test('postBuild: running twice does not duplicate the link', async () => {
  const site = makeSite({ baseUrl: '/', trailingSlash: undefined });
  await run(site);
  await run(site);
  const html = fs.readFileSync(path.join(site.outDir, 'intro', 'index.html'), 'utf8');
  assert.equal((html.match(/rel="alternate"/g) || []).length, 1);
});

test('postBuild: a locale with its own url advertises that url', async () => {
  const site = makeSite({ baseUrl: '/', trailingSlash: undefined });
  const options = plugin.validateOptions({ options: {} });
  const instance = plugin({ siteDir: site.siteDir, siteConfig: site.siteConfig }, options);
  const log = console.log; console.log = () => {};
  try {
    await instance.postBuild({
      outDir: site.outDir, routes: site.routes, baseUrl: '/', siteConfig: site.siteConfig,
      i18n: { currentLocale: 'fr', localeConfigs: { en: {}, fr: { url: 'https://fr.ex.test' } } },
    });
  } finally { console.log = log; }
  const html = fs.readFileSync(path.join(site.outDir, 'intro', 'index.html'), 'utf8');
  assert.ok(html.includes('href="https://fr.ex.test/intro.md"'), html);
  assert.ok(fs.readFileSync(path.join(site.outDir, 'llms.txt'), 'utf8').includes('(https://fr.ex.test/intro.md)'));
});

test('validateOptions: llmsTxt must be a boolean', () => {
  assert.throws(() => plugin.validateOptions({ options: { llmsTxt: 'yes' } }), /\[markdown-source-plugin\] .*llmsTxt/);
  assert.equal(plugin.validateOptions({ options: { llmsTxt: false } }).llmsTxt, false);
});
