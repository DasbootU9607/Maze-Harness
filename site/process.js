import { loadCatalog, shell, playUrl, showError } from './ui.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const state = { data: null, entry: null, selectedId: null, candidateId: null, parentId: null, layer: 0, positions: new Map(), nodeElements: new Map(), transform: { x: 0, y: 0, scale: 1 }, extent: { width: 800, height: 500 }, mapMeta: new Map() };
const names = { candidate: 'VERSION', test: 'TEST', note: 'PUBLIC NOTE', resource: 'RESOURCE', delivery: 'DELIVERY' };
const statusNames = { passed: 'Passed', failed: 'Failed', error: 'Error', unknown: 'Unknown', neutral: 'Saved' };
const mapColors = { '#': '#8d9a8e', '.': '#e3e9dd', p: '#3d8068', G: '#dfc066', M0: '#7e9bb2', M1: '#ad92b7', M2: '#ba977f', M3: '#7fa69a', M4: '#aca470' };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function clear(node) { node.replaceChildren(); return node; }
function text(value) { return typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value, null, 2); }
function truncate(value, length = 100) { const s = text(value); return s.length > length ? s.slice(0, length - 1) + '...' : s; }
function label(value) { return String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, c => c.toUpperCase()); }
function tag(value, kind = '') { return element('span', `process-tag ${kind}`, value); }
function sorted(nodes) { return [...nodes].sort((a, b) => (Number.isFinite(a.order) ? a.order : state.data.nodes.indexOf(a)) - (Number.isFinite(b.order) ? b.order : state.data.nodes.indexOf(b))); }
function byId(id) { return state.data.nodes.find(node => node.id === id); }
function recordFor(node) {
  const key = { candidate: 'candidates', test: 'tests', note: 'notes', resource: 'resources' }[node.kind];
  return key ? state.data[key].find(record => record.graphNodeId === node.id || record.id === node.id || (node.kind === 'candidate' && record.id === node.candidateId)) : null;
}
function candidateFor(node) {
  if (!node) return null;
  if (node.kind === 'candidate') return recordFor(node);
  const record = recordFor(node), id = record?.candidateId || node.candidateId || node.details?.candidateId;
  if (id) return state.data.candidates.find(candidate => candidate.id === id) || null;
  const direct = state.data.edges.filter(edge => edge.from === node.id || edge.to === node.id).map(edge => byId(edge.from === node.id ? edge.to : edge.from)).find(other => other?.kind === 'candidate');
  if (direct) return recordFor(direct);
  if (node.kind === 'resource') {
    const note = state.data.edges.filter(edge => edge.kind === 'cites' && (edge.from === node.id || edge.to === node.id)).map(edge => byId(edge.from === node.id ? edge.to : edge.from)).find(other => other?.kind === 'note');
    if (note) return candidateFor(note);
  }
  return null;
}
function parentsOf(candidate) {
  if (Array.isArray(candidate.parentIds)) return candidate.parentIds;
  if (candidate.parentId) return [candidate.parentId];
  return state.data.edges.filter(edge => edge.kind === 'revision' && edge.to === candidate.graphNodeId).map(edge => state.data.candidates.find(c => c.graphNodeId === edge.from)?.id).filter(Boolean);
}
function visibleNodes() {
  return state.data.nodes.filter(node => node.kind !== 'test' || $('show-tests').checked).filter(node => node.kind !== 'note' || $('show-notes').checked).filter(node => node.kind !== 'resource' || $('show-resources').checked);
}

