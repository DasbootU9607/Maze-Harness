const D={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
function inspector(e){
 const snap=s=>e.actorTypes.map((type,i)=>({i,type,group:e.actorGroupIds[i],x:s.actorX[i],y:s.actorY[i],z:s.actorElevation[i],removed:!!s.actorRemoved[i]}));
 function geometry(a){
  const hs=a.filter(a=>a.group==='M0'&&!a.removed),bs=a.filter(a=>a.group==='M1'&&!a.removed),found=[];
  for(const [d,[dx,dy]]of Object.entries(D))for(const front of hs){
   const stand=[front.x-dx,front.y-dy,front.z];
   if(a.some(v=>v.group&&!v.removed&&v.x===stand[0]&&v.y===stand[1]&&v.z===stand[2]))continue;
   for(const h of hs)for(const b of bs)if(h.x+dx===b.x&&h.y+dy===b.y&&h.z===b.z&&
    (b.x-stand[0])*dx+(b.y-stand[1])*dy<0)found.push({d,stand,front:[front.x,front.y,front.z],rear:[h.x,h.y,h.z],payload:[b.x,b.y,b.z]});
  }
  return found;
 }
 function classify(a,b,r,dx,dy){
  const p=a.find(x=>x.type==='player'),q=b.find(x=>x.type==='player');
  const moved=[...new Set(a.filter(x=>x.group&&!x.removed&&
   (x.x!==b[x.i].x||x.y!==b[x.i].y||x.z!==b[x.i].z||b[x.i].removed)).map(x=>x.group))];
  const primary=a.find(x=>x.group&&!x.removed&&x.x===p.x+dx&&x.y===p.y+dy&&x.z===p.z)?.group??null;
  const contact=[];for(const h of a.filter(x=>x.group==='M0'&&!x.removed))for(const v of a.filter(x=>x.group==='M1'&&!x.removed))
   if(h.x+dx===v.x&&h.y+dy===v.y&&h.z===v.z)contact.push({hook:[h.x,h.y,h.z],payload:[v.x,v.y,v.z]});
  const h0=a.find(x=>x.group==='M0'),h1=b[h0.i],t0=a.find(x=>x.group==='M1'),t1=b[t0.i];
  return {moved,primary,contact,independent:moved.length===1,
   relativeBefore:[h0.x-t0.x,h0.y-t0.y,h0.z-t0.z],relativeAfter:[h1.x-t1.x,h1.y-t1.y,h1.z-t1.z],
   rearTransfer:primary==='M0'&&moved.includes('M0')&&moved.includes('M1')&&contact.some(c=>(c.payload[0]-p.x)*dx+(c.payload[1]-p.y)*dy<0),
   dockBefore:geometry(a),dockAfter:geometry(b),
   lowered:r.liftToggles?.some(x=>!x.raised)??false,raised:r.liftToggles?.some(x=>x.raised)??false,
   payloadTopWalk:(p.x!==q.x||p.y!==q.y||p.z!==q.z)&&b.some(x=>x.group==='M1'&&!x.removed&&x.x===q.x&&x.y===q.y&&x.z+1===q.z)};
 }
 function legalRear(s){
  const found=[];
  for(const [d,[dx,dy]]of Object.entries(D)){
   const copy=e.cloneState(s),a=snap(copy),r=e.move(copy,dx,dy);
   if(r.moved&&classify(a,snap(copy),r,dx,dy).rearTransfer)found.push(d);
  }return found;
 }
 return {snap,geometry,classify,legalRear};
}
module.exports={D,inspector};
