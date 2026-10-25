import { openExp } from "../src/slice.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition, canExpedition, load, save } from '../src/sim.mjs';
import { ROUTE, ENEMIES, EXP, CAMPS, ENDLESS, RULES_VERSION, DAY } from '../src/data.mjs';
import { routeSeg, segAt, scoutOf, raidMul, peaceOf, evadeScore } from '../src/expedition.mjs';
import { assemble, learnManual, MANUALS, likesOf, menuOf, likeMeal, aspOf, aspStep, ASPIRATIONS, statusIcon } from '../src/v10.mjs';
import { affKey } from '../src/util.mjs';
const buff = (s, ids, lvl) => { for (const d of s.ds) if (ids.includes(d.id)) { d.skills.palm = d.skills.leg = lvl; d.skills.agility = d.skills.strength = lvl / 2; d.hp = 100; d.mood = 80; } };
const run = (s) => { let i = 0; while (s.exp && i++ < 80000) tick(s); return s.lastExp; };

test('路線第五段起：斷崖、古洞、無名絕頂，各有守關敵與 ×1.25 倍率', () => {
  assert.deepEqual(ROUTE.slice(4).map((r) => r.name), ['斷崖', '古洞', '無名絕頂']);
  for (const r of ROUTE) { assert.ok(ENEMIES[r.gate], r.id); for (const [k] of r.roster) assert.ok(ENEMIES[k], k); }
  assert.ok(Math.abs(ROUTE[5].scale / ROUTE[4].scale - 1.25) < 1e-9);
});
test('無盡段：每 200 步一段、段末固定守關、每段再 ×ENDLESS.mul（v1.2 起 1.18）', () => {
  const a = routeSeg(7), b = routeSeg(8); assert.equal(a.from, 1600); assert.equal(a.to - a.from, ENDLESS.len); assert.equal(b.from, a.to);
  assert.equal(a.gate, 'peakguard'); assert.ok(Math.abs(b.scale / a.scale - ENDLESS.mul) < 1e-9); assert.equal(segAt(1700).id, 'end1'); assert.equal(segAt(2050).id, 'end3');
});
test('營地設在第三段、第五段盡頭；過關設營、可從營地出發', () => {
  assert.deepEqual(CAMPS.map((c) => ROUTE[c.seg].to), [450, 950]);
  const s = createState(4); tick(s); s.res.food = 0; assert.equal(startExpedition(openExp(s), ['hero'], { from: 'camp1' }).ok, false);
  s.camps = { camp1: true }; s.res.food = 10; const r = startExpedition(openExp(s), ['hero'], { from: 'camp1', supplies: 1 });
  assert.ok(r.ok); assert.equal(s.exp.dist, 450); assert.equal(s.exp.gateI, 3); assert.equal(s.exp.supplies, 1); assert.equal(s.res.food, 10 - EXP.campCarry - 1);
});
test('強隊一路過關會在山腰設營並補給', () => {
  const s = createState(11); tick(s); const ids = s.ds.slice(0, 4).map((d) => d.id); buff(s, ids, 200); s.res.food = 30;
  startExpedition(openExp(s), ids, { thr: 0.3, target: 600 }); const rep = run(s);
  assert.ok(rep.dist >= 450, rep.reason); assert.ok(s.camps.camp1); assert.ok(rep.camps.includes('山腰營地'));
});
test('乾糧可選、目標距離可設；體力與耐性會消耗', () => {
  const s = createState(5); tick(s); buff(s, ['hero'], 40); s.res.food = 20;
  startExpedition(openExp(s), ['hero'], { supplies: 5, target: 120 }); assert.equal(s.exp.supplies, 5); const rep = run(s);
  assert.ok(rep.dist <= 120); assert.ok(rep.sta < EXP.sta); assert.ok(rep.patMax > 0);
});
test('探路者：身法夠才有，先手 +20%', () => {
  const s = createState(6); const d = s.ds[0]; d.skills.agility = 0; assert.equal(scoutOf([d]), null); d.skills.agility = 60; assert.equal(scoutOf([d]), d); assert.ok(evadeScore(d) >= EXP.scoutAt);
  assert.equal(EXP.scoutBonus, 0.2);
});
test('巡山令：強制風格、不合者心情下降、耐性上限 ×0.7', () => {
  const mk = (order) => { const s = createState(8); tick(s); s.ds[0].mood = 80; s.ds[0].personality = ['honest', 'stubborn']; s.res.food = 10; startExpedition(openExp(s), ['hero'], { order }); return s; };
  const a = mk(null), b = mk('slip'); assert.equal(b.exp.style, 'slip'); assert.equal(b.exp.order, 'slip');
  assert.ok(b.exp.patMax <= Math.round(a.exp.patMax * 0.7) + 1); assert.ok(b.ds[0].mood < 80);
});
test('較真與懶散同隊：回來吵架、好感下降', () => {
  const s = createState(9); tick(s); const [a, b] = s.ds.filter((d) => d.role !== 'laborer'); a.personality = ['stubborn']; b.personality = ['lazy']; buff(s, [a.id, b.id], 30); s.res.food = 10;
  const before = s.aff[affKey(a.id, b.id)] || 0; startExpedition(openExp(s), [a.id, b.id], { target: 60 }); const rep = run(s);
  assert.equal(s.aff[affKey(a.id, b.id)], before - EXP.quarrel); assert.ok(rep.quarrel.length);
});
test('出巡後要歇；快腳（衝刺或深谷最快紀錄）歇一半', () => {
  const s = createState(10); tick(s); buff(s, ['hero'], 40); s.res.food = 10; startExpedition(openExp(s), ['hero'], { target: 60, order: 'dash' }); const rep = run(s);
  assert.equal(rep.cool, EXP.cool * EXP.coolFast); assert.equal(canExpedition(openExp(s), ['hero']).ok, false); for (let i = 0; i < rep.cool * 4 + 4; i++) tick(s); s.ds[0].hp = 100; assert.equal(canExpedition(openExp(s), ['hero']).ok, true);
});
test('清山 3 次的路段：野豬少下山、路走得快', () => {
  const s = createState(1); assert.equal(raidMul(s), 1); s.records.qing = { foot: 3 }; assert.ok(peaceOf(s, 'foot')); assert.equal(raidMul(s), EXP.peaceRaid);
});
test('秘笈殘章湊成可學的武學', () => {
  const s = createState(2); tick(s); s.res.page1 = 4; assert.equal(assemble(s, 'page1').ok, false); s.res.page1 = 5;
  const r = assemble(s, 'page1'); assert.ok(r.ok); assert.equal(s.res.page1, 0); assert.equal(s.manuals.length, 1);
  const d = s.ds.find((x) => !x.arts?.[r.art] && learnManual({ ...s, manuals: [...s.manuals], ds: [structuredClone(x)] }, 0, x.id).ok);
  if (d) { assert.ok(learnManual(s, 0, d.id, () => {}).ok); assert.ok(d.arts[r.art]); assert.equal(s.manuals.length, 0); }
  assert.equal(MANUALS.page2.need, 3);
});
test('喜好：吃喝一套、嗜酒必好酒、合菜單加心情', () => {
  const s = createState(3); const d = s.ds[0]; d.likes = null; d.personality = ['drinker']; assert.equal(likesOf(d).drink, '女兒紅');
  const got = []; s.t = 0; d.likes = { ...menuOf(s) }; likeMeal(s, d, (_, __, id) => got.push(id)); assert.deepEqual(got, ['likeFood', 'likeDrink']);
});
test('志向：由主價值觀而來，達成養成特質', () => {
  const s = createState(4); tick(s); const d = s.ds[0]; d.values = { sect: 40, wu: 10, xia: 0, qing: 0, free: 0, fame: 0 }; d.asp = null;
  assert.equal(aspOf(d).id, 'sect'); s.rep = 30; aspStep(s, () => {}); assert.ok(d.asp.done); assert.ok(d.personality.includes(ASPIRATIONS.sect.trait));
});
test('頭頂只一個狀態圖示，有優先序', () => {
  assert.equal(statusIcon({ hp: 30, needs: { hunger: 0 } }, '⚔'), '🩹'); assert.equal(statusIcon({ hp: 100, needs: { hunger: 5 } }, '⚔'), '🍚'); assert.equal(statusIcon({ hp: 100, needs: {}, mood: 60 }, '⚔'), '⚔');
});
test('0.98 存檔遷移到 1.0', () => {
  const o = JSON.parse(save(createState(1))); o.rules = '0.98'; delete o.camps; delete o.manuals; const r = load(JSON.stringify(o));
  assert.ok(r.ok); assert.equal(r.state.migSteps[0], '1.0'); assert.deepEqual(r.state.camps, {}); assert.ok(parseFloat(RULES_VERSION) >= 1);
});
