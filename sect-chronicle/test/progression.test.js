'use strict';
// SG-05 測試：修為封頂（D7-A）、突破 job（queueBreakthrough／原子預約／一次抽樣）、成功鎖定與失敗重試（D7-B）、
// 滿修為／已提升的修行轉明示休養（D7-C）、版本 3／4 與舊檔拒絕（D7-D）、20 seed × 42 格單步／分段／批次對照。
// 不含 combat、storage、UI；下一境條件未定，這裡沒有第二境。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const Rng = require('../js/rng.js');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const C = require('../js/commands.js');
const E = require('../js/engine.js');
const Progression = require('../js/progression.js');
const { withDoneAid, withInvitation } = require('./helpers.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const M = State.MASTER_ID;
const P = State.PROTAGONIST_ID;
const PILL = 'breakthrough-pill';
const hash = (w) => State.hashWorld(w);
const disc = (w, id) => w.disciples.find((d) => d.id === id);
const cmd = (w, type, payload, id) => ({ id: id || `p-${w.revision}`, expectedRevision: w.revision, type, payload });
const world = (seed = 'bt-seed') => {
  const r = State.newWorld(seed);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
// 修為 100 的合法世界（驗證只要求 ≤100）。
const ready = (seed = 'bt-seed', ids = [P]) => {
  const w = world(seed);
  for (const id of ids) disc(w, id).cultivation = 100;
  return w;
};
const send = (w, type, payload) => {
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const rejected = (w, command, code) => {
  const before = hash(w);
  const r = C.dispatch(w, command);
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  assert.equal(hash(w), before, '拒絕後世界不變（含 RNG、revision、commandLog）');
  return r;
};
const step = (w, n = 1) => {
  const r = E.advance(w, n);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const queue = (w, discipleId, usePill = false, supporterId = null) => send(w, 'queueBreakthrough', { discipleId, usePill, supporterId });
const evs = (w, type) => w.eventLog.filter((e) => e.type === type);
const lastResolved = (w) => [...w.eventLog].reverse().find((e) => e.type === 'slotResolved');
const row = (w, id) => lastResolved(w).results.find((r) => r.discipleId === id);
const firstRoll = (seed) => Rng.nextInt(Rng.create(seed), Progression.ROLL_RANGE).value;
// 確定性找 seed：第一次抽樣讓 chance 成功或失敗。
function seedFor(chanceBp, wantSuccess) {
  for (let i = 0; i < 2000; i += 1) {
    const seed = `bt-${i}`;
    if ((firstRoll(seed) < chanceBp) === wantSuccess) return seed;
  }
  throw new Error('找不到 seed');
}
const valid = (w) => C.validateEngineWorld(w);

// ---------- 版本與 Rules ----------

test('D7-D：ruleVersion 3、schemaVersion 4、rng 1；新局弟子沒有隱形提升', () => {
  assert.equal(Rules.RULE_VERSION, 3);
  assert.equal(State.SCHEMA_VERSION, 4);
  assert.equal(State.RNG_VERSION, 1);
  const w = world();
  assert.deepEqual(w.disciples.map((d) => d.breakthroughs), [0, 0]);
  assert.equal(w.schemaVersion, 4);
  assert.equal(w.ruleVersion, 3);
});

test('D7-A：capCultivationGain 只計剩餘空間，溢出捨棄；既有突破數值沒被改', () => {
  assert.equal(Rules.CULTIVATION_CAP, 100);
  assert.equal(Rules.CULTIVATION_CAP, Rules.BREAKTHROUGH_THRESHOLD);
  assert.deepEqual(Rules.capCultivationGain(0, 14), { applied: 14, overflow: 0 });
  assert.deepEqual(Rules.capCultivationGain(86, 14), { applied: 14, overflow: 0 });
  assert.deepEqual(Rules.capCultivationGain(96, 14), { applied: 4, overflow: 10 });
  assert.deepEqual(Rules.capCultivationGain(99, 1), { applied: 1, overflow: 0 });
  assert.deepEqual(Rules.capCultivationGain(100, 14), { applied: 0, overflow: 14 });
  for (const bad of [[-1, 1], [101, 1], [1.5, 1], [0, -1], [0, 1.5], ['1', 1]]) assert.throws(() => Rules.capCultivationGain(...bad), RangeError);
  assert.equal(Rules.BREAKTHROUGH_CHANCE_CAP_BP, 9500);
  assert.equal(Rules.BREAKTHROUGH_FAIL_KEEP_BP, 7000);
  assert.equal(Rules.BREAKTHROUGH_FAIL_INJURY, 15);
});

// ---------- progression.js 純函式 ----------

test('judge：roll < chance 才成功（邊界）；成功率上限 9500 時仍有 5% 失敗', () => {
  assert.equal(Progression.judge(4999, 5000), 'success');
  assert.equal(Progression.judge(5000, 5000), 'failure');
  assert.equal(Progression.judge(0, 1), 'success');
  assert.equal(Progression.judge(9499, 9500), 'success');
  assert.equal(Progression.judge(9500, 9500), 'failure');
  assert.equal(Progression.judge(9999, 9500), 'failure');
  assert.throws(() => Progression.judge(10000, 5000), RangeError);
  assert.throws(() => Progression.judge(-1, 5000), RangeError);
  assert.throws(() => Progression.judge(1.5, 5000), RangeError);
});

test('sample：用 rng.js 的 nextInt（拒絕抽樣）、不改輸入；resolve 結果與 Rules 分項一致', () => {
  const s0 = Rng.create('sample-seed');
  const frozen = Object.freeze([...s0]);
  const a = Progression.sample(frozen);
  const b = Rng.nextInt(s0, 10000);
  assert.deepEqual(a, { roll: b.value, rngState: b.state });
  assert.deepEqual([...frozen], s0);
  const d = { mind: 60, cultivation: 100, injury: 3 };
  const r = Progression.resolve(d, { pill: true, supporter: true }, s0);
  assert.equal(r.outcome.chanceBp, Rules.breakthroughChance({ mind: 60, pill: true, supporter: true }).chanceBp);
  assert.equal(r.outcome.chanceBp, 9000);
  assert.equal(r.outcome.roll, b.value);
  assert.deepEqual(r.rngState, b.state);
  assert.deepEqual(r.items.map((i) => i.id), ['base', 'supporter', 'pill', 'mind']);
  assert.equal(r.outcome.mindAtStart, 60);
  if (r.outcome.result === 'success') {
    assert.deepEqual([r.outcome.cultivationAfter, r.outcome.injuryAfter], [100, 3]);
  } else {
    assert.deepEqual([r.outcome.cultivationAfter, r.outcome.injuryAfter], [70, 18]);
  }
  // 傷勢夾在上限：失敗只加到 100
  const f = Progression.resolve({ mind: 0, cultivation: 100, injury: 95 }, { pill: false, supporter: false }, Rng.create(seedFor(5000, false)));
  assert.equal(f.outcome.result, 'failure');
  assert.equal(f.outcome.injuryAfter, 100);
  assert.throws(() => Progression.resolve({ mind: 60, cultivation: 99, injury: 0 }, { pill: false, supporter: false }, s0), RangeError);
});

test('progression.js 不用 RNG 以外的熵／eval，只 require rng、rules；載入順序錯誤指出缺的檔', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'progression.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Math\.random|Date\.now|new Date|performance\.now|eval\(|new Function/.test(src), false);
  assert.deepEqual([...src.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]).sort(), ['./rng.js', './rules.js']);
  const load = (names) => {
    const ctx = vm.createContext({});
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'progression.js', 'commands.js', 'engine.js']);
  assert.equal(typeof ctx.SectChronicle.Progression.judge, 'function');
  assert.throws(() => load(['rng.js', 'progression.js']), /rules\.js/);
  assert.throws(() => load(['rules.js', 'progression.js']), /rng\.js/);
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'commands.js', 'engine.js']), /progression\.js/);
});

