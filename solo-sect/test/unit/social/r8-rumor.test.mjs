import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, canRecruit, clone } from '../../../src/sim.mjs';
import { RECRUIT_POOL } from '../../../src/data.mjs';
import { recordRumor, spreadRumors, rumorForCandidate, rumorReach, publicRumors } from '../../../src/rumors.mjs';
import { points, T, threatDaily } from '../../../src/threat.mjs';

test('R8：外人親見、沿路傳播、處境相符、立匾與淡忘共同決定上門', () => {
  const s = createState(17, { kind: 'custom', opening: 'solo' });
  assert.equal(canRecruit(s).ok, false, '未立匾不可拜師');
  recordRumor(s, 'rescue', '獲救樵夫', 'gate');
  s.day = 2; spreadRumors(s);
  assert.equal(publicRumors(s).length, 0, '未立匾時只能傳山上的怪人，無門派可找');
  s.hermitage.active = false; s.hermitage.founded = true; s.sect = { name: '試驗山門', plaque: '試驗山門' };
  assert.equal(canRecruit(s).ok, false, '立匾不會把匿名舊聞追認為門派見聞');
  while (s.ds.length < 4) { const d = clone(s.ds[0]); d.id = `guard${s.ds.length}`; s.ds.push(d); }
  s.res.coin = 1000;
  assert.ok(points(s) > 0);
  threatDaily(s); assert.equal(T(s).pending, null, '有家底但無外人見過財物，不會憑空來山賊');

  const seen = recordRumor(s, 'rescue', '獲救樵夫', 'gate');
  assert.equal(rumorForCandidate(s, RECRUIT_POOL.find(c => c.id === 'shitou')), null, '目擊者仍在山門，村裡還沒聽到');
  s.day = 3; spreadRumors(s);
  assert.deepEqual(rumorReach(s), ['village']);
  assert.equal(rumorForCandidate(s, RECRUIT_POOL.find(c => c.id === 'shitou'))?.id, seen.id, '受山賊威脅的人聽得進救人消息');
  assert.equal(rumorForCandidate(s, RECRUIT_POOL.find(c => c.id === 'aqing')), null, '想尋師者不因無關的救人傳聞上門');
  assert.equal(canRecruit(s).next.id, 'shitou', '候選卡挑到處境相符的人');
  s.day = 4; spreadRumors(s);
  assert.deepEqual(rumorReach(s), ['village', 'market'], '村人下山趕集，消息沿路多傳一站');
  s.day = seen.expires; spreadRumors(s);
  assert.equal(publicRumors(s).length, 0, '沿 N46 記憶時限自然淡去');
  assert.equal(canRecruit(s).ok, false);
});
