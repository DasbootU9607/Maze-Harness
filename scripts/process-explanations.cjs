'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const guidance = require('./process-case-guidance.cjs');

const outcomes = new Set(['solved', 'unsolved', 'passed', 'failed', 'unknown', 'error', 'limit', 'timeout', 'unsupported']);
const scopeLimit = 'These are author-side checks of the declared conditions, not a human-difficulty score or a blind independent-agent evaluation.';

function checkMeaning(name) {
  const key = name.replaceAll('-', '_');
  if (/^prefix_positive_|^dependency_\d+_positive/.test(key)) return 'Positive control: the later operation must become usable, or the complete goal reachable, when preparation is allowed.';
  if (/^prefix_without_|^dependency_\d+_without_preparation/.test(key)) return 'Dependency exclusion: search for the later operation opportunity or complete goal while forbidding the named preparation. A found route disproves this necessity claim.';
  if (/^dock_without_/.test(key)) return 'Directional probe: test docking without this direction. A solved probe means that direction can be bypassed; read the recorded expected outcome before interpreting Passed.';
  if (/^blocked_/.test(key)) return 'At the declared state, check the actual pushing stance or whole-group push obstruction using ordinary physics.';
  if (/^stage_/.test(key)) return 'Replay the declared stage and check its required pose, usable access or next operation within the verifier\'s stated scope.';
  if (/^matched_boundary_/.test(key)) return 'Remove only the declared boundary at a matched stance. Test that the blocked push becomes possible and the excluded preparation can be bypassed; record walking side effects.';
  if (/freeze.*after_any_first_contact/.test(key)) return 'Across first-contact histories, freeze this group and search for completion. Exhaustion excludes a completion with that group frozen; it does not prove every contact state is recoverable.';
  if (/^freeze[_-]|^cross_movement_required/.test(key)) return 'Freeze the named group and search for the complete objective. Expected unsolved tests whether movement of that group is necessary.';
  if (/initial_frozen_walking/.test(key)) return 'Keep all objects fixed and search for a walking-only completion from the initial state.';
  if (/forbid_mechanism/.test(key)) return 'Forbid the declared mechanism event and search for the complete objective. A solution is a mechanism bypass.';
  if (/static_cross_brak/.test(key)) return 'Exclude stopping against the stationary cross and search for the full gem-and-return objective.';
  if (/at_most|more_than_two_motions/.test(key)) return 'Restrict the allowed number of object-moving inputs and search for a complete goal, testing whether a simpler completion exists.';
  if (/one_same_direction|one_pushing_direction|single_direction/.test(key)) return 'Allow object movement in only one compass direction and search for completion.';
  if (/first_mechanism_then_walking|first_cross_motion_then_frozen/.test(key)) return 'Search all supported first-use histories for a completion requiring no further object movement.';
  if (/without_ordered_reuse|without_retained_shield/.test(key)) return 'Search for a complete route that omits the declared ordered reuse or direction change.';
  if (/walking_to_predocked/.test(key)) return 'Test whether the initial arrangement already permits tool use without independent preparation.';
  if (/^selected_/.test(key)) return 'Apply the restriction at the selected witness state only. This does not quantify over every reachable state.';
  if (/ordinary_and_search_transitions/.test(key)) return 'Compare each ordinary-engine transition with the search transition on the saved route.';
  if (/browser_frame|normal_play_all/.test(key)) return 'Perform the recorded browser inputs and compare every observed actor state with the ordinary-engine replay.';
  if (/undo|reset/.test(key)) return 'Check Undo and Reset at the recorded first-push or pre-collection state; use the stated test scope for collection persistence.';
  if (/save.*export|export.*design/.test(key)) return 'Save and export the unchanged editor map, then compare its cells with the tested design.';
  if (/editor.*render/.test(key)) return 'Check that the editor renders the saved map in the real browser.';
  if (/saved_build_matches/.test(key)) return 'Compare the saved build cells with the recorded design so the replay tests the delivered map.';
  if (/single_gate_down/.test(key)) return 'At the selected gate-down state, verify an accessible stance and ordinary action that restore the gate.';
  if (/preserved_downward/.test(key)) return 'Replay the retained downward completion that disproved the earlier upward-only claim.';
  if (/complete|official_solver_positive/.test(key)) return 'Positive control: find or replay the complete declared objective, including a doorway return when required.';
  return 'Recorded assertion: ' + name.replaceAll('_', ' ').replaceAll('-', ' ') + '. Its result is limited to the saved test scope.';
}

