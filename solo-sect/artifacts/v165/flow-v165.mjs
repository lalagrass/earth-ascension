// v1.65 瀏覽器實點：開局選畫風→名俠池濾鏡；自然遊玩看共同記憶、巡山並肩記憶；傳功（先等自然、不夠才改熟練＝狀態修改）；收徒（好感／外門＝狀態修改，再實點按鈕）
// 用法：node artifacts/v165/flow-v165.mjs（於 solo-sect/ 下）。PORT 18960，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18960;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
let br;
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = (p, n) => p.screenshot({ path: `${root}/shots/v165-${n}.png` });
const st = (p) => p.evaluate(() => { const S = window.__sect.S; return { day: S.day, xs: S.xiaStyle, mem: (S.mem || []).map((m) => m.k + ':' + m.text), passed: Object.keys(S.passed || {}), masters: S.ds.filter((d) => d.master).map((d) => d.name + '<' + d.master), roles: S.ds.map((d) => d.id + ':' + d.role), exp: !!S.exp, pupilBtns: document.querySelectorAll('[data-pupil]').length, memDom: document.querySelectorAll('#rel .mem').length }; });
const waitFor = async (p, pred, max = 240) => { let s; for (let i = 0; i < max; i++) { await clear(p); s = await st(p); if (pred(s)) return s; await p.waitForTimeout(500); } return s; };
const relShot = async (p, n) => { await p.$eval('#rel', (e) => e.scrollIntoView()); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v165-${n}.png` }); };
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { res.errs.push('dialog:' + d.message()); await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.selectOption('#st-xia', 'jin'); await p.screenshot({ path: `${root}/shots/v165-01-start-style.png` }); await p.click('#st-go'); await p.waitForTimeout(800);
  let s = await st(p); ok('開局選「純金庸」→ 畫風濾鏡生效', s.xs === 'jin', s.xs);
  const pool = await p.evaluate(async () => { const W = await import('./src/wuxia.mjs'), B = await import('./src/bonds.mjs'); return W.xiaPool(window.__sect.S).map((k) => [k, B.srcOf(k)]); }); ok('名俠池無周星馳角色', pool.every(([, x]) => x === 'jin'), pool);
  // ---- 自然遊玩：記憶帳本 ----
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.memDom > 0, 300); await p.click('[data-speed="1"]'); await clear(p);
  ok('自然遊玩：人際面板出現共同記憶（時、地、事）', s.memDom > 0, s.mem.slice(-3)); await relShot(p, '02-memories');
  // ---- 自然遊玩：巡山並肩記憶 ----
  await p.click('[data-speed="16"]'); let open = false; for (let i = 0; i < 120 && !open; i++) { await clear(p); await p.waitForTimeout(800); open = await p.evaluate(() => !document.getElementById('exp').hidden && !!document.querySelector('.xteam')); }
  await p.click('[data-speed="1"]'); await clear(p);
  if (open) { const ids = await p.$$eval('.xteam', (xs) => xs.slice(0, 2).map((x) => x.value)); for (const id of ids) await p.check(`.xteam[value="${id}"]`).catch(() => {}); await p.click('#exp-go').catch(() => {}); await p.click('#camtoast').catch(() => {});
    await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.mem.some((m) => m.startsWith('patrol')), 400); await p.click('[data-speed="1"]'); await clear(p); await p.click('#cam-home').catch(() => {}); }
  ok('自然遊玩：巡山歸來寫入「並肩巡山」', s.mem.some((m) => m.startsWith('patrol')), s.mem.filter((m) => m.startsWith('patrol'))); await relShot(p, '03-patrol-memory');
  // ---- 傳功：先等自然發生；不夠就改熟練（狀態修改，標明） ----
  await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.passed.length > 0, 120); await p.click('[data-speed="1"]'); await clear(p);
  res.passNatural = s.passed.length > 0;
  if (!res.passNatural) { res.edit1 = await p.evaluate(() => { const S = window.__sect.S, d = S.ds.find((x) => x.id === 'hero'), r = d.arts.basicFist; r.xp = 90; r.bt1 = r.bt2 = true; return 'STATE EDIT: hero basicFist xp=90 (圓滿)'; }); console.log(res.edit1);
    await p.click('[data-speed="16"]'); s = await waitFor(p, (x) => x.passed.length > 0, 240); await p.click('[data-speed="1"]'); await clear(p); }
  const pl = await p.evaluate(() => window.__sect.S.log.find((l) => l.msg.includes('【傳功】'))?.msg || null);
  ok(`傳功（${res.passNatural ? '自然發生' : '改熟練後自走發生，只算畫面證據'}）`, s.passed.length > 0 && pl, { passed: s.passed, log: pl }); await relShot(p, '04-pass');
  // ---- 收徒：狀態修改（好感 30、指定外門），再實點「收為徒」 ----
  res.edit2 = await p.evaluate(async () => { const S = window.__sect.S, So = await import('./src/social.mjs'); const m = S.ds.find((x) => x.id === 'hero'), o = S.ds.find((x) => x.id !== 'hero' && x.role !== 'laborer'); m.role = m.role === 'outer' ? 'inner' : m.role; o.role = 'outer'; o.master = null; So.initPair(S, m, o, 35); return `STATE EDIT: ${o.name}.role=outer, aff(${m.name},${o.name})=35`; }); console.log(res.edit2);
  await p.waitForTimeout(800); s = await st(p); const btn = await p.$('[data-pupil]'); ok('收徒按鈕出現', !!btn, s.pupilBtns); if (btn) await btn.click(); await p.waitForTimeout(500); s = await st(p);
  res.mastersBefore = (await st(p)).masters; ok('實點收徒 → 師徒成立、寫入記憶（另有自然形成的師徒一併列出）', s.masters.some((x) => x.endsWith('<hero')) && s.mem.some((m) => m.startsWith('apprentice')), { masters: s.masters }); await relShot(p, '05-apprentice');
  ok('無頁面錯誤', !res.errs.filter((e) => !e.startsWith('dialog')).length, res.errs); res.final = s;
} catch (e) { res.errs.push(String(e?.stack || e)); console.log('ERR', e); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v165-result.json`, JSON.stringify(res, null, 1)); }
