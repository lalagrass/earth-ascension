'use strict';
// SG-03 引擎測試：仲裁核心、原子時段結算、批次停止、42 格邊界、回放。
// 範圍只到「核心路徑走到危機待選」。建造／煉丹工期、援村發獎、招募入隊、突破、戰鬥與結局屬後續任務，
// 這裡不宣稱已驗獸患結局，也不證明 AC-C13 其餘部分或 AC-C15 完整。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const SD = require('../js/story-data.js');
const C = require('../js/commands.js');
const E = require('../js/engine.js');
const { withDoneAid, withInvitation } = require('./helpers.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const P = State.PROTAGONIST_ID;
const M = State.MASTER_ID;
const hash = (w) => State.hashWorld(w);
const world = (seed = 'eng-seed', opts) => {
  const r = State.newWorld(seed, 'slice-14', opts);
  assert.equal(r.ok, true);
  return r.state;
};
const disc = (w, id) => w.disciples.find((d) => d.id === id);
const send = (w, id, type, payload) => {
  const r = C.dispatch(w, { id, expectedRevision: w.revision, type, payload });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const step = (w, n = 1) => {
  const r = E.advance(w, n);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const resolvedEvents = (w) => w.eventLog.filter((e) => e.type === 'slotResolved');
const rejectedAdvance = (w, n, code) => {
  const frozen = deepFreeze(clone(w));
  const before = hash(frozen);
  const r = E.advance(frozen, n);
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  assert.equal(typeof r.reason, 'string');
  assert.equal(hash(frozen), before, '拒絕後世界不變');
  return r;
};

// ---------- 載入與純度 ----------

test('engine.js 不用 RNG／牆鐘／eval，只 require commands、rules、state、story-data；瀏覽器載入順序', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Math\.random|Date\.now|new Date|performance\.now|nextInt|nextUint32|eval\(|new Function/.test(src), false);
  assert.deepEqual([...src.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]).sort(),
    ['./commands.js', './rules.js', './state.js', './story-data.js', './story.js']);
  const load = (names) => {
    const ctx = vm.createContext({});
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'commands.js', 'engine.js']);
  const B = ctx.SectChronicle.Engine;
  assert.ok(B);
  const r = B.advance(world(), 3);
  assert.equal(r.ok, true);
  assert.equal(hash(r.state), hash(E.advance(world(), 3).state), '瀏覽器載入與 Node 結果相同');
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'engine.js']), /commands\.js/);
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'commands.js', 'engine.js']), /story\.js/);
});

// ---------- 仲裁核心（純函式） ----------

const req = (id, o = {}) => ({ id, discipleId: o.discipleId || `d-${id}`, waited: o.waited || 0, cost: o.cost || {}, seats: o.seats || {}, participants: o.participants || [o.discipleId || `d-${id}`] });

test('arbitrate：兩人搶最後一份材料——等待較久者得、同等待取穩定 ID 小者；失敗者明示原因', () => {
  const supply = { resources: { spiritMaterial: 1 }, seats: {} };
  let r = E.arbitrate({ requests: [req('job-a', { cost: { spiritMaterial: 1 } }), req('job-b', { waited: 2, cost: { spiritMaterial: 1 } })], ...supply });
  assert.deepEqual(r.granted, ['job-b']);
  assert.deepEqual(r.denied.map((d) => [d.id, d.code]), [['job-a', 'insufficient_resource']]);
  assert.deepEqual(r.remaining.resources, { spiritMaterial: 0 });
  r = E.arbitrate({ requests: [req('job-b', { cost: { spiritMaterial: 1 } }), req('job-a', { cost: { spiritMaterial: 1 } })], ...supply });
  assert.deepEqual(r.granted, ['job-a'], '同等待時取穩定 ID 較小者');
  assert.deepEqual(r.denied.map((d) => d.id), ['job-b']);
});

