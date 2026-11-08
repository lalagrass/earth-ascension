import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { billDue } from '../../../src/economy.mjs';
import { checkSharedAwakening, artOk } from '../../../src/arts.mjs';
import { ARTS } from '../../../src/data.mjs';
import { affKey } from '../../../src/util.mjs';
import { load, save } from '../../../src/save.mjs';
import { ROUTINES } from '../../../src/routines.mjs';
import { readStarterBook } from '../../../src/luohan-book.mjs';

test('Phase 4：終南隱居只生成主角與帶入門功夫的小龍女，無月俸', () => {
  const s = createState(42, { hermitage: true, partner: 'xiaolongnv' });
  assert.deepEqual(s.ds.map((d) => d.id), ['hero', 'xiaolongnv']);
  assert.equal(s.hermitage.active, true);
  assert.equal(s.ds[0].arts.chunyangFist.xp, 0);
  assert.deepEqual(Object.keys(s.ds[1].arts), ['stepFeather', 'basicSword']);
  assert.equal(s.ds[1].arts.stepFeather.xp, 10);
  assert.equal(s.ds[1].arts.basicSword.xp, 15);
  s.ds.forEach((d) => { d.sectId = s.sect.id; });
  // Phase 6：心法的可學條件改為外功小成且體魄達標；仍驗原本的可學／不可學分路。
  assert.equal(artOk(s.ds[0], ARTS.find((a) => a.id === 'quanzhenXinfa')), false);
  s.ds[0].skills.strength = 15;
  s.ds[0].arts.chunyangFist.xp = 25;
  assert.equal(artOk(s.ds[0], ARTS.find((a) => a.id === 'quanzhenXinfa')), true);
  assert.equal(artOk(s.ds[1], ARTS.find((a) => a.id === 'quanzhenXinfa')), false);
  assert.equal(s.aff[affKey('hero', 'xiaolongnv')], 55);
  assert.equal(billDue(s, 10), false);
  assert.equal(load(save(s)).state.hermitage.opening, 'xiaolongnv');
});

test('Phase 4：羅漢拳與黃蓉的另一雙人組合', () => {
  const s = createState(42, { hermitage: true, partner: 'huangrong', starterArt: 'luohanHands' });
  assert.deepEqual(s.ds.map((d) => d.id), ['hero', 'huangrong']);
  assert.ok(s.ds[0].arts.luohanHands);
  assert.equal(s.ds[0].arts.chunyangFist, undefined);
  assert.deepEqual(Object.keys(s.ds[1].arts), ['basicFist', 'xiaoyaoStep']);
  assert.equal(s.ds[1].skills.cooking, 16);
});

test('Phase 4：小龍女依共同生活、武學火候與好感逐階領悟', () => {
  const s = createState(42, { hermitage: true });
  const [hero, partner] = s.ds;
  assert.equal(checkSharedAwakening(partner, hero, s), null);
  s.hermitage.livedDays = 2;
  assert.deepEqual(checkSharedAwakening(partner, hero, s), ['tianluoPalm']);
  assert.equal(checkSharedAwakening(partner, hero, s), null);
  partner.arts.tianluoPalm.xp = 25;
  assert.deepEqual(checkSharedAwakening(partner, hero, s), ['yunvJian', 'meinvFist']);
  partner.arts.yunvJian.xp = 25;
  assert.equal(checkSharedAwakening(partner, hero, s), null);
  s.aff[affKey(partner.id, hero.id)] = 60;
  assert.deepEqual(checkSharedAwakening(partner, hero, s), ['yunvSword']);
  partner.arts.yunvSword.xp = 25;
  hero.arts.quanzhenXinfa = { xp: 25 };
  assert.deepEqual(checkSharedAwakening(partner, hero, s), ['yunv']);
  assert.equal(s.hermitage.stage, 4);
  assert.equal(s.hermitage.contemplateUntil, s.t + 12);
  assert.equal(checkSharedAwakening(partner, hero, s), null);
});

test('Phase 4：未選隱居的舊開局仍為三人且無隱居欄位', () => {
  const s = createState(42);
  assert.deepEqual(s.ds.map((d) => d.id), ['hero', 'origin-1', 'origin-2']);
  assert.equal(s.hermitage, undefined);
});

test('Phase 4：純陽拳十二段有姿勢，讀完十二段才正式學會', () => {
  assert.equal(ROUTINES.chunyang.forms.length, 12);
  assert.ok(ROUTINES.chunyang.forms.every((form) => form.poses.length === 4));
  const hero = createState(42, { kind: 'bare' }).ds[0];
  for (let i = 0; i < 11; i++) assert.equal(readStarterBook(hero, 'chunyangFist').learned, false);
  assert.equal(readStarterBook(hero, 'chunyangFist').learned, true);
  assert.ok(hero.arts.chunyangFist);
});
