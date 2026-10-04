'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { read, validate } = require('./runtime.cjs');
const { saveDraft } = require('./draft-io.cjs');
function build(repo, spec, out) {
  out = path.resolve(out); assert(!fs.existsSync(out), 'Choose a fresh output directory');
  validate(spec, path.resolve(__dirname, '..'));
  const manifest = saveDraft(repo, out, { ...spec, scenario: spec.scenario || 'skating-cross' });
  fs.writeFileSync(path.join(out, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
  return manifest;
}
if (require.main === module) {
  const args = process.argv.slice(2), get = k => args[args.indexOf(k) + 1];
  assert(args.includes('--repo') && args.includes('--spec') && args.includes('--out'));
  console.log(JSON.stringify(build(get('--repo'), read(get('--spec')), get('--out'))));
}
module.exports = { build };