async function start() {
  shell('process');
  const catalog = await loadCatalog();
  const caseId = new URL(location.href).searchParams.get('case');
  const entry = catalog.cases.find(item => item.id === caseId);
  if (!entry) throw new Error('Choose a room with a published build process from the skill library.');
  if (!entry.process?.data) throw new Error('This room does not have a published build process. Its saved map and solution remain available in the library.');
  if (!/^data\/processes\/[a-zA-Z0-9._-]+\.json$/.test(entry.process.data)) throw new Error('The published process data path is invalid.');
  const response = await fetch('./' + entry.process.data);
  if (!response.ok) throw new Error('The published build record could not be loaded.');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('This build record uses an unsupported data format.');
  state.data = { ...data, candidates: data.candidates || [], tests: data.tests || [], notes: data.notes || [], resources: data.resources || [] };
  state.entry = entry;
  const skill = catalog.skills.find(item => item.id === data.skill || item.id === entry.skill);
  document.title = `${entry.title} - Build process - Maze Harness`;
  $('process-title').textContent = data.title || entry.title;
  $('process-summary').textContent = data.summary || 'Follow the saved versions, tests, references, and public design notes behind this room.';
  $('play-room').href = playUrl(entry);
  $('process-data').href = './' + entry.process.data;
  $('skill-link').textContent = skill?.name || 'Skill library';
  $('skill-link').href = skill ? './skill.html?id=' + encodeURIComponent(skill.id) : './index.html#skills';
  const stats = clear($('process-stats'));
  for (const [number, name] of [[data.candidates?.length || 0, 'SAVED VERSIONS'], [data.tests?.length || 0, 'TEST RECORDS'], [data.notes?.length || 0, 'PUBLIC NOTES'], [data.resources?.length || 0, 'REFERENCES']]) {
    const item = element('div', 'process-stat'); item.append(element('strong', '', number), element('span', '', name)); stats.append(item);
  }
  const mode = data.coverage?.mode || data.mode || 'unknown', historical = mode === 'historical';
  const provenance = clear($('process-provenance')); provenance.append(tag(historical ? 'HISTORICAL IMPORT' : mode === 'observed' ? 'OBSERVED RECORD' : 'PARTIAL RECORD', mode), document.createTextNode(historical ? 'Original event times were not recorded. Dashed revision links reflect inferred file order, not observed causality.' : 'A public view of saved artifacts and declared relationships. Check the coverage notes for what was actually captured.'));
  $('coverage-description').textContent = data.coverage?.description || (historical ? 'Imported evidence preserves available prototypes and reports. Import order is not a reconstruction of the original production timeline.' : 'This record covers the saved versions, recorded checks, and explicitly supplied public explanations. Unrecorded activity remains unknown.');
  const limitations = [...(data.coverage?.limitations || []), ...(data.limitations || [])].map(text).filter((item, index, all) => all.indexOf(item) === index);
  const list = clear($('coverage-limitations')); limitations.forEach(item => list.append(element('li', '', item)));
  clear($('process-candidate'));
  for (const candidate of state.data.candidates) { const option = element('option', '', `${candidate.id} / ${truncate(candidate.label || candidate.id, 42)}`); option.value = candidate.id; $('process-candidate').append(option); }
  installInteractions(); renderGraph(); fitGraph();
  const requested = new URL(location.href).searchParams.get('node');
  const finalCandidate = state.data.candidates.find(c => c.id === data.finalCandidateId) || state.data.candidates.at(-1);
  selectNode(byId(requested)?.id || finalCandidate?.graphNodeId || state.data.nodes.at(-1)?.id);
}

