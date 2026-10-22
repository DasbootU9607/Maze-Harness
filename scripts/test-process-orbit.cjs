'use strict';

// Exercise the inline arc timeline against actual published process records.
// This suite never opens a maze; gameplay belongs to the separate player suite.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf('--'+key);return i<0?null:args[i+1];};
assert(get('engine'),'Supply --engine ENGINE to locate playwright-core');
const root=path.resolve(__dirname,'..'),output=path.resolve(get('out')||path.join(root,'outputs/process-orbit'));
const {chromium}=require(require.resolve('playwright-core',{paths:[path.resolve(get('engine'))]}));
const {createServer,prefix}=require('./serve-site.cjs');
const report={scope:'Actual process records in the inline arc timeline: complete event access, linked selection, real progress-slider input, arc geometry and normal page accessibility. No game or WebGL preview is opened.',cases:[],errors:[],failedResponses:[],runtimeRequests:[]};
const save=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const eventSelector=id=>'.orbit-event[data-event-id="'+id+'"]';
const settle=async page=>{
  await page.waitForFunction(()=>document.querySelector('.orbit-stage')?.dataset.animating==='false');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
};
const selectedId=page=>page.locator('#process-orbit').getAttribute('data-selected-id');
async function assertWindow(page,ids){
  const rendered=await page.locator('.orbit-event').evaluateAll(events=>events.map(event=>({id:event.dataset.eventId,index:Number(event.dataset.index)})));
  assert(rendered.length>0,'The virtualized arc has visible actual events');assert.equal(new Set(rendered.map(event=>event.id)).size,rendered.length);
  assert.deepEqual(rendered.map(event=>event.index),rendered.map(event=>event.index).sort((a,b)=>a-b),'Virtualized DOM order preserves chronological Tab navigation after scrolling backwards');
  for(const event of rendered)assert.equal(event.id,ids[event.index],'Virtualized event identity preserves its exact recorded position');
  assert.equal(Number(await page.locator('#process-orbit').getAttribute('data-event-count')),ids.length);
  assert.match(await page.locator('#orbit-count').innerText(),new RegExp('/\\s*'+ids.length+'$'),'The visible event count reflects the selected record filter');
}
async function assertSelection(page,id){
  try{await page.waitForFunction(value=>document.querySelector('#process-orbit')?.dataset.selectedId===value,id);}
  catch(error){throw new Error('Expected selected event '+id+', actual '+await selectedId(page)+': '+error.message);}
  await settle(page);
  assert.equal(new URL(page.url()).searchParams.get('node'),id,'The arc selection updates the actual direct link');
  const selected=page.locator('.orbit-event[aria-current="step"]');
  assert.equal(await selected.getAttribute('data-event-id'),id,'The selected arc card is the actual record');
  assert.equal(await page.locator('#orbit-position').inputValue(),await selected.getAttribute('data-index'),'Progress slider follows the selected record');
  const evidence=JSON.parse(await page.locator('#operation-evidence-body').textContent());
  assert.equal(evidence.node.id,id,'Main details retain the selected record identity');
  const title=await selected.locator('.orbit-event-label').textContent();
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
async function assertInline(page){
  const result=await page.locator('#process-orbit').evaluate(timeline=>{
    const r=timeline.getBoundingClientRect(),style=getComputedStyle(timeline);return{x:r.x,right:r.right,width:r.width,viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,clientWidth:timeline.clientWidth,scrollWidth:timeline.scrollWidth,position:style.position,bodyOverflow:getComputedStyle(document.body).overflow,modal:timeline.matches('dialog,[role=dialog]'),inTimeline:Boolean(timeline.closest('#process-timeline'))};
  });
  assert(result.inTimeline&&!result.modal&&result.position!=='fixed','The arc is mounted inline in the original timeline column');
  assert.notEqual(result.bodyOverflow,'hidden','Inline browsing does not lock page scrolling');
  assert(result.x>=-1&&result.right<=result.viewportWidth+1&&result.documentWidth<=result.viewportWidth+1&&result.scrollWidth<=result.clientWidth+1,'Inline timeline remains bounded without horizontal overflow');
  assert.equal(await page.locator('#expand-timeline,#process-orbit-dialog,.timeline-node').count(),0,'The replaced expansion flow and straight timeline are absent');
  assert.equal(await page.locator('dialog[open]').count(),0,'Timeline browsing never opens a modal');
  return result;
}
async function testProgressSlider(page,ids){
  const slider=page.locator('#orbit-position');await slider.scrollIntoViewIfNeeded();await slider.focus();
  await page.keyboard.press('Home');await assertSelection(page,ids[0]);
  await page.keyboard.press('ArrowRight');await assertSelection(page,ids[1]);
  await page.keyboard.press('End');await assertSelection(page,ids.at(-1));
  await page.keyboard.press('ArrowLeft');await assertSelection(page,ids.at(-2));
  await page.keyboard.press('Home');await assertSelection(page,ids[0]);
  const box=await slider.boundingBox();assert(box.width>=180&&box.height>=24,'The labelled progress slider has a usable visible target');
  assert((await slider.getAttribute('aria-label'))||(await page.locator('label[for="orbit-position"]').count()),'The progress slider has an accessible label');
  const y=box.y+box.height/2;
  await page.mouse.move(box.x+2,y);await page.mouse.down();await page.mouse.move(box.x+box.width/2,y,{steps:12});await page.mouse.up();await settle(page);
  const middle=Number(await slider.inputValue());assert(Math.abs(middle-(ids.length-1)/2)<=1,'Real pointer dragging reaches the middle of the recorded sequence');await assertSelection(page,ids[middle]);
  await page.mouse.move(box.x+box.width/2,y);await page.mouse.down();await page.mouse.move(box.x+box.width-1,y,{steps:12});await page.mouse.up();await assertSelection(page,ids.at(-1));
  await page.mouse.move(box.x+box.width-2,y);await page.mouse.down();await page.mouse.move(box.x+1,y,{steps:18});await page.mouse.up();await assertSelection(page,ids[0]);
  return {pointerStart:0,pointerMiddle:middle,pointerEnd:ids.length-1,nativeKeyboard:true,width:box.width,height:box.height};
}
async function swipe(page,stage){
  const cdp=await page.context().newCDPSession(page),x=stage.x+stage.width*.85,y=stage.y+stage.height*.72;
  await page.evaluate(()=>{
    const stage=document.querySelector('.orbit-stage');window.__ORBIT_TOUCH_TRACE__=[];
    window.__ORBIT_TOUCH_LISTENER__=event=>window.__ORBIT_TOUCH_TRACE__.push({type:event.type,target:event.target.className,id:event.pointerId,y:event.clientY,stageCapture:stage.hasPointerCapture(event.pointerId),selected:document.querySelector('#process-orbit').dataset.selectedId});
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
      const visit=async id=>{await page.goto(base+'process.html?'+new URLSearchParams({case:entry.id,...(id?{node:id}:{})}));await page.locator('#process-orbit').waitFor({state:'visible'});await settle(page);if(id)await assertSelection(page,id);};
      await visit();assert.equal(await page.locator('#orbit-mode').inputValue(),'keys');await assertInline(page);
      const stage=page.locator('.orbit-stage'),keys=[],keyCount=Number(await page.locator('#orbit-position').getAttribute('max'))+1;
      assert(keyCount>0&&keyCount<=ids.length);await stage.focus();await page.keyboard.press('Home');await settle(page);
      for(let i=0;i<keyCount;i++){
        if(i)await page.keyboard.press('ArrowDown');await settle(page);const id=await selectedId(page);keys.push(id);await assertSelection(page,id);
      }
      assert.equal(new Set(keys).size,keys.length,'Every key index exposes a different actual record');
      assert.deepEqual(keys,ids.filter(id=>keys.includes(id)),'The key filter preserves the public source order');
      for(const node of ordered.filter(node=>['candidate','replay','delivery'].includes(node.kind)))assert(keys.includes(node.id),'Key events retain every version, replay and delivery');
      for(const kind of ['skill','mechanism']){const first=ordered.find(node=>node.kind==='resource'&&node.details?.kind===kind);if(first)assert(keys.includes(first.id),'Key events retain the first recorded '+kind+' source');}
      const firstNote=ordered.find(node=>node.kind==='note');if(firstNote)assert(keys.includes(firstNote.id),'The first public design note remains a key event');
      for(const result of data.tests.filter(test=>test.category!=='diagnostic'&&['failed','error','unknown'].includes(test.status)))assert(keys.includes(result.graphNodeId),'Non-passing formal evidence remains visible among key events');
      const support=ids.find(id=>!keys.includes(id));assert(support,'Each current case has supporting records');
      await assertWindow(page,keys);row.keyEvents=keys.length;
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
      row.slider=await testProgressSlider(page,ids);
      const middle=Math.floor(ids.length/2);await setPosition(page,middle);await assertSelection(page,ids[middle]);
      await stage.scrollIntoViewIfNeeded();
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
      await page.screenshot({path:path.join(output,entry.id+'-desktop.png')});await noGame(page);row.desktop=await assertInline(page);
      await page.locator('#process-orbit').evaluate(timeline=>{
        const controls=[...timeline.querySelectorAll('button,input,select,[tabindex]')].filter(node=>node.tabIndex>=0&&!node.disabled&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
        controls.at(-1).focus({preventScroll:true});
      });
      row.tabFocus=[];let reachedDetails=false;
      for(let i=0;i<20&&!reachedDetails;i++){
        await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({id:document.activeElement?.id,className:document.activeElement?.className,inTimeline:document.querySelector('#process-orbit').contains(document.activeElement),inDetails:document.querySelector('#operation-detail').contains(document.activeElement)}));
        row.tabFocus.push(focus);reachedDetails=focus.inDetails;
      }
      assert(reachedDetails,'Normal Tab navigation moves from the timeline to detail controls without a focus trap');await assertNoStageScroll(page);
      const beforeEscape=await selectedId(page);await page.keyboard.press('Escape');assert(await page.locator('#process-orbit').isVisible());await assertSelection(page,beforeEscape);
      // External detail controls must synchronize the inline arc and its filter.
      await page.locator('#orbit-mode').selectOption('keys');await settle(page);
      const precedingKey=keys.find(id=>{const index=ids.indexOf(id);return index<ids.length-1&&!keys.includes(ids[index+1]);});assert(precedingKey);
      await setPosition(page,keys.indexOf(precedingKey));await assertSelection(page,precedingKey);
      const following=ids[ids.indexOf(precedingKey)+1];await page.locator('#next-operation').click();await assertSelection(page,following);
      assert.equal(await page.locator('#orbit-mode').inputValue(),'all','Detail navigation to a support record automatically exposes All');await assertWindow(page,ids);
      await page.locator('#previous-operation').click();await assertSelection(page,precedingKey);
      const relatedKey=ordered.find(node=>node.kind==='candidate');assert(relatedKey);await setPosition(page,ids.indexOf(relatedKey.id));await assertSelection(page,relatedKey.id);
      const relation=page.locator('#operation-relations .relation-chip').first();assert(await relation.count());const destination=await relation.getAttribute('data-node-id');
      await relation.click();await assertSelection(page,destination);row.detailNavigation=true;
      await visit(keys.at(-1));assert.equal(await page.locator('#orbit-mode').inputValue(),'keys');
      await visit(support);assert.equal(await page.locator('#orbit-mode').inputValue(),'all','A support deep link mounts the correct unfiltered selection');
      await page.reload();await assertSelection(page,support);row.keyAndSupportDeepLinks=true;
      await page.setViewportSize({width:390,height:844});await settle(page);row.mobile=await assertInline(page);
      await setPosition(page,middle);await stage.scrollIntoViewIfNeeded();before=await geometry(page);const touchTrace=await swipe(page,before.stage);after=await geometry(page);
      try{row.touch=assertMovedTogether(before,after,'Touch dragging');}catch(error){row.touchDiagnostic=touchTrace;throw error;}
      const mobileSelected=await selectedId(page);
      const mobileTarget=after.events.find(event=>event.id!==mobileSelected&&event.card.x>=after.stage.x+1&&event.card.right<=after.stage.right-1&&event.card.y>=after.stage.y+1&&event.card.bottom<=after.stage.bottom-1);
      assert(mobileTarget);
      await page.evaluate(()=>{
        window.__ORBIT_TAP_TRACE__=[];
        window.__ORBIT_TAP_LISTENER__=event=>window.__ORBIT_TAP_TRACE__.push({type:event.type,time:performance.now(),target:event.target.className,eventId:event.target.closest('.orbit-event')?.dataset.eventId,pointerId:event.pointerId,primary:event.isPrimary,button:event.button,x:event.clientX,y:event.clientY,selected:document.querySelector('#process-orbit').dataset.selectedId,stageScroll:document.querySelector('.orbit-stage').scrollTop});
        for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.addEventListener(type,window.__ORBIT_TAP_LISTENER__,true);
      });
      try{await page.locator(eventSelector(mobileTarget.id)+' .orbit-event-card').tap();await assertSelection(page,mobileTarget.id);}
      catch(error){row.tapDiagnostic={target:mobileTarget,trace:await page.evaluate(()=>window.__ORBIT_TAP_TRACE__)};throw error;}
      finally{await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.removeEventListener(type,window.__ORBIT_TAP_LISTENER__,true);});}
      await assertNoStageScroll(page);
      await stage.focus();await page.keyboard.press('End');await assertSelection(page,ids.at(-1));await page.keyboard.press('Home');await assertSelection(page,ids[0]);
      assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
      assert.equal(await stage.getAttribute('data-animating'),'false');
      assert.equal(await page.locator('#process-orbit').evaluate(timeline=>timeline.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length),0,'Reduced motion does not leave autonomous animation running');
      await setPosition(page,middle);await stage.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,entry.id+'-mobile.png')});await noGame(page);
      const detailJump=page.locator('#orbit-view-details');if(await detailJump.isVisible())await detailJump.click();else await page.locator('#operation-detail').scrollIntoViewIfNeeded();
      assert(await page.locator('#operation-title').isVisible(),'The selected detail remains accessible below the mobile timeline');
      const detailBounds=await page.locator('#operation-title').boundingBox();assert(detailBounds.y>=-1&&detailBounds.y<844,'Mobile users can reach the selected detail');
      await assertSelection(page,ids[middle]);row.reducedMotion=true;row.mobileDetails=true;
      if(report.cases.length===1){
        await page.setViewportSize({width:1024,height:900});await settle(page);row.medium=await assertInline(page);await stage.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,entry.id+'-medium.png')});
        await page.setViewportSize({width:844,height:390});await settle(page);row.landscape=await assertInline(page);await page.locator('#orbit-position').scrollIntoViewIfNeeded();
        const controls=await page.locator('#orbit-position').boundingBox();assert(controls.y>=-1&&controls.y+controls.height<=391,'The progress slider remains reachable in short landscape pages');
        await page.screenshot({path:path.join(output,entry.id+'-landscape.png')});
        await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
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
        await settle(page);row.animationFramesChecked=samples.length;await noGame(page);
      }
      row.passed=true;save();await page.close();page=null;
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);assert.deepEqual(report.runtimeRequests,[]);report.passed=true;
  }catch(error){report.failure=error.stack;await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{save();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