// ---------- queueBreakthrough ----------

test('queueBreakthrough 只排隊：不推時間、不扣丹、不抽樣、不改修為；重送冪等', () => {
  const w0 = ready();
  w0.inventory[PILL] = 1;
  const command = cmd(w0, 'queueBreakthrough', { discipleId: P, usePill: true, supporterId: M }, 'q-1');
  const r = C.dispatch(w0, command);
  assert.equal(r.ok, true, JSON.stringify(r));
  const w = r.state;
  assert.equal(w.slotIndex, 0);
  assert.deepEqual(w.rngState, w0.rngState);
  assert.equal(w.inventory[PILL], 1);
  assert.equal(disc(w, P).cultivation, 100);
  assert.equal(w.jobs.length, 1);
  assert.deepEqual(w.jobs[0], {
    id: 'job-0001', kind: 'breakthrough', discipleId: P, status: 'queued', queuedSlotIndex: 0, waited: 0, startSlotIndex: null,
    slotsDone: 0, completedSlotIndex: null, cancelledSlotIndex: null, target: { usePill: true, supporterId: M }, outcome: null,
  });
  assert.equal(r.events[0].type, 'jobQueued');
  assert.equal(r.events[0].kind, 'breakthrough');
  const again = C.dispatch(w, command);
  assert.equal(again.duplicate, true);
  assert.equal(hash(again.state), hash(w));
  assert.equal(valid(w).ok, true);
  // 取消排隊：沒有任何東西被扣
  const c = send(w, 'cancelQueuedJob', { jobId: 'job-0001' });
  assert.equal(c.jobs[0].status, 'cancelled');
  assert.equal(c.inventory[PILL], 1);
});

test('queueBreakthrough 拒絕：payload、階段、成員、自己支援、未滿 100、已成功、同人重複排隊；拒絕不動世界', () => {
  const w = ready('bt-rej');
  const q = (payload, wd = w) => cmd(wd, 'queueBreakthrough', payload);
  rejected(w, q({ discipleId: P, usePill: false }), 'bad_payload');
  rejected(w, q({ discipleId: P, usePill: 'no', supporterId: null }), 'bad_payload');
  rejected(w, q({ discipleId: P, usePill: false, supporterId: 5 }), 'bad_payload');
  rejected(w, q({ discipleId: 7, usePill: false, supporterId: null }), 'bad_payload');
  rejected(w, q({ discipleId: P, usePill: false, supporterId: null, extra: 1 }), 'bad_payload');
  rejected(w, q({ discipleId: 'cand-1', usePill: false, supporterId: null }), 'candidate_not_member');
  rejected(w, q({ discipleId: 'nobody', usePill: false, supporterId: null }), 'unknown_disciple');
  rejected(w, q({ discipleId: P, usePill: false, supporterId: 'cand-1' }), 'candidate_not_member');
  rejected(w, q({ discipleId: P, usePill: false, supporterId: 'nobody' }), 'unknown_disciple');
  rejected(w, q({ discipleId: P, usePill: false, supporterId: P }), 'self_support');
  rejected(w, q({ discipleId: M, usePill: false, supporterId: null }), 'not_ready'); // 師父修為 0
  const awaiting = step(w, 9).state; // 第 9 格求援待選：phase 不是 planning
  assert.equal(awaiting.phase, 'awaitingChoice');
  rejected(awaiting, q({ discipleId: P, usePill: false, supporterId: null }, awaiting), 'not_planning');
  const queued = queue(w, P);
  rejected(queued, q({ discipleId: P, usePill: true, supporterId: M }, queued), 'breakthrough_pending');
  const d = disc(w, P);
  d.cultivation = 99;
  rejected(w, q({ discipleId: P, usePill: false, supporterId: null }, w), 'not_ready');
  d.cultivation = 100;
  // 已成功的人不可再排
  let done = ready(seedFor(5500, true));
  done = queue(done, P);
  done = step(done).state;
  assert.equal(disc(done, P).breakthroughs, 1);
  rejected(done, cmd(done, 'queueBreakthrough', { discipleId: P, usePill: false, supporterId: null }), 'already_breakthrough');
});

