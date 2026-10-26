'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const args = process.argv.slice(2), arg = key => args.includes(key) ? args[args.indexOf(key) + 1] : null;
const root = path.resolve(__dirname, '..'), engine = path.resolve(arg('--engine'));
const {chromium} = require(require.resolve('playwright-core', {paths: [engine]}));
const {createServer, prefix} = require('./serve-site.cjs');
const catalog = require('../site/data/catalog.json'), entries = catalog.cases.filter(entry => entry.kind === 'authored');
const output = path.join(root, 'outputs/home-builds-browser'); fs.mkdirSync(output, {recursive: true});
const report = {errors: [], failedResponses: [], screenshots: [], checkedClients: [], passed: false};
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = arg('--base-url') || `http://127.0.0.1:${server.address().port}${prefix}`;
  let browser;
  try {
    browser = await chromium.launch({channel: 'chrome', headless: true});
    const context = await browser.newContext({viewport: {width: 1440, height: 1080}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) report.failedResponses.push(response.status() + ' ' + response.url());});
    const shot = async name => {await page.evaluate(() => {document.activeElement?.blur(); window.scrollTo({top: 0, behavior: 'instant'}); return document.fonts.ready;}); const file = path.join(output, name + '.png'); await page.screenshot({path: file, fullPage: true}); report.screenshots.push(file);};
    const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal page overflow');
    const total = key => entries.reduce((sum, entry) => sum + (key === 'time' ? entry.build.elapsedMs || 0 : entry.build.tokens.total_tokens || 0), 0);
    await page.goto(origin); await page.locator('.home-ladder-row').first().waitFor();
    assert.equal(Number(await page.locator('[data-total="time"]').getAttribute('data-value')), total('time'));
    assert.equal(Number(await page.locator('[data-total="tokens"]').getAttribute('data-value')), total('tokens'));
    assert.equal(await page.locator('.skill-accordion').count(), catalog.skills.length);
    assert.equal(await page.locator('.skill-accordion[open]').count(), 0);
    await shot('home-desktop');
    await page.locator('.skill-accordion summary').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.skill-accordion[open]').count(), 1);
    const firstSkill = catalog.skills[0];
    assert.equal(await page.locator('.skill-accordion[open] .skill-build-item').count(), firstSkill.authoredCases.length);
    await page.locator('[data-skills-toggle="expand"]').click(); assert.equal(await page.locator('.skill-accordion[open]').count(), catalog.skills.length);
    await page.locator('[data-skills-toggle="collapse"]').click(); assert.equal(await page.locator('.skill-accordion[open]').count(), 0);
    const validateRows = async metric => {
      const rows = await page.locator('.home-ladder-row').evaluateAll(rows => rows.map(row => ({model: row.dataset.model, effort: row.dataset.effort, value: Number(row.dataset.value), color: getComputedStyle(row).getPropertyValue('--model-color')})));
      const skill = await page.locator('#home-skill').inputValue(), client = await page.locator('#home-client').inputValue(), average = await page.locator('#home-statistic').inputValue() === 'average';
      for (const row of rows) {
        const values = entries.filter(entry => entry.build.model === row.model && entry.build.reasoningEffort === row.effort && (skill === 'all' || entry.skill === skill) && (client === 'all' || entry.build.runtime === client))
          .map(entry => metric === 'time' ? entry.build.elapsedMs : entry.build.tokens.total_tokens).filter(value => typeof value === 'number');
        assert(values.length); assert.equal(row.value, values.reduce((a, b) => a + b, 0) / (average ? values.length : 1));
      }
      assert.deepEqual(rows.map(row => row.value), rows.map(row => row.value).sort((a, b) => a - b));
      return rows;
    };
    assert(new Set((await validateRows('time')).map(row => row.color)).size >= 3);
    await page.locator('[data-home-metric="tokens"]').click(); await validateRows('tokens'); await shot('home-tokens');
    await page.selectOption('#home-statistic', 'average'); await validateRows('tokens');
    await page.selectOption('#home-skill', 'boundary-stagger'); await validateRows('tokens');
    await page.selectOption('#home-client', 'Not provided'); assert.equal(await page.locator('.home-ladder-row').count(), 0);
    assert(await page.locator('.home-board-empty').isVisible());
    await page.selectOption('#home-client', 'all'); await page.selectOption('#home-skill', 'all'); await page.selectOption('#home-statistic', 'total');
    const download = async format => {
      const pending = page.waitForEvent('download'); await page.locator(`[data-home-download="${format}"]`).click();
      const file = await pending, saved = path.join(output, file.suggestedFilename()); await file.saveAs(saved); return fs.readFileSync(saved, 'utf8');
    };
    const json = JSON.parse(await download('json')); assert.equal(json.summary.time.total, total('time')); assert.equal(json.summary.tokens.total, total('tokens'));
    assert.equal(json.builds.length, entries.length); assert(json.builds.some(row => row.build.tokens.total_tokens === null));
    const csv = await download('csv'); assert(csv.includes('"Codex CLI"')); assert(!csv.includes('codex_exec'));
    await page.setViewportSize({width: 390, height: 844}); await noOverflow(); await shot('home-mobile');
    await page.locator('.skill-accordion summary').first().click(); await noOverflow(); await shot('skill-expanded-mobile');
    await page.setViewportSize({width: 1440, height: 1080});
    const batch = entries.filter(entry => entry.build?.startedAt?.startsWith('2026-10-26') && entry.build.model === 'gpt-6-astra');
    assert(batch.length >= 6);
    for (const entry of batch) {
      await page.goto(origin + 'process.html?case=' + entry.id); await page.locator('.usage-metrics').waitFor();
      assert.equal(await page.locator('.usage-metric').filter({has: page.locator('dt', {hasText: /^Client$/})}).locator('dd').innerText(), 'Codex CLI');
      assert((await page.locator('.usage-metrics').innerText()).includes('xhigh')); report.checkedClients.push(entry.id);
    }
    await page.goto(origin + 'skill.html?id=constrained-transport'); await page.locator('#comparison-client').waitFor();
    const labels = await page.locator('#comparison-client option').allTextContents(); assert.equal(labels.filter(label => label === 'Codex CLI').length, 1);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResponses, []); report.passed = true;
    console.log(JSON.stringify({passed: true, checkedSkills: catalog.skills.length, checkedClients: batch.length, output}));
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
