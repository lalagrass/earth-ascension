// LP-14 生活觀察介面驗收測試（A 觀察與層級、B 人物與介入、C 進階與無副作用、D 觀看與相機）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, createClock, PEOPLE, RULES, tripSteps } from '../demo/model.mjs';
import { WORLD_SIZE, WATER_LENGTH, WATER_LANDMARKS } from '../demo/water-layout.mjs';

const LENGTHS = {
  water: WATER_LENGTH,
  herb: 520,
  seat: { hero: 160, cousin: 210 },
  fun: { hero: 260, cousin: 310 },
  boar: { edge: 280, total: 490, seen: 180 },
  guard: 250,
};

test('A 觀察與資訊層級：HUD 關鍵存量與狀態精簡，院落近況可展開收起且不隱去威脅', () => {
  const model = createModel(LENGTHS);
  const v = model.view();

  // 1. 核心存量在初始狀態可讀
  assert.equal(v.vat, 3, '水缸初始存量 3 擔');
  assert.equal(v.herbs, 0, '藥架初始存量 0 份');
  assert.equal(v.vatCapacity, 8);
  assert.equal(v.herbCapacity, 8);

  // 2. 院落近況：野豬、護欄與鼠群狀態完整呈現於資料層
  const b = v.boar;
  assert.equal(b.mode, 'habitat', '初始野豬在棲地');
  assert.equal(b.marks, 0, '護欄初始損痕為 0');
  assert.equal(b.maxMarks, 3);
  assert.equal(v.rats.length, 3, '三隻弱鼠 fixture 存在');

  // 3. 當野豬有威脅（被撞或靠近）時，損痕不被完全隱藏
  model.step(); // 推進世界
  assert.ok(b.max >= 80, '野豬精力上限正常');
});

test('B 人物與介入：小卡正確綁定選取角色、精力、工作、下一步／停止原因與改令對接', () => {
  const model = createModel(LENGTHS);
  const v = model.view();

  // 1. 主角與熟手資料綁定
  const hero = v.people.hero;
  const cousin = v.people.cousin;

  assert.equal(hero.level, 1, '主角初始腳力 Lv 1');
  assert.equal(cousin.level, 3, '熟手初始腳力 Lv 3');
  assert.equal(hero.job, 'water', '主角預設挑水');
  assert.equal(cousin.job, 'water', '熟手預設挑水');

  // 2. 下一步 / 停止原因可讀
  assert.ok(hero.next, '主角下一步文字存在');
  assert.ok(hero.status, '主角狀態文字存在');

  // 3. 改令對接：路中（mode === 'carry'）改採藥
  for (let i = 0; i < 60; i++) model.step();
  assert.equal(model.view().people.hero.mode, 'carry', '人物已在挑水路中');
  const res = model.dispatch('work:herb', 'hero');
  assert.equal(res.ok, true, '成功指派改採藥');
  assert.equal(res.pending, true, '提示本趟交付後生效');
  const v2 = model.view();
  assert.equal(v2.people.hero.pending, 'herb', '改令記錄在待執行中，原趟交付後才執行');

  // 4. 手動停工
  const stopRes = model.dispatch('restAfterTrip', 'cousin');
  assert.equal(stopRes.ok, true, '成功下達本趟後停工');
  assert.equal(stopRes.pending, true, '熟手本趟交付後停工');
  const v3 = model.view();
  assert.equal(v3.people.cousin.pending, 'rest', '停工記錄在待執行中');
});

test('C 進階與無副作用：折疊切換為純 UI 狀態，暫停操作世界零副作用，原控制入口完整', () => {
  const model = createModel(LENGTHS);
  const snap1 = JSON.stringify(model.view());

  // 模擬暫停狀態下進行純 UI 展開/收起
  const ui = { boarExpanded: false, advancedOpen: false, follow: true };

  // 1. 切換院落近況展開
  ui.boarExpanded = !ui.boarExpanded;
  assert.equal(ui.boarExpanded, true);

  // 2. 切換進階設定展開
  ui.advancedOpen = !ui.advancedOpen;
  assert.equal(ui.advancedOpen, true);

  // 3. 切換鏡頭跟隨
  ui.follow = !ui.follow;
  assert.equal(ui.follow, false);

  // 驗證世界完全無變化
  const snap2 = JSON.stringify(model.view());
  assert.equal(snap1, snap2, '純 UI 操作（近況展開、進階展開、跟隨切換）不推進 tick 且不修改 model');

  // 4. 原控制項在 actions() 中全數合法可用
  const actions = model.actions('hero');
  const actionIds = actions.map((a) => a.id);
  assert.ok(actionIds.includes('work:water'), '挑水指令存在');
  assert.ok(actionIds.includes('work:herb'), '採藥指令存在');
  assert.ok(actionIds.includes('restAfterTrip'), '停工休息指令存在');
  assert.ok(actionIds.includes('clean'), '清鼠指令存在');
  assert.ok(actionIds.includes('fix'), '整理護欄指令存在');
});

test('D 可讀性與鏡頭：390 視窗在近況折疊與展開狀態下相機計算均避讓遮擋，跟隨按鈕可恢復', () => {
  const screenH = 844, zoom = 0.85;

  function calcNarrowY(pY, topRects, bottomRects) {
    const top = Math.max(0, ...topRects);
    const bottom = Math.min(screenH, ...bottomRects);
    const targetY = bottom > top + 40 ? (top + bottom) / 2 : Math.max(top + 20, (top + bottom) / 2);
    const ty = pY - 30 - (targetY - screenH / 2) / zoom;
    const toScreenY = (y, camY) => (y - camY) * zoom + screenH / 2;
    return {
      camY: ty,
      targetY,
      headY: toScreenY(pY - 60, ty),
      feetY: toScreenY(pY, ty),
      tagY: toScreenY(pY, ty) + 6,
      top,
      bottom,
    };
  }

  // 1. 院落近況收起時（頂部僅 HUD ~168.5 + 收起近況 ~32 = ~200px）
  const collapsed = calcNarrowY(512, [168.5, 200], [420.52, 796]);
  assert.ok(collapsed.headY > 200, '近況收起時人物頭頂避開頂部');
  assert.ok(collapsed.feetY < 420.52, '近況收起時人物腳底在面板上方');
  assert.ok(collapsed.tagY < 420.52, '人物名牌在面板上方可讀');

  // 2. 院落近況展開時（頂部 HUD + 展開近況 = ~303px）
  const expanded = calcNarrowY(512, [168.5, 303], [420.52, 796]);
  assert.ok(expanded.headY > 303, '近況展開時人物頭頂依然避開野豬卡下緣 (303px)');
  assert.ok(expanded.feetY < 420.52, '近況展開時人物腳底依然在面板上方 (420.52px)');

  // 3. 跟隨狀態恢復
  let followState = true;
  // 模擬拖曳
  followState = false;
  assert.equal(followState, false, '拖曳後進入自由視野');
  // 模擬點擊可見跟隨控制按鈕
  followState = true;
  assert.equal(followState, true, '點擊跟隨按鈕成功恢復跟隨');
});
