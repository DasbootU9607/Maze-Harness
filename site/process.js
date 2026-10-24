import {buildLabel, effortLabel, attributionLabel, buildDate, clientLabel, duration, tokenCount} from './build-data.js';
import {downloadBuilds} from './build-downloads.js';
import { loadCatalog, shell, playUrl, showError } from './ui.js';
import { createOrbitTimeline } from './process-orbit.js';

const $ = id => document.getElementById(id);
const state = { data: null, catalog: null, entry: null, skill: null, nodes: [], selectedId: null, candidateId: null, previewCandidateId: null, previewKey: null, previewMode: null, previewUrl: null, previewLabel: null, expanded: false, returnFocus: null, previousOverflow: '', keyNodeIds: new Set() };
let orbitTimeline;
const kindNames = { resource: 'READ', candidate: 'VERSION', test: 'TEST', note: 'DESIGN NOTE', operation: 'OPERATION', replay: 'REPLAY', delivery: 'DELIVERY', record: 'RECORD' };
const statusNames = { passed: 'Passed', failed: 'Failed', unknown: 'Unknown', error: 'Error' };
const resourceNames = { 'SKILL.md': 'Read skill instructions', 'mechanism-logic.md': 'Read extracted mechanism', 'planning-depth.md': 'Read planning guidance', 'complex-validation.md': 'Read verification guidance', 'design-template.json': 'Read design template', 'complex-runtime.cjs': 'Inspect mechanism runtime', 'verify-complex.cjs': 'Inspect the verifier', 'design.md': 'Read design conventions', 'browser-check.cjs': 'Inspect browser replay checks' };

