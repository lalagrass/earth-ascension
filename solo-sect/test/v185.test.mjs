// v1.85：月俸＋維護（超線性、封頂、寬限、兩次警告、最多一人離山、付清恢復）、市集限量遞增、丹藥販售／陳化、A10 義學、郭靖困難＋早期降龍掌
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, canRecruit, recruit, startSchoolTrip } from '../src/sim.mjs';
import { DAY, FACILITIES } from '../src/data.mjs';
import { UPKEEP, wageBill, wageN, facBill, billDue, settle, E, MARKET, priceOf, marketDo, marketWhy, agePills, PILL_AGE, SCHOOL, schoolWhy, salaried, econHtml } from '../src/economy.mjs';
import { HEROES } from '../src/hero-data.mjs';
import { GUOJING_EARLY } from '../src/hero.mjs';
import { moveMul } from '../src/arts.mjs';
import { migrate } from '../src/save.mjs';

const H = { rand: () => 0.5, cancelTask: () => {}, think: () => {}, removeDisciple: (s, d) => { s.ds = s.ds.filter((x) => x !== d); return true; }, gate: [0, 0] };
const withN = (s, n) => { const base = s.ds.find((d) => d.id !== 'hero'); s.ds = s.ds.filter((d) => d.id === 'hero'); for (let i = 0; i < n; i++) s.ds.push({ ...structuredClone(base), id: `x${i}`, role: 'inner', adult: true, mood: 50 + i }); return s; };
test('月俸比人數長得快（N^1.5）且封頂；外門半價以下、雜工不領', () => {
  const s = createState(3); const b = [2, 4, 8].map((n) => wageBill(withN(s, n)));
  assert.ok(b[1] / b[0] > 2 && b[2] / b[1] > 2, `超線性 ${b}`); assert.equal(wageBill(withN(s, 60)), UPKEEP.cap, '封頂');
  withN(s, 2); s.ds[1].role = 'outer'; assert.equal(wageN(s), 1 + UPKEEP.w.outer); s.ds[1].role = 'laborer'; assert.equal(wageN(s), 1);
});
test('寬限：第 10 日前不結算，之後每 5 日', () => {
  const s = createState(3); assert.equal(billDue(s, 5), false); assert.equal(billDue(s, 9), false); assert.equal(billDue(s, 10), true); assert.equal(billDue(s, 12), false); assert.equal(billDue(s, 15), true);
});
test('欠俸：兩次警告、第三次最多一人離山；付清就歸零（恢復路徑）', () => {
  const s = withN(createState(3), 4); s.res.coin = 0; s.day = 10; const n0 = s.ds.length;
  settle(s, H); assert.equal(E(s).warn, 1); settle(s, H); assert.equal(E(s).warn, 2); assert.equal(s.ds.length, n0, '兩次警告都沒人走');
  settle(s, H); assert.equal(s.ds.length, n0 - 1, '第三次走一人'); assert.equal(E(s).left, 1);
  for (let i = 0; i < 6; i++) settle(s, H); assert.equal(s.ds.length, n0 - 1, '反例：之後再欠也不會再走人（每案最多 1）');
  s.res.coin = 10000; settle(s, H); assert.equal(E(s).warn, 0, '付清歸零'); assert.equal(E(s).disrepair, false);
  const html = econHtml(s); assert.ok(!/欠俸/.test(html));
});
test('維護：付不出→失修、付清恢復；丹房與祠堂兩倍', () => {
  const s = createState(3); for (const f of FACILITIES) s.fac[f.id].stage = 0; s.fac.alchemy.stage = 1; s.fac.hall.stage = 1; assert.equal(facBill(s), UPKEEP.facPer * 3);
  withN(s, 0); s.res.coin = 0; settle(s, H); assert.equal(E(s).disrepair, true); s.res.coin = 999; settle(s, H); assert.equal(E(s).disrepair, false);
});
test('市集：每 5 日限量、同一期越買越貴、下一期補貨回原價', () => {
  const s = createState(3); s.day = 1; s.res.coin = 99999; const p0 = priceOf(s, 'herb'); marketDo(s, 'herb'); const p1 = priceOf(s, 'herb'); assert.ok(p1 > p0);
  for (let i = 1; i < MARKET.stock.herb; i++) assert.ok(marketDo(s, 'herb').ok); assert.match(marketWhy(s, 'herb'), /賣完/, '反例：限量'); assert.equal(marketDo(s, 'herb').ok, false);
  s.day = 6; assert.equal(priceOf(s, 'herb'), p0); assert.equal(marketWhy(s, 'herb'), null);
  const h0 = s.ds.find((d) => d.id === 'hero'); const m0 = moveMul(h0, 'fist'); assert.ok(marketDo(s, 'weapon').ok); const armed = s.ds.find((d) => d.weapon); assert.ok(armed); assert.ok((armed.powMul || 1) > 1);
  void m0;
});
test('丹藥：可賣（越賣越便宜、有上限），存丹 >10 每 5 日陳化 10%', () => {
  const s = createState(3); s.day = 1; s.res.pill = 3; s.res.coin = 0; const a = marketDo(s, 'pill'), b = marketDo(s, 'pill'); assert.ok(a.ok && b.ok && b.p < a.p); assert.equal(s.res.coin, a.p + b.p); assert.equal(s.res.pill, 1);
  s.res.pill = 20; s.day = 5; assert.equal(agePills(s), 2); assert.equal(s.res.pill, 18); s.day = 6; assert.equal(agePills(s), 0, '非結算日不陳化'); s.res.pill = PILL_AGE.keep; s.day = 10; assert.equal(agePills(s), 0, '反例：≤10 不陳化');
});
test('A10 下山義學：花錢派人下山一日，帶回的人不看名聲、仍要床位', () => {
  const s = createState(3); s.res.coin = 500; s.res.food = 50; for (let i = 0; s.t < 2 * DAY; i++) tick(s);
  const r = startSchoolTrip(s); assert.ok(r.ok, r.why); assert.ok(r.d.away); assert.match(schoolWhy(s), /正在山下/);
  const t0 = s.t; while (s.t < t0 + SCHOOL.dur + 1) tick(s); assert.ok(!r.d.away); assert.equal(E(s).pool.length, 1);
  s.rep = 0; const c = canRecruit(s); if (c.ok) { assert.ok(c.next.school); const n = s.ds.length; recruit(s); assert.equal(s.ds.length, n + 1); assert.equal(E(s).pool.length, 0); }
  else assert.match(c.why, /床位|存糧/, '反例：不看名聲，只會卡床位或糧');
});
test('郭靖：標為困難；前 20 日降龍掌傷害加成，之後消失', () => {
  const G = HEROES.find((h) => h.id === 'guojing'); assert.equal(G.hard, true); assert.match(G.tag, /困難/);
  const s = createState(3, { kind: 'template', id: 'guojing', askMajor: false }); const h = s.ds.find((d) => d.id === 'hero'); h.arts.xianglong = { xp: 10, last: 0 };
  tick(s); assert.equal(h.early?.art, 'xianglong'); const a = moveMul(h, 'jianlong'); s.t = GUOJING_EARLY.days * DAY + 1; tick(s); assert.equal(h.early, null); const b = moveMul(h, 'jianlong'); assert.ok(Math.abs(a / b - GUOJING_EARLY.mul) < 1e-9);
  const p = createState(3); tick(p); assert.ok(!p.ds.find((d) => d.id === 'hero')?.early, '反例：非郭靖開局沒有加成');
});
test('存檔遷移 1.85：補 econ、讀檔後給 5 日寬限', () => {
  const s = createState(3); const o = JSON.parse(JSON.stringify(s)); o.rules = '1.8'; delete o.econ; o.day = 22; const m = migrate(o); assert.ok(m.econ); assert.equal(m.econ.graceUntil, 27);
  assert.ok(salaried(s).every((d) => d.id !== 'hero'));
});
