'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {D,read,hash,load,observe,validate,walking,search,replay}=require('./complex-runtime.cjs');
async function verify(repo,spec,root,cap=1000000){
 const report={profile:spec.contract?.profile,cap,checks:[],failures:[],scope:'Author self-test; ordinary official physics; exhaustive restricted push-state graph, frozen walking components; no human-difficulty or independent-author claim.'};
 try{
  assert(Number.isInteger(cap)&&cap>0,'Positive integer search cap required');
  validate(spec,root);const c=spec.contract,cells=spec.cells,{engine:e,solver}=load(repo,cells),o=observe(e,c);
  const initial=o.snap(e.initialState);assert(Object.keys(c.members).every(g=>o.group(initial,g).every(p=>p.z===0&&!p.removed)));
  assert(sameMembers(initial,c.members));
  report.fingerprints={cells:hash(cells),contract:hash(c),case:hash(fs.readFileSync(path.join(root,'references/official-case.md')))};
  for(const f of ['public/maze-engine.js','public/maze-solver.js','server/maze-levels.js','games/maze/level_parsing.json'])report.fingerprints[f]=hash(fs.readFileSync(path.join(repo,f)));
  const m=v=>v.moved.length>0,match=(name,v)=>o.matches(v,c.events[name]);
  const ready=(s,name)=>Object.entries(D).some(([d,delta])=>{const q=e.cloneState(s),a=o.snap(s),r=e.move(q,...delta);return r.moved&&match(name,o.event(a,o.snap(q),d));});
  const endpoint=name=>name==='goal'?o.goal:s=>o.goal(s)||ready(s,name);
  async function check(name,want,options={}){
   let r;try{
    r=await search(e,o,{cap,...options});
    if(r.status==='solved'){const q=replay(e,o,r.path,options);r.replayPassed=true;r.endpoint=o.goal(q.state)?'real-goal':'first-legal-opportunity';}
   }catch(err){r={status:'unknown',error:err.message};}
   const row={name,expected:want,...r,verdict:r.status===want?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown'};
   report.checks.push(row);console.log(JSON.stringify({check:name,status:row.status,expanded:row.expanded,verdict:row.verdict}));return row;
  }
  // The official solver remains a separate positive control; it searches the real
  // passage goal, rather than an empty-gem isSolved condition.
  const official={...e,isSolved:o.goal,heuristic:()=>0};
  const solved=await solver.solveWithAStar(official,{algorithm:'astar',maxExpandedStates:cap});
  report.officialSolution={status:solved.status,path:solved.path,expanded:solved.expanded,moves:solved.moves};
  if(solved.status==='solved'){replay(e,o,solved.path);report.officialSolution.replayPassed=true;}
  else report.checks.push({name:'official_positive',status:solved.status,verdict:solved.status==='unsolved'?'failed':'unknown'});
  const sequence=spec.witness||solved.path;
  if(sequence)for(const b of c.spatial.blocked){
   assert(Number.isInteger(b.keyStep)&&b.keyStep>=0&&b.keyStep<=sequence.length,'Unavailable blocked-state prefix');
   const start=replay(e,o,sequence.slice(0,b.keyStep),{end:()=>true}).state,w=walking(e,o,start);
   const stand=w.queue.find(n=>{const p=o.snap(n.state).find(p=>p.type==='player');return JSON.stringify([p.x,p.y,p.z])===JSON.stringify(b.stance);});
   let blocked=true,event=null;
   if(stand){const q=e.cloneState(stand.state),a=o.snap(q),r=e.move(q,...D[b.direction]);event=o.event(a,o.snap(q),b.direction);blocked=!r.moved;}
   report.checks.push({name:'blocked_'+b.group+'_'+b.direction+'_step_'+b.keyStep,stance:b.stance,reachable:!!stand,ordinaryEvent:event,
    scope:stand?'Ordinary blocked action at declared reachable stance':'Declared stance not reachable with rigid objects frozen at this witness state',verdict:blocked?'passed':'failed'});
  }
  if(sequence){const q=replay(e,o,sequence);report.replayPassed=true;report.witness=sequence;report.pushes=q.rows.filter(r=>r.event.moved.length);
   report.stageWitnesses=c.stages.map(s=>({name:s.name,event:s.event,step:q.rows.find(r=>match(s.event,r.event)&&(!s.after||r.step>(q.rows.find(t=>match(s.after,t.event))?.step??Infinity)))?.step??null,conflict:s.conflict,effect:s.effect}));
   if(report.stageWitnesses.some(s=>s.step===null))report.failures.push('Witness omits declared functional stage');
   const state=e.cloneState(e.initialState);report.walkingSnapshots=[];
   for(const row of [{step:0,event:{moved:[]}},...q.rows]){
    if(row.step)e.move(state,...D[row.d]);if(row.step&&!row.event.moved.length)continue;
    const w=walking(e,o,state),goalNode=w.queue.find(n=>o.goal(n.state));
    report.walkingSnapshots.push({step:row.step,player:o.snap(state).find(p=>p.type==='player'),groups:Object.fromEntries(Object.keys(c.members).map(g=>[g,o.pose(o.snap(state),g)])),reachable:w.reachable,walkingGoal:!!goalNode,path:goalNode?.path??null});
    if(goalNode)replay(e,o,goalNode.path,{start:state});
   }
  }
  await check('initial_frozen_walking','unsolved',{cut:m});
  for(const g of c.necessaryRoles)await check('freeze_'+g,'unsolved',{cut:v=>v.moved.includes(g)});
  for(const g of c.optionalRoles||[])await check('optional_freeze_'+g,'solved',{cut:v=>v.moved.includes(g)});
  const use=c.mechanism.kind==='boundary'?Object.keys(c.events).find(n=>c.events[n].kind==='offset'):Object.keys(c.events).find(n=>c.events[n].kind==='contact');
  assert(use,'Declare the actual mechanism event');
  await check('forbid_mechanism','unsolved',{cut:v=>match(use,v)});
  for(const d of c.dependencies){
   const stop=v=>d.before!=='goal'&&match(d.before,v),end=endpoint(d.before);
   const extra=d.after?{history:{after:false},update:(h,v)=>({after:h.after||match(d.after,v)}),endHistory:h=>h.after}:{};
   await check('prefix_positive_'+d.prepare+'_to_'+d.before,'solved',{...extra,cut:stop,end});
   await check('prefix_without_'+d.prepare+'_to_'+d.before,'unsolved',{...extra,cut:(v,h)=>stop(v)||match(d.prepare,v)&&(!d.after||h.after),end});
  }
  for(const r of c.opposingDirections||[])for(const direction of r.directions){
   await check('opposing_'+r.group+'_'+direction+'_before_'+r.before,'unsolved',{
    cut:v=>match(r.before,v)||(v.moved.includes(r.group)&&v.d===direction),end:endpoint(r.before)});
  }
  for(const r of c.reuse||[]){
   const update=(h,v)=>({phase:h.phase===0&&match(r.first,v)?1:h.phase===1&&match(r.return,v)?2:h.phase});
   const options={history:{phase:0},update,cut:v=>match(r.before,v),end:endpoint(r.before)};
   await check('reuse_positive_'+r.first+'_'+r.return,'solved',{...options,endHistory:h=>h.phase===2});
   await check('without_ordered_reuse_'+r.first+'_'+r.return,'unsolved',{...options,endHistory:h=>h.phase!==2});
  }
  await check('at_most_one_push_then_walk','unsolved',{history:{pushes:0},update:h=>({pushes:h.pushes+1}),cut:(v,h)=>m(v)&&h.pushes>=1});
  await check('one_same_direction_translation_process','unsolved',{history:{direction:null},update:(h,v)=>({direction:h.direction||v.d}),cut:(v,h)=>m(v)&&!!h.direction&&h.direction!==v.d});
  // Quantifies over all first-use histories reachable from the initial state.
  // Exhaustion proves there is no successful completion with only walking after
  // the first qualifying event, not that every reachable event state is solvable.
  await check('first_mechanism_then_walking_only_all_histories','unsolved',{
   history:{used:false},update:(h,v)=>({used:h.used||match(use,v)}),cut:(v,h)=>h.used&&m(v),endHistory:h=>h.used});
  if(c.mechanism.tool){
   const prep=Object.keys(c.events).find(n=>c.events[n].kind==='independent-tool');assert(prep);
   await check('walking_to_predocked_use','unsolved',{cut:v=>match(prep,v)||match(use,v),end:endpoint(use)});
   for(const g of c.postContactGroups||[])await check('freeze_'+g+'_after_any_first_contact','unsolved',{
    history:{used:false},update:(h,v)=>({used:h.used||match(use,v)}),cut:(v,h)=>h.used&&v.moved.includes(g),endHistory:h=>h.used});
  }
  for(const selected of c.selectedPost||[]){
   const start=replay(e,o,sequence.slice(0,selected.step),{end:()=>true}).state;
   const r=await check('selected_state_'+selected.step+'_walking','unsolved',{start,cut:m});r.scope='Selected witness state only';
   for(const g of selected.groups||[]){const r=await check('selected_state_'+selected.step+'_freeze_'+g,'unsolved',{start,cut:v=>v.moved.includes(g)});r.scope='Selected witness state only';}
  }
  for(const ctl of c.boundaryControls||[]){
   const start=replay(e,o,ctl.prefix,{end:()=>true}).state,w=walking(e,o,start),stand=w.queue.find(n=>{const p=o.snap(n.state).find(p=>p.type==='player');return JSON.stringify([p.x,p.y,p.z])===JSON.stringify(ctl.stance);});
   assert(stand,'Boundary probe stance inaccessible');const before=e.cloneState(stand.state),r=e.move(before,...D[ctl.direction]);assert(!r.moved,'Base push not blocked');
   const changed=cells.map(r=>[...r]);for(const [x,y,z]of ctl.walls){assert(z===0&&['#','.+#'].includes(changed[y][x]));changed[y][x]='.';}
   const adapted=load(repo,changed),v=observe(adapted.engine,c),st=replay(adapted.engine,v,ctl.prefix,{end:()=>true}).state;
   const afterWalk=walking(adapted.engine,v,st),stand2=afterWalk.queue.find(n=>{const p=v.snap(n.state).find(p=>p.type==='player');return JSON.stringify([p.x,p.y,p.z])===JSON.stringify(ctl.stance);});
   assert(stand2,'Intervention destroyed the matched stance');const a=v.snap(stand2.state),probe=adapted.engine.cloneState(stand2.state),rr=adapted.engine.move(probe,...D[ctl.direction]);
   assert(rr.moved&&v.event(a,v.snap(probe),ctl.direction).moved.includes(ctl.group));
   const bypass=await search(adapted.engine,v,{cap,cut:ev=>v.matches(ev,c.events[ctl.forbid])});
   if(bypass.status==='solved'){replay(adapted.engine,v,bypass.path,{cut:ev=>v.matches(ev,c.events[ctl.forbid])});bypass.replayPassed=true;}
   const old=new Set(w.reachable.map(p=>p.join(','))),now=new Set(afterWalk.reachable.map(p=>p.join(',')));
   report.checks.push({name:'matched_boundary_'+ctl.name,expected:'solved',...bypass,basePushBlocked:true,matchedStance:ctl.stance,
    interventionEvent:v.event(a,v.snap(probe),ctl.direction),newWalking:afterWalk.reachable.filter(p=>!old.has(p.join(','))),lostWalking:w.reachable.filter(p=>!now.has(p.join(','))),
    scope:'Only these walls, this ordinary prefix, matched stance, and excluded preparation. Walking side effects are recorded; no global shape uniqueness claim.',verdict:bypass.status==='solved'?'passed':bypass.status==='unsolved'?'failed':'unknown'});
  }
  report.overall=report.failures.length||report.checks.some(c=>c.verdict==='failed')?'failed':!report.replayPassed||report.checks.some(c=>c.verdict==='unknown')?'unknown':'passed';
  report.classification=report.overall==='passed'?'complex-structurally-verified':report.replayPassed?'legal-mechanism-demo-or-rejected-complex':'unverified';
 }catch(err){report.overall='unknown';report.classification='unsupported-or-incomplete-contract';report.error=err.stack;}
 return report;
}
function sameMembers(initial,members){return Object.entries(members).every(([g,p])=>JSON.stringify(initial.filter(a=>a.group===g&&!a.removed).map(a=>[a.x,a.y,a.z]))===JSON.stringify(p));}
if(require.main===module){
 const a=process.argv.slice(2),get=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
 assert(get('--repo')&&get('--spec')&&get('--out'));const out=path.resolve(get('--out'));assert(!fs.existsSync(out),'Choose new report directory');
 verify(path.resolve(get('--repo')),read(get('--spec')),path.resolve(__dirname,'..'),Number(get('--cap')||1000000)).then(r=>{
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(r,null,2)+'\n');
  console.log(JSON.stringify({overall:r.overall,classification:r.classification,error:r.error,checks:r.checks.length}));if(r.overall!=='passed')process.exitCode=1;
 }).catch(err=>{console.error(err);process.exitCode=1;});
}
module.exports={verify};