function el(tag, cls, value) { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined && value !== null) node.textContent = String(value); return node; }
function clear(node) { node.replaceChildren(); return node; }
function text(value) { return typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value, null, 2); }
function short(value, max = 150) { const s = text(value); return s.length > max ? s.slice(0, max - 3) + '...' : s; }
function byId(id) { return state.nodes.find(node => node.id === id); }
function explanationFor(node) { return state.data.explanations?.find(row => row.nodeId === node.id); }
function recordFor(node) {
  const key = { candidate: 'candidates', test: 'tests', note: 'notes', resource: 'resources', operation: 'operations', replay: 'replays', record: 'records' }[node.kind];
  return key ? (state.data[key] || []).find(record => record.graphNodeId === node.id || record.id === node.id || (node.kind === 'candidate' && record.id === node.details?.candidateId)) : null;
}
function candidateFor(node) {
  if (!node || node.kind === 'resource') return null;
  if (node.kind === 'candidate') return recordFor(node);
  const record = recordFor(node), id = record?.candidateId || node.candidateId || node.details?.candidateId;
  if (id) return state.data.candidates.find(candidate => candidate.id === id) || null;
  if (node.kind !== 'delivery') return null;
  const linked = state.data.edges.filter(edge => edge.kind === 'supports' && edge.to === node.id).map(edge => state.data.candidates.find(candidate => candidate.graphNodeId === edge.from)).filter(Boolean);
  return linked.length === 1 ? linked[0] : null;
}
function nodeTitle(node) {
  const record = recordFor(node);
  if (node.kind === 'resource') {
    if (record?.delivery === 'snapshot' || record?.origin === 'historical') return `Saved source: ${record?.basename || node.label}`;
    return resourceNames[record?.basename || node.label] || `Read ${record?.basename || node.label || 'reference material'}`;
  }
  if (node.kind === 'candidate') return `Save candidate ${record?.id || node.details?.candidateId || node.label}`;
  if (node.kind === 'note') return record?.goal || node.label || 'Record a design note';
  return node.label || node.id;
}
function nodeCategory(node) { const record = recordFor(node); if (node.kind === 'record') return ({ 'command.started': 'START', 'command.completed': 'FINISH', 'artifact.saved': 'ARTIFACT', 'build.saved': 'BUILD FILES', 'run.created': 'SESSION', 'run.finished': 'SESSION', 'collector.started': 'CAPTURE', 'capture.gap': 'CAPTURE GAP' })[node.eventType] || 'RECORD'; if (node.kind === 'resource' && (record?.delivery === 'snapshot' || record?.origin === 'historical')) return 'SOURCE SNAPSHOT'; return record?.category === 'diagnostic' ? 'DIAGNOSTIC' : kindNames[node.kind] || String(node.kind).toUpperCase(); }
function nodeAction(node) {
  const record = recordFor(node), label = node.label || '', goal = record?.goal || label;
  if (node.kind === 'record') return record?.label || label;
  if (node.kind === 'resource') {
    if (record?.delivery === 'snapshot' || record?.origin === 'historical') return 'Save source snapshot';
    const previousRead = state.nodes.some(other => other.sourceIndex < node.sourceIndex && other.kind === 'resource' && recordFor(other)?.basename === record?.basename);
    if (record?.basename === 'mechanism-logic.md' && previousRead) return 'Read mechanism again';
    return resourceNames[record?.basename] || 'Read reference material';
  }
  if (node.kind === 'candidate') return `Save candidate ${record?.id || node.details?.candidateId || ''}`;
  if (node.kind === 'note') {
    if (/three-stage.*recoverable access guard/i.test(goal)) return 'Plan three-stage room';
    if (/repair.*unsolved layout/i.test(goal)) return 'Repair latch clearance';
    if (/eliminate.*bypass/i.test(goal)) return 'Remove passage bypass';
    if (/finalize.*preserve replayable/i.test(goal)) return 'Finalize room and replay';
    if (/undo.*pre-collection/i.test(goal)) return 'Check pre-collection Undo';
    return 'Record design decision';
  }
  if (node.kind === 'replay') return 'Save gameplay replay';
  if (node.kind === 'delivery') return `Publish final candidate ${candidateFor(node)?.id || ''}`.trim();
  const actions = {
    'author-first-layout': 'Build first layout',
    'solve-first-layout': 'Solve first layout',
    'inspect-first-layout-obstruction': 'Inspect first-layout obstruction',
    'revise-latch-clearance': 'Revise latch clearance',
    'solve-revised-layout': 'Solve revised layout',
    'close-northeast-bypass': 'Close northeast bypass',
    'solve-and-bind-stage-witnesses': 'Bind solution stage witnesses',
    'formal-complex-verification-01': node.kind === 'test' ? 'Mechanism verification' : 'Run complex verifier',
    'build-verified-rooflock-draft': 'Build verified room',
    'Local preview service started': 'Start local preview',
    'saved-build-ordinary-replay': node.kind === 'test' ? 'Verify saved-build replay' : 'Run saved-build replay',
    'Browser replay and editor export': 'Browser replay and export',
    'Browser replay, pre-collection undo, and editor export': 'Browser undo and export',
    'Browser validation completed': 'Run browser checks'
  };
  if (actions[label]) return actions[label];
  const words = label.replace(/[-_]/g, ' ').trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 6 && label.length < 48) return words.join(' ').replace(/^./, character => character.toUpperCase());
  return node.kind === 'test' ? 'Inspect recorded test' : 'Run recorded operation';
}
function resourceCategory(record) {
  const name = record?.basename || '';
  if (name === 'SKILL.md' || record?.kind === 'skill') return 'Skill instructions';
  if (name === 'mechanism-logic.md' || record?.kind === 'mechanism') return 'Extracted mechanism';
  if (/original|official.*case|user.*case/.test(name) || record?.kind === 'original-case') return 'Original case material';
  if (/validation|verif|browser-check/.test(name)) return 'Verification guidance and checks';
  if (/runtime/.test(name)) return 'Mechanism runtime';
  if (/planning|design/.test(name)) return 'Planning and design guidance';
  return 'Reference material';
}
function parentsOf(candidate) { return candidate.parentIds || (candidate.parentId ? [candidate.parentId] : []); }
function diffText(candidate) {
  const diff = candidate.diff || {}, parent = parentsOf(candidate)[0];
  if (!parent) return 'First saved layout';
  const changed = diff.changed?.length || 0, added = diff.added?.length || 0, removed = diff.removed?.length || 0;
  return changed || added || removed ? `${changed} changed / ${added} added / ${removed} removed vs ${parent}` : `Cells unchanged from ${parent}; declarations may differ`;
}
function orbitSummary(node) {
  const record = recordFor(node), candidate = candidateFor(node);
  if (node.kind === 'resource') return `${record?.basename || node.label} · ${record?.delivery === 'snapshot' || record?.origin === 'historical' ? 'Saved source snapshot' : 'Recorded file read'}`;
  if (node.kind === 'candidate' && candidate) return diffText(candidate);
  if (node.kind === 'note') return record?.change || record?.goal || node.summary || '';
  if (node.kind === 'test') {
    if (record?.category === 'diagnostic') return `Diagnostic process ${node.status || 'outcome unknown'}${candidate ? ` · ${candidate.id}` : ''}. ${node.summary || record?.scope || ''}`;
    const checks = record?.checks || [], passed = checks.filter(check => check.status === 'passed').length;
    return `${statusNames[node.status] || 'Result unknown'}${candidate ? ` · ${candidate.id}` : ''}${checks.length ? ` · ${passed} of ${checks.length} checks passed` : ''}. ${record?.scope || ''}`;
  }
  if (node.kind === 'replay') return `${record?.route?.length || 0} recorded inputs · ${record?.frameCount || 0} saved frames${candidate ? ` · ${candidate.id}` : ''}`;
  return node.summary || record?.scope || nodeTitle(node);
}
function installOrbitTimeline() {
  orbitTimeline = createOrbitTimeline({
    container: $('process-timeline'),
    getData: () => ({
      title: state.data.title || state.entry.title,
      selectedId: state.selectedId,
      events: state.nodes.map(node => ({
        id: node.id, kind: node.kind, category: nodeCategory(node), label: nodeAction(node),
        summary: short(orbitSummary(node).replace(/\s+/g, ' '), 190),
        ordinal: node.order ?? node.sourceIndex + 1, status: node.status || 'neutral',
        statusLabel: explanationFor(node)?.badge || (node.status === 'failed' && (recordFor(node)?.category === 'diagnostic' || node.eventType === 'command.completed') ? 'Process failed' : statusNames[node.status] || ''),
        isKey: state.keyNodeIds.has(node.id)
      }))
    }),
    onSelect: id => selectNode(id, { focus: false, fromTimeline: true }),
    onDetails: () => {
      $('operation-detail').scrollIntoView({ block: 'start', behavior: 'instant' });
      $('operation-detail').focus({ preventScroll: true });
    }
  });
}
function classifyTimeline() {
  const keyIds = new Set(), seenReadKinds = new Set(), formalTests = new Map(); let firstNote = false;
  for (const node of state.nodes) {
    const record = recordFor(node);
    if (['candidate', 'replay', 'delivery'].includes(node.kind)) keyIds.add(node.id);
    if (node.eventType === 'capture.gap') keyIds.add(node.id);
    if (node.kind === 'resource') {
      const category = resourceCategory(record);
      const access = record?.delivery === 'snapshot' || record?.origin === 'historical' ? 'snapshot' : 'read';
      const readKind = `${category}:${access}`;
      // A dependency snapshot must not hide the later, independently recorded read.
      if (['Skill instructions', 'Extracted mechanism', 'Original case material'].includes(category) && !seenReadKinds.has(readKind)) { keyIds.add(node.id); seenReadKinds.add(readKind); }
    }
    if (node.kind === 'note' && !firstNote) { keyIds.add(node.id); firstNote = true; }
    if (node.kind === 'test' && record?.category !== 'diagnostic') {
      const candidateId = record?.candidateId || node.details?.candidateId || 'unbound';
      if (!formalTests.has(candidateId)) formalTests.set(candidateId, []); formalTests.get(candidateId).push(node);
      if (['failed', 'error', 'unknown'].includes(node.status)) keyIds.add(node.id);
    }
  }
  for (const tests of formalTests.values()) { keyIds.add(tests[0].id); keyIds.add(tests[tests.length - 1].id); }
  if (!keyIds.size && state.nodes.length) keyIds.add(state.nodes[0].id);
  state.keyNodeIds = keyIds;
}

