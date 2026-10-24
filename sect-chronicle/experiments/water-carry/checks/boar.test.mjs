// LP-06／LD01（#213）野豬騷擾與驅離：局部模型反例。用法（在 experiments/water-carry 下）：node --test checks/boar.test.mjs
// 只用公開的 step()／dispatch()／view()，不注入野豬狀態；長恢復與無誘因邊界用模型自然跑，不縮示意值。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, RULES as RULES_D45, STEP_MS, BOAR_Q, speedsFor } from '../demo/model.mjs';
// HOME-01／D45：新局已無口渴；本檔舊節奏（喝水耗缸、口渴自理）只作舊行為 fixture，明示 thirst:true。新局 D45 斷言見 tea.test.mjs。
const RULES = { ...RULES_D45, thirst: true };
import { createRoutes } from '../demo/routes.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
// 與 app.mjs 相同的實際路長
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total) }, guard: r1(geo.guardLength) };
const B = RULES.boar;
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(3600)) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return m.view(); m.step(); } throw new Error('沒有等到條件'); };
const newGame = () => createModel(LENGTHS, RULES);
// 水缸開局就滿：兩人一開始去休閒、院中有空人可派；只改開局水量，不動野豬示意值。
const FULL = { ...RULES, vatStart: RULES.vatCapacity };
const idleGame = () => createModel(LENGTHS, FULL);
const walkTicks = (len, speed) => Math.ceil(len / speed * 1000 / STEP_MS - 1e-9);

// ---------- 1. 狀態決策 ----------
test('新局：野豬在棲地 E60／威脅0；有水時精力恢復到 80 那一 tick 才出發（推算 40 秒，不是排程）', () => {
  const m = newGame();
  const b0 = m.view().boar;
  assert.equal(b0.mode, 'habitat'); assert.equal(b0.energy, 60); assert.equal(b0.threat, 0); assert.equal(b0.marks, 0); assert.equal(b0.visit, 0);
  const v = run(m, (x) => x.boar.mode !== 'habitat');
  assert.equal(v.tick, ticks(40), '60→80 每秒 +0.5，剛好 2400 tick');
  assert.equal(v.boar.mode, 'out'); assert.equal(v.boar.visit, 1); assert.ok(v.boar.active);
  assert.ok(v.vat > 0 || v.herbs > 0, '出發當下院內有實存');
});

test('兩庫皆空不出發：精力滿、威脅 0 也留在棲地；第一份水交付的同一 tick（工作先結算）才出發', () => {
  const rules = { ...RULES, vatStart: 0 };
  // 主角的挑水路拉長，讓精力先滿；水缸 0、藥架 0，只有在途預約（不算誘因）
  const m = createModel({ ...LENGTHS, water: 3000 }, rules, [{ id: 'hero', initialLevel: 1 }]);
  run(m, (v) => v.boar.energy >= 100);
  let v = m.view();
  assert.equal(v.boar.mode, 'habitat'); assert.equal(v.inFlight, 1, '在途預約不算誘因'); assert.equal(v.vat, 0);
  assert.match(v.boar.why, /院內水缸與藥架都空/);
  assert.doesNotMatch(v.boar.why, /倒數|下次/);
  v = run(m, (x) => x.vat > 0);
  assert.equal(v.boar.mode, 'out', '交付與野豬決策同 tick：先入帳，再看誘因');
  assert.equal(m.state.log.find((e) => e.kind === 'boar:out').tick, m.state.log.find((e) => e.kind === 'trip').tick);
});

