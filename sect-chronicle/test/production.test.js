'use strict';
// SG-04 生產測試：地圖／工程／預約／丹藥庫存／持久輪候的資料契約、queueBuild／queueCraft／cancelQueuedJob、
// 原子預約與成本只扣一次、完工次格可用、設施真實倍率、重送與存讀一致、20 seed × 42 格、smoke CLI。
// 只證明「兩人零材料 → 建丹房 → 首爐丹 → 第 42 格危機待選」的核心生產路徑；援村發獎／招募（SG-04A）、
// 突破（SG-05）、危機結算與 ending（SG-06）、storage／UI 都不在這裡，也不宣稱已驗。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const C = require('../js/commands.js');
const E = require('../js/engine.js');
const Smoke = require('../tools/smoke.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const M = State.MASTER_ID;
const P = State.PROTAGONIST_ID;
const hash = (w) => State.hashWorld(w);
const world = (seed = 'prod-seed', opts) => {
  const r = State.newWorld(seed, 'slice-14', opts);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const disc = (w, id) => w.disciples.find((d) => d.id === id);
let idCounter = 0;
const cmd = (w, type, payload, id) => ({ id: id || `t-${(idCounter += 1)}`, expectedRevision: w.revision, type, payload });
const send = (w, type, payload) => {
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const step = (w, n = 1) => {
  const r = E.advance(w, n);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const rejected = (w, command, code) => {
  const frozen = deepFreeze(clone(w));
  const before = hash(frozen);
  const r = C.dispatch(frozen, command);
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  assert.equal(typeof r.reason, 'string');
  assert.equal(hash(frozen), before, '拒絕後世界不變（含 RNG、revision、commandLog）');
  return r;
};
const setAction = (w, id, slot, action) => send(w, 'assignSlot', { discipleId: id, slotIndex: slot, action });
const lastResolved = (w) => [...w.eventLog].reverse().find((e) => e.type === 'slotResolved');
const evs = (w, type) => w.eventLog.filter((e) => e.type === type);
const result = (w, id) => lastResolved(w).results.find((r) => r.discipleId === id);
const sumDelta = (w, key) => evs(w, 'slotResolved').reduce((s, e) => s + e.results.reduce((t, r) => t + r.delta[key], 0), 0);
const ALCH = 'alchemyRoom';
const bestTile = (w, type) => {
  let best = null;
  for (const t of w.tiles) {
    const e = Rules.evaluateFacilityPlacement(w.tiles, t.id, type);
    if (e.ok && (!best || e.multiplierBp > best.bp)) best = { id: t.id, bp: e.multiplierBp };
  }
  return best;
};

// 兩人各採靈材 n 格（逐格排課＋推進）
function gather(w, n, resource = 'gather-material') {
  let cur = w;
  for (let i = 0; i < n; i += 1) {
    cur = setAction(cur, M, cur.slotIndex, resource);
    cur = setAction(cur, P, cur.slotIndex, resource);
    cur = step(cur).state;
  }
  return cur;
}
// 兩格採集後有 14 靈材（第 2 格起可開工丹房）
const WITH_MATERIAL = () => gather(world(), 2);
const queueAlchemy = (w, who = M, tile) => send(w, 'queueBuild', { discipleId: who, facilityType: ALCH, tileId: tile || bestTile(w, ALCH).id });

// ---------- 資料契約 ----------

test('新局：固定 25 格地圖、空 inventory／jobs／reservations；schema 4、rule 3、rng 1', () => {
  const w = world();
  assert.equal(w.schemaVersion, 4);
  assert.equal(State.SCHEMA_VERSION, 4);
  assert.equal(w.ruleVersion, 3);
  assert.equal(w.rngVersion, 1);
  assert.deepEqual(w.tiles, Rules.initialTiles());
  assert.equal(w.tiles.length, 25);
  assert.deepEqual(w.inventory, { 'breakthrough-pill': 0 });
  assert.deepEqual(w.jobs, []);
  assert.deepEqual(w.reservations, []);
  assert.deepEqual(Object.keys(w.inventory), Object.keys(Rules.RECIPES));
});

test('schema 2 存檔（SG-03 歷史 golden）被明確拒絕，輸入不變；與 schema 4 的差異只有 ruleVersion、schemaVersion、disciples.breakthroughs、tiles、inventory、seatWaits、schedule.templateTiles', () => {
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.schema2-rule2.json'), 'utf8'));
  const cur = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8'));
  assert.equal(old.schemaVersion, 2);
  assert.equal(cur.schemaVersion, 4);
  assert.equal(old.cases.length, cur.cases.length);
  for (let i = 0; i < old.cases.length; i += 1) {
    const a = JSON.parse(old.cases[i].canonical);
    const b = JSON.parse(cur.cases[i].canonical);
    const before = JSON.stringify(a);
    const r = State.parseState(old.cases[i].canonical);
    assert.equal(r.ok, false);
    assert.equal(r.code, 'unknown_schema_version');
    assert.equal(JSON.stringify(a), before);
    assert.notEqual(old.cases[i].hash, cur.cases[i].hash);
    assert.deepEqual(old.cases[i].rngState, cur.cases[i].rngState, 'rngState 不變');
    a.schemaVersion = 4;
    a.ruleVersion = 3;
    for (const d of a.disciples) d.breakthroughs = 0;
    a.tiles = Rules.initialTiles();
    a.inventory = { 'breakthrough-pill': 0 };
    a.schedule.templateTiles = {};
    a.seatWaits = [];
    assert.deepEqual(b, a, `${cur.cases[i].name}：除 ruleVersion、schemaVersion、breakthroughs、tiles、inventory、seatWaits、schedule.templateTiles 外完全相同`);
  }
});

// 取得一個含「已完工丹房＋進行中煉丹」的真實世界（走公開 API）
const rich = (() => {
  let cached = null;
  return () => {
    if (!cached) {
      const run = Smoke.runStrategy({ seed: 'rich-seed' });
      assert.equal(run.ok, true, JSON.stringify(run.summary));
      // 找第一個「煉丹進行中」的世界
      const w = run.states.find((s) => s.jobs.some((j) => j.kind === 'craft' && j.status === 'active'));
      assert.ok(w, '策略應產生進行中的煉丹');
      cached = w;
    }
    return clone(cached);
  };
})();

test('rich 世界本身合法，且 reservations 與 active job 一一對應', () => {
  const w = rich();
  assert.deepEqual(State.validateWorld(w), { ok: true });
  assert.equal(w.reservations.length, 1);
  assert.equal(w.reservations[0].jobId, w.jobs.find((j) => j.status === 'active').id);
  const back = State.parseState(State.serializeState(w));
  assert.equal(back.ok, true);
  assert.equal(hash(back.state), hash(w));
});

test('state validator：壞 tiles／inventory／jobs／reservations 逐項被拒絕且指出 code', () => {
  const cases = [
    ['tiles 少一格', (w) => { w.tiles.pop(); }, 'bad_value'],
    ['tiles 五行被改', (w) => { w.tiles[0].element = 'metal'; }, 'bad_value'],
    ['tiles 地形被改', (w) => { w.tiles[12].terrain = 'material'; }, 'bad_value'],
    ['inventory 缺鍵', (w) => { delete w.inventory['breakthrough-pill']; }, 'bad_value'],
    ['inventory 多鍵', (w) => { w.inventory.extra = 1; }, 'bad_value'],
    ['inventory 負數', (w) => { w.inventory['breakthrough-pill'] = -1; }, 'bad_value'],
    ['inventory 小數', (w) => { w.inventory['breakthrough-pill'] = 1.5; }, 'non_integer'],
    ['job 多餘欄位', (w) => { w.jobs[0].extra = 1; }, 'bad_value'],
    ['job id 不連號', (w) => { w.jobs[0].id = 'job-0009'; }, 'inconsistent_jobs'],
    ['job kind 未知', (w) => { w.jobs[0].kind = 'demolish'; }, 'bad_value'],
    ['job status 未知', (w) => { w.jobs[0].status = 'paused'; }, 'bad_value'],
    ['job 角色不在隊', (w) => { w.jobs[0].discipleId = 'cand-1'; }, 'inconsistent_jobs'],
    ['build 地塊是資源點', (w) => { w.jobs[0].target.tileId = 't-0-0'; }, 'inconsistent_jobs'],
    ['build 設施未知', (w) => { w.jobs[0].target.facilityType = 'tower'; }, 'bad_value'],
    ['craft 引用的工程不存在', (w) => { w.jobs[1].target.facilityJobId = 'job-0099'; }, 'inconsistent_jobs'],
    ['craft 引用非丹房', (w) => { w.jobs[1].target.facilityJobId = 'job-0002'; w.jobs[1].target.recipeId = 'breakthrough-pill'; }, 'inconsistent_jobs'],
    ['craft 配方未知', (w) => { w.jobs[1].target.recipeId = 'elixir'; }, 'bad_value'],
    ['active job slotsDone 與進度不符', (w) => { w.jobs[1].slotsDone = 0; }, 'inconsistent_jobs'],
    ['job 排隊格早於前一個 job', (w) => { w.jobs[1].queuedSlotIndex = 0; w.jobs[1].waited = 0; }, 'inconsistent_jobs'],
    ['waited 超過經過格數', (w) => { w.jobs[0].waited = 99; }, 'inconsistent_jobs'],
    ['煉丹開工不晚於丹房完工', (w) => { w.jobs[1].startSlotIndex = w.jobs[0].completedSlotIndex; w.reservations[0].startSlotIndex = w.jobs[0].completedSlotIndex; }, 'inconsistent_jobs'],
    ['丹房完工格＝煉丹開工格（其餘進度都一致，只有丹房整體晚一格）', (w) => { const d = w.jobs[1].startSlotIndex - w.jobs[0].completedSlotIndex; w.jobs[0].startSlotIndex += d; w.jobs[0].completedSlotIndex += d; }, 'inconsistent_jobs'],
    ['done 的 completedSlotIndex 錯', (w) => { w.jobs[0].completedSlotIndex += 1; }, 'inconsistent_jobs'],
    ['active 卻缺 reservation', (w) => { w.reservations = []; }, 'inconsistent_jobs'],
    ['reservation 多出一筆', (w) => { w.reservations.push(clone(w.reservations[0])); }, 'inconsistent_jobs'],
    ['reservation 成本不符', (w) => { w.reservations[0].paid.spiritHerb = 1; }, 'inconsistent_jobs'],
    ['reservation 產出被改', (w) => { w.reservations[0].output.amount += 1; }, 'inconsistent_jobs'],
    ['reservation 倍率被改', (w) => { w.reservations[0].output.multiplierBp = 10000; }, 'inconsistent_jobs'],
    ['reservation 工作位被改', (w) => { w.reservations[0].seat = 'facility:job-0002'; }, 'inconsistent_jobs'],
    ['reservation 角色與 job 不同', (w) => { w.reservations[0].discipleId = w.reservations[0].discipleId === P ? M : P; }, 'inconsistent_jobs'],
    ['reservation 欄位多餘', (w) => { w.reservations[0].extra = 1; }, 'bad_value'],
  ];
  for (const [name, mutate, code] of cases) {
    const w = rich();
    mutate(w);
    const r = State.validateWorld(w);
    assert.equal(r.ok, false, name);
    assert.equal(r.code, code, `${name}：${JSON.stringify(r)}`);
  }
});

test('state validator：設施上限、同地塊、同人兩個 active job、設施工作位超限都被拒絕', () => {
  // 兩座丹房（超過 maxCount=1）
  let w = WITH_MATERIAL();
  w = queueAlchemy(w, M, 't-0-1');
  const dup = clone(w);
  dup.jobs.push({
    id: 'job-0002', kind: 'build', discipleId: P, status: 'queued', queuedSlotIndex: dup.slotIndex, waited: 0,
    startSlotIndex: null, slotsDone: 0, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { facilityType: ALCH, tileId: 't-1-1' },
  });
  assert.equal(State.validateWorld(dup).code, 'inconsistent_jobs', '設施上限（含排隊）');
  const same = clone(w);
  same.jobs.push({
    id: 'job-0002', kind: 'build', discipleId: P, status: 'queued', queuedSlotIndex: same.slotIndex, waited: 0,
    startSlotIndex: null, slotsDone: 0, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { facilityType: 'spiritTerrace', tileId: 't-0-1' },
  });
  assert.equal(State.validateWorld(same).code, 'inconsistent_jobs', '同地塊互斥（含排隊）');
  // 同一人兩個 active job
  const r = rich();
  r.jobs.push({
    id: 'job-0003', kind: 'build', discipleId: r.jobs[1].discipleId, status: 'active', queuedSlotIndex: 0, waited: 0,
    startSlotIndex: r.jobs[1].startSlotIndex, slotsDone: 1, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { facilityType: 'residence', tileId: 't-3-0' },
  });
  assert.equal(State.validateWorld(r).ok, false);
});

test('state validator：每人至多一個 active job、設施工作位上限、job 編號連號——各自單獨成立的壞資料', () => {
  const R = Rules;
  // 其餘欄位全部自洽，只有「同一人兩個 active job」不成立
  const a = rich();
  const crafter = a.jobs[1].discipleId;
  const extra = {
    id: 'job-0003', kind: 'build', discipleId: crafter, status: 'active', queuedSlotIndex: a.jobs[1].queuedSlotIndex, waited: 0,
    startSlotIndex: a.jobs[1].startSlotIndex, slotsDone: a.jobs[1].slotsDone, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { facilityType: 'residence', tileId: 't-3-0' },
  };
  a.jobs.push(extra);
  a.reservations.push({
    jobId: 'job-0003', discipleId: crafter, seat: null, startSlotIndex: extra.startSlotIndex,
    slotsTotal: State.jobDuration(extra), paid: State.jobCost(extra), output: null,
  });
  const ra = State.validateWorld(a);
  assert.equal(ra.ok, false);
  assert.match(ra.reason || JSON.stringify(ra), /同時有多個進行中/);

  // 其餘自洽，只有「丹房工作位 1 被兩位煉丹者占用」不成立
  const b = rich();
  const other = b.jobs[1].discipleId === P ? M : P;
  const worker = b.disciples.find((d) => d.id === other);
  const mult = R.evaluateFacilityPlacement(b.tiles, b.jobs[0].target.tileId, 'alchemyRoom').multiplierBp;
  const craft2 = {
    id: 'job-0003', kind: 'craft', discipleId: other, status: 'active', queuedSlotIndex: b.jobs[1].queuedSlotIndex, waited: 0,
    startSlotIndex: b.jobs[1].startSlotIndex, slotsDone: b.jobs[1].slotsDone, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' },
  };
  b.jobs.push(craft2);
  b.reservations.push({
    jobId: 'job-0003', discipleId: other, seat: 'facility:job-0001', startSlotIndex: craft2.startSlotIndex,
    slotsTotal: State.jobDuration(craft2), paid: State.jobCost(craft2),
    output: {
      itemId: 'breakthrough-pill', craft: worker.attributes.craft, staminaAtStart: 50, multiplierBp: mult,
      amount: R.brewOutput({ recipeId: 'breakthrough-pill', craft: worker.attributes.craft, stamina: 50, tileMultiplierBp: mult }).amount,
    },
  });
  const rb = State.validateWorld(b);
  assert.equal(rb.ok, false);
  assert.match(rb.reason || JSON.stringify(rb), /工作位超過/);

  // 只有編號不連號
  const c = WITH_MATERIAL();
  const qc = queueAlchemy(c, M, 't-0-1');
  assert.equal(State.validateWorld(qc).ok, true);
  qc.jobs[0].id = 'job-0002';
  const rc = State.validateWorld(qc);
  assert.equal(rc.ok, false);
  assert.match(rc.reason || JSON.stringify(rc), /依序編號/);

  // 只有「蓋在資源點上」不成立
  const d = queueAlchemy(WITH_MATERIAL(), M, 't-0-1');
  d.jobs[0].target.tileId = 't-0-0';
  const rd = State.validateWorld(d);
  assert.equal(rd.ok, false);
  assert.match(rd.reason || JSON.stringify(rd), /地塊|建造|buildable|可建/);
});

// ---------- 命令：queueBuild／queueCraft／cancelQueuedJob ----------

test('queueBuild 成功：只排隊，不推時間、不扣材料、不發成果；revision +1、commandLog 與 jobQueued 事件', () => {
  const w = WITH_MATERIAL();
  const r = C.dispatch(w, cmd(w, 'queueBuild', { discipleId: M, facilityType: ALCH, tileId: 't-0-1' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  const n = r.state;
  assert.equal(n.revision, w.revision + 1);
  assert.equal(n.slotIndex, w.slotIndex);
  assert.deepEqual(n.resources, w.resources);
  assert.deepEqual(n.reservations, []);
  assert.equal(n.jobs.length, 1);
  assert.deepEqual(n.jobs[0], {
    id: 'job-0001', kind: 'build', discipleId: M, status: 'queued', queuedSlotIndex: w.slotIndex, waited: 0,
    startSlotIndex: null, slotsDone: 0, completedSlotIndex: null, cancelledSlotIndex: null,
    target: { facilityType: ALCH, tileId: 't-0-1' },
  });
  assert.equal(r.events[0].type, 'jobQueued');
  assert.equal(r.events[0].jobId, 'job-0001');
  assert.deepEqual(n.rngState, w.rngState);
  assert.equal(n.commandLog[n.commandLog.length - 1].type, 'queueBuild');
});

test('queueBuild 拒絕：壞 payload、非 planning、角色、設施／地塊、資源點、設施上限、同地塊（世界不變）', () => {
  const w = WITH_MATERIAL();
  const ok = { discipleId: M, facilityType: ALCH, tileId: 't-0-1' };
  rejected(w, cmd(w, 'queueBuild', { discipleId: M, facilityType: ALCH }), 'bad_payload');
  rejected(w, cmd(w, 'queueBuild', { ...ok, extra: 1 }), 'bad_payload');
  rejected(w, cmd(w, 'queueBuild', { ...ok, discipleId: 5 }), 'bad_payload');
  rejected(w, cmd(w, 'queueBuild', { ...ok, discipleId: 'cand-1' }), 'candidate_not_member');
  rejected(w, cmd(w, 'queueBuild', { ...ok, discipleId: 'nobody' }), 'unknown_disciple');
  rejected(w, cmd(w, 'queueBuild', { ...ok, facilityType: 'tower' }), 'unknown_facility');
  rejected(w, cmd(w, 'queueBuild', { ...ok, tileId: 't-9-9' }), 'unknown_tile');
  rejected(w, cmd(w, 'queueBuild', { ...ok, tileId: 't-0-0' }), 'not_buildable');
  rejected(w, cmd(w, 'queueBuild', { ...ok, tileId: 't-2-0' }), 'not_buildable');
  const pend = clone(w);
  pend.phase = 'awaitingChoice';
  pend.pendingEvents = [{ id: 'evt-village-plea', raisedSlotIndex: pend.slotIndex }];
  pend.story.triggeredEventIds.push('evt-village-plea');
  assert.deepEqual(C.validateEngineWorld(pend), { ok: true });
  rejected(pend, cmd(pend, 'queueBuild', ok), 'not_planning');
  const q = queueAlchemy(w, M, 't-0-1');
  rejected(q, cmd(q, 'queueBuild', { discipleId: P, facilityType: ALCH, tileId: 't-1-1' }), 'facility_limit');
  rejected(q, cmd(q, 'queueBuild', { discipleId: P, facilityType: 'spiritTerrace', tileId: 't-0-1' }), 'tile_occupied');
  const c = send(q, 'cancelQueuedJob', { jobId: 'job-0001' });
  const again = send(c, 'queueBuild', { discipleId: P, facilityType: ALCH, tileId: 't-1-1' });
  assert.equal(again.jobs[1].id, 'job-0002', '取消後可重排，ID 不重用');
});

test('queueCraft：成功與拒絕（recipe／工程／取消的丹房）；可先排在施工中的丹房', () => {
  let w = queueAlchemy(WITH_MATERIAL(), M, 't-0-1');
  const ok = { discipleId: P, recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' };
  rejected(w, cmd(w, 'queueCraft', { discipleId: P, recipeId: 'breakthrough-pill' }), 'bad_payload');
  rejected(w, cmd(w, 'queueCraft', { ...ok, recipeId: 'elixir' }), 'unknown_recipe');
  rejected(w, cmd(w, 'queueCraft', { ...ok, facilityJobId: 'job-0009' }), 'unknown_job');
  rejected(w, cmd(w, 'queueCraft', { ...ok, discipleId: 'cand-2' }), 'candidate_not_member');
  const terrace = send(w, 'queueBuild', { discipleId: P, facilityType: 'spiritTerrace', tileId: bestTile(w, 'spiritTerrace').id });
  rejected(terrace, cmd(terrace, 'queueCraft', { ...ok, facilityJobId: 'job-0002' }), 'wrong_facility');
  const r = C.dispatch(w, cmd(w, 'queueCraft', ok));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.state.jobs[1].kind, 'craft');
  assert.equal(r.state.jobs[1].status, 'queued');
  assert.deepEqual(r.state.jobs[1].target, { recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' });
  assert.deepEqual(r.state.resources, w.resources, '排隊不扣材料');
  assert.equal(r.events[0].type, 'jobQueued');
  w = send(r.state, 'cancelQueuedJob', { jobId: 'job-0001' });
  rejected(w, cmd(w, 'queueCraft', { ...ok, discipleId: M }), 'facility_cancelled');
});

test('cancelQueuedJob：未開始可取消（不扣費）；已開始／已完成／已取消／未知都拒絕且世界不變', () => {
  let w = queueAlchemy(WITH_MATERIAL(), M, 't-0-1');
  rejected(w, cmd(w, 'cancelQueuedJob', { jobId: 'job-0009' }), 'unknown_job');
  rejected(w, cmd(w, 'cancelQueuedJob', {}), 'bad_payload');
  rejected(w, cmd(w, 'cancelQueuedJob', { jobId: 'job-0001', extra: 1 }), 'bad_payload');
  const mat = w.resources.spiritMaterial;
  const c = C.dispatch(w, cmd(w, 'cancelQueuedJob', { jobId: 'job-0001' }));
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.state.jobs[0].status, 'cancelled');
  assert.equal(c.state.jobs[0].cancelledSlotIndex, w.slotIndex);
  assert.equal(c.state.resources.spiritMaterial, mat, '開始前取消不扣費也不退款');
  assert.equal(c.events[0].type, 'jobCancelled');
  rejected(c.state, cmd(c.state, 'cancelQueuedJob', { jobId: 'job-0001' }), 'job_not_queued');
  // 開工後不可取消
  const started = step(w).state;
  assert.equal(started.jobs[0].status, 'active');
  rejected(started, cmd(started, 'cancelQueuedJob', { jobId: 'job-0001' }), 'job_not_queued');
  // 完工後不可取消，也不拆建築
  const done = step(started, 2).state;
  assert.equal(done.jobs[0].status, 'done');
  rejected(done, cmd(done, 'cancelQueuedJob', { jobId: 'job-0001' }), 'job_not_queued');
});

test('build／brew 不可排入課表：use_job_command；基礎行動不受影響', () => {
  const w = world();
  rejected(w, cmd(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: 'build' }), 'use_job_command');
  rejected(w, cmd(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: 'brew' }), 'use_job_command');
  rejected(w, cmd(w, 'setDailyTemplate', { discipleId: M, parts: ['build', 'rest', 'rest'] }), 'use_job_command');
  rejected(w, cmd(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: 'aid' }), 'use_job_command'); // SG-04A：援村也是 job（queueAid）
  for (const a of ['breakthrough', 'support']) {
    rejected(w, cmd(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: a }), 'use_job_command'); // SG-05：由 queueBreakthrough 驅動
  }
  for (const a of ['gather-material', 'cultivate', 'rest', 'tune-mind']) {
    assert.equal(C.dispatch(w, cmd(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: a })).ok, true, a);
  }
  assert.deepEqual([...C.SUPPORTED_COMMANDS].sort(), ['acceptCandidate', 'assignSlot', 'cancelQueuedJob', 'chooseEvent', 'queueAid', 'queueBreakthrough', 'queueBuild', 'queueCraft', 'setDailyTemplate']);
  for (const t of ['setDefense']) {
    rejected(w, cmd(w, t, {}), 'not_supported_yet');
  }
});

test('重送／過期 revision／同 id 異 payload：新命令不重排、不重扣；不倒退較新世界', () => {
  const w = WITH_MATERIAL();
  const command = cmd(w, 'queueBuild', { discipleId: M, facilityType: ALCH, tileId: 't-0-1' }, 'same-id');
  const r1 = C.dispatch(w, command);
  assert.equal(r1.ok, true);
  const again = C.dispatch(r1.state, command);
  assert.equal(again.ok, true);
  assert.equal(again.duplicate, true);
  assert.equal(hash(again.state), hash(r1.state));
  assert.equal(again.state.jobs.length, 1);
  assert.equal(again.events[0].type, 'jobQueued');
  // 世界較新後重送：不倒退、不重排
  const later = step(r1.state, 3).state;
  const resend = C.dispatch(later, command);
  assert.equal(resend.ok, true);
  assert.equal(resend.duplicate, true);
  assert.equal(hash(resend.state), hash(later));
  assert.equal(resend.state.jobs.length, 1);
  assert.equal(resend.state.jobs[0].status, 'done', '回傳的是目前較新的世界');
  // 同 id 不同 payload
  rejected(later, { ...command, payload: { discipleId: P, facilityType: ALCH, tileId: 't-0-1' } }, 'command_id_conflict');
  // 過期／超前 revision
  rejected(r1.state, cmd(w, 'cancelQueuedJob', { jobId: 'job-0001' }), 'stale_revision');
  rejected(r1.state, { ...cmd(r1.state, 'cancelQueuedJob', { jobId: 'job-0001' }), expectedRevision: r1.state.revision + 5 }, 'revision_ahead');
  // 取消的重送也不重複
  const cancelCmd = cmd(r1.state, 'cancelQueuedJob', { jobId: 'job-0001' }, 'cancel-1');
  const c1 = C.dispatch(r1.state, cancelCmd);
  const c2 = C.dispatch(c1.state, cancelCmd);
  assert.equal(c2.duplicate, true);
  assert.equal(hash(c2.state), hash(c1.state));
  // queueCraft 重送
  const qb = send(WITH_MATERIAL(), 'queueBuild', { discipleId: M, facilityType: ALCH, tileId: 't-0-1' });
  const cc = cmd(qb, 'queueCraft', { discipleId: P, recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' }, 'craft-1');
  const q1 = C.dispatch(qb, cc);
  assert.equal(C.dispatch(q1.state, cc).state.jobs.length, 2);
});

// ---------- 引擎：建造時序、原子預約、成本只扣一次 ----------

test('建造：開工扣一次成本、占人連續工期格、每格消耗體力；完工格無使用收益，次格才可用', () => {
  const w0 = WITH_MATERIAL();
  const fac = Rules.FACILITIES[ALCH];
  const mat0 = w0.resources.spiritMaterial;
  assert.equal(w0.slotIndex, 2);
  let w = queueAlchemy(w0, M, 't-0-1');
  const events = [];
  const startStamina = disc(w, M).stamina;
  const trace = [];
  for (let i = 0; i < fac.durationSlots; i += 1) {
    w = setAction(w, P, w.slotIndex, 'gather-material');
    w = setAction(w, M, w.slotIndex, 'rest'); // 課表想休養：被 reservation 忽略
    const r = step(w);
    events.push(...r.events);
    w = r.state;
    trace.push(JSON.parse(JSON.stringify(result(w, M))));
  }
  const started = events.filter((e) => e.type === 'jobStarted');
  assert.equal(started.length, 1, '開工事件只有一次');
  assert.equal(started[0].slotIndex, 2);
  assert.deepEqual(started[0].paid, fac.cost);
  const gained = sumDelta(w, 'spiritMaterial') - sumDelta(w0, 'spiritMaterial');
  assert.equal(w.resources.spiritMaterial, mat0 - fac.cost.spiritMaterial + gained, '成本只扣一次，其餘是採集');
  assert.ok(trace.every((t) => t.action === 'build' && t.source === 'job' && t.job.id === 'job-0001'));
  assert.deepEqual(trace.map((t) => t.job.phase), ['started', 'working', 'completed'], '工期 3 格：開工、續工、完工');
  assert.equal(trace[0].delta.stamina, -Rules.ACTIONS.build.staminaCost);
  assert.equal(disc(w, M).stamina, startStamina - fac.durationSlots * Rules.ACTIONS.build.staminaCost);
  assert.equal(w.jobs[0].status, 'done');
  assert.equal(w.jobs[0].startSlotIndex, 2);
  assert.equal(w.jobs[0].completedSlotIndex, 2 + fac.durationSlots - 1);
  assert.equal(w.jobs[0].slotsDone, fac.durationSlots);
  assert.deepEqual(w.reservations, []);
  assert.equal(evs(w, 'jobCompleted').length, 1);
  assert.equal(evs(w, 'jobCompleted')[0].readySlotIndex, w.jobs[0].completedSlotIndex + 1);
});

test('完工次格才可用：丹房在完工格末完成；煉丹請求在完工格仍被拒（facility_not_ready），次格才開工', () => {
  let w = queueAlchemy(WITH_MATERIAL(), M, 't-0-1');
  const q = send(w, 'queueCraft', { discipleId: P, recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' });
  // 給足煉丹材料的合法 fixture：靈草／靈材直接以引擎可達的世界調整不合法，所以只驗「設施未完工 → 拒絕與輪候」
  w = q;
  const waitedSeen = [];
  for (let i = 0; i < 3; i += 1) {
    const r = step(w);
    w = r.state;
    const craft = w.jobs.find((j) => j.kind === 'craft');
    waitedSeen.push(craft.waited);
    assert.equal(craft.status, 'queued');
    const d = lastResolved(w).denied.find((x) => x.jobId === craft.id);
    assert.ok(d, '有可見原因');
    if (w.slotIndex <= 4) assert.equal(d.code, 'facility_not_ready', `slot ${w.slotIndex - 1}`);
  }
  assert.deepEqual(waitedSeen, [1, 2, 3], '輪候值每格 +1 並保存');
  assert.equal(w.jobs[0].status, 'done');
  assert.equal(w.jobs[0].completedSlotIndex, 4);
  // 第 5 格（次格）設施可用，但缺靈草 → insufficient_resource，仍無部分扣費
  const before = clone(w.resources);
  const r5 = step(w);
  const d5 = lastResolved(r5.state).denied.find((x) => x.jobId === 'job-0002');
  assert.equal(d5.code, 'insufficient_resource');
  assert.equal(r5.state.jobs[1].waited, 4);
  assert.equal(r5.state.reservations.length, 0);
  assert.equal(r5.state.resources.spiritHerb, before.spiritHerb, '無部分扣費');
});

test('材料不足：整批拒絕、不部分扣費、原因可見、輪候累計；補足後開工', () => {
  let w = world();
  w = queueAlchemy(w, M, 't-0-1');
  w = setAction(w, M, 0, 'gather-material');
  w = setAction(w, P, 0, 'gather-material');
  const r = step(w);
  const den = lastResolved(r.state).denied;
  assert.equal(den.length, 1);
  assert.equal(den[0].code, 'insufficient_resource');
  assert.equal(r.state.jobs[0].status, 'queued');
  assert.equal(r.state.jobs[0].waited, 1);
  assert.equal(r.state.reservations.length, 0);
  assert.equal(result(r.state, M).action, 'rest', '被拒的工作轉成明示休養備案（PR #91 R2），不照原課表採集');
  assert.deepEqual(result(r.state, M).fallback, { from: 'build', reason: 'insufficient_resource', jobId: 'job-0001' });
  assert.equal(result(r.state, M).delta.spiritMaterial, 0);
  // 繼續採集，直到足夠後自動開工（同格採集不能支付本格工作：開工發生在資源已存在的下一格）
  let cur = r.state;
  let startedAt = null;
  for (let i = 0; i < 6 && startedAt === null; i += 1) {
    const before = cur.resources.spiritMaterial;
    cur = setAction(cur, P, cur.slotIndex, 'gather-material');
    cur = setAction(cur, M, cur.slotIndex, 'gather-material');
    const n = step(cur);
    const js = evs(n.state, 'jobStarted');
    if (js.length) {
      startedAt = js[0].slotIndex;
      assert.ok(before >= Rules.FACILITIES[ALCH].cost.spiritMaterial, '開工用的是格初已有的材料');
    }
    cur = n.state;
  }
  assert.notEqual(startedAt, null);
  assert.equal(cur.jobs[0].status, 'active');
  assert.ok(cur.jobs[0].waited >= 1, '等待值保留');
});

test('本格採集產出不能支付本格新工作：格初 11 材料＋本格採集仍不足 12 時，本格不開工', () => {
  let w = gather(world(), 1); // 師父 4＋主角 3 = 7（以公式為準）
  const have = w.resources.spiritMaterial;
  assert.ok(have < 12);
  // 讓主角本格採集補到 ≥12 的假設：用 fixture 調整格初材料為 11（合法世界），本格採集 +7 不得算入
  w = clone(w);
  w.resources.spiritMaterial = 11;
  w = queueAlchemy(w, M, 't-0-1');
  w = setAction(w, P, w.slotIndex, 'gather-material');
  const r = step(w);
  assert.equal(lastResolved(r.state).denied[0].code, 'insufficient_resource');
  assert.equal(r.state.reservations.length, 0);
  assert.equal(r.state.resources.spiritMaterial, 11 + result(r.state, P).delta.spiritMaterial + result(r.state, M).delta.spiritMaterial);
});

test('最後一份材料／同一人兩個工作：只有合格者成功、無負庫存、被拒者不得第二份效果；與陣列順序無關', () => {
  // 材料 = 12：丹房（12）與聚靈台（6）只能成一個；ID 小者先（等待相同）
  let w = clone(WITH_MATERIAL());
  w.resources.spiritMaterial = 12;
  w = queueAlchemy(w, M, 't-0-1');
  w = send(w, 'queueBuild', { discipleId: P, facilityType: 'spiritTerrace', tileId: bestTile(w, 'spiritTerrace').id });
  const r = step(w);
  assert.equal(r.state.jobs[0].status, 'active');
  assert.equal(r.state.jobs[1].status, 'queued');
  assert.equal(r.state.jobs[1].waited, 1);
  assert.equal(lastResolved(r.state).denied[0].code, 'insufficient_resource');
  assert.ok(Object.values(r.state.resources).every((v) => v >= 0));
  assert.equal(result(r.state, P).action, 'rest');
  assert.deepEqual(result(r.state, P).fallback, { from: 'build', reason: 'insufficient_resource', jobId: 'job-0002' }, '被拒的主角只執行一次有原因的休養備案');
  // 材料 = 6：丹房放不下（被拒），較後的聚靈台放得下 → 不被前者阻擋
  let v = clone(WITH_MATERIAL());
  v.resources.spiritMaterial = 6;
  v = queueAlchemy(v, M, 't-0-1');
  v = send(v, 'queueBuild', { discipleId: P, facilityType: 'spiritTerrace', tileId: bestTile(v, 'spiritTerrace').id });
  const r2 = step(v);
  assert.equal(r2.state.jobs[0].status, 'queued');
  assert.equal(r2.state.jobs[1].status, 'active');
  // 同一人兩個工作：第二個因 participant_busy 被拒，且該角色這格只有一份效果
  let u = clone(WITH_MATERIAL());
  u.resources.spiritMaterial = 30;
  u = queueAlchemy(u, M, 't-0-1');
  u = send(u, 'queueBuild', { discipleId: M, facilityType: 'residence', tileId: bestTile(u, 'residence').id });
  const r3 = step(u);
  assert.equal(r3.state.jobs[0].status, 'active');
  assert.equal(r3.state.jobs[1].status, 'queued');
  assert.equal(lastResolved(r3.state).denied[0].code, 'participant_busy');
  assert.equal(lastResolved(r3.state).results.filter((x) => x.discipleId === M).length, 1, '一人一格一份效果');
  assert.equal(result(r3.state, M).action, 'build');
  // 打亂角色陣列不改分配與結果
  const shuffled = clone(u);
  shuffled.disciples.reverse();
  const r4 = step(shuffled);
  const norm = (x) => { const y = clone(x); y.disciples.sort((a, b) => (a.id < b.id ? -1 : 1)); return y; };
  assert.equal(hash(norm(r4.state)), hash(norm(r3.state)));
});

test('已占用的角色（active job）排的另一個工作被拒，也不能因拒絕轉休養而得到第二份休養', () => {
  let w = clone(WITH_MATERIAL());
  w.resources.spiritMaterial = 40;
  w = queueAlchemy(w, M, 't-0-1');
  w = step(w).state; // 師父開工
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'residence', tileId: bestTile(w, 'residence').id });
  w = setAction(w, M, w.slotIndex, 'rest');
  const stamina = disc(w, M).stamina;
  const r = step(w);
  const res = lastResolved(r.state).results.filter((x) => x.discipleId === M);
  assert.equal(res.length, 1);
  assert.equal(res[0].action, 'build');
  assert.equal(disc(r.state, M).stamina, stamina - Rules.ACTIONS.build.staminaCost, '沒有額外休養恢復');
  assert.equal(lastResolved(r.state).denied.find((x) => x.jobId === 'job-0002').code, 'participant_busy');
});

test('輪候值持久：保存在 jobs、存讀後不重置；拒絕者 waited 每格 +1，開工後凍結', () => {
  let w = queueAlchemy(world(), M, 't-0-1');
  for (let i = 0; i < 3; i += 1) w = step(w).state;
  assert.equal(w.jobs[0].waited, 3);
  const back = State.parseState(State.serializeState(w));
  assert.equal(back.ok, true);
  assert.equal(back.state.jobs[0].waited, 3);
  const fromSaved = step(back.state).state;
  const direct = step(w).state;
  assert.equal(hash(fromSaved), hash(direct));
  assert.equal(direct.jobs[0].waited, 4);
});

// ---------- 煉丹 ----------

// 以真實策略取得「丹房完工、材料齊」的路徑，之後的細節測試都從這些真實世界出發
test('煉丹：開工扣一次配方、占人 2 格、每格消耗體力；開工格格初快照決定產出；完工發一次丹藥', () => {
  const run = Smoke.runStrategy({ seed: 'brew-seed' });
  assert.equal(run.ok, true, JSON.stringify(run.summary));
  const recipe = Rules.RECIPES['breakthrough-pill'];
  const craftId = run.finalWorld.jobs.find((j) => j.kind === 'craft').id;
  const startedEv = evs(run.finalWorld, 'jobStarted').find((e) => e.jobId === craftId);
  assert.deepEqual(startedEv.paid, recipe.cost);
  const before = run.states[startedEv.slotIndex]; // 開工那格的格初世界（states[i] = 第 i 格格初）
  assert.equal(before.slotIndex, startedEv.slotIndex);
  const j = run.finalWorld.jobs.find((x) => x.id === craftId);
  assert.equal(j.status, 'done');
  assert.equal(j.completedSlotIndex, startedEv.slotIndex + recipe.durationSlots - 1);
  const worker = disc(before, j.discipleId);
  const facTile = run.finalWorld.jobs.find((x) => x.kind === 'build' && x.target.facilityType === ALCH).target.tileId;
  const mult = Rules.evaluateFacilityPlacement(before.tiles, facTile, ALCH).multiplierBp;
  const expected = Rules.brewOutput({ recipeId: 'breakthrough-pill', craft: worker.attributes.craft, stamina: worker.stamina, tileMultiplierBp: mult }).amount;
  const completed = evs(run.finalWorld, 'jobCompleted').find((e) => e.jobId === craftId);
  assert.equal(completed.output.amount, expected, '產出＝開工格格初快照＋放置倍率');
  assert.deepEqual(completed.output.basis, { staminaAtStart: worker.stamina, craft: worker.attributes.craft, multiplierBp: mult });
  const during = run.states[startedEv.slotIndex + 1];
  assert.equal(during.reservations.length, 1);
  assert.equal(during.reservations[0].output.amount, expected);
  assert.equal(run.finalWorld.inventory['breakthrough-pill'], expected, '完成只發一次');
  // 配方成本只在開工扣一次
  const afterStart = run.states[startedEv.slotIndex + 1];
  const gatherAtStart = lastGather(run.finalWorld, startedEv.slotIndex);
  assert.equal(afterStart.resources.spiritHerb, before.resources.spiritHerb - recipe.cost.spiritHerb + gatherAtStart.spiritHerb);
  assert.equal(afterStart.resources.spiritMaterial, before.resources.spiritMaterial - recipe.cost.spiritMaterial + gatherAtStart.spiritMaterial);
  const afterDone = run.states[startedEv.slotIndex + recipe.durationSlots];
  const g2 = lastGather(run.finalWorld, startedEv.slotIndex + 1);
  assert.equal(afterDone.resources.spiritHerb, afterStart.resources.spiritHerb + g2.spiritHerb, '跨格續工不重扣');
  assert.equal(afterDone.resources.spiritMaterial, afterStart.resources.spiritMaterial + g2.spiritMaterial);
  // 每格消耗體力
  const stamina = (w) => disc(w, j.discipleId).stamina;
  assert.equal(stamina(afterStart), worker.stamina - Rules.ACTIONS.brew.staminaCost);
});
function lastGather(w, slot) {
  const e = evs(w, 'slotResolved').find((x) => x.slotIndex === slot);
  return {
    spiritMaterial: e.results.reduce((s, r) => s + r.delta.spiritMaterial, 0),
    spiritHerb: e.results.reduce((s, r) => s + r.delta.spiritHerb, 0),
  };
}

test('煉丹前置：無丹房／丹房未完工／位滿／缺任一材料皆無成果、無部分扣費（正式路徑）', () => {
  // 正式路徑：以策略的真實世界，找到「丹房完工、缺靈草」的格
  const run = Smoke.runStrategy({ seed: 'pre-seed' });
  const cFac = run.finalWorld.jobs.find((j) => j.kind === 'build');
  const idx = run.states.findIndex((s) => s.jobs[0] && s.jobs[0].status === 'done');
  assert.ok(idx >= 0);
  // 丹房完工但 slotIndex < 9：靈草鎖定 → 排煉丹被拒
  let w = clone(run.states.find((s) => s.jobs.length && s.jobs[0].status === 'done' && s.slotIndex < 9 && !s.jobs.some((j) => j.kind === 'craft')));
  assert.ok(w);
  w = send(w, 'queueCraft', { discipleId: M, recipeId: 'breakthrough-pill', facilityJobId: cFac.id });
  const inv = clone(w.resources);
  const r = step(w);
  assert.equal(lastResolved(r.state).denied[0].code, 'insufficient_resource');
  assert.equal(r.state.reservations.length, 0);
  assert.equal(r.state.inventory['breakthrough-pill'], 0);
  assert.equal(r.state.resources.spiritHerb, inv.spiritHerb, '不扣配方');
  assert.equal(r.state.resources.spiritMaterial, inv.spiritMaterial + sumGather(r.state, 'spiritMaterial'));
  // 缺靈材（合法 fixture）：靈草足夠、靈材不足 2
  const f = clone(w);
  f.resources.spiritHerb = 6; f.resources.spiritMaterial = 1;
  const g = step(f);
  assert.equal(lastResolved(g.state).denied.find((x) => x.jobId === w.jobs.find((j) => j.kind === 'craft').id).code, 'insufficient_resource');
  assert.equal(g.state.resources.spiritHerb, 6);
  // 工作位滿：兩個煉丹，一個進行中，第二個 no_seat
  const rich1 = rich();
  const fac = rich1.jobs.find((j) => j.kind === 'build');
  const second = send(rich1, 'queueCraft', { discipleId: rich1.jobs.find((j) => j.kind === 'craft').discipleId === M ? P : M, recipeId: 'breakthrough-pill', facilityJobId: fac.id });
  const full = clone(second);
  full.resources.spiritHerb = 12;
  full.resources.spiritMaterial = 12;
  const s2 = step(full);
  const dn = lastResolved(s2.state).denied.find((x) => x.jobId === 'job-0003');
  assert.equal(dn.code, 'no_seat');
  assert.equal(s2.state.resources.spiritHerb, 12);
  // 無丹房：丹房工程取消後，排隊中的煉丹以 facility_missing 回報
  let h = clone(run.states.find((s) => s.slotIndex === 2 && s.jobs.length === 0));
  h = queueAlchemy(h, M, 't-0-1');
  h = send(h, 'queueCraft', { discipleId: P, recipeId: 'breakthrough-pill', facilityJobId: 'job-0001' });
  h = send(h, 'cancelQueuedJob', { jobId: 'job-0001' });
  const hs = step(h);
  assert.equal(lastResolved(hs.state).denied.find((x) => x.jobId === 'job-0002').code, 'facility_missing');
});
function sumGather(w, key) {
  return lastResolved(w).results.reduce((s, r) => s + r.delta[key], 0);
}

test('煉丹產出取開工格格初快照：體力 ≥60 與 30..59 的產量不同；完成才發、發 rules.js 重算的量', () => {
  const run = Smoke.runStrategy({ seed: 'amt-seed' });
  const craft = run.finalWorld.jobs.find((j) => j.kind === 'craft');
  const fac = run.finalWorld.jobs.find((j) => j.kind === 'build');
  const base = clone(run.states[craft.startSlotIndex]);
  const amounts = {};
  for (const stamina of [100, 50]) {
    let w = clone(base);
    disc(w, craft.discipleId).stamina = stamina;
    w = send(w, 'queueCraft', { discipleId: craft.discipleId, recipeId: 'breakthrough-pill', facilityJobId: fac.id });
    w = step(w, 1).state;
    const res = w.reservations[0];
    const mult = Rules.evaluateFacilityPlacement(w.tiles, fac.target.tileId, ALCH).multiplierBp;
    const expected = Rules.brewOutput({ recipeId: 'breakthrough-pill', craft: disc(w, craft.discipleId).attributes.craft, stamina, tileMultiplierBp: mult }).amount;
    assert.equal(res.output.amount, expected);
    assert.equal(res.output.staminaAtStart, stamina);
    assert.equal(w.inventory['breakthrough-pill'], 0, '完成前不發');
    w = step(w, 1).state;
    assert.equal(w.inventory['breakthrough-pill'], expected, '完成時一次發出');
    amounts[stamina] = expected;
  }
  assert.ok(amounts[100] > amounts[50], `體力 100 與 50 的產量應不同：${JSON.stringify(amounts)}`);
});

// ---------- 設施真實倍率 ----------

test('聚靈台：完工次格起，修行套用 evaluateFacilityPlacement 的倍率；無設施照常野外修行；位滿的回野外', () => {
  let w = clone(gather(world(), 2));
  w.resources.spiritMaterial = 6; // 聚靈台成本（合法 fixture）
  const tile = bestTile(w, 'spiritTerrace');
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: tile.id });
  w = setAction(w, P, w.slotIndex, 'cultivate');
  const wild = step(w); // 開工格：主角野外修行（聚靈台未完工，不能用）
  const pWild = result(wild.state, P);
  const expectWild = Rules.cultivationGain({ slotIndex: w.slotIndex, comprehension: disc(w, P).attributes.comprehension, stamina: disc(w, P).stamina, mind: disc(w, P).mind, injury: disc(w, P).injury }).gain;
  assert.equal(pWild.delta.cultivation, expectWild);
  assert.equal(pWild.seat, undefined);
  let cur = wild.state;
  cur = setAction(cur, P, cur.slotIndex, 'cultivate');
  cur = step(cur).state; // 完工格：仍不可用
  assert.equal(cur.jobs[0].status, 'done');
  assert.equal(cur.jobs[0].completedSlotIndex, cur.slotIndex - 1);
  assert.equal(result(cur, P).seat, undefined, '完工格沒有收益');
  // 次格：兩人都想修行，只有 1 個位 → ID 小者（師父）拿位，主角回野外
  const s = cur.slotIndex;
  let c2 = setAction(cur, M, s, 'cultivate');
  c2 = setAction(c2, P, s, 'cultivate');
  const snap = clone(c2);
  const r = step(c2);
  const seatKey = `facility:${cur.jobs[0].id}`;
  const rm = result(r.state, M);
  const rp = result(r.state, P);
  assert.equal(rm.seat, seatKey);
  assert.equal(rm.multiplierBp, tile.bp);
  const dm = disc(snap, M);
  assert.equal(rm.delta.cultivation, Rules.cultivationGain({
    slotIndex: s, comprehension: dm.attributes.comprehension, stamina: dm.stamina, mind: dm.mind, injury: dm.injury, tileMultiplierBp: tile.bp,
  }).gain);
  assert.equal(rp.seat, undefined);
  assert.deepEqual(rp.seatFallback, { seat: seatKey, reason: 'no_seat' });
  const dp = disc(snap, P);
  assert.equal(rp.delta.cultivation, Rules.cultivationGain({
    slotIndex: s, comprehension: dp.attributes.comprehension, stamina: dp.stamina, mind: dp.mind, injury: dp.injury,
  }).gain, '位滿的回野外修行，仍有進步');
});

function terraceWorld() {
  let w = clone(gather(world(), 2));
  w.resources.spiritMaterial = Rules.FACILITIES.spiritTerrace.cost.spiritMaterial;
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: bestTile(w, 'spiritTerrace').id });
  w = step(w, Rules.FACILITIES.spiritTerrace.durationSlots).state;
  assert.equal(w.jobs[0].status, 'done');
  return w;
}

test('忙碌（進行中工作）的角色不占設施位：聚靈台唯一的位給沒有工作的人', () => {
  let w = terraceWorld();
  w.resources.spiritMaterial = Rules.FACILITIES.residence.cost.spiritMaterial;
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'residence', tileId: bestTile(w, 'residence').id });
  w = setAction(w, M, w.slotIndex, 'cultivate'); // 師父 ID 較小，若被當成一般修行者會搶走聚靈台的位
  w = setAction(w, P, w.slotIndex, 'cultivate');
  const r = step(w);
  assert.equal(result(r.state, M).action, 'build');
  assert.equal(result(r.state, M).seat, undefined);
  assert.equal(result(r.state, P).seat, `facility:${w.jobs[0].id}`, '主角拿到聚靈台位');
  assert.equal(result(r.state, P).seatFallback, undefined);
});

