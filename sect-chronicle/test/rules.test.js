'use strict';
// SG-02 規則表與純計算測試。預期值皆手算（算式寫在註解），不是由被測函式反推。
// 本檔只證明「規則層級」的數值與純函式；不證明時段引擎、指令、UI 或平衡。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const R = require('../js/rules.js');

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------- 版本與取整契約 ----------

test('ruleVersion 為 3（SG-05 D7-A 修為封頂；數值表沒改）；基點與 floor 取整契約', () => {
  assert.equal(R.RULE_VERSION, 3);
  assert.equal(R.BASIS_POINTS, 10000);
  assert.equal(R.ROUNDING_MODE, 'floor');
  assert.equal(R.mulBp(7, 15000), 10); // 10.5 → 10
  assert.equal(R.mulBp(-7, 15000), -11); // -10.5 → -11（向下）
  assert.equal(R.mulBp(0, 15000), 0);
  assert.ok(Object.is(R.mulBp(0, -1), 0), '-0 正規化為 0');
  assert.equal(R.mulBp(-1, 1), -1, '負數向下取整');
  assert.throws(() => R.mulBp(1.5, 10000), TypeError);
  assert.throws(() => R.mulBp(1, 0.5), TypeError);
  assert.throws(() => R.mulBp(Number.MAX_SAFE_INTEGER, 10000), RangeError);
});

// ---------- 模板與角色（唯一權威常數） ----------

test('三個模板等預算 9；自由配點 3；單項 1..6；性格兩軸枚舉', () => {
  const L = R.CHARACTER_OPTION_LIMITS;
  assert.deepEqual(Object.keys(L.templates).sort(), ['dojo-apprentice', 'farmer-child', 'herb-child']);
  const sums = Object.values(L.templates).map((t) => t.rootBone + t.comprehension + t.craft);
  assert.deepEqual(sums, [9, 9, 9]);
  assert.deepEqual(L.templates['herb-child'], { rootBone: 2, comprehension: 3, craft: 4 });
  assert.deepEqual(L.templates['farmer-child'], { rootBone: 4, comprehension: 2, craft: 3 });
  assert.deepEqual(L.templates['dojo-apprentice'], { rootBone: 3, comprehension: 4, craft: 2 });
  assert.equal(L.freePoints, 3);
  assert.equal(L.attributeMin, 1);
  assert.equal(L.attributeMax, 6);
  assert.deepEqual(L.personality.risk, ['cautious', 'bold']);
  assert.deepEqual(L.personality.bond, ['independent', 'caring']);
  // 基底本身都在上下限內，且自由點數不會讓「全部加在同一項」的合法性被規則表默默放寬
  for (const t of Object.values(L.templates)) {
    for (const v of Object.values(t)) assert.ok(v >= L.attributeMin && v <= L.attributeMax - 1);
  }
  assert.equal(Object.isFrozen(L), true);
  assert.equal(Object.isFrozen(L.templates['herb-child']), true);
  assert.equal(Object.isFrozen(L.personality.risk), true);
});

test('師父與起始數值已凍結；性格不在任何效率公式內', () => {
  assert.deepEqual(R.MASTER_ATTRIBUTES, { rootBone: 5, comprehension: 5, craft: 5 });
  assert.deepEqual(R.START_VALUES, { stamina: 100, mind: 60, cultivation: 0, injury: 0 });
  assert.deepEqual(R.VALUE_LIMITS, { staminaMax: 100, mindMax: 100, injuryMax: 100 });
  // 公式簽名沒有任何性格欄位：傳入性格不改變結果
  const base = { slotIndex: 0, comprehension: 3, stamina: 100, mind: 60, injury: 0 };
  assert.deepEqual(R.cultivationGain({ ...base, personality: { risk: 'bold', bond: 'caring' } }), R.cultivationGain(base));
});

test('SG-01 validator 與 rules 只有一份權威常數（state.js 不得再定義模板表）', () => {
  const S = require('../js/state.js');
  assert.equal(S.CHARACTER_OPTION_LIMITS, R.CHARACTER_OPTION_LIMITS);
  assert.equal(S.RULE_VERSION, R.RULE_VERSION);
  assert.equal(S.mulBp, R.mulBp);
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'state.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const lit of ["'herb-child'", "'farmer-child'", 'freePoints:', 'attributeMax:', 'PROVISIONAL']) {
    assert.equal(src.includes(lit), false, `state.js 仍含 ${lit}`);
  }
  // 預設選擇只能引用 rules 內存在的模板（不是第二份模板表）
  assert.equal(src.split("'dojo-apprentice'").length - 1, 1, '只允許預設選擇提到一次');
  assert.ok(Object.hasOwn(R.CHARACTER_OPTION_LIMITS.templates, S.DEFAULT_CHARACTER_OPTIONS.templateId));
});

// ---------- 五行 ----------

test('五行生剋以獨立索引算術核對全部 25 對關係', () => {
  const E = ['wood', 'fire', 'earth', 'metal', 'water'];
  assert.deepEqual([...R.ELEMENTS], E);
  for (let i = 0; i < 5; i++) {
    assert.equal(R.GENERATES[E[i]], E[(i + 1) % 5], `生 ${E[i]}`);
    assert.equal(R.OVERCOMES[E[i]], E[(i + 2) % 5], `剋 ${E[i]}`);
  }
  for (let s = 0; s < 5; s++) for (let f = 0; f < 5; f++) {
    // 以索引差判斷：同 0、來源生設施 f-s=1、設施生來源 s-f=1、來源剋設施 f-s=2、設施剋來源 s-f=2
    const d = (f - s + 5) % 5;
    const expected = ['same', 'feeds', 'overcome', 'overcoming', 'drain'][d];
    assert.equal(R.relation(E[s], E[f]), expected, `${E[s]}→${E[f]}`);
  }
  assert.throws(() => R.relation('wood', 'air'), RangeError);
});