test('移動每秒 −1、只在棲地恢復；嗅探 2 秒；到場精力不同，撞的次數不同（不是固定三下）', () => {
  const outT = walkTicks(LENGTHS.boar.edge, B.approach), apT = walkTicks(LENGTHS.boar.total - LENGTHS.boar.edge, B.approach);
  // 預設新局：80 出發
  const m = newGame();
  run(m, (v) => v.boar.mode === 'out');
  let prevE = m.view().boar.energy, sniffAt = null, fenceAt = null;
  const t0 = m.view().tick;
  run(m, (v) => {
    const b = v.boar;
    if (b.mode !== 'habitat') assert.ok(b.energy <= prevE + 1e-9, '離開棲地時精力不會增加');
    if (b.mode === 'sniff' && sniffAt == null) sniffAt = v.tick;
    if (b.mode === 'prep' && fenceAt == null) fenceAt = v.tick;
    prevE = b.energy;
    return b.mode === 'flee';
  });
  assert.equal(sniffAt - t0, outT, '棲地→林緣按 72／秒與實際路長');
  assert.equal(fenceAt - sniffAt, ticks(2) + apT, '嗅探 2 秒後沿路靠近');
  const arrive = 80 - (outT + apT) * 4 / BOAR_Q;
  const hits80 = m.view().boar.hits;
  assert.equal(hits80, Math.ceil((arrive - 30) / 18), `到場 ${arrive.toFixed(2)}：每下 −18，≤30 就走`);
  assert.match(m.view().boar.why, /累了/);
  // 退走時精力仍 −1/s，最低 0；走完整腿回棲地才恢復
  let d = m.view().boar.d;
  run(m, (v) => { if (v.boar.mode === 'flee') { assert.ok(v.boar.d <= d + 1e-9, '退走不折返'); d = v.boar.d; } return v.boar.mode === 'habitat'; });
  assert.equal(m.view().boar.d, 0);

  // 精力 100 才有誘因：到場更有力，多撞一下
  const rules = { ...RULES, vatStart: 0 };
  const m2 = createModel({ ...LENGTHS, water: 3000 }, rules, [{ id: 'hero', initialLevel: 1 }]);
  run(m2, (v) => v.boar.mode === 'flee');
  const hits100 = m2.view().boar.hits;
  assert.equal(hits100, Math.ceil((100 - (outT + apT) * 4 / BOAR_Q - 30) / 18));
  assert.ok(hits100 > hits80, `E100 到場撞 ${hits100} 下，E80 撞 ${hits80} 下`);
});

test('誘因消失：嗅探完院內已空就從林緣回棲地；靠近途中消失先走完到護欄這段才判、不撞', () => {
  // 沒人工作、水缸 1 擔，只把用水間隔當 fixture 調整，讓水在嗅探／靠近途中用完（野豬示意值不變）。
  // SG-LIFE-01 起正式規則改為「真喝水才扣缸」、無人時水缸不再自己減少；這裡以 drink: null 明確沿用舊定時用水作為讓誘因消失的 fixture，
  // 測的仍是野豬對「院內已空」的反應，不是用水規則本身。
  for (const [useEveryMs, where] of [[45000, 'sniff'], [48000, 'approach']]) {
    const m = createModel(LENGTHS, { ...RULES, vatStart: 1, useEveryMs, drink: null }, []);
    run(m, (v) => v.boar.mode === 'out');
    const v1 = run(m, (v) => v.vat === 0);
    assert.equal(v1.boar.mode, where);
    if (where === 'approach') {
      const v2 = run(m, (v) => v.boar.mode !== 'approach');
      assert.equal(v2.boar.mode, 'prep', '先走完到護欄');
      assert.equal(v2.boar.d, LENGTHS.boar.total);
      m.step();
    } else run(m, (v) => v.boar.mode !== 'sniff');
    const v3 = m.view();
    assert.equal(v3.boar.mode, 'flee'); assert.equal(v3.boar.hits, 0, '沒誘因不撞');
    assert.match(v3.boar.why, /院內已空/);
    if (where === 'sniff') assert.equal(v3.boar.d, LENGTHS.boar.edge, '從林緣退回');
  }
});

// ---------- 2. 有限損失與收益守恆 ----------
test('不介入 20 分鐘：野豬自然多次來訪、損痕到 3 為止不自癒，兩人照常工作／恢復／閒暇，水缸帳目守恆', () => {
  const m = newGame();
  let marks = 0;
  for (let i = 0; i < ticks(1200); i++) {
    m.step();
    const k = m.view().boar.marks;
    assert.ok(k >= marks, '損痕不自癒'); marks = k;
  }
  const v = m.view();
  const outs = m.state.log.filter((e) => e.kind === 'boar:out').length, hits = m.state.log.filter((e) => e.kind === 'boar:hit');
  assert.ok(outs >= 3, `20 分鐘自然來訪 ${outs} 次`);
  assert.equal(v.boar.marks, 3); assert.ok(hits.length > 3, '到頂仍會撞');
  assert.equal(hits.filter((h) => h.grew).length, 3, '只有前三下加損痕');
  const trips = m.state.log.filter((e) => e.kind === 'trip');
  assert.ok(trips.length >= 20, `兩人共交付 ${trips.length} 趟`);
  assert.ok(m.state.log.some((e) => e.kind === 'seated') && m.state.log.some((e) => e.kind === 'fun'), '仍有恢復與閒暇');
  // 水缸帳目：開局＋交付−用水＝現存（野豬只讀實存，不偷水）
  const water = trips.filter((t) => t.job === 'water').length, used = Math.floor(ticks(1200) * STEP_MS / RULES.useEveryMs + 1e-9);
  assert.ok(v.vat >= 0 && v.vat <= RULES.vatCapacity && v.inFlight >= 0);
  assert.ok(RULES.vatStart + water - v.vat <= used, `用掉 ${RULES.vatStart + water - v.vat} 擔，不超過用水次數 ${used}（空缸時不扣）`);
});

