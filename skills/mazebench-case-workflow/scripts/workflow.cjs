'use strict';

// Record integrity and scaffolding only. This helper does not verify game logic
// or establish that a recorded statement was actually supplied by a human.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const skillRoot = path.resolve(__dirname, '..');
const worldMap = 'games/maze/world_map.json';
const filled = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const fingerprint = value => sha(JSON.stringify(canonical(value)));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const isSkillName = name => typeof name === 'string' && /^mazebench-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && name.length < 64;
const titleFor = name => 'MazeBench ' + name.slice('mazebench-'.length).split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const json = value => JSON.stringify(value, null, 2) + '\n';
const asset = name => fs.readFileSync(path.join(skillRoot, 'assets', name), 'utf8');
const render = (text, values) => text.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) => Object.hasOwn(values, key) ? values[key] : token);

function roomId(value) {
  const match = typeof value === 'string' && value.trim().match(/^([A-Z]+)[x*\u00d7]([A-Z]+)$/i);
  assert(match, 'Use an official room ID such as HxH or H*H');
  return match[1].toUpperCase() + 'x' + match[2].toUpperCase();
}

function local(work, relative) {
  assert(filled(relative) && !path.isAbsolute(relative) && !path.win32.isAbsolute(relative) &&
    !relative.includes(':') && relative.split(/[\\/]/).every(part => part && part !== '.' && part !== '..'),
  'Artifact paths must stay inside the work directory');
  const root = fs.realpathSync(work), destination = path.resolve(root, relative);
  let ancestor = destination;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const real = fs.realpathSync(ancestor), remainder = path.relative(root, real);
  assert(!remainder.startsWith('..' + path.sep) && remainder !== '..' && !path.isAbsolute(remainder),
    'Artifact paths must stay inside the work directory');
  return destination;
}

function load(work) {
  const data = JSON.parse(fs.readFileSync(local(work, 'workflow.json'), 'utf8'));
  assert(data.schemaVersion === 1 && Array.isArray(data.cases) && data.cases.length > 0, 'Unsupported or empty workflow record');
  const seen = new Set();
  for (const item of data.cases) {
    assert(item.id === roomId(item.id) && !seen.has(item.id), 'Invalid or duplicate case ID');
    assert(item.humanFocus && typeof item.humanFocus === 'object' && item.source && typeof item.source === 'object', 'Missing case records');
    seen.add(item.id);
  }
  return data;
}
const save = (work, data) => fs.writeFileSync(local(work, 'workflow.json'), json(data));
const caseFor = (data, id) => {
  const item = data.cases.find(candidate => candidate.id === roomId(id));
  assert(item, 'Register this case with add-case before using it');
  return item;
};

function blankCase(id) {
  return {
    id,
    humanFocus: { status: 'awaiting-user', statement: '', source: '' },
    source: { engineCommit: '', worldMap, level: '', mapPath: '', mapSha256: '', entryMode: '', entryEvidence: '' },
    analysis: null
  };
}

function createCaseFiles(work, item) {
  const folder = local(work, 'cases/' + item.id.toLowerCase());
  assert(!fs.existsSync(folder), 'Case folder already exists; preserve it and inspect the work record');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'analysis.md'), render(asset('case-analysis.md'), { ROOM: item.id }));
}

function init(work, ids, target = '') {
  assert(Array.isArray(ids) && ids.length > 0, 'Supply at least one --case');
  const rooms = ids.map(roomId);
  assert(new Set(rooms).size === rooms.length, 'Duplicate case ID');
  assert(!target || isSkillName(target), 'Use a mazebench-<mechanism> target name under 64 characters');
  assert(!fs.existsSync(work), 'Use a new work directory; existing records will not be overwritten');
  fs.mkdirSync(work, { recursive: true });
  const data = { schemaVersion: 1, targetSkill: target, cases: rooms.map(blankCase), synthesis: null };
  for (const item of data.cases) createCaseFiles(work, item);
  fs.writeFileSync(local(work, 'synthesis.md'), asset('synthesis.md'));
  save(work, data);
  return { created: work, cases: rooms, next: 'Collect actual human focus for each case; source capture may proceed.' };
}

function addCase(work, id) {
  const data = load(work), canonicalId = roomId(id);
  assert(!data.cases.some(item => item.id === canonicalId), 'Duplicate case ID');
  const item = blankCase(canonicalId);
  createCaseFiles(work, item);
  data.cases.push(item);
  save(work, data);
  return { added: canonicalId, next: 'Collect this case\'s human focus; the prior synthesis is no longer current.' };
}

