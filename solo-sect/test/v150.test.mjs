// v1.5 新模擬核心：登錄表、統一預約、工序、遲滯/厭倦、巡山召回、結構化狀態、解鎖守門
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition, recallExpedition, cancelTask } from '../src/sim.mjs';
import { RULES_VERSION, DAY, NODES } from '../src/data.mjs';
import { registry, slotCap, freeSlot, stepsOf, nextStep, CORE, boredMul } from '../src/core.mjs';
import { invariants } from '../src/lifecycle.mjs';
import { statusOf } from '../src/status.mjs';
import { canExpedition } from '../src/expedition.mjs';
import { openExp } from '../src/slice.mjs';
import { migrate, save, load } from '../src/save.mjs';
const run = (s, n) => { for (let i = 0; i < n; i++) tick(s); };

test('登錄表：設施階段宣告 offers/容量/時長；床位＝beds、灶位 1', () => {
  const s = createState(1); const R = registry(s);
  const hallRest = R.find((r) => r.fac === 'hall' && r.act === 'rest'); assert.equal(hallRest.cap, 3);
  const cook = R.find((r) => r.act === 'cook'); assert.equal(cook.cap, 1); assert.equal(cook.dur, 12);
  assert.equal(R.find((r) => r.act === 'train').cap, Infinity); assert.equal(slotCap(s, 'dorm', 'rest'), 1);
});
test('統一預約：床位不超收，滿了打地鋪（明確標記）', () => {
  const s = createState(2); run(s, 4);
  for (const d of s.ds) { cancelTask(s, d, 'test'); d.needs.energy = 5; d.order = null; }
  run(s, 2); const rest = s.ds.filter((d) => d.task?.act === 'rest');
  const inBed = rest.filter((d) => !d.task.floor && d.task.fac === 'hall').length; assert.ok(inBed <= 3, `hall ${inBed}`);
  if (rest.length > 3) assert.ok(rest.some((d) => d.task.floor));
  assert.deepEqual(invariants(s), []);
});
test('統一預約：菜畦一格一人；取消即釋放', () => {
  const s = createState(3); run(s, 2); const d = s.ds[1]; cancelTask(s, d, 'x');
  s.resv['plot:0'] = 'someone-else'; assert.notEqual(freeSlot(s, 'kitchen', 'cook', d), null);
  d.task = { act: 'farm', resv: ['plot:1'] }; s.resv['plot:1'] = d.id; cancelTask(s, d, 'x'); assert.equal(s.resv['plot:1'], undefined);
});
test('工序：搬料途中取消不瞬移，料在手上走回院倉', () => {
  const s = createState(4); s.fac.dorm.site = { need: { wood: 6, stone: 0 }, delivered: { wood: 0, stone: 0 }, reserved: { wood: 3, stone: 0 }, work: 0, workNeed: 18 };
  const d = s.ds[1]; d.at = 'dorm'; d.pos = [...NODES.dorm]; d.path = []; d.task = { act: 'build', fac: 'dorm', phase: 'deliver', mat: 'wood', node: 'dorm' }; d.carry = { wood: 3 }; const w0 = s.res.wood;
  s.fac.dorm.site.reserved.wood = 3; cancelTask(s, d, '召回'); assert.equal(s.res.wood, w0, '沒瞬移入庫'); assert.deepEqual(d.carry, { wood: 3 }); assert.equal(s.fac.dorm.site.reserved.wood, 0);
  run(s, 1); assert.equal(d.task?.act, 'deliver'); let i = 0; while (d.carry && i++ < 2000) tick(s); assert.ok(!d.carry); assert.ok(s.res.wood >= w0 + 3 || s.res.wood === s.cap.wood);
});
test('工序清單：stepsOf 標出 now/next，下一步是真的排著的工序', () => {
  const t = { act: 'chop', phase: 'go' }; assert.deepEqual(stepsOf(t).map((x) => x.state), ['now', 'next', 'next']); assert.equal(nextStep(t), '動手');
  t.phase = 'do'; assert.equal(nextStep(t), '送回院倉'); t.phase = 'return'; assert.equal(nextStep(t), null);
});
test('需求遲滯：≤30 想睡，到 80 前一直優先歇息', () => {
  const s = createState(5); run(s, 2); const d = s.ds[1]; cancelTask(s, d, 'x'); d.needs.energy = 25; run(s, 1); assert.ok(d.tired); assert.equal(d.task?.act, 'rest');
  assert.equal(d.decision.layer, 'need'); d.needs.energy = 60; cancelTask(s, d, 'x'); run(s, 1); assert.ok(d.tired, '60 仍在遲滯區'); assert.equal(d.task?.act, 'rest');
  d.needs.energy = 82; cancelTask(s, d, 'x'); run(s, 1); assert.ok(!d.tired);
});
test('厭倦：休閒做完 60 秒內吸引力 ×0.3', () => {
  const s = createState(6); const d = s.ds[1]; d.bored = { leisure: s.t }; assert.equal(boredMul(s, d, 'leisure'), CORE.boredMul); assert.equal(boredMul(s, d, 'train'), 1);
  s.t += 61; assert.equal(boredMul(s, d, 'leisure'), 1);
});
test('巡山解鎖守門：未解鎖不能派；黃昏試煉後可派（章節不會第一天就記）', () => {
  const s = createState(7); assert.equal(canExpedition(s, ['hero']).ok, false); assert.match(canExpedition(s, ['hero']).why, /解鎖/);
  openExp(s); assert.equal(canExpedition(s, ['hero']).ok, true);
});
test('巡山召回（A2）：從目前距離往回走、戰利品保留、決定性', () => {
  const go = () => { const s = createState(8); run(s, 1); s.res.food = 20; startExpedition(openExp(s), ['hero'], { thr: 0.3 }); let i = 0; while (s.exp && s.exp.dist < 60 && i++ < 20000) tick(s);
    const d0 = s.exp.dist, loot = { ...s.exp.loot }; assert.ok(recallExpedition(s)); i = 0; while (s.exp.phase !== 'back' && i++ < 400) tick(s); assert.equal(s.exp.phase, 'back'); assert.equal(s.exp.backPos, s.exp.dist); assert.ok(s.exp.dist >= d0);
    for (const [k, v] of Object.entries(loot)) assert.ok((s.exp.loot[k] || 0) >= v); assert.equal(statusOf(s, s.ds[0]).layer, '巡山'); i = 0; while (s.exp && i++ < 40000) tick(s); return s.lastExp; };
  const a = go(), b = go(); assert.match(a.reason, /召回/); assert.deepEqual(a, b);
});
test('狀態層讀結構化 decision；v1.45 事件誤分級修正', async () => {
  const s = createState(9); run(s, 40); const d = s.ds.find((x) => x.task && x.decision); const x = statusOf(s, d); assert.ok(x.layer); d.reason = '精力 累 餓 入夜（亂寫）'; d.decision = { layer: 'trait', act: d.task.act }; assert.equal(statusOf(s, d).layer, '性格');
  const { tierOf } = await import('../src/events.mjs'); assert.equal(tierOf('本門新紀錄 300 步'), 'mid'); assert.equal(tierOf('重傷倒地'), 'mid'); assert.equal(tierOf('名俠來訪'), 'top');
});
test('1.5 版本＋1.45 舊檔一步遷移：菜畦 busy → 預約表；歇息補床位', () => {
  assert.ok(['1.5', '1.8', '1.85'].includes(RULES_VERSION)); const s = createState(10); run(s, 20); const o = JSON.parse(save(s)); o.rules = '1.45'; delete o.resv;
  const d = o.ds[1]; d.task = { act: 'farm', fac: 'veg', phase: 'go', plot: 2 }; o.plots[2].busy = d.id; const e = o.ds[2]; e.task = { act: 'rest', fac: 'hall', phase: 'do' }; delete d.tired;
  migrate(o); assert.deepEqual(o.migSteps, ['1.5', '1.8', '1.85']); assert.equal(o.resv['plot:2'], d.id); assert.ok(!('busy' in o.plots[2])); assert.ok(e.task.resv.length); assert.equal(typeof d.tired, 'boolean');
  const r = load(JSON.stringify({ ...o, rules: '1.45' })); assert.ok(r.ok);
});
test('長跑：10 日每拍不變式（含床位）', () => {
  const s = createState(11); openExp(s); for (let i = 0; s.t < DAY * 10; i++) { tick(s); if (i % 20 === 0) { const b = invariants(s); assert.deepEqual(b, [], `t=${s.t}`); } }
});
