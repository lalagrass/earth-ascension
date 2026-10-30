// loop2 M2：菜園木柵——耐久、野豬／山賊先打柵、自主修柵
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, scoreActs } from '../src/sim.mjs';
import { DAY } from '../src/data.mjs';
import { FENCE, buildFence, canBuildFence, repairScore } from '../src/fence.mjs';
import { T, raidResolve } from '../src/threat.mjs';

const H = { think: () => {} };
const run = (s, secs) => { for (let i = 0; i < secs / 0.25; i++) tick(s, 0.25); };
const logs = (s) => (s.log || []).map((x) => (typeof x === 'string' ? x : x.msg || x.text || JSON.stringify(x))).join('\n');
const bandit = (s, pts = 80) => { T(s).pending = { n: 1, pts, demand: 999, p: 0, at: s.t, until: s.t + 999, day: s.day }; return raidResolve(s, 1, H); };

test('沒築柵：預設不存在、不出現修柵選項', () => {
  const s = createState(1); run(s, 120);
  assert.equal(s.fence, undefined);
  for (const d of s.ds) assert.ok(!scoreActs(s, d).some((o) => o.act === 'repair'));
});

test('築柵：木頭不夠被擋；夠就扣 6 木、滿耐久；不能重築', () => {
  const s = createState(1); s.res.wood = 5;
  assert.equal(canBuildFence(s).ok, false); assert.equal(buildFence(s).ok, false); assert.equal(s.fence, undefined);
  s.res.wood = 10; assert.equal(buildFence(s).ok, true);
  assert.equal(s.res.wood, 4); assert.equal(s.fence.hp, FENCE.max);
  assert.equal(buildFence(s).ok, false);
});

test('野豬下山：有柵先撞柵、菜不被拱；沒柵照舊拱菜', () => {
  const mk = (fence) => { const s = createState(2); s.res.wood = 20; if (fence) buildFence(s); s.plots.forEach((p) => { p.st = 'ripe'; }); s.raidT = 1e6; return s; };
  const a = mk(true); let n = 0; while (!a.fence.hits && n++ < 4000) tick(a, 0.25);
  assert.ok(a.fence.hits >= 1, '野豬應該撞到柵'); assert.equal(a.fence.hp, FENCE.max - FENCE.boarDmg);
  assert.match(logs(a), /撞上菜園木柵/); assert.doesNotMatch(logs(a), /拱壞/);
  const b = mk(false); n = 0; while (!/拱壞|沒找到吃的/.test(logs(b)) && n++ < 4000) tick(b, 0.25);
  assert.match(logs(b), /拱壞/);
});

test('山賊迎戰落敗：柵撐住就不搶不傷；柵被破才照舊損失', () => {
  const grow = (s) => { s.day = 20; s.res.coin = 100; s.res.food = 50; return s; };
  const a = grow(createState(1)); a.res.wood = 10; buildFence(a);
  const r = bandit(a); assert.equal(r.win, false); assert.equal(r.held, true);
  assert.equal(a.res.coin, 100); assert.equal(a.res.food, 50); assert.equal(r.hurt, null);
  assert.equal(a.fence.hp, FENCE.max - Math.max(FENCE.bandit.min, Math.round(80 * FENCE.bandit.k)));
  const b = grow(createState(1)); b.res.wood = 10; buildFence(b); b.fence.hp = 5;
  const r2 = bandit(b); assert.equal(r2.held, undefined); assert.equal(b.fence.hp, 0); assert.equal(b.fence.broken, 1); assert.ok(b.res.coin < 100);
  const c = grow(createState(1)); const r3 = bandit(c); assert.equal(r3.held, undefined); assert.ok(c.res.coin < 100);
});

test('自主修柵：受損且有木頭，弟子會自己去修；沒木頭就不修', () => {
  const s = createState(1); s.res.wood = 20; buildFence(s); s.fence.hp = 10; s.res.food = 40;
  let n = 0; while (!s.fence.repaired && n++ < (DAY * 2) / 0.25) tick(s, 0.25);
  assert.ok(s.fence.repaired >= 1, '兩日內應該有人修柵'); assert.ok(s.fence.hp > 10);
  const z = createState(1); z.res.wood = 6; buildFence(z); z.fence.hp = 10;
  for (const d of z.ds) assert.equal(repairScore(z, d), 0);
});
