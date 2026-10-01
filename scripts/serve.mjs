import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export async function serve({ root = path.resolve('dist'), port = 4173, base = '' } = {}) {
  const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.map':'application/json' };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (base && pathname !== base && !pathname.startsWith(base + '/')) { res.writeHead(404).end(); return; }
      let file = path.resolve(root, '.' + (pathname.slice(base.length) || '/'));
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const data = await readFile(file); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  console.log(`http://127.0.0.1:${server.address().port}${base}/`); return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await serve();