function sourcePurpose(resource) {
  const name = resource.basename;
  if (name === 'SKILL.md') return 'Authoring workflow, supported mechanism and required delivery checks.';
  if (name === 'mechanism-logic.md') return 'Extracted functional roles, contact relationships and preparation dependencies to realize in a new layout.';
  if (/planning-depth/.test(name)) return 'Guidance for connected stages, usable recovery and avoiding trivial completions.';
  if (/design-template/.test(name)) return 'The design contract scaffold; reading it does not establish that a complete reference map was copied.';
  if (/world-map/.test(name)) return 'Original source geometry for checking actual members, terrain and boundaries.';
  if (/states/.test(name)) return 'Recorded reference poses and moves for checking how the source mechanism operates.';
  if (/case\.md$/.test(name)) return 'The source case explanation and its scoped mechanism evidence.';
  if (/validation|verification|verif|checks|browser-check/.test(name)) return 'Verification rules or implementations defining what the checks can and cannot establish.';
  if (/runtime/.test(name)) return 'Runtime implementation used to inspect motion, contact and supported verification behavior.';
  return 'Supporting design or reference material identified by the saved filename and fingerprint.';
}

function assertExplanations(document) {
  assert(Array.isArray(document.explanations), 'Missing process explanations');
  const nodes = new Map(document.nodes.map(node => [node.id, node]));
  assert.equal(document.explanations.length, nodes.size, 'Every process step needs an explanation');
  assert.equal(new Set(document.explanations.map(row => row.nodeId)).size, nodes.size, 'Duplicate process explanation');
  for (const row of document.explanations) {
    assert(nodes.has(row.nodeId), 'Explanation targets a missing step');
    assert.equal(row.basis, 'saved-evidence-review');
    for (const key of ['headline', 'action', 'result', 'decision']) assert(typeof row[key] === 'string' && row[key].trim(), 'Incomplete explanation: ' + row.nodeId);
    assert(typeof row.badge === 'string' && row.badge.length <= 40);
    assert(Array.isArray(row.evidence) && row.evidence.length && row.evidence.every(id => nodes.has(id)), 'Explanation evidence is missing');
    const test = document.tests.find(test => test.graphNodeId === row.nodeId);
    assert.deepEqual(row.checks.map(check => ({ name: check.name, status: check.verdict })), test?.checks || [], 'Explained checks differ from recorded verdicts');
    for (const check of row.checks) {
      assert(check.meaning && (!check.expected || outcomes.has(check.expected)) && (!check.observed || outcomes.has(check.observed)));
    }
  }
  const reviewed = guidance[document.caseId];
  if (reviewed) {
    assert.equal(document.coverage.events.sequenceSha256, reviewed.sequence, 'Reviewed history changed; inspect the explanations again');
    for (const [id, expected] of Object.entries(reviewed.nodes)) {
      const actual = document.explanations.find(row => row.nodeId === id);
      for (const key of Object.keys(expected)) assert.deepEqual(actual?.[key], expected[key], 'Reviewed explanation drift: ' + id);
    }
  }
}