test('breakthrough／support 不能排進課表（use_job_command）；queueBreakthrough 已列入支援命令', () => {
  const w = world();
  for (const action of ['breakthrough', 'support']) {
    rejected(w, cmd(w, 'assignSlot', { discipleId: P, slotIndex: 0, action }), 'use_job_command');
    rejected(w, cmd(w, 'setDailyTemplate', { discipleId: P, parts: [action, 'rest', 'rest'] }), 'use_job_command');
  }
  assert.ok(C.SUPPORTED_COMMANDS.includes('queueBreakthrough'));
  assert.deepEqual(Object.keys(C.DEFERRED_COMMANDS), ['setDefense']);
  assert.deepEqual(C.DEFERRED_ACTIONS, {});
  assert.equal(C.JOB_ACTIONS.breakthrough, 'queueBreakthrough');
  assert.equal(C.JOB_ACTIONS.support, 'queueBreakthrough');
});

// ---------- 開工、抽樣、結果 ----------

test('單人突破成功：占一格、修為保留 100、記一次提升、恰好一次抽樣、事件完整', () => {
  const seed = seedFor(5500, true);
  const w0 = queue(ready(seed), P);
  const before = disc(w0, P);
  const r = step(w0);
  const w = r.state;
  const d = disc(w, P);
  assert.equal(d.breakthroughs, 1);
  assert.equal(d.cultivation, 100);
  assert.equal(d.stamina, before.stamina - 20);
  assert.equal(d.mind, before.mind - 5);
  assert.equal(d.injury, before.injury);
  const j = w.jobs[0];
  assert.equal(j.status, 'done');
  assert.equal(j.slotsDone, 1);
  assert.equal(j.startSlotIndex, 0);
  assert.equal(j.completedSlotIndex, 0);
  assert.deepEqual(j.outcome, {
    result: 'success', mindAtStart: 60, chanceBp: 5500, roll: firstRoll(seed), cultivationBefore: 100, cultivationAfter: 100, injuryBefore: 0, injuryAfter: 0,
  });
  assert.deepEqual(w.rngState, Rng.nextInt(Rng.create(seed), 10000).state);
  assert.deepEqual(w.reservations, []);
  const types = r.events.map((e) => e.type);
  assert.deepEqual(types.filter((t) => ['jobStarted', 'breakthroughResolved', 'jobCompleted'].includes(t)), ['jobStarted', 'breakthroughResolved', 'jobCompleted']);
  const ev = evs(w, 'breakthroughResolved')[0];
  assert.equal(ev.result, 'success');
  assert.equal(ev.jobId, 'job-0001');
  assert.equal(ev.supporterId, null);
  assert.equal(ev.pill, false);
  assert.equal(ev.roll, firstRoll(seed));
  assert.deepEqual(ev.items, [{ id: 'base', bp: 5000 }, { id: 'mind', bp: 500 }]);
  assert.equal(row(w, P).action, 'breakthrough');
  assert.equal(row(w, P).job.phase, 'completed');
  assert.equal(row(w, M).action, 'rest'); // 另一人照課表（預設休養）
  assert.equal(valid(w).ok, true);
  // 成功後不再增修為：再推進整天仍是 100，且 breakthroughs 不變
  const later = step(w, 6).state;
  assert.equal(disc(later, P).cultivation, 100);
  assert.equal(disc(later, P).breakthroughs, 1);
  assert.equal(later.jobs.length, 1);
});

test('單人突破失敗：100→70、傷勢 +15、不提升；可免費恢復並再修到 100 後重試', () => {
  const seed = seedFor(5500, false);
  let w = queue(ready(seed), P);
  w = step(w).state;
  const d = disc(w, P);
  assert.equal(d.breakthroughs, 0);
  assert.equal(d.cultivation, 70);
  assert.equal(d.injury, 15);
  assert.equal(w.jobs[0].outcome.result, 'failure');
  assert.equal(w.jobs[0].outcome.cultivationAfter, 70);
  assert.equal(w.jobs[0].outcome.injuryAfter, 15);
  assert.equal(evs(w, 'breakthroughResolved')[0].result, 'failure');
  assert.equal(valid(w).ok, true);
  rejected(w, cmd(w, 'queueBreakthrough', { discipleId: P, usePill: false, supporterId: null }), 'not_ready');
  // 修為再到 100（合法狀態）後可以再排第二次；第二個 job 有自己的 ID 與一次抽樣
  disc(w, P).cultivation = 100;
  w = queue(w, P);
  assert.equal(w.jobs.length, 2);
  const rng1 = clone(w.rngState);
  w = step(w).state;
  assert.equal(w.jobs[1].id, 'job-0002');
  assert.deepEqual(w.rngState, Rng.nextInt(rng1, 10000).state);
  assert.equal(valid(w).ok, true);
  // 傷勢 +15 受上限 100 夾住
  const hurt = ready(seed);
  disc(hurt, P).injury = 95;
  const hw = step(queue(hurt, P)).state;
  assert.equal(disc(hw, P).injury, 100);
  assert.equal(hw.jobs[0].outcome.injuryAfter, 100);
});

test('丹與支援：恰好一丹扣到 0 仍有加成；支援者占自己的一格（不兼工作）並扣 10 體力', () => {
  const seed = seedFor(9000, true);
  const w0 = ready(seed);
  w0.inventory[PILL] = 1;
  // 師父排了採集：支援時被占用，採集不發生
  let w = send(w0, 'assignSlot', { discipleId: M, slotIndex: 0, action: 'gather-material' });
  w = queue(w, P, true, M);
  const m0 = clone(disc(w, M));
  const r = step(w);
  w = r.state;
  assert.equal(w.inventory[PILL], 0);
  assert.equal(w.jobs[0].outcome.chanceBp, 9000);
  assert.equal(w.resources.spiritMaterial, 0);
  assert.equal(disc(w, M).stamina, m0.stamina - 10);
  assert.equal(disc(w, M).mind, m0.mind);
  assert.equal(row(w, M).action, 'support');
  assert.equal(row(w, M).job.id, 'job-0001');
  assert.equal(row(w, P).action, 'breakthrough');
  const started = evs(w, 'jobStarted')[0];
  assert.deepEqual(started.paid, { [PILL]: 1 });
  const ev = evs(w, 'breakthroughResolved')[0];
  assert.equal(ev.supporterId, M);
  assert.equal(ev.pill, true);
  assert.deepEqual(ev.items.map((i) => i.id), ['base', 'supporter', 'pill', 'mind']);
  assert.equal(valid(w).ok, true);
});

