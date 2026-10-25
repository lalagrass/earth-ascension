// 一次桌面走查（v0.7）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  const el = async (sel, n, prep) => { await p.evaluate(() => { window.__sect.panel(); window.__sect.freeze = true; }); if (prep) await p.evaluate(prep); await p.waitForTimeout(200); await p.locator(sel).screenshot({ path: `${root}/shots/${n}.png` }); await p.evaluate(() => { window.__sect.freeze = false; }); };
  await shot('v07-01-S0-start');
  await el('#ds', 'v07-02-traits-hidden-mood-parts');
  await fast(40); await el('#ds', 'v07-03-why-breakdown', () => document.querySelectorAll('details.why').forEach((d) => (d.open = true)));
  await p.evaluate(() => { const S = window.__sect.S; S.ds[2].mood = 15; S.ds[2].needs.fun = 10; }); await p.waitForFunction(() => window.__sect.S.ds.some((d) => d.task?.act === 'encourage'), null, { timeout: 60000 }).catch(() => {}); await shot('v07-04-encourage-on-map');
  await fast(60); await el('#log', 'v07-05-log-encourage-leisure');
  await fast(420); await el('#ds', 'v07-06-trait-revealed');
  await el('#rel', 'v07-07-two-way-affinity');
  await p.evaluate(() => { const S = window.__sect.S; S.res.wood = 12; window.__simMod.startBuild(S, 'dorm'); }); await fast(300); await p.evaluate(() => { const S = window.__sect.S; S.res.wood = 12; window.__simMod.startBuild(S, 'kitchen'); }); await fast(300);
  await p.evaluate(() => { const S = window.__sect.S; S.rep = 30; S.res.food += 10; S.res.wood = 12; window.__simMod.startBuild(S, 'dorm'); }); await fast(400);
  await p.evaluate(() => { const S = window.__sect.S; S.rep = 30; S.res.food += 10; });
  await el('#recruit', 'v07-08-three-questions');
  await p.selectOption('select[data-q="0"]', '1'); await p.selectOption('select[data-q="1"]', '1'); await p.selectOption('select[data-q="2"]', '2'); await p.evaluate(() => document.activeElement.blur()); await p.click('#rec-go'); await fast(4); await el('#ds', 'v07-09-recruit-hidden-trait', () => document.querySelector('#ds').lastElementChild.scrollIntoView());
  await p.evaluate(() => { const S = window.__sect.S; S.t = 600 * 21 + 100; }); await fast(3); await shot('v07-10-winter-S1');
  await el('#clock', 'v07-11-clock-season');
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), mood: S.ds.map((d) => d.name + Math.round(d.mood) + '[' + d.known.join(',') + '/' + d.personality.join(',') + ']'), rules: S.rules, season: window.__simMod.seasonOf(S).name }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
