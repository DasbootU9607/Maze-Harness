'use strict';

// Preserve every recorded event without publishing private commands or payloads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { hash } = require('./site-content.cjs');

const signature = rows => rows.map(row => ({ id: row.eventId || row.id, seq: row.order ?? row.seq, type: row.eventType || row.type }));
const typeCounts = rows => [...new Set(rows.map(row => row.type))].sort().map(type => ({ type, count: rows.filter(row => row.type === type).length }));

function assertEventCoverage(document, events) {
  const coverage = document.coverage.events;
  assert(coverage, 'Missing source-event coverage');
  const represented = document.nodes.filter(node => node.eventId).sort((a, b) => a.order - b.order);
  const rows = signature(represented);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'Duplicate source event');
  assert.equal(new Set(rows.map(row => row.seq)).size, rows.length, 'Duplicate source sequence');
  assert.equal(rows.length, coverage.sourceCount, 'A recorded event is missing from the public timeline');
  assert.equal(coverage.representedCount, coverage.sourceCount, 'Incomplete source-event coverage');
  rows.forEach((row, i) => {
    assert(/^e\d+$/.test(row.id) && /^[a-z][a-z0-9.-]*$/.test(row.type), 'Invalid source-event identity');
    assert.equal(row.seq, i + 1, 'Source-event order has a gap');
  });
  assert.equal(hash(rows), coverage.sequenceSha256, 'Source-event identities differ from the recorded sequence');
  assert.deepEqual(typeCounts(rows), coverage.types, 'Source-event type counts differ');
  if (events) assert.deepEqual(rows, signature(events), 'Public timeline does not represent every original event exactly once');
  const ids = new Set(document.nodes.map(node => node.id));
  for (const row of [...document.records, ...document.operations]) {
    for (const key of ['relatedNodeId', 'startNodeId', 'resultNodeId']) if (row[key]) assert(ids.has(row[key]), 'Missing related source event');
  }
}

