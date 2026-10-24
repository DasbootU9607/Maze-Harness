'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const S = require('../lib/store.cjs');
const U = require('../lib/session-usage.cjs');
function fixture(t, runtime, records) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'maze-passive-'));
  t.after(() => {assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('maze-passive-')); fs.rmSync(root, {recursive: true, force: true});});
  const file = path.join(root, 'session.jsonl'), run = S.createRun({root, id: 'test'});
  const append = r => fs.appendFileSync(file, JSON.stringify(r) + '\n'); fs.writeFileSync(file, ''); records.forEach(append);
  const binding = {runtime, file, sessionId: 'session-1'};
  U.begin(run, {binding});
  return {root, run, file, append, binding, refresh: finish => U.refresh(run, {finish})};
}
const counter = (input, output) => ({type: 'event_msg', payload: {type: 'token_count', info: {total_token_usage: {input_tokens: input, cached_input_tokens: input / 2, output_tokens: output, total_tokens: input + output}}}});
const meta = {type: 'session_meta', payload: {id: 'session-1', originator: 'Codex Desktop', model_provider: 'openai'}};
test('Codex binds the current session, subtracts history, deduplicates and records model switches', t => {
  const f = fixture(t, 'codex', [meta, {type: 'turn_context', payload: {model: 'model-a'}}, counter(100, 10)]);
  f.append(counter(120, 14)); f.append(counter(120, 14)); f.append({type: 'turn_context', payload: {model: 'model-b'}}); f.append(counter(150, 20));
  const r = f.refresh(true); assert.equal(r.observedTokens.total_tokens, 60); assert.equal(r.tokens.total_tokens, null);
  assert.deepEqual(r.models.map(m => [m.model, m.tokens.total_tokens]), [['model-a', 24], ['model-b', 36]]);
  assert.equal(r.observedTokens.reasoning_output_tokens, null); assert.equal(r.status, 'measured');
  f.append(counter(200, 30)); assert.equal(f.refresh().observedTokens.total_tokens, 60, 'finish seals the task');
  const publicData = U.publicSummary(f.run); assert.equal(publicData.observedTokens.total_tokens, 60);
  assert.ok(!JSON.stringify(publicData).includes(f.file)); assert.ok(!JSON.stringify(publicData).includes('session-1'));
});
test('unknown clients have null tokens and real wall time', t => {
  const f = fixture(t, 'unknown-client', []), r = f.refresh(true);
  assert.equal(r.status, 'unavailable'); assert.equal(r.observedTokens.total_tokens, null); assert.ok(r.elapsedMs >= 0);
});
test('client reasoning settings are recorded independently of model identity and token totals', t => {
  const f=fixture(t,'codex',[meta,{type:'turn_context',payload:{model:'model-a',effort:'high'}},counter(100,10)]);
  f.append(counter(120,14)); f.append({type:'turn_context',payload:{model:'model-a',effort:'xhigh'}}); f.append(counter(150,20));
  const report=f.refresh(true);
  assert.deepEqual(report.models.map(row=>[row.model,row.reasoningEffort,row.tokens.total_tokens]),[['model-a','high',24],['model-a','xhigh',36]]);
  assert.equal(report.observedTokens.total_tokens,60);
  const summary=U.publicSummary(f.run);assert.equal(summary.models[1].reasoningEffort,'xhigh');
  assert.equal(Date.parse(summary.finishedAt)-Date.parse(summary.startedAt),summary.elapsedMs);
});
test('missing or unsafe effort fields do not inherit another model setting', t => {
  const f=fixture(t,'codex',[meta,{type:'turn_context',payload:{model:'model-a',effort:'ultra'}},counter(100,10)]);
  f.append({type:'turn_context',payload:{model:'model-b'}});f.append(counter(110,12));
  assert.equal(f.refresh(true).models[0].reasoningEffort,null);
});
test('identity mismatch and counter reset cannot produce invented complete totals', t => {
  const f = fixture(t, 'codex', [meta, counter(100, 10)]);
  f.append(counter(110, 12)); f.append(counter(2, 1));
  const r = f.refresh(true); assert.equal(r.status, 'partial'); assert.equal(r.observedTokens.total_tokens, 12);
  assert.throws(() => U.snapshot({...f.binding, sessionId: 'other'}), /identity mismatch/);
});
test('Claude counts real cache components once and deduplicates message snapshots', t => {
  const msg = (id, usage) => ({type: 'assistant', sessionId: 'session-1', message: {id, model: 'claude-test', usage}});
  const f = fixture(t, 'claude-code', [msg('prior', {input_tokens: 999, output_tokens: 99})]);
  f.append(msg('new', {input_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 5, output_tokens: 7}));
  f.append(msg('new', {input_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 5, output_tokens: 8}));
  const r = f.refresh(true); assert.equal(r.observedTokens.total_tokens, 43); assert.equal(r.observedTokens.input_tokens, 35);
  assert.equal(r.observedTokens.reasoning_output_tokens, null);
});
test('Gemini transcript patches preserve request identity, thought output and provider totals', t => {
  const f = fixture(t, 'gemini-cli', [{sessionId: 'session-1', projectHash: 'project'}]);
  f.append({id: 'new', type: 'gemini', model: 'gemini-test'});
  f.append({$patch: {id: 'new', tokens: {input: 10, output: 5, thoughts: 3, cached: 4, tool: 2, total: 20}}});
  const r = f.refresh(true); assert.equal(r.observedTokens.total_tokens, 20); assert.equal(r.observedTokens.output_tokens, 8);
});
test('generic client usage has no fabricated optional fields and ignores foreign sessions', t => {
  const f = fixture(t, 'usage-jsonl', [{type: 'session', sessionId: 'session-1'}]);
  f.append({type: 'usage', sessionId: 'session-1', requestId: 'r1', model: 'local-model', provider: 'custom', usage: {input_tokens: 20, output_tokens: 7}});
  f.append({type: 'usage', sessionId: 'other', requestId: 'r2', usage: {input_tokens: 999, output_tokens: 999}});
  const r = f.refresh(true); assert.equal(r.observedTokens.total_tokens, 27); assert.equal(r.model, 'local-model');
});
test('the legacy run entrypoint preserves the caller and does not execute a configured model command', () => {
  let called = false;
  const result = require('../lib/managed-authoring.cjs').run({spec: 'new.json', config: {codexEntrypoint: 'must-never-execute'}, createSession: () => {called = true; return {runDir: 'existing-session'};}});
  assert.equal(called, true); assert.equal(result.exitCode, 0);
});
test('client hook installation preserves selected models and is idempotent', t => {
  const f = fixture(t, 'unknown', []), {install} = require('../../../scripts/install-usage-hooks.cjs');
  fs.mkdirSync(path.join(f.root, '.claude')); fs.writeFileSync(path.join(f.root, '.claude/settings.json'), JSON.stringify({model: 'keep-me', hooks: {Stop: [{hooks: []}]}}));
  const options = {home: f.root, runtime: path.resolve(__dirname, '..'), backup: path.join(f.root, 'backup')};
  assert.equal(install(options).files.length, 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, '.claude/settings.json'))).model, 'keep-me');
  assert.equal(install(options).files.length, 0);
});

