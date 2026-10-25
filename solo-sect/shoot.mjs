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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v120-')) fs.unlinkSync(`${root}/shots/${f}`);
  const pick = async (hero, comp) => { await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click(`[data-hero=${hero}]`); await p.click(`[data-comp=${comp}]`); await p.click('#st-ask'); await p.click('#st-go'); await pause(0); };
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(860, c1.height + 40) } }); };
  // 1 岳不群：罰令狐沖面壁 → 思過崖的老人（抉擇卡帶風清揚立繪）
  await pick('yuebuqun', 'linghuchong');
  const r1 = await E(async () => { const S = window.__sect.S, m = window.__simMod, Hs = await import('./src/huashan.mjs'); S.guide.on = false; S.unlock = ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; m.tick(S);
    S.hero.askMajor = true; S.choices = []; S.hs.bixie = -1; S.hs.cards.linJoin = true; S.hs.songLast = 99; S.day = Math.max(S.day, 4); Hs.hsStep(S, 0.25); const sg = S.choices.find((c) => c.hs === 'siguo'); Hs.hsResolve(S, sg, 0); Hs.hsStep(S, 0.25); window.__sect.panel(); return S.choices.map((c) => c.hs); });
  console.log('r1', JSON.stringify(r1)); await p.waitForTimeout(600); await p.screenshot({ path: `${root}/shots/v120-01-fengqingyang-card-portrait.png` });
  // 2 紫霞衝到第 6 層（第 7 層要七天不虧心）、辟邪三卡走完、九劍總訣＋見過敵人悟出的式；面板「華山線」
  await p.click('[data-pick="0"]');
  const r2 = await E(async () => { const S = window.__sect.S, Hs = await import('./src/huashan.mjs'); const d = S.ds.find((x) => x.id === 'hero'), H = { rand: () => 0.5 };
    for (let k = 0; k < 4; k++) { S.day++; Hs.hsStep(S, 0.25, H); } Hs.zxUp(S, d); Hs.zxUp(S, d); S.choices = S.choices.filter((c) => c.hs !== 'cave'); S.hs.cave = true; S.hs.carv = 3; Hs.zxUp(S, d); Hs.zxUp(S, d); Hs.zxUp(S, d); d.lastWexinT = S.t;
    const l = S.ds.find((x) => x.id === 'linghuchong'); for (const k of ['swordtomb', 'bandit', 'python']) S.codex[k] = { seen: 3, kills: 3, fled: 0, insight: 45 }; S.day++; Hs.hsStep(S, 0.25, H);
    S.choices = []; window.__sect.speed = 0; window.__sect.panel(); return { zx: d.zixia, dugu: l?.dugu, gate: Hs.zxGate(S, d) }; });
  console.log('r2', JSON.stringify(r2));
  // 3 華山線練滿的隊伍：無盡段每過一重回一口真氣，推到第 5 重；地圖上紫霞氣旋、九劍劍痕、辟邪殘影
  const r3 = await E(async () => { const S = window.__sect.S, m = window.__simMod, Hs = await import('./src/huashan.mjs'), { ARTS, DUGU } = await import('./src/data.mjs'), { learnArt } = await import('./src/arts.mjs');
    const ids = S.ds.filter((d) => d.role !== 'laborer').slice(0, 4).map((d) => d.id);
    for (const d of S.ds) if (ids.includes(d.id)) { for (const k of Object.keys(d.skills)) d.skills[k] = 100; for (const a of ARTS) { if (a.id === 'rulai' || a.layered || a.forms || a.id === 'bixie') continue; learnArt(d, a.id, 0); Object.assign(d.arts[a.id], { xp: 1e6, bt1: true, bt2: true, bt3: true, last: 1e9 }); learnArt(d, a.id, 0); } d.hp = 100; d.mood = 95; d.restUntil = 0; }
    const l = S.ds.find((x) => x.id === 'linghuchong'); if (l) for (const f of DUGU) Hs.learnDugu(S, l, f.id);
    S.res.food = 200; window.__exTeam = new Set(ids); window.__exTgt = 'inf'; m.startExpedition(S, ids, { thr: 0.3, target: 'inf', supplies: 24 }); let i = 0; while (S.exp && i++ < 2000000) m.tick(S);
    for (const d of S.ds) d.restUntil = 0; S.choices = []; const g = S.ds.find((d) => d.id === 'hero'), c = [g.pos[0], g.pos[1]];
    S.fx.push({ kind: 'zixia', pos: [...c], ttl: 1.6 }, { kind: 'move', mfx: 'bixie', zx: true, name: '鍾馗抉目', color: '#e05080', from: [...c], to: [c[0] + 140, c[1] - 10], r: 16, ttl: 0.6, tier: 2 });
    if (l) S.fx.push({ kind: 'dugu', pos: [l.pos[0] - 80, l.pos[1]], ttl: 1.2, seed: 1.3 });
    window.__sect.panel(); return { dist: S.lastExp.dist, seg: S.lastExp.seg, reason: S.lastExp.reason, wind: S.lastExp.events?.filter?.((e) => /真氣/.test(e)).length }; });
  console.log('r3', JSON.stringify(r3)); await p.waitForTimeout(150); await p.screenshot({ path: `${root}/shots/v120-03-endless-secondwind-huashan-fx.png` }); await clipExp('v120-02-huashan-panel-zixia-dugu.png');
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, awakened: S.hero?.awakened, rec: S.records, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
