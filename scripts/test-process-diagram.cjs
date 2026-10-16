'use strict';

// Diagram-only browser checks. Synthetic records exist only in intercepted HTTP
// responses; real maps and saved process files are never modified. The iframe is
// stubbed here: real gameplay and replay are covered by test-process-browser.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const get = key => {const i = args.indexOf('--' + key); return i < 0 ? null : args[i + 1];};
assert(get('engine'), 'Supply --engine ENGINE to locate playwright-core');
const root = path.resolve(__dirname, '..');
const output = path.resolve(get('out') || path.join(root, 'outputs/process-diagram'));
const {chromium} = require(require.resolve('playwright-core', {paths:[path.resolve(get('engine'))]}));
const {createServer, prefix} = require('./serve-site.cjs');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'site/data/catalog.json'), 'utf8'));
const selected = catalog.cases.find(entry => entry.id === (get('case') || 'authored-boundary-stagger-2f126bf137c6'));
assert(selected?.process?.data, 'Select a case with a public process record');
const sourcePath = path.join(root, 'site', selected.process.data);
const sourceBytes = fs.readFileSync(sourcePath);
const original = JSON.parse(sourceBytes);
const report = {caseId:selected.id,scope:'Diagram-only UI regression; HTTP fixtures are synthetic and gameplay iframe is stubbed.',errors:[],failedResponses:[]};
const settle = page => page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});

async function assertSelectedInView(page, id) {
  await page.waitForFunction(value => document.querySelector('.timeline-node[aria-current="step"]')?.dataset.nodeId === value, id);
  await settle(page);
  assert.equal(new URL(page.url()).searchParams.get('node'), id, 'Deep link must retain the selected node');
  const position = await page.evaluate(value => {
    const list = document.querySelector('#process-timeline'), button = [...list.querySelectorAll('.timeline-node')].find(node => node.dataset.nodeId === value);
    const parent = list.getBoundingClientRect(), child = button.getBoundingClientRect();
    return {top:child.top-parent.top,bottom:child.bottom-parent.top,height:parent.height,scrollTop:list.scrollTop};
  }, id);
  assert(position.top >= -1 && position.bottom <= position.height + 1, 'The deep-linked node must be fully visible in the scrolling diagram');
  return position;
}
async function branchRecords(page) {
  await settle(page);
  return page.locator('.revision-branch').evaluateAll(paths => paths.map(line => {
    const at = distance => {const point = line.getPointAtLength(distance); return new DOMPoint(point.x,point.y).matrixTransform(line.getScreenCTM());};
    const anchor = id => {const node = [...document.querySelectorAll('.timeline-node')].find(button => button.dataset.nodeId === id); const rect = node.querySelector('.timeline-dot').getBoundingClientRect(); return {x:rect.left,y:rect.top+rect.height/2};};
    const from = anchor(line.dataset.from), to = anchor(line.dataset.to), start = at(0), end = at(line.getTotalLength());
    return {from:line.dataset.from,to:line.dataset.to,kind:line.dataset.kind,length:line.getTotalLength(),
      startError:Math.hypot(start.x-from.x,start.y-from.y),endError:Math.hypot(end.x-to.x,end.y-to.y),pointerEvents:getComputedStyle(line).pointerEvents};
  }));
}

