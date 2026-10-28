'use strict';

// A separate, content-addressed supplement. Sealed observer runs and acceptance
// records are never rewritten. Missing observations are never synthesized.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash } = require('./site-content.cjs');
const { assertPublicPrivacy, assertAcyclic } = require('./export-authoring-process.cjs');
const { assertEventCoverage } = require('./process-events.cjs');
const { assertExplanations } = require('./process-explanations.cjs');
const { validatePreviewFiles } = require('./process-previews.cjs');

function checkRecovery(site, base, recovery) {
  assert.equal(recovery.schemaVersion, 1);
  assert.equal(recovery.caseId, base.caseId);
  const final = base.candidates.find(c => c.id === base.finalCandidateId);
  assert.equal(recovery.publishedCellsSha256, final.cellsSha256);
  assert.equal(recovery.publishedContractSha256, final.contractSha256);
  assert.equal(recovery.scopeComplete, false);
  const ids = new Set();
  for (const session of recovery.sessions) {
    assert(/^[a-z0-9-]+$/.test(session.id) && !ids.has(session.id)); ids.add(session.id);
    assert(/^[a-f0-9]{64}$/.test(session.eventsSha256));
    assertPublicPrivacy(session.document); assertAcyclic(session.document.nodes, session.document.edges);
    assertEventCoverage(session.document); assertExplanations(session.document);
    validatePreviewFiles(site, session.document);
  }
  for (const item of recovery.items) {
    assert(/^recovered-[a-z0-9-]+$/.test(item.id) && !ids.has(item.id)); ids.add(item.id);
    assert(/^[a-f0-9]{64}$/.test(item.source.sha256));
    assert(!/^(?:[a-z]:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(item.source.file));
    assert(['unknown', 'neutral', 'passed', 'failed', 'superseded'].includes(item.status));
    if (item.candidate) {
      assert.equal(hash(item.candidate.cells), item.candidate.cellsSha256);
      assert.equal(item.candidate.sha256, item.source.sha256);
      validatePreviewFiles(site, {caseId:base.caseId,candidates:[item.candidate],replays:[]});
    }
    for (const media of item.media || []) {
      assert(/^assets\/process-evidence\/[a-z0-9-]+\/[a-f0-9]{64}\.(png|webm)$/.test(media.path));
      assert.equal(hash(fs.readFileSync(path.join(site, media.path))), media.sha256);
    }
  }
  // This supplement deliberately contains no usage totals. It cannot be added
  // to the original interval or create another leaderboard build.
  assert(!Object.hasOwn(recovery, 'usage'));
  const text = JSON.stringify(recovery);
  assert(!/(?:[A-Za-z]:[\\/]|Bearer\s|sk-[A-Za-z0-9_-]{12,}|github_pat_)/.test(text), 'Private data in recovery');
  return {sessions:recovery.sessions.length, records:recovery.items.length};
}

function checkRecoveries(site) {
  const file = path.join(site, 'data/process-recovery/index.json');
  if (!fs.existsSync(file)) return [];
  const index = JSON.parse(fs.readFileSync(file));
  return index.cases.map(entry => {
    assert.equal(entry.data, `data/process-recovery/${entry.caseId}.json`);
    const bytes = fs.readFileSync(path.join(site, entry.data));
    assert.equal(hash(bytes), entry.sha256);
    return {caseId:entry.caseId, ...checkRecovery(site, JSON.parse(fs.readFileSync(path.join(site, `data/processes/${entry.caseId}.json`))), JSON.parse(bytes))};
  });
}
module.exports = {checkRecovery, checkRecoveries};
if (require.main === module) console.log(JSON.stringify(checkRecoveries(path.resolve(__dirname, '../site')), null, 2));