async function start() {
  shell('process');
  const catalog = await loadCatalog(), query = new URL(location.href).searchParams, entry = catalog.cases.find(item => item.id === query.get('case'));
  if (!entry?.process?.data) throw new Error('Choose a room with a published build process from the skill library.');
  if (!/^data\/processes\/[a-zA-Z0-9._-]+\.json$/.test(entry.process.data)) throw new Error('The process data path is invalid.');
  const response = await fetch('./' + entry.process.data); if (!response.ok) throw new Error('The published build record could not be loaded.');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('This build record uses an unsupported format.');
  state.data = { ...data, candidates: data.candidates || [], tests: data.tests || [], notes: data.notes || [], resources: data.resources || [], operations: data.operations || [], replays: data.replays || [], records: data.records || [] };
  state.catalog = catalog; state.entry = entry; state.skill = catalog.skills.find(skill => skill.id === data.skill || skill.id === entry.skill);
  state.nodes = data.nodes.map((node, index) => ({ ...node, sourceIndex: index })).sort((a, b) => (Number.isFinite(a.order) ? a.order : a.sourceIndex) - (Number.isFinite(b.order) ? b.order : b.sourceIndex));
  document.title = `${entry.title} - Build process - Maze Harness`;
  $('process-title').textContent = data.title || entry.title;
  $('process-summary').textContent = data.summary || 'Follow the recorded reads, revisions, checks, and replays behind this room.';
  $('play-room').href = playUrl(entry); $('process-data').href = './' + entry.process.data;
  $('skill-link').textContent = state.skill?.name || 'Skill library'; $('skill-link').href = state.skill ? './skill.html?id=' + encodeURIComponent(state.skill.id) : './index.html#skills';
  const mode = data.coverage?.mode || data.mode || 'unknown'; $('record-mode').textContent = mode === 'observed' ? 'OBSERVED RECORD' : mode === 'historical' ? 'HISTORICAL IMPORT' : 'PARTIAL RECORD'; $('record-mode').classList.toggle('historical', mode === 'historical');
  const coverage = data.coverage?.events;
  $('record-summary').textContent = `${state.data.candidates.length} versions / ${state.data.resources.length} recorded references / ${state.data.tests.length} test records${coverage ? ` / ${coverage.representedCount} of ${coverage.sourceCount} source records` : ''}`;
  renderUsage(data.usage);
  classifyTimeline();
  $('coverage-description').textContent = data.coverage?.description || 'This view contains saved operations, references, maps, test outcomes, and public author explanations. It does not reconstruct unrecorded activity.';
  const limits = [...(data.coverage?.limitations || []), ...(data.limitations || []), data.coverage?.sources?.scope].filter(Boolean).map(text).filter((item, index, all) => all.indexOf(item) === index);
  limits.forEach(item => $('coverage-limitations').append(el('li', '', item)));
  installInteractions();
  const requested = byId(query.get('node')), requestedCandidate = state.data.candidates.find(candidate => candidate.id === query.get('candidate'));
  const firstCandidate = state.data.candidates.find(candidate => candidate.preview?.levelPath) || state.data.candidates[0];
  selectNode(requested?.id || requestedCandidate?.graphNodeId || firstCandidate?.graphNodeId || state.nodes[0]?.id, { initial: true, focus: false });
  installOrbitTimeline();
}

