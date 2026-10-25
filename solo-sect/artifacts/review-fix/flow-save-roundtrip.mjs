// review fix：UI 存讀檔往返（不得跳阻斷 dialog）＋未來規則存檔經 UI 拒讀＋喜好無 undefined
// 用法：PW=<playwright-core 路徑> node artifacts/review-fix/flow-save-roundtrip.mjs（於 solo-sect/ 下）
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const out = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(out, '../..'), PORT = 18951;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [], dialogs: [] }; let br; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
const snap = (p) => p.evaluate(() => { const S = window.__sect.S; return { t: S.t, res: S.res, ds: S.ds.map((d) => d.id + ':' + d.needs.energy.toFixed(2)).join(','), rules: S.rules, hero: S.hero?.id }; });
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.dialogs.push(d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(500);
  await p.click('[data-speed="16"]');
  for (let i = 0; i < 15; i++) { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } await p.waitForTimeout(1000); }
  await p.evaluate(() => { window.__sect.speed = 0; }); await p.waitForTimeout(400);
  const ds = await p.textContent('#ds'); ok('弟子卡無「undefined」', !/undefined/.test(ds), { sample: ds.slice(0, 80) });
  const a = await snap(p); await p.click('#save', { timeout: 3000 }); await p.waitForTimeout(300);
  const toast = await p.textContent('#toast').catch(() => null);
  ok('存檔：無阻斷 dialog、出現提示、localStorage 有檔', res.dialogs.length === 0 && /已存檔/.test(toast || '') && await p.evaluate(() => !!localStorage.getItem('solo-sect-save')), { toast, dialogs: res.dialogs });
  await p.screenshot({ path: `${out}/save-toast.png` });
  await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => document.getElementById('start')?.remove());
  await p.click('#load', { timeout: 3000 }); await p.evaluate(() => { window.__sect.speed = 0; }); await p.waitForTimeout(300);
  const b = await snap(p); ok('重整後讀檔：t／資源／弟子一致', b.t === a.t && JSON.stringify(b.res) === JSON.stringify(a.res) && b.ds === a.ds && b.hero === a.hero, { a: { t: a.t, hero: a.hero }, b: { t: b.t, hero: b.hero } });
  const orig = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('solo-sect-save')); o.rules = '99.0'; const s = JSON.stringify(o); localStorage.setItem('solo-sect-save', s); return s; });
  await p.click('#load', { timeout: 3000 }); await p.waitForTimeout(300);
  const c = await snap(p), t2 = await p.textContent('#toast');
  ok('反例：未來規則 99.0 經 UI 拒讀、局面不變、原檔不動', /規則版本/.test(t2) && c.t === b.t && c.rules !== '99.0' && (await p.evaluate(() => localStorage.getItem('solo-sect-save'))) === orig && res.dialogs.length === 0, { toast: t2 });
  ok('無 pageerror', res.errs.length === 0, res.errs);
} catch (e) { ok('流程例外', false, String(e)); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${out}/flow-save-result.json`, JSON.stringify(res, null, 1)); }
process.exit(res.steps.every((x) => x.pass) ? 0 : 1);
