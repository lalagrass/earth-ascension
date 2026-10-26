// v1.95：I-7 生態（巢穴＋擊殺壓力→族群上限，會回升）；戰報互斥欄位（BL-D07）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition } from '../src/sim.mjs';
import { DAY, ROUTE } from '../src/data.mjs';
import * as W from '../src/world.mjs';
import { reportText } from '../src/expedition.mjs';
import { migrate } from '../src/save.mjs';
import { openExp } from '../src/slice.mjs';

const run = (s, k, sec) => { for (let t = 0; t < sec; t += 1) W.popStep(s, 1); };
test('搗巢：上限減半 5 日後巢重築；同一巢毀期間不能再搗；不耗亂數', () => {
  const s = createState(3); tick(s); const n0 = s.rngN, m = W.POP.foot.max;
  assert.equal(W.capOf(s, 'foot'), m); assert.ok(W.denRaze(s, 'foot')); assert.equal(W.capOf(s, 'foot'), m * W.ECO2.denCut); assert.ok(!W.denRaze(s, 'foot'), '反例：巢已毀不重複計');
  s.t += W.ECO2.denDays * DAY + 1; assert.ok(!W.denDown(s, 'foot')); assert.equal(W.capOf(s, 'foot'), m); assert.equal(s.rngN, n0); assert.equal(s.pop.foot.razed, 1);
});
test('擊殺壓力壓低上限（最多 40%），每日衰減', () => {
  const s = createState(3); tick(s); W.popKill(s, 'wood', 30); assert.equal(s.pop.wood.n, 0); assert.ok(Math.abs(W.capOf(s, 'wood') - W.POP.wood.max * (1 - W.ECO2.killMax)) < 1e-9);
  const kp = s.pop.wood.kp; W.popStep(s, DAY); assert.ok(Math.abs(s.pop.wood.kp - kp * W.ECO2.decay) < 1e-9);
});
test('族群會回升：打到 0、巢毀也不會永久清空；巢在時回得比巢毀快', () => {
  const a = createState(3), b = createState(3); tick(a); tick(b); a.pop.slope.n = 0; b.pop.slope.n = 0; W.denRaze(b, 'slope');
  run(a, 'slope', DAY); run(b, 'slope', DAY); assert.ok(b.pop.slope.n > 0, '巢毀仍有遷入'); assert.ok(a.pop.slope.n > b.pop.slope.n);
  run(a, 'slope', 4 * DAY); assert.ok(a.pop.slope.n >= W.POP.slope.max * 0.6, `5 日內回到 60%：${a.pop.slope.n}`);
});
test('上限掉到現有數以下：族群逐步減少到上限（不瞬間歸零）', () => {
  const s = createState(3); tick(s); s.pop.foot.n = W.POP.foot.max; W.denRaze(s, 'foot'); W.popStep(s, W.POP.foot.regen); assert.equal(s.pop.foot.n, W.POP.foot.max - 1);
  run(s, 'foot', 2 * DAY); assert.equal(s.pop.foot.n, Math.floor(W.capOf(s, 'foot')));
});
const team = (s) => { tick(s); s.res.food = 20; for (const d of s.ds) { Object.assign(d.skills, { palm: 80, leg: 80, agility: 5 }); d.mood = 90; d.hp = 100; } return s.ds.slice(0, 2).map((d) => d.id); };
test('環被打到 0：遭遇照常（不採「打空就跳過」，見 BALANCE-v195），族群不會變負數', () => {
  const s = openExp(createState(7)), ids = team(s); for (const g of ROUTE) s.pop[g.id].n = 0; startExpedition(s, ids);
  for (let i = 0; i < 3000 && s.exp; i++) tick(s); assert.ok((s.exp?.encN || s.lastExp?.out?.enc || 0) > 0); for (const g of ROUTE) assert.ok(s.pop[g.id].n >= 0);
});
test('戰報互斥：遭遇＝擊倒＋驅離＋繞避＋其他；搗巢寫進戰報', () => {
  const s = openExp(createState(7)), ids = team(s); startExpedition(s, ids); for (let i = 0; i < 20000 && s.exp; i++) tick(s);
  const r = s.lastExp; assert.ok(r?.out, '有戰報'); const O = r.out; assert.equal(O.enc, O.knock + O.driven + O.evaded + O.other); assert.ok(O.enc > 0);
  assert.match(reportText(r), /戰果（互斥）/); if (r.razed.length) assert.match(reportText(r), /搗巢/);
  const sumK = Object.values(r.kills).reduce((a, b) => a + b, 0); assert.equal(O.knock, sumK);
});
test('舊檔 1.9→1.95：回補進度歸零、補 kp／den', () => {
  const s = createState(3); tick(s); const o = JSON.parse(JSON.stringify(s)); o.rules = '1.9'; for (const e of Object.values(o.pop)) { e.t = 99; delete e.kp; delete e.den; }
  migrate(o); assert.ok(o.migSteps.includes('1.95')); for (const e of Object.values(o.pop)) { assert.equal(e.t, 0); assert.equal(e.kp, 0); assert.equal(e.den, 0); }
});
