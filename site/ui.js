export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function loadCatalog() {
  const response = await fetch('./data/catalog.json');
  if (!response.ok) throw new Error('The room catalog could not be loaded.');
  return response.json();
}
export function shell(page) {
  const active = target => page === target ? ' aria-current="page"' : '';
  document.getElementById('site-header').innerHTML = `<div class="header-inner"><a class="brand" href="./index.html" aria-label="Maze Harness home"><img src="./assets/favicon.svg" alt="" width="27" height="27">maze harness</a><span class="header-slash" aria-hidden="true">/</span><span class="brand-subtitle">SPATIAL REASONING LAB</span><nav class="header-nav" aria-label="Main navigation"><a href="./index.html#skills"${active('skill')}>Skills</a><a href="./world.html"${active('world')}>World map</a><a href="./player.html"${active('player')}>Playground</a><a class="github-link" href="https://github.com/DasbootU9607/Maze-Harness">GitHub ↗</a></nav></div>`;
  const footer = document.getElementById('site-footer');
  if (footer) footer.innerHTML = `<div class="container footer-inner"><span class="mono">MAZE HARNESS <span class="dot-separator">/</span> Spatial reasoning, made playable.</span><div class="footer-links"><a href="https://github.com/mazebench/MazeBenchEngine">Built on MazeBench ↗</a><a href="./about.html">Sources & licenses</a><a href="https://github.com/DasbootU9607/Maze-Harness">GitHub ↗</a></div></div>`;
}
let toastTimer;
export function toast(message) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), 2300);
}
export function installCopy() {
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    try { await navigator.clipboard.writeText(button.dataset.copy); toast('Copied to clipboard'); }
    catch { toast('Select the command to copy it.'); }
  });
}
export function playUrl(entry, replay = false) {
  return './player.html?' + new URLSearchParams({ world: entry.world, room: entry.room, case: entry.id, ...(replay ? {replay:'1'} : {}) });
}
export function goalText(entry) {
  if (entry.goal?.kind === 'gem-and-return') return 'Collect the gem, then return to the doorway.';
  if (entry.goal?.kind === 'reach') return 'Open the passage and reach the target doorway.';
  return 'Find a way to collect the gem.';
}
export function caseCard(entry) {
  const e = escapeHtml;
  return `<article class="case-card"><a href="${playUrl(entry)}" aria-label="Play ${e(entry.title)}"><div class="case-preview"><img src="./${e(entry.thumbnail)}" alt="3D preview of ${e(entry.title)}" width="720" height="440" loading="lazy"><span class="preview-badge">${entry.kind === 'official' ? 'OFFICIAL / ' + entry.room : 'AGENT AUTHORED'}</span><span class="preview-play">↗ PLAY ROOM</span></div><div class="case-card-body"><h3>${e(entry.title)}</h3><p>${e(entry.description)} ${e(goalText(entry))}</p><div class="case-card-foot"><span class="play-link">Play room</span><span>${entry.witness?.length || 0} inputs in saved route</span></div></div></a><div class="case-secondary"><a href="${playUrl(entry, true)}">Watch solution ↗</a><a href="./${e(entry.map)}" download>Map ↓</a></div></article>`;
}
function silhouette(room) {
  const colors = room.skill ? ['#eee','#969696','#5c5c5c'] : ['#7f7f7f','#a4a4a4','#e3e3e3'];
  const paths = ['', '', ''];
  room.cells.forEach((row, y) => [...row].forEach((cell,x) => {
    const i = cell === '#' ? 0 : cell === 'b' ? 1 : cell === '~' ? 2 : -1;
    if (i >= 0) paths[i] += `M${x} ${y}h1v1h-1z`;
  }));
  return `<svg viewBox="0 0 ${room.cells[0].length} ${room.cells.length}" aria-hidden="true" shape-rendering="crispEdges">${paths.map((d,i) => `<path d="${d}" fill="${colors[i]}"/>`).join('')}</svg>`;
}
export function atlas(catalog, { mode = 'references', currentRoom = '' } = {}) {
  const letters = 'ABCDEFGHIJKLMNOP';
  const skills = new Map(catalog.skills.map(s => [s.id, s.name]));
  const rooms = new Map(catalog.rooms.map(r => [r.id, r]));
  let html = '<div class="atlas-grid"><span aria-hidden="true"></span>' + [...letters].map(l => `<span class="atlas-axis" aria-hidden="true">${l}</span>`).join('');
  for (const row of letters) {
    html += `<span class="atlas-axis" aria-hidden="true">${row}</span>`;
    for (const column of letters) {
      const id = column + 'x' + row;
      const room = rooms.get(id);
      const label = id + (room.skill ? ' — ' + skills.get(room.skill) : ' — Play room');
      const inner = silhouette(room) + `<span class="room-label">${id}</span>`;
      const classes = 'atlas-tile' + (room.skill ? ' used' : '') + (id === currentRoom ? ' current' : '');
      if (mode === 'select') html += `<button class="${classes}" data-room="${id}" title="${label}" aria-label="Go to ${id}"${id === currentRoom ? ' aria-current="true"' : ''}>${inner}</button>`;
      else {
        const href = room.skill ? './skill.html?id=' + room.skill : './player.html?world=maze&room=' + id;
        html += `<a class="${classes}" data-room="${id}" href="${href}" title="${label}" aria-label="${label}">${inner}</a>`;
      }
    }
  }
  return html + '</div>';
}
export function showError(error, target = document.getElementById('main')) {
  target.innerHTML = `<div class="error-state"><div class="eyebrow">MAZE HARNESS</div><h1>This page could not be opened.</h1><p>${escapeHtml(error.message)}</p><a class="button" href="./index.html">Back to the skill library →</a></div>`;
}
