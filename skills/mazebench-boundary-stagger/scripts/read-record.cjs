'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// A receipt establishes document version consistency, not reading, timing,
// understanding, physical validity, or necessity of a mechanism.
function checkReadRecord(spec, root, casePath) {
  const c = spec.contract, receipt = c.readReceipt;
  const mechanismPath = 'references/mechanism-logic.md';
  assert(receipt?.readBeforeLayout === true, 'Declare the pre-layout reading record');
  assert([mechanismPath, casePath].includes(receipt.path), 'Unsupported reading document');
  const bytes = fs.readFileSync(path.join(root, receipt.path));
  assert.equal(receipt.sha256, hash(bytes), 'Reading record refers to a different document version');
  const kind = receipt.path === mechanismPath ? 'mechanism' : 'case';
  if (kind === 'mechanism') {
    const relations = new Set([...bytes.toString('utf8').matchAll(/^### ([a-z0-9-]+)$/gm)].map(m => m[1]));
    const groups = Array.isArray(c.members) ? { [c.group]: c.members } : c.members;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const coordinate = p => Array.isArray(p) && p.length === 3 && p.every(Number.isInteger)
      && p[0] >= 0 && p[0] < 16 && p[1] >= 0 && p[1] < 16 && p[2] === 0;
    assert(Array.isArray(c.inherited) && c.inherited.length, 'Map inherited relations to authored geometry');
    const declared = new Set();
    for (const item of c.inherited) {
      assert(item && relations.has(item.relation), 'Unknown mechanism relation');
      assert(!declared.has(item.relation), 'Duplicate inherited relation');
      declared.add(item.relation);
      assert(typeof item.realization === 'string' && item.realization.trim(), 'Explain the authored realization');
      assert(item.members && typeof item.members === 'object' && !Array.isArray(item.members), 'Declare member anchors');
      let anchors = 0;
      for (const [group, members] of Object.entries(item.members)) {
        assert(groups[group] && Array.isArray(members) && members.length, 'Unknown or empty member anchor group');
        for (const p of members) {
          assert(coordinate(p) && groups[group].some(q => same(p, q)), 'Member anchor is not an initial member of this map');
          anchors++;
        }
      }
      for (const field of ['boundaries', 'passages', 'stances']) {
        assert(Array.isArray(item[field]), 'Declare ' + field + ' anchors, possibly empty');
        for (const p of item[field]) {
          assert(coordinate(p), 'Invalid authored ' + field + ' coordinate');
          const token = spec.cells[p[1]][p[0]], top = token.split('+').at(-1);
          if (field === 'boundaries') assert(top === '#', 'Boundary anchor is not a fixed wall in this map');
          else assert(top !== '#' && token !== '+' && !token.startsWith('+'), 'Access anchor is wall or void in this map');
          anchors++;
        }
      }
      assert(anchors > 0, 'An inherited relation needs concrete authored anchors');
    }
  }
  return { kind, path: receipt.path, sha256: receipt.sha256, scope: 'Document version consistency only; geometry anchors are declarations, not understanding or necessity proof.' };
}
module.exports = { checkReadRecord };
