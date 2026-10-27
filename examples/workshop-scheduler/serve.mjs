import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createService, ServiceError } from './service.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const publicFiles = new Set(['index.html', 'styles.css', 'app.mjs', 'data.mjs', 'diagnostics.html']);
export function createDemoServer({ service = createService() } = {}) {
  return http.createServer(async (request, response) => {
    const json = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (request.method === 'GET' && url.pathname === '/api/reservations') return json(200, await service.list());
        if (request.method !== 'POST') return json(405, { message: '此接口不支持该方法。' });
        // Local-only diagnostic control is deliberately separate from the user interface.
        if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) return json(403, { message: '仅允许同源请求。' });
        let body = '';
        for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 16000) throw new ServiceError('VALIDATION', '请求过大。', 413); }
        let data;
        try { data = JSON.parse(body); } catch { throw new ServiceError('VALIDATION', '请求格式无效。'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ServiceError('VALIDATION', '请求格式无效。');
        if (url.pathname === '/api/__demo/control') return json(200, service.control(data));
        const operation = url.pathname.split('/').pop();
        if (!['create', 'update', 'cancel', 'restore'].includes(operation)) return json(404, { message: '接口不存在。' });
        return json(200, await service.mutate(operation, data, request.headers['idempotency-key']));
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); return response.end(); }
      const filename = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      if (!publicFiles.has(filename)) { response.writeHead(404); return response.end('Not found'); }
      const file = await readFile(path.join(root, filename));
      response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'text/plain', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : file);
    } catch (error) { json(error.status || 500, { code: error.code || 'INTERNAL', message: error.status ? error.message : '演示服务发生错误。请重试。' }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.AFD_DEMO_PORT || 4301);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AFD_DEMO_PORT must be an integer from 1 to 65535');
  const server = createDemoServer();
  server.on('error', error => { console.error(`Cannot start workshop demo: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Workshop scheduler: http://127.0.0.1:${port} (fictional in-memory demo; restart resets data)`));
}
