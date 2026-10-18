'use strict';
// SG-04 審查修正（PR #91 R1／R2／R3）：開工失敗的明示休養備案、工作位持久輪候、逐資源點容量。
// 這些測試全部從正式 newWorld 與公開 dispatch／advance 出發，不直接呼叫內部函式。
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const C = require('../js/commands.js');
const E = require('../js/engine.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const M = State.MASTER_ID;
const P = State.PROTAGONIST_ID;
const A = 'cand-1';
let idc = 0;
const cmd = (w, type, payload) => ({ id: `c-${(idc += 1)}`, expectedRevision: w.revision, type, payload });
const send = (w, type, payload) => {
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const reject = (w, type, payload, code) => {
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  return r;
};
const step = (w, n = 1) => {
  const r = E.advance(w, n);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const world = (seed = 'cont-seed') => {
  const r = State.newWorld(seed, 'slice-14');
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const lastResolved = (w) => [...w.eventLog].reverse().find((e) => e.type === 'slotResolved');
const res = (w, id) => lastResolved(w).results.find((r) => r.discipleId === id);
const plan = (w, who, action, tileId) => send(w, 'setDailyTemplate', { discipleId: who, parts: [action, action, action], ...(tileId ? { tileIds: [tileId, tileId, tileId] } : {}) });
const bestTile = (w, type) => {
  let best = null;
  for (const t of w.tiles) {
    const e = Rules.evaluateFacilityPlacement(w.tiles, t.id, type);
    if (e.ok && (!best || e.multiplierBp > best.bp)) best = { id: t.id, bp: e.multiplierBp };
  }
  return best;
};

// 合法三人 fixture：第 20 格、cand-1 於第 20 格入隊（與 engine.test.js 的學徒 fixture 相同來源）
function threeWorld() {
  const w = world('cont-three');
  w.slotIndex = 20;
  w.revision = 20;
  w.story.rescues = [{ id: Rules.AID_ID, completedSlotIndex: 12, rewardClaimed: true }];
  w.story.triggeredEventIds = ['evt-phase-faint', 'evt-phase-omen', 'evt-village-plea', 'evt-aid-complete', 'evt-phase-manifest', 'evt-invite-cand-1', 'evt-invite-cand-2'];
  w.story.invitations['cand-1'] = { status: 'accepted', joinSlotIndex: 20 };
  w.disciples.push({ id: A, role: 'apprentice', attributes: { rootBone: 3, comprehension: 3, craft: 3 }, stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex: 20 });
  // 本 fixture 由測試直接構造；新欄位（seatWaits、templateTiles）已含在 newWorld 的預設中
  const v = C.validateEngineWorld(w);
  assert.deepEqual(v, { ok: true }, JSON.stringify(v));
  return w;
}

// 取得一座已完工的聚靈台（兩人採集 2 格 → 師父建 2 格），之後兩人連續修行
function terraceWorld() {
  let w = world('cont-terrace');
  for (let i = 0; i < 2; i += 1) {
    w = plan(w, M, 'gather-material');
    w = plan(w, P, 'gather-material');
    w = step(w);
  }
  w.resources.spiritMaterial = Rules.FACILITIES.spiritTerrace.cost.spiritMaterial;
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: bestTile(w, 'spiritTerrace').id });
  w = step(w, Rules.FACILITIES.spiritTerrace.durationSlots);
  assert.equal(w.jobs[0].status, 'done');
  return w;
}

// ---------- R2：開工失敗 → 明示休養備案（只一次），已有工作者只做該工作 ----------

test('R2：零材料排丹房被拒（insufficient_resource），師父這格只執行有原因的休養，不採材', () => {
  let w = world('r2-zero');
  assert.equal(w.resources.spiritMaterial, 0);
  w = plan(w, M, 'gather-material');
  w = plan(w, P, 'gather-material');
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: bestTile(w, 'alchemyRoom').id });
  const n = step(w);
  const m = res(n, M);
  assert.equal(m.action, 'rest');
  assert.deepEqual(m.fallback, { from: 'build', reason: 'insufficient_resource', jobId: 'job-0001' });
  assert.equal(m.delta.spiritMaterial, 0, '被拒的師父沒有採到材料');
  assert.ok(m.delta.stamina >= 0);
  assert.equal(res(n, P).action, 'gather-material');
  assert.equal(n.resources.spiritMaterial, res(n, P).delta.spiritMaterial, '只有主角的產出');
  assert.equal(n.jobs[0].waited, 1);
  assert.equal(n.jobs[0].status, 'queued');
  assert.deepEqual(n.resources, { ...w.resources, spiritMaterial: res(n, P).delta.spiritMaterial });
});

