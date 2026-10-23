'use strict';

// Usage comes from runtime events, never from an author's estimates or text length.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const empty = () => Object.fromEntries(fields.map(key => [key, null]));
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

function normalize(raw) {
  const value = empty();
  if (!raw || typeof raw !== 'object') return {value, issues: ['Runtime did not provide usage.']};
  for (const key of fields) value[key] = count(raw[key]);
  value.cached_input_tokens ??= count(raw.input_tokens_details?.cached_tokens);
  value.reasoning_output_tokens ??= count(raw.output_tokens_details?.reasoning_tokens);
  const issues = [];
  for (const key of ['input_tokens', 'output_tokens']) if (value[key] === null) issues.push('Missing or invalid ' + key + '.');
  if (value.input_tokens !== null && value.output_tokens !== null) {
    const total = value.input_tokens + value.output_tokens;
    if (!Number.isSafeInteger(total)) issues.push('Token total exceeds the supported integer range.');
    else {
      if (value.total_tokens !== null && value.total_tokens !== total) issues.push('Runtime total differs from input plus output.');
      value.total_tokens = total;
    }
  }
  for (const [subset, parent] of [['cached_input_tokens', 'input_tokens'], ['reasoning_output_tokens', 'output_tokens']]) {
    if (value[subset] !== null && value[parent] !== null && value[subset] > value[parent]) {
      issues.push(subset + ' exceeds ' + parent + '.'); value[subset] = null;
    }
  }
  return {value, issues};
}

function summarize(run) {
  const rows = [], issues = [], sources = [];
  const commands = run.events.filter(e => e.type === 'command.started' && e.details.kind === 'codex');
  for (const start of commands) {
    const rawPath = `commands/${start.id}.codex.jsonl`;
    const stream = run.events.filter(e => e.type.startsWith('codex.') && e.evidenceRefs?.includes(rawPath));
    const finish = run.events.find(e => e.type === 'command.completed' && e.details.commandEventId === start.id);
    let threadId = null, turn = 0;
    const turns = new Map();
    for (const saved of stream) {
      const event = saved.details.event;
      if (event.type === 'thread.started') threadId = event.thread_id || null;
      if (event.type === 'turn.started') turn++;
      if (event.type === 'turn.completed' || event.type === 'turn.failed') {
        const key = event.turn_id || String(turn);
        const normalized = normalize(event.usage);
        // A repeated completion for the same turn replaces its snapshot; it is not added twice.
        turns.set(key, {commandEventId: start.id, threadId, turnId: event.turn_id || null, turnOrdinal: turn,
          status: event.type === 'turn.failed' ? 'failed' : 'completed', tokens: normalized.value,
          issues: normalized.issues, rawPath, rawSeq: saved.details.rawSeq, eventId: saved.id});
      }
      if (event.type === 'error') issues.push(`Runtime error in ${start.id}; see its raw stream.`);
      if (/collab|agent_tool_call/.test(event.item?.type || '')) issues.push('Nested agent activity was reported; its usage is outside the confirmed scope.');
    }
    rows.push(...turns.values());
    if (finish && !turns.size) issues.push(`No completed-turn usage was captured for ${start.id}.`);
    if (finish && finish.details.code !== 0) issues.push(`Runtime exited unsuccessfully for ${start.id}; usage may be incomplete.`);
    if (run.events.some(e => e.type === 'capture.gap' && e.evidenceRefs?.includes(rawPath))) issues.push(`Malformed runtime events in ${start.id}.`);
    sources.push({commandEventId: start.id, threadId, rawPath, exitCode: finish?.details.code ?? null, running: !finish});
  }
  for (const row of rows) issues.push(...row.issues.map(issue => `${row.eventId}: ${issue}`));
  const measured = rows.filter(row => row.tokens.input_tokens !== null && row.tokens.output_tokens !== null);
  const observedTokens = empty();
  for (const key of fields) {
    if (measured.length && measured.every(row => row.tokens[key] !== null)) {
      const total = measured.reduce((sum, row) => sum + row.tokens[key], 0);
      if (Number.isSafeInteger(total)) observedTokens[key] = total;
      else issues.push('Aggregated ' + key + ' exceeds the supported integer range.');
    }
  }
  const running = sources.some(source => source.running) || (!sources.length && run.manifest.configuration?.integration === 'managed-skill-token-usage' && ['running', 'active'].includes(run.manifest.status));
  const complete = sources.length > 0 && !running && measured.length === rows.length && measured.length > 0 && issues.length === 0;
  const status = complete ? 'complete' : running ? 'collecting' : measured.length ? 'partial' : 'unavailable';
  const config = run.manifest.configuration || {};
  const elapsed = Date.parse(run.manifest.finishedAt) - Date.parse(run.manifest.createdAt);
  return {schemaVersion: 1, status, source: 'codex-exec-json', runId: run.manifest.id,
    skill: config.skill || null, skillSha256: config.skillSha256 || null, requestSha256: config.requestSha256 || null,
    model: config.actualModel || null, requestedModel: config.requestedModel || null, reasoningEffort: config.reasoningEffort || null,
    cliVersion: config.cliVersion || null, parentThreadId: config.parentThreadId || null,
    scope: 'Managed authoring task, including its context, tool feedback and final response. Outer desktop conversation and other agents are excluded.',
    scopeComplete: complete, tokens: complete ? observedTokens : empty(), observedTokens,
    missingFields: fields.filter(key => observedTokens[key] === null),
    completedTurns: rows.filter(row => row.status === 'completed').length,
    modelRequests: null, retries: null, elapsedMs: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null,
    outcome: {status: run.manifest.status, candidates: run.candidates.length,
      tests: Object.fromEntries(['passed', 'failed', 'unknown', 'error'].map(status => [status, run.tests.filter(t => t.status === status).length]))},
    sources, turns: rows, issues: [...new Set(issues)],
    notes: ['Cached input is included in input; reasoning output is included in output. Do not add either subset again.',
      'Turn count is not model request count. Missing values are not zero.',
      'Runtime usage is not an invoice or a measure of subscription quota.']};
}

