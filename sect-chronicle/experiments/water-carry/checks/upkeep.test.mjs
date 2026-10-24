// LP-09（#232）自主整理護欄：局部模型反例。用法（在 experiments/water-carry 下）：node --test checks/upkeep.test.mjs
// 只用公開的 step()／dispatch()／setUpkeep()／setAuto()／view()；D16 野豬值、D18 整理值與路長都不改，不注入精力／損痕。
// 自然局之外只用兩種「合法指令歷史」：開局滿缸（FULL，沿 LP07）讓熟手主動護院在第一撞後喝走野豬、留下 2 階；
// 以及同 tick 打平一例把兩人設成同腳力、同休閒路長（沿 LP07 打平例）。唯一的決策快照會在該測試名稱標明。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, RULES as RULES_D45, STEP_MS, AUTO_ORDER, UP_REACT } from '../demo/model.mjs';
// HOME-01／D45：新局已無口渴；本檔舊節奏（喝水耗缸、口渴自理）只作舊行為 fixture，明示 thirst:true。新局 D45 斷言見 tea.test.mjs。
const RULES = { ...RULES_D45, thirst: true };
import { createRoutes } from '../demo/routes.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength) };
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(3600)) => { for (let i = 0; i < limit; i++) { if (pred(m.view(), m.state)) return m.view(); m.step(); } throw new Error('沒有等到條件'); };
const FULL = { ...RULES, vatStart: RULES.vatCapacity };
const FIX_N = Math.ceil(RULES.fix.workMs / STEP_MS - 1e-9);
const game = (up = {}, rules = RULES, chars, lengths = LENGTHS) => {
  const m = createModel(lengths, rules, chars);
  for (const [id, o] of Object.entries(up)) assert.equal(m.setUpkeep(id, o).ok, true);
  return m;
};
const P = (m, id) => m.state.people[id];
const logOf = (m, pred) => m.state.log.filter(pred);
const autoFix = (m, id) => logOf(m, (e) => e.kind === 'fixOrder' && e.src === 'auto' && (!id || e.person === id));
const notes = (m, id, kind) => logOf(m, (e) => e.person === id && e.kind === 'up:' + kind);
// 有真碰撞、野豬已離開視線（整理才合法）。
const safeAfterContact = (v, s) => s.contact > 0 && !v.boar.seen;
const frozen = (m) => JSON.stringify({ ...m.state, log: m.state.log.length });
// 熟手主動護院在第一撞後喝走野豬的自然局：回傳停在「該訪結束、損痕 2、野豬已看不見」。
function twoMarks(up) {
  const m = game(up, FULL);
  m.setAuto('cousin', { allow: true, react: 'early' });
  run(m, (v) => v.boar.marks === 2 && v.boar.mode === 'flee' && !v.boar.seen);
  return m;
}

// ---------- 1. 允許／反應 ----------
test('新局：兩人「允許自主整理」預設關、預選熟手順手／主角累積；30 分鐘有真損痕也不自己整理', () => {
  assert.deepEqual({ ...UP_REACT }, { hero: 'late', cousin: 'early' });
  const m = game();
  const v0 = m.view();
  for (const id of ['hero', 'cousin']) {
    assert.equal(v0.people[id].up.allow, false); assert.equal(v0.people[id].auto.allow, false, '與護院允許分開、都預設關');
    assert.equal(v0.people[id].up.state, 'off');
  }
  assert.equal(v0.people.cousin.up.react, 'early'); assert.equal(v0.people.hero.up.react, 'late');
  for (let i = 0; i < ticks(1800); i++) m.step();
  assert.ok(m.state.contact >= 3 && m.state.boar.marks > 0, '野豬照來、護欄有損痕');
  assert.equal(autoFix(m).length, 0);
  assert.equal(logOf(m, (e) => e.kind === 'up:want').length, 0);
  assert.equal(m.state.fixBy, null);
});

