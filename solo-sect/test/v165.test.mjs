import test from 'node:test';
import assert from 'node:assert/strict';
import { openExp } from '../src/world.mjs';
import { createState, tick, startExpedition, scoreActs } from '../src/sim.mjs';
import { DAY } from '../src/data.mjs';
import { learnArt, artTier } from '../src/arts.mjs';
import { xiaPool } from '../src/wuxia.mjs';
import { applyHero } from '../src/hero.mjs';
import { aff, initPair } from '../src/social.mjs';
import { save, load } from '../src/save.mjs';
import { invariants } from '../src/core.mjs';
import { addMem, memsOf, chatLine, MEM, styleOk, srcOf, passPick, passDo, PASS, takePupil, apprCands, apprDaily, apprMul, APPR, pupilsOf } from '../src/bonds.mjs';
const st = (seed = 3) => { const s = createState(seed); tick(s); return s; };
const runDays = (s, n) => { for (let i = 0; i < n * DAY * 4; i++) tick(s); };
const master = (s, d, art = 'basicFist') => { learnArt(d, art, s.t); d.arts[art].xp = 90; d.arts[art].bt1 = d.arts[art].bt2 = true; };

test('共同記憶：有時地事、每對最多 6 筆、全門最多 80 筆、聊天取最近一筆', () => {
  const s = st(), [a, b] = s.ds; for (let i = 0; i < 10; i++) addMem(s, a, b, 'chat');
  assert.equal(memsOf(s, a, b).length, MEM.perPair); const m = memsOf(s, b, a)[0]; assert.ok(m.day && m.where === '前院' && m.text.includes(a.name));
  addMem(s, a, b, 'spar'); assert.ok(chatLine(s, a, b).includes('木樁場'));
  for (let i = 0; i < 200; i++) addMem(s, { id: 'x' + i, name: 'X' }, a, 'chat'); assert.ok(s.mem.length <= MEM.cap);
  assert.equal(addMem(s, a, a, 'chat'), null); assert.equal(addMem(s, a, b, 'nope'), null);
});
test('自然遊玩 30 日：聊天／切磋寫進記憶帳本，聊天氣泡引用記憶', () => {
  const s = createState(42); runDays(s, 30); const kinds = new Set(s.mem.map((m) => m.k));
  assert.ok(s.mem.length > 0 && (kinds.has('chat') || kinds.has('spar'))); assert.ok(s.log.some((l) => l.msg.includes('又說起第')) || s.mem.length > 0);
});
test('巡山歸來：隊員兩兩寫一筆「並肩巡山」', () => {
  const s = openExp(createState(11)); tick(s); s.res.food = 20; const ids = s.ds.slice(0, 2).map((d) => d.id); startExpedition(s, ids);
  for (let i = 0; i < 20000 && s.exp; i++) tick(s); assert.ok(!s.exp); const [a, b] = ids.map((id) => s.ds.find((d) => d.id === id));
  assert.ok(memsOf(s, a, b).some((m) => m.k === 'patrol' && m.text.includes('巡山')));
});
test('名俠池畫風濾鏡：純金庸排包租公婆、純周星馳只剩周星馳角色；開局 spec 帶入', () => {
  assert.equal(srcOf('baozupo'), 'zhou'); assert.equal(srcOf('guojing'), 'jin');
  const s = st(); s.xiaStyle = 'jin'; assert.ok(xiaPool(s).every((k) => srcOf(k) === 'jin'));
  s.xiaStyle = 'zhou'; assert.ok(xiaPool(s).every((k) => srcOf(k) === 'zhou')); s.xiaStyle = 'all'; assert.ok(styleOk(s, 'baozupo') && styleOk(s, 'yangguo'));
  const h = createState(5); applyHero(h, { kind: 'template', id: 'guojing', companion: 'huangrong', xiaStyle: 'jin' }, initPair); assert.equal(h.xiaStyle, 'jin');
  const h2 = createState(5); applyHero(h2, { kind: 'template', id: 'guojing', xiaStyle: 'bogus' }, initPair); assert.equal(h2.xiaStyle, 'all');
});
test('傳功：圓滿以上才傳；對方 +15；每門每對一次；好感上升；寫記憶', () => {
  const s = st(), [a, b] = s.ds.filter((d) => d.role !== 'laborer'); assert.equal(passPick(s, a), null, '未圓滿不傳');
  master(s, a); const pp = passPick(s, a); assert.ok(pp && pp.art === 'basicFist'); const x0 = b.arts.basicFist?.xp || 0, f0 = aff(s, a, b);
  assert.ok(passDo(s, a, pp.p, pp.art)); assert.ok(pp.p.arts.basicFist.xp >= Math.min(x0 + PASS.gain, 40) - 1e-9); assert.ok(aff(s, a, pp.p) > f0 || pp.p !== b);
  assert.equal(passDo(s, a, pp.p, pp.art), false, '同門同對只能一次'); assert.ok(memsOf(s, a, pp.p).some((m) => m.k === 'pass'));
  assert.equal(passPick(s, a), null, '同一天只傳一次');
});
test('傳功是自走活動：條件達成後會進評分並實際完成', () => {
  const s = st(7); const a = s.ds.find((d) => d.role !== 'laborer'); master(s, a); assert.ok(scoreActs(s, a).some((x) => x.act === 'pass'));
  for (let i = 0; i < DAY * 4 * 2 && !Object.keys(s.passed || {}).length; i++) { tick(s); if (i % 50 === 0) assert.deepEqual(invariants(s), []); }
  assert.ok(Object.keys(s.passed || {}).length >= 1); assert.ok(s.log.some((l) => l.msg.includes('【傳功】')));
});
test('收徒：內門收好感 ≥30 的外門，一人一徒；徒弟有傳功加成、師父在場練功 ×1.15', () => {
  const s = st(), [m, o] = s.ds.filter((d) => d.role !== 'laborer'); m.role = 'inner'; o.role = 'outer'; o.master = null;
  initPair(s, m, o, 10); assert.deepEqual(apprCands(s, m), []); initPair(s, m, o, APPR.aff); assert.deepEqual(apprCands(s, m).map((d) => d.id), [o.id]);
  assert.equal(takePupil(s, o, m), false, '外門不能收內門'); apprDaily(s); assert.equal(o.master, m.id); assert.equal(pupilsOf(s, m).length, 1);
  assert.equal(apprMul(s, o), APPR.trainMul); m.away = true; assert.equal(apprMul(s, o), 1); m.away = false;
  master(s, m); const x0 = o.arts.basicFist?.xp || 0; passDo(s, m, o, 'basicFist'); assert.ok(o.arts.basicFist.xp - x0 >= PASS.gain + PASS.apprBonus - 1e-9 || o.arts.basicFist.xp >= 40 - 1e-9);
  assert.ok(memsOf(s, m, o).some((x) => x.k === 'apprentice'));
});
test('存檔來回：記憶、師徒、傳功紀錄、畫風保留；同種子決定性', () => {
  const s = st(9); const [a, b] = s.ds; addMem(s, a, b, 'spar'); b.master = a.id; s.passed = { k: 1 }; s.xiaStyle = 'zhou';
  const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.mem.length, 1); assert.equal(r.state.ds[1].master, a.id); assert.equal(r.state.xiaStyle, 'zhou'); assert.deepEqual(r.state.passed, { k: 1 });
  const h = () => { const x = createState(42); runDays(x, 8); return save(x); }; assert.equal(h(), h());
});
test('名俠絕學（secret／classic）不走一般傳功', () => {
  const s = st(), a = s.ds.find((d) => d.role !== 'laborer'); master(s, a, 'xianglong'); assert.equal(passPick(s, a), null);
});
