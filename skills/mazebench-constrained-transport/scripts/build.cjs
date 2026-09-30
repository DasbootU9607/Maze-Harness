'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {args,read,validate,load,services,digest}=require('./runtime.cjs');
function build(repo,out,spec){
  repo=path.resolve(repo);out=path.resolve(out);validate(spec);
  assert(!fs.existsSync(out),'Use a fresh output directory; existing artifacts are preserved');
  load(repo,spec.cells);
  const s=services(repo),{createLocalBuildWorldService}=require(path.join(repo,'server/build-worlds-local'));
  const worlds=createLocalBuildWorldService({gamesDir:s.gamesDir,worldMaps:s.worldMaps,...s.support,...s.levels});
  const id='draft-transport-'+crypto.randomBytes(5).toString('hex'),dir=path.join(s.gamesDir,id);
  assert(!fs.existsSync(dir));fs.mkdirSync(path.join(dir,'levels'),{recursive:true});fs.mkdirSync(path.join(dir,'previews'));
  for(const name of ['level_parsing.json','toolbox.json']){
    const src=path.join(s.gamesDir,'maze',name);if(fs.existsSync(src))fs.copyFileSync(src,path.join(dir,name));
  }
  for(const name of ['images','assets_3d'])fs.cpSync(path.join(s.gamesDir,'maze',name),path.join(dir,name),{recursive:true});
  const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  write(path.join(dir,'world_parsing.json'),{rules:{world_size:[1,1],level_size:[16,16],camera_view:[16,16]}});
  write(path.join(dir,'world_map.json'),{levels:{}});
  const now=new Date().toISOString();
  write(path.join(dir,'draft.json'),{id,title:spec.title,created_at:now,updated_at:now,default_level_id:'level_AxA',remote_id:null,remote_updated_at:null,remote_status:null});
  const editor={version:'mazebench-build-world-v1',title:spec.title,world:{width:1,height:1},levels:[{id:'level_AxA',title:spec.title,column:'A',row:'A',width:16,height:16,cells:spec.cells}]};
  const game=worlds.replaceLocalWorldFromEditorState(id,editor),world=worlds.editorStateForGame(game);
  assert.deepEqual(world.levels[0].cells,spec.cells,'Official save/load changed the cells');
  fs.mkdirSync(out,{recursive:true});
  const manifest={skill:'mazebench-constrained-transport',source:'custom',id,title:spec.title,directory:path.relative(repo,dir).replaceAll('\\','/'),cellsSha256:digest(spec.cells),play:`/play/${id}/level_AxA`,edit:`/author/${id}/level_AxA`};
  for(const [name,value]of Object.entries({'manifest.json':manifest,'world.json':world,'contract.json':spec.contract}))write(path.join(out,name),value);
  fs.copyFileSync(path.join(dir,'levels/level_AxA.txt'),path.join(out,'level_AxA.txt'));
  return manifest;
}
if(require.main===module){
  try{
    const a=args();assert(a.repo&&a.out&&a.spec,'Use --repo REPO --spec FILE --out NEW_OUTPUT');
    const spec=read(path.resolve(a.spec));
    console.log(JSON.stringify(build(a.repo,a.out,spec),null,2));
  }catch(e){console.error(e.stack);process.exitCode=1;}
}
module.exports={build};
