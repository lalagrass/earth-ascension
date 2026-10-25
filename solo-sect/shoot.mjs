// 一次桌面走查（v0.8）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  const E = (fn, arg) => p.evaluate(fn, arg);
  await shot('v08-01-S0-start-quarry-shed-plot');
  await el('#res', 'v08-02-resources-coin');
  await E(() => { const S = window.__sect.S; S.res.wood = 8; S.res.food = 40; window.__simMod.startBuild(S, 'shed'); }); await fast(90);
  await shot('v08-03-shed-site-stockpile');
  await fast(200); await E(() => { const S = window.__sect.S; S.res.coin = Math.max(S.res.coin, 12); S.res.food += 10; });
  await el('#labor', 'v08-04-hire-panel');
  await p.click('#hire-go'); await fast(2); await p.click('#hire-go'); await fast(2);
  await E(() => { const S = window.__sect.S; S.rep = 22; S.res.coin += 6; S.res.wood = 12; window.__simMod.startBuild(S, 'hall'); }); await fast(25);
  await shot('v08-05-laborers-hauling-quarrying');
  await el('#build', 'v08-06-blueprint-bundle');
  await fast(160); await shot('v08-07-cowork-at-site');
  await E(() => { const S = window.__sect.S, m = window.__simMod; m.startBuild(S, "yard"); for (let i = 0; i < 4 * 3000; i++) { m.tick(S); if (S.res.wood < 3) S.res.wood = 8; if (S.res.food < 10) S.res.food = 10; if (S.res.coin < 6) S.res.coin = 6; if (m.laborers(S).every((d) => d.rootKnown)) break; } });
  await el('#labor', 'v08-08-root-revealed');
  await fast(150); await el('#ledger', 'v08-09-daily-ledger');
  await E(() => { const S = window.__sect.S; S.res.wood = 12; S.res.stone = 4; S.res.food += 20; if (S.fac.dorm.stage < 1) S.fac.dorm.stage = 1; for (const o of window.__simMod.disciples(S)) for (const l of window.__simMod.laborers(S)) S.aff[o.id + '>' + l.id] = Math.max(S.aff[o.id + '>' + l.id] || 0, 20); });
  await el('#labor', 'v08-10-invite-ready');
  const inv = await E(() => { const S = window.__sect.S; const l = window.__simMod.laborers(S).find((d) => window.__simMod.canInvite(S, d.id).ok); return l?.id; });
  if (inv) { await p.click(`[data-invite="${inv}"]`); await fast(2); }
  await el('#ds', 'v08-11-outer-disciple-card', () => document.querySelector('#ds').lastElementChild.scrollIntoView());
  await fast(400); await shot('v08-12-S2-after-hall');
  // 舊檔：v0.7 形狀（工地 delivered 為數字）存進 localStorage 後按讀檔
  await E(() => { const S = window.__simMod.createState(5); S.res.wood = 6; window.__simMod.startBuild(S, 'dorm'); const o = JSON.parse(window.__simMod.save(S)); o.rules = '0.7'; delete o.res.stone; delete o.res.coin; delete o.fac.shed; delete o.fac.quarry; delete o.ledger; delete o.day; delete o.laborGone; o.fac.dorm.site = { need: { wood: 6 }, delivered: 3, reserved: 0, work: 0, workNeed: 18 }; localStorage.setItem('solo-sect-save', JSON.stringify(o)); });
  p.once('dialog', (d) => d.accept()); await p.click('#load'); await fast(1); await el('#build', 'v08-13-v07-save-loaded');
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), mood: S.ds.map((d) => d.name + Math.round(d.mood) + '[' + d.known.join(',') + '/' + d.personality.join(',') + ']'), rules: S.rules, migratedFrom: S.migratedFrom, labor: window.__simMod.laborers(S).map((d) => d.name + (d.rootKnown ? '★' + d.root : '?')), ledger: S.ledgerPrev, res: S.res, season: window.__simMod.seasonOf(S).name }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
