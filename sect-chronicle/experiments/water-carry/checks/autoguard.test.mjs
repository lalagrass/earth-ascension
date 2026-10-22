// LP-07（#218）自主護院：局部模型反例。用法（在 experiments/water-carry 下）：node --test checks/autoguard.test.mjs
// 只用公開的 step()／dispatch()／setAuto()／view()；D16 野豬值與路長不改，不注入野豬或人物精力。
// 只有「同 tick 打平」一例把兩人設成同腳力、同休閒路長，讓兩人真的同 tick 回到院中；其餘都是預設新局或開局滿缸。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, RULES, AUTO_ORDER } from '../demo/model.mjs';
import { createRoutes } from '../demo/routes.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total) }, guard: r1(geo.guardLength) };
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(3600)) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return m.view(); m.step(); } throw new Error('沒有等到條件'); };
const FULL = { ...RULES, vatStart: RULES.vatCapacity };
const game = (rules = RULES, opts = {}) => {
  const m = createModel(LENGTHS, rules);
  for (const [id, o] of Object.entries(opts)) assert.equal(m.setAuto(id, o).ok, true);
  return m;
};
const logOf = (m, pred) => m.state.log.filter(pred);
const autoGuards = (m, id) => logOf(m, (e) => e.kind === 'guard' && e.src === 'auto' && (!id || e.person === id));
const notes = (m, id, kind) => logOf(m, (e) => e.person === id && e.kind === 'auto:' + kind);
const P = (m, id) => m.state.people[id];

// ---------- 1. 允許／傾向／本訪 hits ----------
test('新局：兩人預設不允許，預選熟手主動、主角受擾；30 分鐘野豬照來，沒有任何自主意願或出發', () => {
  const m = game();
  const v = m.view();
  assert.equal(v.people.hero.auto.allow, false); assert.equal(v.people.cousin.auto.allow, false);
  assert.equal(v.people.hero.auto.react, 'late'); assert.equal(v.people.cousin.auto.react, 'early');
  assert.match(v.people.hero.auto.text, /尚未允許/);
  for (let i = 0; i < ticks(1800); i++) m.step();
  assert.ok(m.view().boar.visit >= 3, '野豬照 D16 自然來訪');
  assert.equal(logOf(m, (e) => String(e.kind).startsWith('auto:')).length, 0);
  assert.equal(autoGuards(m).length, 0);
});

test('同一人同一局配對：主動在可見嗅探就有意願、受擾要本訪第一撞後；交換傾向時機跟著換', () => {
  const at = (react) => {
    const m = game(RULES, { cousin: { allow: true, react } });
    const v = run(m, (x) => x.people.cousin.auto.wanting);
    return { m, v };
  };
  const early = at('early'), late = at('late');
  assert.equal(early.v.boar.visit, 1); assert.equal(late.v.boar.visit, 1);
  const sniff = logOf(early.m, (e) => e.kind === 'boar:out')[0].tick;
  assert.ok(early.v.tick > sniff, 'out（畫外）不讀心');
  assert.ok(['sniff', 'approach', 'prep'].includes(early.v.boar.mode));
  assert.equal(early.v.boar.hits, 0, '主動者在撞之前就有意願');
  assert.equal(late.v.boar.hits, 1, '受擾者在本訪第一撞後');
  assert.ok(late.v.tick > early.v.tick);
  // 交換：主角改主動，主角在嗅探時就有意願
  const sw = game(RULES, { hero: { allow: true, react: 'early' } });
  const v = run(sw, (x) => x.people.hero.auto.wanting);
  assert.equal(v.tick, early.v.tick, '同一局、同一可見時機');
  const walk = (react) => { const g = game(FULL, { hero: { allow: true, react } }); run(g, (x) => x.people.hero.mode === 'toGuard'); return g.state.people.hero.motion.need; };
  const g = game(FULL); run(g, (x) => x.boar.active && x.boar.mode !== 'out'); g.dispatch('guard', 'hero'); run(g, (x) => x.people.hero.mode === 'toGuard');
  assert.equal(walk('early'), g.state.people.hero.motion.need, '自主與手動同一防守路步數：傾向不是速度 buff');
});

