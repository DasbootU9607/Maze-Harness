'use strict';
// Scoped authoring checks for the new gate and floating-floor planning maps.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, hash } = require('../skills/mazebench-hook-transfer/scripts/complex-runtime.cjs');
const lab = require('./authored-gate-runtime.cjs');
const root = path.resolve(__dirname, '..');
const fields = ['actorX', 'actorY', 'actorElevation', 'actorRemoved', 'terrain', 'liftRaised'];
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function matches(v,q) {
  assert(q && ['move','consume','joint'].includes(q.kind), 'Unsupported event selector');
  if(q.direction && v.d !== q.direction || q.P && !same(v.P,q.P)) return false;
  if(q.kind === 'move') return v.moved.includes(q.group) && (!q.alone || v.moved.length === 1);
  if(q.kind === 'consume') return v.removed.includes(q.group);
  return q.groups.every(g => v.moved.includes(g)) && v.contacts.some(c => q.groups.includes(c.from) && q.groups.includes(c.to));
}
function stateRecord(e,o,s) {
  return { actors:o.snap(s), ...Object.fromEntries(fields.map(f=>[f,Array.from(s[f])])), raisedGates:[...e.computeRaisedPlayerGateSet(s)].sort((a,b)=>a-b) };
}
function validate(spec) {
  const c=spec.contract;
  assert(c.profile==='authored-planar-gate-planning-v1' && c.mode==='complex');
  assert(['block-coordination','enclosure-navigation','clear-ground-turning','bridge-convoy'].includes(c.skill));
  assert(spec.cells.length===16 && spec.cells.every(r=>r.length===16));
  assert(spec.cells.flat().every(t=>/^(?:#|\.|\+|g|p|G|f|M[0-4])$/.test(t)), 'Unsupported layered or mixed-physics token');
  assert(spec.cells.flat().filter(t=>t==='p').length===1);
  assert(['gem','reach'].includes(c.goal.kind));
  assert(spec.cells.flat().filter(t=>t==='G').length===(c.goal.kind==='gem'?1:0));
  if(c.goal.kind==='reach')assert(c.goal.cell.length===3 && c.goal.cell[2]===0);
  const mechanism=fs.readFileSync(path.join(root,'skills','mazebench-'+c.skill,c.readReceipt.path));
  assert(c.readReceipt.path==='references/mechanism-logic.md' && c.readReceipt.readBeforeLayout===true);
  assert.equal(hash(mechanism),c.readReceipt.sha256,'Stale reading receipt');
  const relations=new Set([...mechanism.toString('utf8').matchAll(/^### ([a-z0-9-]+)$/gm)].map(m=>m[1]));
  assert(c.relations.length>=3 && c.relations.every(r=>relations.has(r)));
  assert(c.stages.length>=3 && c.stages.every(s=>s.name && s.conflict && s.effect && Number.isInteger(s.keyStep) && s.keyStep>0 && s.nextStand.length===3));
  assert(c.branches.length && c.exclusions.length && c.orderedReuse.length);
  assert(/^[UDLR]+$/.test(spec.witness));
}
async function branchChecks(e,o,spec,branches,options) {
  const rows=[];
  for(const b of branches){
    assert(b.claim && Number.isInteger(b.baseStep) && b.baseStep>=0);
    const base=lab.replay(e,o,spec.witness.slice(0,b.baseStep),{end:()=>true}).state;
    const outcomes={};
    for(const side of ['positive','negative']){
      const plan=b[side];
      const reached=lab.replay(e,o,plan.moves,{start:base,end:()=>true});
      const before=stateRecord(e,o,reached.state);
      const probe=lab.replay(e,o,plan.probe,{start:reached.state,end:()=>true,allowBlocked:true});
      assert(plan.probe.length===1);
      const event=probe.rows[0].event;
      assert.equal(probe.rows[0].moved,!plan.blocked,b.name+' '+side+' probe result');
      if(plan.expect)assert(matches(event,plan.expect),b.name+' '+side+' event');
      const after=plan.after?lab.replay(e,o,plan.after,{start:probe.state,end:()=>true}):probe;
      if(plan.unchanged)for(const g of plan.unchanged)assert(same(before.actors.filter(a=>a.group===g),o.snap(after.state).filter(a=>a.group===g)),'Unexpected target change');
      if(plan.inaccessible){const region=lab.walking(e,o,after.state).reachable;assert(!region.some(p=>same(p,plan.inaccessible)),'Claimed missing input remains reachable');}
      if(plan.removed)for(const g of plan.removed)assert(o.snap(after.state).filter(a=>a.group===g).every(a=>a.removed),'Expected ordinary support loss');
      if(side==='positive')lab.replay(e,o,plan.suffix,{start:after.state});
      const row={moves:plan.moves,probe:plan.probe,before,event,after:stateRecord(e,o,after.state),inaccessibleStance:plan.inaccessible||null,ordinaryReplayPassed:true};
      if(plan.goalSearch){row.goalExclusion=await lab.search(e,o,{...options,start:after.state});if(row.goalExclusion.status==='solved')lab.replay(e,o,row.goalExclusion.path,{start:after.state});}
      outcomes[side]=row;
    }
    for(const who of b.match||[]){const actors=a=>a.before.actors.filter(p=>who==='player'?p.type==='player':p.group===who);assert(same(actors(outcomes.positive),actors(outcomes.negative)),b.name+' does not match '+who);}
    const search=outcomes.negative.goalExclusion,expected=b.negative.goalExpected||'unsolved';
    rows.push({name:b.name,claim:b.claim,baseStep:b.baseStep,matched:b.match||[],...outcomes,negativeGoalExpected:expected,scope:search?'Ordinary reachable branches and a separately checked continuation from the negative branch. A solved negative branch records a repair, not a dead end.':'Ordinary reachable branches testing the same next input; no all-history claim from this pair.',verdict:!search||search.status===expected?'passed':['solved','unsolved'].includes(search.status)?'failed':'unknown'});
  }
  return rows;
}
async function verify(repo,spec,{cap=100000,timeMs=60000}={}) {
  const report={profile:spec.contract.profile,scope:'Ordinary official replay, directed walking SCCs, complete actor footprints, reachable branch controls and the listed finite-state exclusions. No human difficulty or unique-route claim.',checks:[]};
  try {
    validate(spec);const c=spec.contract,{engine:e}=load(repo,spec.cells),o=lab.observer(e,c.goal);
    const initial=o.snap(e.initialState),groups=[...new Set(initial.filter(a=>a.group).map(a=>a.group))];
    assert(initial.every(a=>a.z===0&&!a.removed));
    assert(same(Object.keys(c.members).sort(),groups.sort()));
    for(const g of groups)assert(same(c.members[g],initial.filter(a=>a.group===g).map(a=>[a.x,a.y,a.z])));
    report.fingerprints={cells:hash(spec.cells),contract:hash(c),mechanism:c.readReceipt.sha256};
    for(const f of ['public/maze-engine.js','public/maze-solver.js','server/maze-levels.js','games/maze/level_parsing.json'])report.fingerprints[f]=hash(fs.readFileSync(path.join(repo,f)));
    const replay=lab.replay(e,o,spec.witness);report.replayPassed=true;report.witness=spec.witness;
    report.initial=stateRecord(e,o,e.initialState);report.final=stateRecord(e,o,replay.state);report.replay=replay.rows;
    report.stageWitnesses=[];
    for(const stage of c.stages){
      const row=replay.rows[stage.keyStep-1];assert(row&&matches(row.event,stage.event),'Stage event mismatch: '+stage.name);
      const state=replay.states[stage.keyStep],w=lab.walking(e,o,state);
      const stand=w.queue.find(n=>same(o.point(o.snap(n.state).find(a=>a.type==='player')),stage.nextStand));
      assert(stand,'Next stance is unreachable: '+stage.name);
      let nextInput=null;
      if(stage.nextInput){const next=lab.replay(e,o,stage.nextInput.direction,{start:stand.state,end:()=>true});nextInput=next.rows[0].event;assert(matches(nextInput,stage.nextInput.event),'Next input does not perform the claimed work');}
      report.stageWitnesses.push({...stage,actualEvent:row.event,completeState:stateRecord(e,o,state),walkingRegion:w.reachable,stancePath:stand.path,nextInput,verdict:'passed'});
    }
    const options={cap,timeMs};
    async function check(name,settings={}){
      const result=await lab.search(e,o,{...options,...settings});
      if(result.status==='solved'){
        const positive=lab.replay(e,o,result.path,{start:settings.start||e.initialState});let history=structuredClone(settings.history||{});
        for(const row of positive.rows)if(row.event.moved.length){assert(!settings.cut||!settings.cut(row.event,history,positive.states[row.step]),'Counterexample violates restriction');history=settings.update?settings.update(history,row.event):history;}
        assert(!settings.endHistory||settings.endHistory(history),'Counterexample history mismatch');result.replayPassed=true;
      }
      const row={name,expected:'unsolved',...result,verdict:result.status==='unsolved'?'passed':result.status==='solved'?'failed':'unknown'};
      report.checks.push(row);console.log(JSON.stringify({name,status:row.status,expanded:row.expanded,verdict:row.verdict}));
    }
    await check('initial-frozen-walking',{cut:v=>v.moved.length>0});
    for(const q of c.exclusions)await check(q.name,{cut:v=>matches(v,q.event)});
    for(const reuse of c.orderedReuse){
      const update=(h,v)=>({phase:h.phase<reuse.events.length&&matches(v,reuse.events[h.phase])?h.phase+1:h.phase});
      let control={phase:0};for(const row of replay.rows)if(row.event.moved.length)control=update(control,row.event);
      assert.equal(control.phase,reuse.events.length,'Positive witness omits ordered reuse');
      await check('without-'+reuse.name,{history:{phase:0},update,endHistory:h=>h.phase!==reuse.events.length});
    }
    await check('at-most-one-object-push',{history:{pushes:0},update:h=>({pushes:h.pushes+1}),cut:(v,h)=>v.moved.length>0&&h.pushes>=1});
    await check('one-pushing-direction',{history:{direction:null},update:(h,v)=>({direction:h.direction||v.d}),cut:(v,h)=>h.direction&&v.d!==h.direction});
    report.branches=await branchChecks(e,o,spec,c.branches,options);
    report.overall=[...report.checks,...report.branches].some(c=>c.verdict==='failed')?'failed':[...report.checks,...report.branches].some(c=>c.verdict==='unknown')?'unknown':'passed';
    report.classification=report.overall==='passed'?'scoped-planning-relations-verified':'unverified-or-revision-required';
  }catch(error){report.overall='unknown';report.error=error.stack;}
  return report;
}
if(require.main===module){
  const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
  assert(get('--repo')&&get('--spec')&&get('--out'),'Use --repo ENGINE --spec DESIGN --out FRESH_REPORT');
  const out=path.resolve(get('--out'));assert(!fs.existsSync(out),'Choose a fresh report file');
  verify(path.resolve(get('--repo')),JSON.parse(fs.readFileSync(get('--spec'),'utf8')),{cap:Number(get('--cap')||100000),timeMs:Number(get('--time-ms')||60000)}).then(report=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({overall:report.overall,error:report.error}));if(report.overall!=='passed')process.exitCode=1;});
}
module.exports={matches,stateRecord,branchChecks,validate,verify};