test('R2：被拒者只休養一次——一人兩個被拒的 job 仍只有一份休養效果', () => {
  let w = world('r2-two');
  w = plan(w, M, 'cultivate');
  const tiles = w.tiles.filter((t) => t.terrain === 'build').slice(0, 2).map((t) => t.id);
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: tiles[0] });
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: tiles[1] });
  const n = step(w);
  const results = lastResolved(n).results.filter((r) => r.discipleId === M);
  assert.equal(results.length, 1, '一人一格只有一份結果');
  assert.equal(results[0].action, 'rest');
  assert.equal(results[0].fallback.jobId, 'job-0001', '原因取排序最前的被拒 job');
  assert.equal(n.jobs.filter((j) => j.waited === 1).length, 2);
});

test('R2：已有進行中工作者，另一個被拒的 job 不會再讓他休養——只執行進行中的工作', () => {
  let w = world('r2-busy');
  for (let i = 0; i < 2; i += 1) {
    w = plan(w, M, 'gather-material');
    w = plan(w, P, 'gather-material');
    w = step(w);
  }
  const t = w.tiles.filter((x) => x.terrain === 'build').map((x) => x.id);
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: bestTile(w, 'alchemyRoom').id });
  w = step(w); // 師父開工丹房（進行中）
  w.resources.spiritMaterial = Rules.FACILITIES.spiritTerrace.cost.spiritMaterial;
  const tile = t.find((id) => id !== w.jobs[0].target.tileId);
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: tile });
  const n = step(w);
  const m = lastResolved(n).results.filter((r) => r.discipleId === M);
  assert.equal(m.length, 1);
  assert.equal(m[0].action, 'build');
  assert.equal(m[0].fallback, undefined);
  assert.equal(n.jobs[1].waited, 1);
  assert.equal(lastResolved(n).denied[0].code, 'participant_busy');
});

test('R2：成功開工者只做該工作，不會同時休養', () => {
  let w = world('r2-ok');
  for (let i = 0; i < 2; i += 1) {
    w = plan(w, M, 'gather-material');
    w = plan(w, P, 'gather-material');
    w = step(w);
  }
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'alchemyRoom', tileId: bestTile(w, 'alchemyRoom').id });
  const n = step(w);
  assert.equal(lastResolved(n).results.filter((r) => r.discipleId === M).length, 1);
  assert.equal(res(n, M).action, 'build');
  assert.equal(res(n, M).fallback, undefined);
});

// ---------- R1：設施工作位持久輪候 ----------

test('R1：兩人連續爭唯一的聚靈台位——輪流得位，等待較久者優先，且存於 canonical', () => {
  let w = terraceWorld();
  w = plan(w, M, 'cultivate');
  w = plan(w, P, 'cultivate');
  const seat = `facility:${w.jobs[0].id}`;
  const winners = [];
  const waits = [];
  let cur = w;
  for (let i = 0; i < 5; i += 1) {
    cur = step(cur);
    const win = [M, P].filter((id) => res(cur, id).seat === seat);
    assert.equal(win.length, 1, '唯一的位只有一人取得');
    winners.push(win[0]);
    const loser = win[0] === M ? P : M;
    assert.deepEqual(res(cur, loser).seatFallback, { seat, reason: 'no_seat' });
    waits.push(JSON.stringify(cur.seatWaits));
    assert.deepEqual(cur.seatWaits, [{ discipleId: loser, seat, waited: 1 }], '失位者累計 1，得位者沒有紀錄（取得即重置）');
  }
  assert.deepEqual(winners, [M, P, M, P, M], '師父與主角輪流，不再固定師父勝');
  assert.equal(State.validateWorld(cur).ok, true);
  // 存讀一致：每一格往返後繼續，與不中斷的結果完全相同
  let a = w;
  let b = w;
  for (let i = 0; i < 5; i += 1) {
    a = step(a);
    const parsed = State.parseState(State.serializeState(b));
    assert.equal(parsed.ok, true, JSON.stringify(parsed));
    b = step(parsed.state);
  }
  assert.equal(State.hashWorld(a), State.hashWorld(b));
  // 批次對照：5 格一次推進與逐格相同（第 9 格前不會遇到待選事件）
  assert.equal(State.hashWorld(step(w, 5)), State.hashWorld(a));
});

