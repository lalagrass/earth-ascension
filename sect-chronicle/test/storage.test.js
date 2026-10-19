'use strict';
// SG-RT-03a：正式存讀。localStorage 與 Web Locks 用假物件注入；世界一律和不中斷推進的結果比對 hash 與 rngState。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Realtime = require('../js/realtime.js');
const State = require('../js/state.js');
const Rules = require('../js/rules.js');
const Storage = require('../js/storage.js');
const View = require('../viewer/view.js');

const SEED = 'rt-dev-000';
const HORIZON = Rules.OBSERVATION_TICKS;
const PID = State.PROTAGONIST_ID;
const KEYS = [Storage.POINTER_KEY, Storage.SLOT_KEYS.a, Storage.SLOT_KEYS.b];

// 和 viewer 一樣：breakthroughResolved 只結束一批，剩下的 tick 繼續推。
function advanceTo(world, tick) {
  let w = world;
  while (w.clock.tick < tick) {
    const r = Realtime.advanceTicks(w, tick - w.clock.tick);
    assert.equal(r.ok, true, r.reason);
    assert.notEqual(r.stopReason, 'error', r.error && r.error.reason);
    w = r.state;
  }
  return w;
}

const cache = new Map();
function worldAt(tick) {
  if (!cache.has(tick)) {
    const below = [...cache.keys()].filter((t) => t <= tick).sort((a, b) => b - a)[0];
    cache.set(tick, advanceTo(below === undefined ? Realtime.createWorld(SEED).state : cache.get(below), tick));
  }
  return cache.get(tick);
}

function dispatch(w, type, payload, id) {
  return Realtime.dispatch(w, { id, type, expectedRevision: w.revision, payload });
}

// 假 localStorage：可指定某個 key 在 setItem／getItem 時丟錯，或寫入時被改掉內容。
function fakeStorage(init) {
  const map = new Map(Object.entries(init || {}));
  const s = {
    map,
    writes: [],
    failSet: {},
    failGet: {},
    mangle: {},
    getItem(k) {
      if (s.failGet[k]) { const e = new Error('blocked'); e.name = s.failGet[k]; throw e; }
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (s.failSet[k]) { const e = new Error('full'); e.name = s.failSet[k]; throw e; }
      s.writes.push(k);
      map.set(k, s.mangle[k] ? s.mangle[k](v) : String(v));
    },
  };
  return s;
}

// 假 Web Locks：同名請求依序執行；hold() 可以先占住鎖，模擬保存排隊。
function fakeLocks() {
  let tail = Promise.resolve();
  const l = {
    request(name, fn) {
      const run = tail.then(() => fn());
      tail = run.then(() => undefined, () => undefined);
      return run;
    },
    hold() {
      let release;
      const held = new Promise((r) => { release = r; });
      l.request(Storage.LOCK_NAME, () => held);
      return release;
    },
  };
  return l;
}

function store(storage, writerId, locks = fakeLocks()) {
  return Storage.createStore({ storage, locks, writerId });
}

const envelopeOf = (world) => Storage.makeEnvelope(world, '2026-10-19T00:00:00.000Z');
const snapshotKeys = (s) => KEYS.map((k) => s.map.get(k) === undefined ? null : s.map.get(k));

test('封套保存原字串與 checksum，讀回與原世界一致', () => {
  const w = worldAt(400);
  const env = envelopeOf(w);
  assert.equal(env.ok, true);
  assert.deepEqual(Object.keys(env.envelope), [
    'format', 'envelopeVersion', 'scenarioId', 'schemaVersion', 'ruleVersion', 'rngVersion',
    'tick', 'revision', 'savedAt', 'checksum', 'stateText',
  ]);
  assert.equal(env.envelope.stateText, Realtime.serializeState(w));
  assert.equal(env.checksum, Realtime.hashWorld(w));
  assert.equal(env.envelope.tick, 400);
  const back = Storage.readSave(env.text);
  assert.equal(back.ok, true, back.reason);
  assert.equal(Realtime.hashWorld(back.world), Realtime.hashWorld(w));
  assert.deepEqual(back.world.rngState, w.rngState);
  assert.equal(Storage.makeEnvelope({ not: 'a world' }).code, 'invalid_world');
});

