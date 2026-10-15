'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const S = require('../lib/store.cjs');
const { auditRun, outputOutsideRun } = require('../audit-run.cjs');

function fixture(t, historical = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'authoring-audit-fixture-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('authoring-audit-fixture-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const runDir = S.createRun({ root: path.join(directory, 'runs'), id: 'synthetic-audit',
    title: 'Synthetic audit fixture — not an actual model run',
    mode: historical ? 'historical' : 'observed',
    configuration: { fixture: true, actualModelRun: false }, limitations: ['Synthetic fixture only.'] });
  const specPath = path.join(directory, 'spec.json');
  fs.writeFileSync(specPath, JSON.stringify({ cells: [{ x: 0, y: 0, z: 0, token: 'p' }], contract: { fixture: true } }));
  if (historical) {
    S.captureSpec(runDir, specPath, { origin: 'historical' });
  } else {
    const reportPath = path.join(directory, 'fresh-report.json');
    const report = { status: 'passed', inputSha256: S.hash(fs.readFileSync(specPath)),
      checks: [{ name: 'Synthetic fixture check', status: 'passed' }] };
    const script = `require('node:fs').writeFileSync(${JSON.stringify(reportPath)}, ${JSON.stringify(JSON.stringify(report))});`;
    const processResult = spawnSync(process.execPath, [path.resolve(__dirname, '../cli.cjs'), 'exec', '--run', runDir,
      '--spec', specPath, '--kind', 'test', '--report', reportPath, '--', process.execPath, '-e', script],
    { encoding: 'utf8', shell: false, timeout: 15000, windowsHide: true });
    assert.equal(processResult.status, 0, processResult.stderr);
  }
  return { directory, runDir, run: S.readRun(runDir) };
}

function snapshot(directory) {
  const files = {};
  function visit(parent) {
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      const file = path.join(parent, entry.name);
      if (entry.isDirectory()) visit(file);
      else files[path.relative(directory, file)] = { sha256: S.hash(fs.readFileSync(file)), mtime: fs.statSync(file).mtimeMs };
    }
  }
  visit(directory);
  return files;
}

test('audit CLI verifies a synthetic run without changing evidence files', t => {
  const f = fixture(t), before = snapshot(f.runDir), out = path.join(f.directory, 'audit.json');
  const execution = spawnSync(process.execPath, [path.resolve(__dirname, '../audit-run.cjs'), '--run', f.runDir, '--out', out],
    { encoding: 'utf8', shell: false, timeout: 15000, windowsHide: true });
  assert.equal(execution.status, 0, execution.stderr);
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(report.status, 'passed');
  assert.equal(report.counts.failed, 0);
  assert.match(report.scope, /does not prove/i);
  assert.deepEqual(snapshot(f.runDir), before);
});

test('audit detects tampered candidate bytes and content hashes', t => {
  const f = fixture(t), candidate = f.run.candidates[0];
  const saved = path.join(f.runDir, candidate.specPath);
  const spec = JSON.parse(fs.readFileSync(saved, 'utf8'));
  spec.cells[0].token = 'G';
  fs.writeFileSync(saved, JSON.stringify(spec));
  const audit = auditRun(f.runDir);
  assert.equal(audit.status, 'failed');
  assert.ok(audit.checks.some(check => check.name === 'candidate.sha256' && check.status === 'failed'));
  assert.ok(audit.checks.some(check => check.name === 'candidate.cellsSha256' && check.status === 'failed'));
});

test('audit detects duplicate event IDs and broken ordering', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.runDir, 'events.jsonl'), JSON.stringify(f.run.events.at(-1)) + '\n');
  const audit = auditRun(f.runDir);
  assert.equal(audit.status, 'failed');
  assert.ok(audit.checks.some(check => check.name === 'event.id' && check.status === 'failed'));
  assert.ok(audit.checks.some(check => check.name === 'event.sequence' && check.status === 'failed'));
});

test('audit detects falsified exact input bindings and edited report evidence', t => {
  const f = fixture(t), indexPath = path.join(f.runDir, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  index.tests[0].inputSha256 = '0'.repeat(64);
  fs.writeFileSync(indexPath, JSON.stringify(index));
  fs.writeFileSync(path.join(f.runDir, index.tests[0].reportPath), JSON.stringify({ status: 'failed', checks: [] }));
  const audit = auditRun(f.runDir);
  assert.equal(audit.status, 'failed');
  for (const name of ['test.binding', 'test.reportSha256', 'test.passedClaim']) {
    assert.ok(audit.checks.some(check => check.name === name && check.status === 'failed'), name);
  }
});

test('missing historical execution and report evidence remain unknown, not failed', t => {
  const f = fixture(t, true);
  S.addTest(f.runDir, { candidateId: f.run.candidates[0].id, origin: 'historical', at: null,
    status: 'passed', binding: 'historical', label: 'Historical declared success', checks: [],
    reportPath: 'artifacts/unavailable-original-report.json' });
  const audit = auditRun(f.runDir);
  assert.equal(audit.status, 'unknown');
  assert.equal(audit.counts.failed, 0);
  assert.ok(audit.counts.unknown > 0);
  assert.ok(audit.gaps.some(gap => /Historical import/.test(gap)));
});

test('audit rejects overstated fingerprint binding and exposes boundary-only uncertainty', t => {
  const f = fixture(t), indexPath = path.join(f.runDir, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const result = index.tests[0], reportPath = path.join(f.runDir, result.reportPath);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  delete report.inputSha256;
  fs.writeFileSync(reportPath, JSON.stringify(report));
  result.reportSha256 = S.hash(fs.readFileSync(reportPath));
  result.bindingBasis = 'report-fingerprints-and-command-boundaries';
  fs.writeFileSync(indexPath, JSON.stringify(index));
  const overstated = auditRun(f.runDir);
  assert.ok(overstated.checks.some(check => check.name === 'test.bindingBasis' && check.status === 'failed'));
  result.bindingBasis = 'command-boundaries-only';
  fs.writeFileSync(indexPath, JSON.stringify(index));
  const limited = auditRun(f.runDir);
  assert.equal(limited.status, 'unknown');
  assert.equal(limited.counts.failed, 0);
  assert.ok(limited.gaps.some(gap => /actual input consumption/.test(gap)));
});

test('audit refuses output inside the run, including a junction alias', t => {
  const f = fixture(t), before = snapshot(f.runDir);
  assert.throws(() => outputOutsideRun(f.runDir, path.join(f.runDir, 'audit.json')), /outside the run/);
  const link = path.join(f.directory, 'run-alias');
  try { fs.symlinkSync(f.runDir, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (!['EACCES', 'EPERM'].includes(error.code)) throw error;
    t.diagnostic('Junction/symlink creation unavailable; direct output guard verified.');
    assert.deepEqual(snapshot(f.runDir), before);
    return;
  }
  assert.throws(() => outputOutsideRun(f.runDir, path.join(link, 'audit.json')), /inside the run/);
  assert.deepEqual(snapshot(f.runDir), before);
});
