import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const shared = path.resolve(root, '../migration-field-guide');
const sharedFiles = new Map([
  ['/vendor/three.module.js', path.join(shared, 'vendor/three.module.js')],
  ['/vendor/THREE-LICENSE.txt', path.join(shared, 'assets/THREE-LICENSE.txt')],
]);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    let name;
    try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    const candidate = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    const file = sharedFiles.get(name) || candidate;
    if (!sharedFiles.has(name) && (!candidate.startsWith(root + path.sep) || name.includes('\0') || name.includes('\\'))) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      const real = await fs.realpath(file);
      if (!sharedFiles.has(name) && !real.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
      const content = await fs.readFile(real);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.AFD_DEMO_PORT || 4303);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AFD_DEMO_PORT must be a port number.');
  createServer().listen(port, '127.0.0.1', () => console.log(`Motion Lab: http://127.0.0.1:${port}`));
}
