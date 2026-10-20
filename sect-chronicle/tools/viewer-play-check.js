#!/usr/bin/env node
'use strict';
/*
 * SG-RT-04：可遊玩介面的真實瀏覽器操作紀錄。全部經畫面操作（點擊、鍵盤、表單），不注入世界、不呼叫推進或下令 API；
 * 頁面只透過 window.sectViewer 的唯讀資訊（snapshot／screenOf／saveInfo）讀狀態與點擊座標。
 *
 * 流程：建角（出身、配點、性格）＋開局政策與目標 → 自主生活 → 暫停時在可打斷工作、旅行、承諾工作中各下一次主角令，
 * 以畫面上說的換手 tick 對照實際出發 tick → 三類詢問（求援、收徒、突破）各回應一次 → 舊畫面意圖被拒的反例 →
 * 暫停中改政策與目標（畫面顯示未保存）→ 保存 → 重新整理 → 讀取，hash 等於保存當下 → 鍵盤操作、窄畫面、播放中點名冊 → console。
 *
 * Playwright 不是本專案依賴，需另外安裝。用法（repo 根目錄）：
 *   python3 -m http.server 8765 --directory sect-chronicle &
 *   NODE_PATH=$(npm root -g) node sect-chronicle/tools/viewer-play-check.js /tmp/rt04-play
 * 紀錄寫到 <輸出目錄>/play.log，截圖在同一目錄。任何一項不成立就以 FAIL 結束、結束碼非零。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const Realtime = require('../js/realtime.js');

const OUT = process.argv[2] || '/tmp/rt04-play';
const URL = process.env.VIEWER_URL || 'http://127.0.0.1:8765/viewer/';
const SEED = 'rt-dev-000';
const TOTAL_LIMIT_MS = 12 * 60 * 1000;
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const line = `[${new Date().toISOString()}] ${a.join(' ')}`; log.push(line); console.log(line); };
class CheckFailed extends Error {}
function check(ok, what) {
  if (!ok) throw new CheckFailed(what);
  note('ok', what);
}

async function main(box) {
  const t0 = Date.now();
  const browser = await chromium.launch();
  box.browser = browser;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('dialog', (d) => { note('dialog', JSON.stringify(d.message())); d.accept(); });
  const snap = () => page.evaluate(() => window.sectViewer.snapshot());
  const saveInfo = () => page.evaluate(() => window.sectViewer.saveInfo());
  let shotN = 0;
  const shot = async (name) => {
    shotN += 1;
    const file = `${String(shotN).padStart(2, '0')}-${name}`;
    await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
    note('screenshot', file);
  };
  const waitFor = async (what, pred, limitMs = 120000) => {
    const start = Date.now();
    for (;;) {
      const s = await snap();
      if (pred(s)) return s;
      if (s.mode === 'error') throw new CheckFailed(`等「${what}」時世界停止：${JSON.stringify(s.error)}`);
      if (Date.now() - start > limitMs) throw new CheckFailed(`${limitMs / 1000} 秒內沒等到：${what}（tick ${s.tick}）`);
      await page.waitForTimeout(40);
    }
  };
  const sceneBox = async () => page.locator('#scene').boundingBox();
  const clickPlace = async (key) => {
    const p = await page.evaluate((k) => window.sectViewer.screenOf(k), key);
    const b = await sceneBox();
    await page.mouse.click(b.x + p.x, b.y + p.y);
    await page.waitForTimeout(120);
  };
  // 地點清單（鍵盤也能用）：人物站在建築前時，點場景會先選到人，這時改用清單開同一個選單。
  const openPlace = async (key) => {
    if (!(await page.locator('#places details').evaluate((d) => d.open))) await page.locator('#places summary').click();
    await page.locator(`#places [data-place="${key}"]`).click();
    await page.waitForTimeout(80);
  };
  const pause = async () => {
    const s = await snap();
    if (s.mode === 'playing') await page.keyboard.press(' ');
    await page.waitForTimeout(80);
    return snap();
  };
  const play = async () => {
    await page.locator('#scene').focus();
    const s = await snap();
    if (s.mode === 'paused') await page.keyboard.press(' ');
    await page.waitForTimeout(60);
  };
  const toastTick = async () => {
    const text = await page.locator('#toast').innerText();
    const m = /tick (\d+)/.exec(text);
    return { text, tick: m ? Number(m[1]) : null };
  };
  const dojo = 't-2-2';
  note('browser', browser.version(), 'url', URL, 'seed', SEED);

  // ---------- 1. 建角與開局設定 ----------
  await page.goto(URL);
  await page.locator('input[name="tpl"][value="herb-child"]').check();
  await page.locator('[data-alloc="rootBone"]').fill('0');
  await page.locator('[data-alloc="comprehension"]').fill('1');
  await page.locator('[data-alloc="craft"]').fill('2');
  await page.locator('input[name="risk"][value="bold"]').check();
  await page.locator('input[name="bond"][value="caring"]').check();
  // 配點超過：開始鍵停用並顯示中文原因
  await page.locator('[data-alloc="craft"]').fill('3');
  const reason = await page.locator('#setup-error').innerText();
  check(await page.locator('#start').isDisabled() && /配點總和/.test(reason), `配點超過時不能開始：${reason}`);
  await page.locator('[data-alloc="craft"]').fill('2');
  for (const k of ['aid', 'recruit', 'breakthrough']) await page.locator(`#setup-settings select[data-policy="${k}"]`).selectOption('ask');
  await page.locator('#setup-settings [data-goal-move="0:1"]').click();
  const setupText = await page.locator('#setup-settings').innerText();
  check(setupText.includes('目標順序') && setupText.includes('ask'), '開局畫面可改政策與目標順序');
  await shot('setup');
  await page.locator('#start').click();
  await page.waitForTimeout(200);
  let s = await snap();
  const wantChar = { templateId: 'herb-child', allocation: { rootBone: 0, comprehension: 1, craft: 2 }, personality: { risk: 'bold', bond: 'caring' } };
  check(s.mode === 'playing' && JSON.stringify(s.characterOptions) === JSON.stringify(wantChar)
    && s.goals[0] === 'goal-pills' && s.goals[1] === 'goal-alchemy' && s.policy.aid === 'ask' && s.policy.recruit === 'ask' && s.policy.breakthrough === 'ask',
    `開始：建角 ${JSON.stringify(s.characterOptions)}，目標首位 ${s.goals[0]}，政策 ${JSON.stringify(s.policy)}`);
  // 開局世界等於直接用公開 API 建角、setPolicy、setGoals 後推進到同一 tick。
  let ref = Realtime.createWorld(SEED, wantChar).state;
  const goals = ref.goals.slice();
  [goals[0], goals[1]] = [goals[1], goals[0]];
  ref = Realtime.dispatch(ref, { id: 'setup-setPolicy', expectedRevision: 0, type: 'setPolicy', payload: { policy: s.policy } }).state;
  ref = Realtime.dispatch(ref, { id: 'setup-setGoals', expectedRevision: 1, type: 'setGoals', payload: { goals } }).state;
  for (let left = s.tick; left > 0;) {
    const r = Realtime.advanceTicks(ref, left);
    ref = r.state;
    left -= r.advancedTicks;
  }
  check(Realtime.hashWorld(ref) === s.hash, `開局世界（tick ${s.tick}）hash 等於公開 API 建角＋設定＋推進的結果`);
  await page.keyboard.press('4');

  // ---------- 2. 暫停中下令：可打斷工作（採集中） ----------
  s = await waitFor('主角在採集', (x) => x.protagonist.activity && /^gather/.test(x.protagonist.activity.kind) && x.protagonist.activity.status === 'working');
  s = await pause();
  await page.waitForTimeout(400);
  const pausedTick = (await snap()).tick;
  await clickPlace(dojo);
  s = await snap();
  check(s.menu && s.menu.kind === 'place' && s.mode === 'paused' && s.tick === pausedTick, `暫停時點道館打開選單：${s.menu && s.menu.title}`);
  await page.locator('#menu [data-act="rest-1"]').click();
  let tt = await toastTick();
  s = await snap();
  check(s.tick === pausedTick && s.protagonist.manualOrder === 'rest' && !s.menu, `下令後仍在 tick ${s.tick}、零 tick 推進：${tt.text}`);
  check((await saveInfo()).status.dirty === true, '暫停中下令後畫面標示未保存');
  await shot('order-while-gathering');
  await play();
  s = await waitFor('休養開工', (x) => x.protagonist.activity && x.protagonist.activity.origin === 'manual' && x.protagonist.activity.kind === 'rest');
  check(tt.tick !== null && s.protagonist.activity.departTick === tt.tick, `採集中換手：畫面說 tick ${tt.tick}，實際出發 tick ${s.protagonist.activity.departTick}`);

  // ---------- 3. 旅行中 ----------
  s = await waitFor('主角在旅行', (x) => x.protagonist.activity && x.protagonist.activity.status === 'traveling' && !x.protagonist.manualOrder, 180000);
  s = await pause();
  await clickPlace(dojo);
  await page.locator('#menu [data-act="cultivate-1"]').click();
  tt = await toastTick();
  check(/走完目前這一步/.test(tt.text), `旅行中下令：${tt.text}`);
  await play();
  s = await waitFor('修行令出發', (x) => x.protagonist.activity && x.protagonist.activity.origin === 'manual' && x.protagonist.activity.kind === 'cultivate');
  check(s.protagonist.activity.departTick === tt.tick, `旅行中換手：畫面說 tick ${tt.tick}，實際出發 tick ${s.protagonist.activity.departTick}`);

  // ---------- 4. 舊畫面意圖：開選單後世界又走了，送出被拒、不重送 ----------
  await pause();
  await openPlace(dojo);
  await page.locator('#scene').focus();
  await page.keyboard.press(' '); // 選單開著時恢復播放
  await page.waitForTimeout(500);
  const before = await snap();
  await page.locator('#menu [data-act="tune-mind-1"]').click();
  const stale = await page.locator('#toast').innerText();
  s = await snap();
  check(/畫面已過時/.test(stale) && s.protagonist.manualOrder === before.protagonist.manualOrder && s.menu && s.mode === 'playing', `舊意圖被拒、選單仍開著：${stale}`);
  check(s.revision - before.revision <= s.tick - before.tick, '被拒時沒有套用任何命令（revision 只隨 tick 增加）');
  await page.locator('#menu [data-close]').click();

  // ---------- 5. 求援：回覆後接著在村口下令援村（承諾工作），援村中再下令 ----------
  s = await waitFor('求援詢問', (x) => x.asks.some((q) => q.kind === 'plea'), 240000);
  await pause();
  await shot('plea');
  await page.locator('[data-open-ask="evt-village-plea"]').click();
  await page.locator('#menu [data-act="opt-aid-accept"]').click();
  s = await snap();
  check(s.menu && s.menu.kind === 'place' && s.menu.title === '村口' && !s.asks.some((q) => q.kind === 'plea'), '答應求援後接著打開村口選單');
  await page.locator('#menu [data-act="aid-free"]').click();
  s = await snap();
  check(s.mode === 'paused' && s.protagonist.manualOrder === 'aid' && !s.menu, '在村口下令徒手援村，仍暫停');
  await play();
  s = await waitFor('援村開工', (x) => x.protagonist.activity && x.protagonist.activity.kind === 'aid' && x.protagonist.activity.status === 'working', 120000);
  await pause();
  await openPlace(dojo);
  await page.locator('#menu [data-act="rest-1"]').click();
  tt = await toastTick();
  check(/承諾不中斷/.test(tt.text), `承諾工作中下令：${tt.text}`);
  // 取消排隊中的新指令：已開工的承諾仍會做完
  await page.locator('[data-open-person]').click();
  const cancelWhy = await page.locator('#menu [data-act="cancel"] .why').innerText();
  await page.locator('#menu [data-act="cancel"]').click();
  const cancelToast = await page.locator('#toast').innerText();
  check(/仍會/.test(cancelWhy) && /仍會完成/.test(cancelToast), `取消時說明承諾仍會完成：${cancelToast}`);
  await openPlace(dojo);
  await page.locator('#menu [data-act="rest-1"]').click();
  tt = await toastTick();
  await shot('order-during-promise');
  await play();
  s = await waitFor('援村後休養出發', (x) => x.protagonist.activity && x.protagonist.activity.origin === 'manual' && x.protagonist.activity.kind === 'rest');
  check(s.protagonist.activity.departTick === tt.tick, `承諾工作換手：畫面說 tick ${tt.tick}，實際出發 tick ${s.protagonist.activity.departTick}`);

  // ---------- 6. 煉丹中（若丹房完工且材料夠） ----------
  // 自主生活不一定替主角留下材料：不夠就由玩家自己派主角去採，採完再煉。
  s = await waitFor('丹房完工', (x) => x.facilities.some((f) => f.type === 'alchemyRoom' && f.done) && !x.protagonist.manualOrder, 240000);
  for (let round = 0; ; round += 1) {
    s = await snap();
    const r = s.resources;
    if (r.spiritHerb >= 6 && r.spiritMaterial >= 2) break;
    if (round >= 6) throw new CheckFailed(`六輪採集內沒湊到煉丹材料（現有 靈草 ${r.spiritHerb}、靈材 ${r.spiritMaterial}）`);
    await pause();
    const herb = r.spiritHerb < 6;
    await openPlace(herb ? 't-2-0' : 't-0-0');
    await page.locator(`#menu [data-act="${herb ? 'gather-herb-3' : 'gather-material-1'}"]`).click();
    note('派主角採集', herb ? '靈草 3 單位' : '靈材 1 單位', `（tick ${(await snap()).tick}）`);
    await play();
    await waitFor('採集指令做完', (x) => !x.protagonist.manualOrder, 180000);
  }
  await pause();
  const room = (await snap()).facilities.find((f) => f.type === 'alchemyRoom');
  await openPlace(room.tileId);
  await page.locator('#menu [data-act="brew-breakthrough-pill"]').click();
  await play();
  s = await waitFor('主角煉丹中', (x) => x.protagonist.activity && x.protagonist.activity.kind === 'brew' && x.protagonist.activity.status === 'working');
  await pause();
  await openPlace(dojo);
  await page.locator('#menu [data-act="cultivate-1"]').click();
  tt = await toastTick();
  check(/煉丹已開工，承諾不中斷/.test(tt.text), `煉丹中下令：${tt.text}`);
  await play();
  s = await waitFor('煉丹後修行出發', (x) => x.protagonist.activity && x.protagonist.activity.origin === 'manual' && x.protagonist.activity.kind === 'cultivate', 180000);
  check(s.protagonist.activity.departTick === tt.tick, `煉丹中換手：畫面說 tick ${tt.tick}，實際出發 tick ${s.protagonist.activity.departTick}`);

  // ---------- 7. 收徒：一位收、一位再想想，之後從暫不收再收 ----------
  s = await waitFor('收徒詢問', (x) => x.asks.filter((q) => q.kind === 'invitation').length >= 1, 240000);
  await pause();
  await shot('invitation');
  const inv = (await snap()).asks.filter((q) => q.kind === 'invitation').map((q) => q.eventId);
  await page.locator(`[data-open-ask="${inv[0]}"]`).click();
  await page.locator('#menu [data-act="accept"]').click();
  check(/入隊/.test(await page.locator('#toast').innerText()), `接受 ${inv[0]}：${await page.locator('#toast').innerText()}`);
  if (inv[1]) {
    await page.locator(`[data-open-ask="${inv[1]}"]`).click();
    await page.locator('#menu [data-act$="-later"]').click();
    s = await snap();
    const deferred = s.asks.find((q) => q.kind === 'deferred');
    check(!!deferred, '再想想後列在暫不收');
    await page.locator(`[data-open-ask="${deferred.eventId}"]`).click();
    await page.locator('#menu [data-act="accept"]').click();
  }
  s = await snap();
  check(s.asks.every((q) => q.kind !== 'invitation' && q.kind !== 'deferred'), '收徒詢問都已處理');

  // ---------- 8. 突破詢問：同意只排進突破，不說成功 ----------
  await play();
  s = await waitFor('突破詢問', (x) => x.asks.some((q) => q.kind === 'breakthroughAsk'), 240000);
  await pause();
  const askId = s.asks.find((q) => q.kind === 'breakthroughAsk').eventId;
  await page.locator(`[data-open-ask="${CSSescape(askId)}"]`).click();
  await shot('breakthrough-ask');
  await page.locator('#menu [data-act="opt-breakthrough-agree"]').click();
  const agree = await page.locator('#toast').innerText();
  check(/成敗/.test(agree) && !/突破成功/.test(agree), `同意突破：${agree}`);

  // ---------- 9. 暫停中改政策與目標 ----------
  const tickBefore = (await snap()).tick;
  await page.locator('#edit-settings').click();
  await page.locator('#menu select[data-policy="breakthroughPill"]').selectOption('never');
  await page.locator('#menu [data-goal-move="1:-1"]').click();
  await page.locator('#menu [data-apply-settings]').click();
  s = await snap();
  check(s.tick === tickBefore && s.policy.breakthroughPill === 'never' && s.goals[0] === 'goal-alchemy' && s.mode === 'paused',
    `改政策與目標：tick 不動、仍暫停、用丹=${s.policy.breakthroughPill}、目標首位=${s.goals[0]}`);
  check((await saveInfo()).status.dirty === true, '改設定後畫面標示未保存');

  // ---------- 10. 保存 → 重新整理 → 讀取 ----------
  await page.locator('#save-now').click();
  await page.waitForTimeout(500);
  const saved = await snap();
  const info = await saveInfo();
  check(info.status.dirty === false && info.status.saved.tick === saved.tick, `保存在 tick ${saved.tick}，hash ${saved.hash}`);
  await shot('saved');
  await page.reload();
  await page.waitForTimeout(400);
  await page.locator('#load-saved').click();
  await page.waitForTimeout(400);
  const loaded = await snap();
  check(loaded.mode === 'paused' && loaded.tick === saved.tick && loaded.hash === saved.hash, `重新整理後讀取：tick ${loaded.tick}、hash 相同、保持暫停`);
  await page.waitForTimeout(1500);
  check((await snap()).tick === saved.tick, '讀取後不補離線 tick');

  // ---------- 11. 鍵盤 ----------
  await page.locator('#places summary').focus();
  await page.keyboard.press('Enter');
  await page.locator(`#places [data-place="${dojo}"]`).focus();
  await page.keyboard.press('Enter');
  s = await snap();
  check(s.menu && s.menu.title === '道館', '鍵盤：地點清單 Enter 打開道館選單');
  await page.keyboard.press('Escape');
  s = await snap();
  check(!s.menu && s.mode === 'paused', 'Esc 關選單；原本已暫停就保持暫停');
  await page.locator('#scene').focus();
  await page.keyboard.press(']');
  const sel1 = (await snap()).selected;
  await page.keyboard.press(']');
  const sel2 = (await snap()).selected;
  check(sel1 && sel2 && sel1 !== sel2, `鍵盤：] 換人 ${sel1} → ${sel2}`);

  // ---------- 12. 播放中點名冊不被重建吃掉 ----------
  await page.keyboard.press('4');
  await play();
  const cards = page.locator('#people [data-person]');
  const n = await cards.count();
  let hits = 0;
  for (let i = 0; i < 8; i += 1) {
    const want = await cards.nth(i % n).getAttribute('data-person');
    const prev = (await snap()).selected;
    await cards.nth(i % n).click();
    const now = (await snap()).selected;
    if ((prev === want && now === null) || now === want) hits += 1;
  }
  check(hits === 8 && (await snap()).mode === 'playing', `播放中點名冊 8 次全部生效（${hits}/8）`);

  // ---------- 13. 窄畫面 ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await pause();
  await page.waitForTimeout(300);
  await openPlace(dojo);
  const docked = await page.locator('#menu').getAttribute('class');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await shot('narrow');
  check(/docked/.test(docked) && overflow <= 0, `窄畫面：選單固定在底部（${docked}），沒有橫向捲動（${overflow}px）`);
  await page.keyboard.press('Escape');

  check(problems.length === 0, `console 沒有錯誤或警告（${problems.length} 行${problems.length ? `：${JSON.stringify(problems)}` : ''}）`);
  note('wall time', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

function CSSescape(v) {
  return String(v).replace(/(["\\])/g, '\\$1');
}

(async () => {
  const box = {};
  const watchdog = setTimeout(() => {
    note('FAIL', `超過總時限 ${TOTAL_LIMIT_MS / 1000} 秒`);
    fs.writeFileSync(`${OUT}/play.log`, log.join('\n') + '\n');
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
    fs.writeFileSync(`${OUT}/play.log`, log.join('\n') + '\n');
  }
  process.exitCode = failed ? 1 : 0;
})();
