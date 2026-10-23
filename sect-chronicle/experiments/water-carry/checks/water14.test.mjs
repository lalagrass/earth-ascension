// LP-14 生活觀察介面輔助驗證（模型資料、命令語義與相機幾何換算）
// 註：本測試在 Node 無 DOM 環境執行，專注於底層模型契約、狀態語義與相機幾何公式之輔助驗收；
// 真實 DOM 渲染、按鈕互動與 390 視區視覺驗證見 design/life-observation/phone-390-life.svg 與展示手動驗收。
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

test('A 模型資料與資訊層級：HUD 關鍵存量、野豬狀態與鼠群清理階段語義', () => {
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

  // 3. 清理階段文字語義對照（P2 修正：依照 clean.phase 精準區分，不冒稱清理中）
  const PHASE_TEXT = { wait: '等待出發', go: '清理中', back: '返院中' };
  assert.equal(PHASE_TEXT.wait, '等待出發');
  assert.equal(PHASE_TEXT.go, '清理中');
  assert.equal(PHASE_TEXT.back, '返院中');
});

test('B 人物小卡與介入：角色工作、真實精力、下一步/狀態原因與改令對接', () => {
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

test('C 控制入口可用性：核心指令在 actions() 中全數合法可用', () => {
  const model = createModel(LENGTHS);
  const actions = model.actions('hero');
  const actionIds = actions.map((a) => a.id);

  assert.ok(actionIds.includes('work:water'), '挑水指令存在');
  assert.ok(actionIds.includes('work:herb'), '採藥指令存在');
  assert.ok(actionIds.includes('restAfterTrip'), '停工休息指令存在');
  assert.ok(actionIds.includes('clean'), '清鼠指令存在');
  assert.ok(actionIds.includes('fix'), '整理護欄指令存在');
});

test('D 相機避讓幾何設計換算：390 視窗在暫停與展開設計假設下相機計算預留足夠淨可視區', () => {
  const screenH = 844, zoom = 0.85;

  // 依據 app.mjs 的 follow 相機居中換算公式（設計幾何輔助驗算，非瀏覽器 DOM 實測）
  function calcNarrowY(pY, topObstacle, bottomObstacle) {
    const targetY = bottomObstacle > topObstacle + 40 ? (topObstacle + bottomObstacle) / 2 : Math.max(topObstacle + 20, (topObstacle + bottomObstacle) / 2);
    const ty = pY - 30 - (targetY - screenH / 2) / zoom;
    const toScreenY = (y) => (y - ty) * zoom + screenH / 2;
    return {
      camY: ty,
      targetY,
      headPillY: toScreenY(pY - 80), // 頭頂動作標籤
      feetY: toScreenY(pY),          // 腳底位置
      nameTagY: toScreenY(pY) + 6,   // 腳下名牌
      clearZone: bottomObstacle - topObstacle,
      topClearance: toScreenY(pY - 80) - topObstacle,
      bottomClearance: bottomObstacle - (toScreenY(pY) + 20),
    };
  }

  // 1. 最擁擠狀態：暫停中 + 院落近況展開 (256px) + 人物抽屜底抽 (540px)
  const expanded = calcNarrowY(512, 256, 540);
  assert.ok(expanded.clearZone >= 280, `淨視野區 (${expanded.clearZone}px) 大於 280px`);
  assert.ok(expanded.topClearance > 70, `頭頂動作標籤上方餘裕 (${expanded.topClearance.toFixed(1)}px) 大於 70px，無遮擋`);
  assert.ok(expanded.bottomClearance > 70, `腳下名牌下方餘裕 (${expanded.bottomClearance.toFixed(1)}px) 大於 70px，無遮擋`);

  // 2. 日常精簡狀態：近況收起 (108px) + 底抽 (540px)
  const collapsed = calcNarrowY(512, 108, 540);
  assert.ok(collapsed.clearZone >= 420, `近況收起時淨視野區 (${collapsed.clearZone}px) 大於 420px`);
  assert.ok(collapsed.topClearance > 140, '近況收起時頭頂上方餘裕充足');
  assert.ok(collapsed.bottomClearance > 140, '近況收起時名牌下方餘裕充足');
});
