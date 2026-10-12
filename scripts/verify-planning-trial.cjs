'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load,hash}=require('../skills/mazebench-hook-transfer/scripts/complex-runtime.cjs');
const gate=require('./verify-authored-gates.cjs');
const lab=require('./authored-gate-runtime.cjs');
const root=path.resolve(__dirname,'..');
async function verify(repo,spec,skill,cap=100000,timeMs=60000){
 let report;
 if(spec.contract.profile==='authored-planar-gate-planning-v1')report=await gate.verify(repo,spec,{cap,timeMs});
 else {
  assert(['hook-transfer','constrained-transport'].includes(skill));
  const skillRoot=path.join(root,'skills','mazebench-'+skill);
  report=await require(path.join(skillRoot,'scripts/verify-complex.cjs')).verify(repo,spec,skillRoot,cap);
  if(report.overall==='passed'){
   const {engine:e}=load(repo,spec.cells),o=lab.observer(e,spec.contract.goal);
   report.branches=await gate.branchChecks(e,o,spec,spec.contract.branchControls,{cap,timeMs});
   if(report.branches.some(b=>b.verdict!=='passed'))report.overall=report.branches.some(b=>b.verdict==='failed')?'failed':'unknown';
  }
 }
 report.verifierSources=Object.fromEntries(['scripts/verify-planning-trial.cjs','scripts/verify-authored-gates.cjs','scripts/authored-gate-runtime.cjs',...spec.contract.profile==='authored-planar-gate-planning-v1'?[]:['skills/mazebench-'+skill+'/scripts/verify-complex.cjs','skills/mazebench-'+skill+'/scripts/complex-runtime.cjs']].map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
 return report;
}
if(require.main===module){const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
 assert(get('--repo')&&get('--spec')&&get('--out')&&get('--skill'));
 const out=path.resolve(get('--out'));assert(!fs.existsSync(out),'Choose a fresh report');
 verify(path.resolve(get('--repo')),JSON.parse(fs.readFileSync(get('--spec'),'utf8')),get('--skill'),Number(get('--cap')||100000),Number(get('--time-ms')||60000)).then(report=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({overall:report.overall,checks:report.checks?.length,branches:report.branches?.length,error:report.error}));if(report.overall!=='passed')process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1;});
}
module.exports={verify};
