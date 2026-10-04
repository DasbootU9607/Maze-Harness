'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { D, read, hash, same, load, validate, observer, search, replay, stopping } = require('./runtime.cjs');
async function verify(repo, spec, cap = 300000) {
  const report = { profile: spec.contract?.profile, cap, checks: [], failures: [], stages: [] };
  try {
    assert(Number.isInteger(cap) && cap > 0);
    const c = validate(spec, path.resolve(__dirname, '..'));
    const { engine: e, solver } = load(repo, spec.cells), o = observer(e, spec);
    report.fingerprints = { cells: hash(spec.cells), contract: hash(c), reference: c.readReceipt.sha256 };
    for (const file of ['public/maze-engine.js', 'public/maze-solver.js', 'server/maze-levels.js', 'games/maze/level_parsing.json'])
      report.fingerprints[file] = hash(fs.readFileSync(path.join(repo, file)));
    report.initial = o.snap(e.initialState);
    assert(same(o.pose(report.initial), c.members)); o.intact(report.initial, report.initial);
    async function check(name, expected, options = {}, scope = 'Full initial-state objective') {
      let result;
      try {
        result = search(e, o, { cap, ...options });
        if (result.status === 'solved') { replay(e, o, result.path, options); result.replayPassed = true; }
      } catch (err) { result = { status: 'unknown', error: err.message }; }
      const verdict = result.status === expected ? 'passed' : ['solved', 'unsolved'].includes(result.status) ? 'failed' : 'unknown';
      const row = { name, expected, ...result, scope, verdict };
      report.checks.push(row);
      console.log(JSON.stringify({ check: name, status: row.status, expanded: row.expanded, verdict }));
      return row;
    }
    report.solution = await check('complete_objective', 'solved');
    const official = await solver.solveWithAStar({ ...e, isSolved: o.goal, heuristic: () => 0 }, { algorithm: 'astar', maxExpandedStates: cap });
    report.officialSolution = { status: official.status, path: official.path, expanded: official.expanded };
    if (official.status === 'solved') { replay(e, o, official.path); report.officialSolution.replayPassed = true; }
    report.checks.push({ name: 'official_solver_positive', expected: 'solved', ...report.officialSolution,
      verdict: official.status === 'solved' ? 'passed' : official.status === 'unsolved' ? 'failed' : 'unknown' });
    await check('freeze_cross', 'unsolved', { reject: v => v.motion });
    await check('forbid_static_cross_brake', 'unsolved', { reject: v => v.crossBrake });
    for (const direction of c.directionChecks || []) {
      assert(D[direction]); await check('forbid_cross_motion_' + direction, 'unsolved', { reject: v => v.motion && v.direction === direction });
    }
    if (c.mode === 'complex') {
      for (const limit of [1, ...(c.motionLimits || [])]) {
        assert(Number.isInteger(limit) && limit > 0);
        await check('at_most_' + limit + '_cross_motions', 'unsolved', {
          history: 0, update: (h, v) => h + (v.motion ? 1 : 0), reject: (v, h) => v.motion && h >= limit
        });
      }
      await check('single_direction_cross_motion', 'unsolved', {
        history: null, update: (h, v) => v.motion ? h || v.direction : h,
        reject: (v, h) => v.motion && h !== null && h !== v.direction
      });
      await check('first_cross_motion_then_frozen', 'unsolved', {
        history: false, update: (h, v) => h || v.motion, reject: (v, h) => h && v.motion
      });
    }
    const match = (v, name) => o.matches(v, c.events[name]);
    const ready = (s, name) => Object.entries(D).some(([d, delta]) => {
      const q = e.cloneState(s), before = o.snap(s), r = e.move(q, ...delta);
      if (!r.moved || !o.alive(q)) return false;
      const after = o.snap(q); o.intact(before, after);
      return match(o.event(before, after, d, r), name);
    });
    for (const [i, dependency] of (c.dependencies || []).entries()) {
      const after = dependency.after;
      const end = dependency.before === 'goal' ? o.goal : s => o.goal(s) || ready(s, dependency.before);
      const stop = (v, h) => dependency.before !== 'goal' && match(v, dependency.before) && (!after || h);
      const options = after ? { history: false, update: (h, v) => h || match(v, after), endHistory: h => h } : {};
      const scope = { kind: 'First ordinary-event opportunity or real goal', ...dependency,
        history: after ? 'All initial histories that reached after; earlier before events remain legal' : 'All initial histories before the first before event' };
      await check(`dependency_${i + 1}_positive`, 'solved', { ...options, end, reject: stop }, scope);
      await check(`dependency_${i + 1}_without_preparation`, 'unsolved', {
        ...options, end, reject: (v, h) => stop(v, h) || match(v, dependency.prepare) && (!after || h)
      }, scope);
    }
    const witness = spec.witness || report.solution.path;
    if (witness) {
      const result = replay(e, o, witness);
      report.witness = witness; report.replayPassed = true;
      report.inputs = witness.length; report.pushes = result.rows.filter(row => row.event.motion);
      report.gemStep = result.rows.find(row => row.event.gem)?.step ?? null;
      report.final = o.snap(result.state);
      const graph = (s, label) => {
        const r = stopping(e, o, s, cap);
        const positions = [...new Set(r.nodes.map(n => o.snap(n.state)[o.player].cell.join(',')))].map(k => k.split(',').map(Number));
        const goalNode = r.nodes.find(n => o.goal(n.state)), gemNode = r.nodes.find(n => e.isSolved(n.state));
        if (goalNode) replay(e, o, goalNode.path, { start: s, reject: v => v.motion });
        return { label, status: r.status, expanded: r.expanded, reachable: positions, gemReachable: !!gemNode,
          goalReachable: !!goalNode, goalPath: goalNode?.path, nodes: r.nodes };
      };
      const initialGraph = graph(e.initialState, 'initial');
      const { nodes: initialNodes, ...initialBrief } = initialGraph; report.initialStopping = initialBrief;
      for (const stage of c.stages || []) {
        assert(Number.isInteger(stage.keyStep) && stage.keyStep > 0 && stage.keyStep <= witness.length);
        const row = result.rows[stage.keyStep - 1];
        assert(match(row.event, stage.event), 'Stage witness does not match declared event: ' + stage.name);
        const before = replay(e, o, witness.slice(0, stage.keyStep - 1), { end: () => true }).state;
        const after = replay(e, o, witness.slice(0, stage.keyStep), { end: () => true }).state;
        const old = graph(before, 'before'), now = graph(after, 'after');
        assert(stage.nextStand?.length === 3 && stage.nextStand.every(Number.isInteger));
        const stand = now.nodes.find(n => same(o.snap(n.state)[o.player].cell, stage.nextStand));
        const newStops = now.reachable.filter(p => !old.reachable.some(q => same(p, q)));
        const lostStops = old.reachable.filter(p => !now.reachable.some(q => same(p, q)));
        const { nodes: oldNodes, ...oldBrief } = old, { nodes: newNodes, ...newBrief } = now;
        let nextEvent = null;
        if (stand && stage.nextEvent) {
          assert(D[stage.nextDirection] && c.events[stage.nextEvent]);
          const q = e.cloneState(stand.state), a = o.snap(q), r = e.move(q, ...D[stage.nextDirection]);
          if (r.moved && o.alive(q)) { o.intact(a, o.snap(q)); nextEvent = o.event(a, o.snap(q), stage.nextDirection, r); }
        }
        const verdict = [old.status, now.status].some(s => s === 'capped') ? 'unknown' :
          !stand || !newStops.length && !lostStops.length || stage.nextEvent && (!nextEvent || !match(nextEvent, stage.nextEvent)) ? 'failed' : 'passed';
        report.stages.push({ ...stage, row, beforeStops: oldBrief, afterStops: newBrief, newlyReachable: newStops, lostReachable: lostStops,
          stanceReachable: !!stand, stancePath: stand?.path, nextEvent, verdict });
        report.checks.push({ name: 'stage_' + stage.name, verdict, scope: 'Selected witness state: stopping access and ordinary next input' });
      }
      for (const step of c.selectedPost || []) {
        assert(Number.isInteger(step) && step >= 0 && step <= witness.length);
        const start = replay(e, o, witness.slice(0, step), { end: () => true }).state;
        await check('selected_' + step + '_cross_frozen', 'unsolved', { start, reject: v => v.motion }, 'Selected witness state only');
      }
    }
    report.overall = report.checks.some(c => c.verdict === 'failed') ? 'failed' : !report.replayPassed || report.checks.some(c => c.verdict === 'unknown') ? 'unknown' : 'passed';
    report.classification = report.overall === 'passed' ? c.mode + '-structurally-verified' : report.replayPassed ? 'legal-but-rejected-or-incomplete' : 'unverified';
  } catch (err) {
    report.overall = 'unknown'; report.classification = 'unsupported-or-incomplete-contract'; report.error = err.stack;
  }
  return report;
}
if (require.main === module) {
  const args = process.argv.slice(2), get = k => args[args.indexOf(k) + 1];
  assert(args.includes('--repo') && args.includes('--spec') && args.includes('--out'));
  const out = path.resolve(get('--out')); assert(!fs.existsSync(out), 'Choose a fresh report directory');
  verify(path.resolve(get('--repo')), read(get('--spec')), Number(get('--cap') || 300000)).then(report => {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ overall: report.overall, classification: report.classification, checks: report.checks.length, error: report.error }));
    if (report.overall !== 'passed') process.exitCode = 1;
  }).catch(err => { console.error(err); process.exitCode = 1; });
}
module.exports = { verify };
