import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../harness/historical-party.mjs';
import { artById } from '../../../src/arts.mjs';
import { card, jhResolve, masterOutcome } from '../../../src/jianghu.mjs';
import { showGuestMove, learnDugu, makeXiaCandidate, bixie } from '../../../src/wuxia.mjs';
import { handRareBook, selfCastrate } from '../../../src/rare-arts.mjs';

test('第二十三輪 A：見招與舊劇情不給整門；奇書須實物及本人確認自宮', () => {
  const s = createState(17), d = s.ds.find(x => x.id === 'hero');
  s.jhev ||= {}; const before = new Set(Object.keys(d.arts));
  masterOutcome(s, d, true);
  assert.deepEqual(new Set(Object.keys(d.arts)), before, '過路高人只能示範招式');
  assert.ok(showGuestMove(s, d, 'xianglong'));
  assert.equal(d.arts.xianglong, undefined, '洪七公現身但不是門內師父');
  assert.ok(learnDugu(s, d, 'dg0'));
  assert.equal(d.arts.dugu, undefined, '風清揚示範總訣不創造整門');

  const yang = makeXiaCandidate(s, 'yangguo');
  assert.ok(yang.arts.anran && yang.arts.xuantie, '楊過上山前已有本人的武學');

  const chooseKuihua = () => { const ch = card(s, 'kuihua', true); jhResolve(s, ch, 0); };
  chooseKuihua(); assert.equal(d.arts.kuihua, undefined, '殘頁不是整本');
  handRareBook(s, 'kuihua-book', d);
  chooseKuihua(); assert.equal(d.arts.kuihua, undefined, '書在手上仍須本人確認自宮');
  assert.equal(selfCastrate(s, d, false), false);
  assert.equal(d.castrated, undefined);
  assert.equal(selfCastrate(s, d, true), true);
  chooseKuihua(); assert.equal(d.arts.kuihua?.source, 'book');
  assert.equal(artById('kuihua').id, 'kuihua');

  const other = createState(18), pupil = other.ds.find(x => x.id === 'hero');
  assert.equal(bixie(other, pupil, true), false, '沒有袈裟不能因劇情獲整門');
  handRareBook(other, 'bixie-robe', pupil);
  assert.equal(bixie(other, pupil), false, '有袈裟仍須明確確認');
  assert.equal(pupil.arts.bixie, undefined);
  assert.equal(bixie(other, pupil, true), true);
  assert.equal(pupil.arts.bixie?.source, 'book');
});
