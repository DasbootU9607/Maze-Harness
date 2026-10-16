'use strict';

// Build iteration views with the official parser without creating engine drafts.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { hash } = require('./site-content.cjs');
const vectors = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function engineFactory(runtime) {
  const context = { window: {}, console, structuredClone };
  vm.runInNewContext(fs.readFileSync(runtime, 'utf8'), context);
  return context.window.MazeEngine.createEngine;
}

function buildLevel(engineRoot, candidate, caseId) {
  assert(candidate.cells.every(Array.isArray), 'Official preview requires a token matrix');
  const repo = path.resolve(engineRoot), gamesDir = path.join(repo, 'games');
  const support = require(path.join(repo, 'server/support.js'));
  const { createMazeWorldMapService } = require(path.join(repo, 'server/maze-world-map.js'));
  const { createMazeLevelService } = require(path.join(repo, 'server/maze-levels.js'));
  const worldMaps = createMazeWorldMapService({ gamesDir, ...support, buildMazePreviewData: () => ({ previewUrl: null }) });
  const levels = createMazeLevelService({ rootDir: repo, gamesDir, worldMaps, ...support,
    loadText: () => candidate.cells.map(row => row.join(' ')).join('\n'),
    buildGameAssetUrl: (_id, asset) => './assets/maze/' + asset,
    resolveGameAssetPath: (_id, asset) => path.join(gamesDir, 'maze', asset),
    buildMazePreviewData: () => ({ previewUrl: null }) });
  const game = require(path.join(repo, 'server/app.js')).getGame('maze');
  const level = levels.getLevelState(game, { id: 'level_AxA', fileName: candidate.id + '.txt', label: candidate.id });
  assert.equal(level.height, candidate.cells.length, 'Preview parser truncated the candidate height');
  assert(candidate.cells.every(row => row.length === level.width), 'Preview parser truncated the candidate width');
  level.gameId = 'process-' + caseId + '-' + candidate.id;
  level.playApiBaseUrl = './data/process-levels/' + caseId;
  // Retain exact parser input alongside the derived state for static binding checks.
  level.sourceCells = structuredClone(candidate.cells);
  level.processPreview = { schemaVersion: 1, candidateId: candidate.id, cellsSha256: candidate.cellsSha256,
    contractSha256: candidate.contractSha256, parserSha256: hash(fs.readFileSync(path.join(repo, 'server/maze-levels.js'))) };
  return level;
}

function actorFrame(engine, state) {
  return Array.from(engine.actorTypes, (type, id) => ({ id, type, groupId: engine.actorGroupIds[id] || null,
    x: state.actorX[id], y: state.actorY[id], z: state.actorElevation[id], removed: !!state.actorRemoved[id] }));
}

function projectReplay(saved, record) {
  assert.equal(saved.fingerprints?.cells, record.cellsSha256, 'Recorded replay cells mismatch');
  assert.equal(saved.fingerprints?.contract, record.contractSha256, 'Recorded replay contract mismatch');
  assert.equal(saved.path, record.route);
  const frames = saved.frames.map((frame, step) => {
    assert.equal(frame.step, step); assert.equal(frame.direction, step ? record.route[step - 1] : null);
    assert(Array.isArray(frame.actors) && frame.actors.length, 'Saved replay has no actor frame');
    return { step, direction: frame.direction, actors: frame.actors.map((actor, index) => {
      const value = { id: actor.i ?? actor.id ?? index, type: actor.type, groupId: actor.group ?? actor.groupId ?? null,
        x: actor.x, y: actor.y, z: actor.z ?? actor.elevation, removed: actor.removed };
      assert(Number.isInteger(value.id) && [value.x, value.y, value.z].every(Number.isInteger) && typeof value.removed === 'boolean');
      assert(/^[a-z_]+$/.test(value.type) && (value.groupId === null || /^[A-Za-z0-9_-]+$/.test(value.groupId)));
      return value;
    }) };
  });
  return { schemaVersion: 1, candidateId: record.candidateId, cellsSha256: record.cellsSha256,
    contractSha256: record.contractSha256, sourceSha256: record.sourceSha256, route: record.route, frames };
}