test('arbitrate：一個工作位只給一個人；工作位不足時整批（含材料）一起失敗、不部分扣款', () => {
  const resources = { spiritMaterial: 5 };
  const r = E.arbitrate({
    requests: [req('job-a', { waited: 1, cost: { spiritMaterial: 2 }, seats: { furnace: 1 } }), req('job-b', { cost: { spiritMaterial: 2 }, seats: { furnace: 1 } }), req('job-c', { cost: { spiritMaterial: 1 } })],
    resources, seats: { furnace: 1 },
  });
  assert.deepEqual(r.granted, ['job-a', 'job-c']);
  const b = r.denied.find((d) => d.id === 'job-b');
  assert.equal(b.code, 'no_seat');
  assert.deepEqual(r.remaining, { resources: { spiritMaterial: 2 }, seats: { furnace: 0 } }, 'job-b 沒有扣任何材料');
  // 有材料但缺工作位 / 有工作位但缺材料：都是整批失敗
  const none = E.arbitrate({ requests: [req('x', { cost: { spiritMaterial: 1 }, seats: { furnace: 1 } })], resources: { spiritMaterial: 1 }, seats: { furnace: 0 } });
  assert.deepEqual(none.granted, []);
  assert.deepEqual(none.remaining, { resources: { spiritMaterial: 1 }, seats: { furnace: 0 } });
  const none2 = E.arbitrate({ requests: [req('x', { cost: { spiritMaterial: 2 }, seats: { furnace: 1 } })], resources: { spiritMaterial: 1 }, seats: { furnace: 1 } });
  assert.deepEqual(none2.granted, []);
  assert.deepEqual(none2.remaining, { resources: { spiritMaterial: 1 }, seats: { furnace: 1 } });
});

test('arbitrate：同一參與者不能同時在兩個工作；被拒者不阻擋之後放得下的請求', () => {
  const r = E.arbitrate({
    requests: [req('job-a', { discipleId: 'd1', participants: ['d1', 'helper'] }), req('job-b', { discipleId: 'd2', participants: ['d2', 'helper'] }), req('job-c', { discipleId: 'd3', waited: 0, cost: { spiritMaterial: 1 } })],
    resources: { spiritMaterial: 1 }, seats: {},
  });
  assert.deepEqual(r.granted, ['job-a', 'job-c']);
  assert.deepEqual(r.denied.map((d) => [d.id, d.code]), [['job-b', 'participant_busy']]);
  const big = E.arbitrate({
    requests: [req('job-big', { waited: 5, cost: { spiritMaterial: 5 } }), req('job-small', { cost: { spiritMaterial: 1 } })],
    resources: { spiritMaterial: 2 }, seats: {},
  });
  assert.deepEqual(big.granted, ['job-small']);
  assert.equal(big.denied[0].id, 'job-big');
});

function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}

test('arbitrate：打亂請求順序結果完全相同；不修改輸入（深凍結可用）；不產生負數', () => {
  const requests = [
    req('job-1', { waited: 0, cost: { spiritMaterial: 2 }, seats: { furnace: 1 } }),
    req('job-2', { waited: 3, cost: { spiritMaterial: 2, spiritHerb: 1 } }),
    req('job-3', { waited: 3, cost: { spiritHerb: 2 }, participants: ['d-job-3', 'shared'] }),
    req('job-4', { waited: 1, seats: { furnace: 1 }, participants: ['d-job-4', 'shared'] }),
    req('job-5', { waited: 0, cost: { spiritMaterial: 1 } }),
  ];
  const supply = { resources: { spiritMaterial: 4, spiritHerb: 2 }, seats: { furnace: 1 } };
  const frozen = deepFreeze(clone({ requests, ...supply }));
  const base = E.arbitrate(frozen);
  assert.deepEqual(frozen, clone({ requests, ...supply }));
  for (const k of Object.values(base.remaining.resources)) assert.ok(k >= 0);
  for (const k of Object.values(base.remaining.seats)) assert.ok(k >= 0);
  assert.equal(base.granted.length + base.denied.length, requests.length);
  let n = 0;
  for (const p of permutations(requests)) {
    assert.deepEqual(E.arbitrate({ requests: p, ...supply }), base);
    n += 1;
  }
  assert.equal(n, 120);
});

