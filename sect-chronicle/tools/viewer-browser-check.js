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
 * 完整紀錄寫到 <輸出目錄>/run2700.log，截圖在同一目錄。任何一項驗收條件不成立就丟錯：
 * 紀錄最後一行是 FAIL 與原因，結束碼非零；全部成立才是 PASS、結束碼 0。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const Realtime = require('../js/realtime.js');

const OUT = process.argv[2] || '/tmp/rt02v-browser';
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
const SEED = 'rt-dev-000';
const HORIZON = 2700;
const TOTAL_LIMIT_MS = 10 * 60 * 1000; // 整支腳本的上限；停播或卡住時不會永遠等下去
const PLAY_LIMIT_MS = 6 * 60 * 1000; // 4× 播完觀察期約 3 分鐘，留一倍餘裕
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };

class CheckFailed extends Error {}
function check(ok, what) {
  if (!ok) throw new CheckFailed(what);
  note('ok', what);
}

function refWorld(seed, n) {
  let w = Realtime.createWorld(seed).state;
  let left = n;
  while (left > 0) {
    const r = Realtime.advanceTicks(w, left);
    if (!r.ok || r.stopReason === 'error') throw new Error(`參考推進失敗：${JSON.stringify(r.error || r)}`);
    w = r.state;
    left -= r.advancedTicks;
  }
  return w;
}

