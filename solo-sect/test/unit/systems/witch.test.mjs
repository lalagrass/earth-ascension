/* 第五輪 #425 N19 林克時間：最後 15% 閃開才算完美閃避；圈內敵人的前搖與移動放慢到 0.3 倍，圈外照常；閃避者照常出手。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES, MONSTERS } from '../../../src/data.mjs';
import { WITCH, perfectDodge, witchK } from '../../../src/arts.mjs';
import { createState, tick, startHunt } from '../../../src/sim.mjs';

test('完美閃避觸發林克時間：只放慢圈內的敵人，1 秒後結束', () => {
  const s = createState(11); for (let i = 0; i < 40; i++) tick(s, 0.25);
  const d = s.ds.find((x) => x.role !== 'laborer'); assert.ok(startHunt(s, [d.id])); tick(s, 0.25);
  d.pos = [...NODES[s.hunt.post]]; d.at = s.hunt.post; d.path = []; d.hp = 100; s.hunt.started = true; s.hunt.queue = [];
  d.skills.agility = 60; d.wu = 6;
  assert.equal(perfectDodge(s, d, () => 0.5), false, '前搖中段閃開不算完美');
  assert.equal(perfectDodge(s, d, () => 0.95, { strain: 0.9 }), true, '吃力的進身閃在最後一段觸發');
  const near = [d.pos[0] + 30, d.pos[1]], far = [d.pos[0] + WITCH.r + 40, d.pos[1]];
  assert.equal(witchK(s, near), WITCH.k); assert.equal(witchK(s, far), 1);
  const mk = (pos, uid) => ({ uid, k: 'boar', hp: 999, max: 999, pos, src: 'den', path: [], cool: 2, posture: 70 });
  s.mons = [mk(near, 'a'), mk(far, 'b')]; s.mons[1].path = [[far[0] + 300, far[1]]]; s.mons[0].swing = { tgt: 'none', at: s.t + 0.4, wind: 0.4 }; const at0 = s.mons[0].swing.at;
  const cIn = s.mons[0].cool, cOut = s.mons[1].cool; tick(s, 0.25);
  assert.ok(Math.abs((cIn - s.mons[0].cool) - 0.25 * WITCH.k) < 1e-9, '圈內冷卻 ×0.3'); assert.ok(s.mons[0].swing.at > at0, '圈內前搖延長');
  assert.ok(Math.abs(cOut - s.mons[1].cool - 0.25) < 1e-9, '圈外照常');
  for (let i = 0; i < 5; i++) tick(s, 0.25); assert.equal(witchK(s, near), 1, '1 秒後結束');
});
