// Content installation only: the official MazeBench services own serialization.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function saveDraft(repo,out,{title,cells,scenario,contract}){
 repo=path.resolve(repo);out=path.resolve(out);
 assert(!fs.existsSync(path.join(out,'manifest.json')),'Choose a fresh output directory; existing drafts are preserved');
 assert(cells.length===16&&cells.every(r=>r.length===16));
 const gamesDir=path.join(repo,'games'),support=require(path.join(repo,'server/support'));
 const {createMazeWorldMapService}=require(path.join(repo,'server/maze-world-map'));
 const {createMazeLevelService}=require(path.join(repo,'server/maze-levels'));
 const {createLocalBuildWorldService}=require(path.join(repo,'server/build-worlds-local'));
 const worldMaps=createMazeWorldMapService({gamesDir,...support,buildMazePreviewData:()=>({previewUrl:null})});
 const levels=createMazeLevelService({rootDir:repo,gamesDir,worldMaps,...support,
  buildGameAssetUrl:(id,p)=>`/games/${id}/${p}`,
  resolveGameAssetPath:(id,p)=>{const a=path.join(gamesDir,id,p);return fs.existsSync(a)?a:null;},
  buildMazePreviewData:()=>({previewUrl:null})});
 const worlds=createLocalBuildWorldService({gamesDir,worldMaps,...support,...levels});
 const id='draft-hookx-'+crypto.randomBytes(5).toString('hex'),dir=path.join(gamesDir,id);
 assert(!fs.existsSync(dir));fs.mkdirSync(path.join(dir,'levels'),{recursive:true});fs.mkdirSync(path.join(dir,'previews'));
 for(const file of ['level_parsing.json','toolbox.json'])fs.copyFileSync(path.join(gamesDir,'maze',file),path.join(dir,file));
 // Ordinary copies avoid requiring directory-symlink privileges.
 for(const asset of ['images','assets_3d'])fs.cpSync(path.join(gamesDir,'maze',asset),path.join(dir,asset),{recursive:true});
 fs.writeFileSync(path.join(dir,'world_parsing.json'),JSON.stringify({rules:{world_size:[1,1],level_size:[16,16],camera_view:[16,16]}},null,2));
 fs.writeFileSync(path.join(dir,'world_map.json'),'{"levels":{}}');
 const now=new Date().toISOString();
 fs.writeFileSync(path.join(dir,'draft.json'),JSON.stringify({id,title,created_at:now,updated_at:now,
  remote_id:null,remote_updated_at:null,remote_status:null,default_level_id:'level_AxA'},null,2));
 const editor={version:'mazebench-build-world-v1',title,world:{width:1,height:1},
  levels:[{id:'level_AxA',title,column:'A',row:'A',width:16,height:16,cells}]};
 const game=worlds.replaceLocalWorldFromEditorState(id,editor),exported=worlds.editorStateForGame(game);
 assert.deepEqual(exported.levels[0].cells,cells);
 fs.mkdirSync(out,{recursive:true});
 const manifest={project:'mazebench-hook-transfer',scenario,id,title,directory:path.relative(repo,dir).replaceAll('\\','/'),
  play:`/play/${id}/level_AxA`,edit:`/author/${id}/level_AxA`,map:`/world-map/${id}`};
 for(const [f,v]of Object.entries({'manifest.json':manifest,'world.json':exported,'contract.json':contract}))
  fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2)+'\n');
 fs.copyFileSync(path.join(dir,'levels/level_AxA.txt'),path.join(out,'level_AxA.txt'));
 return manifest;
}
module.exports={saveDraft};
