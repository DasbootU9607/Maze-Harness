'use strict';

// Skill-facing adapter. The engine helpers retain their original arguments and outputs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const S = require('./lib/store.cjs');
const MARKER = 'authoring-session.json';
const lockWait = new Int32Array(new SharedArrayBuffer(4));
const parse = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const option = (args, key) => {const i = args.indexOf('--' + key); return i < 0 ? undefined : args[i + 1];};
const absolute = (cwd, file) => file ? path.resolve(cwd, file) : null;
const limitations = [
  'Automatic CLI boundaries record supported build and verification commands. Other commands and resource reads require the skill observer helper.',
  'Snapshots describe saved versions at operation boundaries, not every editor keystroke. Design notes are author statements, not internal reasoning.',
  'A started task remains running until the author records finish. An interrupted task may therefore remain open.'
];

function withSessionLock(directory, action) {
  fs.mkdirSync(directory, {recursive: true});
  const lock = path.join(directory, '.authoring-session-lock');
  const deadline = Date.now() + 15000;
  while (true) {
    try {fs.mkdirSync(lock); break;}
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() > deadline) throw new Error('Authoring session is locked; inspect active recorders before removing a stale lock: ' + lock);
      Atomics.wait(lockWait, 0, 0, 25);
    }
  }
  try {return action();} finally {fs.rmdirSync(lock);}
}

function writeMarkerUnlocked(directory, runDir, spec, build) {
  const file = path.join(directory, MARKER);
  const old = fs.existsSync(file) ? parse(file) : {};
  const specPath = path.relative(directory, spec);
  const value = {schemaVersion: 1, runDir: path.relative(directory, runDir), specPath, ...(build ? {build} : {}),
    sessions: {...old.sessions, [specPath]: path.relative(directory, runDir)}};
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n'); fs.renameSync(temp, file);
}

function writeMarker(directory, runDir, spec, build) {
  return withSessionLock(directory, () => writeMarkerUnlocked(directory, runDir, spec, build));
}

function readMarker(directory, spec) {
  const file = path.join(directory, MARKER);
  if (!fs.existsSync(file)) return null;
  const marker = parse(file);
  if (marker.schemaVersion !== 1) throw new Error('Unsupported authoring session marker: ' + file);
  const selectedSpec = spec || absolute(directory, marker.specPath);
  const key = selectedSpec && path.relative(directory, selectedSpec);
  const relativeRun = marker.sessions?.[key] || (absolute(directory, marker.specPath) === selectedSpec ? marker.runDir : null);
  return relativeRun ? {runDir: absolute(directory, relativeRun), spec: selectedSpec, build: marker.build} : null;
}

function startViewer(config = {}) {
  if (config.viewer === false || process.env.MAZEBENCH_OBSERVER_NO_VIEWER === '1') return null;
  const result = spawnSync(config.python || 'python', [path.join(__dirname, 'start-local.py'), '--root',
    path.resolve(config.runsRoot || path.join(__dirname, 'runs'))], {encoding: 'utf8', windowsHide: true});
  if (result.error || result.status !== 0) throw new Error('Cannot start local authoring viewer: ' + (result.error?.message || result.stderr));
  return result.stdout.trim();
}

