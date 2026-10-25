// 一次桌面走查（v1.0 無盡巡山與營地、派遣面板與秘笈、地圖可讀性；每版只留 3 張）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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

  console.log("early errs", errs);
  await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const pause = (v) => E((v) => { window.__sect.speed = v; }, v);
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v100-')) fs.unlinkSync(`${root}/shots/${f}`);
  const pick = async (hero, comp) => { await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click(`[data-hero=${hero}]`); await p.click(`[data-comp=${comp}]`); await p.click('#st-ask'); await p.click('#st-go'); await pause(0); };
  const runExp = (a) => E(({ ids, lvls, food, thr, want }) => { const S = window.__sect.S, m = window.__simMod; S.guide.on = false; m.tick(S); let R;
    for (const lvl of lvls) for (let k = 0; k < 4; k++) { for (const d of S.ds) if (ids.includes(d.id)) { d.skills.palm = d.skills.leg = Math.max(d.skills.palm, lvl); d.skills.strength = lvl / 2; d.hp = 100; d.mood = Math.max(d.mood, 60); }
      S.res.food = food; m.startExpedition(S, ids, { thr }); let i = 0; while (S.exp && i++ < 60000) m.tick(S); R = S.lastExp; if (want === 'blocked' ? R.blocked : want === 'awaken' ? S.hero.awakened : R.chase.n) { window.__exTeam = new Set(ids); window.__sect.panel(); return R; } }
    window.__exTeam = new Set(ids); window.__sect.panel(); return R; }, a);
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(860, c1.height + 40) } }); };
  // 1 強隊巡山：從山腰營地出發、不設限走進無盡段；新派遣面板（乾糧／目標／營地／巡山令）＋路線條（營地旗、無盡段）
  await pick('guojing', 'huangrong');
  const r1 = await E(async () => { const S = window.__sect.S, m = window.__simMod, { ARTS } = await import('./src/data.mjs'), { learnArt } = await import('./src/arts.mjs'); S.guide.on = false; S.unlock = undefined; m.tick(S);
    const ids = S.ds.filter((d) => d.role !== 'laborer').slice(0, 4).map((d) => d.id);
    const pump = () => { for (const d of S.ds) if (ids.includes(d.id)) { for (const k of Object.keys(d.skills)) d.skills[k] = 100; for (const a of ARTS) { learnArt(d, a.id, 0); Object.assign(d.arts[a.id], { xp: 1e6, bt1: true, bt2: true, bt3: true, last: 1e9 }); } d.hp = 100; d.mood = 95; d.restUntil = 0; } };
    pump(); S.res.food = 120; m.startExpedition(S, ids, { thr: 0.3, target: 'inf', supplies: 24 }); let i = 0; while (S.exp && i++ < 400000) m.tick(S); const first = S.lastExp;
    pump(); S.res.page1 = 7; S.res.page2 = 2; window.__exTeam = new Set(ids); window.__exOrd = 'clear'; window.__exFrom = 'camp2'; window.__exTgt = 'inf';
    m.startExpedition(S, ids, { thr: 0.3, target: 'inf', from: 'camp2', order: 'clear', supplies: 24 }); i = 0; while (S.exp && S.exp.dist < 1180 && i++ < 400000) m.tick(S); window.__sect.freeze = true; window.__sect.panel(); return first; });
  console.log('errs', errs); console.log('r1', r1.dist, r1.seg, r1.reason, r1.camps, r1.scout);
  await p.waitForTimeout(400); await p.screenshot({ path: `${root}/shots/v100-01-endless-camp-order.png` });
  await E(() => { const S = window.__sect.S, m = window.__simMod; let i = 0; while (S.exp && i++ < 400000) m.tick(S); for (const d of S.ds) d.restUntil = 0; window.__sect.panel(); console.log(S.lastExp.reason); });
  await clipExp('v100-02-expedition-panel-manuals.png');
  // 3 地圖：庫存成堆、每顆頭一個狀態圖示、大事件鏡頭拉近；弟子卡顯示喜好與志向
  await E(() => { const S = window.__sect.S; window.__sect.freeze = false; Object.assign(S.res, { wood: 30, stone: 20, food: 28, herb: 12, coin: 60 }); S.ds[1].needs.hunger = 5; S.ds[0].hp = 40; window.__camFocus(1038, 420, 30); window.__sect.speed = 0; });
  await p.waitForTimeout(1800); await p.screenshot({ path: `${root}/shots/v100-03-map-zoom-icons-piles.png` });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, awakened: S.hero?.awakened, rec: S.records, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
