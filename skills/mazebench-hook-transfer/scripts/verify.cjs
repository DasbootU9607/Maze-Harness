const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
async function verify(repo,out,cap=300000){
 repo=path.resolve(repo);out=path.resolve(out);const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 const {getGame,getLevelState}=require(path.join(repo,'server/app'));
 global.window=global.window||{};require(path.join(repo,'public/maze-engine'));require(path.join(repo,'public/maze-solver'));
 const game=getGame(m.id),data=getLevelState(game,game.worldMap.byPosition.get('level_AxA'));
 const e=window.MazeEngine.createEngine(data),solve=window.MazeSolver.solveWithAStar;
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i],x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const signature=actors=>{const p=actors[0];return actors.map(a=>[a.x-p.x,a.y-p.y,a.z-p.z]);};
 assert.deepEqual(e.loadWarnings,[]);assert.equal(data.actors.filter(a=>a.type==='gem').length,1);
 assert.equal(data.actors.filter(a=>a.type==='player').length,1);
 const report={draft:m.id,warnings:e.loadWarnings,initial:snap(e.initialState),solution:await solve(e,{algorithm:'astar',maxExpandedStates:cap}),trace:[],coupled:[],restrictions:[]};
 if(report.solution.status==='solved'){
  const s=e.cloneState(e.initialState);
  for(const [i,d]of [...report.solution.path].entries()){
   const before=snap(s),p=before.find(a=>a.type==='player'),[dx,dy]=D[d];
   const primary=before.find(a=>a.group&&a.x===p.x+dx&&a.y===p.y+dy&&a.z===p.z);
   const move=e.move(s,dx,dy);assert(move.moved);
   const after=snap(s),groups=[...new Set(before.filter(a=>a.group&&
    (a.x!==after[a.i].x||a.y!==after[a.i].y||a.z!==after[a.i].z)).map(a=>a.group))];
   for(const group of ['M0','M1']){
    const old=before.filter(a=>a.group===group),now=after.filter(a=>a.group===group);
    assert(now.every(a=>!a.removed&&a.z===0),'Box removed or changed elevation');
    assert.deepEqual(signature(now),signature(old),'Rigid group shape changed');
   }
   const entry={step:i+1,d,primary:primary?.group??null,groups,before,after};
   report.trace.push(entry);if(groups.includes('M0')&&groups.includes('M1'))report.coupled.push(entry);
  }
  assert(e.isSolved(s));assert(snap(s).some(a=>a.type==='player'&&!a.removed));report.replayPassed=true;
 }
 // Each restriction deletes transitions from the unchanged official engine's
 // graph. It is an analysis, never a rule change in the delivered world.
 for(const rule of ['no_hook_motion','no_payload_motion','no_coupled_motion','no_rear_transfer']){
  const wrapped={...e,moveForSearch(s,dx,dy){
   const before=snap(s),player=before.find(a=>a.type==='player');
   const primary=before.find(a=>a.group&&!a.removed&&a.x===player.x+dx&&a.y===player.y+dy&&a.z===player.z);
   const rear=primary?.group==='M0'&&before.some(a=>a.group==='M1'&&!a.removed&&
    (a.x-player.x)*dx+(a.y-player.y)*dy<0);
   const r=e.moveForSearch(s,dx,dy);if(!r.moved)return r;
   const moved=new Set(r.moves.filter(a=>a.actorType==='weightless_box'&&
    (a.fromX!==a.toX||a.fromY!==a.toY||a.fromElevation!==a.toElevation))
    .map(a=>e.actorGroupIds[a.actorIndex]));
   const together=moved.has('M0')&&moved.has('M1');
   const reject=rule==='no_hook_motion'?moved.has('M0'):rule==='no_payload_motion'?moved.has('M1'):
    rule==='no_rear_transfer'?together&&rear:together;
   if(reject){e.undoMove(s,r);return {moved:false};}return r;
  }};
  report.restrictions.push({rule,...await solve(wrapped,{algorithm:'astar',maxExpandedStates:cap})});
 }
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({id:m.id,solution:report.solution,coupled:report.coupled.map(s=>({step:s.step,d:s.d,primary:s.primary})),restrictions:report.restrictions}));
 return report;
}
if(require.main===module){const a=process.argv.slice(2),get=(k,f)=>a.includes(k)?a[a.indexOf(k)+1]:f;
 assert(get('--out'),'Use --out DIRECTORY [--repo REPO] [--cap INTEGER]');
 verify(get('--repo',process.cwd()),get('--out'),Number(get('--cap',300000))).then(r=>{
  if(!r.replayPassed||!r.coupled.length||r.restrictions.some(x=>x.status!=='unsolved'))process.exitCode=1;
 }).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={verify};
