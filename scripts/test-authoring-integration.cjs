'use strict';

// Synthetic protocol fixtures only. These tests do not invoke a model or verify maze physics.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runtime = path.join(root, 'tools/authoring-observatory/skill-runtime.cjs');
const bridge = path.join(root, 'skills/mazebench-boundary-stagger/scripts/authoring-observer.cjs');
const skillNames = fs.readdirSync(path.join(root, 'skills')).filter(name => name !== 'mazebench-case-workflow');
const env = extra => {
  const result = {...process.env};
  for (const key of ['MAZEBENCH_OBSERVER_RUNTIME', 'MAZEBENCH_OBSERVER_CONFIG', 'MAZEBENCH_OBSERVER_CHILD']) delete result[key];
  return {...result, MAZEBENCH_OBSERVER_NO_VIEWER: '1', ...extra};
};
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
};
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function fixture(t, configured = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mazebench-authoring-integration-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('mazebench-authoring-integration-'));
    fs.rmSync(directory, {recursive: true, force: true});
  });
  const skillRoot = path.join(directory, 'skills/mazebench-fixture');
  const scripts = path.join(skillRoot, 'scripts'), runsRoot = path.join(directory, 'records');
  fs.mkdirSync(scripts, {recursive: true});
  fs.copyFileSync(bridge, path.join(scripts, 'authoring-observer.cjs'));
  write(path.join(skillRoot, 'SKILL.md'), '# Synthetic protocol fixture\n\nNo model or maze engine is invoked.\n');
  if (configured) write(path.join(scripts, 'authoring-observer.local.json'), {runtime, runsRoot, viewer: false});
  const build = path.join(scripts, 'build.cjs'), verify = path.join(scripts, 'verify.cjs');
  write(build, `'use strict';
const fs=require('node:fs'),path=require('node:path');
if(require.main===module&&!require('./authoring-observer.cjs').runAutomatic({script:__filename,kind:'build'})){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
 const spec=JSON.parse(fs.readFileSync(get('--spec'),'utf8')),out=get('--out');
 if(args.includes('--fixture-fail')){process.stdout.write('synthetic-build-failed\\n');process.stderr.write('synthetic-build-error\\n');process.exitCode=5;}
 else {fs.mkdirSync(out);for(const [name,value]of Object.entries({'spec.json':spec,'world.json':{levels:[{cells:spec.cells}]},'contract.json':spec.contract}))fs.writeFileSync(path.join(out,name),JSON.stringify(value));
 process.stdout.write(JSON.stringify({fixture:'build',title:spec.title})+'\\n');}
}
module.exports={buildFixture:true};
`);
  write(verify, `'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(require.main===module&&!require('./authoring-observer.cjs').runAutomatic({script:__filename,kind:'test'})){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],out=get('--out');
 if(args.includes('--fixture-fail')){process.stdout.write('synthetic-validation-failed\\n');process.stderr.write('synthetic-validation-error\\n');process.exitCode=9;}
 else if(args.includes('--fixture-no-report'))process.stdout.write('synthetic-no-report\\n');
 else {const spec=JSON.parse(fs.readFileSync(path.join(out,'spec.json'),'utf8')),status=args.includes('--fixture-unknown')?'unknown':'passed';
 const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const report={status,checks:[{name:'Synthetic protocol check only',status}],scope:'Synthetic fixture; not maze verification or model evidence.'};
 if(!args.includes('--fixture-no-fingerprints'))report.fingerprints={cells:hash(spec.cells),contract:hash(spec.contract)};
 fs.writeFileSync(path.join(out,args.includes('--report')?get('--report'):'verification.json'),JSON.stringify(report));
 process.stdout.write(JSON.stringify({fixture:'verify',status})+'\\n');}
}
module.exports={verifyFixture:true};
`);
  const spec = path.join(directory, 'drafts/spec.json');
  write(spec, {title: 'Synthetic integration fixture; no model run', cells: [{x: 0, y: 0, z: 0, token: 'p'}], contract: {profile: 'synthetic-fixture'}});
  return {directory, skillRoot, scripts, runsRoot, build, verify, spec, out: path.join(directory, 'build-output')};
}

