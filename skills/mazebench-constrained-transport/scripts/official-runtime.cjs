'use strict';
// Official reference replay and scoped counterfactuals; never an authored-complex certificate.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const r = require('./complex-runtime.cjs');
const { checkReadRecord } = require('./read-record.cjs');

function validate(spec, root) {
  const c = spec.contract;
  assert(c?.profile === 'planar-transport-reference-v1' && c.mode === 'reference', 'Use a reference contract');
  assert(spec.cells?.length === 16 && spec.cells.every(row => row.length === 16));
  assert(spec.cells.flat().every(t => /^(?:\+|\.|#|p|G|M[0-4]|(?:\.\+|\+)(?:#|p|G|M[0-4]))$/.test(t)), 'Unsupported reference physics');
  assert(['side', 'axial'].includes(c.mechanism?.kind));
  assert(c.members[c.mechanism.tool] && c.members[c.mechanism.target]);
  assert.notEqual(c.mechanism.tool, c.mechanism.target);
  assert(c.goal?.kind === 'gem-and-return' && c.goal.cell?.length === 3 && c.goal.cell.every(Number.isInteger));
  const members = {};
  let players = 0, gems = 0;
  spec.cells.forEach((row, y) => row.forEach((token, x) => {
    const top = token.split('+').at(-1);
    if (/^M[0-4]$/.test(top)) (members[top] ||= []).push([x, y, 0]);
    if (top === 'p') players++;
    if (top === 'G') gems++;
  }));
  assert.equal(players, 1); assert.equal(gems, 1);
  assert.deepEqual(c.members, members, 'Declare every member in source row order');
  assert(Array.isArray(c.allowRemoval) && c.allowRemoval.every(g => members[g]));
  assert(typeof spec.witness === 'string' && /^[UDLR]+$/.test(spec.witness));
  const cases = fs.readdirSync(path.join(root, 'references')).filter(f => /^official(?:-[a-z0-9]+)*-case\.md$/.test(f)).map(f => 'references/' + f);
  assert.equal(checkReadRecord(spec, root, cases).kind, 'case', 'Reference regression reads its complete case');
  return spec;
}

function replayReference(repo, spec, root) {
  validate(spec, root);
  const source = spec.source, map = fs.readFileSync(path.join(root, source.map));
  assert.equal(r.hash(map), source.map_sha256, 'Source map bytes changed');
  assert.deepEqual(spec.cells, map.toString('utf8').trim().split(/\r?\n/).map(row => row.trim().split(/\s+/)), 'Design differs from original map');
  const commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(commit, source.engineCommit, 'Engine commit differs from the pinned reference');
  assert.equal(r.hash(execFileSync('git', ['-C', repo, 'show', commit + ':' + spec.originRoom.level])), source.map_sha256, 'Map differs from pinned Git blob');
  assert.equal(r.hash(fs.readFileSync(path.join(repo, 'public/maze-engine.js'))), source.engineSha256, 'Engine runtime changed');
  const api = require(path.join(path.resolve(repo), 'server/app.js')), game = api.getGame('maze');
  assert.equal(r.hash(api.getLevelState(game, api.getLevel(game, 'level_' + spec.originRoom.id))), source.entryStateSha256, 'Official initial state changed');
  const { engine: e } = r.load(repo, spec.cells), o = r.observe(e, spec.contract);
  const result = r.replay(e, o, spec.witness);
  assert(result.rows.some(row => row.event.transfer), 'Witness never performs the declared member contact');
  return { engine: e, observer: o, result };
}

async function verify(repo, spec, root, cap = 6000) {
  const { engine: e, observer: o, result } = replayReference(repo, spec, root);
  const checks = [];
  const restrictions = Object.keys(spec.contract.members).map(group => ({ name: 'freeze_' + group, cut: v => v.moved.includes(group) }));
  restrictions.push({ name: 'forbid_declared_transfer', cut: v => v.transfer });
  for (const restriction of restrictions) {
    let answer;
    try {
      answer = await r.search(e, o, { cap, cut: restriction.cut });
      if (answer.status === 'solved') {
        r.replay(e, o, answer.path, { cut: restriction.cut });
        answer.replayPassed = true;
      }
    } catch (error) { answer = { status: 'unknown', error: error.message }; }
    const row = { name: restriction.name, ...answer, scope: 'Initial-state full gem-and-return goal with exactly this legal-transition exclusion; no unique order or minimal shape claim.' };
    checks.push(row);
    console.log(JSON.stringify({ room: spec.originRoom.id, check: row.name, status: row.status, expanded: row.expanded }));
  }
  return { profile: spec.contract.profile, cap, replayPassed: true, witness: spec.witness,
    fingerprints: { cells: r.hash(spec.cells), contract: r.hash(spec.contract) },
    goal: spec.contract.goal, ordinaryAndSearchStatesMatch: true,
    inputs: result.rows.length, contactSteps: result.rows.filter(row => row.event.transfer).map(row => row.step), checks,
    scope: 'Verified official reference, with separate scoped restrictions. This is not a new-map transfer test or a complex-authoring certificate.' };
}

if (require.main === module) {
  const args = process.argv.slice(2), get = k => args.includes(k) ? args[args.indexOf(k) + 1] : undefined;
  const repo = path.resolve(get('--repo')), spec = r.read(get('--spec')), out = path.resolve(get('--out'));
  assert(!fs.existsSync(out), 'Use a fresh output file');
  verify(repo, spec, path.resolve(__dirname, '..'), Number(get('--cap') || 6000)).then(report => {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ replayPassed: report.replayPassed, checks: report.checks.length, out }));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { validate, replayReference, verify };
