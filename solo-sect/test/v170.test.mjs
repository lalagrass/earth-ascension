// v1.7：活動評分純資料、菜庫／倉庫預留入預約表、遲滯推廣、宿慧入存檔、四大武道相剋
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startBuild, scoreActs, PRED, valOf, vegFree } from '../src/sim.mjs';
import { SCORE } from '../src/score-data.mjs';
import { ACTIVITIES, DAO } from '../src/data.mjs';
import { stockReserved, stockKey, STOCK_RESV, HYST, needStep } from '../src/core.mjs';
import { cancelTask, invariants, whReserved } from '../src/lifecycle.mjs';
import { save, load } from '../src/save.mjs';
import { suhuiOf, legacyBest, syncLegacy, autosave } from '../src/slice.mjs';
import { daoOf, counterMul } from '../src/expedition.mjs';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const runTo = (s, pred, n = 4 * 900) => { for (let i = 0; i < n; i++) { tick(s); const d = s.ds.find(pred); if (d) return d; } return null; };

test('SCORE 表：每列都對到真活動，述詞都存在；改表就改分數（規則在資料裡）', () => {
  for (const r of SCORE) { if (r.gen) continue; assert.ok(ACTIVITIES[r.act] || ['pass', 'encourage', 'chat', 'spar'].includes(r.act), r.act);
    for (const w of r.when || []) assert.equal(typeof PRED[w], 'function', w); for (const t of r.tiers || []) if (t.if) assert.equal(typeof PRED[t.if], 'function', t.if); }
  const row = SCORE.find((r) => r.act === 'learn'), old = row.v; const s = createState(5); const d = s.ds[0];
  const ctx = { s, d, n: d.needs }; assert.equal(valOf(80, ctx), 80); assert.equal(valOf({ lin: ['n.hunger', 100], mul: [0.5] }, { n: { hunger: 40 } }), 30);
  const eat = SCORE.find((r) => r.act === 'eat'), t0 = eat.tiers[0].v; try { eat.tiers[0].v = 777; const s2 = createState(5); s2.res.food = 5; const d2 = s2.ds[0]; d2.needs.hunger = 5; const sc = scoreActs(s2, d2); assert.ok(JSON.stringify(sc).includes('餓得發昏')); } finally { eat.tiers[0].v = t0; }
});
test('菜庫預留：煮飯任務握 stock:veg 鍵，vegFree 少 2；取消即釋放；s.vegRes 已不存在', () => {
  const s = createState(11); s.res.food = 0; const d = runTo(s, (o) => o.task?.act === 'cook' && o.task.phase !== 'done');
  assert.ok(d, '自然遊玩中有人去煮飯'); assert.equal(s.vegRes, undefined);
  assert.equal(s.resv[stockKey('veg', d)], d.id); assert.ok(d.task.resv.includes(stockKey('veg', d)));
  assert.equal(stockReserved(s, 'veg'), STOCK_RESV.cook.amt * s.ds.filter((o) => o.task?.act === 'cook' && o.task.phase !== 'done').length);
  assert.equal(vegFree(s), s.res.veg - stockReserved(s, 'veg'));
  const before = stockReserved(s, 'veg'); cancelTask(s, d, 'test'); assert.equal(s.resv[stockKey('veg', d)], undefined); assert.equal(stockReserved(s, 'veg'), before - 2);
  assert.deepEqual(invariants(s), []);
});
test('倉庫預留：取料任務握 stock:<料> 鍵，whReserved＝預約表推得的 reservedAmt', () => {
  const s = createState(3); s.res.wood = 8; startBuild(s, 'dorm'); const d = runTo(s, (o) => o.task?.act === 'build' && o.task.phase === 'fetch' && o.task.reservedAmt > 0);
  assert.ok(d); const k = d.task.mat; assert.equal(s.resv[stockKey(k, d)], d.id);
  const sum = s.ds.reduce((a, o) => a + (o.task?.act === 'build' && o.task.phase === 'fetch' && o.task.mat === k ? o.task.reservedAmt : 0), 0);
  assert.equal(whReserved(s, k), sum); assert.equal(whReserved(s, k, d), sum - d.task.reservedAmt); assert.deepEqual(invariants(s), []);
  s.resv['stock:wood:ghost'] = 'ghost'; assert.ok(invariants(s).some((x) => /ghost/.test(x)), '孤兒 stock 鍵會被不變式抓到');
});
test('舊檔（帶 vegRes、無 stock 鍵）讀入後自動補鍵', () => {
  const s = createState(11); s.res.food = 0; const d = runTo(s, (o) => o.task?.act === 'cook' && o.task.phase !== 'done'); assert.ok(d);
  const o = JSON.parse(save(s)); o.vegRes = 2; for (const k of Object.keys(o.resv)) if (k.startsWith('stock:')) delete o.resv[k]; for (const x of o.ds) if (x.task?.resv) x.task.resv = x.task.resv.filter((k) => !k.startsWith('stock:'));
  const r = load(JSON.stringify(o)); assert.ok(r.ok, r.err); assert.equal(r.state.vegRes, undefined); assert.equal(r.state.resv[`stock:veg:${d.id}`], d.id); assert.deepEqual(invariants(r.state), []);
});
test('遲滯推廣：餓昏旗 ≤15 亮、到 50 才熄；吃飯第一優先跟著旗走', () => {
  assert.equal(HYST.famished.on, 15); assert.equal(HYST.famished.off, 50);
  const d = { needs: { energy: 90, hunger: 10 } }; needStep(d); assert.equal(d.famished, true);
  d.needs.hunger = 35; needStep(d); assert.equal(d.famished, true, '35 仍在遲滯區'); d.needs.hunger = 50; needStep(d); assert.equal(d.famished, false);
  const s = createState(7); const x = s.ds[0]; s.res.food = 5; x.needs.hunger = 10; needStep(x); x.needs.hunger = 30; assert.ok(PRED.starving({ s, d: x, n: x.needs }));
  x.famished = false; assert.ok(!PRED.starving({ s, d: x, n: x.needs }));
});
test('宿慧入存檔：save 帶 legacy；開局取 localStorage／手動檔／自動檔最大；讀檔同步回 localStorage', () => {
  const s = createState(9); s.gen.suhui = 2; const str = save(s); assert.equal(JSON.parse(str).legacy.suhui, 2); assert.equal(suhuiOf(JSON.parse(str)), 2);
  const st = mem(); assert.equal(legacyBest(st), 0); st.setItem('solo-sect-save', str); assert.equal(legacyBest(st), 2, '手動檔');
  const st2 = mem(); s.gen.suhui = 3; autosave(st2, save(s), { day: 1, at: 1 }); assert.equal(legacyBest(st2), 3, '自動檔（無 meta.suhui 時解析檔案）');
  const st3 = mem(); autosave(st3, '{}', { day: 1, at: 1, suhui: 1 }); assert.equal(legacyBest(st3), 1, 'meta 快取');
  const st4 = mem(); st4.setItem('solo-sect-suhui', '1'); syncLegacy(st4, load(str).state); assert.equal(st4.getItem('solo-sect-suhui'), '2');
  s.gen.suhui = 9; assert.equal(suhuiOf(s), 3, '上限 3'); assert.equal(suhuiOf({ gen: { suhui: 0, suhuiStart: 2 } }), 2, '開局帶進來的宿慧也隨檔');
});
test('四大武道相剋環：破綻→蓄力→卸力→歸真→破綻，只 ±10%', () => {
  assert.equal(counterMul('破綻', '蓄力'), 1.1); assert.equal(counterMul('蓄力', '卸力'), 1.1); assert.equal(counterMul('卸力', '歸真'), 1.1); assert.equal(counterMul('歸真', '破綻'), 1.1);
  assert.equal(counterMul('蓄力', '破綻'), 0.9); assert.equal(counterMul('破綻', '卸力'), 1); assert.equal(counterMul('破綻', undefined), 1);
  assert.ok(DAO.up - 1 <= 0.1 + 1e-9 && 1 - DAO.down <= 0.1 + 1e-9);
  assert.equal(daoOf({ arts: {} }), '歸真'); assert.equal(daoOf({ arts: { basicFist: { xp: 5 }, pushPalm: { xp: 9 } } }), '蓄力'); assert.equal(daoOf({ arts: { wavePalm: { xp: 3 }, breath: { xp: 50 } } }), '破綻', '心法不算');
  for (const k of Object.keys(DAO.enemy)) assert.ok(DAO.ring.includes(DAO.enemy[k]));
});