test('同一局配對：損痕 2 階時順手者有意願、累積者沒有；交換傾向即時撤回不符的候補、下一 tick 換人；速度不變', () => {
  const m = twoMarks({ hero: { allow: true }, cousin: { allow: true } });
  const speed = { hero: P(m, 'hero').motion.need, cousin: P(m, 'cousin').motion.need };
  m.step();
  assert.equal(m.view().people.cousin.up.wanting, true, '順手照看：≥1 階');
  assert.equal(m.view().people.hero.up.wanting, false, '累積再整理：要 3 階');
  assert.match(m.view().people.hero.up.text, /到 3 階/);
  // 熟手若已正式出發就不算「候補」；這裡要的是撤回候補，所以只在還是候補時交換。
  assert.equal(P(m, 'cousin').fix, null, '此局熟手當時仍只是候補');
  const t = m.state.tick;
  m.setUpkeep('hero', { react: 'early' }); m.setUpkeep('cousin', { react: 'late' });
  assert.equal(m.state.tick, t, '改設定不推進');
  assert.equal(P(m, 'cousin').upWant, null, '不符的候補立即撤回');
  assert.equal(notes(m, 'cousin', 'react').length, 1);
  assert.deepEqual({ hero: P(m, 'hero').motion.need, cousin: P(m, 'cousin').motion.need }, speed, '傾向不改腳力／步數');
  m.step();
  assert.equal(m.view().people.hero.up.wanting, true);
  assert.equal(m.view().people.cousin.up.wanting, false);
});

// ---------- 2. 候補／單人 ----------
test('工作中只記候補：不寫 fix／fixBy；交付那一 tick 在院中先正式出發整理，原趟收益只算一次', () => {
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.up.wanting);
  const p = P(m, 'cousin');
  assert.equal(p.motion.mode, 'carry', '自然局：熟手有意願時正在挑水');
  assert.equal(p.fix, null); assert.equal(m.state.fixBy, null, '候補不占名額');
  assert.match(m.view().people.cousin.up.text, /交付這趟後.*尚未占名額/);
  const trips = p.trips;
  run(m, (v) => v.people.cousin.fix);
  const go = autoFix(m, 'cousin')[0], trip = logOf(m, (e) => e.kind === 'trip' && e.person === 'cousin').at(-1);
  const rested = logOf(m, (e) => e.person === 'cousin' && e.kind === 'toSeat' && e.tick === trip.tick).length > 0;
  // 第一輪：交付後精力 ≤30，先走去座位恢復到 80、返院，才在院中受理（恢復來源不被清）。
  assert.ok(rested, '自然局第一輪交付後精力低');
  const back = logOf(m, (e) => e.person === 'cousin' && e.kind === 'back').at(-1);
  assert.ok(back && back.tick > trip.tick && go.tick > back.tick, '必要恢復後才受理');
  assert.ok(P(m, 'cousin').energy >= RULES.energy.backAt - 1e-9, '恢復到 80 才出發');
  assert.equal(P(m, 'cousin').trips, trips + 1, '原趟只入帳一次');
  assert.equal(P(m, 'cousin').motion.mode, 'toFix', '受理即出發，不先接下一趟');
  assert.equal(m.state.fixBy, 'cousin'); assert.equal(P(m, 'cousin').fixSrc, 'auto');
  assert.equal(P(m, 'cousin').fixOpp, m.state.contact);
  // 之後各輪：至少一輪是交付同 tick 在院中直接受理（精力夠時不先接下一趟）。
  for (let i = 0; i < ticks(1500); i++) m.step();
  const gos = autoFix(m, 'cousin');
  assert.ok(gos.length >= 3);
  assert.ok(gos.some((k) => logOf(m, (e) => e.person === 'cousin' && e.kind === 'trip' && e.tick === k.tick).length), '有交付同 tick 直接受理的一輪');
});

