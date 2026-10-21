'use strict';

// Check every public source event and the actual expand/select/deep-link UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assertEventCoverage } = require('./process-events.cjs');
const { createServer, prefix } = require('./serve-site.cjs');
const args = process.argv.slice(2), get = key => { const i = args.indexOf('--' + key); return i < 0 ? null : args[i + 1]; };
assert(get('engine'), 'Supply --engine ENGINE to locate playwright-core');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.resolve(get('engine'))] }));
const root = path.resolve(__dirname, '..'), output = path.resolve(get('out') || path.join(root, 'outputs/process-event-browser'));
const report = { scope: 'Every public source event is selectable, ordered and retained through collapse and deep links. Gameplay has separate regression coverage.', cases: [], errors: [], failedResponses: [] };

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
      const doc = await fetchJSON(entry.process.data); assertEventCoverage(doc);
      const local = JSON.parse(fs.readFileSync(path.join(root, 'site', entry.process.data), 'utf8'));
      assert.equal(doc.coverage.events.sequenceSha256, local.coverage.events.sequenceSha256, 'Served event sequence matches the audited export');
      const visit = async id => {
        await page.goto(base + 'process.html?' + new URLSearchParams({ case: entry.id, node: id }));
        await page.locator(`.timeline-node[data-node-id="${id}"][aria-current="step"]`).waitFor({ state: 'visible' });
      };
      await page.setViewportSize({ width: 1440, height: 1000 }); await visit('delivery-final');
      const keyCount = await page.locator('.timeline-node[data-key-event="true"]').count();
      assert.equal(await page.locator('.timeline-node:visible').count(), keyCount, 'Supporting source records start collapsed');
      await page.locator('#show-all-records').click();
      assert.equal(await page.locator('.timeline-node:visible').count(), doc.nodes.length, 'Expand all must reveal every node');
      const visibleIds = await page.locator('.timeline-node').evaluateAll(buttons => buttons.map(button => button.dataset.eventId).filter(Boolean));
      assert.deepEqual(visibleIds, doc.nodes.filter(node => node.eventId).map(node => node.eventId));
      for (const node of doc.nodes) {
        await page.locator(`.timeline-node[data-node-id="${node.id}"]`).evaluate(button => button.click());
        assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id'), node.id);
        assert((await page.locator('#operation-title').innerText()).trim(), 'Every event has a detail title');
        if (!['candidate', 'replay'].includes(node.kind)) assert(await page.locator('#preview-shell').isHidden(), 'Supporting records must not repeat map previews');
      }
      const added = doc.records.find(record => record.eventType === 'artifact.saved') || doc.records.find(record => record.eventType === 'build.saved');
      assert(added); await visit(added.graphNodeId);
      assert(await page.locator(`.timeline-node[data-node-id="${added.graphNodeId}"]`).isVisible(), 'A deep link expands the archived event');
      const detail = await page.locator('#operation-detail').innerText();
      await page.locator('#show-key-records').click();
      assert.equal(await page.locator('.timeline-node:visible').count(), keyCount);
      assert.equal(await page.locator('#operation-detail').innerText(), detail, 'Collapse retains selected detail');
      assert.equal(await page.locator('.timeline-group-toggle[data-contains-selection="true"]').count(), 1);
      await page.reload(); await page.locator(`.timeline-node[data-node-id="${added.graphNodeId}"]`).waitFor({ state: 'visible' });
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
        for (const order of [17, 18, 19, 20]) { await page.locator('#next-operation').click(); assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-record-order'), String(order)); }
      }
      await page.setViewportSize({ width: 430, height: 900 }); await visit(added.graphNodeId);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile page must not overflow horizontally');
      assert.equal(await page.locator('#preview-frame').count(), 0, 'Supporting events do not instantiate a game');
      if (entry.title === 'Rooflock Workshop') await page.screenshot({ path: path.join(output, 'rooflock-restored-mobile.png'), fullPage: true });
      report.cases.push({ id: entry.id, title: entry.title, sourceEvents: doc.coverage.events.sourceCount, selectedNodes: doc.nodes.length, keyEvents: keyCount, collapseAndDeepLinks: true, mobile: true });
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