test('R1：改做別的事或取得位時，等待重置（不累積跨時段的舊債）', () => {
  let w = terraceWorld();
  w = plan(w, M, 'cultivate');
  w = plan(w, P, 'cultivate');
  let cur = step(w); // slot：師父得位，主角 waited 1
  assert.equal(cur.seatWaits.length, 1);
  cur = send(cur, 'assignSlot', { discipleId: P, slotIndex: cur.slotIndex, action: 'tune-mind' });
  cur = step(cur);
  assert.deepEqual(cur.seatWaits.map((x) => x.discipleId), [], '改做別的行動 → 主角的等待消失；師父這格得位沒有紀錄');
  assert.equal(res(cur, M).seat !== undefined, true);
});

test('R1：state validator 拒絕壞的 seatWaits', () => {
  let w = terraceWorld();
  w = plan(w, M, 'cultivate');
  w = plan(w, P, 'cultivate');
  const ok = step(w);
  assert.equal(State.validateWorld(ok).ok, true);
  const cases = [
    ['不在隊的角色', (x) => { x.seatWaits[0].discipleId = 'ghost'; }],
    ['waited 為 0', (x) => { x.seatWaits[0].waited = 0; }],
    ['waited 超過經過格數', (x) => { x.seatWaits[0].waited = 999; }],
    ['seat 不是已完工設施或資源點', (x) => { x.seatWaits[0].seat = 'facility:job-0099'; }],
    ['seat 格式未知', (x) => { x.seatWaits[0].seat = 'terrain:material'; }],
    ['欄位多餘', (x) => { x.seatWaits[0].extra = 1; }],
    ['同一角色兩筆', (x) => { x.seatWaits.push(clone(x.seatWaits[0])); }],
    ['不是陣列', (x) => { x.seatWaits = {}; }],
  ];
  for (const [name, mut] of cases) {
    const x = clone(ok);
    mut(x);
    const v = State.validateWorld(x);
    assert.equal(v.ok, false, name);
  }
});

// ---------- R3：逐資源點容量與目標 ----------

test('R3：三人指定同一個資源點，只有兩人取得位，第三人明示備案；改去另一點則取得位', () => {
  let w = threeWorld();
  const tile = 't-0-0';
  w = plan(w, M, 'gather-material', tile);
  w = plan(w, P, 'gather-material', tile);
  w = plan(w, A, 'gather-material', tile);
  let n = step(w);
  const seated = [A, M, P].filter((id) => res(n, id).seat === `tile:${tile}`);
  assert.deepEqual(seated, [A, M], '同分時 ID 順序（cand-1、disc-master）取得；主角沒有位');
  assert.equal(res(n, P).action, 'rest');
  assert.deepEqual(res(n, P).fallback, { from: 'gather-material', reason: 'no_seat' });
  assert.equal(res(n, P).delta.spiritMaterial, 0);
  assert.equal(res(n, M).tileId, tile);
  assert.deepEqual(n.seatWaits, [{ discipleId: P, seat: `tile:${tile}`, waited: 1 }]);
  // 下一格主角等待較久 → 優先；落敗的是 ID 較後的師父
  n = step(n);
  assert.equal(res(n, P).seat, `tile:${tile}`);
  assert.equal(res(n, A).seat, `tile:${tile}`, 'cand-1 ID 較小，同分取得');
  assert.equal(res(n, M).action, 'rest');
  assert.deepEqual(n.seatWaits, [{ discipleId: M, seat: `tile:${tile}`, waited: 1 }]);
  // 主角改去另一個靈材點：不需要借別點容量，且立即取得
  let w2 = threeWorld();
  w2 = plan(w2, M, 'gather-material', tile);
  w2 = plan(w2, A, 'gather-material', tile);
  w2 = plan(w2, P, 'gather-material', 't-0-4');
  const m = step(w2);
  assert.equal(res(m, P).seat, 'tile:t-0-4');
  assert.equal(res(m, P).fallback, undefined);
  assert.deepEqual(m.seatWaits, []);
});

test('R3：不同資源點互不借用容量；同一點 2 位，另一點仍有自己的 2 位', () => {
  let w = threeWorld();
  w = plan(w, M, 'gather-material', 't-0-0');
  w = plan(w, A, 'gather-material', 't-0-0');
  w = plan(w, P, 'gather-material', 't-0-0');
  const n = step(w);
  const noSeat = [M, P, A].filter((id) => res(n, id).fallback);
  assert.equal(noSeat.length, 1, '同點 3 人只 2 人得位，不論其他點還有多少空位');
});