function call(f, file, args = [], extraEnv = {}) {
  const result = spawnSync(process.execPath, [file, ...args], {cwd: f.directory, env: env(extraEnv), encoding: 'utf8', timeout: 20000, windowsHide: true});
  assert.equal(result.error, undefined, result.error && String(result.error));
  return result;
}
function callAsync(f, file, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {cwd: f.directory, env: env(), windowsHide: true});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => {stdout += chunk;});
    child.stderr.on('data', chunk => {stderr += chunk;});
    child.on('error', reject); child.on('close', status => resolve({status, stdout, stderr}));
  });
}
function runs(f) {
  if (!fs.existsSync(f.runsRoot)) return [];
  return fs.readdirSync(f.runsRoot).map(id => {
    const dir = path.join(f.runsRoot, id), index = read(path.join(dir, 'index.json'));
    return {dir, manifest: read(path.join(dir, 'manifest.json')), ...index,
      events: fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)};
  });
}

test('all packaged authoring entrypoints delegate without changing their CLI output or exit status', t => {
  const f = fixture(t), fake = path.join(f.directory, 'fake-runtime.cjs'), log = path.join(f.directory, 'delegations.jsonl');
  write(fake, `exports.runAutomatic=o=>{require('node:fs').appendFileSync(${JSON.stringify(log)},JSON.stringify({script:o.script,kind:o.kind,argv:o.argv})+'\\n');process.stdout.write('synthetic-stdout\\n');process.stderr.write('synthetic-stderr\\n');return {handled:true,exitCode:17};};`);
  const entries = [];
  for (const skill of skillNames) {
    const scripts = path.join(root, 'skills', skill, 'scripts');
    for (const name of fs.readdirSync(scripts).filter(name => /^build.*\.cjs$/.test(name) || ['verify.cjs', 'verify-complex.cjs', 'verify-contact.cjs'].includes(name))) entries.push(path.join(scripts, name));
  }
  assert.equal(entries.length, 14);
  const argv = ['--spec', f.spec, '--out', f.out, '--repo', path.join(f.directory, 'unused-engine')];
  for (const entry of entries) {
    const result = call(f, entry, argv, {MAZEBENCH_OBSERVER_RUNTIME: fake});
    assert.equal(result.status, 17, entry + ': ' + result.stderr);
    assert.equal(result.stdout, 'synthetic-stdout\n');
    assert.equal(result.stderr, 'synthetic-stderr\n');
  }
  const delegated = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(delegated.length, entries.length);
  assert.ok(delegated.every(item => JSON.stringify(item.argv) === JSON.stringify(argv)));
});

test('requiring existing helper APIs does not invoke the recorder', t => {
  const f = fixture(t), fake = path.join(f.directory, 'fake-runtime.cjs');
  write(fake, "exports.runAutomatic=()=>{throw new Error('Recorder must not run during require');};\n");
  const entries = [
    ['mazebench-hook-transfer', 'build.cjs', 'build'], ['mazebench-constrained-transport', 'build.cjs', 'build'],
    ['mazebench-skating-cross', 'build.cjs', 'build'], ['mazebench-boundary-stagger', 'verify.cjs', 'verify'],
    ['mazebench-boundary-stagger', 'verify-complex.cjs', 'verify'], ['mazebench-hook-transfer', 'verify-contact.cjs', 'verify'],
    ['mazebench-hook-transfer', 'verify-complex.cjs', 'verify'], ['mazebench-constrained-transport', 'verify.cjs', 'verify'],
    ['mazebench-constrained-transport', 'verify-complex.cjs', 'verify'], ['mazebench-skating-cross', 'verify.cjs', 'verify'],
  ];
  for (const [skill, name, member] of entries) {
    const file = path.join(root, 'skills', skill, 'scripts', name);
    const result = call(f, '-e', [`process.stdout.write(typeof require(${JSON.stringify(file)})[${JSON.stringify(member)}]);`], {MAZEBENCH_OBSERVER_RUNTIME: fake});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'function');
    assert.equal(result.stderr, '');
  }
});