test('候補未受理時改成受擾：收回意願、第一撞前不出發；已正式出發的改傾向不取消也不重啟', () => {
  const m = game(FULL, { hero: { allow: true, react: 'early' } });
  run(m, (x) => x.people.hero.auto.wanting && x.people.hero.guardSrc == null);
  assert.equal(m.view().boar.hits, 0);
  assert.equal(m.setAuto('hero', { react: 'late' }).ok, true);
  assert.equal(m.view().people.hero.auto.wanting, false, '暫停中改傾向立即收回候補');
  const v = run(m, (x) => x.boar.hits >= 1 || x.people.hero.guardSrc != null || !x.boar.active);
  assert.equal(v.people.hero.guardSrc, null, '第一撞前沒有自主出發');
  assert.equal(autoGuards(m, 'hero').filter((e) => e.tick < v.tick).length, 0);
  if (v.boar.active) { m.step(); assert.equal(m.view().people.hero.auto.wanting || m.view().people.hero.guardSrc === 'auto', true, '被撞後才有意願'); }
  // 已正式出發後改傾向：guard 保留，不重啟腿
  const g = game(FULL, { hero: { allow: true, react: 'early' } });
  run(g, (x) => x.people.hero.guardSrc === 'auto');
  const before = JSON.stringify(g.state.people.hero.motion), order = g.state.people.hero.guardOrder;
  g.setAuto('hero', { react: 'late' });
  assert.equal(g.state.people.hero.guardSrc, 'auto'); assert.equal(g.state.people.hero.guardOrder, order);
  assert.equal(JSON.stringify(g.state.people.hero.motion), before);
  g.step();
  assert.equal(g.state.people.hero.guardOrder, order, '下一 tick 也不取消');
});

test('損痕封頂後的新來訪：受擾者看本訪 hits，仍會有意願', () => {
  const m = game();
  run(m, (x) => x.boar.marks === RULES.boar.maxMarks);
  run(m, (x) => x.boar.mode === 'habitat');
  m.setAuto('hero', { allow: true }); // 預選受擾
  const v = run(m, (x) => x.people.hero.auto.wanting);
  assert.equal(v.boar.marks, RULES.boar.maxMarks);
  assert.equal(v.boar.hits, 1, '不是用全局 marks 判斷');
});

// ---------- 2. 候補不預占、院中邊界、單一受理 ----------
test('工作中的主動者只記意願：不寫 guardOrder、不占來訪；交付那一 tick 在院中先出發護院，不再接下一趟', () => {
  const m = game(RULES, { cousin: { allow: true } });
  const v0 = run(m, (x) => x.people.cousin.auto.wanting && x.people.cousin.mode === 'carry');
  assert.equal(P(m, 'cousin').guardOrder, null); assert.equal(v0.boar.assignee, null);
  assert.match(v0.people.cousin.auto.text, /交付這趟後.*尚未占名額/);
  assert.equal(m.actions('hero').find((a) => a.id === 'guard').enabled, true, '候補不擋玩家派別人');
  // 自然跑 30 分鐘，找「挑水中有意願 → 交付那一 tick 直接走上防守路」的轉換
  let seen = 0;
  for (let i = 0; i < ticks(1800); i++) {
    const a = m.view(); m.step(); const b = m.view();
    const pa = a.people.cousin, pb = b.people.cousin;
    if (!(pa.mode === 'carry' && pa.auto.wanting && pb.mode === 'toGuard')) continue;
    seen += 1;
    assert.equal(pb.done.water + pb.done.herb, pa.done.water + pa.done.herb + 1, '先完整交付一次');
    assert.equal(pb.trips, pa.trips + 1);
    assert.equal(logOf(m, (e) => e.kind === 'trip' && e.person === 'cousin').at(-1).tick, b.tick, '交付與受理同 tick（院中端點）');
    assert.ok(b.inFlight + b.herbInFlight <= a.inFlight + a.herbInFlight - 1 + (a.people.hero.mode !== 'carry' && b.people.hero.mode === 'carry' ? 1 : 0), '沒有先預約下一趟');
    assert.equal(pb.guardSrc, 'auto'); assert.equal(b.boar.assignee, 'cousin');
  }
  assert.ok(seen >= 1, `交付後出發 ${seen} 次`);
});