function capture(work, id, engine) {
  const data = load(work), item = caseFor(data, id);
  const git = args => execFileSync('git', ['-C', path.resolve(engine), ...args], { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  assert(git(['status', '--porcelain', '--untracked-files=no']).toString().trim() === '',
    'Use a clean tracked engine checkout; preserve local edits in a separate checkout');
  const commit = git(['rev-parse', 'HEAD']).toString().trim();
  assert(/^[0-9a-f]{40}$/.test(commit), 'Expected a pinned engine Git commit');
  const index = JSON.parse(git(['show', commit + ':' + worldMap]).toString('utf8'));
  const matches = Object.entries(index.levels || {}).filter(([, position]) => Array.isArray(position) && position.join('x') === item.id);
  assert(matches.length === 1 && /^[a-z0-9]+\.txt$/.test(matches[0][0]), 'Room must resolve uniquely through the official world index');
  const level = 'games/maze/levels/' + matches[0][0];
  const bytes = git(['show', commit + ':' + level]);
  const mapPath = 'cases/' + item.id.toLowerCase() + '/original-map.txt';
  const unchanged = item.source.engineCommit === commit && item.source.level === level && item.source.mapSha256 === sha(bytes);
  const destination = local(work, mapPath);
  if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(bytes), 'Captured map differs; use a fresh work directory to preserve earlier evidence');
  else fs.writeFileSync(destination, bytes, { flag: 'wx' });
  item.source = {
    engineCommit: commit, worldMap, level, mapPath, mapSha256: sha(bytes),
    entryMode: unchanged ? item.source.entryMode : '',
    entryEvidence: unchanged ? item.source.entryEvidence : ''
  };
  save(work, data);
  return { case: item.id, commit, level, mapSha256: item.source.mapSha256, next: 'Inspect and record the actual entry context; human input is still required.' };
}

function humanIssues(item) {
  const focus = item.humanFocus;
  return focus.status === 'provided' && filled(focus.statement) && filled(focus.source) ? []
    : [item.id + ': actual case-specific human focus and its source are required'];
}

function sourceIssues(work, item) {
  const source = item.source, issues = [];
  if (!/^[0-9a-f]{40}$/.test(source.engineCommit) || source.worldMap !== worldMap || !/^games\/maze\/levels\/[a-z0-9]+\.txt$/.test(source.level)) {
    issues.push(item.id + ': capture the pinned official source');
  }
  try {
    const bytes = fs.readFileSync(local(work, source.mapPath));
    if (sha(bytes) !== source.mapSha256) issues.push(item.id + ': original map bytes or hash changed');
  } catch (error) { issues.push(item.id + ': source map unavailable: ' + error.message); }
  if (!['authored-player', 'world-transition', 'specified-state'].includes(source.entryMode) || !filled(source.entryEvidence)) {
    issues.push(item.id + ': inspect and record the actual entry context');
  }
  return issues;
}

const analysisInput = item => fingerprint({ id: item.id, humanFocus: item.humanFocus, source: item.source });
const synthesisInput = data => fingerprint({ targetSkill: data.targetSkill, cases: data.cases.map(item => ({ id: item.id, input: analysisInput(item), analysis: item.analysis })) });

function documentBytes(work, relative) {
  const bytes = fs.readFileSync(local(work, relative));
  const text = bytes.toString('utf8');
  assert(text.trim() && !/\{\{[\s\S]*?\}\}|\[TODO:/i.test(text), 'Complete the analysis/synthesis template before recording it');
  return bytes;
}

function artifactIssues(work, record, expectedPath, expectedInput, label) {
  if (!record) return [label + ': completed artifact has not been recorded'];
  try {
    // Validate the supplied path even if it differs from the canonical filename.
    local(work, record.path);
    assert(record.path === expectedPath, 'Unexpected artifact path');
    const bytes = documentBytes(work, record.path);
    return record.inputSha256 === expectedInput && record.sha256 === sha(bytes) ? [] : [label + ': stale input or artifact; review and record it again'];
  } catch (error) { return [label + ': ' + error.message]; }
}

function caseIssues(work, item, includeAnalysis = true) {
  const issues = [...humanIssues(item), ...sourceIssues(work, item)];
  if (includeAnalysis) issues.push(...artifactIssues(work, item.analysis, 'cases/' + item.id.toLowerCase() + '/analysis.md', analysisInput(item), item.id + ' analysis'));
  return issues;
}

function status(work) {
  const data = load(work);
  const cases = data.cases.map(item => ({ id: item.id, issues: caseIssues(work, item) }));
  const synthesisIssues = [];
  if (!isSkillName(data.targetSkill)) synthesisIssues.push('Choose a valid mazebench-<mechanism> target name');
  synthesisIssues.push(...artifactIssues(work, data.synthesis, 'synthesis.md', synthesisInput(data), 'Synthesis'));
  let phase = 'ready-to-scaffold';
  if (data.cases.some(item => humanIssues(item).length)) phase = 'human-input';
  else if (data.cases.some(item => sourceIssues(work, item).length)) phase = 'source-and-entry';
  else if (cases.some(item => item.issues.length)) phase = 'case-analysis';
  else if (synthesisIssues.length) phase = 'synthesis';
  return { phase, cases, synthesisIssues, ready: phase === 'ready-to-scaffold', scope: 'Record integrity only; no gameplay or human-authorship certification.' };
}

const requireClear = issues => assert(issues.length === 0, issues.join('\n'));

function recordAnalysis(work, id) {
  const data = load(work), item = caseFor(data, id);
  requireClear(caseIssues(work, item, false));
  const relative = 'cases/' + item.id.toLowerCase() + '/analysis.md';
  item.analysis = { path: relative, sha256: sha(documentBytes(work, relative)), inputSha256: analysisInput(item) };
  save(work, data);
  return { recorded: item.id, scope: 'Record integrity only; review semantic evidence separately.' };
}

function recordSynthesis(work) {
  const data = load(work);
  requireClear(data.cases.flatMap(item => caseIssues(work, item)));
  assert(isSkillName(data.targetSkill), 'Choose a valid mazebench-<mechanism> target name');
  data.synthesis = { path: 'synthesis.md', sha256: sha(documentBytes(work, 'synthesis.md')), inputSha256: synthesisInput(data) };
  save(work, data);
  return { recorded: 'synthesis', target: data.targetSkill, scope: 'Ready for an unfinished scaffold, not installation.' };
}

function scaffold(work, parent) {
  const report = status(work);
  requireClear([...report.cases.flatMap(item => item.issues), ...report.synthesisIssues]);
  const data = load(work), output = path.resolve(parent, data.targetSkill), title = titleFor(data.targetSkill);
  assert(!fs.existsSync(output), 'Target skill already exists; update it deliberately instead of overwriting it');
  // Read all inputs before creating the output tree.
  const files = {
    'SKILL.md': render(asset('skill-template.md'), { NAME: data.targetSkill, TITLE: title, ROOMS: data.cases.map(item => item.id).join('; ') }),
    'agents/openai.yaml': 'interface:\n' + Object.entries({ display_name: title, short_description: 'Draft mechanism skill; complete evidence before use', default_prompt: 'Use $' + data.targetSkill + ' to design and verify a room using its extracted mechanism.' }).map(([key, value]) => '  ' + key + ': ' + JSON.stringify(value)).join('\n') + '\n',
    'references/mechanism-logic.md': render(asset('mechanism-template.md'), { TITLE: title }),
    'references/design-template.json': asset('design-template.json'),
    'LICENSE': fs.readFileSync(path.join(skillRoot, 'LICENSE'))
  };
  data.cases.forEach((item, i) => {
    const family = i === 0 ? 'official' : 'official-' + item.id.toLowerCase();
    files['references/' + family + '-world-map.txt'] = fs.readFileSync(local(work, item.source.mapPath));
    files['references/' + family + '-case.md'] = render(asset('case-template.md'), {
      ROOM: item.id, WORLD_MAP: item.source.worldMap, LEVEL: item.source.level, COMMIT: item.source.engineCommit,
      MAP_FILE: family + '-world-map.txt', MAP_SHA256: item.source.mapSha256
    });
  });
  for (const [relative, bytes] of Object.entries(files)) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
  }
  return { created: output, complete: false, next: 'Fill instructions and real evidence, implement compatible helpers, validate, then install.' };
}

function cli(argv) {
  const [command, ...args] = argv;
  const allowed = { init: ['work', 'case', 'target'], 'add-case': ['work', 'case'], capture: ['work', 'case', 'repo'], status: ['work'], 'record-analysis': ['work', 'case'], 'record-synthesis': ['work'], scaffold: ['work', 'out'] };
  assert(Object.hasOwn(allowed, command), 'Commands: init, add-case, capture, status, record-analysis, record-synthesis, scaffold');
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    assert(args[i].startsWith('--') && allowed[command].includes(key) && filled(args[i + 1]) && !args[i + 1].startsWith('--'), 'Invalid option or missing value: ' + args[i]);
    assert(!Object.hasOwn(options, key) || command === 'init' && key === 'case', 'Duplicate option: ' + args[i]);
    if (key === 'case' && command === 'init') (options.case ||= []).push(args[i + 1]);
    else options[key] = args[i + 1];
  }
  assert(filled(options.work), 'Supply --work');
  const work = path.resolve(options.work);
  for (const key of allowed[command].filter(key => !['work', 'target'].includes(key))) {
    assert(options[key], 'Supply --' + key);
  }
  switch (command) {
    case 'init': return init(work, options.case, options.target);
    case 'add-case': return addCase(work, options.case);
    case 'capture': return capture(work, options.case, options.repo);
    case 'status': return status(work);
    case 'record-analysis': return recordAnalysis(work, options.case);
    case 'record-synthesis': return recordSynthesis(work);
    case 'scaffold': return scaffold(work, options.out);
  }
}

if (require.main === module) {
  try { console.log(json(cli(process.argv.slice(2))).trimEnd()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { init, addCase, capture, status, recordAnalysis, recordSynthesis, scaffold, cli, load, save, roomId };
