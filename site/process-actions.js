// Read-only projection. Source records and saved map artifacts are never edited.
export const ACTION_SCHEMA = 'maze-build-actions/1';
export const actionNames = {
  read:'Read file', design:'Design note', version:'Save map version', build:'Build map',
  solve:'Solver search', 'solve-report':'Saved solver result', diagnose:'Diagnostic', verify:'Verification', play:'Playtest',
  visual:'Visual review', feedback:'Review feedback', method:'Update method', memory:'Record experience',
  transfer:'Transfer evaluation', decision:'Choose or revert', publish:'Publication', gap:'Capture gap'
};
const lists={candidate:'candidates',test:'tests',resource:'resources',note:'notes',operation:'operations',replay:'replays',record:'records'};
const explicit={
  'visual.review':'visual','feedback.received':'feedback','feedback.applied':'feedback',
  'method.updated':'method','skill.updated':'method','memory.written':'memory','memory.read':'memory',
  'transfer.evaluated':'transfer','branch.selected':'decision','revision.reverted':'decision','run.stopped':'decision'
};
export function normalizeProcess(data) {
  const nodes=new Map(data.nodes.map(n=>[n.id,n])),records=new Map();
  for(const [kind,list] of Object.entries(lists)) for(const record of data[list]||[]) records.set(record.graphNodeId,{...record,recordKind:kind});
  const actions=[],owner=new Map(),context=new Map(),sources=data.nodes.map(n=>n.id);
  const record=id=>records.get(id),node=id=>nodes.get(id);
  const related=id=>{
    const r=record(id);return [r?.relatedNodeId,r?.startNodeId,r?.resultNodeId].filter(id=>nodes.has(id));
  };
  const typeOf=(n,r)=>{
    if(explicit[n.eventType])return explicit[n.eventType];
    if(n.kind==='candidate')return 'version';
    if(n.kind==='resource')return r?.delivery==='recorded-read'&&r?.origin!=='historical'?'read':null;
    if(n.kind==='note')return 'design';
    if(n.kind==='delivery')return 'publish';
    if(n.eventType==='capture.gap')return 'gap';
    if(n.kind==='test'){
      if(/solve|search|explorat/i.test(r?.label||''))return 'solve';
      if(r?.category==='diagnostic'||/^(diagnostic|probe)[-.]/i.test(r?.label||''))return 'diagnose';
      if(/browser|playtest|rendered/i.test(r?.label||'')||/^(Actual (?:local Play|keyboard)|Author-guided automated browser|Author self-play|One rendered room|Official browser)/i.test(r?.scope||''))return 'play';
      return 'verify';
    }
    if(n.kind==='operation'){
      if(r?.resultNodeId)return null;
      if(r?.kind==='build')return 'build';
      if(/solve|search|explorat/i.test(r?.label||''))return 'solve';
      if(/probe|diagnos|inspect.*(?:layout|obstruction|state|contact|route)/i.test(r?.label||''))return 'diagnose';
    }
    return null;
  };
  const add=(n,type,{label,summary,basis='observed',candidateId}={})=>{
    const r=record(n.id),action={id:n.id,sourceNodeId:n.id,type,label:label||actionNames[type],summary:summary||n.summary||'',
      status:n.status||'unknown',candidateId:candidateId??r?.candidateId??(n.kind==='candidate'?r?.id:null)??n.details?.candidateId??null,
      order:n.order,evidenceIds:[n.id],contextIds:[],basis,association:'source-record',recordedAt:r?.recovery?.source?.recordedAt||null};
    actions.push(action);owner.set(n.id,action.id);return action;
  };
  for(const n of data.nodes){
    const r=record(n.id),type=typeOf(n,r);if(!type)continue;
    const label=type==='read'?`Read ${r.basename||r.displayPath}`:type==='design'?'Record design note':type==='version'?`Map version ${r.id}`:type==='publish'?'Published map binding':
      ['solve','diagnose','build','verify','play'].includes(type)?`${actionNames[type]}${r?.label&&!/\.cjs$|^node$/.test(r.label)?' · '+r.label.replaceAll('-',' '):''}`:n.label;
    add(n,type,{label,basis:type==='design'?'agent-stated':r?.origin==='historical'||n.recoveryKind==='candidate'?'saved-artifact':'observed'});
  }
  const actionById=()=>new Map(actions.map(a=>[a.id,a]));
  // Recorded command identities connect start/completion/report. A shared map
  // or adjacent timestamp alone is not an operation identity.
  for(const operation of data.operations||[])if(operation.resultNodeId&&owner.has(operation.resultNodeId)){
    const id=owner.get(operation.resultNodeId);owner.set(operation.graphNodeId,id);
    if(operation.startNodeId)owner.set(operation.startNodeId,id);
  }
  for(let pass=0;pass<3;pass++)for(const n of data.nodes)if(!owner.has(n.id)&&!n.recoveryKind){
    const ids=[...new Set(related(n.id).map(id=>owner.get(id)).filter(Boolean))];
    if(ids.length===1)owner.set(n.id,ids[0]);
  }
  const rawEvent=new Map(data.nodes.filter(n=>n.eventId&&!n.recoverySource).map(n=>[n.eventId,n.id]));
  const files=new Map();
  for(const r of data.records||[])if(!r.recovery)for(const file of r.files||[]){
    if(!files.has(file.sha256))files.set(file.sha256,[]);files.get(file.sha256).push(r.graphNodeId);
  }
  const extras=(data.recovery?.items||[]).filter(i=>!i.candidate&&i.source.file!=='bound-client-session.jsonl');
  const attemptOwner=new Map();
  // Corrections within a named browser attempt accompany its report. Attempt
  // directories are not used to join unrelated sessions or formal tests.
  const attemptKey=i=>/playtest/i.test(i.source.file)?i.source.file.slice(0,i.source.file.lastIndexOf('/')):null;
  const ordered=[...extras].sort((a,b)=>Number(/SUPERSEDED/.test(a.source.file))-Number(/SUPERSEDED/.test(b.source.file)));
  for(const item of ordered){
    const n=node(item.id);if(!n)continue;
    // An archived copy of the same public note is evidence for its existing
    // content, not a newly inferred design decision.
    if(item.kind==='annotation'){
      const fields=['goal','change','reason','expectedChecks'],p=item.projection||{};
      const matches=(data.notes||[]).filter(note=>fields.some(k=>p[k])&&fields.every(k=>JSON.stringify(p[k]||null)===JSON.stringify(note[k]||null)));
      if(matches.length===1&&owner.has(matches[0].graphNodeId)){owner.set(item.id,owner.get(matches[0].graphNodeId));continue;}
    }
    const exactEvent=item.source.eventId&&!item.source.file.includes('events.jsonl')?rawEvent.get(item.source.eventId):null;
    if(exactEvent&&owner.has(exactEvent)){owner.set(item.id,owner.get(exactEvent));continue;}
    const sameFile=files.get(item.source.sha256)||[];
    const exactOwners=[...new Set(sameFile.map(id=>owner.get(id)).filter(Boolean))];
    if(exactOwners.length===1){owner.set(item.id,exactOwners[0]);continue;}
    const key=attemptKey(item);
    if(item.kind==='playtest'&&key&&attemptOwner.has(key)){owner.set(item.id,attemptOwner.get(key));continue;}
    const p=item.projection||{};
    let type=null;
    if(item.kind==='playtest')type=p.probe&&!p.route&&!p.frames?'diagnose':'play';
    else if(p.result?.status||p.solution?.status||Array.isArray(p.initialStops))type='solve-report';
    else if(item.kind==='annotation')type='design';
    // Generic saved files, publication metadata and intermediate journal rows
    // stay as evidence when their action identity or semantics are unknown.
    if(type){const a=add(n,type,{label:type==='design'?'Recovered author note':item.label,summary:item.summary,basis:type==='design'?'agent-stated':'saved-artifact'});
      if(type==='play'&&key)attemptOwner.set(key,a.id);
      if(item.status==='superseded')a.status='superseded';
      if(exactEvent)owner.set(exactEvent,a.id);
      if(sameFile.length===1)owner.set(sameFile[0],a.id);
    }
  }
  // Exact file identity can attach a recovered report to an already represented
  // artifact. It does not prove a second execution happened.
  for(const r of data.records||[])if(!owner.has(r.graphNodeId)&&!r.recovery&&r.facts?.some(f=>f.label==='Recorded search outcome')){
    add(node(r.graphNodeId),'solve-report',{label:'Saved solver result',summary:'Saved result; no exact search execution ID is published for this artifact.',basis:'saved-artifact'});
  }
  const all=actionById();
  for(const a of actions){
    a.evidenceIds=[...owner].filter(([,id])=>id===a.id).map(([id])=>id);
    const r=record(a.sourceNodeId);
    if(a.type==='version'){
      const parent=(data.candidates||[]).find(c=>c.id===r.parentId);
      const prior=(data.candidates||[]).filter(c=>c.id!==r.id&&node(c.graphNodeId)?.order<node(r.graphNodeId)?.order).sort((a,b)=>node(b.graphNodeId).order-node(a.graphNodeId).order);
      const identical=prior.find(c=>c.sha256===r.sha256);
      a.version={id:r.id,parentId:r.parentId||null,playable:!!r.preview?.levelPath,cellsSha256:r.cellsSha256,contractSha256:r.contractSha256,
        change:identical?'repeated-snapshot':!parent?'unlinked-snapshot':r.cellsSha256!==parent.cellsSha256?'map-cells':r.contractSha256!==parent.contractSha256?'declarations':r.sha256!==parent.sha256?'other-saved-fields':'repeated-snapshot',
        sameAs:identical?.id||null};
      a.summary=({'repeated-snapshot':'Repeated saved content; retained as its own snapshot.','unlinked-snapshot':'Saved snapshot; no recorded parent version.','map-cells':'Map cells changed from the recorded parent.','declarations':'Map cells unchanged; verification declarations changed.','other-saved-fields':'Map cells and declarations unchanged; other saved fields changed.'})[a.version.change];
      if(!a.version.playable)a.summary+=' The saved file has no usable official-engine preview.';
    }
  }
  // Client records retain temporal context only. They are never counted again
  // as construction actions, nor asserted to prove each mentioned file was read.
  const candidates=new Map((data.candidates||[]).map(c=>[c.id,c.graphNodeId]));
  for(const n of data.nodes)if(!owner.has(n.id)){
    const r=record(n.id),anchor=r?.recovery?.afterNodeId;
    const target=anchor&&owner.get(anchor)||candidates.get(r?.candidateId)||null;
    if(target&&all.has(target)){context.set(n.id,target);all.get(target).contextIds.push(n.id);}
  }
  actions.sort((a,b)=>a.order-b.order);
  actions.forEach((a,index)=>a.ordinal=index+1);
  const count=type=>actions.filter(a=>a.type===type).length;
  const clients=(data.recovery?.items||[]).filter(i=>i.source.file==='bound-client-session.jsonl');
  const requestFiles=[...new Set(clients.filter(i=>i.projection?.readRequested).flatMap(i=>i.projection.files||[]))].sort();
  const attachments=new Set();
  for(const r of records.values()){
    for(const f of r.files||[])attachments.add(f.sha256);
    if(r.sourceSha256)attachments.add(r.sourceSha256);
    if(r.recovery)attachments.add(r.recovery.source.sha256);
  }
  const stats={actions:actions.length,reads:count('read'),uniqueReadFiles:new Set(actions.filter(a=>a.type==='read').map(a=>record(a.sourceNodeId).displayPath)).size,
    savedVersions:count('version'),cellRevisions:actions.filter(a=>a.version?.change==='map-cells').length,
    solverRuns:count('solve'),solverReports:count('solve-report'),verifications:count('verify'),playtests:count('play'),diagnostics:count('diagnose'),visualReviews:count('visual'),
    clientToolCalls:clients.length||null,observerCommandStarts:(data.records||[]).filter(r=>r.eventType==='command.started').length,
    sourceRecords:sources.length,uniqueAttachments:attachments.size,unconfirmedRequestedFiles:requestFiles.length};
  const evidence=sources.map(id=>{
    const n=node(id),r=record(id),client=r?.recovery?.source.file==='bound-client-session.jsonl';
    return {id,label:r?.label||n.label,actionId:owner.get(id)||null,contextActionId:context.get(id)||null,
      kind:client?'client-tool':n.kind==='replay'?'replay':r?.recovery?.media?.length?'video':n.kind==='resource'?'resource':'source-record',
      basis:client&&r.recovery.projection.readRequested?'request-only':n.kind==='note'?'agent-stated':r?.recovery?'recovered-artifact':'source-record',
      tool:client?r.recovery.projection.tool:null,files:client?r.recovery.projection.files:[],recordedAt:r?.recovery?.source.recordedAt||null};
  });
  return {schema:ACTION_SCHEMA,caseId:data.caseId,sourceScope:'Public observer records and saved recovery evidence. Missing activity is unknown.',
    countingRules:'A command start, completion and result share one action only when source IDs establish their association. Client calls remain a separate evidence series. Reported reads, unique files, saved versions and test runs are separate counts.',
    stats,actions,evidence,requestFiles,usage:data.usage||null,
    coverage:{sourceRecords:sources.length,representedSourceRecords:evidence.length,visualReview:count('visual')?'recorded':'not-recorded',
      researchRounds:'Not reconstructed. Version order is available; no unrecorded hypotheses or causal research rounds are invented.'}};
}
