'use strict';
// Reading/contract regressions use packaged cases without importing an engine.
// An optional separate engine checkout replays their complete original routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const args = process.argv.slice(2), value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const engineRepo = value('--repo') && path.resolve(value('--repo'));
let passed = 0;
const rows = [];
function test(name, run) { run(); passed++; rows.push({ name, verdict: 'passed' }); }
const referenceProfiles = new Set(['official-player-gate-reference-v1', 'official-bridge-convoy-v1', 'planar-transport-reference-v1']);
const jsonHash = value => hash(JSON.stringify(value));

// These fixture checks deliberately validate the actual reference schema. They
// do not manufacture authored-complex stages or certify mechanism necessity.
function validateReferenceArtifact(spec, root, family) {
  const c = spec.contract;
  assert(referenceProfiles.has(c?.profile), 'Unsupported reference profile');
  const receipt = c.readReceipt, expected = 'references/' + family + '-case.md';
  assert.equal(receipt?.path, expected, 'Reference must read its registered complete case');
  assert.equal(receipt.readBeforeLayout, true, 'Declare case reading before layout');
  assert.equal(receipt.sha256, hash(fs.readFileSync(path.join(root, expected))), 'Stale case receipt');
  assert.equal(spec.source?.map, 'references/' + family + '-world-map.txt', 'Registered source map required');
  const map = fs.readFileSync(path.join(root, spec.source.map));
  assert.equal(hash(map), spec.source.map_sha256, 'Source bytes changed');
  assert.deepEqual(spec.cells, map.toString('utf8').trim().split(/\r?\n/).map(row => row.trim().split(/\s+/)), 'Map cells differ from source');
  assert.equal(spec.cells.length, 16);
  assert(spec.cells.every(row => Array.isArray(row) && row.length === 16), 'Complete room cells required');
  assert(typeof spec.witness === 'string' && /^[UDLR]+$/.test(spec.witness), 'Complete ordinary witness required');
  const goal = c.goal;
  assert.equal(goal?.kind, c.profile === 'planar-transport-reference-v1' ? 'gem-and-return' : 'reach', 'Unsupported complete reference goal');
  assert(Array.isArray(goal.cell) && goal.cell.length === 3 && goal.cell.every(Number.isInteger), 'Complete endpoint required');
  assert(goal.cell[0] >= 0 && goal.cell[0] < 16 && goal.cell[1] >= 0 && goal.cell[1] < 16, 'Endpoint lies outside the room');
  if (c.profile === 'planar-transport-reference-v1') {
    require(path.join(root, 'scripts/official-runtime.cjs')).validate(spec, root);
    return;
  }
  const actors = spec.levelData?.actors;
  assert(Array.isArray(actors) && actors.length > 0, 'Complete parsed actors required');
  const entryHash = spec.source.entryStateSha256 || spec.entryStateSha256;
  assert.equal(jsonHash(spec.levelData), entryHash, 'Parsed entry fingerprint differs');
  if (c.profile === 'official-player-gate-reference-v1') {
    assert.deepEqual(c.members, actors.map((actor, i) => ({ actor: i, type: actor.type, group: actor.groupId || '', cell: [actor.x, actor.y, actor.elevation ?? 0] })), 'Declare every actual initial actor member');
  } else {
    assert.deepEqual(c.members, {
      blue: actors.flatMap((actor, i) => actor.type === 'weightless_box' ? [i] : []),
      floatingFloors: actors.flatMap((actor, i) => actor.type === 'floating_floor' ? [i] : [])
    }, 'Declare every actual bridge-convoy member');
  }
  const relationIds = new Set([...fs.readFileSync(path.join(root, 'references/mechanism-logic.md'), 'utf8').matchAll(/^### ([a-z0-9-]+)$/gm)].map(match => match[1]));
  assert(Array.isArray(c.relations) && c.relations.length > 0 && c.relations.every(id => relationIds.has(id)), 'Reference relation must exist in the mechanism');
}

function runReferenceCase(root, name, family, spec) {
  const label = name + ': ' + family;
  const validate = candidate => validateReferenceArtifact(candidate, root, family);
  test(label + ' reference artifact integrity', () => validate(spec));
  const stale = structuredClone(spec); stale.contract.readReceipt.sha256 = '0'.repeat(64);
  test(label + ' reject stale reference receipt', () => assert.throws(() => validate(stale), /Stale case receipt/));
  const foreign = structuredClone(spec); foreign.contract.readReceipt.path = 'references/official-unregistered-case.md';
  test(label + ' reject unregistered reference receipt', () => assert.throws(() => validate(foreign), /registered complete case/));
  const unread = structuredClone(spec); unread.contract.readReceipt.readBeforeLayout = false;
  test(label + ' reject absent reference reading declaration', () => assert.throws(() => validate(unread), /reading before layout/));
  const member = structuredClone(spec);
  if (member.contract.profile === 'official-player-gate-reference-v1') member.contract.members[0].cell = [-1, -1, 0];
  else if (member.contract.profile === 'official-bridge-convoy-v1') member.contract.members.blue[0] = 999;
  else Object.values(member.contract.members)[0][0] = [-1, -1, 0];
  test(label + ' reject foreign initial reference member', () => assert.throws(() => validate(member), /member/));
  const wrongGoal = structuredClone(spec); wrongGoal.contract.goal.kind = 'gem';
  test(label + ' reject unsupported reference goal', () => assert.throws(() => validate(wrongGoal), /reference goal/));
  const outside = structuredClone(spec); outside.contract.goal.cell = [-1, -1, 0];
  test(label + ' reject outside-room reference endpoint', () => assert.throws(() => validate(outside), /outside the room/));
  const noRoute = structuredClone(spec); noRoute.witness = '';
  test(label + ' reject missing reference witness', () => assert.throws(() => validate(noRoute), /witness/));
  const template = read(path.join(root, 'references/design-template.json'));
  test(label + ' blank scaffold cannot certify a reference', () => assert.throws(() => validate(template)));
  if (!engineRepo) return;
  checkOrigin(root, spec, family);
  let replay;
  test(label + ' complete ordinary reference replay', () => {
    if (spec.contract.profile === 'planar-transport-reference-v1') {
      replay = require(path.join(root, 'scripts/official-runtime.cjs')).replayReference(engineRepo, spec, root);
      assert(replay.result.rows.length === spec.witness.length);
    } else if (spec.contract.profile === 'official-player-gate-reference-v1') {
      replay = require(path.join(root, 'scripts/verify-reference.cjs')).verify({ skill: root, repo: engineRepo, family });
      assert.equal(replay.ordinaryReplayPassed, true);
    } else {
      replay = require(path.join(root, 'scripts/verify-reference.cjs')).verify(engineRepo, path.join(root, 'references', family + '-design.json'));
      assert.equal(replay.report.ordinaryReplayPassed, true);
    }
  });
  rows.at(-1).inputs = spec.witness.length;
  rows.at(-1).cells = jsonHash(spec.cells);
  if (spec.contract.profile === 'official-player-gate-reference-v1') {
    const unreachable = structuredClone(spec); unreachable.contract.goal.cell = [-1, -1, 0];
    test(label + ' ordinary helper rejects an unmet endpoint', () => assert.throws(() => require(path.join(root, 'scripts/verify-reference.cjs')).replay(unreachable, engineRepo), /objective was not reached/));
  }
}

async function main() {
  for (const name of fs.readdirSync(path.join(repo, 'skills'))) {
    // Workflow record gates have their own regression suite, without game fixtures.
    if (name === 'mazebench-case-workflow') continue;
    const root = path.join(repo, 'skills', name), skating = name.endsWith('skating-cross');
    const casePath = 'references/official-case.md';
    const legacy = read(path.join(root, 'references', 'official-design.json'));
    if (referenceProfiles.has(legacy.contract?.profile)) {
      const families = fs.readdirSync(path.join(root, 'references')).filter(file => /^(?:official|user|authored)(?:-[a-z0-9]+)*-case\.md$/.test(file)).map(file => file.slice(0, -'-case.md'.length));
      for (const family of families) runReferenceCase(root, name, family, read(path.join(root, 'references', family + '-design.json')));
      continue;
    }
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
      checkOrigin(root, legacy, 'official');
      const { engine: e } = runtime.load(engineRepo, legacy.cells);
      const o = skating ? runtime.observer(e, legacy) : runtime.observe(e, legacy.contract);
      test(name + ': complete original ordinary replay', () => runtime.replay(e, o, legacy.witness));
      rows.at(-1).inputs = legacy.witness.length;
      rows.at(-1).cells = hash(JSON.stringify(legacy.cells));
    }
    const extras = fs.readdirSync(path.join(root, 'references')).filter(file => /^(?:official|user|authored)-[a-z0-9-]+-case\.md$/.test(file));
    for (const file of extras) {
      const family = file.slice(0, -'-case.md'.length), casePaths = [casePath, ...extras.map(f => 'references/' + f)];
      const extra = read(path.join(root, 'references', family + '-design.json'));
      if (referenceProfiles.has(extra.contract?.profile)) {
        runReferenceCase(root, name, family, extra);
        continue;
      }
      test(name + ': ' + family + ' reproduction contract', () => runtime.validate(extra, root));
      test(name + ': ' + family + ' reading version', () => assert.equal(checkReadRecord(extra, root, casePaths).kind, 'case'));
      const stale = structuredClone(extra); stale.contract.readReceipt.sha256 = '0'.repeat(64);
      test(name + ': reject stale ' + family, () => assert.throws(() => runtime.validate(stale, root), /different document version/));
      const foreign = structuredClone(extra); foreign.contract.readReceipt.path = 'references/official-unregistered-case.md';
      test(name + ': reject unregistered named case', () => assert.throws(() => runtime.validate(foreign, root), /Unsupported reading document/));
      const badPair = structuredClone(extra), pair = Object.values(badPair.contract.events).find(q => q.kind === 'contact' && q.tool);
      if (pair) {
        pair.target = 'M999';
        test(name + ': reject undeclared contact pair', () => assert.throws(() => runtime.validate(badPair, root), /Explicit contact/));
      }
      if (engineRepo) {
        checkOrigin(root, extra, family);
        const { engine: e } = runtime.load(engineRepo, extra.cells), o = runtime.observe(e, extra.contract);
        let replay;
        test(name + ': ' + family + ' complete original replay', () => { replay = runtime.replay(e, o, extra.witness); });
        rows.at(-1).inputs = extra.witness.length;
        if (family === 'official-fxe') test(name + ': explicit contacts distinguish pairs and full translations', () => {
          assert(o.matches(replay.rows[26].event, extra.contract.events.contact));
          assert(!o.matches(replay.rows[35].event, extra.contract.events.contact));
          assert(o.matches(replay.rows[55].event, extra.contract.events.corridor));
          assert(!o.matches(replay.rows[55].event, extra.contract.events.delivery));
          assert(o.matches(replay.rows[118].event, extra.contract.events.delivery));
        });
        if (family === 'official-fxg') test(name + ': complete FxG two-passage goal and retained south access', () => {
          const complete = require(path.join(root, 'scripts/verify-official-fxg.cjs')).verify(engineRepo);
          assert.equal(complete.report.overall, 'passed');
          assert.equal(complete.report.solution.ordinaryReplayPassed, true);
          assert(complete.report.checks.some(check => check.name === 'south_still_walkable_at_completion' && check.actual === true));
        });
      }
    }
  }
  const report = { passed, engineReplayed: !!engineRepo, checks: rows, scope: 'Version, contract and reference-artifact rejection regressions; optional complete-case ordinary replay through the actual profile helpers. Reference fixtures do not inherit complex authoring stages. Format acceptance does not prove migrated declarations, necessity or stage semantics.' };
  if (value('--out')) {
    const out = path.resolve(value('--out')); assert(!fs.existsSync(out), 'Use a fresh test output directory');
    fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'read-record-tests.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ passed, engineReplayed: !!engineRepo }));
}
function checkOrigin(root, spec, family) {
  const origin = spec.originRoom;
  const index = read(path.join(engineRepo, origin.worldMap)).levels;
  test(path.basename(root) + ': ' + family + ' official world-map room', () => {
    assert.equal(origin.worldMap, 'games/maze/world_map.json');
    assert(/^games\/maze\/levels\/[a-z0-9]+\.txt$/.test(origin.level));
    assert(Array.isArray(index[path.basename(origin.level)]), 'Official level is absent from the world index');
    assert.equal(index[path.basename(origin.level)].join('x'), origin.id);
    const upstream = fs.readFileSync(path.join(engineRepo, origin.level));
    const packaged = fs.readFileSync(path.join(root, 'references', family + '-world-map.txt'));
    if (spec.source?.map_sha256) assert.equal(hash(packaged), spec.source.map_sha256, 'Packaged map bytes differ from source fingerprint');
    if (origin.relationship === 'unmodified-official') {
      // Git blobs are LF while a clean Windows checkout may use CRLF. No
      // whitespace, token, row or other content normalization is allowed.
      const normalizeCheckout = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
      assert.equal(normalizeCheckout(upstream), normalizeCheckout(packaged), 'Official source content differs');
      const blob = execFileSync('git', ['show', 'HEAD:' + origin.level], { cwd: engineRepo });
      assert.equal(normalizeCheckout(blob), normalizeCheckout(packaged), 'Official Git blob content differs');
    }
    else {
      assert.equal(origin.relationship, 'user-provided-reconstruction', 'Unknown source relationship');
      const tokenize = bytes => bytes.toString('utf8').trim().split(/\s+/);
      const a = tokenize(upstream), b = tokenize(packaged);
      assert.equal(a.length, b.length);
      assert(a.every((token, i) => token === b[i] || token === 'i+#' && b[i] === '.+#'));
    }
  });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
