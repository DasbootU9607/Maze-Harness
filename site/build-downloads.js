const tokenFields = ['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens'];
export function buildDataset(entries, processes = new Map()) {
  return {schemaVersion:1, scope:'Recorded build metrics. Missing values are null. Reasoning settings describe client records or owner confirmation, not measured internal reasoning. Wall time includes tools and waiting; no complete semantic phase breakdown is available.',
    builds:entries.map(entry => ({caseId:entry.id,title:entry.title,skill:entry.skill,build:entry.build,
      usageScope:processes.get(entry.id)?.usage?.scope || null,
      runtimeUsage:processes.get(entry.id)?.usage || null,
      process:entry.process?.data || null}))};
}
const csvCell = value => {
  let text = value == null ? '' : String(value);
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
};
export function buildCsv(dataset) {
  const headers=['case_id','title','skill','model','model_basis','reasoning_effort','reasoning_basis','client','started_at','finished_at','wall_time_ms','usage_status',...tokenFields,'usage_scope','process'];
  const rows=dataset.builds.map(row=>{const b=row.build||{};return [row.caseId,row.title,row.skill,b.model,b.modelBasis,b.reasoningEffort || b.reasoningEfforts?.join(' / '),b.reasoningBasis,b.runtime,b.startedAt,b.finishedAt,b.elapsedMs,b.usageStatus,...tokenFields.map(key=>b.tokens?.[key]),row.usageScope,row.process];});
  return [headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function downloadBuilds(entries,{format='json',name='build-metrics',processes=new Map()}={}) {
  const data=buildDataset(entries,processes),content=format==='csv'?buildCsv(data):JSON.stringify(data,null,2)+'\n';
  const url=URL.createObjectURL(new Blob([content],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name+'.'+format;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
