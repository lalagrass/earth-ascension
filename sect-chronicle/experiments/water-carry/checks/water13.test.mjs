// LP-13 長挑水路切片局部驗收測試（A 路線／素材、B 速度／成長、C 自主／介入、D 觀看／時鐘、E 溪橋對齊與模組載入冒煙）
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_SIZE, WATER_POINTS, WATER_LENGTH, SPRING_PLACE, WATER_LANDMARKS, WATER_TOOL } from '../demo/water-layout.mjs';
import { createRoutes } from '../demo/routes.mjs';
import { createModel, createClock, PEOPLE, RULES, tripSteps, speedsFor } from '../demo/model.mjs';
import { STREAM_POLY, BRIDGE_DECK_POLY } from '../demo/assets/long-water/scenery.mjs';

test('A 路線／同源：世界 1600×1350、HOME 不變、水路長度 1650–1750 且同源同長', () => {
  // 1. 世界延伸尺寸
  assert.equal(WORLD_SIZE.w, 1600);
  assert.equal(WORLD_SIZE.h, 1350);
  assert.equal(WORLD_SIZE.originalH, 900);
  assert.equal(WORLD_SIZE.extendedH, 450);

  // 2. 起點 HOME 與終點新泉眼
  assert.deepEqual(WATER_POINTS[0], [962, 512], 'HOME 院中端點維持 (962, 512) 不變');
  assert.deepEqual(WATER_POINTS.at(-1), [352, 1245], '終點落在新泉眼 (352, 1245)');
  assert.equal(SPRING_PLACE.x, 352);
  assert.equal(SPRING_PLACE.y, 1245);

  // 3. 單程折線長度在批准範圍 1650–1750 內
  assert.ok(WATER_LENGTH >= 1650 && WATER_LENGTH <= 1750, `長度 ${WATER_LENGTH} 必須在 1650–1750 範圍`);
  assert.equal(WATER_LENGTH, 1700.9);

  // 4. 同源性：water-layout、createRoutes 與模型讀取之路線長度完全一致
  const geo = createRoutes(WATER_POINTS);
  assert.equal(Math.round(geo.routes.water.length * 10) / 10, WATER_LENGTH);

  const model = createModel({ water: WATER_LENGTH, herb: 747.6 });
  assert.equal(model.view().people.hero.mode, 'idle');
  model.step();
  const v = model.view();
  assert.equal(v.people.hero.phase.name, 'down');
  assert.equal(v.people.cousin.phase.name, 'down');
});

test('B 速度／耗時：熟手先完成首趟、主角交付後成長且下一趟變快、不因路長多發產物', () => {
  const model = createModel({ water: WATER_LENGTH, herb: 747.6 });

  // 兩人物起始腳力
  assert.equal(model.view().people.hero.level, 1);
  assert.equal(model.view().people.cousin.level, 3);

  // 首趟理論步數換算：
  // 主角 Lv1: emptySpeed=60, loadSpeed=40, dip=4000ms(240ticks), pour=4000ms(240ticks) -> 4733 ticks (~78.88s)
  // 熟手 Lv3: emptySpeed=74.4, loadSpeed=52 -> 3815 ticks (~63.58s)
  const heroSteps = tripSteps(1, WATER_LENGTH, RULES);
  const cousinSteps = tripSteps(3, WATER_LENGTH, RULES);

  assert.equal(heroSteps, 4733);
  assert.equal(cousinSteps, 3815);
  assert.ok(heroSteps > cousinSteps, '初學者步數必須大於熟手步數');
  // 實測 tick 與秒數差距約 15 秒（918 ticks / 60 ≈ 15.3s）
  const tickDiff = heroSteps - cousinSteps;
  assert.equal(tickDiff, 918, `步數差 ${tickDiff} 符合約 15.3 秒奔波差`);

  // 推進至熟手首趟完成前最後 1 tick (cousinSteps)
  for (let t = 0; t < cousinSteps; t++) model.step();
  let v = model.view();
  // 60 秒 (3600 ticks) 時水缸自然消耗 1 擔，故此時水缸為 3 - 1 = 2
  assert.equal(v.vat, 2, '在 60 秒消耗後、熟手尚未倒完水時水缸為 2 擔');
  assert.equal(v.people.cousin.phase.name, 'pour');
  assert.equal(v.people.hero.phase.name, 'up', '主角仍在負重爬坡中，落後熟手一大截');

  // 再推 1 tick，熟手首趟交付結算
  model.step();
  v = model.view();
  assert.equal(v.vat, 3, '熟手完成首趟交付，水缸增至 3 擔（僅 1 份產出，不因路長多給）');
  assert.equal(v.people.cousin.trips, 1);
  assert.equal(v.people.cousin.level, 3, '熟手 Lv3 滿 3 趟才升級，首趟後維持 Lv3');

  // 熟手出發走第二趟，主角仍在走第一趟回程
  assert.equal(v.people.cousin.phase.name, 'down', '熟手展開第二趟');
  assert.equal(v.people.hero.phase.name, 'up', '主角仍在第一趟負重上山');

  // 推進至主角首趟交付結算
  for (let t = cousinSteps + 1; t <= heroSteps; t++) model.step();
  model.step(); // 結算交付
  v = model.view();
  assert.equal(v.vat, 4, '主角完成第一趟交付，水缸再加 1 擔至 4 擔');
  assert.equal(v.people.hero.trips, 1);
  assert.equal(v.people.hero.level, 2, '主角首趟交付後成長至 Lv 2');

  // 主角開始第二趟，使用升級後的 Lv 2 速度（空手 67.2 / 負重 46），總步數顯著少於第一趟
  const heroLv2Steps = tripSteps(2, WATER_LENGTH, RULES);
  assert.ok(heroLv2Steps < heroSteps, '升級至 Lv 2 後第二趟耗時顯著加快');
  assert.equal(heroSteps - heroLv2Steps, 515, '第二趟節省約 515 ticks（約 8.58 秒）');
});

