'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fields = ['actorX', 'actorY', 'actorElevation', 'actorRemoved', 'terrain', 'liftRaised'];
const snap = state => Object.fromEntries(fields.filter(k => state[k]).map(k => [k, Array.from(state[k])]));
const vectors = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
function runtime(repo) {
  const ctx = {window:{},console,structuredClone,performance,setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(repo,'public/maze-engine.js'),'utf8'),ctx);
  return ctx.window.MazeEngine;
}
function complete(engine,state,goal) {
  assert.equal(goal.kind,'reach','Unsupported objective; extend the observer before claiming verification');
  return engine.actorTypes.some((t,i)=>t==='player'&&!state.actorRemoved[i]&&[state.actorX[i],state.actorY[i],state.actorElevation[i]].every((v,j)=>v===goal.cell[j]));
}
function gateCells(engine,state) { return Array.from(engine.computeRaisedPlayerGateSet(state)).sort((a,b)=>a-b); }
function movedGroups(engine,a,b) {
  return [...new Set(engine.actorTypes.map((t,i)=>t==='weightless_box'&&(a.actorX[i]!==b.actorX[i]||a.actorY[i]!==b.actorY[i]||a.actorElevation[i]!==b.actorElevation[i]||a.actorRemoved[i]!==b.actorRemoved[i])?engine.actorGroupIds[i]:null).filter(Boolean))].sort();
}
function replay(spec,repo) {
  const e=runtime(repo).createEngine(spec.levelData),s=e.cloneState(e.initialState), steps=[];
  assert.equal(e.loadWarnings.length,0,'Initial state warnings are unsupported');
  assert(e.actorTypes.every(t=>['player','weightless_box','floating_floor'].includes(t)),'Unsupported actor profile');
  assert(/^[UDLR]*$/.test(spec.witness),'Invalid ordinary action route');
  for (const direction of spec.witness) {
    const before=snap(s),raisedBefore=gateCells(e,s),r=e.move(s,...vectors[direction]),after=snap(s);
    steps.push({step:steps.length+1,direction,moved:r?.moved===true,before,after,raisedBefore,raisedAfter:gateCells(e,s),movedGroups:movedGroups(e,before,after)});
  }
  assert(complete(e,s,spec.contract.goal),'The full doorway objective was not reached');
  return {engine:e,state:s,initialState:snap(e.initialState),steps,finalState:snap(s),ordinaryReplayPassed:true};
}
function verifyMotionChecks(spec,played) {
  const e=played.engine,player=e.actorTypes.indexOf('player');
  return (spec.contract.motionChecks||[]).map(check=>{
    const step=played.steps[check.step-1];assert(step&&step.moved,'Missing successful motion event');
    assert.deepEqual(step.movedGroups,[...check.groups].sort(),'Moved groups differ from the declared event');
    const [dx,dy]=vectors[step.direction],before=step.before,after=step.after;
    assert.equal(after.actorX[player]-before.actorX[player],dx);assert.equal(after.actorY[player]-before.actorY[player],dy);
    const members=group=>e.actorGroupIds.map((g,i)=>g===group&&!before.actorRemoved[i]?i:-1).filter(i=>i>=0);
    for(const group of check.groups)for(const i of members(group)){
      assert.equal(after.actorX[i]-before.actorX[i],dx);assert.equal(after.actorY[i]-before.actorY[i],dy);
      assert.equal(after.actorElevation[i],before.actorElevation[i]);assert.equal(after.actorRemoved[i],before.actorRemoved[i]);
    }
    assert(members(check.primaryGroup).some(i=>before.actorX[i]===before.actorX[player]+dx&&before.actorY[i]===before.actorY[player]+dy&&before.actorElevation[i]===before.actorElevation[player]),'Primary input lacks actual member contact');
    for(const [from,to] of check.chain||[])assert(members(from).some(i=>members(to).some(j=>before.actorX[i]+dx===before.actorX[j]&&before.actorY[i]+dy===before.actorY[j]&&before.actorElevation[i]===before.actorElevation[j])),'Propagated group lacks actual directional contact');
    return {...check,direction:step.direction,passed:true,scope:'Selected ordinary witness event, actual member contacts and full-group translations; not global necessity.'};
  });
}
function verifyBranches(spec,repo) {
  return (spec.contract.branchChecks||[]).map(check=>{
    const e=runtime(repo).createEngine(spec.levelData),s=e.cloneState(e.initialState);
    for(const d of spec.witness.slice(0,check.afterStep))e.move(s,...vectors[d]);
    const start=snap(s),steps=[];
    for(const direction of check.inputs){assert(vectors[direction],'Invalid branch direction');const before=snap(s),r=e.move(s,...vectors[direction]),after=snap(s);steps.push({direction,before,after,moved:r?.moved===true,movedGroups:movedGroups(e,before,after)});}
    assert(steps.length,'Empty branch check');const last=steps.at(-1);
    assert.equal(last.moved,check.lastMoved,'Branch action changed');assert.deepEqual(last.movedGroups,check.lastGroups,'Branch group contact changed');
    return {...check,passed:true,start,steps,scope:'Ordinary-action fork from a witnessed state; validates this preparation opportunity only, not all possible histories.'};
  });
}
function restrictionSearch(spec,repo,restriction,{cap=20000,timeoutMs=10000}={}) {
  assert(['freeze-group','forbid-joint-motion'].includes(restriction.kind),'Unsupported restriction');
  const e=runtime(repo).createEngine(spec.levelData),initial=e.cloneState(e.initialState),queue=[{s:initial,path:''}],seen=new Set([JSON.stringify(snap(initial))]),started=Date.now();
  let cursor=0;
  while(cursor<queue.length){
    if(cursor>=cap||Date.now()-started>=timeoutMs)return {status:'unknown',reason:cursor>=cap?'state-cap':'time-cap',expanded:cursor,cap,timeoutMs,restriction};
    const node=queue[cursor++];
    if(complete(e,node.s,spec.contract.goal))return {status:'solved',witness:node.path,expanded:cursor,cap,timeoutMs,restriction};
    for(const [d,v] of Object.entries(vectors)){
      const next=e.cloneState(node.s),before=snap(node.s),r=e.move(next,...v);
      if(!r?.moved)continue;
      const groups=movedGroups(e,before,snap(next));
      if(restriction.kind==='freeze-group'&&groups.includes(restriction.group))continue;
      if(restriction.kind==='forbid-joint-motion'&&groups.length>1)continue;
      const key=JSON.stringify(snap(next));
      if(seen.has(key))continue;
      seen.add(key);queue.push({s:next,path:node.path+d});
    }
  }
  return {status:'exhausted',expanded:cursor,cap,timeoutMs,restriction,scope:'Ordinary-action reachable states with exactly the stated transition exclusion and fixed full goal.'};
}
function probe(spec,repo,step) {
  const e=runtime(repo).createEngine(spec.levelData),s=e.cloneState(e.initialState);
  for(const d of spec.witness.slice(0,step))e.move(s,...vectors[d]);
  return {afterStep:step,state:snap(s),directions:Object.fromEntries(Object.entries(vectors).map(([d,v])=>{const n=e.cloneState(s),r=e.move(n,...v);return [d,{moved:r?.moved===true,movedGroups:movedGroups(e,snap(s),snap(n)),after:snap(n)}]}))};
}
function verify({skill,repo,family='official',out}) {
  const spec=read(path.join(skill,'references',family+'-design.json'));
  assert.equal(spec.contract.profile,'official-player-gate-reference-v1','Unsupported reference profile');
  const receipt=spec.contract.readReceipt,receiptFile=path.resolve(skill,receipt.path);
  assert(receiptFile.startsWith(path.resolve(skill)+path.sep),'Receipt escapes package');
  assert.equal(receipt.readBeforeLayout,true);assert.equal(sha(fs.readFileSync(receiptFile)),receipt.sha256,'Stale case receipt');
  const map=fs.readFileSync(path.join(skill,spec.source.map));
  assert.equal(sha(map),spec.source.map_sha256,'Source bytes changed');
  const commit=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  assert.equal(commit,spec.source.engineCommit,'Engine commit mismatch');
  const gitMap=execFileSync('git',['-C',repo,'show',commit+':'+spec.originRoom.level]);
  assert.equal(sha(gitMap),sha(map),'Map differs from pinned Git blob');
  assert.equal(sha(fs.readFileSync(path.join(repo,'public/maze-engine.js'))),spec.source.engineSha256,'Engine runtime mismatch');
  assert.equal(sha(spec.levelData),spec.source.entryStateSha256,'Entry state mismatch');
  const api=require(path.join(path.resolve(repo),'server/app.js')),game=api.getGame('maze');
  const parsed=api.getLevelState(game,api.getLevel(game,'level_'+spec.originRoom.id));
  assert.equal(sha(parsed),spec.source.entryStateSha256,'Packaged entry differs from the original official parsed state');
  assert.deepEqual(spec.cells,map.toString('utf8').trimEnd().split(/\r?\n/).map(row=>row.split(' ')),'Map cells mismatch');
  const played=replay(spec,repo),checks={profile:spec.contract.profile,ordinaryReplayPassed:true,goal:spec.contract.goal,inputs:spec.witness.length,finalState:played.finalState,motionChecks:verifyMotionChecks(spec,played),branchChecks:verifyBranches(spec,repo),probes:(spec.contract.probeSteps||[]).map(n=>probe(spec,repo,n)),restrictions:(spec.contract.restrictions||[]).map(r=>restrictionSearch(spec,repo,r)),source:spec.source};
  if(out){assert(!fs.existsSync(out),'Use a fresh verification output');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'replay.json'),JSON.stringify({initialState:played.initialState,steps:played.steps,finalState:played.finalState},null,2)+'\n');fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2)+'\n');}
  return checks;
}
if(require.main===module){try{const args=process.argv.slice(2),options={skill:path.resolve(__dirname,'..')};for(let i=0;i<args.length;i+=2)options[args[i].slice(2)]=args[i+1];const result=verify(options);console.log(JSON.stringify({ordinaryReplayPassed:result.ordinaryReplayPassed,inputs:result.inputs,goal:result.goal,restrictions:result.restrictions},null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={sha,snap,runtime,replay,probe,restrictionSearch,verify,verifyMotionChecks,verifyBranches};
