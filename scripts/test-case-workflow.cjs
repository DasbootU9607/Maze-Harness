'use strict';

// Synthetic records test workflow behavior, never human authorship or gameplay.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'skills/mazebench-case-workflow/scripts/workflow.cjs');
const flow = require(script);
const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const output = value('--out') ? path.resolve(value('--out')) : fs.mkdtempSync(path.join(os.tmpdir(), 'maze-case-workflow-'));
if (value('--out')) { assert(!fs.existsSync(output), 'Use a fresh test output directory'); fs.mkdirSync(output, { recursive: true }); }
const checks = [];
const test = (name, run) => { run(); checks.push({ name, verdict: 'passed' }); };
const edit = change => { const data = flow.load(work); change(data); flow.save(work, data); };
const work = path.join(output, 'work');
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
  });
}
function writeAnalysis(id) {
  fs.writeFileSync(path.join(work, 'cases', id.toLowerCase(), 'analysis.md'), '# Synthetic record\n\nRecord-integrity test only. No actual mechanism analysis or gameplay claim.\n');
  flow.recordAnalysis(work, id);
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
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
});
test('Changing an analysis artifact requires recording and renewed synthesis', () => {
  fs.appendFileSync(path.join(work, 'cases/hxh/analysis.md'), '\nChanged synthetic evidence.\n');
  assert.equal(flow.status(work).phase, 'case-analysis');
  flow.recordAnalysis(work, 'HxH');
  assert.equal(flow.status(work).phase, 'synthesis');
  flow.recordSynthesis(work);
});
test('Changing entry context or target also invalidates dependent records', () => {
  edit(data => { data.cases[0].source.entryMode = 'world-transition'; });
  assert.equal(flow.status(work).phase, 'case-analysis');
  flow.recordAnalysis(work, 'HxH');
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
