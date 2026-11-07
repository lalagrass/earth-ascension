import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, clone } from '../../../src/sim.mjs';
import { NODES } from '../../../src/data.mjs';
import { resolveSwing, interceptOpening } from '../../../src/arts.mjs';
import { ringCapacity, attackTokenLimit } from '../../../src/tactics.mjs';
import { newBand, bandStep } from '../../../src/threat.mjs';

test('N44 背靠背減少四狗同刻命中；來源組織與站位共同限制攻擊權杖', () => {
  const base = createState(17, { kind: 'bare', askMajor: false });
  base.ds = base.ds.slice(0, 2); base.ds[0].pos = [500, 500]; base.t = 100;
  const exposure = together => {
    const s = clone(base), [d, partner] = s.ds;
    partner.pos = together ? [510, 500] : [900, 900]; d.face = -1; partner.face = 1;
    s.mons = Array.from({ length: 4 }, (_, i) => ({
      uid: `dog${i}`, k: 'dog', hp: 50, max: 50, agi: 30, cool: 0, intentTarget: d.id,
      pos: [500 + 20 * Math.cos(i * Math.PI / 2), 500 + 20 * Math.sin(i * Math.PI / 2)],
    }));
    let hit = 0;
    for (const dog of s.mons.slice(0, ringCapacity(d, s)))
      hit += resolveSwing(s, dog, d, () => .5, { wind: .4, move: 'dogBite' }).kind === 'hit' ? 1 : 0;
    return hit;
  };
  assert.equal(exposure(false), 4);
  assert.equal(exposure(true), 2, '兩人身後互相遮住，真可貼身位由四減二');

  const s = clone(base), [d, partner] = s.ds;
  d.pos = [NODES.gate[0], NODES.gate[1] - 10];
  partner.pos = [NODES.gate[0] + 15, NODES.gate[1] - 10];
  d.face = -1; partner.face = 1;
  for (const x of s.ds) { x.task = { act: 'defend', phase: 'do' }; x.needs.energy = 100; }
  s.day = 8; s.t = 1000;
  s.band = newBand({ n: 1, pts: 250, day: 8 }, 'gate', s);
  s.band.kind = 'liukou'; s.band.state = 'yard'; s.band.yardT = 0;
  for (const m of s.band.members) m.pos = [NODES.gate[0], NODES.gate[1] - 20];
  const B = s.band;
  for (let i = 0; i < 6; i++) { s.t += .25; bandStep(s, .25, { rand: () => .5 }); }
  assert.equal(attackTokenLimit(4, 2), 2);
  assert.equal(B.tokenLimit, 2);
  assert.ok(B.tokenPeak > 0 && B.tokenPeak <= B.tokenLimit, '進行中的山賊前搖不超過權杖');
  for (let i = 0; i < 30 && s.band; i++) {
    s.t += .25; bandStep(s, .25, { rand: () => .5 });
    assert.ok(B.members.filter(m => m.swing).length <= B.tokenLimit, '守者退下時未完成的來招也要釋出權杖');
  }

  const guard = clone(base), [busy, helper] = guard.ds;
  busy.pos = [500, 500]; helper.pos = [510, 500]; busy.swing = { at: 101, mv: 'bodyPunch' };
  const boar = { uid: 'boar', k: 'boar', hp: 100, max: 100, pos: [520, 500], agi: 18 };
  const rescue = interceptOpening(guard, boar, busy, () => .01, { wind: 1, move: 'boarCharge' });
  assert.equal(rescue.helper?.id, helper.id, '同伴尚在起手，空手者能在野豬蓄力期間截下');
});