test('壞檔、舊 slot 與未知版本都以明確碼拒絕', () => {
  const w = worldAt(400);
  const env = envelopeOf(w);
  const edit = (fn) => { const o = JSON.parse(env.text); fn(o); return JSON.stringify(o); };
  const reseal = (o) => { o.checksum = State.sha256Hex(o.stateText); };
  const slotWorld = fs.readFileSync(path.join(__dirname, 'fixtures', 'new-world.json'), 'utf8');
  const cases = [
    ['no_data', null],
    ['invalid_json', '{"format":'],
    ['unknown_format', '[1,2]'],
    ['unknown_format', edit((o) => { o.format = 'guwu'; })],
    ['legacy_slot_save', slotWorld],
    ['legacy_slot_save', edit((o) => { o.scenarioId = 'slice-14'; o.schemaVersion = 4; o.ruleVersion = 3; })],
    ['missing_envelope', Realtime.serializeState(w)],
    ['unsupported_envelope_version', edit((o) => { o.envelopeVersion = 2; })],
    ['bad_envelope', edit((o) => { o.extra = 1; })],
    ['bad_envelope', edit((o) => { delete o.savedAt; })],
    ['unsupported_version', edit((o) => { o.rngVersion = 2; })],
    ['unsupported_version', edit((o) => { o.schemaVersion = 6; })],
    ['checksum_mismatch', edit((o) => { o.stateText = o.stateText.replace('"tick":400', '"tick":401'); })],
    ['inconsistent_state', edit((o) => {
      const s = JSON.parse(o.stateText);
      s.disciples.find((d) => d.id === PID).pos = { r: 4, c: 4 };
      o.stateText = State.canonicalize(s);
      reseal(o);
    })],
    ['envelope_mismatch', edit((o) => { o.tick = 399; })],
    ['envelope_mismatch', edit((o) => { o.revision += 1; })],
    ['noncanonical_state', edit((o) => { o.stateText = JSON.stringify(JSON.parse(o.stateText), null, 1); reseal(o); })],
  ];
  for (const [code, text] of cases) {
    const r = Storage.readSave(text);
    assert.equal(r.ok, false, `${code} 應該失敗`);
    assert.equal(r.code, code, `${code}：實得 ${r.code} ${r.reason}`);
  }
  assert.equal(Storage.readSave(env.text).ok, true);
});

// 六類正式邊界：存到假 localStorage，另一個分頁（不同 writerId）讀取並接續後推到 2700，和不中斷推進比對。
test('任意 tick 邊界存讀續玩：旅行／工作／恢復轉自主／人工 pending／突破停點／事件去重', async () => {
  const reference = worldAt(HORIZON);
  const boundaries = [
    ['旅行中', 1, (w) => w.activities.some((a) => a.status === 'traveling')],
    ['工作中', 35, (w) => w.activities.some((a) => a.status === 'working')],
    ['恢復轉自主', 348, (w) => w.activities.some((a) => a.kind === 'rest' && a.status === 'done' && a.completedTick === w.clock.tick)],
    ['事件去重（邀請已登記）', 1081, (w) => w.story.triggeredEventIds.includes('evt-invite-cand-1')],
    ['突破停點', 1176, (w) => w.disciples.some((d) => d.breakthroughs > 0)],
  ];
  for (const [label, tick, holds] of boundaries) {
    const before = worldAt(tick);
    assert.ok(holds(before), `${label}：tick ${tick} 不符合邊界條件`);
    const disk = fakeStorage();
    const writer = store(disk, 'tab-1');
    writer.open();
    const saved = await writer.save(envelopeOf(before));
    assert.equal(saved.ok, true, `${label}：${saved.reason}`);
    const reader = store(disk, 'tab-2');
    const seen = reader.open();
    assert.equal(seen.state, 'ok');
    const adopted = await reader.adopt(seen.pointer.raw);
    assert.equal(adopted.ok, true, adopted.reason);
    assert.equal(State.canonicalize(adopted.world), State.canonicalize(before), `${label}：讀回世界不同`);
    const after = advanceTo(adopted.world, HORIZON);
    assert.equal(Realtime.hashWorld(after), Realtime.hashWorld(reference), `${label}：續玩 hash 不同`);
    assert.deepEqual(after.rngState, reference.rngState, `${label}：續玩 rngState 不同`);
  }
});

