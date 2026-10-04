import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const page = fileURLToPath(new URL('../index.html', import.meta.url));
const port = Number(process.env.PORT || 5180);
const server = http.createServer(async (req, res) => {
  // The nested path exercises GitHub Pages repository URLs as well as the root.
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!['/', '/index.html', '/via-libre/index.html', '/via-libre/'].includes(path)) {
    res.writeHead(404); res.end('No encontrado'); return;
  }
  try {res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}); res.end(await readFile(page));}
  catch {res.writeHead(500); res.end('Primero ejecuta npm run build.');}
});
server.listen(port, '127.0.0.1', () => console.log(`Vista previa: http://127.0.0.1:${port}/via-libre/`));
