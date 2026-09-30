// Build an agent-authored cells specification through official save services.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs'),{load,validatePlanar}=require('./runtime.cjs');
const args=process.argv.slice(2),get=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
assert(get('--repo')&&get('--out')&&get('--spec'),'Use --repo ENGINE --spec FILE --out FRESH_OUTPUT');
assert(!fs.existsSync(get('--out')),'Choose a fresh output directory; existing artifacts are preserved');
const value=JSON.parse(fs.readFileSync(get('--spec'),'utf8'));
assert(value.title&&value.cells&&value.contract,'A spec needs title, cells, and contract');
validatePlanar({world:{width:1,height:1},levels:[{cells:value.cells}]},value.contract);
const {engine}=load(get('--repo'),value.cells);assert.deepEqual(engine.loadWarnings,[]);
console.log(JSON.stringify(saveDraft(get('--repo'),get('--out'),{...value,scenario:value.scenario||'custom-stagger'}),null,2));
