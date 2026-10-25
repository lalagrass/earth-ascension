// v1.5 瀏覽器實玩流程：開局→快轉到巡山解鎖→勾隊員→派出→召回→看弟子卡「現在/原因/下一步」
// 用法：PW=<playwright-core> node artifacts/v150/flow-v150.mjs（於 solo-sect/ 下）。PORT 18952，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18952;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(500);
  await p.click('[data-speed="16"]');
  let open = false; for (let i = 0; i < 90 && !open; i++) { await clear(p); await p.waitForTimeout(1000); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.getElementById('exp-go')); }
  ok('巡山解鎖後面板出現（模擬層守解鎖）', open, await p.evaluate(() => ({ t: Math.round(window.__sect.S.t), unlock: window.__sect.S.unlock })));
  await p.click('[data-speed="1"]').catch(() => {});
  const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) { await p.check(`.xteam[value="${id}"]`); await p.waitForTimeout(150); }
  await p.click('#exp-go'); await p.waitForTimeout(300);
  for (let i = 0; i < 20; i++) { await clear(p); await p.waitForTimeout(400); if (await p.evaluate(() => (window.__sect.S.exp?.dist || 0) > 20)) break; }
  const rb = await p.$('#exp-recall'); ok('派出後面板有「召回」按鈕', !!rb, ids);
  await p.locator('#exp').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${root}/shots/v150-exp-out.png` });
  const d0 = await p.evaluate(() => window.__sect.S.exp?.dist); await p.click('#exp-recall');
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(400); if (await p.evaluate(() => window.__sect.S.exp?.phase === 'back')) break; }
  const X = await p.evaluate(() => { const X = window.__sect.S.exp; return X && { phase: X.phase, dist: X.dist, backPos: X.backPos, reason: X.reason, loot: X.loot }; });
  ok('按召回：隊伍從目前距離回程、原因是召回', X?.phase === 'back' && X.dist >= d0 && /召回/.test(X.reason), { d0, X });
  await p.waitForTimeout(900); await p.locator('#exp').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${root}/shots/v150-exp-recall.png` });
  await p.click('[data-speed="4"]').catch(() => {}); await p.waitForTimeout(2500); await clear(p);
  const card = await p.$('#ds .card .status'); const txt = card ? await card.textContent() : await p.textContent('#ds');
  ok('弟子卡：現在/原因/下一步（下一步＝工序或重新評估），無 undefined', /下一步/.test(txt) && !/undefined/.test(await p.textContent('#ds')), { sample: txt.slice(0, 120) });
  await p.evaluate(() => { window.__sect.speed = 0; }); await p.locator('#ds').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${root}/shots/v150-status.png` });
  ok('無 pageerror／dialog', res.errs.length === 0, res.errs);
} catch (e) { ok('flow crashed', false, String(e.stack || e)); } finally { await br?.close(); srv.close(); }
fs.writeFileSync(`${here}/flow-v150-result.json`, JSON.stringify(res, null, 1)); console.log(`${res.steps.filter((x) => x.pass).length}/${res.steps.length} PASS`);
