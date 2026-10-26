'use strict';
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const {homeSummary, rankedGroups} = await import(pathToFileURL(path.resolve(__dirname, '../site/home-build-data.js')));
  const {clientLabel} = await import(pathToFileURL(path.resolve(__dirname, '../site/build-data.js')));
  const entry = (id, model, effort, ms, tokens, evidence = id) => ({id, kind: 'authored', build: {
    attribution: 'single-model', model, reasoningEffort: effort, elapsedMs: ms, tokens: {total_tokens: tokens}, evidenceSha256: evidence}});
  const first = entry('a', 'gpt-6-astra', 'xhigh', 1000, 100);
  const rows = [first, first, entry('a-copy', 'gpt-6-astra', 'xhigh', 1000, 100, 'a'),
    entry('b', 'gpt-6-astra', 'xhigh', 3000, 200), entry('c', 'gpt-6-astra', 'ultra', null, null),
    entry('d', 'qwen3.8-max', 'xhigh', 0, 0), entry('e', 'deepseek-v4.1-flash-1017', 'max', 4000, null),
    {...entry('official', 'gpt-6-astra', 'xhigh', 999999, 999999), kind: 'official'}];
  const summary = homeSummary(rows);
  assert.equal(summary.publishedBuilds, 6);
  assert.deepEqual(summary.time, {total: 8000, average: 2000, measured: 4});
  assert.deepEqual(summary.tokens, {total: 300, average: 100, measured: 3});
  assert.equal(summary.groups.length, 4, 'Reasoning settings remain separate');
  assert.deepEqual(rankedGroups(summary, 'time').map(row => row.time.total), [0, 4000, 4000]);
  assert.deepEqual(rankedGroups(summary, 'time', 'average').map(row => row.time.average), [0, 2000, 4000]);
  assert.equal(rankedGroups(summary, 'tokens').length, 2, 'Unknown is not ranked as zero');
  assert.deepEqual(homeSummary([]).tokens, {total: null, average: null, measured: 0});
  assert.equal(clientLabel('codex_exec'), 'Codex CLI'); assert.equal(clientLabel('codex-tui'), 'Codex CLI');
  assert.equal(clientLabel('Codex Desktop'), 'Codex Desktop');
  console.log('PASS: homepage totals, distinct runs, duplicate intervals, missing versus zero, settings, averages and client labels.');
})().catch(error => {console.error(error); process.exitCode = 1;});
