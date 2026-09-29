'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {args,read,digest,validate,load,observer,restrict,replay,initialAccess}=require('./runtime.cjs');
async function verify(repo,out,cap=1000000,reportName='verification.json'){
  repo=path.resolve(repo);out=path.resolve(out);
  assert(Number.isInteger(cap)&&cap>0,'Positive integer cap required');
  assert(reportName===path.basename(reportName)&&/\.json$/.test(reportName),'Report must be a JSON basename');
  const reportFile=path.join(out,reportName);assert(!fs.existsSync(reportFile),'Report exists; select a new --report name');
  const manifest=read(path.join(out,'manifest.json')),world=read(path.join(out,'world.json')),c=read(path.join(out,'contract.json'));
  assert(world.world.width===1&&world.world.height===1&&world.levels.length===1,'Single room only');
  const spec=validate({title:world.title,cells:world.levels[0].cells,contract:c}),cells=spec.cells;
  assert(/^draft-transport-[a-f0-9]{10}$/.test(manifest.id),'Unexpected draft ID');
  const draftDir=path.join(repo,'games',manifest.id);
  assert.deepEqual(read(path.join(draftDir,'level_parsing.json')),read(path.join(repo,'games/maze/level_parsing.json')),'Draft parsing differs from the official rules used by this verifier');
  assert.deepEqual(read(path.join(draftDir,'world_map.json')).levels,{'level_AxA.txt':['A','A']},'Draft must still contain exactly the declared room');
  assert.deepEqual(read(path.join(draftDir,'world_parsing.json')).rules.world_size,[1,1],'Draft world size changed');
  const raw=fs.readFileSync(path.join(draftDir,'levels/level_AxA.txt'),'utf8');
  assert.deepEqual(raw.trimEnd().split(/\r?\n/).map(r=>r.split(' ')),cells,'Draft changed; rebuild a fresh output from the current cells');
  assert.equal(digest(cells),manifest.cellsSha256,'Manifest and cells differ');
  const {engine:e,solver}=load(repo,cells),o=observer(e,c),initial=o.snap(e.initialState);
  const fingerprints={cells:digest(cells),contract:digest(c)};
  for(const name of ['public/maze-engine.js','public/maze-solver.js','server/maze-levels.js','games/maze/level_parsing.json'])fingerprints[name]=digest(fs.readFileSync(path.join(repo,name),'utf8'));
  const report={profile:c.profile,fingerprints,cap,roles:c.roles,initial,initialAccess:initialAccess(e,o),checks:[],trace:[],witnessFailures:[]};
  const solve=async(engine,label)=>{const start=performance.now();const r=await solver.solveWithAStar(engine,{algorithm:'astar',maxExpandedStates:cap});const result={...r,milliseconds:Math.round(performance.now()-start)};console.log(JSON.stringify({check:label,status:r.status,expanded:r.expanded,moves:r.moves??null}));return result;};
  report.solution=await solve(e,'ordinary_goal');
  if(report.initialAccess.alreadyUsable)report.witnessFailures.push('Initial object poses permit tool use after walking only');
  if(report.initialAccess.gemByWalking)report.witnessFailures.push('Gem initially reachable without moving groups');
  if(o.delivered(initial))report.witnessFailures.push('Initial state already meets delivery');
  if(report.solution.status==='solved'){
    const witness=replay(e,o,report.solution.path,{requireIntact:true});report.trace=witness.rows;report.replayPassed=true;
    const delivery=report.trace.find(r=>r.delivered),target=report.trace.find(r=>r.event.moved.includes(c.roles.target));
    const independent=report.trace.filter(r=>delivery&&r.step<delivery.step&&r.event.independentHelpers.length);
    report.witness={deliveryStep:delivery?.step??null,firstTargetMove:target?.step??null,useSteps:report.trace.filter(r=>r.event.use).map(r=>r.step),independentPreparationSteps:independent.map(r=>({step:r.step,groups:r.event.independentHelpers})),pushInputs:report.trace.filter(r=>r.event.moved.length).length,walkingInputs:report.trace.filter(r=>!r.event.moved.length).length,final:o.snap(witness.state)};
    if(!delivery)report.witnessFailures.push('This solved witness never reaches the declared delivery pose and stance');
    if(!delivery||!target||delivery.step>=target.step||!target.event.use)report.witnessFailures.push('First target motion must follow delivery and match tool use');
    if(!independent.length)report.witnessFailures.push('No helper independently repositioned before delivery');
  }
  async function excluded(name,reject,goal=e.isSolved,scope='full gem goal'){
    const result=await solve(restrict(e,o,reject,goal),name);
    const entry={name,scope,...result,verdict:result.status==='unsolved'?'passed':result.status==='solved'?'failed':'unknown'};
    if(result.status==='solved'){
      const counterexample=replay(e,o,result.path,{reject,goal});entry.replayPassed=true;
      entry.endpoint=e.isSolved(counterexample.state)?'gem':'declared-delivery';entry.final=o.snap(counterexample.state);
    }
    report.checks.push(entry);
  }
  for(const g of [c.roles.tool,...c.roles.helpers,c.roles.target])await excluded('freeze_'+g,event=>event.moved.includes(g));
  await excluded('forbid_tool_use',event=>event.use);
  const prefixGoal=s=>e.isSolved(s)||o.delivered(o.snap(s));
  for(const g of c.roles.helpers)await excluded('delivery_without_'+g,event=>event.moved.includes(g),prefixGoal,'declared delivery pose + player stance OR gem; group frozen throughout this prefix');
  const statuses=report.checks.map(c=>c.verdict);
  report.overall=report.solution.status==='unsolved'||report.witnessFailures.length||statuses.includes('failed')?'failed':!report.replayPassed||statuses.includes('unknown')?'unknown':'passed';
  report.scope='Only the declared planar profile and exact transition exclusions. Witness order is not uniqueness; frozen groups do not prove directional order; caps are unknown; the declared delivery pose is not every possible working pose.';
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(require.main===module){
  const a=args();assert(a.repo&&a.out,'Use --repo REPO --out OUTPUT [--cap N] [--report FILE.json]');
  verify(a.repo,a.out,Number(a.cap||1000000),a.report||'verification.json').then(r=>{
    console.log(JSON.stringify({overall:r.overall,moves:r.solution.moves??null,witness:r.witness,witnessFailures:r.witnessFailures,checks:r.checks.map(c=>({name:c.name,verdict:c.verdict,expanded:c.expanded}))}));
    if(r.overall!=='passed')process.exitCode=1;
  }).catch(e=>{console.error(e.stack);process.exitCode=1;});
}
module.exports={verify};
