// Install authored geometry; the official services own serialization and rules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {saveDraft}=require('./draft-io.cjs');
function build(repo,out,spec){
 assert(typeof spec.title==='string'&&spec.title.trim(),'A spec needs a title');
 assert(Array.isArray(spec.cells)&&spec.cells.length===16&&spec.cells.every(row=>Array.isArray(row)&&row.length===16&&row.every(cell=>typeof cell==='string')),'Supply a complete 16x16 official token array');
 assert(spec.contract&&typeof spec.contract==='object'&&!Array.isArray(spec.contract),'A spec needs a mechanism contract');
 assert(!fs.existsSync(out),'Choose a fresh output directory; existing artifacts are preserved');
 const manifest=saveDraft(repo,out,{...spec,scenario:spec.scenario||'custom-hook-transfer'});
 fs.writeFileSync(path.join(out,'spec.json'),JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
 return manifest;
}
if(require.main===module){
 const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
 try{
  assert(get('--repo')&&get('--out')&&get('--spec'),'Use --repo ENGINE --spec FILE --out FRESH_OUTPUT');
  const spec=JSON.parse(fs.readFileSync(get('--spec'),'utf8'));
  console.log(JSON.stringify(build(get('--repo'),get('--out'),spec),null,2));
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
module.exports={build};
