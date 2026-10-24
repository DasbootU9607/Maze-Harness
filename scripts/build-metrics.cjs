'use strict';

// A small, allowlisted catalog projection of the public runtime evidence.
// Requested model names, filenames and historical titles are not attribution.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const tokenFields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const label = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
function readAttributions(site) {
  const file = path.join(site, 'data/build-attributions.json');
  if (!fs.existsSync(file)) return {};
  const document = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(document.schemaVersion, 1);
  for (const [id, entry] of Object.entries(document.cases)) {
    assert(/^authored-[a-z0-9-]+$/.test(id));
    assert(['user-confirmed', 'runtime-setting'].includes(entry.basis));
    assert(Object.keys(entry).every(key => ['model', 'reasoningEffort', 'basis', 'note', 'evidenceSha256', 'startedAt', 'finishedAt'].includes(key)));
    if (entry.note) assert(typeof entry.note === 'string' && entry.note.length <= 400 && /^[\x20-\x7e]+$/.test(entry.note));
    if (entry.model) assert(/^[a-zA-Z0-9._-]{1,100}$/.test(entry.model));
    if (entry.reasoningEffort) assert(/^[a-z][a-z0-9_-]{0,39}$/.test(entry.reasoningEffort));
    if (entry.basis === 'runtime-setting') assert(/^[a-f0-9]{64}$/.test(entry.evidenceSha256));
    for (const key of ['startedAt', 'finishedAt']) if (entry[key]) assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry[key]));
  }
  return document.cases;
}
function summarizeBuild(usage, declared = {}) {
  const models = (usage?.models || []).map(row => ({model: label(row.model), provider: label(row.provider)}));
  const names = [...new Set(models.map(row => row.model).filter(Boolean))];
  const confirmed = names.length === 0 && declared.basis === 'user-confirmed' ? declared.model : null;
  const declarationMatches = confirmed || names.length === 1 && names[0] === declared.model;
  const attribution = confirmed ? 'single-model' : names.length === 0 ? 'not-provided' : names.length === 1 && models.every(row => row.model) ? 'single-model' : 'mixed';
  const recordedEfforts = [...new Set((usage?.models || []).map(row => label(row.reasoningEffort)).filter(Boolean))];
  const efforts = recordedEfforts.length ? recordedEfforts : declarationMatches && declared.reasoningEffort ? [declared.reasoningEffort] : [];
  const effortMissing = recordedEfforts.length && usage.models.some(row => !row.reasoningEffort);
  return {
    schemaVersion: 1,
    attribution,
    model: attribution === 'single-model' ? names[0] || confirmed : null,
    modelBasis: confirmed ? 'user-confirmed' : names.length ? 'runtime-record' : 'not-provided',
    reasoningEffort: efforts.length === 1 && !effortMissing ? efforts[0] : null,
    reasoningEfforts: efforts,
    reasoningBasis: recordedEfforts.length ? 'runtime-setting' : efforts.length ? declared.basis : 'not-provided',
    reasoningMixed: efforts.length > 1 || !!effortMissing,
    attributionNote: declarationMatches ? declared.note || null : null,
    attributionEvidenceSha256: declarationMatches ? declared.evidenceSha256 || null : null,
    startedAt: usage?.startedAt || declared.startedAt || null,
    finishedAt: usage?.finishedAt || declared.finishedAt || null,
    models,
    runtime: label(usage?.runtime),
    elapsedMs: typeof usage?.elapsedMs === 'number' && Number.isFinite(usage.elapsedMs) && usage.elapsedMs >= 0 ? usage.elapsedMs : null,
    usageStatus: ['measured', 'partial', 'unavailable'].includes(usage?.status) ? usage.status : 'unavailable',
    tokens: Object.fromEntries(tokenFields.map(key => [key, count(usage?.observedTokens?.[key])])),
    scopeComplete: false,
    evidenceSha256: usage?.evidenceSha256 || null
  };
}
module.exports = {summarizeBuild, tokenFields, readAttributions};
