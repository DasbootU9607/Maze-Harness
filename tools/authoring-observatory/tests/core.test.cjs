'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');

const appDir = path.resolve(__dirname, '..');
const cliPath = path.join(appDir, 'cli.cjs');

function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'authoring-observatory-test-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('authoring-observatory-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const store = require('../lib/store.cjs');
  const root = path.join(directory, 'runs');
  const specPath = path.join(directory, 'source-spec.json');
  const spec = {
    title: 'Evidence fixture',
    cells: [
      { x: 0, y: 0, z: 0, token: 'p' },
      { x: 1, y: 0, z: 0, token: '#' },
      { x: 2, y: 0, z: 0, token: 'G' },
    ],
    mechanism: { goal: 'Preserve the goal and verify each version independently.' },
  };
  writeJson(specPath, spec);
  const runDir = store.createRun({
    root,
    id: options.id || 'case',
    title: 'Core evidence test',
    task: 'Exercise recorded evidence without a model.',
    mode: options.mode || 'observed',
    configuration: {},
    limitations: [],
  });
  return { store, directory, root, runDir, specPath, spec };
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: appDir,
    encoding: 'utf8',
    shell: false,
    timeout: 15000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined, result.error && String(result.error));
  return result;
}

function execute(f, script, options = {}) {
  const args = ['exec', '--run', f.runDir, '--spec', f.specPath,
    '--kind', options.kind || 'test', '--label', options.label || 'Fixture process'];
  if (options.report) args.push('--report', options.report);
  args.push('--', process.execPath, '-e', script);
  return runCli(args);
}

function outputFile(runDir, relativePath) {
  assert.equal(typeof relativePath, 'string', 'Evidence must reference a saved output file.');
  const absolutePath = path.resolve(runDir, relativePath);
  assert.ok(absolutePath.startsWith(path.resolve(runDir) + path.sep));
  return fs.readFileSync(absolutePath, 'utf8');
}

function onlyTest(f) {
  const run = f.store.readRun(f.runDir);
  assert.equal(run.tests.length, 1);
  return { run, result: run.tests[0] };
}

test('candidate snapshots preserve bytes, deduplicate, and retain spatial changes', t => {
  const f = fixture(t);
  const originalBytes = fs.readFileSync(f.specPath);
  const first = f.store.captureSpec(f.runDir, f.specPath, { label: 'Initial candidate' });
  const repeat = f.store.captureSpec(f.runDir, f.specPath, { label: 'Same bytes' });
  assert.equal(repeat.id, first.id);
  assert.equal(first.sha256, f.store.hash(originalBytes));

  const revised = structuredClone(f.spec);
  revised.cells[1].token = '.';
  revised.cells[2].x = 3;
  writeJson(f.specPath, revised);
  const second = f.store.captureSpec(f.runDir, f.specPath, { label: 'Revised candidate' });

  assert.notEqual(second.id, first.id);
  assert.notEqual(second.specPath, first.specPath);
  assert.notEqual(second.sha256, first.sha256);
  assert.notEqual(second.cellsSha256, first.cellsSha256);
  assert.equal(second.parentId, first.id);
  assert.deepEqual(fs.readFileSync(path.join(f.runDir, first.specPath)), originalBytes);
  assert.equal(f.store.readRun(f.runDir).candidates.length, 2);
  assert.deepEqual(second.diff.added.map(cell => [cell.x, cell.y, cell.z]), [[3, 0, 0]]);
  assert.deepEqual(second.diff.removed.map(cell => [cell.x, cell.y, cell.z]), [[2, 0, 0]]);
  assert.deepEqual(second.diff.changed.map(cell => [cell.x, cell.y, cell.z]), [[1, 0, 0]]);
  assert.equal(second.diff.changed[0].before, '#');
  assert.equal(second.diff.changed[0].after, '.');
});