test('同 tick 兩人都準備好：依明列 AUTO_ORDER 只受理一位，與人物列表順序無關；另一人候補標「本輪已用」', () => {
  assert.deepEqual([...AUTO_ORDER], ['hero', 'cousin']);
  const same = { ...LENGTHS, fun: { hero: LENGTHS.fun.hero, cousin: LENGTHS.fun.hero } };
  for (const chars of [[{ id: 'hero', initialLevel: 2 }, { id: 'cousin', initialLevel: 2 }], [{ id: 'cousin', initialLevel: 2 }, { id: 'hero', initialLevel: 2 }]]) {
    // 開局藥架滿、兩人改採藥：藥草不耗用，兩人都留在休閒，候補成立時真的同 tick 回院。
    const m = game({}, { ...RULES, herbStart: RULES.herbCapacity }, chars, same);
    for (const id of ['hero', 'cousin']) assert.equal(m.dispatch('work:herb', id).ok, true);
    for (const id of ['hero', 'cousin']) assert.equal(m.setUpkeep(id, { allow: true, react: 'early' }).ok, true);
    run(m, (v) => v.boar.fixBy != null);
    const go = autoFix(m);
    assert.equal(go.length, 1);
    const both = logOf(m, (e) => e.kind === 'up:want');
    assert.equal(both.length, 2); assert.equal(both[0].tick, both[1].tick, '兩人同 tick 有意願');
    const back = logOf(m, (e) => e.kind === 'fromFun' && e.tick >= both[0].tick);
    assert.equal(back.length, 2); assert.equal(back[0].tick, back[1].tick, '兩人真的同 tick 回院');
    assert.equal(go[0].person, 'hero', '明列順序取主角');
    assert.equal(notes(m, go[0].person === 'hero' ? 'cousin' : 'hero', 'used').length, 1);
  }
});

test('玩家明派（manual）不被候補搶：有效人工整理結束本輪、撤回全隊候補；人工仍可再派', () => {
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.up.wanting && v.people.hero.mode !== 'fromFix');
  const opp = m.state.contact;
  const r = m.dispatch('fix', 'hero');
  assert.equal(r.ok, true);
  assert.equal(P(m, 'hero').fixSrc, 'manual'); assert.equal(m.state.fixBy, 'hero');
  assert.equal(m.state.upUsed, opp, '人工受理結束當輪自主機會');
  assert.equal(P(m, 'cousin').upWant, null); assert.equal(notes(m, 'cousin', 'manual').length, 1);
  run(m, (v) => v.people.hero.fixResult);
  assert.equal(m.view().people.hero.fixResult.kind, 'done');
  assert.equal(autoFix(m).length, 0, '本輪熟手不自主');
  assert.equal(m.view().people.cousin.up.state, 'used');
  // 本輪內（尚無新碰撞）人工可再派
  run(m, (v) => v.people.hero.mode !== 'fromFix' && !v.boar.seen);
  assert.ok(m.state.contact === opp && m.state.boar.marks > 0, '仍在同一輪、仍有損痕');
  assert.equal(m.dispatch('fix', 'cousin').ok, true, '人工不受自主輪次上限');
  assert.equal(P(m, 'cousin').fixSrc, 'manual');
});

// ---------- 3. 機會守恆 ----------
test('真接觸才開機會：損痕封頂後的接觸仍開新輪；30 分鐘內每輪全隊最多一次自主受理，候補不消耗', () => {
  const m = game({ hero: { allow: true }, cousin: { allow: true } });
  for (let i = 0; i < ticks(1800); i++) m.step();
  const hits = logOf(m, (e) => e.kind === 'boar:hit');
  assert.deepEqual(hits.map((e) => e.contact), hits.map((_, i) => i + 1), '每次接觸序號 +1');
  assert.ok(hits.some((e) => !e.grew), '有封頂後的接觸');
  const go = autoFix(m);
  const byOpp = new Map(); for (const e of go) byOpp.set(e.opp, (byOpp.get(e.opp) || 0) + 1);
  assert.ok([...byOpp.values()].every((n) => n === 1), '每輪最多一次');
  assert.ok(go.length >= 3, `多輪都有人自己整理（${go.length}）`);
  assert.ok(go.some((e) => hits.find((h) => h.contact === e.opp && !h.grew)), '封頂後的接觸也開出新輪並被受理');
  const wants = logOf(m, (e) => e.kind === 'up:want');
  assert.ok(wants.length > go.length, '候補不消耗：多人有意願、只一人受理');
});

