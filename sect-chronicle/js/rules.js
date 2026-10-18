/*
 * SG-02：規則表與純計算（ruleVersion 2）。
 *
 * 範圍界線（設計 0.2／issue #81）：
 * - 只放「數值表」與「純規則查詢／計算」：模板與角色上限、五行與地圖、設施、靈氣階段、採集／建造／煉丹／修行／
 *   休養／突破／援村的數值與公式。沒有指令、排程、扣款、結算引擎、RNG、事件資料（SG-02A）或 UI。
 * - 全部是純函式：不修改輸入、不消耗 RNG（本檔不 require 任何模組，也不碰 Math.random／牆鐘）。
 * - 數值皆為候選規則基線：本輪測試用，不代表平衡或真人樂趣已驗收。所有倍率用整數基點（10000＝1.0）。
 * - 取整契約：複合倍率以 BigInt 精確相乘，「最後只取整一次」，一律 floor；總倍率有明確上限。
 * - 載入策略：Node 以 CommonJS；瀏覽器以一般 <script>（需在 state.js 之前），掛在 globalThis.SectChronicle.Rules。
 * - 改動任何數值表都必須升 RULE_VERSION，並在 PR 說明舊 fixture 的變化。
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    root.SectChronicle = root.SectChronicle || {};
    root.SectChronicle.Rules = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- 深凍結 ----------
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      for (const k of Object.keys(o)) deepFreeze(o[k]);
    }
    return o;
  }
  const freeze = deepFreeze;

  // ---------- 版本與取整契約 ----------
  // 1 = SG-01 暫定值；2 = SG-02 凍結的候選規則基線。schemaVersion／rngVersion 不因此改變。
  const RULE_VERSION = 2;
  const BASIS_POINTS = 10000;
  const ROUNDING_MODE = 'floor';

  function mulBp(value, bp) {
    if (!Number.isInteger(value) || !Number.isInteger(bp)) {
      throw new TypeError('mulBp 只接受整數');
    }
    const product = value * bp;
    if (!Number.isSafeInteger(product)) throw new RangeError('mulBp 乘積超出安全整數');
    return Math.floor(product / BASIS_POINTS) + 0; // + 0 把 -0 正規化成 0
  }

  function intIn(name, v, lo, hi) {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || Object.is(v, -0) || v < lo || v > hi) {
      throw new RangeError(`${name} 必須是 ${lo}..${hi} 的整數（收到 ${String(v)}）`);
    }
    return v;
  }

  // ---------- 角色模板（SG-01 暫定值，SG-02 凍結；state.js 的唯一權威來源） ----------
  // 本版沒有可核對的舊模板來源（原型未入庫），三個模板都是「本版新模板」：總預算皆 9，只有分布不同。
  const CHARACTER_OPTION_LIMITS = freeze({
    templates: {
      'herb-child': { rootBone: 2, comprehension: 3, craft: 4 }, // 採藥童
      'farmer-child': { rootBone: 4, comprehension: 2, craft: 3 }, // 農家子
      'dojo-apprentice': { rootBone: 3, comprehension: 4, craft: 2 }, // 道館學徒
    },
    freePoints: 3,
    attributeMin: 1,
    attributeMax: 6,
    personality: {
      risk: ['cautious', 'bold'], // 謹慎／果敢（只影響事件建議與台詞，不改任何效率）
      bond: ['independent', 'caring'], // 獨立／重情
    },
  });
  const MASTER_ATTRIBUTES = freeze({ rootBone: 5, comprehension: 5, craft: 5 });
  const START_VALUES = freeze({ stamina: 100, mind: 60, cultivation: 0, injury: 0 });
  const VALUE_LIMITS = freeze({ staminaMax: 100, mindMax: 100, injuryMax: 100 });

  // ---------- 五行 ----------
  const ELEMENTS = freeze(['wood', 'fire', 'earth', 'metal', 'water']);
  const GENERATES = freeze({ wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' });
  const OVERCOMES = freeze({ wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' });

  function checkElement(name, e) {
    if (typeof e !== 'string' || !ELEMENTS.includes(e)) throw new RangeError(`${name} 不是五行之一：${String(e)}`);
  }
  // 來源地塊五行 source 對設施五行 facility 的關係。五種元素兩兩恰有一種關係。
  function relation(source, facility) {
    checkElement('source', source);
    checkElement('facility', facility);
    if (source === facility) return 'same';
    if (GENERATES[source] === facility) return 'feeds'; // 來源生設施：加成
    if (GENERATES[facility] === source) return 'drain'; // 設施生來源：被洩
    if (OVERCOMES[source] === facility) return 'overcome'; // 來源剋設施：減成
    return 'overcoming'; // 設施剋來源：略減
  }

  // 放置倍率：本格與四鄰各自查表相加；10000 + 總和，夾在上下限。只算一跳，不做多層連鎖。
  const PLACEMENT_BP = freeze({
    self: { same: 1000, feeds: 2000, drain: -500, overcome: -2000, overcoming: -500 },
    neighbor: { same: 500, feeds: 1000, drain: -250, overcome: -1000, overcoming: -250 },
  });
  const PLACEMENT_MIN_BP = 5000;
  const PLACEMENT_MAX_BP = 15000;

  // ---------- 設施 ----------
  const FACILITIES = freeze({
    spiritTerrace: { label: '聚靈台', element: 'metal', cost: { spiritMaterial: 6 }, durationSlots: 2, workSlots: 1, restSlots: 0, maxCount: 1 },
    alchemyRoom: { label: '丹房', element: 'fire', cost: { spiritMaterial: 12 }, durationSlots: 3, workSlots: 1, restSlots: 0, maxCount: 1 },
    residence: { label: '居所', element: 'earth', cost: { spiritMaterial: 8 }, durationSlots: 2, workSlots: 0, restSlots: 2, maxCount: 1 },
  });
  const BUILD_WORKERS = 1;
  const DEMOLISH_REFUND_BP = 5000;

  function facilityOf(type) {
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(FACILITIES, type)) {
      throw new RangeError(`未知設施：${String(type)}`);
    }
    return FACILITIES[type];
  }
  function demolishRefund(type) {
    const f = facilityOf(type);
    const out = {};
    for (const k of Object.keys(f.cost)) out[k] = mulBp(f.cost[k], DEMOLISH_REFUND_BP);
    return out;
  }

  // ---------- 5×5 地圖 ----------
  const MAP_SIZE = 5;
  const TERRAIN = freeze({
    material: { label: '靈材點', produces: 'spiritMaterial', workSlots: 2, buildable: false },
    herb: { label: '靈草點', produces: 'spiritHerb', workSlots: 2, buildable: false },
    build: { label: '可建地塊', produces: null, workSlots: 0, buildable: true },
  });
  // 五行以 (2×row + col) mod 5 排列：每行每列五行各一次；資源點固定在邊角，不隨機洗牌。
  const MAP_TERRAIN = freeze([
    ['material', 'build', 'build', 'build', 'material'],
    ['build', 'build', 'build', 'build', 'build'],
    ['herb', 'build', 'build', 'build', 'herb'],
    ['build', 'build', 'build', 'build', 'build'],
    ['material', 'build', 'build', 'build', 'herb'],
  ]);
  function initialTiles() {
    const tiles = [];
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        tiles.push({
          id: `t-${row}-${col}`, row, col,
          element: ELEMENTS[(2 * row + col) % 5],
          terrain: MAP_TERRAIN[row][col],
        });
      }
    }
    return tiles;
  }

  function neighborIds(tiles, tileId) {
    const t = tiles.find((x) => x.id === tileId);
    if (!t) throw new RangeError(`未知地塊：${String(tileId)}`);
    return tiles
      .filter((o) => Math.abs(o.row - t.row) + Math.abs(o.col - t.col) === 1) // 四鄰：不環繞、不含斜角
      .map((o) => o.id)
      .sort();
  }

  function evaluateFacilityPlacement(tiles, tileId, facilityType) {
    if (typeof facilityType !== 'string' || !Object.prototype.hasOwnProperty.call(FACILITIES, facilityType)) {
      return { ok: false, code: 'unknown_facility', reason: `未知設施：${String(facilityType)}` };
    }
    const tile = tiles.find((x) => x.id === tileId);
    if (!tile) return { ok: false, code: 'unknown_tile', reason: `未知地塊：${String(tileId)}` };
    if (!TERRAIN[tile.terrain] || !TERRAIN[tile.terrain].buildable) {
      return { ok: false, code: 'not_buildable', reason: `${tile.id} 是資源點，不能建設施` };
    }
    const fe = FACILITIES[facilityType].element;
    const items = [];
    const selfRel = relation(tile.element, fe);
    items.push({ source: 'self', element: tile.element, relation: selfRel, bp: PLACEMENT_BP.self[selfRel] });
    for (const nid of neighborIds(tiles, tileId)) {
      const n = tiles.find((x) => x.id === nid);
      const r = relation(n.element, fe);
      items.push({ source: nid, element: n.element, relation: r, bp: PLACEMENT_BP.neighbor[r] });
    }
    const rawBp = items.reduce((s, i) => s + i.bp, 0);
    const unclamped = BASIS_POINTS + rawBp;
    const multiplierBp = Math.min(PLACEMENT_MAX_BP, Math.max(PLACEMENT_MIN_BP, unclamped));
    return { ok: true, items, rawBp, multiplierBp, clamped: multiplierBp !== unclamped };
  }

  // ---------- 靈氣復甦階段（只隨 slotIndex 決定；切換發生在該日第一格開始前） ----------
  const SPIRIT_PHASES = freeze([
    { id: 'faint', label: '微弱', startSlot: 0, cultivationBp: 10000, herbYield: 0, threatLevel: 0 }, // 日 1
    { id: 'omen', label: '初兆', startSlot: 9, cultivationBp: 12000, herbYield: 4, threatLevel: 1 }, // 日 4
    { id: 'manifest', label: '顯化', startSlot: 18, cultivationBp: 15000, herbYield: 5, threatLevel: 2 }, // 日 7
    { id: 'surge', label: '獸患升溫', startSlot: 30, cultivationBp: 18000, herbYield: 5, threatLevel: 3 }, // 日 11
  ]);
  const MAX_SLOT_INDEX = 42;
  function phaseAt(slotIndex) {
    intIn('slotIndex', slotIndex, 0, MAX_SLOT_INDEX);
    let current = SPIRIT_PHASES[0];
    for (const p of SPIRIT_PHASES) if (slotIndex >= p.startSlot) current = p;
    return current;
  }

  // ---------- 體力／心境／傷勢與屬性係數 ----------
  function staminaBp(stamina) {
    intIn('stamina', stamina, 0, VALUE_LIMITS.staminaMax);
    return stamina >= 60 ? 10000 : stamina >= 30 ? 8000 : 5000;
  }
  function mindBp(mind) {
    intIn('mind', mind, 0, VALUE_LIMITS.mindMax);
    return mind >= 50 ? 10000 : mind >= 30 ? 9000 : 7000;
  }
  function injuryBp(injury) {
    intIn('injury', injury, 0, VALUE_LIMITS.injuryMax);
    return injury >= 30 ? 7000 : injury >= 10 ? 8500 : 10000;
  }
  const ATTR_MIN = CHARACTER_OPTION_LIMITS.attributeMin;
  const ATTR_MAX = CHARACTER_OPTION_LIMITS.attributeMax;
  function comprehensionBp(v) { intIn('comprehension', v, ATTR_MIN, ATTR_MAX); return 7000 + 1000 * v; } // 悟性：只影響修行
  function rootBoneBp(v) { intIn('rootBone', v, ATTR_MIN, ATTR_MAX); return 8000 + 500 * v; } // 根骨：只影響休養恢復
  function craftBp(v) { intIn('craft', v, ATTR_MIN, ATTR_MAX); return 8000 + 500 * v; } // 技藝：只影響採集與煉丹

  // ---------- 修行 ----------
  const CULTIVATION_BASE = 10;
  const CULTIVATION_TOTAL_CAP_BP = 30000;
  const CULTIVATION_MIN_GAIN = 1; // 日 1 起每次修行至少有可見進步
  const TECHNIQUE_FIT_MIN_BP = 10000;
  const TECHNIQUE_FIT_MAX_BP = 12000;

  // 修行 = 基礎 × 階段 × 悟性 × 功法契合 × 地塊 × 體力 × 心境 × 傷勢；
  // 以 BigInt 精確相乘、總倍率夾 3.0、最後 floor 一次、至少 1。純計算，不消耗 RNG。
  // techniqueFitBp 目前沒有狀態欄位提供來源，預設 10000（無加成）；性格不是輸入。
  function cultivationGain(input) {
    const slotIndex = intIn('slotIndex', input.slotIndex, 0, MAX_SLOT_INDEX);
    const tile = input.tileMultiplierBp === undefined ? BASIS_POINTS : input.tileMultiplierBp;
    intIn('tileMultiplierBp', tile, PLACEMENT_MIN_BP, PLACEMENT_MAX_BP);
    const fit = input.techniqueFitBp === undefined ? BASIS_POINTS : input.techniqueFitBp;
    intIn('techniqueFitBp', fit, TECHNIQUE_FIT_MIN_BP, TECHNIQUE_FIT_MAX_BP);
    const factors = [
      { id: 'phase', bp: phaseAt(slotIndex).cultivationBp },
      { id: 'comprehension', bp: comprehensionBp(input.comprehension) },
      { id: 'techniqueFit', bp: fit },
      { id: 'tile', bp: tile },
      { id: 'stamina', bp: staminaBp(input.stamina) },
      { id: 'mind', bp: mindBp(input.mind) },
      { id: 'injury', bp: injuryBp(input.injury) },
    ];
    const bpN = BigInt(BASIS_POINTS);
    const n = factors.length;
    let product = 1n;
    for (const f of factors) product *= BigInt(f.bp);
    const capProduct = BigInt(CULTIVATION_TOTAL_CAP_BP) * bpN ** BigInt(n - 1);
    const capped = product > capProduct;
    if (capped) product = capProduct;
    const raw = Number((BigInt(CULTIVATION_BASE) * product) / bpN ** BigInt(n));
    const gain = Math.max(CULTIVATION_MIN_GAIN, raw);
    return {
      gain, base: CULTIVATION_BASE, totalBp: Number(product / bpN ** BigInt(n - 1)), capped,
      minimumApplied: raw < CULTIVATION_MIN_GAIN, factors,
    };
  }

  // ---------- 資源來源／用途 ----------
  // 靈石在 14 天切片沒有來源也沒有用途（欄位只為 schema 相容保留）；聲望只由援村獲得，不是耗材。
  const RESOURCE_SOURCES = freeze({ spiritMaterial: 'gather-material', spiritHerb: 'gather-herb', spiritStone: null, reputation: 'aid' });
  const RESOURCE_SINKS = freeze({
    spiritMaterial: ['build', 'brew', 'aid-supplied'], spiritHerb: ['brew'], spiritStone: [], reputation: [],
  });

  // ---------- 採集 ----------
  const MATERIAL_BASE_YIELD = 4;
  // 採集 = 基礎 × 技藝 × 體力（悟性與性格不參與）。靈草基礎量依階段；日 1 鎖定。
  function gatherYield(input) {
    const slotIndex = intIn('slotIndex', input.slotIndex, 0, MAX_SLOT_INDEX);
    let base;
    if (input.resource === 'spiritMaterial') base = MATERIAL_BASE_YIELD;
    else if (input.resource === 'spiritHerb') base = phaseAt(slotIndex).herbYield;
    else throw new RangeError(`不可採集的資源：${String(input.resource)}`);
    const c = craftBp(input.craft);
    const s = staminaBp(input.stamina);
    if (base === 0) return { amount: 0, locked: true };
    return { amount: Math.floor((base * c * s) / (BASIS_POINTS * BASIS_POINTS)), locked: false };
  }

  // ---------- 煉丹 ----------
  const RECIPES = freeze({
    'breakthrough-pill': { label: '凝氣丹', cost: { spiritHerb: 6, spiritMaterial: 2 }, durationSlots: 2, workers: 1, baseOutput: 2 },
  });
  const BREW_MIN_OUTPUT = 1;
  function brewOutput(input) {
    if (typeof input.recipeId !== 'string' || !Object.prototype.hasOwnProperty.call(RECIPES, input.recipeId)) {
      throw new RangeError(`未知配方：${String(input.recipeId)}`);
    }
    const tile = input.tileMultiplierBp === undefined ? BASIS_POINTS : input.tileMultiplierBp;
    intIn('tileMultiplierBp', tile, PLACEMENT_MIN_BP, PLACEMENT_MAX_BP);
    const c = craftBp(input.craft);
    const s = staminaBp(input.stamina);
    const raw = Math.floor((RECIPES[input.recipeId].baseOutput * c * s * tile) / (BASIS_POINTS ** 3));
    return { amount: Math.max(BREW_MIN_OUTPUT, raw), minimumApplied: raw < BREW_MIN_OUTPUT };
  }

  // ---------- 行動消耗與休養 ----------
  const ACTIONS = freeze({
    'gather-material': { label: '採集靈材', staminaCost: 15, mindDelta: 0 },
    'gather-herb': { label: '採集靈草', staminaCost: 15, mindDelta: 0 },
    cultivate: { label: '修行', staminaCost: 10, mindDelta: -3 },
    rest: { label: '休養', staminaCost: 0, mindDelta: 0, special: 'rest' }, // 恢復量見 restRecovery
    'tune-mind': { label: '調心', staminaCost: 5, mindDelta: 12 },
    build: { label: '建造', staminaCost: 15, mindDelta: 0 },
    brew: { label: '煉丹', staminaCost: 10, mindDelta: 0 },
    aid: { label: '援村', staminaCost: 15, mindDelta: 0 },
    breakthrough: { label: '突破', staminaCost: 20, mindDelta: -5 },
    support: { label: '支援突破', staminaCost: 10, mindDelta: 0 },
  });
  const REST_WILD = freeze({ stamina: 30, mind: 5, injury: 10 }); // 免費、永遠可用
  const REST_RESIDENCE = freeze({ stamina: 45, mind: 8, injury: 20 }); // 需要已完工居所的休養位

  function restRecovery(input) {
    const root = rootBoneBp(input.rootBone);
    const res = input.residenceMultiplierBp === undefined ? BASIS_POINTS : input.residenceMultiplierBp;
    intIn('residenceMultiplierBp', res, PLACEMENT_MIN_BP, PLACEMENT_MAX_BP);
    if (input.atResidence === true) {
      return {
        stamina: Math.floor((REST_RESIDENCE.stamina * root * res) / (BASIS_POINTS * BASIS_POINTS)),
        mind: REST_RESIDENCE.mind, injury: REST_RESIDENCE.injury,
      };
    }
    return { stamina: Math.floor((REST_WILD.stamina * root) / BASIS_POINTS), mind: REST_WILD.mind, injury: REST_WILD.injury };
  }
  const clamp = (v, hi) => Math.min(hi, Math.max(0, v));
  function applyRest(input) {
    intIn('stamina', input.stamina, 0, VALUE_LIMITS.staminaMax);
    intIn('mind', input.mind, 0, VALUE_LIMITS.mindMax);
    intIn('injury', input.injury, 0, VALUE_LIMITS.injuryMax);
    const r = restRecovery(input);
    return {
      stamina: clamp(input.stamina + r.stamina, VALUE_LIMITS.staminaMax),
      mind: clamp(input.mind + r.mind, VALUE_LIMITS.mindMax),
      injury: clamp(input.injury - r.injury, VALUE_LIMITS.injuryMax),
    };
  }
  function applyActionCost(actionId, values) {
    if (typeof actionId !== 'string' || !Object.prototype.hasOwnProperty.call(ACTIONS, actionId)) {
      throw new RangeError(`未知行動：${String(actionId)}`);
    }
    const a = ACTIONS[actionId];
    if (a.special === 'rest') throw new RangeError('休養請使用 applyRest');
    intIn('stamina', values.stamina, 0, VALUE_LIMITS.staminaMax);
    intIn('mind', values.mind, 0, VALUE_LIMITS.mindMax);
    return {
      stamina: clamp(values.stamina - a.staminaCost, VALUE_LIMITS.staminaMax),
      mind: clamp(values.mind + a.mindDelta, VALUE_LIMITS.mindMax),
    };
  }

  // ---------- 突破 ----------
  const BREAKTHROUGH_THRESHOLD = 100;
  const MAX_BREAKTHROUGHS_PER_DISCIPLE = 1;
  const BREAKTHROUGH_CHANCE_CAP_BP = 9500;
  const BREAKTHROUGH_FAIL_KEEP_BP = 7000;
  const BREAKTHROUGH_FAIL_INJURY = 15;
  function canAttemptBreakthrough(cultivation) {
    intIn('cultivation', cultivation, 0, Number.MAX_SAFE_INTEGER);
    return cultivation >= BREAKTHROUGH_THRESHOLD;
  }
  // 成功率只是機率（基點）；抽樣由 SG-05 以單一 RNG 完成，本函式不消耗 RNG。
  function breakthroughChance(input) {
    intIn('mind', input.mind, 0, VALUE_LIMITS.mindMax);
    const items = [{ id: 'base', bp: 5000 }];
    if (input.supporter === true) items.push({ id: 'supporter', bp: 1500 });
    if (input.pill === true) items.push({ id: 'pill', bp: 2000 });
    if (input.mind >= 60) items.push({ id: 'mind', bp: 500 });
    const sum = items.reduce((s, i) => s + i.bp, 0);
    return { chanceBp: Math.min(BREAKTHROUGH_CHANCE_CAP_BP, sum), items };
  }
  function breakthroughFailure(cultivation) {
    intIn('cultivation', cultivation, BREAKTHROUGH_THRESHOLD, Number.MAX_SAFE_INTEGER);
    return { cultivation: mulBp(cultivation, BREAKTHROUGH_FAIL_KEEP_BP), injuryGain: BREAKTHROUGH_FAIL_INJURY };
  }

  // ---------- 援村（零材料入口、一次性獎勵） ----------
  const AID_ID = 'village-fence';
  const AID_DURATION_SLOTS = 1; // D6（OPENING_REVISION §3、GDD §4）：援村占一人一格
  const AID_WORKERS = 1;
  const AID_AVAILABLE_FROM_SLOT = SPIRIT_PHASES[1].startSlot; // 日 4 初兆起有人求援
  const AID_OPTIONS = freeze({
    free: { label: '徒手協助', cost: {}, reward: { spiritMaterial: 3, spiritHerb: 2, reputation: 1 } },
    supplied: { label: '備料協助', cost: { spiritMaterial: 4 }, reward: { spiritMaterial: 8, spiritHerb: 5, reputation: 2 } },
  });
  function aidAvailable(slotIndex) {
    intIn('slotIndex', slotIndex, 0, MAX_SLOT_INDEX);
    return slotIndex >= AID_AVAILABLE_FROM_SLOT;
  }
  function aidReward(optionId) {
    if (typeof optionId !== 'string' || !Object.prototype.hasOwnProperty.call(AID_OPTIONS, optionId)) {
      throw new RangeError(`未知援村選項：${String(optionId)}`);
    }
    return { ...AID_OPTIONS[optionId].reward };
  }

  // ---------- 休養穩態比率（估算，不是上界） ----------
  // 穩態比率＝恢復量／(恢復量＋每工作格體力消耗)。假設：無限期重複「工作 n 格、休養 1 格」、不計初始體力、
  // 不計體力分段降效與心境。規則允許體力 0 時繼續工作（只降效），所以這不是任何有限期內「可工作格數」的上界。
  function steadyStateWorkShareBp(input) {
    intIn('workStaminaCost', input.workStaminaCost, 1, VALUE_LIMITS.staminaMax);
    const gain = restRecovery(input).stamina;
    return Math.floor((gain * BASIS_POINTS) / (gain + input.workStaminaCost));
  }

  // 資料描述中「純敘事、沒有效果」的欄位明示在此；其餘欄位皆參與計算。
  const PURE_NARRATIVE_FIELDS = freeze([
    'SPIRIT_PHASES.label', 'FACILITIES.label', 'ACTIONS.label', 'RECIPES.label', 'AID_OPTIONS.label',
  ]);

  return {
    RULE_VERSION, BASIS_POINTS, ROUNDING_MODE, mulBp,
    CHARACTER_OPTION_LIMITS, MASTER_ATTRIBUTES, START_VALUES, VALUE_LIMITS,
    ELEMENTS, GENERATES, OVERCOMES, relation, PLACEMENT_BP, PLACEMENT_MIN_BP, PLACEMENT_MAX_BP,
    FACILITIES, BUILD_WORKERS, DEMOLISH_REFUND_BP, demolishRefund,
    MAP_SIZE, TERRAIN, initialTiles, neighborIds, evaluateFacilityPlacement,
    SPIRIT_PHASES, MAX_SLOT_INDEX, phaseAt,
    staminaBp, mindBp, injuryBp, comprehensionBp, rootBoneBp, craftBp,
    CULTIVATION_BASE, CULTIVATION_TOTAL_CAP_BP, CULTIVATION_MIN_GAIN, cultivationGain,
    RESOURCE_SOURCES, RESOURCE_SINKS, MATERIAL_BASE_YIELD, gatherYield,
    RECIPES, BREW_MIN_OUTPUT, brewOutput,
    ACTIONS, REST_WILD, REST_RESIDENCE, restRecovery, applyRest, applyActionCost,
    BREAKTHROUGH_THRESHOLD, MAX_BREAKTHROUGHS_PER_DISCIPLE, BREAKTHROUGH_CHANCE_CAP_BP,
    BREAKTHROUGH_FAIL_KEEP_BP, BREAKTHROUGH_FAIL_INJURY,
    canAttemptBreakthrough, breakthroughChance, breakthroughFailure,
    AID_ID, AID_DURATION_SLOTS, AID_WORKERS, AID_AVAILABLE_FROM_SLOT, AID_OPTIONS, aidAvailable, aidReward,
    steadyStateWorkShareBp, PURE_NARRATIVE_FIELDS,
  };
});
