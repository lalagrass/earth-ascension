// v1.45 可重跑玩家流程（UI 點擊）：新局郭靖+黃蓉 → 16× → 大事卡點「繼續」→ 巡山面板開放 → 選 2 人＋巡山令「溜走」→ 派出
// → 巡山中看里程軸與側邊竹簡 → 回程／戰報（返程驚獸欄）→ 點側邊竹簡推鏡 → 弟子卡「現在／原因／下一步」。
// 用法（於 solo-sect/）：PW=/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.mjs node artifacts/features/v145/flow-ui-v145.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../../..'), shots = path.join(root, 'shots'), PORT = 18945;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [], clicks: [] }; let br; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '').slice(0, 300)); };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1700, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  const alerts = []; p.on('dialog', async (d) => { alerts.push(d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(500);
  await p.click('[data-speed="16"]');
  let topSeen = 0;
  const tick = async () => { for (const sel of ['#alert-ok', '#g-off', '[data-pick="0"]', '#chap-go']) { const b = await p.$(sel); if (b && await b.isVisible()) {
    if (sel === '#alert-ok') { topSeen++; const paused = await p.evaluate(() => { const t = window.__sect.S.t; return new Promise((r) => setTimeout(() => r(window.__sect.S.t === t), 400)); }); if (topSeen === 1) { ok('A 級大事：遊戲暫停（0.4 秒內時間不動）', paused, await p.textContent('#alert')); await p.screenshot({ path: `${here}/top-alert.png` }); } }
    await b.click().catch(() => {}); res.clicks.push(sel); } } };
  for (let i = 0; i < 240 && !(await p.isVisible('#exp-go')); i++) { await tick(); await p.waitForTimeout(1000); }
  if (!(await p.isVisible('#exp-go'))) throw new Error('巡山面板未開放'); ok('巡山面板開放', true, await p.evaluate(() => window.__sect.S.t));
  await p.click('[data-speed="0"]'); await p.waitForTimeout(500);
  for (let k = 0; k < 8 && await p.$('.xteam:checked'); k++) { await p.click('.xteam:checked').catch(() => {}); await p.waitForTimeout(500); }
  const ids = await p.$$eval('.xteam', (a) => a.slice(0, 2).map((x) => x.value)); for (const v of ids) { await p.click(`.xteam[value="${v}"]`); await p.waitForTimeout(500); }
  await p.selectOption('#exord', 'slip'); await p.waitForTimeout(500); await p.click('body', { position: { x: 5, y: 5 } }); await p.waitForTimeout(500);
  await p.click('#exp-go'); await p.waitForTimeout(500);
  ok('派出（巡山令・溜走）', /巡山中/.test(await p.textContent('#exp')), { ids, alerts });
  await p.click('[data-speed="16"]');
  let shot1 = false;
  for (let i = 0; i < 400 && !/戰報 #1/.test(await p.textContent('#exp')); i++) { await tick();
    if (!shot1) { const st = await p.evaluate(() => ({ ph: window.__sect.S.exp?.phase, open: document.querySelectorAll('#exp .ms .open').length, slips: document.querySelectorAll('#feed .slip').length })); if (st.ph === 'back' || st.open >= 1) { await p.click('[data-speed="0"]'); await p.waitForTimeout(400); await p.screenshot({ path: `${shots}/v145-01-patrol-strip-feed.png` }); shot1 = true; ok('巡山中：里程軸＋側邊竹簡可見', st.slips > 0 && (await p.$$('#exp .ms .m')).length >= 7, st); await p.click('[data-speed="16"]'); } }
    await p.waitForTimeout(500); }
  await p.click('[data-speed="0"]'); await p.waitForTimeout(400);
  const rep = await p.evaluate(() => ({ ret: window.__sect.S.lastExp?.ret, text: document.querySelector('#exp .card')?.textContent, log: window.__sect.S.log.find((e) => /巡山戰報/.test(e.msg))?.msg }));
  ok('戰報產生；返程驚獸欄位存在', rep.text && rep.ret !== undefined, rep); ok('溜走流帶寶回程：至少一段驚獸（非必然，記錄實況）', (rep.ret?.hits?.length || 0) > 0, rep.ret);
  for (let k = 0; k < 10 && await p.$('#alert-ok'); k++) { await tick(); await p.waitForTimeout(300); } // 玩家先按「繼續」關掉大事卡
  await p.click('[data-speed="0"]').catch(() => {}); await p.waitForTimeout(300);
  await p.locator('#exp').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${shots}/v145-02-return-raid-report.png` });
  const who = await p.$('#feed .slip[data-who]:not([data-who=""])');
  if (who) { const id = await who.getAttribute('data-who'); await who.click(); await p.waitForTimeout(700); const vis = await p.evaluate((id) => { const c = document.querySelector(`[data-dcard="${id}"]`); const r = c?.getBoundingClientRect(); return { has: !!c, status: c?.querySelector('.status')?.textContent, inView: r && r.top >= 0 && r.top < innerHeight }; }, id); ok('點側邊竹簡 → 推鏡＋捲到該弟子卡（現在／原因／下一步）', vis.has && /現在.*原因.*下一步/s.test(vis.status || ''), vis); }
  else ok('側邊竹簡有可推鏡人物', false, 'no slip with who');
  await p.waitForTimeout(300); await p.screenshot({ path: `${shots}/v145-03-status-panel.png` });
  ok('頁面錯誤 0', res.errs.length === 0, res.errs);
} catch (e) { ok('流程例外', false, String(e)); } finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-ui-result.json`, JSON.stringify(res, null, 1)); }