test('忙碌主動者有意願時，休閒中的同伴先回院正式接手；忙碌者意願清為「同伴處理」', () => {
  // 開局滿缸：兩人都去休閒；主角主動，熟手主動。第一位回到院中端點者接手，另一位不雙派。
  const m = game(FULL, { hero: { allow: true, react: 'early' }, cousin: { allow: true } });
  run(m, (x) => x.boar.assignee != null);
  const who = m.view().boar.assignee, other = who === 'hero' ? 'cousin' : 'hero';
  assert.equal(autoGuards(m).length, 1);
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m).length, 1, '同一來訪只有一位正式處理者');
  assert.ok(notes(m, other, 'peer').length >= 1 || notes(m, other, 'want').length === 0);
});

test('同 tick 兩人都準備好：依明列 AUTO_ORDER 只受理一位，與人物列表順序無關', () => {
  assert.deepEqual([...AUTO_ORDER], ['hero', 'cousin']);
  const same = { ...LENGTHS, fun: { hero: LENGTHS.fun.hero, cousin: LENGTHS.fun.hero } };
  for (const chars of [[{ id: 'hero', initialLevel: 2 }, { id: 'cousin', initialLevel: 2 }], [{ id: 'cousin', initialLevel: 2 }, { id: 'hero', initialLevel: 2 }]]) {
    const m = createModel(same, FULL, chars);
    m.setAuto('hero', { allow: true, react: 'early' }); m.setAuto('cousin', { allow: true, react: 'early' });
    run(m, (x) => x.boar.assignee != null);
    const home = logOf(m, (e) => e.kind === 'guard');
    assert.equal(home.length, 1);
    assert.equal(home[0].person, 'hero');
    // 兩人確實同 tick 從休閒回到院中
    const back = logOf(m, (e) => e.kind === 'fromFun');
    assert.equal(back.length, 2); assert.equal(back[0].tick, back[1].tick);
    assert.equal(notes(m, 'cousin', 'peer').length, 1);
  }
});

test('玩家工作中明派（manual 預占）不被候補搶單；自主者不出發', () => {
  const m = game(RULES, { hero: { allow: true, react: 'early' } });
  run(m, (x) => x.boar.active && x.people.cousin.mode === 'carry' && x.boar.mode !== 'out');
  assert.equal(m.dispatch('guard', 'cousin').ok, true);
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m).length, 0);
  assert.equal(logOf(m, (e) => e.kind === 'guard' && e.src === 'manual').length, 1);
});

test('每人每訪自主正式受理最多一次：出發後關允許→取消；重開不重啟、不清已嘗試', () => {
  const m = game(FULL, { hero: { allow: true, react: 'early' } });
  run(m, (x) => x.people.hero.guardSrc === 'auto');
  m.setAuto('hero', { allow: false });
  assert.equal(P(m, 'hero').guardOrder, null);
  assert.equal(notes(m, 'hero', 'off').length, 1);
  m.setAuto('hero', { allow: true });
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m, 'hero').length, 1, '同一來訪沒有第二次自主受理');
  for (let i = 0; i < ticks(1800); i++) m.step();
  const per = {};
  for (const e of autoGuards(m, 'hero')) per[e.visit] = (per[e.visit] || 0) + 1;
  assert.ok(Object.keys(per).length >= 2, '之後的來訪仍可自主受理');
  assert.ok(Object.values(per).every((n) => n === 1));
});

