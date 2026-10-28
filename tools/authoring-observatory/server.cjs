'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const S = require('./lib/store.cjs');
const sitePrefix = '/Maze-Harness/';
const privatePolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";
const mimeTypes = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webm':'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm'};
function readServerConfig(directory = __dirname, cwd = process.cwd()) {
  const candidates = [];
  for (const start of [directory, cwd]) for (let current = path.resolve(start);;) {
    candidates.push(path.join(current, '.mazebench-observatory.json'));
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
  const file = process.env.MAZEBENCH_OBSERVER_CONFIG || candidates.find(candidate => fs.existsSync(candidate));
  if (!file) return {};
  const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  return config.publicSiteDir ? {publicSiteDir: path.resolve(path.dirname(file), config.publicSiteDir)} : {};
}
function publicPolicy(bytes, extension) {
  const hashes = extension === '.html' ? [...bytes.toString('utf8').matchAll(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script\s*>/gi)]
    .map(match => "'sha256-" + crypto.createHash('sha256').update(match[1]).digest('base64') + "'") : [];
  return `default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`;
}
function safeFile(root, relative) {
  const target = path.resolve(root, relative), base = fs.realpathSync(root);
  const real = fs.realpathSync(target), rel = path.relative(base, real);
  if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.statSync(real).isFile()) throw new Error('Forbidden path');
  return real;
}
function safeRun(root, id) {
  const dir = path.join(root, id);
  for (const name of ['manifest.json', 'index.json', 'events.jsonl']) {
    safeFile(root, path.join(id, name));
    safeFile(dir, name);
  }
  return dir;
}
function publicFile(root, relative) {
  if (!relative || relative.includes('\\') || relative.split('/').some(part => !part || part.startsWith('.') || /[:\x00-\x1f]/.test(part))) throw new Error('Forbidden public path');
  const file = safeFile(root, relative);
  if (!mimeTypes[path.extname(file).toLowerCase()]) throw new Error('Unsupported public file');
  return file;
}
function publishedProcesses(publicSiteDir) {
  if (!publicSiteDir) return [];
  try {
    const catalog = JSON.parse(fs.readFileSync(publicFile(publicSiteDir, 'data/catalog.json'), 'utf8'));
    return (catalog.cases || []).flatMap(entry => {
      if (!/^[a-zA-Z0-9][\w-]*$/.test(entry.id) || entry.process?.schemaVersion !== 1) return [];
      try {
        const record = JSON.parse(fs.readFileSync(publicFile(publicSiteDir, entry.process.data), 'utf8'));
        const final = record.candidates?.at(-1);
        if (record.schemaVersion !== 1 || record.caseId !== entry.id || record.skill !== entry.skill || !final || final.id !== record.finalCandidateId || ![final.cellsSha256, final.contractSha256].every(value => /^[a-f0-9]{64}$/.test(value)) || !Array.isArray(final.cells) || S.hash(final.cells) !== final.cellsSha256) return [];
        return [{skill: record.skill, cellsSha256: final.cellsSha256, contractSha256: final.contractSha256,
          processUrl: `${sitePrefix}process.html?case=${encodeURIComponent(entry.id)}&candidate=${encodeURIComponent(final.id)}`}];
      } catch {return [];}
    });
  } catch {return [];}
}
function processLink(run, published) {
  const config = run.manifest.configuration || {}, declared = config.skill || (typeof config.skillDirectory === 'string' ? config.skillDirectory.replace(/\\/g, '/').replace(/\/$/, '').split('/').at(-1) : null);
  const final = run.candidates.at(-1), skill = typeof declared === 'string' ? declared.replace(/^mazebench-/, '') : null;
  if (!final || !skill) return null;
  const matches = published.filter(entry => entry.skill === skill && entry.cellsSha256 === final.cellsSha256 && entry.contractSha256 === final.contractSha256);
  return matches.length === 1 ? matches[0].processUrl : null;
}
function createServer({root = path.join(__dirname, 'runs'), publicDir = path.join(__dirname, 'public'), publicSiteDir = null} = {}) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const send = (code, data, mime = 'application/json; charset=utf-8', policy = privatePolicy) => {
      res.writeHead(code, {'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': policy});
      res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    };
    try {
      if (req.method !== 'GET') return send(405, {error: 'Read-only viewer'});
      const host = String(req.headers.host || '').split(':')[0];
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return send(403, {error: 'Local host only'});
      const u = new URL(req.url, 'http://localhost');
      const decodedPath = decodeURIComponent(req.url.split(/[?#]/)[0]);
      if (decodedPath === sitePrefix.slice(0, -1) || decodedPath.startsWith(sitePrefix)) {
        if (!publicSiteDir) return send(404, {error: 'Public site is not configured'});
        if (decodedPath === sitePrefix.slice(0, -1)) {res.writeHead(302, {Location: sitePrefix, 'Cache-Control': 'no-store', 'Content-Security-Policy': privatePolicy}); return res.end();}
        const relative = decodedPath.slice(sitePrefix.length).replace(/\/$/, '') || 'index.html';
        const file = publicFile(publicSiteDir, relative), bytes = fs.readFileSync(file), extension = path.extname(file).toLowerCase();
        return send(200, bytes, mimeTypes[extension], publicPolicy(bytes, extension));
      }
      if (u.pathname === '/api/health') return send(200, {application: 'authoring-observatory', version: '0.2.0', root});
      if (u.pathname === '/api/runs') {
        const published = publishedProcesses(publicSiteDir);
        const runs = fs.existsSync(root) ? fs.readdirSync(root).filter(id => /^[\w-]+$/.test(id)).flatMap(id => {
          try {const r = S.readRun(safeRun(root, id)); return [{...r.manifest, candidateCount: r.candidates.length, testCount: r.tests.length, eventCount: r.events.length, processUrl: processLink(r, published)}];}
          catch {return [];}
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
        return send(200, {runs});
      }
      const match = u.pathname.match(/^\/api\/runs\/([\w-]+)(?:\/(.*))?$/);
      if (match) {
        const dir = safeRun(root, match[1]);
        const run = S.readRun(dir);
        if (!match[2]) return send(200, {...run, processUrl: processLink(run, publishedProcesses(publicSiteDir))});
        if (match[2] === 'artifact') {
          const file = safeFile(dir, u.searchParams.get('path') || '');
          return send(200, fs.readFileSync(file), 'text/plain; charset=utf-8');
        }
        if (match[2].startsWith('spec/')) {
          const c = run.candidates.find(c => c.id === match[2].slice(5));
          if (!c) return send(404, {error: 'Candidate not found'});
          return send(200, fs.readFileSync(safeFile(dir, c.specPath)));
        }
        return send(404, {error: 'Not found'});
      }
      const file = safeFile(publicDir, decodeURIComponent(u.pathname === '/' ? 'index.html' : u.pathname.slice(1)));
      const ext = path.extname(file), mime = mimeTypes[ext] || 'application/octet-stream';
      send(200, fs.readFileSync(file), mime);
    } catch (e) {send(e.code === 'ENOENT' ? 404 : 403, {error: e.code === 'ENOENT' ? 'Not found' : 'Unavailable path or run'});}
  });
  return server;
}
if (require.main === module) {
  const a = process.argv.slice(2), get = k => a.includes(k) ? a[a.indexOf(k) + 1] : undefined;
  const server = createServer({...readServerConfig(), root: get('--root') || path.join(__dirname, 'runs'), ...(get('--site') ? {publicSiteDir: path.resolve(get('--site'))} : {})});
  server.listen(Number(get('--port') || 4317), '127.0.0.1', () => console.log('Authoring Observatory: http://127.0.0.1:' + server.address().port));
}
module.exports = {createServer, safeFile, readServerConfig, publishedProcesses, processLink};
