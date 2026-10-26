import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.md':'text/plain; charset=utf-8' };
export function makeServer() {
  return createServer(async (req, res) => {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, { Allow:'GET, HEAD' }); res.end('Method not allowed'); return; }
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const path = resolve(root, `.${name.endsWith('/') ? `${name}index.html` : name}`);
      if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`) || name.includes('\\')) { res.writeHead(403); res.end('Forbidden'); return; }
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) { res.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400); res.end('Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.AFD_DEMO_PORT || 4302);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AFD_DEMO_PORT must be an integer from 1 to 65535');
  makeServer().listen(port, '127.0.0.1', () => console.log(`岸线 → http://127.0.0.1:${port}`));
}