test('中止不退款、同輪不重試：自主出發後被改工作取消，本輪兩人都不再自主；下一次真碰撞才重評', () => {
  const m = game({ hero: { allow: true }, cousin: { allow: true } });
  run(m, (v) => v.boar.fixBy != null);
  const id = m.state.fixBy, other = id === 'hero' ? 'cousin' : 'hero', opp = m.state.contact;
  assert.equal(m.dispatch('work:herb', id).ok, true);
  assert.equal(m.state.fixBy, null); assert.equal(m.view().people[id].fixResult.kind, 'canceled');
  assert.equal(m.state.upUsed, opp, '已用機會不退');
  assert.equal(P(m, id).motion.mode, 'toFix', '前往途中走完這段再回');
  run(m, (v) => v.people[id].mode !== 'toFix' && v.people[id].mode !== 'fromFix');
  for (let i = 0; i < ticks(30) && m.state.contact === opp; i++) m.step();
  assert.equal(autoFix(m).filter((e) => e.opp === opp).length, 1, '同輪不重試、同伴也不接');
  assert.equal(m.view().people[other].up.state === 'used' || m.state.contact !== opp, true);
  run(m, (v, s) => s.contact > opp && !v.boar.seen);
  run(m, (v) => v.boar.fixBy != null);
  assert.ok(autoFix(m).at(-1).opp > opp, '新碰撞開新輪');
});

test('舊任務結果不關新輪：自主整理途中野豬再來→看得見中止；返院途中的新接觸開新輪，舊結果不寫已用', () => {
  // 合法指令歷史：第一訪後先不允許；在第二訪前不同時間點開熟手允許，找出整理途中野豬回來的一局。
  const base = game();
  run(base, (v) => v.boar.visit === 2);
  const out2 = base.state.tick;
  let m = null;
  for (let at = out2 - ticks(40); at < out2; at += 60) {
    const g = game();
    while (g.state.tick < at) g.step();
    g.setUpkeep('cousin', { allow: true });
    run(g, (v) => v.boar.visit === 2 && v.boar.mode === 'sniff');
    run(g, (v) => v.people.cousin.fixResult || v.boar.mode === 'prep', ticks(20));
    if (P(g, 'cousin').fixResult && P(g, 'cousin').fixResult.kind === 'threat' && P(g, 'cousin').fixResult.src === 'auto') { m = g; break; }
  }
  assert.ok(m, '找到自主整理途中野豬回來的一局');
  const opp = autoFix(m, 'cousin')[0].opp;
  assert.equal(m.state.upUsed, opp);
  run(m, (v, s) => s.contact > opp);
  assert.equal(m.state.upUsed, opp, '新接觸後已用仍是舊輪');
  assert.ok(m.state.upUsed !== m.state.contact, '新輪未被舊結果關掉');
  run(m, (v) => v.boar.fixBy === 'cousin');
  assert.ok(P(m, 'cousin').fixOpp > opp, '新輪由新機會受理');
  assert.equal(logOf(m, (e) => e.kind.startsWith('fix:') && e.opp === opp).length, 1, '舊任務只結算一次');
});

// ---------- 4. 覆寫／來源 ----------
test('有效改工作清候補並抑制到下一次真碰撞；拒絕的指令什麼都不改', () => {
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.up.wanting);
  const opp = m.state.contact, job = P(m, 'cousin').motion.mode === 'carry' ? P(m, 'cousin').motion.job : P(m, 'cousin').job;
  // 拒絕：同一份工作沒有待執行時重下
  const before = frozen(m), r0 = m.dispatch(`work:${job}`, 'cousin');
  assert.equal(r0.ok, false); assert.equal(frozen(m), before, '拒絕不改候補／抑制');
  assert.equal(m.dispatch(`work:${job === 'water' ? 'herb' : 'water'}`, 'cousin').ok, true);
  assert.equal(P(m, 'cousin').upWant, null); assert.equal(P(m, 'cousin').upSuppress, opp);
  assert.equal(m.view().people.cousin.up.state, 'player');
  run(m, (v, s) => s.contact > opp, ticks(600));
  assert.equal(autoFix(m).filter((e) => e.opp === opp).length, 0, '本輪不搶回');
  run(m, (v, s) => safeAfterContact(v, s) && s.contact > opp);
  m.step();
  assert.equal(m.view().people.cousin.up.wanting || !!P(m, 'cousin').fix, true, '下一次真碰撞後重評');
});

