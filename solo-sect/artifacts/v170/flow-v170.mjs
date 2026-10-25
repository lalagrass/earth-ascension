// v1.7 瀏覽器實點：宿慧隨存檔（實點存檔→重開→自創點數變多；反例：無檔時不變；實點讀檔→localStorage 同步）；自然遊玩看菜庫／倉庫預留在預約表、不變式為空；巡山相剋武道
// 用法：node artifacts/v170/flow-v170.mjs（於 solo-sect/ 下）。PORT 18961，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18961;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v170-${n}.png` });
const budget = (p) => p.evaluate(() => { const m = document.body.innerText.match(/剩餘點數\s*(\d+)\s*／\s*(\d+)/); return m ? +m[2] : null; });
const st = (p) => p.evaluate(async () => { const S = window.__sect.S, L = await import('./src/lifecycle.mjs'), C = await import('./src/core.mjs');
  return { day: S.day, stock: Object.entries(S.resv || {}).filter(([k]) => k.startsWith('stock:')), cooking: S.ds.filter((d) => d.task?.act === 'cook' && d.task.phase !== 'done').map((d) => d.name), vegRes: S.vegRes, vegReserved: C.stockReserved(S, 'veg'), veg: S.res.veg, inv: L.invariants(S), exp: !!S.exp }; });
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  // ---- 反例：乾淨 localStorage，自創點數＝基準 ----
  await p.click('[data-tab="custom"]'); await p.waitForTimeout(300); const b0 = await budget(p); ok('反例：無宿慧無存檔 → 自創點數基準', b0 != null, b0);
  await p.click('[data-tab="classic"]'); await p.click('[data-hero="guojing"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800); await clear(p);
  // ---- 自然遊玩：菜庫／倉庫預留 ----
  await p.click('[data-speed="16"]'); let s; for (let i = 0; i < 240; i++) { await clear(p); s = await st(p); if (s.cooking.length && s.stock.some(([k]) => k.startsWith('stock:veg'))) break; await p.waitForTimeout(300); }
  await p.click('[data-speed="1"]'); await clear(p);
  ok('自然遊玩：煮飯者握 stock:veg 鍵、s.vegRes 不存在、預留＝2×煮飯人數、不變式為空', s.cooking.length && s.vegRes === undefined && s.vegReserved === 2 * s.cooking.length && !s.inv.length, s); await shot(p, '01-cook-stock-resv');
  // ---- 宿慧入存檔：狀態修改 gen.suhui=2（標明），實點「存檔」，清掉 localStorage 的宿慧鍵 ----
  res.edit1 = await p.evaluate(() => { window.__sect.S.gen.suhui = 2; return 'STATE EDIT: S.gen.suhui=2（模擬已傳兩代）'; }); console.log(res.edit1);
  await p.click('#save'); await p.waitForTimeout(400); const saved = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('solo-sect-save')); localStorage.removeItem('solo-sect-suhui'); for (let i = 0; i < 3; i++) { localStorage.removeItem('solo-sect-auto-' + i); localStorage.removeItem('solo-sect-auto-' + i + '-meta'); } return o.legacy; });
  ok('實點存檔 → 檔內帶 legacy.suhui=2', saved?.suhui === 2, saved); await shot(p, '02-saved-legacy');
  await p.reload(); await p.waitForTimeout(1200); await p.click('[data-tab="custom"]'); await p.waitForTimeout(300); const b1 = await budget(p);
  ok('重開：localStorage 無宿慧鍵，自創點數仍從存檔取得 +2', b1 === b0 + 2, { b0, b1 }); await p.screenshot({ path: `${root}/shots/v170-03-start-suhui-from-save.png` });
  // ---- 實點讀檔 → localStorage 同步 ----
  await p.click('[data-tab="classic"]'); await p.click('[data-hero="guojing"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800); await clear(p);
  await p.click('#load'); await p.waitForTimeout(500); await clear(p); const ls = await p.evaluate(() => localStorage.getItem('solo-sect-suhui'));
  ok('實點讀檔 → localStorage 宿慧同步為 2', ls === '2', ls); await shot(p, '04-loaded-synced');
  // ---- 巡山相剋：自然遊玩等巡山開放，出發，記下各人武道與敵人武道 ----
  await p.click('[data-speed="16"]'); let open = false; for (let i = 0; i < 150 && !open; i++) { await clear(p); await p.waitForTimeout(600); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.querySelector('.xteam')); }
  await p.click('[data-speed="1"]'); await clear(p); res.expOpen = open;
  if (open) { const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) await p.check(`.xteam[value="${id}"]`).catch(() => {}); await p.click('#exp-go').catch(() => {}); await p.click('#camtoast').catch(() => {});
    await p.click('[data-speed="16"]'); for (let i = 0; i < 200; i++) { await clear(p); s = await st(p); if (!s.exp && i > 3) break; await p.waitForTimeout(400); } await p.click('[data-speed="1"]'); await clear(p); await p.click('#cam-home').catch(() => {}); }
  res.dao = await p.evaluate(async () => { const X = await import('./src/expedition.mjs'), D = await import('./src/data.mjs'); const S = window.__sect.S; return { team: S.ds.slice(0, 3).map((d) => [d.name, X.daoOf(d)]), met: Object.keys(S.codex || {}).map((e) => [e, D.DAO.enemy[e]]) }; });
  s = await st(p); ok('巡山（自然遊玩）：隊員武道與遇敵武道都有定義（相剋 ±10% 只算已接線）', res.dao.team.every(([, x]) => x) && res.dao.met.every(([, x]) => x), res.dao); await shot(p, '05-expedition-dao');
  ok('全程不變式為空', !s.inv.length, s.inv);
  ok('無頁面錯誤', !res.errs.filter((e) => !e.startsWith('dialog')).length, res.errs); res.final = s;
} catch (e) { res.errs.push(String(e?.stack || e)); console.log('ERR', e); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v170-result.json`, JSON.stringify(res, null, 1)); }
