'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {read,load,validate}=require('./complex-runtime.cjs'),{saveDraft}=require('./complex-draft-io.cjs');
const a=process.argv.slice(2),get=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
assert(get('--repo')&&get('--spec')&&get('--out'),'Use --repo ENGINE --spec SPEC.json --out NEW_OUTPUT');
const spec=read(get('--spec'));validate(spec,path.resolve(__dirname,'..'));
load(get('--repo'),spec.cells);
const m=saveDraft(get('--repo'),get('--out'),{...spec,scenario:spec.scenario||'complex-authoring'});
fs.copyFileSync(get('--spec'),path.join(get('--out'),'spec.json'));console.log(JSON.stringify(m));
