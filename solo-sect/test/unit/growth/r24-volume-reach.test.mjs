import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { BODY_MECHANICS } from '../../../src/contact.mjs';
import { bodyCapOf } from '../../../src/economy.mjs';
import { bookStatus, entryReadSeconds, readHermitageBook, volumeBodyThreshold } from '../../../src/hermitage-books.mjs';

test('24d 入門卷弱者分段慢讀，進階卷維持先天至上限的中點門檻', () => {
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
  d.arts.quanzhenXinfa.xp = 55; s.hermitage.books.push('xiantian-heart');
  const midpoint = d.bodyBase.strength + (bodyCapOf(d, 'strength') - d.bodyBase.strength) / 2;
  assert.equal(volumeBodyThreshold(d, 'strength'), midpoint);
  d.skills.strength = midpoint - 0.01;
  assert.equal(bookStatus(s, d, 'xiantian-heart').ok, false);
  d.skills.strength = midpoint;
  assert.equal(bookStatus(s, d, 'xiantian-heart').ok, true);
});
