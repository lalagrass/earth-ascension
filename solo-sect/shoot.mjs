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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v135-')) fs.unlinkSync(`${root}/shots/${f}`);
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(880, c1.height + 40) } }); };
  // 1 開局畫面：每位經典主角卡片下方標出門派
  await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.waitForTimeout(400); await p.screenshot({ path: `${root}/shots/v135-01-start-sect-labels.png` });
  // 2 郭靖＝丐幫：破道館換上「丐幫・北丐一脈」匾額、丐字旗、打狗棒堂
  await p.click('[data-hero=guojing]'); await p.click('[data-comp=huangrong]'); await p.click('#st-go'); await pause(0);
  const r2 = await E(async () => { const S = window.__sect.S, m = window.__simMod, X = await import('./src/sect.mjs'), A = await import('./src/arts.mjs'); S.guide.on = false; S.unlock = ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; m.tick(S); S.jh.morningOn = false; S.jh.comedyOn = false;
    S.sect.rep = 6; Object.assign(S.res, { wood: 30, coin: 60 }); X.buildFac(S); const h = S.ds.find((d) => d.id === 'hero'); A.learnArt(h, 'zixia', S.t); h.arts.zixia.xp = 60; A.learnArt(h, 'anran', S.t);
    S.res.food = 55; S.day++; X.sectStep(S); const q = S.choices.find((c) => c.sect); if (q) X.sectResolve(S, q, 0); S.choices = [];
    X.rivalWon(S, X.rivalGate(S, (await import('./src/expedition.mjs')).routeSeg(1), 1)); window.__sect.panel(); return { sect: S.sect.plaque, rep: S.sect.rep, viol: S.sect.violN, wexin: h.wexin }; });
  console.log('r2', JSON.stringify(r2)); await p.waitForTimeout(700); await p.screenshot({ path: `${root}/shots/v135-02-gaibang-plaque-map.png` });
  // 3 面板「門派身分」：門規（違反→違心）、本門／外門／客傳武學、宿敵、鎮派設施
  await clipExp('v135-03-sect-panel.png');
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, sect: S.sect, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
