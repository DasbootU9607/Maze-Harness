'use strict';
// Scoped source-case regression. Capped exclusions remain unknown; the witness
// does not certify the default complex profile or a unique causal order.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { D, read, hash, load, observe, validate, walking, search, replay } = require('./complex-runtime.cjs');
const root = path.resolve(__dirname, '..');

async function verify(repo, cap = 5000) {
  assert(Number.isInteger(cap) && cap > 0);
  const spec = read(path.join(root, 'references/official-fxe-design.json'));
  validate(spec, root);
  const c = spec.contract, { engine: e } = load(repo, spec.cells), o = observe(e, c);
  const trace = replay(e, o, spec.witness);
  const report = {
    source: spec.originRoom.level,
    originRoom: spec.originRoom,
    goal: c.goal,
    cap,
    scope: 'Unmodified FxE, gem objective. Ordinary replay and bounded exclusions. Each exhausted restriction applies only to its named endpoint and history; capped searches are unknown. No unique route, optimality, shape minimality, or human-difficulty claim.',
    fingerprints: { cells: hash(spec.cells), contract: hash(c), case: c.readReceipt.sha256 },
    solution: { status: 'solved', path: spec.witness, inputs: spec.witness.length, replayPassed: true, method: 'Concatenated ordinary prefixes from scoped official searches; replayed from the original initial state.' },
    checks: []
  };
  for (const file of ['public/maze-engine.js', 'public/maze-solver.js', 'server/maze-levels.js', 'games/maze/level_parsing.json']) {
    report.fingerprints[file] = hash(fs.readFileSync(path.join(repo, file)));
  }
  const matches = (name, v) => o.matches(v, c.events[name]);
  const ready = (s, name) => Object.entries(D).some(([d, delta]) => {
    const next = e.cloneState(s), a = o.snap(s), result = e.move(next, ...delta);
    if (!result.moved || !o.snap(next).some(p => p.type === 'player' && !p.removed)) return false;
    o.intact(a, o.snap(next));
    return matches(name, o.event(a, o.snap(next), d));
  });
  const endpoint = name => s => o.goal(s) || ready(s, name);
  async function check(name, options = {}, scope = 'All histories from the original initial state') {
    let r;
    try {
      r = await search(e, o, { cap, ...options });
      if (r.status === 'solved') {
        const q = replay(e, o, r.path, options);
        r.replayPassed = true;
        r.endpoint = o.goal(q.state) ? 'gem' : 'legal-contact-opportunity';
      }
    } catch (error) { r = { status: 'unknown', error: error.message }; }
    const expected = name.startsWith('positive_') ? 'solved' : 'unsolved';
    const verdict = r.status === expected ? 'passed' : ['solved', 'unsolved'].includes(r.status) ? 'failed' : 'unknown';
    report.checks.push({ name, expected, ...r, verdict, scope });
    console.log(JSON.stringify({ name, status: r.status, expanded: r.expanded }));
  }
  await check('initial_frozen_walking', { cut: v => v.moved.length > 0 });
  for (const g of Object.keys(c.members)) await check('freeze_' + g, { cut: v => v.moved.includes(g) });
  for (const name of ['contact', 'corridor', 'delivery']) {
    await check('forbid_' + name, { cut: v => matches(name, v) });
  }
  for (const [prepare, before] of [['prep', 'contact'], ['contact', 'corridor'], ['corridor', 'delivery']]) {
    await check('positive_' + prepare + '_to_' + before, { cut: v => matches(before, v), end: endpoint(before) });
    await check('without_' + prepare + '_to_' + before, { cut: v => matches(before, v) || matches(prepare, v), end: endpoint(before) });
  }
  await check('first_contact_then_walking_only', {
    history: { used: false }, update: (h, v) => ({ used: h.used || matches('contact', v) }),
    cut: (v, h) => h.used && v.moved.length > 0, endHistory: h => h.used
  });
  for (const step of [27, 56, 119]) {
    const start = replay(e, o, spec.witness.slice(0, step), { end: () => true }).state;
    await check('selected_' + step + '_walking_only', { start, cut: v => v.moved.length > 0 }, 'Selected witness state after input ' + step + ' only');
  }
  report.contactWitnesses = ['contact', 'corridor', 'delivery'].map(name => {
    const row = trace.rows.find(r => matches(name, r.event));
    assert(row, 'Missing source contact ' + name);
    return { event: name, step: row.step, input: row.d, observation: row.event };
  });
  // Input 36 removes M1; co-motion/removal does not satisfy full translation.
  assert(!matches('contact', trace.rows[35].event));
  assert(!matches('delivery', trace.rows[55].event));
  assert(matches('corridor', trace.rows[55].event));
  assert(matches('delivery', trace.rows[118].event));
  report.observerRegression = { passed: true, scope: 'Reject removal at 36 and wrong pair at 56; accept actual complete pair translations at 56 and 119.' };
  report.classification = 'replayed-official-case-with-scoped-exclusions';
  report.hasUnknown = report.checks.some(r => !['solved', 'unsolved'].includes(r.status));
  report.overall = report.checks.some(r => r.verdict === 'failed') ? 'failed' : report.hasUnknown ? 'unknown' : 'passed';
  const states = {
    source: spec.originRoom.level, originRoom: spec.originRoom, fingerprints: report.fingerprints,
    witness: spec.witness, initial: o.snap(e.initialState), states: []
  };
  const indices = [0, 24, 26, 27, 35, 36, 52, 55, 56, 60, 68, 71, 82, 91, 102, 112, 118, 119, 145, 149];
  for (const step of indices) {
    const s = replay(e, o, spec.witness.slice(0, step), { end: () => true }).state, w = walking(e, o, s);
    states.states.push({ step, actors: o.snap(s), groups: Object.fromEntries(Object.keys(c.members).map(g => [g, o.pose(o.snap(s), g)])),
      reachable: w.reachable, walkingGoal: w.queue.some(n => o.goal(n.state)),
      incoming: step ? trace.rows[step - 1].event : null,
      legalPushes: w.pushes.map(p => ({ path: p.path, event: p.event })) });
  }
  return { report, states };
}

if (require.main === module) {
  const args = process.argv.slice(2), value = k => args.includes(k) ? args[args.indexOf(k) + 1] : undefined;
  assert(value('--repo') && value('--out'), 'Use --repo ENGINE --out NEW_OUTPUT [--cap 5000]');
  const out = path.resolve(value('--out')); assert(!fs.existsSync(out), 'Use a fresh output directory');
  verify(path.resolve(value('--repo')), Number(value('--cap') || 5000)).then(({ report, states }) => {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'states.json'), JSON.stringify(states, null, 2) + '\n');
    console.log(JSON.stringify({ overall: report.overall, replayPassed: true, checks: report.checks.length, hasUnknown: report.hasUnknown }));
    if (report.overall !== 'passed') process.exitCode = 1;
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { verify };
