'use strict';

// Install only the token-entry instructions. Preserve all other installed skill content.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const names = ['boundary-stagger', 'hook-transfer', 'constrained-transport', 'skating-cross', 'block-coordination'].map(name => 'mazebench-' + name);
const section = /\n## Automatic authoring record\n[\s\S]*?(?=\n## |$)/;

function install({skills, backup, dryRun = false}) {
  skills = path.resolve(skills); backup = path.resolve(backup);
  const changes = [];
  for (const name of names) {
    const packaged = fs.readFileSync(path.resolve(__dirname, '../skills', name, 'SKILL.md'), 'utf8');
    const block = packaged.match(section)?.[0];
    if (!block?.includes('Token usage, runtime-reported model names')) throw new Error('Missing token instructions in ' + name);
    const heading = '\n## Automatic authoring record\n\n';
    const end = block.indexOf('For new authored work,');
    if (end < heading.length) throw new Error('Missing ordinary workflow boundary in ' + name);
    const addition = block.slice(heading.length, end);
    const file = path.join(skills, name, 'SKILL.md'), before = fs.readFileSync(file, 'utf8');
    const text = before.replace(/\r\n/g, '\n');
    if (!section.test(text)) throw new Error('Installed skill has no authoring record section: ' + name);
    if (text.includes(addition)) continue;
    const old = /Token usage is a default deliverable[\s\S]*?(?=For new authored work,)/;
    const migrated = text.replace(old, '');
    if (!migrated.includes(heading)) throw new Error('Unsupported authoring heading in ' + name);
    const after = migrated.replace(heading, () => heading + addition);
    if (after !== before) changes.push({file, before, after, name});
  }
  const result = {dryRun, files: changes.map(c => c.file), backup};
  if (dryRun || !changes.length) return result;
  fs.mkdirSync(backup, {recursive: false});
  for (const change of changes) {
    fs.writeFileSync(path.join(backup, change.name + '.SKILL.md'), change.before, {flag: 'wx'});
  }
  for (const change of changes) fs.writeFileSync(change.file, change.after, 'utf8');
  fs.writeFileSync(path.join(backup, 'installation.json'), JSON.stringify({...result,
    before: changes.map(c => ({file: c.file, sha256: crypto.createHash('sha256').update(c.before).digest('hex')}))}, null, 2) + '\n');
  return result;
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
    if (!args.includes('--skills') || !args.includes('--backup')) throw new Error('Use --skills DIRECTORY --backup NEW_DIRECTORY [--dry-run].');
    console.log(JSON.stringify(install({skills: get('--skills'), backup: get('--backup'), dryRun: args.includes('--dry-run')}), null, 2));
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
module.exports = {install};
