// v1.45 review fix：GPT review（reviewed 77e1b2d）每條發現一個反例回歸
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startBuild, setOrder, save, load } from '../src/sim.mjs';
import { RULES_VERSION } from '../src/data.mjs';
import { removeDisciple, succeed, heirs } from '../src/gen.mjs';
import { invariants, whAvail } from '../src/lifecycle.mjs';
import { heroCard } from '../src/start-ui.mjs';
import { likesOf, FOODS, DRINKS } from '../src/v10.mjs';
const mk = (seed = 7) => { const s = createState(seed); tick(s); return s; };
const total = (s, k) => s.res[k] + s.ds.reduce((a, d) => a + (d.carry?.[k] || 0), 0) + Object.values(s.fac).reduce((a, f) => a + (f.site?.delivered[k] || 0), 0);

test('P1-1 倉庫雙重預留：1 木 3 人同時取料，庫存不為負、木料守恆', () => {
  const s = mk(); s.res.wood = 1; s.res.coin = 99; assert.ok(startBuild(s, 'dorm'));
  for (const d of s.ds.slice(0, 3)) { d.needs.energy = 100; d.needs.hunger = 100; setOrder(s, d.id, 'build'); }
  const w0 = total(s, 'wood');
  for (let i = 0; i < 4 * 60; i++) { tick(s); assert.deepEqual(invariants(s), [], `t=${s.t}`); assert.ok(s.res.wood >= 0); }
  const fetchers = s.ds.filter((d) => d.task?.act === 'build' && d.task.phase === 'fetch').length; assert.ok(fetchers <= 1);
  assert.ok(total(s, 'wood') >= w0 - 0 && total(s, 'wood') <= w0 + 50); // 只會因砍柴增加
});
test('P1-1 取料原子驗證：倉存被別處用掉時只拿得到現有量，差額釋放', () => {
  const s = mk(); s.res.wood = 3; s.res.coin = 99; startBuild(s, 'dorm'); const site = s.fac.dorm.site, d = s.ds[0];
  site.reserved.wood = 3; d.task = { act: 'build', fac: 'dorm', phase: 'fetch', mat: 'wood', reservedAmt: 3, node: 'court' }; d.path = []; d.order = null;
  s.res.wood = 1; tick(s);
  assert.ok(s.res.wood >= 0); assert.equal(d.carry?.wood ?? 0, 1); assert.equal(site.reserved.wood, d.carry?.wood ?? 0); assert.equal(whAvail(s, 'wood') >= 0, true);
});
test('P1-2 移出切磋中的對手：tick 不拋錯、存活者任務清掉', () => {
  const s = mk(); const [, a, b] = s.ds; a.adult = b.adult = true;
  a.task = { act: 'spar', fac: 'yard', node: 'yard', phase: 'do', partner: b.id, timer: 0 }; b.task = { act: 'spar', fac: 'yard', node: 'yard', phase: 'do', partner: a.id, timer: 0 }; a.path = []; b.path = [];
  assert.ok(removeDisciple(s, b, '離開'));
  assert.doesNotThrow(() => { for (let i = 0; i < 20; i++) tick(s); });
  assert.notEqual(a.task?.partner, b.id); assert.deepEqual(invariants(s), []);
});
test('P1-2 移出手上搬 2 木的人：木料退回倉、工地預留歸零、總量守恆', () => {
  const s = mk(); s.res.wood = 4; s.res.coin = 99; startBuild(s, 'dorm'); const site = s.fac.dorm.site, c = s.ds[1];
  s.res.wood = 4; c.carry = { wood: 2 }; site.reserved.wood = 2; c.task = { act: 'build', fac: 'dorm', phase: 'deliver', mat: 'wood', reservedAmt: 0, node: 'dorm' };
  const w0 = total(s, 'wood'); removeDisciple(s, c, '離開');
  assert.equal(total(s, 'wood'), w0); assert.equal(s.res.wood, 6); assert.equal(site.reserved.wood, 0); assert.deepEqual(invariants(s), []);
});
test('P1-3 衣缽傳給一般內門（林師姐）：主角卡可正常投影', () => {
  const s = mk(); const h = s.ds.find((d) => d.id === 'hero'), k = Object.keys(h.arts)[0]; h.arts[k].guizhen = true;
  const lin = s.ds.find((d) => d.name === '林師姐'); assert.ok(heirs(s).includes(lin));
  const r = succeed(s, lin.id, k); assert.ok(r.ok, r.why);
  const n = s.ds.find((d) => d.id === 'hero'); assert.ok(n.values && typeof n.values === 'object'); assert.equal(n.wexin, 0);
  let html; assert.doesNotThrow(() => { html = heroCard(s); }); assert.ok(html.includes('林師姐'));
  assert.doesNotThrow(() => { for (let i = 0; i < 40; i++) tick(s); });
});
test('P2-1 煮飯耗力依灶的實際時長：一拍只扣一點點', () => {
  const s = mk(); const d = s.ds[1]; s.res.veg = 2; s.resv[`stock:veg:${d.id}`] = d.id; d.needs.energy = 80; d.needs.hunger = 100; d.order = null;
  d.task = { act: 'cook', fac: 'kitchen', node: 'kitchen', phase: 'do', timer: 0, resv: [`stock:veg:${d.id}`] }; d.path = [];
  tick(s); assert.ok(d.needs.energy > 79 && Number.isFinite(d.needs.energy), `energy=${d.needs.energy}`);
});
test('P2-2 未來規則版本拒讀、原檔不變', () => {
  const s = mk(); const o = JSON.parse(save(s)); o.rules = '99.0'; const str = JSON.stringify(o);
  const r = load(str); assert.equal(r.ok, false); assert.match(r.err, /規則版本/); assert.equal(JSON.parse(str).rules, '99.0');
  o.rules = 'banana'; assert.equal(load(JSON.stringify(o)).ok, false);
  o.rules = RULES_VERSION; assert.equal(load(JSON.stringify(o)).ok, true);
  o.rules = '1.4'; const r2 = load(JSON.stringify(o)); assert.ok(r2.ok); assert.deepEqual(r2.state.migSteps, ['1.45', '1.5']);
});
test('外觀：堂弟（與所有人）的喜好不會是 undefined', () => {
  const s = mk(); for (const d of s.ds) { delete d.likes; const L = likesOf(d); assert.ok(FOODS.includes(L.food) && DRINKS.includes(L.drink), `${d.name} ${L.drink}`); }
  for (let i = 0; i < 500; i++) { const L = likesOf({ id: 'x' + i, name: 'n' + i, personality: [] }); assert.ok(DRINKS.includes(L.drink)); }
});