test('驅離往返不扣不回精力、不產出、不成長、不占預約；喝止成功只一次，威脅＋80 逃走', () => {
  const m = idleGame();
  run(m, (v) => v.boar.mode === 'out');
  assert.equal(m.view().people.hero.mode, 'fun');
  const r = m.dispatch('guard', 'hero');
  assert.ok(r.ok, r.reason);
  const v0 = run(m, (v) => v.people.hero.mode === 'toGuard');
  const e0 = v0.people.hero.energy, trips0 = v0.people.hero.trips, xp0 = v0.people.hero.xp + v0.people.hero.level * 100;
  const v1 = run(m, (v) => v.people.hero.guardResult != null);
  assert.equal(v1.people.hero.guardResult.kind, 'success');
  assert.equal(v1.boar.mode, 'flee'); assert.equal(v1.boar.threat, Math.min(100, 0 + 80));
  assert.equal(m.state.log.filter((e) => e.kind === 'guard:success').length, 1);
  const v2 = run(m, (v) => v.people.hero.mode !== 'fromGuard' && !v.people.hero.guarding);
  assert.equal(v2.people.hero.energy, e0, '往返、等待、喝止精力不變');
  assert.equal(v2.people.hero.trips, trips0); assert.equal(v2.people.hero.xp + v2.people.hero.level * 100, xp0, '沒有趟次／成長');
  assert.equal(m.state.log.filter((e) => e.kind === 'guard:success').length, 1, '只結算一次');
});

test('害怕會記住：喝止後精力已滿仍留在棲地，威脅淡忘到 ≤20 才再來（每秒 −0.25）', () => {
  const m = idleGame();
  run(m, (v) => v.boar.active);
  assert.ok(m.dispatch('guard', 'cousin').ok);
  run(m, (v) => v.boar.mode === 'flee');
  const v1 = run(m, (v) => v.boar.mode === 'habitat');
  const threatHome = v1.boar.threat;
  run(m, (v) => v.boar.energy >= 100);
  assert.equal(m.view().boar.mode, 'habitat');
  assert.match(m.view().boar.why, /還記得威脅/);
  const v2 = run(m, (v) => v.boar.mode !== 'habitat');
  const calm = (v2.tick - v1.tick);
  assert.equal(calm, Math.ceil((threatHome - 20) * BOAR_Q / 1), `威脅 ${threatHome} 淡忘到 20 需 ${calm} tick`);
  assert.equal(v2.boar.visit, 2, '同一隻野豬的新來訪編號');
});

// ---------- 3. 意圖／過期 ----------
test('工作中派遣：先改採藥再驅離→原挑水完整交付一次、再去驅離、回來採藥', () => {
  // 找一個自然時刻：野豬在外、此人挑水去程中，交付後精力仍 >30（否則先恢復，另見下一則）
  const m = newGame();
  // 野豬剛出林（還要十幾秒才到護欄）、此人挑水再幾秒就交付且交付後精力 >30
  const left = (p) => p.tripSecondsNow * (1 - p.tripProgress);
  const ok = (p) => p.mode === 'carry' && p.job === 'water' && left(p) < 5 && p.energy - left(p) > 31;
  const v0 = run(m, (v) => (v.boar.mode === 'out' || v.boar.mode === 'sniff') && ok(v.people.hero), ticks(3600));
  const in0 = v0.inFlight, vat0 = v0.vat;
  assert.ok(m.dispatch('work:herb', 'hero').pending);
  const r = m.dispatch('guard', 'hero');
  assert.ok(r.ok && /交付後去驅離/.test(r.text));
  const v1 = run(m, (v) => v.people.hero.mode !== 'carry');
  assert.equal(v1.people.hero.mode, 'toGuard'); assert.equal(v1.people.hero.job, 'herb');
  assert.equal(v1.people.hero.done.water, v0.people.hero.done.water + 1, '原挑水完整交付一次');
  assert.equal(v1.people.hero.done.herb, v0.people.hero.done.herb);
  assert.equal(v1.inFlight, in0 - 1, '交付釋約，驅離不占預約'); void vat0;
  const v2 = run(m, (v) => v.people.hero.mode === 'carry');
  assert.equal(v2.people.hero.job, 'herb', '回來做最新的工作');
  assert.ok(['success', 'late'].includes(v2.people.hero.guardResult.kind));
});