test('arbitrate：不合法輸入丟 RangeError（重複 ID、負數、非整數、缺欄位）', () => {
  const ok = { requests: [req('a')], resources: {}, seats: {} };
  assert.doesNotThrow(() => E.arbitrate(ok));
  for (const bad of [
    { ...ok, requests: [req('a'), req('a')] },
    { ...ok, requests: [req('a', { cost: { spiritMaterial: -1 } })] },
    { ...ok, requests: [req('a', { cost: { spiritMaterial: 1.5 } })] },
    { ...ok, requests: [req('a', { waited: -1 })] },
    { ...ok, requests: [{ id: 'a', discipleId: 'd', waited: 0, cost: {}, seats: {} }] },
    { ...ok, resources: { spiritMaterial: -1 } },
    { ...ok, seats: { furnace: 1.5 } },
    { ...ok, requests: 'x' },
    null,
  ]) assert.throws(() => E.arbitrate(bad), RangeError);
});

test('settleIntents：被拒的請求轉為明示的休養備案；整批成本不部分扣款、不產生負庫存', () => {
  // 注意：brew 在本版不能透過命令排入，這裡只用合法 fixture 驗證仲裁路徑，不代表煉丹 runtime 已完成。
  const intents = [
    { id: 'slot3:disc-a', discipleId: 'disc-a', action: 'brew', waited: 0, cost: { spiritMaterial: 2 }, seats: {}, participants: ['disc-a'] },
    { id: 'slot3:disc-b', discipleId: 'disc-b', action: 'brew', waited: 1, cost: { spiritMaterial: 2 }, seats: {}, participants: ['disc-b'] },
    { id: 'slot3:disc-c', discipleId: 'disc-c', action: 'cultivate', waited: 0, cost: {}, seats: {}, participants: ['disc-c'] },
  ];
  const r = E.settleIntents(intents, { resources: { spiritMaterial: 3 }, seats: {} });
  const by = (id) => r.settled.find((s) => s.discipleId === id);
  assert.equal(by('disc-b').action, 'brew', '等待較久者得到最後材料');
  assert.equal(by('disc-a').action, 'rest');
  assert.deepEqual(by('disc-a').fallback, { from: 'brew', reason: 'insufficient_resource' });
  assert.equal(by('disc-c').action, 'cultivate');
  assert.equal('fallback' in by('disc-c'), false);
  assert.deepEqual(r.remaining.resources, { spiritMaterial: 1 });
  assert.deepEqual(r.settled.map((s) => s.discipleId), ['disc-a', 'disc-b', 'disc-c'], '輸出順序與輸入順序一致');
  const shuffled = E.settleIntents([...intents].reverse(), { resources: { spiritMaterial: 3 }, seats: {} });
  for (const s of r.settled) {
    const o = shuffled.settled.find((x) => x.discipleId === s.discipleId);
    assert.deepEqual(o, s, '打亂 intent 陣列不改分配');
  }
});

// ---------- 單格結算：行動效果取自 rules.js ----------

test('未排課的格＝明示的野外休養；一格結算：slotIndex／revision +1、不消耗 RNG、輸入不變', () => {
  const w = deepFreeze(world());
  const r = E.advance(w, 1);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.advanced, 1);
  assert.equal(r.stopReason, 'completed');
  const s = r.state;
  assert.equal(s.slotIndex, 1);
  assert.equal(s.revision, 1);
  assert.equal(s.phase, 'planning');
  assert.deepEqual(s.rngState, w.rngState, '本包沒有隨機行動，不消耗 RNG');
  const res = resolvedEvents(s)[0];
  assert.equal(res.slotIndex, 0);
  assert.deepEqual(res.results.map((x) => [x.discipleId, x.action]), [[M, 'rest'], [P, 'rest']]);
  assert.equal(res.results[0].source, 'default');
  assert.deepEqual(State.validateWorld(s), { ok: true });
  assert.deepEqual(C.validateEngineWorld(s), { ok: true });
});

