#!/usr/bin/env node
// 短回歸（#175 審查 P2）：播放中下「本趟後休息」，用 Tab 把焦點移到面板的「取消」，等本趟進度確實更新多次，
// 焦點仍在「取消」上，按 Enter 真的取消待執行、不會改開水缸選單。寬畫面與 390px 各跑一次，只用真的鍵盤。
// 用法（在 experiments/water-carry 下，先 python3 -m http.server 8770）：
//   NODE_PATH=$(npm root -g) xvfb-run -a node checks/focus-check.js /tmp/v3-focus
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = path.resolve(process.argv[2] || '/tmp/v3-focus');
const URL = process.env.DEMO_URL || 'http://127.0.0.1:8770/demo/';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const fails = [];
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? (a.dataset.cmd || a.dataset.person || a.id || a.tagName) : 'body'; });
const bar = (page) => page.evaluate(() => document.querySelector('#panel .bar i')?.style.width);

async function run(browser, label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(URL);
  await page.waitForFunction(() => window.demo && window.demo.snapshot().frames > 3, null, { timeout: 30000 });
  await page.click('#roster [data-person="hero"]');
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Enter'); // 選中主角時開水缸選單，焦點在第一個可做的選項
  await page.waitForTimeout(200);
  check(await active(page) === 'restAfterTrip', `${label}：選單焦點在「本趟後休息」`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('4');
  let s = await snap(page);
  check(s.restOrder && s.playing && s.mode === 'carry', `${label}：播放中有待執行「本趟後休息」`);
  for (let i = 0; i < 40 && (await active(page)) !== 'cancel'; i += 1) await page.keyboard.press('Tab');
  check(await active(page) === 'cancel', `${label}：Tab 到面板的「取消」`);
  const t0 = s.tick, w0 = await bar(page);
  await page.waitForTimeout(1500);
  s = await snap(page);
  const w1 = await bar(page);
  check(s.tick - t0 > 120 && w1 !== w0 && s.restOrder && s.mode === 'carry', `${label}：等 1.5 秒，tick ${t0}→${s.tick}，進度 ${w0}→${w1}，仍在本趟`);
  const a = await active(page);
  check(a === 'cancel', `${label}：進度更新後焦點仍在「取消」（${a}）`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  s = await snap(page);
  check(!s.restOrder && !s.menu && s.playing, `${label}：Enter 真的取消待執行，沒有開選單，繼續播放`);
  check(errors.length === 0, `${label}：console 沒有錯誤或警告${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非 headless（xvfb）`);
  await run(browser, '寬畫面', { width: 1400, height: 820 });
  await run(browser, '390px', { width: 390, height: 780 });
  await browser.close();
  note(fails.length ? `FAIL ${fails.length} 項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/focus.log`, log.join('\n') + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/focus.log`, log.join('\n') + '\n'); process.exit(1); });
