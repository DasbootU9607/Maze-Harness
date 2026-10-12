'use strict';
// Shared validation for incremental publication and offline CI.
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const vectors = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const isPlayer = actor => ['player', 'circle_player'].includes(actor.type);
const at = (state, actor, cell) => !state.actorRemoved[actor] && state.actorX[actor] === cell[0] && state.actorY[actor] === cell[1] && state.actorElevation[actor] === (cell[2] ?? 0);
function endpoint(cell, data, label) {
  assert(Array.isArray(cell) && cell.length === 3 && cell.every(Number.isInteger), 'Supply a complete ' + label + ' cell');
  assert(cell[0] >= 0 && cell[0] < data.width && cell[1] >= 0 && cell[1] < data.height, label + ' lies outside the room');
}
function frozenWalking(engine, data, initial, target) {
  const players = data.actors.flatMap((actor, i) => isPlayer(actor) && !initial.actorRemoved[i] ? [i] : []);
  assert.equal(players.length, 1, 'Frozen walking supports one surviving player');
  const player = players[0];
  // Every nonplayer and terrain/device field stays fixed. Only the player's
  // supported position varies; this is not a search over movable-body states.
  const unchanged = next => data.actors.every((actor, i) => i === player ||
    ['actorX', 'actorY', 'actorElevation', 'actorRemoved'].every(field => next[field][i] === initial[field][i])) &&
    ['terrain', 'liftRaised'].every(field => next[field].every((value, i) => value === initial[field][i]));
  const key = state => [state.actorX[player], state.actorY[player], state.actorElevation[player]].join(',');
  const queue = [{ state: engine.cloneState(initial), route: '' }], seen = new Set([key(initial)]);
  const cap = data.width * data.height * 64;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    assert(cursor < cap, 'Frozen walking cap reached; retained passage remains unverified');
    const current = queue[cursor];
    if (at(current.state, player, target)) return { status: 'reachable', witness: current.route, expanded: cursor + 1, cap };
    for (const [direction, vector] of Object.entries(vectors)) {
      const next = engine.cloneState(current.state);
      const result = engine.move(next, ...vector);
      if (!result.moved || next.actorRemoved[player] || !unchanged(next)) continue;
      const signature = key(next);
      if (seen.has(signature)) continue;
      seen.add(signature);
      queue.push({ state: next, route: current.route + direction });
    }
  }
  return { status: 'unreachable', expanded: queue.length, cap };
}
function createReplay(runtime) {
  const context = { window: {}, console, structuredClone };
  vm.runInNewContext(fs.readFileSync(runtime, 'utf8'), context);
  return (data, entry) => {
    assert(typeof entry.witness === 'string' && /^[UDLR]+$/.test(entry.witness), 'Supply a complete ordinary-input witness: ' + entry.id);
    assert(['gem', 'reach', 'gem-and-return'].includes(entry.goal?.kind), 'Unsupported website goal: ' + entry.id);
    if (entry.goal.kind !== 'gem') assert(Array.isArray(entry.goal.cell) && entry.goal.cell.length >= 2, 'Supply the final goal cell');
    const engine = context.window.MazeEngine.createEngine(data);
    assert.equal(engine.loadWarnings.length, 0, 'Unsupported room data');
    const state = engine.cloneState(engine.initialState);
    const playerIds = data.actors.flatMap((actor, i) => isPlayer(actor) ? [i] : []);
    const complete = entry.completeObjective;
    let firstVisitStep = null, thenVisitStep = null;
    if (complete) {
      assert.equal(complete.kind, 'ordered-room-local-passages', 'Unsupported complete website objective');
      endpoint(complete.first, data, 'first passage');
      endpoint(complete.then, data, 'second passage');
      assert.notDeepEqual(complete.first, complete.then, 'Ordered passages must differ');
      assert.equal(typeof complete.preserveFirstByFrozenWalking, 'boolean', 'Declare whether first-passage access must survive');
      assert.equal(entry.goal.kind, 'reach', 'Ordered passages require a reach endpoint');
      assert.deepEqual(entry.goal.cell, complete.then, 'Final endpoint must match the second passage');
      if (playerIds.some(i => at(state, i, complete.first))) firstVisitStep = 0;
    }
    for (const [index, direction] of [...entry.witness].entries()) {
      engine.move(state, ...vectors[direction]);
      if (complete) {
        if (firstVisitStep === null && playerIds.some(i => at(state, i, complete.first))) firstVisitStep = index + 1;
        if (firstVisitStep !== null && index + 1 > firstVisitStep && thenVisitStep === null && playerIds.some(i => at(state, i, complete.then))) thenVisitStep = index + 1;
      }
    }
    const players = data.actors.map((a, i) => ['player', 'circle_player'].includes(a.type) ? i : -1).filter(i => i >= 0 && !state.actorRemoved[i]);
    assert(players.length, 'No surviving player: ' + entry.id);
    if (entry.goal.kind !== 'reach') assert(engine.isSolved(state), 'Incomplete gem objective: ' + entry.id);
    if (entry.goal.cell) assert(players.some(i => state.actorX[i] === entry.goal.cell[0] && state.actorY[i] === entry.goal.cell[1] && state.actorElevation[i] === (entry.goal.cell[2] || 0)), 'Incomplete endpoint: ' + entry.id);
    const verification = { ordinaryReplayPassed: true, inputs: entry.witness.length };
    if (complete) {
      assert(firstVisitStep !== null, 'Incomplete first-passage visit: ' + entry.id);
      assert(thenVisitStep !== null, 'Incomplete ordered second-passage visit: ' + entry.id);
      Object.assign(verification, { firstVisitStep, thenVisitStep });
      if (complete.preserveFirstByFrozenWalking) {
        verification.retainedFirst = frozenWalking(engine, data, state, complete.first);
        assert.equal(verification.retainedFirst.status, 'reachable', 'First passage is no longer reachable with every nonplayer frozen: ' + entry.id);
      }
    }
    return verification;
  };
}
module.exports = { hash, read, createReplay };
