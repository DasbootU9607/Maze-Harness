const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {e,v,D,level,solver,solve,replay,repo,out}=require('./verify.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const r=read('verification.json');
const {inspector}=require('../../scripts/contact-events.cjs');
(async()=>{
 const pre=replay({path:r.solution.path.slice(0,r.event.step-1)},e.initialState,null,()=>true).s;
 const action=(s,d='U')=>{const before=v.snap(s),move=e.move(s,...D[d]),after=v.snap(s);return {before,after,move,flags:v.classify(before,after,move,...D[d]),button:e.areOrangeButtonsPressed(s)};};
 const baseline=action(e.cloneState(pre));assert(baseline.flags.event&&baseline.button);
 const tip=baseline.before.find(a=>a.group==='M2'&&a.x===10&&a.y===7);
 const missingTipState=e.cloneState(pre);missingTipState.actorRemoved[tip.i]=1;
 const missingTip=action(missingTipState);assert(missingTip.move.moved&&!missingTip.flags.event&&!missingTip.button);
 assert(missingTip.flags.moved.includes('M2')&&!missingTip.flags.moved.includes('M3'));
 const handle=baseline.before.find(a=>a.group==='M2'&&a.x===7&&a.y===8);
 const missingHandleState=e.cloneState(pre);missingHandleState.actorRemoved[handle.i]=1;
 const missingHandle=action(missingHandleState);assert(!missingHandle.flags.event&&!missingHandle.button);
 const lineLevel={...structuredClone(level),width:6,height:4,terrain:Array.from({length:4},()=>Array.from({length:6},()=>({type:'floor'}))),
  actors:[{type:'player',x:1,y:2,elevation:0},{type:'weightless_box',groupId:'M2',x:2,y:2,elevation:0},{type:'weightless_box',groupId:'M3',x:3,y:2,elevation:0}]};
 const le=window.MazeEngine.createEngine(lineLevel),lv=inspector(le,read('contract.json')),ls=le.cloneState(le.initialState),la=lv.snap(ls),lm=le.move(ls,1,0),lf=lv.classify(la,lv.snap(ls),lm,1,0);
 assert(lf.coupled&&!lf.sideTransfer&&!lf.rearTransfer);
 const wrong='RUUUUU',s=e.cloneState(e.initialState),history=[];
 for(const d of wrong){const move=e.move(s,...D[d]);assert(move.moved);history.push(move);}
 const stuck=v.snap(s),deadlock=await solve({...e,initialState:e.cloneState(s)});assert.equal(deadlock.status,'unsolved');
 e.undoMove(s,history.at(-1));const undoState=v.snap(s),recovery=await solve({...e,initialState:e.cloneState(s)});assert.equal(recovery.status,'solved');replay(recovery,s);
 const report={baseline,missingTip,missingHandle,
  conclusions:{tip:'Same terrain, player, target, handle and input support: handle still pushes M2 north but M3 stays and gate stays shut. The tip transmits this contact.',
   handle:'Removing the handle removes the directly reachable input and sole pre-event support; the two effects are confounded. This is not a global minimality claim.'},
  straightPushNegative:{flags:lf,passed:true},deadlock:{wrongPath:wrong,state:stuck,search:deadlock},undo:{state:undoState,recovery,replayPassed:true},
  cap1:read('verification-cap1.json').overall,overall:'passed'};
 assert.equal(report.cap1,'unknown');fs.writeFileSync(path.join(out,'controls.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({tip:missingTip.flags,deadlock,recovery,overall:report.overall}));
})().catch(e=>{console.error(e);process.exitCode=1;});
