'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const vectors = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const snapshot = state => Object.fromEntries(['actorX', 'actorY', 'actorElevation', 'actorRemoved', 'terrain', 'liftRaised'].map(key => [key, Array.from(state[key])]));
const position = (state, actor) => [state.actorX[actor], state.actorY[actor], state.actorElevation[actor], state.actorRemoved[actor]];
function verify(repo, designFile = path.join(root, 'references/official-design.json')) {
  const design = read(designFile);
  assert.equal(design.contract.profile, 'official-bridge-convoy-v1', 'Unsupported profile: no verification result');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  assert.equal(commit, design.engineCommit, 'Use the pinned engine commit');
  const enginePath = path.join(repo, 'public/maze-engine.js');
  assert.equal(sha(fs.readFileSync(enginePath)), design.engineSha256, 'Engine bytes changed');
  const map = fs.readFileSync(path.join(root, design.source.map));
  assert.equal(sha(map), design.source.map_sha256, 'Packaged source changed');
  const original = execFileSync('git', ['show', commit + ':' + design.originRoom.level], { cwd: repo });
  assert.equal(sha(original), design.source.map_sha256, 'Upstream source changed');
  const casePath = path.join(root, design.contract.readReceipt.path);
  assert.equal(sha(fs.readFileSync(casePath)), design.contract.readReceipt.sha256, 'Stale case receipt');
  assert.equal(design.contract.readReceipt.readBeforeLayout, true);
  assert.equal(sha(design.levelData), design.entryStateSha256, 'Parsed initial state changed');
  const api = require(path.join(path.resolve(repo), 'server/app.js'));
  const game = api.getGame('maze');
  const parsed = api.getLevelState(game, api.getLevel(game, 'level_' + design.originRoom.id));
  assert.deepEqual(parsed, design.levelData, 'Entry must equal the complete official parsed room');
  assert.deepEqual(design.cells, map.toString('utf8').trim().split(/\r?\n/).map(line => line.trim().split(/\s+/)));
  const context = { window: {}, console, structuredClone, performance };
  vm.runInNewContext(fs.readFileSync(enginePath, 'utf8'), context);
  const engine = context.window.MazeEngine.createEngine(design.levelData);
  assert.equal(engine.loadWarnings.length, 0, 'Unsupported source state');
  const state = engine.cloneState(engine.initialState), states = [engine.cloneState(state)], transitions = [];
  for (const direction of design.witness) {
    assert(vectors[direction], 'Unknown input');
    const before = snapshot(state), result = engine.move(state, ...vectors[direction]);
    transitions.push({ step: transitions.length + 1, direction, moved: result.moved === true, before, after: snapshot(state) });
    states.push(engine.cloneState(state));
  }
  const goal = design.contract.goal;
  assert.equal(goal.kind, 'reach');
  assert.deepEqual(position(state, 0), [...goal.cell, 0], 'Complete doorway goal failed');
  assert.deepEqual(position(states[89], 1), [6, 2, 0, 0]);
  assert.deepEqual(position(states[89], 7), [6, 1, 0, 0]);
  assert.deepEqual(position(states[99], 0), [5, 2, 0, 0]);
  assert.deepEqual(position(states[99], 1), [6, 2, 0, 0]);
  assert.deepEqual(position(states[99], 7), [7, 2, 0, 0]);
  assert.equal(states[100].actorRemoved[7], 1);
  assert.equal(states[100].terrain[2 * 16 + 8], 1);
  assert.equal(states[100].actorRemoved[1], 0);
  const controls = [];
  for (const [step, actor, gate, direction] of [[34, 1, [6, 8], 'D'], [55, 7, [4, 9], 'R']]) {
    const positive = engine.cloneState(states[step]);
    const pre = snapshot(positive);
    assert(!engine.computeRaisedPlayerGateSet(positive).has(gate[1] * 16 + gate[0]));
    assert.equal(engine.move(positive, ...vectors[direction]).moved, true);
    const removed = engine.cloneState(states[step]);
    removed.actorRemoved[actor] = 1;
    assert(engine.computeRaisedPlayerGateSet(removed).has(gate[1] * 16 + gate[0]));
    assert.equal(engine.move(removed, ...vectors[direction]).moved, false);
    controls.push({ kind: 'selected-state-gate-occupant-removal', step, actor, gate, direction, pre, positive: snapshot(positive), negative: snapshot(removed), result: 'local-next-action-requires-occupancy', limit: 'Derived probe state; no full-room necessity claim.' });
  }
  const swapped = engine.cloneState(states[99]);
  swapped.actorX[1] = 7;
  swapped.actorX[7] = 6;
  const swappedBefore = snapshot(swapped);
  engine.move(swapped, 1, 0);
  engine.move(swapped, 1, 0);
  assert.equal(swapped.actorRemoved[1], 1, 'Order-control assumption not reproduced');
  controls.push({ kind: 'selected-state-convoy-order-swap', step: 99, inputs: 'RR', before: swappedBefore, after: snapshot(swapped), result: 'leading-blue-lost-before-trailing-floor-fills-gap', limit: 'Swapped actor positions are a derived state, not a second official case or global order proof.' });
  const keySteps = [0, 2, 8, 14, 21, 34, 36, 42, 55, 60, 63, 69, 79, 81, 82, 84, 89, 93, 96, 99, 100, 104, 113, 139, 142, design.witness.length];
  const source = design.source;
  const report = {
    schemaVersion: 1, profile: design.contract.profile, source, engineCommit: commit,
    engineSha256: design.engineSha256, entryStateSha256: design.entryStateSha256,
    result: 'passed', goal, witnessSha256: sha(design.witness), inputs: design.witness.length,
    ordinaryReplayPassed: true, finalState: snapshot(state),
    selectedControls: controls, globalNecessity: 'not-tested', newMapTransfer: 'not-tested-user-requested-skill-summary-only',
    packagedDesign: { path: 'references/official-design.json', cells: sha(design.cells), contract: sha(design.contract), case: sha(fs.readFileSync(casePath)) }
  };
  return { report, states: { schemaVersion: 1, source, profile: design.contract.profile, actorOrder: design.levelData.actors, goal, keyStates: keySteps.map(step => ({ step, state: snapshot(states[step]) })), witnessedTransitions: transitions.filter(t => [2, 8, 14, 34, 35, 55, 60, 62, 67, 79, 82, 83, 84, 89, 93, 96, 100, 103, 104, 113, 139, 140, 142, 172].includes(t.step)) } };
}
if (require.main === module) {
  const args = process.argv.slice(2), options = {};
  while (args.length) options[args.shift().replace(/^--/, '')] = args.shift();
  assert(options.repo && options.out, 'Use --repo ENGINE --out NEW_OUTPUT [--design DESIGN]');
  assert(!fs.existsSync(options.out), 'Use a fresh output directory');
  const result = verify(path.resolve(options.repo), options.design ? path.resolve(options.design) : undefined);
  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(path.join(options.out, 'checks.json'), JSON.stringify(result.report, null, 2) + '\n');
  fs.writeFileSync(path.join(options.out, 'states.json'), JSON.stringify(result.states, null, 2) + '\n');
  console.log(JSON.stringify({ result: result.report.result, inputs: result.report.inputs, controls: result.report.selectedControls.length, goal: result.report.goal, globalNecessity: result.report.globalNecessity }));
}
module.exports = { verify };
