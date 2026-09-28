// Optional local UI regression. Calls the official Play handler; never edits actors.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {D}=require('./runtime.cjs');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out GENERATED [--origin http://127.0.0.1:3001] [--channel chrome]');
const repo=path.resolve(get('--repo')),out=path.resolve(get('--out')),base=get('--origin','http://127.0.0.1:3001');
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Local server only');
const {chromium}=require(require.resolve('playwright-core',{paths:[repo]}));
const read=n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8'));
const m=read('manifest.json'),v=read('verification.json'),c=read('contract.json');
const shots=path.join(out,'screenshots');fs.mkdirSync(shots,{recursive:true});
const norm=a=>a.map(x=>({type:x.type,group:x.group??x.groupId??'',x:x.x,y:x.y,z:x.z??x.elevation,removed:!!x.removed})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
(async()=>{
 const browser=await chromium.launch({channel:get('--channel','chrome'),headless:true});
 const report={scenario:m.scenario,errors:[],failedResponses:[],frames:[],views:[]};
 try{
  const context=await browser.newContext({viewport:{width:1120,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>window.__PIXEL_GAME_DEBUG__=true);let page=await context.newPage();
  const attach=()=>{page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedResponses.push({path:new URL(r.url()).pathname,status:r.status()});});};attach();
  const idle=async()=>{await page.waitForTimeout(100);await page.waitForFunction(()=>{const a=window.__PIXEL_GAME_APP__;return a&&!a.isAnimating&&!a.isTransitioningLevel;});};
  const state=()=>page.evaluate(()=>{const a=window.__PIXEL_GAME_APP__;return {actors:a.state.actors,gems:[...a.collectedGemIds],yaw:a.threeRenderer.getDebugCameraYaw(),tilt:a.threeRenderer.getDebugCameraTilt()};});
  async function shot(step){await page.waitForTimeout(200);const tag='step-'+String(step).padStart(2,'0');await page.screenshot({path:path.join(shots,tag+'.jpg'),type:'jpeg',quality:82});const s=await state();report.views.push({tag,yaw:s.yaw,tilt:s.tilt});}
  async function move(d){await idle();await page.evaluate(dir=>window.__PIXEL_GAME_APP__.movePlayers(...dir),D[d]);await idle();}
  async function load(){await page.goto(base+m.play,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__PIXEL_GAME_APP__?.threeRenderer?.isReady());await idle();}
  await load();assert.deepEqual(norm((await state()).actors),norm(v.initial));await shot(0);
  for(const row of v.trace){await move(row.d);assert.deepEqual(norm((await state()).actors),norm(row.after));report.frames.push({step:row.step,d:row.d,actorsMatch:true});if(c.phases.some(p=>p.step===row.step))await shot(row.step);}
  assert.equal((await state()).gems.length,1);report.normalPlayReplayPassed=true;
  // A fresh storage context prevents collected-gem persistence affecting the check.
  const fresh=await browser.newContext({viewport:{width:1120,height:900},reducedMotion:'reduce'});
  await fresh.addInitScript(()=>window.__PIXEL_GAME_DEBUG__=true);page=await fresh.newPage();attach();await load();
  const first=v.trace.findIndex(r=>r.event.moved.length);assert(first>=0);
  for(const row of v.trace.slice(0,first+1))await move(row.d);
  await page.getByRole('button',{name:'Undo last action',exact:true}).click();await idle();assert.deepEqual(norm((await state()).actors),norm(v.trace[first].before));
  await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();assert.deepEqual(norm((await state()).actors),norm(v.initial));report.undoResetPassed=true;
  const api=base+`/api/author/${m.id}/level_AxA`,response=await context.request.get(api);assert.equal(response.status(),200);const edit=await response.json();
  assert.equal((await context.request.post(api,{data:edit})).status(),200);assert.deepEqual((await(await context.request.get(api)).json()).cells,edit.cells);
  const exported=await(await context.request.get(base+`/api/build/worlds/${m.id}/export`)).json();assert.deepEqual(exported.levels[0].cells,read('world.json').levels[0].cells);
  await page.goto(base+m.edit,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__MAZEBENCH_AUTHOR_APP__?.threeRenderer?.isReady());
  await page.goto(base+'/build',{waitUntil:'networkidle'});assert((await page.locator('body').innerText()).includes(m.title));assert.equal((await page.goto(base+m.map,{waitUntil:'networkidle'})).status(),200);
  report.editorSaveExportBuildMapPassed=true;assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);
  report.scope='Normal Play handler in map coordinates, every state compared with official replay; first-push Undo and Reset, editor rendering and unchanged-cells save/export. No exhaustive deadlock or camera-comprehension claim.';
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scenario:m.scenario,frames:report.frames.length,overall:'passed'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