function validateReplay(level, saved, createEngine) {
  const fields = (value, allowed) => assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key)), 'Non-allowlisted replay field');
  fields(saved, ['schemaVersion', 'candidateId', 'cellsSha256', 'contractSha256', 'sourceSha256', 'route', 'frames']);
  assert.equal(saved.schemaVersion, 1); assert(/^[a-z][a-z0-9-]*$/i.test(saved.candidateId));
  for (const key of ['cellsSha256', 'contractSha256', 'sourceSha256']) assert(/^[a-f0-9]{64}$/.test(saved[key]));
  assert(/^[UDLR]+$/.test(saved.route), 'Invalid recorded replay route');
  assert.equal(saved.frames.length, saved.route.length + 1, 'Recorded replay frame count differs from route');
  const engine = createEngine(level), state = engine.cloneState(engine.initialState);
  assert.equal(engine.loadWarnings.length, 0, 'Official engine rejects the candidate preview');
  for (let step = 0; step <= saved.route.length; step++) {
    const frame = saved.frames[step];
    fields(frame, ['step', 'direction', 'actors']);
    for (const actor of frame.actors) fields(actor, ['id', 'type', 'groupId', 'x', 'y', 'z', 'removed']);
    assert.equal(frame.step, step); assert.equal(frame.direction, step ? saved.route[step - 1] : null);
    if (step) assert(engine.move(state, ...vectors[saved.route[step - 1]]).moved, 'Recorded replay contains an illegal input at step ' + step);
    assert.deepEqual(frame.actors, actorFrame(engine, state), 'Saved actors differ from official replay at step ' + step);
  }
  return { inputs: saved.route.length, frames: saved.frames.length };
}