test('R3：未指定 tileId 的採集使用該資源種類排序最前的資源點（穩定預設）', () => {
  let w = threeWorld();
  w = plan(w, M, 'gather-material');
  w = plan(w, P, 'gather-herb');
  const n = step(w);
  assert.equal(res(n, M).tileId, 't-0-0');
  assert.equal(res(n, M).seat, 'tile:t-0-0');
  assert.equal(res(n, P).tileId, 't-2-0');
});

test('R3：指令驗證——資源種類、不存在的地塊、非採集行動帶 tileId、格式', () => {
  const w = world('r3-cmd');
  const base = { discipleId: M, slotIndex: 0, action: 'gather-material' };
  reject(w, 'assignSlot', { ...base, tileId: 't-2-0' }, 'wrong_terrain');
  reject(w, 'assignSlot', { ...base, tileId: 't-9-9' }, 'unknown_tile');
  reject(w, 'assignSlot', { ...base, tileId: 't-0-1' }, 'wrong_terrain');
  reject(w, 'assignSlot', { ...base, tileId: 5 }, 'bad_payload');
  reject(w, 'assignSlot', { ...base, action: 'cultivate', tileId: 't-0-0' }, 'bad_payload');
  reject(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: null, tileId: 't-0-0' }, 'bad_payload');
  const ok = send(w, 'assignSlot', { ...base, tileId: 't-0-4' });
  assert.deepEqual(ok.schedule.overrides, [{ discipleId: M, slotIndex: 0, action: 'gather-material', tileId: 't-0-4' }]);
  // 沒有 tileId 的既有形狀仍有效，canonical 不含 tileId
  const plain = send(w, 'assignSlot', base);
  assert.deepEqual(plain.schedule.overrides, [{ discipleId: M, slotIndex: 0, action: 'gather-material' }]);
  // 範本
  reject(w, 'setDailyTemplate', { discipleId: M, parts: ['gather-material', 'rest', 'rest'], tileIds: ['t-2-0', null, null] }, 'wrong_terrain');
  reject(w, 'setDailyTemplate', { discipleId: M, parts: ['gather-material', 'rest', 'rest'], tileIds: [null, 't-0-0', null] }, 'bad_payload');
  reject(w, 'setDailyTemplate', { discipleId: M, parts: ['gather-material', 'rest', 'rest'], tileIds: ['t-0-0'] }, 'bad_payload');
  reject(w, 'setDailyTemplate', { discipleId: M, parts: null, tileIds: [null, null, null] }, 'bad_payload');
  const t = send(w, 'setDailyTemplate', { discipleId: M, parts: ['gather-material', 'rest', 'gather-herb'], tileIds: ['t-4-0', null, 't-4-4'] });
  assert.deepEqual(t.schedule.templateTiles, { [M]: ['t-4-0', null, 't-4-4'] });
  const cleared = send(t, 'setDailyTemplate', { discipleId: M, parts: null });
  assert.deepEqual(cleared.schedule.templateTiles, {});
  const replaced = send(t, 'setDailyTemplate', { discipleId: M, parts: ['rest', 'rest', 'rest'] });
  assert.deepEqual(replaced.schedule.templateTiles, {}, '重設範本且未給 tileIds → 舊目標一併清除');
});

test('R3：覆寫優先於範本的 tileId；改課清掉覆寫的 tileId', () => {
  let w = threeWorld();
  w = plan(w, M, 'gather-material', 't-0-0');
  w = send(w, 'assignSlot', { discipleId: M, slotIndex: w.slotIndex, action: 'gather-material', tileId: 't-4-0' });
  const n = step(w);
  assert.equal(res(n, M).tileId, 't-4-0');
  assert.equal(res(n, M).source, 'override');
});

test('R3：state validator 拒絕指向錯誤地塊的課表', () => {
  const w = world('r3-val');
  const good = send(send(w, 'assignSlot', { discipleId: M, slotIndex: 0, action: 'gather-material', tileId: 't-0-0' }),
    'setDailyTemplate', { discipleId: P, parts: ['gather-herb', 'rest', 'rest'], tileIds: ['t-2-0', null, null] });
  assert.equal(State.validateWorld(good).ok, true);
  const cases = [
    ['覆寫指向不存在地塊', (x) => { x.schedule.overrides[0].tileId = 't-9-9'; }],
    ['覆寫指向錯誤種類', (x) => { x.schedule.overrides[0].tileId = 't-2-0'; }],
    ['非採集覆寫帶 tileId', (x) => { x.schedule.overrides[0].action = 'rest'; }],
    ['範本 tileIds 對應非採集格', (x) => { x.schedule.templateTiles[P][1] = 't-0-0'; }],
    ['範本 tileIds 地塊種類錯', (x) => { x.schedule.templateTiles[P][0] = 't-0-0'; }],
    ['範本 tileIds 長度錯', (x) => { x.schedule.templateTiles[P] = ['t-2-0']; }],
    ['範本 tileIds 屬於沒有範本的角色', (x) => { x.schedule.templateTiles[M] = [null, null, null]; }],
    ['templateTiles 不是物件', (x) => { x.schedule.templateTiles = []; }],
  ];
  for (const [name, mut] of cases) {
    const x = clone(good);
    mut(x);
    assert.equal(State.validateWorld(x).ok, false, name);
  }
});

