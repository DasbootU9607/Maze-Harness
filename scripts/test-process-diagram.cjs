'use strict';

// Relation-only HTTP fixtures leave published records unchanged. Arc gestures
// belong to test-process-orbit.cjs; gameplay belongs to test-process-browser.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf('--'+key);return i<0?null:args[i+1];};
assert(get('engine'),'Supply --engine ENGINE to locate playwright-core');
const root=path.resolve(__dirname,'..'),output=path.resolve(get('out')||path.join(root,'outputs/process-diagram'));
const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(get('engine'))]}));
const {createServer,prefix}=require('./serve-site.cjs');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'site/data/catalog.json'),'utf8'));
const selected=catalog.cases.find(entry=>entry.id===(get('case')||'authored-boundary-stagger-2f126bf137c6'));
assert(selected?.process?.data,'Select a case with a public process record');
const sourcePath=path.join(root,'site',selected.process.data),sourceBytes=fs.readFileSync(sourcePath),original=JSON.parse(sourceBytes);
const ordered=original.nodes.map((node,index)=>({...node,sourceIndex:index})).sort((a,b)=>(Number.isFinite(a.order)?a.order:a.sourceIndex)-(Number.isFinite(b.order)?b.order:b.sourceIndex));
const report={caseId:selected.id,scope:'Inline arc external selection and recorded relations. Revision fixtures are synthetic HTTP responses; no game is opened and saved process files are unchanged.',errors:[],failedResponses:[],runtimeRequests:[]};
const settle=async page=>{
  await page.waitForFunction(()=>document.querySelector('.orbit-stage')?.dataset.animating==='false');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
};
async function assertSelectedInView(page,id){
  await page.waitForFunction(value=>document.querySelector('#process-orbit')?.dataset.selectedId===value,id);await settle(page);
  assert.equal(new URL(page.url()).searchParams.get('node'),id,'External selection retains the actual event deep link');
  assert.equal(JSON.parse(await page.locator('#operation-evidence-body').textContent()).node.id,id,'Details and arc select the same saved record');
  const position=await page.locator('.orbit-event[data-event-id="'+id+'"] .orbit-event-card').evaluate(card=>{
    const r=card.getBoundingClientRect(),s=card.closest('.orbit-stage').getBoundingClientRect();
    return {x:r.x-s.x,right:r.right-s.x,top:r.y-s.y,bottom:r.bottom-s.y,width:r.width,height:r.height,stageWidth:s.width,stageHeight:s.height};
  });
  assert(position.width>0&&position.height>0,'The selected event has a visible card');
  assert(position.x>=-1&&position.right<=position.stageWidth+1&&position.top>=-1&&position.bottom<=position.stageHeight+1,'External selection centers its card inside the inline arc');
  return position;
}
const revisionLinks=page=>page.locator('#operation-relations .relation-chip[title^="revision"]').evaluateAll(chips=>chips.map(chip=>({id:chip.dataset.nodeId,inferred:chip.classList.contains('inferred'),title:chip.title})));
(async()=>{
  let server,browser,page,fixture=original;fs.mkdirSync(output,{recursive:true});
  try{
    server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+prefix;
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await context.route('**/data/processes/*.json',route=>new URL(route.request().url()).pathname!==prefix+selected.process.data?route.continue():route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
    page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)report.failedResponses.push(response.status()+' '+response.url());});
    page.on('request',request=>{if(/\/process-player\.(?:html|js)|\/runtime\/|\/vendor\/three/.test(new URL(request.url()).pathname))report.runtimeRequests.push(request.url());});
    const visit=async(id,extra={})=>{await page.goto(base+'process.html?'+new URLSearchParams({case:selected.id,node:id,...extra}));return assertSelectedInView(page,id);};
    const lastNode=ordered.at(-1).id,desktop=await visit(lastNode);
    assert.equal(await page.locator('#expand-timeline,.timeline-node,.timeline-group-toggle,.revision-branch').count(),0,'Inline recorded order replaces the retired diagram and expansion action');
    const support=ordered.find(node=>node.kind==='record'&&node.eventType!=='capture.gap');assert(support,'The fixture includes a supporting record');
    await visit(support.id);assert.equal(await page.locator('#orbit-mode').inputValue(),'all','A supporting deep link opens All records');
    await page.reload();const supportReload=await assertSelectedInView(page,support.id);
    assert.equal(Number(await page.locator('#orbit-position').getAttribute('max'))+1,ordered.length,'The supporting view retains all saved records');
    const stage=page.locator('.orbit-stage');await stage.focus();
    for(const [key,id]of[['Home',ordered[0].id],['End',lastNode],['ArrowUp',ordered.at(-2).id]]){await page.keyboard.press(key);await assertSelectedInView(page,id);}
    const source=original.resources.find(row=>row.delivery!=='snapshot');assert(source);
    await visit(source.graphNodeId,{candidate:original.candidates.at(-1).id});
    assert.equal(await page.locator('#preview-shell').isVisible(),false,'A source event cannot borrow a stale candidate query');assert.equal(new URL(page.url()).searchParams.has('candidate'),false);
    const citation=original.edges.find(edge=>edge.kind==='cites'&&original.resources.some(row=>row.graphNodeId===edge.from));assert(citation);
    await visit(citation.from);await page.locator('#source-overview .relation-chip[data-node-id="'+citation.to+'"]').click();await assertSelectedInView(page,citation.to);
    const tested=original.edges.find(edge=>edge.kind==='tested');assert(tested);
    await visit(tested.from);await page.locator('#operation-relations .relation-chip[title^="tested"][data-node-id="'+tested.to+'"]').click();await assertSelectedInView(page,tested.to);
    await page.setViewportSize({width:390,height:844});await visit(support.id);await page.reload();const mobile=await assertSelectedInView(page,support.id);
    report.realRecord={desktop,supportReload,mobile,citationNavigation:true,testNavigation:true,sourceCannotBorrowMap:true,keyboardNavigation:true};
    fixture=structuredClone(original);fixture.edges=fixture.edges.filter(edge=>['cites','tested'].includes(edge.kind));
    for(const candidate of fixture.candidates){candidate.parentId=null;candidate.parentIds=[];}
    const counts=new Map();for(const edge of fixture.edges)counts.set(edge.from,(counts.get(edge.from)||0)+1);
    assert([...counts.values()].some(count=>count>1),'The negative fixture has multiple evidence associations');
    await visit(tested.from);assert.deepEqual(await revisionLinks(page),[],'Tests and citations do not become revision relationships');
    assert(await page.locator('#operation-relations .relation-chip[title^="tested"]').count()>0,'The saved test association remains accessible');
    report.evidenceAssociationsRemainDistinct=true;
    fixture=structuredClone(original);fixture.edges=fixture.edges.filter(edge=>edge.kind!=='revision');
    for(const candidate of fixture.candidates){candidate.parentId=null;candidate.parentIds=[];}
    const[parent,firstChild,secondChild]=fixture.candidates;assert(parent&&firstChild&&secondChild,'The synthetic fork needs three saved candidate records');
    for(const child of[firstChild,secondChild]){child.parentId=parent.id;child.parentIds=[parent.id];fixture.edges.push({from:parent.graphNodeId,to:child.graphNodeId,kind:'revision',label:'Synthetic relation-only fork fixture',inferred:false});}
    await page.setViewportSize({width:1440,height:1000});await visit(parent.graphNodeId);
    assert.deepEqual((await revisionLinks(page)).map(link=>link.id).sort(),[firstChild.graphNodeId,secondChild.graphNodeId].sort(),'Both recorded children remain explicit revision references');
    for(const child of[firstChild,secondChild]){
      await page.locator('#operation-relations .relation-chip[title^="revision"][data-node-id="'+child.graphNodeId+'"]').click();await assertSelectedInView(page,child.graphNodeId);
      assert.deepEqual((await revisionLinks(page)).map(link=>link.id),[parent.graphNodeId],'Each child names its actual saved parent');
      await page.locator('#operation-relations .relation-chip[title^="revision"][data-node-id="'+parent.graphNodeId+'"]').click();await assertSelectedInView(page,parent.graphNodeId);
    }
    await page.locator('#orbit-mode').selectOption('all');await settle(page);await stage.focus();
    await page.keyboard.press('Home');await assertSelectedInView(page,ordered[0].id);await page.keyboard.press('End');await assertSelectedInView(page,lastNode);
    assert.equal(Number(await page.locator('#orbit-position').getAttribute('max'))+1,ordered.length,'Revision references do not add or remove chronological events');
    assert.equal(await page.locator('.revision-branch').count(),0,'The arc remains recorded order rather than a causal branch drawing');
    await visit(parent.graphNodeId);await page.screenshot({path:path.join(output,'synthetic-revision-references.png'),fullPage:true});
    fixture.edges.find(edge=>edge.kind==='revision'&&edge.to===secondChild.graphNodeId).inferred=true;await visit(secondChild.graphNodeId);
    const inferred=await revisionLinks(page);assert.equal(inferred.length,1);assert.equal(inferred[0].inferred,true);assert.match(inferred[0].title,/inferred/,'Inferred parents remain distinguishable from observed relations');
    report.syntheticRevisionFixture={children:[firstChild.graphNodeId,secondChild.graphNodeId],externalSelectionSynced:true,chronologicalEndpointsUnchanged:true,inferredRelationshipDisclosed:true};
    assert.equal(await page.locator('iframe').count(),0,'Relation navigation does not instantiate a game');
    assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes,'HTTP fixtures never modify the saved public process');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);assert.deepEqual(report.runtimeRequests,[]);report.passed=true;
  }catch(error){report.failure=error.stack;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
