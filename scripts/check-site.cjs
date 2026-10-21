'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { assertPublicPrivacy, assertAcyclic } = require('./export-authoring-process.cjs');
const { hash } = require('./site-content.cjs');
const { validatePreviewFiles } = require('./process-previews.cjs');

function checkAuthoringProcess(site, entry, record) {
  if (!entry.process) {
    assert(!record.authoringProcess, 'Process provenance has no case metadata: ' + entry.id);
    return;
  }
  assert.equal(entry.kind, 'authored', 'Process metadata is only supported for authored cases');
  assert.deepEqual(Object.keys(entry.process).sort(), ['data', 'schemaVersion']);
  assert.equal(entry.process.schemaVersion, 1);
  assert.equal(entry.process.data, 'data/processes/' + entry.id + '.json', 'Unexpected process data location');
  const evidence = record.authoringProcess;
  assert(evidence && evidence.schemaVersion === 1, 'Missing process provenance');
  assert.equal(evidence.data, entry.process.data);
  const file = fs.realpathSync(path.join(site, entry.process.data)), base = fs.realpathSync(site), relative = path.relative(base, file);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Process file escapes the static website');
  const bytes = fs.readFileSync(file);
  assert.equal(hash(bytes), evidence.sha256, 'Process bytes SHA-256 mismatch');
  const process = JSON.parse(bytes.toString('utf8'));
  assertPublicPrivacy(process); assertAcyclic(process.nodes, process.edges);
  assert.equal(process.schemaVersion, 1); assert.equal(process.caseId, entry.id); assert.equal(process.skill, entry.skill); assert.equal(process.title, entry.title);
  assert.equal(process.coverage.audit.failed, 0);
  const audit = process.coverage.audit, exceptions = audit.exceptions || [];
  if (audit.status === 'passed') { assert.equal(audit.unknown, 0); assert.equal(exceptions.length, 0); }
  else {
    assert.equal(audit.status, 'unknown'); assert(exceptions.length > 0); assert.equal(exceptions.length, audit.unknown);
    assert.equal(new Set(exceptions.map(item => item.testId)).size, exceptions.length);
    for (const item of exceptions) {
      const test = process.tests.find(test => test.id === item.testId);
      assert(item.check === 'test.bindingBasis' && item.status === 'unknown' && item.basis === 'command-boundaries-only' && test && ['failed', 'error', 'unknown'].includes(test.status) && test.bindingBasis === item.basis, 'Unapproved audit uncertainty');
    }
  }
  const weakTests = process.tests.filter(test => test.bindingBasis === 'command-boundaries-only');
  assert.deepEqual(weakTests.map(test => test.id).sort(), exceptions.map(item => item.testId).sort(), 'Audit exceptions must identify every weakly bound test');
  assert(weakTests.every(test => ['failed', 'error', 'unknown'].includes(test.status) && test.binding === 'observed-command-association'), 'Weakly bound history cannot claim exact or passed');
  const nodes = new Map(process.nodes.map(node => [node.id, node]));
  const candidates = new Map(process.candidates.map(candidate => [candidate.id, candidate]));
  const tests = new Map(process.tests.map(test => [test.id, test]));
  assert.equal(candidates.size, process.candidates.length); assert.equal(tests.size, process.tests.length);
  const hasEdge = (from, to, kind) => process.edges.some(edge => edge.from === from && edge.to === to && edge.kind === kind);
  const nodeFor = (row, kind, key) => {
    const node = nodes.get(row.graphNodeId); assert(node && node.kind === kind && node.details[key] === row.id, 'Graph endpoint does not match its public record'); return node;
  };
  const occupiedNodes = new Set();
  for (const candidate of process.candidates) {
    const node = nodeFor(candidate, 'candidate', 'candidateId'); assert(!occupiedNodes.has(candidate.graphNodeId)); occupiedNodes.add(candidate.graphNodeId);
    assert.equal(node.details.cellsSha256, candidate.cellsSha256); assert.equal(node.details.contractSha256, candidate.contractSha256);
    assert.equal(hash(candidate.cells), candidate.cellsSha256, 'Public candidate cells fingerprint mismatch');
    for (const key of ['sha256', 'cellsSha256', 'contractSha256']) assert(/^[a-f0-9]{64}$/.test(candidate[key]), 'Invalid candidate fingerprint');
    assert.deepEqual(candidate.parentIds, candidate.parentId ? [candidate.parentId] : []);
    if (candidate.parentId) {
      const parent = candidates.get(candidate.parentId); assert(parent, 'Missing public parent candidate');
      assert(hasEdge(parent.graphNodeId, candidate.graphNodeId, 'revision'), 'Missing recorded revision edge');
    }
  }
  for (const test of process.tests) {
    const node = nodeFor(test, 'test', 'testId'); assert(!occupiedNodes.has(test.graphNodeId)); occupiedNodes.add(test.graphNodeId);
    assert(['passed', 'failed', 'unknown', 'error'].includes(test.status));
    assert.equal(node.status, test.status === 'error' ? 'failed' : test.status, 'Test node verdict differs from its public record');
    assert(test.checks.every(check => typeof check.name === 'string' && ['passed', 'failed', 'unknown', 'error'].includes(check.status)));
    if (test.candidateId) { assert(candidates.has(test.candidateId), 'Test references a missing candidate'); assert(hasEdge(candidates.get(test.candidateId).graphNodeId, test.graphNodeId, 'tested'), 'Missing tested edge'); }
  }
  for (const [kind, list, key] of [['note', process.notes, 'noteId'], ['resource', process.resources, 'resourceId'], ['operation', process.operations || [], 'operationId'], ['replay', process.replays || [], 'replayId']]) {
    assert.equal(new Set(list.map(row => row.id)).size, list.length, 'Duplicate public record');
    for (const row of list) {
      const node = nodeFor(row, kind, key); assert(!occupiedNodes.has(row.graphNodeId)); occupiedNodes.add(row.graphNodeId);
      if (row.candidateId) { assert(candidates.has(row.candidateId)); assert.equal(node.details.candidateId, row.candidateId); }
      if (kind === 'operation') {
        assert.equal(row.status, 'completed'); assert.equal(node.status, 'neutral');
        for (const field of ['inputCandidateId', 'outputCandidateId']) if (row[field]) assert(candidates.has(row[field]), 'Operation references an unknown candidate');
        assert.equal(row.candidateId, row.outputCandidateId || row.inputCandidateId);
      }
      if (kind === 'replay') {
        const candidate = candidates.get(row.candidateId); assert(candidate);
        assert.equal(row.cellsSha256, candidate.cellsSha256); assert.equal(row.contractSha256, candidate.contractSha256);
        assert.equal(row.binding, 'exact-artifact'); assert.equal(row.sourceKind, 'saved-replay');
        assert(/^[UDLR]+$/.test(row.route)); assert.equal(row.frameCount, row.route.length + 1);
      }
    }
  }
  if (process.coverage.sources) {
    const source = process.coverage.sources;
    for (const id of source.originalCaseResourceIds) assert(process.resources.some(resource => resource.id === id && resource.delivery === 'recorded-read'));
    assert.equal(source.directOriginalCaseRead, source.originalCaseResourceIds.length ? 'recorded' : 'not-recorded');
    for (const item of source.indirect) for (const id of item.viaResourceIds) assert(process.resources.some(resource => resource.id === id && resource.delivery === 'recorded-read'));
  }
  validatePreviewFiles(site, process);
  const final = process.candidates.at(-1);
  assert(final && final.id === process.finalCandidateId, 'Process final candidate is stale');
  assert.equal(final.cellsSha256, evidence.cellsSha256, 'Process final cells differ from provenance');
  assert.equal(final.contractSha256, evidence.contractSha256, 'Process final contract differs from provenance');
  assert.equal(final.cellsSha256, record.verification.cellsSha256, 'Process final cells differ from verification');
  assert.equal(final.contractSha256, record.verification.contractSha256, 'Process final contract differs from verification');
  const published = JSON.parse(fs.readFileSync(path.join(site, 'data/designs/' + entry.id + '.json'), 'utf8'));
  assert.equal(hash(published.cells), final.cellsSha256, 'Process final cells differ from the published design');
  const deliveries = process.nodes.filter(node => node.kind === 'delivery'); assert.equal(deliveries.length, 1);
  const delivery = deliveries[0]; assert.equal(delivery.details.candidateId, final.id); assert.equal(delivery.details.caseId, entry.id);
  assert.equal(delivery.details.cellsSha256, final.cellsSha256); assert.equal(delivery.details.contractSha256, final.contractSha256);
  assert.equal(occupiedNodes.size + 1, process.nodes.length, 'Unbound public graph node');
  const permitted = { revision: ['candidate', 'candidate'], tested: ['candidate', 'test'], cites: ['resource', 'note'], annotation: ['candidate', 'note'], supports: [null, 'delivery'] };
  for (const edge of process.edges) {
    const from = nodes.get(edge.from), to = nodes.get(edge.to), kinds = permitted[edge.kind];
    assert(kinds && (!kinds[0] || kinds[0] === from.kind) && kinds[1] === to.kind, 'Invalid process edge endpoint kinds');
    if (edge.kind === 'revision') assert.equal(candidates.get(to.details.candidateId).parentId, from.details.candidateId, 'Unrecorded revision edge');
    if (edge.kind === 'tested') assert.equal(tests.get(to.details.testId).candidateId, from.details.candidateId, 'Test edge targets the wrong candidate');
    if (edge.kind === 'annotation') assert.equal(process.notes.find(note => note.id === to.details.noteId).candidateId, from.details.candidateId, 'Annotation edge targets the wrong candidate');
    if (edge.kind === 'supports') {
      if (from.kind === 'candidate') assert.equal(from.details.candidateId, final.id, 'An older candidate cannot support final delivery');
      else { assert.equal(from.kind, 'test'); const test = tests.get(from.details.testId); assert(test.status === 'passed' && test.binding === 'exact' && (!test.bindingBasis || test.bindingBasis === 'report-fingerprints-and-command-boundaries') && test.category === 'test' && test.candidateId === final.id, 'Failed or unbound test cannot support delivery'); }
    }
  }
  assert(hasEdge(final.graphNodeId, delivery.id, 'supports'), 'Missing final delivery association');
  assert(process.tests.some(test => test.status === 'passed' && test.binding === 'exact' && test.category === 'test' && test.candidateId === final.id && hasEdge(test.graphNodeId, delivery.id, 'supports')), 'Missing passed final delivery evidence');
  return process;
}

