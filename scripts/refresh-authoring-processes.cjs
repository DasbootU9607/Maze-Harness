'use strict';

// Re-export every existing public process from its matching private run. No new
// maps, tests, replays, timestamps or source events are invented during refresh.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { exportProcess, assertPublicPrivacy } = require('./export-authoring-process.cjs');
const { validatePreviewFiles } = require('./process-previews.cjs');
const { hash, read } = require('./site-content.cjs');

function refreshProcesses(runsDirectory, { root = path.resolve(__dirname, '..'), check = false } = {}) {
  const runsRoot = path.resolve(runsDirectory), site = path.join(root, 'site');
  const catalog = read(path.join(site, 'data/catalog.json')), provenanceFile = path.join(site, 'data/provenance.json'), provenance = read(provenanceFile);
  const runs = fs.readdirSync(runsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory() && fs.existsSync(path.join(runsRoot, entry.name, 'index.json')))
    .map(entry => ({ directory: path.join(runsRoot, entry.name), index: read(path.join(runsRoot, entry.name, 'index.json')) }));
  const chain = candidates => candidates.map(candidate => ({ id: candidate.id, sha256: candidate.sha256 }));
  const pending = [], results = [];
  for (const entry of catalog.cases.filter(entry => entry.process)) {
    assert.equal(entry.process.data, `data/processes/${entry.id}.json`);
    const file = path.join(site, entry.process.data), previous = read(file);
    const matches = runs.filter(run => JSON.stringify(chain(run.index.candidates)) === JSON.stringify(chain(previous.candidates)));
    assert.equal(matches.length, 1, `Expected one original run with the complete saved candidate chain for ${entry.id}; found ${matches.length}`);
    const run = matches[0], final = previous.candidates.at(-1);
    const next = exportProcess(run.directory, { caseId: entry.id, title: entry.title, skill: entry.skill, expectedCellsSha256: final.cellsSha256, expectedContractSha256: final.contractSha256 });
    for (const candidate of next.candidates) {
      const original = previous.candidates.find(item => item.id === candidate.id);
      assert.equal(candidate.sha256, original.sha256);
      if (original.preview) candidate.preview = structuredClone(original.preview);
    }
    for (const replay of next.replays) {
      const original = previous.replays.find(item => item.id === replay.id);
      assert(original && original.sourceSha256 === replay.sourceSha256 && original.route === replay.route, 'Existing replay source differs');
      if (original.data) { replay.data = original.data; replay.sha256 = original.sha256; }
    }
    assertPublicPrivacy(next); validatePreviewFiles(site, next);
    const bytes = JSON.stringify(next, null, 2) + '\n';
    const source = provenance.cases.find(item => item.id === entry.id);
    assert(source?.authoringProcess, 'Missing existing process provenance');
    source.authoringProcess.sha256 = hash(bytes);
    if (fs.readFileSync(file, 'utf8') !== bytes) pending.push({ file, bytes });
    results.push({ caseId: entry.id, title: entry.title, sourceEvents: next.coverage.events.sourceCount, representedEvents: next.coverage.events.representedCount,
      previousNodes: previous.nodes.length, currentNodes: next.nodes.length, addedNodes: next.nodes.length - previous.nodes.length });
  }
  const bytes = JSON.stringify(provenance, null, 2) + '\n';
  if (fs.readFileSync(provenanceFile, 'utf8') !== bytes) pending.push({ file: provenanceFile, bytes });
  if (check) assert.equal(pending.length, 0, 'Public process exports are stale; refresh from the original runs');
  else for (const item of pending) fs.writeFileSync(item.file, item.bytes);
  return { checked: results.length, changedFiles: pending.length, sourceEvents: results.reduce((sum, result) => sum + result.sourceEvents, 0), cases: results };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2), index = args.indexOf('--runs-dir');
    assert(index >= 0 && args[index + 1], 'Supply --runs-dir ORIGINAL_RUNS_DIRECTORY [--check]');
    console.log(JSON.stringify(refreshProcesses(args[index + 1], { check: args.includes('--check') }), null, 2));
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
}
module.exports = { refreshProcesses };
