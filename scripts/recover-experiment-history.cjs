'use strict';

// Recover saved evidence only. Running this does not execute an experiment or
// rewrite an observer run. Paths below are relative to the experiment archive.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {hash} = require('./site-content.cjs');
const {exportProcess, sanitizeText} = require('./export-authoring-process.cjs');
const {buildLevel, engineFactory} = require('./process-previews.cjs');
const {thumbnailPath,rendererFingerprint} = require('./process-thumbnails.cjs');
const {checkRecovery} = require('./process-recovery.cjs');
const read = file => JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const clean = value => sanitizeText(value,[],16000);
const trials = [
  ['parallel-en-01/astra-boundary-stagger-r01','2fbbb5d092b8'],
  ['skills-ht-ct-01/astra-hook-transfer-r01','c59e9e846a22'],
  ['astra-six-20261026-120825/astra-constrained-transport-r01','156ff2570cf3'],
  ['astra-six-20261026-120825/astra-skating-cross-r01','8dd200de12b7'],
  ['astra-six-20261026-130854/astra-block-coordination-r01','0e24cc0f2923'],
  ['astra-six-20261026-130854/astra-bridge-convoy-r01','4f94be93c912'],
  ['astra-six-20261026-142650/astra-clear-ground-turning-r01','d19a75b0e3bd'],
  ['astra-six-20261026-142650/astra-enclosure-navigation-r01','244c0ba24d48'],
  ['parallel-en-auth-01/deepseek-boundary-stagger-r01','46b924adfc38'],
  ['skills-ht-ct-01/deepseek-hook-transfer-r01','3e5c9a02ab20'],
  ['parallel-en-01/qwen-boundary-stagger-r03','9f926a128dd5'],
  ['skills-ht-ct-01/qwen-hook-transfer-r01','e680f2fa65a5']
];
const excludedDirs = new Set(['engine','node_modules','.git','.codex','observer-runs','authoring-runs','original-sealed-run','profile','chrome-profile','user-data','Cache']);
const rootFields = new Set(['kind','status','overall','scope','result','solution','checks','fingerprints','replayPassed','route','witness','witnessLength','routeLength','routeProvenance','inputMethod','inputChannel','initial','frames','steps','timeline','checkpoints','final','crossCheck','goal','goalReached','resetRestored','probe','pushes','initialStops','south-dock','east-dock','align-brake','startedAt','finishedAt','completedAt','capturedAt','recordedAt','durationMs','durationSeconds','completed','failedAtStep','cause','fix','detail','supersededBy','preserved','change','reason','expectedChecks','addedGoal','source','limitation','limitations','finalGemsCollected','gemCollectedAtStep','keyLogLength','replay','expanded','discovered','cap','engineCommit','draftId','levelId']);
const privateKeys = /^(?:url|origin|playUrl|bodyText|environment|command|args|stdout|stderr|stack|video|screenshots|file|errorStack|body|authorization|apiKey|token|config|history)$/i;
function project(value, key='') {
  if(privateKeys.test(key)) return undefined;
  if(key==='path' && typeof value==='string' && !/^[UDLR]*$/.test(value)) return undefined;
  if(value===null || typeof value==='boolean' || typeof value==='number') return value;
  if(typeof value==='string') return clean(value);
  if(Array.isArray(value)) return value.map(v=>project(v)).filter(v=>v!==undefined);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[clean(k),project(v,k)]).filter(([,v])=>v!==undefined));
}
function reportProjection(data) {
  if(Array.isArray(data)) return {observations:project(data)};
  return Object.fromEntries(Object.entries(data).filter(([key])=>rootFields.has(key)).map(([key,value])=>[key,project(value,key)]).filter(([,v])=>v!==undefined));
}
function walk(dir, rel='') {
  return fs.readdirSync(path.join(dir,rel),{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!excludedDirs.has(e.name)?walk(dir,path.join(rel,e.name)):e.isFile()?[path.join(rel,e.name).replaceAll('\\','/')]:[]);
}
function namespace(document,prefix) {
  const ids=new Set();
  for(const key of ['nodes','candidates','tests','notes','resources','operations','replays','records']) for(const row of document[key]||[]) ids.add(row.id);
  const rewrite=(value,key='')=>{
    if(typeof value==='string') return key!=='eventId'&&ids.has(value)?prefix+'-'+value:value;
    if(Array.isArray(value))return value.map(v=>rewrite(v,key));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v,k)]));
    return value;
  };
  return rewrite(document);
}
function recover({experiments,observer,engine,site=path.resolve(__dirname,'../site')}) {
  const catalog=read(path.join(site,'data/catalog.json')), index={schemaVersion:1,cases:[]};
  const renderer=rendererFingerprint(site), createEngine=engineFactory(path.join(site,'runtime/maze-engine.js'));
  const write=(relative,value)=>{const file=path.join(site,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');};
  const preview=(candidate,caseId)=>{
    const level=buildLevel(engine,candidate,caseId);
    assert.equal(createEngine(level).loadWarnings.length,0);
    const bytes=Buffer.from(JSON.stringify(level,null,2)+'\n'),levelPath=`data/process-levels/${caseId}/${candidate.id}.json`;
    candidate.preview={levelPath,levelSha256:hash(bytes),cellsSha256:candidate.cellsSha256,status:'iteration'};
    candidate.preview.thumbnailPath=thumbnailPath(caseId,candidate,renderer);write(levelPath,bytes);
  };
  for(const [relative,suffix] of trials) {
    const trial=path.join(experiments,relative),entry=catalog.cases.find(c=>c.id.endsWith('-'+suffix));assert(entry?.process);
    const base=read(path.join(site,entry.process.data)),final=base.candidates.find(c=>c.id===base.finalCandidateId);
    const marker=read(path.join(trial,'authoring-session.json')),run=path.resolve(trial,marker.sessions['design.json']);
    const sourceIndex=read(path.join(run,'index.json')),events=fs.readFileSync(path.join(run,'events.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
    const recovery={schemaVersion:1,caseId:entry.id,publishedCellsSha256:final.cellsSha256,publishedContractSha256:final.contractSha256,scopeComplete:false,
      scope:'Supplement recovered from saved files. Original acceptance, source logs and usage totals are unchanged. Missing event times and unrecorded actions remain unknown.',sessions:[],items:[],audit:{primaryEvents:events.length,primaryRepresented:base.coverage.events.representedCount,
        directSkillReads:events.filter(e=>e.type==='resource.read'&&/SKILL\.md$/.test(e.details.path||e.details.sourcePath||'')).length,
        archivedSkillSnapshots:events.filter(e=>e.type==='skill.attached').length,unrecoverable:[]}};
    // Include all original design/test/read events, not only final revalidation.
    if(suffix==='46b924adfc38') {
      const dir=path.join(observer,'auto-20261024022133215-bc604d');
      const original=exportProcess(dir,{caseId:entry.id,title:entry.title,skill:entry.skill,expectedCellsSha256:final.cellsSha256,expectedContractSha256:final.contractSha256});
      const doc=namespace(original,'original'); delete doc.usage;
      for(const c of doc.candidates)preview(c,entry.id);
      // The original export's delivery node is a hash binding, not a historical deployment.
      doc.nodes.find(n=>n.kind==='delivery').label='Original final candidate matches the published map';
      recovery.sessions.push({id:'original',label:'Original construction session',eventsSha256:hash(fs.readFileSync(path.join(dir,'events.jsonl'))),document:doc});
    }
    const hashes=new Map();
    for(const e of events) {
      const visit=v=>{if(!v||typeof v!=='object')return; if(v.artifactPath&&fs.existsSync(path.join(run,v.artifactPath))) hashes.set(hash(fs.readFileSync(path.join(run,v.artifactPath))),e); Object.values(v).forEach(visit);}; visit(e.details);
      if(e.type==='test.completed') {const t=sourceIndex.tests.find(t=>t.id===e.details.id||t.id===e.details.testId);if(t?.reportPath&&fs.existsSync(path.join(run,t.reportPath)))hashes.set(hash(fs.readFileSync(path.join(run,t.reportPath))),e);}
    }
    const add=(file,data,options={})=>{
      const bytes=fs.readFileSync(path.join(trial,file)),sha=hash(bytes),id='recovered-'+sha.slice(0,16);
      if(recovery.items.some(i=>i.id===id))return;
      const event=hashes.get(sha),bound=event&&base.nodes.find(n=>n.eventId===event.id);
      let status=['passed','failed','unknown'].includes(data.overall||data.status)?data.overall||data.status:'neutral';
      if(/SUPERSEDED/.test(file))status='superseded';
      const kind=options.kind||(/playtest/.test(file)?'playtest':/publication/.test(file)?'publication':/note|intent|goals/.test(file)?'annotation':'report');
      const facts=[];
      const fact=(label,v)=>{if(v!==undefined&&v!==null)facts.push({label,value:clean(String(v))});};
      const checks=data.checks||[]; if(Array.isArray(checks)&&checks.length)fact('Checks',checks.length);
      const route=typeof data.route==='string'?data.route:data.route?.worldDirections||data.witness;
      if(route&&/^[UDLR]+$/.test(route)){fact('Recorded inputs',route.length);fact('Recorded route',route);}
      if(data.frames?.length)fact('Saved frames',data.frames.length);
      if(data.steps?.length)fact('Saved steps',data.steps.length);
      if(data.finalGemsCollected!==undefined)fact('Reported gems collected',data.finalGemsCollected);
      fact('Duration (ms)',data.durationMs??(data.durationSeconds===undefined?undefined:data.durationSeconds*1000));
      fact('Source status',data.overall||data.status);
      const timestamp=event?.at||data.startedAt||data.recordedAt||data.capturedAt||null;
      fact('Recorded time',timestamp||'Not provided; file modification time is not used.');
      const summary=options.summary||clean(data.scope||data.cause||data.detail||data.reason||data.change)||'Saved evidence recovered from the experiment archive. This file alone does not establish a new passed test or an additional map revision.';
      const attempt=file.match(/^playtest-(\d+)\//)?.[1];
      const label=options.label||(/FAILED/.test(file)?'Browser attempt failed':/SUPERSEDED/.test(file)?'Browser instrumentation corrected':kind==='playtest'?`Browser ${attempt?'attempt '+Number(attempt):'replay'}${route?' / '+route.length+' inputs':''}`:kind==='annotation'?'Saved author annotation':kind==='publication'?'Publication metadata repair':`Saved report: ${path.posix.basename(file)}`);
      const item={id,kind,label,summary,status,facts,source:{file,sha256:sha,recordedAt:timestamp,eventId:event?.id||null},afterNodeId:bound?.id||options.afterNodeId||'delivery-final',projection:reportProjection(data)};
      if(!event)item.facts.push({label:'Capture coverage',value:'Saved file exists, but no matching archived-file event was found in the selected run.'});
      recovery.items.push(item);return item;
    };
    const files=walk(trial);
    for(const file of files.filter(f=>/\.json$/.test(f)&&(/^(?:playtest[^/]*|probe-[^/]+|stops-[^/]+|explore-[^/]+|publication-repair-[^/]+|publication-metadata-[^/]+)\//.test(f)||/^(?:publication-attempt-\d+|publication-diagnostic|revision-\d+|initial-goals|design-intent|completion-note|delivery-note|design-note[^/]*|note-\d+)\.json$/.test(f)))) {
      if(/(?:original-publication|manifest\.json|token-usage|export\.json|replay\.json|browser-replay\.json)$/.test(file)&&!['9f926a128dd5','e680f2fa65a5'].includes(suffix))continue;
      const d=read(path.join(trial,file));
      const sha=hash(fs.readFileSync(path.join(trial,file)));
      // Reports already represented as formal tests or exact replays are not duplicated.
      if(base.replays.some(r=>r.sourceSha256===sha))continue;
      const archived=hashes.get(sha);
      // Keep saved report bodies as supplements even when the original timeline
      // already displayed their verdict; evidence is linked next to that event.
      if(!Object.keys(reportProjection(d)).length)continue;
      add(file,d);
    }
    if(suffix==='46b924adfc38') {
      for(const f of ['publication-playtest-01/playtest.json','publication2-playtest-01/playtest.json'])add(f,read(path.join(trial,f)),{kind:'playtest',label:f.includes('publication2')?'Final browser revalidation: 21 inputs':'Earlier browser revalidation: report lacks map hashes'});
      const dir=path.join(observer,'auto-20261024065411797-78a7c7'),log=fs.readFileSync(path.join(dir,'events.jsonl'));
      const es=log.toString().trim().split(/\r?\n/).map(JSON.parse);
      recovery.audit.additionalSession={events:es.length,eventsSha256:hash(log),reason:'Intermediate revalidation: the browser report lacks input fingerprints; retained as history, not acceptance.'};
      for(const e of es) {
        const id='recovered-revalidation-'+e.id, d=e.details||{};
        const facts=[{label:'Source event',value:e.id+' / '+e.type},{label:'Recorded time',value:e.at||'Not provided'}];
        const summary='Intermediate revalidation event recovered from its own saved journal. This is separate from the final acceptance run.';
        recovery.items.push({id,kind:'session',label:clean(d.label||d.goal||e.type),summary,status:'neutral',facts,source:{file:'intermediate-revalidation/events.jsonl',sha256:hash(log),recordedAt:e.at||null,eventId:e.id},afterNodeId:'original-delivery-final',projection:reportProjection(d)});
      }
    }
    if(suffix==='3e5c9a02ab20') {
      for(const f of ['attempts/001-jtarget/candidate.json','attempts/002-lateral-lift/candidate.json','attempts/003-staged-gate/candidate.json','attempts/006-token-normalization/design.pre-normalization.json']) {
        const d=read(path.join(trial,f)),item=add(f,d,{kind:'candidate',label:d.title||'Saved draft',summary:f.includes('normalization')?'Saved pre-normalization tokens. Six group labels were normalized before the final build; this is a syntax change.':'Earlier saved geometry. A complete ordered revision journal and passing mechanism test are not available for this draft.',afterNodeId:'event-e000001'});
        const id=item.id,cells=d.cells;
        item.candidate={id,graphNodeId:id,label:item.label,parentId:null,parentIds:[],cells,sha256:item.source.sha256,cellsSha256:hash(cells),contractSha256:hash(d.contract??null),origin:'historical',diff:{added:[],removed:[],changed:[]}};
        try{preview(item.candidate,entry.id);}catch(error){item.facts.push({label:'Preview unavailable',value:clean(error.message)});}
        item.facts.push({label:'Revision time and parent',value:'Not provided. Filename order is not asserted as a causal sequence.'});
      }
    }
    // Existing official-browser recordings, copied byte-for-byte (not newly played).
    const videos=suffix==='46b924adfc38'?['publication2-playtest-01/video']:suffix==='3e5c9a02ab20'?['playtest/005-final-3d/manual-full-goal.webm']:suffix==='e680f2fa65a5'?['playtest-01/video/playtest-session.webm']:[];
    for(const prefix of videos) {
      const f=files.find(f=>f.startsWith(prefix)&&f.endsWith('.webm'));if(!f)continue;
      const target=suffix==='46b924adfc38'?'publication2-playtest-01/playtest.json':suffix==='3e5c9a02ab20'?'playtest/005-final-3d/playtest.json':'playtest-01/replay.json';
      const item=recovery.items.find(i=>i.source.file===target)||add(target,read(path.join(trial,target)),{kind:'playtest'});
      const bytes=fs.readFileSync(path.join(trial,f)),sha=hash(bytes),asset=`assets/process-evidence/${entry.id}/${sha}.webm`;write(asset,bytes);
      item.media=[{path:asset,sha256:sha,type:'video',label:'Original recorded browser video'}];
    }
    if(suffix==='9f926a128dd5') {
      recovery.audit.unrecoverable.push('Saved browser reports contain player positions and per-step actor-match booleans, not complete actor arrays or a video. They are displayed as reports, not fabricated animated replays.');
      for(const item of recovery.items.filter(i=>/playtest-02\//.test(i.source.file))) {item.status='superseded';item.summary='Superseded instrumentation: the gem counter used concat(Set), so gem collection was not established by this attempt. See the corrected third and fourth attempts.';}
    }
    if(suffix==='e680f2fa65a5')recovery.audit.unrecoverable.push('The author note describes an earlier geometry change, but no snapshot of that earlier geometry was found. Formal v001 to v002 changes direction notation only.');
    const clientRun=suffix==='46b924adfc38'?path.join(observer,'auto-20261024022133215-bc604d'):run;
    const clientEvents=suffix==='46b924adfc38'?fs.readFileSync(path.join(clientRun,'events.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse):events;
    const clientBase=suffix==='46b924adfc38'?recovery.sessions[0].document:base;
    const client=require('./recover-client-tools.cjs').recoverClientTools({run:clientRun,trial,events:clientEvents,base:clientBase});
    recovery.items.push(...client.items);
    recovery.audit.client={status:client.status,toolCalls:client.items.length,skillReadRequests:client.items.filter(i=>i.kind==='read'&&i.projection.files.includes('SKILL.md')).length,sources:client.sources||[],scope:client.scope||'No client evidence available'};
    recovery.audit.unrecoverable.push('Uninstrumented reads, overwritten transient drafts, model-internal processing and complete per-stage time/token attribution cannot be recovered from these files.');
    if(!recovery.audit.directSkillReads)recovery.audit.unrecoverable.push(recovery.audit.client.skillReadRequests?'The observer has no direct SKILL.md read event; recovered client read requests are shown separately from verified resource deliveries.':'No direct SKILL.md read event or client read request was identified; an attached snapshot does not prove reading.');
    checkRecovery(site,base,recovery);
    const data=`data/process-recovery/${entry.id}.json`;write(data,recovery);
    index.cases.push({caseId:entry.id,data,sha256:hash(fs.readFileSync(path.join(site,data)))});
    console.log(JSON.stringify({case:entry.title,sessions:recovery.sessions.length,items:recovery.items.length}));
  }
  write('data/process-recovery/index.json',index);return index;
}
module.exports={recover,reportProjection,namespace};
if(require.main===module){const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2)options[args[i].replace(/^--/,'')]=path.resolve(args[i+1]);recover(options);}
