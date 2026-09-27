// Reproduce an authored fixture through official services, not a new-design generator.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {saveDraft}=require('../skills/mazebench-hook-transfer/scripts/draft-io.cjs');
const cases=['minimal','north-store','wide-hook','repair-plate','elevated-bridge','active-docking','side-reach','cantilever-key'];
function build(name,repo,out){
 assert(cases.includes(name),'Choose a case: '+cases.join(', '));
 const dir=path.resolve(__dirname,'../examples',name);
 const world=JSON.parse(fs.readFileSync(path.join(dir,'world.json'),'utf8'));
 const file=path.join(dir,'contract.json');
 const contract=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{scenario:name,scope:'Legacy z0 baseline template'};
 return saveDraft(repo,out,{title:world.title,cells:world.levels[0].cells,scenario:name,contract});
}
if(require.main===module){
 const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
 assert(get('--repo')&&get('--out')&&get('--case'),'Use --case NAME --repo ENGINE --out FRESH_OUTPUT');
 console.log(JSON.stringify(build(get('--case'),get('--repo'),get('--out')),null,2));
}
module.exports={build,cases};
