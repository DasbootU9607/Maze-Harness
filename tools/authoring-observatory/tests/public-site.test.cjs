'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const {once} = require('node:events'), test = require('node:test');
const S = require('../lib/store.cjs');
const {createServer, readServerConfig} = require('../server.cjs');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value) + '\n');
async function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'observatory-public-test-'));
  const root = path.join(directory, 'runs'), site = path.join(directory, 'site');
  fs.mkdirSync(path.join(site, 'data', 'processes'), {recursive:true});
  fs.writeFileSync(path.join(site, 'process.html'), '<!doctype html><script type="importmap">{"imports":{"three":"./three.js"}}</script><script type="module" src="process.js"></script>');
  fs.writeFileSync(path.join(site, 'index.html'), 'Public site');
  fs.writeFileSync(path.join(site, 'process.js'), 'export const fixture = true;');
  fs.writeFileSync(path.join(site, 'model.glb'), 'fixture');
  fs.writeFileSync(path.join(site, 'font.woff2'), 'fixture');
  fs.writeFileSync(path.join(site, '.private.json'), 'private fixture');
  fs.writeFileSync(path.join(directory, 'secret.txt'), 'outside fixture');
  const runDir = S.createRun({root, id:'current', configuration:{skill:'mazebench-boundary-stagger'}});
  const specFile = path.join(directory, 'spec.json'), spec = {title:'Fixture', cells:[['p','G']], contract:{mode:'fixture'}};
  json(specFile, spec); const candidate = S.captureSpec(runDir, specFile);
  const record = {schemaVersion:1, caseId:'authored-fixture', skill:'boundary-stagger', finalCandidateId:candidate.id, candidates:[{...candidate,cells:spec.cells}]};
  const catalog = {cases:[{id:record.caseId, skill:record.skill, process:{data:'data/processes/authored-fixture.json',schemaVersion:1}}]};
  const catalogFile = path.join(site, 'data', 'catalog.json'), recordFile = path.join(site, 'data', 'processes', 'authored-fixture.json');
  const publish = () => {json(catalogFile, catalog);json(recordFile, record);};
  const server = createServer({root,publicSiteDir:site});server.listen(0, '127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(directory);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert(path.basename(resolved).startsWith('observatory-public-test-'));fs.rmSync(resolved,{recursive:true,force:true});});
  const get = (url, method='GET') => new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:url,method},res=>{const data=[];res.on('data',chunk=>data.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(data).toString()}));});req.on('error',reject);req.end();});
  return {directory,root,site,runDir,specFile,spec,candidate,record,catalog,catalogFile,recordFile,publish,get};
}
test('published process discovery is live and requires the final cells, contract and skill together', async t=>{
  const f=await fixture(t);
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,null);
  f.publish();
  const expected='/Maze-Harness/process.html?case=authored-fixture&candidate=v001';
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,expected);
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,expected);
  S.updateManifest(f.runDir,{configuration:{skillDirectory:'C:/fixture/skills/mazebench-boundary-stagger'}});
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,expected,'An explicit historical skill directory also identifies the skill.');
  f.record.candidates.push({...f.record.candidates[0],id:'stale-final-fixture'});f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,null,'A stale public final pointer cannot match the earlier local final candidate.');
  f.record.candidates.pop();f.publish();
  f.record.skill=f.catalog.cases[0].skill='hook-transfer';f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,null);
  f.record.skill=f.catalog.cases[0].skill='boundary-stagger';f.publish();
  f.spec.contract.mode='revised';json(f.specFile,f.spec);const next=S.captureSpec(f.runDir,f.specFile);
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,null,'An older matching map cannot stand in for the final candidate.');
  f.record.candidates.push({...next,cells:f.spec.cells});f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,null,'A stale finalCandidateId must not select an earlier public candidate.');
  f.record.finalCandidateId=next.id;f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,expected.replace('v001','v002'));
  f.record.candidates.at(-1).cells=[['G','p']];f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,null,'Public cells must agree with their declared fingerprint.');
  f.record.candidates.at(-1).cells=f.spec.cells;
  f.record.candidates.at(-1).cellsSha256='f'.repeat(64);f.publish();
  assert.equal(JSON.parse((await f.get('/api/runs/current')).text).processUrl,null);
});
test('public static assets use appropriate MIME and iframe/importmap policy without relaxing private evidence policy',async t=>{
  const f=await fixture(t);f.publish();
  const page=await f.get('/Maze-Harness/process.html');assert.equal(page.status,200);assert.match(page.headers['content-type'],/^text\/html/);
  const csp=page.headers['content-security-policy'];assert.match(csp,/script-src 'self' 'sha256-/);assert.doesNotMatch(csp,/script-src[^;]*'unsafe-inline'/);assert.match(csp,/style-src 'self' 'unsafe-inline'/);assert.match(csp,/frame-ancestors 'self'/);
  const privateResponse=await f.get('/api/runs');assert.doesNotMatch(privateResponse.headers['content-security-policy'],/unsafe-inline/);assert.match(privateResponse.headers['content-security-policy'],/frame-ancestors 'none'/);
  assert.match((await f.get('/Maze-Harness/process.js')).headers['content-type'],/^text\/javascript/);
  assert.equal((await f.get('/Maze-Harness/model.glb')).headers['content-type'],'model/gltf-binary');
  assert.equal((await f.get('/Maze-Harness/font.woff2')).headers['content-type'],'font/woff2');
  assert.equal((await f.get('/Maze-Harness/process.html','POST')).status,405);
});
test('public routes reject encoded traversal, hidden files, absolute paths and junction escapes',async t=>{
  const f=await fixture(t);f.publish();
  for(const attempted of ['../secret.txt','%2e%2e/secret.txt','%2e%2e/api/runs','%2e%2e%5csecret.txt','/secret.txt','.private.json','data/../../secret.txt','C:/secret.txt']) {
    const response=await f.get('/Maze-Harness/'+attempted);assert.equal(response.status,403,attempted);assert(!response.text.includes('outside fixture'));
  }
  const link=path.join(f.site,'outside');
  try {fs.symlinkSync(f.directory,link,process.platform==='win32'?'junction':'dir');}
  catch(error){t.diagnostic('Junction unavailable: '+error.code);return;}
  assert.equal((await f.get('/Maze-Harness/outside/secret.txt')).status,403);
  f.catalog.cases[0].process.data='../secret.txt';json(f.catalogFile,f.catalog);
  assert.equal(JSON.parse((await f.get('/api/runs')).text).runs[0].processUrl,null);
});
test('site configuration resolves relative to its local settings file',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'observatory-public-test-'));
  try {json(path.join(directory,'.mazebench-observatory.json'),{publicSiteDir:'public-site'});assert.equal(readServerConfig(directory,directory).publicSiteDir,path.join(directory,'public-site'));}
  finally {assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));fs.rmSync(directory,{recursive:true,force:true});}
});