test('人工 pending 存讀後續玩一致，同 id 重送不會再套用', async () => {
  const base = worldAt(1100);
  const cmd = { discipleId: PID, kind: 'gather-material', target: { tileId: 't-0-0' }, units: 1 };
  const ordered = dispatch(base, 'orderActivity', cmd, 'manual-1');
  assert.equal(ordered.ok, true, ordered.reason);
  const w = ordered.state;
  assert.equal(w.disciples.find((d) => d.id === PID).manualOrder.status, 'pending');
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  s.open();
  assert.equal((await s.save(envelopeOf(w))).ok, true);
  const loaded = Storage.readSave(disk.map.get(Storage.SLOT_KEYS.a));
  assert.equal(loaded.ok, true);
  const again = dispatch(loaded.world, 'orderActivity', cmd, 'manual-1');
  assert.equal(again.ok, true);
  assert.equal(again.duplicate, true);
  assert.equal(again.state.revision, w.revision);
  const straight = advanceTo(w, 1700);
  const resumed = advanceTo(loaded.world, 1700);
  assert.equal(Realtime.hashWorld(resumed), Realtime.hashWorld(straight));
  assert.deepEqual(resumed.rngState, straight.rngState);
});

test('雙槽輪流寫入，指標最後才切，上一份留作備份', async () => {
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  assert.equal(s.open().state, 'empty');
  const r1 = await s.save(envelopeOf(worldAt(100)));
  assert.deepEqual([r1.ok, r1.slot, r1.seq], [true, 'a', 1]);
  assert.deepEqual(disk.writes, [Storage.SLOT_KEYS.a, Storage.POINTER_KEY]);
  const r2 = await s.save(envelopeOf(worldAt(200)));
  assert.deepEqual([r2.slot, r2.seq], ['b', 2]);
  const r3 = await s.save(envelopeOf(worldAt(300)));
  assert.deepEqual([r3.slot, r3.seq], ['a', 3]);
  const view = s.inspect();
  assert.equal(view.state, 'ok');
  assert.equal(view.active, 'a');
  assert.equal(view.slots.a.result.envelope.tick, 300);
  assert.equal(view.slots.b.result.envelope.tick, 200);
  assert.deepEqual(JSON.parse(disk.map.get(Storage.POINTER_KEY)), { active: 'a', writerId: 'tab-1', seq: 3, revision: worldAt(300).revision, tick: 300 });
  for (const k of disk.map.keys()) assert.ok(KEYS.includes(k), `寫了不該寫的 key ${k}`);
});

test('寫槽、讀回或切指標失敗都不偽報成功，原 active 不受影響', async () => {
  for (const [label, setup, code] of [
    ['槽 quota', (d) => { d.failSet[Storage.SLOT_KEYS.b] = 'QuotaExceededError'; }, 'write_failed'],
    ['槽權限', (d) => { d.failSet[Storage.SLOT_KEYS.b] = 'SecurityError'; }, 'write_failed'],
    ['讀回不同', (d) => { d.mangle[Storage.SLOT_KEYS.b] = (v) => v.slice(0, -2); }, 'readback_mismatch'],
    ['切指標失敗', (d) => { d.failSet[Storage.POINTER_KEY] = 'QuotaExceededError'; }, 'pointer_write_failed'],
    ['指標讀回不同', (d) => { d.mangle[Storage.POINTER_KEY] = () => '{}'; }, 'pointer_readback_mismatch'],
  ]) {
    const disk = fakeStorage();
    const s = store(disk, 'tab-1');
    s.open();
    assert.equal((await s.save(envelopeOf(worldAt(100)))).ok, true);
    const pointerBefore = disk.map.get(Storage.POINTER_KEY);
    const activeBefore = disk.map.get(Storage.SLOT_KEYS.a);
    setup(disk);
    const r = await s.save(envelopeOf(worldAt(200)));
    assert.equal(r.ok, false, label);
    assert.equal(r.code, code, `${label}：${r.code}`);
    assert.equal(disk.map.get(Storage.SLOT_KEYS.a), activeBefore, `${label}：原 active 被改`);
    if (code !== 'pointer_readback_mismatch') assert.equal(disk.map.get(Storage.POINTER_KEY), pointerBefore, `${label}：指標被改`);
    if (code !== 'pointer_readback_mismatch') {
      const view = store(disk, 'probe').inspect();
      assert.equal(view.state, 'ok', label);
      assert.equal(view.slots[view.active].result.envelope.tick, 100, label);
    }
  }
});

