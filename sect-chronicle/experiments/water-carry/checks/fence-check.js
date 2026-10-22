#!/usr/bin/env node
// LP-08（#228）：同一主入口，自然新局等野豬留下損痕、退到看不見後，真操作派一人整理護欄→走去→動手進度→清一階→回生活；
// 再用護欄選單有限示範一次「取消本次整理」。390px 只驗新增派遣／原因／進度／取消。只用滑鼠／鍵盤下令，唯讀 snapshot 觀測。
// 先在 repo 根目錄 python3 -m http.server 8816 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/fence-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8816/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 180000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1 });
  const page = await context.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(ENTRY_URL);
  await wait(page, () => window.demo && window.demo.snapshot().frames > 3);
  return { context, page, errors };
}
// 名冊卡再點一次會取消選取：已選中就不再點。
const pick = async (page, id) => { if ((await snap(page)).selected !== id) await page.click(`#roster [data-person="${id}"]`); };
const paused = async (page, fn) => { await page.click('#play'); const r = await fn(); await page.click('#play'); return r; };
// 每畫面幀記錄兩人與野豬位置：每 tick 位移超過各自上限、或同 tick 內位置變了都算失敗。
const trace = (page) => page.evaluate(() => {
  const tr = window.__trace = { max: 0, boarMax: 0, at: null, still: null, last: null };
  const loop = () => {
    const s = window.demo.snapshot(), l = tr.last;
    if (l && s.tick > l.tick) {
      for (const id of Object.keys(s.people)) {
        const p = s.people[id], d = Math.hypot(p.x - l[id].x, p.y - l[id].y) / (s.tick - l.tick);
        if (d > tr.max) { tr.max = d; tr.at = { id, tick: s.tick, mode: p.mode }; }
      }
      if (s.boar.visible && l.boar.visible) tr.boarMax = Math.max(tr.boarMax, Math.hypot(s.boar.x - l.boar.x, s.boar.y - l.boar.y) / (s.tick - l.tick));
    }
    if (l && s.tick === l.tick && Object.keys(s.people).some((id) => s.people[id].x !== l[id].x || s.people[id].y !== l[id].y)) tr.still = { tick: s.tick };
    tr.last = { tick: s.tick, boar: { x: s.boar.x, y: s.boar.y, visible: s.boar.visible }, ...Object.fromEntries(Object.entries(s.people).map(([id, p]) => [id, { x: p.x, y: p.y }])) };
    requestAnimationFrame(loop);
  };
  loop();
});

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(s.boar.marks === 0 && !(await page.locator('#boar [data-cmd="fix"]').count()), '新局護欄無痕：野豬卡沒有整理按鈕');
  await trace(page);
  await page.keyboard.press('4');

  // 1. 自然損痕：野豬撞過、仍看得見時派遣按鈕停用並說明原因
  await wait(page, () => { const b = window.demo.snapshot().boar; return b.marks > 0 && b.seen; });
  s = await paused(page, async () => {
    await pick(page, 'cousin');
    const b = page.locator('#boar [data-cmd="fix"]');
    check(await b.isDisabled() && /看得見野豬/.test(await b.getAttribute('title')), `野豬看得見（${(await snap(page)).boar.label}）：「派熟手整理」停用，原因「${await b.getAttribute('title')}」`);
    return snap(page);
  });
  await wait(page, () => { const b = window.demo.snapshot().boar; return b.mode === 'flee' && !b.seen; });

  // 2. 退到看不見（仍在退走腿上）：暫停中點野豬卡派熟手整理
  await page.click('#play');
  s = await snap(page);
  check((s.boar.mode === 'flee' || s.boar.mode === 'habitat') && !s.boar.visible && s.boar.marks > 0, `野豬退走離開可見範圍（${s.boar.label}，x=${s.boar.x.toFixed(0)}；不等回棲地即可派），損痕 ${s.boar.marks}／3`);
  const marks0 = s.boar.marks, t0 = s.tick, before = s.people.cousin;
  await pick(page, 'cousin');
  await page.click('#boar [data-cmd="fix"]');
  s = await snap(page);
  const toast = await page.locator('#toast').innerText();
  check(s.boar.fixBy === 'cousin' && s.tick === t0 && /整理/.test(toast), `暫停中派熟手整理（當時 ${before.mode}，精力 ${before.energy.toFixed(1)}），tick 不動，提示「${toast}」`);
  let pan = await page.locator('#panel').innerText();
  check(/待整理護欄|走去整理護欄/.test(pan) && pan.includes('取消本次整理'), '面板顯示整理狀態與「取消本次整理」');
  await page.screenshot({ path: `${OUT}/desk-1-dispatched.png` });
  await page.click('#play');

  // 3. 真走去 → 動手（進度、借用動作）→ 清一階 → 返院
  await wait(page, () => window.demo.snapshot().people.cousin.mode === 'toFix' || !window.demo.snapshot().people.cousin.fix);
  s = await snap(page);
  check(s.people.cousin.mode === 'toFix', `熟手（原趟交付／恢復後）沿防守路走去護欄：${s.people.cousin.status}`);
  await wait(page, () => { const p = window.demo.snapshot().people.cousin; return p.mode === 'toFix' && p.fixLeg.k > 0.5; });
  await paused(page, () => page.screenshot({ path: `${OUT}/desk-2-walk.png` }));
  await wait(page, () => { const p = window.demo.snapshot().people.cousin; return (p.mode === 'fix' && p.fixWork.k > 0.45) || !p.fix; });
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-3-work.png` }); return snap(page); });
  const p = s.people.cousin, gp = s.guardScreen;
  pan = await page.locator('#panel').innerText();
  const pill = await page.locator('#tags .tag.pill.guard').allInnerTexts();
  check(p.mode === 'fix' && Math.hypot(p.footScreen.x - gp.x, p.footScreen.y - gp.y) < 3 && p.action === 'stretch', `動手：腳底在防守點（${Math.hypot(p.footScreen.x - gp.x, p.footScreen.y - gp.y).toFixed(1)}px），借用動作 ${p.action}／幀 ${p.frame}`);
  check(/整理護欄 \d+%/.test(pan) && pan.includes('動作借用') && pill.some((t) => /整理護欄 \d+%/.test(t)), `面板與頭上狀態都有進度（${(pan.match(/整理護欄 \d+%[^\n]*/) || [''])[0]}），面板標明借用`);
  const eWork = p.energy + p.fixWork.steps / 60;
  await wait(page, () => window.demo.snapshot().people.cousin.fixResult);
  s = await snap(page);
  check(s.people.cousin.fixResult.kind === 'done' && s.boar.marks === marks0 - 1, `完成：損痕 ${marks0} → ${s.boar.marks}（只清一階）`);
  await paused(page, () => page.screenshot({ path: `${OUT}/desk-4-done.png` }));
  check(Math.abs(eWork - s.people.cousin.energy - 8) < 0.05, `動手共扣 ${(eWork - s.people.cousin.energy).toFixed(2)} 精力（示意值 8）`);
  check(s.people.cousin.trips === before.trips + (before.mode === 'carry' ? 1 : 0), `沒有額外趟次（${before.trips} → ${s.people.cousin.trips}，含原趟交付）`);
  await wait(page, () => window.demo.snapshot().people.cousin.mode !== 'fromFix');
  s = await snap(page);
  check(!s.people.cousin.fixing && s.boar.fixBy == null, `返院回生活：${s.people.cousin.status}（精力 ${s.people.cousin.energy.toFixed(1)}）`);
  await paused(page, () => page.screenshot({ path: `${OUT}/desk-5-back.png` }));

  // 4. 有限示範取消：點護欄開選單派主角，動手或前往中按面板「取消本次整理」
  s = await snap(page);
  if (s.boar.marks > 0 && !s.boar.seen) {
    await pick(page, 'hero');
    await page.mouse.click(s.fenceScreen.x, s.fenceScreen.y);
    const opt = page.locator('#menu [data-cmd="fix"]');
    check(await opt.count() === 1, `護欄選單有「整理護欄」（${await page.locator('#menu').innerText().then((t) => t.split('\n').slice(0, 4).join(' / '))}）`);
    if (await opt.isEnabled()) {
      await opt.click();
      const m0 = (await snap(page)).boar.marks;
      await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.mode === 'fix' || h.mode === 'toFix' && h.fixLeg.k > 0.6 || !h.fix; }, null, 240000);
      s = await paused(page, async () => {
        const st = (await snap(page)).people.hero;
        if (st.fix) await page.click('#panel [data-cmd="fixCancel"]');
        await page.screenshot({ path: `${OUT}/desk-6-cancel.png` });
        return snap(page);
      });
      const h = s.people.hero;
      check(h.fixResult && h.fixResult.kind === 'canceled' && s.boar.marks === m0 && s.boar.fixBy == null, `取消：${h.fixResult ? h.fixResult.kind : '無'}（${h.status}），損痕維持 ${s.boar.marks}`);
    } else note('note', `主角此時不能整理：${await opt.locator('span').innerText()}（未示範取消）`);
  } else note('note', '此時沒有損痕或看得見野豬，未示範取消');
  const tr = await page.evaluate(() => window.__trace);
  check(tr.max <= 84 / 60 + 1e-6 && !tr.still, `連續位置：人每 tick 最大 ${tr.max.toFixed(3)}（上限 1.4），同 tick 不動 ${!tr.still}`);
  check(W.errors.length === 0, `桌面 console 錯誤／警告：${W.errors.length ? W.errors.join(' | ') : '無'}`);

  // 5. 390px：只驗新增按鈕／原因／進度／取消
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.keyboard.press('4');
  await wait(np, () => { const b = window.demo.snapshot().boar; return b.marks > 0 && b.visit >= 1 && !b.seen && !b.active; });
  await np.click('#play');
  await pick(np, 'cousin');
  const nt = (await snap(np)).tick;
  const nb = np.locator('#panel [data-cmd="fix"]');
  check(await nb.isVisible() && await nb.isEnabled(), '390px：熟手面板有可按的「整理護欄」');
  await nb.click();
  s = await snap(np);
  check(s.boar.fixBy === 'cousin' && s.tick === nt, `390px：暫停中派遣，tick 不動（${nt}→${s.tick}）`);
  const fr = await rect(np, '#panel .fixline');
  check(fr && fr.r <= 390 && fr.x >= 0, `390px：整理狀態列在畫面內（${JSON.stringify(fr)}）`);
  await np.screenshot({ path: `${OUT}/narrow-1-dispatched.png` });
  await np.click('#play');
  await wait(np, () => { const p = window.demo.snapshot().people.cousin; return (p.mode === 'fix' && p.fixWork.k > 0.3) || !p.fix; }, null, 240000);
  await np.click('#play');
  s = await snap(np);
  const npan = await np.locator('#panel').innerText();
  check(s.people.cousin.mode === 'fix' && /整理護欄 \d+%/.test(npan), `390px：動手進度可讀（${(npan.match(/整理護欄 \d+%[^\n]*/) || [s.people.cousin.status])[0]}）`);
  await np.screenshot({ path: `${OUT}/narrow-2-work.png` });
  const cb = np.locator('#panel [data-cmd="fixCancel"]');
  check(await cb.isVisible(), '390px：「取消本次整理」可見');
  if (await cb.isVisible()) await cb.click();
  s = await snap(np);
  check(s.people.cousin.fixResult && s.people.cousin.fixResult.kind === 'canceled' && s.people.cousin.mode === 'fromFix', `390px：取消後停手返院（${s.people.cousin.status}）`);
  await np.screenshot({ path: `${OUT}/narrow-3-canceled.png` });
  check(N.errors.length === 0, `390px console 錯誤／警告：${N.errors.length ? N.errors.join(' | ') : '無'}`);

  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  await browser.close();
  console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + `\nERROR ${e.stack}\n`); process.exit(2); });
