'use strict';
// The authorized completion step: prepare, check, commit and push to Pages.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { synchronize, parseArgs } = require('./sync-site.cjs');
const root = path.resolve(__dirname, '..');
function publish(options, run = (file, args, capture = false) => execFileSync(file, args, { cwd: root, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' })) {
  assert(options.engine, 'Supply --engine for real 3D thumbnails');
  assert(!options.check, 'Use sync-site.cjs --check for read-only validation');
  const git = (...args) => run('git', args, true).trim();
  const scope = ['site'];
  if (options.skill) scope.push('skills/mazebench-' + options.skill.replace(/^mazebench-/, ''), 'README.md');
  if (!options['prepare-only']) {
    assert.equal(git('branch', '--show-current'), 'main', 'Publish from main');
    assert(/^(?:https:\/\/github\.com\/|git@github\.com:)DasbootU9607\/Maze-Harness(?:\.git)?$/i.test(git('remote', 'get-url', 'origin')), 'Unexpected publication repository');
    assert.equal(git('diff', '--cached', '--name-only'), '', 'Commit or unstage existing staged work before automated publication');
    const changed = [...git('diff', '--name-only').split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].filter(Boolean);
    assert(changed.every(file => scope.some(s => file === s || file.startsWith(s + '/'))), 'Unrelated changes are present. Commit the intended task changes separately, then rerun publication.');
    run('git', ['fetch', 'origin', 'main']);
    run('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD']);
  }
  const result = synchronize(options);
  run(process.execPath, ['scripts/capture-site.cjs', '--engine', path.resolve(options.engine), '--missing']);
  run(process.execPath, ['scripts/check-skills.cjs']);
  run(process.execPath, ['scripts/sync-site.cjs', '--check']);
  run(process.execPath, ['scripts/check-site.cjs']);
  if (options['prepare-only']) return { ...result, published: false };
  run('git', ['add', '--', ...scope]);
  if (git('diff', '--cached', '--name-only')) run('git', ['commit', '-m', 'Publish verified Maze Harness skills and playtests']);
  run('git', ['push', 'origin', 'HEAD:main']);
  return { ...result, pushed: true, commit: git('rev-parse', 'HEAD'), url: 'https://dasbootu9607.github.io/Maze-Harness/', next: 'Check the Deploy GitHub Pages run for this commit before reporting the site as live.' };
}
if (require.main === module) {
  try { console.log(JSON.stringify(publish(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { publish };
