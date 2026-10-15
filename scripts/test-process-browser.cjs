'use strict';

// Exercise the real production timeline and its embedded MazeBench runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const args = process.argv.slice(2);
const get = key => {const i = args.indexOf('--' + key); return i < 0 ? null : args[i + 1];};
assert(get('engine'), 'Supply --engine ENGINE');
const root = path.resolve(__dirname, '..');
const output = path.resolve(get('out') || path.join(root, 'outputs/process-browser'));
const {chromium} = require(require.resolve('playwright-core', {paths: [path.resolve(get('engine'))]}));
const {createServer, prefix} = require('./serve-site.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = read(path.join(root, 'site/data/catalog.json'));
const selected = catalog.cases.find(entry => entry.id === (get('case') || 'authored-boundary-stagger-2f126bf137c6'));
assert(selected?.process, 'Select a case with a public authoring process');
const record = read(path.join(root, 'site', selected.process.data));
const sandbox = {window: {}, console, structuredClone};
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/runtime/maze-engine.js'), 'utf8'), sandbox);
const D = {U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0]};
const keys = {U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight'};
const actors = rows => rows.map(a => ({type: a.type, group: a.groupId || a.group || '', x: a.x, y: a.y, z: a.elevation ?? a.z ?? 0, removed: !!a.removed}));
const report = {caseId: selected.id, candidates: [], errors: [], failedResponses: []};
const idle = async frame => {
  await frame.waitForTimeout(40);
  await frame.waitForFunction(() => !window.__MAZEBENCH_APP__?.isAnimating && !window.__MAZEBENCH_APP__?.isTransitioningLevel && !window.__MAZEBENCH_INPUT_LOCKED__);
};
const ready = async frame => {
  await frame.waitForFunction(() => window.__HARNESS_READY__ || window.__HARNESS_ERROR__, null, {timeout: 30000});
  assert.equal(await frame.evaluate(() => window.__HARNESS_ERROR__ || null), null);
  await idle(frame);
};
const snapshot = async frame => actors(await frame.evaluate(() => window.__MAZEBENCH_APP__.state.actors));

(async () => {
  let server, browser;
  fs.mkdirSync(output, {recursive: true});
  try {
    let base = get('base-url');
    if (!base) {server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port + prefix;}
    if (!base.endsWith('/')) base += '/';
    report.base = base;
    browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, hasTouch: true, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) report.failedResponses.push(response.status() + ' ' + response.url());});
    for (const candidate of record.candidates) {
      const data = read(path.join(root, 'site', candidate.preview.levelPath));
      const engine = sandbox.window.MazeEngine.createEngine(data);
      const expected = state => actors(data.actors.map((a, i) => ({...a, x: state.actorX[i], y: state.actorY[i], elevation: state.actorElevation[i], removed: !!state.actorRemoved[i]})));
      const initial = expected(engine.initialState);
      await page.goto(base + 'process-player.html?' + new URLSearchParams({case: selected.id, candidate: candidate.id}));
      await ready(page);
      assert.deepEqual(await snapshot(page), initial, candidate.id + ' initial official-parser state');
      assert.equal(await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.candidateId), candidate.id);
      assert.equal(await page.locator('#replay-controls').isVisible(), !!candidate.preview.replay, candidate.id + ' replay evidence availability');
      // Find one ordinary legal move using the same engine; do not assume every draft is solvable.
      const direction = Object.keys(D).find(d => engine.move(engine.cloneState(engine.initialState), ...D[d]).moved);
      assert(direction, 'Preview has no legal move');
      const next = engine.cloneState(engine.initialState); engine.move(next, ...D[direction]);
      await page.locator('#maze-canvas').focus(); await page.keyboard.press(keys[direction]); await idle(page);
      assert.deepEqual(await snapshot(page), expected(next), candidate.id + ' real keyboard transition');
      await page.locator('#undo-move').click(); await idle(page); assert.deepEqual(await snapshot(page), initial, candidate.id + ' undo');
      await page.locator('[data-move="' + {U: 'up', D: 'down', L: 'left', R: 'right'}[direction] + '"]').tap(); await idle(page);
      assert.deepEqual(await snapshot(page), expected(next), candidate.id + ' touch transition');
      await page.locator('#reset-room').click(); await idle(page); assert.deepEqual(await snapshot(page), initial, candidate.id + ' reset');
      if (candidate.preview.replay) {
        const saved = read(path.join(root, 'site', candidate.preview.replay.data));
        assert.deepEqual(await snapshot(page), actors(saved.frames[0].actors), 'Recorded replay initial state');
        for (let i = 1; i < saved.frames.length; i++) {
          await page.locator('#replay-step').click();
          await page.waitForFunction(step => window.__PROCESS_PLAYER_STATE__.step === step, i);
          await idle(page);
          assert.deepEqual(await snapshot(page), actors(saved.frames[i].actors), 'Recorded replay frame ' + i);
        }
        await page.locator('#replay-restart').click(); await idle(page);
        assert.deepEqual(await snapshot(page), initial, 'Replay restart restores the collected gem');
        await page.locator('#replay-speed').selectOption('4');
        await page.locator('#replay-play').click();
        await page.waitForFunction(() => window.__PROCESS_PLAYER_STATE__.step >= 2);
        await page.locator('#replay-play').click(); await idle(page);
        const paused = await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.step);
        await page.waitForTimeout(450);
        assert.equal(await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.step), paused, 'Replay pause must retain its position');
        await page.locator('#replay-play').click();
        await page.waitForFunction(total => window.__PROCESS_PLAYER_STATE__.step === total && !window.__PROCESS_PLAYER_STATE__.replaying, saved.frames.length - 1, {timeout: 45000});
        await idle(page);
        assert.deepEqual(await snapshot(page), actors(saved.frames.at(-1).actors), 'Recorded playback reaches the saved final state');
        await page.locator('#reset-room').click(); await idle(page);
        assert.deepEqual(await snapshot(page), initial, 'Reset after replay restores all actors');
        report.replay = {candidateId: candidate.id, savedFramesCompared: saved.frames.length, stepControl: true, restart: true, speed: true, pauseResume: true, ordinaryPlayback: true, resetAfterCollection: true};
      }
      report.candidates.push({id: candidate.id, initial: true, keyboard: true, touch: true, undo: true, reset: true, hasRecordedReplay: !!candidate.preview.replay});
    }
    // Parent-page checks are kept below the embedded-player checks so errors remain attributable.
    await page.goto(base + 'process.html?' + new URLSearchParams({case: selected.id}));
    await page.waitForSelector('.timeline-node');
    assert.equal(await page.locator('.timeline-node').count(), record.nodes.length, 'Every recorded operation is available without enabling hidden resource lanes');
    const skillResource = record.resources.find(r => r.kind === 'skill');
    assert(skillResource, 'Fixture should contain an actual skill read');
    await page.locator('.timeline-node[data-node-id="' + skillResource.graphNodeId + '"]').click();
    await page.waitForTimeout(100);
    assert.match(await page.locator('#operation-detail').innerText(), /skill/i);
    assert.match(await page.locator('#operation-detail').innerText(), /read|recorded/i);
    assert.match(await page.locator('#operation-detail').innerText(), /Direct original-case read: not recorded/i);
    assert.equal(await page.locator('#preview-frame').isVisible(), false, 'A source read must not borrow a later map');
    await page.screenshot({path: path.join(output, 'timeline-skill-read.png'), fullPage: true});
    const citation = record.edges.find(edge => edge.kind === 'cites');
    assert(citation, 'Fixture should retain an explicit design-note citation');
    await page.locator('.timeline-node[data-node-id="' + citation.from + '"]').click();
    await page.locator('#source-overview .relation-chip[data-node-id="' + citation.to + '"]').click();
    assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id'), citation.to, 'Source citation opens its actual design note');
    const candidate = record.candidates.at(-1);
    await page.locator('.timeline-node[data-node-id="' + candidate.graphNodeId + '"]').click();
    const iframe = page.locator('#preview-frame'); await iframe.waitFor({state: 'visible'});
    const frame = await (await iframe.elementHandle()).contentFrame(); await ready(frame);
    const clock = await frame.evaluate(() => performance.timeOrigin);
    await frame.locator('#maze-canvas').focus(); await page.keyboard.press('ArrowUp'); await idle(frame);
    const beforeExpand = await snapshot(frame);
    await page.locator('#expand-preview').click(); await page.waitForTimeout(150);
    assert.equal(await frame.evaluate(() => performance.timeOrigin), clock, 'Expansion must retain the same game instance');
    assert.deepEqual(await snapshot(frame), beforeExpand, 'Expansion must preserve progress');
    await page.screenshot({path: path.join(output, 'timeline-expanded.png')});
    await page.locator('#close-preview').click();
    assert.deepEqual(await snapshot(frame), beforeExpand, 'Closing expansion must preserve progress');
    await frame.locator('#reset-room').click(); await idle(frame);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path: path.join(output, 'timeline-desktop.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Timeline mobile overflow');
    assert(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Embedded player mobile overflow');
    await page.screenshot({path: path.join(output, 'timeline-mobile.png'), fullPage: true});
    report.timeline = {allNodesVisible: true, skillReadVisible: true, directSourceReadStatus: true, sourceCitationNavigates: true, unboundReadDoesNotBorrowMap: true, expandRetainsInstance: true, expandRetainsProgress: true, mobileNoOverflow: true};
    assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResponses, []);
    report.passed = true;
  } catch (error) {report.failure = error.stack; throw error;}
  finally {fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
