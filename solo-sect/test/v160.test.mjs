import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, scoreActs, applyEff, actDef, GEN_COND, startBuild } from '../src/sim.mjs';
import { registry, freeSlot, reserve, durOf } from '../src/core.mjs';
import { invariants } from '../src/core.mjs';
import { buildFac } from '../src/sect.mjs';
import { save, load } from '../src/save.mjs';
import { FACILITIES, ACTIVITIES, SIG_ACTS } from '../src/data.mjs';
import { lruGet, CHUNK_CAP } from '../src/world.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };
const NEW = ['library', 'quiet', 'shrine', 'alchemy', 'clinic', 'guest', 'well', 'bell', 'watch'];
const built = (seed = 3) => { const s = createState(seed); tick(s); for (const id of NEW) s.fac[id].stage = 1; return s; };
const dis = (s) => s.ds.find((d) => d.role !== 'laborer');

test('v1.6 九座新建築都是資料：兩階段、有造價或聲望、建成後才登記活動', () => {
  for (const id of NEW) { const f = FACILITIES.find((x) => x.id === id); assert.ok(f && f.v16 && f.stages.length === 2, id); assert.equal(f.stages[0].offers.length, 0); assert.ok(f.stages[1].offers.length >= 1); }
  const s0 = createState(1); assert.ok(!registry(s0).some((r) => NEW.includes(r.fac)), '未建不登記');
  const s = built(); const R = registry(s);
  for (const [fac, act, cap] of [['library', 'study', 2], ['quiet', 'meditate', 2], ['alchemy', 'brew', 1], ['clinic', 'heal', 2], ['guest', 'host', 1], ['well', 'water', 2], ['bell', 'bell', 1], ['watch', 'watch', 1]])
    assert.equal(R.find((r) => r.fac === fac && r.act === act)?.cap, cap, `${fac}:${act}`);
});
test('預約表：丹房只有 1 個槽，第二人拿不到；釋放後可再拿', () => {
  const s = built(), [a, b] = s.ds; const k = freeSlot(s, 'alchemy', 'brew', a); assert.equal(k, 'alchemy:brew:0'); assert.ok(reserve(s, a, k));
  assert.equal(freeSlot(s, 'alchemy', 'brew', b), null); delete s.resv[k]; assert.equal(freeSlot(s, 'alchemy', 'brew', b), 'alchemy:brew:0');
});
test('藍圖：一般新建築可建；鎮派地不出現在藍圖、startBuild 拒絕', () => {
  const s = createState(2); tick(s); s.res.wood = 12; s.res.stone = 12; s.res.coin = 50; assert.ok(startBuild(s, 'well')); assert.ok(s.fac.well.site);
  assert.equal(startBuild(s, 'sig'), false);
});
test('效果：煉丹用藥材 2 得療傷丹 1；醫館先用丹、沒丹用藥、都沒有也能包紮', () => {
  const s = built(), d = dis(s); s.res.herb = 3; s.res.pill = 0; applyEff(s, d, ACTIVITIES.brew.eff, '煉丹'); assert.deepEqual([s.res.herb, s.res.pill], [1, 1]);
  d.hp = 20; applyEff(s, d, ACTIVITIES.heal.eff); assert.equal(d.hp, 65); assert.equal(s.res.pill, 0);
  d.hp = 20; applyEff(s, d, ACTIVITIES.heal.eff); assert.equal(d.hp, 45); assert.equal(s.res.herb, 0);
  d.hp = 20; applyEff(s, d, ACTIVITIES.heal.eff); assert.equal(d.hp, 32); assert.ok(s.res.herb >= 0 && s.res.pill >= 0);
});
test('效果：打水封頂於水缸；晨鐘全派加心情；守哨記時；祠堂加名聲', () => {
  const s = built(), d = dis(s); s.res.water = 11; applyEff(s, d, { res: { water: 2 } }); assert.equal(s.res.water, s.cap.water);
  const m = s.ds.map((o) => o.mood); applyEff(s, d, ACTIVITIES.bell.eff); s.ds.forEach((o, i) => assert.ok(o.mood >= Math.min(100, m[i])));
  applyEff(s, d, ACTIVITIES.watch.eff); assert.equal(s.watch, s.t); const r = s.rep || 0; applyEff(s, d, ACTIVITIES.worship.eff); assert.ok(s.rep > r);
});
test('條件：受傷才看醫館（需求層）；水滿不打水；藥材不足不煉丹', () => {
  const s = built(), d = dis(s); d.hp = 100; s.res.herb = 0; s.res.water = s.cap.water;
  let L = scoreActs(s, d).map((x) => x.act); assert.ok(!L.includes('heal') && !L.includes('water') && !L.includes('brew'));
  d.hp = 30; s.res.herb = 4; s.res.water = 0; const S = scoreActs(s, d); L = S.map((x) => x.act); assert.ok(L.includes('heal') && L.includes('water') && L.includes('brew'));
  assert.equal(S.find((x) => x.act === 'heal').layer, 'need'); assert.ok(GEN_COND.injured(s, d));
});
test('每日上限：祠堂一天 3 次後不再出現，換日重置', () => {
  const s = built(), d = dis(s); s.daily = { worship: { day: s.day, n: 3 } }; assert.ok(!scoreActs(s, d).some((x) => x.act === 'worship'));
  s.daily.worship.day = s.day - 1; assert.ok(scoreActs(s, d).some((x) => x.act === 'worship'));
});
test('七個門派的鎮派活動各自不同、建成鎮派建築才出現、效果照資料', () => {
  assert.equal(Object.keys(SIG_ACTS).length, 7); assert.equal(new Set(Object.values(SIG_ACTS).map((a) => a.name)).size, 7);
  for (const id of Object.keys(SIG_ACTS)) {
    const s = createState(4); tick(s); s.sect.id = id; const d = dis(s); assert.ok(!scoreActs(s, d).some((x) => x.act === 'sig'), id + ' 未建');
    buildFac(s, true); assert.equal(s.fac.sig.stage, 1); const S = scoreActs(s, d).find((x) => x.act === 'sig'); assert.ok(S, id + ' 已建'); assert.equal(S.why, SIG_ACTS[id].why);
    assert.equal(actDef(s, 'sig').name, SIG_ACTS[id].name); assert.equal(durOf(s, { act: 'sig', fac: 'sig' }), SIG_ACTS[id].dur);
    const before = JSON.stringify(s.res), r0 = s.rep || 0; applyEff(s, d, SIG_ACTS[id].eff, SIG_ACTS[id].name);
    if (SIG_ACTS[id].eff?.res) assert.notEqual(JSON.stringify(s.res), before, id); if (SIG_ACTS[id].eff?.rep) assert.ok(s.rep > r0);
  }
});
test('長跑：九座新建築＋鎮派建築全開 10 日，每 20 tick 不變式無違反、活動真的被做到', () => {
  const s = built(11); s.sect.id = 'gaibang'; buildFac(s, true); s.res.herb = 8; const seen = new Set();
  for (let i = 0; i < 10 * 4 * 600 && s.day <= 10; i++) { tick(s); for (const d of s.ds) if (d.task) seen.add(d.task.act); if (i % 20 === 0) assert.deepEqual(invariants(s), [], `tick ${i}`); }
  for (const a of ['study', 'worship', 'water', 'sig']) assert.ok(seen.has(a), a); assert.ok(Object.values(s.res).every((v) => v >= 0));
});
test('同種子全開建築 → 決定性', () => { const h = () => { const s = built(9); run(s, 900); return save(s); }; assert.equal(h(), h()); });
test('舊存檔（無水／丹／新設施）讀得回且自動補欄位；鎮派已建→鎮派地 stage 1', () => {
  const s = createState(6); tick(s); s.sect.fac = true; const o = JSON.parse(save(s)); delete o.res.water; delete o.res.pill; delete o.cap.water; for (const id of [...NEW, 'sig']) delete o.fac[id];
  const r = load(JSON.stringify(o)); assert.ok(r.ok); assert.equal(r.state.res.water, 0); assert.equal(r.state.cap.water, 12); assert.equal(r.state.fac.sig.stage, 1); assert.equal(r.state.fac.well.stage, 0);
});
test('藏經閣讓聽講快 25%；靜室打坐優先於外功場', () => {
  const s = createState(5); tick(s); const t0 = durOf(s, { act: 'learn', fac: 'hall' }); s.fac.library.stage = 1; assert.equal(durOf(s, { act: 'learn', fac: 'hall' }), t0 * 0.75);
  assert.equal(FACILITIES.find((f) => f.id === 'quiet').stages[1].medEase, 2);
});
test('區塊快取 LRU：上限 64、命中移到最新、踢最舊', () => {
  const m = new Map(); let made = 0; for (let i = 0; i < 200; i++) lruGet(m, 'k' + i, () => ++made);
  assert.equal(m.size, CHUNK_CAP); assert.equal(CHUNK_CAP, 64); assert.ok(!m.has('k0') && m.has('k199'));
  lruGet(m, 'k136', () => ++made); lruGet(m, 'new', () => ++made); assert.ok(m.has('k136') && !m.has('k137')); assert.equal(made, 201);
});
