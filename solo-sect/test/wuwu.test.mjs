/* #403 武學卡：同火候名功更強、悟性不改出手、前置比例、舊檔讀入 2.6、絕招按火候開。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARTS, RULES_VERSION } from '../src/data.mjs';
import { artById, moveMul, gainArt, openSpecials, unlockTechs } from '../src/arts.mjs';
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

test('舊存檔讀入後是 2.6', () => {
  const raw = readFileSync(new URL('./golden/saves/v2.4.json', import.meta.url), 'utf8');
  const r = load(raw);
  assert.equal(r.ok, true, r.err);
  assert.equal(r.state.rules, '2.6');
  assert.equal(r.state.rules, RULES_VERSION);
  assert.ok(r.state.migSteps.includes('2.6'));
});