test('相對關係表：本格與四鄰的基點，倍率上下限', () => {
  assert.deepEqual(R.PLACEMENT_BP.self, { same: 1000, feeds: 2000, drain: -500, overcome: -2000, overcoming: -500 });
  assert.deepEqual(R.PLACEMENT_BP.neighbor, { same: 500, feeds: 1000, drain: -250, overcome: -1000, overcoming: -250 });
  assert.equal(R.PLACEMENT_MIN_BP, 5000);
  assert.equal(R.PLACEMENT_MAX_BP, 15000);
});

// ---------- 5×5 地圖 ----------

test('固定開局版型：25 格、五行分布、資源點與可建地塊', () => {
  const tiles = R.initialTiles();
  assert.equal(tiles.length, 25);
  assert.equal(new Set(tiles.map((t) => t.id)).size, 25);
  const grid = [
    ['wood', 'fire', 'earth', 'metal', 'water'],
    ['earth', 'metal', 'water', 'wood', 'fire'],
    ['water', 'wood', 'fire', 'earth', 'metal'],
    ['fire', 'earth', 'metal', 'water', 'wood'],
    ['metal', 'water', 'wood', 'fire', 'earth'],
  ];
  const terrain = [
    ['material', 'build', 'build', 'build', 'material'],
    ['build', 'build', 'build', 'build', 'build'],
    ['herb', 'build', 'build', 'build', 'herb'],
    ['build', 'build', 'build', 'build', 'build'],
    ['material', 'build', 'build', 'build', 'herb'],
  ];
  for (const t of tiles) {
    assert.equal(t.id, `t-${t.row}-${t.col}`);
    assert.equal(t.element, grid[t.row][t.col], t.id);
    assert.equal(t.terrain, terrain[t.row][t.col], t.id);
  }
  assert.equal(tiles.filter((t) => t.terrain === 'material').length, 3);
  assert.equal(tiles.filter((t) => t.terrain === 'herb').length, 3);
  assert.equal(tiles.filter((t) => t.terrain === 'build').length, 19);
  // 每種資源點只產一種資源；資源點不能蓋設施
  assert.equal(R.TERRAIN.material.produces, 'spiritMaterial');
  assert.equal(R.TERRAIN.herb.produces, 'spiritHerb');
  assert.equal(R.TERRAIN.build.produces, null);
  assert.equal(R.TERRAIN.material.workSlots, 2);
  assert.equal(R.TERRAIN.herb.workSlots, 2);
  assert.equal(R.TERRAIN.build.buildable, true);
  assert.equal(R.TERRAIN.material.buildable, false);
});

test('initialTiles 每次回傳新副本，改動不影響常數', () => {
  const a = R.initialTiles();
  a[0].element = 'metal';
  a.pop();
  const b = R.initialTiles();
  assert.equal(b.length, 25);
  assert.equal(b[0].element, 'wood');
});

test('四鄰：邊界不環繞、斜角不算、角落／邊／內部數量', () => {
  const tiles = R.initialTiles();
  assert.deepEqual(R.neighborIds(tiles, 't-0-0'), ['t-0-1', 't-1-0']);
  assert.deepEqual(R.neighborIds(tiles, 't-4-4'), ['t-3-4', 't-4-3']);
  assert.deepEqual(R.neighborIds(tiles, 't-0-2'), ['t-0-1', 't-0-3', 't-1-2']);
  assert.deepEqual(R.neighborIds(tiles, 't-2-2'), ['t-1-2', 't-2-1', 't-2-3', 't-3-2']);
  assert.equal(R.neighborIds(tiles, 't-0-0').includes('t-0-4'), false);
  assert.equal(R.neighborIds(tiles, 't-0-0').includes('t-4-0'), false);
  assert.equal(R.neighborIds(tiles, 't-0-0').includes('t-1-1'), false);
  assert.throws(() => R.neighborIds(tiles, 't-9-9'), RangeError);
});

test('聚靈台手算：t-1-0（土）→ 本格生金 +2000；四鄰逐項', () => {
  const tiles = R.initialTiles();
  const r = R.evaluateFacilityPlacement(tiles, 't-1-0', 'spiritTerrace');
  // 聚靈台＝金。t-1-0 土（土生金 feeds +2000）；上 t-0-0 木（金剋木＝設施剋地 −250）；
  // 下 t-2-0 水（金生水＝設施生地 drain −250）；右 t-1-1 金（same +500）。合計 +2000，倍率 12000。
  assert.equal(r.ok, true);
  assert.deepEqual(r.items.map((i) => [i.source, i.element, i.relation, i.bp]), [
    ['self', 'earth', 'feeds', 2000],
    ['t-0-0', 'wood', 'overcoming', -250],
    ['t-1-1', 'metal', 'same', 500],
    ['t-2-0', 'water', 'drain', -250],
  ]);
  assert.equal(r.rawBp, 2000);
  assert.equal(r.multiplierBp, 12000);
  assert.equal(r.clamped, false);
});

test('全部可建地塊的三種設施倍率表（手算並由獨立程式核對）', () => {
  const tiles = R.initialTiles();
  const expect = {
    spiritTerrace: { 't-0-1': 9250, 't-0-2': 11250, 't-0-3': 11500, 't-1-0': 12000, 't-1-1': 10500, 't-1-2': 9750, 't-1-3': 9750, 't-1-4': 8000, 't-2-1': 9750, 't-2-2': 9000, 't-2-3': 11000, 't-3-0': 9250, 't-3-1': 11000, 't-3-2': 10500, 't-3-3': 9750, 't-3-4': 10750, 't-4-1': 10750, 't-4-2': 8750, 't-4-3': 8500 },
    alchemyRoom: { 't-0-1': 11500, 't-0-2': 8750, 't-0-3': 9250, 't-1-0': 9250, 't-1-1': 9750, 't-1-2': 9000, 't-1-3': 11000, 't-1-4': 10750, 't-2-1': 11000, 't-2-2': 10500, 't-2-3': 9750, 't-3-0': 9500, 't-3-1': 9750, 't-3-2': 9750, 't-3-3': 9000, 't-3-4': 10500, 't-4-1': 8500, 't-4-2': 11250, 't-4-3': 10750 },
    residence: { 't-0-1': 11250, 't-0-2': 11500, 't-0-3': 8750, 't-1-0': 9500, 't-1-1': 9750, 't-1-2': 9750, 't-1-3': 9000, 't-1-4': 10500, 't-2-1': 9000, 't-2-2': 11000, 't-2-3': 10500, 't-3-0': 12000, 't-3-1': 10500, 't-3-2': 9750, 't-3-3': 9750, 't-3-4': 8000, 't-4-1': 8750, 't-4-2': 8500, 't-4-3': 11250 },
  };
  for (const [fac, table] of Object.entries(expect)) {
    assert.equal(Object.keys(table).length, 19);
    for (const [id, bp] of Object.entries(table)) {
      assert.equal(R.evaluateFacilityPlacement(tiles, id, fac).multiplierBp, bp, `${fac}@${id}`);
    }
  }
});