test('停工／本趟後停工時拒絕派遣並說原因；改令可換人；第二人看得到誰在處理；重送不重啟', () => {
  const m = newGame();
  run(m, (v) => v.boar.active && v.people.hero.mode === 'carry');
  m.dispatch('restAfterTrip', 'hero');
  let r = m.dispatch('guard', 'hero');
  assert.equal(r.ok, false); assert.match(r.reason, /停工/);
  assert.ok(m.dispatch('guard', 'cousin').ok);
  const a = m.actions('hero').find((x) => x.id === 'guard');
  assert.equal(a.enabled, false);
  r = m.dispatch('guard', 'cousin');
  assert.equal(r.ok, false); assert.match(r.reason, /已在處理/);
  // 取消熟手（改工作）後，主角仍因停工不能派；開始工作解除後可派
  assert.ok(m.dispatch('work:herb', 'cousin').ok);
  assert.equal(m.view().boar.assignee, null);
  m.dispatch('start', 'hero');
  const b = m.actions('cousin').find((x) => x.id === 'guard');
  assert.ok(b.enabled);
  assert.ok(m.dispatch('guard', 'hero').ok);
  assert.match(m.actions('cousin').find((x) => x.id === 'guard').reason, /主角已在處理/);
});

test('必要恢復優先：≤30 被派只記意圖，恢復到 80 前野豬已走→意圖過期、照原流程回工作；恢復來源不被清', () => {
  const m = newGame();
  // 等主角精力低去恢復，同時野豬在外
  const v = run(m, (x) => x.boar.active && x.people.hero.rest === 'auto' && ['toSeat', 'seated'].includes(x.people.hero.mode), ticks(7200));
  const r = m.dispatch('guard', 'hero');
  assert.ok(r.ok); assert.match(r.text, /先恢復到 80/);
  assert.equal(m.view().people.hero.rest, 'auto');
  m.dispatch('resume', 'hero');
  assert.equal(m.view().people.hero.guardOrder, v.boar.visit, '恢復自主不取消有限驅離');
  run(m, (x) => !x.boar.active);
  const after = m.view().people.hero;
  if (after.guardOrder == null) assert.equal(after.guardResult.kind, 'expired');
  run(m, (x) => x.people.hero.mode === 'carry');
  assert.ok(m.view().people.hero.energy >= 80, '仍先恢復到 80 才出發');
  assert.equal(m.view().people.hero.guardOrder, null, '新來訪不承接舊指令');
});

test('休閒中派遣：活動點下一 tick 起身返院再去；叫回來源保留；驅離不算叫回後的一趟', () => {
  const m = newGame();
  run(m, (v) => v.people.hero.mode === 'fun' && v.boar.active, ticks(7200));
  // 若同時有叫回，驅離回來後仍待命
  m.dispatch('recall', 'hero');
  // 叫回後下一 tick 起身；改在去程測試，這裡直接派
  assert.ok(m.dispatch('guard', 'hero').ok);
  m.step();
  assert.equal(m.view().people.hero.mode, 'fromFun');
  run(m, (v) => v.people.hero.mode === 'toGuard');
  assert.equal(m.view().people.hero.recall, true);
  run(m, (v) => v.people.hero.guardResult != null);
  run(m, (v) => !v.people.hero.guarding);
  assert.equal(m.view().people.hero.recall, true, '驅離往返不解除叫回');
});

