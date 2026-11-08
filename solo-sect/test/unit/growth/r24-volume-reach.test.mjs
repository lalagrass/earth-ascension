import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { BODY_MECHANICS } from '../../../src/contact.mjs';
import { bodyCapOf } from '../../../src/economy.mjs';
import { bookStatus, entryReadSeconds, readHermitageBook, volumeBodyThreshold } from '../../../src/hermitage-books.mjs';

test('24d 入門卷弱者分段慢讀；原三本崖卷維持只看前卷火候', () => {
  const s = createState(42, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  const d = s.ds[0]; d.arts.chunyangFist.xp = 25;
  const avg = BODY_MECHANICS.averageAdultSkill;
  d.skills.strength = avg;
  assert.equal(bookStatus(s, d, 'quanzhen-heart').ok, true);
  const averageSeconds = entryReadSeconds(d, { skill: 'strength' });
  d.skills.strength = avg / 2;
  assert.equal(bookStatus(s, d, 'quanzhen-heart').ok, true);
  assert.equal(entryReadSeconds(d, { skill: 'strength' }), averageSeconds * 2);
  assert.equal(readHermitageBook(s, d, 'quanzhen-heart', averageSeconds).learned, false);
  assert.equal(readHermitageBook(s, d, 'quanzhen-heart', averageSeconds).learned, true);
  d.arts.quanzhenXinfa.xp = 55;
  d.arts.jinyanStep = { xp: 25 };
  d.arts.shaolinStep = { xp: 55 };
  s.hermitage.books.push('xiantian-heart', 'quanzhen-sword', 'shaolin-arhat');
  const midpoint = d.bodyBase.strength + (bodyCapOf(d, 'strength') - d.bodyBase.strength) / 2;
  assert.equal(volumeBodyThreshold(d, 'strength'), midpoint);
  d.skills.strength = midpoint - 0.01;
  d.skills.agility = 0;
  for (const id of ['quanzhen-sword', 'xiantian-heart', 'shaolin-arhat'])
    assert.equal(bookStatus(s, d, id).ok, true, `${id} 原本沒有體能前置`);
  d.arts.quanzhenXinfa.xp = 54;
  assert.equal(bookStatus(s, d, 'xiantian-heart').ok, false, '原前卷火候仍不可略過');
});