test('倍率上下限與無鄰居：自訂小地圖', () => {
  // 無鄰居（1×1）：只有本格一項
  const solo = [{ id: 'a', row: 0, col: 0, element: 'earth', terrain: 'build' }];
  const s = R.evaluateFacilityPlacement(solo, 'a', 'spiritTerrace'); // 土生金 +2000
  assert.equal(s.items.length, 1);
  assert.equal(s.multiplierBp, 12000);
  // 上限：本格生設施 +2000 與四鄰皆生設施 +4×1000＝+6000 → 16000 夾到 15000
  const plus = (centerEl, nbEl) => [
    { id: 'c', row: 1, col: 1, element: centerEl, terrain: 'build' },
    { id: 'n', row: 0, col: 1, element: nbEl, terrain: 'build' },
    { id: 's', row: 2, col: 1, element: nbEl, terrain: 'build' },
    { id: 'w', row: 1, col: 0, element: nbEl, terrain: 'build' },
    { id: 'e', row: 1, col: 2, element: nbEl, terrain: 'build' },
  ];
  const hi = R.evaluateFacilityPlacement(plus('earth', 'earth'), 'c', 'spiritTerrace');
  assert.equal(hi.rawBp, 6000);
  assert.equal(hi.multiplierBp, 15000);
  assert.equal(hi.clamped, true);
  // 下限：本格剋設施 −2000 與四鄰皆剋 −4×1000＝−6000 → 4000 夾到 5000（木剋土；聚靈台＝金：火剋金）
  const lo = R.evaluateFacilityPlacement(plus('fire', 'fire'), 'c', 'spiritTerrace');
  assert.equal(lo.rawBp, -6000);
  assert.equal(lo.multiplierBp, 5000);
  assert.equal(lo.clamped, true);
});

test('斜角鄰格不參與；與輸入排列順序無關；不修改輸入', () => {
  const cells = [
    { id: 'c', row: 1, col: 1, element: 'wood', terrain: 'build' },
    { id: 'd1', row: 0, col: 0, element: 'earth', terrain: 'build' },
    { id: 'd2', row: 2, col: 2, element: 'earth', terrain: 'build' },
    { id: 'd3', row: 0, col: 2, element: 'earth', terrain: 'build' },
    { id: 'd4', row: 2, col: 0, element: 'earth', terrain: 'build' },
  ];
  const r = R.evaluateFacilityPlacement(cells, 'c', 'spiritTerrace');
  assert.equal(r.items.length, 1, '只有本格');
  const tiles = deepFreeze(R.initialTiles());
  const base = R.evaluateFacilityPlacement(tiles, 't-2-2', 'alchemyRoom');
  const perms = [[...tiles].reverse(), [...tiles].sort((a, b) => (a.id < b.id ? 1 : -1)),
    [...tiles.slice(7), ...tiles.slice(0, 7)]];
  for (const p of perms) assert.deepEqual(R.evaluateFacilityPlacement(p, 't-2-2', 'alchemyRoom'), base);
});

test('放置錯誤：資源點不可建、未知設施／地塊明確拒絕', () => {
  const tiles = R.initialTiles();
  assert.deepEqual(R.evaluateFacilityPlacement(tiles, 't-0-0', 'spiritTerrace'),
    { ok: false, code: 'not_buildable', reason: 't-0-0 是資源點，不能建設施' });
  assert.equal(R.evaluateFacilityPlacement(tiles, 't-9-9', 'spiritTerrace').code, 'unknown_tile');
  assert.equal(R.evaluateFacilityPlacement(tiles, 't-1-1', 'dojo').code, 'unknown_facility');
});

// ---------- 設施 ----------

test('設施資料：成本、工期、工作位、容量、拆除退款', () => {
  const F = R.FACILITIES;
  assert.deepEqual(Object.keys(F).sort(), ['alchemyRoom', 'residence', 'spiritTerrace']);
  assert.deepEqual(F.spiritTerrace, { label: '聚靈台', element: 'metal', cost: { spiritMaterial: 6 }, durationSlots: 2, workSlots: 1, restSlots: 0, maxCount: 1 });
  assert.deepEqual(F.alchemyRoom, { label: '丹房', element: 'fire', cost: { spiritMaterial: 12 }, durationSlots: 3, workSlots: 1, restSlots: 0, maxCount: 1 });
  assert.deepEqual(F.residence, { label: '居所', element: 'earth', cost: { spiritMaterial: 8 }, durationSlots: 2, workSlots: 0, restSlots: 2, maxCount: 1 });
  assert.equal(R.BUILD_WORKERS, 1);
  assert.equal(R.DEMOLISH_REFUND_BP, 5000);
  // 退款 floor(cost × 50%)：6→3、12→6、8→4
  assert.deepEqual(R.demolishRefund('spiritTerrace'), { spiritMaterial: 3 });
  assert.deepEqual(R.demolishRefund('alchemyRoom'), { spiritMaterial: 6 });
  assert.deepEqual(R.demolishRefund('residence'), { spiritMaterial: 4 });
  assert.throws(() => R.demolishRefund('dojo'), RangeError);
  assert.equal(Object.isFrozen(F.alchemyRoom.cost), true);
});

