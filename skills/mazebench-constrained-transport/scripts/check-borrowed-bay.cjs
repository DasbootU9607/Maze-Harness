'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require('./runtime.cjs');
const args=process.argv.slice(2),get=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out NEW_OUTPUT [--cap N]');
const repo=path.resolve(get('--repo')),dir=path.resolve(get('--out')),base=path.resolve(__dirname,'../assets/borrowed-bay');
assert(!fs.existsSync(dir),'Preserve previous reports: choose a fresh output directory');
const spec=R.validate(R.read(path.join(base,'spec.json'))),v=R.read(path.join(base,'witness.json')),expected=R.read(path.join(base,'expected.json'));
assert.equal(R.digest(spec.cells),v.fingerprints.cells,'Reference cells changed; reanalyse the claims');
assert.equal(R.digest(spec.contract),v.fingerprints.contract,'Reference contract changed; reanalyse the claims');
const {engine:e,solver}=R.load(repo,spec.cells),o=R.observer(e,spec.contract),cap=Number(get('--cap',300000));
assert(Number.isInteger(cap)&&cap>0);
v.trace=R.replay(e,o,v.solution.path,{requireIntact:true}).rows;
const fingerprints={cells:R.digest(spec.cells),contract:R.digest(spec.contract)};
for(const file of ['public/maze-engine.js','public/maze-solver.js','server/maze-levels.js','games/maze/level_parsing.json'])fingerprints[file]=R.digest(fs.readFileSync(path.join(repo,file),'utf8'));
fs.mkdirSync(dir,{recursive:true});
const report={fingerprints,cap,replayPassed:true,checks:[],controls:[],scope:'Scoped audit of the authored Borrowed Bay room. Not a universal composition checker, ordering proof, or human difficulty rating.'};
const write=()=>fs.writeFileSync(path.join(dir,'extended-verification.json'),JSON.stringify(report,null,2)+'\n');
const dirReject=(ob,g,d)=>(ev,a,b)=>{const [dx,dy]=R.D[d],member=ob.group(a,g)[0];return ev.moved.includes(g)&&!!member&&b[member.i].x-member.x===dx&&b[member.i].y-member.y===dy;};
async function run(name,eng,ob,reject=()=>false,goal=eng.isSolved,scope='full diamond goal'){
 assert(Object.hasOwn(expected,name),'Missing expected outcome: '+name);
 const r=await solver.solveWithAStar(R.restrict(eng,ob,reject,goal),{maxExpandedStates:cap});
 const row={name,scope,expected:expected[name],...r,verdict:r.status===expected[name]?'passed':['solved','unsolved'].includes(r.status)?'failed':'unknown'};
 if(r.status==='solved'){const w=R.replay(eng,ob,r.path,{reject,goal,requireIntact:true});row.ordinaryReplay=true;row.final=ob.snap(w.state);}
 report.checks.push(row);write();console.log(JSON.stringify({name,status:r.status,expanded:r.expanded,moves:r.moves,path:r.path}));return row;
}
function atStep(step){const s=e.cloneState(e.initialState);for(const d of v.solution.path.slice(0,step))assert(e.move(s,...R.D[d]).moved);return s;}
function hasEvent(eng,ob,s,predicate){for(const [d,delta]of Object.entries(R.D)){const t=eng.cloneState(s),a=ob.snap(s);if(eng.move(t,...delta).moved&&predicate(ob.event(a,ob.snap(t),...delta),a,ob.snap(t),d))return d;}return null;}
function walking(eng,ob,s){const todo=[{s:eng.cloneState(s),path:''}],seen=new Set([eng.stateKey(s)]),points=[];for(let i=0;i<todo.length;i++){const {s:t,path:p}=todo[i],a=ob.snap(t),pl=a.find(x=>x.type==='player'&&!x.removed&&x.z===0);assert(pl,'Walking region must retain a z0 player');points.push({cell:[pl.x,pl.y],path:p});for(const [d,delta]of Object.entries(R.D)){const next=eng.cloneState(t);if(!eng.move(next,...delta).moved||ob.moved(a,ob.snap(next)).length||!ob.snap(next).some(x=>x.type==='player'&&!x.removed&&x.z===0))continue;const k=eng.stateKey(next);if(!seen.has(k)){seen.add(k);todo.push({s:next,path:p+d});}}}return {points,count:points.length,gemByWalking:todo.some(q=>eng.isSolved(q.s))};}
(async()=>{
 for(const group of ['M0','M1','M3'])await run('freeze_'+group,e,o,ev=>ev.moved.includes(group));
 await run('forbid_tool_use',e,o,ev=>ev.use);
 await run('delivery_without_M1',e,o,ev=>ev.moved.includes('M1'),s=>e.isSolved(s)||o.delivered(o.snap(s)),'Declared delivery pose with player stance OR diamond; keeper frozen');
 for(const g of ['M0','M1'])for(const d of ['U','D','L','R'])await run('forbid_'+g+'_'+d,e,o,dirReject(o,g,d));
 const firstUseGoal=s=>e.isSolved(s)||!!hasEvent(e,o,s,ev=>ev.use);
 for(const [name,prep]of [['positive',()=>false],['without_tool_L',dirReject(o,'M0','L')],['without_keeper_motion',ev=>ev.moved.includes('M1')],['without_keeper_D',dirReject(o,'M1','D')],['without_keeper_U',dirReject(o,'M1','U')]])await run('first_use_'+name,e,o,(ev,a,b)=>ev.use||prep(ev,a,b),firstUseGoal,'A legal first declared lateral-use opportunity OR diamond; use transitions excluded throughout prefix');
 const advancesEast=s=>{const tool=o.group(o.snap(s),'M0');return e.isSolved(s)||(tool.length>0&&Math.min(...tool.map(a=>a.x))>3);};
 await run('eastward_progress_positive',e,o,()=>false,advancesEast,'Tool minimum x > its initial value 3 OR diamond; reversing the initial retreat does not meet this endpoint');
 await run('eastward_progress_without_keeper_D',e,o,dirReject(o,'M1','D'),advancesEast,'Tool minimum x > 3 OR diamond, with every keeper D excluded');
 const parked=s=>{const keeper=o.group(o.snap(s),'M1');return e.isSolved(s)||(keeper.length>0&&Math.min(...keeper.map(a=>a.y))>=9);};
 await run('keeper_parking_positive',e,o,()=>false,parked,'Keeper minimum y >= 9 OR diamond');
 await run('keeper_parking_without_tool_L',e,o,dirReject(o,'M0','L'),parked,'Keeper minimum y >= 9 OR diamond, with every tool L excluded');
 const withdrawn=s=>{const a=o.snap(s);return e.isSolved(s)||(Math.min(...o.group(a,'M3').map(a=>a.x))===12&&Math.min(...o.group(a,'M0').map(a=>a.y))<6);};
 await run('withdrawal_positive',e,o,()=>false,withdrawn,'Target at x12 and elbow top y < 6 OR diamond');
 await run('withdrawal_without_keeper_U',e,o,dirReject(o,'M1','U'),withdrawn,'Target at x12 and elbow top y < 6 OR diamond; every keeper U excluded');
 for(const step of [0,6,22,34,35,47,57,60,81]){
  const s=atStep(step),a=walking(e,o,s),snap=o.snap(s);report.controls.push({name:'frozen_walking_'+step,step,poses:snap,reachable:a,withdrawalStanceReachable:a.points.some(p=>p.cell[0]===9&&p.cell[1]===9)});write();
 }
 const post=atStep(35),postEngine={...e,initialState:post};
 await run('post_contact_all_groups_frozen',postEngine,o,ev=>ev.moved.length>0,postEngine.isSolved,'Diamond from witness step 35 only; all groups frozen');
 await run('post_contact_keeper_frozen',postEngine,o,ev=>ev.moved.includes('M1'),postEngine.isSolved,'Diamond from witness step 35 only; keeper frozen');
 await run('post_contact_tool_frozen',postEngine,o,ev=>ev.moved.includes('M0'),postEngine.isSolved,'Diamond from witness step 35 only; tool frozen');
 const delivered=atStep(34),before=o.snap(delivered),normal=e.cloneState(delivered),nm=e.move(normal,1,0),event=o.event(before,o.snap(normal),1,0);
 assert(nm.moved&&event.use);const tip=before.find(a=>a.group==='M0'&&a.x===10&&a.y===6);assert(tip);
 const cut=e.cloneState(delivered);cut.actorRemoved[tip.i]=1;const cutBefore=o.snap(cut),cm=e.move(cut,1,0),cutEvent=o.event(cutBefore,o.snap(cut),1,0);
 assert(cm.moved&&cutEvent.moved.includes('M0')&&!cutEvent.moved.includes('M3'));
 report.controls.push({name:'local_tip_removal',step:34,intervention:'Remove only M0 member [10,6,0] from the cloned delivery state; terrain, player, target, other members preserved. This is a local author-side control, not gameplay.',P:[7,8,0],I:[8,8,0],C:[10,6,0],T:[11,6,0],d:'R',normal:{before,after:o.snap(normal),event},cut:{before:cutBefore,after:o.snap(cut),event:cutEvent},scope:'The input still moves; the target no longer moves. Local contact function, not global shape minimality.'});write();
 for(const [label,walls]of [['side_notches',[[7,5],[8,5]]],['all_three_notches',[[4,5],[7,5],[8,5]]]]){
  const cells=spec.cells.map(r=>r.slice());for(const [x,y]of walls){assert.equal(cells[y][x],'#');cells[y][x]='.';}
  const altered=R.load(repo,cells),ae=altered.engine,ao=R.observer(ae,spec.contract);assert.deepEqual(o.snap(e.initialState),ao.snap(ae.initialState));
  const orig=e.cloneState(e.initialState),alt=ae.cloneState(ae.initialState),origBefore=o.snap(orig),altBefore=ao.snap(alt);
  const a=e.move(orig,1,0),b=ae.move(alt,1,0);
  assert(!a.moved&&b.moved,'Wall intervention must admit the blocked push');
  assert(['M0','M1'].every(g=>ao.event(altBefore,ao.snap(alt),1,0).moved.includes(g)));
  report.controls.push({name:'wall_probe_'+label,walls,prefix:'',action:'R',originalMoved:a.moved,alteredMoved:b.moved,original:o.event(origBefore,o.snap(orig),1,0),altered:ao.event(altBefore,ao.snap(alt),1,0),before:origBefore,alteredAfter:ao.snap(alt)});write();
  await run(label+'_without_tool_L',ae,ao,dirReject(ao,'M0','L'));
  await run(label+'_without_keeper_D',ae,ao,dirReject(ao,'M1','D'));
  await run(label+'_without_keeper_U',ae,ao,dirReject(ao,'M1','U'));
  if(label==='all_three_notches'){
   const os=e.cloneState(e.initialState),as=ae.cloneState(ae.initialState);for(const d of 'DDR'){assert(e.move(os,...R.D[d]).moved);assert(ae.move(as,...R.D[d]).moved);}
   const ob=o.snap(os),ab=ao.snap(as),om=e.move(os,0,-1),am=ae.move(as,0,-1);
   assert(!om.moved&&am.moved&&ao.event(ab,ao.snap(as),0,-1).moved.includes('M0'));
   report.controls.push({name:'wall_probe_initial_U',walls,prefix:'DDR',action:'U',originalMoved:om.moved,alteredMoved:am.moved,original:o.event(ob,o.snap(os),0,-1),altered:ao.event(ab,ao.snap(as),0,-1),before:ob,alteredAfter:ao.snap(as)});write();
  }
 }
 const pushes=v.trace.filter(r=>r.event.moved.length),runs=[];for(const p of pushes){const key=p.event.primary+':'+p.d+':'+p.event.moved.slice().sort().join(',');const last=runs.at(-1);if(last?.key===key){last.count++;last.lastStep=p.step;}else runs.push({key,count:1,firstStep:p.step,lastStep:p.step});}
 report.witnessSummary={inputs:v.solution.moves,pushes:pushes.length,walks:v.solution.moves-pushes.length,runs,compression:'Consecutive pushes after removing walks, same directly pushed group, direction, and affected group set. Counts are descriptive, not minimum decisions.'};
 report.overall=report.checks.some(c=>c.verdict==='failed')?'failed':report.checks.some(c=>c.verdict==='unknown')?'unknown':'passed';write();
 console.log(JSON.stringify({overall:report.overall,checks:report.checks.length,controls:report.controls.length}));if(report.overall!=='passed')process.exitCode=1;
})().catch(err=>{report.overall='error';report.error=err.stack;write();console.error(err);process.exitCode=1;});
