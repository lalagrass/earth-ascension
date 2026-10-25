import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, startExpedition, payday, load, save, moodParts } from '../src/sim.mjs';
import { styleOf, teamStyle, evadeScore } from '../src/expedition.mjs';
import { ROUTE, RULES_VERSION, ENEMIES } from '../src/data.mjs';
const H = (id, comp) => createState(21, { kind: 'template', id, companion: comp });
const go = (s, ids, lvl) => { tick(s); for (const d of s.ds) if (ids.includes(d.id) && lvl != null) { d.skills.palm = d.skills.leg = Math.max(d.skills.palm, lvl); d.skills.strength = lvl / 2; }
  s.res.food = 20; startExpedition(s, ids); let i = 0; while (s.exp && i++ < 60000) tick(s); return s.lastExp; };
const hero = (s) => s.ds.find((d) => d.id === 'hero');

test('風格從性格／價值觀／武學推出並附說明：郭靖清場、韋小寶溜走', () => {
  const g = styleOf(hero(H('guojing'))), w = styleOf(hero(H('weixiaobao')));
  assert.equal(g.id, 'clear'); assert.match(g.why, /憨厚|較真/); assert.equal(w.id, 'slip'); assert.match(w.why, /懶散/);
});
test('閃避取最差身法；溜走隊會閃過敵人', () => {
  const s = H('weixiaobao', 'shuanger'), h = hero(s), c = s.ds.find((d) => d.id === 'shuanger');
  assert.equal(Math.min(evadeScore(h), evadeScore(c)), Math.min(...[h, c].map(evadeScore)));
  const r = go(s, ['hero'], 30); assert.equal(r.style, 'slip'); assert.ok(Object.values(r.evaded).reduce((a, b) => a + b, 0) > 0, JSON.stringify(r.evaded));
});
test('守關敵一定要打：打不過就回頭，原因寫「被〇〇擋在△△」', () => {
  let r; for (const l of [20, 40, 60, 80]) { r = go(H('weixiaobao', 'shuanger'), ['hero', 'shuanger'], l); if (r.blocked) break; } assert.ok(r.blocked, r.reason); assert.match(r.reason, /擋在/); assert.match(r.story, /攔下/);
  for (const g of ROUTE) assert.ok(ENEMIES[g.gate]);
});
test('清場型會追逃兵；戰報有追擊數與敘事行；清場率與清山紀錄', () => {
  let r, s; for (const seed of [21, 22, 23, 24]) { s = createState(seed, { kind: 'template', id: 'guojing' }); r = go(s, ['hero', 'senior'], 70); if (r.chase.n) break; }
  assert.equal(r.style, 'clear'); assert.ok(r.chase.n > 0); assert.match(r.story, /追了/);
  assert.ok(Object.keys(r.clear).length > 0); for (const [k, v] of Object.entries(r.clear)) assert.ok(s.records.clear[k] >= v);
  if (r.qing.length) assert.ok(Object.values(s.records.qing).some((v) => v > 0));
});
test('阿星：重傷覺醒，根骨解封 +8、起手如來神掌', () => {
  const s = H('axing', 'afang'), h = hero(s); assert.equal(h.root, 1); const sum0 = Object.values(s.hero.stats).reduce((a, b) => a + b, 0);
  h.hp = 20; tick(s); assert.ok(s.hero.awakened); assert.equal(h.root, 5); assert.ok(h.arts.rulai); assert.ok(h.moves.includes('rulai'));
  assert.equal(Object.values(s.hero.stats).reduce((a, b) => a + b, 0) - sum0, 8);
});
test('阿星巡山瀕死也會覺醒', () => {
  const s = H('axing', 'afang'); const r = go(s, ['hero'], 3); assert.ok(s.hero.awakened, r.reason);
});
test('黃蓉精打細算：每日香火錢 +2', () => {
  const a = H('guojing', 'huangrong'), b = H('guojing', 'munianci'); const ca = a.res.coin, cb = b.res.coin; payday(a); payday(b);
  assert.equal((a.res.coin - ca) - (b.res.coin - cb), 2);
});
test('前期主角心情不再偏低', () => {
  const s = H('guojing', 'huangrong'); for (let i = 0; i < 4 * 900; i++) tick(s);
  assert.ok(moodParts(hero(s), s).some(([n]) => /心氣/.test(n))); assert.ok(hero(s).mood >= 45, String(hero(s).mood));
});
test('v0.96 存檔逐步遷移到 0.97', () => {
  const o = JSON.parse(save(H('guojing'))); o.rules = '0.96'; delete o.records.clear; delete o.records.qing;
  const m = load(JSON.stringify(o)).state; assert.equal(m.rules, RULES_VERSION); assert.deepEqual(m.migSteps, ['0.97', '0.98']); assert.deepEqual(m.records.clear, {});
});