test('採集／修行／調心／休養的結果逐項等於 rules.js 的公式（以結算前快照計算）', () => {
  let w = world('eng-actions');
  const p0 = clone(disc(w, P));
  const m0 = clone(disc(w, M));
  w = send(w, 'a1', 'assignSlot', { discipleId: P, slotIndex: 0, action: 'gather-material' });
  w = send(w, 'a2', 'assignSlot', { discipleId: M, slotIndex: 0, action: 'cultivate' });
  w = step(w).state;
  const gain = Rules.gatherYield({ slotIndex: 0, resource: 'spiritMaterial', craft: p0.attributes.craft, stamina: p0.stamina }).amount;
  assert.equal(w.resources.spiritMaterial, gain);
  assert.equal(disc(w, P).stamina, Rules.applyActionCost('gather-material', p0).stamina);
  const cg = Rules.cultivationGain({ slotIndex: 0, comprehension: m0.attributes.comprehension, stamina: m0.stamina, mind: m0.mind, injury: m0.injury }).gain;
  assert.equal(disc(w, M).cultivation, cg);
  assert.equal(disc(w, M).stamina, Rules.applyActionCost('cultivate', m0).stamina);
  assert.equal(disc(w, M).mind, Rules.applyActionCost('cultivate', m0).mind);
  // 休養與調心（下一格）
  const p1 = clone(disc(w, P));
  const m1 = clone(disc(w, M));
  w = send(w, 'a3', 'assignSlot', { discipleId: P, slotIndex: 1, action: 'rest' });
  w = send(w, 'a4', 'assignSlot', { discipleId: M, slotIndex: 1, action: 'tune-mind' });
  w = step(w).state;
  const rest = Rules.applyRest({ stamina: p1.stamina, mind: p1.mind, injury: p1.injury, rootBone: p1.attributes.rootBone });
  assert.equal(disc(w, P).stamina, rest.stamina);
  assert.equal(disc(w, P).mind, rest.mind);
  assert.equal(disc(w, M).mind, Rules.applyActionCost('tune-mind', m1).mind);
  assert.equal(disc(w, M).stamina, Rules.applyActionCost('tune-mind', m1).stamina);
  for (const d of w.disciples) for (const k of ['stamina', 'mind', 'injury', 'cultivation']) assert.ok(Number.isInteger(d[k]) && d[k] >= 0, `${d.id}.${k}`);
  for (const v of Object.values(w.resources)) assert.ok(Number.isInteger(v) && v >= 0);
  assert.equal(resolvedEvents(w)[1].results.find((x) => x.discipleId === M).action, 'tune-mind');
});

test('範本每日三格重複、單格覆寫優先；覆寫只影響該格', () => {
  let w = world('eng-template');
  w = send(w, 't', 'setDailyTemplate', { discipleId: P, parts: ['gather-material', 'cultivate', 'tune-mind'] });
  w = send(w, 'o', 'assignSlot', { discipleId: P, slotIndex: 4, action: 'rest' });
  w = step(w, 6).state;
  const acts = resolvedEvents(w).map((e) => e.results.find((x) => x.discipleId === P));
  assert.deepEqual(acts.map((a) => a.action), ['gather-material', 'cultivate', 'tune-mind', 'gather-material', 'rest', 'tune-mind']);
  assert.deepEqual(acts.map((a) => a.source), ['template', 'template', 'template', 'template', 'override', 'template']);
});

