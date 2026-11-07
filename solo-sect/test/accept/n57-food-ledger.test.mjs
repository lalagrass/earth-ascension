import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, migrate } from '../../src/sim.mjs';
import { ALL_ON, botDaily } from '../harness/bot.mjs';

test('N57 每日糧食類別合計與原帳本及實際倉存相等', () => {
  const s = createState(1001, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, ...ALL_ON, v22: true });
  let opening = s.res.food;
  for (let day = 1; day <= 3; day++) {
    while (s.day === day) { tick(s, .25); s.alert = null; }
    const old = s.ledgerPrev, current = s.ledger;
    const closing = s.res.food - (current.in.food || 0) + (current.out.food || 0);
    assert.equal(closing - opening, (old.in.food || 0) - (old.out.food || 0), `第 ${day} 日倉存變化`);
    for (const dir of ['in', 'out'])
      assert.equal(Object.values(old.foodBySource?.[dir] || {}).reduce((a, b) => a + b, 0), old[dir].food || 0, `第 ${day} 日${dir}來源`);
    opening = closing;
    botDaily(s);
  }
  const old = structuredClone(s); old.rules = '3.6';
  for (const L of [old.ledger, old.ledgerPrev]) delete L.foodBySource;
  const stock = old.res.food, prior = old.ledgerPrev.in.food || 0;
  migrate(old);
  assert.equal(old.res.food, stock, '遷移不改庫存');
  assert.equal(old.ledgerPrev.foodBySource.in.legacy || 0, prior, '無來源舊帳只標 legacy');
  const once = JSON.stringify(old.ledgerPrev.foodBySource);
  migrate(old);
  assert.equal(JSON.stringify(old.ledgerPrev.foodBySource), once, '重讀不重計舊帳');
});