async function main(browserBox) {
  const t0 = Date.now();
  const browser = await chromium.launch();
  browserBox.browser = browser;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  const snap = () => page.evaluate(() => window.sectViewer.snapshot());
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); note('screenshot', name); };
  note('browser', browser.version(), 'headless Chromium (Playwright)', 'url', URL, 'seed', SEED);

  // 開局：政策與目標在開始前可見；停在開局不推進
  await page.goto(URL);
  await shot('01-setup');
  const setupText = await page.locator('#setup-settings').innerText();
  note('setup settings:', JSON.stringify(setupText));
  check(setupText.includes('auto-free') && setupText.includes('目標順序'), '開始前顯示安穩發展政策與目標順序');
  let s = await snap();
  check(s.mode === 'setup' && s.seed === SEED && s.tick === 0, `開局畫面：mode=${s.mode} seed=${s.seed} tick=${s.tick}`);
  check(s.hash === Realtime.hashWorld(refWorld(SEED, 0)), '開局世界 hash 等於 Realtime.createWorld(seed)');
  await page.waitForTimeout(1500);
  s = await snap();
  check(s.mode === 'setup' && s.tick === 0, `停在開局 1.5 秒仍是 tick 0（實得 ${s.tick}）`);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  s = await snap();
  check(s.mode === 'playing' && s.speed === 1, `Enter 正式開始：mode=${s.mode} speed=${s.speed}`);

  // 倍速：每段 5 秒，容許 ±25%
  for (const key of ['1', '2', '4']) {
    await page.keyboard.press(key);
    const a = await snap();
    const wa = Date.now();
    await page.waitForTimeout(5000);
    const b = await snap();
    const secs = (Date.now() - wa) / 1000;
    const want = 4 * Number(key) * secs;
    const got = b.tick - a.tick;
    check(b.mode === 'playing' && b.speed === Number(key) && got >= want * 0.75 && got <= want * 1.25,
      `${key}× 播 ${secs.toFixed(2)} 秒推進 ${got} tick（預期約 ${want.toFixed(0)}）`);
  }

  // 暫停：空白鍵，等 3 秒再點人物（只改選取），tick 與 hash 都不動
  await page.keyboard.press(' ');
  let a = await snap();
  await page.waitForTimeout(3000);
  await page.locator('#people [data-person]').first().click();
  await page.waitForTimeout(500);
  let b = await snap();
  check(a.mode === 'paused' && b.mode === 'paused' && a.tick === b.tick && a.hash === b.hash,
    `空白鍵暫停 3.5 秒並點選人物：tick ${a.tick}→${b.tick}，hash ${a.hash === b.hash ? '相同' : '不同'}`);
  await shot('02-paused-selected');
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  check((await snap()).mode === 'playing', '空白鍵繼續播放');

  // 背景：headless／Xvfb 沒有視窗管理器，最小化或切分頁都不會讓 Chromium 把頁面變 hidden（已實測）。
  // 因此改在頁面內把 document.hidden／visibilityState 設成背景值並送出 visibilitychange，觸發 app.js 的正式處理器。
  // 這是模擬事件，不等於桌面瀏覽器真的切分頁。
  const setHidden = (hidden) => page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await page.waitForTimeout(700);
  await setHidden(true);
  a = await snap();
  await page.waitForTimeout(5000);
  b = await snap();
  check(a.mode === 'paused' && a.autoPaused && b.mode === 'paused' && b.tick === a.tick && b.hash === a.hash,
    `模擬背景 5 秒：自動暫停=${b.autoPaused}，tick ${a.tick}→${b.tick}`);
  await shot('03a-background-autopaused');
  await setHidden(false);
  await page.waitForTimeout(3000);
  const c = await snap();
  check(c.mode === 'paused' && c.tick === b.tick, `回前景 3 秒仍暫停：mode=${c.mode} tick=${c.tick}`);
  await shot('03-after-background');
  await page.keyboard.press(' ');
  await page.waitForTimeout(1000);
  const d = await snap();
  // 若追趕背景 5 秒＋前景 3 秒，4× 會多出約 128 tick；正常只有約 16。
  check(d.mode === 'playing' && d.tick - c.tick >= 8 && d.tick - c.tick <= 24,
    `繼續後 1 秒推進 ${d.tick - c.tick} tick（4× 預期約 16，不追趕背景與暫停時間）`);

  // 4× 播完觀察期，沿途取樣人物狀態並截圖
  const seen = new Map();
  const shots = [[600, '04-day4'], [1090, '05-recruited'], [1180, '06-after-breakthrough'], [2530, '07-past-2520']];
  let next = 0;
  const playStart = Date.now();
  for (;;) {
    s = await snap();
    if (s.mode !== 'playing') {
      throw new CheckFailed(`播放途中停了：tick ${s.tick}，mode=${s.mode}${s.error ? `，error=${JSON.stringify(s.error)}` : ''}`);
    }
    if (s.tick >= HORIZON) break;
    if (Date.now() - playStart > PLAY_LIMIT_MS) throw new CheckFailed(`${PLAY_LIMIT_MS / 1000} 秒內沒播到 tick ${HORIZON}（停在 ${s.tick}）`);
    for (const st of await page.locator('#people .state').allInnerTexts()) seen.set(st, (seen.get(st) || 0) + 1);
    if (next < shots.length && s.tick >= shots[next][0]) {
      await shot(shots[next][1]);
      next += 1;
    }
    await page.waitForTimeout(250);
  }
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  const end = await snap();
  await page.waitForTimeout(1000);
  const end2 = await snap();
  check(end.mode === 'paused' && end2.tick === end.tick && end2.hash === end.hash, `播完後暫停：tick ${end.tick}，1 秒後仍是 ${end2.tick}`);
  await shot('08-tick2700');
  note('totals', JSON.stringify(end.totals), 'lastStep', JSON.stringify(end.lastStep));
  check(end.tick >= HORIZON && end.tick < HORIZON + 8, `播到觀察期：tick ${end.tick}`);
  check(end.totals.breakthroughStops >= 1, `途中有 breakthroughResolved 停批並續推（${end.totals.breakthroughStops} 次）`);
  const ref = Realtime.hashWorld(refWorld(SEED, end.tick));
  check(end.hash === ref, `最終 hash ${end.hash} 等於 Node 直接推進到 tick ${end.tick} 的 ${ref}`);

  const labels = [...seen.keys()];
  note('person states sampled:', JSON.stringify([...seen.entries()]));
  check(labels.some((x) => x.includes('移動中')), '看到移動中');
  check(labels.some((x) => x.includes('工作中') && !x.startsWith('休養')), '看到工作中');
  check(labels.some((x) => x.startsWith('休養')), '看到休養（恢復）');
  check(labels.includes('等待'), '看到無效果等待');
  // 待決策只持續 1 tick（4× 下約 62 ms），每 250 ms 取樣不保證抓到；只記錄，不當成失敗條件。
  note(labels.includes('待決策') ? 'seen 待決策' : 'not sampled: 待決策（只持續 1 tick，取樣不保證抓到）');
  check(problems.length === 0, `console 沒有錯誤或警告（${problems.length} 行${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

(async () => {
  const box = {};
  const watchdog = setTimeout(() => {
    note('FAIL', `超過總時限 ${TOTAL_LIMIT_MS / 1000} 秒`);
    fs.writeFileSync(`${OUT}/run2700.log`, log.join('\n') + '\n');
    process.exit(2);
  }, TOTAL_LIMIT_MS);
  let failed = null;
  try {
    await main(box);
  } catch (e) {
    failed = e;
  } finally {
    if (box.browser) await box.browser.close().catch(() => {});
    clearTimeout(watchdog);
    note(failed ? 'FAIL' : 'PASS', failed ? (failed instanceof CheckFailed ? failed.message : (failed.stack || String(failed))) : '全部條件成立');
    fs.writeFileSync(`${OUT}/run2700.log`, log.join('\n') + '\n');
  }
  process.exitCode = failed ? 1 : 0;
})();