test('靈草日 4 前鎖定：範本含 gather-herb 時那幾格以明示休養備案，日 4（slot 9）起產出靈草', () => {
  let w = world('eng-herb');
  w = send(w, 't', 'setDailyTemplate', { discipleId: P, parts: ['gather-herb', 'gather-herb', 'gather-herb'] });
  const r = step(w, 9); // 會在 slot 9 求援待選前停（slot 8 結算完 → slotIndex 9）
  w = r.state;
  assert.equal(w.slotIndex, 9);
  assert.equal(w.resources.spiritHerb, 0, '日 1～3 沒有靈草');
  for (const e of resolvedEvents(w)) {
    const a = e.results.find((x) => x.discipleId === P);
    assert.equal(a.action, 'rest');
    assert.deepEqual(a.fallback, { from: 'gather-herb', reason: 'locked' });
  }
  w = send(w, 'later', 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-later' });
  const pre = clone(disc(w, P));
  w = step(w).state; // slot 9
  assert.equal(w.resources.spiritHerb, Rules.gatherYield({ slotIndex: 9, resource: 'spiritHerb', craft: pre.attributes.craft, stamina: pre.stamina }).amount);
  assert.ok(w.resources.spiritHerb > 0);
});

// ---------- 階段邊界、待選停止與 42 格 ----------

test('階段事件與可見階段在 slot 0／9／18／30 的第一格採用；前一格不採用', () => {
  let w = world('eng-phases');
  w = send(w, 't', 'setDailyTemplate', { discipleId: M, parts: ['cultivate', 'cultivate', 'cultivate'] });
  const firstSlot = {};
  const seen = (cur) => {
    for (const e of cur.eventLog) if (e.type === 'story' && !(e.eventId in firstSlot)) firstSlot[e.eventId] = e.slotIndex;
  };
  for (let guard = 0; guard < 60 && w.slotIndex < 42; guard++) {
    const pre = clone(disc(w, M));
    const s = w.slotIndex;
    const r = E.advance(w, 1);
    assert.equal(r.ok, true, JSON.stringify(r));
    w = r.state;
    seen(w);
    // 修行收益使用「這一格」的階段（rules.js 的 phaseAt），不是前一格
    const expected = Rules.cultivationGain({ slotIndex: s, comprehension: pre.attributes.comprehension, stamina: pre.stamina, mind: pre.mind, injury: pre.injury }).gain;
    assert.equal(disc(w, M).cultivation - pre.cultivation, expected, `slot ${s}`);
    if (w.phase === 'awaitingChoice' && w.pendingEvents[0].id === 'evt-village-plea') {
      w = send(w, `c-${s}`, 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-later' });
    }
  }
  assert.deepEqual(firstSlot, { 'evt-phase-faint': 0, 'evt-phase-omen': 9, 'evt-phase-manifest': 18, 'evt-phase-surge': 30 });
  for (const ph of Rules.SPIRIT_PHASES) assert.equal(firstSlot[`evt-phase-${ph.id}`], ph.startSlot);
});

test('slot 8→9 出現求援待選並停止批次；一次推 42 格也不越過；選擇後才能繼續', () => {
  const w0 = world('eng-stop');
  const r = E.advance(w0, 42);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.advanced, 9, '實際推進格數');
  assert.equal(r.stopReason, 'pendingEvent');
  const w = r.state;
  assert.equal(w.slotIndex, 9);
  assert.equal(w.phase, 'awaitingChoice');
  assert.deepEqual(w.pendingEvents, [{ id: 'evt-village-plea', raisedSlotIndex: 9 }]);
  assert.ok(w.story.triggeredEventIds.includes('evt-village-plea'));
  assert.equal(w.story.triggeredEventIds.includes('evt-phase-omen'), false, 'slot 9 尚未結算，日 4 階段事件尚未出現');
  assert.equal(w.revision, 9);
  rejectedAdvance(w, 1, 'awaiting_choice');
  rejectedAdvance(w, 3, 'awaiting_choice');
  // 恰好推到 8 格不會觸發；推到第 9 格才觸發
  const eight = E.advance(w0, 8);
  assert.equal(eight.state.phase, 'planning');
  assert.equal(eight.state.slotIndex, 8);
  assert.equal(eight.stopReason, 'completed');
  assert.equal(E.advance(eight.state, 1).state.phase, 'awaitingChoice');
});

test('slot 41→42：危機待選、不走第 43 格；危機不能由 SG-03 結算；ending 不可推進', () => {
  let w = world('eng-crisis');
  w = step(w, 42).state; // 停在求援
  w = send(w, 'plea', 'chooseEvent', { eventId: 'evt-village-plea', optionId: 'opt-aid-accept' });
  const r = E.advance(w, 42);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.advanced, 33);
  assert.equal(r.stopReason, 'pendingEvent');
  const s = r.state;
  assert.equal(s.slotIndex, 42);
  assert.equal(s.phase, 'awaitingChoice');
  assert.deepEqual(s.pendingEvents.map((e) => e.id), ['evt-beast-crisis']);
  assert.equal(s.story.organisationStatus, 'dojo', '沒有假勝利、沒有寫 ending');
  assert.equal(s.slotIndex <= Rules.MAX_SLOT_INDEX, true);
  rejectedAdvance(s, 1, 'awaiting_choice');
  const choose = C.dispatch(s, { id: 'crisis', expectedRevision: s.revision, type: 'chooseEvent', payload: { eventId: 'evt-beast-crisis', optionId: 'opt-crisis-submit' } });
  assert.equal(choose.ok, false);
  assert.equal(choose.code, 'not_supported_yet');
  // 41 格時 planning，再推一格才到危機
  const at41 = E.advance(w, 32);
  assert.equal(at41.state.slotIndex, 41);
  assert.equal(at41.state.phase, 'planning');
  assert.equal(E.advance(at41.state, 5).advanced, 1, '只能再走一格，之後停在危機');
  // ending 世界不可推進
  const ending = clone(s);
  ending.phase = 'ending';
  ending.pendingEvents = [];
  ending.story.organisationStatus = 'foundingDeferred';
  assert.deepEqual(State.validateWorld(ending), { ok: true });
  rejectedAdvance(ending, 1, 'ended');
});

