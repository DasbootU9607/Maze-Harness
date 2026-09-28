// Deterministic regression of fixtures and the untouched, full official room.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs'),{D}=require('./runtime.cjs'),{verify}=require('./verify.cjs');
async function check(repo,out){
 repo=path.resolve(repo);out=path.resolve(out);fs.mkdirSync(out,{recursive:true});
 const report={examples:[],official:null};
 for(const name of ['official-staircase','pocket-shutter','twin-tee']){
  const dir=path.resolve(__dirname,'../examples',name),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
  const world=read('world.json'),contract=read('contract.json'),target=path.join(out,name);
  saveDraft(repo,target,{title:world.title,cells:world.levels[0].cells,scenario:name,contract});
  const r=await verify(repo,target);assert.equal(r.overall,'passed');
  report.examples.push({name,solution:r.solution,replay:r.replayPassed,firstGoalOpening:r.firstGoalOpening,overall:r.overall});
 }
 const {getGame,getLevelState}=require(path.join(repo,'server/app'));
 const game=getGame('maze'),level=game.worldMap.byPosition.get('level_HxH');
 assert.equal(level.fileName,'mygl8anih8.txt','Upstream reference identity changed; inspect before updating evidence');
 const e=window.MazeEngine.createEngine(getLevelState(game,level));assert.deepEqual(e.loadWarnings,[]);
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i]||null,x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const official={room:'level_HxH',file:'games/maze/levels/mygl8anih8.txt',initial:snap(e.initialState),
  solution:await window.MazeSolver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:300000}),trace:[]};
 assert.equal(official.solution.status,'solved');const s=e.cloneState(e.initialState);
 for(const [i,d]of [...official.solution.path].entries()){
  const before=snap(s);assert(e.move(s,...D[d]).moved);const after=snap(s);
  official.trace.push({step:i+1,d,before,after,groups:[...new Set(before.filter(a=>a.group&&(a.x!==after[a.i].x||a.y!==after[a.i].y||a.z!==after[a.i].z)).map(a=>a.group))]});
 }assert(e.isSolved(s));official.replayPassed=true;
 fs.writeFileSync(path.join(out,'official-full.json'),JSON.stringify(official,null,2)+'\n');
 report.official={room:official.room,solution:official.solution,replay:official.replayPassed};
 report.overall='passed';fs.writeFileSync(path.join(out,'regression.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module){const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];assert(args.includes('--repo')&&args.includes('--out'),'Use --repo ENGINE --out FRESH_OUTPUT');
 check(get('--repo'),get('--out')).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={check};
