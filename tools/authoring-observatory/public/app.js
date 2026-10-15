'use strict';
const $ = id => document.getElementById(id);
const state = {run: null, id: new URL(location.href).searchParams.get('run'), candidate: null, digest: null, busy: false};
const node = (tag, text, cls) => {const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el;};
const request = async url => {const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw new Error('Request failed: ' + r.status); return r.json();};
const base = () => '/api/runs/' + encodeURIComponent(state.id);
async function evidence(file) {
  const r = await fetch(base() + '/artifact?path=' + encodeURIComponent(file));
  if (!r.ok) throw new Error('Evidence unavailable');
  let text = await r.text(); try {text = JSON.stringify(JSON.parse(text), null, 2);} catch { /* Preserve text. */ }
  $('evidence-text').textContent = text; $('evidence').showModal();
}
function fileButton(file) {const b = node('button', 'Open saved evidence'); b.onclick = () => evidence(file).catch(showError); return b;}
function card(title, body, status) {const c = node('article', '', 'card'); c.append(node('strong', title)); if (status) c.append(node('p', status, 'status ' + status)); if (body) c.append(node('p', body)); return c;}
function showError(e) {$('connection').textContent = e.message;}
async function selectCandidate(id) {
  state.candidate = id;
  for (const b of $('versions').children) b.classList.toggle('selected', b.dataset.id === id);
  const candidate = state.run.candidates.find(c => c.id === id);
  $('tests').replaceChildren(); $('notes').replaceChildren();
  if (!candidate) {const ctx = $('map').getContext('2d'); ctx.clearRect(0, 0, 560, 560); $('version-title').textContent = 'No saved map yet'; $('diff').textContent = ''; return;}
  const spec = await request(base() + '/spec/' + encodeURIComponent(id));
  if (state.candidate !== id) return;
  $('version-title').textContent = id + ' / ' + candidate.label;
  $('diff').textContent = `Changes: ${candidate.diff?.added?.length || 0} added, ${candidate.diff?.removed?.length || 0} removed, ${candidate.diff?.changed?.length || 0} modified. SHA256 ${candidate.sha256}`;
  const cells = Array.isArray(spec.cells[0]) ? spec.cells.flatMap((row, y) => row.map((token, x) => ({x, y, token}))) : spec.cells;
  const ctx = $('map').getContext('2d'); ctx.clearRect(0, 0, 560, 560);
  const maxX = Math.max(15, ...cells.map(c => c.x)), maxY = Math.max(15, ...cells.map(c => c.y)), size = Math.min(540 / (maxX + 1), 540 / (maxY + 1));
  const colors = {'#':'#819387','.':'#e0e9da',p:'#307f6a',G:'#edc665',M0:'#7f9db8',M1:'#aa8bba',M2:'#bc8b75'};
  for (const c of cells) {const token = c.token ?? c.value; ctx.fillStyle = colors[token] || '#b5bdce'; ctx.fillRect(10 + c.x * size, 10 + c.y * size, size - 1, size - 1); if (token !== '#' && token !== '.') {ctx.fillStyle = '#152d27'; ctx.font = '11px system-ui'; ctx.fillText(String(token), 13 + c.x * size, 24 + c.y * size);}}
  for (const t of state.run.tests.filter(t => t.candidateId === id)) {const c = card(t.label || t.id, `${t.scope || ''} Binding: ${t.binding}.`, t.status); for (const check of t.checks || []) c.append(node('p', `${check.status}: ${check.name}`)); if (t.reportPath) c.append(fileButton(t.reportPath)); $('tests').append(c);}
  for (const n of state.run.notes.filter(n => !n.candidateId || n.candidateId === id)) $('notes').append(card(n.title || n.kind || n.id, n.summary || n.reason || JSON.stringify(n), 'agent statement'));
}
async function refresh() {
  if (state.busy) return; state.busy = true;
  try {
    const {runs} = await request('/api/runs');
    if (!runs.some(r => r.id === state.id)) {state.id = runs[0]?.id; state.candidate = null; state.digest = null;}
    $('runs').replaceChildren(...runs.map(r => {const o = node('option', `${r.title} (${r.status})`); o.value = r.id; return o;})); $('runs').value = state.id || '';
    $('connection').textContent = 'Live / ' + runs.length + ' tasks';
    if (!state.id) return;
    const run = await request(base()), digest = JSON.stringify(run);
    if (digest === state.digest) return; state.digest = digest; state.run = run;
    const url = new URL(location.href); url.searchParams.set('run', state.id); history.replaceState(null, '', url);
    $('title').textContent = run.manifest.title;
    $('summary').textContent = `${run.manifest.status} / ${run.candidates.length} versions / ${run.tests.length} tests / ${run.events.length} events`;
    $('coverage').textContent = run.coverage.description;
    $('versions').replaceChildren();
    for (const c of run.candidates) {const b = node('button', `${c.id} / ${c.label}`, 'card version'); b.dataset.id = c.id; b.onclick = () => selectCandidate(c.id).catch(showError); $('versions').append(b);}
    $('timeline').replaceChildren(...run.events.map(e => card('#' + e.seq + ' ' + e.type, `${e.at || 'Time not observed'} / ${e.origin}`)));
    $('resources').replaceChildren(...run.resources.map(r => {const c = card(r.kind, r.path + ' / ' + r.sha256); c.append(fileButton(r.artifactPath)); return c;}));
    await selectCandidate(run.candidates.some(c => c.id === state.candidate) ? state.candidate : run.candidates.at(-1)?.id);
  } catch (e) {showError(e);} finally {state.busy = false;}
}
$('close').onclick = () => $('evidence').close();
$('runs').onchange = () => {state.id = $('runs').value; state.digest = null; state.candidate = null; refresh();};
setInterval(refresh, 2500); refresh();
