'use strict';
// Shared validation for incremental publication and offline CI.
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
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
    const vectors = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    for (const direction of entry.witness) engine.move(state, ...vectors[direction]);
    const players = data.actors.map((a, i) => ['player', 'circle_player'].includes(a.type) ? i : -1).filter(i => i >= 0 && !state.actorRemoved[i]);
    assert(players.length, 'No surviving player: ' + entry.id);
    if (entry.goal.kind !== 'reach') assert(engine.isSolved(state), 'Incomplete gem objective: ' + entry.id);
    if (entry.goal.cell) assert(players.some(i => state.actorX[i] === entry.goal.cell[0] && state.actorY[i] === entry.goal.cell[1] && state.actorElevation[i] === (entry.goal.cell[2] || 0)), 'Incomplete endpoint: ' + entry.id);
  };
}
module.exports = { hash, read, createReplay };