function explainProcess(document, { index, events, savedFile, runDir }) {
  const groups = ['candidates', 'tests', 'notes', 'resources', 'operations', 'replays', 'records'];
  const records = new Map(groups.flatMap(key => document[key] || []).map(row => [row.graphNodeId, row]));
  const nodeFor = id => document.nodes.find(node => node.id === id);
  const sourceReports = new Map(index.tests.filter(test => test.reportPath).map(test => [test.id, JSON.parse(fs.readFileSync(savedFile(runDir, test.reportPath), 'utf8'))]));
  const reviewed = guidance[document.caseId];
  if (reviewed) assert.equal(document.coverage.events.sequenceSha256, reviewed.sequence, 'Reviewed source sequence changed');
  const explanations = document.explanations = [];
  for (const node of document.nodes) {
    const record = records.get(node.id), event = events.find(event => event.id === node.eventId);
    const candidateId = record?.candidateId || node.details?.candidateId;
    const candidate = document.candidates.find(candidate => candidate.id === candidateId);
    const laterNote = document.notes.find(note => note.candidateId === candidateId && nodeFor(note.graphNodeId).order > node.order);
    const row = { nodeId: node.id, basis: 'saved-evidence-review', headline: node.label, action: node.summary,
      result: 'This step is retained in the saved event sequence; its payload does not establish a separate gameplay verdict.',
      decision: 'Follow the linked records for the subsequent action. Unrecorded reasons remain unknown.', badge: '', evidence: [node.id], observations: [], checks: [] };
    const addEvidence = id => { if (id && !row.evidence.includes(id)) row.evidence.push(id); };
    if (candidate) addEvidence(candidate.graphNodeId);
    if (node.kind === 'resource') {
      row.action = (record.delivery === 'recorded-read' ? 'Read ' : 'Capture a version snapshot of ') + record.displayPath + '. ' + sourcePurpose(record);
      const citations = document.edges.filter(edge => edge.kind === 'cites' && edge.from === node.id);
      row.result = record.delivery === 'recorded-read' ? 'The recorder captured delivery of these document bytes. This establishes recorded access, not comprehension or memory.' : 'The dependency version was saved. This event does not record a document read.';
      row.decision = citations.length ? 'The linked author notes explicitly cite this resource; consult their stated design changes for evidence of its role.' : 'No explicit note citation is linked to this read or snapshot; actual use cannot be inferred from access alone.';
      citations.forEach(edge => addEvidence(edge.to));
    } else if (node.kind === 'note') {
      row.headline = record.goal || record.label || 'Recorded author note'; row.action = record.change || record.goal || 'Record an author annotation.'; row.result = record.reason || 'The author recorded the stated proposal; its tests remain separate evidence.';
      row.decision = record.expectedChecks.length ? 'Planned checks: ' + record.expectedChecks.join('; ') + '.' : 'This is an author explanation, not a test result.';
      document.edges.filter(edge => edge.to === node.id && edge.kind === 'cites').forEach(edge => addEvidence(edge.from));
    } else if (node.kind === 'candidate') {
      const parent = document.candidates.find(candidate => candidate.id === record.parentId);
      row.action = parent ? record.cellsSha256 === parent.cellsSha256 ? `Save ${record.id} with the same map cells as ${parent.id}; the saved design metadata differs.` : `Save ${record.id} after changing ${record.diff.changed.length} cells relative to ${parent.id}.` : 'Save the first captured map and contract for this run.';
      const tests = document.tests.filter(test => test.candidateId === record.id);
      row.result = tests.length ? 'Later associated results: ' + tests.map(test => `${test.label}: ${test.status}`).join('; ') + '.' : 'No separate test verdict is bound to this saved version. Saving a candidate does not establish that it passes.';
      tests.forEach(test => addEvidence(test.graphNodeId));
      if (parent) addEvidence(parent.graphNodeId);
    } else if (node.kind === 'test') {
      row.action = 'Execute ' + record.label + ' against ' + (candidateId || 'the recorded input') + '.';
      const passed = record.checks.filter(check => check.status === 'passed').length;
      row.result = record.category === 'diagnostic' ? `The command ended with exit code ${Number.isInteger(event?.details?.code) ? event.details.code : 'unknown'}. A command failure alone does not identify which gameplay claim failed.`
        : `The report is ${record.status}${record.checks.length ? `; ${passed} of ${record.checks.length} individual checks passed` : '; no individual check rows were recorded'}.`;
      row.decision = record.status === 'passed' ? 'Use this result only within its recorded scope and alongside the other required checks. ' + scopeLimit : 'Retain this result and inspect the subsequent correction or rerun. Unknown outcomes cannot support final acceptance.';
      const report = sourceReports.get(record.id);
      if (report) {
        const positive = report.officialSolution || report.solution || report.search;
        if (positive && outcomes.has(positive.status)) {
          row.observations.push({ label: 'Saved goal search', value: positive.status });
          for (const [key, label] of [['moves', 'Solution inputs'], ['expanded', 'Expanded search states']]) if (Number.isSafeInteger(positive[key]) && positive[key] >= 0) row.observations.push({ label, value: String(positive[key]) });
        }
        if (Number.isSafeInteger(report.cap)) row.observations.push({ label: 'Search limit', value: String(report.cap) });
        if (typeof report.replayPassed === 'boolean') row.observations.push({ label: 'Recorded ordinary replay', value: report.replayPassed ? 'passed' : 'not passed' });
      }
      row.checks = record.checks.map(check => {
        const saved = report?.checks?.find(row => row.name === check.name);
        return { name: check.name, verdict: check.status, meaning: checkMeaning(check.name), expected: outcomes.has(saved?.expected) ? saved.expected : '', observed: outcomes.has(saved?.status) ? saved.status : '' };
      });
      if (record.bindingBasis === 'command-boundaries-only') {
        if (document.coverage.audit.exceptions?.some(item => item.testId === record.id && item.basis === 'failed-command-no-report')) {
          row.result = 'The captured command exited unsuccessfully before saving a report. The recorded status is error; no mechanism verdict or individual check results were produced.';
        } else row.result += ' The report has no independent map-input fingerprint; its association is limited to captured command boundaries.';
      }
    } else if (node.kind === 'replay') {
      row.action = `Archive ${record.route.length} recorded inputs and ${record.frameCount} actor frames for ${candidateId}.`;
      row.result = record.label.includes('browser') ? 'These are saved browser actor observations compared with the ordinary engine, bound to this exact map and contract.' : 'This artifact contains an ordinary-engine route replay. It is not by itself a recorded browser play session or a blind solving experiment.';
      row.decision = 'Use replay mode to inspect this exact recorded sequence. Structural necessity and browser QA have separate result records.';
    } else if (node.kind === 'operation') {
      row.action = record.label + '. Saved input: ' + (record.inputCandidateId || 'none') + '; output: ' + (record.outputCandidateId || 'none') + '.';
      row.result = 'The process completed with exit code 0. This execution status does not establish a test verdict.';
      if (record.resultNodeId) { row.decision = 'Read the separately linked test result for what passed, failed or remained unknown.'; addEvidence(record.resultNodeId); }
      if (record.startNodeId) addEvidence(record.startNodeId);
    } else if (node.kind === 'record') {
      row.action = record.label + '.'; row.result = record.scope;
      row.observations = record.facts.map(fact => ({ ...fact }));
      if (record.files.length) row.action += ' Saved files: ' + record.files.map(file => file.name).join(', ') + '.';
      if (record.relatedNodeId) addEvidence(record.relatedNodeId);
      if (record.resultNodeId) addEvidence(record.resultNodeId);
      if (node.eventType === 'command.started') row.decision = 'This event records the start only. The linked completion and any separate report carry the later outcomes.';
      if (node.eventType === 'artifact.saved' || node.eventType === 'build.saved') row.decision = 'Archiving preserves evidence and file identity. It does not rerun the test or establish that the map passed.';
      if (node.eventType === 'capture.gap') row.decision = 'Activity inside the recorded gap remains unknown; no missing actions are reconstructed.';
    } else if (node.kind === 'delivery') {
      row.action = 'Bind the published map and contract to the final recorded candidate.';
      const accepted = document.tests.filter(test => test.candidateId === document.finalCandidateId && test.status === 'passed' && test.binding === 'exact');
      row.result = 'The final candidate has ' + accepted.length + ' exactly associated passed reports, retained alongside earlier failed or unknown attempts.';
      row.decision = 'These reports explain the recorded basis for delivery. A fixed iteration count or an unrecorded stopping policy cannot be inferred. ' + scopeLimit;
      accepted.forEach(test => addEvidence(test.graphNodeId));
    }
    if (laterNote && !['resource', 'note', 'record'].includes(node.kind)) {
      row.decision = 'The subsequent author note states: ' + laterNote.reason;
      addEvidence(laterNote.graphNodeId);
    }
    Object.assign(row, reviewed?.nodes[node.id] || {});
    explanations.push(row);
  }
  // Command completion records point to the exact report, including failures;
  // copied wording remains visibly a retrospective evidence review.
  for (const row of explanations) {
    const node = nodeFor(row.nodeId), record = records.get(row.nodeId);
    if (record?.resultNodeId && !reviewed?.nodes[row.nodeId]) {
      const result = explanations.find(row => row.nodeId === record.resultNodeId);
      row.headline = 'Execution ended; ' + result.headline;
      row.result += ' Report interpretation: ' + result.result;
      row.decision = result.decision;
    }
    if (node.eventType === 'run.finished' && reviewed?.nodes['delivery-final']) {
      const delivery = reviewed.nodes['delivery-final'];
      row.result = 'The recorder marked the run complete. Later evidence review: ' + delivery.result;
      row.decision = delivery.decision; row.evidence = [...new Set([node.id, ...delivery.evidence])];
    }
  }
  assertExplanations(document);
}

module.exports = { explainProcess, assertExplanations, checkMeaning };