function markdown(report) {
  const values = report.scopeComplete ? report.tokens : report.observedTokens;
  const labels = ['Input tokens', 'Cached input tokens (included in input)', 'Cache-write input tokens (when supplied)',
    'Output tokens', 'Reasoning tokens (included in output)', 'Total tokens (input + output)'];
  return ['# Authoring token usage', '', `Status: **${report.status}**`, '', report.scope,
    ...(report.scopeComplete ? [] : ['', 'Values below are an observed subtotal, not a complete task total.']), '',
    '| Metric | Tokens |', '| --- | ---: |', ...fields.map((key, i) => `| ${labels[i]} | ${values[key] ?? 'Not provided'} |`), '',
    `Run: ${report.runId}`, `Skill: ${report.skill || 'Not recorded'}`, `Completed turns: ${report.completedTurns}`,
    `Model: ${report.model || 'Not reported by this event source'}`, `Runtime: ${report.cliVersion || 'Not recorded'}`,
    `Duration: ${report.elapsedMs === null ? 'Pending' : report.elapsedMs + ' ms'}`, '',
    ...report.issues.map(issue => '- ' + issue), ...report.notes.map(note => '- ' + note), '',
    'Evidence and per-turn usage are saved in token-usage.json. Raw streams remain local.', ''].join('\n');
}

function writeReport(directory, run) {
  const report = summarize(run);
  for (const [name, content] of [['token-usage.json', JSON.stringify(report, null, 2) + '\n'], ['token-usage.md', markdown(report)]]) {
    const file = path.join(directory, name), temp = file + '.' + crypto.randomUUID() + '.tmp';
    fs.writeFileSync(temp, content); fs.renameSync(temp, file);
  }
  return report;
}

module.exports = {normalize, summarize, markdown, writeReport};
