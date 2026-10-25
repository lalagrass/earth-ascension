// v1.55c 瀏覽器實點：迷霧、小地圖點擊跳鏡頭、溜走走法偏離山徑、閃過留下「殘」怪、返程驚獸時殘餘怪追來、清場走法繞進怪點。
// 用法：node artifacts/v155c/flow-v155c.mjs（於 solo-sect/ 下）。PORT 18957，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18957;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v155c-${n}.png` });
const st = (p) => p.evaluate(async () => { const S = window.__sect.S, W = await import('./src/world.mjs'), X = S.exp, d = W.partyDist(S), sp = W.partyStyledPos(S), tp = d == null ? null : W.trailAt(d);
  return { dist: X?.dist, phase: X?.phase, style: X?.style, hits: X?.ret?.hits, fog: W.fogCount(S), off: sp && tp ? Math.round(Math.hypot(sp[0] - tp[0], sp[1] - tp[1])) : null, cam: [Math.round(window.__cam.ux), Math.round(window.__cam.uy)], follow: window.__cam.follow,
    evaded: [...window.__fightLog.evaded], chasing: X ? W.leftovers(S, window.__fightLog.evaded).filter((l) => l.chasing).length : 0, names: [...window.__fightLog.names.values()] }; });
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(800);
  ok('小地圖出現在畫面左下', await p.isVisible('#minimap'));
  await p.click('[data-speed="16"]'); let open = false; for (let i = 0; i < 90 && !open; i++) { await clear(p); await p.waitForTimeout(1000); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.getElementById('exp-go')); }
  ok('正常玩到巡山解鎖', open); await p.click('[data-speed="1"]'); await clear(p);
  const f0 = (await st(p)).fog;
  const pick = async (want) => { const m = await p.evaluate(async () => { const E = await import('./src/expedition.mjs'); return Object.fromEntries(window.__sect.S.ds.map((d) => [d.id, E.styleOf(d).id])); }); const vs = await p.$$eval('.xteam', (xs) => xs.map((x) => x.value)); res.styles = m;
    let ids = vs.filter((v) => m[v] === want).slice(0, 2), edited = false; if (!ids.length) { ids = vs.slice(0, 1); edited = true; await p.evaluate(([id, w]) => { const d = window.__sect.S.ds.find((x) => x.id === id); d.personality = []; d.values = w === 'slip' ? { free: 99, fame: 99 } : { wu: 99, sect: 99 }; d.personality = w === 'clear' ? ['brave'] : []; }, [ids[0], want]); }
    for (const v of vs) await p.uncheck(`.xteam[value="${v}"]`).catch(() => {}); for (const id of ids) await p.check(`.xteam[value="${id}"]`); return { ids, edited }; };
  const P1 = await pick('slip'); const ids = P1.ids; res.pick1 = P1;
  await p.click('#exp-go'); await p.waitForTimeout(400); await p.click('#camtoast'); await p.click('[data-speed="4"]');
  let s1; for (let i = 0; i < 60; i++) { await p.waitForTimeout(250); s1 = await st(p); if (s1.dist > 40) break; }
  ok('點「溜走」出發：隊伍走在山徑旁邊（偏離 >40px）', s1.style === 'slip' && s1.off > 40, s1); await shot(p, '01-slip-offpath-fog');
  let s2; for (let i = 0; i < 200; i++) { await p.waitForTimeout(250); await clear(p); s2 = await st(p); if (s2.evaded.length >= 2 || s2.dist > 140) break; }
  ok('閃過的怪點變成「殘・怪名」留在原地', s2.evaded.length > 0, s2); ok('走過的地方揭霧（已探區塊變多）', s2.fog > f0, { f0, f: s2.fog }); await shot(p, '02-leftovers-marked');
  // 小地圖點擊：跳到右上角遠處
  const before = (await st(p)).cam; await p.click('#minimap', { position: { x: 200, y: 30 } }); await p.waitForTimeout(500); const after = await st(p);
  ok('點小地圖：鏡頭跳過去、取消跟隨（被界線夾在已探區）', !after.follow && (after.cam[0] !== before[0] || after.cam[1] !== before[1]), { before, after: after.cam }); await shot(p, '03-minimap-jump-fog-edge');
  await p.click('#camtoast').catch(() => {}); await p.click('#cam-follow').catch(() => {});
  let s4, chase = null, got = false; res.tries = [];
  for (let a = 0; a < 4 && !got; a++) {
    if (a) { await p.click('[data-speed="16"]'); for (let i = 0; i < 400; i++) { await p.waitForTimeout(250); await clear(p); if (!(await st(p)).phase) break; } await p.waitForTimeout(15000); await p.click('[data-speed="1"]'); await clear(p);
      const P = await pick('slip'); await p.click('#exp-go').catch(() => {}); await p.waitForTimeout(400); await p.click('#camtoast').catch(() => {}); await p.click('[data-speed="4"]');
      for (let i = 0; i < 200; i++) { await p.waitForTimeout(250); await clear(p); if ((await st(p)).dist > 130) break; } }
    await clear(p); await p.click('#exp-recall', { timeout: 3000 }).catch(() => { res.noRecall = true; }); let maxHits = [], ev = [];
    for (let i = 0; i < 900; i++) { await p.waitForTimeout(150); await clear(p); s4 = await st(p); if (s4.hits?.length) maxHits = s4.hits; if (s4.evaded.length) ev = s4.evaded; if (s4.chasing > 0) { if (chase == null) chase = i; if (i - chase > 8) { got = true; break; } } if (!s4.phase) break; }
    res.tries.push({ a, maxHits, evaded: ev }); console.log('try', a, JSON.stringify({ maxHits, ev })); }
  ok('回程撞上返程驚獸：從那段閃過的殘餘怪追上來', got, { s4, tries: res.tries }); if (got) await shot(p, '04-leftovers-chase');
  await p.click('[data-speed="16"]'); for (let i = 0; i < 400; i++) { await p.waitForTimeout(250); await clear(p); if (!(await st(p)).phase) break; }
  await p.waitForTimeout(20000); await p.click('[data-speed="1"]'); await clear(p);
  res.pick2 = await pick('clear');
  if (await p.$('#exp-go')) { await p.click('#exp-go'); await p.waitForTimeout(400); await p.click('#camtoast').catch(() => {}); await p.click('[data-speed="4"]');
    let s5; for (let i = 0; i < 400; i++) { await p.waitForTimeout(200); await clear(p); s5 = await st(p); if (s5.off > 25) break; }
    ok('換「清場」：隊伍繞進怪點打（離開山徑、走向怪）', s5.style === 'clear' && s5.off > 25, s5); await shot(p, '05-clear-detour');
    for (let i = 0; i < 100; i++) { await p.waitForTimeout(250); s5 = await st(p); if (s5.names.length >= 2) break; }
    ok('打過的點顯示實際交手的怪名', s5.names.length > 0, s5.names); await shot(p, '06-fought-names'); }
  ok('無頁面錯誤', !res.errs.filter((e) => !e.startsWith('dialog:')).length, res.errs.slice(0, 3));
} finally { await br?.close(); await new Promise((r) => srv.close(r)); fs.writeFileSync(`${here}/flow-v155c-result.json`, JSON.stringify(res, null, 1)); console.log('cleanup done'); }
