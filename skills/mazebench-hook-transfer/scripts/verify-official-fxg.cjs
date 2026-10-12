'use strict';
// FxG ordinary replay, two passage endpoints, and explicitly selected-state controls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { D, read, hash, load, observe, validate, walking, replay } = require('./complex-runtime.cjs');
const root = path.resolve(__dirname, '..');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function verify(repo) {
  const spec = read(path.join(root, 'references/official-fxg-design.json'));
  const map = fs.readFileSync(path.join(root, spec.source.map));
  assert.equal(hash(map), spec.source.map_sha256, 'Original map fingerprint changed');
  assert.deepEqual(map.toString('utf8').trim().split(/\r?\n/).map(row => row.split(/\s+/)), spec.cells, 'Reproduction cells differ from the original map');
  assert.equal(fs.readFileSync(path.join(repo, spec.originRoom.level), 'utf8').replaceAll('\r\n', '\n'), map.toString('utf8').replaceAll('\r\n', '\n'), 'Separate checkout map differs');
  assert.equal(read(path.join(repo, spec.originRoom.worldMap)).levels[path.basename(spec.originRoom.level)].join('x'), spec.originRoom.id, 'World index differs');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), spec.engineCommit, 'Use the pinned engine commit');
  validate(spec, root);
  const { engine: e } = load(repo, spec.cells), o = observe(e, spec.contract);
  const trace = replay(e, o, spec.witness), at = step => replay(e, o, spec.witness.slice(0, step), { end: () => true }).state;
  const playerAt = (s, p) => o.snap(s).some(a => a.type === 'player' && !a.removed && same([a.x, a.y, a.z], p));
  const canWalk = (s, p) => walking(e, o, s).queue.some(n => playerAt(n.state, p));
  const checks = [];
  const check = (name, actual, expected, scope) => { assert.equal(actual, expected, name); checks.push({ name, actual, expected, verdict: 'passed', scope }); };
  check('south_passage_visited', playerAt(at(139), [7, 15, 0]), true, 'Ordinary prefix from the unchanged official initial state.');
  check('east_passage_visited', playerAt(trace.state, [15, 1, 0]), true, 'Same uninterrupted route after visiting the south passage.');
  check('south_still_walkable_at_completion', canWalk(trace.state, [7, 15, 0]), true, 'Final selected state with all objects frozen.');
  check('initial_south_walking', canWalk(e.initialState, [7, 15, 0]), false, 'Initial selected state with all objects frozen.');
  check('initial_east_walking', canWalk(e.initialState, [15, 1, 0]), false, 'Initial selected state with all objects frozen.');
  check('initial_north_return', canWalk(e.initialState, [8, 0, 0]), true, 'The initially open north return is deliberately excluded from the two-passage objective.');
  for (const [step, event] of [[14, 'southShift'], [101, 'zDock'], [123, 'rearLift'], [208, 'barRedock'], [228, 'eastRelease']]) {
    check('contact_' + event, o.matches(trace.rows[step - 1].event, spec.contract.events[event]), true, 'Actual input, same-elevation contact, and full translations at input ' + step + '.');
  }
  check('before_clearance_upper_nub_stance', canWalk(at(149), [12, 4, 0]), false, 'Selected state after south passage visit; no global necessity inference.');
  check('after_clearance_upper_nub_stance', canWalk(at(159), [12, 4, 0]), true, 'M0 was raised at input 159; other groups retain their input-149 poses.');
  check('other_groups_fixed_in_first_clearance_control', ['M1', 'M2', 'M3'].every(g => same(o.pose(o.snap(at(149)), g), o.pose(o.snap(at(159)), g))), true, 'The selected access comparison changes only M0 among movable groups.');
  check('before_withdrawal_upper_bar_stance', canWalk(at(208), [7, 1, 0]), false, 'Selected docking state with M0, M1 and M2 shifted right together.');
  check('after_withdrawal_upper_bar_stance', canWalk(at(224), [7, 1, 0]), true, 'Only M0 moves between these object configurations; walking obtains the next input stance.');
  check('other_groups_fixed_in_second_clearance_control', ['M1', 'M2', 'M3'].every(g => same(o.pose(o.snap(at(208)), g), o.pose(o.snap(at(224)), g))), true, 'The selected access comparison changes only M0 among movable groups.');
  check('walking_only_after_rear_lift', canWalk(at(123), [15, 1, 0]), false, 'Selected state after the first rear lift; continued object work remains.');
  check('no_removed_group_members', o.snap(trace.state).some(a => a.group && a.removed), false, 'This witness preserves all four groups.');
  check('wrong_contact_pair_rejected', o.matches(trace.rows[227].event, spec.contract.events.rearLift), false, 'Observer control: the M1-to-M3 event cannot stand in for M2-to-M1.');
  const indices = [0, 8, 13, 14, 15, 24, 33, 34, 73, 85, 100, 101, 104, 122, 123, 126, 139, 149, 158, 159, 175, 176, 190, 207, 208, 223, 224, 227, 228, 229, 241];
  const states = { originRoom: spec.originRoom, engineCommit: spec.engineCommit, source: spec.source, witness: spec.witness, initial: o.snap(e.initialState), states: indices.map(step => {
    const s = at(step), w = walking(e, o, s);
    return { step, actors: o.snap(s), groups: Object.fromEntries(Object.keys(spec.contract.members).map(g => [g, o.pose(o.snap(s), g)])), reachable: w.reachable, incoming: step ? trace.rows[step - 1].event : null, legalPushes: w.pushes.map(p => ({ path: p.path, event: p.event })) };
  }) };
  const report = { originRoom: spec.originRoom, engineCommit: spec.engineCommit, source: spec.source, goal: spec.contract.goal, completeObjective: spec.completeObjective,
    scope: 'Complete two-passage ordinary witness and selected-state access controls. No exhaustive mechanism exclusion, unique order, global part minimality, shortest-route or human-difficulty claim.',
    solution: { status: 'solved', path: spec.witness, inputs: spec.witness.length, ordinaryReplayPassed: true, southVisitStep: 139, eastVisitStep: 241 }, checks,
    necessaryMechanism: { status: 'unconfirmed', reason: 'No exhaustive all-history restriction search was used for this new case.' },
    fingerprints: Object.fromEntries(['public/maze-engine.js', 'public/maze-solver.js', 'server/maze-levels.js', 'games/maze/level_parsing.json'].map(f => [f, hash(fs.readFileSync(path.join(repo, f)))])),
    packagedDesign: { path: 'references/official-fxg-design.json', cells: hash(spec.cells), contract: hash(spec.contract), case: spec.contract.readReceipt.sha256 }, overall: 'passed' };
  return { report, states };
}
if (require.main === module) {
  const args = process.argv.slice(2), value = k => args[args.indexOf(k) + 1];
  assert(args.includes('--repo') && args.includes('--out'), 'Use --repo ENGINE --out NEW_OUTPUT');
  const out = path.resolve(value('--out')); assert(!fs.existsSync(out), 'Use a fresh output directory');
  const result = verify(path.resolve(value('--repo'))); fs.mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(result)) fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(body, null, 2) + '\n');
  console.log(JSON.stringify({ overall: result.report.overall, checks: result.report.checks.length, inputs: result.report.solution.inputs }));
}
module.exports = { verify };
