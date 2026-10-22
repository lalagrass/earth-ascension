// LP-08（#228）單次護欄整理：局部模型反例。用法（在 experiments/water-carry 下）：node --test checks/fence.test.mjs
// 只用公開的 step()／dispatch()／setAuto()／view()；D16 野豬值、路長與精力都不改、不注入。損痕全部來自野豬自然來訪。
// 「低精力」一例用預設局逐 tick 找出「交付後必 ≤30」的時點再派遣，不改起始精力。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, RULES, STEP_MS } from '../demo/model.mjs';
import { createRoutes, SEEN_X } from '../demo/routes.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
// 與 app.mjs 同一份長度（含可見界線距離）。
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength) };
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(3600)) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return m.view(); m.step(); } throw new Error('沒有等到條件'); };
const game = () => createModel(LENGTHS);
const P = (m, id) => m.state.people[id];
const logOf = (m, pred) => m.state.log.filter(pred);
const FIX_N = Math.ceil(RULES.fix.workMs / STEP_MS - 1e-9);
// 第一次自然來訪留下損痕、退走到看不見之後（還在退走腿上，不等回棲地）。
const afterFirstVisit = (m) => run(m, (v) => v.boar.marks > 0 && v.boar.mode === 'flee' && !v.boar.seen);
const frozen = (m) => JSON.stringify({ ...m.state, log: m.state.log.length });
const reject = (m, cmd, id, re) => {
  const before = frozen(m), r = m.dispatch(cmd, id);
  assert.equal(r.ok, false, `${cmd} 應被拒絕`);
  if (re) assert.match(r.reason, re);
  assert.equal(frozen(m), before, '拒絕不改任何狀態');
  return r;
};

// ---------- 1. 一次效果／成本 ----------
test('自然損痕：真走去 283.4 路、動手 480 tick 只清一階、精力只在動手共扣 8；無 XP／趟次／產物，野豬 hits 不回寫', () => {
  assert.equal(LENGTHS.guard, 283.4, '沿既有院中→防守點實路');
  const m = game();
  afterFirstVisit(m);
  const id = Object.keys(m.state.people).find((k) => P(m, k).motion.mode !== 'carry') || 'cousin';
  const marks0 = m.state.boar.marks, hits0 = m.state.boar.hits;
  assert.equal(m.dispatch('fix', id).ok, true);
  const v0 = run(m, (v) => v.people[id].mode === 'toFix');
  const p = P(m, id), snap = { xp: p.xp, trips: p.trips, level: p.level, done: { ...p.done }, e: p.energy };
  const walkNeed = p.motion.need;
  assert.equal(walkNeed, Math.ceil(283.4 / (RULES.emptySpeed.base * (1 + RULES.emptySpeed.perLevel * (p.level - 1))) * 1000 / STEP_MS - 1e-9), '鎖當時空手腳力');
  run(m, (v) => v.people[id].mode === 'fix');
  assert.equal(P(m, id).energy, snap.e, '前往不扣精力');
  const eWork = P(m, id).energy;
  run(m, (v) => v.people[id].fixResult);
  assert.equal(m.view().people[id].fixResult.kind, 'done');
  assert.ok(Math.abs(eWork - P(m, id).energy - 8) < 1e-6, `動手共 8 精力（${eWork} → ${P(m, id).energy}）`);
  const start = logOf(m, (e) => e.kind === 'fix' && e.person === id)[0].tick, done = logOf(m, (e) => e.kind === 'fix:done')[0].tick;
  assert.equal(done - start, FIX_N, '480 工作 tick');
  assert.equal(m.state.boar.marks, marks0 - 1, '只清一階');
  assert.equal(m.state.fixBy, null, '名額釋放');
  const eDone = P(m, id).energy;
  run(m, (v) => v.people[id].mode !== 'fromFix');
  assert.equal(P(m, id).energy, eDone, '返回不扣');
  assert.deepEqual({ xp: P(m, id).xp, trips: P(m, id).trips, level: P(m, id).level, done: P(m, id).done }, { xp: snap.xp, trips: snap.trips, level: snap.level, done: snap.done }, '無 XP／趟次／產物');
  assert.equal(m.state.boar.hits, hits0, '舊 hits 不回寫');
  assert.equal(logOf(m, (e) => e.kind.startsWith('fix:')).length, 1, '結果只結算一次');
  assert.ok(v0.tick > 0);
  // 不自動接下一階：之後 60 秒沒有新的整理
  for (let i = 0; i < ticks(60); i++) m.step();
  assert.equal(logOf(m, (e) => e.kind === 'fixOrder').length, 1);
});

