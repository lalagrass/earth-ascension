// R10 #530：整門只能學來；看人只得單招；傳承寫在卷的資料上；白身開局能走到立匾。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, setOrder } from '../../../src/sim.mjs';
import { DAY, ARTS } from '../../../src/data.mjs';
import { artById, artOk, artTeacher, learnArt, lineagesOf, moveMul, watchMove } from '../../../src/arts.mjs';
import { HERMITAGE_VOLUMES } from '../../../src/hermitage-books.mjs';
import { canFoundHermitageSect, foundHermitageSect } from '../../../src/sect.mjs';

const start = (opening, starterArt) => { const s = createState(11, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening, starterArt }); tick(s); return s; };

test('A：看人只增加單招，不增加整門；招的威力按自己的內功火候', () => {
  const s = start('solo', 'chunyangFist'), h = s.ds[0], a = artById('haotianPalm');
  const before = Object.keys(h.arts).length;
  const mv = watchMove(h, a);
  assert.ok(mv && h.moves.includes(mv.id), '多了一招');
  assert.equal(h.arts.haotianPalm, undefined, '沒有整門');
  assert.equal(Object.keys(h.arts).length, before);
  const weak = moveMul(h, mv.id);
  learnArt(h, 'quanzhenXinfa', s.t); h.arts.quanzhenXinfa.xp = 100;
  assert.ok(moveMul(h, mv.id) > weak, '內功火候高，看會的招才打得出力');
});

test('A：武學的傳承與前置全從卷的資料讀', () => {
  const s = start('xiaolongnv', 'chunyangFist'), h = s.ds[0], x = s.ds[1];
  for (const v of HERMITAGE_VOLUMES) assert.ok(v.lineage, `${v.id} 寫明傳承`);
  assert.ok(lineagesOf(h).has('quanzhen'));
  assert.ok(!artOk(x, artById('quanzhenXinfa')), '不會全真武學的人學不了全真心法');
  const v = HERMITAGE_VOLUMES.find((r) => r.art === 'quanzhenXinfa');
  h.arts[v.from].xp = v.xp - 1; h.skills.strength = 999;
  assert.ok(!artOk(h, artById(v.art)), '前一門火候未到');
  h.arts[v.from].xp = v.xp;
  assert.ok(artOk(h, artById(v.art)), '火候與體魄都到了');
});

test('A：「師父傳授」要有真的會這門的人在山上', () => {
  const s = start('solo', 'chunyangFist'), h = s.ds[0];
  assert.equal(artTeacher(s, h, 'quanzhenSword'), null);
  const t = start('xiaolongnv', 'chunyangFist');
  assert.equal(artTeacher(t, t.ds[0], 'basicSword')?.id, 'xiaolongnv');
});

test('A：白身開局沒有武學，找到殘卷讀完後就能立匾', () => {
  const s = start('solo', 'none'), h = s.ds[0];
  assert.deepEqual(Object.keys(h.arts), []);
  assert.equal(canFoundHermitageSect(s).ok, false);
  setOrder(s, 'hero', 'searchFragment');
  for (let i = 0; i < DAY * 4 && !s.hermitage.books.length; i++) tick(s);
  assert.ok(s.hermitage.books.length, '林中山洞找到殘卷');
  setOrder(s, 'hero', 'readBook');
  for (let i = 0; i < DAY * 40 && !Object.keys(h.arts).length; i++) tick(s);
  assert.ok(Object.keys(h.arts).length, '讀完殘卷學會整門');
  assert.ok(canFoundHermitageSect(s).ok);
  assert.ok(foundHermitageSect(s).ok);
});

test('白身沒有寫死的「王八拳」武學', () => {
  assert.ok(!ARTS.some((a) => /王八/.test(a.name)));
});