test('讀取被擋或沒有 Web Locks 時不寫任何 key，仍可唯讀載入與匯出', async () => {
  const blocked = fakeStorage();
  blocked.failGet[Storage.POINTER_KEY] = 'SecurityError';
  const s = store(blocked, 'tab-1');
  s.open();
  const r = await s.save(envelopeOf(worldAt(100)));
  assert.equal(r.code, 'storage_error');
  assert.deepEqual(blocked.writes, []);

  const disk = fakeStorage();
  const writer = store(disk, 'tab-1');
  writer.open();
  await writer.save(envelopeOf(worldAt(100)));
  const writesBefore = disk.writes.length;
  const nolock = Storage.createStore({ storage: disk, locks: null, writerId: 'tab-2' });
  assert.equal(nolock.canWrite, false);
  const view = nolock.open();
  assert.equal(view.state, 'ok');
  assert.equal(view.slots.a.result.world.clock.tick, 100);
  assert.equal(nolock.readRaw(Storage.SLOT_KEYS.a).raw, disk.map.get(Storage.SLOT_KEYS.a));
  for (const p of [nolock.save(envelopeOf(worldAt(200))), nolock.adopt(view.pointer.raw), nolock.restore('a', view.pointer.raw)]) {
    assert.equal((await p).code, 'storage_unavailable');
  }
  const session = Storage.createSession(nolock);
  assert.equal((await session.request(worldAt(200), { manual: true })).code, 'storage_unavailable');
  assert.equal(disk.writes.length, writesBefore);
});

test('其他分頁的存檔要明確接續；外部改動後停寫，接管要在鎖內重讀', async () => {
  const disk = fakeStorage();
  const locks = fakeLocks();
  const one = store(disk, 'tab-1', locks);
  one.open();
  assert.equal((await one.save(envelopeOf(worldAt(100)))).ok, true);

  const two = store(disk, 'tab-2', locks);
  const seen = two.open();
  assert.equal(seen.state, 'ok');
  assert.equal(two.owned, false);
  assert.equal((await two.save(envelopeOf(worldAt(150)))).code, 'not_owner');

  // 確認期間 tab-1 又保存了一次：用舊指標接續會被拒絕
  assert.equal((await one.save(envelopeOf(worldAt(120)))).ok, true);
  assert.equal((await two.adopt(seen.pointer.raw)).code, 'external_change');
  const fresh = two.inspect();
  const adopted = await two.adopt(fresh.pointer.raw);
  assert.equal(adopted.ok, true);
  assert.equal(adopted.world.clock.tick, 120);
  const w2 = await two.save(envelopeOf(worldAt(150)));
  assert.equal(w2.ok, true);

  // tab-1 不知道 tab-2 已寫入：停寫，不覆蓋
  const before = snapshotKeys(disk);
  const blocked = await one.save(envelopeOf(worldAt(130)));
  assert.equal(blocked.code, 'external_change');
  assert.deepEqual(snapshotKeys(disk), before);
  // 明確接管：鎖內以當下指標為基線，寫 tab-2 那份的另一槽
  const taken = await one.save(envelopeOf(worldAt(130)), { takeover: true });
  assert.equal(taken.ok, true);
  const view = one.inspect();
  assert.equal(view.slots[view.active].result.envelope.tick, 130);
  assert.equal(view.slots[view.active === 'a' ? 'b' : 'a'].result.envelope.tick, 150);
});

