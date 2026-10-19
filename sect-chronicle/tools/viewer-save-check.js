#!/usr/bin/env node
'use strict';
/*
 * SG-RT-03a：viewer 存讀的真實瀏覽器紀錄。和 viewer-background-check.js 一樣不用 Playwright：啟動一般（非 headless）Chromium，
 * 經 DevTools Protocol 送鍵盤與滑鼠事件、重新整理頁面、開第二個分頁、指定匯入檔。狀態只讀 window.sectViewer 的唯讀資訊，
 * 世界一律和 Node 直接推進的 hash 比對。只有「壞檔恢復」一段會刻意改壞 localStorage 的一槽，模擬存檔損壞（紀錄中標明）。
 *
 * 需要 Node 22 以上、Chromium 執行檔與圖形環境（Linux 用 xvfb-run）。用法（repo 根目錄）：
 *   python3 -m http.server 8765 --directory sect-chronicle &
 *   CHROME=/path/to/chrome xvfb-run -a node sect-chronicle/tools/viewer-save-check.js /tmp/rt03a-save
 * 紀錄寫到 <輸出目錄>/save.log，最後一行是 PASS 或 FAIL 與原因；失敗時結束碼非零。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Realtime = require('../js/realtime.js');
const Storage = require('../js/storage.js');

const OUT = path.resolve(process.argv[2] || '/tmp/rt03a-save');
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.CDP_PORT || 9341);
const SEED = 'rt-dev-000';
const TOTAL_LIMIT_MS = 6 * 60 * 1000;
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CheckFailed extends Error {}
function check(ok, what) {
  if (!ok) throw new CheckFailed(what);
  note('ok', what);
}

function advanceTo(world, tick) {
  let w = world;
  while (w.clock.tick < tick) {
    const r = Realtime.advanceTicks(w, tick - w.clock.tick);
    if (!r.ok || r.stopReason === 'error') throw new Error(`參考推進失敗：${JSON.stringify(r.error || r)}`);
    w = r.state;
  }
  return w;
}
const refHash = (tick) => Realtime.hashWorld(advanceTo(Realtime.createWorld(SEED).state, tick));

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

// 一個分頁的操作：讀狀態、按鍵、點按鈕（依元素位置送真實滑鼠事件）、自動接受 confirm 並記下內容。
async function openPage(target, problems, dialogs, label) {
  let page;
  const conn = await connect(target.webSocketDebuggerUrl, (m) => {
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      problems.push(`[${label} ${m.params.type}] ${m.params.args.map((x) => x.value).join(' ')}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      problems.push(`[${label} exception] ${m.params.exceptionDetails.text}`);
    } else if (m.method === 'Page.javascriptDialogOpening') {
      dialogs.push(`${label}: ${m.params.message}`);
      page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
  });
  page = conn;
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('DOM.enable');
  const evaluate = async (expression) => {
    const r = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate 失敗：${expression}：${r.exceptionDetails.text}`);
    return r.result.value;
  };
  const ready = async () => {
    for (let i = 0; i < 80; i += 1) {
      if (await evaluate('document.readyState === "complete" && !!window.sectViewer').catch(() => false)) return;
      await sleep(100);
    }
    throw new CheckFailed(`${label} 頁面沒有載入完成`);
  };
  const key = async (k, code, keyCode, text) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, text });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode });
  };
  const click = async (selector) => {
    const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.offsetParent === null) return null;
      el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!box) throw new CheckFailed(`${label} 找不到可點的 ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    }
  };
  return {
    send: page.send, close: page.close, evaluate, ready, key, click,
    snap: () => evaluate('window.sectViewer.snapshot()'),
    save: () => evaluate('window.sectViewer.saveInfo()'),
    text: (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`),
  };
}

async function waitFor(fn, what, limitMs = 15000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > limitMs) throw new CheckFailed(`等不到：${what}`);
    await sleep(150);
  }
}

async function main(box) {
  const t0 = Date.now();
  const profile = fs.mkdtempSync(path.join(OUT, 'profile-'));
  box.profile = profile;
  const downloads = path.join(OUT, 'downloads');
  fs.rmSync(downloads, { recursive: true, force: true });
  fs.mkdirSync(downloads, { recursive: true });
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
  check(!/Headless/.test(version['User-Agent']), '不是 headless 模式');
  const browser = await connect(version.webSocketDebuggerUrl);
  box.browser = browser;
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  const list = async () => (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((t) => t.type === 'page');
  const target = (await list()).find((t) => t.url.startsWith(URL));
  check(target, `找到 viewer 分頁 ${URL}`);
  const problems = [];
  const dialogs = [];
  const tab1 = await openPage(target, problems, dialogs, 'tab1');
  box.pages = [tab1];
  await tab1.ready();

  // 1. 新瀏覽器設定檔：沒有存檔，可以寫
  let info = await tab1.save();
  check(info.storage === 'empty' && info.canWrite === true, `新設定檔沒有存檔且可寫：storage=${info.storage} canWrite=${info.canWrite}`);

  // 2. 開局 4× 播放，跨過兩個日界：每日自動保存
  await tab1.send('Page.bringToFront');
  await tab1.key('Enter', 'Enter', 13, '\r');
  await sleep(150);
  await tab1.key('4', 'Digit4', 52, '4');
  await waitFor(async () => (await tab1.snap()).tick > 380, '播到 tick 380 以上', 60000);
  info = await tab1.save();
  check(info.status.saved && info.status.saved.tick >= 360 && info.pointer && info.pointer.seq >= 2,
    `播放中跨日自動保存：已保存 tick ${info.status.saved && info.status.saved.tick}，指標 seq ${info.pointer && info.pointer.seq}，槽 ${info.active}`);
  note('跨日保存落點 tick', info.status.saved.tick, '（幀末世界，落點不必是 180 的倍數）');

  // 3. 空白鍵暫停：自動保存目前世界
  await tab1.key(' ', 'Space', 32, ' ');
  const paused = await waitFor(async () => { const s = await tab1.snap(); const v = await tab1.save(); return s.mode === 'paused' && v.status.saved && v.status.saved.tick === s.tick && !v.status.dirty ? { s, v } : null; }, '暫停後保存完成');
  check(true, `暫停自動保存：tick ${paused.s.tick}，revision ${paused.s.revision}，${paused.v.lastSave.bytes} bytes，保存 ${paused.v.lastSave.ms} ms，槽 ${paused.v.active}`);
  const pausedHash = paused.s.hash;
  check(pausedHash === refHash(paused.s.tick), `暫停時頁面 hash 等於 Node 推進到 tick ${paused.s.tick}`);
  const statusText = await tab1.text('#save-status');
  check(statusText.startsWith('已保存'), `畫面顯示保存狀態：${statusText}`);

  // 4. 重新整理：回到開局畫面，存檔清單列出剛才那份；讀取後保持暫停、不補離線 tick
  await tab1.send('Page.reload');
  await sleep(500);
  await tab1.ready();
  info = await tab1.save();
  check(info.storage === 'ok' && info.slots[info.active].tick === paused.s.tick && info.owned === false,
    `重新整理後有存檔：active ${info.active} tick ${info.slots[info.active].tick}，本分頁尚未接續（owned=${info.owned}）`);
  await tab1.click('#load-saved');
  const loaded = await waitFor(async () => { const s = await tab1.snap(); return s.mode === 'paused' && s.tick === paused.s.tick ? s : null; }, '讀取存檔');
  check(loaded.hash === pausedHash && JSON.stringify(loaded.rngState) === JSON.stringify(paused.s.rngState),
    `讀取後 tick ${loaded.tick}、hash 與 rngState 和保存時相同`);
  info = await tab1.save();
  check(info.owned === true && info.status.dirty === false && info.lastLoad, `讀取並接續：owned=${info.owned}、dirty=${info.status.dirty}、載入 ${info.lastLoad.ms} ms`);
  await sleep(2000);
  check((await tab1.snap()).tick === paused.s.tick, '讀取後 2 秒仍停在同一 tick，不補離線時間');

  // 5. 繼續播放後暫停，與 Node 直接推進比對（續玩一致）
  await tab1.key(' ', 'Space', 32, ' ');
  await waitFor(async () => (await tab1.snap()).tick > paused.s.tick + 150, '續玩 150 tick 以上', 60000);
  await tab1.key(' ', 'Space', 32, ' ');
  await sleep(300);
  const resumed = await tab1.snap();
  check(resumed.mode === 'paused' && resumed.hash === refHash(resumed.tick), `續玩到 tick ${resumed.tick}，hash 等於 Node 不中斷推進`);
  await waitFor(async () => !(await tab1.save()).status.dirty, '續玩後暫停保存完成');

  // 6. 匯出：下載的檔案可被 Storage.readSave 讀回同一個世界
  await tab1.click('#export');
  const expectName = `sect-chronicle-${SEED}-t${resumed.tick}.json`;
  const exported = await waitFor(async () => (fs.existsSync(path.join(downloads, expectName)) ? path.join(downloads, expectName) : null), `下載 ${expectName}`);
  const back = Storage.readSave(fs.readFileSync(exported, 'utf8'));
  check(back.ok && Realtime.hashWorld(back.world) === resumed.hash, `匯出檔 ${expectName} 讀回 hash 相同（${fs.statSync(exported).size} bytes）`);

  // 7. 第二個分頁：讀取並接續、立即保存；第一個分頁收到 storage 事件後停自動保存，不覆蓋
  const created = await browser.send('Target.createTarget', { url: URL });
  await sleep(800);
  const t2info = (await list()).find((t) => t.id === created.targetId);
  const tab2 = await openPage(t2info, problems, dialogs, 'tab2');
  box.pages.push(tab2);
  await tab2.ready();
  await tab2.click('#load-saved');
  await waitFor(async () => (await tab2.snap()).mode === 'paused', 'tab2 讀取存檔');
  await tab2.key(' ', 'Space', 32, ' ');
  await waitFor(async () => (await tab2.snap()).tick > resumed.tick + 20, 'tab2 播放', 30000);
  await tab2.key(' ', 'Space', 32, ' ');
  const t2 = await waitFor(async () => { const v = await tab2.save(); return v.status.saved && !v.status.dirty && v.status.saved.tick > resumed.tick ? v : null; }, 'tab2 暫停保存');
  check(true, `tab2 接續後保存到 tick ${t2.status.saved.tick}（指標 seq ${t2.pointer.seq}）`);
  await browser.send('Target.activateTarget', { targetId: target.id });
  await sleep(500);
  const t1after = await waitFor(async () => { const v = await tab1.save(); return v.status.stopped ? v : null; }, 'tab1 收到外部改動');
  check(t1after.status.stopped.code === 'external_change', `tab1 停自動保存：${t1after.status.stopped.code}`);
  const seqBefore = t1after.pointer.seq;
  await tab1.key(' ', 'Space', 32, ' ');
  await sleep(1200);
  await tab1.key(' ', 'Space', 32, ' ');
  await sleep(500);
  const t1check = await tab1.save();
  check(t1check.pointer.seq === seqBefore && t1check.slots[t1check.active].tick === t2.status.saved.tick,
    `tab1 播放後暫停沒有寫入：指標 seq 仍是 ${t1check.pointer.seq}，active 仍是 tab2 的 tick ${t1check.slots[t1check.active].tick}`);
  // 明確接管：立即保存並確認
  const dialogsBefore = dialogs.length;
  await tab1.click('#save-now');
  const taken = await waitFor(async () => { const v = await tab1.save(); return v.pointer.seq > seqBefore && !v.status.stopped ? v : null; }, 'tab1 確認接管後保存');
  check(dialogs.length > dialogsBefore, `接管前有確認對話框：${JSON.stringify(dialogs.slice(dialogsBefore))}`);
  const backupSlot = taken.active === 'a' ? 'b' : 'a';
  check(taken.slots[backupSlot].tick === t2.status.saved.tick, `接管後 tab2 那份留作備份（槽 ${backupSlot} tick ${taken.slots[backupSlot].tick}）`);
  await tab2.close();
  await browser.send('Target.closeTarget', { targetId: created.targetId });

  // 8. 匯入第 15 天（tick 2700）的存檔：量載入與保存時間、大小，續玩一致
  const big = advanceTo(Realtime.createWorld(SEED).state, 2700);
  const bigEnv = Storage.makeEnvelope(big, new Date().toISOString());
  const bigFile = path.join(OUT, `import-${SEED}-t2700.json`);
  fs.writeFileSync(bigFile, bigEnv.text);
  const doc = await tab1.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await tab1.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#import-file' });
  await tab1.send('DOM.setFileInputFiles', { nodeId, files: [bigFile] });
  const imported = await waitFor(async () => { const s = await tab1.snap(); return s.tick === 2700 ? s : null; }, '匯入 tick 2700');
  info = await tab1.save();
  check(imported.mode === 'paused' && imported.hash === Realtime.hashWorld(big) && info.status.dirty === true,
    `匯入 tick 2700：保持暫停、hash 相同、尚未保存（dirty=${info.status.dirty}），載入 ${info.lastLoad.ms} ms`);
  check(info.slots[info.active].tick !== 2700, '匯入只換記憶體，沒有自動寫入 localStorage');
  await tab1.click('#save-now');
  const bigSaved = await waitFor(async () => { const v = await tab1.save(); return v.status.saved && v.status.saved.tick === 2700 && !v.status.dirty ? v : null; }, '保存 tick 2700');
  check(true, `tick 2700 存檔 ${bigSaved.lastSave.bytes} bytes（${(bigSaved.lastSave.bytes / 1024).toFixed(1)} KiB），保存 ${bigSaved.lastSave.ms} ms`);
  await tab1.key(' ', 'Space', 32, ' ');
  await waitFor(async () => (await tab1.snap()).tick > 2780, '匯入後續玩', 60000);
  await tab1.key(' ', 'Space', 32, ' ');
  await sleep(300);
  const after = await tab1.snap();
  check(after.hash === Realtime.hashWorld(advanceTo(big, after.tick)), `匯入後續玩到 tick ${after.tick}，hash 等於 Node 不中斷推進`);
  await waitFor(async () => !(await tab1.save()).status.dirty, '續玩後暫停保存完成');

  // 9. 壞檔：刻意把 active 槽改壞（模擬損壞，非正常操作），重新整理後不當成沒有存檔；明確恢復備份
  info = await tab1.save();
  const broken = info.active;
  const good = broken === 'a' ? 'b' : 'a';
  const goodTick = info.slots[good].tick;
  note('模擬損壞：改壞', broken, '槽的 stateText（保留 checksum），另一槽 tick', goodTick);
  await tab1.evaluate(`(() => { const k = ${JSON.stringify(Storage.SLOT_KEYS.a.slice(0, -1))} + ${JSON.stringify(broken)};
    const o = JSON.parse(localStorage.getItem(k)); o.stateText = o.stateText.replace('"tick":', '"tick":9'); localStorage.setItem(k, JSON.stringify(o)); })()`);
  await tab1.send('Page.reload');
  await sleep(500);
  await tab1.ready();
  info = await tab1.save();
  check(info.storage === 'broken' && info.slots[broken].code === 'checksum_mismatch' && info.slots[good].ok,
    `壞檔辨識：storage=${info.storage}，槽 ${broken} ${info.slots[broken].code}，槽 ${good} 可讀`);
  const panel = await tab1.text('#save-panel');
  check(panel.includes('匯出') && panel.includes(`恢復槽 ${good.toUpperCase()}`), `存檔區提供匯出原始資料與恢復：${panel.replace(/\s+/g, ' ').slice(0, 120)}`);
  await tab1.click(`[data-export-raw="${broken}"]`);
  const rawName = `${Storage.SLOT_KEYS[broken].replace(/:/g, '-')}.raw.json`;
  await waitFor(async () => fs.existsSync(path.join(downloads, rawName)), `下載壞槽原始資料 ${rawName}`);
  check(true, `壞槽原始資料已匯出 ${rawName}`);
  await tab1.click(`[data-restore="${good}"]`);
  const restored = await waitFor(async () => { const s = await tab1.snap(); return s.mode === 'paused' && s.tick === goodTick ? s : null; }, '恢復備份');
  info = await tab1.save();
  check(info.active === good && info.owned && restored.hash === Realtime.hashWorld(advanceTo(big, goodTick)),
    `恢復槽 ${good}：成為 active、tick ${restored.tick}、hash 正確`);
  const dBefore = dialogs.length;
  await tab1.click('#save-now');
  await waitFor(async () => dialogs.length >= dBefore + 1, '覆寫壞槽前的確認');
  check(dialogs.slice(dBefore).some((d) => d.includes('損壞')), `覆寫壞槽前有確認：${JSON.stringify(dialogs.slice(dBefore))}`);

  check(problems.length === 0, `console 沒有錯誤或警告（${problems.length} 行${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  note('dialogs', JSON.stringify(dialogs));
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

(async () => {
  const box = {};
  const watchdog = setTimeout(() => {
    note('FAIL', `超過總時限 ${TOTAL_LIMIT_MS / 1000} 秒`);
    fs.writeFileSync(`${OUT}/save.log`, log.join('\n') + '\n');
    if (box.chrome) box.chrome.kill();
    process.exit(2);
  }, TOTAL_LIMIT_MS);
  let failed = null;
  try {
    await main(box);
  } catch (e) {
    failed = e;
  } finally {
    for (const p of box.pages || []) p.close();
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
    fs.writeFileSync(`${OUT}/save.log`, log.join('\n') + '\n');
  }
  process.exit(failed ? 1 : 0);
})();
