import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { recordRumor } from '../../../src/rumors.mjs';
import { donateRepairs } from '../../../src/repair-donation.mjs';

test('24g 無相符見聞不捐；村民循守護傳聞具名捐修，一則只一次', () => {
  const s = createState(17, { kind: 'custom', hermitage: true, opening: 'solo', starterArt: 'chunyangFist' });
  s.hermitage.active = false;
  s.fac.dorm.site = { need: { wood: 0, stone: 2 }, delivered: { wood: 0, stone: 0 }, reserved: { wood: 0, stone: 0 }, work: 0, workNeed: 18, paused: false };
  const stockBefore = s.res.stone || 0;
  const inBefore = s.ledger.in.stone || 0;
  const outBefore = s.ledger.out.stone || 0;
  assert.equal(donateRepairs(s), null);
  const rumor = recordRumor(s, 'defend', '村路目擊者', 'village');
  const gift = donateRepairs(s);
  assert.equal(gift.rumor, rumor.id);
  assert.equal(gift.donor, 'shitou');
  assert.equal(gift.facility, 'dorm');
  assert.equal(s.fac.dorm.site.delivered.stone, gift.amount);
  assert.equal(s.res.stone || 0, stockBefore, '指定到工地的石料不留在倉庫');
  assert.equal((s.ledger.in.stone || 0) - inBefore, gift.amount, '捐入記入帳本');
  assert.equal((s.ledger.out.stone || 0) - outBefore, gift.amount, '移往工地也記入帳本');
  assert.ok(s.log.some(row => row.msg.includes('石頭') && row.msg.includes('宿舍') && row.msg.includes(`第 ${rumor.id} 則見聞`)));
  assert.equal(donateRepairs(s), null);
  assert.equal(s.repairDonations.gifts.length, 1);
});