test('active 或指標壞掉不當成沒有存檔；明確恢復備份後它成為 active，不被下一次保存覆寫', async () => {
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  s.open();
  await s.save(envelopeOf(worldAt(100))); // a
  await s.save(envelopeOf(worldAt(200))); // b（active）
  const backup = disk.map.get(Storage.SLOT_KEYS.a);
  const damaged = JSON.parse(disk.map.get(Storage.SLOT_KEYS.b));
  damaged.stateText = damaged.stateText.replace('"tick":200', '"tick":201');
  disk.map.set(Storage.SLOT_KEYS.b, JSON.stringify(damaged));
  const brokenRaw = disk.map.get(Storage.SLOT_KEYS.b);

  const t = store(disk, 'tab-2');
  const view = t.open();
  assert.equal(view.state, 'broken');
  assert.equal(view.slots.b.result.code, 'checksum_mismatch');
  assert.equal(view.slots.a.result.ok, true);
  const writes = disk.writes.length;
  for (const opt of [{}, { takeover: true }]) {
    assert.equal((await t.save(envelopeOf(worldAt(300)), opt)).ok, false);
  }
  assert.equal(disk.writes.length, writes);

  const restored = await t.restore('a', view.pointer.raw);
  assert.equal(restored.ok, true, restored.reason);
  assert.equal(restored.world.clock.tick, 100);
  assert.equal(restored.otherSlotBroken, true);
  assert.equal(JSON.parse(disk.map.get(Storage.POINTER_KEY)).active, 'a');
  // 下一次保存會寫到壞掉的 b：要明確確認；a（唯一可讀副本）不動
  const refused = await t.save(envelopeOf(worldAt(150)));
  assert.equal(refused.code, 'overwrite_broken_slot');
  assert.equal(disk.map.get(Storage.SLOT_KEYS.b), brokenRaw);
  const confirmed = await t.save(envelopeOf(worldAt(150)), { overwriteBroken: true });
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.slot, 'b');
  assert.equal(disk.map.get(Storage.SLOT_KEYS.a), backup);

  for (const [label, init] of [
    ['指標不是 JSON', { [Storage.POINTER_KEY]: '{', [Storage.SLOT_KEYS.a]: backup }],
    ['只剩資料槽沒有指標', { [Storage.SLOT_KEYS.a]: backup }],
    ['active 是未知版本', { [Storage.POINTER_KEY]: JSON.stringify({ active: 'a', writerId: 'x', seq: 1, revision: 0, tick: 0 }), [Storage.SLOT_KEYS.a]: backup.replace('"rngVersion":1', '"rngVersion":2') }],
  ]) {
    const d = fakeStorage(init);
    const u = store(d, 'tab-3');
    assert.equal(u.open().state, 'broken', label);
    const r = await u.save(envelopeOf(worldAt(300)));
    assert.equal(r.ok, false, label);
    assert.deepEqual(d.writes, [], `${label}：不該寫入`);
  }
  const unknown = fakeStorage({ [Storage.POINTER_KEY]: JSON.stringify({ active: 'a', writerId: 'x', seq: 1, revision: 0, tick: 0 }), [Storage.SLOT_KEYS.a]: backup.replace('"rngVersion":1', '"rngVersion":2') });
  assert.equal(store(unknown, 'tab-4').open().slots.a.result.code, 'unsupported_version');
});

test('保存工作階段：dirty 依 generation 與 revision；舊 generation 排隊的保存不寫入', async () => {
  const disk = fakeStorage();
  const locks = fakeLocks();
  const s = store(disk, 'tab-1', locks);
  s.open();
  const session = Storage.createSession(s, { now: () => '2026-10-19T00:00:00.000Z' });
  session.begin('new');
  const a = worldAt(200);
  assert.equal(session.isDirty(a), true);
  const r = await session.request(a, { reason: 'pause' });
  assert.equal(r.ok, true);
  assert.equal(session.isDirty(a), false);
  assert.equal((await session.request(a, { reason: 'pause' })).skipped, true);
  // 保存的是捕捉當下的那份：之後推進的世界仍是 dirty
  assert.equal(session.isDirty(worldAt(300)), true);
  assert.equal(session.status(worldAt(300)).saved.tick, 200);

  // 新局：即使 revision 相同也不同世界，仍是 dirty
  const other = advanceTo(Realtime.createWorld('rt-dev-001').state, 200);
  assert.equal(other.revision, a.revision);
  session.begin('new');
  assert.equal(session.isDirty(other), true);

  // 舊 generation 的保存排在鎖後面；換世界後輪到它也不寫
  const release = locks.hold();
  const queued = session.request(other, { reason: 'day' });
  session.begin('import');
  const writes = disk.writes.length;
  release();
  const q = await queued;
  assert.equal(q.code, 'stale_generation');
  assert.equal(disk.writes.length, writes);

  // 讀取既有存檔：以那一份為已保存基線
  session.begin('load', { revision: a.revision, tick: 200, slot: 'a' });
  assert.equal(session.isDirty(a), false);
  assert.equal(session.isDirty(worldAt(300)), true);
});

test('保存失敗或外部改動後停自動保存；手動保存成功才恢復', async () => {
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  s.open();
  const session = Storage.createSession(s);
  session.begin('new');
  assert.equal((await session.request(worldAt(100))).ok, true);
  disk.failSet[Storage.SLOT_KEYS.b] = 'QuotaExceededError';
  const failed = await session.request(worldAt(200));
  assert.equal(failed.code, 'write_failed');
  assert.equal(session.status(worldAt(200)).dirty, true);
  assert.equal(session.status(worldAt(200)).stopped.code, 'write_failed');
  const skipped = await session.request(worldAt(300));
  assert.equal(skipped.code, 'autosave_stopped');
  delete disk.failSet[Storage.SLOT_KEYS.b];
  assert.equal((await session.request(worldAt(300), { manual: true })).ok, true);
  assert.equal(session.status(worldAt(300)).stopped, null);

  assert.equal(session.noticeExternal(s.expectedRaw), false);
  assert.equal(session.noticeExternal('{"other":1}'), true);
  assert.equal((await session.request(worldAt(400))).code, 'autosave_stopped');
});

