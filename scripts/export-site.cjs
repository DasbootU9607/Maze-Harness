'use strict';

// Export the existing engine and authored trials; never regenerate their geometry.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  assert(i >= 0 && args[i + 1], 'Required: ' + name);
  return path.resolve(args[i + 1]);
}
const engineRoot = option('--engine');
const trialsRoot = option('--trials');
const site = path.join(root, 'site');
const engine = require(path.join(engineRoot, 'server/app.js'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(relative, content) {
  const dest = path.join(site, relative);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}
const json = (relative, data) => write(relative, JSON.stringify(data, null, 2) + '\n');
function copy(source, relative) { write(relative, fs.readFileSync(source)); }
function copyDirectory(source, relative) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) copyDirectory(path.join(source, entry.name), path.join(relative, entry.name));
    else copy(path.join(source, entry.name), path.join(relative, entry.name));
  }
}
function replaceOne(source, from, to) {
  assert.equal(source.split(from).length, 2, 'Upstream patch anchor changed: ' + from.slice(0, 80));
  return source.replace(from, to);
}
const engineCommit = execFileSync('git', ['-C', engineRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const runtimeFiles = [
  'play-rules.js', 'play-core.js', 'play-render-effects.js', 'play-render-terrain.js',
  'play-render-actors.js', 'play-render-three.js', 'play-render-compositor.js',
  'play-render.js', 'maze-engine.js', 'play-movement.js', 'play-world-transitions.js',
  'play-gameplay.js', 'play.js'
];
const runtime = [];
for (const file of runtimeFiles) {
  const original = fs.readFileSync(path.join(engineRoot, 'public', file));
  let text = original.toString('utf8').replaceAll('\r\n', '\n');
  const adaptations = [];
  if (file === 'play-core.js') {
    text = replaceOne(text, 'PLAYER_LIFT_ARROW_URL: `/assets/${encodeURIComponent(currentGameId)}/images/arrow.png`,', 'PLAYER_LIFT_ARROW_URL: "./assets/maze/images/arrow.png",');
    text = replaceOne(text, 'return `${app.playApiBaseUrl}/${encodeURIComponent(levelId)}`;',
      'return `${app.playApiBaseUrl}/${encodeURIComponent(levelId)}.json`;');
    text = replaceOne(text, 'return `/api/play/${encodeURIComponent(app.currentGameId)}/${encodeURIComponent(levelId)}`;',
      'return `./data/levels/${encodeURIComponent(app.currentGameId)}/${encodeURIComponent(levelId)}.json`;');
    const start = text.indexOf('        const routePrefix = app.playRoutePrefix || "play";');
    const end = text.indexOf('\n        window.history.replaceState(', start);
    assert(start > 0 && end > start);
    text = text.slice(0, start) + [
      '        // Static hosting preserves the project subpath and the current query.',
      '        const nextUrl = new URL(window.location.href);',
      '        nextUrl.searchParams.set("world", app.currentGameId);',
      '        nextUrl.searchParams.set("room", app.currentLevelId.replace("level_", ""));'
    ].join('\n') + text.slice(end);
    adaptations.push('Use JSON file URLs and query-based room navigation on static hosts.');
  }
  if (file === 'play-render-three.js') {
    text = replaceOne(text, 'assetUrl("/vendor/three.module.js")', 'assetUrl("../vendor/three.module.js")');
    text = replaceOne(text, 'assetUrl("/vendor/GLTFLoader.js")', 'assetUrl("../vendor/GLTFLoader.js")');
    adaptations.push('Resolve Three.js relative to the runtime module.');
  }
  if (file === 'play.js') {
    text = replaceOne(text, '    function quadrantPadButtonForEvent(event) {', [
      '    function quadrantPadButtonForEvent(event) {',
      '      // The static host also offers individual rectangular touch buttons.',
      '      const directButton = event.target.closest?.("button[data-move], button[data-camera]");',
      '      if (directButton && controls.contains(directButton)) return directButton;'
    ].join('\n'));
    text = replaceOne(text, '    !reducedMotion &&', '    !reducedMotion && window.__HARNESS_WORLD_INTRO__ === true &&');
    text = replaceOne(text, '"/play/" + encodeURIComponent(playWorldData.game.id) + "/" + encodeURIComponent(levelId)',
      '"./player.html?world=" + encodeURIComponent(playWorldData.game.id) + "&room=" + encodeURIComponent(levelId.replace("level_", ""))');
    adaptations.push('Skip the overview intro, retain a static fallback room URL, and recognize individual touch-control buttons.');
  }
  write('runtime/' + file, text);
  runtime.push({ file, sourceSha256: hash(original), sha256: hash(text), adaptations });
}
const vendors = [
  ['build/three.module.js', 'vendor/three.module.js'],
  ['build/three.core.js', 'vendor/three.core.js'],
  ['examples/jsm/loaders/GLTFLoader.js', 'vendor/GLTFLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'utils/BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js', 'utils/SkeletonUtils.js']
];
for (const [src, dest] of vendors) copy(path.join(engineRoot, 'node_modules/three', src), dest);
write('licenses/MazeBenchEngine.txt', fs.readFileSync(path.join(engineRoot, 'LICENSE'),'utf8').replaceAll('\r\n','\n'));
write('licenses/engine-third-party-notices.txt', fs.readFileSync(path.join(engineRoot, 'THIRD_PARTY_NOTICES.md'),'utf8').replaceAll('\r\n','\n'));
copy(path.join(engineRoot, 'node_modules/three/LICENSE'), 'licenses/three.txt');
copyDirectory(path.join(engineRoot, 'games/maze/assets_3d'), 'assets/maze/assets_3d');
copyDirectory(path.join(engineRoot, 'games/maze/images'), 'assets/maze/images');

const skillContent = [
  { id: 'boundary-stagger', name: 'Boundary Stagger', rooms: ['HxH'], verb: 'Make space. Open a route.',
    description: 'Use fixed boundaries and relative offsets to turn a blocked room into a connected sequence of openings.',
    steps: ['Prepare shared space', 'Shift the blocking assembly', 'Open the gem route'],
    exampleDescription: 'Shift rigid groups around fixed boundaries, make room for the next move, and release the path to the gem.' },
  { id: 'hook-transfer', name: 'Hook Transfer', rooms: ['GxE', 'FxE'], verb: 'Reach beyond the pushing face.',
    description: 'Transport and dock a shaped tool so one member receives a push while another moves an otherwise restricted object.',
    steps: ['Transport the tool', 'Dock at a useful contact', 'Continue the passage work'],
    exampleDescription: 'Line up the offset tool, transfer a push to the restricted target, and keep working to reach the gem.' },
  { id: 'constrained-transport', name: 'Constrained Transport', rooms: ['GxF'], verb: 'Deliver the tool. Keep a way back.',
    description: 'Rearrange helpers and recover temporary parking space to deliver a tool with a reachable, usable pushing position.',
    steps: ['Rearrange the helpers', 'Recover shared space', 'Deliver an operable tool'],
    exampleDescription: 'Borrow a crowded aisle, move the tool through it, and recover the space needed for its final use.' },
  { id: 'skating-cross', name: 'Skating Cross', rooms: ['JxG'], verb: 'A moving cross. A new place to stop.',
    description: 'Move a rigid cross across ice to create stopping points, change pushing sides, collect the gem, and return to the doorway.',
    steps: ['Create a stopping point', 'Change pushing sides', 'Collect and return'],
    exampleDescription: 'Slide the cross into new stopping positions, collect the gem, then return to the starting doorway.' }
];
const maps = read(path.join(trialsRoot, 'maps.json'));
const catalog = { repository: 'https://github.com/DasbootU9607/Maze-Harness', engineRepository: 'https://github.com/mazebench/MazeBenchEngine', engineCommit, defaultRoom: 'HxI', skills: [], cases: [], rooms: [] };
const provenance = { engineCommit, officialWorldMapSha256: hash(fs.readFileSync(path.join(engineRoot, 'games/maze/world_map.json'))), runtime, cases: [] };
const mapped = new Map(skillContent.flatMap(s => s.rooms.map(room => [room, s.id])));
function localAssets(value) {
  if (Array.isArray(value)) return value.map(localAssets);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localAssets(v)]));
  if (typeof value === 'string' && value.startsWith('/assets/')) return './assets/maze/' + value.split('/').slice(3).join('/');
  return value;
}
function writeLevel(game, level) {
  const state = localAssets(engine.getLevelState(game, level));
  state.playApiBaseUrl = './data/levels/' + game.id;
  // The visitors' collection history is independent for every world.
  json('data/levels/' + game.id + '/' + level.id + '.json', state);
  return state;
}
const official = engine.getGame('maze');
assert.equal(official.worldMap.levels.length, 256);
const officialStates = new Map();
for (const level of official.worldMap.levels) {
  const state = writeLevel(official, level);
  officialStates.set(level.id.replace('level_', ''), state);
  const room = level.id.replace('level_', '');
  const bytes = fs.readFileSync(path.join(engineRoot, 'games/maze/levels', level.fileName));
  write('data/maps/official-' + room.toLowerCase() + '-world-map.txt', bytes);
  // Compact silhouettes for the world atlas; all 256 come from actual room data.
  const cells = state.terrain.map((row, y) => row.map((tile, x) => {
    if (state.actors.some(a => a.x === x && a.y === y && a.type !== 'gem' && a.type !== 'player')) return 'b';
    if (tile.type === 'wall') return '#';
    if (tile.type === 'void') return ' ';
    if (tile.type === 'ice') return '~';
    return '.';
  }).join(''));
  catalog.rooms.push({ id: room, column: level.columnIndex, row: level.rowIndex, skill: mapped.get(room) || null, cells, sourceFile: level.fileName, sha256: hash(bytes) });
}
// Twenty official rooms are corridors without an authored player. Direct jumps
// supply an arrival actor at a compatible, unoccupied boundary. The source room
// and ordinary doorway transitions remain unchanged.
const sandbox = { window: {}, console, structuredClone };
vm.runInNewContext(fs.readFileSync(path.join(engineRoot, 'public/maze-engine.js'), 'utf8'), sandbox);
for (const room of catalog.rooms) {
  const state = officialStates.get(room.id);
  if (state.actors.some(a => a.type === 'player' || a.type === 'circle_player')) continue;
  const candidates = [];
  const axis = 'ABCDEFGHIJKLMNOP';
  const clear = (s,x,y) => s && s.terrain[y]?.[x]?.type === 'floor' && !s.actors.some(a => a.x === x && a.y === y && a.type !== 'gem');
  for (const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const column = room.column + dc, row = room.row + dr;
    if (column < 0 || row < 0 || column > 15 || row > 15) continue;
    const neighborId = axis[column] + 'x' + axis[row];
    const neighbor = officialStates.get(neighborId);
    for (let p = 1; p < 15; p++) {
      const x = dc ? (dc < 0 ? 0 : 15) : p;
      const y = dr ? (dr < 0 ? 0 : 15) : p;
      const fromX = dc ? (dc < 0 ? 15 : 0) : p;
      const fromY = dr ? (dr < 0 ? 15 : 0) : p;
      if (!clear(state,x,y) || !clear(neighbor,fromX,fromY)) continue;
      const actor = {type:'player',label:'Player',x,y,elevation:0,groupId:null,imageUrl:null,modelUrl:null};
      const e = sandbox.window.MazeEngine.createEngine({...state,actors:[...state.actors,actor]});
      const initial = e.cloneState(e.initialState);
      const step = e.move(initial,-dc,-dr);
      const i = state.actors.length;
      if (step?.moved && !initial.actorRemoved[i] && (initial.actorX[i] !== x || initial.actorY[i] !== y)) candidates.push({x,y,elevation:0,fromRoom:neighborId,fromX,fromY,dx:-dc,dy:-dr,distance:Math.abs(p-7.5)});
    }
  }
  candidates.sort((a,b) => a.distance-b.distance);
  assert(candidates.length, 'No safe direct entry for ' + room.id);
  const {distance, ...directEntry} = candidates[0];
  room.directEntry = directEntry;
}
provenance.directEntryPolicy = 'Rooms without an authored player get a temporary arrival actor only when opened directly. Entries are open, matching floor boundaries with an ordinary legal inward move. Raw maps, exported room states, and normal doorway traversal remain unchanged.';
provenance.directEntryRooms = catalog.rooms.filter(r => r.directEntry).map(r => ({room:r.id,...r.directEntry}));
for (const skill of skillContent) {
  const map = maps.find(m => m.skill === skill.id);
  assert(map, 'Missing authored trial: ' + skill.id);
  const spec = read(path.join(trialsRoot, skill.id + '.json'));
  const game = engine.getGame(map.id);
  const level = engine.getLevel(game, 'level_AxA');
  const state = writeLevel(game, level);
  const bytes = fs.readFileSync(path.join(engineRoot, 'games', game.id, 'levels', level.fileName));
  write('data/maps/authored-' + skill.id + '-world-map.txt', bytes);
  const caseId = 'authored-' + skill.id;
  const authored = { id: caseId, kind: 'authored', title: map.title, skill: skill.id, world: map.id, room: 'AxA', description: skill.exampleDescription, thumbnail: 'assets/thumbnails/' + caseId + '.png', map: 'data/maps/' + caseId + '-world-map.txt', witness: spec.witness, goal: spec.contract.goal };
  json('data/designs/' + skill.id + '.json', { title: spec.title, cells: spec.cells, witness: spec.witness, goal: spec.contract.goal });
  provenance.cases.push({ id: caseId, kind: 'authored', originalDraftId: map.id, title: map.title, sourceMapSha256: hash(bytes), witnessSha256: hash(spec.witness), source: 'Existing agent-authored four-skill playtest; geometry preserved.' });
  const officialCases = [];
  for (const room of skill.rooms) {
    const ref = room === 'FxE' ? 'official-fxe' : 'official';
    const referenceFile = path.join(root, 'skills/mazebench-' + skill.id + '/references/' + ref + '-world-map.txt');
    const design = read(path.join(root, 'skills/mazebench-' + skill.id + '/references/' + ref + '-design.json'));
    const entry = catalog.rooms.find(r => r.id === room);
    assert.equal(hash(fs.readFileSync(referenceFile)), entry.sha256, 'Official room differs from packaged skill evidence: ' + room);
    const id = 'official-' + room.toLowerCase();
    const data = { id, kind: 'official', title: 'Room ' + room, skill: skill.id, world: 'maze', room, description: 'The complete upstream room used by this skill.', thumbnail: 'assets/thumbnails/' + id + '.png', map: 'data/maps/' + id + '-world-map.txt', witness: design.witness, goal: design.contract?.goal || design.goal || { kind: 'gem' } };
    catalog.cases.push(data);
    officialCases.push(id);
    provenance.cases.push({ id, kind: 'official', room, sourceFile: entry.sourceFile, sourceMapSha256: entry.sha256, skillReference: path.relative(root, referenceFile).replaceAll('\\', '/') });
  }
  catalog.cases.push(authored);
  catalog.skills.push({ ...skill, officialCases, authoredCases: [caseId], source: catalog.repository + '/tree/main/skills/mazebench-' + skill.id });
  assert(state.width === spec.cells[0].length && state.height === spec.cells.length);
}
json('data/catalog.json', catalog);
json('data/provenance.json', provenance);
write('.nojekyll', '');
console.log('Exported ' + catalog.rooms.length + ' official rooms, ' + catalog.skills.length + ' skills, and ' + catalog.cases.length + ' playable cases.');
