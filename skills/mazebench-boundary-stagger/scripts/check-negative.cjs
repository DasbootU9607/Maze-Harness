// Acceptance-boundary regressions. Uses official physics without creating drafts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify}=require('./verify.cjs'),{controls}=require('./controls.cjs');

function ordinaryBlockers(){
 const cells=Array.from({length:16},()=>Array(16).fill('.+#'));
 for(let x=2;x<=10;x++)cells[5][x]='.';
 for(const [x,y]of [[4,4],[7,4],[3,6],[4,6],[6,6],[7,6]])cells[y][x]='.';
 cells[5][2]='.+p';cells[5][4]='M0';cells[5][7]='M1';cells[5][10]='G';
 return {world:{version:'mazebench-build-world-v1',title:'Independent blockers negative control',
  world:{width:1,height:1},levels:[{id:'level_AxA',title:'Independent blockers',column:'A',row:'A',width:16,height:16,cells}]},
  contract:{profile:'planar-boundary-stagger',pair:['M0','M1']}};
}

async function check(repo,out){
 repo=path.resolve(repo);out=path.resolve(out);
 assert(!fs.existsSync(out),'Choose a fresh output directory; previous evidence is preserved');
 fs.mkdirSync(out,{recursive:true});
 const results=[],base=ordinaryBlockers();
 const save=(name,value)=>{const dir=path.join(out,name);fs.mkdirSync(dir);
  for(const [file,data]of Object.entries({'world.json':value.world,'contract.json':value.contract}))
   fs.writeFileSync(path.join(dir,file),JSON.stringify(data,null,2)+'\n');
  return dir;};
 async function reject(name,change,pattern,run=verify){
  const value=structuredClone(base);change(value);const dir=save(name,value);
  await assert.rejects(()=>run(repo,dir),pattern);
  results.push({name,status:'passed',observed:'Rejected invalid or unsupported input',evidence:name+'/contract.json'});
 }

 const independent=save('independent-blockers',base),r=await verify(repo,independent);
 assert.equal(r.solution.status,'solved');assert.equal(r.replayPassed,true);
 assert(r.checks.every(c=>c.verdict==='passed'));assert.equal(r.walkingVerdict,'passed');
 assert.equal(r.boundaryEvidence.status,'unknown');assert.equal(r.overall,'unknown');
 results.push({name:'Independent blockers do not establish boundary-stagger',status:'passed',
  observed:r.overall,solution:r.solution,evidence:'independent-blockers/verification.json'});

 for(const [name,token]of [['malformed-wall','.#'],['malformed-box','.M0'],['unsupported-void','+M0'],['unsupported-height','.+#+M0']])
  await reject(name,v=>{v.world.levels[0].cells[10][10]=token;},/Unsupported token/);
 await reject('extra-group',v=>{v.world.levels[0].cells[10][10]='M2';},/Additional or missing groups/);
 await reject('extra-room',v=>{v.world.levels.push(structuredClone(v.world.levels[0]));v.world.world.width=2;},/Single-room profile/);
 await reject('duplicate-direction-name',v=>{v.contract.directionChecks=[
  {name:'check_up',group:'M0',direction:'U'},{name:'check_up',group:'M1',direction:'U'}];},/Duplicate or reserved/);
 await reject('reserved-direction-name',v=>{v.contract.directionChecks=[{name:'no_offset',group:'M0',direction:'U'}];},/Duplicate or reserved/);
 await reject('walk-only-wall-probe',v=>{v.contract.wallProbes=[{
  name:'Walking through a removed wall is not a box mechanism',walls:[[2,4]],prefix:'',action:'U',primary:'M0',expectedGroups:['M0']}];},/Wall probe must enable a group push/,controls);

 const unrelated=structuredClone(base);
 unrelated.contract.preparationChecks=[{name:'Access to the second independent alcove',before:{group:'M1',direction:'U'},prepare:{group:'M0',direction:'U'}}];
 unrelated.contract.wallProbes=[{name:'Unused extra push into the ceiling',walls:[[4,3]],prefix:'RDRU',action:'U',primary:'M0',expectedGroups:['M0']}];
 const unrelatedResult=await verify(repo,save('unrelated-wall',unrelated));
 assert.equal(unrelatedResult.overall,'unknown');assert.equal(unrelatedResult.boundaryEvidence.status,'unknown');
 results.push({name:'Unrelated wall and preparation checks do not establish the mechanism',status:'passed',observed:unrelatedResult.overall,evidence:'unrelated-wall/verification.json'});

 const empty=await controls(repo,save('empty-controls',base));
 assert.equal(empty.overall,'unknown');results.push({name:'Empty controls',status:'passed',observed:empty.overall,evidence:'empty-controls/controls.json'});
 const capped=await verify(repo,save('capped-search',base),1);
 assert.equal(capped.solution.status,'capped');assert.equal(capped.overall,'unknown');
 assert(capped.checks.every(c=>c.status==='capped'&&c.verdict==='unknown'));
 results.push({name:'Search limit is not impossibility',status:'passed',observed:capped.overall,evidence:'capped-search/verification.json'});
 for(const cap of [0,-1,1.5,NaN])await assert.rejects(()=>controls(repo,independent,cap),/Cap must be a positive integer/);
 results.push({name:'Invalid controls budgets',status:'passed',observed:'Rejected zero, negative, fractional, and NaN budgets'});

 // A verified reference must still pass; negative-only checks could hide a checker
 // that rejects all inputs. Reports are generated in the requested output only.
 const example=path.resolve(__dirname,'../examples/official-staircase');
 const reference={world:JSON.parse(fs.readFileSync(path.join(example,'world.json'),'utf8')),
  contract:JSON.parse(fs.readFileSync(path.join(example,'contract.json'),'utf8'))};
 const positive=await verify(repo,save('positive-reference',reference));
 assert.equal(positive.overall,'passed');assert.equal(positive.replayPassed,true);
 results.push({name:'Official extraction positive control',status:'passed',observed:positive.overall,
  solution:positive.solution,evidence:'positive-reference/verification.json'});

 const summary={scope:'Planar paired-group acceptance checks; one ordinary-blocker negative control, malformed-input checks, and one official-extraction positive control. No model evaluation.',
  overall:'passed',checks:results};
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 return summary;
}
if(require.main===module){const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
 assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out FRESH_OUTPUT');
 check(get('--repo'),get('--out')).then(r=>console.log(JSON.stringify({overall:r.overall,checks:r.checks.length})))
  .catch(e=>{console.error(e);process.exitCode=1;});
}
module.exports={check};
