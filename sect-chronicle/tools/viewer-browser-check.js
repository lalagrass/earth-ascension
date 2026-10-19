#!/usr/bin/env node
'use strict';
/*
 * SG-RT-02V：viewer 的真實瀏覽器操作紀錄。從正式入口開 rt-dev-000，按鍵盤開始、換 1／2／4 倍、暫停、
 * 模擬分頁進背景，再用 4× 播到 2700 tick，沿途截圖，最後把頁面上的世界 hash 和 Node 直接推進的結果比對。
 * 不注入世界、不呼叫推進 API；頁面只透過 window.sectViewer.snapshot() 讀狀態。
 *
 * Playwright 不是本專案依賴，需另外安裝。用法（repo 根目錄）：
 *   python3 -m http.server 8765 --directory sect-chronicle &
 *   NODE_PATH=$(npm root -g) node sect-chronicle/tools/viewer-browser-check.js /tmp/rt02v-browser
 * 完整紀錄寫到 <輸出目錄>/run2700.log，截圖在同一目錄。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const Realtime = require('../js/realtime.js');

const OUT = process.argv[2] || '/tmp/rt02v-browser';
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };

function refHash(seed, n) {
  let w = Realtime.createWorld(seed).state; let left = n;
  while (left > 0) { const r = Realtime.advanceTicks(w, left); w = r.state; left -= r.advancedTicks; }
  return Realtime.hashWorld(w);
}

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));
  const snap = () => page.evaluate(() => window.sectViewer.snapshot());
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); note('screenshot', name); };
  note('browser', browser.version(), 'headless Chromium (Playwright)');

  await page.goto(URL);
  note('entry', URL, 'visibility', await page.evaluate(() => document.visibilityState));
  await shot('01-setup');
  const setupText = await page.locator('#setup-settings').innerText();
  note('setup settings visible before start:', JSON.stringify(setupText.slice(0, 200)));
  let s = await snap();
  note('before start mode', s.mode, 'tick', s.tick);
  await page.waitForTimeout(1500);
  s = await snap();
  note('1.5s on setup screen -> tick', s.tick, '(expect 0)');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  s = await snap(); note('after Enter mode', s.mode, 'speed', s.speed);

  for (const key of ['1', '2', '4']) {
    await page.keyboard.press(key);
    const a = await snap(); const wa = Date.now();
    await page.waitForTimeout(5000);
    const b = await snap(); const wb = Date.now();
    note(`speed ${key}×: ${b.tick - a.tick} ticks in ${(wb - wa) / 1000}s (expect about ${4 * Number(key) * 5})`);
  }

  // 暫停：空白鍵，等 3 秒，再點人物（只改選取）
  await page.keyboard.press(' ');
  let a = await snap();
  await page.waitForTimeout(3000);
  await page.locator('#people [data-person]').first().click();
  await page.waitForTimeout(500);
  let b = await snap();
  note('pause (Space) 3.5s + select person: mode', b.mode, 'tick', a.tick, '->', b.tick, 'hash same', a.hash === b.hash);
  await shot('02-paused-selected');
  await page.keyboard.press(' ');

  // 背景：headless／Xvfb 沒有視窗管理器，最小化或切分頁都不會讓 Chromium 把頁面變 hidden（已實測）。
  // 因此改在頁面內把 document.hidden／visibilityState 設成背景值並送出 visibilitychange，觸發 app.js 的正式處理器。
  const setHidden = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await page.waitForTimeout(1000);
  a = await snap();
  await setHidden(true);
  await page.waitForTimeout(5000);
  b = await snap();
  note('emulated background 5s: visibility', await page.evaluate(() => document.visibilityState), 'mode', b.mode, 'autoPaused', b.autoPaused, 'tick', a.tick, '->', b.tick);
  await shot('03a-background-autopaused');
  await setHidden(false);
  await page.waitForTimeout(3000);
  const c = await snap();
  note('foreground again 3s: visibility', await page.evaluate(() => document.visibilityState), 'mode', c.mode, 'tick', c.tick, '(expect still paused, same tick)');
  await shot('03-after-background');
  await page.keyboard.press(' ');
  await page.waitForTimeout(1000);
  const d = await snap();
  note('resume (Space), 1s later: ticks advanced', d.tick - c.tick, '(4× expect about 16; the 5s background and 3s paused foreground are not replayed)');

  // 4× 走完觀察期，沿途取樣人物狀態並截圖
  const seen = new Map();
  const shots = [[600, '04-day4'], [1090, '05-recruited'], [1180, '06-after-breakthrough'], [2530, '07-past-2520'], [2700, '08-tick2700']];
  let next = 0;
  while (true) {
    s = await snap();
    if (s.mode === 'error') { note('ERROR', JSON.stringify(s.error)); break; }
    if (s.mode !== 'playing' && !(next < shots.length && shots[next][0] === 2700 && s.tick >= 2700)) { note('UNEXPECTED mode', s.mode, 'at tick', s.tick); break; }
    const states = await page.locator('#people .state').allInnerTexts();
    for (const st of states) seen.set(st, (seen.get(st) || 0) + 1);
    if (next < shots.length && s.tick >= shots[next][0]) {
      if (shots[next][0] === 2700) { await page.keyboard.press(' '); await page.waitForTimeout(200); }
      await shot(shots[next][1]); next += 1;
    }
    if (next >= shots.length) break;
    await page.waitForTimeout(250);
  }
  s = await snap();
  note('final mode', s.mode, 'tick', s.tick, 'totals', JSON.stringify(s.totals));
  const ref = refHash('rt-dev-000', s.tick);
  note('final hash', s.hash, 'node reference at same tick', ref, 'match', s.hash === ref);
  note('person states sampled:', JSON.stringify([...seen.entries()]));
  const evTypes = await page.locator('#events li[data-type]').evaluateAll((els) => els.map((e) => e.dataset.type));
  note('event list types on screen (latest 40):', JSON.stringify([...new Set(evTypes)]));
  note('console lines:', consoleLines.length, JSON.stringify(consoleLines));
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
  fs.writeFileSync(`${OUT}/run2700.log`, log.join('\n') + '\n');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
