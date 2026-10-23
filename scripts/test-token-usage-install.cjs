'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {install} = require('./install-token-usage.cjs');
const names = ['boundary-stagger', 'hook-transfer', 'constrained-transport', 'skating-cross', 'block-coordination'].map(name => 'mazebench-' + name);

test('token installation preserves custom skill text, backs up originals, and is idempotent', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mazebench-token-install-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('mazebench-token-install-'));
    fs.rmSync(root, {recursive: true, force: true});
  });
  const skills = path.join(root, 'skills'), backup = path.join(root, 'backup'), originals = new Map();
  for (const name of names) {
    const packaged = fs.readFileSync(path.resolve(__dirname, '../skills', name, 'SKILL.md'), 'utf8');
    const original = packaged.replace(/Token usage, runtime-reported model names[\s\S]*?(?=For new authored work,)/, '')
      .replace('For new authored work,', 'Custom installed recording guidance.\n\nFor new authored work,') + '\nCustom unrelated instructions.\n';
    const folder = path.join(skills, name); fs.mkdirSync(folder, {recursive: true});
    fs.writeFileSync(path.join(folder, 'SKILL.md'), original); originals.set(name, original);
  }
  assert.equal(install({skills, backup, dryRun: true}).files.length, 5);
  assert.equal(fs.existsSync(backup), false);
  assert.equal(install({skills, backup}).files.length, 5);
  for (const name of names) {
    const installed = fs.readFileSync(path.join(skills, name, 'SKILL.md'), 'utf8');
    assert.match(installed, /Token usage, runtime-reported model names/);
    assert.match(installed, /Custom installed recording guidance/);
    assert.match(installed, /Custom unrelated instructions/);
    assert.equal(fs.readFileSync(path.join(backup, name + '.SKILL.md'), 'utf8'), originals.get(name));
  }
  assert.equal(install({skills, backup}).files.length, 0);
});
