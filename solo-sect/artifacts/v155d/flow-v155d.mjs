// v1.55d 瀏覽器實點：近／中／遠三段縮放（自然遊玩）；雲霧入口拉近轉場→雲海循環圖連跑 3 重（為了走到 1600 步，出發前改了隊員武功＝狀態修改，截圖只算畫面證據）。
// 用法：node artifacts/v155d/flow-v155d.mjs（於 solo-sect/ 下）。PORT 18958，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18958;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v155d-${n}.png` });
const st = (p) => p.evaluate(async () => { const S = window.__sect.S, W = await import('./src/world.mjs'), X = S.exp, c = W.partyCloud(S);
  return { dist: X?.dist, phase: X?.phase, cloud: c && { k: c.k, f: +c.f.toFixed(2) }, on: window.__cloudOn(), z: +window.__cam.z.toFixed(2), lod: W.lodOf(window.__cam.z), chunks: window.__chunks.size, follow: window.__cam.follow, btn: document.getElementById('cam-cloud').hidden ? null : document.getElementById('cam-cloud').textContent }; });
const fps = (p) => p.evaluate(() => new Promise((r) => { let n = 0, worst = 0, t = performance.now(), t0 = t; const f = (now) => { n++; worst = Math.max(worst, now - t); t = now; if (now - t0 < 3000) requestAnimationFrame(f); else r({ fps: +(n / ((now - t0) / 1000)).toFixed(1), worstMs: +worst.toFixed(1) }); }; requestAnimationFrame(f); }));
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800);
  await p.click('[data-speed="16"]'); let open = false; for (let i = 0; i < 90 && !open; i++) { await clear(p); await p.waitForTimeout(1000); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.getElementById('exp-go')); }
  ok('正常玩到巡山解鎖（自然遊玩）', open); await p.click('[data-speed="1"]'); await clear(p);
  // ---- 自然遊玩：出發巡山，切三段縮放 ----
  const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) await p.check(`.xteam[value="${id}"]`);
  await p.click('#exp-go'); await p.waitForTimeout(400); await p.click('#camtoast'); await p.click('[data-speed="4"]'); await p.waitForTimeout(2500);
  await p.click('[data-zoom="near"]'); await p.waitForTimeout(900); const zn = await st(p); ok('按「近」：立繪小人', zn.lod === 'near', zn); await shot(p, '01-zoom-near');
  await p.click('[data-zoom="mid"]'); await p.waitForTimeout(900); const zm = await st(p); ok('按「中」：圓點＋名字', zm.lod === 'mid', zm); await shot(p, '02-zoom-mid');
  await p.click('[data-zoom="far"]'); await p.waitForTimeout(1200); const zf = await st(p), F = await fps(p), zf2 = await st(p);
  ok('按「遠」：只畫環色塊與族群圖示；最遠仍流暢（≥30fps、不新建區塊）', zf.lod === 'far' && F.fps >= 30 && zf2.chunks === zf.chunks, { zf, F, chunksAfter: zf2.chunks }); res.farFps = F; await shot(p, '03-zoom-far');
  await p.mouse.move(500, 400); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -300); await p.waitForTimeout(120); } const zw = await st(p); ok('滾輪仍可在三段之間連續縮放', zw.z > 0.3, zw);
  await p.click('[data-zoom="near"]'); await p.click('[data-speed="16"]'); for (let i = 0; i < 200; i++) { await p.waitForTimeout(250); await clear(p); if (!(await st(p)).phase) break; }
  // ---- 狀態修改（標明）：把隊員武功拉到 3000 才走得到絕頂之上 ----
  await p.waitForTimeout(20000); await p.click('[data-speed="1"]'); await clear(p); const ids4 = await p.$$eval('.xteam', (xs) => xs.slice(0, 4).map((x) => x.value));
  res.edit = await p.evaluate((ids) => { const S = window.__sect.S; for (const d of S.ds) if (ids.includes(d.id)) { d.skills.palm = d.skills.leg = 3000; d.skills.agility = d.skills.strength = 1500; d.hp = 100; d.mood = 80; delete d.injury; d.rest = 0; } S.res.food = Math.max(S.res.food, 60); return 'buffed skills=3000 hp=100 food>=60: ' + ids.join(','); }, ids4);
  console.log('STATE EDIT', res.edit); await clear(p);
  for (const id of ids4) await p.check(`.xteam[value="${id}"]`).catch(() => {}); let went = false; for (let a = 0; a < 40 && !went; a++) { await clear(p); for (const id of ids4) await p.check(`.xteam[value="${id}"]`).catch(() => {}); await p.selectOption('#extgt', 'inf').catch(() => {}); await p.click('#exp-go').catch(() => {}); await p.waitForTimeout(400); went = await p.evaluate(() => !!window.__sect.S.exp); if (!went) { await p.click('[data-speed="4"]'); await p.waitForTimeout(2000); await p.click('[data-speed="1"]'); } }
  res.went = went; await p.waitForTimeout(200); await p.click('#camtoast').catch(() => {});
  await p.click('[data-speed="16"]'); let s; for (let i = 0; i < 400; i++) { await p.waitForTimeout(150); await clear(p); s = await st(p); if (!s.phase || s.dist > 1560) break; }
  await p.click('[data-speed="1"]'); ok('走到雲霧入口前', s.dist > 1560, s);
  let tr = null; for (let i = 0; i < 400; i++) { await p.waitForTimeout(60); s = await st(p); if (s.on) { await p.waitForTimeout(380); await shot(p, '04-cloud-zoom-transition'); tr = s; break; } }
  ok('過絕頂：入口拉近轉場（白霧＋鏡頭拉近）→ 換雲海圖', !!tr && tr.cloud?.k === 1, tr); await p.waitForTimeout(1200); await shot(p, '05-cloud-layer1');
  const seen = new Set([1]); await p.click('[data-speed="4"]');
  for (let i = 0; i < 600 && seen.size < 3; i++) { await p.waitForTimeout(150); await clear(p); s = await st(p); if (!s.phase) break; if (s.cloud && !seen.has(s.cloud.k)) { seen.add(s.cloud.k); await p.waitForTimeout(500); await shot(p, `0${4 + s.cloud.k}-cloud-layer${s.cloud.k}`); } }
  ok('雲海連跑 3 重：第 1→2→3 重都在同一張循環圖上，沒有回山圖', seen.size >= 3 && s.on, { seen: [...seen], s });
  await p.click('[data-speed="1"]'); if (s.phase) { await p.click('#cam-cloud'); await p.waitForTimeout(1200); const s2 = await st(p); ok('按「⛰ 回山圖」：退出雲海、看回七環大地圖（隊伍停在絕頂入口）', !s2.on && s2.btn === '☁ 雲海', s2); await shot(p, '08-back-to-mountain');
    await p.click('#cam-cloud'); await p.waitForTimeout(1200); const s3 = await st(p); ok('再按「☁ 雲海」：回到雲海圖', s3.on, s3); }
  ok('無頁面錯誤', !res.errs.filter((e) => !e.startsWith('dialog:')).length, res.errs.slice(0, 3));
} finally { await br?.close(); await new Promise((r) => srv.close(r)); fs.writeFileSync(`${here}/flow-v155d-result.json`, JSON.stringify(res, null, 1)); console.log('cleanup done'); }
