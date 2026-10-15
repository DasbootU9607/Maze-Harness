'use strict';
// Incrementally register completed skills and verified trials. Existing trials survive.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash, read, createReplay } = require('./site-content.cjs');
const { exportProcess, discoverAuthoringRun } = require('./export-authoring-process.cjs');
const { attachProcessPreviews } = require('./process-previews.cjs');
const defaultRoot = path.resolve(__dirname, '..');
function synchronize(options = {}, root = defaultRoot) {
  const site = path.join(root, 'site');
  const catalog = read(path.join(site, 'data/catalog.json'));
  const provenance = read(path.join(site, 'data/provenance.json'));
  const replay = createReplay(path.join(site, 'runtime/maze-engine.js'));
  const pending = new Map();
  const json = (file, data) => pending.set(file, Buffer.from(JSON.stringify(data, null, 2) + '\n'));
  const skillId = options.skill?.replace(/^mazebench-/, '');
  if (skillId) assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillId), 'Invalid skill name');
  const packages = fs.readdirSync(path.join(root, 'skills')).filter(name => name.startsWith('mazebench-') && name !== 'mazebench-case-workflow');
  if (skillId) assert(packages.includes('mazebench-' + skillId), 'Skill package is missing');
  const records = new Map(provenance.cases.map(c => [c.id, c]));
  for (const pkg of packages) {
    const id = pkg.replace(/^mazebench-/, '');
    const dir = path.join(root, 'skills', pkg);
    const text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    const name = text.match(/^# MazeBench (.+)$/m)?.[1];
    assert(name && !/\[TODO|\{\{/.test(text), 'Finish the skill before publication: ' + pkg);
    const rawDescription = text.match(/^description: (.+)$/m)?.[1];
    const description = rawDescription?.startsWith('"') ? JSON.parse(rawDescription) : rawDescription;
    const previous = catalog.skills.find(s => s.id === id);
    // Optional editorial text; absent metadata never prevents automatic discovery.
    const metadataPath = path.join(dir, 'references/website.json');
    const metadata = fs.existsSync(metadataPath) ? read(metadataPath) : {};
    const skill = previous || { id, name, verb: name, description, steps: [], exampleDescription: 'An agent-authored realization built with this skill.', rooms: [], officialCases: [], authoredCases: [] };
    skill.name = name;
    if (!metadata.description) skill.description = description;
    for (const key of ['name', 'verb', 'description', 'exampleDescription', 'steps']) if (metadata[key] !== undefined) skill[key] = metadata[key];
    for (const key of ['name', 'verb', 'description', 'exampleDescription']) assert(typeof skill[key] === 'string' && skill[key].trim(), 'Missing website text: ' + key);
    assert(Array.isArray(skill.steps) && skill.steps.every(s => typeof s === 'string'), 'Invalid website steps');
    skill.source = catalog.repository + '/tree/main/skills/' + pkg;
    const references = fs.readdirSync(path.join(dir, 'references')).filter(f => /^official(?:-[a-z0-9-]+)?-design\.json$/.test(f));
    assert(references.length, 'No runnable official references for ' + pkg);
    for (const file of references) {
      const design = read(path.join(dir, 'references', file));
      const reference = 'skills/' + pkg + '/references/' + file.replace(/-design\.json$/, '-world-map.txt');
      const referenceBytes = fs.readFileSync(path.join(root, reference));
      const sha = hash(referenceBytes);
      const normalize = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
      const room = catalog.rooms.find(r => r.sha256 === sha) || catalog.rooms.find(r =>
        r.id === design.originRoom?.id &&
        normalize(fs.readFileSync(path.join(site, 'data/maps/official-' + r.id.toLowerCase() + '-world-map.txt'))) === normalize(referenceBytes));
      assert(room, 'Official reference must match an unchanged room in the published world: ' + reference);
      // A supplemental complete objective can extend a historical regression route.
      // Its claim is never trusted without fresh replay against the published room.
      const solutionFile = file.replace(/-design\.json$/, '-solution.json');
      const solutionPath = path.join(dir, 'references', solutionFile);
      const hasSolution = fs.existsSync(solutionPath);
      const solution = hasSolution ? read(solutionPath) : null;
      if (hasSolution) {
        assert(solution && typeof solution.goal === 'object' && solution.goal !== null, 'Supplemental solution requires goal: ' + solutionFile);
        assert(typeof solution.witness === 'string' && /^[UDLR]+$/.test(solution.witness), 'Supplemental solution requires a complete witness: ' + solutionFile);
      }
      const completion = hasSolution ? solution : design;
      if (completion === solution) assert([solution.packagedMapSha256, solution.sourceMapSha256, solution.mapSha256].includes(sha), 'Supplemental solution map mismatch: ' + solutionFile);
      const existing = catalog.cases.find(c => c.kind === 'official' && c.skill === id && c.room === room.id);
      const baseId = 'official-' + room.id.toLowerCase();
      const caseId = existing?.id || (catalog.cases.some(c => c.id === baseId) ? baseId + '-' + id : baseId);
      const entry = { id: caseId, kind: 'official', title: 'Room ' + room.id, skill: id, world: 'maze', room: room.id,
        description: 'The complete upstream room used by this skill.', thumbnail: 'assets/thumbnails/' + caseId + '.png',
        map: 'data/maps/' + baseId + '-world-map.txt', witness: completion.witness, goal: hasSolution ? solution.goal : design.contract?.goal || design.goal || { kind: 'gem' } };
      const completeObjective = completion.completeObjective || design.completeObjective;
      if (solution?.completeObjective && design.completeObjective) assert.deepEqual(solution.completeObjective, design.completeObjective, 'Supplemental complete objective differs from design: ' + solutionFile);
      if (completeObjective) entry.completeObjective = completeObjective;
      const objectiveVerification = replay(read(path.join(site, 'data/levels/maze/level_' + room.id + '.json')), entry);
      if (existing) {
        delete existing.completeObjective;
        Object.assign(existing, entry);
      } else catalog.cases.push(entry);
      const record = { id: caseId, kind: 'official', room: room.id, sourceFile: room.sourceFile, sourceMapSha256: room.sha256, skillReference: reference };
      Object.assign(record, { witnessSha256: hash(entry.witness), goalSha256: hash(entry.goal), objectiveVerification });
      if (completeObjective) record.completeObjectiveSha256 = hash(completeObjective);
      if (sha !== room.sha256) Object.assign(record, { skillReferenceSha256: sha, mapEquivalence: 'CRLF-to-LF only; original bytes retained' });
      if (completion === solution) Object.assign(record, { solutionReference: 'skills/' + pkg + '/references/' + solutionFile, solutionSha256: hash(fs.readFileSync(solutionPath)) });
      records.set(caseId, record);
      if (!skill.rooms.includes(room.id)) skill.rooms.push(room.id);
      if (!skill.officialCases.includes(caseId)) skill.officialCases.push(caseId);
    }
    if (!previous) catalog.skills.push(skill);
  }
  const trialFlags = ['spec', 'build', 'verification', 'engine'];
  const importing = trialFlags.slice(0, 3).some(key => options[key]);
  assert(!options['authoring-run'] || importing, '--authoring-run requires the actual trial spec, build and verification inputs');
  if (importing) {
    assert(skillId && trialFlags.every(key => options[key]), 'Trial import requires --skill, --engine, --spec, --build and --verification');
    const skill = catalog.skills.find(s => s.id === skillId);
    const spec = read(options.spec), manifest = read(options.build), report = read(options.verification);
    assert(report.overall === 'passed' && report.replayPassed === true, 'Only completed, verified trials can be published');
    assert.equal(report.fingerprints?.cells, hash(spec.cells), 'Verification is stale: cells');
    assert.equal(report.fingerprints?.contract, hash(spec.contract), 'Verification is stale: contract');
    assert(typeof spec.title === 'string' && spec.title.trim(), 'A trial needs a title');
    const engineRoot = path.resolve(options.engine);
    for (const file of ['public/maze-engine.js', 'public/maze-solver.js', 'server/maze-levels.js', 'games/maze/level_parsing.json']) {
      assert.equal(report.fingerprints[file], hash(fs.readFileSync(path.join(engineRoot, file))), 'Verification used a different engine file: ' + file);
    }
    assert.equal(hash(fs.readFileSync(path.join(engineRoot, 'public/maze-engine.js'))), provenance.runtime.find(r => r.file === 'maze-engine.js').sourceSha256, 'Refresh the website runtime before importing from a different engine');
    assert(/^draft-[a-z0-9-]+$/.test(manifest.id), 'Expected a draft build manifest');
    const engine = require(path.join(engineRoot, 'server/app.js'));
    const game = engine.getGame(manifest.id), level = engine.getLevel(game, 'level_AxA');
    assert(game.worldMap.levels.length === 1, 'Multi-room authored trials require an explicit exporter');
    const bytes = fs.readFileSync(path.join(engineRoot, 'games', game.id, 'levels', level.fileName));
    const cells = bytes.toString('utf8').trim().split(/\r?\n/).map(row => row.trim().split(/\s+/));
    assert.deepEqual(cells, spec.cells, 'The saved draft is different from the verified design');
    const sourceMapSha256 = hash(bytes);
    const existing = catalog.cases.find(c => c.kind === 'authored' && c.skill === skillId && records.get(c.id)?.sourceMapSha256 === sourceMapSha256);
    let publishedEntry = existing;
    if (existing) {
      replay(read(path.join(site, 'data/levels/' + existing.world + '/level_' + existing.room + '.json')), { ...existing, witness: spec.witness, goal: spec.contract.goal });
      assert.equal(existing.witness, spec.witness, 'An existing case has a different saved route; review it explicitly');
      assert.deepEqual(existing.goal, spec.contract.goal, 'An existing case has a different objective; review it explicitly');
      console.log('Already published: ' + existing.id);
    } else {
      const id = 'authored-' + skillId + '-' + sourceMapSha256.slice(0, 12);
      // Content-addressed static world IDs keep earlier links immutable, even if
      // a local authoring service reuses its draft ID for a later edit.
      const world = id;
      const localAssets = value => Array.isArray(value) ? value.map(localAssets) : value && typeof value === 'object' ?
        Object.fromEntries(Object.entries(value).map(([key, val]) => [key, localAssets(val)])) :
        typeof value === 'string' && value.startsWith('/assets/') ? './assets/maze/' + value.split('/').slice(3).join('/') : value;
      const state = localAssets(engine.getLevelState(game, level));
      state.gameId = world;
      state.playApiBaseUrl = './data/levels/' + world;
      const entry = { id, kind: 'authored', title: spec.title, skill: skillId, world, room: 'AxA', description: skill.exampleDescription,
        thumbnail: 'assets/thumbnails/' + id + '.png', map: 'data/maps/' + id + '-world-map.txt', witness: spec.witness, goal: spec.contract.goal };
      replay(state, entry);
      json('data/levels/' + world + '/level_AxA.json', state);
      pending.set(entry.map, bytes);
      json('data/designs/' + id + '.json', { title: spec.title, cells: spec.cells, witness: spec.witness, goal: spec.contract.goal });
      catalog.cases.push(entry);
      publishedEntry = entry;
      skill.authoredCases.push(id);
      records.set(id, { id, kind: 'authored', originalDraftId: manifest.id, title: spec.title, sourceMapSha256, witnessSha256: hash(spec.witness),
        source: 'Agent-authored trial; verified design and saved draft matched before publication.',
        verification: { overall: report.overall, profile: report.profile, cellsSha256: report.fingerprints.cells, contractSha256: report.fingerprints.contract, reportSha256: hash(fs.readFileSync(options.verification)) } });
    }
    const authoringRun = discoverAuthoringRun(options);
    if (authoringRun) {
      const process = exportProcess(authoringRun, { caseId: publishedEntry.id, title: spec.title, skill: skillId,
        expectedCellsSha256: hash(spec.cells), expectedContractSha256: hash(spec.contract) });
      attachProcessPreviews(process, authoringRun, { engineRoot, runtime: path.join(site, 'runtime/maze-engine.js'), emit: (file, bytes) => pending.set(file, bytes) });
      require('./export-authoring-process.cjs').assertPublicPrivacy(process);
      const file = 'data/processes/' + publishedEntry.id + '.json';
      json(file, process);
      publishedEntry.process = { data: file, schemaVersion: 1 };
      records.get(publishedEntry.id).authoringProcess = { schemaVersion: 1, data: file, sha256: hash(JSON.stringify(process, null, 2) + '\n'),
        cellsSha256: hash(spec.cells), contractSha256: hash(spec.contract) };
    }
  }
  for (const room of catalog.rooms) {
    const skills = catalog.skills.filter(s => s.rooms.includes(room.id)).map(s => s.id);
    room.skill = skills[0] || null;
    if (skills.length > 1) room.skills = skills; else delete room.skills;
  }
  provenance.cases = catalog.cases.map(c => records.get(c.id));
  json('data/catalog.json', catalog);
  json('data/provenance.json', provenance);
  const changes = [...pending].filter(([file, bytes]) => !fs.existsSync(path.join(site, file)) || !fs.readFileSync(path.join(site, file)).equals(bytes));
  if (options.check) assert.equal(changes.length, 0, 'Website catalog is stale; run scripts/publish-site.cjs as part of task completion');
  else for (const [file, bytes] of changes) {
    const dest = path.join(site, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
  }
  return { skills: catalog.skills.length, cases: catalog.cases.length, changed: changes.map(([file]) => file) };
}
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    assert(['skill', 'engine', 'spec', 'build', 'verification', 'authoring-run', 'check', 'prepare-only'].includes(key) && args[i].startsWith('--'), 'Unknown option: ' + args[i]);
    assert(!Object.hasOwn(options, key), 'Duplicate option: ' + args[i]);
    if (['check', 'prepare-only'].includes(key)) options[key] = true;
    else { assert(args[i + 1] && !args[i + 1].startsWith('--'), 'Missing value: ' + args[i]); options[key] = args[++i]; }
  }
  return options;
}
if (require.main === module) {
  try { console.log(JSON.stringify(synchronize(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { synchronize, parseArgs };