function selectNode(id, { initial = false, focus = true, fromTimeline = false } = {}) {
  const node = byId(id); if (!node) return;
  if (state.expanded) closePreview({ restoreFocus: false });
  if (state.selectedId !== id) disposePreview(); state.selectedId = id;
  const record = recordFor(node), candidate = candidateFor(node), index = state.nodes.indexOf(node);
  $('previous-operation').disabled = index === 0; $('next-operation').disabled = index === state.nodes.length - 1;
  const meta = clear($('operation-meta')); meta.append(el('span', '', nodeCategory(node)), el('span', '', node.kind === 'delivery' ? '/ PUBLICATION BINDING' : `/ RECORD ${node.order ?? index + 1}`));
  if (candidate && node.kind !== 'candidate') meta.append(el('span', '', `/ ${candidate.id}`));
  if (statusNames[node.status] && node.kind !== 'test') meta.append(el('span', `status-label ${node.status}`, statusNames[node.status]));
  $('operation-title').textContent = nodeAction(node);
  let summary = '';
  if (node.kind === 'resource') summary = `${resourceCategory(record)} / ${record?.delivery === 'snapshot' || record?.origin === 'historical' ? 'Saved source snapshot' : 'Recorded file read'}`;
  else if (node.kind === 'candidate' && candidate) summary = diffText(candidate);
  else if (node.kind === 'test') { const checks = record?.checks || [], passed = checks.filter(check => check.status === 'passed').length; summary = record?.category === 'diagnostic' ? `Diagnostic process ${node.status || 'outcome unknown'}.` : `${statusNames[node.status] || 'Result unknown'}${checks.length ? ` · ${passed} of ${checks.length} checks passed` : ''}.`; }
  else if (node.kind === 'replay' && record) summary = `${record.frameCount || 0} saved frames · ${record.route?.length || 0} recorded inputs`;
  else if (node.kind === 'record' && record?.files.length) summary = record.files.map(file => file.name).join(' · ');
  else if (node.kind === 'operation') summary = 'Execution completed · exit code 0';
  else if (node.kind === 'delivery') summary = node.summary || '';
  $('operation-summary').textContent = summary; $('operation-summary').hidden = !summary;
  renderPreview(node, record, candidate); renderSources(node, record); renderExplanation(node, record, candidate); renderChecks(node, record); renderRelations(node);
  const safeRecord = record ? Object.fromEntries(Object.entries(record).filter(([key]) => !['cells', 'diff'].includes(key))) : null;
  $('operation-evidence-body').textContent = JSON.stringify({ node: Object.fromEntries(Object.entries(node).filter(([key]) => key !== 'sourceIndex')), ...(safeRecord ? { record: safeRecord } : {}) }, null, 2); $('operation-evidence').open = false;
  const url = new URL(location.href); url.searchParams.set('node', node.id); if (candidate) url.searchParams.set('candidate', candidate.id); else url.searchParams.delete('candidate'); history.replaceState(null, '', url);
  if (!initial) $('operation-detail').scrollTop = 0;
  if (!fromTimeline) orbitTimeline?.select(id, { focus });
}