test('ordinary build and verify automatically share a session and capture original output', t => {
  const f = fixture(t);
  const built = call(f, f.build, ['--spec', f.spec, '--out', f.out]);
  assert.equal(built.status, 0, built.stderr);
  assert.equal(built.stdout, JSON.stringify({fixture: 'build', title: read(f.spec).title}) + '\n');
  const checked = call(f, f.verify, ['--out', f.out]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.stdout, '{"fixture":"verify","status":"passed"}\n');
  const recorded = runs(f);
  assert.equal(recorded.length, 1);
  const run = recorded[0];
  assert.equal(run.tests.length, 1);
  assert.equal(run.tests[0].status, 'passed');
  assert.equal(run.events.filter(event => event.type === 'command.started').length, 2, 'The sentinel must prevent recursive recording.');
  assert.equal(run.resources.length, 0, 'Attaching a skill snapshot is not a recorded agent read.');
  assert.ok(run.events.some(event => event.type === 'skill.attached'));
  assert.equal(fs.readFileSync(path.join(run.dir, run.tests[0].stdoutPath), 'utf8'), checked.stdout);
  assert.equal(read(path.join(f.out, 'authoring-session.json')).schemaVersion, 1);
});

test('separate concurrently built specs keep separate sessions and later verifications', async t => {
  const f = fixture(t), specB = path.join(f.directory, 'other-task/spec.json'), outB = path.join(f.directory, 'other-build');
  write(specB, {...read(f.spec), title: 'Second synthetic fixture'});
  const results = await Promise.all([callAsync(f, f.build, ['--spec', f.spec, '--out', f.out]), callAsync(f, f.build, ['--spec', specB, '--out', outB])]);
  for (const result of results) assert.equal(result.status, 0, result.stderr);
  assert.equal(call(f, f.verify, ['--out', f.out]).status, 0);
  assert.equal(call(f, f.verify, ['--out', outB]).status, 0);
  const recorded = runs(f);
  assert.equal(recorded.length, 2);
  assert.deepEqual(new Set(recorded.map(run => run.manifest.watchSpec)), new Set([f.spec, specB]));
  assert.ok(recorded.every(run => run.tests.length === 1));
});

test('concurrent specs in one directory retain every marker and reuse their own sessions', async t => {
  const f = fixture(t);
  const jobs = Array.from({length: 4}, (_, index) => {
    const spec = path.join(path.dirname(f.spec), `parallel-${index}.json`), out = path.join(f.directory, `parallel-build-${index}`);
    write(spec, {...read(f.spec), title: `Synthetic same-directory fixture ${index}`});
    return {spec, out};
  });
  const built = await Promise.all(jobs.map(job => callAsync(f, f.build, ['--spec', job.spec, '--out', job.out])));
  for (const result of built) assert.equal(result.status, 0, result.stderr);
  const marker = read(path.join(path.dirname(f.spec), 'authoring-session.json'));
  assert.equal(Object.keys(marker.sessions).length, jobs.length);
  for (const job of jobs) assert.equal(call(f, f.verify, ['--out', job.out]).status, 0);
  const recorded = runs(f);
  assert.equal(recorded.length, jobs.length);
  assert.ok(recorded.every(run => run.tests.length === 1));
  assert.deepEqual(new Set(recorded.map(run => run.manifest.watchSpec)), new Set(jobs.map(job => job.spec)));
});