test('advance 參數錯誤與不合法世界：明確拒絕、世界不變', () => {
  const w = world();
  for (const n of [0, -1, 1.5, 43, '1', null, NaN, Infinity]) rejectedAdvance(w, n, 'bad_slots');
  const bad = clone(w);
  bad.schemaVersion = 1;
  const r = E.advance(bad, 1);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_world');
  assert.equal(E.advance(null, 1).code, 'invalid_world');
  const unsupported = clone(w);
  unsupported.schedule.templates[M] = ['rest', 'build', 'rest'];
  assert.equal(E.advance(unsupported, 1).code, 'invalid_world');
  assert.equal(E.advance(w).ok, true, '省略 slots 等於 1');
  assert.equal(E.advance(w).advanced, 1);
});

test('日報：一天結束時寫日報；三格批次有三筆 slotResolved 與一筆 dayReport', () => {
  const r = step(world('eng-day'), 3);
  assert.equal(r.advanced, 3);
  assert.deepEqual(r.events.map((e) => e.type), ['story', 'slotResolved', 'slotResolved', 'slotResolved', 'dayReport']);
  const rep = r.events[4];
  assert.equal(rep.day, 1);
  assert.equal(rep.slotIndex, 2);
  assert.deepEqual(rep.resources, r.state.resources);
  assert.deepEqual(r.events.map((e) => e.seq), [1, 2, 3, 4, 5]);
  assert.deepEqual(r.state.eventLog, r.events);
  for (const e of r.events.filter((x) => x.type === 'slotResolved')) {
    assert.equal(e.day, Math.floor(e.slotIndex / 3) + 1);
    assert.equal(e.part, e.slotIndex % 3);
  }
});

// ---------- 20 seed × 42 格：單步／三格／整批與回放 ----------

function lcg(seed) {
  let x = 0;
  for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}
const SCHEDULABLE = ['gather-material', 'cultivate', 'rest', 'tune-mind', 'gather-herb'];
function buildScript(seed) {
  const rnd = lcg(seed);
  const pick = () => SCHEDULABLE[Math.floor(rnd() * SCHEDULABLE.length)];
  const script = [];
  for (const id of [M, P]) script.push({ type: 'setDailyTemplate', payload: { discipleId: id, parts: [pick(), pick(), pick()] } });
  for (let i = 0; i < 12; i++) {
    const slotIndex = Math.floor(rnd() * 42);
    const discipleId = rnd() < 0.5 ? M : P;
    const a = pick();
    if (a === 'gather-herb' && slotIndex < 9) continue; // 鎖定中的格由命令層拒絕，不屬於「有效指令序列」
    script.push({ type: 'assignSlot', payload: { discipleId, slotIndex, action: a } });
  }
  return script;
}
function runPath(seed, batch, choiceFor) {
  let w = world(seed);
  buildScript(seed).forEach((c, i) => { w = send(w, `s${i}`, c.type, c.payload); });
  const stops = [];
  let guard = 0;
  while (!(w.slotIndex === 42 && w.phase === 'awaitingChoice')) {
    assert.ok(guard++ < 200, 'guard');
    if (w.phase === 'awaitingChoice') {
      const e = w.pendingEvents[0];
      stops.push([w.slotIndex, e.id]);
      w = send(w, `choose-${e.id}`, 'chooseEvent', { eventId: e.id, optionId: choiceFor(e.id) });
      continue;
    }
    const r = E.advance(w, batch);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(State.validateWorld(r.state), { ok: true });
    w = r.state;
  }
  return { w, stops };
}

