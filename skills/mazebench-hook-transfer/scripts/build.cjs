// Construct content through the existing MazeBench local-draft services.
// No rules, parser, renderer, or solver are reimplemented here.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function construct(spec){
 const [hx,hy]=spec.dock,H=spec.hookHeight??4,S=spec.hookSpan??1,T=spec.payloadTail??3;
 assert(Number.isInteger(H)&&H>=4&&H<=6,'hookHeight must be 4..6');
 assert(Number.isInteger(S)&&S>=1&&S<=3,'hookSpan must be 1..3');
 assert(Number.isInteger(T)&&T>=3&&T<=5,'payloadTail must be 3..5');
 const nx=hx+S,ny=hy+H-2,bx=nx+1,bottom=ny+T-1;
 const left=hx-3,right=bx+(spec.eastMargin??3),top=hy-(spec.northMargin??3);
 assert(left>=1&&right<=14&&top>=1&&bottom<=14,'Active area must fit inside sealed 16x16 room');
 const cells=Array.from({length:16},()=>Array(16).fill('.+#'));
 function put(x,y,t){assert(x>=0&&x<16&&y>=0&&y<16);cells[y][x]=t;}
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)put(x,y,'.');
 // The unwalkable seam prevents a human reaching the load's pushing side.
 // A rigid hook may span it while other group members remain supported.
 for(let x=left;x<nx;x++)put(x,ny,'+');
 put(nx,bottom,'.+#');put(bx+1,bottom,'.+#');
 if(spec.upperStop)for(let x=hx;x<=nx;x++)put(x,hy-2,'.+#');
 for(const [x,y]of spec.pillars??[])put(x,y,'.+#');
 const hook=[];
 for(let y=0;y<H;y++)hook.push([0,y]);
 for(let x=1;x<=S;x++){hook.push([x,0],[x,H-1]);}
 const origin=spec.hookStart??[hx,hy];
 const positions={hook:hook.map(([x,y])=>[x+origin[0],y+origin[1],0]),
  payload:[[nx,ny,0],...Array.from({length:T},(_,i)=>[bx,ny+i,0])],
  player:[...spec.player,0],gem:[...(spec.gem??[left,bottom-1]),0]};
 const seen=new Set();
 for(const [group,token]of [['hook','M0'],['payload','M1'],['player','p'],['gem','G']]){
  const list=Array.isArray(positions[group][0])?positions[group]:[positions[group]];
  for(const [x,y]of list){const key=x+','+y;assert(!seen.has(key),'Actors overlap at '+key);seen.add(key);
   assert(cells[y]?.[x]!=='.+#','Actor collides with terrain at '+key);
   // Bare void plus an actor: +M0; plain floor plus an actor: .+M0.
   put(x,y,cells[y][x]==='+'?'+'+token:cells[y][x]+'+'+token);
  }
 }
 return {cells,positions,geometry:{dock:[hx,hy],hookHeight:H,hookSpan:S,payloadTail:T,
  seamY:ny,seamX:[left,nx-1],stemX:bx,bottomY:bottom,activeBounds:[left,top,right,bottom]},
  editor:{version:'mazebench-build-world-v1',title:spec.title,world:{width:1,height:1},
   levels:[{id:'level_AxA',title:spec.title,column:'A',row:'A',width:16,height:16,cells}]}};
}
function create(spec,repo,out){
 repo=path.resolve(repo);out=path.resolve(out);assert(fs.existsSync(path.join(repo,'public/maze-engine.js')));
 assert(!fs.existsSync(path.join(out,'manifest.json')),'Output already owns a draft; choose a new output directory to preserve edits');
 const built=construct(spec),gamesDir=path.join(repo,'games');
 const support=require(path.join(repo,'server/support'));
 const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map'));
 const {createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
 const {createLocalBuildWorldService}=require(path.join(repo,'server/build-worlds-local'));
 const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
 const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,
  buildGameAssetUrl:(id,p)=>`/games/${id}/${p}`,
  resolveGameAssetPath:(id,p)=>{const a=path.join(gamesDir,id,p);return fs.existsSync(a)?a:null;},
  buildMazePreviewData:()=>({previewUrl:null})});
 const worlds=createLocalBuildWorldService({gamesDir,worldMaps,...support,...levels});
 const id='draft-hook-'+crypto.randomBytes(5).toString('hex'),dir=path.join(gamesDir,id);
 assert(!fs.existsSync(dir));fs.mkdirSync(path.join(dir,'levels'),{recursive:true});fs.mkdirSync(path.join(dir,'previews'));
 // Copy shared official resources: Windows symlink creation failed in earlier
 // local Build work. This materializes content, not a replacement runtime.
 for(const file of ['level_parsing.json','toolbox.json'])fs.copyFileSync(path.join(gamesDir,'maze',file),path.join(dir,file));
 for(const asset of ['images','assets_3d'])fs.cpSync(path.join(gamesDir,'maze',asset),path.join(dir,asset),{recursive:true});
 fs.writeFileSync(path.join(dir,'world_parsing.json'),JSON.stringify({rules:{world_size:[1,1],level_size:[16,16],camera_view:[16,16]}},null,2));
 fs.writeFileSync(path.join(dir,'world_map.json'),'{"levels":{}}');
 const now=new Date().toISOString();
 fs.writeFileSync(path.join(dir,'draft.json'),JSON.stringify({id,title:spec.title,created_at:now,updated_at:now,
  remote_id:null,remote_updated_at:null,remote_status:null,default_level_id:'level_AxA'},null,2));
 const game=worlds.replaceLocalWorldFromEditorState(id,built.editor);
 const exported=worlds.editorStateForGame(game);assert.deepEqual(exported.levels[0].cells,built.cells);
 fs.mkdirSync(out,{recursive:true});
 const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
 save('spec.json',spec);save('world.json',exported);save('geometry.json',{...built.geometry,positions:built.positions});
 fs.copyFileSync(path.join(dir,'levels/level_AxA.txt'),path.join(out,'level_AxA.txt'));
 const manifest={project:'mazebench-hook-transfer',id,title:spec.title,directory:path.relative(repo,dir).replaceAll('\\','/'),
  play:`/play/${id}/level_AxA`,edit:`/author/${id}/level_AxA`,map:`/world-map/${id}`};
 save('manifest.json',manifest);return manifest;
}
if(require.main===module){
 const args=process.argv.slice(2);function arg(k,fallback){const i=args.indexOf(k);return i<0?fallback:args[i+1];}
 assert(arg('--spec'),'Use --spec FILE --out DIRECTORY [--repo REPO]');assert(arg('--out'));
 console.log(JSON.stringify(create(JSON.parse(fs.readFileSync(arg('--spec'),'utf8')),arg('--repo',process.cwd()),arg('--out')),null,2));
}
module.exports={construct,create};