test('機率讀格初心境（扣行動心境前）：59 無加成、60 有加成', () => {
  const seed = seedFor(5000, true);
  for (const [mind, expected] of [[59, 5000], [60, 5500], [100, 5500]]) {
    const w = ready(seed);
    disc(w, P).mind = mind;
    const out = step(queue(w, P)).state.jobs[0].outcome;
    assert.equal(out.chanceBp, expected, `mind ${mind}`);
    assert.equal(out.mindAtStart, mind);
  }
});

test('同丹競爭：id 小者得丹，落選者不扣丹、不抽樣、轉明示休養並記 waited', () => {
  const w0 = ready('bt-comp', [M, P]);
  w0.inventory[PILL] = 1;
  let w = queue(w0, M, true, null); // job-0001
  w = queue(w, P, true, null); // job-0002
  const r = step(w);
  w = r.state;
  assert.equal(w.inventory[PILL], 0);
  assert.equal(w.jobs[0].status, 'done');
  assert.equal(w.jobs[0].outcome.chanceBp, 7500);
  assert.equal(w.jobs[1].status, 'queued');
  assert.equal(w.jobs[1].waited, 1);
  assert.equal(w.jobs[1].outcome, null);
  assert.deepEqual(w.rngState, Rng.nextInt(Rng.create('bt-comp'), 10000).state); // 恰好一次抽樣
  const denied = lastResolved(w).denied;
  assert.deepEqual(denied.map((d) => [d.jobId, d.code]), [['job-0002', 'insufficient_resource']]);
  assert.equal(row(w, P).action, 'rest');
  assert.deepEqual(row(w, P).fallback, { from: 'breakthrough', reason: 'insufficient_resource', jobId: 'job-0002' });
  assert.equal(valid(w).ok, true);
  // 次格：沒丹但仍想用丹 → 繼續落選（不部分扣費）；取消後世界一致
  const w2 = step(w).state;
  assert.equal(w2.jobs[1].waited, 2);
  assert.equal(w2.inventory[PILL], 0);
  assert.equal(w2.jobs[1].status, 'queued');
});

test('同格兩個突破：依 job ID 穩定順序各抽一次；同人支援衝突整批落選', () => {
  const seed = 'bt-two';
  let w = queue(ready(seed, [M, P]), M); // job-0001
  w = queue(w, P); // job-0002
  const s1 = Rng.nextInt(Rng.create(seed), 10000);
  const s2 = Rng.nextInt(s1.state, 10000);
  const done = step(w).state;
  assert.equal(done.jobs[0].outcome.roll, s1.value);
  assert.equal(done.jobs[1].outcome.roll, s2.value);
  assert.deepEqual(done.rngState, s2.state);
  // 同一個支援者被兩個突破要：先到者得，後者整批落選（participant_busy），不抽樣
  let c = ready('bt-sup', [M, P]);
  c = queue(c, M, false, P); // job-0001：師父突破、主角支援
  c = queue(c, P, false, null); // job-0002：主角自己突破（與支援衝突）
  const cr = step(c).state;
  assert.equal(cr.jobs[0].status, 'done');
  assert.equal(cr.jobs[1].status, 'queued');
  assert.deepEqual(lastResolved(cr).denied.map((d) => d.code), ['participant_busy']);
  assert.deepEqual(cr.rngState, Rng.nextInt(Rng.create('bt-sup'), 10000).state);
  assert.equal(row(cr, P).action, 'support');
});

test('進行中的預約占住本人或支援者：突破整批落選且不扣丹／不抽樣', () => {
  let w = ready('bt-busy', [P]);
  w.resources.spiritMaterial = 20;
  w.inventory[PILL] = 1;
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: 't-0-1' });
  w = queue(w, P, true, M);
  const rng0 = clone(w.rngState);
  w = step(w).state; // 師父開工建造（多格），突破請求與其參與者衝突
  assert.equal(w.jobs[1].status, 'queued');
  w = step(w).state; // 第二格：師父有進行中預約 → 支援者忙碌
  assert.equal(w.jobs[1].status, 'queued');
  assert.equal(w.jobs[1].waited, 2);
  assert.equal(w.inventory[PILL], 1);
  assert.deepEqual(w.rngState, rng0);
  assert.deepEqual(lastResolved(w).denied.map((d) => d.code), ['participant_busy']);
  assert.equal(valid(w).ok, true);
});

// ---------- D7-A 封頂與 D7-C 明示休養 ----------

test('D7-A：修為 96 的修行只增到 100，溢出記錄，仍付一格正常修行成本', () => {
  let w = world('bt-cap');
  disc(w, P).cultivation = 96;
  const d0 = clone(disc(w, P));
  const raw = Rules.cultivationGain({ slotIndex: 0, comprehension: d0.attributes.comprehension, stamina: d0.stamina, mind: d0.mind, injury: d0.injury }).gain;
  assert.ok(raw > 4, `原始收益 ${raw} 必須大於剩餘空間才有意義`);
  w = send(w, 'assignSlot', { discipleId: P, slotIndex: 0, action: 'cultivate' });
  w = step(w).state;
  const d = disc(w, P);
  assert.equal(d.cultivation, 100);
  const cost = Rules.applyActionCost('cultivate', d0);
  assert.equal(d.stamina, cost.stamina);
  assert.equal(d.mind, cost.mind);
  const rw = row(w, P);
  assert.equal(rw.action, 'cultivate');
  assert.equal(rw.delta.cultivation, 4);
  assert.equal(rw.cultivationOverflow, raw - 4);
  assert.equal(rw.fallback, undefined);
  assert.equal(w.jobs.length, 0); // 同格不免費突破
  // 沒有溢出時不帶欄位
  let w2 = world('bt-cap2');
  w2 = send(w2, 'assignSlot', { discipleId: P, slotIndex: 0, action: 'cultivate' });
  assert.equal('cultivationOverflow' in row(step(w2).state, P), false);
});

