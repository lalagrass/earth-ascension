// 武俠小鎮 A5（#577）`npm run wuxia:serve -- [--port 8080]`：離線看 build:local 的產物（不需要 npx serve、不連網）。
// 只送 dist-local 裡的檔；網站在 http://127.0.0.1:<port>/ai-town/ 。
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { parseArgs } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist-local');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.md': 'text/markdown; charset=utf-8',
};
const args = parseArgs(process.argv.slice(2));
const port = Number(args.port ?? 8080);
if (!existsSync(join(DIST, 'ai-town/index.html'))) {
  process.stderr.write('先執行 npm run build:local\n');
  process.exit(1);
}
createServer((req, res) => {
  const p = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let f = join(DIST, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(DIST) || !existsSync(f)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(port, '127.0.0.1', () => process.stdout.write(`山腳鎮：http://127.0.0.1:${port}/ai-town/ （Ctrl+C 結束）\n`));
