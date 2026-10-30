// 真瀏覽器正常流程檢查：起本機靜態服務、用 Playwright Chromium 照玩家操作走一遍。
// 用法：node loop-sect/tools/headless.mjs [--only m15-trial]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { flows } from './headless-flows.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVID = path.join(ROOT, '.evidence');
fs.mkdirSync(EVID, { recursive: true });

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const results = [];
let failed = 0;
// --only 名稱：只跑一個流程（調畫面時用；驗收照跑全部）。
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
for (const flow of flows.filter((f) => !only || f.name === only)) {
  const page = await browser.newPage({ viewport: flow.viewport ?? { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const checks = [];
  const expect = (id, ok, detail = '') => checks.push({ id, ok: !!ok, detail });
  try {
    await page.goto(url);
    await flow.run(page, expect, { shot: (name) => page.screenshot({ path: path.join(EVID, `${flow.name}-${name}.png`) }) });
  } catch (e) {
    expect('流程未拋錯', false, String(e).slice(0, 300));
  }
  expect('無 console error', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
  for (const c of checks) {
    if (!c.ok) failed++;
    console.log(`${c.ok ? 'ok  ' : 'FAIL'} [${flow.name}] ${c.id}${c.detail ? ' — ' + c.detail : ''}`);
  }
  results.push({ flow: flow.name, checks });
}
await browser.close();
server.close();
fs.writeFileSync(path.join(EVID, 'headless.json'), JSON.stringify(results, null, 2));
const total = results.reduce((s, r) => s + r.checks.length, 0);
console.log(`\n${failed ? 'FAIL' : 'OK'} ${total - failed}/${total} checks (screenshots in loop-sect/.evidence/)`);
process.exit(failed ? 1 : 0);
