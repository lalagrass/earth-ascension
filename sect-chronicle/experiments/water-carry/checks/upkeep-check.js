#!/usr/bin/env node
// LP-09（#232）：同一主入口，自然新局只開熟手「允許自主整理」（預選順手照看），等野豬真撞出損痕、離開視線，
// 看到候補（不占名額）→ 原趟交付／必要恢復／返院 → 正式走去動手一階 → 回生活；下一輪有限示範「取消整理意願」，
// 到下一次真碰撞前不搶回。390px 只驗新增設定／原因／取消。只用滑鼠／鍵盤下令，唯讀 snapshot 觀測，不注入狀態。
// 先在 repo 根目錄 python3 -m http.server 8818 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/upkeep-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8818/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 240000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1 });
  const page = await context.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(ENTRY_URL);
  await wait(page, () => window.demo && window.demo.snapshot().frames > 3);
  return { context, page, errors };
}
const pick = async (page, id) => { if ((await snap(page)).selected !== id) await page.click(`#roster [data-person="${id}"]`); };
const paused = async (page, fn) => { await page.click('#play'); const r = await fn(); await page.click('#play'); return r; };
const upText = async (page) => (await page.locator('#panel .auto.up').innerText()).replace(/\s+/g, ' ');

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;

  // 1. 新局：兩人都未允許；暫停中開熟手允許，tick 不動
  let s = await paused(page, async () => {
    await pick(page, 'cousin');
    const t0 = (await snap(page)).tick, txt = await upText(page);
    check(/未允許/.test(txt) && /尚未允許自主整理/.test(txt), `新局熟手：${txt}`);
    const pressed = await page.locator('#panel [data-up="early"]').getAttribute('aria-pressed');
    check(pressed === 'true', '預選「順手照看」');
    await page.click('#panel [data-up="allow"]');
    const after = await snap(page);
    check(after.tick === t0 && after.people.cousin.up.allow && !after.people.hero.up.allow && !after.people.cousin.auto.allow, `暫停中開熟手自主整理（tick ${t0}→${after.tick}；主角與護院開關不變），提示「${await page.locator('#toast').innerText()}」`);
    await page.screenshot({ path: `${OUT}/desk-1-allow.png` });
    return after;
  });
  await page.keyboard.press('4');

  // 2. 真碰撞 → 離開視線 → 候補（工作中，不占名額）
  await wait(page, () => window.demo.snapshot().people.cousin.up.wanting);
  s = await paused(page, async () => {
    const c = (await snap(page)).people.cousin, b = (await snap(page)).boar;
    check(b.contact > 0 && !b.seen && b.fixBy == null && !c.fix, `候補：接觸序號 ${b.contact}、損痕 ${b.marks}，野豬看不見；fix／名額都空（${c.status}）`);
    const txt = await upText(page), roster = await page.locator('#roster [data-person="cousin"]').innerText();
    check(/有意願.*尚未占名額/.test(txt) && /整理：/.test(roster), `面板原因「${txt.replace(/^.*?(護欄有損痕|損痕累積)/, '$1')}」；名冊卡有整理原因`);
    check(await page.locator('#panel [data-cmd="upCancel"]').isVisible(), '有「取消整理意願」');
    await page.screenshot({ path: `${OUT}/desk-2-want.png` });
    return snap(page);
  });
  const want = s.people.cousin, opp = s.boar.contact;

  // 3. 原趟交付／必要恢復／返院後，院中正式受理 → 走去 → 動手 → 清一階 → 回生活
  const seen = new Set();
  await page.evaluate(() => { window.__modes = []; const loop = () => { const c = window.demo.snapshot().people.cousin; if (window.__modes.at(-1) !== c.mode) window.__modes.push(c.mode); if (!c.fix || c.mode === 'carry' || c.mode === 'seated' || c.mode === 'back' || c.mode === 'toSeat' || c.mode === 'idle') requestAnimationFrame(loop); }; loop(); });
  await wait(page, () => { const c = window.demo.snapshot().people.cousin; return c.fix && c.fixSrc === 'auto'; });
  const modes = await page.evaluate(() => window.__modes);
  modes.forEach((m) => seen.add(m));
  s = await snap(page);
  check(s.people.cousin.mode === 'toFix' && s.boar.fixBy === 'cousin' && s.people.cousin.up.state === 'go', `正式受理（候補時 ${want.mode}，之後 ${modes.join('→')}）：${s.people.cousin.status}，名額＝熟手、來源 auto`);
  check(s.people.cousin.trips >= want.trips + (want.mode === 'carry' ? 1 : 0), `原趟交付入帳（趟次 ${want.trips} → ${s.people.cousin.trips}）`);
  await wait(page, () => { const c = window.demo.snapshot().people.cousin; return (c.mode === 'fix' && c.fixWork.k > 0.4) || !c.fix; });
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-3-work.png` }); return snap(page); });
  const marks0 = s.boar.marks, eWork = s.people.cousin.energy + s.people.cousin.fixWork.steps / 60;
  check(s.people.cousin.mode === 'fix', `動手中：${(await page.locator('#panel').innerText()).match(/整理護欄 \d+%[^\n]*/)?.[0] || s.people.cousin.status}；原因「${(await upText(page)).replace(/^.*(自己去整理[^ ]*).*$/, '$1')}」`);
  await wait(page, () => window.demo.snapshot().people.cousin.fixResult);
  s = await snap(page);
  check(s.people.cousin.fixResult.kind === 'done' && s.people.cousin.fixResult.src === 'auto' && s.boar.marks === marks0 - 1, `自己整理完一階：損痕 ${marks0} → ${s.boar.marks}`);
  check(Math.abs(eWork - s.people.cousin.energy - 8) < 0.05, `動手共扣 ${(eWork - s.people.cousin.energy).toFixed(2)} 精力（示意值 8）`);
  await wait(page, () => window.demo.snapshot().people.cousin.mode !== 'fromFix');
  s = await snap(page);
  check(!s.people.cousin.fixing && s.boar.fixBy == null && s.boar.upUsed && s.boar.contact === opp, `回生活：${s.people.cousin.status}；本輪已用（${await upText(page).then((t) => t.replace(/^.*(自己整理完[^ ]*).*$/, '$1'))}）`);
  await paused(page, () => page.screenshot({ path: `${OUT}/desk-4-back.png` }));

  // 4. 有限示範：下一輪候補時按「取消整理意願」，到再下一次真碰撞前不搶回
  await wait(page, (o) => { const s = window.demo.snapshot(); return s.boar.contact > o && s.people.cousin.up.wanting; }, opp, 300000);
  s = await paused(page, async () => {
    await pick(page, 'cousin');
    await page.click('#panel [data-cmd="upCancel"]');
    await page.screenshot({ path: `${OUT}/desk-5-cancel.png` });
    return snap(page);
  });
  const opp2 = s.boar.contact;
  check(!s.people.cousin.up.wanting && s.people.cousin.up.state === 'player' && !s.people.cousin.fix, `取消整理意願（第 ${opp2} 次接觸這輪）：${s.people.cousin.up.text}`);
  await wait(page, (o) => { const s = window.demo.snapshot(); return s.boar.contact > o || s.people.cousin.fix; }, opp2, 300000);
  s = await snap(page);
  check(!s.people.cousin.fix && s.boar.contact > opp2, `下一次真碰撞前沒有搶回（接觸 ${opp2} → ${s.boar.contact}）`);
  check(!s.people.hero.up.allow && !s.people.hero.auto.allow, '主角兩個開關始終未開');
  check(W.errors.length === 0, `桌面 console 錯誤／警告：${W.errors.length ? W.errors.join(' | ') : '無'}`);

  // 5. 390px：設定／傾向／原因／取消
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.click('#play');
  await pick(np, 'cousin');
  await np.locator('#panel .auto.up').scrollIntoViewIfNeeded();
  const ur = await rect(np, '#panel .auto.up');
  check(ur && ur.x >= 0 && ur.r <= 390, `390px：自主整理區塊在畫面寬度內（${JSON.stringify(ur)}）`);
  await np.click('#panel [data-up="allow"]');
  await np.click('#panel [data-up="late"]');
  let ns = await snap(np);
  check(ns.people.cousin.up.allow && ns.people.cousin.up.react === 'late' && await np.locator('#panel [data-up="late"]').getAttribute('aria-pressed') === 'true' && /到 3 階/.test(await upText(np)), `390px：允許並改「累積再整理」：${await upText(np)}`);
  await np.click('#panel [data-up="early"]');
  await np.screenshot({ path: `${OUT}/narrow-1-settings.png` });
  await np.click('#play');
  await np.keyboard.press('4');
  await wait(np, () => window.demo.snapshot().people.cousin.up.wanting);
  await np.click('#play');
  await np.locator('#panel [data-cmd="upCancel"]').scrollIntoViewIfNeeded();
  const cr = await rect(np, '#panel [data-cmd="upCancel"]');
  check(cr && cr.x >= 0 && cr.r <= 390, `390px：「取消整理意願」可見且在畫面內（${JSON.stringify(cr)}）`);
  await np.screenshot({ path: `${OUT}/narrow-2-want.png` });
  await np.click('#panel [data-cmd="upCancel"]');
  ns = await snap(np);
  check(ns.people.cousin.up.state === 'player', `390px：取消後原因「${ns.people.cousin.up.text}」`);
  await np.screenshot({ path: `${OUT}/narrow-3-canceled.png` });
  check(N.errors.length === 0, `390px console 錯誤／警告：${N.errors.length ? N.errors.join(' | ') : '無'}`);

  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  await browser.close();
  console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + `\nERROR ${e.stack}\n`); process.exit(2); });
