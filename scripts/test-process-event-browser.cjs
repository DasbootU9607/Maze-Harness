'use strict';

// Check every public source event and the inline filter/select/deep-link UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assertEventCoverage } = require('./process-events.cjs');
const { assertExplanations } = require('./process-explanations.cjs');
const { createServer, prefix } = require('./serve-site.cjs');
const args = process.argv.slice(2), get = key => { const i = args.indexOf('--' + key); return i < 0 ? null : args[i + 1]; };
assert(get('engine'), 'Supply --engine ENGINE to locate playwright-core');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.resolve(get('engine'))] }));
const root = path.resolve(__dirname, '..'), output = path.resolve(get('out') || path.join(root, 'outputs/process-event-browser'));
const report = { scope: 'Every public source event is selectable and ordered in the inline timeline, with original detail evidence and exact deep-link identity. Gameplay has separate regression coverage.', cases: [], errors: [], failedResponses: [] };

(async () => {
  let server, browser;
  fs.mkdirSync(output, { recursive: true });
  try {
    let base = get('base-url');
    if (!base) { server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}${prefix}`; }
    if (!base.endsWith('/')) base += '/'; report.base = base;
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) report.failedResponses.push(`${response.status()} ${response.url()}`); });
    const fetchJSON = async file => { const response = await context.request.get(base + file, { headers: { 'Cache-Control': 'no-cache' } }); assert(response.ok()); return response.json(); };
    const catalog = await fetchJSON('data/catalog.json');
    for (const entry of catalog.cases.filter(entry => entry.process)) {
      const doc = await fetchJSON(entry.process.data); assertEventCoverage(doc); assertExplanations(doc);
      const local = JSON.parse(fs.readFileSync(path.join(root, 'site', entry.process.data), 'utf8'));
      assert.equal(doc.coverage.events.sequenceSha256, local.coverage.events.sequenceSha256, 'Served event sequence matches the audited export');
      assert.deepEqual(doc.explanations, local.explanations, 'The served explanations match the reviewed export');
      const ordered = doc.nodes.map((node, index) => ({ ...node, sourceIndex: index })).sort((a, b) => (Number.isFinite(a.order) ? a.order : a.sourceIndex) - (Number.isFinite(b.order) ? b.order : b.sourceIndex));
      const selected = async id => {
        await page.waitForFunction(value => document.querySelector('#process-orbit')?.dataset.selectedId === value && document.querySelector('.orbit-stage')?.dataset.animating === 'false', id);
        assert.equal(new URL(page.url()).searchParams.get('node'), id);
        assert.equal(JSON.parse(await page.locator('#operation-evidence-body').textContent()).node.id, id);
        const card = page.locator(`.orbit-event[data-event-id="${id}"][aria-current="step"]`);
        await card.waitFor({state: 'attached'});
        assert.equal(await page.locator('#orbit-position').inputValue(), await card.getAttribute('data-index'), 'The detail selection and progress slider remain synchronized');
      };
      const visit = async id => {
        await page.goto(base + 'process.html?' + new URLSearchParams({ case: entry.id, node: id }));
        await selected(id);
      };
      await page.setViewportSize({ width: 1440, height: 1000 }); await visit('delivery-final');
      assert.equal(await page.locator('#orbit-mode').inputValue(), 'keys', 'A key deep link initializes the key filter');
      const keyCount = Number(await page.locator('#orbit-position').getAttribute('max')) + 1;
      await page.locator('#orbit-mode').selectOption('all');
      assert.equal(Number(await page.locator('#orbit-position').getAttribute('max')) + 1, doc.nodes.length, 'All records expose the entire public sequence');
      assert.equal(await page.locator('.timeline-node,#expand-timeline,#process-orbit-dialog').count(), 0, 'No obsolete timeline or expansion flow remains');
      const visitedEventIds = [];
      await page.locator('#orbit-position').focus(); await page.keyboard.press('Home');
      for (const [index, node] of ordered.entries()) {
        if (index) await page.keyboard.press('ArrowRight');
        await selected(node.id);
        if (node.eventId) visitedEventIds.push(node.eventId);
        assert((await page.locator('#operation-title').innerText()).trim(), 'Every event has a detail title');
        const review = doc.explanations.find(row => row.nodeId === node.id);
        const explanation = await page.locator('#operation-explanation').innerText();
        assert.equal(await page.locator('.evidence-review-label,.check-meaning,.recorded-check-list').count(), 0, 'Detail cards keep the original presentation');
        if (node.kind === 'note') {
          const note = doc.notes.find(row => row.graphNodeId === node.id || row.id === node.id);
          for (const key of ['goal', 'change', 'reason']) if (note[key]) assert(explanation.includes(note[key]), 'Original author note remains visible: ' + key);
        }
        if (node.kind === 'test') {
          const result = doc.tests.find(row => row.graphNodeId === node.id || row.id === node.id);
          if (result.scope) assert(explanation.includes(result.scope), 'The original test scope remains visible');
          assert.equal(await page.locator('.process-checks > li').count(), result.checks?.length || 0, 'Individual recorded checks remain visible');
        }
        if (review.badge) assert.equal(await page.locator(`.orbit-event[data-event-id="${node.id}"] .orbit-event-status`).innerText(), review.badge);
        if (!['candidate', 'replay'].includes(node.kind)) assert(await page.locator('#preview-shell').isHidden(), 'Supporting records must not repeat map previews');
      }
      assert.deepEqual(visitedEventIds, ordered.filter(node => node.eventId).map(node => node.eventId), 'Every original source event remains reachable in the audited order');
      const added = doc.records.find(record => record.eventType === 'artifact.saved') || doc.records.find(record => record.eventType === 'build.saved');
      assert(added); await visit(added.graphNodeId);
      assert.equal(await page.locator('#orbit-mode').inputValue(), 'all', 'An archived support deep link initializes All records');
      await page.locator('#orbit-mode').selectOption('keys');
      assert.equal(Number(await page.locator('#orbit-position').getAttribute('max')) + 1, keyCount);
      await visit(added.graphNodeId); await page.reload(); await selected(added.graphNodeId);
      if (entry.title === 'Rooflock Workshop') {
        for (const order of [16, 17, 18, 19]) {
          const node = doc.nodes.find(node => node.order === order); assert(node);
          await visit(node.id);
          const text = await page.locator('#operation-detail').innerText();
          if (order === 17) { assert.match(text, /exit code 0/); assert.match(text, /does not mean the map passed/); assert(!text.includes('exited successfully')); }
          if (order === 18) { assert.match(text, /unsolved/); assert.match(text, /1052/); }
          if (order === 19) { assert.match(text, /M0, M1/); await page.screenshot({ path: path.join(output, 'rooflock-restored-diagnostic.png') }); }
        }
        const start = doc.nodes.find(node => node.order === 16); await visit(start.id);
        for (const order of [17, 18, 19, 20]) { await page.locator('#next-operation').click(); await selected(doc.nodes.find(node => node.order === order).id); }
        await visit('test-diagnostic-e000024');
        const diagnosis = await page.locator('#operation-explanation').innerText();
        assert.match(diagnosis, /Diagnostic scope/);
        assert.equal(await page.locator('#operation-summary').innerText(), 'Diagnostic process failed.');
        await page.screenshot({path: path.join(output, 'rooflock-restored-diagnostic.png')});
      }
      const result = doc.explanations.find(row => row.checks.some(check => check.expected === 'unsolved' && check.observed === 'unsolved' && check.verdict === 'passed'));
      assert(result, 'Every current case retains a passed negative-control result');
      await visit(result.nodeId);
      const check = result.checks.find(check => check.expected === 'unsolved' && check.observed === 'unsolved' && check.verdict === 'passed');
      const recorded = page.locator('.check-body').filter({hasText:check.name}).first();
      assert(await recorded.isVisible(), 'The recorded negative-control check is visible');
      assert.equal(await recorded.locator('..').locator('.check-mark').innerText(), '+', 'Its original passed verdict is unchanged');
      const evidenceLink = page.locator('#operation-relations .relation-chip').first();
      const destination = await evidenceLink.getAttribute('data-node-id'); await evidenceLink.click();
      await selected(destination);
      await page.setViewportSize({ width: 430, height: 900 }); await visit(added.graphNodeId);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile page must not overflow horizontally');
      assert.equal(await page.locator('#preview-frame').count(), 0, 'Supporting events do not instantiate a game');
      if (entry.title === 'Rooflock Workshop') await page.screenshot({ path: path.join(output, 'rooflock-restored-mobile.png'), fullPage: true });
      report.cases.push({ id: entry.id, title: entry.title, sourceEvents: doc.coverage.events.sourceCount, selectedNodes: doc.nodes.length, keyEvents: keyCount, filtersAndDeepLinks: true, originalDetails: true, negativeControlVerdict: true, mobile: true });
      console.log(JSON.stringify(report.cases.at(-1)));
    }
    assert.equal(report.errors.length, 0); assert.equal(report.failedResponses.length, 0); report.passed = true;
  } catch (error) { report.passed = false; report.error = error.stack; process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, output, error: report.error }));
})();