test('20 個 seed × 42 格：單步、三格批次、一次整批的 canonical state 相同；遇待選用同一合法選擇後再比較', () => {
  for (let i = 0; i < 20; i++) {
    const seed = `sg03-seed-${String(i).padStart(2, '0')}`;
    const choice = (id) => (id === 'evt-village-plea' ? (i % 2 === 0 ? 'opt-aid-accept' : 'opt-aid-later') : 'x');
    const single = runPath(seed, 1, choice);
    const triple = runPath(seed, 3, choice);
    const whole = runPath(seed, 42, choice);
    assert.equal(single.w.slotIndex, 42, seed);
    assert.equal(single.w.phase, 'awaitingChoice', seed);
    assert.deepEqual(single.w.pendingEvents.map((e) => e.id), ['evt-beast-crisis'], seed);
    assert.deepEqual(single.stops, [[9, 'evt-village-plea']], `${seed}：只有求援會被選擇；危機停在待選`);
    assert.equal(hash(single.w), hash(triple.w), `${seed} 單步 vs 三格`);
    assert.equal(hash(single.w), hash(whole.w), `${seed} 單步 vs 整批`);
    assert.deepEqual(single.w.rngState, world(seed).rngState, `${seed}：本包不消耗 RNG`);
    // 存讀往返
    const back = State.parseState(State.serializeState(single.w));
    assert.equal(back.ok, true);
    assert.equal(hash(back.state), hash(single.w));
    // 沒有負庫存、數值為整數、roster 沒有被增減
    for (const v of Object.values(single.w.resources)) assert.ok(Number.isInteger(v) && v >= 0, seed);
    assert.equal(single.w.disciples.length, 2);
    assert.deepEqual(single.w.story.rescues, []);
    assert.equal(single.w.resources.reputation, 0, '援村提示不發獎');
    // 事件序號與命令序號連續
    single.w.eventLog.forEach((e, k) => assert.equal(e.seq, k + 1));
    // 每格恰好結算一次
    assert.deepEqual(resolvedEvents(single.w).map((e) => e.slotIndex), Array.from({ length: 42 }, (_, k) => k), seed);
  }
});

test('同 seed、同角色設定、同有效指令序列可回放；改 seed 或角色設定後 hash 不同', () => {
  const choice = () => 'opt-aid-later';
  const a = runPath('replay-seed', 3, choice).w;
  const b = runPath('replay-seed', 1, choice).w;
  assert.equal(hash(a), hash(b));
  const other = runPath('replay-seed-2', 3, choice).w;
  assert.notEqual(hash(a), hash(other));
  const opts = { templateId: 'herb-child', allocation: { rootBone: 1, comprehension: 1, craft: 1 }, personality: { risk: 'bold', bond: 'caring' } };
  let w = world('replay-seed', opts);
  buildScript('replay-seed').forEach((c, i) => { w = send(w, `s${i}`, c.type, c.payload); });
  let base = world('replay-seed');
  buildScript('replay-seed').forEach((c, i) => { base = send(base, `s${i}`, c.type, c.payload); });
  assert.notEqual(hash(w), hash(base));
});

test('不同的選擇會產生不同世界（事件選擇是真正的分支，不被跳過）', () => {
  const yes = runPath('branch-seed', 3, () => 'opt-aid-accept').w;
  const no = runPath('branch-seed', 3, () => 'opt-aid-later').w;
  assert.notEqual(hash(yes), hash(no));
  assert.equal(yes.eventLog.some((e) => e.type === 'aidPromptShown'), true);
  assert.equal(no.eventLog.some((e) => e.type === 'aidPromptShown'), false);
});

