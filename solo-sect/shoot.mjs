// 一次桌面走查（v0.92 突破、變式、歸真、視覺演化）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v092-')) fs.unlinkSync(`${root}/shots/${f}`);
  const el = async (sel, n, prep) => { await p.evaluate(() => { window.__sect.panel(); window.__sect.freeze = true; }); if (prep) await p.evaluate(prep); await p.waitForTimeout(200); await p.locator(sel).screenshot({ path: `${root}/shots/${n}.png` }); await p.evaluate(() => { window.__sect.freeze = false; }); };
  const E = (fn, arg) => p.evaluate(fn, arg);
  await p.evaluate(async () => { window.__arts = await import('./src/arts.mjs'); window.__data = await import('./src/data.mjs'); });
  const pick = (id) => E((id) => { window.__artsOf = id; }, id);
  const pause = (v) => E((v) => { window.__sect.speed = v; }, v);
  // 1 瓶頸：主角基礎拳卡在 54.9，地圖上打坐衝關（氣旋＋進度環）
  await E(() => { const S = window.__sect.S; S.res.food = 80; const h = S.ds[0]; h.arts.basicFist.xp = 54.9; h.mood = 90; h.needs.energy = 95; h.needs.hunger = 95; });
  await pick('hero'); await el('#arts', 'v092-01-arts-bottleneck');
  await E(() => { const S = window.__sect.S, m = window.__simMod, h = S.ds[0]; for (let i = 0; i < 12000 && !(h.task?.act === 'meditate' && h.task.phase === 'do' && h.task.timer > 4); i++) { h.mood = Math.max(h.mood, 80); h.needs.energy = Math.max(h.needs.energy, 80); m.tick(S); } return JSON.stringify(h.task); }).then((r) => console.log('meditate task:', r));
  await pause(0); await shot('v092-02-map-meditate-qi-ring');
  // 2 結果（若失敗就冷卻後再衝，直到成功）
  await pause(1); await E(() => { const S = window.__sect.S, m = window.__simMod, h = S.ds[0]; for (let i = 0; i < 40000 && !h.arts.basicFist.bt1; i++) { if ((h.arts.basicFist.btCd || 0) > S.t) { h.mood = 90; h.needs.energy = 95; } m.tick(S); } window.__sect.freeze = false; });
  await el('#arts', 'v092-03-arts-after-breakthrough'); await el('#log', 'v092-04-log-breakthrough');
  // 3 大成變式（剛猛），並展示重選要等半天
  await E(() => { const S = window.__sect.S, A = window.__arts, h = S.ds[0]; A.chooseVariant(h, 'basicFist', 'gang', S.t); h.arts.pushPalm ??= { xp: 0 }; Object.assign(h.arts.pushPalm, { xp: 60, bt1: true }); A.unlockTechs(h, A.artById('pushPalm')); A.chooseVariant(h, 'pushPalm', 'gang', S.t); A.chooseVariant(h, 'pushPalm', 'ling', S.t); });
  await el('#arts', 'v092-05-variant-and-rechoose');
  // 4 視覺演化：小成殘影、大成變式光環、圓滿震屏與大招名、化境光暈
  const strike = async (name, setup, want) => { await pause(1); await E(setup); await E(() => { const S = window.__sect.S, m = window.__simMod; S.ds.forEach((d) => { d.needs.energy = 100; d.hp = 100; }); if (!S.hunt) m.startHunt(S, [S.ds[0].id]); });
    await E((want) => { const S = window.__sect.S, m = window.__simMod; for (let i = 0; i < 6000; i++) { m.tick(S); if (S.fx.some((f) => f.kind === 'move' && f.tier >= want && f.ttl > 0.25)) break; } }, want); await pause(0); await shot(name); };
  await strike('v092-06-map-xiaocheng-afterimage', () => { const h = window.__sect.S.ds[0]; h.moves = ['fist', 'fist2']; Object.assign(h.arts.basicFist, { xp: 30, bt1: false }); delete h.arts.pushPalm; h.arts.basicFist.variant = null; }, 1);
  await strike('v092-07-map-dacheng-variant-fx', () => { const h = window.__sect.S.ds[0]; h.moves = ['fist', 'fist2', 'fist3']; Object.assign(h.arts.basicFist, { xp: 60, bt1: true, variant: 'gang', until: 0 }); }, 2);
  await strike('v092-08-map-yuanman-shake-bigname', () => { const h = window.__sect.S.ds[0]; Object.assign(h.arts.basicFist, { xp: 90, bt1: true }); }, 3);
  await strike('v092-09-map-huajing-aura', () => { const h = window.__sect.S.ds[0]; Object.assign(h.arts.basicFist, { xp: 100, bt1: true, bt2: true }); }, 3);
  await pause(1);
  // 5 歸真：憨厚的人基礎拳化境後衝歸真，累積星數
  await E(() => { const S = window.__sect.S, A = window.__arts, d = S.ds.find((x) => x.id === 'cousin'); Object.assign(d.arts.basicFist, { xp: 100, bt1: true, bt2: true }); A.resolveBreak(d, 'basicFist', S.t, 0); d.focus = 'basicFist'; for (let i = 0; i < 3000; i++) A.gainArt(d, 5, 1, S.t); });
  await pick('cousin'); await el('#arts', 'v092-10-guizhen-stars');
  // 6 荒疏：林師姐的掃堂腿久未練
  await E(() => { const S = window.__sect.S, d = S.ds.find((x) => x.id === 'senior'); if (d.arts.sweepLeg) d.arts.sweepLeg.last = S.t - 6 * window.__data.DAY; else { d.arts.sweepLeg = { xp: 30, last: S.t - 6 * window.__data.DAY, bt1: false, rust: 0 }; } });
  await pick('senior'); await el('#arts', 'v092-11-rust');
  // 7 舊檔（0.9）讀入
  await E(() => { const m = window.__simMod; const S = m.createState(5); const o = JSON.parse(m.save(S)); o.rules = '0.9'; for (const d of o.ds) { d.arts = { basicFist: { xp: 70 } }; d.moves = ['fist']; } localStorage.setItem('solo-sect-save', JSON.stringify(o)); });
  p.once('dialog', (d) => d.accept()); await p.click('#load'); await fast(2); await pick('hero'); await el('#arts', 'v092-12-v09-save-loaded');
  await el('#log', 'v092-13-log');
  const st = await p.evaluate(() => { const S = window.__sect.S; return { t: S.t, map: window.__simMod.mapStage(S), fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage])), rep: S.rep, n: S.ds.length, cap: window.__simMod.capacity(S), eco: S.eco, report: S.lastReport, moves: S.ds.map((d) => d.name + ':' + d.moves.join('/')), mood: S.ds.map((d) => d.name + Math.round(d.mood) + '[' + d.known.join(',') + '/' + d.personality.join(',') + ']'), rules: S.rules, migratedFrom: S.migratedFrom, labor: window.__simMod.laborers(S).map((d) => d.name + (d.rootKnown ? '★' + d.root : '?')), ledger: S.ledgerPrev, res: S.res, ranks: S.ds.map((d) => d.name + ':' + d.role + ':' + (d.contrib || 0)), choreRate: S.choreRate, season: window.__simMod.seasonOf(S).name }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