test('居所：完工次格起，休養套用居所休養位與放置倍率（2 位）；無居所仍有免費野外休養', () => {
  let w = clone(gather(world(), 2));
  w.resources.spiritMaterial = Rules.FACILITIES.residence.cost.spiritMaterial;
  const tile = bestTile(w, 'residence');
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'residence', tileId: tile.id });
  w = setAction(w, P, w.slotIndex, 'rest');
  let cur = step(w).state;
  assert.equal(result(cur, P).seat, undefined, '居所未完工不可用');
  const wildExpected = Rules.applyRest({ stamina: disc(w, P).stamina, mind: disc(w, P).mind, injury: disc(w, P).injury, rootBone: disc(w, P).attributes.rootBone });
  assert.equal(disc(cur, P).stamina, wildExpected.stamina);
  cur = setAction(cur, P, cur.slotIndex, 'rest');
  cur = step(cur).state; // 完工格
  assert.equal(cur.jobs[0].status, 'done');
  const s = cur.slotIndex;
  let c2 = setAction(cur, M, s, 'rest');
  c2 = setAction(c2, P, s, 'rest');
  const snap = clone(c2);
  const r = step(c2);
  for (const id of [M, P]) {
    const d = disc(snap, id);
    const expected = Rules.applyRest({ stamina: d.stamina, mind: d.mind, injury: d.injury, rootBone: d.attributes.rootBone, atResidence: true, residenceMultiplierBp: tile.bp });
    assert.equal(disc(r.state, id).stamina, expected.stamina, id);
    assert.equal(disc(r.state, id).injury, expected.injury, id);
    assert.equal(result(r.state, id).seat, `facility:${cur.jobs[0].id}`);
    assert.equal(result(r.state, id).multiplierBp, tile.bp);
  }
});

