// 一次桌面走查（v0.85）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v085-')) fs.unlinkSync(`${root}/shots/${f}`);
  const el = async (sel, n, prep) => { await p.evaluate(() => { window.__sect.panel(); window.__sect.freeze = true; }); if (prep) await p.evaluate(prep); await p.waitForTimeout(200); await p.locator(sel).screenshot({ path: `${root}/shots/${n}.png` }); await p.evaluate(() => { window.__sect.freeze = false; }); };
  const E = (fn, arg) => p.evaluate(fn, arg);
  await el('#ranks', 'v085-01-ranks-no-outer');
  // 蓋工寮、雇兩名高根骨雇工，共事揭露後邀入外門
  await E(() => { const S = window.__sect.S, m = window.__simMod; S.fac.shed.stage = 1; S.fac.dorm.stage = Math.max(1, S.fac.dorm.stage); S.fac.yard.stage = Math.max(1, S.fac.yard.stage); S.res.coin = 20; S.res.food = 40; S.laborGone.push('l1', 'l2'); m.hire(S); m.hire(S);
    for (const l of m.laborers(S)) { l.root = 4; l.cowork = 999; l.rootKnown = true; for (const o of m.disciples(S)) S.aff[o.id + '>' + l.id] = 25; }
    for (const l of m.laborers(S)) m.invite(S, l.id); });
  await fast(3); await el('#ranks', 'v085-02-two-outer-duty-panel');
  await E(() => { const S = window.__sect.S, m = window.__simMod; const o = m.outers(S)[0]; for (const a of ['farm', 'forage', 'quarry', 'build']) m.setDuty(S, o.id, a, false); m.setPrio(S, o.id, 'high'); });
  await el('#ranks', 'v085-03-duty-unchecked-priority-high');
  await fast(60); await shot('v085-04-map-outer-chores-inner-train');
  await E(() => { const S = window.__sect.S, m = window.__simMod; for (const a of ['farm', 'forage', 'quarry', 'build']) m.setDuty(S, m.outers(S)[0].id, a, true); for (let i = 0; i < 4 * 4000 && S.ds.find((d) => d.id === 'hero').role !== 'head'; i++) { m.tick(S); if (S.res.food < 8) S.res.food = 8; if (S.res.wood > 10) S.res.wood = 4; } });
  await el('#ranks', 'v085-05-hero-head-disciple'); await el('#ledger', 'v085-06-ledger-after-quota');
  await shot('v085-07-map-head-label');
  await E(() => { const S = window.__sect.S; S.res.food = 0; }); await fast(20); await el('#ranks', 'v085-08-famine-inner-help'); await shot('v085-09-map-famine-inner-chores');
  await E(() => { const S = window.__sect.S, m = window.__simMod; S.res.food = 20; const o = m.outers(S)[0]; o.contrib = Math.max(o.contrib, 6); o.root = 5; o.skills.palm = 20; });
  await fast(1); await el('#ranks', 'v085-10-promote-ready');
  await E(() => { const S = window.__sect.S; window.__simMod.startTrial(S, window.__simMod.outers(S)[0].id); }); await fast(6); await shot('v085-11-map-spar-trial');
  await fast(20); await el('#ranks', 'v085-12-after-trial'); await el('#log', 'v085-13-log');
  await E(() => { const S = window.__simMod.createState(5); const o = JSON.parse(window.__simMod.save(S)); o.rules = '0.8'; for (const d of o.ds) { d.role = 'disciple'; delete d.duties; delete d.prio; delete d.chore; delete d.choreDebt; delete d.contrib; } delete o.choreRate; localStorage.setItem('solo-sect-save', JSON.stringify(o)); });
  p.once('dialog', (d) => d.accept()); await p.click('#load'); await fast(2); await el('#ranks', 'v085-14-v08-save-loaded');
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), mood: S.ds.map((d) => d.name + Math.round(d.mood) + '[' + d.known.join(',') + '/' + d.personality.join(',') + ']'), rules: S.rules, migratedFrom: S.migratedFrom, labor: window.__simMod.laborers(S).map((d) => d.name + (d.rootKnown ? '★' + d.root : '?')), ledger: S.ledgerPrev, res: S.res, ranks: S.ds.map((d) => d.name + ':' + d.role + ':' + (d.contrib || 0)), choreRate: S.choreRate, season: window.__simMod.seasonOf(S).name }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
