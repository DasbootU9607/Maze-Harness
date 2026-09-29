'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const {args,read,validate,load,observer,restrict,replay,stateRecord,initialAccess,D}=require('./runtime.cjs');
async function check(repo){
  const spec=read(path.join(__dirname,'../assets/gxf/spec.json')),w=read(path.join(__dirname,'../assets/gxf/witness.json'));
  validate(spec);const {engine:e,solver}=load(repo,spec.cells),o=observer(e,spec.contract);
  const base=replay(e,o,w.path,{requireIntact:true});assert(e.isSolved(base.state));
  assert.equal(base.rows.find(r=>r.delivered).step,w.expected.deliveryStep);
  assert.equal(base.rows.find(r=>r.event.moved.includes(spec.contract.roles.target)).step,w.expected.firstTargetMove);
  assert.deepEqual(base.rows.filter(r=>r.event.use).map(r=>r.step),w.expected.useSteps);
  assert.equal(initialAccess(e,o).alreadyUsable,false);
  const s=e.cloneState(e.initialState);for(const d of w.path.slice(0,210))assert(e.move(s,...D[d]).moved);
  const before=stateRecord(s),key=e.stateKey(s),limited=restrict(e,o,event=>event.moved.includes('M3'));
  assert.equal(limited.moveForSearch(s,0,1).moved,false);assert.deepEqual(stateRecord(s),before);assert.equal(e.stateKey(s),key);
  const snap=o.snap(s);assert(e.move(s,0,1).moved);assert(o.event(snap,o.snap(s),0,1).use,'Rejected move must remain legal on the original engine');
  const mapping={M0:'M4',M1:'M3',M2:'M1',M3:'M0'},renamed=structuredClone(spec);
  renamed.cells=renamed.cells.map(row=>row.map(t=>t.replace(/M[0-4]/g,id=>mapping[id])));
  renamed.contract.roles={tool:mapping.M0,helpers:[mapping.M1,mapping.M2],target:mapping.M3};
  validate(renamed);const r=load(repo,renamed.cells),ro=observer(r.engine,renamed.contract),rr=replay(r.engine,ro,w.path,{requireIntact:true});
  assert.deepEqual(rr.rows.filter(x=>x.event.use).map(x=>x.step),w.expected.useSteps);
  const rotated=structuredClone(spec),turn=([x,y])=>[15-y,x],turnDir={U:'R',D:'L',L:'U',R:'D'};
  rotated.cells=Array.from({length:16},()=>Array(16));
  spec.cells.forEach((row,y)=>row.forEach((t,x)=>{const [nx,ny]=turn([x,y]);rotated.cells[ny][nx]=t;}));
  rotated.contract.delivery.toolCells=rotated.contract.delivery.toolCells.map(turn);
  rotated.contract.delivery.playerCell=turn(rotated.contract.delivery.playerCell);rotated.contract.use.direction=turnDir[rotated.contract.use.direction];
  validate(rotated);const q=load(repo,rotated.cells),qo=observer(q.engine,rotated.contract);
  const qr=replay(q.engine,qo,[...w.path].map(d=>turnDir[d]).join(''),{requireIntact:true});
  assert.deepEqual(qr.rows.filter(x=>x.event.use).map(x=>x.step),w.expected.useSteps);
  const badToken=structuredClone(spec);badToken.cells[1][4]='i';assert.throws(()=>validate(badToken),/Unsupported token/);
  const badShape=structuredClone(spec);badShape.contract.delivery.toolCells=[[3,11],[3,12]];assert.throws(()=>validate(badShape),/reshape or rotate/);
  const badStance=structuredClone(spec);badStance.contract.delivery.playerCell=[9,9];assert.throws(()=>validate(badStance),/stance/);
  const open=structuredClone(spec);open.cells[0][7]='.';assert.throws(()=>validate(open),/closed wall/);
  const capped=await solver.solveWithAStar(e,{algorithm:'astar',maxExpandedStates:1});assert.equal(capped.status,'capped');
  console.log(JSON.stringify({passed:true,checks:['fixture ordinary/search parity','delivery and contact steps','rejected push rollback','role ID remapping','rotated layout and input directions','unsupported tokens','changed shape','invalid stance','open boundary','budget remains capped']},null,2));
}
if(require.main===module){const a=args();assert(a.repo,'Use --repo REPO');check(a.repo).catch(e=>{console.error(e.stack);process.exitCode=1;});}
module.exports={check};
