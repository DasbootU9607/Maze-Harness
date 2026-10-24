'use strict';
const assert = require('node:assert/strict');
const {hash} = require('./site-content.cjs');

// Publish only an opaque fingerprint, never the private run name or path.
function runIdentity(manifest) {
  assert(typeof manifest.id === 'string' && manifest.id, 'Missing recorded run identity');
  return hash({kind: 'authoring-run', id: manifest.id, createdAt: manifest.createdAt || null});
}

function recordedEvidence(document) {
  const copy = structuredClone(document);
  // Usage may be refreshed after the run. Rendered assets and the public case
  // name are publication derivatives, not the original recorded operations.
  delete copy.usage; delete copy.caseId; delete copy.title;
  for (const candidate of copy.candidates || []) delete candidate.preview;
  for (const replay of copy.replays || []) { delete replay.data; delete replay.sha256; }
  for (const node of copy.nodes || []) if (node.kind === 'delivery') delete node.details?.caseId;
  return hash(copy);
}

function findAuthoredRun(cases, records, {runKey, draftId, process, readProcess}) {
  if (!runKey) return cases[0];
  const exact = cases.find(entry => records.get(entry.id)?.authoringRunSha256 === runKey);
  if (exact) return exact;
  return cases.find(entry => {
    const record = records.get(entry.id);
    if (record?.authoringRunSha256 || record?.originalDraftId !== draftId) return false;
    return !entry.process || recordedEvidence(readProcess(entry)) === recordedEvidence(process);
  });
}
module.exports = {runIdentity, recordedEvidence, findAuthoredRun};