test('concurrent builds of the same spec create only one session and one dependency attachment', async t => {
  const f = fixture(t);
  const results = await Promise.all([0, 1].map(index => callAsync(f, f.build,
    ['--spec', f.spec, '--out', path.join(f.directory, `same-spec-build-${index}`)])));
  for (const result of results) assert.equal(result.status, 0, result.stderr);
  const recorded = runs(f);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].events.filter(event => event.type === 'command.started').length, 2);
  assert.equal(recorded[0].events.filter(event => event.type === 'skill.attached').length, 1);
});

test('a completed task starts a new session for the next ordinary build', t => {
  const f = fixture(t);
  assert.equal(call(f, f.build, ['--spec', f.spec, '--out', f.out]).status, 0);
  const before = runs(f)[0].manifest.id;
  const finished = call(f, path.join(f.scripts, 'authoring-observer.cjs'), ['finish', '--spec', f.spec]);
  assert.equal(finished.status, 0, finished.stderr);
  const nextOut = path.join(f.directory, 'next-build');
  assert.equal(call(f, f.build, ['--spec', f.spec, '--out', nextOut]).status, 0);
  const recorded = runs(f);
  assert.equal(recorded.length, 2);
  assert.equal(recorded.find(run => run.manifest.id === before).manifest.status, 'complete');
  assert.equal(recorded.find(run => run.manifest.id !== before).manifest.status, 'running');
});

test('failed commands and unknown reports retain original process status and evidence', t => {
  const f = fixture(t);
  const failedBuild = call(f, f.build, ['--spec', f.spec, '--out', f.out, '--fixture-fail']);
  assert.equal(failedBuild.status, 5);
  assert.equal(failedBuild.stdout, 'synthetic-build-failed\n');
  assert.equal(failedBuild.stderr, 'synthetic-build-error\n');
  assert.equal(call(f, f.build, ['--spec', f.spec, '--out', f.out]).status, 0);
  const failed = call(f, f.verify, ['--out', f.out, '--fixture-fail']);
  assert.equal(failed.status, 9);
  assert.equal(failed.stdout, 'synthetic-validation-failed\n');
  const unknown = call(f, f.verify, ['--out', f.out, '--fixture-unknown']);
  assert.equal(unknown.status, 0, 'Recording must not change a helper exit code to reflect its own interpretation.');
  const run = runs(f)[0];
  assert.equal(run.tests[0].processExitCode, 9);
  assert.notEqual(run.tests[0].status, 'passed');
  assert.equal(run.tests[1].processExitCode, 0);
  assert.equal(run.tests[1].status, 'unknown');
});

test('malformed specs still execute the original helper and leave explicit capture gaps', t => {
  const f = fixture(t);
  write(f.spec, '{invalid JSON');
  const args = ['--spec', f.spec, '--out', f.out];
  const baseline = call(f, f.build, args, {MAZEBENCH_OBSERVER_CHILD: '1'});
  const observed = call(f, f.build, args);
  assert.equal(observed.status, baseline.status);
  assert.equal(observed.stdout, baseline.stdout);
  assert.match(observed.stderr, /SyntaxError/);
  const recorded = runs(f);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].candidates.length, 0);
  assert.ok(recorded[0].events.some(event => event.type === 'capture.gap'));
  assert.equal(recorded[0].events.filter(event => event.type === 'command.started').length, 1);
  assert.equal(recorded[0].events.filter(event => event.type === 'command.completed').length, 1);
});

test('a restored old report cannot stand in for a new execution that wrote no report', t => {
  const f = fixture(t);
  assert.equal(call(f, f.build, ['--spec', f.spec, '--out', f.out]).status, 0);
  assert.equal(call(f, f.verify, ['--out', f.out]).status, 0);
  const reportPath = path.join(f.out, 'verification.json'), before = fs.readFileSync(reportPath);
  const repeated = call(f, f.verify, ['--out', f.out, '--fixture-no-report']);
  assert.equal(repeated.status, 0);
  const run = runs(f)[0], latest = run.tests.at(-1);
  assert.equal(run.tests.length, 2);
  assert.notEqual(latest.status, 'passed');
  assert.equal(latest.reportPath, undefined);
  assert.deepEqual(fs.readFileSync(reportPath), before);
  assert.ok(run.events.some(event => event.type === 'report.previous'));
});