// ---------- 靈氣復甦階段 ----------

test('靈氣階段在日 1／4／7／11 的第一格切換，前一格不偷用新階段', () => {
  const idAt = (s) => R.phaseAt(s).id;
  assert.deepEqual([0, 1, 8].map(idAt), ['faint', 'faint', 'faint']);
  assert.deepEqual([9, 10, 17].map(idAt), ['omen', 'omen', 'omen']);
  assert.deepEqual([18, 19, 29].map(idAt), ['manifest', 'manifest', 'manifest']);
  assert.deepEqual([30, 31, 41, 42].map(idAt), ['surge', 'surge', 'surge', 'surge']);
  // startSlot ＝ (日−1)×3
  assert.deepEqual(R.SPIRIT_PHASES.map((p) => p.startSlot), [0, 9, 18, 30]);
  assert.deepEqual(R.SPIRIT_PHASES.map((p) => (p.startSlot / 3) + 1), [1, 4, 7, 11]);
  for (const bad of [-1, 43, 1.5, NaN, '3', null]) assert.throws(() => R.phaseAt(bad), /slotIndex|RangeError|TypeError/);
});

test('階段只隨 slotIndex 單調前進；每階段至少一項可核對效果變化', () => {
  let prev = -1;
  for (let s = 0; s <= 42; s++) {
    const idx = R.SPIRIT_PHASES.findIndex((p) => p.id === R.phaseAt(s).id);
    assert.ok(idx >= prev, `slot ${s} 不得倒退`);
    prev = idx;
  }
  const P = R.SPIRIT_PHASES;
  assert.deepEqual(P.map((p) => p.cultivationBp), [10000, 12000, 15000, 18000]);
  assert.deepEqual(P.map((p) => p.herbYield), [0, 4, 5, 5]);
  assert.deepEqual(P.map((p) => p.threatLevel), [0, 1, 2, 3]);
  for (let i = 1; i < P.length; i++) {
    const changed = P[i].cultivationBp !== P[i - 1].cultivationBp || P[i].herbYield !== P[i - 1].herbYield
      || P[i].threatLevel !== P[i - 1].threatLevel;
    assert.ok(changed, `${P[i].id} 必須與前一階段至少一項不同`);
  }
  assert.equal(Object.isFrozen(P), true);
  assert.equal(Object.isFrozen(P[0]), true);
});

// ---------- 體力／心境／傷勢分段 ----------

test('體力、心境、傷勢效率分段邊界', () => {
  assert.deepEqual([100, 60, 59, 30, 29, 0].map(R.staminaBp), [10000, 10000, 8000, 8000, 5000, 5000]);
  assert.deepEqual([100, 50, 49, 30, 29, 0].map(R.mindBp), [10000, 10000, 9000, 9000, 7000, 7000]);
  assert.deepEqual([0, 9, 10, 29, 30, 100].map(R.injuryBp), [10000, 10000, 8500, 8500, 7000, 7000]);
  for (const f of [R.staminaBp, R.mindBp, R.injuryBp]) {
    for (const bad of [-1, 101, 1.5, NaN, '5', undefined]) assert.throws(() => f(bad), RangeError);
  }
});

test('屬性係數：悟性、根骨、技藝（1..6）', () => {
  assert.deepEqual([1, 3, 5, 6].map(R.comprehensionBp), [8000, 10000, 12000, 13000]);
  assert.deepEqual([1, 3, 5, 6].map(R.rootBoneBp), [8500, 9500, 10500, 11000]);
  assert.deepEqual([1, 3, 5, 6].map(R.craftBp), [8500, 9500, 10500, 11000]);
  for (const f of [R.comprehensionBp, R.rootBoneBp, R.craftBp]) {
    for (const bad of [0, 7, 1.5, NaN]) assert.throws(() => f(bad), RangeError);
  }
});

// ---------- 修行 ----------

const cult = (o) => R.cultivationGain({ slotIndex: 0, comprehension: 3, stamina: 100, mind: 60, injury: 0, ...o });

test('修行手算：日 1 師父有可見進步（10×1.0×1.2＝12）', () => {
  const r = cult({ comprehension: 5 });
  assert.equal(r.gain, 12);
  assert.equal(r.capped, false);
  assert.deepEqual(r.factors.map((f) => f.id), ['phase', 'comprehension', 'techniqueFit', 'tile', 'stamina', 'mind', 'injury']);
  assert.equal(r.base, 10);
});

test('修行手算：顯化期聚靈台 11000、心境 40（10×1.5×1.0×1.1×1.0×0.9＝14.85→14）', () => {
  const r = cult({ slotIndex: 18, tileMultiplierBp: 11000, stamina: 70, mind: 40 });
  assert.equal(r.gain, 14);
});

test('修行：只在最後取整一次（10×0.85×0.85＝7.225→7；逐步取整會得 6）', () => {
  const r = cult({ tileMultiplierBp: 8500, injury: 10 });
  assert.equal(r.gain, 7);
});

test('修行：總倍率上限 3.0 倍、技藝契合輸入範圍', () => {
  // 獸患期 1.8×悟性 6 的 1.3×聚靈台 1.5×契合 1.2＝4.212 → 夾到 3.0 → 30
  const r = cult({ slotIndex: 30, comprehension: 6, tileMultiplierBp: 15000, techniqueFitBp: 12000 });
  assert.equal(r.gain, 30);
  assert.equal(r.capped, true);
  assert.equal(r.totalBp, 30000);
  assert.equal(R.CULTIVATION_TOTAL_CAP_BP, 30000);
  assert.equal(R.CULTIVATION_BASE, 10);
  assert.throws(() => cult({ techniqueFitBp: 9999 }), RangeError);
  assert.throws(() => cult({ techniqueFitBp: 12001 }), RangeError);
  assert.throws(() => cult({ tileMultiplierBp: 4999 }), RangeError);
  assert.throws(() => cult({ tileMultiplierBp: 15001 }), RangeError);
});

