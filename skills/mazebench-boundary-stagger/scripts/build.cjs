// This imports a fixture or an agent-authored official cells specification.
// Choosing geometry remains a design task, not a fixed template parameter list.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs'),{load,validatePlanar}=require('./runtime.cjs');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out'),'Use --repo ENGINE --out FRESH_OUTPUT with --example NAME or --spec FILE');
assert(!!get('--example')!==!!get('--spec'),'Choose exactly one source');
let value;
if(get('--spec'))value=JSON.parse(fs.readFileSync(get('--spec'),'utf8'));
else{
 const name=get('--example');assert(/^[a-z0-9-]+$/.test(name),'Invalid example name');
 const dir=path.resolve(__dirname,'../examples',name),world=JSON.parse(fs.readFileSync(path.join(dir,'world.json'),'utf8'));
 value={title:world.title,cells:world.levels[0].cells,scenario:name,contract:JSON.parse(fs.readFileSync(path.join(dir,'contract.json'),'utf8'))};
}
assert(value.title&&value.cells&&value.contract,'A spec needs title, cells, and contract');
validatePlanar({world:{width:1,height:1},levels:[{cells:value.cells}]},value.contract);
const {engine}=load(get('--repo'),value.cells);assert.deepEqual(engine.loadWarnings,[]);
console.log(JSON.stringify(saveDraft(get('--repo'),get('--out'),{...value,scenario:value.scenario||'custom-stagger'}),null,2));
