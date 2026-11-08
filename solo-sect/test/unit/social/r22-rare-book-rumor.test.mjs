import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../../src/sim.mjs';
import { DAY } from '../../../src/data.mjs';
import { RARE_BOOKS, rareBookState, rareBookStatus } from '../../../src/rare-arts.mjs';
import { foundHermitageSect } from '../../../src/sect.mjs';
import { askRareBookRumor, rareBookSearchWhy, startRareBookSearch } from '../../../src/rare-search.mjs';
import { rumorForRareBook, rumorHtml } from '../../../src/rumors.mjs';

test('第二十二輪 A：無目擊不知奇書所在；遠行搜得唯一實物，原址不可再搜', () => {
  const s = createState(17, { hermitage: true }), hero = s.ds.find(d => d.id === 'hero');
  const robe = RARE_BOOKS.find(b => !b.holder), held = RARE_BOOKS.find(b => b.holder);
  assert.equal(rumorForRareBook(s, robe.id), null);
  assert.equal(rareBookStatus(s, hero, robe.id).why, '書不在手上');
  assert.doesNotMatch(rumorHtml(s), /福州林家老宅|黑木崖/);
  assert.match(rareBookSearchWhy(s, robe.id, hero), /未聽到/);
  assert.equal(askRareBookRumor(s).ok, false, '匿名隱居未能去市集打聽');

  assert.equal(foundHermitageSect(s, 'single').ok, true, '照真實立匾流程開放市集');
  assert.doesNotMatch(rumorHtml(s), /福州林家老宅|黑木崖/, '立匾不會自動知道奇書所在');
  assert.match(rareBookSearchWhy(s, robe.id, hero), /未聽到/);
  const heard = askRareBookRumor(s);
  assert.equal(heard.book, robe.id, '先出現能搜尋的無主實物');
  assert.equal(rumorForRareBook(s, robe.id)?.bookAt, robe.place);
  assert.match(rumorHtml(s), /福州林家老宅/);
  assert.equal(askRareBookRumor(s).ok, false, '同一期只問一次');
  assert.equal(startRareBookSearch(s, robe.id, hero).ok, true);
  assert.equal(hero.away, true, '循市集商路遠行，不瞬間取書');
  assert.equal(rareBookState(s, robe.id).at, robe.place);
  const due = s.rareSearch.until;
  s.t = due - .25; tick(s, .25);
  assert.equal(rareBookState(s, robe.id).holder, hero.id);
  assert.equal(rareBookState(s, robe.id).at, 'sect');
  assert.equal(hero.away, false);
  assert.match(rareBookSearchWhy(s, robe.id, hero), /原處沒有書/, '回山目擊尚在山門，市場舊聞不可重複取書');
  assert.equal(startRareBookSearch(s, robe.id, hero).ok, false, '原址不得再取出第二本');
  s.t += DAY - .25; tick(s, .25);
  assert.equal(rumorForRareBook(s, robe.id)?.bookHolder, hero.id, '新目擊抵達聚落後，持有人也可成傳聞');

  s.day += 5;
  const second = askRareBookRumor(s);
  assert.equal(second.book, held.id, '有主奇書的持有人也能成具名見聞');
  assert.equal(rumorForRareBook(s, held.id)?.bookHolder, held.holder);
  assert.match(rumorHtml(s), /黑木崖.*日月神教教主/);
  assert.match(rareBookSearchWhy(s, held.id, hero), /由人持有/);
});