function session({skillRoot, spec, cwd = process.cwd(), config = {}, fresh = false, title, task}) {
  if (!spec) throw new Error('Authoring recording requires --spec (or a build directory with authoring-session.json).');
  spec = path.resolve(cwd, spec);
  const runDir = withSessionLock(path.dirname(spec), () => {
    let existing = fresh ? null : readMarker(path.dirname(spec), spec);
    if (existing) {
      const record = S.readRun(existing.runDir);
      if (record.manifest.watchSpec !== spec) throw new Error('Session marker points to another spec. Start a fresh task.');
      if (!['running', 'active'].includes(record.manifest.status)) existing = null;
    }
    let selectedRun = existing?.runDir;
    if (!selectedRun) {
      let specTitle;
      try {specTitle = parse(spec).title;} catch { /* The recorder captures malformed input when the original command runs. */ }
      const id = 'auto-' + new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 17) + '-' + crypto.randomBytes(3).toString('hex');
      selectedRun = S.createRun({root: config.runsRoot || path.join(__dirname, 'runs'), id,
        title: title || specTitle || path.basename(skillRoot || 'Authoring task'),
        task: task || 'Skill authoring session', watchSpec: spec, limitations,
        configuration: {skill: skillRoot ? path.basename(skillRoot) : null, integration: 'automatic-skill-cli'}});
      writeMarkerUnlocked(path.dirname(spec), selectedRun, spec);
      S.appendEvent(selectedRun, 'collector.started', {mode: 'automatic-skill-cli'});
      require('./lib/session-usage.cjs').begin(selectedRun, {binding: config.usageBinding});
    }
    if (skillRoot) {
      const entrypoint = path.join(skillRoot, 'SKILL.md');
      const state = S.readRun(selectedRun);
      if (fs.existsSync(entrypoint)) {
        const skillHash = S.hash(fs.readFileSync(entrypoint));
        if (!state.events.some(e => e.type === 'skill.attached' && e.details.skill === path.basename(skillRoot) && e.details.sha256 === skillHash)) {
          // A dependency snapshot is not a claim that the agent has read it.
          const artifactPath = S.saveArtifact(selectedRun, entrypoint, 'skill-dependencies');
          S.appendEvent(selectedRun, 'skill.attached', {skill: path.basename(skillRoot), sha256: skillHash, artifactPath}, {evidenceRefs: [artifactPath]});
        }
      }
    }
    return selectedRun;
  });
  const url = startViewer(config);
  if (url) process.stderr.write('[authoring-observer] ' + url + '/?run=' + path.basename(runDir) + '\n');
  return {runDir, spec, url};
}

function executeRecorded(runDir, args, {cwd = process.cwd(), automatic = false} = {}) {
  const child = spawnSync(process.execPath, [path.join(__dirname, 'cli.cjs'), ...args, '--run', runDir], {
    cwd, windowsHide: true, stdio: 'inherit', env: {...process.env, ...(automatic ? {MAZEBENCH_OBSERVER_CHILD: '1'} : {})}
  });
  if (child.error) throw child.error;
  return child.status ?? 1;
}

function recorderCommand(runDir, args, command, cwd) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'cli.cjs'), 'exec', '--run', runDir, ...args, '--', ...command], {
    cwd, windowsHide: true, stdio: 'inherit', env: {...process.env, MAZEBENCH_OBSERVER_CHILD: '1'}
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function buildEvidence(out, repo, runDir, candidateId) {
  const files = ['manifest.json', 'world.json', 'contract.json', 'spec.json'].map(name => path.join(out, name)).filter(file => fs.existsSync(file));
  const manifest = path.join(out, 'manifest.json');
  if (repo && fs.existsSync(manifest)) {
    const id = parse(manifest).id;
    if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
      const draft = path.join(repo, 'games', id);
      const collect = dir => {for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const file = path.join(dir, e.name);
        if (e.isDirectory()) collect(file); else if (/\.(txt|json)$/.test(e.name)) files.push(file);
      }};
      if (fs.existsSync(draft)) collect(draft);
    }
  }
  const entries = files.map(file => ({path: path.relative(out, file), sha256: S.hash(fs.readFileSync(file)), artifactPath: S.saveArtifact(runDir, file, 'build-inputs')}));
  S.appendEvent(runDir, 'build.saved', {candidateId, files: entries}, {candidateId, evidenceRefs: entries.map(f => f.artifactPath)});
  return {candidateId, files: entries};
}

