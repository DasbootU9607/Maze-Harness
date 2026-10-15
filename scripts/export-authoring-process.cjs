'use strict';

// Public, allowlisted projection of a private recorder run. Never copy raw logs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash } = require('./site-content.cjs');

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const statusOf = value => ['passed', 'failed', 'unknown', 'error'].includes(value) ? value : 'unknown';
const graphStatus = value => value === 'error' ? 'failed' : statusOf(value);
const idOf = value => {
  assert(typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/i.test(value), 'Invalid recorded identifier');
  return value;
};
const hashOf = value => {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'Missing recorded SHA-256');
  return value;
};

function identityTokens(index) {
  const tokens = new Set();
  for (const item of [...(index.resources || []), ...(index.candidates || [])]) {
    const value = String(item.path || item.sourcePath || '').replaceAll('\\', '/');
    for (const match of value.matchAll(/\/(?:Users|home)\/([^/]+)/gi)) tokens.add(match[1]);
  }
  return [...tokens].filter(value => value.length > 1);
}

function sanitizeText(value, identities = [], limit = 1600) {
  let text = typeof value === 'string' ? value : '';
  // Unknown free-form values are excluded at the caller; these rules only clean
  // explicitly permitted short labels and agent-authored explanatory sentences.
  text = text.replace(/\b[A-Za-z]:[\\/][^\r\n"'<>|]*/g, '[local path removed]')
    .replace(/(^|[\s=([{])\/[^\s"'<>]+/g, '$1[local path removed]')
    .replace(/\\\\[^\r\n"'<>]+/g, '[local path removed]')
    .replace(/https?:\/\/[^\s<>]+/gi, '[external address removed]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16})\b/g, '[credential removed]')
    .replace(/\b(?:bearer\s+|(?:password|passwd|secret|api[_ -]?key|access[_ -]?token|token)\s*[:=]\s*)[^\s,;]+/gi, '[credential removed]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email removed]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  for (const identity of identities) text = text.replace(new RegExp(identity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[identity removed]');
  return text.slice(0, limit);
}

function publicReference(value, identities) {
  const normalized = String(value || '').replaceAll('\\', '/');
  const skill = normalized.match(/(?:^|\/)(mazebench-[a-z0-9-]+)\/((?:references|scripts|assets)\/[a-zA-Z0-9._/-]+|SKILL\.md)(?:#[a-z0-9-]+)?$/);
  if (skill && !skill[2].split('/').includes('..')) return skill[1] + '/' + skill[2];
  const relative = normalized.match(/^(?:references|scripts|assets)\/[a-zA-Z0-9._/-]+(?:#[a-z0-9-]+)?$/);
  if (relative && !normalized.split('/').includes('..')) return normalized;
  return sanitizeText(normalized.split('/').at(-1), identities, 200);
}

function savedFile(runDir, relative) {
  assert(typeof relative === 'string' && !path.isAbsolute(relative) && !path.win32.isAbsolute(relative), 'Evidence must use a run-relative path');
  const realRoot = fs.realpathSync(runDir), resolved = fs.realpathSync(path.resolve(runDir, relative));
  const rel = path.relative(realRoot, resolved);
  assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Evidence escapes its run');
  assert(fs.statSync(resolved).isFile(), 'Evidence must resolve to a file');
  return resolved;
}

function publicCells(cells) {
  assert(Array.isArray(cells) && cells.length, 'Candidate has no cells');
  const token = value => assert(typeof value === 'string' && /^[a-zA-Z0-9.+#^<>|~*:=(),!-]{1,24}$/.test(value), 'Unsupported public cell token');
  if (cells.every(Array.isArray)) cells.forEach(row => row.forEach(token));
  else for (const cell of cells) {
    assert(cell && Object.keys(cell).every(key => ['x', 'y', 'z', 'token'].includes(key)), 'Sparse cells contain unsupported fields');
    for (const field of ['x', 'y', 'z']) assert(Number.isInteger(cell[field] ?? (field === 'z' ? 0 : NaN)), 'Invalid sparse coordinate');
    token(cell.token);
  }
  return structuredClone(cells);
}

function cellMap(cells) {
  const map = new Map();
  if (cells.every(Array.isArray)) cells.forEach((row, y) => row.forEach((token, x) => map.set(`${x},${y},0`, { x, y, z: 0, token })));
  else for (const cell of cells) map.set(`${cell.x},${cell.y},${cell.z || 0}`, { x: cell.x, y: cell.y, z: cell.z || 0, token: cell.token });
  return map;
}

function cellDiff(before, after) {
  const a = before ? cellMap(before) : new Map(), b = cellMap(after);
  const diff = { added: [], removed: [], changed: [] };
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const old = a.get(key), next = b.get(key), cell = next || old;
    if (old?.token === next?.token) continue;
    diff[!old ? 'added' : !next ? 'removed' : 'changed'].push({ x: cell.x, y: cell.y, z: cell.z, before: old?.token ?? null, after: next?.token ?? null });
  }
  return diff;
}

function assertAcyclic(nodes, edges) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  assert.equal(byId.size, nodes.length, 'Duplicate public graph node');
  const children = new Map(nodes.map(node => [node.id, []])), degree = new Map(nodes.map(node => [node.id, 0]));
  for (const edge of edges) {
    assert(byId.has(edge.from) && byId.has(edge.to), 'Graph edge refers to a missing node');
    assert(['revision', 'tested', 'cites', 'annotation', 'supports'].includes(edge.kind), 'Unsupported graph relationship');
    children.get(edge.from).push(edge.to); degree.set(edge.to, degree.get(edge.to) + 1);
  }
  const queue = [...degree].filter(([, n]) => n === 0).map(([id]) => id);
  let visited = 0;
  for (let i = 0; i < queue.length; i++) {
    visited++;
    for (const child of children.get(queue[i])) { degree.set(child, degree.get(child) - 1); if (!degree.get(child)) queue.push(child); }
  }
  assert.equal(visited, nodes.length, 'Recorded parent graph contains a cycle');
}

function assertPublicPrivacy(document, identities = []) {
  const fields = (value, allowed, label) => {
    assert(value && typeof value === 'object' && !Array.isArray(value), 'Invalid public object: ' + label);
    for (const key of Object.keys(value)) assert(allowed.includes(key), 'Non-allowlisted public field: ' + label + '.' + key);
  };
  fields(document, ['schemaVersion', 'caseId', 'title', 'skill', 'finalCandidateId', 'summary', 'coverage', 'nodes', 'edges', 'candidates', 'tests', 'notes', 'resources'], 'process');
  for (const key of ['caseId', 'title', 'skill', 'finalCandidateId', 'summary']) assert(typeof document[key] === 'string', 'Invalid public text: ' + key);
  fields(document.coverage, ['mode', 'audit', 'limitations'], 'coverage');
  fields(document.coverage.audit, ['status', 'failed', 'unknown'], 'audit');
  assert(Array.isArray(document.coverage.limitations) && document.coverage.limitations.every(value => typeof value === 'string'));
  for (const key of ['nodes', 'edges', 'candidates', 'tests', 'notes', 'resources']) assert(Array.isArray(document[key]), 'Missing public array: ' + key);
  for (const node of document.nodes) {
    fields(node, ['id', 'kind', 'label', 'status', 'order', 'summary', 'details'], 'node');
    const detailFields = { candidate: ['candidateId', 'cellsSha256', 'contractSha256', 'parentBasis'], test: ['testId', 'candidateId', 'binding', 'category'], note: ['noteId', 'candidateId', 'origin', 'retrospective'], resource: ['resourceId', 'displayPath', 'sha256', 'kind'], delivery: ['caseId', 'candidateId', 'cellsSha256', 'contractSha256'] };
    assert(detailFields[node.kind], 'Invalid public node kind'); fields(node.details, detailFields[node.kind], 'node.details');
    assert(typeof node.label === 'string' && typeof node.summary === 'string');
    assert(Object.values(node.details).every(value => value === null || ['string', 'boolean', 'number'].includes(typeof value)), 'Nested data is not allowed in public node details');
  }
  for (const edge of document.edges) fields(edge, ['from', 'to', 'kind', 'label', 'inferred'], 'edge');
  for (const candidate of document.candidates) {
    fields(candidate, ['id', 'graphNodeId', 'label', 'parentId', 'parentIds', 'cells', 'sha256', 'cellsSha256', 'contractSha256', 'origin', 'parentBasis', 'diff'], 'candidate');
    publicCells(candidate.cells); fields(candidate.diff, ['added', 'removed', 'changed'], 'diff');
    for (const key of ['added', 'removed', 'changed']) {
      assert(Array.isArray(candidate.diff[key]), 'Invalid cell diff');
      for (const cell of candidate.diff[key]) { fields(cell, ['x', 'y', 'z', 'before', 'after'], 'diff.cell'); assert(['x', 'y', 'z'].every(key => Number.isInteger(cell[key])) && ['before', 'after'].every(key => cell[key] === null || typeof cell[key] === 'string')); }
    }
  }
  for (const test of document.tests) {
    fields(test, ['id', 'graphNodeId', 'candidateId', 'label', 'status', 'checks', 'scope', 'binding', 'origin', 'category'], 'test');
    assert(Array.isArray(test.checks)); for (const check of test.checks) fields(check, ['name', 'status'], 'test.check');
  }
  for (const note of document.notes) { fields(note, ['id', 'graphNodeId', 'candidateId', 'label', 'goal', 'change', 'reason', 'sources', 'expectedChecks', 'origin', 'retrospective'], 'note'); assert(['label', 'goal', 'change', 'reason'].every(key => typeof note[key] === 'string')); assert(['sources', 'expectedChecks'].every(key => Array.isArray(note[key]) && note[key].every(value => typeof value === 'string'))); }
  for (const resource of document.resources) fields(resource, ['id', 'graphNodeId', 'label', 'displayPath', 'basename', 'sha256', 'kind', 'origin'], 'resource');
  const serialized = JSON.stringify(document);
  assert(!/[A-Za-z]:[\\/]|\\\\(?:Users|home)|\/(?:Users|home|tmp|private|workspace|var|etc|opt|mnt|root)\//i.test(serialized), 'Public process contains a local absolute path');
  assert(!/\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16})\b/.test(serialized), 'Public process contains a credential-like value');
  for (const identity of identities) assert(!serialized.toLowerCase().includes(identity.toLowerCase()), 'Public process contains a local identity');
  const forbidden = new Set(['command', 'cwd', 'stdout', 'stderr', 'stdoutPath', 'stderrPath', 'reportPath', 'artifactPath', 'sourcePath', 'humanFocus', 'statement', 'task', 'configuration', 'actor', 'raw']);
  const walk = value => { if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { assert(!forbidden.has(key), 'Non-public field in process export: ' + key); walk(child); } };
  walk(document);
}

function exportProcess(runDirectory, { caseId, expectedCellsSha256, expectedContractSha256, title, skill } = {}) {
  idOf(caseId); hashOf(expectedCellsSha256); hashOf(expectedContractSha256);
  const runDir = path.resolve(runDirectory);
  const { auditRun } = require('../tools/authoring-observatory/audit-run.cjs');
  const audit = auditRun(runDir);
  assert.equal(audit.status, 'passed', 'Authoring run evidence audit must pass before public export');
  const manifest = read(savedFile(runDir, 'manifest.json')), index = read(savedFile(runDir, 'index.json'));
  assert(['complete', 'imported'].includes(manifest.status), 'Complete the authoring run before export');
  const events = fs.readFileSync(savedFile(runDir, 'events.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const last = index.candidates.at(-1);
  assert(last, 'Authoring run has no final candidate');
  if (manifest.finalCandidateId) assert.equal(manifest.finalCandidateId, last.id, 'Final candidate marker is stale');
  assert.equal(last.cellsSha256, expectedCellsSha256, 'Published cells do not match the final recorded candidate');
  assert.equal(last.contractSha256, expectedContractSha256, 'Published contract does not match the final recorded candidate');
  assert(index.tests.some(test => test.candidateId === last.id && test.status === 'passed' && test.binding === 'exact' && test.inputSha256 === last.sha256), 'Final candidate needs a passed test with exact recorded input');
  const identities = identityTokens(index), clean = (text, limit) => sanitizeText(text, identities, limit);
  const nodes = [], edges = [], candidates = [], tests = [], notes = [], resources = [];
  const sequence = (type, id, fallback = 0) => events.find(event => event.type === type && (event.details?.id === id || event.candidateId === id))?.seq ?? fallback;
  const sourceCandidates = new Map(index.candidates.map(candidate => [candidate.id, candidate]));
  for (const item of index.candidates) {
    const id = idOf(item.id), spec = read(savedFile(runDir, item.specPath));
    const candidate = { id, graphNodeId: 'candidate-' + id, label: clean(item.label || id, 160), parentId: item.parentId || null, parentIds: item.parentId ? [idOf(item.parentId)] : [], cells: publicCells(spec.cells), sha256: hashOf(item.sha256), cellsSha256: hashOf(item.cellsSha256), contractSha256: hashOf(item.contractSha256), origin: item.origin === 'historical' ? 'historical' : 'observed', parentBasis: clean(item.parentBasis || 'unspecified', 100) };
    const parent = item.parentId ? sourceCandidates.get(item.parentId) : null;
    assert(!item.parentId || parent, 'Missing recorded parent candidate');
    candidate.diff = cellDiff(parent ? read(savedFile(runDir, parent.specPath)).cells : null, candidate.cells);
    candidates.push(candidate);
    nodes.push({ id: candidate.graphNodeId, kind: 'candidate', label: id + ' · ' + candidate.label, status: 'neutral', order: sequence('candidate.saved', id), summary: `${candidate.diff.changed.length} changed cells; ${candidate.diff.added.length} added; ${candidate.diff.removed.length} removed.`, details: { candidateId: id, cellsSha256: candidate.cellsSha256, contractSha256: candidate.contractSha256, parentBasis: candidate.parentBasis } });
    if (parent) edges.push({ from: 'candidate-' + idOf(parent.id), to: candidate.graphNodeId, kind: 'revision', label: candidate.origin === 'historical' ? 'Inferred file order' : 'Observed snapshot order; not causal proof', inferred: candidate.origin === 'historical' || candidate.parentBasis !== 'observed-snapshot-order' });
  }
  for (const item of index.tests) {
    const id = idOf(item.id), candidateId = item.candidateId && sourceCandidates.has(item.candidateId) ? item.candidateId : null;
    const names = (item.checks || []).map(check => check.name || '');
    const fallbackLabel = names.some(name => name.includes('pre_collection')) ? 'Browser replay, pre-collection undo, and editor export'
      : names.some(name => name.startsWith('normal_play_')) ? 'Browser replay and editor export' : 'Recorded test ' + id;
    const label = /[\u3400-\u9fff]/.test(item.label || '') ? fallbackLabel : clean(item.label || id, 200);
    const test = { id, graphNodeId: 'test-' + id, candidateId, label, status: statusOf(item.status), checks: (item.checks || []).map(check => ({ name: clean(check.name, 200), status: statusOf(check.status || check.verdict) })), scope: clean(item.scope), binding: ['exact', 'historical', 'mismatch', 'missing'].includes(item.binding) ? item.binding : 'missing', origin: item.origin === 'historical' ? 'historical' : 'observed', category: 'test' };
    tests.push(test);
    nodes.push({ id: test.graphNodeId, kind: 'test', label: test.label, status: graphStatus(test.status), order: sequence('test.completed', id), summary: test.scope, details: { testId: id, candidateId, binding: test.binding, category: test.category } });
    if (candidateId) edges.push({ from: 'candidate-' + candidateId, to: test.graphNodeId, kind: 'tested', label: test.binding, inferred: test.binding !== 'exact' });
  }
  const linkedCommands = new Set(index.tests.map(test => test.commandEventId));
  for (const event of events.filter(event => event.type === 'command.completed' && (Number.isInteger(event.details?.code) && event.details.code !== 0 || event.details?.signal) && !linkedCommands.has(event.details?.commandEventId))) {
    const start = events.find(item => item.id === event.details.commandEventId);
    if (!start) continue;
    const id = 'diagnostic-' + idOf(start.id), candidateId = sourceCandidates.has(start.candidateId) ? start.candidateId : null;
    const test = { id, graphNodeId: 'test-' + id, candidateId, label: clean(start.details?.label || 'Recorded diagnostic failure', 200), status: 'failed', checks: [], scope: 'A recorded diagnostic process failed. This is an execution outcome, not a mechanism-test verdict; no command text or raw output is published.', binding: 'observed-command-association', origin: 'observed', category: 'diagnostic' };
    tests.push(test); nodes.push({ id: test.graphNodeId, kind: 'test', label: test.label, status: 'failed', order: event.seq, summary: test.scope, details: { testId: id, candidateId, category: 'diagnostic', binding: test.binding } });
    if (candidateId) edges.push({ from: 'candidate-' + candidateId, to: test.graphNodeId, kind: 'tested', label: 'Diagnostic execution association', inferred: false });
  }
  for (const item of index.resources) {
    const id = idOf(item.id), displayPath = publicReference(item.path, identities);
    const resource = { id, graphNodeId: 'resource-' + id, label: displayPath, displayPath, basename: displayPath.split('/').at(-1), sha256: hashOf(item.sha256), kind: clean(item.kind, 60), origin: item.origin === 'historical' ? 'historical' : 'observed' };
    resources.push(resource);
    nodes.push({ id: resource.graphNodeId, kind: 'resource', label: resource.basename, status: 'neutral', order: sequence('resource.read', id), summary: resource.origin === 'observed' ? 'Recorded bytes delivered; not proof of understanding or use.' : 'Historical snapshot; reading time and actual use are unknown.', details: { resourceId: id, displayPath, sha256: resource.sha256, kind: resource.kind } });
  }
  for (const item of index.notes.filter(item => item.origin === 'agent_statement')) {
    const id = idOf(item.id), candidateId = sourceCandidates.has(item.candidateId) ? item.candidateId : null;
    const note = { id, graphNodeId: 'note-' + id, candidateId, label: clean(item.goal || 'Agent design annotation', 200), goal: clean(item.goal), change: clean(item.change), reason: clean(item.reason), sources: (item.sources || []).filter(value => typeof value === 'string').map(value => publicReference(value, identities)), expectedChecks: (item.expectedChecks || []).map(value => clean(value, 240)), origin: 'agent_statement', retrospective: !!item.retrospective };
    notes.push(note);
    const order = sequence('design.note', id);
    nodes.push({ id: note.graphNodeId, kind: 'note', label: note.label, status: 'neutral', order, summary: note.change || note.reason, details: { noteId: id, candidateId, origin: note.origin, retrospective: note.retrospective } });
    if (candidateId) edges.push({ from: 'candidate-' + candidateId, to: note.graphNodeId, kind: 'annotation', label: 'Agent annotation about this candidate', inferred: false });
    const cited = new Set();
    for (const ref of note.sources) {
      const file = ref.split('#')[0];
      const matches = resources.filter(resource => (resource.displayPath.endsWith(file) || resource.basename === file) && sequence('resource.read', resource.id) <= order);
      if (!matches.length || new Set(matches.map(resource => resource.sha256)).size !== 1) continue;
      const resource = matches.at(-1);
      if (!cited.has(resource.id)) edges.push({ from: resource.graphNodeId, to: note.graphNodeId, kind: 'cites', label: 'Explicit note citation; not proof of use', inferred: false });
      cited.add(resource.id);
    }
  }
  const deliveryId = 'delivery-final';
  nodes.push({ id: deliveryId, kind: 'delivery', label: 'Published final candidate ' + last.id, status: 'passed', order: events.at(-1)?.seq + 1 || 1, summary: 'Final map and contract hashes match the published design. Earlier failed attempts remain visible.', details: { caseId, candidateId: last.id, cellsSha256: last.cellsSha256, contractSha256: last.contractSha256 } });
  edges.push({ from: 'candidate-' + last.id, to: deliveryId, kind: 'supports', label: 'Published cells and contract match', inferred: false });
  for (const test of tests.filter(test => test.category === 'test' && test.candidateId === last.id && test.status === 'passed' && test.binding === 'exact')) edges.push({ from: test.graphNodeId, to: deliveryId, kind: 'supports', label: 'Passed within the stated test scope', inferred: false });
  nodes.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const document = { schemaVersion: 1, caseId, title: clean(title || last.label, 200), skill: clean(skill, 100), finalCandidateId: last.id,
    summary: `${candidates.length} recorded candidates, ${tests.filter(test => test.category === 'test').length} tests, ${tests.filter(test => test.category === 'diagnostic').length} failed diagnostics, and ${notes.length} agent annotations.`,
    coverage: { mode: manifest.mode === 'historical' ? 'historical' : 'observed', audit: { status: audit.status, failed: audit.counts.failed, unknown: audit.counts.unknown }, limitations: [
      'Only recorded operations and saved snapshots are shown; transient in-memory drafts and unrecorded activity remain unknown.',
      'Snapshot parent links show recorded version order, not proof of causal reasoning. No unrecorded branches or merges are reconstructed.',
      'Agent annotations are concise explanations, not internal thought transcripts. Recorded resource delivery does not prove comprehension or use.',
      'Test outcomes retain their own scope. Author self-tests do not establish independent-agent effectiveness or human difficulty.',
      ...(manifest.limitations || []).map(value => clean(value))
    ] }, nodes, edges, candidates, tests, notes, resources };
  assertAcyclic(nodes, edges); assertPublicPrivacy(document, identities);
  return document;
}

function discoverAuthoringRun(options) {
  if (options['authoring-run']) return path.resolve(options['authoring-run']);
  if (!options.spec) return null;
  const marker = path.join(path.dirname(path.resolve(options.spec)), 'authoring-session.json');
  if (!fs.existsSync(marker)) return null;
  const data = read(marker);
  assert(data.schemaVersion === 1, 'Invalid authoring-session.json marker');
  const directory = path.dirname(marker), spec = path.resolve(options.spec);
  const key = path.relative(directory, spec).replaceAll(path.sep, '/');
  const selected = data.sessions && Object.hasOwn(data.sessions, key) ? data.sessions[key]
    : typeof data.specPath === 'string' && path.resolve(directory, data.specPath) === spec ? data.runDir : null;
  if (selected == null) return null;
  assert(typeof selected === 'string' && selected.trim() && !path.isAbsolute(selected) && !path.win32.isAbsolute(selected), 'Authoring session runDir must be marker-relative');
  return path.resolve(directory, selected);
}

function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    assert(['run', 'case', 'spec', 'out', 'skill'].includes(key) && args[i + 1] && !options[key], 'Use --run RUN --case CASE_ID --spec SPEC --out FILE [--skill NAME]');
    options[key] = args[i + 1];
  }
  assert(options.run && options.case && options.spec && options.out, 'Use --run RUN --case CASE_ID --spec SPEC --out FILE [--skill NAME]');
  const spec = read(options.spec), document = exportProcess(options.run, { caseId: options.case, expectedCellsSha256: hash(spec.cells), expectedContractSha256: hash(spec.contract), title: spec.title, skill: options.skill });
  const { outputOutsideRun } = require('../tools/authoring-observatory/audit-run.cjs');
  const out = outputOutsideRun(options.run, options.out); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(document, null, 2) + '\n');
  console.log(JSON.stringify({ caseId: document.caseId, candidates: document.candidates.length, tests: document.tests.length, publicProjection: true }));
}

if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { exportProcess, discoverAuthoringRun, sanitizeText, assertPublicPrivacy, assertAcyclic };
