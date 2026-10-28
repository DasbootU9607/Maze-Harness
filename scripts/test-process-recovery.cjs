'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {checkRecoveries}=require('./process-recovery.cjs');
const {reportProjection}=require('./recover-experiment-history.cjs');
const {hash}=require('./site-content.cjs');
const site=path.resolve(__dirname,'../site'),read=p=>JSON.parse(fs.readFileSync(path.join(site,p)));
async function main() {
  const {mergeHistory}=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(site,'process-history.js')).toString('base64'));
  const index=read('data/process-recovery/index.json');assert.equal(index.cases.length,12);
  checkRecoveries(site);
  let calls=0;const examples=[];
  for(const entry of index.cases) {
    const base=read(`data/processes/${entry.caseId}.json`),extra=read(entry.data),merged=mergeHistory(base,extra);
    assert.deepEqual(merged.usage,base.usage,'Recovery must never add usage or change its interval');
    assert.deepEqual(merged.coverage,base.coverage,'Original coverage must retain its original denominator');
    assert.equal(new Set(merged.nodes.map(n=>n.id)).size,merged.nodes.length);
    assert.equal(merged.finalCandidateId,base.finalCandidateId);
    const ids=new Set(merged.nodes.map(n=>n.id));
    for(const e of merged.edges)assert(ids.has(e.from)&&ids.has(e.to));
    for(const row of [...merged.records,...merged.tests,...merged.candidates,...merged.resources])assert(ids.has(row.graphNodeId));
    calls+=extra.audit.client.toolCalls;
    if(entry.caseId.endsWith('46b924adfc38')) {
      assert.equal(extra.sessions[0].document.candidates.length,3);
      assert.deepEqual(extra.sessions[0].document.tests.map(t=>t.status),['failed','unknown','passed']);
      assert.equal(merged.candidates.length,4);
      examples.push([entry.caseId,extra.sessions[0].document.candidates[0].graphNodeId]);
    }
    if(entry.caseId.endsWith('9f926a128dd5')) {
      assert(extra.items.some(i=>i.source.file==='playtest-01/FAILED.json'&&i.status==='failed'));
      assert(extra.items.filter(i=>i.source.file.startsWith('playtest-02/')).every(i=>i.status==='superseded'));
      assert(extra.items.some(i=>i.kind==='read'&&i.projection.files.includes('SKILL.md')));
      examples.push([entry.caseId,extra.items.find(i=>i.source.file==='playtest-03/playtest-replay.json').id]);
    }
    if(entry.caseId.endsWith('3e5c9a02ab20'))assert(extra.items.filter(i=>i.candidate).length===4);
    const media=extra.items.find(i=>i.media?.length);if(media)examples.push([entry.caseId,media.id]);
  }
  const projected=reportProjection({environment:{apiKey:'never-publish'},scope:'Public scope',result:{path:'C:/private/file',url:'https://private.invalid',bodyText:'secret',status:'solved',route:'UDLR'}});
  assert(!JSON.stringify(projected).includes('never-publish'));assert(!JSON.stringify(projected).includes('private'));assert(!JSON.stringify(projected).includes('secret'));
  assert.equal(projected.result.status,'solved');
  console.log(`Validated 12 supplements and ${calls} client tool calls; original usage and acceptance unchanged.`);
  if(!process.argv.includes('--browser'))return;
  const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(__dirname,'../../MazeBenchEngine')]}));
  const {createServer,prefix}=require('./serve-site.cjs');const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}${prefix}`;
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    for(const [id,node]of examples) {
      await page.goto(origin+'process.html?'+new URLSearchParams({case:id,node}));
      await page.waitForFunction(()=>document.getElementById('record-summary')?.textContent.includes('recovered evidence records'));
      assert((await page.locator('#record-summary').textContent()).includes('recovered evidence records'));
      assert(await page.locator('#process-data').getAttribute('download'));
      if(await page.locator('video').count()) {
        await page.locator('video').evaluate(v=>{v.preload='metadata';v.load();});
        await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
        assert((await page.locator('video').evaluate(v=>v.duration))>1);
      }
      if(node==='original-candidate-v001') {
        await page.locator('#expand-preview').click();
        const frame=page.frameLocator('#preview-frame');
        await frame.locator('#game-status').waitFor();
        await page.waitForFunction(()=>document.getElementById('preview-status')?.textContent.includes('ready'));
        await page.locator('#close-preview').click();
      }
    }
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.resolve(__dirname,'../outputs/recovery-check'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../outputs/recovery-check/process.png')});
    console.log('Browser checks passed: recovered nodes, downloads, official preview and original videos.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