test('引擎不會產生它不支援的故事事件：可達世界的 facts 不會讓援村完成／結局事件到期', () => {
  const seed = 'reach-seed';
  let w = world(seed);
  while (!(w.slotIndex === 42 && w.phase === 'awaitingChoice')) {
    if (w.phase === 'awaitingChoice') w = send(w, `c-${w.slotIndex}`, 'chooseEvent', { eventId: w.pendingEvents[0].id, optionId: 'opt-aid-later' });
    else w = step(w).state;
    const due = SD.dueEvents(E.factsFor(w));
    for (const id of due) {
      const ev = SD.getEvent(id);
      assert.ok(ev.kind !== 'aidCompletion' && ev.kind !== 'ending' && ev.kind !== 'invitation', `${id} 不應在可達世界到期`);
    }
  }
});

test('援村紀錄與工作／獎勵不一致的世界一律 invalid_world，不被推進（SG-04A 起援村由引擎結算，不再有「發獎未接入」）', () => {
  const w = world('eng-unsupported');
  w.slotIndex = 12;
  w.revision = 12;
  w.story.rescues = [{ id: Rules.AID_ID, completedSlotIndex: 11, rewardClaimed: false }];
  w.story.triggeredEventIds = ['evt-phase-faint', 'evt-phase-omen', 'evt-village-plea'];
  assert.deepEqual(State.validateWorld(w), { ok: true });
  rejectedAdvance(w, 1, 'invalid_world');
});

// ---------- roster ----------

test('學徒從 joinSlotIndex 起才結算；候選與未入隊者永不出現在結算；既有 roster 規則不退化', () => {
  const w = world('eng-roster');
  w.slotIndex = 20;
  w.revision = 20;
  w.story.triggeredEventIds = ['evt-phase-faint', 'evt-phase-omen', 'evt-village-plea', 'evt-phase-manifest'];
  withDoneAid(w, 12);
  withInvitation(w, 'cand-1', 'accepted', 20);
  assert.deepEqual(C.validateEngineWorld(w), { ok: true });
  const s = send(w, 'a', 'assignSlot', { discipleId: 'cand-1', slotIndex: 20, action: 'gather-material' });
  const r = step(s).state;
  const res = resolvedEvents(r)[0];
  assert.equal(res.slotIndex, 20);
  assert.deepEqual(res.results.map((x) => x.discipleId), [M, P, 'cand-1']);
  assert.ok(r.resources.spiritMaterial > 0);
  assert.equal(res.results.some((x) => x.discipleId === 'cand-2'), false);
  // joinSlotIndex 晚於目前格的世界本來就不合法（不會被補發或提前結算）
  const future = clone(w);
  future.disciples[2].joinSlotIndex = 21;
  future.story.invitations['cand-1'].joinSlotIndex = 21;
  assert.equal(E.advance(future, 1).code, 'invalid_world');
  // 之前的格不會被補發：事件紀錄裡沒有 slot 19 的學徒結果
  assert.equal(r.eventLog.filter((e) => e.type === 'slotResolved' && e.slotIndex < 20).length, 0);
});

// ---------- 版本與序列化 ----------

test('引擎推進後的世界可存讀；schema 1 世界被拒絕；版本與 fixture 契約不變', () => {
  const r = step(world('eng-ser'), 3).state;
  const back = State.parseState(State.serializeState(r));
  assert.equal(back.ok, true);
  assert.equal(hash(back.state), hash(r));
  const old = clone(r);
  old.schemaVersion = 1;
  assert.equal(State.parseState(JSON.stringify(old)).code, 'unknown_schema_version');
  assert.equal(E.advance(old, 1).code, 'invalid_world');
  assert.equal(State.SCHEMA_VERSION, 3);
  assert.equal(State.RULE_VERSION, 2);
  assert.equal(State.RNG_VERSION, 1);
});
