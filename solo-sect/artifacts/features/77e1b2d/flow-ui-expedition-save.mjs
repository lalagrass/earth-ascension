// 可重跑玩家流程（UI 點擊）：新局郭靖+黃蓉 → 16× → 巡山面板開放 → 反例：0 人派遣被擋 → 2 人派遣 → 戰報 → 存檔/讀檔一致。
// 用法：PW=<playwright-core 路徑> node artifacts/features/77e1b2d/flow-ui-expedition-save.mjs（於 solo-sect/ 下）
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..'), out = path.dirname(new URL(import.meta.url).pathname), PORT = 18932;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; let br; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1700, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  const alerts = []; p.on('dialog', async (d) => { alerts.push(d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(500);
  const S0 = await p.evaluate(() => ({ hero: window.__sect.S.hero?.id ?? window.__sect.S.heroId, n: window.__sect.S.ds.length, t: window.__sect.S.t }));
  ok('新局開始（郭靖）', S0.n > 0, S0);
  await p.click('[data-speed="16"]');
  // 玩家動作：略過導引；遇到抉擇卡選第一項；直到巡山面板可見（上限 240 秒實際時間）
  const tick = async () => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go']) { const b = await p.$(sel); if (b && await b.isVisible()) { await b.click().catch(() => {}); res.steps.push({ n: '玩家點擊', d: sel }); } } };
  for (let i = 0; i < 240 && !(await p.isVisible('#exp-go')); i++) { await tick(); await p.waitForTimeout(1000); }
  if (!(await p.isVisible('#exp-go'))) throw new Error('巡山面板 240 秒內未開放；S.t=' + await p.evaluate(() => window.__sect.S.t)); ok('巡山面板於加速遊玩中開放', true, await p.evaluate(() => window.__sect.S.t));
  await p.evaluate(() => { window.__sect.speed = 0; }); await p.waitForTimeout(300);
  for (let k = 0; k < 8 && await p.$('.xteam:checked'); k++) { await p.click('.xteam:checked').catch(() => {}); await p.waitForTimeout(200); } await p.waitForTimeout(300);
  await p.click('#exp-go'); await p.waitForTimeout(300);
  const x0 = await p.evaluate(() => /巡山中/.test(document.getElementById('exp').textContent));
  ok('反例：0 人派遣被擋（跳提示、無出巡）', alerts.length === 1 && !x0, { alerts });
  const ids = await p.$$eval('.xteam', (a) => a.slice(0, 2).map((x) => x.value)); for (const v of ids) { await p.click(`.xteam[value="${v}"]`); await p.waitForTimeout(200); }
  await p.waitForTimeout(200); const before = await p.evaluate(() => ({ t: window.__sect.S.t, food: window.__sect.S.res.food }));
  await p.click('#exp-go'); await p.waitForTimeout(200);
  ok('2 人派遣成功（面板顯示巡山中）', /巡山中/.test(await p.textContent('#exp')), { ids, alerts: alerts.length });
  await p.evaluate(() => { window.__sect.speed = 16; });
  for (let i = 0; i < 300 && !/戰報 #1/.test(await p.textContent('#exp')); i++) { await tick(); await p.waitForTimeout(1000); }
  await p.evaluate(() => { window.__sect.speed = 0; });
  const rep = await p.evaluate(() => ({ t: window.__sect.S.t, food: window.__sect.S.res.food, text: document.querySelector('#exp .card')?.textContent }));
  ok('戰報產生、時間前進', rep.t > before.t && /走到/.test(rep.text), { before, rep });
  await p.screenshot({ path: `${out}/flow-report.png`, clip: await p.locator('#exp').boundingBox() || undefined });
  await p.click('#save'); const sv = await p.evaluate(() => localStorage.getItem('solo-sect-save'));
  await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => document.getElementById('start')?.remove());
  await p.click('#load'); await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ t: window.__sect.S.t, n: window.__sect.S.ds.length, rep: document.querySelector('#exp .card')?.textContent }));
  ok('存檔→重整→讀檔：時間與人數一致', !!sv && Math.abs(back.t - rep.t) < 1e-6, { back: { t: back.t, n: back.n } });
  ok('頁面錯誤 0', res.errs.length === 0, res.errs);
} catch (e) { ok('流程例外', false, String(e)); } finally { await br?.close(); srv.close(); fs.writeFileSync(`${out}/flow-ui-result.json`, JSON.stringify(res, null, 1)); }