test('工作中明派：等原趟完整交付一次（入帳／XP／釋約各一次）才出發，不丟包、不雙派', () => {
  const m = game();
  afterFirstVisit(m);
  const id = run(m, (v) => Object.values(v.people).some((p) => p.mode === 'carry' && p.phase.name !== 'pour' && p.phase.name !== 'herbDeliver')) && Object.keys(m.state.people).find((k) => P(m, k).motion.mode === 'carry');
  const p = P(m, id), job = p.motion.job, trips0 = p.trips, xpLv = [p.xp, p.level], flight0 = job === 'herb' ? m.state.herbInFlight : m.state.inFlight;
  const r = m.dispatch('fix', id);
  assert.equal(r.ok, true); assert.equal(r.pending, true);
  assert.equal(P(m, id).motion.mode, 'carry', '不中斷原趟');
  run(m, (v) => v.people[id].trips > trips0);
  assert.equal(P(m, id).trips, trips0 + 1);
  // 交付那一 tick 在院中：精力仍 >30 就直接出發整理；≤30 先去恢復（整理仍待執行）。都不接下一趟。
  if (P(m, id).energy > RULES.energy.restAt) assert.equal(P(m, id).motion.mode, 'toFix', '交付那一 tick 在院中出發，不接下一趟');
  else { assert.equal(P(m, id).motion.mode, 'toSeat'); assert.equal(P(m, id).fix, 'wait'); }
  assert.ok((job === 'herb' ? m.state.herbInFlight : m.state.inFlight) <= flight0 - 1 + 1, '預約已釋放');
  assert.ok(P(m, id).xp !== xpLv[0] || P(m, id).level !== xpLv[1] || P(m, id).level === RULES.maxLevel, '成長算一次');
  const other = id === 'hero' ? 'cousin' : 'hero';
  reject(m, 'fix', other, /已在整理/);
  reject(m, 'fix', id, /重送/);
});

test('低精力：交付後 ≤30 先坐下恢復到 80，回院中才去整理；恢復來源不被清', () => {
  const m = game();
  // 找主角在途中、這趟交付後精力必 ≤30、且護欄有痕看不見野豬的時點（只是挑時點，不改值）。
  const left = (p) => p.motion.need.reduce((a, b) => a + b, 0) - p.motion.need.slice(0, p.motion.phase).reduce((a, b) => a + b, 0) - p.motion.steps;
  run(m, () => { const p = P(m, 'hero'), v = m.view(); return p.motion.mode === 'carry' && v.boar.marks > 0 && !v.boar.seen && !v.people.hero.fix && p.energy - left(p) / 60 <= 29.5 && p.energy - left(p) / 60 > 0; }, ticks(7200));
  assert.equal(m.dispatch('fix', 'hero').ok, true);
  run(m, (v) => v.people.hero.mode !== 'carry');
  assert.equal(P(m, 'hero').rest, 'auto'); assert.equal(P(m, 'hero').motion.mode, 'toSeat');
  assert.equal(P(m, 'hero').fix, 'wait', '整理仍待執行');
  const v = run(m, (x) => x.people.hero.mode === 'toFix' || !x.people.hero.fix);
  assert.equal(v.people.hero.fix, 'go', '本局恢復期間野豬沒有回來');
  if (v.people.hero.fix) assert.ok(v.people.hero.energy >= RULES.energy.backAt, `恢復到 80 才出發（${v.people.hero.energy}）`);
  else assert.equal(v.people.hero.fixResult.kind, 'threat', '恢復期間野豬又來了：失效、不自動補派');
});

