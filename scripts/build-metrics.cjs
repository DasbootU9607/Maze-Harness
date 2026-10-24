'use strict';

// A small, allowlisted catalog projection of the public runtime evidence.
// Requested model names, filenames and historical titles are not attribution.
const tokenFields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const label = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
function summarizeBuild(usage) {
  const models = (usage?.models || []).map(row => ({model: label(row.model), provider: label(row.provider)}));
  const names = [...new Set(models.map(row => row.model).filter(Boolean))];
  const attribution = names.length === 0 ? 'not-provided' : names.length === 1 && models.every(row => row.model) ? 'single-model' : 'mixed';
  return {
    schemaVersion: 1,
    attribution,
    model: attribution === 'single-model' ? names[0] : null,
    models,
    runtime: label(usage?.runtime),
    elapsedMs: typeof usage?.elapsedMs === 'number' && Number.isFinite(usage.elapsedMs) && usage.elapsedMs >= 0 ? usage.elapsedMs : null,
    usageStatus: ['measured', 'partial', 'unavailable'].includes(usage?.status) ? usage.status : 'unavailable',
    tokens: Object.fromEntries(tokenFields.map(key => [key, count(usage?.observedTokens?.[key])])),
    scopeComplete: false,
    evidenceSha256: usage?.evidenceSha256 || null
  };
}
module.exports = {summarizeBuild, tokenFields};
