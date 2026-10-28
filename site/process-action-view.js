import {actionNames} from './process-actions.js';

const $=id=>document.getElementById(id);
function el(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=String(value);return e;}
function button(label,fn){const b=el('button','',label);b.type='button';b.addEventListener('click',fn);return b;}

/** Only changes presentation. The original records are still inspectable. */
export function createActionView({projection,data,getNode,selectNode}){
  const actions=new Map(projection.actions.map(a=>[a.id,a])),evidence=new Map(projection.evidence.map(e=>[e.id,e]));
  const stats=$('action-stats'),s=projection.stats;
  const counters=[['Recorded reads',s.reads,`${s.uniqueReadFiles} distinct paths`],['Saved versions',s.savedVersions,`${s.cellRevisions} recorded cell revisions`],
    ['Solver searches',s.solverRuns,`${s.solverReports} additional results without execution IDs`],['Verifications',s.verifications,'Checks remain inside each run'],
    ['Playtest attempts',s.playtests,'Inputs remain inside each attempt'],['Diagnostics',s.diagnostics,'Separate from formal verdicts'],
    ['Visual reviews',s.visualReviews,'A screenshot alone is not a review'],['Client tool calls',s.clientToolCalls,'Separate evidence series']];
  for(const [label,value,detail] of counters){const item=el('div','action-stat');item.append(el('dt','',label),el('dd','',value?value.toLocaleString():'Not recorded'),el('span','',detail));stats.append(item);}
  const download=$('action-data');download.href=URL.createObjectURL(new Blob([JSON.stringify(projection,null,2)],{type:'application/json'}));download.download=projection.caseId+'-actions-v1.json';
  const tabs=$('process-view-tabs'),timeline=$('process-timeline'),versions=$('process-versions'),browser=$('process-evidence-list');
  const views={actions:timeline,versions,evidence:browser},buttons={};
  function showView(key){for(const [name,host] of Object.entries(views)){host.hidden=name!==key;buttons[name].setAttribute('aria-pressed',String(name===key));}}
  for(const [key,label] of [['actions',`Build actions (${s.actions})`],['versions',`Map versions (${s.savedVersions})`],['evidence',`Evidence (${s.sourceRecords})`]]){
    const b=button(label,()=>showView(key));b.dataset.view=key;b.setAttribute('aria-controls',views[key].id);buttons[key]=b;tabs.append(b);
  }
  versions.append(el('h2','','Saved map versions'),el('p','projection-note','Every saved snapshot is retained. Select a version, then expand its preview to play in the official engine.'));
  const grid=el('div','version-grid');versions.append(grid);
  for(const a of projection.actions.filter(a=>a.type==='version')){
    const c=data.candidates.find(c=>c.graphNodeId===a.id),b=button('',()=>selectNode(a.id,{focus:false}));b.className='version-option';b.dataset.nodeId=a.id;
    if(c.preview?.thumbnailPath){const img=el('img');img.src='./'+c.preview.thumbnailPath;img.alt=`Saved map ${c.id}`;img.loading='lazy';b.append(img);}
    b.append(el('strong','',c.id),el('span','',a.summary),el('small','',a.version.playable?'Select to play ↗':'Preview unavailable'));grid.append(b);
  }
  browser.append(el('h2','','Evidence records'),el('p','projection-note','Search file names, tool names or saved actions. Read requests do not prove successful file delivery; nearby calls do not establish the same action.'));
  const controls=el('div','evidence-search'),search=el('input'),filter=el('select');search.type='search';search.placeholder='Search skill, file, tool or record';search.setAttribute('aria-label','Search evidence');filter.setAttribute('aria-label','Evidence type');
  for(const [value,label] of [['all','All evidence'],['reads','File reads / read requests'],['client-tool','Client tool calls'],['replay','Saved replays'],['video','Reports with video'],['unassigned','No action identity']]){const o=el('option','',label);o.value=value;filter.append(o);}
  controls.append(search,filter);browser.append(controls);
  const count=el('p','evidence-count'),list=el('div','evidence-results'),nav=el('div','evidence-pagination');browser.append(count,list,nav);let page=0;
  const searchable=projection.evidence.map(e=>({...e,search:[e.label,e.id,e.tool,...e.files,JSON.stringify(getNode(e.id)?.details||{})].join(' ').toLowerCase()}));
  function sourceButton(e){const b=button('',()=>selectNode(e.id,{focus:false}));b.className='evidence-option';b.dataset.nodeId=e.id;
    b.append(el('span','',e.label||e.id),el('small','',`${e.tool||e.kind} · ${e.basis}${e.actionId?' · linked action':' · evidence only'}`));return b;}
  function results(){const query=search.value.trim().toLowerCase(),kind=filter.value;
    const rows=searchable.filter(e=>(!query||e.search.includes(query))&&(kind==='all'||kind==='unassigned'&&!e.actionId||kind==='reads'&&(actions.get(e.actionId)?.type==='read'||e.basis==='request-only')||e.kind===kind));
    page=Math.min(page,Math.max(0,Math.ceil(rows.length/30)-1));const start=page*30;list.replaceChildren(...rows.slice(start,start+30).map(sourceButton));
    count.textContent=`${rows.length} records${rows.length?` · ${start+1}–${Math.min(start+30,rows.length)}`:''}`;
    const prev=button('← Previous',()=>{page--;results();}),next=button('Next →',()=>{page++;results();});prev.disabled=page===0;next.disabled=start+30>=rows.length;nav.replaceChildren(prev,next);
  }
  search.addEventListener('input',()=>{page=0;results();});filter.addEventListener('change',()=>{page=0;results();});results();showView('actions');

  function select(id){
    const e=evidence.get(id),a=actions.get(e?.actionId),host=$('action-evidence');host.replaceChildren();
    const relation=$('action-association');relation.textContent=a?`${actionNames[a.type]} · ${a.basis} · ${a.evidenceIds.length} linked evidence records`:'Evidence record · no confirmed action identity';
    if(a?.id!==id&&a){const back=button('Return to action ↗',()=>selectNode(a.id,{focus:false}));host.append(back);}
    for(const [ids,label,note] of [[a?.evidenceIds,'Evidence for this action','Associated by saved identities or an exact copy of the same artifact.'],[a?.contextIds,'Nearby / version-associated evidence','Context only. These records are not asserted to belong to the same execution.']]){
      const others=(ids||[]).filter(key=>key!==id);if(!others.length)continue;
      const detail=el('details');detail.append(el('summary','',`${label} (${others.length})`),el('p','projection-note',note));
      const rows=el('div','linked-evidence');detail.append(rows);let limit=0;
      const more=button('Show more',append);
      function append(){rows.append(...others.slice(limit,limit+20).map(key=>sourceButton(evidence.get(key))));limit+=20;more.hidden=limit>=others.length;}
      append();detail.append(more);host.append(detail);
    }
    // Reports and original videos remain one click away under their action.
    for(const b of grid.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.nodeId===id));
    for(const b of list.querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.nodeId===id));
  }
  return {select,showView};
}
