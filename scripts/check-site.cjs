'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const read = relative => JSON.parse(fs.readFileSync(path.join(site, relative), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const catalog = read('data/catalog.json');
const provenance = read('data/provenance.json');
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
require('./sync-site.cjs').synchronize({ check: true });
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
for (const page of ['index','skill','world','player','about']) {
  const html = fs.readFileSync(path.join(site, page + '.html'), 'utf8');
  for (const [,url] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (/^https?:/.test(url)) continue;
    assert(!url.startsWith('/'), 'Root-relative URL breaks project Pages: ' + url);
    assert(fs.existsSync(path.join(site,url)), 'Missing page dependency: ' + url);
  }
}
console.log('Site checks passed: 256 rooms, ' + catalog.skills.length + ' skills, ' + catalog.rooms.filter(r => r.skill).length + ' reference rooms, ' + catalog.cases.length + ' saved solutions (' + inputs + ' inputs), assets, licenses, and source fingerprints.');
