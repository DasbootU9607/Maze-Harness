'use strict';
// Merge only our command hooks; preserve model, provider, permissions and unrelated hooks.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
function linkSkills({home = os.homedir(), source}) {
  const names = fs.readdirSync(source).filter(name => name.startsWith('mazebench-') && fs.existsSync(path.join(source, name, 'scripts/authoring-observer.cjs')));
  const created = [], preserved = [];
  for (const directory of ['.claude', '.gemini']) {
    const root = path.join(home, directory, 'skills'); fs.mkdirSync(root, {recursive: true});
    for (const name of names) {
      const target = path.join(root, name), original = path.resolve(source, name);
      if (fs.existsSync(target)) {preserved.push(target); continue;}
      fs.symlinkSync(original, target, process.platform === 'win32' ? 'junction' : 'dir'); created.push(target);
    }
  }
  return {created, preserved};
}
function install({home = os.homedir(), runtime, backup, dryRun = false}) {
  const hook = path.resolve(runtime, 'usage-hook.cjs');
  if (!fs.existsSync(hook)) throw new Error('Install the observer runtime first.');
  const quote = text => {
    if (/["`$\r\n]/.test(text)) throw new Error('Unsupported shell metacharacter in the hook installation path.');
    return '"' + text + '"';
  };
  const changes = [];
  for (const [directory, runtimeName, event] of [['.claude', 'claude-code', 'PreToolUse'], ['.gemini', 'gemini-cli', 'BeforeTool']]) {
    const file = path.join(home, directory, 'settings.json');
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    const settings = before ? JSON.parse(before.replace(/^\uFEFF/, '')) : {};
    const command = quote(process.execPath) + ' ' + quote(hook) + ' ' + runtimeName;
    settings.hooks ??= {}; settings.hooks[event] ??= [];
    const matches = settings.hooks[event].filter(group => group.hooks?.some(h => h.command === command));
    if (matches.length) continue;
    settings.hooks[event].push({matcher: runtimeName === 'gemini-cli' ? '.*' : '*', hooks: [{type: 'command', command, timeout: runtimeName === 'gemini-cli' ? 15000 : 15}]});
    changes.push({file, before, after: JSON.stringify(settings, null, 2) + '\n', directory});
  }
  if (!dryRun && changes.length) {
    fs.mkdirSync(backup, {recursive: false});
    for (const c of changes) if (c.before !== null) fs.writeFileSync(path.join(backup, c.directory + '-settings.json'), c.before, {flag: 'wx'});
    for (const c of changes) {fs.mkdirSync(path.dirname(c.file), {recursive: true}); fs.writeFileSync(c.file, c.after);}
  }
  return {dryRun, files: changes.map(c => c.file), backup};
}
if (require.main === module) {
  const args = process.argv.slice(2), get = key => args[args.indexOf('--' + key) + 1];
  if (!args.includes('--runtime') || !args.includes('--backup')) throw new Error('Use --runtime DIRECTORY --backup NEW_DIRECTORY [--dry-run].');
  console.log(JSON.stringify(install({runtime: get('runtime'), backup: get('backup'), dryRun: args.includes('--dry-run')}), null, 2));
  if (args.includes('--skills-source') && !args.includes('--dry-run')) console.log(JSON.stringify(linkSkills({source: get('skills-source')}), null, 2));
}
module.exports = {install, linkSkills};
