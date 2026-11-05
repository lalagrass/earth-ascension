// v1.76 兩個 P0：傳功完成率（根因＝量測：log 只留 60 筆；另修徒弟先做完時的結算）、前期糧荒閘
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startBuild, canRecruit, recruit, scoreActs, foodLow } from '../src/sim.mjs';
import { DAY, FACILITIES, FOOD_SEC } from '../src/data.mjs';
import { log } from '../src/util.mjs';

test('log 只留 60 筆：長跑不能用 log 數事件（v1.75 的「傳功 16 次」即此誤差）', () => {
  const s = createState(1); for (let i = 0; i < 200; i++) log(s, `x${i}`); assert.equal(s.log.length, 60);
});
/* #432 退役舊 pass 活動的完成率與順序測試；新共同傳授由 round6-n25.test.mjs 驗證。 */
test('糧荒閘：存糧＋菜不足每人 1.5 份 → 種菜升需求層、練功聊天打折', () => {
  const s = createState(8); s.res.food = 0; s.res.veg = 0; assert.ok(foodLow(s)); const d = s.ds.find((x) => x.role !== 'laborer');
  const sc = scoreActs(s, d); const farm = sc.find((o) => o.act === 'farm'), train = sc.find((o) => o.act === 'train');
  assert.ok(farm && farm.layer === 'need', '種菜是需求層'); if (train) assert.ok(train.f.food === FOOD_SEC.gateMul);
  s.res.food = 99; assert.ok(!foodLow(s)); const sc2 = scoreActs(s, d); assert.ok(!sc2.some((o) => o.f.food), '糧足不打折');
});
test('糧荒閘：郭靖開局前 5 日斷糧 ≤1 天（v1.75 為 4–5 天）', () => {
  const s = createState(3, { kind: 'template', id: 'guojing', askMajor: false }); const zero = new Set();
  for (let i = 0; s.t < 5 * DAY; i++) { tick(s); if (i % 40 === 0) { if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (startBuild(s, f.id)) break; if (canRecruit(s).ok) recruit(s); } if (s.t % DAY < 1 && s.res.food <= 0) zero.add(Math.floor(s.t / DAY)); }
  assert.ok(zero.size <= 1, `斷糧日 ${[...zero]}`);
});
