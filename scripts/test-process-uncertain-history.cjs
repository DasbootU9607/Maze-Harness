'use strict';
// An early verifier exception remains visible without certifying its input consumption.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const S=require('../tools/authoring-observatory/lib/store.cjs');
const {exportProcess}=require('./export-authoring-process.cjs');
const output=path.resolve(__dirname,'../outputs');fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,'uncertain-history-'));let counter=0;
function fixture({weakStatus='unknown',extraGap=false,tamper=false,finalStrong=true}={}){
 const run=S.createRun({root,id:'fixture-'+(++counter),title:'Uncertain history fixture'});
 const specFile=path.join(root,'spec-'+counter+'.json');
 const spec={title:'Fixture',cells:[['p','.'],['#','G']],contract:{fixture:true}};
 fs.writeFileSync(specFile,JSON.stringify(spec)+'\n');const candidate=S.captureSpec(run,specFile);
 function test(label,status,report,strong,code){
  const start=S.appendEvent(run,'command.started',{label,kind:'test',inputSha256:candidate.sha256},{candidateId:candidate.id});
  S.appendEvent(run,'command.completed',{commandEventId:start.id,code},{candidateId:candidate.id});
  const reportFile=path.join(root,'report-'+counter+'-'+label+'.json');fs.writeFileSync(reportFile,JSON.stringify(report)+'\n');
  S.addTest(run,{candidateId:candidate.id,status,label,scope:'Synthetic record fixture only.',binding:'exact',bindingBasis:strong?'report-fingerprints-and-command-boundaries':'command-boundaries-only',inputSha256:candidate.sha256,inputCellsSha256:candidate.cellsSha256,inputContractSha256:candidate.contractSha256,processExitCode:code,commandEventId:start.id,reportPath:S.saveArtifact(run,reportFile),reportSha256:S.hash(fs.readFileSync(reportFile)),checks:[]});
 }
 test('early-exception',weakStatus,{overall:weakStatus,error:'Contract incomplete'},false,weakStatus==='passed'?0:1);
 if(finalStrong)test('verified-final','passed',{overall:'passed',replayPassed:true,fingerprints:{cells:candidate.cellsSha256,contract:candidate.contractSha256},checks:[{name:'fixture',verdict:'passed'}]},true,0);
 if(extraGap)S.appendEvent(run,'capture.gap',{reason:'Synthetic missing operation'});
 S.appendEvent(run,'run.finished',{status:'complete'});S.updateManifest(run,{status:'complete'});
 if(tamper)fs.appendFileSync(path.join(run,candidate.specPath),' ');
 return {run,options:{caseId:'authored-uncertain-fixture',title:spec.title,skill:'fixture',expectedCellsSha256:candidate.cellsSha256,expectedContractSha256:candidate.contractSha256}};
}
for(const weakStatus of ['unknown','failed']){
 const f=fixture({weakStatus}),doc=exportProcess(f.run,f.options);
 assert.equal(doc.coverage.audit.status,'unknown');assert.equal(doc.coverage.audit.unknown,1);assert.equal(doc.coverage.audit.failed,0);
 const weak=doc.tests.find(t=>t.label==='early-exception');assert.equal(weak.status,weakStatus);
 assert.notEqual(weak.binding,'exact','An early report without fingerprints cannot be presented as independently exact');
 assert(!doc.edges.some(e=>e.from===weak.graphNodeId&&e.kind==='supports'),'Uncertain early history must not certify delivery');
 assert(doc.edges.some(e=>e.from===doc.tests.find(t=>t.label==='verified-final').graphNodeId&&e.kind==='supports'));
}
for(const opts of [{weakStatus:'passed'},{extraGap:true},{tamper:true},{finalStrong:false}]){
 const f=fixture(opts);assert.throws(()=>exportProcess(f.run,f.options),'Must reject '+JSON.stringify(opts));
}
console.log(JSON.stringify({status:'passed',acceptedUncertainNonpassingHistories:2,rejectedUnsafeHistories:4,output:root}));