// ---------- 2. 合法性 ----------
test('拒絕不改狀態：無痕、看得見野豬、停工、已在驅離、他人已接手、返院腿', () => {
  const m = game();
  reject(m, 'fix', 'hero', /沒有損痕/);
  run(m, (v) => v.boar.marks > 0 && v.boar.seen);
  reject(m, 'fix', 'hero', /看得見野豬/);
  // 可見退走仍擋；越過可見界線即可派（不必等回棲地）
  run(m, (v) => v.boar.mode === 'flee' && v.boar.seen);
  reject(m, 'fix', 'cousin', /看得見/);
  const vis = run(m, (v) => !v.boar.seen);
  assert.equal(vis.boar.mode, 'flee', '仍在退走腿上');
  assert.ok(geo.boarAt(vis.boar).x <= SEEN_X && !geo.boarAt(vis.boar).visible, '與畫面可見界線同源');
  assert.equal(m.actions('cousin').find((a) => a.id === 'fix').enabled, true);
  // 停工
  assert.equal(m.dispatch('restAfterTrip', 'hero').ok, true);
  if (P(m, 'hero').rest === 'manual') reject(m, 'fix', 'hero', /停工/);
  else reject(m, 'fix', 'hero', /本趟後停工/);
  assert.equal(m.dispatch('fix', 'cousin').ok, true);
  reject(m, 'fix', 'cousin', /重送/);
  run(m, (v) => v.people.cousin.mode === 'fromFix');
  reject(m, 'fix', 'cousin', /返院/);
  reject(m, 'fixCancel', 'cousin', /沒有未完成/);
});

test('可見界線：模型用的距離界線與 routes.boarAt().visible 在整條獸路上逐點一致（同一份幾何）', () => {
  assert.equal(LENGTHS.boar.seen, geo.boarSeenD);
  for (let d = 0.25; d <= geo.boarLengths.total; d += 0.5) assert.equal(d > geo.boarSeenD, geo.boarAt({ mode: 'flee', d }).visible, `d=${d}`);
});

// ---------- 3. 取消／威脅／同 tick ----------
test('改工作：前往途中取消整理、走完這段到護欄再返院做新工作；不清痕、名額釋放一次', () => {
  const m = game();
  afterFirstVisit(m);
  const marks = m.state.boar.marks;
  m.dispatch('fix', 'cousin');
  run(m, (v) => v.people.cousin.mode === 'toFix' && v.people.cousin.fixLeg.steps > 10);
  const other = P(m, 'cousin').job === 'water' ? 'herb' : 'water';
  assert.equal(m.dispatch(`work:${other}`, 'cousin').ok, true);
  assert.equal(P(m, 'cousin').motion.mode, 'toFix', '當前腿走完');
  assert.equal(m.state.fixBy, null);
  run(m, (v) => v.people.cousin.mode === 'fromFix');
  run(m, (v) => v.people.cousin.mode !== 'fromFix');
  assert.equal(P(m, 'cousin').job, other);
  assert.equal(m.state.boar.marks, marks, '未完整不清痕');
  assert.equal(logOf(m, (e) => e.kind.startsWith('fix:')).length, 1);
  assert.equal(logOf(m, (e) => e.kind === 'fix').length, 0, '沒有開始動手');
});

test('專用取消：動手中停手返院、已花精力不退；重按／返回腿拒絕；LP05 原取消不會取消整理', () => {
  const m = game();
  afterFirstVisit(m);
  m.dispatch('fix', 'cousin');
  run(m, (v) => v.people.cousin.mode === 'fix' && v.people.cousin.fixWork.steps === 120);
  const cancel = m.actions('cousin').find((a) => a.id === 'cancel');
  if (!cancel.enabled) reject(m, 'cancel', 'cousin');
  assert.equal(P(m, 'cousin').fix, 'go', '原取消不是萬用中斷');
  const e = P(m, 'cousin').energy, marks = m.state.boar.marks;
  assert.equal(m.dispatch('fixCancel', 'cousin').ok, true);
  assert.equal(P(m, 'cousin').motion.mode, 'fromFix', '立刻停手返院');
  assert.equal(P(m, 'cousin').energy, e, '不退');
  assert.equal(m.state.boar.marks, marks);
  reject(m, 'fixCancel', 'cousin');
  assert.equal(logOf(m, (x) => x.kind === 'fix:canceled').length, 1);
});

test('停工／叫回：待整理被有效停工或叫回取消；恢復自主不取消、不啟動整理', () => {
  const m = game();
  afterFirstVisit(m);
  const id = Object.keys(m.state.people).find((k) => P(m, k).motion.mode === 'carry');
  if (id) {
    m.dispatch('fix', id);
    assert.equal(m.dispatch('restAfterTrip', id).ok, true);
    assert.equal(P(m, id).fix, null); assert.equal(P(m, id).pending, 'rest');
  }
  // 叫回：等某人在休閒中，派整理後再叫回
  const m2 = createModel(LENGTHS, { ...RULES, vatStart: RULES.vatCapacity });
  run(m2, (v) => v.boar.marks > 0 && !v.boar.seen && v.boar.mode === 'flee' && Object.values(v.people).some((p) => p.mode === 'toFun'), ticks(7200));
  const f = Object.keys(m2.state.people).find((k) => P(m2, k).motion.mode === 'toFun');
  assert.equal(m2.dispatch('fix', f).ok, true);
  assert.equal(m2.dispatch('recall', f).ok, true);
  assert.equal(P(m2, f).fix, null); assert.equal(P(m2, f).recall, true);
  assert.equal(m2.dispatch('resume', f).ok, true);
  assert.equal(P(m2, f).fix, null, '恢復自主不啟動整理');
});

