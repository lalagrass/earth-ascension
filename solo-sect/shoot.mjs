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
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v110-')) fs.unlinkSync(`${root}/shots/${f}`);
  const pick = async (hero, comp) => { await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click(`[data-hero=${hero}]`); await p.click(`[data-comp=${comp}]`); await p.click('#st-ask'); await p.click('#st-go'); await pause(0); };
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(860, c1.height + 40) } }); };
  // 1 郭靖模板：黃蓉下廚→洪七公聞香而來、住在膳房邊上傳降龍十八掌（地圖金龍特效）
  await pick('guojing', 'huangrong');
  const r1 = await E(async () => { const S = window.__sect.S, m = window.__simMod, W = await import('./src/wuxia.mjs'); S.guide.on = false; S.unlock = ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; m.tick(S);
    S.hero.flags = { ...(S.hero.flags || {}), hong: true }; const hr = S.ds.find((d) => W.xidOf(S, d) === 'huangrong'); W.onCook(S, hr); S.xia.lastT = -1e9; W.xiaStep(S);
    const ch = S.choices.find((c) => c.xia === 'hongqigong'); W.xiaResolve(S, ch, 0); for (let k = 0; k < 2; k++) { W.onCook(S, hr); S.t += 300; W.xiaStep(S); }
    S.fx = S.fx.filter((f) => f.kind !== 'dragon'); const g = S.ds.find((d) => d.id === 'hero'); S.fx.push({ kind: 'dragon', pos: [...g.pos], ttl: 2.0 }); window.__sect.panel(); return { stage: S.xia.teacher?.stage, arc: S.hero.arcStep }; });
  console.log('r1', JSON.stringify(r1)); await p.waitForTimeout(250); await p.screenshot({ path: `${root}/shots/v110-01-hongqigong-teach-dragon-fx.png` });
  // 2 面板：名俠奇遇（可遇名俠與觸發條件、傳功進度、招牌武學）
  console.log('errs', errs, await E(() => !!document.getElementById('exp'))); await E(() => { window.__sect.speed = 0; window.__sect.panel(); }); await clipExp('v110-02-xia-panel-teacher-progress.png');
  // 3 傳完三段（打狗棒法給黃蓉）、洪七公下山；招牌武學練滿的隊伍闖進無盡段（絕頂之上）
  const r3 = await E(async () => { const S = window.__sect.S, m = window.__simMod, W = await import('./src/wuxia.mjs'), { ARTS } = await import('./src/data.mjs'), { learnArt } = await import('./src/arts.mjs');
    const hr = S.ds.find((d) => W.xidOf(S, d) === 'huangrong'); for (let k = 0; k < 3; k++) { W.onCook(S, hr); S.t += 300; W.xiaStep(S); } S.t += 1; W.xiaStep(S);
    const ids = S.ds.filter((d) => d.role !== 'laborer').slice(0, 4).map((d) => d.id);
    for (const d of S.ds) if (ids.includes(d.id)) { for (const k of Object.keys(d.skills)) d.skills[k] = 100; for (const a of ARTS) { if (a.id === 'rulai') continue; learnArt(d, a.id, 0); Object.assign(d.arts[a.id], { xp: 1e6, bt1: true, bt2: true, bt3: true, last: 1e9 }); learnArt(d, a.id, 0); } d.hp = 100; d.mood = 95; d.restUntil = 0; }
    S.res.food = 200; window.__exTeam = new Set(ids); window.__exTgt = 'inf'; m.startExpedition(S, ids, { thr: 0.3, target: 'inf', supplies: 24 }); let i = 0; while (S.exp && i++ < 900000) m.tick(S);
    for (const d of S.ds) d.restUntil = 0; const g = S.ds.find((d) => d.id === 'hero'), h = hr;
    S.fx.push({ kind: 'move', mfx: 'dragon', name: '亢龍有悔', color: '#ffd24a', from: [...g.pos], to: [g.pos[0] + 120, g.pos[1]], r: 100, ttl: 1.0, tier: 3 }, { kind: 'move', mfx: 'staff', name: '天下無狗', color: '#5fd38a', from: [...h.pos], to: [h.pos[0] - 110, h.pos[1] + 10], r: 90, ttl: 1.0, tier: 3 });
    window.__sect.panel(); return { dist: S.lastExp.dist, seg: S.lastExp.seg, reason: S.lastExp.reason, arc: S.hero.arcStep, left: S.xia.left, T: S.xia.teacher, ch: S.choices.map((c) => c.id), log: S.log.filter((l) => /洪七公/.test(l.msg)).map((l) => l.t + l.msg.slice(0, 30)) }; });
  console.log('r3', JSON.stringify(r3)); await p.waitForTimeout(200); await p.screenshot({ path: `${root}/shots/v110-03-classic-arts-endless-fx.png` });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, awakened: S.hero?.awakened, rec: S.records, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