function completeRecordedEvents(document, events, { clean, savedFile, runDir }) {
  const { nodes, candidates, tests, operations } = document;
  const bySequence = new Map(events.map(event => [event.seq, event])), covered = new Map();
  const expected = { candidate: 'candidate.saved', test: 'test.completed', operation: 'command.completed', note: 'design.note', resource: 'resource.read', replay: 'artifact.saved' };
  for (const node of nodes) {
    if (node.kind === 'delivery') continue;
    const event = bySequence.get(node.order);
    const type = node.kind === 'test' && node.details.category === 'diagnostic' ? 'command.completed'
      : node.kind === 'resource' && node.details.resourceId.startsWith('snapshot-') ? 'skill.attached' : expected[node.kind];
    if (!event || event.type !== type) continue;
    assert(!covered.has(event.id), 'Two public records claim the same source event');
    node.eventId = event.id; node.eventType = event.type; covered.set(event.id, node);
  }
  const candidateIds = new Set(candidates.map(candidate => candidate.id));
  const records = document.records = [];
  const filename = value => clean(path.posix.basename(String(value).replaceAll('\\', '/')).replace(/^[a-f0-9]{64}-/, ''), 180);
  const safeLabel = event => {
    const label = event?.details?.label;
    return typeof label === 'string' && !/[\u3400-\u9fff]/.test(label) ? clean(label, 160) : 'recorded operation';
  };
  const addFile = (record, relative) => {
    const file = savedFile(runDir, relative), bytes = fs.readFileSync(file);
    record.files.push({ name: filename(relative), sha256: hash(bytes) });
    return bytes;
  };
  const fact = (record, label, value) => { if (Number.isSafeInteger(value) && value >= 0) record.facts.push({ label, value: String(value) }); };
  for (const event of events) {
    if (covered.has(event.id)) continue;
    const d = event.details || {}, id = 'event-' + event.id;
    assert(/^e\d+$/.test(event.id) && /^[a-z][a-z0-9.-]*$/.test(event.type), 'Invalid recorded event identity');
    const record = { id, graphNodeId: id, candidateId: candidateIds.has(event.candidateId) ? event.candidateId : null, eventType: event.type,
      label: 'Recorded ' + event.type, status: 'neutral', scope: 'This recorded step is retained. Its private payload is not published.', relatedNodeId: null, files: [], facts: [] };
    if (event.type === 'run.created') { record.label = 'Start authoring run'; record.scope = 'The recorder opened this authoring run. This does not establish an empty prior conversation context.'; }
    if (event.type === 'collector.started') { record.label = 'Start automatic capture'; record.scope = 'The automatic collector started. Recorded command boundaries, reads and saved artifacts are shown in sequence.'; }
    if (event.type === 'run.finished') { record.label = 'Finish authoring run'; record.scope = 'The recorder closed the run. Test verdicts and publication are separate records.'; }
    if (event.type === 'capture.gap') { record.label = 'Record a capture gap'; record.status = 'unknown'; record.scope = 'The collector recorded a gap. Activity inside that gap remains unknown.'; }
    if (event.type === 'command.started') { record.label = 'Start: ' + safeLabel(event); record.scope = 'Command execution started. Completion and any test verdict are separate records.'; }
    if (event.type === 'command.completed') {
      const start = events.find(item => item.id === d.commandEventId);
      record.label = 'Finish: ' + safeLabel(start);
      record.status = d.signal || Number.isInteger(d.code) && d.code !== 0 ? 'failed' : Number.isInteger(d.code) ? 'neutral' : 'unknown';
      record.scope = Number.isInteger(d.code) ? `Command execution ended with exit code ${d.code}. See the associated test result for its recorded verdict.` : 'Command execution ended without a recorded exit code. Its outcome remains unknown.';
      if (Number.isInteger(d.code)) record.facts.push({ label: 'Process exit code', value: String(d.code) });
      fact(record, 'Elapsed milliseconds', d.durationMs);
    }
    if (event.type === 'artifact.saved') {
      const labels = { search: 'Save search report', probe: 'Save diagnostic report', build: 'Save build artifact', 'viewer-check': 'Save viewer validation' };
      record.label = labels[d.kind] || 'Save recorded artifact';
      record.scope = 'The recorder archived this file. Saving evidence does not itself establish a passing test.';
      if (d.artifactPath) {
        const bytes = addFile(record, d.artifactPath);
        let payload; try { payload = JSON.parse(bytes); } catch (_) { /* Non-JSON artifacts retain file metadata. */ }
        if (d.kind === 'search' && payload) {
          if (['solved', 'unsolved', 'unknown', 'limit', 'timeout'].includes(payload.status)) record.facts.push({ label: 'Recorded search outcome', value: payload.status });
          fact(record, 'Expanded states', payload.expanded); fact(record, 'Solution inputs', payload.moves);
        }
        if (d.kind === 'probe' && Array.isArray(payload)) {
          fact(record, 'Input observations', payload.length);
          const coupled = payload.filter(row => Number.isInteger(row?.step) && Array.isArray(row.event?.moved) && row.event.moved.length > 1 && row.event.moved.every(group => /^M[0-4]$/.test(group)));
          for (const row of coupled.slice(0, 20)) record.facts.push({ label: `Groups translated at input ${row.step}`, value: row.event.moved.join(', ') });
        }
        if (d.kind === 'viewer-check' && payload) {
          if (['passed', 'failed', 'unknown'].includes(payload.status)) record.facts.push({ label: 'Recorded viewer result', value: payload.status });
          fact(record, 'Saved versions checked', payload.candidates); fact(record, 'Saved frames checked', payload.recordedFrames);
        }
      }
    }
    if (event.type === 'build.saved') {
      record.label = 'Save build files'; record.scope = 'Build files were archived for this candidate. The file list and fingerprints identify the saved output; verification appears separately.';
      for (const file of d.files || []) if (file.artifactPath) addFile(record, file.artifactPath);
    }
    records.push(record);
    const node = { id, kind: 'record', label: record.label, status: record.status, order: event.seq, eventId: event.id, eventType: event.type, summary: record.scope,
      details: { recordId: id, candidateId: record.candidateId, eventType: event.type } };
    nodes.push(node); covered.set(event.id, node);
  }
  for (const event of events.filter(event => event.type === 'command.completed')) {
    const node = covered.get(event.id), start = covered.get(event.details?.commandEventId);
    const operation = operations.find(item => item.graphNodeId === node.id), record = records.find(item => item.graphNodeId === node.id);
    const verdict = events.find(item => item.type === 'test.completed' && item.details?.commandEventId === event.details?.commandEventId);
    if (operation) {
      operation.startNodeId = start?.id || null;
      operation.resultNodeId = verdict ? covered.get(verdict.id)?.id || null : null;
      operation.exitCode = event.details.code;
      operation.scope = 'Command execution completed normally (exit code 0). This is an execution status; gameplay and mechanism verdicts belong to the test records.';
      node.summary = operation.scope;
    }
    if (record) { record.relatedNodeId = start?.id || null; record.resultNodeId = verdict ? covered.get(verdict.id)?.id || null : null; }
    const startRecord = records.find(item => item.graphNodeId === start?.id);
    if (startRecord) startRecord.relatedNodeId = node.id;
    const diagnostic = tests.find(item => item.graphNodeId === node.id);
    if (diagnostic?.category === 'diagnostic') {
      diagnostic.scope = `The diagnostic command ended with exit code ${event.details.code ?? 'unknown'}. Its saved output and subsequent diagnosis explain the result; this status alone is not a mechanism-test verdict.`;
      node.summary = diagnostic.scope;
    }
  }
  nodes.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const rows = signature(events);
  document.coverage.events = { sourceCount: events.length, representedCount: covered.size, sequenceSha256: hash(rows), types: typeCounts(rows) };
  assertEventCoverage(document, events);
}

module.exports = { completeRecordedEvents, assertEventCoverage };