function layout(nodes) {
  const positions = new Map(), candidates = sorted(nodes.filter(node => node.kind === 'candidate'));
  const nodeIds = new Set(nodes.map(node => node.id));
  const candidateById = new Map(state.data.candidates.map(candidate => [candidate.id, candidate]));
  const branchLanes = new Map(), firstChildren = new Map(); let nextBranch = 1;
  for (const node of candidates) {
    const candidate = recordFor(node), parents = candidate ? parentsOf(candidate) : [];
    if (!parents.length) branchLanes.set(node.id, 0);
    else {
      const parent = candidateById.get(parents[0]);
      const inherited = branchLanes.get(parent?.graphNodeId) || 0;
      if (parents.length > 1) branchLanes.set(node.id, Math.min(...parents.map(id => branchLanes.get(candidateById.get(id)?.graphNodeId) || 0)));
      else if (firstChildren.has(parents[0])) branchLanes.set(node.id, nextBranch++);
      else { branchLanes.set(node.id, inherited); firstChildren.set(parents[0], node.id); }
    }
  }
  const branchSpace = Math.max(0, ...branchLanes.values()) * 24;
  const laneNames = [...($('show-resources').checked ? ['resource'] : []), 'candidate', ...($('show-tests').checked ? ['test'] : []), ...($('show-notes').checked ? ['note'] : [])];
  const laneX = {}; let x = 35;
  for (const kind of laneNames) { laneX[kind] = x; x += 222 + (kind === 'candidate' ? branchSpace : 0); }
  laneX.delivery = laneX.candidate;
  const related = new Map();
  for (const node of nodes.filter(node => node.kind !== 'candidate')) {
    const candidate = candidateFor(node);
    related.set(node.id, candidate?.graphNodeId || null);
  }
  let y = 80;
  for (const node of candidates) {
    positions.set(node.id, { x: laneX.candidate + (branchLanes.get(node.id) || 0) * 24, y });
    const tests = nodes.filter(other => other.kind === 'test' && related.get(other.id) === node.id).length;
    const notes = nodes.filter(other => other.kind === 'note' && related.get(other.id) === node.id).length;
    y += Math.max(128, Math.max(tests, notes) * 72 + 36);
  }
  const laneNext = {};
  for (const kind of ['test', 'note', 'resource', 'delivery']) {
    for (const node of sorted(nodes.filter(other => other.kind === kind))) {
      const anchor = positions.get(related.get(node.id));
      const base = kind === 'delivery' ? y : anchor?.y || 80;
      const at = Math.max(base, laneNext[kind] || 80);
      positions.set(node.id, { x: laneX[kind] ?? laneX.candidate, y: at }); laneNext[kind] = at + 72;
    }
  }
  for (const node of nodes) if (!positions.has(node.id)) { positions.set(node.id, { x: laneX.candidate, y }); y += 75; }
  const height = Math.max(360, ...[...positions.values()].map(position => position.y + 75));
  return { positions, width: x, height, lanes: laneNames.map(kind => ({ kind, x: laneX[kind] })), edges: state.data.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)) };
}