function runAutomatic({skillRoot, script, argv, cwd = process.cwd(), kind, config = {}}) {
  if (process.env.MAZEBENCH_OBSERVER_CHILD === '1') return {handled: false};
  const out = absolute(cwd, option(argv, 'out'));
  const explicitSpec = absolute(cwd, option(argv, 'spec'));
  const built = !explicitSpec && out ? readMarker(out) : null;
  const spec = explicitSpec || built?.spec;
  const current = session({skillRoot, spec, cwd, config});
  let candidate = null, mismatch = null;
  if (built && kind === 'test') {
    if (built.runDir !== current.runDir || !built.build?.candidateId) mismatch = 'Build has no candidate binding in this session.';
    else {
      candidate = built.build.candidateId;
      if (!built.build.files?.length || built.build.files.some(f => {
        try {return S.hash(fs.readFileSync(path.resolve(out, f.path))) !== f.sha256;} catch {return true;}
      })) mismatch = 'Saved build inputs changed or disappeared after the build.';
    }
  }
  let report = null, previous = null;
  if (kind === 'test') {
    if (!out) throw new Error('Automatic verification capture requires the helper --out argument.');
    report = path.resolve(out, option(argv, 'report') || 'verification.json');
    if (fs.existsSync(report)) {
      previous = fs.readFileSync(report);
      const artifactPath = S.saveArtifact(current.runDir, report, 'previous-reports');
      S.appendEvent(current.runDir, 'report.previous', {artifactPath, note: 'Archived before this invocation; not a fresh test result.'}, {evidenceRefs: [artifactPath]});
      // The normal helper replaces this report. Remove the old pathname so it cannot be mistaken for fresh evidence.
      fs.unlinkSync(report);
    }
  }
  let exitCode;
  try {
    exitCode = recorderCommand(current.runDir, ['--quiet', '--spec', current.spec, '--kind', kind === 'test' ? 'test' : 'build',
      '--label', path.basename(script), '--cwd', cwd, ...(report ? ['--report', report] : []),
      ...(candidate ? ['--candidate', candidate] : []), ...(mismatch ? ['--binding-mismatch', mismatch] : [])],
    [process.execPath, script, ...argv], cwd);
  } finally {
    if (previous && !fs.existsSync(report)) fs.writeFileSync(report, previous, {flag: 'wx'});
  }
  if (kind === 'build' && exitCode === 0 && out && fs.existsSync(out)) {
    const state = S.readRun(current.runDir);
    writeMarker(out, current.runDir, current.spec, buildEvidence(out, absolute(cwd, option(argv, 'repo')), current.runDir, state.candidates.at(-1)?.id));
  }
  return {handled: true, exitCode, runDir: current.runDir};
}

function main({skillRoot, argv, cwd = process.cwd(), config = {}}) {
  const [action, ...args] = argv;
  const separator = args.indexOf('--');
  const options = separator < 0 ? args : args.slice(0, separator);
  const command = separator < 0 ? [] : args.slice(separator + 1);
  const spec = absolute(cwd, option(options, 'spec'));
  if (!action || action === 'help') {
    console.log('Skill observer: run --spec NEW_FILE --request TASK_JSON; start --spec FILE [--title TEXT]; read/note/exec/snapshot/artifact/finish --spec FILE. The agent invokes these automatically in its current session; no model is launched.');
    return {handled: true, exitCode: 0};
  }
  if (action === 'run') {
    if (!spec) throw new Error('Managed authoring requires --spec NEW_FILE.');
    return require('./lib/managed-authoring.cjs').run({skillRoot, spec, cwd, config,
      requestFile: absolute(cwd, option(options, 'request')), createSession: session});
  }
  const current = session({skillRoot, spec, cwd, config, fresh: action === 'start',
    title: option(options, 'title'), task: option(options, 'task')});
  if (action === 'start') {
    console.log(JSON.stringify({runDir: current.runDir, spec: current.spec, viewer: current.url}, null, 2));
    return {handled: true, exitCode: 0};
  }
  if (action === 'exec') return {handled: true, exitCode: recorderCommand(current.runDir, options, command, cwd)};
  if (!['read', 'note', 'snapshot', 'artifact', 'finish', 'inspect'].includes(action)) throw new Error('Unknown observer action: ' + action);
  const forwarded = options.filter((value, i) => value !== '--spec' && options[i - 1] !== '--spec');
  if (action === 'snapshot' && !option(forwarded, 'file')) forwarded.push('--file', current.spec);
  return {handled: true, exitCode: executeRecorded(current.runDir, [action, ...forwarded], {cwd})};
}

module.exports = {runAutomatic, main, session, readMarker, writeMarker, MARKER};
