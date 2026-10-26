// v1.9 瀏覽器實點：A9 因才派巡（完整自然操作：開局→巡山解鎖→實點「因才派巡」→理由與勾選→實點派出；回山後再點，剛回來要歇的人不再被選＝反例）；
// 三四階藍圖的名聲／稀有料原因、擴地、山賊勒索按鈕（標「狀態修改」：直接改錢／名聲／料／地塊／待決勒索，只算畫面證據）。
// 用法：PW=<playwright-core 路徑> node artifacts/v190/flow-v190.mjs。PORT 18990，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18990;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = async (p, n, sel = '#exp') => { await p.$eval(sel, (e) => e.scrollIntoView()).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v190-${n}.png` }); };
const hints = (p) => p.$$eval('#arts .art-hint', (xs) => xs.map((x) => ({ id: x.dataset.hint, t: x.textContent })));
let br;
const st = (p, f, a) => p.evaluate(f, a);
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 1000 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="yuebuqun"]'); await p.click('#st-go'); await p.waitForTimeout(1500); await clear(p);
  // --- A9：完整自然操作 ---
  await p.click('[data-speed="16"]'); for (let i = 0; i < 200 && !(await p.$eval('#exp-suggest', (e) => e.offsetParent !== null && !document.querySelector('#exp-go')?.disabled).catch(() => false) && await st(p, () => !window.__sect.S.exp && !/解鎖/.test(document.querySelector('#exp')?.textContent || ''))); i++) { await clear(p); await p.waitForTimeout(500); }
  await p.click('[data-speed="0"]'); await clear(p); await p.$eval('#exp', (e) => e.scrollIntoView());
  await p.click('#exp-suggest'); await p.waitForTimeout(500);
  const why1 = await p.$eval('#exp-why', (e) => e.textContent); const checked1 = await p.$$eval('.xteam:checked', (xs) => xs.map((x) => x.value));
  ok('實點「因才派巡」：列出每人理由（專長／久未巡山），並勾好隊伍', /專長/.test(why1) && checked1.length === 2, { why1, checked1 }); await shot(p, '01-a9-suggest');
  await p.click('#exp-go'); await p.waitForTimeout(500); const team1 = await st(p, () => window.__sect.S.exp?.team || []);
  ok('實點派出：出發的就是建議的兩人', team1.length === 2 && team1.every((id) => checked1.includes(id)), { team1 });
  await p.click('[data-speed="16"]'); for (let i = 0; i < 400 && !(await st(p, () => !window.__sect.S.exp && !!window.__sect.S.lastExp)); i++) { await clear(p); await p.waitForTimeout(500); } await p.click('[data-speed="0"]'); await clear(p);
  await p.$eval('#exp', (e) => e.scrollIntoView()); await p.click('#exp-suggest'); await p.waitForTimeout(500);
  const why2 = await p.$eval('#exp-why', (e) => e.textContent); const checked2 = await p.$$eval('.xteam:checked', (xs) => xs.map((x) => x.value)); const resting = await st(p, () => window.__sect.S.ds.filter((d) => (d.restUntil || 0) > window.__sect.S.t).map((d) => d.id));
  ok('反例（自然）：剛回山還要歇的人不會再被建議', resting.length > 0 && !checked2.some((id) => resting.includes(id)), { resting, checked2, why2 }); await shot(p, '02-a9-after-return');
  // --- I-2（狀態修改）---
  await st(p, () => { const S = window.__sect.S; S.res.coin = 999; S.rep = 99; S.fac.hall.stage = 1; S.fac.hall.site = null; S.res.tiemu = 0; }); await p.waitForTimeout(700);
  const hb = await p.$eval('[data-build="hall"]', (b) => ({ dis: b.disabled, t: b.title, txt: b.textContent }));
  ok('（狀態修改）反例：名聲夠但沒有鐵木→三階「正殿」藍圖灰、寫出原因', hb.dis && /鐵木不足/.test(hb.t), hb);
  await st(p, () => { window.__sect.S.res.tiemu = 2; }); await p.waitForTimeout(700); await p.$eval('[data-build="hall"]', (e) => e.scrollIntoView()); await p.screenshot({ path: `${root}/shots/v190-03-tier3.png` });
  await p.click('[data-build="hall"]'); await p.waitForTimeout(500); const hs = await st(p, () => ({ site: !!window.__sect.S.fac.hall.site, tiemu: window.__sect.S.res.tiemu }));
  ok('（狀態修改）料齊後實點立藍圖：工地出現、鐵木扣 2', hs.site && hs.tiemu === 0, hs);
  await st(p, () => { const S = window.__sect.S; for (const k of ['library', 'quiet', 'shrine', 'well']) S.fac[k].stage = 1; }); await p.waitForTimeout(700);
  const lb = await p.$eval('[data-build="alchemy"]', (b) => ({ dis: b.disabled, t: b.title })); const l0 = await p.$eval('[data-lots]', (e) => e.textContent);
  ok('（狀態修改）反例：4 塊地用完，第 5 座 v1.6 建築灰「沒有空地」', lb.dis && /沒有空地/.test(lb.t), { ...lb, l0 });
  const c0 = await st(p, () => window.__sect.S.res.coin); await p.click('[data-lot]'); await p.waitForTimeout(700); const l1 = await p.$eval('[data-lots]', (e) => e.textContent); const c1 = await st(p, () => window.__sect.S.res.coin); const lb2 = await p.$eval('[data-build="alchemy"]', (b) => b.disabled);
  ok('實點擴地：地塊 4→5、錢 −50、丹房藍圖可按', /4\/5/.test(l1) && c0 - c1 === 50 && !lb2, { l0, l1, c0, c1 }); await p.$eval('[data-lots]', (e) => e.scrollIntoView()); await p.screenshot({ path: `${root}/shots/v190-04-lots.png` });
  // --- I-6（狀態修改：直接放一筆待決勒索）---
  const mk = (coin) => st(p, (c) => { const S = window.__sect.S; S.res.coin = c; S.threat ??= { next: 99, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [] }; S.threat.n++; S.threat.pending = { n: S.threat.n, pts: 200, demand: 30, p: 0.5, at: S.t, until: S.t + 9999, day: S.day }; }, coin);
  await p.click('[data-speed="1"]'); for (let i = 0; i < 60 && !(await st(p, () => window.__sect.S.unlock?.includes('econ'))); i++) await p.waitForTimeout(300); await p.click('[data-speed="0"]'); await clear(p);
  await mk(200); await p.waitForTimeout(700); await p.$eval('[data-threat]', (e) => e.scrollIntoView()); await p.screenshot({ path: `${root}/shots/v190-05-raid-ask.png` });
    await p.click('[data-raid="0"]'); await p.waitForTimeout(500); const r1 = await st(p, () => ({ coin: window.__sect.S.res.coin, paid: window.__sect.S.threat.paid, pend: !!window.__sect.S.threat.pending }));
  ok('（狀態修改）實點付錢了事：錢 −30、付錢 +1、勒索結束', r1.coin === 170 && r1.paid === 1 && !r1.pend, r1);
  await mk(5); await p.waitForTimeout(700); const pd = await p.$eval('[data-raid="0"]', (b) => b.disabled); ok('（狀態修改）反例：錢不夠時「付錢」是灰的', pd, { pd });
  const n0 = await st(p, () => window.__sect.S.ds.length); await p.click('[data-raid="1"]'); await p.waitForTimeout(500); const r2 = await st(p, () => ({ fought: window.__sect.S.threat.fought, n: window.__sect.S.ds.length, minHp: Math.min(...window.__sect.S.ds.map((d) => d.hp)) }));
  ok('（狀態修改）實點迎戰：記一次迎戰、沒有人死（人數不變、氣血 >0）', r2.fought === 1 && r2.n === n0 && r2.minHp > 0, r2); await p.screenshot({ path: `${root}/shots/v190-06-raid-fight.png` });
  ok('無頁面錯誤', !res.errs.length, res.errs);
} catch (e) { ok('流程例外', false, String(e.stack || e).slice(0, 800)); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v190-result.json`, JSON.stringify(res, null, 1)); }
