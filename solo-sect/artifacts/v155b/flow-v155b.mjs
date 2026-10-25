// v1.55b 瀏覽器實點：出發→點紙條跟隨→沿山徑走出 den→打怪演出→召回→沿原路走回院子。
// 用法：node artifacts/v155b/flow-v155b.mjs（於 solo-sect/ 下）。PORT 18956，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18956;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v155b-${n}.png` });
const st = (p) => p.evaluate(async () => { const S = window.__sect.S, W = await import('./src/world.mjs'), X = S.exp; return { dist: X?.dist, back: X?.backPos, phase: X?.phase, fights: X?.fights, cam: [Math.round(window.__cam.ux), Math.round(window.__cam.uy)], follow: window.__cam.follow, pp: W.partyPos(S), anim: window.__fightLog.cur && { name: window.__fightLog.cur.name, res: window.__fightLog.cur.res } }; });
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800);
  await p.click('[data-speed="16"]'); let open = false; for (let i = 0; i < 90 && !open; i++) { await clear(p); await p.waitForTimeout(1000); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.getElementById('exp-go')); }
  ok('正常玩到巡山解鎖', open); await p.click('[data-speed="1"]'); await clear(p);
  const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) await p.check(`.xteam[value="${id}"]`);
  await p.click('#exp-go'); await p.waitForTimeout(400); await p.click('#camtoast'); await p.click('[data-speed="4"]');
  await p.waitForTimeout(1500); const s1 = await st(p); ok('出發後沿山徑連續走出 den（無轉場），鏡頭跟著', s1.dist > 0 && s1.follow && s1.pp[1] < 3922, s1); await shot(p, '01-walk-out');
  let s2; for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); s2 = await st(p); if (s2.anim) break; }
  ok('遇到固定怪點：停下、播戰鬥演出（結果已由模擬算好）', !!s2?.anim, s2); await p.waitForTimeout(900); await shot(p, '02-fight-anim');
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(250); if ((await st(p)).dist > 110) break; } const s3 = await st(p);
  ok('走進林地（松竹素材環）', s3.dist > 100, s3); await shot(p, '03-wood-ring');
  await clear(p); await p.click('#exp-recall'); for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); if ((await st(p)).phase === 'back') break; }
  await p.waitForTimeout(1200); const s4 = await st(p); ok('按召回：沿原路往回走（backPos 變小、位置在山徑上）', s4.phase === 'back' && s4.back < s4.dist, s4); await shot(p, '04-recall-walk-back');
  await p.click('[data-speed="16"]'); for (let i = 0; i < 120; i++) { await p.waitForTimeout(250); await clear(p); if (!(await st(p)).phase) break; }
  const s5 = await p.evaluate((ids) => ({ exp: !!window.__sect.S.exp, away: window.__sect.S.ds.filter((d) => ids.includes(d.id)).map((d) => !!d.away) }), ids);
  ok('回到院子：巡山結束、隊員回到門派地圖', !s5.exp && s5.away.every((a) => !a), s5); await p.click('[data-speed="0"]'); await p.click('#cam-home'); await p.waitForTimeout(700); await shot(p, '05-back-home');
  ok('無頁面錯誤', !res.errs.length, res.errs.slice(0, 3));
} finally { await br?.close(); await new Promise((r) => srv.close(r)); fs.writeFileSync(`${here}/flow-v155b-result.json`, JSON.stringify(res, null, 1)); console.log('cleanup done'); }
