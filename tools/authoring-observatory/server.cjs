'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const S = require('./lib/store.cjs');
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
function createServer({root = path.join(__dirname, 'runs'), publicDir = path.join(__dirname, 'public')} = {}) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const send = (code, data, mime = 'application/json; charset=utf-8') => {
      res.writeHead(code, {'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});
      res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    };
    try {
      if (req.method !== 'GET') return send(405, {error: 'Read-only viewer'});
      const host = String(req.headers.host || '').split(':')[0];
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return send(403, {error: 'Local host only'});
      const u = new URL(req.url, 'http://localhost');
      if (u.pathname === '/api/health') return send(200, {application: 'authoring-observatory', version: '0.2.0', root});
      if (u.pathname === '/api/runs') {
        const runs = fs.existsSync(root) ? fs.readdirSync(root).filter(id => /^[\w-]+$/.test(id)).flatMap(id => {
          try {const r = S.readRun(safeRun(root, id)); return [{...r.manifest, candidateCount: r.candidates.length, testCount: r.tests.length, eventCount: r.events.length}];}
          catch {return [];}
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
        return send(200, {runs});
      }
      const match = u.pathname.match(/^\/api\/runs\/([\w-]+)(?:\/(.*))?$/);
      if (match) {
        const dir = safeRun(root, match[1]);
        const run = S.readRun(dir);
        if (!match[2]) return send(200, run);
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
      const ext = path.extname(file), mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml'}[ext] || 'application/octet-stream';
      send(200, fs.readFileSync(file), mime);
    } catch (e) {send(e.code === 'ENOENT' ? 404 : 403, {error: e.code === 'ENOENT' ? 'Not found' : 'Unavailable path or run'});}
  });
  return server;
}
if (require.main === module) {
  const a = process.argv.slice(2), get = k => a.includes(k) ? a[a.indexOf(k) + 1] : undefined;
  const server = createServer({root: get('--root') || path.join(__dirname, 'runs')});
  server.listen(Number(get('--port') || 4317), '127.0.0.1', () => console.log('Authoring Observatory: http://127.0.0.1:' + server.address().port));
}
module.exports = {createServer, safeFile};
