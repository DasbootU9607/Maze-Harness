'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const enginePath = path.resolve(args[args.indexOf('--engine') + 1]);
const { chromium } = require(require.resolve('playwright-core', {paths:[enginePath]}));
const {createServer, prefix} = require('./serve-site.cjs');
const catalog = require('../site/data/catalog.json');
const output = path.join(root,'outputs/site-browser');
fs.mkdirSync(output,{recursive:true});
const sandbox = {window:{}, console, structuredClone};
vm.runInNewContext(fs.readFileSync(path.join(root,'site/runtime/maze-engine.js'),'utf8'),sandbox);
const directions = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const report = {errors:[],failedResponses:[],externalRequests:[],skillPages:[],directEntryRooms:[],authoredReplays:[]};
const norm = actors => actors.map(a=>({type:a.type,group:a.groupId||'',x:a.x,y:a.y,z:a.elevation||0,removed:!!a.removed}));
(async()=>{
  const server = createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port+prefix;
  let browser,page;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',hasTouch:true});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.protocol.startsWith('http')&&url.hostname!=='127.0.0.1'){report.externalRequests.push(url.href);return route.abort();}
      return route.continue();
    });
    page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)report.failedResponses.push(r.status()+' '+r.url());});
    const ready = async room => {
      await page.waitForFunction(()=>window.__HARNESS_READY__||window.__HARNESS_ERROR__,null,{timeout:30000});
      assert.equal(await page.evaluate(()=>window.__HARNESS_ERROR__||null),null);
      await page.waitForFunction(id=>window.__MAZEBENCH_APP__?.currentLevelId==='level_'+id&&!window.__MAZEBENCH_APP__.isAnimating&&!window.__MAZEBENCH_APP__.isTransitioningLevel&&!window.__MAZEBENCH_INPUT_LOCKED__,room,{timeout:20000});
    };
    const idle = async()=>{await page.waitForTimeout(40);await page.waitForFunction(()=>!window.__MAZEBENCH_APP__.isAnimating&&!window.__MAZEBENCH_APP__.isTransitioningLevel);};
    const snapshot=async()=>norm(await page.evaluate(()=>window.__MAZEBENCH_APP__.state.actors));
    const switchRoom=async room=>{
      await page.locator('#room-input').fill(room);
      await page.locator('#room-form button').click();
      await ready(room);
      assert.equal(new URL(page.url()).searchParams.get('room'),room);
    };
    const screenshot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});};
    await page.goto(origin);
    await page.locator('.directory-row').last().waitFor();
    assert.equal(await page.locator('.directory-row').count(),catalog.skills.length);
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
    await screenshot('home-desktop');
    for(const skill of catalog.skills){
      await page.goto(origin+'skill.html?id='+skill.id);
      await page.locator('.case-card').last().waitFor();
      assert.equal(await page.locator('h1').textContent(),skill.name);
      assert.equal(await page.locator('.case-card').count(),skill.officialCases.length+skill.authoredCases.length);
      const cardCases = await page.locator('.case-card>a').evaluateAll(links => links.map(a => new URL(a.href).searchParams.get('case')));
      for(const id of [...skill.officialCases,...skill.authoredCases])assert.equal(cardCases.filter(value => value === id).length,1);
      report.skillPages.push(skill.id);
      if(skill.id==='hook-transfer')await screenshot('skill-desktop');
    }
    await page.goto(origin+'world.html');
    await page.locator('#world-atlas .atlas-tile').last().waitFor();
    assert.equal(await page.locator('#world-atlas .atlas-tile').count(),256);
    assert.equal(await page.locator('#world-atlas .atlas-tile.used').count(),catalog.rooms.filter(r=>r.skill).length);
    await page.locator('[data-atlas-filter="used"]').click();
    assert(await page.locator('#world-atlas .atlas-grid').evaluate(e=>e.classList.contains('filter-used')));
    await page.locator('[data-atlas-filter="all"]').click();
    await screenshot('world-desktop');
    await page.locator('#world-atlas [data-room="HxH"]').click();
    await page.locator('h1').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('id'),'boundary-stagger');
    await page.goto(origin+'player.html');await ready('HxI');
    await screenshot('player-desktop');
    await switchRoom('GxE');
    const initial=await snapshot();
    await page.keyboard.press('ArrowDown');await idle();const afterDown=await snapshot();
    await page.keyboard.press('ArrowLeft');await idle();
    assert.notDeepEqual((await snapshot()).filter(a=>a.type==='weightless_box'),initial.filter(a=>a.type==='weightless_box'));
    await page.getByRole('button',{name:'Undo last action',exact:true}).click();await idle();assert.deepEqual(await snapshot(),afterDown);
    await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();assert.deepEqual(await snapshot(),initial);
    report.pushUndoReset=true;
    await page.getByRole('button',{name:'Move down',exact:true}).click();await idle();assert.deepEqual(await snapshot(),afterDown);
    await page.getByRole('button',{name:'Move left',exact:true}).click();await idle();assert.notDeepEqual(await snapshot(),afterDown);
    await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();assert.deepEqual(await snapshot(),initial);
    const yaw=await page.evaluate(()=>window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw());
    await page.getByRole('button',{name:'Rotate camera right',exact:true}).click();await page.waitForTimeout(400);
    assert.notEqual(await page.evaluate(()=>window.__MAZEBENCH_APP__.threeRenderer.getDebugCameraYaw()),yaw);
    await page.getByRole('button',{name:'Rotate camera left',exact:true}).click();await page.waitForTimeout(400);
    report.pointerMovementAndCamera=true;
    await page.locator('#room-input').focus();await page.keyboard.press('ArrowDown');await idle();assert.deepEqual(await snapshot(),initial);
    report.formKeyboardIsolation=true;
    await page.getByRole('button',{name:'Browse all rooms'}).click();
    assert.equal(await page.locator('#room-dialog [data-room]').count(),256);
    await page.locator('#room-dialog [data-room="AxA"]').click();await ready('AxA');
    await page.keyboard.press('ArrowDown');await ready('AxB');
    assert.equal(new URL(page.url()).pathname,prefix+'player.html');
    assert.equal(new URL(page.url()).searchParams.get('room'),'AxB');
    report.normalDoorwayTransition='AxA -> AxB';
    for(const room of catalog.rooms.filter(r=>r.directEntry)){
      await switchRoom(room.id);
      const before=await snapshot();
      assert(before.some(a=>a.type==='player'&&!a.removed));
      await page.evaluate(v=>window.__MAZEBENCH_APP__.movePlayers(...v),[room.directEntry.dx,room.directEntry.dy]);await idle();
      assert.notDeepEqual(await snapshot(),before,'Movement after direct entry '+room.id);
      await page.getByRole('button',{name:'Reset level',exact:true}).click();await idle();
      assert.deepEqual(await snapshot(),before,'Reset after direct entry '+room.id);
      report.directEntryRooms.push(room.id);
    }
    await switchRoom('PxP');await page.reload();await ready('PxP');report.deepLinkReload=true;
    for(const entry of catalog.cases.filter(c=>c.kind==='authored')){
      await page.goto(origin+'player.html?'+new URLSearchParams({world:entry.world,room:entry.room,case:entry.id}));await ready(entry.room);
      const data=require(path.join(root,'site/data/levels',entry.world,'level_'+entry.room+'.json'));
      const engine=sandbox.window.MazeEngine.createEngine(data),state=engine.cloneState(engine.initialState);
      assert.deepEqual(await snapshot(),norm(data.actors));
      let inputs=0;
      for(const direction of entry.witness){
        engine.move(state,...directions[direction]);
        await page.evaluate(v=>window.__MAZEBENCH_APP__.movePlayers(...v),directions[direction]);await idle();
        const expected=data.actors.map((a,i)=>({...a,x:state.actorX[i],y:state.actorY[i],elevation:state.actorElevation[i],removed:!!state.actorRemoved[i]}));
        assert.deepEqual(await snapshot(),norm(expected),entry.title+' input '+(++inputs));
      }
      report.authoredReplays.push({title:entry.title,inputs});
      console.log('Browser replay passed: '+entry.title+' ('+inputs+' inputs)');
    }
    await page.locator('#replay').click();
    await page.waitForFunction(()=>document.getElementById('game-status').textContent.includes('Saved solution complete'),null,{timeout:25000});
    report.solutionControl=true;
    await page.setViewportSize({width:390,height:844});
    for(const route of ['index.html','skill.html?id=skating-cross','world.html','player.html?room=HxI']){
      await page.goto(origin+route);
      if(route.startsWith('player'))await ready('HxI');else await page.waitForFunction(()=>!document.getElementById('main').textContent.includes('Loading'));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow: '+route);
      await screenshot(route.split('.')[0]+'-mobile');
    }
    report.mobileLayouts=true;
    await page.getByRole('button',{name:'Browse all rooms'}).click();
    await page.locator('#room-dialog [data-room="HxH"]').click();await ready('HxH');
    report.mobileRoomPicker=true;
    await switchRoom('GxE');
    const mobileInitial=await snapshot();
    await page.getByRole('button',{name:'Move down',exact:true}).tap();await idle();
    await page.getByRole('button',{name:'Move left',exact:true}).tap();await idle();
    assert.notDeepEqual((await snapshot()).filter(a=>a.type==='weightless_box'),mobileInitial.filter(a=>a.type==='weightless_box'));
    report.touchBlockPush=true;
    await page.goto(origin+'skill.html?id=missing');
    await page.locator('.error-state').waitFor();report.invalidSkillHandled=true;
    const expanded = structuredClone(catalog);
    expanded.skills.push({...expanded.skills[0],id:'publication-fixture',name:'Publication Fixture',authoredCases:[],steps:[]});
    await context.route('**/data/catalog.json',route=>route.fulfill({json:expanded}));
    await page.goto(origin+'index.html');
    await page.locator('.directory-row').last().waitFor();
    assert.equal(await page.locator('.directory-row').count(),expanded.skills.length);
    assert.equal(await page.locator('[data-count="skills"]').first().textContent(),String(expanded.skills.length));
    await page.goto(origin+'skill.html?id=publication-fixture');
    await page.locator('.case-card').last().waitFor();
    assert.equal(await page.locator('h1').textContent(),'Publication Fixture');
    assert(await page.locator('#main').textContent().then(text=>text.includes('A verified playable example will appear')));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Additional skill mobile overflow');
    await context.unroute('**/data/catalog.json');
    report.additionalSkillAndEmptyState=true;
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);assert.deepEqual(report.externalRequests,[]);
    report.passed=true;
    console.log(JSON.stringify(report,null,2));
  } catch(error){
    report.failure=error.stack;
    await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
    throw error;
  } finally {
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    await browser?.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
