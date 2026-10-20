#!/usr/bin/env node
// V3 的真實分頁背景驗證（沿用 tools/viewer-background-check.js 的作法）：不用 Playwright，也不改寫 document.hidden 或自己送
// visibilitychange。啟動一般（非 headless）Chromium，經 DevTools Protocol 在同一視窗開新分頁，讓瀏覽器自己把展示分頁轉成 hidden，
// 再切回來。滑鼠與按鍵用 Input.dispatch* 送進頁面；狀態只讀 window.demo.snapshot()。
// 需要 Node 22 以上（內建 fetch／WebSocket）、一個 Chromium 執行檔與圖形環境（Linux 可用 xvfb-run）。用法（在 experiments/water-carry 下）：
//   python3 -m http.server 8770 &
//   CHROME=/path/to/chrome xvfb-run -a node checks/background-check.js /tmp/v3-background
// 紀錄寫到 <輸出目錄>/background.log，最後一行是 PASS 或 FAIL；失敗時結束碼非零。
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || '/tmp/v3-background');
const URL = process.env.DEMO_URL || 'http://127.0.0.1:8770/demo/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.CDP_PORT || 9341);
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = a.join(' '); log.push(line); console.log(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class CheckFailed extends Error {}
const check = (ok, what) => { if (!ok) throw new CheckFailed(what); note('ok  ', what); };

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
      if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
    } else if (m.method && onEvent) onEvent(m);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { seq += 1; waiting.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params })); });
  return { send, close: () => ws.close() };
}

async function main(box) {
  const profile = fs.mkdtempSync(path.join(OUT, 'profile-'));
  box.profile = profile;
  box.chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,900', URL], { stdio: 'ignore' });
  let version = null;
  for (let i = 0; i < 40 && !version; i += 1) { try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(250); } }
  check(version && !/Headless/.test(version['User-Agent']), `一般（非 headless）Chromium：${version ? version.Browser : '無回應'}`);
  const browser = await connect(version.webSocketDebuggerUrl);
  box.browser = browser;
  const target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page' && t.url.startsWith(URL));
  check(target, `找到展示分頁 ${URL}`);
  const problems = [];
  const visEvents = [];
  const page = await connect(target.webSocketDebuggerUrl, (m) => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) problems.push(`[${m.params.type}] ${m.params.args.map((x) => x.value).join(' ')}`);
    else if (m.method === 'Runtime.exceptionThrown') problems.push(`[exception] ${m.params.exceptionDetails.text}`);
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'reportVisibility') visEvents.push(m.params.payload);
  });
  await page.send('Runtime.enable');
  await page.send('Runtime.addBinding', { name: 'reportVisibility' }); // 只記錄瀏覽器自己送出的事件
  const evaluate = async (expression) => (await page.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  for (let i = 0; i < 80; i += 1) { if (await evaluate('!!(window.demo && window.demo.snapshot().frames > 3)')) break; await sleep(250); }
  await evaluate(`document.addEventListener('visibilitychange', () => reportVisibility(document.visibilityState + '@' + window.demo.snapshot().tick))`);
  const snap = () => evaluate('window.demo.snapshot()');
  const vis = () => evaluate('document.visibilityState');
  const key = async (k, code, keyCode, text) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, text });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode });
  };
  const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  const hide = async () => { const o = await browser.send('Target.createTarget', { url: 'about:blank' }); await sleep(600); return o; };
  const show = async () => { await browser.send('Target.activateTarget', { targetId: target.id }); await sleep(600); };

  await page.send('Page.bringToFront');
  await key('4', 'Digit4', 52, '4');
  await sleep(1500);
  let s = await snap();
  check(s.playing && s.speed === 4 && s.tick > 0, `4× 播放中（tick ${s.tick}）`);

  // 一、選單暫停中轉背景：回來後選單還在、仍暫停；Esc 關選單也不會自己恢復播放
  await click(s.vatScreen.x, s.vatScreen.y);
  await sleep(300);
  s = await snap();
  check(s.menu === 'vat' && !s.playing && s.pausedByMenu, '點水缸：選單開著、自動暫停');
  const other = await hide();
  const a = await snap();
  check((await vis()) === 'hidden' && visEvents.some((x) => x.startsWith('hidden@')), `開新分頁：展示分頁 hidden，瀏覽器送出 visibilitychange ${JSON.stringify(visEvents)}`);
  check(a.autoPaused && !a.pausedByMenu && !a.playing, '背景：改記為自動暫停，收回選單的恢復權');
  await sleep(3000);
  check((await snap()).tick === a.tick, `背景 3 秒 tick 不動（${a.tick}）`);
  await show();
  s = await snap();
  check((await vis()) === 'visible' && !s.playing && s.menu === 'vat' && s.tick === a.tick, '切回：visible，仍暫停，選單還在，沒補 tick');
  await key('Escape', 'Escape', 27, '');
  await sleep(1000);
  s = await snap();
  check(!s.menu && !s.playing && s.tick === a.tick, 'Esc 關選單後仍暫停（V2 的反例：這裡以前會恢復播放）');
  await key(' ', 'Space', 32, ' ');
  await sleep(1000);
  const b = await snap();
  // 4× 每秒約 240 步；若追趕背景 3 秒會多出 720 步以上
  check(b.playing && b.tick - a.tick >= 120 && b.tick - a.tick <= 360, `空白鍵恢復，1 秒推進 ${b.tick - a.tick} 步（4× 預期約 240，不追趕背景時間）`);

  // 二、播放中轉背景：自動暫停、不推進，回來仍暫停
  await browser.send('Target.activateTarget', { targetId: other.targetId });
  await sleep(600);
  const c = await snap();
  check((await vis()) === 'hidden' && !c.playing && c.autoPaused, `播放中轉背景：自動暫停（tick ${c.tick}）`);
  await sleep(2000);
  await show();
  s = await snap();
  check(!s.playing && s.tick === c.tick, '切回仍暫停、沒補 tick');
  await browser.send('Target.closeTarget', { targetId: other.targetId });
  check(problems.length === 0, `console 沒有錯誤或警告${problems.length ? '：' + problems.slice(0, 3).join(' | ') : ''}`);
}

(async () => {
  const box = {};
  let ok = false;
  try { await main(box); ok = true; } catch (e) { note('FAIL', e instanceof CheckFailed ? e.message : e.stack || String(e)); }
  try { box.browser && box.browser.close(); } catch {}
  try { box.chrome && box.chrome.kill(); } catch {}
  await sleep(500);
  try { box.profile && fs.rmSync(box.profile, { recursive: true, force: true }); } catch {}
  if (ok) note('PASS 全部條件成立');
  fs.writeFileSync(path.join(OUT, 'background.log'), log.join('\n') + '\n');
  process.exit(ok ? 0 : 1);
})();
