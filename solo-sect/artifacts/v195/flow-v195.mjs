// v1.95 瀏覽器實點（完整自然操作，無任何狀態修改）：開局→16 倍速→反覆實點「因才派巡」「派出巡山」→看戰報互斥欄位與族群欄；
// 某環被壓到 ≤30% 基本上限後停止派巡，等牠回升到 ≥60%（反例：回升前不是永久清空，也不是瞬間補滿）。
// 用法：PW=<playwright-core 路徑> node artifacts/v195/flow-v195.mjs。PORT 18995，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18995;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = async (p, n, sel = '#exp') => { await p.$eval(sel, (e) => e.scrollIntoView()).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v195-${n}.png` }); };
const hints = (p) => p.$$eval('#arts .art-hint', (xs) => xs.map((x) => ({ id: x.dataset.hint, t: x.textContent })));
let br;
const st = (p, f, a) => p.evaluate(f, a);
const eco = (p) => st(p, () => { const S = window.__sect.S; return Object.fromEntries(Object.entries(S.pop).map(([k, e]) => [k, e.n])); });
const MAX = { foot: 18, wood: 23, slope: 23, gorge: 9, cliff: 18, cave: 18, peak: 14 };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 1000 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="yuebuqun"]'); await p.click('#st-go'); await p.waitForTimeout(1500); await clear(p);
  await p.click('[data-speed="16"]');
  let low = null, sent = 0, rep = null; const t0 = Date.now();
  while (Date.now() - t0 < 9 * 60e3 && !low) {
    await clear(p);
    const can = await st(p, () => !window.__sect.S.exp && !!document.querySelector('#exp-suggest') && !document.querySelector('#exp-go')?.disabled);
    if (can) { await p.click('#exp-suggest').catch(() => {}); await p.waitForTimeout(200); const n = await p.$$eval('.xteam:checked', (x) => x.length); if (n) { await p.click('#exp-go').catch(() => {}); if (await st(p, () => !!window.__sect.S.exp)) sent++; } }
    if (!rep) rep = await st(p, () => window.__sect.S.lastExp?.out ? window.__sect.S.lastExp : null);
    const e = await eco(p); for (const [k, n] of Object.entries(e)) if (n <= MAX[k] * 0.3) { low = { k, n, day: await st(p, () => window.__sect.S.day) }; break; }
    await p.waitForTimeout(1000);
  }
  const O = rep?.out; ok('自然巡山戰報：遭遇＝擊倒＋驅離＋繞避＋其他（互斥）', !!O && O.enc === O.knock + O.driven + O.evaded + O.other && O.enc > 0, { O, sent });
  const txt = await p.$eval('#log', (e) => e.textContent).catch(() => ''); ok('戰報文字有「戰果（互斥）」', /戰果（互斥）/.test(txt), {});
  ok(`實點派巡 ${sent} 趟後，某環被壓到 ≤30% 基本上限`, !!low, low);
  if (low) {
    await p.click('[data-speed="0"]'); await clear(p); await p.waitForTimeout(600); const ecoTxt = await p.$eval('[data-eco]', (e) => e.textContent).catch(() => '');
    ok('族群欄顯示現有／上限，被壓低的環標紅', /\d+\/\d+/.test(ecoTxt) && await p.$eval(`[data-ring="${low.k}"]`, (e, lim) => !!e.getAttribute('style') && +e.textContent.match(/(\d+)\//)[1] <= lim, MAX[low.k] * 0.3).catch(() => false), { ecoTxt });
    await p.$eval('[data-eco]', (e) => e.scrollIntoView()).catch(() => {}); await p.screenshot({ path: `${root}/shots/v195-01-ring-low.png` });
    await p.click('[data-speed="16"]');
    // 停止派巡，等回升（反例：不是永久清空）
    let rec = null, steps = []; const t1 = Date.now();
    while (Date.now() - t1 < 6 * 60e3) { await clear(p); const e = await eco(p); steps.push(e[low.k]); if (e[low.k] >= MAX[low.k] * 0.6) { rec = { n: e[low.k], day: await st(p, () => window.__sect.S.day) }; break; } await p.waitForTimeout(2000); }
    ok('停止派巡後該環回升到 ≥60%（不是永久清空）', !!rec, { rec, low, samples: steps.filter((_, i) => i % 5 === 0) });
    ok('反例：回升是逐步的（中間經過不同數值，不是瞬間補滿）', new Set(steps).size >= 3, { distinct: [...new Set(steps)] });
    await p.$eval('[data-eco]', (e) => e.scrollIntoView()).catch(() => {}); await p.screenshot({ path: `${root}/shots/v195-02-ring-recovered.png` });
  }
  await p.click('[data-zoom="far"]').catch(() => {}); await p.waitForTimeout(800); await p.screenshot({ path: `${root}/shots/v195-03-nests-map.png` });
  ok('無頁面錯誤', !res.errs.length, res.errs);
} catch (e) { ok('流程例外', false, String(e.stack || e).slice(0, 800)); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v195-result.json`, JSON.stringify(res, null, 1)); }
