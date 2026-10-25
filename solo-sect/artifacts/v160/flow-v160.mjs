// v1.6 瀏覽器實點：自然遊玩存料→點藍圖建井、靜室→看挑水／水入庫；鎮派建築（門派聲望＝狀態修改，標明）→點建造→鎮派活動；區塊快取 ≤64
// 用法：node artifacts/v160/flow-v160.mjs（於 solo-sect/ 下）。PORT 18959，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18959;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v160-${n}.png` });
const st = (p) => p.evaluate(() => { const S = window.__sect.S; return { day: S.day, res: { ...S.res }, fac: Object.fromEntries(['well', 'quiet', 'library', 'sig'].map((k) => [k, { stage: S.fac[k].stage, site: !!S.fac[k].site }])), acts: S.ds.map((d) => d.task?.act || null), daily: S.daily || {}, chunks: window.__chunks.size, sect: S.sect && { id: S.sect.id, rep: S.sect.rep, fac: S.sect.fac }, log: S.log.slice(0, 6).map((l) => l.msg) }; });
const waitFor = async (p, pred, max = 240) => { let s; for (let i = 0; i < max; i++) { await clear(p); s = await st(p); if (pred(s)) return s; await p.waitForTimeout(500); } return s; };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800);
  await p.click('[data-speed="16"]');
  // ---- 自然遊玩：等石料夠 6 → 點「藍圖：井」 ----
  const panel = await p.$$eval('#build [data-build]', (bs) => bs.map((b) => b.dataset.build)); ok('藍圖面板列出新建築、沒有鎮派地', ['well', 'quiet', 'library'].every((k) => panel.includes(k)) && !panel.includes('sig'), panel);
  let s = await waitFor(p, (x) => x.res.stone >= 6); await p.click('[data-speed="1"]'); await clear(p);
  await p.click('#build [data-build="well"]'); await p.waitForTimeout(300); s = await st(p); ok('點藍圖：井開工', s.fac.well.site, s.fac.well); await shot(p, '01-well-blueprint');
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.fac.well.stage === 1, 400); ok('自然遊玩：井落成', s.fac.well.stage === 1, { day: s.day });
  s = await waitFor(p, (x) => x.res.water > 0 || x.acts.includes('water'), 300); ok('有人去挑水／水入庫', s.res.water > 0 || s.acts.includes('water'), { water: s.res.water, acts: s.acts }); await p.click('[data-speed="1"]'); await clear(p); await shot(p, '02-well-water');
  const resTxt = await p.$eval('#res', (e) => e.textContent); ok('資源列顯示水／療傷丹', resTxt.includes('水') && resTxt.includes('療傷丹'), resTxt.slice(0, 80));
  // ---- 自然遊玩：靜室 ----
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.res.wood >= 6 && x.res.stone >= 4, 400); await p.click('[data-speed="1"]'); await clear(p);
  const qb = await p.$('#build [data-build="quiet"]'); if (qb) await qb.click(); s = await st(p); ok('點藍圖：靜室開工', s.fac.quiet.site || s.fac.quiet.stage === 1, s.fac.quiet);
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.fac.quiet.stage === 1, 500); await p.click('[data-speed="1"]'); await clear(p); ok('自然遊玩：靜室落成', s.fac.quiet.stage === 1, { day: s.day }); await shot(p, '03-quiet-built');
  // ---- 狀態修改（標明）：門派聲望與材料 → 點鎮派建造鈕 ----
  res.edit = await p.evaluate(() => { const S = window.__sect.S; S.sect.rep = 999; S.res.wood = 12; S.res.stone = 12; S.res.coin = Math.max(S.res.coin, 20); return 'STATE EDIT: sect.rep=999, wood/stone=12, coin≥20'; }); console.log(res.edit);
  await p.waitForTimeout(600); const sb = await p.$('[data-sectfac]'); res.sectBtn = !!sb; if (sb) await sb.click().catch(() => {});
  s = await st(p); if (!s.sect?.fac) { res.edit2 = 'sect button not visible: called buildFac via module (STATE EDIT)'; await p.evaluate(async () => { const M = await import('./src/sect.mjs'); M.buildFac(window.__sect.S); }); }
  s = await st(p); ok('鎮派建築落成 → 鎮派地 stage 1', s.sect?.fac && s.fac.sig.stage === 1, { sect: s.sect, sig: s.fac.sig, clicked: res.sectBtn });
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.acts.includes('sig') || (x.daily.sig?.n > 0), 300); await p.click('[data-speed="1"]'); await clear(p);
  ok('弟子自己去做鎮派活動', s.acts.includes('sig') || s.daily.sig?.n > 0, { acts: s.acts, daily: s.daily }); await shot(p, '04-sig-activity'); res.final = s;
  // ---- 區塊快取 ≤64 ----
  await p.mouse.move(600, 400); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(100); }
  for (let i = 0; i < 30; i++) { await p.mouse.move(700, 450); await p.mouse.down(); await p.mouse.move(100 + (i % 2) * 1200, 450 - (i % 3) * 200, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(80); }
  s = await st(p); ok('區塊快取上限 64（拖動地圖後）', s.chunks <= 64, { chunks: s.chunks }); await shot(p, '05-chunks');
  ok('無頁面錯誤', !res.errs.filter((e) => !e.startsWith('dialog')).length, res.errs);
} catch (e) { res.errs.push(String(e?.stack || e)); console.log('ERR', e); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v160-result.json`, JSON.stringify(res, null, 1)); }
