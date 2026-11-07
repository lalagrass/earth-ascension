import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../../src/sim.mjs';
import { growthSnapshot } from '../../../src/growth-adapter.mjs';
import { artById, windOf } from '../../../src/arts.mjs';
import { practiceWindow, reactionFloor } from '../../../src/practice.mjs';
import { MOVES } from '../../../src/data.mjs';

test('N42 人物面板的一句話讀同一套前搖、反應和勁', () => {
  const s = createState(14), d = s.ds.find((x) => x.id === 'hero');
  const row = growthSnapshot(d), move = MOVES.find((m) => m.id === 'fist');
  assert.ok(row.art && Number.isFinite(row.force));
  assert.equal(row.reaction, reactionFloor(d));
  if (row.wind != null) assert.equal(row.wind, windOf(d, move.id, move.cd));
  assert.ok(row.firstLine.includes(row.why));
  assert.ok(row.why.includes(`反應下限 ${row.reaction.toFixed(2)} 秒`));
  assert.ok(row.why.includes(`勁 ${row.force.toFixed(2)}`));
  // 同樣的身體和熟練，名功把可及前搖拉得更低；不是額外傷害倍率。
  const famous = practiceWindow(d, 'fist', .5, { tier: 3, artReach: artById('sanyinClaw').fanR });
  const common = practiceWindow(d, 'fist', .5, { tier: 3, artReach: artById('wuhuBlade').fanR });
  assert.ok(famous.wind < common.wind);
});