test('matrix maps retain cells and produce meaningful map differences', t => {
  const f = fixture(t);
  const cells = Array.from({ length: 16 }, () => Array(16).fill('.'));
  cells[0][0] = 'p';
  cells[0][1] = '#';
  cells[15][15] = 'G';
  writeJson(f.specPath, { cells });
  const first = f.store.captureSpec(f.runDir, f.specPath);
  cells[0][1] = '.';
  writeJson(f.specPath, { cells });
  const second = f.store.captureSpec(f.runDir, f.specPath);
  assert.equal(first.cellCount, 256);
  assert.equal(second.cellCount, 256);
  assert.equal(second.diff.changed.length, 1);
  assert.equal(second.diff.changed[0].x, 1);
  assert.equal(second.diff.changed[0].y, 0);
  assert.equal(second.diff.changed[0].before, '#');
  assert.equal(second.diff.changed[0].after, '.');
});

test('resource evidence preserves the delivered bytes after source changes', t => {
  const f = fixture(t);
  const source = path.join(f.directory, 'SKILL.md');
  fs.writeFileSync(source, 'Original rule: preserve a return route.\n');
  const resource = f.store.recordResource(f.runDir, source, { kind: 'skill' });
  fs.writeFileSync(source, 'Changed after the recorded read.\n');
  assert.equal(outputFile(f.runDir, resource.artifactPath), 'Original rule: preserve a return route.\n');
  assert.equal(resource.sha256, f.store.hash('Original rule: preserve a return route.\n'));
});

test('nonzero child exits retain stdout, stderr, exit status, and command linkage', t => {
  const f = fixture(t);
  const execution = execute(f,
    "process.stdout.write('observed stdout\\n'); process.stderr.write('observed stderr\\n'); process.exitCode = 7;",
    { report: path.join(f.directory, 'unproduced-report.json') });
  assert.equal(execution.status, 7);
  const { run, result } = onlyTest(f);
  assert.equal(result.processExitCode, 7);
  assert.notEqual(result.status, 'passed');
  assert.equal(outputFile(f.runDir, result.stdoutPath), 'observed stdout\n');
  assert.equal(outputFile(f.runDir, result.stderrPath), 'observed stderr\n');
  assert.ok(result.commandEventId);
  assert.ok(run.events.some(event => event.id === result.commandEventId));
  assert.ok(run.candidates.some(candidate => candidate.id === result.candidateId));
});

test('successful process without its expected report never passes validation', t => {
  const f = fixture(t);
  const execution = execute(f, "process.stdout.write('Process finished, no mechanism claim.');",
    { report: path.join(f.directory, 'unproduced-report.json') });
  assert.equal(execution.status, 0, execution.stderr);
  const { result } = onlyTest(f);
  assert.equal(result.processExitCode, 0);
  assert.ok(['unknown', 'error'].includes(result.status));
});

test('fresh reports bind to the executed candidate, never a later revision', t => {
  const f = fixture(t);
  const reportPath = path.join(f.directory, 'fresh-report.json');
  const expectedHash = f.store.hash(fs.readFileSync(f.specPath));
  const report = { status: 'passed', inputSha256: expectedHash,
    checks: [{ name: 'fixture check', status: 'passed', detail: 'A declared check from the fixture.' }] };
  const execution = execute(f,
    `require('node:fs').writeFileSync(${JSON.stringify(reportPath)}, ${JSON.stringify(JSON.stringify(report))});`,
    { report: reportPath });
  assert.equal(execution.status, 0, execution.stderr);
  const { run, result } = onlyTest(f);
  assert.equal(result.status, 'passed');
  assert.equal(result.binding, 'exact');
  assert.equal(result.bindingBasis, 'report-fingerprints-and-command-boundaries');
  assert.equal(result.inputSha256, expectedHash);
  assert.equal(result.candidateId, run.candidates[0].id);
  assert.equal(JSON.parse(outputFile(f.runDir, result.reportPath)).inputSha256, expectedHash);

  f.spec.cells[1].token = '.';
  writeJson(f.specPath, f.spec);
  const next = f.store.captureSpec(f.runDir, f.specPath);
  const storedTest = f.store.readRun(f.runDir).tests[0];
  assert.notEqual(storedTest.candidateId, next.id);
  assert.notEqual(storedTest.inputSha256, next.sha256);
  assert.equal(storedTest.candidateId, result.candidateId);
});

