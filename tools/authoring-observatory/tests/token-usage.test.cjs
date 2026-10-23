'use strict';

// Protocol tests use synthetic usage. No model is started and no maze is certified.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const test = require('node:test');
const S = require('../lib/store.cjs');
const U = require('../lib/token-usage.cjs');
const runtime = path.resolve(__dirname, '../skill-runtime.cjs');

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mazebench-token-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('mazebench-token-test-'));
    fs.rmSync(dir, {recursive: true, force: true});
  });
  return dir;
}
function fixture(t) {
  const dir = temporary(t), runDir = S.createRun({root: path.join(dir, 'runs'), id: 'synthetic', configuration: {fixture: true}});
  const start = S.appendEvent(runDir, 'command.started', {kind: 'codex'});
  const rawPath = `commands/${start.id}.codex.jsonl`; let seq = 0;
  const emit = event => S.appendEvent(runDir, 'codex.' + event.type, {event, rawSeq: ++seq}, {evidenceRefs: [rawPath]});
  const end = (code = 0) => S.appendEvent(runDir, 'command.completed', {commandEventId: start.id, code});
  emit({type: 'thread.started', thread_id: 'synthetic-thread'});
  return {dir, runDir, emit, end, rawPath, summary: () => U.summarize(S.readRun(runDir))};
}
const usage = {input_tokens: 100, cached_input_tokens: 60, output_tokens: 30, reasoning_output_tokens: 20};

test('subsets are not double counted; equal legitimate turns count, duplicate completions do not', t => {
  const f = fixture(t);
  f.emit({type: 'turn.started'}); f.emit({type: 'turn.completed', usage}); f.emit({type: 'turn.completed', usage});
  f.emit({type: 'turn.started'}); f.emit({type: 'turn.completed', usage}); f.end();
  const r = f.summary();
  assert.equal(r.status, 'complete'); assert.equal(r.completedTurns, 2); assert.equal(r.modelRequests, null);
  assert.equal(r.tokens.total_tokens, 260); assert.equal(r.tokens.cached_input_tokens, 120);
  assert.equal(r.tokens.reasoning_output_tokens, 40); assert.equal(r.tokens.cache_write_input_tokens, null);
});
test('missing usage never becomes zero or a complete total', t => {
  const f = fixture(t); f.emit({type: 'turn.completed'}); f.end();
  const r = f.summary(); assert.equal(r.status, 'unavailable'); assert.equal(r.tokens.total_tokens, null);
});
test('missing optional details remain null while input/output totals can be complete', t => {
  const f = fixture(t); f.emit({type: 'turn.completed', usage: {input_tokens: 5, output_tokens: 2}}); f.end();
  const r = f.summary(); assert.equal(r.status, 'complete'); assert.equal(r.tokens.total_tokens, 7);
  assert.equal(r.tokens.reasoning_output_tokens, null); assert.equal(r.tokens.cached_input_tokens, null);
});
test('failed run preserves observed usage without claiming a full total', t => {
  const f = fixture(t); f.emit({type: 'turn.completed', usage}); f.end(1);
  const r = f.summary(); assert.equal(r.status, 'partial'); assert.equal(r.tokens.total_tokens, null);
  assert.equal(r.observedTokens.total_tokens, 130);
});
test('malformed stream and failed turns cannot silently certify coverage', t => {
  const f = fixture(t); f.emit({type: 'turn.started'}); f.emit({type: 'turn.completed', usage});
  f.emit({type: 'turn.started'}); f.emit({type: 'turn.failed'});
  S.appendEvent(f.runDir, 'capture.gap', {reason: 'Invalid JSON'}, {evidenceRefs: [f.rawPath]}); f.end();
  assert.equal(f.summary().status, 'partial'); assert.equal(f.summary().tokens.total_tokens, null);
});
test('still-running stream is collecting even after an intermediate completion', t => {
  const f = fixture(t); f.emit({type: 'turn.completed', usage});
  assert.equal(f.summary().status, 'collecting'); assert.equal(f.summary().tokens.total_tokens, null);
});
test('invalid numeric counts and inconsistent subset totals are exposed', () => {
  assert.equal(U.normalize({input_tokens: -1, output_tokens: 3}).value.input_tokens, null);
  assert.equal(U.normalize({input_tokens: '10', output_tokens: 3}).value.input_tokens, null);
  const r = U.normalize({input_tokens: 2, cached_input_tokens: 9, output_tokens: 3, reasoning_output_tokens: 4, total_tokens: 7});
  assert.equal(r.value.total_tokens, 5); assert.equal(r.value.cached_input_tokens, null); assert.equal(r.issues.length, 3);
});
test('JSON and Markdown reports are attached to the run; historical runs stay unmeasured', t => {
  const f = fixture(t); assert.equal(S.readRun(f.runDir).tokenUsage, null);
  f.emit({type: 'turn.completed', usage}); f.end(); U.writeReport(f.runDir, S.readRun(f.runDir));
  assert.equal(S.readRun(f.runDir).tokenUsage.tokens.total_tokens, 130);
  assert.match(fs.readFileSync(path.join(f.runDir, 'token-usage.md'), 'utf8'), /130/);
});

test('viewer handlers expose the report through both the run and legacy artifact API without a listening socket', t => {
  const f = fixture(t); f.emit({type: 'turn.completed', usage}); f.end();
  S.updateManifest(f.runDir, {usageReport: 'token-usage.json'}); U.writeReport(f.runDir, S.readRun(f.runDir));
  const server = require('../server.cjs').createServer({root: path.dirname(f.runDir)});
  const get = url => {
    let status, body;
    server.emit('request', {method: 'GET', headers: {host: '127.0.0.1'}, url},
      {writeHead(code) {status = code;}, end(value) {body = JSON.parse(String(value));}});
    assert.equal(status, 200); return body;
  };
  assert.equal(get('/api/runs/synthetic').tokenUsage.tokens.total_tokens, 130);
  assert.equal(get('/api/runs/synthetic/artifact?path=token-usage.json').tokens.total_tokens, 130);
});