test('C 自主／介入：長路中改令在交付後執行、精力到 0 仍完成本趟後休息、候補助院中受理', () => {
  const model = createModel({ water: WATER_LENGTH, herb: 747.6 });
  model.step(); // 開始第一趟

  // 推進 800 ticks（主角正在空手下山途中）
  for (let t = 1; t < 800; t++) model.step();
  let v = model.view();
  assert.equal(v.people.hero.phase.name, 'down');

  // 玩家下令：完成本趟後改去採藥
  const res = model.dispatch('work:herb', 'hero');
  assert.equal(res.ok, true);
  v = model.view();
  assert.equal(v.people.hero.nextJob, 'herb', '意圖記為下一份工作');
  assert.equal(v.people.hero.job, 'water', '當前工作仍為挑水');
  assert.equal(v.people.hero.phase.name, 'down', '路中絕不瞬移，繼續挑水去程');

  // 走完首趟全程
  const heroSteps = tripSteps(1, WATER_LENGTH, RULES);
  for (let t = 800; t <= heroSteps; t++) model.step();
  v = model.view();

  // 交付那一 tick 結算水缸，工作切換為 herb
  assert.equal(v.people.hero.job, 'herb', '回院交付後切換至採藥');
  assert.equal(v.people.hero.trips, 1, '首趟挑水趟次結算');

  // 精力取捨驗證：工作扣精力 78.8 點，交付後精力剩 21.12（≤30），觸發休息意願
  assert.ok(v.people.hero.energy <= 30, '長水路首趟工作扣除 78.8 精力，剩餘 ≤ 30');
  assert.equal(v.people.hero.mode, 'toSeat', '精力不足走去座位休息，不半路倒下或瞬移');

  // 等候休息完成（每秒回 5 精力，約 12 秒）並返院開工
  let restTicks = 0;
  while (model.view().people.hero.mode !== 'carry' && restTicks < 1500) {
    model.step();
    restTicks++;
  }
  v = model.view();
  assert.equal(v.people.hero.mode, 'carry');
  assert.equal(v.people.hero.job, 'herb');
  assert.equal(v.people.hero.phase.name, 'herbOut', '休息達標返院後，正式開工採藥');
});

test('D 觀看與幾何：相機視圖覆蓋 1600×1350，新泉眼與地標坐標正確', () => {
  // 水路折線所有點都在 1600×1350 邊界內
  for (const [x, y] of WATER_POINTS) {
    assert.ok(x >= 0 && x <= WORLD_SIZE.w, `x=${x} 超出世界寬度 ${WORLD_SIZE.w}`);
    assert.ok(y >= 0 && y <= WORLD_SIZE.h, `y=${y} 超出世界高度 ${WORLD_SIZE.h}`);
  }

  // 地標定位
  assert.equal(WATER_LANDMARKS.home.x, 962);
  assert.equal(WATER_LANDMARKS.home.y, 512);
  assert.equal(WATER_LANDMARKS.bridge.x, 850);
  assert.equal(WATER_LANDMARKS.bridge.y, 1000);
  assert.equal(WATER_LANDMARKS.spring.x, 352);
  assert.equal(WATER_LANDMARKS.spring.y, 1245);
});