test('匯出檔名只用安全字元', () => {
  const w = worldAt(100);
  assert.equal(Storage.exportFileName(w), 'sect-chronicle-rt-dev-000-t100.json');
  assert.equal(Storage.exportFileName(Object.assign({}, w, { seed: '../a b' })), 'sect-chronicle-_a_b-t100.json');
});

// 審查 R1：壞槽覆寫確認不能只靠本頁記憶；重新整理（重建 store）後仍依槽內實際內容判斷。
test('恢復備份後重新整理再接續，覆寫壞槽仍要確認，原字串保留', async () => {
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  s.open();
  await s.save(envelopeOf(worldAt(100))); // a
  await s.save(envelopeOf(worldAt(200))); // b（active）
  const damaged = JSON.parse(disk.map.get(Storage.SLOT_KEYS.b));
  damaged.stateText = damaged.stateText.replace('"tick":200', '"tick":201');
  disk.map.set(Storage.SLOT_KEYS.b, JSON.stringify(damaged));
  const brokenRaw = disk.map.get(Storage.SLOT_KEYS.b);
  const t = store(disk, 'tab-2');
  const seen = t.open();
  assert.equal((await t.restore('a', seen.pointer.raw)).ok, true);

  // 重新整理：新的 store，讀取並接續 active（a）
  const reloaded = store(disk, 'tab-3');
  const view = reloaded.open();
  assert.equal(view.state, 'ok');
  assert.equal(view.active, 'a');
  assert.equal((await reloaded.adopt(view.pointer.raw)).ok, true);
  const refused = await reloaded.save(envelopeOf(worldAt(150)));
  assert.equal(refused.code, 'overwrite_broken_slot');
  assert.equal(disk.map.get(Storage.SLOT_KEYS.b), brokenRaw, '未確認前壞槽原字串保留');
  const takeover = await reloaded.save(envelopeOf(worldAt(150)), { takeover: true });
  assert.equal(takeover.code, 'overwrite_broken_slot', '接管不等於確認覆寫壞槽');
  const ok = await reloaded.save(envelopeOf(worldAt(150)), { overwriteBroken: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.slot, 'b');

  // 讀不到即將覆寫的槽：不能當空槽寫入
  const d2 = fakeStorage();
  const u = store(d2, 'tab-1');
  u.open();
  await u.save(envelopeOf(worldAt(100)));
  d2.failGet[Storage.SLOT_KEYS.b] = 'SecurityError';
  const writes = d2.writes.length;
  assert.equal((await u.save(envelopeOf(worldAt(200)))).code, 'storage_error');
  assert.equal(d2.writes.length, writes);
});

// 審查 R2：active 可讀時，壞掉的另一槽（或指標）也要有原始資料匯出入口。
test('存檔正常但另一槽損壞時，畫面仍提供該槽的原始資料匯出', async () => {
  const disk = fakeStorage();
  const s = store(disk, 'tab-1');
  s.open();
  await s.save(envelopeOf(worldAt(100))); // a
  await s.save(envelopeOf(worldAt(200))); // b（active）
  const clean = s.inspect();
  assert.equal(View.renderSavePanel(clean).includes('data-export-raw'), false, '兩槽都正常時不列');
  assert.equal(View.renderRawExports(clean, false), '');
  disk.map.set(Storage.SLOT_KEYS.a, '{"format":"sect-chronicle"');
  const view = s.inspect();
  assert.equal(view.state, 'ok');
  const panel = View.renderSavePanel(view);
  assert.ok(panel.includes('data-export-raw="a"'), panel);
  assert.ok(panel.includes('id="load-saved"'));
  assert.equal(View.renderRawExports(view, false), '<button type="button" data-export-raw="a">匯出槽 A原始資料</button>');
  // 沒有 Web Locks 時仍可唯讀匯出
  const nolock = Storage.createStore({ storage: disk, locks: null, writerId: 'tab-2' });
  const ro = nolock.open();
  assert.ok(View.renderSavePanel(ro).includes('data-export-raw="a"'));
  assert.ok(View.renderSavePanel(ro).includes('唯讀載入'));
  assert.equal(nolock.readRaw(Storage.SLOT_KEYS.a).raw, '{"format":"sect-chronicle"');
});