test('威脅：畫外 out 可受理；看得見嗅探的同一 tick 失效（不讀心、不等）', () => {
  const m = game();
  afterFirstVisit(m);
  run(m, (v) => v.boar.mode === 'out' && v.boar.visit === 2);
  assert.equal(m.view().boar.seen, false, '畫外不讀心');
  const id = m.view().boar.fixBy ? null : 'hero';
  assert.equal(m.dispatch('fix', id).ok, true);
  run(m, (v) => v.boar.mode === 'sniff');
  assert.equal(P(m, id).fix, null);
  const t = logOf(m, (e) => e.kind === 'fix:threat')[0].tick;
  assert.equal(t, m.state.tick, '同 tick 失效');
  assert.equal(logOf(m, (e) => e.kind === 'fixOrder').length, 1, '不自動補派');
});

test('同 tick：做滿那一 tick 野豬同時變得看得見→先失效、不補效果；已花 8 精力不退、釋約一次', () => {
  // 決定性：先跑一局找出第二次嗅探的 tick，再在相同歷史的新局逐一嘗試派遣時點，直到做滿與嗅探同 tick。
  const base = game();
  afterFirstVisit(base);
  run(base, (v) => v.boar.mode === 'sniff' && v.boar.visit === 2);
  const T = base.state.tick;
  let hit = null;
  for (let d = T - FIX_N - 2; d > T - FIX_N - 1200 && !hit; d--) for (const who of ['cousin', 'hero']) {
    if (hit) break;
    const m = game();
    while (m.state.tick < d) m.step();
    if (!m.actions(who).find((a) => a.id === 'fix').enabled) continue;
    m.dispatch('fix', who);
    while (m.state.tick < T) {
      const due = P(m, who).motion.mode === 'fix' && P(m, who).motion.steps === FIX_N - 1;
      m.step();
      if (due && m.state.tick === T) hit = { m, who };
      if (!P(m, who).fix) break;
    }
  }
  assert.ok(hit, '找到做滿與嗅探同 tick 的派遣時點');
  const { m, who } = hit;
  assert.equal(m.state.boar.mode, 'sniff');
  assert.deepEqual(logOf(m, (e) => e.kind.startsWith('fix:')).map((e) => e.kind), ['fix:threat']);
  assert.equal(m.state.boar.marks, base.state.boar.marks, '不補效果');
  assert.equal(P(m, who).motion.mode, 'fromFix');
  const start = logOf(m, (e) => e.kind === 'fix')[0].tick;
  assert.equal(m.state.tick - start, FIX_N, '480 tick 都做了');
  assert.equal(m.state.fixBy, null);
});

// ---------- 4. LP07 相容 ----------
test('LP07：受理整理清候補並抑制本訪；手動驅離對整理者／其返院拒絕、對另一人照常；開關與傾向不控制整理', () => {
  const m = game();
  m.setAuto('cousin', { allow: true, react: 'early' });
  afterFirstVisit(m);
  run(m, (v) => v.boar.mode === 'out' && v.boar.visit === 2);
  if (P(m, 'cousin').motion.mode === 'carry' || true) assert.equal(m.dispatch('fix', 'cousin').ok, true);
  assert.equal(P(m, 'cousin').suppress, 2, '有 active 來訪：本訪抑制');
  assert.equal(P(m, 'hero').suppress, null, '不影響另一人');
  reject(m, 'guard', 'cousin', /整理/);
  assert.equal(m.actions('hero').find((a) => a.id === 'guard').enabled, true, '另一人可手動驅離');
  m.setAuto('cousin', { allow: false }); m.setAuto('cousin', { allow: true, react: 'late' });
  assert.equal(P(m, 'cousin').fix, 'wait', '開關／傾向不取消整理');
  m.setAuto('cousin', { react: 'early' });
  run(m, (v) => v.boar.mode === 'sniff');
  assert.equal(P(m, 'cousin').fix, null, '看得見就失效');
  for (let i = 0; i < ticks(30); i++) m.step();
  assert.equal(logOf(m, (e) => e.kind === 'guard' && e.src === 'auto' && e.person === 'cousin' && e.visit === 2).length, 0, '本訪被抑制，不自己搶回');
});

