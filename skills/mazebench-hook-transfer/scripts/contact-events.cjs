// Observations only. The official engine decides whether an action is legal.
const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
function inspector(e,{toolGroup,targetGroup,eventKind}){
 if(!['rearTransfer','sideTransfer'].includes(eventKind))throw new Error('Supply a supported eventKind; simultaneous motion is not a hook predicate');
 if(!toolGroup||!targetGroup||toolGroup===targetGroup)throw new Error('Independent, distinct group IDs required');
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i],x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 const pos=a=>[a.x,a.y,a.z];
 const group=(a,g)=>a.filter(x=>x.group===g&&!x.removed);
 function relation(p,t,dx,dy){return {along:(t.x-p.x)*dx+(t.y-p.y)*dy,lateral:(t.x-p.x)*dy-(t.y-p.y)*dx};}
 const qualifies=r=>eventKind==='rearTransfer'?r.along<0:r.lateral!==0;
 function contacts(a,dx,dy){const out=[];
  for(const h of group(a,toolGroup))for(const t of group(a,targetGroup))
   if(h.x+dx===t.x&&h.y+dy===t.y&&h.z===t.z)out.push({toolActor:h.i,targetActor:t.i,tool:pos(h),target:pos(t)});
  return out;
 }
 function candidates(a){const out=[];
  for(const [d,[dx,dy]]of Object.entries(D))for(const front of group(a,toolGroup)){
   const p={x:front.x-dx,y:front.y-dy,z:front.z};
   if(a.some(x=>x.group&&!x.removed&&x.x===p.x&&x.y===p.y&&x.z===p.z))continue;
   for(const c of contacts(a,dx,dy)){const r=relation(p,a[c.targetActor],dx,dy);
    if(qualifies(r))out.push({d,stand:pos(p),inputActor:front.i,front:pos(front),contact:c,...r});}
  }return out; // Geometry only: NOT proof of reachable stand, support, or clearance.
 }
 function classify(a,b,result,dx,dy){
  const p=a.find(x=>x.type==='player'&&!x.removed);
  const moved=[...new Set(a.filter(x=>x.group&&!x.removed&&(x.x!==b[x.i].x||x.y!==b[x.i].y||x.z!==b[x.i].z||b[x.i].removed)).map(x=>x.group))];
  const input=p&&a.find(x=>x.type==='weightless_box'&&x.group&&!x.removed&&x.x===p.x+dx&&x.y===p.y+dy&&x.z===p.z);
  // Deliberately scoped to a single player and same-elevation unit translation.
  // Slopes, multi-player actuation, falls, and longer sliding require other adapters.
  const translates=g=>group(a,g).length>0&&group(a,g).every(x=>!b[x.i].removed&&b[x.i].x===x.x+dx&&b[x.i].y===x.y+dy&&b[x.i].z===x.z);
  const contact=contacts(a,dx,dy).map(c=>({...c,...relation(p,a[c.targetActor],dx,dy)}));
  const coupled=!!result.moved&&input?.group===toolGroup&&contact.length>0&&translates(toolGroup)&&translates(targetGroup);
  const rearTransfer=coupled&&contact.some(c=>c.along<0),sideTransfer=coupled&&contact.some(c=>c.lateral!==0);
  const h=group(a,toolGroup)[0],t=group(a,targetGroup)[0];
  return {primary:input?.group??null,inputActor:input?.i??null,moved,contact,coupled,rearTransfer,sideTransfer,
   event:eventKind==='rearTransfer'?rearTransfer:sideTransfer,independent:moved.length===1,
   relativeBefore:h&&t?[h.x-t.x,h.y-t.y,h.z-t.z]:null,
   relativeAfter:h&&t?[b[h.i].x-b[t.i].x,b[h.i].y-b[t.i].y,b[h.i].z-b[t.i].z]:null,
   candidatesBefore:candidates(a),candidatesAfter:candidates(b)};
 }
 function legalEvents(s){return Object.entries(D).filter(([d,dir])=>{
  const q=e.cloneState(s),a=snap(q),r=e.move(q,...dir);return r.moved&&classify(a,snap(q),r,...dir).event;
 }).map(([d])=>d);}
 return {snap,group,candidates,classify,legalEvents};
}
module.exports={D,inspector};