test('D7-C：格初已滿 100 的修行轉明示休養（不扣修行成本、不加修為、不改課表）', () => {
  let w = ready('bt-full');
  const d0 = clone(disc(w, P));
  w = send(w, 'setDailyTemplate', { discipleId: P, parts: ['cultivate', 'cultivate', 'cultivate'] });
  const templates = clone(w.schedule);
  w = step(w).state;
  const d = disc(w, P);
  const rw = row(w, P);
  assert.equal(rw.action, 'rest');
  assert.deepEqual(rw.fallback, { from: 'cultivate', reason: 'cultivation_full' });
  assert.equal(d.cultivation, 100);
  const rested = Rules.applyRest({ stamina: d0.stamina, mind: d0.mind, injury: d0.injury, rootBone: d0.attributes.rootBone });
  assert.deepEqual([d.stamina, d.mind, d.injury], [rested.stamina, rested.mind, rested.injury]);
  assert.deepEqual(w.schedule, templates);
  assert.deepEqual(w.rngState, world('bt-full').rngState);
});

test('D7-C：成功提升後的修行轉明示休養，原因是 breakthrough_done', () => {
  let w = queue(ready(seedFor(5500, true)), P);
  w = step(w).state;
  assert.equal(disc(w, P).breakthroughs, 1);
  w = send(w, 'assignSlot', { discipleId: P, slotIndex: 1, action: 'cultivate' });
  w = step(w).state;
  assert.deepEqual(row(w, P).fallback, { from: 'cultivate', reason: 'breakthrough_done' });
  assert.equal(disc(w, P).cultivation, 100);
});

// ---------- 驗證不變式與版本拒絕 ----------

test('驗證：修為 >100、提升次數與狀態矛盾一律拒絕', () => {
  const w = world();
  const bad = (mut) => {
    const x = clone(w);
    mut(x);
    assert.equal(valid(x).ok, false);
  };
  bad((x) => { disc(x, P).cultivation = 101; });
  bad((x) => { disc(x, P).breakthroughs = 2; });
  bad((x) => { disc(x, P).breakthroughs = -1; });
  bad((x) => { disc(x, P).breakthroughs = '1'; });
  bad((x) => { delete disc(x, P).breakthroughs; });
  bad((x) => { disc(x, P).breakthroughs = 1; }); // 沒有成功 job、修為 0
  bad((x) => { disc(x, P).breakthroughs = 1; disc(x, P).cultivation = 100; }); // 有 100 但沒有成功 job：不能用 100 猜境界
  assert.equal(valid(w).ok, true);
});

function resolved(seed, success) {
  const w0 = queue(ready(seed), P, false, M);
  const w = step(w0).state;
  assert.equal(w.jobs[0].outcome.result, success ? 'success' : 'failure');
  assert.equal(valid(w).ok, true);
  return w;
}

test('State 層結構驗證（不經 engine 層）：提升次數範圍、已提升者修為保留 100、突破 job 不可是進行中', () => {
  const w = world();
  const bad = (mut) => {
    const x = clone(w);
    mut(x);
    assert.equal(State.validateWorld(x).ok, false);
  };
  bad((x) => { disc(x, P).breakthroughs = 2; });
  bad((x) => { disc(x, P).breakthroughs = 1; });
  bad((x) => { disc(x, P).cultivation = 101; });
  const done = resolved(seedFor(5500, true), true);
  assert.equal(State.validateWorld(done).ok, true);
  const x = clone(done);
  x.jobs[0].status = 'active';
  x.jobs[0].completedSlotIndex = null;
  x.reservations = [{ jobId: 'job-0001', discipleId: P, seat: null, startSlotIndex: 0, slotsTotal: 1, paid: {}, output: null }];
  assert.equal(State.validateWorld(x).ok, false);
});

test('驗證：job outcome 必須能由 rules 重算，成功 job 與 breakthroughs 必須一致', () => {
  const ok = resolved(seedFor(6500, true), true);
  const fail = resolved(seedFor(6500, false), false);
  const bad = (w, mut) => {
    const x = clone(w);
    mut(x);
    assert.equal(valid(x).ok, false);
  };
  bad(ok, (x) => { x.jobs[0].outcome.chanceBp += 1; });
  bad(ok, (x) => { x.jobs[0].outcome.result = 'failure'; });
  bad(ok, (x) => { x.jobs[0].outcome.roll = 9999; });
  bad(ok, (x) => { x.jobs[0].outcome.roll = 10000; });
  bad(ok, (x) => { x.jobs[0].outcome.cultivationAfter = 70; });
  bad(ok, (x) => { x.jobs[0].outcome.mindAtStart = 10; });
  bad(ok, (x) => { x.jobs[0].outcome.mindAtStart = 101; });
  bad(ok, (x) => { x.jobs[0].outcome.cultivationBefore = 99; });
  bad(ok, (x) => { x.jobs[0].outcome.cultivationBefore = 101; });
  bad(ok, (x) => { x.jobs[0].outcome.injuryBefore = 101; });
  bad(ok, (x) => { x.jobs[0].outcome.injuryAfter = 15; });
  bad(ok, (x) => { delete x.jobs[0].outcome.roll; });
  bad(ok, (x) => { x.jobs[0].outcome = null; });
  bad(ok, (x) => { disc(x, P).breakthroughs = 0; });
  bad(fail, (x) => { x.jobs[0].outcome.cultivationAfter = 100; });
  bad(fail, (x) => { x.jobs[0].outcome.injuryAfter = 3; });
  bad(fail, (x) => { x.jobs[0].outcome.result = 'success'; });
  bad(fail, (x) => { disc(x, P).breakthroughs = 1; });
  // 兩個成功 job：同一人不可兩次成功提升
  bad(ok, (x) => { x.jobs.push({ ...clone(x.jobs[0]), id: 'job-0002', queuedSlotIndex: 1, startSlotIndex: 1, completedSlotIndex: 1 }); x.slotIndex = 2; });
  // target／outcome 形狀
  bad(ok, (x) => { x.jobs[0].target.supporterId = x.jobs[0].discipleId; });
  bad(ok, (x) => { x.jobs[0].target.supporterId = 'ghost'; });
  bad(ok, (x) => { x.jobs[0].target.usePill = 'yes'; });
  bad(ok, (x) => { delete x.jobs[0].outcome; });
  // 非突破 job 不得帶 outcome
  const w = world();
  w.resources.spiritMaterial = 20;
  const built = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: 't-0-1' });
  bad(built, (x) => { x.jobs[0].outcome = null; });
  // 排隊中的突破：本人必須 100 且未成功；同人至多一個排隊中
  const q = queue(ready('bt-inv'), P);
  bad(q, (x) => { disc(x, P).cultivation = 99; });
  bad(q, (x) => { x.jobs.push({ ...clone(x.jobs[0]), id: 'job-0002' }); });
  bad(q, (x) => { x.jobs[0].outcome = { result: 'success' }; });
  assert.equal(valid(q).ok, true);
});