(async () => {
  let server, browser, page, fixture = original;
  fs.mkdirSync(output, {recursive:true});
  try {
    server = createServer(); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const base = 'http://127.0.0.1:' + server.address().port + prefix;
    browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/data/processes/*.json', route => {
      if (new URL(route.request().url()).pathname !== prefix + selected.process.data) return route.continue();
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
    });
    await context.route('**/process-player.html?*', route => route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><title>Diagram test preview placeholder</title><body>Gameplay is covered by the separate real-runtime regression.</body></html>'}));
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {if(response.status() >= 400)report.failedResponses.push(response.status() + ' ' + response.url());});
    const visit = async (id, extra = {}) => {
      await page.goto(base + 'process.html?' + new URLSearchParams({case:selected.id,node:id,...extra}));
      await assertSelectedInView(page,id);
    };
    const lastNode = original.nodes.at(-1).id;
    await visit(lastNode);
    assert.equal((await branchRecords(page)).length,0,'The real linear record must not show revision forks');
    assert.equal(await page.locator('#process-timeline').getAttribute('data-branch-count'),'0');
    const title = await page.locator('#operation-title').innerText();
    await page.reload();
    const desktopDeepLink = await assertSelectedInView(page,lastNode);
    assert.equal(await page.locator('#operation-title').innerText(),title,'Reload must restore the same detail record');
    const ordered = original.nodes.slice().sort((a,b) => a.order-b.order);
    await page.locator('.timeline-node[aria-current="step"]').focus();
    for (const [key,id] of [['ArrowUp',ordered.at(-2).id],['ArrowDown',lastNode],['Home',ordered[0].id],['End',lastNode]]) {
      await page.keyboard.press(key); await assertSelectedInView(page,id);
      assert.equal(await page.locator('.timeline-node:focus').getAttribute('data-node-id'),id,'Keyboard diagram navigation must move focus to its selection');
    }
    const source = original.resources.at(-1);
    await visit(source.graphNodeId,{candidate:original.candidates.at(-1).id});
    await page.reload(); await assertSelectedInView(page,source.graphNodeId);
    assert.equal(await page.locator('#preview-frame').isVisible(),false,'A source deep link must not borrow the stale candidate query');
    assert.equal(new URL(page.url()).searchParams.has('candidate'),false);
    await page.setViewportSize({width:390,height:844});
    await visit(lastNode); await page.reload();
    const mobileDeepLink = await assertSelectedInView(page,lastNode);
    report.deepLinks = {desktopReload:desktopDeepLink,mobileReload:mobileDeepLink,sourceQueryDoesNotBorrowMap:true,keyboardNavigation:true};
    report.realRecordBranchCount = 0;

    fixture = structuredClone(original);
    fixture.edges = fixture.edges.filter(edge => ['cites','tested'].includes(edge.kind));
    for (const candidate of fixture.candidates) {candidate.parentId=null;candidate.parentIds=[];}
    const outDegrees = new Map();
    for (const edge of fixture.edges) outDegrees.set(edge.from,(outDegrees.get(edge.from)||0)+1);
    assert([...outDegrees.values()].some(count => count > 1),'The negative fixture must contain several outgoing evidence links');
    await visit(lastNode);
    assert.equal((await branchRecords(page)).length,0,'Citations and tests are evidence associations, not revision forks');
    report.evidenceOnlyBranchCount = 0;

    fixture = structuredClone(original);
    const [parent,firstChild,secondChild] = fixture.candidates;
    assert(parent && firstChild && secondChild,'The fixture needs three saved candidate records');
    secondChild.parentId=parent.id;secondChild.parentIds=[parent.id];
    fixture.edges=fixture.edges.filter(edge => !(edge.kind==='revision' && edge.to===secondChild.graphNodeId));
    fixture.edges.push({from:parent.graphNodeId,to:secondChild.graphNodeId,kind:'revision',label:'Synthetic diagram-only fork fixture',inferred:false});
    await page.setViewportSize({width:1440,height:1000});
    await visit(secondChild.graphNodeId);
    const branches = await branchRecords(page);
    assert.deepEqual(branches.map(branch => [branch.from,branch.to]).sort(),[[parent.graphNodeId,firstChild.graphNodeId],[parent.graphNodeId,secondChild.graphNodeId]].sort(),'Only the two actual revision children should be connected');
    assert.equal(await page.locator('#process-timeline').getAttribute('data-branch-count'),'2');
    for (const branch of branches) {
      assert.equal(branch.kind,'revision');assert(branch.length>0);
      assert(branch.startError<=2 && branch.endError<=2,'Each branch must connect the actual parent and child node circles');
      assert.equal(branch.pointerEvents,'none','Branch decoration must not block node interaction');
    }
    for (const child of [firstChild,secondChild]) {
      await page.locator('.timeline-node[data-node-id="'+child.graphNodeId+'"]').click();await assertSelectedInView(page,child.graphNodeId);
      for (const branch of await branchRecords(page)) assert(branch.startError<=2 && branch.endError<=2,'Revision branches must stay attached when the diagram scrolls');
    }
    await page.screenshot({path:path.join(output,'synthetic-revision-fork.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    const mobileBranches = await branchRecords(page);
    assert.equal(mobileBranches.length,2,'Both revision branches must remain present on mobile');
    for (const branch of mobileBranches) assert(branch.startError<=2 && branch.endError<=2,'Revision branches must stay attached after responsive resize');
    report.syntheticFork = {branches,mobileBranches,childrenClickable:true};
    assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes,'Diagram fixtures must not modify the saved public record');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);
    report.passed=true;
  } catch(error) {report.failure=error.stack;throw error;}
  finally {fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
