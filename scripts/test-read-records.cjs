'use strict';
// Reading/contract regressions use packaged cases without importing an engine.
// An optional separate engine checkout replays their complete original routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const args = process.argv.slice(2), value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const engineRepo = value('--repo') && path.resolve(value('--repo'));
let passed = 0;
const rows = [];
function test(name, run) { run(); passed++; rows.push({ name, verdict: 'passed' }); }

async function main() {
  for (const name of fs.readdirSync(path.join(repo, 'skills'))) {
    const root = path.join(repo, 'skills', name), skating = name.endsWith('skating-cross');
    const casePath = 'references/' + (skating ? 'user' : 'official') + '-case.md';
    const legacy = read(path.join(root, 'references', (skating ? 'user' : 'official') + '-design.json'));
    const runtime = require(path.join(root, 'scripts', skating ? 'runtime.cjs' : 'complex-runtime.cjs'));
    const { checkReadRecord } = require(path.join(root, 'scripts/read-record.cjs'));
    test(name + ': legacy reproduction contract', () => runtime.validate(legacy, root));
    test(name + ': legacy case version', () => assert.equal(checkReadRecord(legacy, root, casePath).kind, 'case'));
    const mechanism = fs.readFileSync(path.join(root, 'references/mechanism-logic.md'));
    const relations = [...mechanism.toString('utf8').matchAll(/^### ([a-z0-9-]+)$/gm)].map(m => m[1]);
    const migrated = structuredClone(legacy), c = migrated.contract;
    const groups = Array.isArray(c.members) ? { [c.group]: c.members } : c.members;
    const first = Object.keys(groups)[0];
    c.readReceipt = { path: 'references/mechanism-logic.md', sha256: hash(mechanism), readBeforeLayout: true };
    c.inherited = relations.map(relation => ({ relation, realization: 'Contract-format regression using a real initial member; this declaration is not evidence of understanding or necessity.', members: { [first]: [groups[first][0]] }, boundaries: [], passages: [], stances: [] }));
    if (!skating) {
      const start = legacy.cells.flatMap((row, y) => row.flatMap((t, x) => t.split('+').at(-1) === 'p' ? [[x, y, 0]] : []))[0];
      for (const stage of c.stages) Object.assign(stage, { keyStep: 1, nextStand: start });
      for (const b of c.spatial.blocked) b.restriction = 'stance';
    }
    test(name + ': new mechanism contract format', () => runtime.validate(migrated, root));
    test(name + ': mechanism version provenance', () => assert.equal(checkReadRecord(migrated, root, casePath).kind, 'mechanism'));
    for (const [label, spec] of [['legacy', legacy], ['mechanism', migrated]]) {
      const stale = structuredClone(spec); stale.contract.readReceipt.sha256 = '0'.repeat(64);
      test(name + ': reject stale ' + label + ' version', () => assert.throws(() => runtime.validate(stale, root), /different document version/));
      const verifier = require(path.join(root, 'scripts', skating ? 'verify.cjs' : 'verify-complex.cjs')).verify;
      const rejected = skating ? await verifier('unused-engine', stale, 1) : await verifier('unused-engine', stale, root, 1);
      test(name + ': stale ' + label + ' verification remains unknown', () => {
        assert.equal(rejected.overall, 'unknown'); assert.match(rejected.error, /different document version/);
      });
    }
    const arbitrary = structuredClone(migrated); arbitrary.contract.readReceipt.path = '../mechanism-logic.md';
    test(name + ': reject arbitrary receipt path', () => assert.throws(() => runtime.validate(arbitrary, root), /Unsupported reading document/));
    const unread = structuredClone(migrated); unread.contract.readReceipt.readBeforeLayout = false;
    test(name + ': reject absent pre-layout declaration', () => assert.throws(() => runtime.validate(unread, root)));
    const oldMember = structuredClone(migrated); oldMember.contract.inherited[0].members = { [first]: [[0, 0, 0]] };
    test(name + ': reject foreign member coordinate', () => assert.throws(() => runtime.validate(oldMember, root), /initial member of this map/));
    const wrongBoundary = structuredClone(migrated);
    const member = groups[first][0]; wrongBoundary.contract.inherited[0].boundaries = [member];
    test(name + ': reject non-wall boundary anchor', () => assert.throws(() => runtime.validate(wrongBoundary, root), /not a fixed wall/));
    const missing = structuredClone(migrated); missing.contract.inherited[0].realization = '';
    test(name + ': reject unexplained realization', () => assert.throws(() => runtime.validate(missing, root), /Explain the authored realization/));
    const unknown = structuredClone(migrated); unknown.contract.inherited[0].relation = 'unknown-relation';
    test(name + ': reject unknown inherited relation', () => assert.throws(() => runtime.validate(unknown, root), /Unknown mechanism relation/));
    const template = read(path.join(root, 'references/design-template.json'));
    test(name + ': blank scaffold cannot certify a map', () => assert.throws(() => runtime.validate(template, root)));
    if (engineRepo) {
      const { engine: e } = runtime.load(engineRepo, legacy.cells);
      const o = skating ? runtime.observer(e, legacy) : runtime.observe(e, legacy.contract);
      test(name + ': complete original ordinary replay', () => runtime.replay(e, o, legacy.witness));
      rows.at(-1).inputs = legacy.witness.length;
      rows.at(-1).cells = hash(JSON.stringify(legacy.cells));
    }
  }
  const report = { passed, engineReplayed: !!engineRepo, checks: rows, scope: 'Version and contract rejection regressions; optional complete-case ordinary replay. Format acceptance does not prove the migrated declarations or their stage semantics.' };
  if (value('--out')) {
    const out = path.resolve(value('--out')); assert(!fs.existsSync(out), 'Use a fresh test output directory');
    fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'read-record-tests.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ passed, engineReplayed: !!engineRepo }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