test('an existing report is rejected before the process can masquerade as a new test', t => {
  const f = fixture(t);
  const reportPath = path.join(f.directory, 'old-report.json');
  const marker = path.join(f.directory, 'child-executed.txt');
  writeJson(reportPath, { status: 'passed', checks: [{ name: 'old check', status: 'passed' }] });
  const oldBytes = fs.readFileSync(reportPath);
  const execution = execute(f,
    `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'must not run');`,
    { report: reportPath });
  assert.notEqual(execution.status, 0);
  assert.equal(fs.existsSync(marker), false);
  assert.deepEqual(fs.readFileSync(reportPath), oldBytes);
  assert.equal(f.store.readRun(f.runDir).tests.some(result => result.status === 'passed'), false);
});

test('a report claiming the wrong input hash cannot validate the current map', t => {
  const f = fixture(t);
  const reportPath = path.join(f.directory, 'wrong-input-report.json');
  const report = { status: 'passed', inputSha256: '0'.repeat(64),
    checks: [{ name: 'wrong map', status: 'passed' }] };
  execute(f,
    `require('node:fs').writeFileSync(${JSON.stringify(reportPath)}, ${JSON.stringify(JSON.stringify(report))});`,
    { report: reportPath });
  const { result } = onlyTest(f);
  assert.equal(result.binding, 'mismatch');
  assert.notEqual(result.status, 'passed');
});

test('changes to the input during execution invalidate an exact successful binding', t => {
  const f = fixture(t);
  const reportPath = path.join(f.directory, 'changed-input-report.json');
  const changed = structuredClone(f.spec);
  changed.cells[1].token = '.';
  const report = { status: 'passed', checks: [{ name: 'changed input', status: 'passed' }] };
  execute(f,
    `const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(f.specPath)}, ${JSON.stringify(JSON.stringify(changed))}); fs.writeFileSync(${JSON.stringify(reportPath)}, ${JSON.stringify(JSON.stringify(report))});`,
    { report: reportPath });
  const { result } = onlyTest(f);
  assert.notEqual(result.binding, 'exact');
  assert.notEqual(result.status, 'passed');
});

test('an explicitly unknown report stays unknown even when its process exits zero', t => {
  const f = fixture(t);
  const reportPath = path.join(f.directory, 'unknown-report.json');
  const report = { status: 'unknown', checks: [{ name: 'limited check', status: 'passed' }] };
  const execution = execute(f,
    `require('node:fs').writeFileSync(${JSON.stringify(reportPath)}, ${JSON.stringify(JSON.stringify(report))});`,
    { report: reportPath });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(onlyTest(f).result.status, 'unknown');
  assert.equal(onlyTest(f).result.bindingBasis, 'command-boundaries-only');
});

test('historical events preserve unknown occurrence times and separate import time', t => {
  const f = fixture(t, { mode: 'historical' });
  f.store.appendEvent(f.runDir, 'historical_evidence', { source: 'old-report.json' }, {
    origin: 'historical', at: null,
  });
  const candidate = f.store.captureSpec(f.runDir, f.specPath, { origin: 'historical', at: null });
  f.store.addTest(f.runDir, {
    candidateId: candidate.id,
    label: 'Imported result with unknown time',
    at: null,
    origin: 'historical',
    status: 'unknown',
    binding: 'historical',
    checks: [],
  });
  const run = f.store.readRun(f.runDir);
  const event = run.events.find(item => item.type === 'historical_evidence');
  assert.equal(event.at, null);
  assert.equal(typeof event.recordedAt, 'string');
  assert.ok(Number.isFinite(Date.parse(event.recordedAt)));
  assert.equal(run.tests[0].at, null);
  assert.equal(run.tests[0].status, 'unknown');
  assert.equal(run.tests[0].binding, 'historical');
  for (const historicalEvent of run.events.filter(item => item.origin === 'historical')) {
    assert.equal(historicalEvent.at, null);
  }
});

