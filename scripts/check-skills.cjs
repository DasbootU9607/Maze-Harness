'use strict';

// Repository conventions only; gameplay verification uses a separate engine.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

const hash = value => crypto.createHash('sha256').update(
  Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)
).digest('hex');
const sourceTypes = ['official', 'user', 'authored'];
const conventionalNames = new Set(['SKILL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']);
const textExtensions = new Set(['.md', '.json', '.yaml', '.yml', '.cjs', '.js', '.py', '.txt']);

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules', 'outputs', '__pycache__'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  }).sort();
}

function checkRepository(root) {
  root = path.resolve(root);
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const textFiles = new Map();
  const jsonFiles = new Map();
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  for (const file of filesIn(root)) {
    if (!textExtensions.has(path.extname(file)) && !['LICENSE', '.gitignore', '.gitattributes'].includes(path.basename(file))) continue;
    const name = relative(file);
    const bytes = fs.readFileSync(file);
    let text;
    try { text = decoder.decode(bytes); } catch {
      errors.push(name + ': invalid UTF-8');
      continue;
    }
    textFiles.set(file, text);
    check(!text.includes('\uFEFF'), name + ': UTF-8 BOM is not allowed');
    check(!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text),
      name + ': non-English CJK text is not allowed');
    check(!text.includes('\uFFFD'), name + ': replacement character indicates broken encoding');
    if (!file.endsWith('-world-map.txt')) {
      check(!text.includes('\r'), name + ': use LF line endings');
      check(text.endsWith('\n'), name + ': add a final newline');
    }
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        jsonFiles.set(file, data);
        check(text === JSON.stringify(data, null, 2) + '\n', name + ': use two-space JSON formatting');
      } catch (error) { errors.push(name + ': invalid JSON: ' + error.message); }
    }
    if (file.endsWith('.md')) {
      for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
        const target = match[1].trim().replace(/^<([^>]+)>$/, '$1').split(/\s+"/)[0];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
        const filename = decodeURIComponent(target.split('#')[0]);
        if (!filename) continue;
        const destination = path.resolve(path.dirname(file), filename);
        check(destination.startsWith(root + path.sep) && fs.existsSync(destination),
          name + ': missing or nonlocal link ' + target);
      }
    }
  }
  const skillsRoot = path.join(root, 'skills');
  const skillDirectories = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory());
  const readme = textFiles.get(path.join(root, 'README.md')) || '';
  for (const entry of skillDirectories) {
    const skill = entry.name;
    const directory = path.join(skillsRoot, skill);
    check(/^mazebench-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill) && skill.length < 64,
      skill + ': use mazebench-<mechanism> under 64 characters');
    for (const file of filesIn(directory)) {
      for (const part of path.relative(directory, file).split(path.sep)) {
        check(conventionalNames.has(part) || /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)?$/.test(part),
          relative(file) + ': use lowercase hyphen-separated resource names');
      }
      check(!/^(?:reference|upstream)-/.test(path.basename(file)),
        relative(file) + ': use official-, user-, or authored- for case provenance');
    }
    const entrypoint = textFiles.get(path.join(directory, 'SKILL.md')) || '';
    const frontmatter = entrypoint.match(/^---\n([\s\S]*?)\n---\n/);
    check(!!frontmatter, skill + ': missing YAML frontmatter');
    const declaredName = frontmatter?.[1].match(/^name: ([a-z0-9-]+)$/m)?.[1];
    const description = frontmatter?.[1].match(/^description: (.+)$/m)?.[1];
    check(declaredName === skill, skill + ': folder and frontmatter name differ');
    check(!!description && description.length <= 1024, skill + ': provide a concise description');
    const title = 'MazeBench ' + skill.slice('mazebench-'.length).split('-')
      .map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
    check(entrypoint.match(/^# (.+)$/m)?.[1] === title, skill + ': H1 must be ' + title);
    const metadata = textFiles.get(path.join(directory, 'agents', 'openai.yaml')) || '';
    const ui = {};
    for (const key of ['display_name', 'short_description', 'default_prompt']) {
      const raw = metadata.match(new RegExp('^  ' + key + ': (.+)$', 'm'))?.[1];
      try { ui[key] = JSON.parse(raw); } catch { errors.push(skill + ': quote ' + key + ' as a YAML string'); }
    }
    check(ui.display_name === title, skill + ': display name must match H1');
    check(typeof ui.short_description === 'string' && ui.short_description.length >= 25 && ui.short_description.length <= 64,
      skill + ': short description must have 25-64 characters');
    check(typeof ui.default_prompt === 'string' && ui.default_prompt.includes('$' + skill),
      skill + ': default prompt must invoke $' + skill);
    check(readme.includes('[' + title + '](skills/' + skill + '/SKILL.md)'),
      skill + ': update the README table title and link');
    check(fs.existsSync(path.join(directory, 'LICENSE')), skill + ': retain the standalone package license');
    const references = path.join(directory, 'references');
    const mechanismPath = path.join(references, 'mechanism-logic.md');
    const mechanism = textFiles.get(mechanismPath) || '';
    check([...mechanism.matchAll(/^### ([a-z0-9-]+)$/gm)].length >= 3,
      skill + ': include extracted mechanism relations with stable IDs');
    const template = jsonFiles.get(path.join(references, 'design-template.json'));
    check(template?.title === '' && Array.isArray(template.cells) && template.cells.length === 0 &&
      !Object.hasOwn(template, 'witness') && Object.keys(template.contract?.events || {}).length === 0 &&
      template.contract?.stages?.length === 0 && template.contract?.dependencies?.length === 0,
      skill + ': new-map scaffold must not contain case geometry, events, stages, or a replay route');
    const templateReceipt = template?.contract?.readReceipt;
    check(templateReceipt?.path === 'references/mechanism-logic.md' && templateReceipt.sha256 === '' &&
      templateReceipt.readBeforeLayout === true,
      skill + ': leave the mechanism version receipt to be filled after reading');
    const families = sourceTypes.filter(source => fs.existsSync(path.join(references, source + '-case.md')));
    check(families.length > 0, skill + ': include a case with explicit source provenance');
    for (const source of families) {
      const names = ['case.md', 'world-map.txt', 'design.json', 'states.json', 'checks.json'];
      for (const suffix of names) check(fs.existsSync(path.join(references, source + '-' + suffix)),
        skill + ': missing ' + source + '-' + suffix);
      const casePath = path.join(references, source + '-case.md');
      const designPath = path.join(references, source + '-design.json');
      const spec = jsonFiles.get(designPath);
      const report = jsonFiles.get(path.join(references, source + '-checks.json'));
      const mapPath = path.join(references, source + '-world-map.txt');
      if (!spec || !report || !fs.existsSync(mapPath)) continue;
      const caseText = textFiles.get(casePath) || '';
      const mapHash = hash(fs.readFileSync(mapPath));
      check(caseText.includes(mapHash), skill + ': case must record the original map SHA256');
      check(/[0-9a-f]{40}/.test(caseText), skill + ': case must record the engine commit');
      check(source !== 'user' || /user (?:reference )?case|user-authored/i.test(caseText),
        skill + ': identify the user-authored case');
      check(source !== 'official' || /games\/maze\/levels\//.test(caseText),
        skill + ': record the official upstream map path');
      const receipt = spec.contract?.readReceipt;
      check(receipt?.path === 'references/' + source + '-case.md' &&
        receipt.sha256 === hash(fs.readFileSync(casePath)) && receipt.readBeforeLayout === true,
        skill + ': stale or mismatched case reading receipt');
      const current = report.packagedDesign;
      check(current?.path === 'references/' + source + '-design.json' &&
        current.cells === hash(spec.cells) && current.contract === hash(spec.contract) &&
        current.case === hash(fs.readFileSync(casePath)),
        skill + ': current packagedDesign fingerprints are missing or stale');
      for (const artifact of [spec, report, jsonFiles.get(path.join(references, source + '-states.json'))]) {
        if (artifact?.source && typeof artifact.source === 'object') {
          check(artifact.source.map === 'references/' + source + '-world-map.txt' && artifact.source.map_sha256 === mapHash,
            skill + ': source map path or SHA256 is stale');
        }
      }
    }
  }
  return { errors, skills: skillDirectories.length, textFiles: textFiles.size };
}

if (require.main === module) {
  const result = checkRepository(process.argv[2] || path.resolve(__dirname, '..'));
  if (result.errors.length) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log('Passed: ' + result.skills + ' skills, ' + result.textFiles + ' text files; names, English-only text, metadata, links, provenance, and fingerprints.');
  }
}

module.exports = { checkRepository };
