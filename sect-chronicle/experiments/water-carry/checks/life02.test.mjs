// SG-LIFE-02 直接反例（只補 VALIDATION_POLICY 指定的四組）：方針預約／上下限、忙碌拒絕與取消釋放、
// 玩家覆寫／單 tick 不重複移動、最小保存 guard 與成功／失敗載入邊界。不重跑舊矩陣，不做常數鏡像。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, MEET_MODES } from '../demo/model.mjs';
import { saveTo, loadFrom, SAVE_KEY } from '../demo/life-save.mjs';
import { guardedSave, guardedLoad } from '../demo/life02.mjs';

const LEN = 1700.9;
const mk = () => createModel(LEN);
const run = (m, n, f) => { for (let i = 0; i < n; i++) { m.step(); if (f && f(m) === false) return i; } return n; };
const meetOf = (m) => m.life02.state.meet;
function untilMeet(m, mode = 'meet', max = 60 * 60 * 40) {
  const at = run(m, max, () => !(meetOf(m) && ['hero', 'cousin'].every((id) => m.state.people[id].motion.mode === mode)) || false);
  return run.length && at < max;
}
const store = () => ({ v: new Map(), getItem(k) { return this.v.has(k) ? this.v.get(k) : null; }, setItem(k, x) { this.v.set(k, x); } });

test('P1 上下限：方針者只在補水輪出發；實存＋在途永不超過 6；輪在實存 ≤3 開、實存 6 收；不改容量 8', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  let maxSum = 0, prevIn = 0, departOutside = 0, starts = 0, badStart = 0;
  run(m, 60 * 60 * 30, () => {
    const v = m.view(), st = m.life02.state;
    maxSum = Math.max(maxSum, v.vat + v.inFlight);
    if (v.inFlight > prevIn && !st.round) departOutside += 1;
    prevIn = v.inFlight;
  });
  for (const e of m.life02.log()) if (e.kind === 'round:start') { starts += 1; if (e.vat > 3) badStart += 1; }
  assert.ok(maxSum <= 6, `實存＋在途最高 ${maxSum}`);
  assert.equal(departOutside, 0, '補水輪外不新增自主出發');
  assert.ok(starts >= 2, '喝水形成缺口後會再開一輪');
  assert.equal(badStart, 0, '輪只在實存 ≤3 開始');
  assert.equal(m.state.stores ? m.state.stores.water?.cap ?? 8 : 8, 8);
});

test('P1 人工持續搬運不被 6 擔截斷：未選方針者照原規則補到 8', () => {
  const m = mk();
  m.dispatch('work:water', 'hero');
  let max = 0; run(m, 60 * 60 * 30, () => { max = Math.max(max, m.view().vat); });
  assert.equal(max, 8);
});

test('P2 對方忙則放棄本次：不發起、不追逐、不占位；忙碌原因只在改變時記；完成一趟新工作才再試', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  let seen = 0, chased = 0, last = null;
  run(m, 60 * 60 * 40, () => {
    const L = m.life02.log(), e = L[L.length - 1];
    if (e && e !== last && e.kind === 'note' && /不打擾/.test(e.text)) {
      seen += 1;
      const p = m.state.people[e.person];
      if (meetOf(m) || p.motion.mode !== 'fun' || m.life02.state.ready[e.person]) chased += 1;
    }
    last = e;
  });
  assert.ok(seen >= 1, '有出現對方忙碌的時機');
  assert.equal(chased, 0, '被拒當下留在原休閒點、不開招呼、機會已用掉');
  const notes = m.life02.log().filter((e) => e.kind === 'note' && /不打擾/.test(e.text));
  for (const e of notes) assert.ok(!m.life02.log().some((x) => x.kind === 'meet:start' && x.tick === e.tick && x.person === e.person));
});

