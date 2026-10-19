#!/usr/bin/env node
'use strict';
/*
 * SG-RT-02V：viewer 的真實分頁背景驗證。不用 Playwright，也不改寫 document.hidden 或自己送 visibilitychange：
 * 啟動一般（非 headless）Chromium，經 DevTools Protocol 在同一視窗開新分頁，讓瀏覽器自己把 viewer 分頁轉成 hidden，
 * 再切回來。按鍵用 Input.dispatchKeyEvent 送進頁面；狀態只透過 window.sectViewer.snapshot() 讀。
 *
 * 需要 Node 22 以上（內建 fetch／WebSocket）、一個 Chromium 執行檔與圖形環境（Linux 可用 xvfb-run）。用法（repo 根目錄）：
 *   python3 -m http.server 8765 --directory sect-chronicle &
 *   CHROME=/path/to/chrome xvfb-run -a node sect-chronicle/tools/viewer-background-check.js /tmp/rt02v-background
 * 紀錄寫到 <輸出目錄>/background.log，最後一行是 PASS 或 FAIL 與原因；失敗時結束碼非零。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Realtime = require('../js/realtime.js');

const OUT = process.argv[2] || '/tmp/rt02v-background';
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.CDP_PORT || 9339);
const SEED = 'rt-dev-000';
const TOTAL_LIMIT_MS = 3 * 60 * 1000;
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CheckFailed extends Error {}
function check(ok, what) {
  if (!ok) throw new CheckFailed(what);
  note('ok', what);
}

function refHash(seed, n) {
  let w = Realtime.createWorld(seed).state;
  let left = n;
  while (left > 0) {
    const r = Realtime.advanceTicks(w, left);
    if (!r.ok || r.stopReason === 'error') throw new Error(`參考推進失敗：${JSON.stringify(r.error || r)}`);
    w = r.state;
    left -= r.advancedTicks;
  }
  return Realtime.hashWorld(w);
}

// 最小 CDP 連線：送指令、等對應 id 的回覆、收集事件。
async function connect(wsUrl, onEvent) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error(`無法連上 ${wsUrl}`)), { once: true });
  });
  let seq = 0;
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) {
      const { resolve, reject } = waiting.get(m.id);
      waiting.delete(m.id);
      if (m.error) reject(new Error(`${m.error.message}`));
      else resolve(m.result);
    } else if (m.method && onEvent) {
      onEvent(m);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    seq += 1;
    waiting.set(seq, { resolve, reject });
    ws.send(JSON.stringify({ id: seq, method, params }));
  });
  return { send, close: () => ws.close() };
}

async function main(box) {
  const t0 = Date.now();
  const profile = fs.mkdtempSync(path.join(OUT, 'profile-'));
  box.profile = profile;
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--window-size=1400,1100', URL,
  ], { stdio: 'ignore' });
  box.chrome = chrome;
  let version = null;
  for (let i = 0; i < 40 && !version; i += 1) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(250); }
  }
  check(version, `Chromium DevTools 已啟動：${version ? version.Browser : '無回應'}`);
  note('user agent', version['User-Agent']);
  check(!/Headless/.test(version['User-Agent']), '不是 headless 模式（分頁可見性由瀏覽器分頁列決定）');

  const browser = await connect(version.webSocketDebuggerUrl);
  box.browser = browser;
  const pages = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((t) => t.type === 'page');
  const target = pages.find((t) => t.url.startsWith(URL));
  check(target, `找到 viewer 分頁 ${URL}`);
  const problems = [];
  const visEvents = [];
  const page = await connect(target.webSocketDebuggerUrl, (m) => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      problems.push(`[${m.params.type}] ${m.params.args.map((x) => x.value).join(' ')}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      problems.push(`[exception] ${m.params.exceptionDetails.text}`);
    } else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'reportVisibility') {
      visEvents.push(m.params.payload);
    }
  });
  box.page = page;
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  // 只用來記錄瀏覽器自己送出的 visibilitychange；不改 document.hidden，也不自己 dispatch 事件。
  await page.send('Runtime.addBinding', { name: 'reportVisibility' });
  const evaluate = async (expression) => (await page.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  for (let i = 0; i < 40; i += 1) {
    if (await evaluate('document.readyState === "complete" && !!window.sectViewer')) break;
    await sleep(250);
  }
  await evaluate(`document.addEventListener('visibilitychange', () => reportVisibility(document.visibilityState + '@' + window.sectViewer.snapshot().tick))`);
  const snap = () => evaluate('window.sectViewer.snapshot()');
  const vis = () => evaluate('document.visibilityState');
  const key = async (k, code, keyCode, text) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, text });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode });
  };

  let s = await snap();
  check(s.mode === 'setup' && s.seed === SEED && s.tick === 0 && (await vis()) === 'visible', `開局：mode=${s.mode} seed=${s.seed} tick=${s.tick}`);
  await page.send('Page.bringToFront');
  await key('Enter', 'Enter', 13, '\r');
  await sleep(200);
  await key('4', 'Digit4', 52, '4');
  await sleep(3000);
  s = await snap();
  check(s.mode === 'playing' && s.speed === 4 && s.tick > 0, `Enter 開始、鍵 4 換 4×：mode=${s.mode} speed=${s.speed} tick=${s.tick}`);

  // 真實切背景：同視窗開新分頁，瀏覽器把 viewer 分頁轉成 hidden
  const other = await browser.send('Target.createTarget', { url: 'about:blank' });
  await sleep(500);
  const a = await snap();
  const hiddenState = await vis();
  check(hiddenState === 'hidden', `開新分頁後 viewer 分頁 visibilityState=${hiddenState}`);
  check(visEvents.some((x) => x.startsWith('hidden@')), `瀏覽器送出 visibilitychange（hidden）：${JSON.stringify(visEvents)}`);
  check(a.mode === 'paused' && a.autoPaused, `背景時自動暫停：mode=${a.mode} autoPaused=${a.autoPaused} tick=${a.tick}`);
  await sleep(5000);
  const b = await snap();
  check(b.mode === 'paused' && b.tick === a.tick && b.hash === a.hash, `背景 5 秒 tick ${a.tick}→${b.tick}，hash ${a.hash === b.hash ? '相同' : '不同'}`);

  // 切回 viewer 分頁
  await browser.send('Target.activateTarget', { targetId: target.id });
  await sleep(500);
  check((await vis()) === 'visible', '切回後 viewer 分頁 visibilityState=visible');
  check(visEvents.some((x) => x.startsWith('visible@')), `瀏覽器送出 visibilitychange（visible）：${JSON.stringify(visEvents)}`);
  await sleep(2500);
  const c = await snap();
  check(c.mode === 'paused' && c.tick === b.tick, `回前景 3 秒仍暫停：mode=${c.mode} tick=${c.tick}`);
  await key(' ', 'Space', 32, ' ');
  await sleep(1000);
  const d = await snap();
  // 若追趕背景 5 秒＋前景 3 秒，4× 會多出約 128 tick；正常只有約 16。
  check(d.mode === 'playing' && d.tick - c.tick >= 8 && d.tick - c.tick <= 24,
    `空白鍵繼續，1 秒推進 ${d.tick - c.tick} tick（4× 預期約 16，不追趕背景時間）`);
  await key(' ', 'Space', 32, ' ');
  await sleep(300);
  const e = await snap();
  const ref = refHash(SEED, e.tick);
  check(e.mode === 'paused' && e.hash === ref, `暫停在 tick ${e.tick}，頁面 hash ${e.hash} 等於 Node 直接推進的 ${ref}`);
  await browser.send('Target.closeTarget', { targetId: other.targetId });
  check(problems.length === 0, `console 沒有錯誤或警告（${problems.length} 行${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

(async () => {
  const box = {};
  const watchdog = setTimeout(() => {
    note('FAIL', `超過總時限 ${TOTAL_LIMIT_MS / 1000} 秒`);
    fs.writeFileSync(`${OUT}/background.log`, log.join('\n') + '\n');
    if (box.chrome) box.chrome.kill();
    process.exit(2);
  }, TOTAL_LIMIT_MS);
  let failed = null;
  try {
    await main(box);
  } catch (e) {
    failed = e;
  } finally {
    if (box.page) box.page.close();
    if (box.browser) box.browser.close();
    if (box.chrome && box.chrome.exitCode === null) {
      const exited = new Promise((r) => box.chrome.once('exit', r));
      box.chrome.kill();
      await Promise.race([exited, sleep(5000)]);
    }
    if (box.profile) {
      try { fs.rmSync(box.profile, { recursive: true, force: true }); } catch (err) { note('profile 未清掉', box.profile, err.code); }
    }
    clearTimeout(watchdog);
    note(failed ? 'FAIL' : 'PASS', failed ? (failed instanceof CheckFailed ? failed.message : (failed.stack || String(failed))) : '全部條件成立');
    fs.writeFileSync(`${OUT}/background.log`, log.join('\n') + '\n');
  }
  process.exit(failed ? 1 : 0);
})();
