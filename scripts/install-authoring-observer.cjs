'use strict';

// Add observer hooks without replacing unrelated installed skill changes.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const get = key => {const i = args.indexOf('--' + key); return i < 0 ? null : args[i + 1];};
function install({skills, runtime, backup, dryRun = false}) {
  skills = path.resolve(skills); runtime = path.resolve(runtime); backup = path.resolve(backup);
  if (!fs.existsSync(path.join(runtime, 'skill-runtime.cjs'))) throw new Error('Runtime directory is not ready.');
  const changes = [];
  const propose = (file, content) => {
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (content !== before) changes.push({file, content, before});
  };
  const available = fs.readdirSync(path.join(root, 'skills')).filter(name => fs.existsSync(path.join(root, 'skills', name, 'scripts/authoring-observer.cjs')));
  for (const name of available) {
    const source = path.join(root, 'skills', name), target = path.join(skills, name);
    if (!fs.existsSync(path.join(target, 'SKILL.md'))) throw new Error('Install the mechanism skill first: ' + name);
    const entry = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8');
    const block = entry.match(/\n## Automatic authoring record\n[\s\S]*?(?=\n## |$)/)?.[0];
    if (!block) throw new Error('Missing packaged observer instructions: ' + name);
    let installed = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
    installed = installed.replace(/\n## Automatic authoring record\n[\s\S]*?(?=\n## |$)/, '');
    const nextSection = installed.indexOf('\n## ');
    if (nextSection < 0) throw new Error('Cannot find instruction insertion point: ' + name);
    propose(path.join(target, 'SKILL.md'), installed.slice(0, nextSection) + block + installed.slice(nextSection));
    propose(path.join(target, 'scripts/authoring-observer.cjs'), fs.readFileSync(path.join(source, 'scripts/authoring-observer.cjs'), 'utf8'));
    for (const script of fs.readdirSync(path.join(source, 'scripts')).filter(file => file.endsWith('.cjs'))) {
      const packaged = fs.readFileSync(path.join(source, 'scripts', script), 'utf8');
      const hook = packaged.match(/!require\('\.\/authoring-observer\.cjs'\)\.runAutomatic\(\{script:__filename,kind:'(build|test)'\}\)/);
      if (!hook) continue;
      const destination = path.join(target, 'scripts', script);
      if (!fs.existsSync(destination)) throw new Error('Installed helper is missing: ' + destination);
      let text = fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n');
      if (!text.includes("require('./authoring-observer.cjs').runAutomatic")) {
        if (/if\s*\(\s*require\.main\s*===\s*module\s*\)/.test(text)) {
          text = text.replace(/if\s*\(\s*require\.main\s*===\s*module\s*\)/, `if (require.main === module && ${hook[0]})`);
        } else if (!text.includes('require.main') && !text.includes('module.exports')) {
          // Older installed CLI-only helpers have no guard or importable API.
          text = `'use strict';\nif (require.main === module && ${hook[0]}) {\n` + text.replace(/^'use strict';\s*/, '') + '\n}\n';
        } else throw new Error('Cannot safely patch the installed CLI guard: ' + destination);
      }
      propose(destination, text);
    }
  }
  propose(path.join(skills, '.mazebench-observatory.json'), JSON.stringify({runtime}, null, 2) + '\n');
  if (dryRun) return {dryRun: true, skills: available.length, files: changes.map(c => c.file)};
  fs.mkdirSync(backup); // Backups must be new and are never overwritten.
  for (const change of changes) {
    if (change.before !== null) {
      const saved = path.join(backup, path.relative(skills, change.file));
      fs.mkdirSync(path.dirname(saved), {recursive: true}); fs.writeFileSync(saved, change.before);
    }
  }
  for (const change of changes) {fs.mkdirSync(path.dirname(change.file), {recursive: true}); fs.writeFileSync(change.file, change.content);}
  for (const change of changes.filter(c => c.file.endsWith('.cjs'))) {
    const checked = spawnSync(process.execPath, ['--check', change.file], {encoding: 'utf8', windowsHide: true});
    if (checked.status !== 0) throw new Error('Installed script syntax check failed: ' + change.file + '\n' + checked.stderr);
  }
  const result = {skills: available.length, runtime, files: changes.map(c => c.file), backup};
  fs.writeFileSync(path.join(backup, 'installation.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
if (require.main === module) {
  try {
    if (!get('skills') || !get('runtime') || !get('backup')) throw new Error('Use --skills DIRECTORY --runtime DIRECTORY --backup NEW_DIRECTORY [--dry-run].');
    console.log(JSON.stringify(install({skills: get('skills'), runtime: get('runtime'), backup: get('backup'), dryRun: args.includes('--dry-run')}), null, 2));
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
module.exports = {install};
