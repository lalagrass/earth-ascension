// V3 展示模型的局部反例。用法（在 experiments/water-carry 下）：node --test checks/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, tripSteps, speedsFor, RULES, STEP_MS } from '../demo/model.mjs';

const LEN = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url))).path.length;
const runUntil = (m, pred, limit = 1e6) => { for (let i = 0; i < limit; i++) { if (pred(m.view())) return; m.step(); } throw new Error('沒有等到條件'); };
// 不讓道館用水干擾的規則（水缸夠大、不用水）
const NO_USE = { ...RULES, vatCapacity: 999, useEveryMs: 1e12 };

test('每趟只在倒水完成時入帳一次，並且只成長一次', () => {
  const m = createModel(LEN, NO_USE);
  const vat0 = m.view().vat;
  let prev = m.view();
  let changes = 0;
  runUntil(m, (v) => {
    if (v.vat !== prev.vat) {
      changes++;
      assert.equal(v.vat, prev.vat + 1, '一次只入一擔');
      assert.equal(v.trips, prev.trips + 1, '入帳和趟數同一步');
    }
    if (v.trips === prev.trips) assert.equal(v.xp + v.level * 100, prev.xp + prev.level * 100, '趟中不成長');
    prev = v;
    return v.trips === 3;
  });
  assert.equal(changes, 3);
  assert.equal(m.view().vat, vat0 + 3);
});

test('成長在倒完水才生效：當趟維持出發時的速度，下一趟同倍率真的更快', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.mode === 'carry' && v.phase.name === 'up');
  assert.equal(m.view().tripLevel, 1);
  runUntil(m, (v) => v.trips === 1);
  const first = m.view().lastTrip;
  assert.equal(first.level, 1);
  assert.equal(m.view().level, 2, '第一趟完成升 Lv 2');
  runUntil(m, (v) => v.trips === 2);
  const second = m.view().lastTrip;
  assert.equal(second.level, 2);
  assert.ok(second.seconds < first.seconds, `第二趟 ${second.seconds}s 應短於第一趟 ${first.seconds}s`);
  assert.ok(Math.abs(first.seconds - tripSteps(1, LEN) * STEP_MS / 1000) < 1e-9, '實際步數等於公式');
});

test('速度有上限：滿級後再挑不會更快，也不再成長', () => {
  const m = createModel(LEN, NO_USE);
  const need = RULES.tripsToNext.reduce((a, b) => a + b, 0);
  runUntil(m, (v) => v.trips === need);
  assert.equal(m.view().level, RULES.maxLevel);
  assert.ok(m.view().atCap);
  runUntil(m, (v) => v.trips === need + 2);
  assert.equal(m.view().level, RULES.maxLevel);
  assert.deepEqual(speedsFor(RULES.maxLevel + 3), speedsFor(RULES.maxLevel));
  assert.equal(speedsFor(RULES.maxLevel).load, RULES.loadSpeed.cap);
  assert.equal(m.view().lastTrip.seconds, tripSteps(RULES.maxLevel, LEN) * STEP_MS / 1000);
});

test('本趟後休息：倒完水才停，之後不自己出發；開始挑水才再出發', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.mode === 'carry' && v.phase.name === 'down');
  assert.equal(m.dispatch('restAfterTrip').ok, true);
  assert.equal(m.dispatch('restAfterTrip').ok, false, '不能重複下');
  assert.equal(m.view().mode, 'carry', '下令當下不停工');
  runUntil(m, (v) => v.trips === 1);
  assert.equal(m.view().resting, true);
  for (let i = 0; i < 5000; i++) m.step();
  assert.equal(m.view().trips, 1, '休息期間不挑水、不入帳');
  assert.equal(m.view().mode, 'idle');
  const r = m.dispatch('start');
  assert.equal(r.ok, true);
  assert.equal(m.view().mode, 'carry');
});

test('取消待執行：倒完水後繼續挑', () => {
  const m = createModel(LEN, NO_USE);
  m.step();
  m.dispatch('restAfterTrip');
  assert.equal(m.dispatch('cancel').ok, true);
  runUntil(m, (v) => v.trips === 1);
  m.step();
  assert.equal(m.view().resting, false);
  assert.equal(m.view().mode, 'carry');
});

test('做不到的選項回原因，不改狀態', () => {
  const m = createModel(LEN, NO_USE);
  m.step();
  const before = JSON.stringify(m.state);
  for (const id of ['start', 'pourNow', 'helper', 'cancel', 'nope']) {
    const r = m.dispatch(id);
    assert.equal(r.ok, false, id);
    assert.ok(r.reason, `${id} 要有原因`);
  }
  assert.equal(JSON.stringify(m.state), before);
});

test('水缸滿了在道館等用水，用掉一擔後自己出發', () => {
  const rules = { ...RULES, vatStart: RULES.vatCapacity, useEveryMs: 10000 };
  const m = createModel(LEN, rules);
  m.step();
  assert.equal(m.view().mode, 'idle');
  assert.match(m.view().status, /水缸已滿/);
  runUntil(m, (v) => v.mode === 'carry');
  assert.equal(m.view().vat, RULES.vatCapacity - 1);
});

test('初始腳力影子用 Lv 1 速度走，永遠不產水', () => {
  const m = createModel(LEN, NO_USE);
  runUntil(m, (v) => v.trips === 1);
  m.step();
  assert.ok(m.view().shadow, '影子和主角一起出發');
  const vat = m.view().vat;
  // 第二趟主角 Lv2、影子 Lv1：主角倒完水時影子還在路上，水缸只多主角那一擔
  runUntil(m, (v) => v.trips === 2);
  assert.equal(m.view().vat, vat + 1);
  assert.ok(m.view().shadow, '影子還沒走完這一趟');
});

test('view() 只讀：重複呼叫不改狀態', () => {
  const m = createModel(LEN);
  for (let i = 0; i < 1234; i++) m.step();
  const before = JSON.stringify(m.state);
  for (let i = 0; i < 50; i++) { m.view(); m.actions(); }
  assert.equal(JSON.stringify(m.state), before);
});

test('畫面幀率與分段不影響結果：60fps、144fps、不規則幀與 4 倍速餵同樣的總時間，得到同一個世界', () => {
  const run = (frames, speed) => {
    const m = createModel(LEN);
    const c = createClock();
    for (const dt of frames) { const n = c.feed(dt, speed); for (let i = 0; i < n; i++) m.step(); }
    return JSON.stringify(m.state);
  };
  const total = 120000; // 兩分鐘遊戲時間
  const even = (fps) => Array.from({ length: total / 1000 * fps }, () => 1000 / fps);
  const ragged = []; for (let t = 0, i = 0; t < total; i++) { const d = Math.min(total - t, [7, 33, 16, 50, 3][i % 5]); ragged.push(d); t += d; }
  const quarter = Array.from({ length: total / 4 / 25 }, () => 25);
  const a = run(even(60), 1);
  assert.equal(run(even(144), 1), a);
  assert.equal(run(ragged, 1), a);
  assert.equal(run(quarter, 4), a, '4 倍速 30 秒＝1 倍速 2 分鐘');
});

test('長空檔不追趕：一次 10 秒的空檔只算 250ms', () => {
  const c = createClock();
  assert.equal(c.feed(10000, 1), Math.floor(250 / STEP_MS + 1e-9));
});