function exactReplayFor(node, record, candidate) {
  if (node.kind !== 'replay' || !record || !candidate?.preview?.levelPath) return null;
  const bound = candidate.preview.replays ? candidate.preview.replays.find(item => item.id === record.id) : candidate.preview.replay;
  if (bound?.id && bound.id !== record.id) return null;
  if (!bound || record.binding !== 'exact-artifact' || bound.binding !== 'exact-artifact' || record.sourceKind !== 'saved-replay' || bound.sourceKind !== 'saved-replay') return null;
  if (record.candidateId !== candidate.id || bound.candidateId !== candidate.id) return null;
  if (!record.cellsSha256 || record.cellsSha256 !== candidate.cellsSha256 || bound.cellsSha256 !== candidate.cellsSha256 || !record.contractSha256 || record.contractSha256 !== candidate.contractSha256 || bound.contractSha256 !== candidate.contractSha256) return null;
  if (!record.data || record.data !== bound.data || !record.sha256 || record.sha256 !== bound.sha256 || !record.sourceSha256 || record.sourceSha256 !== bound.sourceSha256) return null;
  if (record.route !== bound.route || record.frameCount !== bound.frameCount) return null;
  return record;
}
function renderPreview(node, record, candidate) {
  state.candidateId = candidate?.id || null;
  const replay = exactReplayFor(node, record, candidate), mode = node.kind === 'candidate' && candidate?.preview?.levelPath ? 'play' : replay ? 'replay' : null;
  const available = Boolean(mode); $('preview-shell').hidden = !available;
  if (!available) return;
  $('preview-title').textContent = mode === 'play' ? 'Play map' : 'Replay';
  const button = clear($('expand-preview')), arrow = el('span', '', '\u2197'); arrow.setAttribute('aria-hidden', 'true');
  button.append(document.createTextNode(mode === 'play' ? 'Expand to play ' : 'Expand replay '), arrow);
  const key = `${node.id}:${mode}:${candidate.id}:${replay?.id || ''}`;
  if (state.previewKey !== key) {
    state.previewKey = key; state.previewCandidateId = candidate.id; state.previewMode = mode; $('preview-status').textContent = ''; $('preview-error').hidden = true;
    state.previewLabel = mode === 'play' ? `Play saved version ${candidate.id}` : `Watch saved replay ${record.id}`;
    state.previewUrl = './process-player.html?' + new URLSearchParams({ case: state.entry.id, candidate: candidate.id, mode, ...(replay ? { replay: replay.id } : {}) });
    const image = $('preview-image'), imageUrl = thumbnailUrl(candidate.preview.thumbnailPath);
    image.alt = mode === 'play' ? `Saved map ${candidate.id}` : `Initial map ${candidate.id} for replay ${record.id}`;
    image.dataset.candidateId = candidate.id; image.hidden = !imageUrl; $('preview-placeholder').hidden = Boolean(imageUrl);
    if (imageUrl) image.src = imageUrl; else image.removeAttribute('src');
  }
}
function thumbnailUrl(path) {
  if (typeof path !== 'string' || !path || path.includes('\\')) return null;
  try {
    const base = new URL('./', location.href), url = new URL(path, base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) && /\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch (_) { return null; }
}
function pausePreview() { $('preview-frame')?.contentWindow?.postMessage({ source: 'mazebench-process', type: 'pause' }, location.origin); }
function disposePreview() {
  pausePreview(); clear($('preview-player-host'));
  state.previewKey = null; state.previewCandidateId = null; state.previewMode = null; state.previewUrl = null; state.previewLabel = null;
}
function ensurePreviewFrame() {
  if ($('preview-frame')) return;
  const frame = el('iframe', 'preview-frame'); frame.id = 'preview-frame'; frame.title = state.previewLabel; frame.allow = 'fullscreen';
  frame.addEventListener('load', () => {
    try { frame.contentWindow.addEventListener('keydown', handleEscape, true); } catch (_) { /* Only a same-origin player receives keyboard handling. */ }
    if (!state.expanded) pausePreview();
  });
  $('preview-status').textContent = 'Loading map...'; $('preview-error').hidden = true;
  frame.src = state.previewUrl; $('preview-player-host').append(frame);
}
function sourceCases() {
  const indirect = state.data.coverage?.sources?.indirect;
  if (Array.isArray(indirect)) return indirect.map(item => ({ ...item, entry: state.catalog.cases.find(entry => entry.kind === 'official' && (entry.room === item.caseId || entry.id === item.caseId)) })).filter(item => item.entry);
  return (state.skill?.officialCases || []).map(id => ({ caseId: state.catalog.cases.find(entry => entry.id === id)?.room, basis: 'skill-source-reference', entry: state.catalog.cases.find(entry => entry.id === id) })).filter(item => item.entry);
}
function renderSources(node, record) {
  const host = clear($('source-overview')); host.hidden = node.kind !== 'resource'; if (host.hidden) return;
  if (node.kind === 'resource') {
    host.append(el('div', 'source-path', record?.displayPath || node.details?.displayPath || record?.label || node.label));
    const citedNotes = state.data.edges.filter(edge => edge.kind === 'cites' && (edge.from === node.id || edge.to === node.id)).map(edge => byId(edge.from === node.id ? edge.to : edge.from)).filter(other => other?.kind === 'note');
    if (!citedNotes.length) host.append(el('p', '', 'No explicit design-note citation is recorded for this file entry.'));
    for (const note of citedNotes) {
      const noteRecord = recordFor(note), section = el('div', 'source-citation'), button = relationButton(note, false); section.append(el('p', 'relation-caption', 'Explicitly cited in this public design note'), button);
      if (noteRecord?.change) section.append(el('p', '', `Proposed change: ${short(noteRecord.change, 280)}`));
      if (noteRecord?.reason) section.append(el('p', '', `Author explanation: ${short(noteRecord.reason, 260)}`)); host.append(section);
    }
  } else host.append(el('h3', '', 'Before a saved map'), el('p', '', 'No saved candidate is associated with this record.'));
  const sources = state.data.coverage?.sources;
  host.append(el('p', 'source-read-status', sources?.directOriginalCaseRead === 'recorded' ? 'Direct original-case read: recorded.' : 'Direct original-case read: not recorded.'));
  for (const source of sourceCases()) {
    const item = el('div', 'source-room'), image = el('img'); image.src = './' + source.entry.thumbnail; image.alt = `Reference room ${source.caseId || source.entry.room}`; image.loading = 'lazy';
    const copy = el('div'); copy.append(el('div', 'eyebrow', 'INDIRECT SKILL SOURCE'), el('h4', '', `${source.caseId || source.entry.room} / ${source.entry.title}`));
    const link = el('a', 'text-link', 'Open source room \u2197'); link.href = playUrl(source.entry); link.target = '_blank'; link.rel = 'noopener'; copy.append(link); item.append(image, copy); host.append(item);
  }
}
function explanationPart(host, title, value) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return;
  const part = el('div', 'explanation-part'); part.append(el('h3', '', title));
  if (Array.isArray(value)) { const list = el('ul'); value.forEach(item => list.append(el('li', '', text(item)))); part.append(list); } else part.append(el('p', '', text(value))); host.append(part);
}
function renderExplanation(node, record, candidate) {
  const host = clear($('operation-explanation'));
  if (node.kind === 'candidate' && candidate && !candidate.preview?.levelPath) explanationPart(host, 'Saved candidate', `${candidate.id} is bound to this record, but an interactive 3D preview has not been published for that snapshot.`);
  if (node.kind === 'note' && record) { explanationPart(host, 'Design goal', record.goal); explanationPart(host, 'Proposed change', record.change); explanationPart(host, 'Public explanation', record.reason); explanationPart(host, 'Checks the author intended to run', record.expectedChecks); if (record.retrospective) explanationPart(host, 'Recording context', 'This explanation was recorded retrospectively.'); }
  else if (node.kind === 'operation' && record) { explanationPart(host, 'Execution status', record.scope); if (!record.resultNodeId) explanationPart(host, 'Test result', 'No separate test verdict is attached to this command. Completing a diagnostic does not mean the map passed.'); if (record.inputCandidateId || record.outputCandidateId) explanationPart(host, 'Saved input and output', record.inputCandidateId === record.outputCandidateId ? `The saved version remains ${record.inputCandidateId}. This operation did not save a new map version.` : `Input: ${record.inputCandidateId || 'not associated'}. Output: ${record.outputCandidateId || 'not associated'}.`); }
  else if (node.kind === 'record' && record) {
    explanationPart(host, 'Recorded step', record.scope);
    explanationPart(host, 'Saved observations', record.facts.map(fact => `${fact.label}: ${fact.value}`));
    explanationPart(host, 'Archived files', record.files.map(file => file.name));
  }
  else if (node.kind === 'candidate' && candidate) { const parentEdges = state.data.edges.filter(edge => edge.to === node.id && edge.kind === 'revision'); if (parentEdges.some(edge => edge.inferred)) explanationPart(host, 'Version order', 'This parent relationship is inferred from historical file order. It is not an observed causal sequence.'); }
  else if (node.kind === 'replay' && record && !exactReplayFor(node, record, candidate)) explanationPart(host, 'Replay availability', 'This event has no published replay artifact that matches its saved candidate and contract. Its recorded metadata is available below.');
  if (node.kind === 'test') explanationPart(host, record?.category === 'diagnostic' ? 'Diagnostic scope' : 'Test scope', record?.scope || 'This result applies only to its recorded scope and associated input.');
}
function renderChecks(node, record) {
  const host = clear($('operation-checks')), checks = record?.checks || []; host.hidden = node.kind !== 'test'; if (host.hidden) return;
  host.append(el('h3', '', 'RECORDED CHECKS'));
  const binding = record?.bindingBasis === 'command-boundaries-only' ? 'Associated at execution boundaries; the report does not declare input fingerprints.' : record?.bindingBasis === 'report-fingerprints-and-command-boundaries' ? 'Report fingerprints match the saved execution-boundary version.' : record?.binding === 'historical' ? 'Historical association. Original execution binding was not observed.' : record?.binding === 'observed-command-association' ? 'A recorded diagnostic execution outcome; this is not a formal mechanism verdict.' : 'Results retain the scope and input association of the saved report.';
  host.append(el('p', 'check-scope', binding));
  if (!checks.length) { host.append(el('p', 'check-scope', 'No individual checks were published for this record.')); return; }
  const list = el('ul', 'process-checks');
  for (const check of checks) { const status = check.status || 'unknown', item = el('li'), body = el('div', 'check-body', check.name || check.label || 'Unnamed check'); item.append(el('span', `check-mark ${status}`, status === 'passed' ? '+' : ['failed', 'error'].includes(status) ? 'x' : '?')); if (check.detail || check.details) { const detail = el('details'); detail.append(el('summary', '', 'Check detail'), el('pre', '', text(check.detail || check.details))); body.append(detail); } item.append(body); list.append(item); } host.append(list);
}
function relationButton(other, inferred) {
  const button = el('button', `relation-chip${inferred ? ' inferred' : ''}`); button.type = 'button'; button.dataset.nodeId = other.id; button.title = nodeTitle(other); button.append(el('span', '', nodeAction(other)), el('span', 'relation-arrow', '\u2197')); button.addEventListener('click', () => selectNode(other.id)); return button;
}
function renderRelations(node) {
  const host = clear($('operation-relations')), edges = state.data.edges.filter(edge => edge.from === node.id || edge.to === node.id);
  const groups = new Map();
  const titles = { revision: ['Next saved versions', 'Previous saved versions'], tested: ['Tests of this version', 'Version tested'], cites: ['Cited by public notes', 'References cited in this note'], annotation: ['Public notes on this version', 'Version associated with this note'], supports: ['Supported records', 'Supporting records'], produced: ['Produced records', 'Producing operation'], replay: ['Replay evidence', 'Version replayed'] };
  for (const edge of edges) { const outgoing = edge.from === node.id, other = byId(outgoing ? edge.to : edge.from); if (!other) continue; const title = titles[edge.kind]?.[outgoing ? 0 : 1] || `${edge.kind} / ${outgoing ? 'outgoing' : 'incoming'}`; if (!groups.has(title)) groups.set(title, []); groups.get(title).push({ edge, other }); }
  const candidate = candidateFor(node), linkedNodes = new Set([...groups.values()].flat().map(item => item.other.id));
  const record = recordFor(node);
  for (const [field, title] of [['relatedNodeId', node.eventType === 'command.started' ? 'Command completion' : 'Command start'], ['startNodeId', 'Command start'], ['resultNodeId', 'Recorded test result']]) {
    const other = byId(record?.[field]); if (other) groups.set(title, [{ edge: { kind: 'recorded-command-association', inferred: false }, other }]);
  }
  if (node.kind === 'note') {
    const cited = state.data.records.filter(item => item.files.some(file => record.sources.some(source => source.split('/').at(-1) === file.name)) && byId(item.graphNodeId)?.order <= node.order);
    if (cited.length) groups.set('Cited saved evidence', cited.map(item => ({ edge: { kind: 'explicit-filename-citation', inferred: false }, other: byId(item.graphNodeId) })));
  }
  if (node.kind === 'operation' && candidate) {
    const saved = state.data.records.filter(item => item.candidateId === candidate.id && item.eventType === 'artifact.saved');
    if (saved.length) groups.set(`Saved evidence for ${candidate.id}`, saved.map(item => ({ edge: { kind: 'recorded-candidate-association', inferred: false }, other: byId(item.graphNodeId) })));
  }
  if (candidate && node.kind !== 'candidate' && !linkedNodes.has(candidate.graphNodeId)) { const other = byId(candidate.graphNodeId); if (other) groups.set('Recorded version', [{ edge: { kind: 'recorded-candidate-association', inferred: false }, other }]); }
  if (node.kind === 'candidate' && candidate) {
    const replays = state.data.replays.map(record => ({ record, other: byId(record.graphNodeId) })).filter(item => item.other && exactReplayFor(item.other, item.record, candidate));
    if (replays.length) groups.set('Recorded replays', replays.map(({ other }) => ({ edge: { kind: 'exact-replay-binding', inferred: false }, other })));
  }
  host.hidden = !groups.size; if (!groups.size) return; host.append(el('h3', '', 'RELATED RECORDS'));
  for (const [title, relations] of groups) { const group = el('div', 'relation-group'), chips = el('div', 'relation-chips'); group.append(el('p', 'relation-caption', title)); for (const { edge, other } of relations) { const button = relationButton(other, edge.inferred); button.title = `${edge.kind}${edge.inferred ? ' (inferred)' : ''}: ${nodeTitle(other)}`; chips.append(button); } group.append(chips); host.append(group); }
}

