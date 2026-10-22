#!/usr/bin/env node
// LP-11（#238）：同一主入口真操作。桌面：自然新局由玩家派主角清理→等原趟交付→真走近→起手／接觸擊倒鼠1→換目標鼠2→
// 警覺鼠3目擊逃出界→無目標真返院回生活；再重來新局改熟練 fixture、前往中取消→走完當段返院。390px 只驗新增派遣／原因／取消／fixture 鎖定可讀。
// 只用滑鼠／鍵盤下令，唯讀 snapshot 觀測；不注入鼠／位置／精力。
// 先在 repo 根目錄 python3 -m http.server 8820 --directory sect-chronicle；無 X 時用 xvfb-run。PLAYWRIGHT_PATH、CHROMIUM、DEMO_URL 可覆寫。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/palm-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8820/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 180000) => page.waitForFunction(fn, arg, { timeout, polling: 10 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(ENTRY_URL);
  await wait(page, () => window.demo && window.demo.snapshot().frames > 3);
  return { context, page, errors };
}
const pick = async (page, id) => { if ((await snap(page)).selected !== id) await page.click(`#roster [data-person="${id}"]`); };
// 每畫面幀記主角位置：每 tick 位移超過 Lv5 空手上限（84／秒）或同 tick 位置變了都算失敗。
const trace = (page) => page.evaluate(() => {
  const tr = window.__trace = { max: 0, still: null, last: null, modes: new Set(), arm: false };
  const loop = () => {
    const s = window.demo.snapshot(), h = s.people.hero, l = tr.last;
    if (l && s.tick > l.tick) tr.max = Math.max(tr.max, Math.hypot(h.x - l.x, h.y - l.y) / (s.tick - l.tick));
    if (l && s.tick === l.tick && (h.x !== l.x || h.y !== l.y)) tr.still = s.tick;
    tr.modes.add(h.mode); if (s.palmArm.hero) tr.arm = true;
    tr.last = { tick: s.tick, x: h.x, y: h.y };
    requestAnimationFrame(loop);
  };
  loop();
});

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(s.rats.map((r) => r.mode).join() === 'sniff,sniff,sniff' && !s.clean, '新局：三鼠嗅地、沒有清理任務');
  check(await page.locator('#boar .rats .rat').count() === 3, '鼠卡列出三鼠編號與狀態');
  await pick(page, 'hero');
  const r0 = await snap(page);
  await page.mouse.move(r0.rats[1].screen.x, r0.rats[1].screen.y);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
  await trace(page);
  // 1. 玩家明派：搬運中→等交付
  await page.click('#boar [data-cmd="clean"]');
  s = await snap(page);
  check(s.clean && s.clean.by === 'hero' && s.clean.phase === 'wait' && s.people.hero.mode === 'carry', '派遣後占等待名額、原趟照走');
  check(/交付後去清理/.test(await page.textContent('#toast')), `提示：${await page.textContent('#toast')}`);
  check(await page.locator('#panel [data-palm="adept"][disabled]').count() === 1, '任務中掌法比較 fixture 鎖定');
  const trips0 = s.people.hero.trips;
  await page.keyboard.press('4');
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'toRat');
  s = await snap(page);
  check(s.people.hero.trips === trips0 + 1, '原趟完整交付一次後才出發');
  await page.keyboard.press('1');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.mode === 'toRat' && h.cleanLeg && h.pos.x < 930; });
  await page.screenshot({ path: path.join(OUT, 'desk-1-approach.png') });
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'windup');
  await wait(page, () => window.demo.snapshot().people.hero.palmStep.steps >= 20);
  s = await snap(page);
  check(s.palmArm.hero, '起手：掌法手臂疊圖顯示');
  check(/起手 → 鼠1/.test(await page.textContent('#panel')), '面板：起手 → 鼠1 與 tick 進度');
  await page.screenshot({ path: path.join(OUT, 'desk-2-windup.png') });
  await wait(page, () => window.demo.snapshot().rats[0].mode === 'down');
  await page.screenshot({ path: path.join(OUT, 'desk-3-hit.png') });
  s = await snap(page);
  check(s.people.hero.mode === 'recover' && s.clean.downs === 1, '接觸：鼠1擊倒一次，進入收勢');
  await wait(page, () => window.demo.snapshot().clean && window.demo.snapshot().clean.target === 2);
  await page.screenshot({ path: path.join(OUT, 'desk-4-turn.png') });
  await wait(page, () => window.demo.snapshot().rats[2].mode === 'flee');
  s = await snap(page);
  check(s.rats[1].mode === 'down', '鼠3 在鼠2 真受掌之後才逃');
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, 'desk-5-flee.png') });
  await wait(page, () => window.demo.snapshot().rats[2].mode === 'gone');
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'fromRat');
  check(/範圍內沒有有效目標/.test(await page.textContent('#panel')), '無目標結束原因可讀');
  await page.screenshot({ path: path.join(OUT, 'desk-6-return.png') });
  await page.keyboard.press('4');
  await wait(page, () => !window.demo.snapshot().clean);
  s = await snap(page);
  check(!['toRat', 'windup', 'recover', 'fromRat'].includes(s.people.hero.mode), `真返院後才釋放名額、回生活（${s.people.hero.mode}）`);
  check(s.rats.map((r) => r.mode).join() === 'down,down,gone', '結果：鼠1、鼠2 擊倒，鼠3 逃出界不追');
  await page.keyboard.press('1');
  await page.screenshot({ path: path.join(OUT, 'desk-7-life.png') });
  const tr = await page.evaluate(() => ({ max: window.__trace.max, still: window.__trace.still, modes: [...window.__trace.modes], arm: window.__trace.arm }));
  check(tr.max <= 84 / 60 + 1e-6 && tr.still == null, `主角每 tick 最大位移 ${tr.max.toFixed(3)}（不瞬移、同 tick 不動）`);
  check(['toRat', 'windup', 'recover', 'fromRat'].every((m) => tr.modes.includes(m)) && tr.arm, '看到前往／起手／收勢／返院與掌法疊圖');

  // 2. 新局：熟練 fixture、前往中取消→走完當段返院
  await page.click('#reset');
  await pick(page, 'hero');
  await page.click('#panel [data-palm="adept"]');
  s = await snap(page);
  check(s.people.hero.palm === 'adept' && s.rats.every((r) => r.mode === 'sniff'), '新局三鼠重設；無任務時可改熟練 fixture');
  await page.click('#boar [data-cmd="clean"]');
  await page.keyboard.press('4');
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'toRat');
  await page.keyboard.press('1');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.mode === 'toRat' && h.cleanLeg.k > 0.3 && h.cleanLeg.k < 0.7; });
  await page.click('#play');
  const before = (await snap(page)).people.hero.cleanLeg.to;
  await page.click('#panel [data-cmd="cleanCancel"]');
  check(/走完這段後返院/.test(await page.textContent('#toast')), `取消提示：${await page.textContent('#toast')}`);
  s = await snap(page);
  check(s.clean.phase === 'back' && s.people.hero.mode === 'toRat', '暫停中取消只記意圖，不推進');
  await page.screenshot({ path: path.join(OUT, 'desk-8-cancel.png') });
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'fromRat');
  s = await snap(page);
  check(Math.abs(s.people.hero.cleanLeg.from.x - before.x) < 1e-9 && Math.abs(s.people.hero.cleanLeg.from.y - before.y) < 1e-9, '走完當段才從段尾返院');
  check(await page.locator('#panel [data-cmd="cleanCancel"]').count() === 0, '返院中不再提供取消');
  await wait(page, () => !window.demo.snapshot().clean);
  check(true, '返院後釋放');
  check(W.errors.length === 0, `桌面 console 錯誤／警告 ${W.errors.length}${W.errors.length ? '：' + W.errors.slice(0, 3).join(' | ') : ''}`);
  await W.context.close();

  // 3. 390px：派遣／原因／取消／fixture 鎖定可讀
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await pick(np, 'hero');
  await np.click('#boar [data-cmd="clean"]');
  await pick(np, 'cousin');
  const cBtn = np.locator('#boar [data-cmd="clean"]');
  check(await cBtn.count() === 0 && /主角等待出發/.test(await np.textContent('#boar')), '390：熟手看到主角已占清理名額');
  check(/主角正在清理（全場只一份）/.test(await np.textContent('#panel')), '390：熟手面板說明全場只一份');
  await np.screenshot({ path: path.join(OUT, 'narrow-1-reason.png') });
  await pick(np, 'hero');
  check(await np.locator('#panel [data-cmd="cleanCancel"]').count() === 1 && await np.locator('#panel [data-palm][disabled]').count() === 2, '390：主角面板有取消清理、fixture 鎖定');
  check(!overlap(await rect(np, '#boar'), await rect(np, '#panel')), '390：鼠卡與面板不重疊');
  await np.screenshot({ path: path.join(OUT, 'narrow-2-panel.png') });
  await np.click('#panel [data-cmd="cleanCancel"]');
  s = await snap(np);
  check(!s.clean, '390：等待中取消立即釋放');
  check(N.errors.length === 0, `390 console 錯誤／警告 ${N.errors.length}${N.errors.length ? '：' + N.errors.slice(0, 3).join(' | ') : ''}`);
  await N.context.close();
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'check.log'), log.join('\n') + '\n');
  note(fails.length ? `FAIL ${fails.length}` : `PASS ${log.filter((l) => l.startsWith('ok')).length}/${log.filter((l) => /^(ok|FAIL)/.test(l)).length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); fs.writeFileSync(path.join(OUT, 'check.log'), log.join('\n') + '\n' + e.stack + '\n'); process.exit(2); });