test('修行：窮舉合法輸入皆為 1..30 的安全整數，最壞狀態日 1 仍有進步', () => {
  for (const slotIndex of [0, 8, 9, 17, 18, 29, 30, 42]) {
    for (const comprehension of [1, 2, 3, 4, 5, 6]) {
      for (const stamina of [0, 29, 30, 59, 60, 100]) for (const mind of [0, 29, 30, 49, 50, 100]) {
        for (const injury of [0, 9, 10, 29, 30, 100]) for (const tile of [5000, 10000, 15000]) {
          const g = cult({ slotIndex, comprehension, stamina, mind, injury, tileMultiplierBp: tile }).gain;
          assert.ok(Number.isSafeInteger(g) && g >= 1 && g <= 30, `${slotIndex}/${comprehension}/${stamina}/${mind}/${injury}/${tile} → ${g}`);
        }
      }
    }
  }
});

test('修行：純函式——不修改輸入、同輸入同輸出、不消耗 RNG', () => {
  const input = deepFreeze({ slotIndex: 20, comprehension: 4, stamina: 55, mind: 45, injury: 12, tileMultiplierBp: 10500, techniqueFitBp: 10000 });
  const a = R.cultivationGain(input);
  const b = R.cultivationGain(input);
  assert.deepEqual(a, b);
  assert.throws(() => R.cultivationGain({ slotIndex: 0, comprehension: 3, stamina: 100, mind: 60 }), RangeError, '缺 injury');
});

// ---------- 採集、建造、煉丹 ----------

test('採集手算：靈材固定 4 × 技藝 × 體力；靈草依階段，日 1 鎖定', () => {
  const g = (o) => R.gatherYield({ resource: 'spiritMaterial', slotIndex: 0, craft: 3, stamina: 100, ...o });
  assert.equal(R.MATERIAL_BASE_YIELD, 4);
  assert.deepEqual(g({ craft: 5 }), { amount: 4, locked: false }); // 4×1.05＝4.2
  assert.deepEqual(g({}), { amount: 3, locked: false }); // 4×0.95＝3.8
  assert.deepEqual(g({ stamina: 20 }), { amount: 1, locked: false }); // 4×0.95×0.5＝1.9
  assert.equal(g({ slotIndex: 41 }).amount, 3, '靈材不隨階段變化');
  const h = (o) => R.gatherYield({ resource: 'spiritHerb', slotIndex: 9, craft: 5, stamina: 100, ...o });
  assert.deepEqual(h({ slotIndex: 0 }), { amount: 0, locked: true });
  assert.deepEqual(h({ slotIndex: 8 }), { amount: 0, locked: true });
  assert.deepEqual(h({}), { amount: 4, locked: false }); // 4×1.05＝4.2
  assert.deepEqual(h({ craft: 3 }), { amount: 3, locked: false }); // 4×0.95＝3.8
  assert.deepEqual(h({ slotIndex: 18 }), { amount: 5, locked: false }); // 5×1.05＝5.25
  assert.deepEqual(h({ slotIndex: 18, craft: 1 }), { amount: 4, locked: false }); // 5×0.85＝4.25
  assert.throws(() => R.gatherYield({ resource: 'spiritStone', slotIndex: 9, craft: 3, stamina: 100 }), RangeError);
});

test('靈石在 14 天切片中沒有來源也沒有用途（不虛構效果）', () => {
  assert.equal(R.RESOURCE_SOURCES.spiritStone, null);
  assert.deepEqual(R.RESOURCE_SINKS.spiritStone, []);
  assert.deepEqual(Object.keys(R.RESOURCE_SOURCES).sort(), ['reputation', 'spiritHerb', 'spiritMaterial', 'spiritStone']);
  const everyCost = [...Object.values(R.FACILITIES).map((f) => f.cost), ...Object.values(R.RECIPES).map((r) => r.cost),
    ...Object.values(R.AID_OPTIONS).map((o) => o.cost)];
  for (const c of everyCost) assert.equal('spiritStone' in c, false);
});

test('煉丹手算：基礎 2 顆 × 技藝 × 體力 × 丹房倍率，至少 1 顆', () => {
  const b = (o) => R.brewOutput({ recipeId: 'breakthrough-pill', craft: 5, stamina: 100, tileMultiplierBp: 12000, ...o });
  assert.deepEqual(R.RECIPES['breakthrough-pill'], { label: '凝氣丹', cost: { spiritHerb: 6, spiritMaterial: 2 }, durationSlots: 2, workers: 1, baseOutput: 2 });
  assert.deepEqual(b({}), { amount: 2, minimumApplied: false }); // 2×1.05×1.2＝2.52
  assert.deepEqual(b({ tileMultiplierBp: 15000 }), { amount: 3, minimumApplied: false }); // 2×1.05×1.5＝3.15
  assert.deepEqual(b({ craft: 1, stamina: 0, tileMultiplierBp: 5000 }), { amount: 1, minimumApplied: true }); // 0.425→0→最少 1
  assert.throws(() => b({ recipeId: 'x' }), RangeError);
  assert.throws(() => b({ tileMultiplierBp: 20000 }), RangeError);
  assert.equal(R.BREW_MIN_OUTPUT, 1);
});

// ---------- 休養、行動消耗 ----------

test('休養手算：野外／居所，根骨影響恢復量，傷勢與心境', () => {
  const rest = (o) => R.restRecovery({ rootBone: 3, ...o });
  assert.deepEqual(rest({}), { stamina: 28, mind: 5, injury: 10 }); // 30×0.95＝28.5
  assert.deepEqual(rest({ rootBone: 5 }), { stamina: 31, mind: 5, injury: 10 }); // 30×1.05＝31.5
  assert.deepEqual(rest({ atResidence: true, residenceMultiplierBp: 12000 }), { stamina: 51, mind: 8, injury: 20 }); // 45×0.95×1.2＝51.3
  assert.deepEqual(rest({ atResidence: true }), { stamina: 42, mind: 8, injury: 20 }); // 45×0.95＝42.75
  assert.throws(() => rest({ residenceMultiplierBp: 4000, atResidence: true }), RangeError);
});