// ---------- 42 格、最後一格未完工、存讀 ----------

test('情境最後：第 42 格待選時未完工 job 保持 active，不提早完工、不假完工；恰好完工的在第 41 格末完成', () => {
  const run = Smoke.runStrategy({ seed: 'end-seed' });
  assert.equal(run.finalWorld.slotIndex, 42);
  assert.equal(run.finalWorld.phase, 'awaitingChoice');
  // 第 40 格排聚靈台（工期 2）：第 40、41 格施工，第 41 格末完工，第 42 格待選時已完成
  const s40 = clone(run.states[40]);
  s40.resources.spiritMaterial += 20; // 合法 fixture：補足工程材料（正式路徑的材料已在丹房與煉丹用完）
  const q40 = send(s40, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: bestTile(s40, 'spiritTerrace').id });
  const r40 = step(q40, 2);
  const t = r40.state.jobs[r40.state.jobs.length - 1];
  assert.equal(r40.state.slotIndex, 42);
  assert.equal(t.status, 'done');
  assert.equal(t.completedSlotIndex, 41);
  assert.equal(r40.state.reservations.length, 0);
  // 第 41 格排居所（工期 2）：第 42 格待選時只做了 1 格，保持 active
  const s41 = clone(run.states[41]);
  s41.resources.spiritMaterial += 20;
  const q41 = send(s41, 'queueBuild', { discipleId: M, facilityType: 'residence', tileId: bestTile(s41, 'residence').id });
  const r41 = step(q41);
  assert.equal(r41.state.slotIndex, 42);
  assert.equal(r41.state.phase, 'awaitingChoice');
  const last = r41.state.jobs[r41.state.jobs.length - 1];
  assert.equal(last.status, 'active');
  assert.equal(last.slotsDone, 1);
  assert.ok(last.slotsDone < Rules.FACILITIES.residence.durationSlots);
  assert.equal(r41.state.reservations.length, 1);
  assert.deepEqual(State.validateWorld(r41.state), { ok: true });
  assert.equal(E.advance(r41.state, 1).code, 'awaiting_choice');
  assert.equal(Commands_dispatchCode(r41.state, 'queueBuild', { discipleId: P, facilityType: 'spiritTerrace', tileId: 't-1-4' }), 'not_planning');
});
function Commands_dispatchCode(w, type, payload) {
  return C.dispatch(w, cmd(w, type, payload)).code;
}

