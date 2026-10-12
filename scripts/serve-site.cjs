'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const site = path.resolve(__dirname, '../site');
const prefix = '/Maze-Harness/';
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.txt':'text/plain' };
function createServer() {
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (pathname === '/' || pathname === '/Maze-Harness') { res.writeHead(302, {Location:prefix}); res.end(); return; }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end('Not found'); return; }
    const filename = path.resolve(site, pathname.slice(prefix.length) || 'index.html');
    if (!filename.startsWith(site + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': (types[path.extname(filename)] || 'application/octet-stream'), 'Cache-Control':'no-store'});
    fs.createReadStream(filename).pipe(res);
  });
}
if (require.main === module) {
  const server = createServer();
  server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Maze Harness: http://127.0.0.1:' + server.address().port + prefix));
}
module.exports = { createServer, prefix };