test('「取消整理意願」只清候補、抑制本輪；無意願重按拒絕；不解除叫回／停工；原「取消待執行」不被擴成整理取消', () => {
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.up.wanting);
  const a = m.actions('cousin');
  assert.equal(a.find((x) => x.id === 'upCancel').enabled, true);
  const pending = P(m, 'cousin').pending, rest = P(m, 'cousin').rest, recall = P(m, 'cousin').recall;
  assert.equal(m.dispatch('upCancel', 'cousin').ok, true);
  assert.equal(P(m, 'cousin').upWant, null); assert.equal(P(m, 'cousin').upSuppress, m.state.contact);
  assert.deepEqual([P(m, 'cousin').pending, P(m, 'cousin').rest, P(m, 'cousin').recall], [pending, rest, recall], '其他意圖不動');
  assert.equal(P(m, 'cousin').suppress, null, '不假造 LP07 本訪抑制');
  const before = frozen(m), r = m.dispatch('upCancel', 'cousin');
  assert.equal(r.ok, false); assert.match(r.reason, /沒有整理意願/); assert.equal(frozen(m), before);
  // 停工跨新碰撞仍優先：停工中不會有新候補
  m.dispatch('restAfterTrip', 'cousin');
  const opp = m.state.contact;
  run(m, (v, s) => s.contact > opp && !v.boar.seen);
  for (let i = 0; i < ticks(5); i++) m.step();
  assert.equal(P(m, 'cousin').upWant, null); assert.equal(autoFix(m).length, 0);
  assert.match(m.view().people.cousin.up.text, /停工/);
});

test('關自主整理：取消自主來源未完成的整理（走完當前腿）、已用不退；人工來源保留；恢復自主不清抑制', () => {
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.fix && v.people.cousin.mode === 'toFix');
  const opp = m.state.contact;
  m.setUpkeep('cousin', { allow: false });
  assert.equal(P(m, 'cousin').fix, null); assert.equal(m.state.fixBy, null);
  assert.equal(P(m, 'cousin').motion.mode, 'toFix', '走完當前腿');
  assert.equal(m.state.upUsed, opp, '不退機會');
  assert.equal(m.view().people.cousin.up.state, 'off');
  m.setUpkeep('cousin', { allow: true });
  assert.equal(P(m, 'cousin').fix, null, '重開不重啟');
  for (let i = 0; i < ticks(10); i++) m.step();
  assert.equal(autoFix(m).length, 1);
  // 人工來源：同一人人工整理時關允許不取消
  const m2 = game({ hero: { allow: true } });
  run(m2, (v, s) => safeAfterContact(v, s) && v.people.hero.mode !== 'fromFix' && !v.people.hero.fix && v.boar.fixBy == null);
  assert.ok(m2.actions('hero').find((x) => x.id === 'fix').enabled, '此刻可人工明派');
  m2.dispatch('fix', 'hero');
  m2.setUpkeep('hero', { allow: false });
  assert.equal(P(m2, 'hero').fix != null, true, '人工整理保留'); assert.equal(P(m2, 'hero').fixSrc, 'manual');
});