test('P2 取消：雙方同時釋放、從所在處真走回（逐 tick 連續）；發起者完成一趟才再發起', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  assert.ok(untilMeet(m, 'toMeet'));
  const a = meetOf(m).a;
  run(m, 30);
  const u0 = Object.fromEntries(['hero', 'cousin'].map((id) => { const h = m.state.people[id].motion; return [id, h.a + (h.b - h.a) * h.steps / h.need]; }));
  const r = m.dispatch('meetCancel', a);
  assert.ok(r.ok); assert.equal(meetOf(m), null);
  for (const id of ['hero', 'cousin']) {
    const h = m.state.people[id].motion;
    assert.equal(h.mode, 'fromMeet', `${id} 走回`);
    assert.ok(Math.abs(h.a - u0[id]) < 1e-9, `${id} 從原地起步、不瞬移`);
  }
  const trips0 = m.state.people[a].done.water + m.state.people[a].done.herb;
  let again = null;
  run(m, 60 * 60 * 30, () => { if (meetOf(m) && again == null) again = m.state.people[a].done.water + m.state.people[a].done.herb; });
  if (again != null) assert.ok(again > trips0 || meetOf(m)?.a !== a, '發起者未完成新一趟前不再發起');
});

test('P2 完成：共 4 遊戲秒招呼，留一筆短事件後雙方走回、各自續生活', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  assert.ok(untilMeet(m, 'meet'));
  let n = 0; run(m, 600, () => { if (!meetOf(m)) return false; n += 1; });
  const talk = 240 - n; assert.ok(talk >= 1 && talk <= 3, `兩人到齊後 ${n} tick（到齊當 tick 已計入）`);
  assert.equal(m.life02.events().length, 1);
  for (const id of ['hero', 'cousin']) assert.equal(m.state.people[id].motion.mode, 'fromMeet');
  run(m, 60 * 30);
  for (const id of ['hero', 'cousin']) assert.ok(!MEET_MODES.includes(m.state.people[id].motion.mode));
});

test('P3 玩家覆寫優先：改派退出方針與招呼，下一 tick 不搶回；停工只能自理、再選自主補水才恢復', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  assert.ok(untilMeet(m, 'meet'));
  m.dispatch('work:herb', 'cousin');
  assert.equal(m.life02.view(m.state.people.cousin).fill, false);
  run(m, 60 * 60 * 5, () => { assert.equal(m.life02.state.fill.cousin, false); assert.notEqual(m.state.people.cousin.job, 'water'); });
  m.dispatch('restAfterTrip', 'hero');
  assert.equal(m.life02.state.fill.hero, false);
  const done0 = m.state.people.hero.done.water;
  run(m, 60 * 60 * 10);
  assert.ok(m.state.people.hero.done.water - done0 <= 1);
  m.dispatch('fill', 'hero');
  assert.equal(m.life02.state.fill.hero, true);
});

test('P3 單 tick 不重複移動：招呼往返每 tick 步數至多 +1，發起／取消當 tick 不推進', () => {
  const m = mk();
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  let prev = {}, bad = 0, seen = 0;
  run(m, 60 * 60 * 30, () => {
    for (const id of ['hero', 'cousin']) {
      const h = m.state.people[id].motion;
      if (h.mode === 'toMeet' || h.mode === 'fromMeet') {
        seen += 1;
        const p = prev[id];
        if (p && p.mode === h.mode && p.need === h.need && h.steps - p.steps > 1) bad += 1;
        if ((!p || p.mode !== h.mode) && h.steps > 0) bad += 1;
      }
      prev[id] = { mode: h.mode, steps: h.steps, need: h.need };
    }
  });
  assert.ok(seen > 0); assert.equal(bad, 0);
});

test('P4 保存 guard：招呼／返程中不呼叫原存檔，舊檔原封不動；回原支援狀態可存且明說不保存方針', () => {
  const m = mk(), st = store();
  st.setItem(SAVE_KEY, 'OLD');
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  assert.ok(untilMeet(m, 'toMeet'));
  const r = guardedSave(m, () => saveTo(st, m));
  assert.equal(r.ok, false); assert.equal(st.getItem(SAVE_KEY), 'OLD');
  run(m, 60 * 60 * 2, () => !MEET_MODES.some((x) => ['hero', 'cousin'].some((id) => m.state.people[id].motion.mode === x)) ? false : undefined);
  const r2 = guardedSave(m, () => saveTo(st, m));
  assert.ok(r2.ok, r2.text); assert.match(r2.text, /只本局/);
  assert.ok(!/fill|meet|life02/.test(st.getItem(SAVE_KEY).replace(/"mode":"[a-zA-Z]+"/g, '')), '存檔不含新欄位');
});

