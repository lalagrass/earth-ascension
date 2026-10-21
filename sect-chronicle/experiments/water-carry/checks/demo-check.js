#!/usr/bin/env node
// V3 一條真實操作：在一般（非 headless）Chromium 裡打開 demo/，只用真的滑鼠與鍵盤操作，
// 背景切分頁見 checks/background-check.js。
// 只讀頁面公開的唯讀狀態 window.demo.snapshot()。任何一項不成立就印 FAIL、結束碼 1。
// 用法（在 experiments/water-carry 下，先 python3 -m http.server 8770）：
//   NODE_PATH=$(npm root -g) xvfb-run -a node checks/demo-check.js /tmp/v3-check
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = path.resolve(process.argv[2] || '/tmp/v3-check');
const URL = process.env.DEMO_URL || 'http://127.0.0.1:8770/demo/';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const fails = [];
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const results = {};

async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  const t = Date.now();
  await page.goto(URL);
  await page.waitForFunction(() => window.demo && window.demo.snapshot().frames > 3, null, { timeout: 30000 });
  return { context, page, errors, loadMs: Date.now() - t };
}
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const waitFor = (page, fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const rect = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el || el.hidden || !el.offsetHeight) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
// 由實際 Pixi bounds 反推腳底，能抓到漏用 atlas resolution／anchor 或翻面後位移。
function checkSheet(s, label) {
  const { bounds: b, anchor: a } = s.sprite;
  const x = b.x + b.w * (s.face > 0 ? a.x : 1 - a.x), y = b.y + b.h * a.y;
  check(s.sprite.resolution === 2 && s.sprite.scale.y === 1 && Math.abs(b.w - s.sprite.width * s.cam.zoom) < .1,
    `${label}：2× atlas 正確換回場景尺寸，不再縮一半`);
  check(Math.abs(x - s.footScreen.x) < .1 && Math.abs(y - s.footScreen.y) < .1,
    `${label}：實際 sprite 腳底與權威位置相同（face ${s.face}）`);
  check(s.tapScreen.w >= 43.99 && s.tapScreen.h >= 43.99, `${label}：螢幕點選範圍至少 44×44px`);
}

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非 headless（${process.platform}），WebGL 走 SwiftShader`);

  // ---------- 寬畫面：自主挑水、成長、介入、背景、重來 ----------
  const W = await open(browser, { width: 1400, height: 820 });
  const page = W.page;
  results.loadMs = W.loadMs;
  note(`開頁到可操作 ${W.loadMs} ms`);
  let s = await snap(page);
  check(s.mode === 'carry' && s.playing, `自主：沒有下令，主角自己出發挑水（${s.status}）`);
  await page.click('#play');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('-');
  s = await snap(page);
  checkSheet(s, '空桶下山／平移縮放後');
  const frozenSheetTick = s.tick;
  // 點在身體左邊、44px padding 內；不是點扁擔或假定舊版 78px 高碰框。
  await page.mouse.click(s.tapScreen.x + 1, s.tapScreen.y + s.tapScreen.h / 2);
  await page.waitForTimeout(200);
  s = await snap(page);
  check(s.selected === 'hero' && s.tick === frozenSheetTick, '平移縮放後點身體框外的 padding 仍選到主角，暫停零進度');
  await page.click('#roster [data-person="hero"]');
  await page.keyboard.press('0');
  await page.click('#play');
  await page.screenshot({ path: `${OUT}/wide-observe.png` });

  await page.keyboard.press('4');
  const t4 = Date.now();
  await waitFor(page, () => window.demo.snapshot().trips >= 1);
  s = await snap(page);
  const trip1 = { ...s.lastTrip, realMs: Date.now() - t4 };
  check(s.lastTrip.level === 1 && s.level === 2, `第 1 趟（出發時 Lv 1）倒完水才升到 Lv ${s.level}`);
  check(s.vat === 4, `入帳一次：水缸 3 → ${s.vat} 擔`);
  check(Math.abs(s.lastTrip.seconds - s.tripSecondsInitial) < 0.02, `第 1 趟遊戲時間 ${s.lastTrip.seconds.toFixed(2)} 秒＝初始整趟 ${s.tripSecondsInitial.toFixed(2)} 秒`);
  const t5 = Date.now();
  await waitFor(page, () => window.demo.snapshot().trips >= 2);
  s = await snap(page);
  const trip2 = { ...s.lastTrip, realMs: Date.now() - t5 };
  check(trip2.level === 2 && trip2.seconds < trip1.seconds, `同倍率 4×：第 2 趟（Lv 2）${trip2.seconds.toFixed(2)} 秒 < 第 1 趟 ${trip1.seconds.toFixed(2)} 秒`);
  results.trips = [trip1, trip2];
  note(`實際耗時（4×）：第 1 趟 ${(trip1.realMs / 1000).toFixed(1)} 秒、第 2 趟 ${(trip2.realMs / 1000).toFixed(1)} 秒；遊戲時間 ${trip1.seconds.toFixed(1)}／${trip2.seconds.toFixed(1)} 秒`);
  check(Math.abs(trip1.realMs / 1000 - trip1.seconds / 4) < 2.5, '4× 播放：實際耗時約為遊戲時間的四分之一（容許 2.5 秒排程誤差）');

  // 到 Lv 3：換成長後步態，影子在後面
  await waitFor(page, () => { const v = window.demo.snapshot(); return v.tripLevel >= 3 && v.phase === 'up'; }, null, 90000);
  await page.waitForTimeout(1500);
  s = await snap(page);
  check(s.requestedAction === 'walkGrown' && (s.action === 'walkGrown' || s.fallback), `Lv ${s.tripLevel} 上山要求共用成長步態，缺幀才依模板退回（${s.frame}，fallback ${s.fallback}）`);
  checkSheet(s, '成長後負重／反向走路');
  check(s.ghostVisible && (s.shadow === 'up' || s.shadow === 'dip' || s.shadow === 'down'), `初始腳力影子在路上（${s.shadow}），主角已在上山`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/wide-grown.png` });
  await page.keyboard.press('Space');

  // 介入：1× 下點主角、點水缸（自動暫停）、Enter 下「本趟後休息」
  await page.keyboard.press('1');
  await waitFor(page, () => { const v = window.demo.snapshot(); return v.mode === 'carry' && (v.phase === 'down' || v.phase === 'up'); });
  s = await snap(page);
  await page.mouse.click(s.heroScreen.x, s.heroScreen.y);
  await waitFor(page, () => window.demo.snapshot().selected === 'hero', null, 3000).catch(() => {});
  s = await snap(page);
  check(s.selected === 'hero' && !!(await rect(page, '#panel')), '點主角：選取並打開工作／腳力面板');
  await page.mouse.click(s.vatScreen.x, s.vatScreen.y);
  await page.waitForTimeout(150);
  s = await snap(page);
  check(s.menu === 'vat' && !s.playing && s.pausedByMenu, '點水缸：開選單並自動暫停');
  const frozen = s.tick;
  await page.waitForTimeout(1000);
  check((await snap(page)).tick === frozen, `選單開著時世界不前進（tick ${frozen}）`);
  check(!overlap(await rect(page, '#menu'), await rect(page, '#panel')), '選單不蓋住工作面板');
  await page.screenshot({ path: `${OUT}/wide-intervene.png` });
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.dataset.cmd);
  check(focused === 'restAfterTrip', `鍵盤焦點落在第一個可做的選項（${focused}）`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  s = await snap(page);
  check(s.restOrder && !s.menu && s.playing && s.mode === 'carry', '下令「本趟後休息」：待執行、選單關閉、恢復播放，主角沒有當場停工');
  await page.screenshot({ path: `${OUT}/wide-pending.png` });
  await page.keyboard.press('4');
  const tripsBefore = s.trips;
  await waitFor(page, (n) => window.demo.snapshot().trips > n, tripsBefore);
  await page.waitForTimeout(2000);
  s = await snap(page);
  check(s.resting && s.mode === 'idle' && s.trips === tripsBefore + 1, `倒完這趟才休息，之後不再自己出發（已挑 ${s.trips} 趟）`);
  check(s.requestedAction === 'rest' && s.action === 'idle' && s.fallback, '主角缺坐下幀，如實沿用模板待機 fallback；沒有新增休息素材');
  await page.screenshot({ path: `${OUT}/wide-rest.png` });

  // 從泉水選單「開始挑水」
  await page.keyboard.press('1');
  s = await snap(page);
  await page.mouse.click(s.springScreen.x, s.springScreen.y);
  await page.waitForTimeout(150);
  await page.click('#menu [data-cmd="start"]');
  await page.waitForTimeout(200);
  s = await snap(page);
  check(s.mode === 'carry' && !s.resting && s.playing, '點泉水→「開始挑水」：重新出發並恢復播放');

  // 背景切分頁另由 checks/background-check.js 用真的分頁列驗（Playwright 的每個分頁各自一個視窗，不會轉成 hidden）

  // 重來
  await page.click('#reset');
  await page.waitForTimeout(200);
  s = await snap(page);
  check(s.level === 1 && s.trips === 0 && s.vat === 3 && s.tick < 60, `重來：腳力 Lv 1、0 趟、水缸 3 擔，時間從頭算（tick ${s.tick}）`);
  results.wideConsole = W.errors;
  check(W.errors.length === 0, `console 沒有錯誤或警告${W.errors.length ? '：' + W.errors.slice(0, 3).join(' | ') : ''}`);
  await W.context.close();

  // ---------- 390px：面板、名冊、橫幅、提示、選單互不遮擋；鍵盤可用 ----------
  const N = await open(browser, { width: 390, height: 780 });
  const np = N.page;
  await np.click('#play');
  s = await snap(np);
  checkSheet(s, '390px／DPR 2');
  await np.mouse.click(s.tapScreen.x + 1, s.tapScreen.y + s.tapScreen.h / 2);
  await np.waitForTimeout(200);
  check((await snap(np)).selected === 'hero', '390px／DPR 2：身體外 padding 也能點選');
  await np.click('#roster [data-person="hero"]');
  await np.click('#play');
  await np.click('#roster [data-person="hero"]');
  await np.waitForTimeout(800);
  await np.evaluate(() => document.activeElement.blur()); // 焦點回到場景，Enter 才是「對選中的人開水缸選單」
  const R = { hud: await rect(np, '.hud'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster') };
  check(R.panel && !overlap(R.panel, R.roster) && !overlap(R.panel, R.hud), '390px：面板在名冊與 HUD 之間，不互相遮擋');
  s = await snap(np);
  check(s.heroScreen.y > R.hud.b && s.heroScreen.y < R.panel.y, `390px：鏡頭跟著主角，主角在 HUD 與面板之間（y ${Math.round(s.heroScreen.y)}）`);
  await np.screenshot({ path: `${OUT}/narrow-panel.png` });
  await np.keyboard.press('Enter');
  await np.waitForTimeout(400);
  const M = { menu: await rect(np, '#menu'), banner: await rect(np, '#banner'), roster: await rect(np, '#roster'), hud: await rect(np, '.hud') };
  check((await snap(np)).menu === 'vat' && !overlap(M.menu, M.roster) && !overlap(M.menu, M.banner) && !overlap(M.banner, M.hud), '390px：Enter 開水缸選單，選單、橫幅、名冊、HUD 互不遮擋');
  await np.screenshot({ path: `${OUT}/narrow-menu.png` });
  await np.keyboard.press('Tab');
  const inMenu = await np.evaluate(() => !!document.activeElement.closest('.menu'));
  check(inMenu, '390px：Tab 焦點留在選單裡');
  await np.keyboard.press('Enter');
  await np.waitForTimeout(400);
  const T = { toast: await rect(np, '#toast'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster'), hud: await rect(np, '.hud'), banner: await rect(np, '#banner') };
  check(T.toast && !overlap(T.toast, T.panel) && !overlap(T.toast, T.roster) && !overlap(T.toast, T.hud) && !overlap(T.toast, T.banner), '390px：下令後的提示不蓋住面板、名冊、HUD');
  check(!!(await np.$('#panel [data-cmd="cancel"]')), '390px：面板出現待執行卡與「取消」');
  await np.screenshot({ path: `${OUT}/narrow-pending.png` });
  await np.click('#panel [data-cmd="cancel"]');
  await np.waitForTimeout(200);
  check(!(await snap(np)).restOrder, '390px：取消待執行');
  results.narrowConsole = N.errors;
  check(N.errors.length === 0, `390px console 沒有錯誤或警告${N.errors.length ? '：' + N.errors.slice(0, 3).join(' | ') : ''}`);
  await N.context.close();
  await browser.close();

  note(fails.length ? `FAIL ${fails.length} 項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1) + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n'); process.exit(1); });
