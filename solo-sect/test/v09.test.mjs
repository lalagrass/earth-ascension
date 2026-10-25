import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, save, load, setOrder } from '../src/sim.mjs';
import { ARTS, TIERS, RULES_VERSION } from '../src/data.mjs';
import { tierOf, artMul, artById, gainArt, learnArt, artState, artTier, seedArts, moveMul, setFocus, artsSvg } from '../src/arts.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 10; i++) tick(s, 0.1); };
const mk = (root, personality = []) => seedArts({ root, personality, style: 'palm', skills: { palm: 0, leg: 0 }, moves: ['fist'] });

test('五階門檻：入門0 小成25 大成55 圓滿85 化境100', () => {
  assert.deepEqual(TIERS.map((t) => t[0]), [0, 25, 55, 85, 100]);
  assert.deepEqual([0, 24.9, 25, 60, 90, 100].map(tierOf), [0, 0, 1, 2, 3, 4]);
});
test('八門武學，前置都指向存在的武學', () => {
  assert.equal(ARTS.filter((a) => !a.secret).length, 8); for (const a of ARTS) for (const r of a.req) assert.ok(artById(r.art), a.id);
});
test('笨功夫：悟性低練凡階快、練高階慢；悟性高相反', () => {
  const lo = mk(1), hi = mk(5), fist = artById('basicFist'), wave = artById('wavePalm');
  assert.ok(artMul(lo, fist) > artMul(hi, fist)); assert.ok(artMul(hi, wave) > artMul(lo, wave));
});
test('憨厚：凡階 ×1.3、高階 ×0.8；灑脫：巧系 +10%；勤奮：拙系 +10%', () => {
  const f = artById('basicFist'), w = artById('whirlLeg');
  assert.ok(Math.abs(artMul(mk(3, ['honest']), f) / artMul(mk(3), f) - 1.3) < 1e-9);
  assert.ok(Math.abs(artMul(mk(3, ['honest']), w) / artMul(mk(3), w) - 0.8) < 1e-9);
  assert.ok(Math.abs(artMul(mk(3, ['free']), w) / artMul(mk(3), w) - 1.1) < 1e-9);
  assert.ok(Math.abs(artMul(mk(3, ['diligent']), f) / artMul(mk(3), f) - 1.1) < 1e-9);
});
test('悟性門檻：風雷掌腿需悟性3，悟性2只能練到小成', () => {
  const d = mk(2); d.arts.wavePalm = { xp: 60 }; d.arts.whirlLeg = { xp: 60 }; learnArt(d, 'fengLei'); d.focus = 'fengLei';
  for (let i = 0; i < 20000; i++) gainArt(d, 5);
  assert.equal(artTier(d, 'fengLei'), 1); assert.ok(d.arts.fengLei.xp < 55); assert.match(artState(d, artById('fengLei')).why, /悟性不足/);
  const e = mk(3); e.arts.wavePalm = { xp: 60 }; e.arts.whirlLeg = { xp: 60 }; learnArt(e, 'fengLei'); Object.assign(e.arts.fengLei, { bt1: true, bt2: true }); e.focus = 'fengLei'; for (let i = 0; i < 20000; i++) gainArt(e, 5);
  assert.equal(artTier(e, 'fengLei'), 4);
});
test('前置未達：鎖住並說明；達成後成為可求學，學會開出招式', () => {
  const d = mk(3); assert.equal(artState(d, artById('pushPalm')).st, 'locked'); assert.match(artState(d, artById('pushPalm')).why, /基礎拳小成/);
  d.arts.basicFist.xp = 30; const a = gainArt(d, 0); assert.ok(a); learnArt(d, d.pendingArt);
  d.pendingArt = null; d.arts.basicFist.xp = 30; let n = 0; while (!d.arts.pushPalm && n++ < 5) { const x = gainArt(d, 0); if (x) learnArt(d, x.id); }
  assert.ok(d.arts.pushPalm && d.moves.includes('push'));
});
test('階數加傷害：圓滿 ×1.3，再乘圓滿效果 ×1.15', () => { const d = mk(3); d.arts.basicFist.xp = 90; assert.ok(Math.abs(moveMul(d, 'fist') - 1.3 * 1.15) < 1e-9); });
test('模擬中練功：主角掌法學到推山掌，熟練累積；專修可指定', () => {
  const s = createState(9); s.res.food = 99; setOrder(s, 'hero', 'train'); run(s, 600); setOrder(s, 'hero', null); run(s, 400);
  const h = s.ds[0]; assert.ok(h.arts.basicFist.xp > 25); assert.ok(h.arts.pushPalm, Object.keys(h.arts).join()); assert.ok(h.moves.includes('push'));
  assert.ok(setFocus(s, 'hero', 'pushPalm')); assert.equal(h.focus, 'pushPalm'); assert.match(artsSvg(h), /<svg/);
});
test('創派三人有根骨；新特質在人才池', () => {
  const s = createState(1); assert.deepEqual(s.ds.slice(0, 3).map((d) => d.root), [3, 4, 2]);
});
test('v0.85 舊檔：招式轉成武學、補根骨，規則 0.9', () => {
  const s = createState(4); const o = JSON.parse(save(s)); o.rules = '0.85';
  for (const d of o.ds) { delete d.arts; delete d.root; delete d.pendingArt; delete d.focus; d.skills.palm = 40; d.moves = ['fist', 'push']; d.pendingMove = 'wave'; }
  const r = load(JSON.stringify(o)); assert.equal(r.ok, true); const m = r.state; assert.equal(m.rules, RULES_VERSION);
  const h = m.ds[0]; assert.equal(h.root, 3); assert.ok(h.arts.pushPalm && h.arts.basicFist.xp >= 25); assert.equal(h.pendingArt, 'wavePalm');
  for (let i = 0; i < 400; i++) tick(m);
});
