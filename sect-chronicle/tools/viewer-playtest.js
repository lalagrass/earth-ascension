#!/usr/bin/env node
'use strict';
/*
 * SG-RT-05：正式介面的真實生活試玩紀錄。只經畫面操作（點擊、鍵盤、表單、匯出按鈕），不注入世界、不呼叫推進或下令 API；
 * 頁面狀態只透過 window.sectViewer 的唯讀 snapshot 與畫面文字讀取。
 *
 * A 無人介入：預設開局按 4× 播到 2700 tick（跨第 14 天邊界 2520），每跨一天記下名冊上每人的狀態文字並截圖幾張；
 *   結束時頁面 hash 必須等於 Node 直接推進同一 tick 的結果。之後在 Node 對同一個世界每 10 tick 取樣 View.describe()，
 *   統計每人每天的工作、恢復、等待與原因，以及目標進度。這份統計描述的是與頁面 hash 相同的世界。
 * B 暫停介入：開局 → 暫停（確認世界不動）→ 在道場給主角下令 → 改目標順序 → 恢復 → 主角執行玩家令途中暫停並保存 →
 *   重新整理讀檔（保持暫停、不補 tick）→ 續玩到玩家令做完、自主接手 → 用畫面的「匯出存檔」取出世界，
 *   在 Node 從同一 seed 依世界 commandLog 的 tick 重放玩家命令，hash 與 RNG 必須相同，命令不重複。
 *
 * Playwright 不是本專案依賴，需另外安裝。用法（repo 根目錄）：
 *   python3 -m http.server 8765 --directory sect-chronicle &
 *   NODE_PATH=$(npm root -g) node sect-chronicle/tools/viewer-playtest.js /tmp/rt05-playtest
 * 紀錄寫到 <輸出目錄>/playtest.log，統計在 unattended.json，截圖與匯出存檔在同一目錄。
 * 任何一項不成立就以 FAIL 結束、結束碼非零。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const Storage = require('../js/storage.js');
const View = require('../viewer/view.js');

const deps = {
  Rules, Realtime,
  StoryData: require('../js/story-data.js'),
  Story: require('../js/story.js'),
  Progression: require('../js/progression.js'),
};
const OUT = process.argv[2] || '/tmp/rt05-playtest';
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
const SEED = 'rt-dev-000';
const HORIZON = 2700;
const DAY = Rules.TICKS_PER_DAY;
const SAMPLE = 10;
const TOTAL_LIMIT_MS = 15 * 60 * 1000;
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };
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

// 頁面工具：同一組 helper 給 A、B 兩段用。
function pageTools(page) {
  const snap = () => page.evaluate(() => window.sectViewer.snapshot());
  const waitFor = async (what, pred, limitMs = 240000) => {
    const start = Date.now();
    for (;;) {
      const s = await snap();
      if (pred(s)) return s;
      if (s.mode === 'error') throw new CheckFailed(`等「${what}」時世界停止：${JSON.stringify(s.error)}`);
      if (Date.now() - start > limitMs) throw new CheckFailed(`${limitMs / 1000} 秒內沒等到：${what}（tick ${s.tick}）`);
      await page.waitForTimeout(50);
    }
  };
  const press = async (key) => {
    await page.locator('#scene').focus();
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  };
  const roster = () => page.locator('#people .person').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
  return { snap, waitFor, press, roster };
}

// ---------- A：無人介入 ----------
async function partA(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  const { snap, waitFor, press, roster } = pageTools(page);
  await page.goto(URL);
  await page.locator('#start').click();
  await page.waitForTimeout(150);
  let s = await snap();
  check(s.mode === 'playing' && s.seed === SEED, `A：預設開局 seed=${s.seed}，沒有改建角、政策或目標`);
  await press('4');
  const t0 = Date.now();
  const days = [];
  const shots = new Set([1, 5, 10, 14, 15]);
  let lastDay = 0;
  for (;;) {
    s = await snap();
    if (s.mode === 'error') throw new CheckFailed(`A：世界停止 ${JSON.stringify(s.error)}`);
    const day = Math.floor(s.tick / DAY) + 1;
    if (day !== lastDay && day <= 15) {
      lastDay = day;
      const r = await roster();
      days.push({ day, tick: s.tick, roster: r });
      note(`A 第 ${day} 天 tick ${s.tick}`, r.join(' ｜ '));
      if (shots.has(day)) await page.screenshot({ path: `${OUT}/A-day${String(day).padStart(2, '0')}.png`, fullPage: true });
    }
    if (s.tick >= HORIZON) break;
    if (s.mode !== 'playing') throw new CheckFailed(`A：無人介入時停住了 mode=${s.mode} tick=${s.tick}（${JSON.stringify(s.asks)}）`);
    if (Date.now() - t0 > 8 * 60 * 1000) throw new CheckFailed(`A：8 分鐘內沒播到 ${HORIZON}（tick ${s.tick}）`);
    await page.waitForTimeout(250);
  }
  await press(' ');
  s = await waitFor('A 暫停', (x) => x.mode === 'paused');
  const wall = (Date.now() - t0) / 1000;
  check(s.tick >= HORIZON && days.some((d) => d.tick >= 2520), `A：無人介入播到 tick ${s.tick}（第 ${Math.floor(s.tick / DAY) + 1} 天，跨過 2520），實際 ${wall.toFixed(1)} 秒`);
  await page.screenshot({ path: `${OUT}/A-end.png`, fullPage: true });
  const ref = advanceTo(Realtime.createWorld(SEED).state, s.tick);
  check(Realtime.hashWorld(ref) === s.hash && JSON.stringify(ref.rngState) === JSON.stringify(s.rngState),
    `A：頁面 tick ${s.tick} 的 hash／RNG 等於 Node 直接推進（${s.hash.slice(0, 12)}…）`);
  check(problems.length === 0, `A：console 沒有錯誤或警告（${problems.length}${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  await ctx.close();
  return { endTick: s.tick, wall, days };
}

// A 的世界統計：同一 seed、同一 tick，hash 已與頁面核對。
function analyse(endTick) {
  let w = Realtime.createWorld(SEED).state;
  const perDay = new Map();
  const names = {};
  for (let t = 0; t < endTick; t += SAMPLE) {
    w = advanceTo(w, t);
    const m = View.describe(w, deps);
    const day = m.clock.day;
    if (!perDay.has(day)) perDay.set(day, {});
    const bucket = perDay.get(day);
    for (const p of m.people) {
      names[p.id] = p.name;
      if (!p.joined) continue;
      const st = p.status;
      let key;
      if (st.kind === 'activity') key = `${st.label}（${st.status}${st.origin === 'manual' ? '・玩家令' : ''}）`;
      else if (st.kind === 'wait') key = `等待：${st.text.replace(/（自 tick.*$/, '')}`; // 去掉起訖 tick，同一原因才會合併
      else key = st.label || st.kind;
      const b = bucket[p.id] || (bucket[p.id] = {});
      b[key] = (b[key] || 0) + SAMPLE;
    }
  }
  w = advanceTo(w, endTick);
  const m = View.describe(w, deps);
  const dayReports = w.eventLog.filter((e) => e.type === 'dayReport').length;
  const eventTypes = {};
  for (const e of w.eventLog) eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
  return {
    seed: SEED, endTick, sampleEvery: SAMPLE,
    names,
    days: [...perDay.entries()].map(([day, people]) => ({ day, people })),
    final: {
      people: m.people.map((p) => ({ name: p.name, joined: p.joined, stamina: p.stamina, mind: p.mind, cultivation: p.cultivation, breakthroughs: p.breakthroughs, status: p.status.text || p.status.label, why: p.why.state.text, next: p.why.next ? p.why.next.text : null })),
      goals: m.goalStatus.map((g) => ({ text: g.text, state: g.state, detail: g.detail, gaps: g.gaps.map((x) => x.text) })),
      resources: m.resources, pills: m.pills, facilities: m.facilities.map((f) => `${f.label}${f.done ? '完工' : '未完'}`),
      dayReports, eventTypes,
    },
  };
}

// ---------- B：暫停介入、存讀、續玩 ----------
async function partB(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('dialog', (d) => { note('dialog', JSON.stringify(d.message())); d.accept(); });
  const { snap, waitFor, press } = pageTools(page);
  const openPlace = async (key) => {
    if (!(await page.locator('#places details').evaluate((d) => d.open))) await page.locator('#places summary').click();
    await page.locator(`#places [data-place="${key}"]`).click();
    await page.waitForTimeout(100);
  };
  await page.goto(URL);
  await page.locator('#start').click();
  await page.waitForTimeout(150);
  await press('4');

  // 1. 暫停：世界不動
  await waitFor('自主生活過了第一天', (x) => x.tick >= 200);
  await press(' ');
  let p0 = await waitFor('暫停', (x) => x.mode === 'paused');
  await page.waitForTimeout(1500);
  let p1 = await snap();
  check(p1.tick === p0.tick && p1.hash === p0.hash && JSON.stringify(p1.rngState) === JSON.stringify(p0.rngState),
    `B：暫停 1.5 秒世界不動（tick ${p0.tick}、hash 與 RNG 相同）`);
  await page.screenshot({ path: `${OUT}/B-1-paused.png`, fullPage: true });

  // 2. 改主角工作：道場修行 3 單位
  await openPlace('t-2-2');
  let s = await snap();
  check(s.menu && s.menu.actions.some((a) => a.key === 'cultivate-3' && !a.disabled), 'B：道場選單列出可做的「修行 3 單位」');
  await page.locator('#menu [data-act="cultivate-3"]').click();
  await page.waitForTimeout(200);
  s = await snap();
  const toast1 = await page.locator('#toast').innerText();
  check(s.mode === 'paused' && s.tick === p0.tick && s.protagonist.manualOrder, `B：暫停中下令被接受、tick 不動：${toast1.replace(/\s+/g, ' ')}`);

  // 3. 改目標順序
  const goalsBefore = s.goals.slice();
  await page.locator('#edit-settings').click();
  await page.locator('#menu [data-goal-move="1:-1"]').click();
  await page.locator('#menu [data-apply-settings]').click();
  await page.waitForTimeout(200);
  s = await snap();
  check(s.mode === 'paused' && s.tick === p0.tick && s.goals[0] === goalsBefore[1] && s.goals[1] === goalsBefore[0],
    `B：暫停中改目標順序：${goalsBefore.slice(0, 2).join('、')} → ${s.goals.slice(0, 2).join('、')}`);
  await page.screenshot({ path: `${OUT}/B-2-ordered.png`, fullPage: true });

  // 4. 恢復，主角執行玩家令途中暫停並保存
  await press(' ');
  s = await waitFor('主角開始執行玩家令', (x) => x.protagonist.activity && x.protagonist.activity.origin === 'manual'
    && (x.protagonist.activity.status === 'traveling' || x.protagonist.activity.status === 'working'));
  await press(' ');
  const saved = await waitFor('暫停', (x) => x.mode === 'paused');
  check(saved.protagonist.activity.origin === 'manual', `B：恢復後自主沒有覆寫玩家令，主角在 tick ${saved.tick} ${saved.protagonist.activity.status}（${saved.protagonist.activity.kind}）`);
  await page.locator('#save-now').click();
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => window.sectViewer.saveInfo());
  check(info.status.dirty === false && info.status.saved.tick === saved.tick, `B：玩家令進行中保存在 tick ${saved.tick}`);

  // 5. 重新整理讀檔
  await page.reload();
  await page.locator('#load-saved').click();
  await page.waitForTimeout(300);
  let l = await snap();
  check(l.mode === 'paused' && l.tick === saved.tick && l.hash === saved.hash && JSON.stringify(l.rngState) === JSON.stringify(saved.rngState),
    `B：重新整理後讀檔保持暫停，tick ${l.tick}、hash 與 RNG 等於保存當下`);
  await page.waitForTimeout(1500);
  check((await snap()).tick === saved.tick, 'B：讀檔後不補離線 tick');
  await page.screenshot({ path: `${OUT}/B-3-loaded.png`, fullPage: true });

  // 6. 續玩：玩家令做完後自主接手
  await press(' ');
  await press('4');
  s = await waitFor('玩家令做完、自主接手', (x) => !x.protagonist.manualOrder && x.protagonist.activity && x.protagonist.activity.origin === 'auto');
  note(`B：tick ${s.tick} 主角回到自主（${s.protagonist.activity.kind} ${s.protagonist.activity.status}）`);
  s = await waitFor('再播一段', (x) => x.tick >= saved.tick + 600);
  await press(' ');
  const end = await waitFor('暫停', (x) => x.mode === 'paused');
  await page.screenshot({ path: `${OUT}/B-4-continued.png`, fullPage: true });

  // 7. 匯出存檔，Node 重放玩家命令比對
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const file = `${OUT}/B-export.json`;
  await dl.saveAs(file);
  const r = Storage.readSave(fs.readFileSync(file, 'utf8'));
  check(r.ok && r.world.clock.tick === end.tick && Realtime.hashWorld(r.world) === end.hash, `B：畫面匯出的存檔可讀，tick ${end.tick} 與頁面一致`);
  // commandLog 也記自主的 autoAssign（origin auto，由 tick 推進自己產生）；玩家命令是 origin manual。
  const cmdLog = r.world.commandLog;
  const cmds = cmdLog.filter((c) => c.origin === 'manual');
  check(new Set(cmdLog.map((c) => c.id)).size === cmdLog.length && cmds.length === 2 && cmds[0].type === 'orderActivity' && cmds[1].type === 'setGoals',
    `B：commandLog 共 ${cmdLog.length} 筆、id 不重複；玩家命令只有兩筆：${cmds.map((c) => `${c.type}@${c.tick}`).join('、')}`);
  const order = cmds[0];
  const nextAuto = cmdLog.find((c) => c.origin === 'auto' && c.tick >= order.tick && c.payload.discipleId === order.payload.discipleId);
  const needTicks = order.payload.units * Rules.TICKS_PER_SLOT;
  check(nextAuto && nextAuto.tick >= order.tick + needTicks,
    `B：玩家令 ${order.payload.kind}×${order.payload.units} 從 tick ${order.tick} 做滿 ${needTicks} tick 才由自主接手（下一筆主角 autoAssign 在 tick ${nextAuto && nextAuto.tick}），中途沒有被覆寫或重做`);
  let ref = Realtime.createWorld(SEED).state;
  for (const c of cmds) {
    ref = advanceTo(ref, c.tick);
    const d = Realtime.dispatch(ref, { id: c.id, expectedRevision: ref.revision, type: c.type, payload: c.payload });
    if (!d.ok || d.duplicate) throw new CheckFailed(`B：Node 重放 ${c.id} 失敗：${JSON.stringify(d.error || d)}`);
    ref = d.state;
  }
  ref = advanceTo(ref, end.tick);
  check(Realtime.hashWorld(ref) === end.hash && JSON.stringify(ref.rngState) === JSON.stringify(end.rngState),
    `B：從同一 seed 依 tick 只重放這兩筆玩家命令（自主命令由推進自己產生）到 tick ${end.tick}，hash 與 RNG 等於頁面（中途存讀沒有改變世界）`);
  check(problems.length === 0, `B：console 沒有錯誤或警告（${problems.length}${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  await ctx.close();
  return { pausedAt: p0.tick, savedAt: saved.tick, savedState: saved.protagonist.activity, endTick: end.tick, commandLogLength: cmdLog.length, autoAssigns: cmdLog.length - cmds.length, handBackTick: nextAuto.tick, commands: cmds.map((c) => ({ id: c.id, type: c.type, tick: c.tick, payload: c.payload })) };
}

async function main(box) {
  const t0 = Date.now();
  const browser = await chromium.launch();
  box.browser = browser;
  note('browser', `Chromium ${browser.version()}`, 'url', URL, 'seed', SEED, 'node', process.version);
  const a = await partA(browser);
  const stats = analyse(a.endTick);
  stats.browserDays = a.days;
  stats.wallSeconds = a.wall;
  fs.writeFileSync(`${OUT}/unattended.json`, JSON.stringify(stats, null, 1));
  note('A 統計寫到 unattended.json');
  const b = await partB(browser);
  fs.writeFileSync(`${OUT}/intervention.json`, JSON.stringify(b, null, 1));
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

(async () => {
  const box = {};
  const watchdog = setTimeout(() => {
    note('FAIL', `超過總時限 ${TOTAL_LIMIT_MS / 1000} 秒`);
    fs.writeFileSync(`${OUT}/playtest.log`, log.join('\n') + '\n');
    process.exit(2);
  }, TOTAL_LIMIT_MS);
  let failed = null;
  try {
    await main(box);
  } catch (e) {
    failed = e;
  } finally {
    if (box.browser) await box.browser.close();
    clearTimeout(watchdog);
    note(failed ? 'FAIL' : 'PASS', failed ? (failed instanceof CheckFailed ? failed.message : (failed.stack || String(failed))) : '全部條件成立');
    fs.writeFileSync(`${OUT}/playtest.log`, log.join('\n') + '\n');
  }
  process.exit(failed ? 1 : 0);
})();