test('D7-D：schema3／rule2 與更舊檔明確拒絕、輸入不變、不遷移不截斷；歷史 golden 沒被動過', () => {
  const dir = path.join(__dirname, 'fixtures');
  const old = JSON.parse(fs.readFileSync(path.join(dir, 'new-world.schema3-rule2.json'), 'utf8'));
  assert.equal(old.schemaVersion, 3);
  assert.equal(old.ruleVersion, 2);
  for (const c of old.cases) {
    const w = JSON.parse(c.canonical);
    const before = State.canonicalize(w);
    const v = State.validateWorld(w);
    assert.equal(v.ok, false);
    assert.equal(v.code, 'unknown_schema_version');
    assert.equal(State.canonicalize(w), before);
    assert.equal(C.dispatch(w, cmd(w, 'queueBreakthrough', { discipleId: P, usePill: false, supporterId: null })).code, 'invalid_world');
    assert.equal(E.advance(w, 1).code, 'invalid_world');
    assert.equal(State.hashWorld(w), c.hash);
  }
  // 舊世界即使修為 ≤100、只把 schema 改成 4：仍因 rule 2 與缺欄位被拒絕，不補值
  const w = JSON.parse(old.cases[0].canonical);
  w.schemaVersion = 4;
  assert.equal(State.validateWorld(w).code, 'unknown_rule_version');
  w.ruleVersion = 3;
  assert.equal(State.validateWorld(w).ok, false);
  // 舊的 >100 修為在新版本也不能被截斷接受
  const over = world();
  disc(over, P).cultivation = 150;
  assert.equal(valid(over).ok, false);
  // 當前 golden 以新版本重產，hash 與 State 一致
  const cur = JSON.parse(fs.readFileSync(path.join(dir, 'new-world.json'), 'utf8'));
  assert.equal(cur.schemaVersion, 4);
  assert.equal(cur.ruleVersion, 3);
  for (const c of cur.cases) assert.equal(State.hashWorld(JSON.parse(c.canonical)), c.hash);
});

// ---------- 20 seed × 42 格：單步／3 格／批次對照 ----------

const SEEDS = Array.from({ length: 20 }, (_, i) => `sg-bt-${String(i).padStart(3, '0')}`);

// 依 seed 決定：初始修為（100／96）、丹數（0／1／2）、是否找支援者；修為滿且未成功就排突破。
function planFor(seedIndex) {
  return { protagonistStart: seedIndex % 2 === 0 ? 100 : 96, pills: seedIndex % 3, support: seedIndex % 4 < 2, masterStart: seedIndex % 5 < 3 ? 100 : 0, lazy: seedIndex % 3 === 1 };
}
function decide(w, plan) {
  const out = [];
  let pills = w.inventory[PILL];
  for (const id of [M, P]) {
    const d = disc(w, id);
    if (d.breakthroughs !== 0 || d.cultivation !== 100 || w.slotIndex >= 41) continue;
    if (plan.lazy && w.slotIndex % 2 === 0) continue; // 慢一格才排：滿 100 的修行意圖會轉明示休養
    if (w.jobs.some((j) => j.kind === 'breakthrough' && j.status === 'queued' && j.discipleId === id)) continue;
    const usePill = pills > 0;
    if (usePill) pills -= 1;
    out.push({ discipleId: id, usePill, supporterId: plan.support ? (id === M ? P : M) : null });
  }
  return out;
}
function startWorld(seed, plan) {
  let w = world(seed);
  disc(w, P).cultivation = plan.protagonistStart;
  disc(w, M).cultivation = plan.masterStart;
  w.inventory[PILL] = plan.pills;
  for (const id of [M, P]) w = send(w, 'setDailyTemplate', { discipleId: id, parts: ['cultivate', 'cultivate', 'cultivate'] });
  return w;
}
// 單步執行並記錄命令（依序）；之後以不同分段重放。待選事件一律選「稍後再說」（只有村口求援會出現；危機待選在第 42 格停止）。
function runSingle(seed, plan) {
  let w = startWorld(seed, plan);
  const log = [];
  const apply = (type, payload) => {
    log.push({ slotIndex: w.slotIndex, type, payload });
    w = send(w, type, payload);
  };
  while (w.slotIndex < 42) {
    if (w.phase === 'awaitingChoice') {
      for (const pe of w.pendingEvents) {
        assert.equal(pe.id, 'evt-village-plea', `${seed} 非預期的待選事件 ${pe.id}`);
        apply('chooseEvent', { eventId: pe.id, optionId: 'opt-aid-later' });
      }
      continue;
    }
    for (const payload of decide(w, plan)) apply('queueBreakthrough', payload);
    w = step(w).state;
    assert.equal(valid(w).ok, true, `${seed}@${w.slotIndex}`);
    for (const d of w.disciples) assert.ok(d.cultivation <= 100);
  }
  return { w, log };
}
function replay(seed, plan, log, chunk) {
  let w = startWorld(seed, plan);
  const cuts = [...new Set(log.map((l) => l.slotIndex))];
  let li = 0;
  while (w.slotIndex < 42) {
    while (li < log.length && log[li].slotIndex === w.slotIndex) { w = send(w, log[li].type, log[li].payload); li += 1; }
    const nextCut = cuts.find((c) => c > w.slotIndex);
    const n = Math.min(chunk, (nextCut === undefined ? 42 : nextCut) - w.slotIndex);
    w = step(w, n).state;
  }
  assert.equal(li, log.length);
  return w;
}

