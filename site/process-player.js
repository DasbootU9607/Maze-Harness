import {loadCatalog} from './ui.js';

const params = new URLSearchParams(location.search);
const caseId = params.get('case'), candidateId = params.get('candidate');
const $ = id => document.getElementById(id);
const app = () => window.__MAZEBENCH_APP__;
const vectors = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = window.__PROCESS_PLAYER_STATE__ = {caseId,candidateId,step:0,total:0,replaying:false,status:'loading',hasReplay:false};
let initialLevel, candidate, savedReplay, expectedFrames, replayEngine, expectedFinalSolved = false;
let busy = false, seeking = false, replayDirty = false, ready = false, disposed = false, token = 0, statsTimer = null;
let actionQueue = Promise.resolve();
window.__MAZEBENCH_INPUT_LOCKED__ = true;

function notify(type, detail = {}) {
  if (window.parent !== window) window.parent.postMessage({source:'mazebench-process-player',type,caseId,candidateId,...detail}, location.origin);
}
function status(message) { $('game-status').textContent = message; }
function sync() {
  const locked = !ready || busy || seeking || state.replaying;
  window.__MAZEBENCH_INPUT_LOCKED__ = locked;
  for (const button of document.querySelectorAll('[data-move],[data-camera],#undo-move')) button.disabled = locked;
  $('reset-room').disabled = !ready || busy || seeking;
  $('replay-play').disabled = !ready || !state.hasReplay || seeking || (busy && !state.replaying);
  $('replay-play').textContent = state.replaying ? 'Pause replay' : state.step === state.total && state.total ? 'Replay again' : state.step ? 'Resume recorded replay' : 'Watch recorded replay';
  $('replay-play').setAttribute('aria-pressed', String(state.replaying));
  $('replay-step').disabled = !ready || busy || seeking || state.replaying || !state.hasReplay || state.step >= state.total;
  $('replay-restart').disabled = !ready || busy || seeking || !state.hasReplay;
  $('replay-progress').disabled = !ready || busy || seeking || !state.hasReplay;
  $('replay-progress').max = String(state.total);
  $('replay-progress').value = String(state.step);
  $('replay-progress').setAttribute('aria-valuetext', `Step ${state.step} of ${state.total}`);
  $('replay-counter').textContent = `${state.step} / ${state.total}`;
  notify('replay-state', {playing:state.replaying,step:state.step,total:state.total,status:state.status});
}
function stopReplay(message) {
  token++;
  state.replaying = false;
  if (state.status === 'playing') state.status = 'paused';
  if (message) status(message);
  sync();
}
function actorsKey(actors) {
  return JSON.stringify(actors.map(actor => ({type:actor.type,groupId:actor.groupId ?? actor.group ?? '',
    x:actor.x,y:actor.y,z:actor.elevation ?? actor.z ?? 0,removed:!!actor.removed}))
    .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
function engineActors(physical) {
  return initialLevel.actors.map((actor,index) => ({...actor,x:physical.actorX[index],y:physical.actorY[index],
    elevation:physical.actorElevation[index],removed:!!physical.actorRemoved[index]}));
}
function framePlayableArea() {
  const cells = [];
  initialLevel.terrain.forEach((row,y) => row.forEach((cell,x) => {
    if (cell?.type && !['wall','empty','void'].includes(cell.type)) cells.push({x,y,elevation:cell.elevation || 0});
  }));
  cells.push(...initialLevel.actors.filter(actor => !actor.removed));
  if (!cells.length) return;
  const unit = app().TILE_SIZE;
  // Use the renderer's existing fit hook to frame the passage, not the solid
  // wall margin around it. This changes only the camera, never level geometry.
  app().cameraFlightFitOptions = {
    minX:(Math.min(...cells.map(cell => cell.x)) - 0.5) * unit,
    maxX:(Math.max(...cells.map(cell => cell.x)) + 1.5) * unit,
    minZ:(Math.min(...cells.map(cell => cell.y)) - 0.5) * unit,
    maxZ:(Math.max(...cells.map(cell => cell.y)) + 1.5) * unit,
    stableHeight:(Math.max(0,...cells.map(cell => cell.elevation || 0)) + 1.5) * unit,
    centerY:0.25 * unit
  };
  app().threeRenderer.setDebugCameraView?.({mode:'isometric',yaw:-0.35,tilt:0.85,zoom:1});
}
async function idle() {
  const deadline = performance.now() + 15000;
  await sleep(25);
  while (app()?.isAnimating || app()?.isTransitioningLevel || app()?.isPlanningWorldAction) {
    if (disposed) throw new Error('The preview was closed.');
    if (performance.now() > deadline) throw new Error('A move did not settle. Reset the preview to continue.');
    await sleep(15);
  }
}
function queue(action) {
  actionQueue = actionQueue.then(action).catch(error => {
    stopReplay();
    busy = false;
    seeking = false;
    state.status = 'error';
    status(error.message);
    sync();
    notify('error', {message:error.message});
  });
  return actionQueue;
}
async function restoreInitial() {
  await idle();
  app().cancelQueuedAction?.();
  app().resetCollectionProgress();
  app().applyLevelState(structuredClone(initialLevel), {immediateCamera:true,resetHistory:true,resetLevelEntry:true,updateUrl:false});
  await app().threeRenderer?.whenLevelStateModelsReady?.(initialLevel);
  await idle();
  state.step = 0;
  replayDirty = false;
  state.status = 'ready';
  app().render();
}
async function reset() {
  stopReplay();
  return queue(async () => {
    busy = true; sync();
    try {await restoreInitial(); status('Reset complete, including gems. Arrow keys to play.');}
    finally {busy = false; sync();}
  });
}
async function takeReplayStep() {
  if (!state.hasReplay || state.step >= state.total) return;
  busy = true; sync();
  try {
    await idle();
    if (replayDirty || actorsKey(app().state.actors) !== expectedFrames[state.step]) {
      await restoreInitial();
      status('Restarting the recorded route from its original state.');
    }
    const direction = savedReplay.route[state.step], next = state.step + 1;
    app().replayMoveDurationMs = Math.max(35, 150 / Number($('replay-speed').value));
    app().movePlayers(...vectors[direction], {skipEdgeTransition:true,inputSource:'recorded-replay'});
    await idle();
    if (actorsKey(app().state.actors) !== expectedFrames[next]) {
      throw new Error(`Replay stopped at step ${next}: the live board differs from the recorded state.`);
    }
    state.step = next;
    state.status = next === state.total ? 'complete' : state.replaying ? 'playing' : 'paused';
    status(next === state.total ? `Recorded replay complete${expectedFinalSolved ? ' · goal reached' : ''}. Reset to try this version.` : `Recorded replay · ${next} / ${state.total} · ${direction}`);
  } finally {
    if (app()) app().replayMoveDurationMs = null;
    busy = false; sync();
  }
}
async function playReplay() {
  if (!state.hasReplay || !ready) return;
  if (state.replaying) {stopReplay('Replay paused. Resume, step, or play this version yourself.'); return;}
  const playbackToken = ++token;
  state.replaying = true;
  state.status = 'playing';
  sync();
  await queue(async () => {
    if (state.step >= state.total) await restoreInitial();
    while (!disposed && state.replaying && playbackToken === token && state.step < state.total) {
      await takeReplayStep();
      await sleep(100 / Number($('replay-speed').value));
    }
    if (playbackToken === token) {
      state.replaying = false;
      if (state.step === state.total) state.status = 'complete';
      sync();
    }
  });
}
async function seekReplay(target) {
  stopReplay();
  return queue(async () => {
    seeking = true; sync();
    try {
      await restoreInitial();
      while (!disposed && state.step < target) await takeReplayStep();
      state.status = target === state.total ? 'complete' : 'paused';
    } finally {seeking = false; busy = false; sync();}
  });
}
async function jsonAsset(relative, expectedHash) {
  const base = new URL('./', location.href), url = new URL(relative, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !relative.startsWith('data/')) throw new Error('Preview evidence must be a local site asset.');
  const response = await fetch(url);
  if (!response.ok) throw new Error('This recorded preview could not be loaded.');
  const bytes = await response.arrayBuffer();
  if (expectedHash) {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
    if (hash !== expectedHash) throw new Error('Preview evidence changed: its saved fingerprint does not match.');
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function loadScript(name) {
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = './runtime/' + name + '.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('The original MazeBench runtime could not load.'));
    document.head.append(script);
  });
}
async function loadReplay() {
  const descriptor = candidate.preview.replay;
  if (!descriptor) return;
  if (descriptor.candidateId !== candidate.id || descriptor.cellsSha256 !== candidate.cellsSha256 || descriptor.contractSha256 !== candidate.contractSha256 ||
      descriptor.sourceKind !== 'saved-replay' || !['exact-artifact','recorded-input-hash'].includes(descriptor.binding)) throw new Error('The saved replay is not bound to this candidate.');
  const replay = await jsonAsset(descriptor.data, descriptor.sha256);
  if (replay.candidateId !== candidate.id || replay.cellsSha256 !== candidate.cellsSha256 || replay.contractSha256 !== candidate.contractSha256 ||
      replay.sourceSha256 !== descriptor.sourceSha256 || replay.route !== descriptor.route || !/^[UDLR]+$/.test(replay.route || '')) throw new Error('Replay identity or route does not match this candidate.');
  if (!Array.isArray(replay.frames) || replay.frames.length !== replay.route.length + 1 || replay.frames.length !== descriptor.frameCount) throw new Error('The saved replay does not contain every recorded state.');
  replayEngine = window.MazeEngine.createEngine(initialLevel);
  if (replayEngine.loadWarnings?.length) throw new Error('The replay has unsupported engine input.');
  const physical = replayEngine.cloneState(replayEngine.initialState), expected = [];
  for (let step = 0; step <= replay.route.length; step++) {
    if (step) {
      const moved = replayEngine.move(physical, ...vectors[replay.route[step - 1]]);
      if (!moved.moved) throw new Error(`The saved replay contains an illegal input at step ${step}.`);
    }
    const frame = replay.frames[step];
    if (frame.step !== step || (step && frame.direction !== replay.route[step-1]) || !Array.isArray(frame.actors) ||
        actorsKey(frame.actors) !== actorsKey(engineActors(physical))) throw new Error(`Saved replay state ${step} differs from the original engine.`);
    expected.push(actorsKey(engineActors(physical)));
  }
  savedReplay = replay;
  expectedFrames = expected;
  expectedFinalSolved = replayEngine.isSolved(physical);
  state.hasReplay = true;
  state.total = replay.route.length;
  $('replay-controls').hidden = false;
  $('replay-play').hidden = false;
  $('preview-status').textContent = 'Bound recorded replay';
}

$('replay-play').addEventListener('click', playReplay);
$('replay-step').addEventListener('click', () => {stopReplay(); queue(takeReplayStep);});
$('replay-restart').addEventListener('click', reset);
$('replay-progress').addEventListener('change', event => seekReplay(Number(event.target.value)));
$('reset-room').addEventListener('click', reset);
$('undo-move').addEventListener('click', () => {
  stopReplay();
  queue(async () => {busy=true;sync();try{await idle();app().undoMove();await idle();replayDirty=true;state.status='manual';status('Move undone.');}finally{busy=false;sync();}});
});
window.addEventListener('keydown', event => {
  if (event.target.matches('input,select,textarea')) {event.stopImmediatePropagation();return;}
  if (event.code === 'KeyR') {event.preventDefault();event.stopImmediatePropagation();if(ready&&!busy&&!seeking)reset();return;}
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyU'].includes(event.code) && !state.replaying && !busy && !seeking) {
    replayDirty=true;state.status='manual';status('Your move · arrows to play · Z undo · R reset');
  }
}, true);
document.querySelectorAll('[data-move]').forEach(button => {
  const manualMove = () => {if (!state.replaying && !busy && !seeking) {replayDirty=true;state.status='manual';status('Your move.');}};
  button.addEventListener('pointerdown', manualMove, true);
  button.addEventListener('click', event => {if(event.detail===0)manualMove();}, true);
});
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === window.parent && event.data?.source === 'mazebench-process' && event.data.type === 'pause') stopReplay();
});
document.addEventListener('visibilitychange', () => {if(document.hidden)stopReplay();});
window.addEventListener('pagehide', event => {
  stopReplay();
  clearInterval(statsTimer);
  if (!event.persisted) {disposed=true;app()?.threeRenderer?.dispose?.();}
});

