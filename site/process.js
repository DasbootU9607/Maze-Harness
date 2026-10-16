import { loadCatalog, shell, playUrl, showError } from './ui.js';

const $ = id => document.getElementById(id);
const state = { data: null, catalog: null, entry: null, skill: null, nodes: [], selectedId: null, candidateId: null, previewCandidateId: null, previewKey: null, previewMode: null, expanded: false, returnFocus: null, previousOverflow: '', revisionBranches: [], keyNodeIds: new Set(), timelineGroups: [], nodeGroups: new Map() };
const kindNames = { resource: 'READ', candidate: 'VERSION', test: 'TEST', note: 'DESIGN NOTE', operation: 'OPERATION', replay: 'REPLAY', delivery: 'DELIVERY' };
const statusNames = { passed: 'Passed', failed: 'Failed', unknown: 'Unknown', error: 'Error' };
const resourceNames = { 'SKILL.md': 'Read skill instructions', 'mechanism-logic.md': 'Read extracted mechanism', 'planning-depth.md': 'Read planning guidance', 'complex-validation.md': 'Read verification guidance', 'design-template.json': 'Read design template', 'complex-runtime.cjs': 'Inspect mechanism runtime', 'verify-complex.cjs': 'Inspect the verifier', 'design.md': 'Read design conventions', 'browser-check.cjs': 'Inspect browser replay checks' };

