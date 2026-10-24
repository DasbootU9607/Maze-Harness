'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2), get = name => {const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1];};
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'site/data/catalog.json')));
const entry = catalog.cases.find(row => row.process && row.build?.usageStatus === 'measured' && row.build?.model === 'gpt-6-astra');
assert(entry, 'Need a published measured Astra build');
const caseId = entry.id;
const {chromium} = require(require.resolve('playwright-core', {paths: [path.resolve(get('engine'))]}));
const output = path.resolve(get('out') || path.join(root, 'outputs/usage-viewer'));
const record = JSON.parse(fs.readFileSync(path.join(root, 'site', entry.process.data)));
const expected = record.usage;
const count = field => expected.observedTokens[field].toLocaleString('en-US');
(async () => {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader']});
  const result = {caseId, errors: [], viewports: [], local: false};
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1050}, reducedMotion: 'reduce'});
    page.on('pageerror', e => result.errors.push(e.message));
    const base = get('base-url') || 'http://127.0.0.1:62760/Maze-Harness/';
    await page.goto(base + 'process.html?case=' + caseId + '&node=candidate-' + record.finalCandidateId);
    await page.locator('#build-usage .usage-metric').first().waitFor();
    assert.match(await page.locator('#build-usage').innerText(), /ChatGPT 6 Astra/);
    assert((await page.locator('#build-usage').innerText()).includes(count('total_tokens')));
    await page.locator('.usage-details summary').click();
    assert.match(await page.locator('#build-usage').innerText(), /observed interval/);
    assert((await page.locator('#build-usage').innerText()).includes(count('cached_input_tokens')));
    await page.locator('.usage-details summary').click();
    const response = await page.request.get(base + 'data/processes/' + caseId + '.json');
    const data = await response.json(); assert.deepEqual(data.usage, expected);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1050});
      await page.waitForFunction(() => document.querySelector('.orbit-stage')?.dataset.animating === 'false');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
      const marker = page.locator('#orbit-markers button').first(); await marker.click();
      const selected = await page.locator('#process-orbit').getAttribute('data-selected-id');
      const detail = JSON.parse(await page.locator('#operation-evidence-body').textContent()); assert.equal(detail.node.id, selected);
      await page.evaluate(() => {document.activeElement?.blur(); window.scrollTo(0, 0);});
      await page.mouse.move(1, 1); await page.screenshot({path: path.join(output, 'usage-' + width + '.png'), fullPage: true}); result.viewports.push(width);
    }
    await page.goto(base + 'process.html?case=authored-boundary-stagger-2f126bf137c6');
    await page.locator('#build-usage .usage-metric').first().waitFor();
    assert.match(await page.locator('#build-usage').innerText(), /Not provided/);
    if (!get('base-url')) {
      const localBase = get('local-url') || 'http://127.0.0.1:62760/';
      const {runs} = await (await page.request.get(localBase + 'api/runs')).json();
      const run = runs.find(row => row.processUrl && new URL(row.processUrl, localBase).searchParams.get('case') === caseId);
      assert(run, 'Published measured build must be available in the local viewer');
      await page.goto(localBase + '?run=' + encodeURIComponent(run.id));
      await page.waitForFunction(title => document.querySelector('#run-title')?.textContent === title, run.title || run.id);
      assert.match(await page.locator('#token-usage-values').innerText(), /gpt-6-astra/);
      assert((await page.locator('#token-usage-values').innerText()).includes(count('total_tokens')));
      const linked = new URL(await page.locator('#process-link').getAttribute('href'), page.url());
      assert.equal(linked.pathname, '/Maze-Harness/process.html'); assert.equal(linked.searchParams.get('case'), caseId); assert.equal(linked.searchParams.get('candidate'), record.finalCandidateId);
      await page.screenshot({path: path.join(output, 'local-usage.png'), fullPage: true}); result.local = true;
    }
    assert.deepEqual(result.errors, []); result.passed = true;
  } finally {await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(result, null, 2) + '\n');}
  console.log(JSON.stringify(result));
})().catch(e => {console.error(e); process.exitCode = 1;});