test('兩個開關互不控制：設護院不改整理、設整理不改護院；有效人工護院也清整理候補', () => {
  const m = game();
  m.setAuto('hero', { allow: true });
  assert.equal(P(m, 'hero').upAllow, false);
  m.setUpkeep('cousin', { allow: true, react: 'late' });
  assert.equal(P(m, 'cousin').autoAllow, false); assert.equal(P(m, 'cousin').react, 'early', '護院傾向不跟著改');
  assert.equal(m.setUpkeep('cousin', { react: 'x' }).ok, false);
  // 恢復自主只清叫回：直接檢查它不碰整理抑制欄位
  const g = game({ cousin: { allow: true } });
  run(g, (v) => v.people.cousin.up.wanting);
  g.dispatch('upCancel', 'cousin');
  const sup = P(g, 'cousin').upSuppress;
  run(g, (v) => v.boar.active && v.boar.mode !== 'out' && v.boar.mode !== 'habitat', ticks(900));
  assert.ok(g.actions('cousin').find((x) => x.id === 'guard').enabled, '此刻可人工護院');
  assert.equal(g.dispatch('guard', 'cousin').ok, true);
  assert.equal(P(g, 'cousin').upSuppress, g.state.contact, '人工護院抑制目前整理機會');
});

// ---------- 5. 成本／單時間 ----------
test('自主整理沿 LP08：283.4 真路、動手 480 tick 只清一階、只動手扣 8 精力；無 XP／趟次／產物', () => {
  assert.equal(LENGTHS.guard, 283.4);
  const m = game({ cousin: { allow: true } });
  run(m, (v) => v.people.cousin.mode === 'fix');
  const p = P(m, 'cousin'), e0 = p.energy, marks = m.state.boar.marks, snap = { xp: p.xp, trips: p.trips, level: p.level, done: { ...p.done } };
  run(m, (v) => v.people.cousin.fixResult);
  assert.equal(m.view().people.cousin.fixResult.kind, 'done'); assert.equal(m.view().people.cousin.fixResult.src, 'auto');
  assert.ok(Math.abs(e0 - P(m, 'cousin').energy - 8) < 1e-6);
  const start = logOf(m, (e) => e.kind === 'fix' && e.person === 'cousin')[0].tick, done = logOf(m, (e) => e.kind === 'fix:done')[0].tick;
  assert.equal(done - start, FIX_N);
  assert.equal(m.state.boar.marks, marks - 1);
  assert.deepEqual({ xp: P(m, 'cousin').xp, trips: P(m, 'cousin').trips, level: P(m, 'cousin').level, done: P(m, 'cousin').done }, snap);
  assert.equal(m.view().people.cousin.up.state, 'done');
});

test('暫停改設定零進度；牆鐘分幀等值；兩局逐 tick 相同（無 RNG）；新局重置', () => {
  const m = game();
  for (let i = 0; i < 500; i++) m.step();
  const snap = JSON.stringify({ t: m.state.tick, b: m.state.boar, p: [P(m, 'hero').energy, P(m, 'cousin').motion] });
  m.setUpkeep('hero', { allow: true, react: 'early' }); m.setUpkeep('hero', { react: 'late' });
  assert.equal(JSON.stringify({ t: m.state.tick, b: m.state.boar, p: [P(m, 'hero').energy, P(m, 'cousin').motion] }), snap);
  const opts = { hero: { allow: true }, cousin: { allow: true } };
  const a = game(opts), b = game(opts), c = game(opts), clock = createClock();
  for (let i = 0; i < ticks(900); i++) { a.step(); b.step(); }
  assert.equal(JSON.stringify(a.state), JSON.stringify(b.state));
  // 4× 倍率、不同幀長餵同樣的總時間 → 同 tick 數、同狀態
  let fed = 0; const frames = [16, 33, 7, 250, 100];
  for (let i = 0; fed < ticks(900); i++) { const n = Math.min(clock.feed(frames[i % frames.length], 4), ticks(900) - fed); for (let k = 0; k < n; k++) c.step(); fed += n; }
  assert.equal(JSON.stringify(c.state), JSON.stringify(a.state));
  assert.equal(createClock().feed(60000, 1), Math.floor(250 / STEP_MS + 1e-9), '背景長空檔不補時');
  const n = game().view();
  for (const id of ['hero', 'cousin']) { assert.equal(n.people[id].up.allow, false); assert.equal(n.people[id].up.wanting, false); }
  assert.equal(n.boar.contact, 0); assert.equal(n.people.cousin.up.react, 'early');
});
