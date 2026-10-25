// 一次桌面走查（v0.98 垂直切片：漸進解鎖、撤退與存檔列、章節總結；每版只留 3 張）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v098-')) fs.unlinkSync(`${root}/shots/${f}`);
  const pick = async (hero, comp) => { await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click(`[data-hero=${hero}]`); await p.click(`[data-comp=${comp}]`); await p.click('#st-ask'); await p.click('#st-go'); await pause(0); };
  const runExp = (a) => E(({ ids, lvls, food, thr, want }) => { const S = window.__sect.S, m = window.__simMod; S.guide.on = false; m.tick(S); let R;
    for (const lvl of lvls) for (let k = 0; k < 4; k++) { for (const d of S.ds) if (ids.includes(d.id)) { d.skills.palm = d.skills.leg = Math.max(d.skills.palm, lvl); d.skills.strength = lvl / 2; d.hp = 100; d.mood = Math.max(d.mood, 60); }
      S.res.food = food; m.startExpedition(S, ids, { thr }); let i = 0; while (S.exp && i++ < 60000) m.tick(S); R = S.lastExp; if (want === 'blocked' ? R.blocked : want === 'awaken' ? S.hero.awakened : R.chase.n) { window.__exTeam = new Set(ids); window.__sect.panel(); return R; } }
    window.__exTeam = new Set(ids); window.__sect.panel(); return R; }, a);
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(860, c1.height + 40) } }); };
  // 1 新局早期：只開建造／弟子，跑到第 300 秒解鎖武學圖、狩獵（新開放標記）
  await pick('guojing', 'huangrong'); await E(() => { const S = window.__sect.S, m = window.__simMod; S.guide.on = false; while (S.t < 300) m.tick(S); window.__sect.freeze = false; window.__sect.panel(); });
  await p.waitForTimeout(500); await p.locator('#panel').evaluate((el) => { el.scrollTop = 0; }); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v098-01-early-unlock.png` });
  // 2 守關敵見勢不妙提早撤退＋存檔列（自動存檔／匯出／匯入／音效）
  await E(() => { const S = window.__sect.S, m = window.__simMod; while (S.t < 500) m.tick(S); });
  const r2 = await runExp({ ids: ['hero', 'huangrong'], lvls: [12, 18, 25, 32, 40], food: 20, thr: 0.2, want: 'blocked' }); console.log('r2', r2.reason);
  await p.waitForTimeout(2500); await p.evaluate(() => { const b = document.getElementById('save').parentElement; document.getElementById('exp').before(b); });
  await E(() => window.__sect.panel()); await clipExp('v098-02-gate-bail-save-bar.png');
  // 3 第一章完成總結
  await E(() => { const S = window.__sect.S, m = window.__simMod; S.records.sect = Math.max(S.records.sect || 0, 260); const f = Object.values(S.fac); f[0].stage += 1; f[1].stage += 1;
    while (S.ds.filter((d) => d.role !== 'laborer').length < 4) { const c = structuredClone(S.ds.find((d) => d.role !== 'laborer' && d.id !== 'hero')); c.id = 'n' + S.ds.length; c.name = ['小龍', '石破天', '令狐沖'][S.ds.length % 3]; S.ds.push(c); }
    m.tick(S); window.__sect.freeze = false; window.__sect.panel(); });
  await p.waitForSelector('#chap'); await p.waitForTimeout(400); await p.screenshot({ path: `${root}/shots/v098-03-chapter-complete.png` });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, awakened: S.hero?.awakened, rec: S.records, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
