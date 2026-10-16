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
const timelineOnly=args.includes('--timeline-only');
const report = {caseId: selected.id, scope:timelineOnly?'Timeline interactions and embedded previews only; standalone gameplay/replay checks are skipped.':'Full real-runtime and timeline regression.', candidates: [], errors: [], failedResponses: []};
const idle = async frame => {
  await frame.waitForTimeout(40);
  await frame.waitForFunction(() => !window.__MAZEBENCH_APP__?.isAnimating && !window.__MAZEBENCH_APP__?.isTransitioningLevel && !window.__PROCESS_PLAYER_STATE__?.busy && !window.__PROCESS_PLAYER_STATE__?.seeking);
};
const ready = async frame => {
  await frame.waitForFunction(() => window.__HARNESS_READY__ || window.__HARNESS_ERROR__, null, {timeout: 30000});
  assert.equal(await frame.evaluate(() => window.__HARNESS_ERROR__ || null), null);
  await idle(frame);
};
const snapshot = async frame => actors(await frame.evaluate(() => window.__MAZEBENCH_APP__.state.actors));
const chartGeometry = async page => page.evaluate(async () => {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const rect = element => {const r = element.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const nodes = [...document.querySelectorAll('.timeline-node')].map(button => {
    const label = button.querySelector('.timeline-label'), style = getComputedStyle(label);
    return {id:button.dataset.nodeId,rect:rect(button),label:label.textContent.trim(),labelRect:rect(label),
      lineHeight:parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
      clipped:label.scrollHeight > label.clientHeight + 2 || label.scrollWidth > label.clientWidth + 2,
      fontSize:parseFloat(style.fontSize),disabled:button.disabled,visible:button.getClientRects().length > 0 && button.getBoundingClientRect().height > 0};
  });
  return {timeline:rect(document.querySelector('.timeline-column')),detail:rect(document.querySelector('#operation-detail')),nodes};
});
function assertChartGeometry(layout, mode) {
  if (mode === 'desktop') {
    assert(layout.timeline.width > layout.detail.width, 'The desktop process diagram must retain most of the available width');
    assert(layout.detail.width >= 480 && layout.detail.width <= 520, 'Desktop details should occupy about 500 px');
    assert(layout.timeline.right <= layout.detail.x + 1, 'Desktop details belong to the right of the diagram');
  }
  const visible = layout.nodes.filter(node => node.visible);
  for (const node of visible) {
    assert(node.label && node.rect.width > 0 && !node.disabled, mode + ' node is available: ' + node.id);
    assert(node.fontSize >= 18, mode + ' node text should remain at least 18 px: ' + node.id);
    assert(node.labelRect.height <= node.lineHeight * 2 + 2, mode + ' node label must fit in at most two lines: ' + node.id);
    assert(!node.clipped, mode + ' short node label must not be clipped: ' + node.id);
  }
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const a = visible[i], b = visible[j];
    const overlapX = Math.min(a.rect.right,b.rect.right) - Math.max(a.rect.x,b.rect.x);
    const overlapY = Math.min(a.rect.bottom,b.rect.bottom) - Math.max(a.rect.y,b.rect.y);
    assert(overlapX <= 1 || overlapY <= 1, mode + ' diagram nodes overlap: ' + a.id + ' / ' + b.id);
  }
}
const assertMonochromeDetails = async page => {
  const tinted = await page.locator('#operation-detail').evaluate(host => {
    const results = [];
    const isGray = color => {
      const parts = color.match(/[\d.]+/g)?.map(Number);
      if (!parts || parts.length < 3 || parts[3] === 0) return true;
      return Math.max(...parts.slice(0,3)) - Math.min(...parts.slice(0,3)) <= 2;
    };
    for (const element of [host,...host.querySelectorAll('*')]) {
      if (element.matches('iframe,img,canvas') || !element.getClientRects().length) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== 'visible') continue;
      const colors = {color:style.color,backgroundColor:style.backgroundColor};
      for (const side of ['Top','Right','Bottom','Left']) if (parseFloat(style['border' + side + 'Width']) > 0) colors['border' + side + 'Color'] = style['border' + side + 'Color'];
      for (const [property,value] of Object.entries(colors)) if (!isGray(value)) results.push({element:element.id || element.className || element.tagName,property,value});
    }
    return results;
  });
  assert.deepEqual(tinted, [], 'The details UI must remain monochrome; the real maze and reference images retain their colors');
};
const assertExpandedViewport = async page => {
  const geometry = await page.evaluate(() => {
    const shell = document.querySelector('#preview-shell'), frame = document.querySelector('#preview-frame');
    const outer = shell.getBoundingClientRect(), inner = frame.getBoundingClientRect();
    return {position:getComputedStyle(shell).position,width:outer.width,height:outer.height,x:outer.x,y:outer.y,right:outer.right,bottom:outer.bottom,
      viewportWidth:innerWidth,viewportHeight:innerHeight,frameWidth:inner.width,frameHeight:inner.height,
      frameUncovered:document.elementFromPoint(inner.x + inner.width / 2,inner.y + inner.height / 2) === frame};
  });
  assert.equal(geometry.position, 'fixed', 'Expanded preview must be fixed to the viewport');
  assert(geometry.width >= geometry.viewportWidth * 0.85 && geometry.height >= geometry.viewportHeight * 0.85, 'Expansion must escape the phone-sized detail column');
  assert(geometry.x >= 0 && geometry.y >= 0 && geometry.right <= geometry.viewportWidth + 1 && geometry.bottom <= geometry.viewportHeight + 1, 'Expanded preview must fit inside the viewport after scrolling');
  assert(geometry.frameWidth >= geometry.width * 0.9 && geometry.frameHeight >= geometry.height * 0.65, 'Expanded game must use the available modal area');
  assert(geometry.frameUncovered, 'Expanded iframe is covered, possibly by a backdrop above a sticky ancestor');
  return geometry;
};
const setGroups = async (page,expanded) => {
  const toggles=page.locator('.timeline-group-toggle[aria-expanded="'+!expanded+'"]');
  while (await toggles.count()) await toggles.first().click();
};
const assertReadability = async page => {
  const sample = await page.evaluate(() => {
    const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    const body = [...document.querySelectorAll('#operation-summary,#operation-explanation p,#operation-explanation li,#timeline-context')].filter(element => visible(element) && element.textContent.trim());
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:parseFloat(getComputedStyle(document.querySelector('#operation-title')).fontSize),body:body.map(element => ({tag:element.id || element.tagName,fontSize:parseFloat(getComputedStyle(element).fontSize)}))};
  });
  assert(sample.scrollWidth <= sample.width + 1, 'Process page must not overflow horizontally');
  assert(sample.title >= 18, 'Detail title should remain at least 18 px');
  for (const body of sample.body) assert(body.fontSize >= 16, 'Detail body should remain at least 16 px: ' + body.tag);
  return sample;
};
const assertPlayerFits = async frame => {
  const overflows = await frame.evaluate(() => [...document.querySelectorAll('.preview-toolbar,.preview-controls,.replay-actions,.preview-footer')].filter(element => element.getClientRects().length && element.scrollWidth > element.clientWidth + 2).map(element => ({className:element.className,width:element.clientWidth,scrollWidth:element.scrollWidth})));
  assert.deepEqual(overflows, [], 'Embedded player controls must fit their available width');
  assert(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Embedded player document overflow');
};
const assertReplayReadOnly = async (page, frame) => {
  const before = await snapshot(frame), step = await frame.evaluate(() => window.__PROCESS_PLAYER_STATE__.step);
  await frame.locator('#maze-canvas').focus();
  for (const key of ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','z','u','r']) await page.keyboard.press(key);
  const box = await frame.locator('#maze-canvas').boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await idle(frame);
  assert.deepEqual(await snapshot(frame), before, 'Ordinary keyboard and touch input must not alter recorded replay state');
  assert.equal(await frame.evaluate(() => window.__PROCESS_PLAYER_STATE__.step), step, 'Ordinary input must not change replay position');
  for (const control of await frame.locator('[data-move],#undo-move,#reset-room').all()) assert(!(await control.isVisible()) || await control.isDisabled(), 'Replay must not expose manual movement, Undo or Reset');
};
const orientAfterExpand = async frame => {
  await frame.waitForFunction(() => Math.abs(window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw()) < 0.001);
  assert(Math.abs(await frame.evaluate(() => window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraTilt()) - 0.85) < 0.01,'Expansion must retain the 3D tilt while aligning the camera');
};
const screenshot = async (page, name) => {
  await page.evaluate(() => {document.activeElement?.blur(); window.scrollTo(0,0); document.querySelector('#operation-detail').scrollTop = 0;});
  await page.screenshot({path:path.join(output,name),fullPage:true});
};

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
    if (!timelineOnly) {
    for (const candidate of record.candidates) {
      const data = read(path.join(root, 'site', candidate.preview.levelPath));
      const engine = sandbox.window.MazeEngine.createEngine(data);
      const expected = state => actors(data.actors.map((a, i) => ({...a, x: state.actorX[i], y: state.actorY[i], elevation: state.actorElevation[i], removed: !!state.actorRemoved[i]})));
      const initial = expected(engine.initialState);
      await page.goto(base + 'process-player.html?' + new URLSearchParams({case: selected.id, candidate: candidate.id, mode:'play'}));
      await ready(page);
      assert.deepEqual(await snapshot(page), initial, candidate.id + ' initial official-parser state');
      assert(Math.abs(await page.evaluate(() => window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw())) < 0.001,candidate.id+' starts aligned to the movement axes');
      assert.equal(await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.candidateId), candidate.id);
      assert.equal(await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.mode), 'play');
      assert.equal(await page.locator('#replay-controls').isVisible(), false, candidate.id + ' free play must not contain replay controls');
      assert.equal(await page.locator('#replay-play').isVisible(), false, candidate.id + ' free play must not borrow the replay event');
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
      report.candidates.push({id: candidate.id, mode:'play', initial: true, keyboard: true, touch: true, undo: true, reset: true, noReplayControls:true});
    }
    for (const replayRecord of record.replays) {
        const candidate = record.candidates.find(item => item.id === replayRecord.candidateId);
        const saved = read(path.join(root, 'site', candidate.preview.replay.data));
        const initial = actors(saved.frames[0].actors);
        await page.goto(base + 'process-player.html?' + new URLSearchParams({case:selected.id,candidate:candidate.id,mode:'replay',replay:replayRecord.id}));
        await ready(page);
        assert.equal(await page.evaluate(() => window.__PROCESS_PLAYER_STATE__.mode), 'replay');
        assert.equal(await page.locator('#replay-controls').isVisible(), true);
        assert.deepEqual(await snapshot(page), actors(saved.frames[0].actors), 'Recorded replay initial state');
        await assertReplayReadOnly(page,page);
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
        await assertReplayReadOnly(page,page);
        await page.locator('#replay-progress').evaluate(element => {element.value='5';element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));});
        await page.waitForFunction(() => window.__PROCESS_PLAYER_STATE__.step === 5 && !window.__PROCESS_PLAYER_STATE__.seeking);
        await idle(page);
        assert.deepEqual(await snapshot(page), actors(saved.frames[5].actors), 'Seeking must reconstruct the exact recorded frame');
        await assertReplayReadOnly(page,page);
        await page.locator('#replay-restart').click(); await idle(page);
        assert.deepEqual(await snapshot(page), initial, 'Replay restart after collection restores all actors');
        await assertPlayerFits(page);
        report.replay = {candidateId:candidate.id,replayId:replayRecord.id,mode:'replay',savedFramesCompared:saved.frames.length,stepControl:true,restart:true,speed:true,pauseResume:true,seek:true,ordinaryPlayback:true,readOnlyKeyboardAndTouch:true};
    }
    for (const invalid of [{candidate:'v004'}, {candidate:'v004',replay:'missing-record'}, {candidate:'v001',replay:record.replays[0].id}]) {
      await page.goto(base + 'process-player.html?' + new URLSearchParams({case:selected.id,mode:'replay',...invalid}));
      await page.waitForFunction(() => window.__HARNESS_ERROR__ || window.__HARNESS_READY__);
      assert(await page.evaluate(() => !!window.__HARNESS_ERROR__ && !window.__HARNESS_READY__), 'Unbound or mismatched replay query must be refused without falling back to free play');
    }
    report.invalidReplayQueriesRejected = 3;
    }
    // Parent-page checks are kept below the embedded-player checks so errors remain attributable.
    await page.goto(base + 'process.html?' + new URLSearchParams({case: selected.id}));
    await page.waitForSelector('.timeline-node');
    assert.equal(await page.locator('.timeline-node').count(), record.nodes.length, 'Every recorded operation remains in the DOM');
    const collapsed = await chartGeometry(page);
    assert.equal(collapsed.nodes.filter(node => node.visible).length,12,'The default timeline shows the 12 key events');
    assert.equal(await page.locator('.timeline-group-toggle[aria-expanded="false"]').count(),8,'The 25 supporting events start in eight collapsed groups');
    assert.equal(await page.locator('.timeline-node[data-key-event="true"]').count(),12);
    for (const candidate of record.candidates) assert(await page.locator('.timeline-node[data-node-id="'+candidate.graphNodeId+'"]').isVisible(),'Saved versions are always key events');
    await setGroups(page,true);
    await page.evaluate(() => document.fonts.ready);
    const desktopLayout = await chartGeometry(page);
    assertChartGeometry(desktopLayout, 'desktop');
    assert.equal(desktopLayout.nodes.filter(node=>node.visible).length,record.nodes.length,'All 37 records can be expanded');
    const clickableNodes = await page.locator('.timeline-node').evaluateAll(nodes => nodes.map(node => node.dataset.nodeId));
    for (const id of clickableNodes) {
      await page.locator('.timeline-node[data-node-id="' + id + '"]').click();
      assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id'), id, 'Every diagram node must select its actual record: ' + id);
      assert.equal(new URL(page.url()).searchParams.get('node'), id, 'The selected diagram node must retain a direct link');
      const node = record.nodes.find(item => item.id === id), shouldPreview = node.kind === 'candidate' || node.kind === 'replay';
      assert.equal(await page.locator('#preview-frame').isVisible(),shouldPreview,'Only saved candidate and exact replay events may show a map: '+id);
      if (shouldPreview) {
        const query = new URL(await page.locator('#preview-frame').getAttribute('src'),base).searchParams;
        assert.equal(query.get('mode'),node.kind === 'replay' ? 'replay' : 'play');
        if (node.kind === 'replay') assert.equal(query.get('replay'),node.details.replayId);
      }
      await assertMonochromeDetails(page);
    }
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
    await setGroups(page,false);
    const candidate = record.candidates.at(-1);
    await page.locator('.timeline-node[data-node-id="' + candidate.graphNodeId + '"]').click();
    const iframe = page.locator('#preview-frame'); await iframe.waitFor({state: 'visible'});
    const frame = await (await iframe.elementHandle()).contentFrame();await frame.waitForURL(url=>url.searchParams.get('mode')==='play'&&url.searchParams.get('candidate')===candidate.id); await ready(frame);
    const clock = await frame.evaluate(() => performance.timeOrigin);
    const parentInitial = await snapshot(frame);
    await frame.locator('#maze-canvas').focus(); await page.keyboard.press('ArrowUp'); await idle(frame);
    const beforeExpand = await snapshot(frame);
    await frame.locator('[data-camera="right"]').click();
    await frame.waitForFunction(() => Math.abs(window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw()) > 0.01);
    await page.locator('#expand-preview').click(); await page.waitForTimeout(150);
    await orientAfterExpand(frame);
    const desktopExpanded = await assertExpandedViewport(page);
    assert.equal(await frame.evaluate(() => performance.timeOrigin), clock, 'Expansion must retain the same game instance');
    assert.deepEqual(await snapshot(frame), beforeExpand, 'Expansion must preserve progress');
    await page.screenshot({path: path.join(output, 'timeline-expanded.png')});
    await page.locator('#close-preview').click();
    assert.deepEqual(await snapshot(frame), beforeExpand, 'Closing expansion must preserve progress');
    await frame.locator('#undo-move').click();await idle(frame);
    assert.deepEqual(await snapshot(frame),parentInitial,'Expansion must preserve Undo history');
    await frame.locator('#reset-room').click(); await idle(frame);
    const readability = [await assertReadability(page)];
    await assertPlayerFits(frame);
    await screenshot(page,'timeline-desktop.png');
    await page.setViewportSize({width:1024,height:900});
    const mediumLayout = await chartGeometry(page);
    assertChartGeometry(mediumLayout,'medium');
    assert(mediumLayout.timeline.right <= mediumLayout.detail.x + 1 && mediumLayout.timeline.width > mediumLayout.detail.width,'At 1024 px the diagram and detail should both fit without squeezing the timeline below the detail');
    readability.push(await assertReadability(page));
    await assertPlayerFits(frame);
    await screenshot(page,'timeline-medium.png');
    await page.setViewportSize({width: 390, height: 844});
    const mobileLayout = await chartGeometry(page);
    assertChartGeometry(mobileLayout, 'mobile');
    readability.push(await assertReadability(page));
    await assertPlayerFits(frame);
    await assertMonochromeDetails(page);
    await screenshot(page,'timeline-mobile.png');
    const beforeMobileExpand = await snapshot(frame);
    await frame.locator('[data-camera="right"]').click();
    await page.locator('#expand-preview').click(); await page.waitForTimeout(150);
    await orientAfterExpand(frame);
    const mobileExpanded = await assertExpandedViewport(page);
    assert.equal(await frame.evaluate(() => performance.timeOrigin), clock, 'Mobile expansion must retain the same game instance');
    assert.deepEqual(await snapshot(frame), beforeMobileExpand, 'Mobile expansion must preserve progress');
    await page.screenshot({path: path.join(output, 'timeline-mobile-expanded.png')});
    await page.locator('#close-preview').click();
    assert.deepEqual(await snapshot(frame), beforeMobileExpand, 'Closing mobile expansion must preserve progress');
    await page.locator('.timeline-node[data-node-id="'+record.replays[0].graphNodeId+'"]').click();
    const replayFrame=await (await iframe.elementHandle()).contentFrame();await replayFrame.waitForURL(url=>url.searchParams.get('mode')==='replay');await ready(replayFrame);
    await replayFrame.locator('#replay-step').click();await replayFrame.waitForFunction(()=>window.__PROCESS_PLAYER_STATE__.step===1);await idle(replayFrame);
    const replayClock=await replayFrame.evaluate(()=>performance.timeOrigin),replayBeforeExpand=await snapshot(replayFrame);
    // Replay exposes no manual controls. Set a nonzero view only to test the host's
    // orientation message independently from the recorded physics and position.
    await replayFrame.evaluate(()=>window.__MAZEBENCH_APP__.threeRenderer.setDebugCameraView({yaw:0.4,tilt:0.85,animate:false}));
    await page.locator('#expand-preview').click();await orientAfterExpand(replayFrame);
    assert.equal(await replayFrame.evaluate(()=>performance.timeOrigin),replayClock,'Replay expansion retains its player');
    assert.equal(await replayFrame.evaluate(()=>window.__PROCESS_PLAYER_STATE__.step),1,'Replay expansion retains its position');
    assert.deepEqual(await snapshot(replayFrame),replayBeforeExpand,'Replay expansion retains its exact physical state');
    await assertReplayReadOnly(page,replayFrame);
    await page.locator('#close-preview').click();
    await assertPlayerFits(replayFrame);
    await screenshot(page,'timeline-mobile-replay.png');
    report.timeline = {defaultKeyEvents:12,collapsedGroups:8,allNodesExpandable: true, allNodesClickable: clickableNodes.length, shortLabels: true, nonOverlappingNodes: true,
      desktopColumns:{timeline:desktopLayout.timeline.width,detail:desktopLayout.detail.width,ratio:desktopLayout.timeline.width / desktopLayout.detail.width},
      monochromeDetails:true,skillReadVisible: true, directSourceReadStatus: true, sourceCitationNavigates: true, unboundReadDoesNotBorrowMap: true,
      previewOnlyOnCandidateAndReplay:true,expandRetainsInstance: true, expandRetainsProgress: true,expandCameraYawZero:true, desktopExpanded, mobileExpanded, mobileNoOverflow: true,readability};
    assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResponses, []);
    report.passed = true;
  } catch (error) {report.failure = error.stack; throw error;}
  finally {fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error); process.exitCode = 1;});
