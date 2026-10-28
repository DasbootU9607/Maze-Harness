// Recovery is an additional evidence layer; it never replaces acceptance or
// usage. Source IDs stay namespaced and original coverage counts stay separate.
export function mergeHistory(base, recovery) {
  if (!recovery) return base;
  const data = structuredClone(base);
  const lists = ['nodes','edges','candidates','tests','notes','resources','operations','replays','records','explanations'];
  lists.forEach(key => { data[key] ||= []; });
  let order = -100000;
  for (const session of recovery.sessions) {
    for (const key of lists) {
      const rows = structuredClone(session.document[key] || []);
      if(key === 'nodes') rows.forEach(node => {node.order = order++; node.recoverySource = session.label; delete node.eventId;});
      data[key].push(...rows);
    }
  }
  for (const item of recovery.items) {
    const anchor = data.nodes.find(n => n.id === item.afterNodeId);
    const order = item.afterNodeId==='before-run' ? -200000+recovery.items.indexOf(item) : anchor ? anchor.order + (recovery.items.indexOf(item) + 1) / (recovery.items.length + 1) : data.nodes.reduce((n,row)=>Math.max(n,row.order),0) + 1;
    const candidate = item.candidate;
    const node = {id:item.id,kind:candidate?'candidate':'record',label:item.label,status:item.status,order,summary:item.summary,
      recoverySource:'Recovered saved evidence',recoveryKind:item.kind,details:candidate?{candidateId:candidate.id}:{recordId:item.id}};
    data.nodes.push(node);
    if(candidate) data.candidates.push({...candidate,graphNodeId:item.id,recovery:item});
    else data.records.push({id:item.id,graphNodeId:item.id,candidateId:null,eventType:'history.'+item.kind,label:item.label,scope:item.summary,
      facts:item.facts,files:[{name:item.source.file,sha256:item.source.sha256}],recovery:item});
    data.explanations.push({nodeId:item.id,headline:item.label,action:item.summary,result:item.facts.map(f=>`${f.label}: ${f.value}`).join('\n'),decision:'Recovered from a saved file; not a newly observed action.',observations:[],evidence:[item.id],basis:'recorded-artifact'});
  }
  data.nodes.sort((a,b)=>a.order-b.order);
  // Display indices do not masquerade as sequence IDs from one original log.
  data.nodes.forEach((node,index)=>{node.originalOrder=node.order;node.order=index+1;});
  data.recovery = recovery;
  return data;
}

export async function loadHistory(base) {
  const response = await fetch('./data/process-recovery/index.json', {cache:'no-cache'});
  if (!response.ok) throw new Error('The recovery evidence index could not be loaded.');
  const index = await response.json(), entry = index.cases.find(row=>row.caseId===base.caseId);
  if (!entry) return base;
  if(entry.data !== `data/process-recovery/${base.caseId}.json`) throw new Error('Invalid recovery path.');
  const saved = await fetch('./'+entry.data, {cache:'no-cache'});
  if(!saved.ok) throw new Error('The recovery evidence could not be loaded.');
  const bytes = await saved.arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(digest !== entry.sha256) throw new Error('Recovery evidence fingerprint mismatch.');
  return mergeHistory(base, JSON.parse(new TextDecoder().decode(bytes)));
}