// ---------- 3. 玩家覆寫／拒絕／恢復 ----------
test('有效改工作：清候補並抑制本訪；下一訪可重評。拒絕的指令不改意願', () => {
  const m = game(RULES, { cousin: { allow: true } });
  run(m, (x) => x.people.cousin.auto.wanting && x.people.cousin.mode === 'carry');
  const before = JSON.stringify(P(m, 'cousin'));
  assert.equal(m.dispatch('pourNow', 'cousin').ok, false);
  assert.equal(JSON.stringify(P(m, 'cousin')), before, '拒絕操作不改狀態');
  assert.equal(m.dispatch('work:herb', 'cousin').ok, true);
  let v = m.view();
  assert.equal(v.people.cousin.auto.wanting, false); assert.equal(v.people.cousin.auto.state, 'player');
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m, 'cousin').length, 0, '本訪不搶回');
  run(m, (x) => x.boar.visit === 2 && x.people.cousin.auto.wanting);
});

test('取消待執行可取消候補；停工跨訪仍優先；恢復自主不清本訪抑制', () => {
  const m = game(RULES, { cousin: { allow: true } });
  run(m, (x) => x.people.cousin.auto.wanting);
  const c = m.actions('cousin').find((a) => a.id === 'cancel');
  assert.equal(c.enabled, true, '有候補時取消可用');
  m.dispatch('cancel', 'cousin');
  assert.equal(m.view().people.cousin.auto.state, 'player');
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m).length, 0);
  // 停工：下一訪也不會自己去
  m.dispatch('restAfterTrip', 'cousin');
  run(m, (x) => x.boar.visit === 2 && x.boar.mode === 'prep');
  assert.equal(m.view().people.cousin.auto.wanting, false);
  assert.match(m.view().people.cousin.auto.text, /停工/);
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m).length, 0);
});

test('LP05 叫回：休閒中有效叫回清候補／抑制；恢復自主只清叫回，本訪仍不自己去', () => {
  const m = game(FULL, { hero: { allow: true, react: 'late' } });
  // 主角在休閒、等本訪被撞前叫回（叫回只在休閒可用）
  run(m, (x) => x.boar.active && x.boar.mode !== 'out' && x.people.hero.mode === 'fun');
  assert.equal(m.dispatch('recall', 'hero').ok, true);
  assert.equal(m.dispatch('resume', 'hero').ok, true);
  run(m, (x) => !x.boar.active);
  assert.equal(autoGuards(m, 'hero').length, 0, '恢復自主不清本訪抑制');
  assert.equal(notes(m, 'hero', 'want').length, 0);
});

test('必要恢復優先：精力 ≤30 有意願只等恢復到 80 才正式出發，恢復來源不被清', () => {
  // 主角 Lv1 工作趟長，自然會在來訪時落到 ≤30 去恢復（熟手在 60 分鐘內沒遇上，所以用主角）
  const m = game(RULES, { hero: { allow: true, react: 'early' } });
  let found = 0;
  for (let i = 0; i < ticks(3600); i++) {
    const a = m.view().people.hero;
    m.step();
    const b = m.view().people.hero;
    if (a.auto.wanting && a.rest === 'auto') {
      found += 1;
      assert.equal(P(m, 'hero').guardSrc === 'auto' && a.guardSrc == null ? b.energy >= RULES.energy.backAt : true, true, '恢復到 80 前不正式出發');
      if (a.mode === 'seated') assert.match(a.auto.text, /恢復到 80/);
      assert.ok(b.rest === 'auto' || b.energy >= RULES.energy.backAt || b.mode === 'back' || b.mode === 'idle', '恢復來源不被清');
    }
  }
  assert.ok(found > 0, '自然跑到低精力時遇到來訪');
});

