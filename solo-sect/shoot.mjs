// 一次桌面走查：臨時靜態服務（port 18931）+ 無頭 Chrome 截圖，finally 清理。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.dirname(new URL(import.meta.url).pathname), PORT = 18931;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' }[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
let browser; const errs = [];
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForTimeout(1500);
  const fast = async (sec) => p.evaluate((sec) => { const { tick } = window.__simMod; for (let i = 0; i < sec * 4; i++) tick(window.__sect.S); }, sec);
  await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  await p.screenshot({ path: `${root}/shots/01-s0-start.png` });
  await fast(20); await p.waitForTimeout(500); await p.screenshot({ path: `${root}/shots/02-chores.png` });
  await fast(160); await p.click('[data-build="dorm"]'); await fast(40); await p.waitForTimeout(500); await p.screenshot({ path: `${root}/shots/03-building.png` });
  await fast(200); await p.waitForTimeout(500); await p.screenshot({ path: `${root}/shots/04-dorm-built-growth.png` });
  await p.click('#hunt-go'); await p.waitForFunction(() => window.__sect.S.mons.length > 0 && window.__sect.S.fx.length > 0, null, { timeout: 60000 }); await p.screenshot({ path: `${root}/shots/05-hunt.png` });
  await p.evaluate(() => { window.__sect.speed = 16; }); await p.waitForFunction(() => !window.__sect.S.hunt, null, { timeout: 120000 }); await p.waitForTimeout(600);
  await p.screenshot({ path: `${root}/shots/06-hunt-report.png` });
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, res: S.res, dorm: S.fac.dorm.stage, rep: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), rel: S.rel }; });
  console.log(JSON.stringify(st), 'errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