function checkSite(root = path.resolve(__dirname, '..')) {
const site = path.join(root, 'site');
const read = relative => JSON.parse(fs.readFileSync(path.join(site, relative), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const catalog = read('data/catalog.json');
const provenance = read('data/provenance.json');
const thumbnails = require('./process-thumbnails.cjs');
const rendererSha256 = catalog.cases.some(entry => entry.process) ? thumbnails.rendererFingerprint(site) : null;
const context = { window: {}, console, structuredClone };
vm.runInNewContext(fs.readFileSync(path.join(site, 'runtime/maze-engine.js'), 'utf8'), context);
const createEngine = context.window.MazeEngine.createEngine;
const replay = require('./site-content.cjs').createReplay(path.join(site, 'runtime/maze-engine.js'));
assert(catalog.skills.length > 0);
assert.equal(new Set(catalog.skills.map(s => s.id)).size, catalog.skills.length);
assert.equal(new Set(catalog.cases.map(c => c.id)).size, catalog.cases.length);
assert.equal(catalog.rooms.length, 256);
assert.equal(new Set(catalog.rooms.map(r => r.id)).size, 256);
for (const room of catalog.rooms) {
  const skills = catalog.skills.filter(s => s.rooms.includes(room.id)).map(s => s.id);
  assert.deepEqual(room.skills || (room.skill ? [room.skill] : []), skills, 'Stale room-to-skill mapping: ' + room.id);
  assert.equal(room.skill, skills[0] || null);
}
require('./sync-site.cjs').synchronize({ check: true }, root);
function checkAssets(value) {
  if (Array.isArray(value)) value.forEach(checkAssets);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkAssets);
  else if (typeof value === 'string' && value.startsWith('./assets/')) assert(fs.existsSync(path.join(site, value)), 'Missing asset: ' + value);
}
for (const room of catalog.rooms) {
  assert.equal(room.id, 'ABCDEFGHIJKLMNOP'[room.column] + 'x' + 'ABCDEFGHIJKLMNOP'[room.row]);
  const state = read('data/levels/maze/level_' + room.id + '.json');
  assert.equal(state.gameId, 'maze');
  assert.equal(state.levelId, 'level_' + room.id);
  assert.equal(state.terrain.length, state.height);
  assert(state.terrain.every(row => row.length === state.width));
  if (!state.actors.some(a => ['player','circle_player'].includes(a.type))) {
    assert(room.directEntry, 'Room has no direct entry: ' + room.id);
    const {x,y,dx,dy,fromRoom,fromX,fromY} = room.directEntry;
    assert.equal(state.terrain[y][x].type,'floor');
    const neighbor = read('data/levels/maze/level_' + fromRoom + '.json');
    assert.equal(neighbor.terrain[fromY][fromX].type,'floor');
    const e = createEngine({...state,actors:[...state.actors,{type:'player',x,y,elevation:0}]});
    const s = e.cloneState(e.initialState);
    assert(e.move(s,dx,dy).moved, 'Direct entry must allow movement: ' + room.id);
    assert(!s.actorRemoved[state.actors.length]);
  }
  checkAssets(state);
  createEngine(state);
  assert.equal(sha(fs.readFileSync(path.join(site, 'data/maps/official-' + room.id.toLowerCase() + '-world-map.txt'))), room.sha256);
}
let inputs = 0;
for (const entry of catalog.cases) {
  const data = read('data/levels/' + entry.world + '/level_' + entry.room + '.json');
  checkAssets(data);
  assert(fs.existsSync(path.join(site, entry.thumbnail)), 'Missing thumbnail: ' + entry.id);
  assert(fs.statSync(path.join(site, entry.thumbnail)).size > 5000, 'Empty thumbnail: ' + entry.id);
  const objectiveVerification = replay(data, entry);
  inputs += entry.witness.length;
  const record = provenance.cases.find(c => c.id === entry.id);
  assert(record);
  const process = checkAuthoringProcess(site, entry, record);
  if (process) for (const candidate of process.candidates.filter(candidate => candidate.preview)) {
    thumbnails.verifyThumbnail(site,process,candidate,rendererSha256);
  }
  if (record.witnessSha256) assert.equal(sha(entry.witness), record.witnessSha256);
  if (record.goalSha256) assert.equal(sha(JSON.stringify(entry.goal)), record.goalSha256);
  if (record.completeObjectiveSha256) assert.equal(sha(JSON.stringify(entry.completeObjective)), record.completeObjectiveSha256);
  if (record.objectiveVerification) assert.deepEqual(objectiveVerification, record.objectiveVerification, 'Complete objective evidence changed');
  assert.equal(sha(fs.readFileSync(path.join(site, entry.map))), record.sourceMapSha256);
  if (record.skillReference) {
    const bytes = fs.readFileSync(path.join(root, record.skillReference));
    assert.equal(sha(bytes), record.skillReferenceSha256 || record.sourceMapSha256);
    assert.equal(bytes.toString('utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(site, entry.map), 'utf8').replace(/\r\n/g, '\n'), 'Official reference changed beyond line endings');
  }
  if (record.solutionReference) assert.equal(sha(fs.readFileSync(path.join(root, record.solutionReference))), record.solutionSha256);
}
for (const runtime of provenance.runtime) assert.equal(sha(fs.readFileSync(path.join(site, 'runtime', runtime.file))), runtime.sha256, 'Runtime changed without refreshing provenance: ' + runtime.file);
for (const skill of catalog.skills) {
  assert(skill.officialCases.length);
  assert(fs.existsSync(path.join(root, 'skills/mazebench-' + skill.id + '/SKILL.md')));
  for (const id of [...skill.officialCases, ...skill.authoredCases]) assert(catalog.cases.some(c => c.id === id && c.skill === skill.id));
}
for (const name of ['MazeBenchEngine.txt','engine-third-party-notices.txt','three.txt','geist.txt']) assert(fs.statSync(path.join(site,'licenses',name)).size > 500);
for (const page of ['index','skill','world','player','about', ...(catalog.cases.some(entry => entry.process) ? ['process', 'process-player'] : [])]) {
  const html = fs.readFileSync(path.join(site, page + '.html'), 'utf8');
  for (const [,url] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (/^https?:/.test(url)) continue;
    assert(!url.startsWith('/'), 'Root-relative URL breaks project Pages: ' + url);
    assert(fs.existsSync(path.join(site,url)), 'Missing page dependency: ' + url);
  }
}
console.log('Site checks passed: 256 rooms, ' + catalog.skills.length + ' skills, ' + catalog.rooms.filter(r => r.skill).length + ' reference rooms, ' + catalog.cases.length + ' saved solutions (' + inputs + ' inputs), assets, licenses, and source fingerprints.');
}
if (require.main === module) checkSite();
module.exports = { checkSite, checkAuthoringProcess };