test('較新改工作／停工取消驅離：去防守點途中走完這段再返院；等候中立刻返院；沒有喝止成功', () => {
  for (const cmd of ['work:herb', 'restAfterTrip']) {
    const m = idleGame();
    run(m, (v) => v.boar.mode === 'out');
    m.dispatch('guard', 'cousin');
    run(m, (v) => v.people.cousin.mode === 'toGuard' && v.people.cousin.guardLeg.k > 0.3);
    const r = m.dispatch(cmd, 'cousin');
    assert.ok(r.ok);
    assert.match(r.text, /走到防守點後回院中/);
    assert.equal(m.view().people.cousin.guardResult.kind, 'canceled');
    const v1 = run(m, (v) => v.people.cousin.mode !== 'toGuard');
    assert.equal(v1.people.cousin.mode, 'fromGuard', '走完這段到防守點，不等也不喝止');
    run(m, (v) => !v.people.cousin.guarding);
    assert.ok(!m.state.log.some((e) => e.kind === 'guard:success'));
    if (cmd === 'restAfterTrip') assert.equal(m.view().people.cousin.mode, 'toSeat');
  }
  // 等候中改令
  const m = idleGame();
  run(m, (v) => v.boar.mode === 'out');
  m.dispatch('guard', 'cousin');
  run(m, (v) => v.people.cousin.mode === 'guardWait');
  m.dispatch('work:herb', 'cousin');
  assert.equal(m.view().people.cousin.mode, 'fromGuard');
  // 取消待執行只清尚未生效的；已在走的路不取消
  const m2 = newGame();
  run(m2, (v) => v.boar.active && v.people.hero.mode === 'carry');
  m2.dispatch('guard', 'hero');
  assert.ok(m2.actions('hero').find((a) => a.id === 'cancel').enabled);
  m2.dispatch('cancel', 'hero');
  assert.equal(m2.view().people.hero.guardOrder, null);
  assert.equal(m2.view().people.hero.mode, 'carry', '取消不影響當趟');
});

test('目標退走即過期：到防守點晚到返院；退走中不能再派；新來訪不承接舊令', () => {
  const m = newGame();
  run(m, (v) => v.boar.mode === 'prep' && v.boar.energy - 18 <= 30); // 下一下就累走
  // 主角從院中趕過去一定晚到
  const r = m.dispatch('guard', 'hero');
  assert.ok(r.ok);
  run(m, (v) => v.boar.mode === 'flee');
  const g = m.actions('cousin').find((a) => a.id === 'guard');
  assert.equal(g.enabled, false); assert.match(g.reason, /退走/);
  run(m, (v) => v.people.hero.guardResult != null);
  assert.ok(['late', 'expired'].includes(m.view().people.hero.guardResult.kind));
  assert.equal(m.view().boar.threat, 0, '晚到沒有遠端命中');
  run(m, (v) => v.boar.visit === 2);
  assert.equal(m.view().people.hero.guardOrder, null);
});

// ---------- 4. 真位置與同 tick ----------
test('驅離往返位置連續：每 tick 位移不超過出發時鎖定的空手速度，模式切換不瞬移；Lv1 比 Lv3 慢', () => {
  // 同一局只能派一人；兩人各用一局（相同開局）局部配對比較 Lv1／Lv3 走同一條路
  const check = (id) => {
    const mm = idleGame();
    run(mm, (v) => v.boar.mode === 'out');
    mm.dispatch('guard', id);
    let last = null, start = null, arrive = null, max = 0;
    run(mm, (v) => {
      const p = v.people[id], at = geo.of(id, p);
      if (last) {
        const d = Math.hypot(at.x - last.x, at.y - last.y);
        if (p.mode === 'toGuard' || last.mode === 'toGuard' || p.mode === 'fromGuard') max = Math.max(max, d);
        if (last.mode !== p.mode) assert.ok(d < 2, `${id} ${last.mode}→${p.mode} 位移 ${d.toFixed(2)}`);
      }
      if (p.mode === 'toGuard' && start == null) start = v.tick;
      if (p.mode === 'guardWait' && arrive == null) arrive = v.tick;
      last = { x: at.x, y: at.y, mode: p.mode };
      return p.guardResult != null && !p.guarding;
    });
    return { max, steps: arrive - start, level: mm.view().people[id].level };
  };
  const h = check('hero'), c = check('cousin');
  assert.ok(h.max <= speedsFor(5).empty / 60 + 1e-6);
  assert.equal(h.steps, walkTicks(LENGTHS.guard, speedsFor(1).empty), 'Lv1 用 60／秒');
  assert.equal(c.steps, walkTicks(LENGTHS.guard, speedsFor(3).empty), 'Lv3 用 74.4／秒');
  assert.ok(h.steps > c.steps, `主角 ${h.steps} tick、熟手 ${c.steps} tick 到防守點`);
});

