// v1.55a 瀏覽器流程：世界鏡頭（拖曳＋邊界）、回山門、獸襲下山、出發紙條→跟隨、fps。
// 用法：node artifacts/v155a/flow-v155a.mjs（於 solo-sect/ 下）。PORT 18955，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18955;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v155a-${n}.png` });
const cam = (p) => p.evaluate(() => { const c = window.__cam; return { x: Math.round(c.ux), y: Math.round(c.uy), z: +c.uz.toFixed(2), follow: c.follow }; });
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800); await clear(p);
  ok('開局鏡頭＝門派全景（與舊版同一視角）', JSON.stringify(await cam(p)) === JSON.stringify({ x: 800, y: 4350, z: 1, follow: false }), await cam(p));
  ok('左上有回山門／跟隨隊伍按鈕；未出巡時跟隨停用', await p.evaluate(() => !!document.getElementById('cam-home') && document.getElementById('cam-follow').disabled));
  await shot(p, '01-home');
  // 拖曳往右上：未巡山時只能多看第一環
  const b = await p.locator('#map').boundingBox(); await p.mouse.move(b.x + 600, b.y + 300); await p.mouse.down(); await p.mouse.move(b.x + 100, b.y + 800, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(500);
  const c1 = await cam(p); ok('拖曳可捲動，但被邊界擋在門派＋第一環', c1.x > 800 && c1.x <= 1715 - 800 + 1 && c1.y < 4350, c1); await shot(p, '02-drag-bound');
  // 揭露到深谷 → 可捲到斷崖；縮到 0.5 看全環
  await p.evaluate(() => { const S = window.__sect.S; S.records.clear = { foot: 1, wood: 0.8, slope: 0.6, gorge: 0.3 }; window.__sect.speed = 0; Object.assign(window.__cam, { uz: 0.5, ux: 2400, uy: 2800 }); });
  await p.waitForTimeout(900); const c2 = await cam(p); ok('揭露後可捲到外環；鏡頭被夾在已揭露＋一圈內', c2.y < 4000 && c2.x > 1600, c2); await shot(p, '03-world-rings');
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  ok('縮小看大地圖時 fps（無頭 Chrome，參考值）', fps > 30, { fps, chunks: await p.evaluate(() => window.__chunks.size) });
  // 獸襲下山：raidT 推到到點前 10 秒，鏡頭看山腳
  await p.evaluate(async () => { const S = window.__sect.S, D = await import('./src/data.mjs'), E = await import('./src/expedition.mjs'); S.hunt = null; S.mons = S.mons.filter((m) => !m.raid); S.eco.boar.n = Math.max(1, S.eco.boar.n); S.raidT = D.RAID_EVERY * E.raidMul(S) - 10; Object.assign(window.__cam, { uz: 1, ux: 1300, uy: 3900 }); });
  await p.waitForTimeout(900); const rd = await p.evaluate(async () => { const W = await import('./src/world.mjs'), E = await import('./src/expedition.mjs'); return W.raidDescent(window.__sect.S, E.raidMul(window.__sect.S)); });
  ok('獸襲到點前，野豬從山腳巢點沿山徑下來', rd && rd.ring === 'foot' && rd.p > 0.4 && rd.p < 0.6, rd && { p: rd.p, pos: rd.pos }); await shot(p, '04-raid-descent');
  await p.evaluate(() => { window.__sect.speed = 1; }); for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => window.__sect.S.mons.some((m) => m.raid))) break; }
  ok('到點後真正的獸襲從 den 出現（模擬不變）', await p.evaluate(() => window.__sect.S.mons.some((m) => m.raid === 'go')));
  // 出巡：紙條 → 點了才跟隨；回山門取消跟隨
  await p.evaluate(async () => { const S = window.__sect.S, L = await import('./src/slice.mjs'); L.openExp(S); S.res.food = 20; S.mons = []; window.__sect.panel(); window.__camHome(); });
  await p.waitForTimeout(600); await clear(p);
  const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) await p.check(`.xteam[value="${id}"]`);
  await p.click('#exp-go'); await p.waitForTimeout(700);
  ok('出發時不自動跟隨，只跳紙條', !(await cam(p)).follow && await p.isVisible('#camtoast'), await p.textContent('#camtoast')); await shot(p, '05-depart-toast');
  await p.click('[data-speed="16"]'); await p.waitForTimeout(2500); await p.click('#camtoast'); await p.waitForTimeout(2500);
  const pp = await p.evaluate(async () => (await import('./src/world.mjs')).partyPos(window.__sect.S)); const c5 = await cam(p);
  ok('點紙條後鏡頭跟著巡山隊', c5.follow && pp && Math.abs(c5.x - pp[0]) < 260 && c5.y < 4300, { c5, pp }); await shot(p, '06-follow');
  await p.click('#cam-home'); await p.waitForTimeout(800); ok('回山門：回到門派全景、取消跟隨', JSON.stringify(await cam(p)) === JSON.stringify({ x: 800, y: 4350, z: 1, follow: false }), await cam(p));
  ok('無頁面錯誤', !res.errs.length, res.errs.slice(0, 3));
} finally { await br?.close(); await new Promise((r) => srv.close(r)); fs.writeFileSync(`${here}/flow-v155a-result.json`, JSON.stringify(res, null, 1)); console.log('cleanup done'); }
