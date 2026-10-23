'use strict';
const fs = require('node:fs'), path = require('node:path'), {spawn} = require('node:child_process');
const {StringDecoder} = require('node:string_decoder');
const S = require('./lib/store.cjs');
const args = process.argv.slice(2), action = args.shift();
const sep = args.indexOf('--'), options = sep < 0 ? args : args.slice(0, sep), command = sep < 0 ? [] : args.slice(sep + 1);
const get = key => {const i = options.indexOf('--' + key); return i < 0 ? undefined : options[i + 1];};
const requireOption = key => {const value = get(key); if (!value) throw new Error('--' + key + ' is required'); return value;};
const output = x => console.log(JSON.stringify(x, null, 2));
function normalizeReport(report) {
  const rows = Array.isArray(report) ? report : report.checks || [];
  const checks = rows.map(r => ({name: r.name || r.check || 'check',
    status: ['passed', 'failed', 'unknown', 'error'].includes(r.verdict) ? r.verdict
      : ['passed', 'failed', 'unknown', 'error'].includes(r.status) ? r.status : 'unknown', detail: r}));
  let status = report.overall || report.verdict || report.status;
  if (status === 'solved') status = report.replayPassed === true || report.replayVerified === true ? 'passed' : 'unknown';
  if (!['passed', 'failed', 'unknown', 'error'].includes(status)) status = 'unknown';
  if (checks.some(c => c.status === 'failed')) status = 'failed';
  else if (status === 'passed' && checks.some(c => c.status === 'unknown' || c.status === 'error')) status = 'unknown';
  return {status, checks, scope: report.scope || 'Report-specific check; no broader mechanism or difficulty claim.'};
}
async function execute(run) {
  if (!command.length) throw new Error('Provide executable and arguments after --');
  const state = S.readRun(run), boundCandidate = get('candidate') && state.candidates.find(c => c.id === get('candidate'));
  if (get('candidate') && !boundCandidate) throw new Error('Bound candidate does not exist');
  const specFile = boundCandidate ? path.join(run, boundCandidate.specPath) : get('spec') || state.manifest.watchSpec;
  const kind = get('kind') || 'command', reportFile = get('report') && path.resolve(get('report'));
  if (kind === 'test' && !reportFile) throw new Error('Tests require a fresh --report path');
  if (reportFile && fs.existsSync(reportFile)) throw new Error('Report already exists. Use a fresh report path; historical evidence cannot be a new test.');
  let before = boundCandidate || null;
  if (!before && specFile && fs.existsSync(specFile)) {
    try {before = S.captureSpec(run, specFile);} catch (error) {
      const artifactPath = S.saveArtifact(run, specFile, 'invalid-candidates');
      S.appendEvent(run, 'capture.gap', {reason: 'Candidate parse failed before command: ' + error.message, artifactPath}, {evidenceRefs: [artifactPath]});
    }
  }
  const cwd = path.resolve(get('cwd') || process.cwd());
  const inputs = command.slice(1).filter(arg => {
    try {return fs.statSync(path.resolve(cwd, arg)).isFile();} catch {return false;}
  }).map(arg => {
    const file = path.resolve(cwd, arg), artifactPath = S.saveArtifact(run, file, 'command-inputs');
    return {path: file, sha256: S.hash(fs.readFileSync(path.join(run, artifactPath))), artifactPath};
  });
  const start = S.appendEvent(run, 'command.started', {command, cwd, kind, label: get('label') || command[0],
    inputSha256: before?.sha256 || null, reportFile: reportFile || null, inputs},
    {candidateId: before?.id, evidenceRefs: inputs.map(i => i.artifactPath)});
  const stdoutPath = `commands/${start.id}.stdout.log`, stderrPath = `commands/${start.id}.stderr.log`;
  const stdout = fs.openSync(path.join(run, stdoutPath), 'wx'), stderr = fs.openSync(path.join(run, stderrPath), 'wx');
  let result, rawBuffer = '', rawSeq = 0;
  const decoder = new StringDecoder('utf8');
  const rawPath = `commands/${start.id}.codex.jsonl`;
  if (kind === 'codex') fs.writeFileSync(path.join(run, rawPath), '', {flag: 'wx'});
  const parseCodex = chunk => {
    rawBuffer += chunk;
    let newline;
    while ((newline = rawBuffer.indexOf('\n')) >= 0) {
      const line = rawBuffer.slice(0, newline); rawBuffer = rawBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      try { const event = JSON.parse(line); S.appendEvent(run, 'codex.' + (event.type || 'event'), {rawSeq: ++rawSeq, event}, {actor: 'codex', evidenceRefs: [rawPath]}); }
      catch { S.appendEvent(run, 'capture.gap', {reason: 'Invalid Codex JSONL line', rawSeq: ++rawSeq}, {evidenceRefs: [rawPath]}); }
    }
  };
  const started = Date.now();
  try {
    result = await new Promise(resolve => {
      const child = spawn(command[0], command.slice(1), {cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
      let error;
      child.on('error', e => {error = e.message;});
      child.stdout.on('data', chunk => {
        fs.writeSync(stdout, chunk); if (!options.includes('--silent-stream')) process.stdout.write(chunk);
        if (kind === 'codex') {fs.appendFileSync(path.join(run, rawPath), chunk); parseCodex(decoder.write(chunk));}
      });
      child.stderr.on('data', chunk => {fs.writeSync(stderr, chunk); if (!options.includes('--silent-stream')) process.stderr.write(chunk);});
      child.on('close', (code, signal) => resolve({code: code ?? 1, signal, error}));
    });
  } finally {fs.closeSync(stdout); fs.closeSync(stderr);}
  if (kind === 'codex') {parseCodex(decoder.end()); if (rawBuffer.trim()) parseCodex('\n');}
  let after = before;
  if (!boundCandidate && specFile && fs.existsSync(specFile)) {
    try {after = S.captureSpec(run, specFile, {commandEventId: start.id});} catch (e) {
      S.appendEvent(run, 'capture.gap', {reason: 'Candidate parse failed: ' + e.message,
        artifactPath: S.saveArtifact(run, specFile, 'invalid-candidates')});
    }
  }
  S.appendEvent(run, 'command.completed', {commandEventId: start.id, ...result, durationMs: Date.now() - started,
    stdoutPath, stderrPath}, {candidateId: after?.id, evidenceRefs: [stdoutPath, stderrPath]});
  if (kind === 'codex') require('./lib/token-usage.cjs').writeReport(run, S.readRun(run));
  if (kind === 'test') {
    let report, reportPath, data = {status: 'error', checks: [], scope: 'No readable report was generated.'};
    let binding = before ? 'exact' : 'missing', reason;
    try {
      reportPath = S.saveArtifact(run, reportFile, 'reports');
      report = JSON.parse(fs.readFileSync(path.join(run, reportPath), 'utf8').replace(/^\uFEFF/, ''));
      data = normalizeReport(report);
    } catch (e) {reason = e.message;}
    if (before && (before.sha256 !== after?.sha256 || !fs.existsSync(specFile) || S.hash(fs.readFileSync(specFile)) !== before.sha256)) {
      binding = 'mismatch'; reason = 'Candidate changed during validation.';
    }
    if (before && report && ((report.inputSha256 && report.inputSha256 !== before.sha256)
      || (report.fingerprints?.cells && report.fingerprints.cells !== before.cellsSha256)
      || (report.fingerprints?.contract && report.fingerprints.contract !== before.contractSha256))) {
      binding = 'mismatch'; reason = 'Report fingerprints do not match the tested candidate.';
    }
    if (get('binding-mismatch')) {binding = 'mismatch'; reason = get('binding-mismatch');}
    if (result.code !== 0 && data.status === 'passed') {data.status = 'error'; reason = 'Process failed despite a passing report.';}
    S.addTest(run, {...data, label: get('label') || path.basename(reportFile), candidateId: before?.id || null,
      inputSha256: before?.sha256, inputCellsSha256: before?.cellsSha256, inputContractSha256: before?.contractSha256,
      processExitCode: result.code, commandEventId: start.id, binding, reason, reportPath, stdoutPath, stderrPath,
      bindingBasis: report?.fingerprints?.cells || report?.inputSha256 ? 'report-fingerprints-and-command-boundaries' : 'command-boundaries-only',
      reportSha256: reportPath ? S.hash(fs.readFileSync(path.join(run, reportPath))) : null});
  }
  process.exitCode = result.code;
  return {commandEventId: start.id, ...result, candidateId: after?.id};
}
async function main() {
  if (action === 'init') return output({run: S.createRun({root: requireOption('root'), id: requireOption('id'), title: get('title'),
    task: get('task'), watchSpec: get('spec'), configuration: get('config') ? JSON.parse(fs.readFileSync(get('config'), 'utf8')) : {},
    limitations: ['Only recorder-mediated commands and named resource reads are observed. Saved candidates are captured at command boundaries; transient in-memory layouts are not captured.']})});
  if (action === 'help' || !action) return console.log('Commands: init, read, note, exec, snapshot, artifact, finish, inspect. See README.md.');
  const run = path.resolve(requireOption('run'));
  require('./lib/session-usage.cjs').refresh(run);
  if (action === 'read') {
    const r = S.recordResource(run, path.resolve(requireOption('file')), {kind: get('kind')});
    process.stdout.write(fs.readFileSync(path.join(run, r.artifactPath))); return;
  }
  if (action === 'snapshot') return output(S.captureSpec(run, path.resolve(requireOption('file')), {label: get('label')}));
  if (action === 'note') return output(S.recordNote(run, JSON.parse(fs.readFileSync(requireOption('json'), 'utf8').replace(/^\uFEFF/, ''))));
  if (action === 'exec') {const result = await execute(run); if (!options.includes('--quiet')) output(result); return;}
  if (action === 'artifact') {
    const artifactPath = S.saveArtifact(run, requireOption('file'), get('kind') || 'evidence');
    return output(S.appendEvent(run, 'artifact.saved', {kind: get('kind'), artifactPath},
      {candidateId: get('candidate') || S.readRun(run).candidates.at(-1)?.id, evidenceRefs: [artifactPath]}));
  }
  if (action === 'finish') {
    S.appendEvent(run, 'run.finished', {status: get('status') || 'complete'});
    const manifest = S.updateManifest(run, {status: get('status') || 'complete', finishedAt: new Date().toISOString()});
    require('./lib/session-usage.cjs').refresh(run, {finish: true});
    return output(manifest);
  }
  if (action === 'inspect') return output(S.readRun(run));
  throw new Error('Unknown command ' + action);
}
if (require.main === module) main().catch(e => {console.error(e.stack); process.exitCode = 1;});
module.exports = {normalizeReport};
