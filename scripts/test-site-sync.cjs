'use strict';
// Disposable copies exercise discovery, preservation and stale-record rejection.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { synchronize } = require('./sync-site.cjs');
const { read, hash } = require('./site-content.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'outputs');
fs.mkdirSync(output, { recursive: true });
const fixture = fs.mkdtempSync(path.join(output, 'site-sync-'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const args = process.argv.slice(2);
const get = key => args.includes(key) ? path.resolve(args[args.indexOf(key) + 1]) : null;
try {
  fs.cpSync(path.join(root, 'site'), path.join(fixture, 'site'), { recursive: true });
  fs.cpSync(path.join(root, 'skills'), path.join(fixture, 'skills'), { recursive: true });
  const initial = read(path.join(fixture, 'site/data/catalog.json'));
  synchronize({}, fixture);
  assert.equal(synchronize({}, fixture).changed.length, 0, 'Repeated synchronization must be idempotent');
  const pkg = path.join(fixture, 'skills/mazebench-publication-fixture');
  fs.cpSync(path.join(fixture, 'skills/mazebench-boundary-stagger'), pkg, { recursive: true });
  fs.writeFileSync(path.join(pkg, 'SKILL.md'), '---\nname: mazebench-publication-fixture\ndescription: Disposable publication regression fixture.\n---\n\n# MazeBench Publication Fixture\n');
  // This is an automation fixture reusing existing evidence, not a new skill claim.
  fs.writeFileSync(path.join(pkg, 'references/website.json'), JSON.stringify({ verb: 'A discovery fixture.', steps: [] }, null, 2) + '\n');
  assert.throws(() => synchronize({ check: true }, fixture), /catalog is stale/);
  synchronize({}, fixture);
  let catalog = read(path.join(fixture, 'site/data/catalog.json'));
  assert.equal(catalog.skills.length, initial.skills.length + 1, 'Discover an additional skill without a code edit');
  const added = catalog.skills.find(s => s.id === 'publication-fixture');
  assert.equal(added.authoredCases.length, 0, 'Do not invent a playable example for a new skill');
  assert(added.officialCases.length);
  assert.deepEqual(catalog.cases.filter(c => c.kind === 'authored'), initial.cases.filter(c => c.kind === 'authored'), 'Preserve every existing authored example');
  assert(catalog.rooms.find(r => r.id === 'HxH').skills.includes('publication-fixture'), 'A room can reference multiple skills');
  assert.equal(synchronize({}, fixture).changed.length, 0);
  const officialDesign = path.join(pkg, 'references/official-design.json');
  const design = read(officialDesign);
  write(officialDesign, { ...design, witness: 'U' });
  assert.throws(() => synchronize({}, fixture), /Incomplete/);
  write(officialDesign, design);
  const engine = get('--engine'), trials = get('--trials');
  if (engine || trials) {
    assert(engine && trials, 'Supply both --engine and --trials for real import regressions');
    const spec = path.join(trials, 'boundary-stagger.json');
    const verification = path.join(trials, 'checks-boundary-v1/verification.json');
    const build = path.join(trials, 'build-boundary-stagger/manifest.json');
    const options = { engine, spec, verification, build, skill: 'boundary-stagger' };
    assert.equal(synchronize(options, fixture).changed.length, 0, 'Reimport of an existing map must not duplicate it');
    const invalid = path.join(fixture, 'invalid-verification.json');
    const report = read(verification);
    write(invalid, { ...report, overall: 'unknown' });
    assert.throws(() => synchronize({ ...options, verification: invalid }, fixture), /verified trials/);
    write(invalid, { ...report, fingerprints: { ...report.fingerprints, cells: 'stale' } });
    assert.throws(() => synchronize({ ...options, verification: invalid }, fixture), /stale: cells/);
    const source = read(spec), stale = path.join(fixture, 'stale-spec.json');
    write(stale, { ...source, contract: { ...source.contract, goal: { kind: 'reach', cell: [0, 0, 0] } } });
    assert.throws(() => synchronize({ ...options, spec: stale }, fixture), /stale: contract/);
    // Remove only the fixture's registration, then import the real verified map
    // under its immutable content-addressed world while keeping all other cases.
    const original = catalog.cases.find(c => c.id === 'authored-boundary-stagger');
    catalog.cases = catalog.cases.filter(c => c.id !== original.id);
    catalog.skills.find(s => s.id === 'boundary-stagger').authoredCases = [];
    write(path.join(fixture, 'site/data/catalog.json'), catalog);
    const provenance = read(path.join(fixture, 'site/data/provenance.json'));
    provenance.cases = provenance.cases.filter(c => c.id !== original.id);
    write(path.join(fixture, 'site/data/provenance.json'), provenance);
    synchronize(options, fixture);
    catalog = read(path.join(fixture, 'site/data/catalog.json'));
    const imported = catalog.cases.find(c => c.kind === 'authored' && c.skill === 'boundary-stagger');
    assert(imported.world.startsWith('authored-boundary-stagger-'));
    assert.equal(hash(fs.readFileSync(path.join(fixture, 'site', imported.map))), hash(fs.readFileSync(path.join(root, 'site', original.map))));
    assert(fs.existsSync(path.join(fixture, 'site/data/levels/' + imported.world + '/level_AxA.json')));
    assert.equal(synchronize(options, fixture).changed.length, 0);
    assert.equal(catalog.cases.length, initial.cases.length + added.officialCases.length);
    console.log('Real trial import, immutable world export, duplicate suppression, unknown/stale report rejection passed.');
  }
  console.log('Incremental website discovery, multiple skill references, witness validation, preservation and idempotence passed.');
} finally {
  const resolved = fs.realpathSync(fixture);
  assert(path.dirname(resolved).toLowerCase() === fs.realpathSync(output).toLowerCase() && path.basename(resolved).startsWith('site-sync-'));
  fs.rmSync(resolved, { recursive: true });
}