test('artifact API reads only files physically inside the selected run', async t => {
  const f = fixture(t, { id: 'api-case' });
  const candidate = f.store.captureSpec(f.runDir, f.specPath);
  const secret = 'OUTSIDE-RUN-SENTINEL-DO-NOT-RETURN';
  const sibling = path.join(f.root, 'api-case-extra');
  fs.mkdirSync(sibling, { recursive: true });
  const outsideFile = path.join(sibling, 'outside.txt');
  fs.writeFileSync(outsideFile, secret);
  const { createServer } = require('../server.cjs');
  const server = createServer({ root: f.root, publicDir: path.join(appDir, 'public') });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const normal = await fetch(`${base}/api/runs/api-case/artifact?path=${encodeURIComponent(candidate.specPath)}`);
  assert.equal(normal.status, 200, await normal.clone().text());
  assert.deepEqual(JSON.parse(await normal.text()), f.spec);
  const specResponse = await fetch(`${base}/api/runs/api-case/spec/${encodeURIComponent(candidate.id)}`);
  assert.equal(specResponse.status, 200);
  assert.deepEqual(await specResponse.json(), f.spec);

  const attempts = [
    '../api-case-extra/outside.txt',
    '..\\api-case-extra\\outside.txt',
    outsideFile,
    path.resolve(f.runDir, '..', 'api-case-extra', 'outside.txt'),
  ];
  for (const attemptedPath of attempts) {
    const response = await fetch(`${base}/api/runs/api-case/artifact?path=${encodeURIComponent(attemptedPath)}`);
    const body = await response.text();
    assert.ok(response.status >= 400 && response.status < 500, `Must reject path ${attemptedPath}: ${response.status}`);
    assert.equal(body.includes(secret), false);
  }

  const link = path.join(f.runDir, 'external-link');
  try {
    fs.symlinkSync(sibling, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      t.diagnostic('Symlink/junction creation unavailable; lexical traversal checks completed.');
      return;
    }
    throw error;
  }
  const linkedResponse = await fetch(`${base}/api/runs/api-case/artifact?path=${encodeURIComponent('external-link/outside.txt')}`);
  assert.ok(linkedResponse.status >= 400 && linkedResponse.status < 500);
  assert.equal((await linkedResponse.text()).includes(secret), false);
});

test('run listings and metadata APIs reject symlink escapes outside their run boundaries', async t => {
  const f = fixture(t, { id: 'safe-run' });
  const secret = 'OUTSIDE-RUN-METADATA-SENTINEL';
  const outsideRun = f.store.createRun({ root: path.join(f.directory, 'external-runs'), id: 'outside', title: secret });
  const alias = path.join(f.root, 'escaped-run');
  try { fs.symlinkSync(outsideRun, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('OS does not allow creation of a symlink/junction fixture.');
    return;
  }
  const { createServer } = require('../server.cjs');
  const server = createServer({ root: f.root, publicDir: path.join(appDir, 'public') });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const listed = await fetch(`${base}/api/runs`);
  assert.equal(listed.status, 200);
  const listedBody = await listed.text();
  assert.equal(listedBody.includes(secret), false);
  assert.deepEqual(JSON.parse(listedBody).runs.map(run => run.id), ['safe-run']);
  const escaped = await fetch(`${base}/api/runs/escaped-run`);
  assert.equal(escaped.status, 403);
  assert.equal((await escaped.text()).includes(secret), false);

  for (const filename of ['manifest.json', 'index.json', 'events.jsonl']) {
    const target = path.join(f.runDir, filename), backup = target + '.backup';
    fs.renameSync(target, backup);
    let linked = false;
    try {
      fs.symlinkSync(path.join(outsideRun, filename), target, 'file');
      linked = true;
      const response = await fetch(`${base}/api/runs/safe-run`);
      assert.equal(response.status, 403, `Metadata ${filename} must not resolve outside its own run.`);
      assert.equal((await response.text()).includes(secret), false);
      const responseList = await fetch(`${base}/api/runs`);
      assert.equal(responseList.status, 200);
      assert.equal((await responseList.json()).runs.length, 0);
    } catch (error) {
      if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
      t.diagnostic(`File symlink unavailable for ${filename}; directory junction escape was verified.`);
    } finally {
      if (linked) fs.unlinkSync(target);
      fs.renameSync(backup, target);
    }
  }
});
