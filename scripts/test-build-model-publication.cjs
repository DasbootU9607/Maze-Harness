'use strict';

// Read-only real-run reimport, then an explicitly synthetic copy with another
// run identity. Neither source evidence nor the actual website is modified.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {synchronize} = require('./sync-site.cjs');
const {read, hash} = require('./site-content.cjs');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'outputs');
const args = process.argv.slice(2), get = key => args.includes(key) ? path.resolve(args[args.indexOf(key) + 1]) : null;
const options = Object.fromEntries(['engine','spec','build','verification','authoring-run'].map(key => [key,get('--'+key)]));
assert(Object.values(options).every(Boolean), 'Supply --engine, --spec, --build, --verification and --authoring-run for an existing published trial');
options.skill = 'boundary-stagger';
fs.mkdirSync(output,{recursive:true});
const fixture = fs.mkdtempSync(path.join(output,'build-model-publication-'));
const write = (file,value) => fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
try {
  fs.cpSync(path.join(root,'site'),path.join(fixture,'site'),{recursive:true});
  fs.cpSync(path.join(root,'skills'),path.join(fixture,'skills'),{recursive:true});
  synchronize({},fixture);
  const catalogFile = path.join(fixture,'site/data/catalog.json'), before = read(catalogFile);
  synchronize(options,fixture);
  const first = read(catalogFile);
  assert.equal(first.cases.length,before.cases.length,'Real-run reimport must preserve the legacy case ID');
  assert.equal(synchronize(options,fixture).changed.length,0,'Repeated real-run publication is idempotent');
  const records = read(path.join(fixture,'site/data/provenance.json')).cases;
  const original = first.cases.find(entry=>records.find(row=>row.id===entry.id)?.authoringRunSha256);
  assert(original?.process);
  const originalBytes = fs.readFileSync(path.join(fixture,'site',original.process.data));
  const synthetic = path.join(fixture,'synthetic-second-run');
  fs.cpSync(options['authoring-run'],synthetic,{recursive:true});
  const manifestFile = path.join(synthetic,'manifest.json'), manifest=read(manifestFile);
  manifest.id='synthetic-second-run'; write(manifestFile,manifest);
  const eventsFile = path.join(synthetic,'events.jsonl');
  fs.writeFileSync(eventsFile,fs.readFileSync(eventsFile,'utf8').trim().split('\n').map(line=>JSON.stringify({...JSON.parse(line),runId:manifest.id})).join('\n')+'\n');
  const secondOptions = {...options,'authoring-run':synthetic};
  synchronize(secondOptions,fixture);
  const second = read(catalogFile), added=second.cases.filter(entry=>!first.cases.some(row=>row.id===entry.id));
  assert.equal(added.length,1,'Another recorded run with identical geometry gets its own case');
  assert.notEqual(added[0].process.data,original.process.data);
  assert.deepEqual(fs.readFileSync(path.join(fixture,'site',original.process.data)),originalBytes,'Keep the original model and usage evidence unchanged');
  assert.equal(hash(fs.readFileSync(path.join(fixture,'site',added[0].map))),hash(fs.readFileSync(path.join(fixture,'site',original.map))));
  assert.equal(added[0].build.model,original.build.model);
  assert.equal(synchronize(secondOptions,fixture).changed.length,0,'The second run also remains idempotent');
  console.log('PASS: real legacy reimport, distinct run identities for identical maps, unchanged prior evidence and repeat-publication idempotence.');
} finally {
  const resolved=fs.realpathSync(fixture);
  assert(path.dirname(resolved).toLowerCase()===fs.realpathSync(output).toLowerCase()&&path.basename(resolved).startsWith('build-model-publication-'));
  fs.rmSync(resolved,{recursive:true});
}