test('20 seed × 42 格：封頂、成功鎖定、失敗重試；單步＝3 格＝批次；抽樣次數＝開工突破數；存讀無損', () => {
  let successes = 0;
  let failures = 0;
  let pillsUsed = 0;
  let supported = 0;
  let overflowRows = 0;
  const blocked = new Set();
  SEEDS.forEach((seed, i) => {
    const plan = planFor(i);
    const { w, log } = runSingle(seed, plan);
    assert.equal(w.slotIndex, 42, seed);
    const bt = w.jobs.filter((j) => j.kind === 'breakthrough' && j.status === 'done');
    // 每個真正開工的突破恰好一次抽樣，依 job ID 順序
    let rs = Rng.create(seed);
    for (const j of bt) {
      const s = Rng.nextInt(rs, 10000);
      assert.equal(j.outcome.roll, s.value, `${seed} ${j.id}`);
      rs = s.state;
    }
    assert.deepEqual(w.rngState, rs, seed);
    for (const id of [M, P]) {
      const mine = bt.filter((j) => j.discipleId === id);
      const wins = mine.filter((j) => j.outcome.result === 'success');
      assert.ok(wins.length <= 1, `${seed} ${id}`);
      assert.equal(disc(w, id).breakthroughs, wins.length);
      if (wins.length) assert.equal(disc(w, id).cultivation, 100);
    }
    for (const j of bt) {
      if (j.outcome.result === 'success') successes += 1; else failures += 1;
      if (j.target.usePill) pillsUsed += 1;
      if (j.target.supporterId) supported += 1;
    }
    assert.equal(w.inventory[PILL], plan.pills - bt.filter((j) => j.target.usePill).length, seed);
    for (const e of w.eventLog) {
      if (e.type !== 'slotResolved') continue;
      for (const r of e.results) {
        if (r.cultivationOverflow) overflowRows += 1;
        if (r.fallback && r.fallback.from === 'cultivate') blocked.add(r.fallback.reason);
      }
    }
    // 分段對照
    const a = replay(seed, plan, log, 3);
    const b = replay(seed, plan, log, 42);
    assert.equal(hash(a), hash(w), `${seed} 3 格`);
    assert.equal(hash(b), hash(w), `${seed} 批次`);
    assert.deepEqual(a.rngState, w.rngState);
    assert.deepEqual(b.rngState, w.rngState);
    // 存讀無損並可續算（第 42 格後 phase 為 awaitingChoice 或 planning 皆可序列化）
    const loaded = JSON.parse(JSON.stringify(w));
    assert.equal(hash(loaded), hash(w));
    assert.equal(valid(loaded).ok, true);
  });
  assert.ok(successes > 0 && failures > 0, `成功 ${successes}／失敗 ${failures} 都必須出現`);
  assert.ok(pillsUsed > 0 && supported > 0 && overflowRows > 0, `丹 ${pillsUsed}／支援 ${supported}／溢出 ${overflowRows}`);
  assert.deepEqual([...blocked].sort(), ['breakthrough_done', 'cultivation_full']);
});

// ---------- 審查修正 R1／R2（PR #97 review） ----------

test('R1：突破結果提交後 advance 批次停在下一格（成功與失敗都一樣），不越過結果', () => {
  for (const wantSuccess of [true, false]) {
    const seed = seedFor(5500, wantSuccess);
    for (const batch of [1, 3, 42]) {
      const w0 = queue(ready(seed), P);
      const r = step(w0, batch);
      assert.equal(r.advanced, 1, `${wantSuccess}/${batch}`);
      assert.equal(r.stopReason, 'breakthroughResolved');
      assert.equal(r.state.slotIndex, 1);
      assert.equal(r.state.phase, 'planning');
      assert.equal(r.state.jobs[0].outcome.result, wantSuccess ? 'success' : 'failure');
      assert.equal(evs(r.state, 'breakthroughResolved').length, 1);
      assert.equal(valid(r.state).ok, true);
      // 玩家可在停點調整；再推進不會重複停（沒有新的突破結果）
      const more = step(r.state, 2);
      assert.equal(more.advanced, 2);
      assert.equal(more.stopReason, 'completed');
    }
  }
});

test('R1：同格兩個突破一起原子提交後只停一次；落選（沒丹）的突破不算結果、不停止', () => {
  const seed = seedFor(5500, true);
  let w = ready(seed, [M, P]);
  w = queue(w, M, false, null);
  w = queue(w, P, false, null);
  const r = step(w, 3);
  assert.equal(r.advanced, 1);
  assert.equal(r.stopReason, 'breakthroughResolved');
  assert.equal(r.state.jobs.filter((j) => j.kind === 'breakthrough' && j.status === 'done').length, 2);
  assert.equal(evs(r.state, 'breakthroughResolved').length, 2);

  const denied = queue(ready(seed), P, true, null); // 沒有丹：開工仲裁落選，沒有結果
  assert.equal(denied.inventory[PILL], 0);
  const d = step(denied, 3);
  assert.equal(d.advanced, 3);
  assert.equal(d.stopReason, 'completed');
  assert.equal(evs(d.state, 'breakthroughResolved').length, 0);
});