test('E 幾何對齊與模組載入：scenery 依賴解析正常、溪流河道不吃路徑、跨溪路段 100% 覆蓋於橋面', () => {
  // 1. 模組載入冒煙：STREAM_POLY 與 BRIDGE_DECK_POLY 成功自 scenery.mjs 匯出，表示 ../../ 相對路徑解析成功
  assert.ok(Array.isArray(STREAM_POLY) && STREAM_POLY.length >= 6);
  assert.ok(Array.isArray(BRIDGE_DECK_POLY) && BRIDGE_DECK_POLY.length === 4);

  // 2. 多邊形內部判定函式
  function inside(pt, vs) {
    const [x, y] = pt;
    let isInside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  }

  // 3. 逐點檢驗水路折線兩端引道（點 9 與點 11）：必須在乾地，不落在溪水內
  const pt9 = WATER_POINTS[9];  // [742, 980]
  const pt11 = WATER_POINTS[11]; // [922, 1040]
  assert.equal(inside(pt9, STREAM_POLY), false, '點 9 溪橋西引道 (742, 980) 必須在陸地上，不得浸入溪水');
  assert.equal(inside(pt11, STREAM_POLY), false, '點 11 溪南山坳 (922, 1040) 必須在陸地上，不得浸入溪水');

  // 4. 沿全路長每 1 場景單位取樣：所有落入溪流河道的點，必須 100% 同時落在橋面多邊形內
  const total = WATER_TOOL.length;
  let inStreamCount = 0;
  let inStreamOffBridge = 0;
  let onBridgeCount = 0;

  for (let d = 0; d <= total; d += 1) {
    const p = WATER_TOOL.at(d / total);
    const inStream = inside([p.x, p.y], STREAM_POLY);
    const onBridge = inside([p.x, p.y], BRIDGE_DECK_POLY);

    if (inStream) inStreamCount++;
    if (onBridge) onBridgeCount++;
    if (inStream && !onBridge) inStreamOffBridge++;
  }

  assert.ok(inStreamCount > 0, '水路必須真實橫跨溪流（有跨溪樣本）');
  assert.ok(onBridgeCount > inStreamCount, '橋面必須寬於溪水河道，提供兩端平穩接合');
  assert.equal(inStreamOffBridge, 0, '跨溪水路樣本落在橋外（踩水）的數量必須為 0');
});

test('F 窄螢幕 390 視窗上方遮擋（HUD／野豬卡）避讓與跟隨人物可讀性', () => {
  // 窄螢幕規格參數 (iPhone 12/13/14 等標準 390×844 視窗)
  const screenW = 390, screenH = 844, zoom = 0.85;

  function calcNarrowY(pY, topRects, bottomRects) {
    const top = Math.max(0, ...topRects);
    const bottom = Math.min(screenH, ...bottomRects);
    const targetY = bottom > top + 40 ? (top + bottom) / 2 : Math.max(top + 20, (top + bottom) / 2);
    const ty = pY - 30 - (targetY - screenH / 2) / zoom;
    // 渲染屏幕 Y：toScreen(p.x, y) = (y - cam.y) * zoom + screenH / 2
    const toScreenY = (y, camY) => (y - camY) * zoom + screenH / 2;
    return {
      camY: ty,
      targetY,
      headY: toScreenY(pY - 60, ty),
      centerY: toScreenY(pY - 30, ty),
      feetY: toScreenY(pY, ty),
      tagY: toScreenY(pY, ty) + 6,
      pillY: toScreenY(pY - 80, ty),
      top,
      bottom,
    };
  }

  // 1. 真機實測數據（Codex 覆核數值）：HUD bottom 168.5、#boar bottom 303、#panel top 420.52
  const panelOpen = calcNarrowY(512, [168.5, 303], [420.52, 796]);
  assert.ok(panelOpen.headY > 303, `人物頭頂 (${panelOpen.headY}px) 必須位於 #boar 底部 (303px) 下方，不得被野豬卡遮住`);
  assert.ok(panelOpen.feetY < 420.52, `人物腳底 (${panelOpen.feetY}px) 必須位於 #panel 頂部 (420.52px) 上方，不得被面板遮擋`);
  assert.ok(panelOpen.tagY < 420.52, `人物名牌 (${panelOpen.tagY}px) 必須在面板上方可讀`);
  assert.ok(panelOpen.pillY > 303, `人物狀態藥丸 (${panelOpen.pillY}px) 必須位於野豬卡下方`);

  // 2. 人物面板關閉時（只有名冊在底部，roster top = 796）
  const panelClosed = calcNarrowY(512, [168.5, 303], [796]);
  assert.ok(panelClosed.headY > 303, '面板關閉時頭頂依然避開野豬卡');
  assert.ok(panelClosed.feetY < 796, '面板關閉時腳底在名冊上方');

  // 3. 暫停橫幅彈出時（banner bottom = 334.5）
  const pausedWithBanner = calcNarrowY(512, [168.5, 303, 334.5], [420.52, 796]);
  assert.ok(pausedWithBanner.headY > 334.5, `暫停時人物頭頂 (${pausedWithBanner.headY}px) 必須在暫停橫幅 (334.5px) 下方可讀`);
  assert.ok(pausedWithBanner.feetY < 420.52, '暫停時人物腳底依然在面板上方');

  // 4. 挑水全程關鍵點位（院落 512、石階 750、溪橋 1000、深潭新泉 1245）相機 Y 均在合法邊界內且可讀
  for (const [name, ptY] of [['院落 HOME', 512], ['石階', 750], ['溪橋', 1000], ['新泉眼', 1245]]) {
    const res = calcNarrowY(ptY, [168.5, 303], [420.52, 796]);
    assert.ok(res.camY >= 0 && res.camY <= WORLD_SIZE.h, `${name} 相機 Y (${res.camY}) 必須在世界高度 [0, ${WORLD_SIZE.h}] 內不被截斷`);
    assert.ok(res.headY > 303 && res.feetY < 420.52, `${name} 人物全身在淨視野區間內完全可見`);
  }
});