test('applyRest／applyActionCost：夾在 0..上限、純函式、行動表完整', () => {
  const v = { stamina: 90, mind: 99, injury: 5 };
  const frozen = deepFreeze({ ...v });
  assert.deepEqual(R.applyRest({ ...frozen, rootBone: 3 }), { stamina: 100, mind: 100, injury: 0 });
  assert.deepEqual(frozen, v);
  assert.deepEqual(R.applyActionCost('cultivate', { stamina: 5, mind: 1 }), { stamina: 0, mind: 0 });
  assert.deepEqual(R.applyActionCost('gather-material', { stamina: 100, mind: 60 }), { stamina: 85, mind: 60 });
  assert.deepEqual(R.applyActionCost('tune-mind', { stamina: 100, mind: 95 }), { stamina: 95, mind: 100 });
  assert.deepEqual(Object.keys(R.ACTIONS).sort(), ['aid', 'breakthrough', 'brew', 'build', 'cultivate',
    'gather-herb', 'gather-material', 'rest', 'support', 'tune-mind']);
  assert.deepEqual(R.ACTIONS.cultivate, { label: '修行', staminaCost: 10, mindDelta: -3 });
  assert.deepEqual(R.ACTIONS.breakthrough, { label: '突破', staminaCost: 20, mindDelta: -5 });
  assert.deepEqual(R.ACTIONS.support, { label: '支援突破', staminaCost: 10, mindDelta: 0 });
  assert.throws(() => R.applyActionCost('rest', { stamina: 1, mind: 1 }), RangeError, '休養走 applyRest');
  assert.throws(() => R.applyActionCost('fly', { stamina: 1, mind: 1 }), RangeError);
});

// ---------- 突破 ----------

test('突破：門檻 100、成功率分項、失敗保留 70% 並產生可療養傷勢', () => {
  assert.equal(R.BREAKTHROUGH_THRESHOLD, 100);
  assert.equal(R.MAX_BREAKTHROUGHS_PER_DISCIPLE, 1);
  assert.equal(R.canAttemptBreakthrough(99), false);
  assert.equal(R.canAttemptBreakthrough(100), true);
  const c = (o) => R.breakthroughChance({ mind: 50, supporter: false, pill: false, ...o });
  assert.deepEqual(c({}), { chanceBp: 5000, items: [{ id: 'base', bp: 5000 }] });
  assert.equal(c({ supporter: true }).chanceBp, 6500);
  assert.equal(c({ pill: true }).chanceBp, 7000);
  assert.equal(c({ supporter: true, pill: true }).chanceBp, 8500);
  assert.equal(c({ mind: 60 }).chanceBp, 5500);
  assert.equal(c({ mind: 59 }).chanceBp, 5000);
  assert.equal(c({ mind: 100, supporter: true, pill: true }).chanceBp, 9000);
  assert.equal(R.BREAKTHROUGH_CHANCE_CAP_BP, 9500);
  assert.equal(R.breakthroughFailure(100).cultivation, 70);
  assert.equal(R.breakthroughFailure(133).cultivation, 93); // 133×0.7＝93.1
  assert.equal(R.breakthroughFailure(100).injuryGain, 15);
  assert.throws(() => R.breakthroughFailure(99), RangeError);
});

// ---------- 援村 ----------

test('援村：零材料入口、一人一格（D6）、一次性獎勵、日 4 起開放', () => {
  assert.deepEqual(Object.keys(R.AID_OPTIONS).sort(), ['free', 'supplied']);
  assert.equal(R.AID_ID, 'village-fence');
  assert.equal(R.AID_DURATION_SLOTS, 1, 'D6：援村占一人一格');
  assert.equal(R.AID_WORKERS, 1);
  assert.deepEqual(R.AID_OPTIONS.free, { label: '徒手協助', cost: {}, reward: { spiritMaterial: 3, spiritHerb: 2, reputation: 1 } });
  assert.deepEqual(R.AID_OPTIONS.supplied, { label: '備料協助', cost: { spiritMaterial: 4 }, reward: { spiritMaterial: 8, spiritHerb: 5, reputation: 2 } });
  assert.equal(Object.keys(R.AID_OPTIONS.free.cost).length, 0);
  assert.equal(R.aidAvailable(8), false);
  assert.equal(R.aidAvailable(9), true);
  assert.equal(R.aidAvailable(42), true);
  assert.throws(() => R.aidAvailable(43), RangeError);
  // 獎勵是副本：改動不污染常數
  const r = R.aidReward('free');
  r.spiritMaterial = 999;
  assert.equal(R.aidReward('free').spiritMaterial, 3);
  assert.throws(() => R.aidReward('x'), RangeError);
});

// ---------- 兩人開局產能與可達性 ----------

test('休養穩態比率只是穩態估算：不是有限期工作格數上界（反例：從 100 體力連續工作 42 格合法）', () => {
  // 穩態比率＝恢復量／(恢復量＋工作消耗)：根骨 3 → 28/43＝6511.6→6511；根骨 5 → 31/46＝6739.1→6739；
  // 居所（根骨 3、倍率 12000）→ 51/66＝7727.2→7727。假設：無限期重複、每工作格消耗 15、每休養格恢復固定、
  // 不計初始 100 體力、不計降效。它不描述任何有限期的可工作格數。
  assert.equal(R.steadyStateWorkShareBp({ rootBone: 3, workStaminaCost: 15 }), 6511);
  assert.equal(R.steadyStateWorkShareBp({ rootBone: 5, workStaminaCost: 15 }), 6739);
  assert.equal(R.steadyStateWorkShareBp({ rootBone: 3, workStaminaCost: 15, atResidence: true, residenceMultiplierBp: 12000 }), 7727);
  // 舊名稱與「上界」函式已移除，避免被當成規則或上限
  assert.equal('workSlotUpperBound' in R, false);
  assert.equal('workDutyBp' in R, false);
  // 真實反例：師父（根骨 5、技藝 5）從 100 體力連續 42 格採靈材。規則不禁止疲憊工作，只降效。
  // 體力序列 100,85,70,55,40,25,10,0,0…；每格產量（4×1.05×體力係數，floor）：
  //   格 0–2（≥60）4×3＝12；格 3–4（30..59→0.8）3×2＝6；格 5–41（體力 25、10、0…→0.5）2×37＝74；合計 92。
  let values = { stamina: 100, mind: 60 };
  let total = 0;
  let worked = 0;
  const staminaLog = [];
  for (let slot = 0; slot < 42; slot++) {
    staminaLog.push(values.stamina);
    total += R.gatherYield({ resource: 'spiritMaterial', slotIndex: slot, craft: 5, stamina: values.stamina }).amount;
    values = R.applyActionCost('gather-material', values);
    worked += 1;
  }
  assert.deepEqual(staminaLog.slice(0, 9), [100, 85, 70, 55, 40, 25, 10, 0, 0]);
  assert.equal(total, 92);
  assert.equal(worked, 42, '42 格全部合法工作');
  assert.ok(worked > Math.floor((42 * 6739) / 10000), '穩態比率換算的 28 格不是上界');
});

