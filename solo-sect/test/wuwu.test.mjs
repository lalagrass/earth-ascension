/* #403 武學卡：同火候名功更強、悟性不改出手、前置比例、舊檔讀入 2.6、絕招按火候開。
   #404 六門絕活：打中、讓過、挨打各走武學上的 on，不靠武學 id。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARTS, RULES_VERSION } from '../src/data.mjs';
import { artById, moveMul, gainArt, openSpecials, unlockTechs, applyArtOn, artNoParry, qiOf, ART_ON_EVENTS } from '../src/arts.mjs';
import { curveMulOf } from '../src/artcard.mjs';
import { createState, load } from '../src/sim.mjs';

const hero = () => createState(3).ds.find((d) => d.id === 'hero');

test('每門都有五檔曲線；沒點名的武學與風雷掌腿同一條錨', () => {
  for (const a of ARTS) {
    assert.equal(a.curve?.length, 5, a.id);
    assert.equal(typeof a.growCap, 'number', a.id);
    assert.ok(Array.isArray(a.learn?.req), a.id);
  }
  assert.deepEqual(artById('rulai').curve, artById('fengLei').curve);
  assert.equal(artById('xianglong').curve[4], 98);
  assert.ok(curveMulOf(artById('xianglong').curve, 2) > curveMulOf(artById('fengLei').curve, 2));
});

test('同火候，降龍十八掌比同品的風雷掌腿更痛；改悟性或初學標記不改出手', () => {
  const d = hero();
  d.qi = 0;
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  d.arts.fengLei = { xp: 55, last: 0, bt1: true };
  assert.equal(artById('xianglong').grade, artById('fengLei').grade);
  assert.ok(moveMul(d, 'jianlong') > moveMul(d, 'storm'));
  d.wu = 1;
  const low = moveMul(d, 'jianlong');
  d.wu = 5;
  const high = moveMul(d, 'jianlong');
  assert.equal(low, high);
  d.early = { art: 'xianglong', mul: 1.35 };
  assert.equal(moveMul(d, 'jianlong'), high);
});

test('太極劍練功不得高過太極拳；沒有太極拳就不漲；劇情給更高的熟練不會被砍掉', () => {
  const d = hero();
  d.arts.taiji = { xp: 40, last: 0 };
  d.arts.taijiSword = { xp: 10, last: 0 };
  d.focus = 'taijiSword';
  for (let i = 0; i < 40; i++) gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.ok(d.arts.taijiSword.xp > 10);
  assert.ok(d.arts.taijiSword.xp <= 40);

  d.arts.taijiSword.xp = 10;
  delete d.arts.taiji;
  const before = d.arts.taijiSword.xp;
  gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(d.arts.taijiSword.xp, before);

  d.arts.taiji = { xp: 0, last: 0 };
  d.arts.taijiSword = { xp: 56, last: 0, bt1: true };
  gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(d.arts.taijiSword.xp, 56);
});

test('大成開第一招，化境招還沒開', () => {
  const d = hero();
  d.moves = d.moves.filter((m) => !['jianlong', 'feilong', 'kanglong'].includes(m));
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  const open = openSpecials(d, 'xianglong').map((sp) => sp.tier);
  assert.deepEqual(open, [2]);
  const got = unlockTechs(d, artById('xianglong'));
  assert.deepEqual(got, ['jianlong']);
  assert.ok(!d.moves.includes('kanglong'));
});

test('六門絕活各自觸發；內力不夠就不發動；沒看破的獨孤仍然格擋', () => {
  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  d.qi = 80;
  const qi0 = qiOf(d);
  assert.ok(qi0 >= 16, qi0);
  assert.equal(artById('xianglong').on.hit.qi, 16);
  assert.equal(artById('rulai').on, null);
  assert.deepEqual(ART_ON_EVENTS, ['hit', 'block', 'dodge', 'crit', 'gethit', 'kill']);

  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const foe = () => ({ hp: 40, pos: [10, 0], cool: 0 });
  const xl = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'jianlong' });
  assert.equal(xl.fired.art, 'xianglong');
  assert.ok(near(xl.power, 14), xl.power);
  assert.equal(xl.knock, 22);
  assert.ok(near(qi0 - qiOf(d), 16), qiOf(d));
  assert.match(s.log[0].msg, /震得對手退了一步/);
  assert.equal(s.log[0].tier, 'mid');
  d.qi = 0;
  const dry = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'jianlong' });
  assert.equal(dry.fired, null);
  assert.equal(dry.power, 10);

  d.qi = 80;
  d.dugu = ['dg0'];
  d.arts.dugu = { xp: 12, last: 0 };
  const seen = applyArtOn(s, 'dodge', d, null, {});
  assert.equal(seen.fired.art, 'dugu');
  assert.equal(seen.see, true);
  assert.equal(artNoParry(d), true);
  assert.match(seen.line, /自己不擋/);
  const br = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'dg0' });
  assert.equal(br.fired.art, 'dugu');
  assert.ok(near(br.power, 12), br.power);
  d.dugu = [];
  assert.equal(artNoParry(d), false);
  assert.equal(applyArtOn(s, 'dodge', d, null, {}).fired, null);

  d.arts.bixie = { xp: 55, last: 0, bt1: true };
  const mob = foe();
  const bx = applyArtOn(s, 'hit', d, mob, { power: 10, move: 'bx1' });
  assert.equal(bx.fired.art, 'bixie');
  assert.ok(near(bx.power, 20), bx.power);
  assert.match(bx.line, /連刺/);
  const bx2 = applyArtOn(s, 'hit', d, mob, { power: 10, move: 'bx1' });
  assert.equal(bx2.fired, null);
  assert.equal(bx2.power, 10);

  d.arts.taijiSword = { xp: 55, last: 0, bt1: true };
  const tj = applyArtOn(s, 'gethit', d, foe(), { dmg: 10 });
  assert.equal(tj.fired.art, 'taijiSword');
  assert.equal(tj.reflect, 0.45);
  assert.match(tj.line, /反震/);

  d.hp = 80;
  d.arts.qishangFist = { xp: 55, last: 0, bt1: true };
  const qs = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'qs1' });
  assert.equal(qs.fired.art, 'qishangFist');
  assert.ok(near(qs.power, 12), qs.power);
  assert.equal(d.hp, 74);
  assert.match(qs.line, /內腑/);

  const qiDog = qiOf(d);
  d.arts.dagou = { xp: 55, last: 0, bt1: true };
  const dg = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'banzi' });
  assert.equal(dg.fired.art, 'dagou');
  assert.equal(dg.trip, 1.2);
  assert.ok(qiOf(d) <= qiDog - 4);
  assert.match(dg.line, /絆/);

  const quiet = applyArtOn(s, 'crit', d, foe(), { power: 10, move: 'fist' });
  assert.equal(quiet.fired, null);
  assert.equal(applyArtOn(s, 'block', d, foe(), { dmg: 4 }).fired, null);
  assert.equal(applyArtOn(s, 'kill', d, foe(), { move: 'fist' }).fired, null);
  assert.equal(applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'fist' }).fired, null);
});

test('舊存檔讀入後是 2.6', () => {
  const raw = readFileSync(new URL('./golden/saves/v2.4.json', import.meta.url), 'utf8');
  const r = load(raw);
  assert.equal(r.ok, true, r.err);
  assert.equal(r.state.rules, '2.6');
  assert.equal(r.state.rules, RULES_VERSION);
  assert.ok(r.state.migSteps.includes('2.6'));
});
