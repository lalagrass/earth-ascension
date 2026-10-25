// 一次桌面走查（v0.95 巡山遠征、圖鑑、前期節奏；每版只留 3 張）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.dirname(new URL(import.meta.url).pathname), PORT = 18931;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
let browser; const errs = [];
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await browser.newPage({ viewport: { width: 1700, height: 900 } });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && !/favicon|404/.test(m.text()) && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForTimeout(1500);

  await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const pause = (v) => E((v) => { window.__sect.speed = v; }, v);
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v095-')) fs.unlinkSync(`${root}/shots/${f}`);
  await pause(0);
  // 1 第一天黃昏：導引旁白＋木樁場野豬試煉
  await E(() => { const S = window.__sect.S, m = window.__simMod; for (let i = 0; i < 12000; i++) { m.tick(S); const h = S.ds[0]; if (h.task?.act === 'trial' && h.task.phase === 'do' && S.fx.some((f) => f.kind === 'move' && f.ttl > 0.3)) break; } window.__sect.panel(); });
  await p.waitForTimeout(600); await p.screenshot({ path: `${root}/shots/v095-01-day1-trial-guide.png` });
  // 2 巡山進行中：地圖頂端進度條（隊伍不在地圖上）＋面板即時戰況
  await E(() => { const S = window.__sect.S, m = window.__simMod; for (let i = 0; i < 4 * 400; i++) m.tick(S); S.res.food = Math.max(S.res.food, 10); window.__exTeam = new Set(['hero', 'senior', 'cousin']); m.startExpedition(S, ['hero', 'senior', 'cousin']); for (let i = 0; i < 4 * 45 && S.exp?.phase === 'out'; i++) m.tick(S); window.__sect.panel(); });
  await p.waitForTimeout(600); await p.screenshot({ path: `${root}/shots/v095-02-expedition-progress.png` });
  // 3 戰報卡＋圖鑑（觀破值）＋里程碑
  await E(() => { const S = window.__sect.S, m = window.__simMod; let i = 0; while (S.exp && i++ < 40000) m.tick(S); m.startBuild(S, 'kitchen'); m.tick(S); window.__sect.panel(); window.__sect.freeze = true; });
  await p.waitForTimeout(300);
  await p.locator('#panel').evaluate((el) => { const e = document.getElementById('exp'); el.scrollTop = e.offsetTop - 60; });
  await p.waitForTimeout(200);
  const c1 = await p.locator('#exp').boundingBox(), c2 = await p.locator('#codex').boundingBox();
  await p.screenshot({ path: `${root}/shots/v095-03-report-codex.png`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: Math.max(c1.width, c2.width) + 16, height: Math.min(900, c2.y + c2.height - c1.y + 40) } });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, pace: S.pace, rec: S.records, last: S.lastExp, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