// 迷你步進器：只用 rules.js 的公式，檢查「兩人從零材料走到首座丹房與首爐丹」的數值可達性。
// 它不是引擎：沒有指令、輪候、事件，也不消耗 RNG；排程是人工假設，沒有任何「體力不足就強制休息」之類的額外規則。
// 假設（SG-03／04 可能重新定義，這裡只是選一個明確的）：
//   * 丹房蓋在 ALCHEMY_TILE，倍率由 evaluateFacilityPlacement 取得；
//   * 多格工作（煉丹 2 格）的產量取「開工那一格格初」的工作者體力；同時另算「最後一格格初」體力作敏感度對照。
const ALCHEMY_TILE = 't-0-1'; // 真實版型上丹房倍率最高的可建格（11500）
function simulateTwoPerson(plan) {
  const placement = R.evaluateFacilityPlacement(R.initialTiles(), ALCHEMY_TILE, 'alchemyRoom');
  assert.equal(placement.ok, true);
  const alchemyBp = placement.multiplierBp;
  const people = [
    { name: 'master', ...R.MASTER_ATTRIBUTES, ...R.START_VALUES },
    { name: 'protagonist', ...(() => {
      const t = R.CHARACTER_OPTION_LIMITS.templates['dojo-apprentice'];
      return { rootBone: t.rootBone + 1, comprehension: t.comprehension + 1, craft: t.craft + 1, ...R.START_VALUES };
    })() },
  ];
  const res = { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0 };
  const timeline = {
    alchemyBp, roomUsableFrom: null, firstPillSlot: null, minResource: 0,
    brewStartStamina: null, brewLastSlotStamina: null, staminaAtSlotStart: [[], []], pillsAtStart: 0, pillsAtLast: 0,
  };
  let build = null;
  let brew = null;
  let pills = 0;
  const recipe = R.RECIPES['breakthrough-pill'];
  for (let slot = 0; slot < plan.length; slot++) {
    for (let i = 0; i < 2; i++) {
      const p = people[i];
      const act = plan[slot][i];
      timeline.staminaAtSlotStart[i].push(p.stamina);
      const v = { stamina: p.stamina, mind: p.mind };
      if (act === 'rest') {
        Object.assign(p, R.applyRest({ stamina: p.stamina, mind: p.mind, injury: p.injury, rootBone: p.rootBone }));
      } else if (act === 'gather-material' || act === 'gather-herb') {
        const key = act === 'gather-material' ? 'spiritMaterial' : 'spiritHerb';
        res[key] += R.gatherYield({ resource: key, slotIndex: slot, craft: p.craft, stamina: p.stamina }).amount;
        Object.assign(p, R.applyActionCost(act, v));
      } else if (act === 'cultivate') {
        p.cultivation += R.cultivationGain({ slotIndex: slot, comprehension: p.comprehension, stamina: p.stamina, mind: p.mind, injury: p.injury }).gain;
        Object.assign(p, R.applyActionCost(act, v));
      } else if (act === 'build') {
        if (!build && timeline.roomUsableFrom === null) {
          assert.ok(res.spiritMaterial >= R.FACILITIES.alchemyRoom.cost.spiritMaterial, `slot ${slot} 開工時材料不足`);
          res.spiritMaterial -= R.FACILITIES.alchemyRoom.cost.spiritMaterial;
          build = { left: R.FACILITIES.alchemyRoom.durationSlots };
        }
        Object.assign(p, R.applyActionCost('build', v));
      } else if (act === 'brew') {
        if (!brew) {
          assert.ok(timeline.roomUsableFrom !== null && slot >= timeline.roomUsableFrom, `slot ${slot} 丹房尚未可用`);
          assert.ok(res.spiritHerb >= recipe.cost.spiritHerb && res.spiritMaterial >= recipe.cost.spiritMaterial, `slot ${slot} 煉丹材料不足`);
          res.spiritHerb -= recipe.cost.spiritHerb; res.spiritMaterial -= recipe.cost.spiritMaterial;
          brew = { left: recipe.durationSlots, owner: i, startStamina: p.stamina, lastStamina: null };
        }
        brew.lastStamina = p.stamina; // 持續更新，完工時即最後一格格初的體力
        Object.assign(p, R.applyActionCost('brew', v));
      } else {
        throw new Error(`未知排程 ${act}`);
      }
    }
    if (build) { build.left -= 1; if (build.left === 0) { timeline.roomUsableFrom = slot + 1; build = null; } }
    if (brew) {
      brew.left -= 1;
      if (brew.left === 0) {
        const owner = people[brew.owner];
        const out = (stamina) => R.brewOutput({ recipeId: 'breakthrough-pill', craft: owner.craft, stamina, tileMultiplierBp: alchemyBp }).amount;
        timeline.brewStartStamina = brew.startStamina;
        timeline.brewLastSlotStamina = brew.lastStamina;
        timeline.pillsAtStart = out(brew.startStamina);
        timeline.pillsAtLast = out(brew.lastStamina);
        pills += timeline.pillsAtStart;
        timeline.firstPillSlot = timeline.firstPillSlot ?? slot + 1;
        brew = null;
      }
    }
    for (const k of Object.keys(res)) {
      assert.ok(Number.isSafeInteger(res[k]) && res[k] >= 0, `資源 ${k} 為 ${res[k]}`);
      timeline.minResource = Math.min(timeline.minResource, res[k]);
    }
  }
  return { people, res, pills, timeline };
}