test('verifying an old build never reports success against a changed source spec', t => {
  const f = fixture(t);
  assert.equal(call(f, f.build, ['--spec', f.spec, '--out', f.out]).status, 0);
  const originalHash = runs(f)[0].candidates[0].sha256;
  const changed = read(f.spec); changed.cells[0].token = 'G'; write(f.spec, changed);
  const verified = call(f, f.verify, ['--out', f.out, '--fixture-no-fingerprints']);
  assert.equal(verified.status, 0, verified.stderr);
  const run = runs(f)[0], result = run.tests.at(-1);
  assert.ok(result.status !== 'passed' || result.inputSha256 === originalHash,
    'A basic verifier consumes saved build geometry, not the current source file.');
});

test('the packaged observer records explicit file delivery and notes before a spec exists', t => {
  const f = fixture(t), observer = path.join(f.scripts, 'authoring-observer.cjs');
  fs.unlinkSync(f.spec);
  assert.equal(call(f, observer, ['start', '--spec', f.spec, '--title', 'Synthetic pre-layout task']).status, 0);
  const reference = path.join(f.directory, 'mechanism-reference.txt'), note = path.join(f.directory, 'note.json');
  write(reference, 'Synthetic reference bytes, not a real mechanism.\n');
  const delivered = call(f, observer, ['read', '--spec', f.spec, '--file', reference]);
  assert.equal(delivered.status, 0, delivered.stderr);
  assert.equal(delivered.stdout, fs.readFileSync(reference, 'utf8'));
  write(note, {goal: 'Exercise the recorder protocol', sources: [reference], change: '', reason: 'Synthetic fixture', expectedChecks: []});
  assert.equal(call(f, observer, ['note', '--spec', f.spec, '--json', note]).status, 0);
  const run = runs(f)[0];
  assert.equal(run.resources.length, 1);
  assert.equal(run.notes.length, 1);
  assert.equal(run.notes[0].origin, 'agent_statement');
  assert.equal(run.candidates.length, 0);
});

test('a detached package discovers ancestor configuration and the sentinel bypasses recursion', t => {
  const f = fixture(t, false), fake = path.join(f.directory, 'fake-runtime.cjs');
  write(fake, "exports.runAutomatic=()=>{process.stdout.write('synthetic-delegation\\n');return {handled:true,exitCode:17};};\n");
  write(path.join(f.directory, 'skills/.mazebench-observatory.json'), {runtime: '../fake-runtime.cjs'});
  const delegated = call(f, f.build, ['--spec', f.spec, '--out', f.out]);
  assert.equal(delegated.status, 17);
  assert.equal(delegated.stdout, 'synthetic-delegation\n');
  const direct = call(f, f.build, ['--spec', f.spec, '--out', f.out], {MAZEBENCH_OBSERVER_CHILD: '1'});
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(direct.stdout, JSON.stringify({fixture: 'build', title: read(f.spec).title}) + '\n');
  assert.equal(runs(f).length, 0);
});

test('a missing optional runtime is disclosed and configured failures never claim recording', t => {
  const f = fixture(t, false);
  const without = call(f, f.build, ['--spec', f.spec, '--out', f.out]);
  assert.equal(without.status, 0, without.stderr);
  assert.match(without.stderr, /Recording is not enabled/);
  assert.equal(runs(f).length, 0);
  const configured = call(f, f.build, ['--spec', f.spec, '--out', path.join(f.directory, 'second-output')],
    {MAZEBENCH_OBSERVER_RUNTIME: path.join(f.directory, 'missing-runtime.cjs')});
  assert.equal(configured.status, 1);
  assert.match(configured.stderr, /Automatic recording failed/);
  assert.equal(configured.stdout, '');
});