test('同 tick：喝止完成碰上到期接觸→先加威脅逃走、這一下不算；已自行退走則晚到，不補成功', () => {
  const base = idleGame();
  run(base, (v) => v.boar.mode === 'flee');
  const hitTicks = base.state.log.filter((e) => e.kind === 'boar:hit').map((e) => e.tick);
  const fleeTick = base.state.log.find((e) => e.kind === 'boar:flee').tick;
  const outTick = base.state.log.find((e) => e.kind === 'boar:out').tick;
  let sameTick = null, lateFound = null;
  for (let T = outTick; T < fleeTick && (sameTick == null || lateFound == null); T++) {
    for (const id of ['cousin', 'hero']) {
      const m = idleGame();
      for (let i = 0; i < T; i++) m.step();
      if (!m.dispatch('guard', id).ok) continue;
      run(m, (v) => v.people[id].guardResult != null);
      const res = m.state.log.find((e) => e.kind.startsWith('guard:') && e.kind !== 'guard');
      if (res.kind === 'guard:success' && hitTicks.includes(res.tick) && sameTick == null) {
        sameTick = { T, id, tick: res.tick };
        assert.ok(!m.state.log.some((e) => e.kind === 'boar:hit' && e.tick === res.tick), '喝止優先，同 tick 不接觸');
        assert.equal(m.view().boar.hits, hitTicks.filter((t) => t < res.tick).length);
      }
      if (res.kind === 'guard:late' && m.state.log.some((e) => e.kind === 'shout') && lateFound == null) {
        lateFound = { T, id };
        assert.equal(m.view().boar.threat, 0, '已逃不能補喝止成功');
      }
    }
  }
  assert.ok(sameTick, '找得到喝止完成與接觸同 tick 的派遣時刻');
  assert.ok(lateFound, '找得到喝止中野豬自行退走的派遣時刻');
});

test('暫停下令只改意圖：dispatch 不推進 tick、位置、精力、威脅', () => {
  const m = idleGame();
  run(m, (v) => v.boar.mode === 'approach');
  const pick = (v) => JSON.stringify({ tick: v.tick, vat: v.vat, b: [v.boar.mode, v.boar.d, v.boar.energy, v.boar.threat, v.boar.marks],
    p: Object.values(v.people).map((p) => [p.mode, p.energy, p.funLeg && p.funLeg.steps, p.funSteps]) });
  const before = pick(m.view());
  assert.ok(m.dispatch('guard', 'hero').ok);
  assert.equal(pick(m.view()), before);
  assert.equal(m.view().people.hero.guardOrder, 1);
});

// ---------- 5. 單一時間／新局 ----------
test('分幀與 1／2／4× 得到同一隻野豬；重來回到初始值', () => {
  const play = (frames, speed) => {
    const m = newGame(), c = createClock();
    let t = 0;
    while (m.state.tick < ticks(150)) { const dt = frames[t++ % frames.length]; const n = c.feed(dt, speed); for (let i = 0; i < n && m.state.tick < ticks(150); i++) m.step(); }
    return JSON.stringify(m.view().boar) + JSON.stringify(m.state.log.filter((e) => e.kind.startsWith('boar:')));
  };
  const a = play([1000 / 60], 1), b = play([1000 / 144], 1), c = play([7, 33, 16, 50], 2), d = play([1000 / 60], 4);
  assert.equal(a, b); assert.equal(a, c); assert.equal(a, d);
  const fresh = newGame().view();
  assert.deepEqual([fresh.boar.mode, fresh.boar.energy, fresh.boar.threat, fresh.boar.marks, fresh.boar.visit, fresh.boar.assignee], ['habitat', 60, 0, 0, 0, null]);
  assert.deepEqual([fresh.people.hero.energy, fresh.people.hero.level, fresh.people.cousin.level, fresh.vat, fresh.herbs], [100, 1, 3, 3, 0]);
});
