// v1.85 錢有出口 瀏覽器實點：開局卡郭靖標「困難」；收支區的月俸／維護預告；市集實點買靈草（價格遞增、限量反例）、賣丹；下山義學實點（派人下山、按鈕變灰的反例）。
// 用法：PW=<playwright-core 路徑> node artifacts/v185/flow-v185.mjs。PORT 18985，不碰 8800。標（狀態修改）的步驟直接改存量以縮短等待。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18985;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = async (p, n, sel = '[data-econ]') => { await p.$eval(sel, (e) => e.scrollIntoView()).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v185-${n}.png` }); };
const hints = (p) => p.$$eval('#arts .art-hint', (xs) => xs.map((x) => ({ id: x.dataset.hint, t: x.textContent })));
let br;
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 1000 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const card = await p.$eval('[data-hero="guojing"]', (e) => e.textContent); const other = await p.$eval('[data-hero="weixiaobao"]', (e) => e.textContent);
  ok('開局卡：郭靖標「困難」（反例：韋小寶沒有）', card.includes('困難') && !other.includes('困難'), { card: card.slice(0, 60) }); await p.screenshot({ path: `${root}/shots/v185-01-guojing-hard.png` });
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(1500); await clear(p);
  await p.click('[data-speed="16"]'); for (let i = 0; i < 160 && !(await p.$eval('[data-econ]', (e) => e.offsetParent !== null).catch(() => false)); i++) { await clear(p); await p.waitForTimeout(500); } await p.click('[data-speed="0"]'); await clear(p);
  const e0 = await p.$eval('[data-econ]', (e) => e.textContent); ok('收支區出現月俸／維護預告與寬限', /月俸/.test(e0) && /維護/.test(e0) && /寬限/.test(e0), e0.slice(0, 80));
  // 反例：沒錢時市集按鈕是灰的
  await p.evaluate(() => { window.__sect.S.res.coin = 0; }); await p.waitForTimeout(600); const dis = await p.$eval('[data-mkt="herb"]', (b) => b.disabled); ok('（狀態修改）反例：沒錢時「買靈草」是灰的', dis, { dis });
  await p.evaluate(() => { const S = window.__sect.S; S.res.coin = 400; S.res.pill = 3; }); await p.waitForTimeout(600);
  const herb0 = await p.evaluate(() => window.__sect.S.res.herb); const t1 = await p.$eval('[data-mkt="herb"]', (b) => b.textContent); await p.click('[data-mkt="herb"]'); await p.waitForTimeout(500); const t2 = await p.$eval('[data-mkt="herb"]', (b) => b.textContent);
  const pr = (x) => +(/（(\d+)，/.exec(x) || [])[1]; const herb1 = await p.evaluate(() => window.__sect.S.res.herb);
  ok('（狀態修改）市集實點買靈草：靈草 +3、下一份更貴、剩餘減一', herb1 === herb0 + 3 && pr(t2) > pr(t1), { t1, t2, herb0, herb1 });
  const c0 = await p.evaluate(() => window.__sect.S.res.coin); await p.click('[data-mkt="pill"]'); await p.waitForTimeout(500); const c1 = await p.evaluate(() => ({ coin: window.__sect.S.res.coin, pill: window.__sect.S.res.pill }));
  ok('實點賣療傷丹：丹 −1、錢增加', c1.pill === 2 && c1.coin > c0, { c0, ...c1 });
  await shot(p, '02-market');
  await p.click('[data-school]'); await p.waitForTimeout(600); const sch = await p.evaluate(() => { const S = window.__sect.S; const X = S.econ; return { who: X.school?.who, away: S.ds.find((d) => d.id === X.school?.who)?.away }; }); const sdis = await p.$eval('[data-school]', (b) => b.disabled);
  ok('實點下山義學：有人下山（離開地圖），按鈕變灰（反例：不能同時派兩趟）', sch.who && sch.away && sdis, { ...sch, sdis });
  await shot(p, '03-school');
  await p.click('[data-speed="16"]'); for (let i = 0; i < 120 && !(await p.evaluate(() => (window.__sect.S.econ.pool || []).length > 0)); i++) { await clear(p); await p.waitForTimeout(500); } await p.click('[data-speed="0"]');
  const pool = await p.evaluate(() => window.__sect.S.econ.pool.map((c) => c.name)); const t3 = await p.$eval('[data-econ]', (e) => e.textContent); ok('一日後回山，帶回想入門的人並列在面板', pool.length === 1 && t3.includes(pool[0]), { pool });
  await shot(p, '04-school-back');
  ok('無頁面錯誤', !res.errs.length, res.errs);
} catch (e) { ok('流程例外', false, String(e.stack || e).slice(0, 800)); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v185-result.json`, JSON.stringify(res, null, 1)); }
