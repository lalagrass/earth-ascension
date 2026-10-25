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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v130-')) fs.unlinkSync(`${root}/shots/${f}`);
  const pick = async (hero, comp) => { await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click(`[data-hero=${hero}]`); await p.click(`[data-comp=${comp}]`); await p.click('#st-go'); await pause(0); };
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(880, c1.height + 40) } }); };
  // 1 阿星開局：江湖群像入門（楊過、小龍女、包租公婆、韋小寶、周伯通），隱藏高手揭露 → 東方不敗上門（抉擇卡帶立繪）
  await pick('axing', 'afang');
  const r1 = await E(async () => { const S = window.__sect.S, m = window.__simMod, W = await import('./src/wuxia.mjs'), J = await import('./src/jianghu.mjs'); S.guide.on = false; S.unlock = ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; m.tick(S);
    S.hero.askMajor = true; S.jh.morningOn = false; for (const k of ['yangguo', 'xiaolongnv', 'baozupo', 'weixiaobao']) W.join(S, k); S.xia.pending = 'zhoubotong'; W.xiaResolve(S, { xia: 'zhoubotong' }, 0);
    for (let i = 0; i < 3; i++) { const L = { ...S.ds.find((d) => d.id !== 'hero'), id: `L${i}`, name: `工${i}`, role: 'laborer', arts: {}, hiddenRolled: false, hidden: null, xia: null, pos: [700 + i * 60, 520] }; S.ds.push(L); }
    const Z = S.jh.zbt; S.jh.zbt = null; J.jhStep(S, 0.25, { rand: () => 0 }); S.jh.diao = 3; J.card(S, 'arm'); J.jhResolve(S, S.choices.find((c) => c.jh === 'arm'), 0); S.jh.bees = true; S.choices = []; S.day = 3; J.jhStep(S, 0.25); const ax = S.choices.find((c) => c.jh === 'axe'); if (ax) J.jhResolve(S, ax, 0);
    S.jh.honey = 2; S.jh.gambleSum = 18; Z.wins = 1; Z.taught = ['zuoyou'];
    S.ds.find((d) => d.xia === 'yangguo').mood = 22; S.choices = []; S.day = 8; J.jhStep(S, 0.25); S.jh.zbt = Z; S.jh.zbtDay = 8; window.__sect.panel(); return S.choices.map((c) => c.jh); });
  console.log('r1', JSON.stringify(r1)); await p.waitForTimeout(700); await p.screenshot({ path: `${root}/shots/v130-01-dongfangbubai-card-portrait.png` });
  // 2 面板「江湖群像」
  await E(async () => { const S = window.__sect.S, J = await import('./src/jianghu.mjs'); J.jhResolve(S, S.choices.find((c) => c.jh === 'dfbb'), 0, { rand: () => 0 }); S.choices = []; window.__sect.speed = 0; window.__sect.panel(); });
  await clipExp('v130-02-jianghu-panel.png');
  // 3 地圖招式特效：獅子吼、玄鐵重劍、葵花繡花針、蛤蟆功、黯然銷魂掌
  await E(async () => { const S = window.__sect.S; S.choices = []; const by = (x) => S.ds.find((d) => d.xia === x) || S.ds.find((d) => d.id === 'hero'); const P = (d, dx = 0, dy = 0) => [d.pos[0] + dx, d.pos[1] + dy];
    const bz = by('baozupo'), yg = by('yangguo'), h = S.ds.find((d) => d.id === 'hero'), w = by('weixiaobao');
    S.fx.push({ kind: 'move', mfx: 'shihou', name: '獅子吼', color: '#f0d070', from: P(bz), to: P(bz, 120, 0), r: 16, ttl: 0.4, tier: 2 },
      { kind: 'move', mfx: 'xuantie', name: '重劍無鋒', color: '#2a2a2a', from: P(yg), to: P(yg, 150, -20), r: 16, ttl: 0.5, tier: 2 },
      { kind: 'move', mfx: 'anran', name: '拖泥帶水', color: '#5a6c88', from: P(yg), to: P(yg, -130, 30), r: 16, ttl: 0.5, tier: 2 },
      { kind: 'move', mfx: 'hama', name: '蛤蟆功', color: '#6a8a3a', from: P(h), to: P(h, 110, 40), r: 16, ttl: 0.45, tier: 2 },
      { kind: 'move', mfx: 'kuihua', name: '繡花針', color: '#d04050', from: P(w), to: P(w, -120, -40), r: 16, ttl: 0.5, tier: 2 }); });
  await p.waitForTimeout(120); await p.screenshot({ path: `${root}/shots/v130-03-jianghu-moves-fx.png` });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, awakened: S.hero?.awakened, rec: S.records, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
