'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('../skills/mazebench-hook-transfer/scripts/complex-runtime.cjs');
const lab=require('./authored-gate-runtime.cjs');
const {validate,matches}=require('./verify-authored-gates.cjs');
const args=process.argv.slice(2),repo=args[args.indexOf('--repo')+1];assert(args.includes('--repo'));
const blank=()=>Array.from({length:16},()=>Array(16).fill('#'));
async function main(){
 const cells=blank();for(let y=2;y<=4;y++)for(let x=1;x<=5;x++)cells[y][x]='.';
 cells[3][1]='p';cells[3][2]='M0';cells[3][3]='g';cells[3][4]='g';
 const {engine:e}=load(repo,cells),o=lab.observer(e,{kind:'reach',cell:[3,3,0]});
 const state=lab.replay(e,o,'RR').state,w=lab.walking(e,o,state);
 const leave=w.queue.find(n=>same(o.point(o.snap(n.state).find(a=>a.type==='player')),[3,4,0]));
 assert(leave,'The player can leave the vacated gate onto floor');
 assert(!w.component.includes(e.stateKey(leave.state)),'One-way gate exit was falsely merged into a walking SCC');
 assert(!lab.walking(e,o,leave.state).queue.some(n=>same(o.point(o.snap(n.state).find(a=>a.type==='player')),[3,3,0])),'Frozen walking returned through an unoccupied gate');
 const plain=[e.cloneState(e.initialState)],seen=new Set([e.stateKey(plain[0])]);let found=false;
 for(let i=0;i<plain.length;i++){const s=plain[i];if(o.goal(s)){found=true;break;}for(const v of Object.values(lab.D)){const q=e.cloneState(s);if(!e.move(q,...v).moved||!o.valid(q))continue;const key=e.stateKey(q);if(!seen.has(key)){seen.add(key);plain.push(q);}}assert(plain.length<10000);}
 const collapsed=await lab.search(e,o,{cap:10000,timeMs:10000});assert.equal(collapsed.status==='solved',found);lab.replay(e,o,collapsed.path);
 const bridge=blank();for(let x=1;x<=5;x++)bridge[2][x]='.';bridge[2][1]='p';bridge[2][2]='f';bridge[2][3]='+';
 const b=load(repo,bridge).engine,bo=lab.observer(b,{kind:'reach',cell:[4,2,0]});const replay=lab.replay(b,bo,'RRR');
 assert(replay.rows[0].event.removed.length===1);assert.notEqual(b.initialState.terrain[b.cellIndex(3,2)],replay.state.terrain[b.cellIndex(3,2)]);
 const directory=path.resolve(__dirname,'../trials/planning-batch');
 const enclosure=JSON.parse(fs.readFileSync(path.join(directory,'open-circuit/authored-design.json'),'utf8'));validate(enclosure);
 assert.throws(()=>validate({...enclosure,cells:enclosure.cells.map((r,y)=>r.map((t,x)=>x===4&&y===4?'g+M0':t))}));
 const en=load(repo,enclosure.cells).engine,eo=lab.observer(en,enclosure.contract.goal);lab.replay(en,eo,enclosure.witness);
 const complete=await lab.search(en,eo,{cap:2000,timeMs:20000});assert.equal(complete.status,'solved');lab.replay(en,eo,complete.path);
 const convoy=JSON.parse(fs.readFileSync(path.join(directory,'last-plank/authored-design.json'),'utf8'));const ce=load(repo,convoy.cells).engine,co=lab.observer(ce,convoy.contract.goal);
 const cr=lab.replay(ce,co,convoy.witness);assert(matches(cr.rows[18].event,{kind:'joint',groups:['M0','F4']}));assert(!matches(cr.rows[0].event,{kind:'joint',groups:['M0','F4']}));
 console.log(JSON.stringify({passed:true,checks:['directed-gate-SCC','ordinary-BFS-positive-control','bridge-consumption-parity','unsupported-profile-rejection','full-enclosure-regression','real-convoy-contact']}));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
main().catch(e=>{console.error(e);process.exitCode=1;});
