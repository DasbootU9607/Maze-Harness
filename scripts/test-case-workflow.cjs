'use strict';

// Synthetic records test workflow behavior, never human authorship or gameplay.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'skills/mazebench-case-workflow/scripts/workflow.cjs');
const flow = require(script);
const { catalogIssues, defaultLibrary } = require('../skills/mazebench-case-workflow/scripts/reference-library.cjs');
const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const output = value('--out') ? path.resolve(value('--out')) : fs.mkdtempSync(path.join(os.tmpdir(), 'maze-case-workflow-'));
if (value('--out')) { assert(!fs.existsSync(output), 'Use a fresh test output directory'); fs.mkdirSync(output, { recursive: true }); }
const checks = [];
const test = (name, run) => { run(); checks.push({ name, verdict: 'passed' }); };
const edit = change => { const data = flow.load(work); change(data); flow.save(work, data); };
const work = path.join(output, 'work');
const baselineFile = path.join(output, 'baseline-catalog.json');
const engine = path.join(output, 'synthetic-engine');
const git = (...command) => execFileSync('git', ['-C', engine, ...command], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const original = Buffer.from('.+# .+#\r\n.+p .+M0\r\n', 'utf8');
fs.mkdirSync(path.join(engine, 'games/maze/levels'), { recursive: true });
fs.writeFileSync(path.join(engine, '.gitattributes'), '* -text\n');
fs.writeFileSync(path.join(engine, 'games/maze/world_map.json'), JSON.stringify({ levels: { 'hxh.txt': ['H', 'H'], 'gxe.txt': ['G', 'E'], 'fxe.txt': ['F', 'E'] } }));
for (const name of ['hxh', 'gxe', 'fxe']) fs.writeFileSync(path.join(engine, 'games/maze/levels/' + name + '.txt'), original);
git('init', '-q');
git('add', '--all');
git('-c', 'user.name=Workflow Test', '-c', 'user.email=workflow-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'Synthetic source fixture');

function supplySyntheticInput(id) {
  edit(data => {
    const item = data.cases.find(candidate => candidate.id === id);
    item.humanFocus = { status: 'provided', statement: 'SYNTHETIC INPUT FOR RECORD TESTS ONLY: preparation enables contact and subsequent work.', source: 'Synthetic test fixture, not a human conversation.' };
    item.source.entryMode = 'authored-player';
    item.source.entryEvidence = 'Synthetic fixture state; no official gameplay claim.';
    item.relations = ['fixture-preparation'];
  });
}
function writeAnalysis(id) {
  fs.writeFileSync(path.join(work, 'cases', id.toLowerCase(), 'analysis.md'), '# Synthetic record\n\nRecord-integrity test only. No actual mechanism analysis or gameplay claim.\n');
  flow.recordAnalysis(work, id);
  rateCurrent(id);
}
function rateCurrent(id) {
  flow.rate(work, id, 'l2', 'structural-estimate', 'Synthetic relative-grade fixture; not an actual difficulty claim.', 'Synthetic analysis, not player evidence.');
}
function writeSynthesis() {
  fs.writeFileSync(path.join(work, 'synthesis.md'), '# Synthetic synthesis\n\nRecord-integrity test only. No verified mechanism or transfer claim.\n');
  flow.recordSynthesis(work);
}

test('Initialize multiple cases without fabricating human focus', () => {
  flow.init(work, ['H*H', 'GxE'], 'mazebench-workflow-fixture');
  assert.deepEqual(flow.load(work).cases.map(item => item.id), ['HxH', 'GxE']);
  assert(flow.load(work).cases.every(item => item.humanFocus.status === 'awaiting-user' && item.humanFocus.statement === ''));
  assert.equal(flow.status(work).phase, 'human-input');
});
test('Existing work and duplicate cases are preserved', () => {
  assert.throws(() => flow.init(work, ['HxH']), /new work directory/);
  assert.throws(() => flow.addCase(work, 'H*H'), /Duplicate/);
  assert.throws(() => flow.init(path.join(output, 'duplicate'), ['H*H', 'HxH']), /Duplicate/);
});
test('Invalid target cannot escape the selected parent', () => {
  assert.throws(() => flow.init(path.join(output, 'invalid'), ['HxH'], '../escape'), /target name/);
  assert(!fs.existsSync(path.join(output, 'invalid')));
});
test('Source capture works while human input is pending and preserves raw bytes', () => {
  for (const id of ['HxH', 'GxE']) flow.capture(work, id, engine);
  assert(fs.readFileSync(path.join(work, 'cases/hxh/original-map.txt')).equals(original));
  assert.equal(flow.load(work).cases[0].source.engineCommit, git('rev-parse', 'HEAD').toString().trim());
  assert.equal(flow.load(work).cases[0].source.level, 'games/maze/levels/hxh.txt');
  assert.equal(flow.load(work).cases[0].source.entryMode, '');
  assert.equal(flow.status(work).phase, 'human-input');
});
test('Analysis and synthesis cannot advance without human input', () => {
  assert.throws(() => flow.recordAnalysis(work, 'HxH'), /human focus/);
  assert.throws(() => flow.recordSynthesis(work), /human focus/);
  assert.throws(() => flow.scaffold(work, path.join(output, 'blocked')), /human focus/);
  assert(!fs.existsSync(path.join(output, 'blocked')));
});
test('Entry context and unfinished analysis remain required after human input', () => {
  supplySyntheticInput('HxH');
  edit(data => { data.cases[0].source.entryEvidence = ''; });
  assert.throws(() => flow.recordAnalysis(work, 'HxH'), /entry context/);
  supplySyntheticInput('HxH');
  assert.throws(() => flow.recordAnalysis(work, 'HxH'), /Complete the analysis/);
  writeAnalysis('HxH');
});
test('One completed case cannot authorize integrating another', () => {
  assert.throws(() => flow.recordSynthesis(work), /GxE: actual case-specific human focus/);
  supplySyntheticInput('GxE');
  writeAnalysis('GxE');
  assert.equal(flow.status(work).phase, 'synthesis');
  assert.throws(() => flow.recordSynthesis(work), /Complete the analysis\/synthesis/);
});
test('Current records unlock a scaffold without claiming verification', () => {
  writeSynthesis();
  assert.equal(flow.status(work).ready, true);
  const result = flow.scaffold(work, path.join(output, 'generated'));
  assert.equal(result.complete, false);
  const generated = result.created;
  assert(fs.readFileSync(path.join(generated, 'references/official-world-map.txt')).equals(original));
  assert(fs.readFileSync(path.join(generated, 'references/official-gxe-world-map.txt')).equals(original));
  assert(!fs.existsSync(path.join(generated, 'references/official-checks.json')));
  assert(!fs.existsSync(path.join(generated, 'workflow.json')));
  const spec = JSON.parse(fs.readFileSync(path.join(generated, 'references/design-template.json')));
  assert.deepEqual(spec.cells, []);
  assert.deepEqual(spec.contract.events, {});
  assert.deepEqual(spec.contract.stages, []);
  assert(!Object.hasOwn(spec, 'witness'));
  const catalog = JSON.parse(fs.readFileSync(path.join(generated, 'references/reference-catalog.json')));
  assert.equal(catalog.references.length, 2);
  assert.deepEqual(catalogIssues(catalog), []);
  assert.match(fs.readFileSync(path.join(generated, 'SKILL.md'), 'utf8'), /\[TODO:/);
  assert(!fs.readFileSync(path.join(generated, 'references/official-case.md'), 'utf8').includes('SYNTHETIC INPUT'));
});
test('Scaffold refuses to overwrite an existing skill', () => {
  const file = path.join(output, 'generated/mazebench-workflow-fixture/SKILL.md');
  const before = fs.readFileSync(file);
  assert.throws(() => flow.scaffold(work, path.join(output, 'generated')), /already exists/);
  assert(fs.readFileSync(file).equals(before));
});
test('Changing human focus invalidates analysis and synthesis', () => {
  edit(data => { data.cases[0].humanFocus.statement += ' Changed test focus.'; });
  assert.equal(flow.status(work).phase, 'case-analysis');
  assert.throws(() => flow.recordSynthesis(work), /stale input/);
  assert.throws(() => flow.scaffold(work, path.join(output, 'stale')), /stale input/);
  flow.recordAnalysis(work, 'HxH');
  assert.equal(flow.status(work).phase, 'reference-library');
  rateCurrent('HxH');
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
});
test('Changing an analysis artifact requires recording and renewed synthesis', () => {
  fs.appendFileSync(path.join(work, 'cases/hxh/analysis.md'), '\nChanged synthetic evidence.\n');
  assert.equal(flow.status(work).phase, 'case-analysis');
  flow.recordAnalysis(work, 'HxH');
  assert.equal(flow.status(work).phase, 'reference-library');
  rateCurrent('HxH');
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
});
test('Changing entry context or target also invalidates dependent records', () => {
  edit(data => { data.cases[0].source.entryMode = 'world-transition'; });
  assert.equal(flow.status(work).phase, 'case-analysis');
  flow.recordAnalysis(work, 'HxH');
  rateCurrent('HxH');
  flow.recordSynthesis(work);
  edit(data => { data.targetSkill = 'mazebench-renamed-fixture'; });
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
});
test('Tampering with original map bytes is rejected and capture preserves them', () => {
  const map = path.join(work, 'cases/hxh/original-map.txt');
  fs.appendFileSync(map, 'altered');
  assert.equal(flow.status(work).phase, 'source-and-entry');
  assert.throws(() => flow.recordAnalysis(work, 'HxH'), /map bytes or hash changed/);
  assert.throws(() => flow.capture(work, 'HxH', engine), /Captured map differs/);
  assert.match(fs.readFileSync(map, 'utf8'), /altered$/);
  fs.writeFileSync(map, original);
});
test('Outside-work artifact paths cannot be accepted', () => {
  const saved = flow.load(work);
  edit(data => { data.cases[0].source.mapPath = '../outside.txt'; });
  assert.throws(() => flow.recordAnalysis(work, 'HxH'), /inside the work directory/);
  flow.save(work, saved);
  edit(data => { data.cases[0].analysis.path = '../analysis.md'; });
  assert.throws(() => flow.recordSynthesis(work), /inside the work directory/);
  flow.save(work, saved);
});
test('Regrading only renews synthesis and retains the case analysis and human focus', () => {
  const previous = flow.load(work).cases[0];
  assert.throws(() => flow.rate(work, 'HxH', 'l9', 'structural-estimate', 'Unknown level', 'Synthetic source'), /defined level/);
  assert.throws(() => flow.rate(work, 'HxH', 'l1', 'solver-count', 'Wrong basis', 'Synthetic source'), /defined level/);
  assert.throws(() => flow.rate(work, 'HxH', 'l1', 'human-assigned', 'Missing evidence', ''), /evidence/);
  flow.rate(work, 'HxH', 'l3', 'human-assigned', 'Synthetic user tier assignment for workflow tests only.', 'PRIVATE_GRADE_SOURCE');
  const current = flow.load(work).cases[0];
  assert.deepEqual(current.analysis, previous.analysis);
  assert.deepEqual(current.humanFocus, previous.humanFocus);
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
  flow.exportCatalog(work, baselineFile);
  const text = fs.readFileSync(baselineFile, 'utf8');
  assert(!text.includes('PRIVATE_GRADE_SOURCE') && !text.includes('SYNTHETIC INPUT'));
  assert.throws(() => flow.exportCatalog(work, baselineFile), /fresh catalog output/);
});
test('Legacy work keeps its original fingerprints and can enable a ladder later', () => {
  const legacyWork = path.join(output, 'legacy-work');
  fs.cpSync(work, legacyWork, { recursive: true });
  const data = flow.load(legacyWork);
  delete data.referenceLibrary;
  data.cases = data.cases.map(({ id, humanFocus, source, analysis }) => ({ id, humanFocus, source, analysis }));
  // Historical v1 synthesis serialization, retained as an interface regression.
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const historical = { targetSkill: data.targetSkill, cases: data.cases.map(item => ({ id: item.id, input: item.analysis.inputSha256, analysis: item.analysis })) };
  data.synthesis.inputSha256 = crypto.createHash('sha256').update(JSON.stringify(canonical(historical))).digest('hex');
  flow.save(legacyWork, data);
  assert.equal(flow.status(legacyWork).ready, true);
  flow.enableLibrary(legacyWork);
  const upgraded = flow.status(legacyWork);
  assert(upgraded.cases.every(item => item.issues.length === 0));
  assert.equal(upgraded.phase, 'reference-library');
});
test('A new case reopens its human gate and stales the earlier synthesis', () => {
  flow.addCase(work, 'FxE');
  assert.equal(flow.status(work).phase, 'human-input');
  assert(flow.status(work).synthesisIssues.some(issue => issue.includes('stale')));
  assert.throws(() => flow.scaffold(work, path.join(output, 'new-case-blocked')), /FxE: actual case-specific human focus/);
});
test('Dirty tracked source tree is rejected without discarding changes', () => {
  const map = path.join(engine, 'games/maze/levels/fxe.txt');
  fs.appendFileSync(map, 'changed');
  assert.throws(() => flow.capture(work, 'FxE', engine), /clean tracked engine checkout/);
  assert.match(fs.readFileSync(map, 'utf8'), /changed$/);
  fs.writeFileSync(map, original);
});
test('CLI returns usable status and rejects missing arguments', () => {
  const result = JSON.parse(execFileSync(process.execPath, [script, 'status', '--work', work], { encoding: 'utf8', windowsHide: true }));
  assert.equal(result.phase, 'human-input');
  const invalid = spawnSync(process.execPath, [script, 'capture', '--work', work, '--case', 'HxH'], { encoding: 'utf8', windowsHide: true });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Supply --repo/);
});

const extension = path.join(output, 'extension');
const variantFile = path.join(output, 'supplied-variant.txt');
const variantBytes = Buffer.from('.+# .+#\r\n.+M0 .+p\r\n', 'utf8');
fs.writeFileSync(variantFile, variantBytes);
function prepareSyntheticReference(directory, id, level = 'l2', basis = 'structural-estimate') {
  const data = flow.load(directory), item = data.cases.find(candidate => candidate.id === id);
  item.humanFocus = { status: 'provided', statement: 'SYNTHETIC INPUT: retain the fixture relation and vary preparation.', source: 'Synthetic reference-library test, not an actual conversation.' };
  item.source.entryMode = 'authored-player';
  item.source.entryEvidence = 'Synthetic state only; no gameplay verification.';
  item.relations = ['fixture-preparation'];
  if (/^(user|authored)-/.test(id)) item.changeSummary = 'Synthetic variant changes the initial arrangement; this is not a proved gameplay relationship.';
  flow.save(directory, data);
  fs.writeFileSync(path.join(directory, 'cases', id.toLowerCase(), 'analysis.md'), '# Synthetic analysis\n\nRecord tests only, without gameplay or human-difficulty evidence.\n');
  flow.recordAnalysis(directory, id);
  flow.rate(directory, id, level, basis, 'Synthetic comparative rationale; no actual reference is graded by this test.', 'Private synthetic evidence reference.');
}
function synthesize(directory) {
  fs.writeFileSync(path.join(directory, 'synthesis.md'), '# Synthetic integration\n\nCatalog behavior only, not verified mechanism synthesis.\n');
  flow.recordSynthesis(directory);
}

test('Incremental official addition retains baseline families without repeating prior human input', () => {
  flow.init(extension, ['FxE'], 'mazebench-renamed-fixture');
  flow.importBaseline(extension, baselineFile);
  assert.equal(flow.load(extension).cases.length, 1);
  assert.equal(flow.load(extension).cases[0].family, 'official-fxe');
  flow.capture(extension, 'FxE', engine);
  assert.throws(() => flow.recordAnalysis(extension, 'FxE'), /human focus/);
  prepareSyntheticReference(extension, 'FxE', 'unranked', 'unranked');
});
test('Human variant keeps its own provenance, bytes, parent and input gate', () => {
  flow.addCase(extension, 'user-offset-easy', 'HxH');
  assert.throws(() => flow.capture(extension, 'user-offset-easy', engine), /import-variant/);
  assert.throws(() => flow.importVariant(extension, 'FxE', variantFile, engine, 'Synthetic source'), /cannot replace an official/);
  flow.importVariant(extension, 'user-offset-easy', variantFile, engine, 'Synthetic user-supplied map for tests.');
  const item = flow.load(extension).cases.find(item => item.id === 'user-offset-easy');
  assert.equal(item.parentCase, 'HxH');
  assert.equal(item.source.worldMap, '');
  assert.equal(item.source.level, '');
  assert.equal(item.family, 'user-offset-easy');
  assert(fs.readFileSync(path.join(extension, item.source.mapPath)).equals(variantBytes));
  assert.throws(() => flow.recordAnalysis(extension, item.id), /human focus/);
  prepareSyntheticReference(extension, item.id, 'l1', 'human-assigned');
});
test('Missing parents, Build JSON mislabeling and changed variant bytes are rejected', () => {
  assert.throws(() => flow.addCase(extension, 'user-orphan', 'AxA'), /parent reference is missing/);
  assert(!fs.existsSync(path.join(extension, 'cases/user-orphan')));
  const buildFile = path.join(output, 'build.json');
  fs.writeFileSync(buildFile, '{"cells":[]}\n');
  assert.throws(() => flow.importVariant(extension, 'user-offset-easy', buildFile, engine, 'Synthetic source'), /world-map/);
  const changed = path.join(output, 'changed-variant.txt');
  fs.writeFileSync(changed, original);
  assert.throws(() => flow.importVariant(extension, 'user-offset-easy', changed, engine, 'Synthetic source'), /Captured map differs/);
  assert(fs.readFileSync(path.join(extension, 'cases/user-offset-easy/original-map.txt')).equals(variantBytes));
});
test('Authored variants remain distinct and cyclic lineage cannot pass', () => {
  flow.addCase(extension, 'authored-recovery', 'user-offset-easy');
  flow.importVariant(extension, 'authored-recovery', variantFile, engine, 'Synthetic agent-authored fixture under a synthetic brief.');
  prepareSyntheticReference(extension, 'authored-recovery', 'l1');
  const saved = flow.load(extension), cyclic = structuredClone(saved);
  cyclic.cases.find(item => item.id === 'user-offset-easy').parentCase = 'authored-recovery';
  flow.save(extension, cyclic);
  assert.throws(() => flow.recordAnalysis(extension, 'user-offset-easy'), /cyclic variant lineage/);
  assert(flow.status(extension).synthesisIssues.some(issue => issue.includes('cyclic variant lineage')));
  flow.save(extension, saved);
});
let merged;
test('Merged catalog retains unchanged entries, ties, empty bands and unranked cases', () => {
  synthesize(extension);
  const file = path.join(output, 'merged-catalog.json');
  flow.exportCatalog(extension, file);
  merged = JSON.parse(fs.readFileSync(file));
  const baseline = JSON.parse(fs.readFileSync(baselineFile));
  for (const item of baseline.references) assert.deepEqual(merged.references.find(entry => entry.id === item.id), item);
  assert.equal(merged.references.length, 5);
  assert.equal(merged.references.find(item => item.id === 'FxE').difficulty.level, 'unranked');
  assert.equal(merged.references.filter(item => item.difficulty.level === 'l1').length, 2);
  assert.deepEqual(catalogIssues(merged), []);
  assert.throws(() => flow.scaffold(extension, path.join(output, 'partial-skill')), /baseline extension/);
});
test('Rubric edits stale working grades without invalidating unchanged analyses', () => {
  const saved = flow.load(extension), changed = structuredClone(saved);
  changed.referenceLibrary.levels[0].criteria += ' Revised synthetic criterion.';
  flow.save(extension, changed);
  const report = flow.status(extension);
  assert(report.cases.every(item => item.issues.length === 0));
  assert.equal(report.phase, 'reference-library');
  flow.save(extension, saved);
});
test('Baseline snapshots detect tampering and reject another target skill', () => {
  const data = flow.load(extension), file = path.join(extension, data.baseline.path), bytes = fs.readFileSync(file);
  fs.appendFileSync(file, ' ');
  assert(flow.status(extension).synthesisIssues.some(issue => issue.includes('Baseline catalog changed')));
  fs.writeFileSync(file, bytes);
  const other = structuredClone(merged);
  other.targetSkill = 'mazebench-other-fixture';
  const otherFile = path.join(output, 'other-catalog.json');
  fs.writeFileSync(otherFile, JSON.stringify(other));
  assert.throws(() => flow.importBaseline(extension, otherFile), /different target skill/);
});
test('A variant-only scaffold uses user case files and never labels the map official', () => {
  const standalone = path.join(output, 'standalone');
  flow.init(standalone, ['user-standalone'], 'mazebench-variant-fixture');
  flow.importVariant(standalone, 'user-standalone', variantFile, engine, 'Synthetic standalone user fixture.');
  prepareSyntheticReference(standalone, 'user-standalone', 'l1');
  synthesize(standalone);
  const result = flow.scaffold(standalone, path.join(output, 'standalone-skill'));
  assert.match(fs.readFileSync(path.join(result.created, 'references/user-standalone-case.md'), 'utf8'), /User-authored reference case/);
  assert(!fs.existsSync(path.join(result.created, 'references/official-world-map.txt')));
  assert(fs.readFileSync(path.join(result.created, 'references/user-standalone-world-map.txt')).equals(variantBytes));
});
test('Catalog validation rejects malformed rubrics, unknown tiers and false official labels', () => {
  const bad = structuredClone(merged);
  bad.levels = {};
  assert(catalogIssues(bad).length > 0);
  const unknown = structuredClone(merged);
  unknown.references[0].difficulty.level = 'l99';
  assert(catalogIssues(unknown).some(issue => issue.includes('difficulty level')));
  const mislabeled = structuredClone(merged);
  mislabeled.references.find(item => item.id === 'user-offset-easy').kind = 'official';
  assert(catalogIssues(mislabeled).some(issue => issue.includes('source kind')));
});
test('Package checks validate real catalog links, map fingerprints and relation IDs', () => {
  const fixture = path.join(output, 'package-check');
  const name = 'mazebench-hook-transfer', directory = path.join(fixture, 'skills', name);
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  fs.cpSync(path.join(root, 'skills', name), directory, { recursive: true });
  fs.writeFileSync(path.join(fixture, 'README.md'), '[MazeBench Hook Transfer](skills/mazebench-hook-transfer/SKILL.md)\n');
  const references = ['official', 'official-fxe'].map(family => {
    const spec = JSON.parse(fs.readFileSync(path.join(directory, 'references', family + '-design.json')));
    const text = fs.readFileSync(path.join(directory, 'references', family + '-case.md'), 'utf8');
    return { id: spec.originRoom.id, kind: 'official', family, parentCase: '', changeSummary: '', relations: ['ht-remote-contact'],
      mapSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'references', family + '-world-map.txt'))).digest('hex'),
      engineCommit: text.match(/(?:commit|baseline):? `([0-9a-f]{40})`/)[1], casePath: 'references/' + family + '-case.md',
      difficulty: { level: 'unranked', basis: 'unranked', rationale: 'Catalog-validation fixture only; no actual rating assigned.' } };
  });
  const catalog = { schemaVersion: 1, targetSkill: name, ...defaultLibrary(), references };
  const file = path.join(directory, 'references/reference-catalog.json');
  const write = data => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  write(catalog);
  fs.writeFileSync(path.join(directory, 'references/difficulty.md'), '# Synthetic catalog check\n\nBoth references remain unranked in this isolated test fixture.\n');
  const { checkRepository } = require('./check-skills.cjs');
  assert.deepEqual(checkRepository(fixture).errors, []);
  catalog.references[0].mapSha256 = '0'.repeat(64);
  write(catalog);
  assert(checkRepository(fixture).errors.some(issue => issue.includes('stale catalog map fingerprint')));
  catalog.references[0].relations = ['nonexistent-mechanism-relation'];
  write(catalog);
  assert(checkRepository(fixture).errors.some(issue => issue.includes('undefined mechanism relation')));
  fs.writeFileSync(path.join(directory, 'references/reference-case.md'), '# Incorrect source prefix\n');
  assert(checkRepository(fixture).errors.some(issue => issue.includes('reference-case.md: use official-')));
});
if (value('--repo')) test('Read-only source capture against the supplied real engine checkout', () => {
  const actualWork = path.join(output, 'actual-source-capture');
  flow.init(actualWork, ['HxH'], 'mazebench-capture-check');
  flow.capture(actualWork, 'HxH', value('--repo'));
  const item = flow.load(actualWork).cases[0];
  assert.equal(item.source.level, 'games/maze/levels/mygl8anih8.txt');
  assert.equal(item.humanFocus.status, 'awaiting-user');
  assert.equal(flow.status(actualWork).phase, 'human-input');
});
const report = { passed: checks.length, scope: 'Workflow records and source/scaffold integrity only; synthetic focus is not actual human input, and no puzzle-solving or agent-authoring behavior is certified.', checks };
fs.writeFileSync(path.join(output, 'workflow-tests.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.length, report: path.join(output, 'workflow-tests.json') }));