test('生產中途、完工前後、求援待選、危機待選：serialize／parse 後續與不中斷路徑相同', () => {
  const run = Smoke.runStrategy({ seed: 'save-seed' });
  assert.equal(run.ok, true);
  const interesting = run.states.filter((s, i) => i % 3 === 0 || s.phase === 'awaitingChoice' || s.reservations.length > 0);
  assert.ok(interesting.length > 10);
  assert.ok(run.states.some((s) => s.phase === 'awaitingChoice' && s.slotIndex === 9), '含求援待選');
  for (const s of interesting.slice(0, 40)) {
    const text = State.serializeState(s);
    const back = State.parseState(text);
    assert.equal(back.ok, true, back.reason);
    assert.equal(hash(back.state), hash(s));
    // 從存讀後的世界繼續執行同一份腳本，與直接執行結果相同
    const tail = Smoke.replayFrom(back.state, run.script.filter((st) => st.fromRevision >= s.revision));
    assert.equal(hash(tail), hash(run.finalWorld), `slot ${s.slotIndex}（${s.phase}）存讀後續一致`);
  }
});

// ---------- 20 seed × 42 格 ----------

test('20 seed × 42 格：單步／3 格批次／42 格批次在同一組有效命令下 hash 相同；首丹完成；停在危機待選；不消耗 RNG', () => {
  const failures = [];
  const firstPill = [];
  const templates = Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates);
  const hashes = new Set();
  for (let i = 0; i < 20; i += 1) {
    const seed = `sg-prod-${String(i).padStart(3, '0')}`;
    const characterOptions = Smoke.optionsForIndex(i, templates);
    const run = Smoke.runStrategy({ seed, characterOptions });
    if (!run.ok) { failures.push({ seed, summary: run.summary }); continue; }
    const base = run.finalWorld;
    assert.equal(base.slotIndex, 42, seed);
    assert.equal(base.phase, 'awaitingChoice', seed);
    assert.deepEqual(base.pendingEvents.map((e) => e.id), ['evt-beast-crisis'], seed);
    assert.deepEqual(base.rngState, State.newWorld(seed, 'slice-14', characterOptions).state.rngState, `${seed} 不消耗 RNG`);
    assert.ok(base.inventory['breakthrough-pill'] >= 1, `${seed} 有首爐丹`);
    firstPill.push(run.summary.firstPillSlot);
    for (const batch of [3, 42]) {
      const replayed = Smoke.replay({ seed, characterOptions }, run.script, batch);
      if (hash(replayed) !== hash(base)) failures.push({ seed, batch });
    }
    hashes.add(hash(base));
  }
  assert.deepEqual(failures, []);
  assert.equal(hashes.size, 20, '20 個世界各不相同（seed 與主角設定都不同）');
  assert.ok(firstPill.every((s) => Number.isInteger(s) && s > 5 && s < 20), `首丹時點合理：${firstPill}`);
});

