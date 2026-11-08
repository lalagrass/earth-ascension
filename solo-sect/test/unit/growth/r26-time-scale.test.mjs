import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inventory, inventoryMarkdown } from '../../../tools/time-constant-inventory.mjs';
import { BASE_SPEED, CLIFFS, NODES, SEASONS, SEASON_DAYS, DAY } from '../../../src/data.mjs';
import { RING } from '../../../src/combat-space.mjs';
import { cliffSlopeFactor } from '../../../src/cliff.mjs';
import { BODY_CONDITION, FITNESS_SCALE, stepWorkCondition } from '../../../src/economy.mjs';
import { FAMILY } from '../../../src/family.mjs';
import { DAYS_PER_YEAR, REAL_DAYS_PER_YEAR, METERS_PER_PIXEL, METERS_PER_ZHANG, pixelsToMeters, zhangToMeters, speedMetersPerSecond, waterfallTrainingLoad } from '../../../src/time-scale.mjs';

test('第二十六輪：地圖、崖高、步速與 28 日成長年共用量尺，時間常數逐列在表', () => {
  assert.equal(DAY, 600);
  assert.equal(DAYS_PER_YEAR, SEASONS.length * SEASON_DAYS);
  assert.equal(FAMILY.yearDays, DAYS_PER_YEAR);
  assert.ok(Math.abs(METERS_PER_PIXEL - 0.6 / RING.step) < 1e-12);
  assert.equal(speedMetersPerSecond(BASE_SPEED), 1.375);
  assert.equal(zhangToMeters(CLIFFS.cliff2.heightZhang), 21);
  assert.equal(METERS_PER_ZHANG, 3);
  const a = NODES.cliff1, b = NODES.cliff2;
  const horizontal = pixelsToMeters(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const rise = zhangToMeters(CLIFFS.cliff2.heightZhang - CLIFFS.cliff1.heightZhang);
  assert.ok(Math.abs(cliffSlopeFactor('cliff1', 'cliff2') - horizontal / Math.hypot(horizontal, rise)) < 1e-12);
  assert.equal(cliffSlopeFactor('hall', 'court'), 1);
  assert.ok(Math.abs(waterfallTrainingLoad(7, 3) - Math.sqrt(7 / 3)) < 1e-12);
  assert.ok(Math.abs(BODY_CONDITION.fitnessTau - 42 * DAYS_PER_YEAR / REAL_DAYS_PER_YEAR) < 1e-12);
  assert.ok(Math.abs(BODY_CONDITION.fatigueTau - 7 * DAYS_PER_YEAR / REAL_DAYS_PER_YEAR) < 1e-12);
  const fitnessSteady = 1 / (1 - Math.exp(-1 / BODY_CONDITION.fitnessTau));
  assert.ok(Math.abs(fitnessSteady / FITNESS_SCALE - 2) < 1e-12);
  const d = { root: 5, skills: { strength: 10, agility: 10 } };
  const s = { hermitage: { active: true }, day: 1 };
  for (let day = 1; day <= 28; day++) {
    s.day = day;
    stepWorkCondition(d, s, 'train', 1, 25);
  }
  // 每日 25s、普通餐、全力負荷：q=25/(600/3)，F*/scale=2qn。
  const expectedStrength = 10 + 20 * (1 - Math.exp(-2 * (25 / (DAY / 3)) * BODY_CONDITION.nutrition.plain));
  assert.ok(Math.abs(d.skills.strength - expectedStrength) < 0.05);
  const doc = fs.readFileSync(new URL('../../../docs/systems/time-and-scale.md', import.meta.url), 'utf8');
  assert.ok(inventory().length > 250);
  assert.ok(doc.includes(inventoryMarkdown()), 'src 時間常數漏列，請重產完整盤點表');
});