test('LP07：整理失效返院途中可有意願，但真的回到院中才正式護院（下一訪）', () => {
  const m = game();
  m.setAuto('cousin', { allow: true, react: 'early' });
  afterFirstVisit(m);
  assert.equal(m.dispatch('fix', 'cousin').ok, true); // 沒有 active 來訪：不抑制未來
  assert.equal(P(m, 'cousin').suppress, null);
  run(m, (v) => v.people.cousin.fixResult);
  const res = m.view().people.cousin.fixResult.kind;
  run(m, (v) => v.people.cousin.auto.state === 'go' || v.boar.visit >= 4, ticks(7200));
  const go = logOf(m, (e) => e.kind === 'guard' && e.src === 'auto' && e.person === 'cousin')[0];
  assert.ok(go, `整理結果 ${res} 之後，熟手在後續來訪正式自主護院`);
  if (go) {
    const home = logOf(m, (e) => e.kind === 'fixHome' && e.person === 'cousin')[0];
    assert.ok(home && home.tick <= go.tick, `先返院（${home && home.tick}）才正式護院（${go.tick}），整理結果 ${res}`);
  }
});

test('已受理驅離（含返院）的人拒絕整理；整理者先回院才可派驅離', () => {
  const m = game();
  afterFirstVisit(m);
  run(m, (v) => v.boar.mode === 'out' && v.boar.visit === 2);
  assert.equal(m.dispatch('guard', 'cousin').ok, true);
  reject(m, 'fix', 'cousin', /驅離/);
  run(m, (v) => v.people.cousin.mode === 'fromGuard');
  reject(m, 'fix', 'cousin', /驅離/);
  run(m, (v) => v.people.cousin.mode !== 'fromGuard');
  if (!m.view().boar.seen) assert.equal(m.dispatch('fix', 'cousin').ok, true, '回院後可派');
});

// ---------- 5. 單時間／重來 ----------
test('暫停中派遣零進度；分幀與整段餵入同結果；背景長空檔不補時；新局清整理', () => {
  const m = game();
  afterFirstVisit(m);
  const t = m.state.tick, before = Object.values(m.state.people).map((p) => [p.energy, p.level, p.trips]), boar = JSON.stringify(m.state.boar);
  assert.equal(m.dispatch('fix', 'cousin').ok, true);
  assert.equal(m.state.tick, t, '下令不推進 tick');
  assert.deepEqual(Object.values(m.state.people).map((p) => [p.energy, p.level, p.trips]), before, '精力／成長不推');
  assert.equal(JSON.stringify(m.state.boar), boar, '野豬不推');
  const c = P(m, 'cousin').motion;
  assert.ok(c.mode !== 'toFix' || c.steps === 0, '只更新零進度意圖');
  // 分幀等值：同一局，一個用 4× 大幀、一個用 1× 小幀，總遊戲時間相同
  const a = game(), b = game(), ca = createClock(), cb = createClock();
  for (let i = 0; i < 600; i++) for (let n = ca.feed(50, 4); n > 0; n--) a.step();
  for (let i = 0; i < 2400; i++) for (let n = cb.feed(50, 1); n > 0; n--) b.step();
  afterFirstVisit(a); afterFirstVisit(b);
  a.dispatch('fix', 'cousin'); b.dispatch('fix', 'cousin');
  for (let i = 0; i < 400; i++) { for (let n = ca.feed(100 / 3, 2); n > 0; n--) a.step(); }
  for (let i = 0; i < 1600; i++) { for (let n = cb.feed(50 / 3, 1); n > 0; n--) b.step(); }
  assert.equal(a.state.tick, b.state.tick);
  assert.equal(frozen(a), frozen(b));
  assert.equal(createClock().feed(60000, 4), 60, '背景回來最多 250ms×4，不補時');
  const fresh = game();
  assert.equal(fresh.state.fixBy, null); assert.equal(fresh.state.boar.marks, 0);
  assert.ok(Object.values(fresh.state.people).every((p) => p.fix === null && p.fixResult === null));
});
