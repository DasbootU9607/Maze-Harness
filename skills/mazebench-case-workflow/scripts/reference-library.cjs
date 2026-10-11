'use strict';

// Catalog structure and relative grading records, not a human-difficulty model.
const kinds = ['official', 'user', 'authored'];
const bases = ['human-assigned', 'structural-estimate', 'playtest-supported', 'unranked'];
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const filled = value => typeof value === 'string' && value.trim().length > 0;
const kindOf = item => item.id.startsWith('user-') ? 'user' : item.id.startsWith('authored-') ? 'authored' : 'official';
const familyFor = (item, index) => item.family || (kindOf(item) === 'official' ? (index === 0 ? 'official' : 'official-' + item.id.toLowerCase()) : item.id);

function defaultLibrary() {
  return {
    scope: 'Relative reference complexity within this skill and its stated objectives; not an absolute human-difficulty score.',
    levels: [
      { id: 'l1', label: 'Foundation', criteria: 'Expose a core relation with limited prerequisite planning and accessible recovery.' },
      { id: 'l2', label: 'Combination', criteria: 'Connect preparations, changing input access, or reuse of the same mechanism.' },
      { id: 'l3', label: 'Planning', criteria: 'Coordinate deeper dependencies, constrained shared space, role changes, or recovery tradeoffs.' }
    ]
  };
}

function levelIssues(library) {
  const issues = [];
  if (!library || !filled(library.scope) || !Array.isArray(library.levels) || !library.levels.length) return ['Define the reference-library scope and ordered difficulty levels'];
  const seen = new Set();
  for (const level of library.levels) {
    if (!level || !slug(level.id) || level.id === 'unranked' || seen.has(level.id) || !filled(level.label) || !filled(level.criteria)) {
      issues.push('Difficulty levels need unique IDs, labels and criteria; unranked is reserved');
    }
    seen.add(level?.id);
  }
  return issues;
}

function lineageIssues(entries) {
  const issues = [], byId = new Map(entries.map(item => [item.id, item]));
  for (const item of entries) {
    if (item.parentCase && !byId.has(item.parentCase)) issues.push(item.id + ': parent reference is missing: ' + item.parentCase);
    const seen = new Set([item.id]);
    let parent = item.parentCase;
    while (parent && byId.has(parent)) {
      if (seen.has(parent)) { issues.push(item.id + ': cyclic variant lineage'); break; }
      seen.add(parent);
      parent = byId.get(parent).parentCase;
    }
  }
  return issues;
}

function catalogIssues(catalog) {
  const issues = [];
  if (!catalog || catalog.schemaVersion !== 1 || !/^mazebench-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(catalog.targetSkill) || catalog.targetSkill.length >= 64) issues.push('Invalid reference catalog version or target skill');
  issues.push(...levelIssues(catalog));
  if (!Array.isArray(catalog?.references)) return [...issues, 'Reference catalog needs a references array'];
  const ids = new Set(), families = new Set(), levels = new Set((Array.isArray(catalog.levels) ? catalog.levels : []).map(level => level?.id));
  for (const item of catalog.references) {
    if (!item || !filled(item.id)) { issues.push('Missing reference ID'); continue; }
    const expectedKind = kindOf(item);
    if (!kinds.includes(item.kind) || item.kind !== expectedKind ||
      (item.kind === 'official' ? !/^[A-Z]+x[A-Z]+$/.test(item.id) : !slug(item.id))) issues.push(item.id + ': invalid source kind or ID');
    if (ids.has(item.id)) issues.push(item.id + ': duplicate reference ID');
    ids.add(item.id);
    const validFamily = item.kind === 'official' ? item.family === 'official' || item.family === 'official-' + item.id.toLowerCase() : item.family === item.id;
    if (!validFamily || families.has(item.family)) issues.push(item.id + ': invalid or duplicate case family');
    families.add(item.family);
    if (!/^[0-9a-f]{64}$/.test(item.mapSha256) || !/^[0-9a-f]{40}$/.test(item.engineCommit)) issues.push(item.id + ': missing source fingerprints');
    if (item.casePath !== 'references/' + item.family + '-case.md') issues.push(item.id + ': case path must match its stable family');
    if (item.kind === 'official' && item.parentCase) issues.push(item.id + ': an official case is not a user-derived variant');
    if (item.kind !== 'official' && !filled(item.changeSummary)) issues.push(item.id + ': describe the variant changes or standalone design');
    if (!Array.isArray(item.relations) || !item.relations.length || !item.relations.every(slug)) issues.push(item.id + ': identify the shared mechanism relation IDs');
    const rating = item.difficulty;
    if (!rating || !bases.includes(rating.basis) || !filled(rating.rationale) ||
      !(levels.has(rating.level) || rating.level === 'unranked' && rating.basis === 'unranked') ||
      rating.basis === 'unranked' && rating.level !== 'unranked') issues.push(item.id + ': provide a valid difficulty level, basis and rationale');
  }
  issues.push(...lineageIssues(catalog.references.filter(item => item && filled(item.id))));
  return issues;
}

module.exports = { kinds, bases, kindOf, familyFor, defaultLibrary, levelIssues, lineageIssues, catalogIssues };