function attachProcessPreviews(document, runDir, { engineRoot, runtime, emit }) {
  const normalizedRuntime = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(hash(normalizedRuntime(path.join(engineRoot, 'public/maze-engine.js'))), hash(normalizedRuntime(runtime)), 'Iteration preview engine differs from the website runtime');
  const createEngine = engineFactory(runtime);
  const events = fs.readFileSync(path.join(runDir, 'events.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  for (const candidate of document.candidates) {
    const level = buildLevel(engineRoot, candidate, document.caseId), levelBytes = bytes(level);
    assert.equal(createEngine(level).loadWarnings.length, 0, 'Official engine rejects the candidate preview');
    const levelPath = `data/process-levels/${document.caseId}/${candidate.id}.json`;
    candidate.preview = { levelPath, levelSha256: hash(levelBytes), cellsSha256: candidate.cellsSha256, status: 'iteration' };
    emit(levelPath, levelBytes);
    const records = document.replays.filter(replay => replay.candidateId === candidate.id);
    if (!records.length) continue;
    candidate.preview.replays = [];
    for (const record of records) {
      assert(/^replay-[a-z0-9-]+$/i.test(record.id), 'Invalid replay record identity');
      const event = events.find(event => event.id === record.id.replace(/^replay-/, ''));
      assert(event?.type === 'artifact.saved' && event.details.kind === 'replay' && event.candidateId === candidate.id);
      const base = fs.realpathSync(runDir), file = fs.realpathSync(path.resolve(runDir, event.details.artifactPath)), relative = path.relative(base, file);
      assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Replay escapes source run');
      assert.equal(hash(fs.readFileSync(file)), record.sourceSha256, 'Recorded replay source bytes changed');
      const replay = projectReplay(read(file), record); validateReplay(level, replay, createEngine);
      const data = `data/process-replays/${document.caseId}/${candidate.id}-${record.id}.json`, replayBytes = bytes(replay);
      record.data = data; record.sha256 = hash(replayBytes);
      candidate.preview.replays.push(Object.fromEntries(['id', 'data', 'sha256', 'candidateId', 'cellsSha256', 'contractSha256', 'sourceSha256', 'route', 'frameCount', 'binding', 'sourceKind'].map(key => [key, record[key]])));
      emit(data, replayBytes);
    }
    // Keep the original single-replay API as an alias, never as a fallback for
    // selecting a different recorded event.
    candidate.preview.replay = structuredClone(candidate.preview.replays[0]);
  }
}

function validatePreviewFiles(site, document) {
  let createEngine = null;
  if (document.candidates.some(candidate => candidate.preview)) assert(document.candidates.every(candidate => candidate.preview), 'Every recorded candidate needs a separate preview');
  const load = (relative, sha) => {
    const base = fs.realpathSync(site), file = fs.realpathSync(path.join(site, relative)), rel = path.relative(base, file);
    assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Preview file escapes website');
    const data = fs.readFileSync(file); assert.equal(hash(data), sha, 'Preview bytes SHA-256 mismatch'); return JSON.parse(data);
  };
  for (const candidate of document.candidates) {
    if (!candidate.preview) continue;
    createEngine ||= engineFactory(path.join(site, 'runtime/maze-engine.js'));
    const preview = candidate.preview;
    assert.equal(preview.levelPath, `data/process-levels/${document.caseId}/${candidate.id}.json`);
    assert.equal(preview.cellsSha256, candidate.cellsSha256);
    const level = load(preview.levelPath, preview.levelSha256);
    assert(Object.keys(level).every(key => ['gameId', 'levelId', 'levelLabel', 'sourceFileName', 'width', 'height', 'terrain', 'actors', 'cameraView', 'worldColumns', 'worldRows', 'playApiBaseUrl', 'sourceCells', 'processPreview'].includes(key)), 'Non-allowlisted preview field');
    assert.deepEqual(level.sourceCells, candidate.cells, 'Preview input cells differ from candidate');
    assert.equal(hash(level.sourceCells), candidate.cellsSha256);
    assert.equal(level.processPreview.candidateId, candidate.id); assert.equal(level.processPreview.cellsSha256, candidate.cellsSha256);
    assert.equal(level.processPreview.contractSha256, candidate.contractSha256);
    assert.equal(level.height, candidate.cells.length); assert(candidate.cells.every(row => row.length === level.width));
    assert.equal(createEngine(level).loadWarnings.length, 0, 'Official engine rejects the candidate preview');
    const assetCheck = value => {
      if (Array.isArray(value)) value.forEach(assetCheck);
      else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
        if (['imageUrl', 'modelUrl'].includes(key) && child !== null) { assert(typeof child === 'string' && child.startsWith('./assets/maze/') && !child.includes('..')); assert(fs.existsSync(path.join(site, child)), 'Missing process preview asset'); }
        else assetCheck(child);
      }
    };
    assetCheck(level);
    const records = (document.replays || []).filter(replay => replay.candidateId === candidate.id);
    const descriptors = preview.replays ?? (preview.replay ? [preview.replay] : []);
    assert(Array.isArray(descriptors), 'Invalid preview replay list');
    assert.equal(descriptors.length, records.length, 'Every recorded replay needs its own preview binding');
    if (preview.replays) {
      assert.equal(new Set(descriptors.map(item => item.id)).size, descriptors.length, 'Duplicate preview replay identity');
      assert.deepEqual(preview.replay, descriptors[0], 'Legacy replay alias must match the first recorded replay');
    }
    for (const metadata of descriptors) {
      const record = records.find(replay => preview.replays ? replay.id === metadata.id : replay.data === metadata.data);
      assert(record, 'Preview replay has no recorded source');
      for (const key of Object.keys(metadata)) assert.equal(metadata[key], record[key], 'Preview replay record mismatch');
      assert.equal(metadata.candidateId, candidate.id); assert.equal(metadata.cellsSha256, candidate.cellsSha256); assert.equal(metadata.contractSha256, candidate.contractSha256);
      assert.equal(metadata.data, preview.replays ? `data/process-replays/${document.caseId}/${candidate.id}-${record.id}.json` : `data/process-replays/${document.caseId}/${candidate.id}.json`);
      const replay = load(metadata.data, metadata.sha256);
      for (const key of ['candidateId', 'cellsSha256', 'contractSha256', 'sourceSha256', 'route']) assert.equal(replay[key], metadata[key], 'Replay file binding mismatch');
      assert.equal(replay.frames.length, metadata.frameCount);
      validateReplay(level, replay, createEngine);
    }
  }
}

module.exports = { attachProcessPreviews, buildLevel, projectReplay, validateReplay, validatePreviewFiles, engineFactory };
