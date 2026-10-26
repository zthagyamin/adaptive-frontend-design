import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.AFD_DEMO_PORT||3000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};

http.createServer(async(req,res)=>{
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';}catch{res.writeHead(400);res.end();return;}
  const target=path.resolve(root,name);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const content=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}
  catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Migration field guide: http://127.0.0.1:${port}`));
