'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
const now = () => new Date().toISOString();
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function atomic(file, value) {
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temp, file);
}
function withLock(dir, fn) {
  const lock = path.join(dir, '.write-lock');
  const deadline = Date.now() + 10000;
  while (true) {
    try { fs.mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST' || Date.now() > deadline) throw new Error('Run is locked; inspect the recorder before removing .write-lock');
      Atomics.wait(sleepBuffer, 0, 0, 25);
    }
  }
  try { return fn(); } finally { fs.rmdirSync(lock); }
}
function mutate(dir, fn) {
  return withLock(dir, () => {
    const index = json(path.join(dir, 'index.json'));
    const manifest = json(path.join(dir, 'manifest.json'));
    const emit = (type, details, opts = {}) => {
      const seq = index.nextSeq++;
      const origin = opts.origin || (manifest.mode === 'historical' ? 'historical' : 'observed');
      const event = {id: 'e' + String(seq).padStart(6, '0'), seq, runId: manifest.id,
        at: origin === 'historical' ? null : (opts.at === undefined ? now() : opts.at), recordedAt: now(),
        type, actor: opts.actor || 'recorder', origin, candidateId: opts.candidateId || null,
        details, evidenceRefs: opts.evidenceRefs || []};
      fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(event) + '\n');
      return event;
    };
    const result = fn(index, emit, manifest);
    atomic(path.join(dir, 'index.json'), index);
    return result;
  });
}
function createRun({root, id, title, task = '', mode = 'observed', configuration = {}, limitations = [], watchSpec}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(id)) throw new Error('Invalid run id');
  if (!['observed', 'historical'].includes(mode)) throw new Error('Invalid run mode');
  fs.mkdirSync(path.resolve(root), {recursive: true});
  const dir = path.resolve(root, id);
  fs.mkdirSync(dir); // Existing runs must never be overwritten.
  for (const sub of ['artifacts', 'candidates', 'commands']) fs.mkdirSync(path.join(dir, sub));
  atomic(path.join(dir, 'manifest.json'), {schemaVersion: 1, id, title: title || id, task, mode,
    status: mode === 'historical' ? 'importing' : 'running', createdAt: now(), configuration, limitations,
    ...(watchSpec ? {watchSpec: path.resolve(watchSpec)} : {})});
  atomic(path.join(dir, 'index.json'), {nextSeq: 1, candidates: [], tests: [], resources: [], notes: []});
  fs.writeFileSync(path.join(dir, 'events.jsonl'), '');
  appendEvent(dir, 'run.created', {task, mode, configuration});
  return dir;
}
function appendEvent(dir, type, details, opts) { return mutate(dir, (index, emit) => emit(type, details, opts)); }
function saveArtifact(dir, file, category = 'evidence') {
  if (!/^[\w-]+$/.test(category)) throw new Error('Invalid artifact category');
  const bytes = fs.readFileSync(file);
  const basename = path.basename(file).replace(/[^a-zA-Z0-9._-]/g, '_');
  const relative = `artifacts/${category}/${hash(bytes)}-${basename}`;
  const destination = path.join(dir, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  try { fs.writeFileSync(destination, bytes, {flag: 'wx'}); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  return relative;
}
function cellsMap(cells) {
  const map = new Map();
  if (!Array.isArray(cells)) return map;
  if (cells.length && Array.isArray(cells[0])) {
    cells.forEach((row, y) => row.forEach((token, x) => map.set(`${x},${y},0`, {x, y, z: 0, token})));
  } else cells.forEach(c => map.set(`${c.x},${c.y},${c.z || 0}`, {...c, z: c.z || 0, token: c.token ?? c.value}));
  return map;
}
function cellDiff(before, after) {
  const a = cellsMap(before), b = cellsMap(after), diff = {added: [], removed: [], changed: []};
  for (const [key, c] of b) {
    if (!a.has(key)) diff.added.push({...c, after: c.token});
    else if (JSON.stringify(a.get(key).token) !== JSON.stringify(c.token)) diff.changed.push({...c, before: a.get(key).token, after: c.token});
  }
  for (const [key, c] of a) if (!b.has(key)) diff.removed.push({...c, before: c.token});
  return diff;
}
function captureSpec(dir, file, opts = {}) {
  const bytes = fs.readFileSync(file), spec = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(spec.cells)) throw new Error('Candidate must contain cells');
  const sha = hash(bytes);
  return mutate(dir, (index, emit, manifest) => {
    const latest = index.candidates.at(-1);
    if (latest && latest.sha256 === sha) return latest;
    const id = 'v' + String(index.candidates.length + 1).padStart(3, '0');
    const parentId = opts.parentId === undefined ? latest?.id || null : opts.parentId;
    const parent = index.candidates.find(c => c.id === parentId);
    const origin = opts.origin || (manifest.mode === 'historical' ? 'historical' : 'observed');
    const specPath = `candidates/${id}-${sha.slice(0, 12)}.json`;
    fs.writeFileSync(path.join(dir, specPath), bytes, {flag: 'wx'});
    const c = {id, parentId, label: opts.label || spec.title || id, origin,
      createdAt: origin === 'historical' ? null : opts.at === undefined ? now() : opts.at,
      specPath, sha256: sha, cellsSha256: hash(spec.cells), contractSha256: hash(spec.contract || {}),
      cellCount: cellsMap(spec.cells).size,
      diff: cellDiff(parent ? json(path.join(dir, parent.specPath)).cells : [], spec.cells),
      parentBasis: origin === 'historical' ? 'inferred-file-order' : 'observed-snapshot-order', sourcePath: path.resolve(file),
      commandEventId: opts.commandEventId || null};
    index.candidates.push(c);
    emit('candidate.saved', {id, label: c.label, sha256: sha, cellsSha256: c.cellsSha256, parentId, parentBasis: c.parentBasis, commandEventId: c.commandEventId},
      {origin, candidateId: id, at: opts.at, evidenceRefs: [specPath]});
    return c;
  });
}
function recordResource(dir, file, opts = {}) {
  const artifactPath = saveArtifact(dir, file, 'resources');
  return mutate(dir, (index, emit, manifest) => {
    const origin = opts.origin || (manifest.mode === 'historical' ? 'historical' : 'observed');
    const r = {id: 'r' + String(index.resources.length + 1).padStart(3, '0'), path: path.resolve(file),
      sha256: hash(fs.readFileSync(path.join(dir, artifactPath))), artifactPath, kind: opts.kind || 'reference', origin,
      at: origin === 'historical' ? null : opts.at === undefined ? now() : opts.at};
    index.resources.push(r);
    emit(origin === 'historical' ? 'resource.imported' : 'resource.read', r, {origin, at: r.at, evidenceRefs: [artifactPath]});
    return r;
  });
}
function recordNote(dir, note) {
  return mutate(dir, (index, emit, manifest) => {
    const origin = manifest.mode === 'historical' || note.origin === 'historical' ? 'historical' : 'agent_statement';
    const n = {...note, id: 'n' + String(index.notes.length + 1).padStart(3, '0'), origin,
      at: origin === 'historical' ? null : now(), candidateId: note.candidateId || index.candidates.at(-1)?.id || null};
    index.notes.push(n);
    emit('design.note', n, {origin, candidateId: n.candidateId, at: n.at, actor: note.actor || 'author'});
    return n;
  });
}
function addTest(dir, test) {
  return mutate(dir, (index, emit, manifest) => {
    const origin = test.origin || (manifest.mode === 'historical' ? 'historical' : 'observed');
    const t = {...test, id: 't' + String(index.tests.length + 1).padStart(3, '0'), origin,
      at: origin === 'historical' ? null : test.at === undefined ? now() : test.at};
    if (!['passed', 'failed', 'unknown', 'error'].includes(t.status)) t.status = 'unknown';
    if (t.binding === 'mismatch' || t.binding === 'missing') t.status = 'unknown';
    index.tests.push(t);
    emit('test.completed', t, {origin, candidateId: t.candidateId, at: t.at,
      evidenceRefs: [t.reportPath, t.stdoutPath, t.stderrPath].filter(Boolean)});
    return t;
  });
}
function updateManifest(dir, patch) {
  return withLock(dir, () => {
    const current = json(path.join(dir, 'manifest.json'));
    const next = {...current, ...patch, id: current.id, schemaVersion: current.schemaVersion};
    atomic(path.join(dir, 'manifest.json'), next); return next;
  });
}
function readRun(dir) {
  const manifest = json(path.join(dir, 'manifest.json')), index = json(path.join(dir, 'index.json'));
  const events = [], gaps = [...(manifest.limitations || [])];
  for (const line of fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean)) {
    try { events.push(JSON.parse(line)); } catch { gaps.push('A malformed or incomplete event line was found.'); }
  }
  const expected = events.length ? events.at(-1).seq + 1 : 1;
  if (index.nextSeq !== expected) gaps.push('Event journal and index differ; interrupted write requires audit.');
  for (const event of events) if (event.type === 'capture.gap') gaps.push(event.details?.reason || 'An observed capture gap was recorded.');
  let tokenUsage = null;
  try {
    const file = path.join(dir, 'token-usage.json');
    const relative = path.relative(fs.realpathSync(dir), fs.realpathSync(file));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Usage report is outside the run.');
    tokenUsage = json(file);
  } catch (error) {
    if (error.code !== 'ENOENT') gaps.push('Token usage report is unreadable; no usage total can be claimed.');
  }
  return {manifest, events, candidates: index.candidates, tests: index.tests, resources: index.resources, notes: index.notes, tokenUsage,
    coverage: {mode: manifest.mode, description: manifest.mode === 'historical'
      ? 'Historical artifacts only. Event times and actual resource reads were not observed.'
      : 'Observed recorder-mediated commands, explicit reads, saved candidate boundaries and generated reports. Internal model reasoning and unwrapped actions are outside coverage.',
    gaps, counts: {events: events.length, candidates: index.candidates.length, tests: index.tests.length, resources: index.resources.length, notes: index.notes.length}}};
}
module.exports = {mutate, createRun, readRun, appendEvent, captureSpec, recordResource, recordNote, addTest, saveArtifact, updateManifest, hash, cellDiff};