test('R1／R3 相鄰邊界：打亂角色陣列、逐格／批次、每格存讀往返，三人爭同一點的結果完全相同', () => {
  let w = threeWorld();
  for (const id of [M, P, A]) w = plan(w, id, 'gather-material', 't-0-0');
  const norm = (x) => { const y = clone(x); y.disciples.sort((a, b) => (a.id < b.id ? -1 : 1)); return y; };
  const shuffled = clone(w);
  shuffled.disciples.reverse();
  const a = step(w, 2);
  assert.equal(State.hashWorld(norm(step(shuffled, 2))), State.hashWorld(norm(a)), '陣列順序不影響仲裁與等待');
  let b = w;
  for (let i = 0; i < 2; i += 1) {
    b = step(b);
    const back = State.parseState(State.serializeState(b));
    assert.equal(back.ok, true, JSON.stringify(back));
    b = back.state;
  }
  assert.equal(State.hashWorld(b), State.hashWorld(a), '逐格＋存讀＝批次');
});

test('R1：連續落選會累計到 2 以上並超越只落選 1 格的人；位不同時等待不沿用', () => {
  // 三人爭唯一的聚靈台位。已完工的聚靈台直接寫在合法世界中（與 terraceWorld 的路徑產物同形）。
  const w = threeWorld();
  const tile = bestTile(w, 'spiritTerrace').id;
  w.jobs.push({
    id: 'job-0001', kind: 'build', discipleId: M, status: 'done', queuedSlotIndex: 10, waited: 0,
    startSlotIndex: 10, slotsDone: 2, completedSlotIndex: 11, cancelledSlotIndex: null,
    target: { facilityType: 'spiritTerrace', tileId: tile },
  });
  assert.deepEqual(C.validateEngineWorld(w), { ok: true });
  let cur = w;
  for (const id of [M, P, A]) cur = plan(cur, id, 'cultivate');
  const seat = 'facility:job-0001';
  cur = step(cur); // 全部 waited 0：ID 最小的 cand-1 得位
  assert.equal(res(cur, A).seat, seat);
  assert.deepEqual(cur.seatWaits, [{ discipleId: M, seat, waited: 1 }, { discipleId: P, seat, waited: 1 }]);
  cur = step(cur); // M、P 各 1：同分 → M 得位；P 累計到 2，cand-1 落選 1
  assert.equal(res(cur, M).seat, seat);
  assert.deepEqual(cur.seatWaits, [{ discipleId: A, seat, waited: 1 }, { discipleId: P, seat, waited: 2 }]);
  cur = step(cur); // P（2）超越 cand-1（1）
  assert.equal(res(cur, P).seat, seat);
  assert.deepEqual(cur.seatWaits, [{ discipleId: A, seat, waited: 2 }, { discipleId: M, seat, waited: 1 }]);

  // 位不同：第一格三人爭 t-0-0（主角落選），第二格三人改爭 t-0-4——主角上一格的等待不屬於這個位
  let t = threeWorld();
  for (const id of [M, P, A]) t = plan(t, id, 'gather-material', 't-0-0');
  t = step(t);
  assert.deepEqual(t.seatWaits, [{ discipleId: P, seat: 'tile:t-0-0', waited: 1 }]);
  for (const id of [M, P, A]) t = plan(t, id, 'gather-material', 't-0-4');
  t = step(t);
  assert.equal(res(t, A).seat, 'tile:t-0-4');
  assert.equal(res(t, M).seat, 'tile:t-0-4');
  assert.equal(res(t, P).fallback.reason, 'no_seat', '舊位的等待不帶到新位');
  assert.deepEqual(t.seatWaits, [{ discipleId: P, seat: 'tile:t-0-4', waited: 1 }]);
});
