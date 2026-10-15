'use strict';

// Read-only evidence audit. It deliberately does not use the recorder's mutation APIs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const digest = value => crypto.createHash('sha256')
  .update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const parseJson = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const contained = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};

function auditRun(runDirectory) {
  const runDir = path.resolve(runDirectory);
  const realRun = fs.realpathSync(runDir);
  const checks = [], gapSet = new Set(), references = new Map(), bytesCache = new Map();
  let manifest = {}, index = {}, historical = false;
  const check = (name, status, detail) => {
    checks.push({ name, status, detail });
    if (status === 'unknown') gapSet.add(detail);
    return status;
  };
  const absent = () => historical ? 'unknown' : 'failed';
  function savedFile(relative) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) {
      throw Object.assign(new Error('Saved evidence path must be run-relative.'), { code: 'AUDIT_ESCAPE' });
    }
    const lexical = path.resolve(runDir, relative);
    if (!contained(runDir, lexical)) {
      throw Object.assign(new Error('Saved evidence path escapes the run.'), { code: 'AUDIT_ESCAPE' });
    }
    const real = fs.realpathSync(lexical);
    if (!contained(realRun, real) || !fs.statSync(real).isFile()) {
      throw Object.assign(new Error('Saved evidence does not resolve to a file inside the run.'), { code: 'AUDIT_ESCAPE' });
    }
    return real;
  }
  function load(relative, owner) {
    if (bytesCache.has(relative)) return bytesCache.get(relative);
    references.set(relative, owner);
    try {
      const bytes = fs.readFileSync(savedFile(relative));
      bytesCache.set(relative, bytes);
      check('artifact.exists', 'passed', `${owner}: ${relative}`);
      return bytes;
    } catch (error) {
      check('artifact.exists', error.code === 'AUDIT_ESCAPE' ? 'failed' : absent(), `${owner}: ${relative}: ${error.message}`);
      bytesCache.set(relative, null);
      return null;
    }
  }
  function loadJson(relative, owner) {
    const bytes = load(relative, owner);
    if (!bytes) return null;
    try { return parseJson(bytes); }
    catch (error) {
      check('artifact.json', 'failed', `${owner}: ${relative}: ${error.message}`);
      return null;
    }
  }
  function verifyHash(name, expected, bytes, detail) {
    if (!bytes) return;
    if (typeof expected !== 'string' || !expected) return check(name, 'unknown', `${detail}: recorded hash is unavailable.`);
    check(name, digest(bytes) === expected ? 'passed' : 'failed', `${detail}: recorded SHA-256 ${expected}; actual ${digest(bytes)}.`);
  }
  function same(name, left, right, detail) {
    check(name, left === right ? 'passed' : 'failed', detail);
  }

  manifest = loadJson('manifest.json', 'run manifest') || {};
  historical = manifest.mode === 'historical';
  for (const limitation of manifest.limitations || []) gapSet.add(String(limitation));
  index = loadJson('index.json', 'run index') || {};
  const candidates = Array.isArray(index.candidates) ? index.candidates : [];
  const tests = Array.isArray(index.tests) ? index.tests : [];
  const resources = Array.isArray(index.resources) ? index.resources : [];
  const events = [];
  const journal = load('events.jsonl', 'event journal');
  if (journal) {
    journal.toString('utf8').split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line);
        if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Event must be an object.');
        events.push(event);
      } catch (error) {
        check('event.json', absent(), `Event journal line ${i + 1} cannot be parsed: ${error.message}`);
      }
    });
  }
  const ids = new Set(), sequences = new Set();
  let previous = 0;
  for (const event of events) {
    const validId = typeof event.id === 'string' && event.id.length > 0 && !ids.has(event.id);
    check('event.id', validId ? 'passed' : 'failed', `Event ${event.id || '(missing id)'} must have a unique nonempty ID.`);
    check('event.sequence', Number.isInteger(event.seq) && event.seq === previous + 1 && !sequences.has(event.seq)
      ? 'passed' : 'failed', `Event ${event.id}: seq=${event.seq}, expected=${previous + 1}.`);
    ids.add(event.id); sequences.add(event.seq); previous = event.seq;
    if (event.origin === 'historical') same('historical.time', event.at, null, `Historical event ${event.id} must keep occurrence time null.`);
    for (const ref of event.evidenceRefs || []) load(ref, `event ${event.id}`);
    for (const key of ['artifactPath', 'stdoutPath', 'stderrPath', 'reportPath']) {
      if (event.details?.[key]) load(event.details[key], `event ${event.id}`);
    }
    for (const input of event.details?.inputs || []) {
      if (input.artifactPath) verifyHash('command.inputHash', input.sha256, load(input.artifactPath, `command input ${event.id}`), `Command ${event.id} input ${input.path || input.artifactPath}`);
    }
    if (event.type === 'capture.gap') {
      check('capture.gap', 'unknown', `Recorder gap at ${event.id}: ${event.details?.reason || 'unspecified'}`);
    }
  }
  same('index.sequence', index.nextSeq, previous + 1, `Index nextSeq=${index.nextSeq}; journal expects ${previous + 1}.`);

  const starts = new Map(events.filter(event => event.type === 'command.started').map(event => [event.id, event]));
  const finishes = new Map();
  for (const event of events.filter(item => item.type === 'command.completed')) {
    const startId = event.details?.commandEventId;
    const start = starts.get(startId);
    check('command.completed', start && event.seq > start.seq && !finishes.has(startId) ? 'passed' : 'failed',
      `Completion ${event.id} must follow one unique command start ${startId || '(missing)'}.`);
    finishes.set(startId, event);
  }
  for (const [id] of starts) {
    if (!finishes.has(id)) check('command.pair', historical || manifest.status === 'running' ? 'unknown' : 'failed', `Command ${id} has no completion event.`);
    else check('command.pair', 'passed', `Command ${id} has one completion.`);
  }
  if (!starts.size) check('execution.provenance', 'unknown', historical
    ? 'Historical import contains no observed child execution; actual execution order and original times remain unknown.'
    : 'No child execution was recorded; this audit cannot establish a tested production process.');

  const candidateById = new Map();
  for (const candidate of candidates) {
    check('candidate.id', candidate.id && !candidateById.has(candidate.id) ? 'passed' : 'failed', `Candidate ${candidate.id} must have a unique ID.`);
    candidateById.set(candidate.id, candidate);
    if (candidate.origin === 'historical') same('historical.time', candidate.createdAt, null, `Historical candidate ${candidate.id} must keep creation time null.`);
    const bytes = load(candidate.specPath, `candidate ${candidate.id}`);
    verifyHash('candidate.sha256', candidate.sha256, bytes, `Candidate ${candidate.id} bytes`);
    if (!bytes) continue;
    let spec;
    try { spec = parseJson(bytes); }
    catch (error) { check('candidate.json', 'failed', `Candidate ${candidate.id}: ${error.message}`); continue; }
    if (!Array.isArray(spec?.cells)) {
      check('candidate.cells', 'failed', `Candidate ${candidate.id} has no supported cells array.`);
      continue;
    }
    verifyHash('candidate.cellsSha256', candidate.cellsSha256, JSON.stringify(spec.cells), `Candidate ${candidate.id} cells`);
    verifyHash('candidate.contractSha256', candidate.contractSha256, JSON.stringify(spec.contract || {}), `Candidate ${candidate.id} contract`);
  }
  for (const candidate of candidates) {
    if (candidate.parentId) check('candidate.parent', candidateById.has(candidate.parentId) && candidate.parentId !== candidate.id ? 'passed' : 'failed',
      `Candidate ${candidate.id} parent ${candidate.parentId} must refer to another saved candidate.`);
  }
  for (const resource of resources) {
    const bytes = load(resource.artifactPath, `resource ${resource.id}`);
    verifyHash('resource.sha256', resource.sha256, bytes, `Resource ${resource.id}`);
    if (resource.origin === 'historical') same('historical.time', resource.at, null, `Historical resource ${resource.id} must keep occurrence time null.`);
  }
  for (const note of index.notes || []) {
    if (note.origin === 'historical') same('historical.time', note.at, null, `Historical note ${note.id} must keep occurrence time null.`);
  }

  for (const result of tests) {
    const isHistorical = result.origin === 'historical' || historical;
    const candidate = candidateById.get(result.candidateId);
    const start = starts.get(result.commandEventId), finish = finishes.get(result.commandEventId);
    if (isHistorical) same('historical.time', result.at, null, `Historical test ${result.id} must keep occurrence time null.`);
    if (result.candidateId && !candidate) check('test.candidate', isHistorical ? 'unknown' : 'failed', `Test ${result.id} references unavailable candidate ${result.candidateId}.`);
    if (result.binding === 'exact') {
      check('test.binding', candidate && result.inputSha256 === candidate.sha256 ? 'passed' : 'failed',
        `Exact test ${result.id} must match the saved candidate's full input hash.`);
      for (const [testField, candidateField] of [['inputCellsSha256', 'cellsSha256'], ['inputContractSha256', 'contractSha256']]) {
        if (result[testField]) same(`test.${testField}`, result[testField], candidate?.[candidateField], `Test ${result.id} ${testField} must match candidate ${result.candidateId}.`);
      }
    } else if (result.binding === 'mismatch' || result.binding === 'missing') {
      check('test.binding', result.status === 'passed' ? 'failed' : 'passed', `Test ${result.id} with binding ${result.binding} must not claim passed.`);
      gapSet.add(`Test ${result.id} is not bound exactly to a candidate (${result.binding}).`);
    } else {
      check('test.binding', 'unknown', `Test ${result.id} has ${result.binding || 'unspecified'} binding; exact execution input is not established.`);
    }
    if (result.commandEventId) {
      check('test.command', start && finish ? 'passed' : isHistorical ? 'unknown' : 'failed', `Test ${result.id} must link to captured command ${result.commandEventId}.`);
      if (finish && result.processExitCode !== undefined) same('test.exitCode', result.processExitCode, finish.details?.code, `Test ${result.id} process exit code must equal its completion event.`);
      if (start && result.binding === 'exact') {
        same('test.commandInput', start.details?.inputSha256, result.inputSha256, `Test ${result.id} exact input must equal the command start hash.`);
        same('test.commandCandidate', start.candidateId, result.candidateId, `Test ${result.id} must bind to the candidate at command start.`);
      }
    } else check('test.command', isHistorical ? 'unknown' : result.status === 'passed' ? 'failed' : 'unknown', `Test ${result.id} has no observed command linkage.`);
    for (const key of ['stdoutPath', 'stderrPath']) if (result[key]) load(result[key], `test ${result.id} ${key}`);
    let report;
    if (result.reportPath) {
      const bytes = load(result.reportPath, `test ${result.id} report`);
      verifyHash('test.reportSha256', result.reportSha256, bytes, `Test ${result.id} report`);
      if (bytes) {
        try { report = parseJson(bytes); }
        catch { check('test.reportJson', result.status === 'passed' ? 'failed' : 'unknown', `Test ${result.id} report is not readable JSON.`); }
      }
    } else check('test.report', result.status === 'passed' && !isHistorical ? 'failed' : 'unknown', `Test ${result.id} has no saved report.`);
    if (candidate && report && result.binding === 'exact') {
      for (const [claimed, actual, label] of [[report.inputSha256, candidate.sha256, 'inputSha256'],
        [report.fingerprints?.cells, candidate.cellsSha256, 'fingerprints.cells'],
        [report.fingerprints?.contract, candidate.contractSha256, 'fingerprints.contract']]) {
        if (claimed) same('test.reportInput', claimed, actual, `Report for exact test ${result.id} ${label} must match its candidate.`);
      }
      if (result.bindingBasis === 'report-fingerprints-and-command-boundaries') {
        check('test.bindingBasis', report.inputSha256 === candidate.sha256 || report.fingerprints?.cells === candidate.cellsSha256
          ? 'passed' : 'failed', `Test ${result.id} claims report fingerprints; its saved report must actually identify the full input or cells.`);
      } else if (result.bindingBasis === 'command-boundaries-only') {
        check('test.bindingBasis', 'unknown', `Test ${result.id} is associated by command-boundary hashes only; its report does not independently identify its map input, and actual input consumption was not observed.`);
      } else {
        check('test.bindingBasis', 'unknown', `Test ${result.id} has no recognized bindingBasis; the basis for its exact association is unspecified.`);
      }
    }
    if (result.status === 'passed' && !isHistorical) {
      check('test.passedEvidence', result.binding === 'exact' && candidate && result.inputSha256 === candidate.sha256 &&
        result.processExitCode === 0 && start && finish && report && result.reportSha256 ? 'passed' : 'failed',
      `Observed passed test ${result.id} requires exact input, a saved hashed report, and an observed successful process.`);
      const reportStatus = report && (report.overall || report.verdict || report.status);
      const rows = Array.isArray(report) ? report : Array.isArray(report?.checks) ? report.checks : [];
      const negative = rows.some(row => ['failed', 'error', 'unknown'].includes(row.verdict || row.status));
      const declaresPassed = reportStatus === 'passed' || (reportStatus === 'solved' && (report.replayPassed === true || report.replayVerified === true));
      check('test.passedClaim', declaresPassed && !negative ? 'passed' : 'failed', `Observed passed test ${result.id} must be supported by its report's own declared scope and checks.`);
    }
  }

  const counts = { events: events.length, candidates: candidates.length, tests: tests.length, resources: resources.length,
    notes: Array.isArray(index.notes) ? index.notes.length : 0, commands: starts.size, artifacts: references.size,
    passed: checks.filter(item => item.status === 'passed').length,
    failed: checks.filter(item => item.status === 'failed').length,
    unknown: checks.filter(item => item.status === 'unknown').length };
  return { schemaVersion: 1, runId: manifest.id || null, mode: manifest.mode || 'unknown', auditedAt: new Date().toISOString(),
    scope: 'Evidence consistency only. This does not prove complete capture, actual model execution, resource comprehension, maze solvability, or mechanism necessity.',
    status: counts.failed ? 'failed' : counts.unknown ? 'unknown' : 'passed', checks, gaps: [...gapSet], counts };
}

function outputOutsideRun(runDirectory, outputFile) {
  const runDir = path.resolve(runDirectory), outputPath = path.resolve(outputFile);
  if (contained(runDir, outputPath)) throw new Error('--out must be outside the run; auditing must not modify its evidence.');
  let ancestor = outputPath;
  const missing = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error('Cannot resolve output path.');
    missing.unshift(path.basename(ancestor)); ancestor = parent;
  }
  const physicalOutput = path.resolve(fs.realpathSync(ancestor), ...missing);
  if (contained(fs.realpathSync(runDir), physicalOutput)) throw new Error('--out resolves inside the run.');
  return outputPath;
}

function main(args = process.argv.slice(2)) {
  const get = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
  const run = get('--run'), out = get('--out');
  if (!run || !out) throw new Error('Usage: node audit-run.cjs --run RUN_DIRECTORY --out FRESH_REPORT_OUTSIDE_RUN');
  const destination = outputOutsideRun(run, out);
  const report = auditRun(run);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: report.status, out: destination, counts: report.counts }));
  process.exitCode = report.status === 'failed' ? 1 : 0;
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { auditRun, outputOutsideRun, main };
