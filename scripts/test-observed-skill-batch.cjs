'use strict';

// Independent end-to-end checks of a declared public batch. Private run paths are
// deliberately not read here; recorder audits and authoring checks have separate scopes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf('--'+key);return i<0?null:args[i+1];};
assert(get('engine'),'Supply --engine ENGINE to locate playwright-core');
const root=path.resolve(__dirname,'..'),indexFile=path.resolve(get('index')||path.join(root,'trials/observed-skill-batch/index.json'));
const index=JSON.parse(fs.readFileSync(indexFile,'utf8')),output=path.resolve(get('out')||path.join(root,'outputs/observed-skill-batch'));
assert.equal(index.schemaVersion,1);assert.equal(index.trials.length,5,'This acceptance batch contains five skills');
assert.equal(new Set(index.trials.map(trial=>trial.publicId)).size,5,'Each trial has a distinct public case');
const trials=get('skill')?index.trials.filter(trial=>trial.skill===get('skill')):index.trials;
assert(trials.length,'--skill must identify one declared batch skill');
const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(get('engine'))]}));
const {createServer,prefix}=require('./serve-site.cjs');
const hash=value=>crypto.createHash('sha256').update(Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const actors=rows=>rows.map(a=>({type:a.type,group:a.groupId||a.group||'',x:a.x,y:a.y,z:a.elevation??a.z??0,removed:!!a.removed}));
const report={scope:'Public asset integrity, recorded provenance, version bindings, and actual browser behavior. Recorded reads do not prove comprehension or causal use; this is not a private-run audit or a human-difficulty evaluation.',selection:get('skill')||'all-five',trials:[],errors:[],failedResponses:[]};
const save=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const idle=async frame=>{await frame.waitForTimeout(35);await frame.waitForFunction(()=>!window.__MAZEBENCH_APP__?.isAnimating&&!window.__MAZEBENCH_APP__?.isTransitioningLevel&&!window.__PROCESS_PLAYER_STATE__?.busy&&!window.__PROCESS_PLAYER_STATE__?.seeking);};
const ready=async frame=>{await frame.waitForFunction(()=>window.__HARNESS_READY__||window.__HARNESS_ERROR__,null,{timeout:30000});assert.equal(await frame.evaluate(()=>window.__HARNESS_ERROR__||null),null);await idle(frame);};
const snapshot=async frame=>actors(await frame.evaluate(()=>window.__MAZEBENCH_APP__.state.actors));
const setGroups=async(page,expanded)=>{const buttons=page.locator('.timeline-group-toggle[aria-expanded="'+!expanded+'"]');while(await buttons.count())await buttons.first().click();};
const idSelector=id=>'.timeline-node[data-node-id="'+id+'"]';

function cellsByPosition(cells){
  const map=new Map();
  if(cells.every(Array.isArray))cells.forEach((row,y)=>row.forEach((token,x)=>map.set([x,y,0].join(','),token)));
  else for(const cell of cells)map.set([cell.x,cell.y,cell.z||0].join(','),cell.token);
  return map;
}
function actualDiff(before,after){
  const old=before?cellsByPosition(before):new Map(),next=cellsByPosition(after),diff={added:[],removed:[],changed:[]};
  for(const key of [...new Set([...old.keys(),...next.keys()])].sort()){
    const a=old.get(key),b=next.get(key);if(a===b)continue;
    const [x,y,z]=key.split(',').map(Number);diff[a===undefined?'added':b===undefined?'removed':'changed'].push({x,y,z,before:a??null,after:b??null});
  }
  return diff;
}
async function playerFrame(page,mode,candidateId,replayId){
  const element=page.locator('#preview-frame');await element.waitFor({state:'visible'});
  const frame=await(await element.elementHandle()).contentFrame();
  await frame.waitForURL(url=>url.searchParams.get('mode')===mode&&url.searchParams.get('candidate')===candidateId&&(!replayId||url.searchParams.get('replay')===replayId));
  await ready(frame);
  const state=await frame.evaluate(()=>window.__PROCESS_PLAYER_STATE__);
  assert.equal(state.mode,mode);assert.equal(state.candidateId,candidateId);if(replayId)assert.equal(state.replayId,replayId);
  return frame;
}
async function readOnlyInput(page,frame){
  const before=await snapshot(frame),step=await frame.evaluate(()=>window.__PROCESS_PLAYER_STATE__.step);
  await frame.locator('#maze-canvas').focus();
  for(const key of ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','z','r'])await page.keyboard.press(key);
  await frame.locator('#maze-canvas').scrollIntoViewIfNeeded();
  const box=await frame.locator('#maze-canvas').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  await idle(frame);assert.deepEqual(await snapshot(frame),before,'Ordinary input cannot change a saved replay');
  assert.equal(await frame.evaluate(()=>window.__PROCESS_PLAYER_STATE__.step),step);
  for(const control of await frame.locator('[data-move],#undo-move,#reset-room').all())assert(!(await control.isVisible())||await control.isDisabled(),'Replay has no enabled manual controls');
}
async function capture(page,file){
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);document.querySelector('#operation-detail').scrollTop=0;});
  await page.screenshot({path:path.join(output,file),fullPage:true});
}

