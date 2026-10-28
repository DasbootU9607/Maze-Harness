'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'../site');
const read=p=>JSON.parse(fs.readFileSync(path.join(site,p)));
const load=p=>import('data:text/javascript;base64,'+fs.readFileSync(path.join(site,p)).toString('base64'));
async function main(){
  const {mergeHistory}=await load('process-history.js'),{normalizeProcess}=await load('process-actions.js');
  const catalog=read('data/catalog.json'),index=read('data/process-recovery/index.json');let versions=0,playable=0;
  const cases=[];
  for(const entry of catalog.cases.filter(c=>c.process?.data)){
    const base=read(entry.process.data),extra=index.cases.find(c=>c.caseId===entry.id),data=mergeHistory(base,extra?read(extra.data):null),before=JSON.stringify(data),view=normalizeProcess(data);
    assert.equal(JSON.stringify(data),before,'Normalization may not edit source records');
    assert.deepEqual(view.usage,data.usage||null);
    assert.equal(view.evidence.length,data.nodes.length);
    assert.equal(new Set(view.evidence.map(e=>e.id)).size,data.nodes.length);
    assert.equal(view.actions.filter(a=>a.version).length,data.candidates.length);
    for(const a of view.actions){assert(a.evidenceIds.includes(a.id));for(const id of a.evidenceIds)assert(data.nodes.some(n=>n.id===id));}
    for(const c of data.candidates){const a=view.actions.find(a=>a.id===c.graphNodeId);assert.equal(a.version.playable,!!c.preview?.levelPath);versions++;if(a.version.playable)playable++;}
    for(const op of data.operations){if(!op.resultNodeId)continue;const result=view.evidence.find(e=>e.id===op.resultNodeId),execution=view.evidence.find(e=>e.id===op.graphNodeId);if(result?.actionId)assert.equal(execution.actionId,result.actionId);}
    assert.equal(view.stats.visualReviews,0,'Existing screenshots do not establish an explicit visual review');
    if(entry.id.endsWith('46b924adfc38')){
      assert.equal(view.evidence.length,424);assert.equal(view.stats.clientToolCalls,333);assert(view.actions.length<50);
      assert.equal(view.stats.cellRevisions,1);assert.equal(view.stats.savedVersions,4);
      assert.equal(view.actions.find(a=>a.id==='original-candidate-v003').version.change,'other-saved-fields');
      assert.equal(view.actions.find(a=>a.id==='original-test-t001').status,'failed');assert.equal(view.actions.find(a=>a.id==='original-test-t002').status,'unknown');
      assert(view.evidence.some(e=>e.basis==='request-only'&&e.files.includes('SKILL.md')&&!e.actionId));
      const note=extra&&data.recovery.items.find(i=>i.source.file==='note-01.json');assert.equal(view.evidence.find(e=>e.id===note.id).actionId,'original-note-n001');
    }
    if(entry.id.endsWith('9f926a128dd5')){assert.equal(view.stats.playtests,4);assert(view.actions.some(a=>a.type==='play'&&a.status==='failed'));assert(view.actions.some(a=>a.type==='play'&&a.status==='superseded'));}
    if(entry.id.endsWith('2f126bf137c6')){assert.equal(view.stats.solverRuns,3);assert.equal(view.stats.solverReports,3);}
    if(entry.id.endsWith('0e24cc0f2923')){assert.equal(view.stats.playtests,1);assert.equal(view.stats.verifications,1);}
    cases.push({entry,data,view});
  }
  assert.equal(cases.length,18);assert.equal(versions,46);assert.equal(playable,45);
  // Independent tests remain separate even when they test the identical map.
  const synthetic={caseId:'synthetic',nodes:[{id:'t1',kind:'test',order:1},{id:'t2',kind:'test',order:2},{id:'v',kind:'record',eventType:'visual.review',order:3}],tests:[{graphNodeId:'t1',candidateId:'same',label:'verify'},{graphNodeId:'t2',candidateId:'same',label:'verify'}]};
  assert.equal(normalizeProcess(synthetic).stats.verifications,2);assert.equal(normalizeProcess(synthetic).stats.visualReviews,1);
  console.log(`Action projection passed: ${cases.length} cases, ${versions} intact versions (${playable} playable), all source records retained.`);
  if(process.argv.includes('--browser'))await browserCheck(cases);
}
async function browserCheck(cases){
  const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(__dirname,'../../MazeBenchEngine')]}));
  const {createServer,prefix}=require('./serve-site.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],origin=`http://127.0.0.1:${server.address().port}${prefix}`;
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    for(const {entry,data,view} of cases){
      await page.goto(origin+'process.html?case='+entry.id);await page.locator('[data-view="versions"]').waitFor();
      assert((await page.locator('#record-summary').textContent()).includes(view.stats.actions+' build actions'));
      await page.locator('[data-view="versions"]').click();
      assert.equal(await page.locator('.version-option').count(),data.candidates.length);
      for(const c of data.candidates){await page.locator(`.version-option[data-node-id="${c.graphNodeId}"]`).click();assert.equal(await page.locator('#preview-shell').isVisible(),!!c.preview?.levelPath);assert.equal(new URL(page.url()).searchParams.get('candidate'),c.id);}
    }
    const sample=cases.find(c=>c.entry.id.endsWith('46b924adfc38'));
    await page.goto(origin+'process.html?case='+sample.entry.id+'&node=original-candidate-v001');await page.locator('[data-view="versions"]').waitFor();
    const evidenceDownload=JSON.parse(await page.locator('#process-data').evaluate(async a=>await (await fetch(a.href)).text()));
    const actionsDownload=JSON.parse(await page.locator('#action-data').evaluate(async a=>await (await fetch(a.href)).text()));
    assert.equal(evidenceDownload.nodes.length,424);assert.deepEqual(actionsDownload.stats,sample.view.stats);
    await page.locator('#expand-preview').click();const frame=page.frameLocator('#preview-frame');await frame.locator('#maze-canvas').waitFor();
    await page.waitForFunction(()=>document.querySelector('#preview-frame')?.contentWindow.__PROCESS_PLAYER_STATE__?.ready);
    // An actual keyboard move through the official engine, followed by undo.
    const getFrame=()=>page.frames().find(f=>f.url().includes('process-player.html'));
    const before=await getFrame().evaluate(()=>window.__MAZEBENCH_APP__.moveHistory.length);
    await frame.locator('#maze-canvas').click();await page.keyboard.press('ArrowUp');
    await getFrame().waitForFunction(n=>window.__MAZEBENCH_APP__.moveHistory.length>n,before);
    await getFrame().waitForFunction(()=>!window.__MAZEBENCH_APP__.isAnimating);
    await frame.locator('#undo-move').click();await getFrame().waitForFunction(n=>window.__MAZEBENCH_APP__.moveHistory.length===n,before);
    await page.locator('#close-preview').click();
    await page.locator('[data-view="evidence"]').click();await page.getByRole('searchbox',{name:'Search evidence'}).fill('SKILL.md');
    assert(await page.locator('.evidence-results .evidence-option').count()>0);await page.locator('.evidence-results .evidence-option').first().click();
    assert.equal(await page.locator('#preview-shell').isVisible(),false);assert((await page.locator('#action-association').textContent()).includes('no confirmed action identity'));
    await page.locator('[data-view="actions"]').click();await page.locator('#orbit-mode').selectOption('all');
    await page.locator('#orbit-position').fill('0');await page.locator('#orbit-position').dispatchEvent('input');
    assert.equal(new URL(page.url()).searchParams.get('node'),sample.view.actions[0].id);
    fs.mkdirSync(path.resolve(__dirname,'../outputs/action-view-check'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../outputs/action-view-check/desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.locator('[data-view="versions"]').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:path.resolve(__dirname,'../outputs/action-view-check/mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);console.log('Browser passed: all 46 version selectors, official move/undo, both downloads, evidence search, timeline selection and mobile layout.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