test('兩人零材料開局：免費採集與休養走到首座丹房與首爐丹（真實體力、真實放置；數值可達性，非引擎）', () => {
  const G = 'gather-material'; const H = 'gather-herb'; const C = 'cultivate'; const B = 'build'; const Y = 'brew'; const Z = 'rest';
  const plan = [
    [G, G], [G, G], [B, G], [B, Z], [B, G],
    [Z, C], [C, Z], [Z, C], [C, Z],
    [H, H], [Y, H], [Y, C], [C, Z],
  ];
  const r = simulateTwoPerson(plan);
  const t = r.timeline;
  assert.equal(t.alchemyBp, 11500, '丹房蓋在 t-0-1，倍率來自 evaluateFacilityPlacement');
  assert.equal(t.roomUsableFrom, 5, '丹房第 4 格完工、第 5 格起可用');
  assert.equal(t.minResource, 0, '全程無負庫存');
  // 師父體力（格初）：100,85,70,55,40,25,56,46,77,67,52,42,32 —— 第 10 格開工 52、第 11 格 42
  assert.deepEqual(t.staminaAtSlotStart[0], [100, 85, 70, 55, 40, 25, 56, 46, 77, 67, 52, 42, 32]);
  assert.equal(t.brewStartStamina, 52);
  assert.equal(t.brewLastSlotStamina, 42);
  // 產量手算：2 × 技藝 1.05 × 體力係數 × 倍率 1.15；體力 52（0.8）＝1.932→1；體力 42（0.8）同為 1
  assert.equal(t.pillsAtStart, 1);
  assert.equal(t.pillsAtLast, 1, '不論取開工或最後一格的體力，結論相同：1 顆');
  assert.equal(r.pills, 1);
  assert.equal(t.firstPillSlot, 12, '第 11 格結算後取得，第 12 格可用');
  // 敏感度：要得到 2 顆需要開工體力 ≥60（2×1.05×1.0×1.15＝2.415→2）；59 即降為 1（1.932→1）
  const out = (stamina) => R.brewOutput({ recipeId: 'breakthrough-pill', craft: 5, stamina, tileMultiplierBp: 11500 }).amount;
  assert.equal(out(60), 2);
  assert.equal(out(59), 1);
  // 預設倍率 10000 在這份體力下也是 1 顆（2×1.05×0.8＝1.68→1）：放置沒有改變結論
  assert.equal(R.brewOutput({ recipeId: 'breakthrough-pill', craft: 5, stamina: 52, tileMultiplierBp: 10000 }).amount, 1);
  assert.ok(r.people[1].cultivation > 0, '日 1 起修行有進步');
  assert.deepEqual(plan[0], ['gather-material', 'gather-material'], '第一個動作就是不需材料的採集');
});

test('零材料援村入口可行，且兩人在日 4 前不需要靈草就能蓋好丹房', () => {
  assert.equal(R.aidAvailable(8), false);
  assert.equal(R.aidAvailable(9), true);
  assert.deepEqual(R.AID_OPTIONS.free.cost, {});
  // 丹房成本只需靈材，靈材從第 0 格起即可免費取得
  assert.deepEqual(Object.keys(R.FACILITIES.alchemyRoom.cost), ['spiritMaterial']);
  // 最壞狀態（技藝 1、體力 0）仍採得 4×0.85×0.5＝1.7→1，不會因為疲憊而採不到
  assert.equal(R.gatherYield({ resource: 'spiritMaterial', slotIndex: 0, craft: 1, stamina: 0 }).amount, 1);
  assert.ok(R.gatherYield({ resource: 'spiritMaterial', slotIndex: 0, craft: 2, stamina: 100 }).amount >= 3);
});

// ---------- 無隱藏效果、純度、載入 ----------

test('每個資料描述都有效果鍵或明示純敘事（無虛構 buff）', () => {
  for (const [id, f] of Object.entries(R.FACILITIES)) {
    assert.ok(f.label && (f.workSlots > 0 || f.restSlots > 0), `${id} 必須有工作位或休養位`);
  }
  for (const p of R.SPIRIT_PHASES) assert.equal(typeof p.label, 'string');
  assert.deepEqual(R.PURE_NARRATIVE_FIELDS, ['SPIRIT_PHASES.label', 'FACILITIES.label', 'ACTIONS.label', 'RECIPES.label', 'AID_OPTIONS.label']);
  // 性格與模板名稱沒有任何效率欄位
  const cls = Object.keys(R.CHARACTER_OPTION_LIMITS.personality);
  assert.deepEqual(cls, ['risk', 'bond']);
});

test('rules.js 不使用 RNG、Math.random、牆鐘或 Date，也不 require 其他模組', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'rules.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Math\.random|Date\.now|new Date|performance\.now|nextInt|nextUint32/.test(src), false);
  assert.equal(/require\(/.test(src), false, 'rules.js 必須是葉節點（避免 state↔rules 循環）');
});

test('瀏覽器一般 script 載入 rules.js 後與 Node 結果相同', () => {
  const ctx = vm.createContext({});
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'rules.js'), 'utf8');
  vm.runInContext(src, ctx, { filename: 'rules.js' });
  const B = ctx.SectChronicle.Rules;
  assert.ok(B);
  assert.equal(B.RULE_VERSION, 3);
  assert.deepEqual(clone(B.initialTiles()), clone(R.initialTiles()));
  assert.equal(B.cultivationGain({ slotIndex: 0, comprehension: 5, stamina: 100, mind: 60, injury: 0 }).gain, 12);
});
