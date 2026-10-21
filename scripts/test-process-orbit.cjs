'use strict';

// Exercise the optional arc timeline against actual published process records.
// This suite never opens a maze; gameplay belongs to the separate player suite.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf('--'+key);return i<0?null:args[i+1];};
assert(get('engine'),'Supply --engine ENGINE to locate playwright-core');
const root=path.resolve(__dirname,'..'),output=path.resolve(get('out')||path.join(root,'outputs/process-orbit'));
const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(get('engine'))]}));
const {createServer,prefix}=require('./serve-site.cjs');
const report={scope:'Actual process records in the optional arc timeline: complete event access, linked selection, arc geometry, input and accessibility. No game or WebGL preview is opened.',cases:[],errors:[],failedResponses:[],runtimeRequests:[]};
const save=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const eventSelector=id=>'.orbit-event[data-event-id="'+id+'"]';
const settle=async page=>{
  await page.waitForFunction(()=>document.querySelector('.orbit-stage')?.dataset.animating==='false');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
};
const selectedId=page=>page.locator('#process-orbit-dialog').getAttribute('data-selected-id');
async function assertWindow(page,ids){
  const rendered=await page.locator('.orbit-event').evaluateAll(events=>events.map(event=>({id:event.dataset.eventId,index:Number(event.dataset.index)})));
  assert(rendered.length>0,'The virtualized arc has visible actual events');assert.equal(new Set(rendered.map(event=>event.id)).size,rendered.length);
  assert.deepEqual(rendered.map(event=>event.index),rendered.map(event=>event.index).sort((a,b)=>a-b),'Virtualized DOM order preserves chronological Tab navigation after scrolling backwards');
  for(const event of rendered)assert.equal(event.id,ids[event.index],'Virtualized event identity preserves its exact recorded position');
  assert.equal(Number(await page.locator('#process-orbit-dialog').getAttribute('data-event-count')),ids.length);
  assert.match(await page.locator('#orbit-count').innerText(),new RegExp('/\\s*'+ids.length+'$'),'The visible event count reflects the selected record filter');
}
async function assertSelection(page,id){
  try{await page.waitForFunction(value=>document.querySelector('#process-orbit-dialog')?.dataset.selectedId===value,id);}
  catch(error){throw new Error('Expected selected event '+id+', actual '+await selectedId(page)+': '+error.message);}
  await settle(page);
  assert.equal(new URL(page.url()).searchParams.get('node'),id,'The arc selection updates the actual direct link');
  assert.equal(await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id'),id,'The original timeline selects the same actual record');
  const evidence=JSON.parse(await page.locator('#operation-evidence-body').textContent());
  assert.equal(evidence.node.id,id,'Main details retain the selected record identity');
  const title=await page.locator('.timeline-node[data-node-id="'+id+'"] .timeline-label').textContent();
  assert.equal(await page.locator('#operation-title').textContent(),title,'The arc updates the actual record details');
}
async function setPosition(page,index){
  await page.locator('#orbit-position').evaluate((element,value)=>{
    element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
  },index);
  await settle(page);
}
async function geometry(page){
  return page.locator('.orbit-stage').evaluate(stage=>{
    const outer=stage.getBoundingClientRect(),rect=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};
    const circle=stage.querySelector('.orbit-track-circle'),matrix=circle.getScreenCTM(),center=new DOMPoint(circle.cx.baseVal.value,circle.cy.baseVal.value).matrixTransform(matrix),edge=new DOMPoint(circle.cx.baseVal.value+circle.r.baseVal.value,circle.cy.baseVal.value).matrixTransform(matrix);
    return {stage:rect(stage),arc:{cx:center.x,cy:center.y,radius:Math.hypot(edge.x-center.x,edge.y-center.y)},events:[...stage.querySelectorAll('.orbit-event')].map(event=>{
      const point=event.querySelector('.orbit-event-point'),card=event.querySelector('.orbit-event-card');
      const p=rect(point),c=rect(card),style=getComputedStyle(event);
      return {id:event.dataset.eventId,point:p,card:c,visible:style.visibility!=='hidden'&&style.display!=='none'&&p.height>0&&p.cy>outer.top+5&&p.cy<outer.bottom-5};
    }).filter(event=>event.visible)};
  });
}
function assertAligned(sample,label){
  assert(sample.events.length>=3,label+' must show several actual records on the arc');
  for(const event of sample.events){
    assert(Math.abs(event.point.cy-event.card.cy)<=2,label+' point and card must share the same vertical position: '+event.id);
    assert(Math.abs(Math.hypot(event.point.cx-sample.arc.cx,event.point.cy-sample.arc.cy)-sample.arc.radius)<=2,label+' points remain attached to the rendered arc: '+event.id);
  }
  const xs=sample.events.map(event=>event.point.cx);
  assert(Math.max(...xs)-Math.min(...xs)>4,label+' points follow an arc, not a straight vertical line');
}
function assertMovedTogether(before,after,label){
  const old=new Map(before.events.map(event=>[event.id,event])),shared=after.events.filter(event=>old.has(event.id));
  assert(shared.length>=2,label+' must retain overlapping records for a meaningful geometry comparison');
  let moved=0;
  for(const event of shared){
    const previous=old.get(event.id),pointDelta=event.point.cy-previous.point.cy,cardDelta=event.card.cy-previous.card.cy;
    assert(Math.abs(pointDelta-cardDelta)<=2,label+' must move each point and card together: '+event.id);
    if(Math.abs(pointDelta)>3)moved++;
  }
  assert(moved>=2,label+' must actually move several point/card pairs');assertAligned(after,label);
  return {shared:shared.length,moved};
}
async function noGame(page){
  assert.equal(await page.locator('iframe').count(),0,'Arc browsing must not instantiate a maze iframe');
  assert.equal(await page.evaluate(()=>window.__ORBIT_QA_WEBGL_CONTEXTS__),0,'Arc browsing must not initialize WebGL');
}
async function assertNoStageScroll(page){
  assert.deepEqual(await page.locator('.orbit-stage').evaluate(stage=>({left:stage.scrollLeft,top:stage.scrollTop})),{left:0,top:0},'Focusing arc controls must not scroll the clipped stage independently of its point/card geometry');
}
async function assertModalFits(page){
  const result=await page.locator('#process-orbit-dialog').evaluate(dialog=>{
    const r=dialog.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,dialogWidth:dialog.clientWidth,dialogScrollWidth:dialog.scrollWidth};
  });
  assert(result.x>=-1&&result.y>=-1&&result.right<=result.viewportWidth+1&&result.bottom<=result.viewportHeight+1,'Arc dialog remains inside the viewport');
  assert(result.documentWidth<=result.viewportWidth+1&&result.dialogScrollWidth<=result.dialogWidth+1,'Arc dialog must not create horizontal overflow');
  return result;
}
async function open(page,expected){
  await page.locator('#expand-timeline').click();await page.locator('#process-orbit-dialog').waitFor({state:'visible'});await assertSelection(page,expected);
  assert(await page.locator('#process-orbit-dialog').evaluate(dialog=>dialog.contains(document.activeElement)),'Opening the dialog moves focus inside it');
}
async function closeEscape(page){
  await page.keyboard.press('Escape');await page.locator('#process-orbit-dialog').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'expand-timeline','Escape restores focus to the expansion action');
}
async function swipe(page,stage){
  const cdp=await page.context().newCDPSession(page),x=stage.x+stage.width*.85,y=stage.y+stage.height*.72;
  await page.evaluate(()=>{
    const stage=document.querySelector('.orbit-stage');window.__ORBIT_TOUCH_TRACE__=[];
    window.__ORBIT_TOUCH_LISTENER__=event=>window.__ORBIT_TOUCH_TRACE__.push({type:event.type,target:event.target.className,id:event.pointerId,y:event.clientY,stageCapture:stage.hasPointerCapture(event.pointerId),selected:document.querySelector('#process-orbit-dialog').dataset.selectedId});
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture'])stage.addEventListener(type,window.__ORBIT_TOUCH_LISTENER__,true);
  });
  try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*18,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await cdp.detach();}
  await settle(page);
  return page.evaluate(()=>{const stage=document.querySelector('.orbit-stage');for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture'])stage.removeEventListener(type,window.__ORBIT_TOUCH_LISTENER__,true);return window.__ORBIT_TOUCH_TRACE__;});
}

(async()=>{
  let server,browser,page;
  fs.mkdirSync(output,{recursive:true});
  try{
    let base=get('base-url');
    if(!base){server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+prefix;}
    if(!base.endsWith('/'))base+='/';report.base=base;
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      window.__ORBIT_QA_WEBGL_CONTEXTS__=0;const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...rest){if(/webgl/i.test(type))window.__ORBIT_QA_WEBGL_CONTEXTS__++;return getContext.call(this,type,...rest);};
    });
    const fetchJSON=async relative=>{const response=await context.request.get(new URL(relative,base).href);assert.equal(response.status(),200,'Published process asset: '+relative);return response.json();};
    const catalog=await fetchJSON('data/catalog.json'),cases=catalog.cases.filter(entry=>entry.process?.data);
    assert(cases.length>0,'At least one published process must be available');report.registeredCases=cases.length;
    for(const entry of cases){
      const row={caseId:entry.id};report.cases.push(row);save();console.log(JSON.stringify({caseId:entry.id,stage:'arc-timeline'}));
      const data=await fetchJSON(entry.process.data),ordered=data.nodes.map((node,index)=>({...node,sourceIndex:index})).sort((a,b)=>(Number.isFinite(a.order)?a.order:a.sourceIndex)-(Number.isFinite(b.order)?b.order:b.sourceIndex));
      const ids=ordered.map(node=>node.id);assert.equal(new Set(ids).size,ids.length,'Published event IDs are unique');
      page=await context.newPage();page.on('pageerror',error=>report.errors.push({caseId:entry.id,message:error.message}));
      page.on('response',response=>{if(response.status()>=400)report.failedResponses.push({caseId:entry.id,status:response.status(),url:response.url()});});
      page.on('request',request=>{if(/\/process-player\.(?:html|js)|\/runtime\/|\/vendor\/three/.test(new URL(request.url()).pathname))report.runtimeRequests.push({caseId:entry.id,url:request.url()});});
      await page.goto(base+'process.html?'+new URLSearchParams({case:entry.id}));await page.waitForSelector('.timeline-node:visible');
      assert.equal(await page.locator('.timeline-node').count(),ids.length,'The original timeline still exposes every actual event');
      const keys=await page.locator('.timeline-node[data-key-event="true"]').evaluateAll(nodes=>nodes.map(node=>node.dataset.nodeId));
      const support=ids.find(id=>!keys.includes(id));assert(support,'Each case has supporting events to exercise');
      const initial=await page.locator('.timeline-node[aria-current="step"]').getAttribute('data-node-id');
      await open(page,initial);assert.equal(await page.locator('#orbit-mode').inputValue(),'keys');
      await assertWindow(page,keys);
      assert.equal(Number(await page.locator('#orbit-position').getAttribute('max')),keys.length-1);row.keyEvents=keys.length;
      const stage=page.locator('.orbit-stage');await stage.focus();await page.keyboard.press('Home');await assertSelection(page,keys[0]);
      for(let i=1;i<keys.length;i++){await page.keyboard.press('ArrowDown');await assertSelection(page,keys[i]);await assertWindow(page,keys);}
      await page.locator('#orbit-mode').selectOption('all');await settle(page);
      await assertWindow(page,ids);
      assert.equal(Number(await page.locator('#orbit-position').getAttribute('min')),0);assert.equal(Number(await page.locator('#orbit-position').getAttribute('max')),ids.length-1);
      await stage.focus();await page.keyboard.press('Home');await assertSelection(page,ids[0]);
      for(let i=1;i<ids.length;i++){await page.keyboard.press('ArrowDown');await assertSelection(page,ids[i]);await assertWindow(page,ids);}
      row.allEvents=ids.length;row.supportingEventsReached=ids.length-keys.length;row.finalEventReached=ids.at(-1);
      save();console.log(JSON.stringify({caseId:entry.id,stage:'all-events-reached',events:ids.length}));
      await page.keyboard.press('End');await page.keyboard.press('ArrowDown');await assertSelection(page,ids.at(-1));
      assert(await page.locator('#orbit-next').isDisabled(),'End of the saved record cannot invent a next event');
      await stage.hover();await page.mouse.wheel(0,5000);await settle(page);await assertSelection(page,ids.at(-1));
      await stage.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowUp');await assertSelection(page,ids[0]);
      assert(await page.locator('#orbit-prev').isDisabled(),'Start of the saved record cannot wrap to the end');
      await stage.hover();await page.mouse.wheel(0,-5000);await settle(page);await assertSelection(page,ids[0]);row.boundedHistory=true;
      await assertWindow(page,ids);
      const middle=Math.floor(ids.length/2);await setPosition(page,middle);await assertSelection(page,ids[middle]);
      let before=await geometry(page);assertAligned(before,'Initial arc');await stage.hover();await page.mouse.wheel(0,140);await settle(page);
      let after=await geometry(page);row.wheel=assertMovedTogether(before,after,'Wheel movement');
      await setPosition(page,middle);before=await geometry(page);
      await page.mouse.move(before.stage.x+before.stage.width*.88,before.stage.y+before.stage.height*.7);await page.mouse.down();
      await page.mouse.move(before.stage.x+before.stage.width*.88,before.stage.y+before.stage.height*.7-140,{steps:10});await page.mouse.up();await settle(page);
      after=await geometry(page);row.drag=assertMovedTogether(before,after,'Pointer dragging');
      const current=await selectedId(page);let target=after.events.find(event=>event.id!==current&&event.card.x>=after.stage.x&&event.card.right<=after.stage.right&&event.card.cy>after.stage.y+50&&event.card.cy<after.stage.bottom-50);
      assert(target,'A neighboring actual event card can be clicked');await page.locator(eventSelector(target.id)+' .orbit-event-card').click();await assertSelection(page,target.id);
      after=await geometry(page);target=after.events.find(event=>event.id!==target.id&&event.point.cy>after.stage.y+50&&event.point.cy<after.stage.bottom-50);
      assert(target);await page.locator(eventSelector(target.id)+' .orbit-event-point').click();await assertSelection(page,target.id);row.realCardAndPointClicks=true;
      await assertNoStageScroll(page);
      await page.screenshot({path:path.join(output,entry.id+'-desktop.png')});await noGame(page);await assertModalFits(page);
      row.tabFocus=[];
      for(let i=0;i<10;i++){
        await page.keyboard.press('Tab');const focus=await page.locator('#process-orbit-dialog').evaluate(dialog=>({inside:dialog.contains(document.activeElement),tag:document.activeElement?.tagName,id:document.activeElement?.id,className:document.activeElement?.className,open:dialog.open}));
        row.tabFocus.push(focus);assert(focus.inside,'Tab focus remains inside the modal: '+JSON.stringify(focus));
      }
      await page.locator('#orbit-mode').focus();await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'orbit-view-details','Shift+Tab wraps from the first to the last modal control');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'orbit-mode','Tab wraps from the last to the first modal control');
      await assertNoStageScroll(page);
      await closeEscape(page);
      // Select a previously hidden support record with the original timeline.
      await page.locator('#show-all-records').click();await page.locator('.timeline-node[data-node-id="'+support+'"]').click();
      assert.equal(new URL(page.url()).searchParams.get('node'),support);await open(page,support);
      assert.equal(await page.locator('#orbit-mode').inputValue(),'all','Opening a supporting selection must not silently replace it with a key event');
      await page.locator('#orbit-view-details').click();await page.locator('#process-orbit-dialog').waitFor({state:'hidden'});
      assert.equal(await page.locator('.timeline-node:focus').getAttribute('data-node-id'),support,'View details focuses the actual main timeline record');row.originalTimelineAndDetails=true;
      await page.setViewportSize({width:390,height:844});await open(page,support);row.mobile=await assertModalFits(page);
      await setPosition(page,middle);before=await geometry(page);const touchTrace=await swipe(page,before.stage);after=await geometry(page);
      try{row.touch=assertMovedTogether(before,after,'Touch dragging');}catch(error){row.touchDiagnostic=touchTrace;throw error;}
      const mobileSelected=await selectedId(page);
      const mobileTarget=after.events.find(event=>event.id!==mobileSelected&&event.card.x>=after.stage.x+1&&event.card.right<=after.stage.right-1&&event.card.y>=after.stage.y+1&&event.card.bottom<=after.stage.bottom-1);
      assert(mobileTarget);
      await page.evaluate(()=>{
        window.__ORBIT_TAP_TRACE__=[];
        window.__ORBIT_TAP_LISTENER__=event=>window.__ORBIT_TAP_TRACE__.push({type:event.type,time:performance.now(),target:event.target.className,eventId:event.target.closest('.orbit-event')?.dataset.eventId,pointerId:event.pointerId,primary:event.isPrimary,button:event.button,x:event.clientX,y:event.clientY,selected:document.querySelector('#process-orbit-dialog').dataset.selectedId,stageScroll:document.querySelector('.orbit-stage').scrollTop,dialogScroll:document.querySelector('#process-orbit-dialog').scrollTop});
        for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.addEventListener(type,window.__ORBIT_TAP_LISTENER__,true);
      });
      try{await page.locator(eventSelector(mobileTarget.id)+' .orbit-event-card').tap();await assertSelection(page,mobileTarget.id);}
      catch(error){row.tapDiagnostic={target:mobileTarget,trace:await page.evaluate(()=>window.__ORBIT_TAP_TRACE__)};throw error;}
      finally{await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.removeEventListener(type,window.__ORBIT_TAP_LISTENER__,true);});}
      await assertNoStageScroll(page);
      await stage.focus();await page.keyboard.press('End');await assertSelection(page,ids.at(-1));await page.keyboard.press('Home');await assertSelection(page,ids[0]);
      assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
      assert.equal(await stage.getAttribute('data-animating'),'false');
      assert.equal(await page.locator('#process-orbit-dialog').evaluate(dialog=>dialog.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length),0,'Reduced motion does not leave autonomous animation running');
      await page.screenshot({path:path.join(output,entry.id+'-mobile.png')});await noGame(page);await closeEscape(page);row.reducedMotion=true;row.focusAndEscape=true;
      if(report.cases.length===1){
        await page.setViewportSize({width:844,height:390});await open(page,ids[0]);row.landscape=await assertModalFits(page);
        const controls=await page.locator('#process-orbit-dialog').evaluate(dialog=>{const d=dialog.getBoundingClientRect(),f=dialog.querySelector('.orbit-footer').getBoundingClientRect(),b=dialog.querySelector('#orbit-view-details').getBoundingClientRect();return{dialogBottom:d.bottom,footerBottom:f.bottom,buttonBottom:b.bottom,buttonTop:b.top};});
        assert(controls.footerBottom<=controls.dialogBottom+1&&controls.buttonBottom<=controls.dialogBottom+1&&controls.buttonTop>=0,'Short landscape view keeps the footer and details action visible');
        await page.screenshot({path:path.join(output,entry.id+'-landscape.png')});await closeEscape(page);
        await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await open(page,ids[0]);
        await page.locator('#orbit-mode').selectOption('all');await setPosition(page,middle);
        const samples=await page.evaluate(async()=>{
          const stage=document.querySelector('.orbit-stage'),rows=[];stage.dispatchEvent(new WheelEvent('wheel',{deltaY:140,bubbles:true,cancelable:true}));
          for(let frame=0;frame<8;frame++){
            await new Promise(resolve=>requestAnimationFrame(resolve));
            const bounds=stage.getBoundingClientRect();
            rows.push([...stage.querySelectorAll('.orbit-event')].filter(event=>{const point=event.querySelector('.orbit-event-point').getBoundingClientRect();return point.height>0&&point.y+point.height/2>=bounds.top&&point.y+point.height/2<=bounds.bottom;}).map(event=>{const p=event.querySelector('.orbit-event-point').getBoundingClientRect(),c=event.querySelector('.orbit-event-card').getBoundingClientRect();return{id:event.dataset.eventId,pointY:p.y+p.height/2,cardY:c.y+c.height/2};}));
          }return rows;
        });
        for(const sample of samples){assert(sample.length>=3,'Animation samples contain visible point/card pairs');for(const event of sample)assert(Math.abs(event.pointY-event.cardY)<=2,'Point and card remain joined during animated movement');}
        const first=new Map(samples[0].map(event=>[event.id,event]));assert(samples.at(-1).some(event=>first.has(event.id)&&Math.abs(event.pointY-first.get(event.id).pointY)>1),'Normal-motion sampling observes real movement rather than only static alignment');
        await settle(page);row.animationFramesChecked=samples.length;await noGame(page);await closeEscape(page);
      }
      row.passed=true;save();await page.close();page=null;
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);assert.deepEqual(report.runtimeRequests,[]);report.passed=true;
  }catch(error){report.failure=error.stack;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{save();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