function el(tag, cls, value) { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined && value !== null) node.textContent = String(value); return node; }
function clear(node) { node.replaceChildren(); return node; }
function text(value) { return typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value, null, 2); }
function short(value, max = 150) { const s = text(value); return s.length > max ? s.slice(0, max - 3) + '...' : s; }
function byId(id) { return state.nodes.find(node => node.id === id); }
function recordFor(node) {
  const key = { candidate: 'candidates', test: 'tests', note: 'notes', resource: 'resources', operation: 'operations', replay: 'replays' }[node.kind];
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
function nodeCategory(node) { const record = recordFor(node); if (node.kind === 'resource' && (record?.delivery === 'snapshot' || record?.origin === 'historical')) return 'SOURCE SNAPSHOT'; return record?.category === 'diagnostic' ? 'DIAGNOSTIC' : kindNames[node.kind] || String(node.kind).toUpperCase(); }
function nodeAction(node) {
  const record = recordFor(node), label = node.label || '', goal = record?.goal || label;
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
function classifyTimeline() {
  const keyIds = new Set(), seenReadKinds = new Set(), formalTests = new Map(); let firstNote = false;
  for (const node of state.nodes) {
    const record = recordFor(node);
    if (['candidate', 'replay', 'delivery'].includes(node.kind)) keyIds.add(node.id);
    if (node.kind === 'resource') {
      const category = resourceCategory(record);
      if (['Skill instructions', 'Extracted mechanism', 'Original case material'].includes(category) && !seenReadKinds.has(category)) { keyIds.add(node.id); seenReadKinds.add(category); }
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
  state.keyNodeIds = keyIds; state.timelineGroups = []; state.nodeGroups.clear(); let group = null;
  for (const node of state.nodes) {
    if (keyIds.has(node.id)) { group = null; continue; }
    if (!group) { group = { id: `group-${node.id}`, nodes: [], expanded: false }; state.timelineGroups.push(group); }
    group.nodes.push(node); state.nodeGroups.set(node.id, group);
  }
}

async function start() {
  shell('process');
  const catalog = await loadCatalog(), query = new URL(location.href).searchParams, entry = catalog.cases.find(item => item.id === query.get('case'));
  if (!entry?.process?.data) throw new Error('Choose a room with a published build process from the skill library.');
  if (!/^data\/processes\/[a-zA-Z0-9._-]+\.json$/.test(entry.process.data)) throw new Error('The process data path is invalid.');
  const response = await fetch('./' + entry.process.data); if (!response.ok) throw new Error('The published build record could not be loaded.');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('This build record uses an unsupported format.');
  state.data = { ...data, candidates: data.candidates || [], tests: data.tests || [], notes: data.notes || [], resources: data.resources || [], operations: data.operations || [], replays: data.replays || [] };
  state.catalog = catalog; state.entry = entry; state.skill = catalog.skills.find(skill => skill.id === data.skill || skill.id === entry.skill);
  state.nodes = data.nodes.map((node, index) => ({ ...node, sourceIndex: index })).sort((a, b) => (Number.isFinite(a.order) ? a.order : a.sourceIndex) - (Number.isFinite(b.order) ? b.order : b.sourceIndex));
  document.title = `${entry.title} - Build process - Maze Harness`;
  $('process-title').textContent = data.title || entry.title;
  $('process-summary').textContent = data.summary || 'Follow the recorded reads, revisions, checks, and replays behind this room.';
  $('play-room').href = playUrl(entry); $('process-data').href = './' + entry.process.data;
  $('skill-link').textContent = state.skill?.name || 'Skill library'; $('skill-link').href = state.skill ? './skill.html?id=' + encodeURIComponent(state.skill.id) : './index.html#skills';
  const mode = data.coverage?.mode || data.mode || 'unknown'; $('record-mode').textContent = mode === 'observed' ? 'OBSERVED RECORD' : mode === 'historical' ? 'HISTORICAL IMPORT' : 'PARTIAL RECORD'; $('record-mode').classList.toggle('historical', mode === 'historical');
  $('record-summary').textContent = `${state.data.candidates.length} versions / ${state.data.resources.length} recorded references / ${state.data.tests.length} test records`;
  classifyTimeline();
  $('timeline-count').textContent = `${state.keyNodeIds.size} key / ${state.nodes.length} total`;
  $('timeline-context').textContent = `${state.nodes.length - state.keyNodeIds.size} supporting records are grouped in their original order.${mode === 'historical' ? ' Original times are unknown.' : ''}`;
  $('coverage-description').textContent = data.coverage?.description || 'This view contains saved operations, references, maps, test outcomes, and public author explanations. It does not reconstruct unrecorded activity.';
  const limits = [...(data.coverage?.limitations || []), ...(data.limitations || []), data.coverage?.sources?.scope].filter(Boolean).map(text).filter((item, index, all) => all.indexOf(item) === index);
  limits.forEach(item => $('coverage-limitations').append(el('li', '', item)));
  renderTimeline(); installInteractions();
  const requested = byId(query.get('node')), requestedCandidate = state.data.candidates.find(candidate => candidate.id === query.get('candidate'));
  const firstCandidate = state.data.candidates.find(candidate => candidate.preview?.levelPath) || state.data.candidates[0];
  selectNode(requested?.id || requestedCandidate?.graphNodeId || firstCandidate?.graphNodeId || state.nodes[0]?.id, { initial: true, focus: Boolean(requested || requestedCandidate) });
}

function renderTimeline() {
  const timeline = clear($('process-timeline'));
  state.revisionBranches = recordedRevisionBranches();
  timeline.dataset.branchCount = String(state.revisionBranches.length);
  if (state.revisionBranches.length) {
    const layer = el('li', 'revision-layer'); layer.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'revision-branches'; svg.setAttribute('aria-hidden', 'true'); layer.append(svg); timeline.append(layer);
  }
  for (const node of state.nodes) {
    const group = state.nodeGroups.get(node.id); let parent = timeline;
    if (group) {
      if (group.nodes[0].id === node.id) {
        const container = el('li', 'timeline-group'), toggle = el('button', 'timeline-group-toggle'), events = el('ol', 'timeline-group-events'); container.dataset.groupId = group.id; toggle.type = 'button'; toggle.dataset.groupId = group.id; toggle.setAttribute('aria-expanded', String(group.expanded)); events.id = `events-${group.id}`; events.hidden = !group.expanded; toggle.setAttribute('aria-controls', events.id);
        const label = el('span', 'timeline-group-copy'), first = group.nodes[0], last = group.nodes[group.nodes.length - 1], failed = group.nodes.filter(item => ['failed', 'error'].includes(item.status)), diagnostics = failed.filter(item => recordFor(item)?.category === 'diagnostic');
        label.append(el('span', 'timeline-group-label', `${group.nodes.length} supporting ${group.nodes.length === 1 ? 'event' : 'events'}`));
        label.append(el('span', 'timeline-group-range', `Records ${first.order ?? first.sourceIndex + 1}${first.id === last.id ? '' : `–${last.order ?? last.sourceIndex + 1}`}`));
        if (failed.length) label.append(el('span', 'timeline-group-failures', diagnostics.length === failed.length ? `${diagnostics.length} failed diagnostic ${diagnostics.length === 1 ? 'process' : 'processes'}` : `${failed.length} failed ${failed.length === 1 ? 'event' : 'events'}`));
        const selected = el('span', 'timeline-group-selected', 'Selected event'); selected.hidden = true; label.append(selected);
        toggle.append(el('span', 'timeline-group-marker', '···'), label, el('span', 'timeline-group-action', group.expanded ? 'Hide' : 'Show')); toggle.addEventListener('click', () => toggleTimelineGroup(group.id, !group.expanded)); container.append(toggle, events); timeline.append(container);
      }
      parent = $(`events-${group.id}`);
    }
    const item = el('li', `timeline-item ${node.kind} ${node.status || ''}`), button = el('button', `timeline-node ${node.kind} ${node.status || ''}`); button.type = 'button'; button.dataset.nodeId = node.id; button.dataset.kind = node.kind; button.title = nodeTitle(node);
    button.dataset.keyEvent = String(state.keyNodeIds.has(node.id)); if (group) item.dataset.groupId = group.id;
    const body = el('span', 'timeline-body'), content = el('span', 'timeline-text');
    content.append(el('span', 'timeline-kind-inline', nodeCategory(node)), el('span', 'timeline-label', nodeAction(node))); body.append(content);
    if (node.kind === 'test' && statusNames[node.status]) body.append(el('span', `timeline-state ${node.status}`, recordFor(node)?.category === 'diagnostic' && node.status === 'failed' ? 'Process failed' : statusNames[node.status]));
    const circle = el('span', 'timeline-dot'), ring = el('span', 'timeline-ring'), dot = el('span', 'timeline-center');
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
    circle.append(ring, dot, el('span', 'timeline-number', String(node.order ?? node.sourceIndex + 1).padStart(2, '0')));
    button.append(el('span', 'timeline-kind', nodeCategory(node)), circle, el('span', 'timeline-connector'), body); button.addEventListener('click', () => selectNode(node.id)); item.append(button); parent.append(item);
  }
  requestAnimationFrame(renderRevisionBranches);
}
function toggleTimelineGroup(id, expanded) {
  const group = state.timelineGroups.find(item => item.id === id); if (!group) return;
  group.expanded = expanded; const toggle = [...$('process-timeline').querySelectorAll('.timeline-group-toggle')].find(button => button.dataset.groupId === id);
  $(`events-${id}`).hidden = !expanded; toggle.setAttribute('aria-expanded', String(expanded)); toggle.querySelector('.timeline-group-action').textContent = expanded ? 'Hide' : 'Show';
  if (!expanded && group.nodes.some(node => node.id === state.selectedId)) {
    toggle.focus({ preventScroll: true });
  }
  syncGroupSelection();
  requestAnimationFrame(renderRevisionBranches);
}
function syncGroupSelection() {
  for (const toggle of $('process-timeline').querySelectorAll('.timeline-group-toggle')) {
    const group = state.timelineGroups.find(item => item.id === toggle.dataset.groupId), containsSelection = !group.expanded && group.nodes.some(node => node.id === state.selectedId);
    toggle.classList.toggle('contains-selection', containsSelection); toggle.dataset.containsSelection = String(containsSelection);
    if (containsSelection) toggle.setAttribute('aria-current', 'step'); else toggle.removeAttribute('aria-current');
    toggle.querySelector('.timeline-group-selected').hidden = !containsSelection;
  }
}
function recordedRevisionBranches() {
  const candidates = new Map(state.data.candidates.map(candidate => [candidate.graphNodeId, candidate])), children = new Map();
  for (const edge of state.data.edges) {
    const parent = candidates.get(edge.from), child = candidates.get(edge.to);
    if (edge.kind !== 'revision' || edge.inferred !== false || !parent || !child || !Array.isArray(child.parentIds) || !child.parentIds.includes(parent.id)) continue;
    if (!children.has(parent.graphNodeId)) children.set(parent.graphNodeId, new Map());
    children.get(parent.graphNodeId).set(child.id, { from: parent.graphNodeId, to: child.graphNodeId });
  }
  return [...children.values()].filter(group => group.size > 1).flatMap(group => [...group.values()].map((edge, lane) => ({ ...edge, lane, laneCount: group.size })));
}
function renderRevisionBranches() {
  const svg = $('revision-branches'); if (!svg) return;
  const timeline = $('process-timeline'), rect = timeline.getBoundingClientRect(), circles = new Map();
  for (const button of timeline.querySelectorAll('.timeline-node')) {
    if (!button.getClientRects().length) continue;
    const circle = button.querySelector('.timeline-dot').getBoundingClientRect();
    circles.set(button.dataset.nodeId, { x: circle.left - rect.left + timeline.scrollLeft, y: circle.top - rect.top + timeline.scrollTop + circle.height / 2 });
  }
  clear(svg); svg.setAttribute('width', String(timeline.clientWidth)); svg.setAttribute('height', String(Math.max(timeline.clientHeight, ...[...circles.values()].map(circle => circle.y + 76))));
  for (const edge of state.revisionBranches) {
    const start = circles.get(edge.from), end = circles.get(edge.to); if (!start || !end) continue;
    const direction = end.y >= start.y ? 1 : -1, radius = Math.min(18, Math.abs(end.y - start.y) / 3), gap = Math.max(3, Math.min(16, parseFloat(getComputedStyle(timeline.querySelector('.timeline-kind')).paddingRight) - 2)), offset = 3 + (gap - 3) * edge.lane / Math.max(1, edge.laneCount - 1), lane = Math.max(3, Math.min(start.x, end.x) - offset);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.classList.add('revision-branch'); path.dataset.from = edge.from; path.dataset.to = edge.to; path.dataset.kind = 'revision';
    path.setAttribute('d', `M ${start.x} ${start.y} C ${lane} ${start.y} ${lane} ${start.y} ${lane} ${start.y + direction * radius} L ${lane} ${end.y - direction * radius} C ${lane} ${end.y} ${lane} ${end.y} ${end.x} ${end.y}`);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `Recorded revision: ${nodeAction(byId(edge.from))} to ${nodeAction(byId(edge.to))}`; path.append(title); svg.append(path);
  }
}
function selectNode(id, { initial = false, focus = true } = {}) {
  const node = byId(id); if (!node) return;
  if (state.expanded) closePreview(); state.selectedId = id;
  const group = state.nodeGroups.get(id); if (group && !group.expanded) toggleTimelineGroup(group.id, true);
  for (const button of $('process-timeline').querySelectorAll('.timeline-node')) { if (button.dataset.nodeId === id) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); }
  syncGroupSelection();
  const record = recordFor(node), candidate = candidateFor(node), index = state.nodes.indexOf(node);
  $('previous-operation').disabled = index === 0; $('next-operation').disabled = index === state.nodes.length - 1;
  const meta = clear($('operation-meta')); meta.append(el('span', '', nodeCategory(node)), el('span', '', `/ RECORD ${node.order ?? index + 1}`));
  if (candidate && node.kind !== 'candidate') meta.append(el('span', '', `/ ${candidate.id}`));
  if (statusNames[node.status] && node.kind !== 'test') meta.append(el('span', `status-label ${node.status}`, statusNames[node.status]));
  $('operation-title').textContent = nodeAction(node);
  let summary = '';
  if (node.kind === 'resource') summary = `${resourceCategory(record)} / ${record?.delivery === 'snapshot' || record?.origin === 'historical' ? 'Saved source snapshot' : 'Recorded file read'}`;
  else if (node.kind === 'candidate' && candidate) summary = diffText(candidate);
  else if (node.kind === 'test') { const checks = record?.checks || [], passed = checks.filter(check => check.status === 'passed').length; summary = record?.category === 'diagnostic' ? `Diagnostic process ${node.status || 'outcome unknown'}.` : `${statusNames[node.status] || 'Result unknown'}${checks.length ? ` · ${passed} of ${checks.length} checks passed` : ''}.`; }
  else if (node.kind === 'replay' && record) summary = `${record.frameCount || 0} saved frames · ${record.route?.length || 0} recorded inputs`;
  else if (node.kind === 'delivery') summary = node.summary || '';
  $('operation-summary').textContent = summary; $('operation-summary').hidden = !summary;
  renderPreview(node, record, candidate); renderSources(node, record); renderExplanation(node, record, candidate); renderChecks(node, record); renderRelations(node);
  const safeRecord = record ? Object.fromEntries(Object.entries(record).filter(([key]) => !['cells', 'diff'].includes(key))) : null;
  $('operation-evidence-body').textContent = JSON.stringify({ node: Object.fromEntries(Object.entries(node).filter(([key]) => key !== 'sourceIndex')), ...(safeRecord ? { record: safeRecord } : {}) }, null, 2); $('operation-evidence').open = false;
  const url = new URL(location.href); url.searchParams.set('node', node.id); if (candidate) url.searchParams.set('candidate', candidate.id); else url.searchParams.delete('candidate'); history.replaceState(null, '', url);
  if (!initial) $('operation-detail').scrollTop = 0;
  {
    const button = [...$('process-timeline').querySelectorAll('.timeline-node')].find(item => item.dataset.nodeId === id);
    if (button) { const list = $('process-timeline'), rect = button.getBoundingClientRect(), listRect = list.getBoundingClientRect(); if (rect.top < listRect.top || rect.bottom > listRect.bottom) list.scrollTop += rect.top - listRect.top - list.clientHeight / 3; if (focus) button.focus({ preventScroll: true }); }
  }
}

function exactReplayFor(node, record, candidate) {
  if (node.kind !== 'replay' || !record || !candidate?.preview?.levelPath) return null;
  const bound = candidate.preview.replay;
  if (!bound || record.binding !== 'exact-artifact' || bound.binding !== 'exact-artifact' || record.sourceKind !== 'saved-replay' || bound.sourceKind !== 'saved-replay') return null;
  if (record.candidateId !== candidate.id || bound.candidateId !== candidate.id) return null;
  if (!record.cellsSha256 || record.cellsSha256 !== candidate.cellsSha256 || bound.cellsSha256 !== candidate.cellsSha256 || !record.contractSha256 || record.contractSha256 !== candidate.contractSha256 || bound.contractSha256 !== candidate.contractSha256) return null;
  if (!record.data || record.data !== bound.data || !record.sha256 || record.sha256 !== bound.sha256 || !record.sourceSha256 || record.sourceSha256 !== bound.sourceSha256) return null;
  return record;
}
function renderPreview(node, record, candidate) {
  state.candidateId = candidate?.id || null;
  const replay = exactReplayFor(node, record, candidate), mode = node.kind === 'candidate' && candidate?.preview?.levelPath ? 'play' : replay ? 'replay' : null;
  const available = Boolean(mode); $('preview-shell').hidden = !available;
  if (!available) { $('preview-frame').contentWindow?.postMessage({ source: 'mazebench-process', type: 'pause' }, location.origin); return; }
  $('preview-title').textContent = mode === 'play' ? 'Playable map' : 'Recorded replay';
  const key = `${mode}:${candidate.id}:${replay?.id || ''}`;
  if (state.previewKey !== key) {
    state.previewKey = key; state.previewCandidateId = candidate.id; state.previewMode = mode; $('preview-status').textContent = 'Loading map...'; $('preview-error').hidden = true;
    $('preview-frame').title = mode === 'play' ? `Try saved version ${candidate.id}` : `Watch saved replay ${record.id}`;
    $('preview-frame').src = './process-player.html?' + new URLSearchParams({ case: state.entry.id, candidate: candidate.id, mode, ...(replay ? { replay: replay.id } : {}) });
  }
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
  else if (node.kind === 'operation' && record) { explanationPart(host, 'What this operation establishes', record.scope); if (record.inputCandidateId || record.outputCandidateId) explanationPart(host, 'Saved input and output', `Input: ${record.inputCandidateId || 'not associated'}. Output: ${record.outputCandidateId || 'not associated'}. These are recorded boundaries, not a reconstruction of intermediate in-memory states.`); }
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
  if (candidate && node.kind !== 'candidate' && !linkedNodes.has(candidate.graphNodeId)) { const other = byId(candidate.graphNodeId); if (other) groups.set('Recorded version', [{ edge: { kind: 'recorded-candidate-association', inferred: false }, other }]); }
  if (node.kind === 'candidate' && candidate) {
    const replays = state.data.replays.map(record => ({ record, other: byId(record.graphNodeId) })).filter(item => item.other && exactReplayFor(item.other, item.record, candidate));
    if (replays.length) groups.set('Recorded replays', replays.map(({ other }) => ({ edge: { kind: 'exact-replay-binding', inferred: false }, other })));
  }
  host.hidden = !groups.size; if (!groups.size) return; host.append(el('h3', '', 'RELATED RECORDS'));
  for (const [title, relations] of groups) { const group = el('div', 'relation-group'), chips = el('div', 'relation-chips'); group.append(el('p', 'relation-caption', title)); for (const { edge, other } of relations) { const button = relationButton(other, edge.inferred); button.title = `${edge.kind}${edge.inferred ? ' (inferred)' : ''}: ${nodeTitle(other)}`; chips.append(button); } group.append(chips); host.append(group); }
}

function expandPreview() {
  if ($('preview-shell').hidden || state.expanded) return;
  state.expanded = true; state.returnFocus = document.activeElement; state.previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; document.body.classList.add('preview-open');
  $('preview-shell').classList.add('expanded'); $('preview-shell').setAttribute('role', 'dialog'); $('preview-shell').setAttribute('aria-modal', 'true'); $('preview-backdrop').hidden = false; $('expand-preview').hidden = true; $('close-preview').hidden = false; $('close-preview').focus();
  $('preview-frame').contentWindow?.postMessage({ source: 'mazebench-process', type: 'orient' }, location.origin);
}
function closePreview() {
  if (!state.expanded) return;
  state.expanded = false; $('preview-shell').classList.remove('expanded'); $('preview-shell').removeAttribute('role'); $('preview-shell').removeAttribute('aria-modal'); $('preview-backdrop').hidden = true; $('expand-preview').hidden = false; $('close-preview').hidden = true; document.body.style.overflow = state.previousOverflow; document.body.classList.remove('preview-open'); state.returnFocus?.focus();
}
function handleEscape(event) { if (event.key === 'Escape' && state.expanded) { event.preventDefault(); closePreview(); } }
function installInteractions() {
  new ResizeObserver(renderRevisionBranches).observe($('process-timeline'));
  document.fonts?.ready.then(renderRevisionBranches);
  $('process-timeline').addEventListener('keydown', event => {
    const button = event.target.closest('.timeline-node'); if (!button) return;
    const index = state.nodes.findIndex(node => node.id === button.dataset.nodeId), next = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: state.nodes.length - 1 }[event.key];
    if (next === undefined) return; event.preventDefault();
    const selected = state.nodes[Math.max(0, Math.min(state.nodes.length - 1, next))]; selectNode(selected.id);
    [...$('process-timeline').querySelectorAll('.timeline-node')].find(item => item.dataset.nodeId === selected.id)?.focus({ preventScroll: true });
  });
  $('previous-operation').addEventListener('click', () => { const i = state.nodes.findIndex(node => node.id === state.selectedId); if (i > 0) selectNode(state.nodes[i - 1].id); });
  $('next-operation').addEventListener('click', () => { const i = state.nodes.findIndex(node => node.id === state.selectedId); if (i < state.nodes.length - 1) selectNode(state.nodes[i + 1].id); });
  $('expand-preview').addEventListener('click', expandPreview); $('close-preview').addEventListener('click', closePreview); $('preview-backdrop').addEventListener('click', closePreview); window.addEventListener('keydown', handleEscape);
  $('preview-frame').addEventListener('load', () => { try { $('preview-frame').contentWindow.addEventListener('keydown', handleEscape); } catch (_) { /* The iframe is expected to remain same-origin. */ } });
  window.addEventListener('message', event => {
    const message = event.data;
    if (event.origin !== location.origin || event.source !== $('preview-frame').contentWindow || message?.source !== 'mazebench-process-player' || message.caseId !== state.entry.id || message.candidateId !== state.previewCandidateId) return;
    if (message.type === 'ready') { $('preview-error').hidden = true; $('preview-status').textContent = state.previewMode === 'play' ? 'Playable map ready' : 'Recorded replay ready'; }
    else if (message.type === 'error') { $('preview-error').textContent = message.message || 'The saved preview could not be opened.'; $('preview-error').hidden = false; $('preview-status').textContent = 'Preview unavailable'; }
    else if (message.type === 'replay-state' && state.previewMode === 'replay') $('preview-status').textContent = message.total > 0 ? `Saved replay / ${message.step || 0} of ${message.total}${message.playing ? ' / playing' : message.status ? ' / ' + message.status : ' / paused'}` : 'Recorded replay ready';
  });
}

start().catch(error => showError(error));
