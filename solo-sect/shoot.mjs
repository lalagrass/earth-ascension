// 一次桌面走查（v0.5）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  const fast = (sec) => p.evaluate((sec) => { const { tick } = window.__simMod; for (let i = 0; i < sec * 4; i++) tick(window.__sect.S); }, sec);
  const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${root}/shots/${n}.png` }); };
  const build = async (id) => { await fast(1); await p.evaluate((id) => window.__simMod.startBuild(window.__sect.S, id), id); };
  for (const f of fs.readdirSync(`${root}/shots`)) fs.unlinkSync(`${root}/shots/${f}`);
  await shot('v05-01-S0-ruined-dojo');
  await fast(30); await shot('v05-02-S0-chores-day');
  await p.evaluate(() => { window.__sect.S.res.wood = 12; }); await build('dorm'); await fast(60); await shot('v05-03-building-dorm');
  await fast(200); await p.evaluate(() => { window.__sect.S.res.wood = 12; }); await build('kitchen'); await fast(260); await shot('v05-04-S1-dorm-kitchen');
  await p.evaluate(() => { const S = window.__sect.S; S.t = Math.ceil(S.t / 600) * 600 + 520; }); await fast(5); await shot('v05-05-night');
  await p.evaluate(() => { window.__sect.S.res.wood = 12; }); await build('yard'); await fast(400); await shot('v05-06-yard-spar');
  await p.evaluate(() => window.__simMod.setPost(window.__sect.S, 'trail2')); await p.click('#hunt-go');
  await p.waitForFunction(() => window.__sect.S.mons.some((m) => !m.raid) && window.__sect.S.fx.length > 0, null, { timeout: 90000 }); await shot('v05-07-hunt-wave');
  await p.evaluate(() => { window.__sect.speed = 16; }); await p.waitForFunction(() => !window.__sect.S.hunt, null, { timeout: 180000 }); await p.evaluate(() => { window.__sect.speed = 1; }); await shot('v05-08-hunt-report');
  await p.evaluate(() => { const S = window.__sect.S; S.rep = Math.max(S.rep, 25); S.res.wood = 12; S.res.food += 10; }); await build('hall'); await fast(500); await shot('v05-09-S2-hall-expanded');
  await p.evaluate(() => { const S = window.__sect.S; S.res.wood = 12; window.__simMod.startBuild(S, 'dorm'); }); await fast(400);
  await p.evaluate(() => { const S = window.__sect.S; S.rep = Math.max(S.rep, 40); S.res.food += 10; window.__simMod.recruit(S); window.__simMod.recruit(S); }); await p.evaluate(() => { window.__sect.speed = 1; }); await fast(6); await shot('v05-10-recruits-arrive');
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')) }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