// ---------- smoke CLI ----------

const SMOKE = path.join(__dirname, '..', 'tools', 'smoke.js');
test('smoke CLI：--seed 輸出摘要 JSON 並以 0 結束；摘要含版本、策略、首丹時點、hash、未實作項', () => {
  const r = cp.spawnSync(process.execPath, [SMOKE, '--seed', 'cli-seed'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.seed, 'cli-seed');
  assert.deepEqual(out.versions, { schema: 4, rule: 3, rng: 1 });
  assert.equal(out.strategy, Smoke.STRATEGY_VERSION);
  assert.equal(out.final.slotIndex, 42);
  assert.equal(out.final.phase, 'awaitingChoice');
  assert.deepEqual(out.final.pending, ['evt-beast-crisis']);
  assert.ok(Number.isInteger(out.firstPillSlot) && Number.isInteger(out.firstPillDay));
  assert.match(out.hash, /^[0-9a-f]{64}$/);
  assert.ok(out.final.inventory['breakthrough-pill'] >= 1);
  assert.ok(Array.isArray(out.jobs) && out.jobs.length >= 2);
  assert.ok(out.notImplemented.length >= 4);
  assert.ok(out.commands > 0);
  const again = cp.spawnSync(process.execPath, [SMOKE, '--seed', 'cli-seed'], { encoding: 'utf8' });
  assert.equal(again.stdout, r.stdout, '可重跑，輸出逐位元相同');
  const direct = Smoke.runStrategy({ seed: 'cli-seed' });
  assert.equal(out.hash, hash(direct.finalWorld));
});

test('smoke CLI：缺 seed／未知參數／不合法 seed 以非零結束；策略失敗以非零結束', () => {
  assert.equal(cp.spawnSync(process.execPath, [SMOKE], { encoding: 'utf8' }).status, 2);
  assert.equal(cp.spawnSync(process.execPath, [SMOKE, '--seed', 'x', '--bogus'], { encoding: 'utf8' }).status, 2);
  assert.notEqual(cp.spawnSync(process.execPath, [SMOKE, '--seed', ''], { encoding: 'utf8' }).status, 0);
  assert.notEqual(cp.spawnSync(process.execPath, [SMOKE, '--seed', 'x', '--template', 'nope'], { encoding: 'utf8' }).status, 0);
  const broken = Smoke.runStrategy({ seed: 'fail-seed', maxPlanningSteps: 3 });
  assert.equal(broken.ok, false);
  assert.ok(broken.summary.error);
});

test('smoke 只用公開 dispatch／advance，不直接改世界、不 import 內部', () => {
  const src = fs.readFileSync(SMOKE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.deepEqual([...src.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]).sort(),
    ['../js/commands.js', '../js/engine.js', '../js/rules.js', '../js/state.js']);
  assert.equal(/Math\.random|Date\.now|new Date|eval\(|\.resources\.\w+\s*[-+]?=[^=]|\.inventory\[.*\]\s*=[^=]/.test(src), false);
});

// ---------- 載入與純度 ----------

test('瀏覽器載入順序：commands／engine 在 vm 中與 Node 結果相同；漏載 story-data 指名報錯', () => {
  const load = (names) => {
    const ctx = vm.createContext({});
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'progression.js', 'commands.js', 'engine.js']);
  const B = ctx.SectChronicle;
  let w = B.State.newWorld('vm-seed').state;
  const r = B.Commands.dispatch(w, { id: 'v1', expectedRevision: 0, type: 'queueBuild', payload: { discipleId: M, facilityType: ALCH, tileId: 't-0-1' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  w = B.Engine.advance(r.state, 3).state;
  let n = world('vm-seed');
  n = C.dispatch(n, { id: 'v1', expectedRevision: 0, type: 'queueBuild', payload: { discipleId: M, facilityType: ALCH, tileId: 't-0-1' } }).state;
  n = step(n, 3).state;
  assert.equal(B.State.hashWorld(w), hash(n));
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'commands.js', 'engine.js']), /story-data\.js/);
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'commands.js', 'engine.js']), /story\.js/);
  assert.throws(() => load(['rng.js', 'rules.js', 'state.js', 'story-data.js', 'story.js', 'progression.js', 'engine.js']), /commands\.js/);
});

test('生產全程確定性：不消耗 RNG、不用牆鐘', () => {
  for (const f of ['commands.js', 'engine.js', 'state.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/Math\.random|Date\.now|new Date|performance\.now|nextInt|nextUint32/.test(src), false, f);
  }
});
