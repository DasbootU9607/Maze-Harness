'use strict';

// Integrity fixtures execute two different legal routes through the official
// engine. These are synthetic tests, not authoring-history or difficulty claims.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const store = require('../tools/authoring-observatory/lib/store.cjs');
const {exportProcess, assertPublicPrivacy} = require('./export-authoring-process.cjs');
const {attachProcessPreviews, buildLevel, engineFactory, validatePreviewFiles} = require('./process-previews.cjs');
const {hash} = require('./site-content.cjs');
const args = process.argv.slice(2), engineArg = args.indexOf('--engine');
assert(engineArg >= 0 && args[engineArg + 1], 'Supply --engine ENGINE');
const engineRoot = path.resolve(args[engineArg + 1]), root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(root, 'outputs/process-replays-'));
const site = path.join(temporary, 'site'), runtime = path.join(root, 'site/runtime/maze-engine.js');
const write = (file, value) => {fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');};
const vectors = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};

try {
  const cells = Array.from({length:16}, () => Array(16).fill('#'));
  for (let x = 1; x <= 5; x++) cells[2][x] = '.';
  cells[2][2] = 'p'; cells[2][4] = 'G';
  const spec = {title:'Two recorded route fixture',cells,contract:{fixture:'two-independent-replays'}};
  const specFile = path.join(temporary, 'design.json'); write(specFile, spec);
  const run = store.createRun({root:temporary,id:'run-fixture',title:spec.title});
  const candidate = store.captureSpec(run, specFile), caseId = 'authored-replay-integrity-fixture';
  const level = buildLevel(engineRoot, {...candidate,cells}, caseId), createEngine = engineFactory(runtime);
  for (const [index, route] of ['RR', 'LRRR'].entries()) {
    const engine = createEngine(level), state = engine.cloneState(engine.initialState), frames = [];
    for (let step = 0; step <= route.length; step++) {
      if (step) assert(engine.move(state, ...vectors[route[step - 1]]).moved);
      frames.push({step,direction:step ? route[step - 1] : null,actors:Array.from(engine.actorTypes, (type,id) => ({id,type,groupId:engine.actorGroupIds[id] || null,x:state.actorX[id],y:state.actorY[id],z:state.actorElevation[id],removed:!!state.actorRemoved[id]}))});
    }
    assert(engine.isSolved(state));
    const file = path.join(temporary, 'replay-' + index + '.json');
    write(file, {path:route,fingerprints:{cells:candidate.cellsSha256,contract:candidate.contractSha256},frames,private:'PRIVATE-SAVED-REPLAY-CONTENT'});
    const artifactPath = store.saveArtifact(run, file, 'replay');
    store.appendEvent(run, 'artifact.saved', {kind:'replay',artifactPath}, {candidateId:candidate.id,evidenceRefs:[artifactPath]});
  }
  const command = store.appendEvent(run, 'command.started', {label:'Synthetic ordinary replay validation',inputSha256:candidate.sha256}, {candidateId:candidate.id});
  store.appendEvent(run, 'command.completed', {commandEventId:command.id,code:0}, {candidateId:candidate.id});
  const report = path.join(temporary, 'report.json'); write(report, {overall:'passed',fingerprints:{cells:candidate.cellsSha256,contract:candidate.contractSha256},scope:'Synthetic replay binding fixture only.'});
  store.addTest(run, {candidateId:candidate.id,status:'passed',binding:'exact',bindingBasis:'report-fingerprints-and-command-boundaries',inputSha256:candidate.sha256,inputCellsSha256:candidate.cellsSha256,inputContractSha256:candidate.contractSha256,processExitCode:0,commandEventId:command.id,reportPath:store.saveArtifact(run,report),reportSha256:hash(fs.readFileSync(report)),scope:'Synthetic replay binding fixture only.',checks:[]});
  store.updateManifest(run, {status:'complete'});
  const doc = exportProcess(run, {caseId,title:spec.title,skill:'fixture',expectedCellsSha256:candidate.cellsSha256,expectedContractSha256:candidate.contractSha256});
  attachProcessPreviews(doc, run, {engineRoot,runtime,emit:(relative,bytes) => write(path.join(site,relative),bytes)});
  write(path.join(site, 'runtime/maze-engine.js'), fs.readFileSync(runtime));
  const assets = value => {if (Array.isArray(value)) value.forEach(assets); else if (value && typeof value === 'object') for (const [key,child] of Object.entries(value)) {
    if (['imageUrl','modelUrl'].includes(key) && child) write(path.join(site,child), fs.readFileSync(path.join(root,'site',child))); else assets(child);
  }};
  assets(level);
  const preview = doc.candidates[0].preview;
  assert.equal(doc.replays.length, 2); assert.equal(preview.replays.length, 2);
  assert.deepEqual(preview.replay, preview.replays[0]);
  assert.equal(new Set(doc.replays.map(record => record.data)).size, 2);
  assert.deepEqual(preview.replays.map(record => record.route), ['RR','LRRR']);
  assertPublicPrivacy(doc); assert(!JSON.stringify(doc).includes('PRIVATE-SAVED-REPLAY-CONTENT'));
  validatePreviewFiles(site, doc);

  const missing = structuredClone(doc); missing.candidates[0].preview.replays.pop();
  assert.throws(() => validatePreviewFiles(site, missing), /Every recorded replay/);
  const borrowed = structuredClone(doc); borrowed.candidates[0].preview.replays[1].cellsSha256 = '0'.repeat(64);
  assert.throws(() => validatePreviewFiles(site, borrowed), /record mismatch/);
  const privateField = structuredClone(doc); privateField.candidates[0].preview.replays[1].command = 'PRIVATE';
  assert.throws(() => assertPublicPrivacy(privateField), /Non-allowlisted/);
  const secondFile = path.join(site, preview.replays[1].data), original = fs.readFileSync(secondFile);
  const changed = JSON.parse(original); changed.frames[1].actors[0].x++;
  write(secondFile, changed);
  const corrupt = structuredClone(doc), changedHash = hash(fs.readFileSync(secondFile));
  corrupt.replays[1].sha256 = changedHash; corrupt.candidates[0].preview.replays[1].sha256 = changedHash;
  assert.throws(() => validatePreviewFiles(site, corrupt), /Saved actors differ/);
  fs.writeFileSync(secondFile, original);

  const legacy = structuredClone(doc), oldPath = `data/process-replays/${caseId}/${candidate.id}.json`;
  legacy.replays = [legacy.replays[0]]; legacy.replays[0].data = oldPath;
  legacy.candidates[0].preview.replay.data = oldPath; delete legacy.candidates[0].preview.replay.id; delete legacy.candidates[0].preview.replays;
  write(path.join(site,oldPath), fs.readFileSync(path.join(site,preview.replay.data)));
  validatePreviewFiles(site, legacy);

  const source = fs.readFileSync(path.join(root,'site/process.js'),'utf8');
  const functionSource = source.slice(source.indexOf('function exactReplayFor('), source.indexOf('function renderPreview('));
  const select = vm.runInNewContext('(' + functionSource.trim() + ')');
  for (const record of doc.replays) assert.equal(select({kind:'replay'},record,doc.candidates[0]),record);
  assert.equal(select({kind:'replay'},{...doc.replays[1],id:'replay-unrecorded'},doc.candidates[0]),null);
  assert.equal(select({kind:'replay'},{...doc.replays[1],route:'RR'},doc.candidates[0]),null);
  assert.equal(select({kind:'replay'},legacy.replays[0],legacy.candidates[0]),legacy.replays[0]);
  console.log(JSON.stringify({passed:true,multipleReplayArtifacts:2,officialReplayFrames:8,legacySingleReplay:true,secondReplayTamperRejected:true,exactUiSelection:true}));
} finally {
  const relative = path.relative(path.join(root,'outputs'),temporary);
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  fs.rmSync(temporary,{recursive:true,force:true});
}
