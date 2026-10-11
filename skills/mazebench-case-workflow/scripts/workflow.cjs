'use strict';

// Record integrity and scaffolding only. This helper does not verify game logic
// or establish that a recorded statement was actually supplied by a human.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const library = require('./reference-library.cjs');
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

function caseId(value) {
  if (typeof value === 'string' && /^(?:user|authored)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return value;
  return roomId(value);
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
    assert(item.id === caseId(item.id) && !seen.has(item.id), 'Invalid or duplicate case ID');
    assert(item.humanFocus && typeof item.humanFocus === 'object' && item.source && typeof item.source === 'object', 'Missing case records');
    seen.add(item.id);
  }
  return data;
}
const save = (work, data) => fs.writeFileSync(local(work, 'workflow.json'), json(data));
const caseFor = (data, id) => {
  const item = data.cases.find(candidate => candidate.id === caseId(id));
  assert(item, 'Register this case with add-case before using it');
  return item;
};

function blankCase(id, index = 0) {
  return {
    id,
    family: library.familyFor({ id }, index),
    parentCase: '',
    changeSummary: '',
    relations: [],
    difficulty: null,
    humanFocus: { status: 'awaiting-user', statement: '', source: '' },
    source: { engineCommit: '', worldMap: library.kindOf({ id }) === 'official' ? worldMap : '', level: '', mapPath: '', mapSha256: '', entryMode: '', entryEvidence: '' },
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
  const rooms = ids.map(caseId);
  assert(new Set(rooms).size === rooms.length, 'Duplicate case ID');
  assert(!target || isSkillName(target), 'Use a mazebench-<mechanism> target name under 64 characters');
  assert(!fs.existsSync(work), 'Use a new work directory; existing records will not be overwritten');
  fs.mkdirSync(work, { recursive: true });
  const data = { schemaVersion: 1, targetSkill: target, cases: rooms.map(blankCase), referenceLibrary: library.defaultLibrary(), synthesis: null };
  for (const item of data.cases) createCaseFiles(work, item);
  fs.writeFileSync(local(work, 'synthesis.md'), asset('synthesis.md'));
  save(work, data);
  return { created: work, cases: rooms, next: 'Collect actual human focus for each case; source capture may proceed.' };
}

function addCase(work, id, parent = '') {
  const data = load(work), canonicalId = caseId(id);
  assert(!data.cases.some(item => item.id === canonicalId), 'Duplicate case ID');
  const item = blankCase(canonicalId, data.cases.length);
  assert(!parent || library.kindOf(item) !== 'official', 'Use parent only for a user or authored variant');
  item.parentCase = parent ? caseId(parent) : '';
  if (data.baseline) {
    const existing = readBaseline(work, data).references;
    const previous = existing.find(reference => reference.id === item.id);
    if (previous) item.family = previous.family;
    else if (existing.some(reference => reference.family === item.family)) item.family = 'official-' + item.id.toLowerCase();
  }
  requireClear(library.lineageIssues([...baselineEntries(work, data), ...data.cases, item]));
  createCaseFiles(work, item);
  data.cases.push(item);
  save(work, data);
  return { added: canonicalId, next: 'Collect this case\'s human focus; the prior synthesis is no longer current.' };
}

function pinnedEngine(engine) {
  const git = args => execFileSync('git', ['-C', path.resolve(engine), ...args], { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  assert(git(['status', '--porcelain', '--untracked-files=no']).toString().trim() === '',
    'Use a clean tracked engine checkout; preserve local edits in a separate checkout');
  const commit = git(['rev-parse', 'HEAD']).toString().trim();
  assert(/^[0-9a-f]{40}$/.test(commit), 'Expected a pinned engine Git commit');
  return { git, commit };
}

function storeMap(work, mapPath, bytes) {
  const destination = local(work, mapPath);
  if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(bytes), 'Captured map differs; use a fresh work directory or variant ID to preserve earlier evidence');
  else fs.writeFileSync(destination, bytes, { flag: 'wx' });
}

function capture(work, id, engine) {
  const data = load(work), item = caseFor(data, id);
  assert(library.kindOf(item) === 'official', 'Use import-variant for user or authored maps');
  const { git, commit } = pinnedEngine(engine);
  const index = JSON.parse(git(['show', commit + ':' + worldMap]).toString('utf8'));
  const matches = Object.entries(index.levels || {}).filter(([, position]) => Array.isArray(position) && position.join('x') === item.id);
  assert(matches.length === 1 && /^[a-z0-9]+\.txt$/.test(matches[0][0]), 'Room must resolve uniquely through the official world index');
  const level = 'games/maze/levels/' + matches[0][0];
  const bytes = git(['show', commit + ':' + level]);
  const mapPath = 'cases/' + item.id.toLowerCase() + '/original-map.txt';
  const unchanged = item.source.engineCommit === commit && item.source.level === level && item.source.mapSha256 === sha(bytes);
  storeMap(work, mapPath, bytes);
  item.source = {
    engineCommit: commit, worldMap, level, mapPath, mapSha256: sha(bytes),
    entryMode: unchanged ? item.source.entryMode : '',
    entryEvidence: unchanged ? item.source.entryEvidence : ''
  };
  save(work, data);
  return { case: item.id, commit, level, mapSha256: item.source.mapSha256, next: 'Inspect and record the actual entry context; human input is still required.' };
}

function importVariant(work, id, map, engine, origin) {
  const data = load(work), item = caseFor(data, id);
  assert(library.kindOf(item) !== 'official', 'A variant cannot replace an official room; use a user- or authored- ID');
  assert(filled(origin), 'Record the actual variant source with --origin');
  const { commit } = pinnedEngine(engine), bytes = fs.readFileSync(path.resolve(map));
  assert(path.extname(map).toLowerCase() === '.txt' && bytes.toString('utf8').trim() && !/^[\s\uFEFF]*[\[{]/.test(bytes.toString('utf8')),
    'Import an exported world-map .txt; preserve and convert Build JSON through the official tools first');
  const mapPath = 'cases/' + item.id + '/original-map.txt';
  const unchanged = item.source.engineCommit === commit && item.source.mapSha256 === sha(bytes);
  storeMap(work, mapPath, bytes);
  item.source = { engineCommit: commit, worldMap: '', level: '', provenance: origin, mapPath, mapSha256: sha(bytes),
    entryMode: unchanged ? item.source.entryMode : '', entryEvidence: unchanged ? item.source.entryEvidence : '' };
  save(work, data);
  return { imported: item.id, kind: library.kindOf(item), mapSha256: item.source.mapSha256, next: 'Record human focus, variant changes, entry context and full analysis; this import verifies no gameplay.' };
}

function humanIssues(item) {
  const focus = item.humanFocus;
  return focus.status === 'provided' && filled(focus.statement) && filled(focus.source) ? []
    : [item.id + ': actual case-specific human focus and its source are required'];
}

function sourceIssues(work, item) {
  const source = item.source, issues = [];
  const official = library.kindOf(item) === 'official';
  if (!/^[0-9a-f]{40}$/.test(source.engineCommit) || (official
    ? source.worldMap !== worldMap || !/^games\/maze\/levels\/[a-z0-9]+\.txt$/.test(source.level)
    : source.worldMap !== '' || source.level !== '' || !filled(source.provenance))) {
    issues.push(item.id + ': capture or import the source with accurate provenance and a pinned engine');
  }
  if (!official && !filled(item.changeSummary)) issues.push(item.id + ': describe variant changes or the standalone design');
  try {
    const bytes = fs.readFileSync(local(work, source.mapPath));
    if (sha(bytes) !== source.mapSha256) issues.push(item.id + ': original map bytes or hash changed');
  } catch (error) { issues.push(item.id + ': source map unavailable: ' + error.message); }
  if (!['authored-player', 'world-transition', 'specified-state'].includes(source.entryMode) || !filled(source.entryEvidence)) {
    issues.push(item.id + ': inspect and record the actual entry context');
  }
  return issues;
}

// Preserve the legacy fingerprint shape when the added fields are absent.
const analysisInput = item => fingerprint({ id: item.id, humanFocus: item.humanFocus, source: item.source,
  ...(item.parentCase || item.changeSummary ? { parentCase: item.parentCase || '', changeSummary: item.changeSummary || '' } : {}) });
const synthesisInput = data => fingerprint({ targetSkill: data.targetSkill,
  ...(data.referenceLibrary ? { referenceLibrary: data.referenceLibrary, baseline: data.baseline || null } : {}),
  cases: data.cases.map(item => ({ id: item.id, input: analysisInput(item), analysis: item.analysis,
    ...(data.referenceLibrary ? { family: item.family, relations: item.relations, difficulty: item.difficulty } : {}) })) });

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
  const referenceIssues = libraryIssues(work, data);
  synthesisIssues.push(...referenceIssues);
  synthesisIssues.push(...artifactIssues(work, data.synthesis, 'synthesis.md', synthesisInput(data), 'Synthesis'));
  let phase = 'ready-to-scaffold';
  if (data.cases.some(item => humanIssues(item).length)) phase = 'human-input';
  else if (data.cases.some(item => sourceIssues(work, item).length)) phase = 'source-and-entry';
  else if (cases.some(item => item.issues.length)) phase = 'case-analysis';
  else if (referenceIssues.length) phase = 'reference-library';
  else if (synthesisIssues.length) phase = 'synthesis';
  return { phase, cases, synthesisIssues, ready: phase === 'ready-to-scaffold', scope: 'Record integrity only; no gameplay or human-authorship certification.' };
}

const requireClear = issues => assert(issues.length === 0, issues.join('\n'));

function recordAnalysis(work, id) {
  const data = load(work), item = caseFor(data, id);
  requireClear(caseIssues(work, item, false));
  requireClear(library.lineageIssues([...baselineEntries(work, data), ...data.cases]));
  const relative = 'cases/' + item.id.toLowerCase() + '/analysis.md';
  item.analysis = { path: relative, sha256: sha(documentBytes(work, relative)), inputSha256: analysisInput(item) };
  save(work, data);
  return { recorded: item.id, scope: 'Record integrity only; review semantic evidence separately.' };
}

function readBaseline(work, data) {
  const bytes = fs.readFileSync(local(work, data.baseline.path));
  assert(sha(bytes) === data.baseline.sha256, 'Baseline catalog changed; import and review a new version');
  const catalog = JSON.parse(bytes.toString('utf8'));
  requireClear(library.catalogIssues(catalog));
  assert(catalog.targetSkill === data.targetSkill, 'Baseline catalog belongs to a different target skill');
  return catalog;
}
const baselineEntries = (work, data) => data.baseline ? readBaseline(work, data).references : [];

function enableLibrary(work) {
  const data = load(work);
  data.referenceLibrary ||= library.defaultLibrary();
  save(work, data);
  return { enabled: true, next: 'Review relative levels and rate each working reference after its analysis; existing human input remains reusable.' };
}

function importBaseline(work, filename) {
  const data = load(work), bytes = fs.readFileSync(path.resolve(filename));
  const catalog = JSON.parse(bytes.toString('utf8'));
  requireClear(library.catalogIssues(catalog));
  assert(!data.targetSkill || data.targetSkill === catalog.targetSkill, 'Baseline catalog belongs to a different target skill');
  // Content-addressed snapshots retain earlier catalog versions in the private work directory.
  const relative = 'baseline-' + sha(bytes) + '.json';
  if (!fs.existsSync(local(work, relative))) fs.writeFileSync(local(work, relative), bytes, { flag: 'wx' });
  data.targetSkill = catalog.targetSkill;
  data.referenceLibrary = { scope: catalog.scope, levels: catalog.levels };
  data.baseline = { path: relative, sha256: sha(bytes) };
  for (const item of data.cases) {
    const previous = catalog.references.find(reference => reference.id === item.id);
    if (previous) item.family = previous.family;
    else if (library.kindOf(item) === 'official') item.family = 'official-' + item.id.toLowerCase();
  }
  save(work, data);
  return { imported: catalog.references.length, target: data.targetSkill, next: 'Analyze only new or revised cases; preserve unchanged baseline references and review the merged ladder.' };
}

const ratingInput = (data, item) => fingerprint({ analysis: item.analysis, referenceLibrary: data.referenceLibrary });

function rate(work, id, level, basis, rationale, evidence) {
  const data = load(work), item = caseFor(data, id);
  requireClear(caseIssues(work, item));
  requireClear(library.levelIssues(data.referenceLibrary));
  assert(library.bases.includes(basis) && (basis === 'unranked' ? level === 'unranked' : data.referenceLibrary.levels.some(row => row.id === level)), 'Use a defined level and a supported difficulty basis; unranked needs both values');
  assert(filled(rationale) && filled(evidence), 'Record the grading rationale and its actual evidence/source');
  assert(Array.isArray(item.relations) && item.relations.length && item.relations.every(id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)), 'Record the shared mechanism relation IDs before grading');
  item.difficulty = { level, basis, rationale, evidence, basedOn: ratingInput(data, item) };
  save(work, data);
  return { rated: item.id, level, basis, scope: 'Recorded relative judgment; no empirical difficulty claim is established by this helper.' };
}

function catalogFor(work, data) {
  const references = new Map(baselineEntries(work, data).map(item => [item.id, item]));
  data.cases.forEach((item, index) => {
    const family = library.familyFor(item, index);
    references.set(item.id, {
      id: item.id, kind: library.kindOf(item), family, parentCase: item.parentCase || '', changeSummary: item.changeSummary || '',
      relations: item.relations || [], mapSha256: item.source.mapSha256, engineCommit: item.source.engineCommit,
      casePath: 'references/' + family + '-case.md',
      difficulty: item.difficulty ? { level: item.difficulty.level, basis: item.difficulty.basis, rationale: item.difficulty.rationale } : null
    });
  });
  return { schemaVersion: 1, targetSkill: data.targetSkill, ...data.referenceLibrary, references: [...references.values()] };
}

function libraryIssues(work, data) {
  if (!data.referenceLibrary) return data.baseline ? ['Enable the reference library for a baseline extension'] : [];
  const issues = library.levelIssues(data.referenceLibrary);
  try { issues.push(...library.catalogIssues(catalogFor(work, data))); }
  catch (error) { issues.push(error.message); }
  for (const item of data.cases) {
    if (!item.difficulty || !filled(item.difficulty.evidence) || item.difficulty.basedOn !== ratingInput(data, item)) {
      issues.push(item.id + ': missing or stale difficulty record; review and rate after analysis');
    }
  }
  return issues;
}

function exportCatalog(work, filename) {
  const report = status(work);
  requireClear([...report.cases.flatMap(item => item.issues), ...report.synthesisIssues]);
  const data = load(work);
  assert(data.referenceLibrary, 'Use enable-library before exporting a catalog');
  const output = path.resolve(filename);
  assert(!fs.existsSync(output), 'Use a fresh catalog output; do not overwrite the installed reference library');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, json(catalogFor(work, data)), { flag: 'wx' });
  return { exported: output, next: 'Review the merged catalog, update the target skill and difficulty guide, and run affected regressions.' };
}

function recordSynthesis(work) {
  const data = load(work);
  requireClear(data.cases.flatMap(item => caseIssues(work, item)));
  assert(isSkillName(data.targetSkill), 'Choose a valid mazebench-<mechanism> target name');
  requireClear(libraryIssues(work, data));
  data.synthesis = { path: 'synthesis.md', sha256: sha(documentBytes(work, 'synthesis.md')), inputSha256: synthesisInput(data) };
  save(work, data);
  return { recorded: 'synthesis', target: data.targetSkill, scope: 'Ready for an unfinished scaffold, not installation.' };
}

function scaffold(work, parent) {
  const report = status(work);
  requireClear([...report.cases.flatMap(item => item.issues), ...report.synthesisIssues]);
  const data = load(work), output = path.resolve(parent, data.targetSkill), title = titleFor(data.targetSkill);
  assert(!data.baseline, 'A baseline extension must update the existing skill; use export-catalog instead of a partial scaffold');
  assert(!fs.existsSync(output), 'Target skill already exists; update it deliberately instead of overwriting it');
  // Read all inputs before creating the output tree.
  const files = {
    'SKILL.md': render(asset('skill-template.md'), { NAME: data.targetSkill, TITLE: title, ROOMS: data.cases.map(item => item.id).join('; ') }),
    'agents/openai.yaml': 'interface:\n' + Object.entries({ display_name: title, short_description: 'Draft mechanism skill; complete evidence before use', default_prompt: 'Use $' + data.targetSkill + ' to design and verify a room using its extracted mechanism.' }).map(([key, value]) => '  ' + key + ': ' + JSON.stringify(value)).join('\n') + '\n',
    'references/mechanism-logic.md': render(asset('mechanism-template.md'), { TITLE: title }),
    'references/design-template.json': asset('design-template.json'),
    'LICENSE': fs.readFileSync(path.join(skillRoot, 'LICENSE'))
  };
  if (data.referenceLibrary) {
    files['references/reference-catalog.json'] = json(catalogFor(work, data));
    files['references/difficulty.md'] = asset('difficulty-template.md');
  }
  data.cases.forEach((item, i) => {
    const family = library.familyFor(item, i);
    files['references/' + family + '-world-map.txt'] = fs.readFileSync(local(work, item.source.mapPath));
    files['references/' + family + '-case.md'] = render(asset(library.kindOf(item) === 'official' ? 'case-template.md' : 'variant-template.md'), {
      ROOM: item.id, WORLD_MAP: item.source.worldMap, LEVEL: item.source.level, COMMIT: item.source.engineCommit,
      MAP_FILE: family + '-world-map.txt', MAP_SHA256: item.source.mapSha256,
      KIND: library.kindOf(item) === 'user' ? 'User-authored' : 'Agent-authored', PARENT: item.parentCase || 'Standalone reference; no single map parent declared.'
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
  const allowed = { init: ['work', 'case', 'target'], 'add-case': ['work', 'case', 'parent'], capture: ['work', 'case', 'repo'],
    'import-variant': ['work', 'case', 'map', 'repo', 'origin'], 'enable-library': ['work'], 'import-baseline': ['work', 'file'],
    rate: ['work', 'case', 'level', 'basis', 'rationale', 'evidence'], 'export-catalog': ['work', 'out'],
    status: ['work'], 'record-analysis': ['work', 'case'], 'record-synthesis': ['work'], scaffold: ['work', 'out'] };
  assert(Object.hasOwn(allowed, command), 'Commands: ' + Object.keys(allowed).join(', '));
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
  for (const key of allowed[command].filter(key => !['work', 'target', 'parent'].includes(key))) {
    assert(options[key], 'Supply --' + key);
  }
  switch (command) {
    case 'init': return init(work, options.case, options.target);
    case 'add-case': return addCase(work, options.case, options.parent);
    case 'capture': return capture(work, options.case, options.repo);
    case 'import-variant': return importVariant(work, options.case, options.map, options.repo, options.origin);
    case 'enable-library': return enableLibrary(work);
    case 'import-baseline': return importBaseline(work, options.file);
    case 'rate': return rate(work, options.case, options.level, options.basis, options.rationale, options.evidence);
    case 'export-catalog': return exportCatalog(work, options.out);
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
module.exports = { init, addCase, capture, importVariant, enableLibrary, importBaseline, rate, exportCatalog,
  status, recordAnalysis, recordSynthesis, scaffold, cli, load, save, roomId, caseId };