test('P4 載入：成功才重設暫態；失敗時當局狀態與暫態都不變', () => {
  const tpl = mk().exportState();
  const m = mk(), st = store();
  m.dispatch('fill', 'hero');
  run(m, 600);
  assert.ok(saveTo(st, m).ok);
  m.dispatch('fill', 'cousin'); run(m, 60 * 60 * 3);
  const keepT = JSON.stringify(m.life02.state), keepS = JSON.stringify(m.exportState());
  const bad = store(); bad.setItem(SAVE_KEY, '{"broken":');
  const rf = guardedLoad(m, () => loadFrom(bad, m, tpl));
  assert.equal(rf.ok, false);
  assert.equal(JSON.stringify(m.life02.state), keepT); assert.equal(JSON.stringify(m.exportState()), keepS);
  const ro = guardedLoad(m, () => loadFrom(st, m, tpl));
  assert.ok(ro.ok, ro.text);
  assert.equal(m.life02.anyFill(), false); assert.equal(meetOf(m), null);
});

test('review①：方針中按「挑水（持續）」可明確切回人工持續並退出方針，之後照原規則補到 8', () => {
  const m = mk();
  m.dispatch('fill', 'hero');
  const a = m.actions('hero').find((x) => x.id === 'work:water');
  assert.equal(a.enabled, true, a.reason);
  const r = m.dispatch('work:water', 'hero');
  assert.ok(r.ok, r.reason);
  assert.equal(m.life02.state.fill.hero, false);
  assert.equal(m.state.people.hero.job, 'water');
  assert.equal(m.actions('hero').find((x) => x.id === 'work:water').enabled, false, '已回人工持續後同工作才算重複');
});

test('review②：未選方針的人工持續者滿庫休閒時不被拉入招呼；只對一人選方針不會發起', () => {
  const m = mk();
  let both = false;
  run(m, 60 * 60 * 30, () => { if (['hero', 'cousin'].every((id) => m.state.people[id].motion.mode === 'fun')) { both = true; return false; } });
  assert.ok(both, '自然新局兩人都在休閒');
  m.dispatch('fill', 'hero');
  m.life02.state.ready.hero = true;
  let met = 0; run(m, 60 * 60 * 10, () => { if (meetOf(m)) met += 1; });
  assert.equal(met, 0);
  assert.ok(m.life02.log().some((e) => e.person === 'hero' && /未選自主補水/.test(e.text || '')));
});

test('pending 方針也可切回人工持續：採藥當趟不變，交付後執行最新挑水意圖', () => {
  const m = mk();
  assert.ok(m.dispatch('work:herb', 'hero').ok);
  assert.ok(m.dispatch('fill', 'hero').ok);
  const p = m.state.people.hero;
  assert.equal(p.pending, 'water');
  assert.equal(m.life02.state.fill.hero, true);
  const motion = JSON.stringify(p.motion), inFlight = m.state.herbInFlight;
  const r = m.dispatch('work:water', 'hero');
  assert.ok(r.ok, r.reason);
  assert.equal(m.life02.state.fill.hero, false);
  assert.equal(p.pending, 'water');
  assert.equal(JSON.stringify(p.motion), motion, '原採藥行走／進度不變');
  assert.equal(m.state.herbInFlight, inFlight, '原藥材預約不變');
  assert.equal(m.dispatch('work:water', 'hero').ok, false, '人工同指令仍拒絕重複');
  const before = p.done.herb;
  run(m, 60 * 60 * 5, () => p.done.herb === before ? undefined : false);
  assert.equal(p.done.herb, before + 1, '當趟正常交付一次');
  assert.equal(p.job, 'water');
  assert.equal(p.pending, null);
  assert.equal(m.life02.state.fill.hero, false, '交付後不搶回方針');
});