test('R1：待選事件優先於突破停止原因；結果仍已完整提交', () => {
  // 先找出不排突破時第一個待選事件所在的格
  let probe = ready('r1-pe');
  for (const id of [M, P]) probe = send(probe, 'setDailyTemplate', { discipleId: id, parts: ['rest', 'rest', 'rest'] });
  const pe = step(probe, 42);
  assert.equal(pe.stopReason, 'pendingEvent');
  const lastSlot = pe.state.slotIndex - 1;
  let w = probe;
  if (lastSlot > 0) w = step(w, lastSlot).state;
  assert.equal(w.slotIndex, lastSlot);
  disc(w, P).cultivation = 100;
  w = queue(w, P);
  const r = step(w, 3);
  assert.equal(r.advanced, 1);
  assert.equal(r.stopReason, 'pendingEvent');
  assert.equal(r.state.phase, 'awaitingChoice');
  assert.equal(evs(r.state, 'breakthroughResolved').length, 1);
  assert.equal(r.state.jobs[0].status, 'done');
  assert.equal(valid(r.state).ok, true);
});

// 讓 P 的突破帶支援者 cand-1：先正式排隊並讓它保持 queued（沒丹落選），或正式完成；之後把 cand-1 以指定 joinSlotIndex 放進隊伍。
function supporterWorld(joinSlotIndex, { done }) {
  const seed = seedFor(5500, true);
  let w = ready(seed);
  w = queue(w, P, !done, M); // done:false → 要丹但沒丹，永遠 queued
  w = step(w, done ? 1 : 2).state;
  w = withDoneAid(w, 0, 'free', M); // 邀請進度需要已完成的援村紀錄（援村人選與突破無關）
  w = withInvitation(w, 'cand-1', 'accepted', joinSlotIndex);
  return w;
}
const tamperSupporter = (w) => {
  const x = clone(w);
  x.jobs[0].target.supporterId = 'cand-1';
  return x;
};
const roundTrips = (w) => {
  try { return State.parseState(State.serializeState(w)).ok; } catch (e) { return false; } // serialize 對不合法世界會直接丟錯＝拒絕
};

test('R2：支援者入隊格晚於突破排隊格一律拒絕（queued、done；State、engine、存讀三層）', () => {
  for (const done of [true, false]) {
    const late = tamperSupporter(supporterWorld(done ? 1 : 2, { done }));
    assert.equal(late.jobs[0].status, done ? 'done' : 'queued');
    assert.ok(late.jobs[0].queuedSlotIndex < disc(late, 'cand-1').joinSlotIndex);
    assert.equal(State.validateWorld(late).ok, false, `State done=${done}`);
    assert.equal(valid(late).ok, false, `engine done=${done}`);
    assert.equal(roundTrips(late), false, `parse done=${done}`);
    // 對照：同一世界、支援者入隊格不晚於排隊格（0）→ 接受
    const ok = tamperSupporter(supporterWorld(0, { done }));
    assert.equal(State.validateWorld(ok).ok, true, `control State done=${done}`);
    assert.equal(valid(ok).ok, true, `control engine done=${done}`);
    assert.equal(roundTrips(ok), true);
  }
});

test('R2：合法入隊當格就能支援（排隊格＝入隊格）；邊界前一格不行', () => {
  let w = ready(seedFor(5500, true));
  w = step(w, 2).state;                     // 第 2 格開始
  w = withDoneAid(w, 1, 'free', M);
  w = withInvitation(w, 'cand-1', 'accepted', 2);
  const q = queue(w, P, false, 'cand-1');   // 排隊格 2 ＝ 入隊格 2
  assert.equal(valid(q).ok, true);
  assert.equal(roundTrips(q), true);
  const r = step(q, 1);
  assert.equal(r.state.jobs.find((j) => j.kind === 'breakthrough').status, 'done');
  assert.equal(valid(r.state).ok, true);
  assert.equal(roundTrips(r.state), true);
  const early = clone(q);
  disc(early, 'cand-1').joinSlotIndex = 2;
  early.story.invitations['cand-1'].joinSlotIndex = 2;
  early.jobs.find((j) => j.kind === 'breakthrough').queuedSlotIndex = 1; // 排隊格早一格（仍不早於前一個 job）
  assert.equal(State.validateWorld(early).ok, false);
});

test('存讀不重抽、不重升：中途存檔重載後續算與不中斷一致', () => {
  const seed = seedFor(5500, false);
  let w = queue(ready(seed), P);
  w = step(w).state;
  const saved = JSON.parse(JSON.stringify(w));
  const a = step(w, 5).state;
  const b = step(saved, 5).state;
  assert.equal(hash(a), hash(b));
  assert.deepEqual(a.rngState, w.rngState); // 沒有新的開工突破 → RNG 不動
});

test('smoke CLI：突破路線可跑、可重現、輸出機器可讀摘要；--breakthrough 參數驗證', () => {
  const smoke = path.join(__dirname, '..', 'tools', 'smoke.js');
  const run = (...args) => cp.spawnSync(process.execPath, [smoke, ...args], { encoding: 'utf8' });
  const a = run('--seed', 'sg-dev-000', '--breakthrough', 'pill-support');
  assert.equal(a.status, 0, a.stderr);
  const out = JSON.parse(a.stdout);
  assert.equal(out.strategy, 'breakthrough-v1');
  assert.deepEqual(out.versions, { schema: 4, rule: 3, rng: 1 });
  assert.ok(out.breakthrough.attempts >= 1);
  assert.equal(out.breakthrough.mode, 'pill-support');
  assert.equal(out.breakthrough.list.length, out.breakthrough.attempts);
  assert.equal(a.stdout, run('--seed', 'sg-dev-000', '--breakthrough', 'pill-support').stdout);
  assert.equal(run('--seed', 'sg-dev-000', '--breakthrough', 'maybe').status, 2);
  const none = run('--seed', 'sg-dev-000');
  assert.equal(none.status, 0, none.stderr);
  assert.equal(JSON.parse(none.stdout).breakthrough, undefined); // 沒帶旗標：首爐丹路線，不排突破
});
