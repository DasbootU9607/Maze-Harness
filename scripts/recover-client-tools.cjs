'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {hash}=require('./site-content.cjs');
// Only tool calls and their responses are projected. User/assistant messages,
// reasoning records, argument bodies and tool output text are never exported.
function recoverClientTools({run,trial,events,base}) {
  const file=path.join(run,'usage-session.json');if(!fs.existsSync(file))return {items:[],status:'Session binding not provided'};
  const usage=JSON.parse(fs.readFileSync(file)),binding=usage.binding;
  if(binding?.runtime!=='codex'||!binding.file||!fs.existsSync(binding.file))return {items:[],status:'Bound client log unavailable'};
  const experiment=JSON.parse(fs.readFileSync(path.join(trial,'experiment.json')));
  const publication=JSON.parse(fs.readFileSync(path.join(trial,'publication-result.json')));
  const start=Date.parse(experiment.cliStartedAt||experiment.createdAt),end=Date.parse(experiment.cliExitedAt||publication.finishedAt);
  assert(Number.isFinite(start)&&Number.isFinite(end)&&end>=start);
  const items=[],calls=new Set(),sources=[];
  for(const log of [...new Set([...(binding.siblingFiles||[]),binding.file])]) {
    if(!fs.existsSync(log))continue;
    const bytes=fs.readFileSync(log),raw=bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
    const rows=[];for(const line of raw){try{rows.push({row:JSON.parse(line),sha:hash(line)});}catch{ /* A partial trailing line is not evidence. */ }}
    const meta=rows.find(x=>x.row.type==='session_meta')?.row.payload;
    assert.equal(meta?.id||meta?.session_id,binding.sessionId,'Client evidence belongs to another session');
    // Session identity is bound by the observer, and the launch workspace must agree.
    assert.equal(path.resolve(meta.cwd).toLowerCase(),path.resolve(trial).toLowerCase(),'Client workspace differs from this experiment');
    const sourceSha=hash(bytes);sources.push(sourceSha);
    const outputs=new Map(rows.filter(x=>x.row.type==='response_item'&&/^(function_call_output|custom_tool_call_output)$/.test(x.row.payload?.type)).map(x=>[x.row.payload.call_id,x]));
    for(const {row,sha} of rows) {
      const p=row.payload,at=Date.parse(row.timestamp);
      if(row.type!=='response_item'||!['function_call','custom_tool_call'].includes(p?.type)||!p.call_id||calls.has(p.call_id)||at<start||at>end)continue;
      calls.add(p.call_id);
      const result=outputs.get(p.call_id),out=result?.row.payload.output;
      const rawOutput=typeof out==='string'?out:JSON.stringify(out??'');
      let args;try{args=JSON.parse(p.arguments||'{}');}catch{args={};}
      const command=String(args.cmd||args.command||p.input||'');
      const names=[...new Set((command.match(/[A-Za-z0-9_.-]+\.(?:md|json|jsonl|cjs|js|py|txt)\b/g)||[]).filter(n=>!/(?:auth|secret|key|config|env|credential)/i.test(n)))].slice(0,30);
      const readRequested=/(?:Get-Content|\bcat\b|\btype\b|\breadFile(?:Sync)?\b|\bopen\()/.test(command);
      const editRequested=/(?:apply_patch|Set-Content|WriteAllText|writeFile|Add-Content)/.test(p.name+' '+command);
      const tool=/^[a-zA-Z0-9_.-]{1,120}$/.test(p.name||'')?p.name:'recorded tool';
      const exit=rawOutput.match(/(?:"exit_code"\s*:\s*|Process exited with code\s+)(-?\d+)/i);
      const code=exit?Number(exit[1]):null;
      const label=readRequested&&names.length?'Read request: '+names.slice(0,3).join(', '):editRequested?'Edit saved files':`Tool: ${tool}`;
      const preceding=events.filter(e=>Date.parse(e.at)<=at).at(-1);
      const anchor=preceding?base.nodes.find(n=>n.eventId===preceding.id):null;
      items.push({id:'recovered-client-'+hash(p.call_id).slice(0,16),kind:readRequested?'read':editRequested?'edit':'tool',label,
        summary:readRequested?'The client recorded a file-read request. The successful delivery of each named file is not independently asserted for compound commands.':editRequested?'The client recorded a file-edit operation. Only separately saved snapshots establish the map version.':'The client recorded this tool invocation and the presence or absence of its response. A successful command is not a gameplay test verdict.',
        status:code!==null&&code!==0?'failed':result?'neutral':'unknown',
        facts:[{label:'Tool',value:tool},{label:'Requested at',value:row.timestamp},{label:'Response at',value:result?.row.timestamp||'Not provided'},
          {label:'Tool round-trip (ms)',value:result?String(Date.parse(result.row.timestamp)-at):'Not provided'},{label:'Process exit code',value:code===null?'Not provided':String(code)},
          {label:'Mentioned files',value:names.join(', ')||'Not exported'}],
        source:{file:'bound-client-session.jsonl',sha256:sourceSha,recordedAt:row.timestamp,eventId:null,entrySha256:sha,responseSha256:result?.sha||null},
        afterNodeId:anchor?.id||(at<Date.parse(events[0].at)?'before-run':'delivery-final'),
        projection:{tool,files:names,readRequested,editRequested,responseRecorded:!!result,exitCode:code}});
    }
  }
  items.sort((a,b)=>Date.parse(a.source.recordedAt)-Date.parse(b.source.recordedAt));
  return {items,status:'Bound client tool calls recovered',sources,scope:'Launch-to-exit tool records only. Messages, internal reasoning, raw command arguments and output bodies are excluded. Round-trip time includes tool transport and waiting; it is not model thinking time.'};
}
module.exports={recoverClientTools};
