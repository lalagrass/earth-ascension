import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, startBuild, togglePause, setOrder, save, load, hire, canHire, invite, canInvite, laborers, disciples, scoreActs, payday, capacity, MATS } from '../src/sim.mjs';
import { ECON, PLAIN, ROOT, RULES_VERSION, DAY } from '../src/data.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };
const withShed = (seed) => { const s = createState(seed); s.fac.shed.stage = 1; s.res.food = 60; s.res.coin = 20; return s; };

test('藍圖收集包：大廳要木＋石＋香火錢，香火錢不足不能立藍圖', () => {
  const s = createState(101); s.rep = 20; s.res.coin = 2; assert.equal(startBuild(s, 'hall'), false);
  s.res.coin = 6; assert.ok(startBuild(s, 'hall')); assert.equal(s.res.coin, 0); const v = s.fac.hall.site;
  assert.deepEqual(v.need, { wood: 12, stone: 6 }); assert.equal(s.ledger.out.coin, 6);
});
test('木石搬到工地料堆後才開工，完工；全程守恆不為負', () => {
  const s = createState(102); s.rep = 20; s.res.coin = 6; s.res.wood = 12; s.res.stone = 6; s.res.food = 99; startBuild(s, 'hall');
  for (let i = 0; i < 4 * 900 && s.fac.hall.stage === 0; i++) { tick(s); const v = s.fac.hall.site; if (!v) break;
    for (const k of MATS) { assert.ok(s.res[k] >= 0); assert.ok(v.delivered[k] + v.reserved[k] <= v.need[k]); }
    if (v.work > 0) assert.ok(v.delivered.wood >= 12 && v.delivered.stone >= 6, '料未齊就開工'); }
  assert.equal(s.fac.hall.stage, 1);
});
test('沒石頭時會有人去後山採石', () => {
  const s = createState(103); s.rep = 20; s.res.coin = 6; s.res.wood = 12; s.res.food = 99; startBuild(s, 'hall'); let q = 0;
  for (let i = 0; i < 4 * 300; i++) { tick(s); if (s.ds.some((d) => d.task?.act === 'quarry')) q++; } assert.ok(q > 0); assert.ok(s.fac.hall.stage === 1 || s.fac.hall.site.delivered.stone + s.res.stone > 0);
});
test('暫停工地：在途料退回院倉、料堆保留，總量守恆', () => {
  const s = createState(104); s.res.wood = 6; startBuild(s, 'dorm'); s.ds.forEach((d) => setOrder(s, d.id, 'build')); run(s, 8);
  const tot = () => s.res.wood + s.ds.reduce((a, d) => a + (d.carry?.wood || 0), 0) + s.fac.dorm.site.delivered.wood; const before = tot();
  const w0 = s.fac.dorm.site.work; togglePause(s, 'dorm'); assert.equal(s.fac.dorm.site.reserved.wood, 0); assert.equal(tot(), before); assert.ok(s.ds.every((d) => !d.carry));
  s.ds.forEach((d) => setOrder(s, d.id, null)); run(s, 60); assert.equal(s.fac.dorm.site.work, w0); assert.equal(s.fac.dorm.stage, 0);
  togglePause(s, 'dorm'); s.res.food = 99; run(s, 600); assert.equal(s.fac.dorm.stage, 1);
});
test('雇工：沒工寮不能雇；雇了扣香火錢與糧、有名字有性格有隱藏根骨', () => {
  const s = createState(105); s.res.coin = 20; assert.equal(canHire(s).ok, false); assert.match(canHire(s).why, /工寮/);
  s.fac.shed.stage = 1; const r = hire(s); assert.ok(r.ok); assert.equal(s.res.coin, 20 - ECON.hireCoin); assert.equal(r.d.role, 'laborer');
  assert.ok(r.d.name && r.d.personality.length === 2 && r.d.root >= 1 && !r.d.rootKnown); assert.equal(disciples(s).length, 3);
  hire(s); assert.equal(laborers(s).length, 2); assert.equal(canHire(s).ok, false); // 工寮 2 床
});
test('雇工只幹活不練武', () => {
  const s = withShed(106); const d = hire(s).d; for (let i = 0; i < 200; i++) { tick(s); for (const o of scoreActs(s, d)) assert.ok(!['train', 'learn', 'spar', 'cook', 'farm', 'forage', 'encourage'].includes(o.act), o.act); }
});
test('每日入帳與工錢；付不出兩日雇工離開且關係表清乾淨', () => {
  const s = withShed(107); s.res.coin = 4; hire(s); const id = laborers(s)[0].id; s.res.coin = 0; s.rep = 0;
  s.day = PLAIN.earlyDays + 1; // v2.1 照舊開局前 10 日另有早補；欠薪這條走之後的底數（聲望 0 時仍是入帳 2）
  payday(s); assert.equal(s.res.coin, 0); assert.equal(laborers(s).length, 1); // 入帳 2 付 2
  s.res.coin = -0; laborers(s)[0].unpaid = 1; s.res.coin = 0; s.rep = -10; payday(s);
  assert.equal(laborers(s).length, 0); assert.ok(!Object.keys(s.aff).some((k) => k.includes(id))); assert.ok(s.laborGone.includes(id)); assert.ok(s.ledgerPrev);
});
test('換日自動結帳：ledger 記入香火錢', () => { const s = createState(108); s.res.food = 99; run(s, DAY + 2); assert.equal(s.day, 2); assert.ok(s.ledgerPrev.day === 1); assert.ok(s.ledger.in.coin >= 2); });
test('共事揭露根骨；根骨夠＋好感夠才可邀入外門，入門後成弟子', () => {
  const s = withShed(109); s.res.wood = 0; s.res.stone = 0; const d = hire(s).d; assert.equal(d.name, '大柱'); assert.equal(canInvite(s, d.id).ok, false);
  s.res.wood = 10; s.res.coin += 10; startBuild(s, 'dorm'); s.fac.dorm.site.need.wood = 400; s.res.wood = 12;
  for (let i = 0; i < 4 * 2400 && !d.rootKnown; i++) { tick(s); s.res.food = 60; if (s.res.wood < 4) s.res.wood = 12; }
  assert.ok(d.rootKnown, `cowork ${d.cowork}`);
  for (const o of disciples(s)) { s.aff[`${o.id}>${d.id}`] = 30; } s.fac.dorm.stage = 2;
  const r = invite(s, d.id); assert.ok(r.ok, canInvite(s, d.id).why); assert.equal(d.role, 'outer'); assert.equal(laborers(s).length, 0); assert.equal(disciples(s).length, 4);
});
test('根骨平平的雇工不能邀入門', () => { const s = withShed(110); hire(s); const d = hire(s).d; d.rootKnown = true; d.root = 1; assert.match(canInvite(s, d.id).why, /不宜/); });
test('雇工讓施工更快', () => {
  const t = (n) => { const s = withShed(111); s.res.wood = 10; s.res.stone = 4; s.rep = 20; s.fac.dorm.stage = 1; for (let i = 0; i < n; i++) hire(s); s.fac.shed.stage = 2; for (let i = 0; i < n - 2; i++) hire(s); startBuild(s, 'dorm');
    let k = 0; while (s.fac.dorm.stage < 2 && k < 4 * 3000) { tick(s); k++; s.res.food = 60; } return k; };
  const a = t(0), b = t(2); assert.ok(b < a, `${b} vs ${a}`);
});
test('v0.7 舊存檔（工地 delivered 為數字、有人揹木中）可讀並繼續完工', () => {
  const s = createState(112); s.res.wood = 6; startBuild(s, 'dorm'); const o = JSON.parse(save(s));
  o.rules = '0.7'; delete o.res.stone; delete o.res.coin; delete o.cap.stone; delete o.fac.shed; delete o.fac.quarry; delete o.day; delete o.ledger; delete o.ledgerPrev; delete o.laborGone;
  o.fac.dorm.site = { need: { wood: 6 }, delivered: 2, reserved: 2, work: 0, workNeed: 18 }; o.res.wood = 2;
  o.ds[0].task = { act: 'build', fac: 'dorm', phase: 'deliver', reservedWood: 0, node: 'dorm' }; o.ds[0].carry = { wood: 2 }; for (const d of o.ds) delete d.role;
  const r = load(JSON.stringify(o)); assert.ok(r.ok); const n = r.state; assert.equal(n.migratedFrom, '0.7'); assert.equal(n.rules, RULES_VERSION);
  assert.equal(n.res.wood, 4); assert.deepEqual(n.fac.dorm.site.delivered, { wood: 2, stone: 0 }); assert.equal(n.fac.shed.stage, 0);
  n.res.food = 99; run(n, 600); assert.equal(n.fac.dorm.stage, 1);
});
test('30 日無頭長跑：有雇工、無負數、不卡死', () => {
  const s = withShed(113); hire(s); hire(s); s.rep = 25; s.res.wood = 12; s.res.stone = 6; s.res.coin = 10;
  for (let day = 0; day < 30; day++) { for (let i = 0; i < 4 * DAY; i++) tick(s); for (const k of ['wood', 'stone', 'coin', 'food', 'veg']) assert.ok(s.res[k] >= 0, `${k} ${s.res[k]}`);
    if (day === 2) startBuild(s, 'hall'); if (day === 10) startBuild(s, 'yard'); }
  assert.equal(s.fac.hall.stage, 1); assert.ok(s.ds.length >= 3);
});