(async()=>{
  let server,browser;
  fs.mkdirSync(output,{recursive:true});
  try{
    let base=get('base-url');
    if(!base){server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+prefix;}
    if(!base.endsWith('/'))base+='/';report.base=base;
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});
    const fetchJSON=async(relative,expected)=>{const response=await context.request.get(new URL(relative,base).href);assert.equal(response.status(),200,'Public asset exists: '+relative);const bytes=await response.body();if(expected)assert.equal(hash(bytes),expected,'Public asset hash: '+relative);return JSON.parse(bytes.toString('utf8'));};
    const catalog=await fetchJSON('data/catalog.json');
    for(const trial of trials){
      const row={skill:trial.skill,caseId:trial.publicId,previews:[],replays:[]};report.trials.push(row);save();
      console.log(JSON.stringify({case:trial.publicId,stage:'public-record'}));
      const entry=catalog.cases.find(item=>item.id===trial.publicId);assert(entry?.process?.data,'Trial must publish its actual authoring process');
      const record=await fetchJSON(entry.process.data),candidateMap=new Map(record.candidates.map(candidate=>[candidate.id,candidate]));
      assert.equal(record.caseId,trial.publicId);assert.equal(record.coverage.mode,'observed');assert.equal(record.candidates.length,trial.versions);assert(record.candidates.length>1);
      assert.equal(new Set(record.candidates.map(candidate=>candidate.cellsSha256)).size,trial.geometryVersions);assert(trial.geometryVersions>1,'The batch must include a genuine map revision');
      assert.equal(record.coverage.sources.directOriginalCaseRead,'recorded');
      const delivered=record.resources.filter(resource=>resource.delivery==='recorded-read'&&resource.origin==='observed');
      const skillRead=delivered.find(resource=>resource.basename==='SKILL.md'&&resource.kind==='skill');assert(skillRead,'Skill attachment alone is not a recorded SKILL.md read');
      const originals=delivered.filter(resource=>/^official(?:-[a-z0-9-]+)?-(?:case\.md|design\.json|world-map\.txt|states\.json|checks\.json)$/.test(resource.basename));assert(originals.length,'Original material must actually have a delivered read');
      for(const id of record.coverage.sources.originalCaseResourceIds)assert(originals.some(resource=>resource.id===id),'Source coverage must cite an actual original-material read');
      const firstCandidateOrder=Math.min(...record.nodes.filter(node=>node.kind==='candidate').map(node=>node.order));
      assert(record.nodes.find(node=>node.id===skillRead.graphNodeId).order<firstCandidateOrder,'Skill read precedes the first saved candidate');
      assert(originals.some(resource=>record.nodes.find(node=>node.id===resource.graphNodeId).order<firstCandidateOrder),'Original material was delivered before the first saved candidate');
      row.recordedReads={skill:skillRead.id,originals:originals.map(resource=>resource.id),scope:'Recorded delivery before the first saved candidate; not proof of reading, comprehension, or causal use.'};
      const finalCandidate=candidateMap.get(record.finalCandidateId),specPath=path.resolve(path.dirname(indexFile),trial.spec);
      assert(specPath.startsWith(path.dirname(indexFile)+path.sep),'Batch spec stays inside its declared directory');
      const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));
      assert.equal(finalCandidate.cellsSha256,hash(spec.cells));assert.equal(finalCandidate.contractSha256,hash(spec.contract));assert.equal(spec.witness.length,trial.inputs);
      let changedRevisions=0;const levels=new Map(),savedReplays=new Map();
      for(const candidate of record.candidates){
        assert.equal(hash(candidate.cells),candidate.cellsSha256,'Candidate cells match their own fingerprint');
        const parent=candidate.parentId?candidateMap.get(candidate.parentId):null;assert(!candidate.parentId||parent);
        const diff=actualDiff(parent?.cells,candidate.cells);assert.deepEqual(candidate.diff,diff,'Published differences must come from the actual parent and child cells');
        if(parent&&Object.values(diff).some(changes=>changes.length))changedRevisions++;
        const preview=candidate.preview;assert(preview?.levelPath,'Every saved version has its own parser-generated preview');
        const level=await fetchJSON(preview.levelPath,preview.levelSha256);assert.deepEqual(level.sourceCells,candidate.cells);assert.equal(level.processPreview.candidateId,candidate.id);assert.equal(level.processPreview.cellsSha256,candidate.cellsSha256);assert.equal(level.processPreview.contractSha256,candidate.contractSha256);levels.set(candidate.id,level);
      }
      assert(changedRevisions>0);row.changedRevisions=changedRevisions;
      const testRecords=record.tests.filter(test=>test.category==='test');
      row.testRecords=testRecords.length;
      if(Number.isInteger(trial.testRecords))assert.equal(row.testRecords,trial.testRecords,'Public verification records preserve the declared actual count');
      const supported=testRecords.filter(test=>test.status==='passed');assert(supported.length);
      for(const test of supported){assert(candidateMap.has(test.candidateId));assert.equal(test.binding,'exact');assert.equal(test.bindingBasis,'report-fingerprints-and-command-boundaries','A passed public test must identify its real candidate input');assert(test.checks.every(check=>check.status==='passed'),'Passed summaries cannot conceal failed/unknown checks');}
      const accepted=supported.filter(test=>test.candidateId===record.finalCandidateId);assert(accepted.some(test=>test.checks.length===trial.verificationChecks),'Final candidate retains its expected structural verification');
      row.nonPassingTests=testRecords.filter(test=>['failed','error','unknown'].includes(test.status)).length;
      if(Number.isInteger(trial.nonPassingTests))assert.equal(row.nonPassingTests,trial.nonPassingTests,'Preserve the declared actual unsuccessful results; a successful first version does not require an invented failure');
      assert((record.replays||[]).length,'Saved replay evidence is present');
      for(const replay of record.replays){
        const candidate=candidateMap.get(replay.candidateId),descriptors=candidate?.preview.replays||(candidate?.preview.replay?[candidate.preview.replay]:[]);
        const descriptor=descriptors.find(item=>item.id===replay.id)||(!candidate.preview.replays&&descriptors.length===1?descriptors[0]:null);assert(descriptor,'Every replay record needs its own candidate descriptor, including second replays');
        for(const key of ['candidateId','cellsSha256','contractSha256','data','sha256','sourceSha256','route','frameCount','binding','sourceKind'])assert.equal(descriptor[key],replay[key],'Exact replay descriptor: '+replay.id+' / '+key);
        assert.equal(replay.binding,'exact-artifact');assert.equal(replay.cellsSha256,candidate.cellsSha256);assert.equal(replay.contractSha256,candidate.contractSha256);
        const saved=await fetchJSON(replay.data,replay.sha256);assert.equal(saved.candidateId,candidate.id);assert.equal(saved.cellsSha256,candidate.cellsSha256);assert.equal(saved.contractSha256,candidate.contractSha256);assert.equal(saved.route,replay.route);assert.equal(saved.frames.length,replay.frameCount);assert.equal(saved.frames.length,replay.route.length+1);savedReplays.set(replay.id,saved);
      }
      row.exactPassedTests=supported.length;row.staticAssetsVerified=true;save();
      const page=await context.newPage();
      page.on('pageerror',error=>report.errors.push({caseId:trial.publicId,message:error.message}));
      page.on('response',response=>{if(response.status()>=400)report.failedResponses.push({caseId:trial.publicId,status:response.status(),url:response.url()});});
      await page.goto(base+'process.html?'+new URLSearchParams({case:trial.publicId}));await page.waitForSelector('.timeline-node');
      assert.equal(await page.locator('.timeline-node').count(),record.nodes.length);
      const keyCount=await page.locator('.timeline-node[data-key-event="true"]').count();
      assert.equal(await page.locator('.timeline-node:visible').count(),keyCount);assert(keyCount<record.nodes.length);assert(await page.locator('.timeline-group-toggle[aria-expanded="false"]').count());
      await setGroups(page,true);assert.equal(await page.locator('.timeline-node:visible').count(),record.nodes.length);
      const supportId=await page.locator('.timeline-node[data-key-event="false"]').first().getAttribute('data-node-id');
      await page.goto(base+'process.html?'+new URLSearchParams({case:trial.publicId,node:supportId}));await page.waitForSelector(idSelector(supportId)+':visible');
      assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id'),supportId,'Supporting deep links automatically expand');
      const nonMaps=record.nodes.filter(node=>!['candidate','replay'].includes(node.kind)).map(node=>node.id);
      const noBorrowedMaps=await page.evaluate(ids=>ids.map(id=>{const button=[...document.querySelectorAll('.timeline-node')].find(item=>item.dataset.nodeId===id);button.click();return{id,selected:button.getAttribute('aria-current')==='step',hidden:document.querySelector('#preview-shell').hidden};}),nonMaps);
      assert(noBorrowedMaps.every(result=>result.selected&&result.hidden),'Resources, tests, notes, commands, and delivery must not borrow a candidate map');
      await setGroups(page,false);row.timeline={keyEvents:keyCount,allRecords:record.nodes.length,expandCollapse:true,supportingDeepLink:true,nonMapEventsChecked:nonMaps.length};
      for(const candidate of record.candidates){
        await page.locator(idSelector(candidate.graphNodeId)).click();const frame=await playerFrame(page,'play',candidate.id),level=levels.get(candidate.id);
        assert.equal(await frame.locator('#replay-controls').isVisible(),false);assert.equal(await frame.locator('#replay-play').isVisible(),false);
        const initial=actors(level.actors);assert.deepEqual(await snapshot(frame),initial,'Selected version loads its actual initial actors');
        const move=await frame.evaluate(data=>{const e=window.MazeEngine.createEngine(data),directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]},player=e.actorTypes.findIndex(type=>['player','circle_player'].includes(type));for(const [key,vector]of Object.entries(directions)){const state=e.cloneState(e.initialState);if(e.move(state,...vector).moved&&!state.actorRemoved[player])return{key,actors:data.actors.map((actor,i)=>({...actor,x:state.actorX[i],y:state.actorY[i],elevation:state.actorElevation[i],removed:!!state.actorRemoved[i]}))};}return null;},level);
        assert(move,'A version preview must permit an ordinary living-player move');await frame.locator('#maze-canvas').focus();await page.keyboard.press(move.key);await idle(frame);assert.deepEqual(await snapshot(frame),actors(move.actors));
        await frame.locator('#reset-room').click();await idle(frame);assert.deepEqual(await snapshot(frame),initial);
        row.previews.push({candidateId:candidate.id,mode:'play',actualInitialState:true,keyboardMove:true,reset:true,noReplayControls:true});
      }
      await capture(page,trial.skill+'-desktop.png');save();
      for(const replay of record.replays){
        console.log(JSON.stringify({case:trial.publicId,stage:'recorded-replay',replay:replay.id,frames:replay.frameCount}));
        await page.locator(idSelector(replay.graphNodeId)).click();const frame=await playerFrame(page,'replay',replay.candidateId,replay.id),saved=savedReplays.get(replay.id);
        assert(await frame.locator('#replay-controls').isVisible());assert.deepEqual(await snapshot(frame),actors(saved.frames[0].actors));
        for(let i=1;i<saved.frames.length;i++){await frame.locator('#replay-step').click();await frame.waitForFunction(step=>window.__PROCESS_PLAYER_STATE__.step===step,i);await idle(frame);assert.deepEqual(await snapshot(frame),actors(saved.frames[i].actors),replay.id+' saved frame '+i);if(i===1)await readOnlyInput(page,frame);}
        const timeOrigin=await frame.evaluate(()=>performance.timeOrigin),before=await snapshot(frame);
        await page.locator('#expand-preview').click();await frame.waitForFunction(()=>Math.abs(window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw())<0.001);
        assert.equal(await frame.evaluate(()=>performance.timeOrigin),timeOrigin);assert.deepEqual(await snapshot(frame),before);assert.equal(await frame.evaluate(()=>window.__PROCESS_PLAYER_STATE__.step),saved.frames.length-1);await page.locator('#close-preview').click();
        row.replays.push({id:replay.id,candidateId:replay.candidateId,mode:'replay',savedFramesCompared:saved.frames.length,readOnlyKeyboardAndTouch:true,expandedRetainsState:true});save();
      }
      await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile document stays within the viewport');await capture(page,trial.skill+'-mobile-replay.png');
      await page.close();row.passed=true;save();
    }
    if(trials.length===index.trials.length){
      assert(report.trials.some(trial=>new Set(trial.replays.map(replay=>replay.candidateId)).size<trial.replays.length),'The batch must exercise multiple saved replays bound to one candidate');
      assert(report.trials.some(trial=>trial.nonPassingTests>0),'The complete batch retains its genuine unsuccessful attempts');
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);report.passed=true;
  }catch(error){report.failure=error.stack;throw error;}
  finally{save();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
