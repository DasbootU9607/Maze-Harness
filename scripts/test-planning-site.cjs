'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
assert(get('--engine'),'Supply --engine ENGINE');
const root=path.resolve(__dirname,'..'),enginePath=path.resolve(get('--engine'));
const {chromium}=require(require.resolve('playwright-core',{paths:[enginePath]}));
const {createServer,prefix}=require('./serve-site.cjs');
const index=require('../trials/planning-batch/index.json');
const catalog=require('../site/data/catalog.json');
const sandbox={window:{},console,structuredClone};vm.runInNewContext(fs.readFileSync(path.join(root,'site/runtime/maze-engine.js'),'utf8'),sandbox);
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},keys={U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'},names={U:'Move up',D:'Move down',L:'Move left',R:'Move right'};
const norm=actors=>actors.map(a=>({type:a.type,group:a.groupId||'',x:a.x,y:a.y,z:a.elevation||0,removed:!!a.removed}));
const report={maps:[],errors:[],failedResponses:[],externalRequests:[]};
const output=path.resolve(get('--out')||path.join(root,'outputs/planning-browser'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 let browser,server;
 try{
  let base=get('--base-url');
  if(!base){server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+prefix;}
  if(!base.endsWith('/'))base+='/';report.base=base;const hostname=new URL(base).hostname;
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  for(const trial of index.trials){
   const entry=catalog.cases.find(c=>c.id===trial.publicId);assert(entry,'Missing registered trial');
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',hasTouch:true});
   await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.protocol.startsWith('http')&&u.hostname!==hostname){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedResponses.push(r.status()+' '+r.url());});
   const ready=async()=>{await page.waitForFunction(()=>window.__HARNESS_READY__||window.__HARNESS_ERROR__,null,{timeout:30000});assert.equal(await page.evaluate(()=>window.__HARNESS_ERROR__||null),null);await page.waitForFunction(()=>window.__MAZEBENCH_APP__?.currentLevelId==='level_AxA'&&!window.__MAZEBENCH_APP__.isAnimating&&!window.__MAZEBENCH_APP__.isTransitioningLevel&&!window.__MAZEBENCH_INPUT_LOCKED__);};
   const idle=async()=>{await page.waitForTimeout(40);await page.waitForFunction(()=>!window.__MAZEBENCH_APP__.isAnimating&&!window.__MAZEBENCH_APP__.isTransitioningLevel);};
   const snapshot=async()=>norm(await page.evaluate(()=>window.__MAZEBENCH_APP__.state.actors));
   const url=base+'player.html?'+new URLSearchParams({world:entry.world,room:entry.room,case:entry.id});
   await page.goto(url);await ready();
   const data=JSON.parse(fs.readFileSync(path.join(root,'site/data/levels',entry.world,'level_'+entry.room+'.json'),'utf8'));
   const e=sandbox.window.MazeEngine.createEngine(data),s=e.cloneState(e.initialState),initial=norm(data.actors);
   assert.deepEqual(await snapshot(),initial,trial.title+' initial state');
   const expected=state=>norm(data.actors.map((a,i)=>({...a,x:state.actorX[i],y:state.actorY[i],elevation:state.actorElevation[i],removed:!!state.actorRemoved[i]})));
   let inputs=0,lastBefore=null;
   for(const d of entry.witness){lastBefore=expected(s);const prior=e.cloneState(s);e.move(s,...D[d]);await page.keyboard.press(keys[d]);await idle();assert.deepEqual(await snapshot(),expected(s),trial.title+' keyboard input');inputs++;
    if(e.actorTypes.some((type,i)=>!['player','gem'].includes(type)&&(prior.actorX[i]!==s.actorX[i]||prior.actorY[i]!==s.actorY[i]||prior.actorRemoved[i]!==s.actorRemoved[i])))break;
   }
   assert(inputs>0);await page.getByRole('button',{name:'Undo last action',exact:true}).click();await idle();assert.deepEqual(await snapshot(),lastBefore);
   await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();assert.deepEqual(await snapshot(),initial);
   await page.locator('#replay').click();await page.waitForFunction(()=>document.getElementById('game-status').textContent.includes('Saved solution complete'),null,{timeout:45000});await idle();
   const end=e.cloneState(e.initialState);for(const d of entry.witness)e.move(end,...D[d]);assert.deepEqual(await snapshot(),expected(end),trial.title+' saved solution');
   if(entry.goal.kind==='gem')assert(e.isSolved(end));else assert(expected(end).some(a=>a.type==='player'&&!a.removed&&JSON.stringify([a.x,a.y,a.z])===JSON.stringify(entry.goal.cell)));

   if(trial.id==='return-hook'){
    await page.locator('#replay').click();await page.waitForFunction(()=>document.getElementById('game-status').textContent.startsWith('Saved solution ·'),null,{timeout:10000});
    assert((await snapshot()).some(a=>a.type==='gem'&&!a.removed),'Repeated playback must restore the gem at its start');
    await page.waitForFunction(()=>document.getElementById('game-status').textContent.includes('Saved solution complete'),null,{timeout:45000});
    await page.keyboard.press('r');await page.waitForFunction(()=>!window.__MAZEBENCH_INPUT_LOCKED__&&!window.__MAZEBENCH_APP__.isAnimating);await idle();
    assert.deepEqual(await snapshot(),initial,'Keyboard reset must restore the complete objective');
   }
   await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();assert.deepEqual(await snapshot(),initial,trial.title+' reset after completion');
   await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,trial.id+'-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.getByRole('button',{name:names[entry.witness[0]],exact:true}).tap();await idle();const one=e.cloneState(e.initialState);e.move(one,...D[entry.witness[0]]);assert.deepEqual(await snapshot(),expected(one),trial.title+' touch input');
   await page.getByRole('button',{name:'Reset level',exact:true}).tap();await idle();assert.deepEqual(await snapshot(),initial);
   await page.reload();await ready();assert.deepEqual(await snapshot(),initial,trial.title+' deep-link reload after reset');
   await page.screenshot({path:path.join(output,trial.id+'-mobile.png'),fullPage:true});
   report.maps.push({title:trial.title,id:trial.publicId,url,initialLoaded:true,keyboardObjectPush:true,undo:true,resetBeforeAndAfterSolution:true,fullSolutionControl:true,touchInput:true,mobileLayout:true,deepLinkReload:true});
   console.log('Planning browser checks passed: '+trial.title);await context.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);assert.deepEqual(report.externalRequests,[]);report.passed=true;
 }catch(error){report.failure=error.stack;throw error;}finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
