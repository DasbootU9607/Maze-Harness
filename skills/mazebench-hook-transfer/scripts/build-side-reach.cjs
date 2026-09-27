// A selectable PATTERN, not a definition of every hook. Coordinates are local
// design parameters; ordinary official serialization still owns the draft.
// Running the defaults reproduces its example; parameter edits are variants.
// Infer the functional relationship first, then decide whether this builder fits.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs');
function layout(spec={}){
 const c={title:'Hook Workshop - Lateral Arm Docking',toolGroup:'M2',targetGroup:'M3',
  toolStart:[3,8],barLength:2,target:[6,5],player:[2,10],workspace:[2,5,5,10],exitY:9,...spec};
 assert(/^M[0-4]$/.test(c.toolGroup)&&/^M[0-4]$/.test(c.targetGroup)&&c.toolGroup!==c.targetGroup,'Use distinct official Toolbox IDs M0..M4');
 assert(Number.isInteger(c.barLength)&&c.barLength>=2&&c.barLength<=4,'Pattern supports straight transverse bars of length 2..4; each instance must be solved');
 const cells=Array.from({length:16},()=>Array(16).fill('.+#'));
 const put=(x,y,t)=>{assert(Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<15&&y<15);cells[y][x]=t;};
 const [left,top,right,bottom]=c.workspace,[tx,ty]=c.target;
 assert(left<=right&&top<=bottom&&right===tx-1&&top===ty&&c.exitY>ty+2&&c.exitY<=bottom);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)put(x,y,'.');
 // Socket cannot be pushed directly from the south (hole), east or west.
 // The transverse bar's supported inboard member accepts player force;
 // its outboard member occupies the hole and contacts the target.
 put(tx,ty+1,'+');put(tx,ty,'.+'+c.targetGroup);put(tx,ty-1,'.+o');
 put(tx,c.exitY,'.');put(tx+1,c.exitY,'.+O');put(tx+2,c.exitY,'.+G');
 for(let i=0;i<c.barLength;i++){
  const x=c.toolStart[0]+i,y=c.toolStart[1];assert(cells[y]?.[x]==='.','Tool must start on unobstructed workspace floor');put(x,y,'.+'+c.toolGroup);
 }
 assert(cells[c.player[1]]?.[c.player[0]]==='.');put(...c.player,'.+p');
 const contract={schema:1,pattern:'active-side-reach',eventKind:'sideTransfer',toolGroup:c.toolGroup,targetGroup:c.targetGroup,
  requireActivePreparation:true,boxElevation:0,direction:'U',directStand:[tx,ty+1,0],
  actuationStand:[tx-1,ty+2,0],destination:[tx,ty-1,0],plate:[tx,ty-1],gate:[tx+1,c.exitY],
  composition:{preconditions:['One player at z0; independent IDs; exactly this one orange button in the room',
    'Preserve the closed socket rim and workspace boundary; no external entrance to the button socket'],
   region:[left-1,ty-2,tx+3,bottom+1],objects:{tool:c.toolGroup,target:c.targetGroup},
   postconditions:['Target remains on the button; orange gate is lowered'],
   preserve:['Keep target on button, exit corridor free, and tool supported after contact'],
   sideEffects:['All orange walls in this room respond; adding another button changes the requirement',
    'Reusing a group ID rigidly joins members; tool footprint can obstruct neighboring mechanisms'],
   evidence:'verification.json: main replay, event deletion, preparation prefix cut and frozen-box gate reachability'}};
 return {title:c.title,scenario:'active-side-reach',cells,contract,spec:c};
}
if(require.main===module){const a=process.argv.slice(2),get=(k,f)=>a.includes(k)?a[a.indexOf(k)+1]:f;
 assert(get('--out'),'Supply a fresh --out DIRECTORY');
 const value=layout(get('--spec')?JSON.parse(fs.readFileSync(get('--spec'),'utf8')):{});
 const m=saveDraft(get('--repo',process.cwd()),get('--out'),value);
 fs.writeFileSync(require('node:path').join(get('--out'),'spec.json'),JSON.stringify(value.spec,null,2)+'\n');console.log(JSON.stringify(m,null,2));
}
module.exports={layout};