try {
  if (!caseId || !candidateId) throw new Error('Choose a recorded candidate to open its preview.');
  const catalog = await loadCatalog(), entry = catalog.cases.find(item => item.id === caseId);
  if (!entry?.process?.data) throw new Error('This case has no recorded authoring process.');
  const process = await jsonAsset(entry.process.data);
  candidate = process.candidates.find(item => item.id === candidateId);
  if (!candidate?.preview?.levelPath || candidate.preview.cellsSha256 !== candidate.cellsSha256) throw new Error('This candidate has no matching playable preview.');
  document.title = `${candidateId} · ${entry.title} — Maze Harness`;
  $('candidate-label').textContent = candidateId;
  $('preview-status').textContent = 'Playable · not verified';
  initialLevel = {...await jsonAsset(candidate.preview.levelPath,candidate.preview.levelSha256),
    hostOwnsPlayHud:true,hostOwnsWorldMapNavigation:true,disableHorizontalNeighborFetches:true,ignoreSavedGemProgress:true};
  window.__PLAY_DATA__ = structuredClone(initialLevel);
  window.__PLAY_WORLD_DATA__ = {game:{id:initialLevel.gameId},worldColumns:['A'],worldRows:['A'],existingLevels:[{id:initialLevel.levelId,label:candidateId}]};
  const url = new URL(location.href);
  if (!url.searchParams.has('view')) {url.searchParams.set('view','1');history.replaceState(null,'',url);}
  for (const name of ['play-rules','play-core','play-render-effects','play-render-terrain','play-render-actors','play-render-three','play-render-compositor','play-render','maze-engine','play-movement','play-world-transitions','play-gameplay','play']) await loadScript(name);
  if (!app()) throw new Error('The 3D preview could not initialize.');
  await app().threeRendererReady;
  if (!app().threeRenderer?.isReady()) throw new Error('This preview requires WebGL. Enable hardware acceleration to play.');
  await app().threeRenderer.whenLevelStateModelsReady(initialLevel);
  app().playSurroundingRadius = 0;
  framePlayableArea();
  await idle();
  try {await loadReplay();}
  catch (error) {status('Playable preview; recorded replay unavailable: '+error.message);notify('error',{message:error.message});}
  ready = true;
  state.status = 'ready';
  sync();
  // Replay controls change the canvas height after the runtime's first layout.
  window.dispatchEvent(new Event('resize'));
  app().render();
  if (!candidate.preview.replay || state.hasReplay) status(state.hasReplay ? 'Watch the recorded route, or use arrow keys to play.' : 'Playable iteration · no verified replay is recorded for this version.');
  statsTimer = setInterval(() => {$('move-stat').textContent = `${app()?.moveHistory?.length || 0} moves`;}, 250);
  window.__HARNESS_READY__ = true;
  notify('ready',{hasReplay:state.hasReplay,total:state.total});
} catch (error) {
  state.status='error';
  window.__HARNESS_ERROR__=error.message;
  $('loading-message').textContent=error.message;
  document.querySelector('.maze-frame').classList.add('is-loading','has-error');
  status(error.message);
  notify('error',{message:error.message});
}
