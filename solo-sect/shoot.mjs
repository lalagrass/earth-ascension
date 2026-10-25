// 一次桌面走查（v0.9 武學圖）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v09-')) fs.unlinkSync(`${root}/shots/${f}`);
  const el = async (sel, n, prep) => { await p.evaluate(() => { window.__sect.panel(); window.__sect.freeze = true; }); if (prep) await p.evaluate(prep); await p.waitForTimeout(200); await p.locator(sel).screenshot({ path: `${root}/shots/${n}.png` }); await p.evaluate(() => { window.__sect.freeze = false; }); };
  const E = (fn, arg) => p.evaluate(fn, arg);
  await p.evaluate(async () => { window.__arts = await import('./src/arts.mjs'); });
  const pick = (id) => E((id) => { window.__artsOf = id; }, id);
  await el('#arts', 'v09-01-arts-start-hero');
  await E(() => { const S = window.__sect.S; S.res.food = 60; window.__simMod.setOrder(S, 'hero', 'train'); window.__simMod.setOrder(S, 'senior', 'train'); });
  await fast(500); await shot('v09-02-map-training');
  await E(() => { const S = window.__sect.S; window.__simMod.setOrder(S, 'hero', null); window.__simMod.setOrder(S, 'senior', null); }); await fast(300);
  await el('#arts', 'v09-03-arts-hero-after-train'); await pick('senior'); await el('#arts', 'v09-04-arts-senior-leg');
  // 悟性 2 的堂弟硬學風雷掌腿：止於小成
  await E(() => { const S = window.__sect.S, A = window.__arts, d = S.ds.find((x) => x.id === 'cousin'); d.arts.wavePalm = { xp: 60 }; d.arts.whirlLeg = { xp: 60 }; d.arts.pushPalm ??= { xp: 60 }; d.arts.sweepLeg ??= { xp: 60 }; d.arts.basicFist.xp = Math.max(30, d.arts.basicFist.xp); A.learnArt(d, 'fengLei'); A.setFocus(S, 'cousin', 'fengLei'); for (let i = 0; i < 20000; i++) A.gainArt(d, 5); });
  await pick('cousin'); await el('#arts', 'v09-05-arts-cousin-gated-fenglei');
  // 憨厚的大柱 vs 灑脫的小六：同練基礎拳與旋風腿
  await p.evaluate(async () => { window.__data = await import('./src/data.mjs'); });
  await E(() => { const S = window.__sect.S, A = window.__arts, P = window.__data.LABOR_POOL, base = S.ds.find((d) => d.id === 'cousin');
    for (const id of ['dazhu', 'xiaoliu']) { const src = P.find((x) => x.id === id), d = JSON.parse(JSON.stringify(base)); Object.assign(d, { id, name: src.name, root: src.root, rootKnown: true, personality: [...src.personality], known: [...src.personality], style: src.style, adult: true, role: 'outer', arts: {}, moves: ['fist'], pendingArt: null, focus: null, task: null, path: [] }); A.seedArts(d); d.arts.basicFist.xp = 30; d.arts.sweepLeg = { xp: 60 }; A.learnArt(d, 'whirlLeg'); for (let i = 0; i < 300; i++) { d.focus = 'basicFist'; A.gainArt(d, 1); d.focus = 'whirlLeg'; A.gainArt(d, 1); } d.focus = null; S.ds.push(d); }
    window.__artsOf = 'dazhu'; });
  await el('#arts', 'v09-06-arts-dazhu-honest');
  await E(() => { window.__artsOf = (window.__sect.S.ds.find((d) => d.id === 'xiaoliu') || {}).id; }); await el('#arts', 'v09-07-arts-xiaoliu-free');
  await pick('hero'); await E(() => { const A = window.__arts, S = window.__sect.S; A.setFocus(S, 'hero', 'basicFist'); }); await el('#arts', 'v09-08-focus-set');
  await el('#ds', 'v09-09-roster-moves');
  await E(() => { const m = window.__simMod; const S = m.createState(5); const o = JSON.parse(m.save(S)); o.rules = '0.85'; for (const d of o.ds) { delete d.arts; delete d.root; delete d.pendingArt; delete d.focus; d.skills.palm = 40; d.moves = ['fist', 'push']; } localStorage.setItem('solo-sect-save', JSON.stringify(o)); });
  p.once('dialog', (d) => d.accept()); await p.click('#load'); await fast(2); await pick('hero'); await el('#arts', 'v09-10-v085-save-loaded');
  await el('#log', 'v09-11-log');
;
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), mood: S.ds.map((d) => d.name + Math.round(d.mood) + '[' + d.known.join(',') + '/' + d.personality.join(',') + ']'), rules: S.rules, migratedFrom: S.migratedFrom, labor: window.__simMod.laborers(S).map((d) => d.name + (d.rootKnown ? '★' + d.root : '?')), ledger: S.ledgerPrev, res: S.res, ranks: S.ds.map((d) => d.name + ':' + d.role + ':' + (d.contrib || 0)), choreRate: S.choreRate, season: window.__simMod.seasonOf(S).name }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
