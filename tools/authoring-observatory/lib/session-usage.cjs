'use strict';

// Passive, task-bounded accounting. No model invocation, configuration change or text estimation.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const S = require('./store.cjs');
const fields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const empty = () => Object.fromEntries(fields.map(k => [k, null]));
const number = n => Number.isSafeInteger(n) && n >= 0 ? n : null;
const sum = values => values.every(v => number(v) !== null) && Number.isSafeInteger(values.reduce((a, b) => a + b, 0)) ? values.reduce((a, b) => a + b, 0) : null;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function atomic(file, data) {
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(temp, file);
}
function tokens(raw, runtime) {
  const t = empty();
  if (!raw) return t;
  for (const k of fields) t[k] = number(raw[k]);
  if (runtime === 'claude-code') {
    t.cached_input_tokens = number(raw.cache_read_input_tokens);
    t.cache_write_input_tokens = number(raw.cache_creation_input_tokens);
    t.input_tokens = sum([number(raw.input_tokens), t.cached_input_tokens, t.cache_write_input_tokens]);
    t.total_tokens = sum([t.input_tokens, t.output_tokens]);
  } else if (runtime === 'gemini-cli') {
    t.input_tokens = number(raw.input); t.cached_input_tokens = number(raw.cached);
    t.reasoning_output_tokens = number(raw.thoughts);
    t.output_tokens = sum([number(raw.output), t.reasoning_output_tokens]);
    t.total_tokens = number(raw.total); // Provider total can also include tool tokens.
  } else {
    t.cached_input_tokens ??= number(raw.input_tokens_details?.cached_tokens);
    t.reasoning_output_tokens ??= number(raw.output_tokens_details?.reasoning_tokens);
    t.total_tokens ??= sum([t.input_tokens, t.output_tokens]);
  }
  return t;
}
function lines(file) {
  const records = [], issues = [];
  // A writer's last incomplete line is retried on the next boundary, never treated as zero.
  const text = fs.readFileSync(file, 'utf8');
  const parts = text.split('\n'); if (parts.at(-1).trim()) parts.pop();
  for (const line of parts) if (line.trim()) {
    try {records.push(JSON.parse(line));} catch {issues.push('Malformed transcript record; coverage is incomplete.');}
  }
  return {records, issues};
}
function snapshot(binding) {
  const {runtime, file, sessionId} = binding;
  if (!file || !sessionId) throw new Error('The current client did not provide a bound session usage source.');
  let records, issues = [], rows = [], model = null, provider = null, client = runtime;
  if (runtime === 'gemini-cli' && file.endsWith('.json')) {
    const doc = read(file);
    if (doc.sessionId !== sessionId) throw new Error('Session identity mismatch.');
    records = doc.messages || [];
  } else ({records, issues} = lines(file));
  if (runtime === 'codex') {
    const meta = records.find(r => r.type === 'session_meta')?.payload;
    if (meta?.id !== sessionId) throw new Error('Session identity mismatch.');
    provider = meta.model_provider || null; client = meta.originator || meta.source || 'Codex';
    for (const r of records) {
      if (r.type === 'turn_context') {model = r.payload?.model || null; provider = r.payload?.model_provider || provider;}
      if (r.type === 'event_msg' && r.payload?.type === 'token_count' && r.payload.info?.total_token_usage) {
        rows.push({id: String(rows.length), model, provider, at: r.timestamp || null,
          tokens: tokens(r.payload.info.total_token_usage, runtime), evidenceSha256: S.hash(r)});
      }
    }
  } else if (runtime === 'claude-code') {
    if (!records.some(r => r.sessionId === sessionId)) throw new Error('Session identity mismatch.');
    for (const r of records) if (r.type === 'assistant' && r.sessionId === sessionId && !r.isSidechain && r.message?.id) {
      model = r.message.model || null; provider = r.message.provider || null;
      rows.push({id: r.message.id, model, provider, at: r.timestamp || null, tokens: tokens(r.message.usage, runtime), evidenceSha256: S.hash(r)});
    }
  } else if (runtime === 'gemini-cli') {
    if (!file.endsWith('.json') && !records.some(r => r.sessionId === sessionId)) throw new Error('Session identity mismatch.');
    const messages = new Map();
    for (const r of records) {
      if (r.id && r.type === 'gemini') messages.set(r.id, r);
      if (r.$patch?.id && messages.has(r.$patch.id)) messages.set(r.$patch.id, {...messages.get(r.$patch.id), ...r.$patch});
    }
    for (const r of messages.values()) {
      model = r.model || null; provider = r.provider || null;
      rows.push({id: r.id, model, provider, at: r.timestamp || null, tokens: tokens(r.tokens, runtime), evidenceSha256: S.hash(r)});
    }
  } else if (runtime === 'usage-jsonl') {
    if (!records.some(r => r.sessionId === sessionId)) throw new Error('Session identity mismatch.');
    for (const r of records) if (r.type === 'usage' && r.sessionId === sessionId && typeof r.requestId === 'string') {
      model = r.model || null; provider = r.provider || null;
      rows.push({id: r.requestId, model, provider, at: r.timestamp || null, tokens: tokens(r.usage, runtime), evidenceSha256: S.hash(r)});
    }
  } else throw new Error('No adapter is installed for this client.');
  // Streaming/repeated message snapshots replace a request, they are not separate requests.
  if (runtime !== 'codex') rows = [...new Map(rows.map(r => [r.id, r])).values()];
  return {rows, issues, model, provider, client};
}
function discover({env = process.env, home = os.homedir(), bindingRoot = path.resolve(__dirname, '../bindings')} = {}) {
  if (env.MAZEBENCH_USAGE_LOG && env.MAZEBENCH_SESSION_ID) return {runtime: env.MAZEBENCH_USAGE_RUNTIME || 'usage-jsonl', file: path.resolve(env.MAZEBENCH_USAGE_LOG), sessionId: env.MAZEBENCH_SESSION_ID};
  const hookBinding = require('./usage-binding.cjs').discoverBinding(bindingRoot);
  if (hookBinding) return hookBinding;
  const id = env.CODEX_THREAD_ID || env.CODEX_SESSION_ID;
  if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
    const root = path.join(env.CODEX_HOME || path.join(home, '.codex'), 'sessions'), files = [];
    const walk = folder => {if (!fs.existsSync(folder)) return; for (const e of fs.readdirSync(folder, {withFileTypes: true})) {
      const file = path.join(folder, e.name);
      if (e.isDirectory()) walk(file); else if (e.name.includes(id) && e.name.endsWith('.jsonl')) files.push({file, mtime: fs.statSync(file).mtimeMs});
    }};
    walk(root); files.sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return {runtime: 'codex', sessionId: id};
    if (files[1] && files[0].mtime - files[1].mtime < 1000) return {runtime: 'codex', sessionId: id, issue: 'Multiple active session segments; an exact usage source is required.'};
    return {runtime: 'codex', sessionId: id, file: files[0].file, siblingFiles: files.slice(1), selection: 'current-session-most-recent-segment'};
  }
  return {runtime: null, sessionId: null};
}
function begin(dir, options = {}) {
  const file = path.join(dir, 'usage-session.json');
  if (fs.existsSync(file)) return refresh(dir);
  let binding;
  try {binding = options.binding || discover(options);} catch {binding = {runtime: null, sessionId: null, issue: 'Usage source discovery failed; the client did not provide an accessible binding.'};}
  const startedAt = new Date().toISOString();
  let initial = {rows: [], issues: [], model: null, provider: null, client: binding.runtime};
  try {initial = snapshot(binding);} catch (e) {initial.issues.push(e.message);}
  if (binding.issue) initial.issues.push(binding.issue);
  const state = {schemaVersion: 2, binding, startedAt, baseline: initial.rows, observed: [], issues: initial.issues,
    model: initial.model, provider: initial.provider, client: initial.client, sealed: false};
  atomic(file, state);
  S.updateManifest(dir, {usageReport: 'token-usage.json', usageMode: 'current-session'});
  return refresh(dir);
}
function aggregate(rows) {
  return Object.fromEntries(fields.map(k => [k, rows.length ? sum(rows.map(r => r.tokens[k])) : null]));
}
function reportFor(state, manifest) {
  const observedTokens = aggregate(state.observed), groups = new Map();
  for (const row of state.observed) {
    const key = JSON.stringify([row.provider, row.model]); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row);
  }
  const models = [...groups.values()].map(rows => ({provider: rows[0].provider, model: rows[0].model, tokens: aggregate(rows), observations: rows.length}));
  if (!models.length && state.model) models.push({provider: state.provider, model: state.model, tokens: empty(), observations: 0});
  const end = state.finishedAt || state.updatedAt;
  return {schemaVersion: 2, runId: manifest.id, source: state.binding.runtime, runtime: state.client || null,
    status: !state.binding.file ? 'unavailable' : !state.sealed ? 'collecting' : !state.observed.length ? 'unavailable' : state.issues.length ? 'partial' : 'measured',
    model: models.length === 1 ? models[0].model : null, models, provider: state.provider,
    // Current assistant output and delayed usage are not available at the finish tool boundary.
    scopeComplete: false, scope: 'Runtime-reported usage between the start baseline and finish snapshot of this session. In-flight or delayed usage, earlier conversation, other agents and later delivery are excluded. This is an observed interval, not a complete billed task total.',
    tokens: empty(), observedTokens, elapsedMs: Math.max(0, Date.parse(end) - Date.parse(manifest.createdAt)),
    elapsedKind: 'wall-clock', startedAt: state.startedAt, finishedAt: state.finishedAt || null,
    lastObservedAt: state.observed.at(-1)?.at || null, missingFields: fields.filter(k => observedTokens[k] === null),
    issues: [...new Set(state.issues)], observations: state.observed.length,
    notes: ['Missing metrics are not zero. Cache and reasoning counts are included in the corresponding input/output fields.',
      'Gemini provider totals may additionally include tool tokens. Build duration includes tools and waiting; it is not model inference time.',
      'Model identity comes from runtime records, never the selected configuration or an author estimate.']};
}
function refresh(dir, {finish = false} = {}) {
  const file = path.join(dir, 'usage-session.json'); if (!fs.existsSync(file)) return null;
  if (read(file).sealed) return reportFor(read(file), read(path.join(dir, 'manifest.json')));
  // The run lock also protects concurrent build/read commands; no nested store mutations here.
  let report;
  S.mutate(dir, (_index, _emit, manifest) => {
    const state = read(file);
    if (state.sealed) {report = reportFor(state, manifest); return;}
    if (state.binding.file) try {
      for (const sibling of state.binding.siblingFiles || []) if (fs.statSync(sibling.file).mtimeMs > sibling.mtime) throw new Error('Another segment of this session changed; coverage is ambiguous.');
      const snap = snapshot(state.binding); state.model = snap.model; state.provider = snap.provider; state.client = snap.client;
      state.issues.push(...snap.issues);
      if (state.binding.runtime === 'codex') {
        const prefix = state.baseline;
        if (!prefix.length) throw new Error('No initial cumulative usage baseline was provided.');
        if (snap.rows.length < prefix.length || snap.rows[prefix.length - 1]?.evidenceSha256 !== prefix.at(-1).evidenceSha256) throw new Error('Usage source was rewritten or truncated; previous subtotal retained.');
        const next = [];
        for (let i = prefix.length; i < snap.rows.length; i++) {
          const row = snap.rows[i], before = snap.rows[i - 1];
          const delta = Object.fromEntries(fields.map(k => [k, row.tokens[k] !== null && before.tokens[k] !== null ? number(row.tokens[k] - before.tokens[k]) : null]));
          if (delta.input_tokens === null || delta.output_tokens === null) {state.issues.push('Cumulative usage reset or missing field; interval has a gap.'); continue;}
          if (delta.total_tokens !== 0) next.push({...row, tokens: delta});
        }
        state.observed = next;
      } else {
        const prior = new Set(state.baseline.map(r => r.id));
        // Preserve seen requests across transcript compaction; only explicit updates replace them.
        const seen = new Map(state.observed.map(r => [r.id, r]));
        for (const row of snap.rows) if (!prior.has(row.id)) seen.set(row.id, row);
        state.observed = [...seen.values()];
        if (state.observed.some(r => r.tokens.total_tokens === null)) state.issues.push('One or more messages did not provide token usage.');
      }
    } catch (e) {state.issues.push(e.message);}
    state.issues = [...new Set(state.issues)]; state.updatedAt = new Date().toISOString();
    if (finish) {state.sealed = true; state.finishedAt = manifest.finishedAt || state.updatedAt;}
    atomic(file, state); report = reportFor(state, manifest);
    atomic(path.join(dir, 'token-usage.json'), report);
    fs.writeFileSync(path.join(dir, 'token-usage.md'), ['# Authoring usage', '', `Model: ${report.models.map(m => m.model || 'Not provided').join(', ') || 'Not provided'}`, `Runtime: ${report.runtime || 'Not provided'}`, `Build wall time: ${report.elapsedMs} ms`, `Status: ${report.status}`, '', report.scope, '', ...fields.map(k => `${k}: ${report.observedTokens[k] ?? 'Not provided'}`), '', ...report.issues, '', ...report.notes, ''].join('\n'));
  });
  return report;
}
function publicSummary(dir) {
  if (!fs.existsSync(path.join(dir, 'usage-session.json'))) return null;
  const safeRead = name => {
    const root = fs.realpathSync(dir), file = fs.realpathSync(path.join(root, name)), relative = path.relative(root, file);
    if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Usage evidence escapes its run.');
    return read(file);
  };
  const state = safeRead('usage-session.json'), manifest = safeRead('manifest.json');
  if (!state.sealed) throw new Error('Finish the authoring usage interval before publication.');
  const report = reportFor(state, manifest);
  const label = value => typeof value === 'string' && /^[a-zA-Z0-9 ._:/()-]{1,100}$/.test(value) && !/[:][\\/]|https?:|secret|password/i.test(value) ? value : null;
  return {schemaVersion: 2, status: report.status, runtime: label(report.runtime), elapsedMs: report.elapsedMs,
    scope: report.scope, scopeComplete: false, observedTokens: report.observedTokens,
    models: report.models.map(m => ({model: label(m.model), provider: label(m.provider), tokens: m.tokens, observations: m.observations})),
    evidenceSha256: S.hash({startedAt: state.startedAt, finishedAt: state.finishedAt, baseline: state.baseline, observed: state.observed})};
}
module.exports = {fields, tokens, snapshot, discover, begin, refresh, publicSummary, reportFor};