function expandPreview() {
  if ($('preview-shell').hidden || !state.previewUrl || state.expanded) return;
  state.expanded = true; state.returnFocus = document.activeElement; state.previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  $('preview-modal').showModal(); ensurePreviewFrame(); $('close-preview').focus();
}
function closePreview({ restoreFocus = true } = {}) {
  if (!state.expanded) return;
  pausePreview(); state.expanded = false; $('preview-modal').close(); document.body.style.overflow = state.previousOverflow;
  if (restoreFocus && state.returnFocus?.isConnected) state.returnFocus.focus({ preventScroll: true });
}
function handleEscape(event) { if (event.key === 'Escape' && state.expanded) { event.preventDefault(); closePreview(); } }
function installInteractions() {
  $('previous-operation').addEventListener('click', () => { const i = state.nodes.findIndex(node => node.id === state.selectedId); if (i > 0) selectNode(state.nodes[i - 1].id, { focus: false }); });
  $('next-operation').addEventListener('click', () => { const i = state.nodes.findIndex(node => node.id === state.selectedId); if (i < state.nodes.length - 1) selectNode(state.nodes[i + 1].id, { focus: false }); });
  $('expand-preview').addEventListener('click', expandPreview); $('close-preview').addEventListener('click', closePreview); window.addEventListener('keydown', handleEscape);
  $('preview-modal').addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
  $('preview-modal').addEventListener('close', () => { if (state.expanded && !$('preview-modal').open) closePreview(); });
  $('preview-modal').addEventListener('click', event => {
    if (event.target !== $('preview-modal')) return;
    const rect = $('preview-modal').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePreview();
  });
  $('preview-image').addEventListener('error', () => { $('preview-image').hidden = true; $('preview-placeholder').hidden = false; });
  window.addEventListener('message', event => {
    const message = event.data, frame = $('preview-frame');
    if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow || message?.source !== 'mazebench-process-player' || message.caseId !== state.entry.id || message.candidateId !== state.previewCandidateId) return;
    if (message.type === 'ready') { $('preview-error').hidden = true; $('preview-status').textContent = state.previewMode === 'play' ? 'Playable map ready' : 'Recorded replay ready'; if (!state.expanded) pausePreview(); }
    else if (message.type === 'error') { $('preview-error').textContent = message.message || 'The saved preview could not be opened.'; $('preview-error').hidden = false; $('preview-status').textContent = 'Preview unavailable'; }
    else if (message.type === 'replay-state' && state.previewMode === 'replay') $('preview-status').textContent = message.total > 0 ? `Saved replay / ${message.step || 0} of ${message.total}${message.playing ? ' / playing' : message.status ? ' / ' + message.status : ' / paused'}` : 'Recorded replay ready';
  });
}

