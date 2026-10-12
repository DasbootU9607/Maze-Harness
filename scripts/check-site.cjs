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
const vectors = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
assert.equal(catalog.skills.length, 4);
assert.equal(catalog.rooms.length, 256);
assert.equal(new Set(catalog.rooms.map(r => r.id)).size, 256);
assert.deepEqual(catalog.rooms.filter(r => r.skill).map(r => r.id).sort(), ['FxE','GxE','GxF','HxH','JxG']);
assert.equal(catalog.cases.filter(c => c.kind === 'official').length, 5);
assert.equal(catalog.cases.filter(c => c.kind === 'authored').length, 4);
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
  const engine = createEngine(data);
  const state = engine.cloneState(engine.initialState);
  for (const direction of entry.witness) {
    assert(vectors[direction], 'Invalid saved input');
    engine.move(state, ...vectors[direction]);
    inputs++;
  }
  const players = data.actors.map((a,i) => a.type === 'player' ? i : -1).filter(i => i >= 0);
  assert(players.some(i => !state.actorRemoved[i]), 'No surviving player: ' + entry.id);
  if (entry.goal.kind !== 'reach') assert(engine.isSolved(state), 'Saved route did not collect all gems: ' + entry.id);
  if (entry.goal.cell) assert(players.some(i => !state.actorRemoved[i] && state.actorX[i] === entry.goal.cell[0] && state.actorY[i] === entry.goal.cell[1] && state.actorElevation[i] === (entry.goal.cell[2] || 0)), 'Saved route did not reach its final doorway: ' + entry.id);
  const record = provenance.cases.find(c => c.id === entry.id);
  assert(record);
  assert.equal(sha(fs.readFileSync(path.join(site, entry.map))), record.sourceMapSha256);
  if (record.skillReference) assert.equal(sha(fs.readFileSync(path.join(root, record.skillReference))), record.sourceMapSha256);
}
for (const runtime of provenance.runtime) assert.equal(sha(fs.readFileSync(path.join(site, 'runtime', runtime.file))), runtime.sha256, 'Runtime changed without refreshing provenance: ' + runtime.file);
for (const skill of catalog.skills) {
  assert(skill.officialCases.length && skill.authoredCases.length);
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
console.log('Site checks passed: 256 rooms, 5 reference mappings, 9 saved solutions (' + inputs + ' inputs), assets, licenses, and source fingerprints.');
