import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, scoreActs, save, load, migrate } from '../src/sim.mjs';
import { DAY, RULES_VERSION } from '../src/data.mjs';
import { HEROES, COMPANIONS, Q9 } from '../src/data.mjs';
import { validStats, budgetOf, readHeart, valueMul, encounterPool, companionsFor, resolveChoice, addWexin } from '../src/hero.mjs';
import { artMulParts, artById } from '../src/arts.mjs';
import { existsSync } from 'node:fs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };
const hero = (s) => s.ds.find((d) => d.id === 'hero');

test('自創點數：12 點、悟性 1 退 1 點（笨功夫）', () => {
  assert.ok(validStats({ wu: 2, gen: 2, li: 2, shen: 2, ding: 2, fu: 2 }));
  assert.ok(!validStats({ wu: 2, gen: 3, li: 2, shen: 2, ding: 2, fu: 2 }));
  assert.equal(budgetOf({ wu: 1 }), 13); assert.ok(validStats({ wu: 1, gen: 5, li: 2, shen: 2, ding: 2, fu: 1 }));
  const s = createState(3, { kind: 'custom', name: '小明', stats: { wu: 1, gen: 5, li: 2, shen: 2, ding: 2, fu: 1 }, answers: [] });
  assert.ok(hero(s).personality.includes('honest')); assert.equal(hero(s).wu, 1); assert.equal(hero(s).root, 5);
});
test('九問問心：價值主副、兩明一暗特質', () => {
  const r = readHeart([0, 0, 0, 0, 1, 0, 0, 0, 0]); assert.equal(Q9.length, 9);
  assert.equal(r.visible.length, 2); assert.ok(r.hidden); assert.notEqual(r.main, r.sub);
  const s = createState(4, { kind: 'custom', stats: { wu: 2, gen: 2, li: 2, shen: 2, ding: 2, fu: 2 }, answers: [1, 1, 2, 2, 2, 1, 1, 1, 1] });
  assert.equal(s.hero.main, readHeart([1, 1, 2, 2, 2, 1, 1, 1, 1]).main); assert.equal(hero(s).personality.length, 3);
});
test('六模板都有立繪、同門候選 2–3 位且有立繪', () => {
  assert.equal(HEROES.length, 6);
  for (const h of HEROES) { assert.ok(existsSync(`assets/portraits/${h.id}.png`)); assert.ok(h.companions.length >= 2 && h.companions.length <= 3);
    for (const c of h.companions) { assert.ok(COMPANIONS[c]); assert.ok(existsSync(`assets/portraits/${c}.png`), c); } }
});
test('選郭靖＋黃蓉：同門加入、移出名俠池、默契最多 +25%', () => {
  const s = createState(5, { kind: 'template', id: 'guojing', companion: 'huangrong' });
  const h = hero(s), r = s.ds.find((d) => d.id === 'huangrong');
  assert.equal(h.name, '郭靖'); assert.equal(h.wu, 1); assert.equal(h.root, 5); assert.ok(r); assert.deepEqual(r.personality, ['clever', 'nimble', 'picky']);
  assert.ok(r.wu > r.root); assert.ok(!encounterPool(s).includes('huangrong')); assert.ok(!encounterPool(s).includes('guojing')); assert.ok(encounterPool(s).includes('munianci'));
  s.aff['hero>huangrong'] = 100; run(s, 1); assert.ok(Math.abs(h.pairMul - 0.25) < 1e-9);
  const P = artMulParts(h, artById(Object.keys(h.arts)[0]), []); assert.ok(P.parts.ext.some(([n]) => n === '同門默契'));
  assert.deepEqual(companionsFor('guojing'), ['huangrong', 'munianci']);
});
test('價值觀進入 autopilot 分數：韋小寶練功低、郭靖練功高', () => {
  const w = createState(6, { kind: 'template', id: 'weixiaobao' }), g = createState(6, { kind: 'template', id: 'guojing' });
  assert.ok(valueMul(hero(w), 'train') < 1 && valueMul(hero(g), 'hunt') > 1);
  const sc = scoreActs(g, hero(g)).find((o) => o.act === 'train'); if (sc) assert.match(sc.f.text, /價值觀/);
});
test('違心最多 3 層，閉關可消一層', () => {
  const s = createState(7, { kind: 'template', id: 'yuebuqun' }), h = hero(s);
  for (let i = 0; i < 5; i++) addWexin(s, h, 'test'); assert.equal(h.wexin, 3);
  const o = scoreActs(s, h).find((x) => x.act === 'meditate'); assert.ok(o, '有違心時可閉關');
  h.task = null; h.order = 'meditate'; run(s, 40); h.order = null; assert.ok(h.wexin < 3);
});
test('專屬主線第一步：第 2 天出抉擇卡，詢問玩家；不問則依價值自動選', () => {
  const s = createState(8, { kind: 'template', id: 'guojing', companion: 'huangrong' }); run(s, DAY * 1.05); s.choices = s.choices.filter((c) => !c.jh);
  assert.equal(s.choices.length, 1); assert.equal(s.choices[0].title, '洪七公聞香而來');
  resolveChoice(s, s.choices[0].id, 0); assert.ok(s.hero.flags.hong); assert.equal(s.choices.length, 0);
  const a = createState(8, { kind: 'template', id: 'linghuchong', askMajor: false }); run(a, DAY * 1.05); assert.equal(a.choices.filter((c) => !c.jh).length, 0); assert.ok(a.hero.arcStep >= 1);
});
test('預設無主角開局不變、v0.95 存檔逐步遷移', () => {
  const s = createState(9); assert.equal(s.hero, null); assert.equal(s.ds.length, 3);
  const o = JSON.parse(save(s)); o.rules = '0.95'; o.v = o.v; delete o.hero; delete o.choices; delete o.encExclude; for (const d of o.ds) delete d.wu;
  const m = load(JSON.stringify(o)).state; assert.equal(m.rules, RULES_VERSION); assert.ok(m.ds.every((d) => d.wu === d.root)); assert.deepEqual(m.choices, []);
  const t = createState(10, { kind: 'template', id: 'zhangwuji', companion: 'xiaozhao' }); run(t, 30); const r = load(save(t)).state; assert.equal(r.hero.companion, 'xiaozhao');
});
