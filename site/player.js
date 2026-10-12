import { loadCatalog, shell, atlas, escapeHtml, goalText, toast } from './ui.js';
import { withDirectEntry } from './room-entry.js';
shell('player');
const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
if (capture) document.body.classList.add('capture');
const status = message => { document.getElementById('game-status').textContent = message; };
const app = () => window.__MAZEBENCH_APP__;
let catalog, world, selectedCase, changingRoom = false, replayToken = 0, replaying = false;
const dialog = document.getElementById('room-dialog');
const letters = 'ABCDEFGHIJKLMNOP';
const vectors = { U: [0,-1], D: [0,1], L: [-1,0], R: [1,0] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function idle(timeout = 20000) {
  const until = performance.now() + timeout;
  await pause(35);
  while (app()?.isAnimating || app()?.isTransitioningLevel) {
    if (performance.now() > until) throw new Error('The room is taking too long to finish its move. Try resetting it.');
    await pause(20);
  }
}
function stopReplay() {
  replayToken++;
  replaying = false;
  document.getElementById('replay').innerHTML = 'Watch saved solution <span>▷</span>';
}
function currentRoom() { return app()?.currentLevelId?.replace('level_', '') || params.get('room') || 'HxI'; }
function normalizeRoom(value) {
  const match = /^([a-p])[x×]([a-p])$/i.exec(value.trim());
  return match ? match[1].toUpperCase() + 'x' + match[2].toUpperCase() : null;
}
function updateRoomUi() {
  const room = currentRoom();
  const preferred = params.get('case');
  selectedCase = catalog.cases.find(c => c.id === preferred && c.world === world && c.room === room) || catalog.cases.find(c => c.world === world && c.room === room);
  const generated = world !== 'maze';
  document.getElementById('room-title').textContent = generated ? selectedCase?.title || 'Agent-authored room' : 'The complete maze.';
  document.title = (generated ? selectedCase?.title : 'Room ' + room) + ' — Maze Harness';
  document.getElementById('room-label').textContent = generated ? 'AGENT AUTHORED / ' + room : 'ROOM ' + room;
  document.getElementById('room-input').value = room;
  document.getElementById('official-navigation').hidden = generated;
  document.getElementById('objective').textContent = selectedCase ? goalText(selectedCase) : 'Explore the room, collect its gems, and walk through a doorway to continue into the neighboring room.';
  document.getElementById('solution-controls').hidden = !selectedCase?.witness;
  const back = document.getElementById('skill-back');
  const reference = document.getElementById('reference-skill');
  if (selectedCase) {
    const skill = catalog.skills.find(s => s.id === selectedCase.skill);
    back.href = './skill.html?id=' + skill.id;
    back.textContent = '← ' + skill.name;
    reference.href = back.href;
    reference.hidden = false;
    document.getElementById('replay-caption').textContent = selectedCase.witness.length + ' inputs in the saved route. Not necessarily the shortest.';
  } else { back.href = './world.html'; back.textContent = 'Explore the world map ↗'; reference.hidden = true; }
  const url = new URL(location.href);
  url.searchParams.set('world', world);
  url.searchParams.set('room', room);
  url.searchParams.delete('replay');
  if (selectedCase) url.searchParams.set('case', selectedCase.id); else url.searchParams.delete('case');
  history.replaceState(null, '', url);
  document.querySelectorAll('[data-room]').forEach(tile => {
    const current = tile.dataset.room === room;
    tile.classList.toggle('current', current);
    if (current) tile.setAttribute('aria-current', 'true'); else tile.removeAttribute('aria-current');
  });
}
async function switchRoom(room) {
  if (changingRoom || !app()) return;
  const id = normalizeRoom(room);
  if (!id || !catalog.rooms.some(r => r.id === id)) { toast('Use coordinates from AxA to PxP, such as HxH.'); return; }
  changingRoom = true;
  stopReplay();
  dialog.close();
  window.__MAZEBENCH_INPUT_LOCKED__ = true;
  status('Opening room ' + id + '…');
  try {
    await idle();
    const data = withDirectEntry(await app().loadLevelState('level_' + id), catalog);
    app().applyLevelState(data, { immediateCamera: true, resetHistory: true, resetLevelEntry: true, updateUrl: true });
    await app().threeRenderer?.whenLevelStateModelsReady?.(data);
    updateRoomUi();
    status(data.directEntry ? 'Room ' + id + ' · Entered at the open boundary from ' + data.directEntry.fromRoom : 'Room ' + id + ' · Arrow keys to move · Z to undo · R to reset');
    document.getElementById('maze-canvas').focus({ preventScroll: true });
  } catch (error) { status(error.message); toast('Could not open the room. Please try again.'); }
  finally { changingRoom = false; window.__MAZEBENCH_INPUT_LOCKED__ = false; }
}
async function replay() {
  if (replaying) { stopReplay(); status('Solution paused. Continue playing from here.'); return; }
  if (!selectedCase?.witness) return;
  await idle();
  const entry = selectedCase;
  const token = ++replayToken;
  replaying = true;
  document.getElementById('replay').textContent = 'Pause solution Ⅱ';
  try {
    // Reload the source state so a solution always starts from the original pose.
    const data = await app().loadLevelState('level_' + entry.room);
    if (token !== replayToken) return;
    app().applyLevelState(data, { immediateCamera: true, resetHistory: true, resetLevelEntry: true, updateUrl: false });
    for (let i = 0; i < entry.witness.length; i++) {
      await idle();
      if (token !== replayToken) return;
      status('Saved solution · ' + (i + 1) + ' / ' + entry.witness.length + ' · ' + entry.witness[i]);
      app().movePlayers(...vectors[entry.witness[i]]);
      await pause(160);
    }
    await idle();
    if (token === replayToken) { stopReplay(); status('Saved solution complete. Reset the room to try it yourself.'); }
  } catch (error) { stopReplay(); status(error.message); }
}
function loadScript(name) {
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = './runtime/' + name + '.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the game engine. Please reload the page.'));
    document.head.append(script);
  });
}
try {
  catalog = await loadCatalog();
  world = params.get('world') || 'maze';
  const knownWorlds = new Set(['maze', ...catalog.cases.filter(c => c.kind === 'authored').map(c => c.world)]);
  if (!knownWorlds.has(world)) throw new Error('This world does not exist. Choose a world from the skill library.');
  const room = normalizeRoom(params.get('room') || (world === 'maze' ? catalog.defaultRoom : 'AxA'));
  if (!room || (world === 'maze' ? !catalog.rooms.some(r => r.id === room) : room !== 'AxA')) throw new Error('Unknown room. Official coordinates range from AxA to PxP.');
  const worldSelect = document.getElementById('world-select');
  worldSelect.innerHTML = '<option value="maze">Official world · 256 rooms</option>' + catalog.cases.filter(c => c.kind === 'authored').map(c => `<option value="${c.world}">${c.title}</option>`).join('');
  worldSelect.value = world;
  worldSelect.disabled = false;
  worldSelect.addEventListener('change', () => { location.href = './player.html?world=' + worldSelect.value + '&room=' + (worldSelect.value === 'maze' ? 'HxI' : 'AxA'); });
  document.getElementById('room-options').innerHTML = catalog.rooms.map(r => `<option value="${r.id}"></option>`).join('');
  document.getElementById('dialog-atlas').innerHTML = atlas(catalog, { mode: 'select', currentRoom: room });
  document.getElementById('player-mini-map').innerHTML = atlas(catalog, { mode: 'select', currentRoom: room });
  document.querySelectorAll('[data-room]').forEach(tile => tile.addEventListener('click', () => switchRoom(tile.dataset.room)));
  document.getElementById('room-form').addEventListener('submit', event => { event.preventDefault(); switchRoom(document.getElementById('room-input').value); });
  for (const [name, delta] of [['previous-room', -1], ['next-room', 1]]) document.getElementById(name).addEventListener('click', () => {
    const index = catalog.rooms.findIndex(r => r.id === currentRoom());
    switchRoom(catalog.rooms[(index + delta + 256) % 256].id);
  });
  document.getElementById('browse-rooms').addEventListener('click', () => { stopReplay(); dialog.showModal(); window.__MAZEBENCH_INPUT_LOCKED__ = true; });
  document.getElementById('close-rooms').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!changingRoom) window.__MAZEBENCH_INPUT_LOCKED__ = false; });
  document.getElementById('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.game-column').requestFullscreen(); }
    catch { toast('Fullscreen is unavailable in this browser.'); }
  });
  document.addEventListener('fullscreenchange', () => window.dispatchEvent(new Event('resize')));
  document.getElementById('replay').addEventListener('click', replay);
  document.querySelectorAll('[data-action],[data-move]').forEach(button => button.addEventListener('pointerdown', () => { stopReplay(); status('Your move.'); }, true));
  // The original runtime binds keys and wheel at window scope. Keep form fields,
  // dialogs, and page scrolling usable while retaining all in-game controls.
  window.addEventListener('keydown', event => {
    if (event.target.matches('input, select, textarea') || dialog.open) { event.stopImmediatePropagation(); return; }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyU','KeyR'].includes(event.code)) stopReplay();
  }, true);
  window.addEventListener('wheel', event => { if (!event.target.closest('.play-stage')) event.stopImmediatePropagation(); }, { capture: true, passive: true });
  const url = new URL(location.href);
  if (!url.searchParams.has('view')) { url.searchParams.set('view', '1'); history.replaceState(null, '', url); }
  const response = await fetch('./data/levels/' + world + '/level_' + room + '.json');
  if (!response.ok) throw new Error('Room data could not be loaded. Try another room.');
  window.__PLAY_DATA__ = { ...withDirectEntry(await response.json(), catalog), hostOwnsPlayHud: true, hostOwnsWorldMapNavigation: true, disableHorizontalNeighborFetches: capture || world !== 'maze', ignoreSavedGemProgress: capture };
  window.__PLAY_WORLD_DATA__ = { game: { id: world }, worldColumns: [...letters], worldRows: [...letters], existingLevels: world === 'maze' ? catalog.rooms.map(r => ({id:'level_' + r.id, label:r.id})) : [{id:'level_AxA',label:'AxA'}] };
  for (const name of ['play-rules','play-core','play-render-effects','play-render-terrain','play-render-actors','play-render-three','play-render-compositor','play-render','maze-engine','play-movement','play-world-transitions','play-gameplay','play']) await loadScript(name);
  if (!app()) throw new Error('The 3D player could not initialize. Reload to try again.');
  await app().threeRendererReady;
  if (!app().threeRenderer?.isReady()) throw new Error('3D playback requires WebGL. Enable hardware acceleration or try a current browser.');
  await app().threeRenderer.whenLevelStateModelsReady(window.__PLAY_DATA__);
  if (capture) {
    app().playSurroundingRadius = 0;
    app().threeRenderer.useLevelPreviewCamera?.(true);
  }
  updateRoomUi();
  app().render();
  status(window.__PLAY_DATA__.directEntry ? 'Entered at the open boundary from ' + window.__PLAY_DATA__.directEntry.fromRoom + ' · Arrow keys to move' : 'Arrow keys to move · A / D to rotate · Z to undo · R to reset');
  window.addEventListener('mazebench:level-state-applied', () => { updateRoomUi(); });
  setInterval(() => {
    const count = app().moveHistory?.length || 0;
    document.getElementById('move-stat').textContent = count + (count === 1 ? ' move' : ' moves');
    document.getElementById('gem-stat').textContent = (app().collectedGemIds?.size || 0) + ' gems';
  }, 250);
  window.__HARNESS_READY__ = true;
  if (params.get('replay') === '1' && !capture) replay();
} catch (error) {
  status(error.message);
  document.querySelector('.game-loading').innerHTML = `<div class="load-error">${escapeHtml(error.message)}<br><a class="button" href="./player.html">Open the starting room →</a></div>`;
  document.querySelector('.maze-frame').classList.add('is-loading');
  window.__HARNESS_ERROR__ = error.message;
}