test('real process ancestry binds synthetic Claude and Gemini clients without launching a model', t => {
  const f = fixture(t, 'unknown', []), {spawnSync} = require('node:child_process');
  const bindingModule = path.resolve(__dirname, '../lib/usage-binding.cjs'), usageModule = path.resolve(__dirname, '../lib/session-usage.cjs');
  const hook = path.join(f.root, 'hook.cjs'), reader = path.join(f.root, 'reader.cjs');
  fs.writeFileSync(hook, `const B=require(${JSON.stringify(bindingModule)});if(!B.saveBinding(process.argv[3],process.argv[2],{session_id:'synthetic-'+process.argv[2],transcript_path:process.argv[4]}))throw new Error('No matching client process');`);
  fs.writeFileSync(reader, `const U=require(${JSON.stringify(usageModule)});console.log(JSON.stringify(U.discover({bindingRoot:process.argv[2]})));`);
  for (const [runtime, pkg] of [['claude-code', '@anthropic-ai/claude-code'], ['gemini-cli', '@google/gemini-cli']]) {
    const client = path.join(f.root, pkg, 'synthetic-client.cjs'); fs.mkdirSync(path.dirname(client), {recursive: true});
    fs.writeFileSync(client, `const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,${JSON.stringify([hook, runtime, path.join(f.root, 'bindings'), f.file])},{encoding:'utf8',windowsHide:true});if(r.status)throw new Error(r.stderr);const s=spawnSync(process.execPath,${JSON.stringify([reader, path.join(f.root, 'bindings')])},{encoding:'utf8',windowsHide:true});process.stdout.write(s.stdout);process.stderr.write(s.stderr);process.exitCode=s.status;`);
    const result = spawnSync(process.execPath, [client], {encoding: 'utf8', windowsHide: true, timeout: 45000});
    assert.equal(result.status, 0, result.stderr); const binding = JSON.parse(result.stdout);
    assert.equal(binding.runtime, runtime); assert.equal(binding.sessionId, 'synthetic-' + runtime); assert.equal(binding.file, f.file);
  }
});