function renderGraph() {
  const nodes = visibleNodes(), view = layout(nodes), world = clear($('graph-world'));
  state.positions = view.positions; state.extent = { width: view.width, height: view.height }; state.nodeElements.clear();
  $('graph-empty').hidden = Boolean(nodes.length);
  const defs = svg('defs');
  for (const kind of ['revision', 'tested', 'cites', 'annotation', 'supports']) {
    const marker = svg('marker', { id: `arrow-${kind}`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
    marker.append(svg('path', { d: 'M0 1L7 4L0 7', fill: 'none', stroke: kind === 'revision' ? '#566f66' : '#a6b3ab', 'stroke-width': 1.2 })); defs.append(marker);
  }
  world.append(defs);
  for (const lane of view.lanes) { world.append(svg('text', { x: lane.x + 16, y: 23, class: 'graph-lane-label' }, { candidate: 'SAVED VERSIONS', test: 'TEST EVIDENCE', note: 'PUBLIC NOTES', resource: 'SOURCE REFERENCES' }[lane.kind]), svg('line', { x1: lane.x, y1: 40, x2: lane.x, y2: view.height - 24, class: 'graph-lane-rule' })); }
  const edges = svg('g', { class: 'graph-edges' });
  for (const edge of view.edges) {
    const a = view.positions.get(edge.from), b = view.positions.get(edge.to);
    const sameLane = Math.abs(a.x - b.x) < 1 || edge.kind === 'revision';
    let path, tx, ty;
    if (sameLane) {
      const ay = a.y + 8, by = b.y - 10, mid = (ay + by) / 2;
      path = `M${a.x} ${ay}C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${by}`; tx = (a.x + b.x) / 2 + 8; ty = mid;
    } else {
      const forward = a.x < b.x, ax = forward ? a.x + 189 : a.x - 7, bx = forward ? b.x - 10 : b.x + 191, mid = (ax + bx) / 2;
      path = `M${ax} ${a.y}C${mid} ${a.y} ${mid} ${b.y} ${bx} ${b.y}`; tx = mid; ty = (a.y + b.y) / 2 - 6;
    }
    const line = svg('path', { d: path, class: `graph-edge ${edge.kind}${edge.inferred ? ' inferred' : ''}`, 'data-from': edge.from, 'data-to': edge.to, 'data-kind': edge.kind, 'marker-end': `url(#arrow-${['revision', 'tested', 'cites', 'annotation', 'supports'].includes(edge.kind) ? edge.kind : 'supports'})` });
    line.append(svg('title', {}, `${edge.kind}: ${byId(edge.from)?.label || edge.from} -> ${byId(edge.to)?.label || edge.to}${edge.inferred ? ' (inferred)' : ''}${edge.label ? ' / ' + edge.label : ''}`)); edges.append(line);
    if (edge.kind === 'revision') edges.append(svg('text', { x: tx, y: ty, class: 'graph-edge-label' }, edge.inferred ? 'inferred revision' : 'revision'));
  }
  world.append(edges);
  for (const node of nodes) {
    const point = view.positions.get(node.id), status = node.status || 'neutral';
    const group = svg('g', { class: `graph-node ${node.kind} ${status}`, transform: `translate(${point.x} ${point.y})`, 'data-node-id': node.id, 'data-kind': node.kind, tabindex: 0, role: 'button', 'aria-label': `${names[node.kind] || node.kind}: ${node.label || node.id}${node.kind === 'test' ? ', ' + (statusNames[status] || status) : ''}` });
    group.append(svg('title', {}, `${node.label || node.id}${node.summary ? '\n' + node.summary : ''}`), svg('rect', { x: 14, y: -29, width: 174, height: 58, class: 'node-card' }), svg('circle', { cx: 0, cy: 0, r: node.kind === 'candidate' ? 7.5 : 6, class: 'node-dot' }));
    if (node.kind === 'test') group.append(svg('text', { x: 0, y: 0, class: 'node-symbol' }, status === 'passed' ? '+' : status === 'failed' || status === 'error' ? 'x' : '?'));
    group.append(svg('text', { x: 25, y: -14, class: 'node-kind' }, names[node.kind] || String(node.kind).toUpperCase()), svg('text', { x: 25, y: 3, class: 'node-title' }, truncate(node.label || node.id, 26)), svg('text', { x: 25, y: 18, class: 'node-status' }, node.kind === 'test' ? statusNames[status] || status : node.kind === 'candidate' ? recordFor(node)?.id || node.id : truncate(node.summary || node.id, 31)));
    group.addEventListener('click', () => { if (!state.dragged) selectNode(node.id); });
    group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectNode(node.id); } });
    state.nodeElements.set(node.id, group); world.append(group);
  }
  updateSelection(); transformGraph();
}

function updateSelection() {
  for (const [id, node] of state.nodeElements) { node.classList.toggle('selected', id === state.selectedId); node.setAttribute('aria-pressed', id === state.selectedId ? 'true' : 'false'); }
  for (const edge of $('graph-world').querySelectorAll('.graph-edge')) edge.classList.toggle('emphasized', edge.getAttribute('data-from') === state.selectedId || edge.getAttribute('data-to') === state.selectedId);
}
function transformGraph() { const t = state.transform; $('graph-world').setAttribute('transform', `translate(${t.x} ${t.y}) scale(${t.scale})`); $('zoom-level').textContent = `${Math.round(t.scale * 100)}%`; }
function fitGraph() {
  const rect = $('graph-viewport').getBoundingClientRect(), scale = Math.min((rect.width - 32) / state.extent.width, (rect.height - 24) / state.extent.height, 1.1);
  state.transform = { scale: Math.max(.08, scale), x: (rect.width - state.extent.width * scale) / 2, y: 15 }; transformGraph();
}
function zoom(factor, point) {
  const rect = $('graph-viewport').getBoundingClientRect(), x = point?.x ?? rect.width / 2, y = point?.y ?? rect.height / 2, t = state.transform, scale = Math.max(.08, Math.min(2.5, t.scale * factor)), ratio = scale / t.scale;
  state.transform = { x: x - (x - t.x) * ratio, y: y - (y - t.y) * ratio, scale }; transformGraph();
}

