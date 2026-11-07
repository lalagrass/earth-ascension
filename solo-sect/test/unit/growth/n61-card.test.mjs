import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, save, load } from '../../../src/sim.mjs';
import { BATTLE_AXES, battleMetrics, battleAxisValues, recordAxisHistory, earlierAxisHistory } from '../../../src/growth-adapter.mjs';
import { battleRadarSvg } from '../../../src/panel-ui.mjs';

test('N61 six independent axes share one adapter; 30-day layer survives save and load', () => {
  const s = createState(17), d = s.ds[0], raw = battleMetrics(d);
  assert.deepEqual(BATTLE_AXES.map((a) => a.name), ['快', '眼', '勁', '身', '耐', '招']);
  for (const axis of BATTLE_AXES) {
    const changed = { ...raw, [axis.key]: raw[axis.key] * 1.1 + 0.01 };
    const before = battleAxisValues(raw), after = battleAxisValues(changed);
    assert.notEqual(after[BATTLE_AXES.indexOf(axis)], before[BATTLE_AXES.indexOf(axis)], axis.name);
    before.splice(BATTLE_AXES.indexOf(axis), 1); after.splice(BATTLE_AXES.indexOf(axis), 1);
    assert.deepEqual(after, before, `${axis.name} must not change the other five spokes`);
  }
  const history = {}; recordAxisHistory(history, d, 1);
  const initial = structuredClone(history.hero[0].raw);
  d.skills.agility += 10; recordAxisHistory(history, d, 31);
  const saved = save({ ...s, uiGrowthHistory: history });
  const restored = load(saved);
  assert.equal(restored.ok, true);
  assert.deepEqual(earlierAxisHistory(restored.state.uiGrowthHistory, d.id, 31).raw, initial);
  const svg = battleRadarSvg(battleMetrics(d), initial);
  assert.match(svg, /radar-now/); assert.match(svg, /radar-earlier/);
  assert.match(svg, /六軸數字與根據/);
  assert.match(battleRadarSvg({ ...raw, quick: 0.0039 }), /快 0\.0039 秒/);
});
