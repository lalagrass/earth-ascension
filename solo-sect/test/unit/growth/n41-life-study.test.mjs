import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, DAY } from '../../../src/data.mjs';
import { rustOf } from '../../../src/arts.mjs';
import { lifeStage, recordLifeExchange, recordLifeRoutine } from '../../../src/life-study.mjs';

test('N41 一門較五門不易荒疏；六階要套路與實戰同時累積', () => {
  const trained = { xp: 55, last: 0 };
  assert.ok(rustOf(trained, 3 * DAY, 1) < rustOf(trained, 3 * DAY, 5));
  const fighter = { arts: { luohanHands: { xp: 55 } }, focus: 'luohanHands', moves: ['lhChop'] };
  for (let i = 0; i < 176; i++) recordLifeExchange(fighter, 'lhChop');
  assert.equal(lifeStage(fighter, 'luohanHands'), 0, '只打架不會自稱練完整套拳');
  recordLifeRoutine(fighter, ACTIVITIES.train.dur);
  assert.ok(lifeStage(fighter, 'luohanHands') >= 1);
  assert.equal(fighter.moves.includes('lhReturn'), false);
  recordLifeRoutine(fighter, 7 * ACTIVITIES.train.dur);
  assert.equal(lifeStage(fighter, 'luohanHands'), 3);
  assert.equal(fighter.moves.includes('lhReturn'), true);
});