function selectNode(id) {
  const node = byId(id); if (!node) return;
  state.selectedId = id;
  const hiddenControl = { resource: 'show-resources', note: 'show-notes', test: 'show-tests' }[node.kind];
  if (hiddenControl && !$(hiddenControl).checked) { $(hiddenControl).checked = true; renderGraph(); fitGraph(); }
  updateSelection(); renderDetails(node);
  const candidate = candidateFor(node); if (candidate) selectCandidate(candidate.id);
  const url = new URL(location.href); url.searchParams.set('node', node.id); history.replaceState(null, '', url);
}

function renderDetails(node) {
  const host = clear($('node-detail')), record = recordFor(node), candidate = candidateFor(node), status = node.status || 'neutral';
  const heading = element('div'); heading.append(tag(record?.category === 'diagnostic' ? 'DIAGNOSTIC' : names[node.kind] || node.kind)); if (node.kind === 'test') heading.append(document.createTextNode(' '), tag(statusNames[status] || status, status)); host.append(heading, element('h3', '', node.label || node.id));
  if (node.summary) host.append(element('p', '', node.summary));
  if (node.kind === 'note') host.append(element('p', 'node-note', 'A public author statement. It is distinct from an observed action or an independently supported test result.'));
  if (node.kind === 'resource') host.append(element('p', 'node-note', 'A saved reference or supplied source. Its presence does not establish reading, understanding, or use of a mechanism.'));
  if (node.kind === 'test') host.append(element('p', 'node-note', 'A result applies to its stated input binding and check scope. Solvability, mechanism necessity, and human difficulty are separate claims.'));
  const dl = element('dl');
  const fields = { ...(node.details || {}) };
  if (record) for (const key of ['goal', 'change', 'reason', 'expectedChecks', 'sources', 'displayPath', 'basename', 'sha256', 'cellsSha256', 'contractSha256', 'category', 'scope', 'binding', 'bindingBasis', 'origin', 'retrospective']) if (record[key] !== undefined && fields[key] === undefined) fields[key] = record[key];
  if (node.at !== undefined) fields.recordedTime = node.at || 'Unknown; not reconstructed';
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || ['cells', 'diff', 'checks'].includes(key)) continue;
    dl.append(element('dt', '', label(key)), element('dd', '', Array.isArray(value) && value.every(item => typeof item === 'string') ? value.join('\n') : text(value)));
  }
  host.append(dl);
  if (record?.checks?.length) host.append(checkList(record.checks));
  if (candidate) { const button = element('button', 'button', `Inspect ${candidate.id} map`); button.type = 'button'; button.addEventListener('click', () => { selectCandidate(candidate.id); $('map-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }); host.append(button); }
  const relations = state.data.edges.filter(edge => edge.from === node.id || edge.to === node.id);
  if (relations.length) {
    const section = element('div', 'node-relationships'); section.append(element('h4', '', 'SAVED RELATIONSHIPS'));
    for (const edge of relations) {
      const outgoing = edge.from === node.id, otherId = outgoing ? edge.to : edge.from, other = byId(otherId);
      if (!other) continue;
      const button = element('button', 'relationship-button'); button.type = 'button'; button.append(element('span', '', `${edge.kind}${edge.inferred ? ' / inferred' : ''}${outgoing ? ' / outgoing' : ' / incoming'}`), document.createTextNode(other.label || other.id)); button.addEventListener('click', () => selectNode(otherId)); section.append(button);
    }
    host.append(section);
  }
  const raw = element('details'); raw.append(element('summary', '', 'Published node data'), element('pre', '', JSON.stringify(node, null, 2))); host.append(raw);
}

function selectCandidate(id) {
  const candidate = state.data.candidates.find(item => item.id === id); if (!candidate) return;
  const changed = state.candidateId !== id; state.candidateId = id; $('process-candidate').value = id;
  const parents = parentsOf(candidate).map(parentId => state.data.candidates.find(item => item.id === parentId)).filter(Boolean);
  if (changed || !parents.some(parent => parent.id === state.parentId)) state.parentId = parents[0]?.id || null;
  clear($('process-parent'));
  if (!parents.length) { const option = element('option', '', 'No recorded parent'); option.value = ''; $('process-parent').append(option); }
  else for (const parent of parents) { const option = element('option', '', parent.id); option.value = parent.id; $('process-parent').append(option); }
  $('process-parent').disabled = !parents.length; $('process-parent').value = state.parentId || '';
  const parent = state.data.candidates.find(item => item.id === state.parentId);
  const layers = [...new Set([...normalizeCells(candidate.cells), ...normalizeCells(parent?.cells)].map(cell => cell.z))].sort((a, b) => a - b);
  if (!layers.includes(state.layer)) state.layer = layers[0] || 0;
  clear($('process-layer')); for (const layer of layers.length ? layers : [0]) { const option = element('option', '', `z=${layer}`); option.value = layer; $('process-layer').append(option); } $('process-layer').value = state.layer;
  $('candidate-map-title').textContent = `${candidate.id} / ${candidate.label || 'Saved candidate'}`;
  $('parent-map-title').textContent = parent ? `${parent.id} / ${parent.label || 'Recorded parent'}` : '';
  const edge = state.data.edges.find(item => item.kind === 'revision' && item.from === parent?.graphNodeId && item.to === candidate.graphNodeId);
  $('map-provenance').textContent = `Cells SHA256: ${candidate.cellsSha256 || 'not recorded'}${edge?.inferred ? ' / Parent order inferred from historical files.' : parents.length > 1 ? ` / ${parents.length} explicit saved parents.` : ''}`;
  drawMaps(); renderTests(candidate);
}

function normalizeCells(raw) {
  const cells = raw || []; if (!Array.isArray(cells)) return [];
  if (cells[0] && typeof cells[0] === 'object' && !Array.isArray(cells[0])) return cells.map(cell => ({ x: Number(cell.x), y: Number(cell.y), z: Number(cell.z || 0), token: String(cell.token ?? cell.value ?? '') })).filter(cell => [cell.x, cell.y, cell.z].every(Number.isFinite));
  return cells.flatMap((rawRow, y) => {
    const row = typeof rawRow === 'string' ? (/\s/.test(rawRow.trim()) ? rawRow.trim().split(/\s+/) : [...rawRow]) : rawRow;
    return Array.isArray(row) ? row.map((token, x) => ({ x, y, z: 0, token: String(token) })) : [];
  });
}
function mapDiff(before, after) {
  const map = cells => new Map(cells.map(cell => [`${cell.x},${cell.y},${cell.z}`, cell]));
  const a = map(before), b = map(after), diff = { added: [], removed: [], changed: [] };
  for (const [key, cell] of b) { if (!a.has(key)) diff.added.push(cell); else if (a.get(key).token !== cell.token) diff.changed.push(cell); }
  for (const [key, cell] of a) if (!b.has(key)) diff.removed.push(cell);
  return diff;
}
function visibleToken(token) { return String(token).split('+').filter(Boolean).at(-1) || '.'; }
function drawMaps() {
  const candidate = state.data?.candidates.find(item => item.id === state.candidateId), parent = state.data?.candidates.find(item => item.id === state.parentId);
  const after = normalizeCells(candidate?.cells), before = normalizeCells(parent?.cells), combined = [...after, ...before].filter(cell => cell.z === state.layer);
  $('parent-map-frame').hidden = !parent;
  const bounds = { minX: Math.min(0, ...combined.map(cell => cell.x)), minY: Math.min(0, ...combined.map(cell => cell.y)), maxX: Math.max(15, ...combined.map(cell => cell.x)), maxY: Math.max(15, ...combined.map(cell => cell.y)) };
  const diff = parent ? mapDiff(before, after) : { added: [], removed: [], changed: [] };
  drawMap($('candidate-map-canvas'), after, bounds, diff, false); if (parent) drawMap($('parent-map-canvas'), before, bounds, diff, true);
  const summary = clear($('process-diff'));
  if (parent) { for (const [key, name] of [['added', 'added'], ['removed', 'removed'], ['changed', 'changed']]) summary.append(element('span', key, `${diff[key].length} ${name}`)); if (!diff.added.length && !diff.removed.length && !diff.changed.length) summary.append(element('span', '', 'Cells unchanged; declarations may differ.')); }
  else summary.append(element('span', '', candidate ? 'First available version; no parent comparison.' : 'No saved candidate map.'));
  const legend = clear($('process-map-legend'));
  for (const token of [...new Set(after.map(cell => visibleToken(cell.token)))].filter(token => token !== '.').slice(0, 12)) {
    const item = element('span'), swatch = element('i'); swatch.style.backgroundColor = mapColors[token] || '#a9b9b1'; item.append(swatch, document.createTextNode({ '#': 'Wall', p: 'Player', G: 'Gem' }[token] || token)); legend.append(item);
  }
}
function drawMap(canvas, cells, bounds, diff, previous) {
  const width = canvas.clientWidth || 350, dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(width * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, width);
  const padding = 18, cols = bounds.maxX - bounds.minX + 1, rows = bounds.maxY - bounds.minY + 1, size = Math.min((width - padding - 3) / cols, (width - padding - 3) / rows), ox = padding, oy = padding;
  const map = new Map(cells.filter(cell => cell.z === state.layer).map(cell => [`${cell.x},${cell.y}`, cell]));
  ctx.font = `${Math.max(5, Math.min(8, size * .35))}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#97a08f';
  for (let x = bounds.minX; x <= bounds.maxX; x++) ctx.fillText(x, ox + (x - bounds.minX + .5) * size, oy - 8);
  for (let y = bounds.minY; y <= bounds.maxY; y++) ctx.fillText(y, ox - 10, oy + (y - bounds.minY + .5) * size);
  for (let y = bounds.minY; y <= bounds.maxY; y++) for (let x = bounds.minX; x <= bounds.maxX; x++) {
    const cell = map.get(`${x},${y}`), token = cell ? visibleToken(cell.token) : '', px = ox + (x - bounds.minX) * size, py = oy + (y - bounds.minY) * size, inset = Math.max(.6, size * .03);
    ctx.fillStyle = cell ? mapColors[token] || '#a9b9b1' : '#edf0e9'; ctx.fillRect(px + inset, py + inset, size - 2 * inset, size - 2 * inset);
    if (token === 'p') { ctx.fillStyle = '#f3fff4'; ctx.beginPath(); ctx.arc(px + size / 2, py + size / 2, size * .2, 0, Math.PI * 2); ctx.fill(); }
    else if (token === 'G') { ctx.fillStyle = '#fff4c2'; ctx.beginPath(); ctx.moveTo(px + size / 2, py + size * .23); ctx.lineTo(px + size * .75, py + size / 2); ctx.lineTo(px + size / 2, py + size * .77); ctx.lineTo(px + size * .25, py + size / 2); ctx.closePath(); ctx.fill(); }
    else if (token && token !== '.' && token !== '#') { ctx.fillStyle = '#fff'; ctx.font = `500 ${Math.max(5, Math.min(11, size * .35))}px monospace`; ctx.fillText(token, px + size / 2, py + size / 2); }
  }
  for (const [key, color] of [['added', '#41905f'], ['removed', '#c17561'], ['changed', '#b69a4a']]) {
    if ((previous && key === 'added') || (!previous && key === 'removed')) continue;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.3, size * .075);
    for (const cell of diff[key]) if (cell.z === state.layer) ctx.strokeRect(ox + (cell.x - bounds.minX) * size + 1.6, oy + (cell.y - bounds.minY) * size + 1.6, size - 3.2, size - 3.2);
  }
  state.mapMeta.set(canvas.id, { ox, oy, size, bounds, map });
}

function checkList(checks) {
  const list = element('ul', 'process-checks');
  for (const check of checks) {
    const status = check.status || 'unknown', item = element('li'), body = element('span', '', check.name || check.label || 'Unnamed check');
    if (check.detail || check.details) body.append(element('span', 'check-detail', text(check.detail || check.details)));
    item.append(element('span', `check-status ${status}`, status === 'passed' ? '+' : status === 'failed' || status === 'error' ? 'x' : '?'), body); list.append(item);
  }
  return list;
}
function renderTests(candidate) {
  const host = clear($('candidate-tests')), tests = state.data.tests.filter(test => test.candidateId === candidate.id); $('check-count').textContent = `${tests.length} records / ${candidate.id}`;
  if (!tests.length) { host.append(element('p', 'process-empty', 'No published test record is associated with this version. This does not establish that no testing took place.')); return; }
  for (const test of tests) {
    const card = element('article', 'process-test'); card.dataset.testId = test.id;
    const header = element('div', 'process-test-heading'); header.append(element('h3', '', test.label || test.id), tag(statusNames[test.status] || 'Unknown', test.status || 'unknown')); card.append(header);
    if (test.scope) card.append(element('p', '', text(test.scope)));
    let binding = { exact: 'Recorder-associated input version.', historical: 'Historical association; original execution binding was not observed.', mismatch: 'Input fingerprints do not match the associated version.', missing: 'Input version binding is missing.', 'observed-command-association': 'Recorded diagnostic command associated with this version; this is not a formal verification result.' }[test.binding] || text(test.binding);
    if (test.bindingBasis === 'command-boundaries-only') binding = 'Associated at execution boundaries; the report does not declare input fingerprints.';
    if (test.bindingBasis === 'report-fingerprints-and-command-boundaries') binding = 'Report fingerprints match the version captured at execution boundaries.';
    if (binding) card.append(element('p', 'binding-note', binding));
    if (test.checks?.length) card.append(checkList(test.checks));
    if (test.graphNodeId && byId(test.graphNodeId)) { const button = element('button', 'text-link', 'Inspect this test in the graph'); button.type = 'button'; button.addEventListener('click', () => { selectNode(test.graphNodeId); $('process-graph').scrollIntoView({ behavior: 'smooth', block: 'center' }); }); card.append(button); }
    host.append(card);
  }
}

function installInteractions() {
  $('zoom-in').addEventListener('click', () => zoom(1.25)); $('zoom-out').addEventListener('click', () => zoom(.8)); $('fit-graph').addEventListener('click', fitGraph);
  for (const id of ['show-tests', 'show-notes', 'show-resources']) $(id).addEventListener('change', () => { renderGraph(); fitGraph(); });
  $('process-candidate').addEventListener('change', () => { const candidate = state.data.candidates.find(item => item.id === $('process-candidate').value); if (candidate?.graphNodeId) selectNode(candidate.graphNodeId); else if (candidate) selectCandidate(candidate.id); });
  $('process-parent').addEventListener('change', () => { state.parentId = $('process-parent').value; selectCandidate(state.candidateId); });
  $('process-layer').addEventListener('change', () => { state.layer = Number($('process-layer').value); drawMaps(); });
  const viewport = $('graph-viewport'); let pointer = null;
  viewport.addEventListener('wheel', event => { event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(Math.exp(-event.deltaY * .0013), { x: event.clientX - rect.left, y: event.clientY - rect.top }); }, { passive: false });
  viewport.addEventListener('pointerdown', event => { if (event.button !== 0) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: state.transform.x, originY: state.transform.y }; state.dragged = false; });
  viewport.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { state.dragged = true; viewport.classList.add('dragging'); viewport.setPointerCapture(event.pointerId); }
    if (state.dragged) { state.transform.x = pointer.originX + dx; state.transform.y = pointer.originY + dy; transformGraph(); }
  });
  const release = () => { pointer = null; viewport.classList.remove('dragging'); setTimeout(() => { state.dragged = false; }, 0); };
  viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release); viewport.addEventListener('pointerleave', () => { if (!state.dragged) pointer = null; });
  for (const id of ['candidate-map-canvas', 'parent-map-canvas']) $(id).addEventListener('mousemove', event => {
    const meta = state.mapMeta.get(id); if (!meta) return; const rect = $(id).getBoundingClientRect(), x = Math.floor((event.clientX - rect.left - meta.ox) / meta.size) + meta.bounds.minX, y = Math.floor((event.clientY - rect.top - meta.oy) / meta.size) + meta.bounds.minY;
    if (x >= meta.bounds.minX && x <= meta.bounds.maxX && y >= meta.bounds.minY && y <= meta.bounds.maxY) $('map-cell-info').textContent = `(${x},${y},${state.layer}) ${meta.map.get(`${x},${y}`)?.token || 'undefined'}`;
  });
  let timer; window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => { drawMaps(); fitGraph(); }, 120); });
}

start().catch(error => showError(error));
