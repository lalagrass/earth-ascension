// R11 #531：自創靠配方；奇書只能讀實物；自宮需確認、不可逆，之後不能有後代。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, setOrder } from '../../../src/sim.mjs';
import { DAY } from '../../../src/data.mjs';
import { artById, artTeacher, learnArt, watchMove } from '../../../src/arts.mjs';
import { canTeachArt } from '../../../src/bonds.mjs';
import { genStep } from '../../../src/sect.mjs';
import { childWish } from '../../../src/family.mjs';
import { ART_RECIPES, recipeStatus, inventable, RARE_BOOKS, rareBookStatus, handRareBook, selfCastrate, readRareBook } from '../../../src/rare-arts.mjs';

const start = () => { const s = createState(11, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening: 'xiaolongnv', starterArt: 'chunyangFist' }); tick(s); return s; };
const runUntil = (s, ok, days = 6) => { for (let i = 0; i < DAY * days && !ok(); i++) tick(s); };
const giveRecipe = (h, r, xp = 100) => { for (const n of r.needs) { learnArt(h, n.art, 0); h.arts[n.art].xp = xp; } };

test('A：配方不齊學不會自創武學；齊了閉關自創', () => {
  const s = start(), h = s.ds[0], r = ART_RECIPES[0];
  assert.equal(recipeStatus(s, h, r.art).ok, false);
  setOrder(s, 'hero', 'invent'); runUntil(s, () => h.arts[r.art], 2);
  assert.equal(h.arts[r.art], undefined, '什麼都沒有時學不會');
  giveRecipe(h, r);
  const st = recipeStatus(s, h, r.art);
  assert.equal(st.ok, false, '武學齊了，人生事件還沒發生');
  assert.match(st.missing.join(), /分離/);
  giveRecipe(h, r, 10); h.wed = 'gone-spouse';
  assert.equal(recipeStatus(s, h, r.art).ok, false, '層級不到');
  giveRecipe(h, r); assert.ok(inventable(s, h), '配方齊了');
  setOrder(s, 'hero', 'invent'); runUntil(s, () => h.arts[r.art]);
  assert.equal(h.arts[r.art]?.source, 'invented', '閉關自創出來');
});

test('A：奇書只能讀實物，持有人與會的人都不教；看人只得單招', () => {
  const s = start(), [h, x] = s.ds, b = RARE_BOOKS.find((r) => r.art === 'kuihua');
  learnArt(x, b.art, 0); x.arts[b.art].xp = 100;
  assert.equal(artTeacher(s, h, b.art), null, '會的人不教');
  x.arts.bixie = { xp: 100, last: 0 }; h.master = x.id; h.castrated = 0;
  assert.equal(canTeachArt(s, x, h, 'bixie'), false, '師父也不傳辟邪');
  delete h.castrated;
  assert.match(rareBookStatus(s, h, b.id).why, /黑木崖/, '書不在手上');
  const mv = watchMove(h, artById('bixie'));
  assert.ok(mv && !h.arts.bixie, '看人得一招，不得整門');
  handRareBook(s, b.id, h, '得到');
  assert.match(rareBookStatus(s, h, b.id).why, /自宮/, '代價還沒付');
  assert.equal(readRareBook(s, h, b.id).learned, false);
});

test('A：自宮要明確確認、不可逆；之後讀得了奇書，也不會懷孕或讓人懷孕', () => {
  const s = start(), [h, x] = s.ds, b = RARE_BOOKS.find((r) => r.art === 'kuihua');
  handRareBook(s, b.id, h);
  assert.equal(selfCastrate(s, h), false, '沒有確認不做');
  assert.equal(selfCastrate(s, h, 'yes'), false, '只有 true 算確認');
  assert.ok(selfCastrate(s, h, true));
  const at = h.castrated;
  assert.equal(selfCastrate(s, h, true), false, '不能再做一次'); assert.equal(h.castrated, at);
  setOrder(s, 'hero', 'readRare'); runUntil(s, () => h.arts[b.art]);
  assert.equal(h.arts[b.art]?.source, 'book', '讀實物學會');
  // 接 R7：夫妻都想要也不會有孕，即使亂數落在最容易懷上的一端。
  h.spouse = x.id; x.spouse = h.id; s.gen.couples.push([h.id, x.id].sort());
  h.values = { xia: 30, sect: 10, qing: 40, free: 0, wu: 20, fame: 0 }; x.personality = ['gentle'];
  assert.match(childWish(s, x, h).why.join(), /自宮/);
  for (let i = 0; i < 60; i++) { s.day++; s.t = s.day * DAY; genStep(s, () => 0); }
  assert.ok(!x.pregnant && !h.pregnant);
  assert.equal(s.ds.length, 2);
});
