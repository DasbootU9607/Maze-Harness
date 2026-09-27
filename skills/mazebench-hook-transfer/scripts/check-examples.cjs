// A bounded local authoring regression. No model or benchmark run is launched.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {build,cases}=require('./build-example.cjs');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out FRESH_OUTPUT');
const repo=path.resolve(get('--repo')),out=path.resolve(get('--out')),root=path.resolve(__dirname,'..');
assert(!fs.existsSync(out),'Choose a fresh output directory');fs.mkdirSync(out,{recursive:true});
const cap=300000,read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const report={scope:'Fresh local drafts; official solves, ordinary move replays, and case-specific restrictions. No browser rerun or model evaluation.',
 engine:{baseline:'07aa03a5c0ee8b4e0b025a52793055e89cb68bfe',node:process.version,files:{}},cases:[],controls:[],officialTests:[]};
for(const name of ['public/maze-engine.js','public/maze-solver.js','games/maze/level_parsing.json','games/maze/toolbox.json'])
 report.engine.files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex');
function run(script,extra,log,expected=0,cwd=root){
 const r=spawnSync(process.execPath,[script,...extra],{cwd,encoding:'utf8',maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(out,log),r.stdout+'\n'+r.stderr);
 assert.equal(r.status,expected,'Check failed: '+path.basename(script)+'; see local output '+log);
}
function compact(r){return {solution:r.solution,replayPassed:r.replayPassed===true,
 checks:(r.checks||r.restrictions||[]).map(({rule,status,expanded,verdict,endpoint,replayPassed})=>({rule,status,expanded,verdict,endpoint,replayPassed})),
 overall:r.overall||((r.replayPassed&&r.restrictions.every(x=>x.status==='unsolved'))?'passed':'unknown')};}
const expectedMoves=[10,30,25,12,12,27,17,17];
for(const [i,name]of cases.entries()){
 const target=path.join(out,name);build(name,repo,target);
 const script=i<3?'scripts/verify.cjs':i<5?'scripts/verify-structures.cjs':
  name==='side-reach'?'scripts/verify-contact.cjs':`examples/${name}/verify.cjs`;
 run(script,['--repo',repo,'--out',target,'--cap',String(cap)],name+'.log');
 const r=read(path.join(target,'verification.json'));assert.equal(r.solution.moves,expectedMoves[i]);
 const row={case:name,...compact(r)};assert.equal(row.overall,'passed');report.cases.push(row);
 const evidence={case:name,cap,...row,initial:r.initial,phases:r.phases,
  event:r.event||r.trace?.find(x=>x.flags?.rearTransfer||x.flags?.event),
  dockedStand:r.dockedStand||r.dockedStandReachability,directStands:r.directStands||r.directPushStand,
  frozenBefore:r.frozenBefore,frozenAfter:r.frozenAfter,
  boundaryPositiveControl:r.boundaryPositiveControl||r.firstRearBoundaryControl};
 fs.writeFileSync(path.join(target,'public-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log(name+': solve, replay, and scoped restrictions passed');
}
const side=path.join(out,'side-reach'),sideScript='scripts/verify-contact.cjs';
run(sideScript,['--repo',repo,'--out',side,'--cap','300000','--report','contrast.json','--contrast-no-rear'],'side-contrast.log');
const contrast=read(path.join(side,'contrast.json'));assert.equal(contrast.overall,'passed');
assert(contrast.checks.some(x=>x.rule==='no_rear'&&x.status==='solved'));
assert(!read(path.join(side,'verification.json')).checks.some(x=>x.rule==='no_rear'));
report.controls.push({check:'No implicit prohibition on rear transfer; opt-in side comparison solves and replays',status:'passed'});
run(sideScript,['--repo',repo,'--out',side,'--cap','1','--report','cap1.json'],'side-cap1.log',1);
assert.equal(read(path.join(side,'cap1.json')).overall,'unknown');
const cantilever=path.join(out,'cantilever-key');
run('examples/cantilever-key/verify.cjs',['--repo',repo,'--out',cantilever,'--cap','1'],'cantilever-cap1.log',1);
assert.equal(read(path.join(cantilever,'verification-cap1.json')).overall,'unknown');
report.controls.push({check:'Side and cantilever cap=1 reports are unknown',status:'passed'});
run('examples/cantilever-key/controls.cjs',['--repo',repo,'--out',cantilever],'cantilever-controls.log');
const controls=read(path.join(cantilever,'controls.json'));assert.equal(controls.overall,'passed');
report.controls.push({check:'Cantilever local tip function, collinear negative control, deadlock and Undo replay',status:'passed',
 partConclusions:controls.conclusions,deadlock:controls.deadlock.search,undo:controls.undo.recovery});
// Confirm that a rear task cannot accidentally inherit the side-plate contract.
const invalid=path.join(out,'incompatible-contract');fs.mkdirSync(invalid);
fs.copyFileSync(path.join(side,'manifest.json'),path.join(invalid,'manifest.json'));
const c=read(path.join(side,'contract.json'));c.pattern='active-rear-task';c.eventKind='rearTransfer';
fs.writeFileSync(path.join(invalid,'contract.json'),JSON.stringify(c));
run(sideScript,['--repo',repo,'--out',invalid],'contract-scope.log',1);
assert(fs.readFileSync(path.join(out,'contract-scope.log'),'utf8').includes('supports only the active-side-reach plate contract'));
report.controls.push({check:'Side-specific validator rejects an incompatible rear contract',status:'passed'});
for(const name of ['weightless-push','maze-solver','maze-levels-author']){
 run(path.join(repo,'tests',name+'.test.js'),[],name+'.log',0,repo);
 report.officialTests.push({name,status:'passed'});
}
report.overall='passed';
fs.writeFileSync(path.join(out,'publication-check.json'),JSON.stringify(report,null,2)+'\n');
console.log('All eight examples and scoped controls passed.');