test('關允許只清自主來源；玩家明派的保留（不允許／本訪被抑制的人也能明派）', () => {
  const m = game(FULL, { hero: { allow: true, react: 'early' } });
  run(m, (x) => x.people.hero.auto.wanting);
  m.dispatch('cancel', 'hero'); // 抑制本訪
  assert.equal(m.dispatch('guard', 'hero').ok, true, '被抑制仍可明派');
  m.setAuto('hero', { allow: false });
  assert.equal(P(m, 'hero').guardSrc, 'manual');
  assert.equal(P(m, 'hero').guardOrder, m.view().boar.visit);
});

// ---------- 4. 交付／往返／兩類過期 ----------
test('受擾主角單人：可能到場晚到或意願過期，兩者分開記；自主驅離不扣不回精力、無收益', () => {
  const m = game(RULES, { hero: { allow: true } });
  for (let i = 0; i < ticks(1800); i++) {
    const before = m.view().people.hero;
    m.step();
    const now = m.view().people.hero;
    if (before.guarding && now.guarding) assert.equal(now.energy, before.energy, '驅離往返精力不變');
    if (before.guarding) assert.equal(now.trips, before.trips);
  }
  const late = notes(m, 'hero', 'late').length, expired = notes(m, 'hero', 'expired').length, go = autoGuards(m, 'hero').length;
  assert.ok(go >= 1);
  assert.ok(late + expired >= 1, '接受晚到／過期');
  // 過期的那一訪沒有出發記錄（不是假稱到場晚到）
  for (const e of notes(m, 'hero', 'expired')) assert.equal(autoGuards(m, 'hero').filter((g) => g.visit === e.visit).length, 0);
  for (const e of notes(m, 'hero', 'late')) assert.equal(autoGuards(m, 'hero').filter((g) => g.visit === e.visit).length, 1);
});

test('主動熟手：真的走到防守點喝止成功（威脅＋80）；結果只結算一次，回來照原工作', () => {
  const m = game(RULES, { cousin: { allow: true } });
  run(m, (x) => notes(m, 'cousin', 'success').length > 0, ticks(1800));
  const v = m.view();
  assert.equal(logOf(m, (e) => e.kind === 'guard:success').length, 1);
  assert.ok(v.boar.threat >= 60);
  assert.equal(v.people.cousin.mode, 'fromGuard');
  run(m, (x) => x.people.cousin.mode !== 'fromGuard');
  assert.ok(['carry', 'idle', 'toFun', 'toSeat'].includes(m.view().people.cousin.mode));
});

// ---------- 5. 時間／新局 ----------
test('暫停改設定零進度；改設定不推進 tick／位置／精力／野豬', () => {
  const m = game();
  for (let i = 0; i < 500; i++) m.step();
  const snap = JSON.stringify({ t: m.state.tick, b: m.state.boar, e: [P(m, 'hero').energy, P(m, 'cousin').motion] });
  m.setAuto('hero', { allow: true, react: 'early' }); m.setAuto('hero', { react: 'late' });
  assert.equal(JSON.stringify({ t: m.state.tick, b: m.state.boar, e: [P(m, 'hero').energy, P(m, 'cousin').motion] }), snap);
  assert.equal(m.setAuto('hero', { react: 'x' }).ok, false);
});

test('同設定兩局逐 tick 相同（無 RNG）；新局回到預設關閉與預選傾向', () => {
  const a = game(RULES, { hero: { allow: true }, cousin: { allow: true } }), b = game(RULES, { hero: { allow: true }, cousin: { allow: true } });
  for (let i = 0; i < ticks(900); i++) { a.step(); b.step(); }
  assert.equal(JSON.stringify(a.state), JSON.stringify(b.state));
  const n = game().view();
  assert.equal(n.people.cousin.auto.allow, false); assert.equal(n.people.cousin.auto.react, 'early');
});
