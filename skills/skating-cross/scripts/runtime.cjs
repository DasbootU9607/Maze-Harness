'use strict';
// Author-side observations. All transitions use the official ordinary move;
// ice travel is never replaced by one-cell movement or undirected walking.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function load(repo, cells) {
  repo = path.resolve(repo);
  const gamesDir = path.join(repo, 'games');
  const support = require(path.join(repo, 'server/support'));
  const { createMazeWorldMapService } = require(path.join(repo, 'server/maze-world-map'));
  const { createMazeLevelService } = require(path.join(repo, 'server/maze-levels'));
  const worldMaps = createMazeWorldMapService({ gamesDir, ...support, buildMazePreviewData: () => ({ previewUrl: null }) });
  const levels = createMazeLevelService({
    rootDir: repo, gamesDir, worldMaps, ...support,
    loadText: () => cells.map(row => row.join(' ')).join('\n'),
    buildGameAssetUrl: (id, file) => `/games/${id}/${file}`,
    resolveGameAssetPath: (id, file) => path.join(gamesDir, id, file),
    buildMazePreviewData: () => ({ previewUrl: null })
  });
  const { getGame } = require(path.join(repo, 'server/app'));
  global.window = global.window || {};
  require(path.join(repo, 'public/maze-engine'));
  require(path.join(repo, 'public/maze-solver'));
  const data = levels.getLevelState(getGame('maze'), { id: 'level_AxA', fileName: 'skating-author.txt', label: 'AxA' });
  // The packaged profile has a single room: unsupported boundary exits are
  // falling/death, not a completion. Reaching the declared doorway stays legal.
  data.edgeFalls = { left: true, right: true, up: true, down: true };
  const engine = window.MazeEngine.createEngine(data);
  assert.deepEqual(engine.loadWarnings, []);
  return { engine, solver: window.MazeSolver, data };
}
function validate(spec, root) {
  const c = spec.contract;
  assert(spec.title?.trim(), 'Missing title');
  assert(c?.profile === 'planar-skating-cross-v1', 'Unsupported profile');
  assert(['reference', 'complex', 'demo'].includes(c.mode), 'Declare reference, complex, or demo');
  assert(spec.cells?.length === 16 && spec.cells.every(row => row.length === 16), 'Expected 16 by 16 cells');
  assert(spec.cells.flat().every(token => /^(?:\.|i|#|p|G|M[0-4]|(?:\.|i)\+(?:#|p|G|M[0-4]))$/.test(token)), 'Unsupported terrain or token stack');
  assert(/^M[0-4]$/.test(c.group), 'Declare cross group');
  const members = [], walls = [], ice = [];
  let players = 0, gems = 0;
  spec.cells.forEach((row, y) => row.forEach((token, x) => {
    const parts = token.split('+'), top = parts.at(-1);
    if (parts[0] === 'i') ice.push([x, y, 0]);
    if (top === '#') walls.push([x, y, 0]);
    if (/^M[0-4]$/.test(top)) { assert.equal(top, c.group, 'This profile supports one rigid group'); members.push([x, y, 0]); }
    if (top === 'p') players++;
    if (top === 'G') gems++;
  }));
  assert.equal(players, 1); assert.equal(gems, 1); assert(ice.length > 0);
  assert(same(members, c.members), 'Declare every initial member in row order, z=0');
  assert(c.center?.length === 3 && c.center[2] === 0 && c.center.every(Number.isInteger), 'Declare cross center');
  const [cx, cy] = c.center;
  assert(members.some(p => same(p, c.center)));
  assert(members.every(([x, y]) => x === cx || y === cy), 'Members must form a cross');
  for (const [dx, dy] of Object.values(D)) {
    const arm = members.filter(([x, y]) => (dx ? y === cy && (x - cx) * dx > 0 : x === cx && (y - cy) * dy > 0));
    assert(arm.length > 0, 'All four arms are required in this profile');
    for (let n = 1; n <= arm.length; n++) assert(arm.some(p => same(p, [cx + n * dx, cy + n * dy, 0])), 'Disconnected arm');
  }
  assert(c.goal?.kind === 'gem-and-return' && c.goal.cell?.length === 3 && c.goal.cell.every(Number.isInteger) && c.goal.cell[2] === 0);
  const [gx, gy] = c.goal.cell;
  assert(gx >= 0 && gx < 16 && gy >= 0 && gy < 16 && !spec.cells[gy][gx].split('+').includes('#'));
  assert(c.spatial && same(c.spatial.walls, walls) && same(c.spatial.ice, ice), 'Declare complete fixed wall and ice footprints');
  assert(c.inherited?.length && Array.isArray(c.changes), 'Record inherited functions and changes');
  const receipt = c.readReceipt;
  assert(receipt?.path === 'references/reference-case.md' && receipt.readBeforeLayout === true);
  assert.equal(receipt.sha256, hash(fs.readFileSync(path.join(root, receipt.path))), 'Reference reading receipt is stale');
  for (const [name, event] of Object.entries(c.events || {})) {
    assert(/^[a-z0-9_-]+$/i.test(name));
    assert(['motion', 'cross-brake', 'gem'].includes(event.kind), 'Unsupported event kind');
    if (event.direction) assert(D[event.direction]);
    if (event.centerAfter) assert(event.centerAfter.length === 3 && event.centerAfter.every(Number.isInteger) && event.centerAfter[2] === 0);
  }
  for (const dependency of c.dependencies || []) {
    assert(c.events[dependency.prepare] && (dependency.before === 'goal' || c.events[dependency.before]));
    if (dependency.after) assert(c.events[dependency.after]);
    assert(dependency.conflict && dependency.effect, 'Explain the functional dependency');
  }
  if (c.mode === 'complex') {
    assert(c.stages?.length >= 3 && c.dependencies?.length >= 2, 'Complex mode requires at least three connected functional stages');
    assert.equal(new Set(c.stages.map(s => s.event)).size, c.stages.length, 'Do not count repeated event selectors as stages');
    for (const stage of c.stages) {
      assert(stage.name && c.events[stage.event] && stage.conflict && stage.effect);
      assert(c.dependencies.some(d => d.prepare === stage.event || d.before === stage.event), 'Unconnected stage');
    }
    assert(c.dependencies.some(d => c.stages.some(s => s.event === d.prepare) && c.stages.some(s => s.event === d.before)), 'Missing between-stage link');
    const links = new Map();
    function link(a, b) { (links.get(a) || links.set(a, new Set()).get(a)).add(b); (links.get(b) || links.set(b, new Set()).get(b)).add(a); }
    for (const d of c.dependencies) { link(d.prepare, d.before); if (d.after) { link(d.after, d.prepare); link(d.after, d.before); } }
    const reached = new Set(), todo = [c.stages[0].event];
    while (todo.length) { const name = todo.pop(); if (reached.has(name)) continue; reached.add(name); todo.push(...(links.get(name) || [])); }
    assert(c.stages.every(s => reached.has(s.event)), 'Functional stages do not form one dependency component');
  }
  return c;
}
function observer(e, spec) {
  const c = spec.contract, player = e.actorTypes.indexOf('player');
  const snap = s => e.actorTypes.map((type, i) => ({ i, type, group: e.actorGroupIds[i] || null, cell: [s.actorX[i], s.actorY[i], s.actorElevation[i]], removed: !!s.actorRemoved[i] }));
  const group = a => a.filter(p => p.group === c.group && !p.removed);
  const pose = a => group(a).map(p => p.cell);
  const center = a => { const delta = pose(a)[0].map((n, i) => n - c.members[0][i]); return c.center.map((n, i) => n + delta[i]); };
  const goal = s => !s.actorRemoved[player] && e.isSolved(s) && same([s.actorX[player], s.actorY[player], s.actorElevation[player]], c.goal.cell);
  const alive = s => !s.actorRemoved[player];
  function intact(a, b) {
    const old = group(a), now = group(b);
    assert.equal(now.length, old.length, 'Cross member removed');
    const delta = now[0].cell.map((n, i) => n - old[0].cell[i]);
    assert(now.every((p, i) => p.cell[2] === 0 && p.cell.every((n, k) => n - old[i].cell[k] === delta[k])), 'Cross is not one planar rigid body');
    assert(b[player].cell[2] === 0 && !b[player].removed, 'Player left planar profile');
  }
  function event(a, b, d, result) {
    const [dx, dy] = D[d], delta = pose(b)[0].map((n, i) => n - pose(a)[0][i]);
    const motion = delta.some(n => n !== 0);
    const p = b[player].cell;
    const brakingMember = group(b).find(q => same(q.cell, [p[0] + dx, p[1] + dy, p[2]]))?.cell || null;
    const path = result.moves.find(m => m.actorIndex === player)?.path || [
      { x: a[player].cell[0], y: a[player].cell[1], elevation: 0 },
      { x: p[0], y: p[1], elevation: 0 }
    ];
    const distance = Math.abs(p[0] - a[player].cell[0]) + Math.abs(p[1] - a[player].cell[1]);
    const blockers = pose(b).flatMap(member => {
      const target = [member[0] + dx, member[1] + dy, 0];
      const token = spec.cells[target[1]]?.[target[0]];
      return !token || token.split('+').includes('#') ? [{ member, target, token: token || 'outside' }] : [];
    });
    return { direction: d, motion, delta, centerBefore: center(a), centerAfter: center(b), playerBefore: a[player].cell, playerAfter: p,
      crossBrake: !motion && distance > 1 && !!brakingMember, brakingMember, path, distance, blockers,
      gem: a.some((p, i) => p.type === 'gem' && !p.removed && b[i].removed) };
  }
  function matches(v, selector) {
    return (selector.kind === 'motion' ? v.motion : selector.kind === 'gem' ? v.gem : v.crossBrake)
      && (!selector.direction || v.direction === selector.direction)
      && (!selector.centerAfter || same(v.centerAfter, selector.centerAfter));
  }
  return { snap, group, pose, center, goal, alive, intact, event, matches, player };
}
function search(e, o, { cap = 300000, start = e.initialState, end = o.goal, reject = () => false, history = null, update = h => h, endHistory = () => true } = {}) {
  const nodes = [{ state: e.cloneState(start), previous: -1, direction: '', history }];
  const key = (state, h) => e.stateKey(state) + '|' + JSON.stringify(h);
  const seen = new Set([key(start, history)]);
  let head = 0;
  while (head < nodes.length) {
    if (head >= cap) return { status: 'capped', expanded: head, cap, discovered: nodes.length };
    const n = nodes[head];
    if (end(n.state) && endHistory(n.history)) {
      let i = head, route = '';
      while (nodes[i].previous >= 0) { route = nodes[i].direction + route; i = nodes[i].previous; }
      return { status: 'solved', path: route, expanded: head, cap, discovered: nodes.length };
    }
    const before = o.snap(n.state);
    for (const [d, delta] of Object.entries(D)) {
      const s = e.cloneState(n.state), result = e.move(s, ...delta);
      if (!result.moved || !o.alive(s)) continue;
      const after = o.snap(s); o.intact(before, after);
      const v = o.event(before, after, d, result);
      if (reject(v, n.history)) continue;
      const h = update(n.history, v), k = key(s, h);
      if (seen.has(k)) continue;
      seen.add(k); nodes.push({ state: s, previous: head, direction: d, history: h });
    }
    head++;
  }
  return { status: 'unsolved', expanded: head, cap, discovered: nodes.length };
}
function replay(e, o, route, { start = e.initialState, end = o.goal, reject = () => false, history = null, update = h => h, endHistory = () => true } = {}) {
  const s = e.cloneState(start), rows = []; let h = history;
  for (const [i, d] of [...route].entries()) {
    assert(D[d]); const before = o.snap(s), result = e.move(s, ...D[d]);
    assert(result.moved && o.alive(s), 'Illegal or fatal input ' + (i + 1));
    const after = o.snap(s); o.intact(before, after);
    const v = o.event(before, after, d, result);
    assert(!reject(v, h), 'Route violates restriction'); h = update(h, v);
    rows.push({ step: i + 1, direction: d, before, after, event: v });
  }
  assert(end(s) && endHistory(h), 'Route does not finish the declared objective');
  return { state: s, rows, history: h };
}
// Enumerate stop states with the cross frozen. The directed graph includes gem
// collection state; no reciprocal walking component or transit-as-stop shortcut.
function stopping(e, o, start, cap = 300000) {
  const nodes = [{ state: e.cloneState(start), path: '' }], seen = new Set([e.stateKey(start)]);
  let head = 0;
  while (head < nodes.length) {
    if (head >= cap) return { status: 'capped', expanded: head, nodes };
    const n = nodes[head], before = o.snap(n.state);
    for (const [d, delta] of Object.entries(D)) {
      const state = e.cloneState(n.state), r = e.move(state, ...delta);
      if (!r.moved || !o.alive(state)) continue;
      const after = o.snap(state); o.intact(before, after);
      if (o.event(before, after, d, r).motion) continue;
      const k = e.stateKey(state); if (seen.has(k)) continue;
      seen.add(k); nodes.push({ state, path: n.path + d });
    }
    head++;
  }
  return { status: 'exhausted', expanded: head, nodes };
}
module.exports = { D, read, hash, same, load, validate, observer, search, replay, stopping };