start().catch(error => showError(error));

function renderUsage(usage) {
  const host = clear($('build-usage')), values = usage?.observedTokens || {};
  const build = state.entry.build;
  const heading = el('div', 'usage-heading');
  const actions = el('div', 'usage-actions');
  actions.append(el('span', 'usage-status', ({measured:'Measured interval', partial:'Partial record', unavailable:'Usage not provided'})[usage?.status] || 'Usage not provided'));
  const downloads=el('div','build-downloads');
  for(const format of ['csv','json']) {
    const button=el('button','',format.toUpperCase()+' ↓'); button.type='button'; button.dataset.usageDownload=format;
    button.addEventListener('click',()=>downloadBuilds([state.entry],{format,name:state.entry.id+'-metrics',processes:new Map([[state.entry.id,state.data]])}));
    downloads.append(button);
  }
  actions.append(downloads); heading.append(el('h2', '', 'Build overview'), actions);
  const grid = el('dl', 'usage-metrics');
  const metric = (label, value) => { const cell = el('div', 'usage-metric'); cell.append(el('dt', '', label), el('dd', '', value ?? 'Not provided')); return cell; };
  grid.append(metric('Model', buildLabel(build)), metric('Reasoning setting', effortLabel(build)), metric('Client', clientLabel(usage?.runtime)), metric('Build wall time', duration(usage?.elapsedMs)), metric('Observed total tokens', tokenCount(values.total_tokens)));
  host.append(heading, grid);
  const meta=el('div','usage-session-line'); meta.append(el('span','',attributionLabel(build)));
  if(build?.startedAt) meta.append(el('span','',`Started ${buildDate(build.startedAt)}`));
  host.append(meta);
  const details = el('details', 'usage-details');
  details.append(el('summary', '', 'Token breakdown and provenance'));
  const columns = el('div', 'usage-detail-columns'), tokens = el('section'), sources = el('section');
  tokens.append(el('h3', '', 'Token breakdown'));
  const table = el('dl', 'usage-breakdown');
  for (const [key, label] of [['input_tokens', 'Input'], ['cached_input_tokens', 'Cached input'], ['cache_write_input_tokens', 'Cache write'], ['output_tokens', 'Output'], ['reasoning_output_tokens', 'Reasoning output']]) {
    const row = el('div'); row.append(el('dt', '', label), el('dd', '', tokenCount(values[key]))); table.append(row);
  }
  tokens.append(table, el('p', 'usage-caption', 'Cache counts are included in input. Reasoning counts are included in output.'));
  sources.append(el('h3', '', 'Runtime attribution'));
  if(build?.attributionNote) sources.append(el('p','usage-caption',build.attributionNote));
  if (!usage?.models?.length) sources.append(el('p', 'usage-caption', 'Model and provider not provided.'));
  for (const model of usage?.models || []) {
    const item = el('dl', 'usage-source');
    for (const [label, value] of [['Model ID', model.model], ['Provider', model.provider], ['Observed tokens', tokenCount(model.tokens?.total_tokens)]]) {
      const row = el('div'); row.append(el('dt', '', label), el('dd', '', value ?? 'Not provided')); item.append(row);
    }
    sources.append(item);
  }
  columns.append(tokens, sources); details.append(columns);
  details.append(el('p', 'usage-scope', usage?.scope || 'No runtime usage record was captured for this historical build. Missing values are not zero.'));
  details.append(el('p','usage-caption','Wall time covers the recorded interval. Local command records may include execution durations, but a complete breakdown into reading, design, tests and play is not recorded.'));
  host.append(details, el('p', 'usage-footnote', 'Wall time includes tools and waiting. Observed tokens are not a complete billed task total.'));
}
