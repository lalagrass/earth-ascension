import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { RULES_VERSION, DAY } from '../src/data.mjs';
import { artMulParts, learnArt, artById } from '../src/arts.mjs';
import { GEN, genStep, adopt, marriable, canSucceed, succeed, heirs, removeDisciple, genResolve } from '../src/gen.mjs';
import { sectStep } from '../src/sect.mjs';
import { budgetOf, validStats, resolveChoice } from '../src/hero.mjs';
import { migrate } from '../src/save.mjs';
import { relKey } from '../src/util.mjs';
const mk = () => { const s = createState(5, { kind: 'template', id: 'guojing', companion: 'huangrong', askMajor: true }); tick(s); s.jh.morningOn = false; s.jh.comedyOn = false; return s; };
const H = (s) => s.ds.find((d) => d.id === 'hero');
const other = (s, n = 0) => s.ds.filter((d) => d.id !== 'hero' && d.adult)[n];
const day = (s) => { s.day++; genStep(s); };
const wed = (s, a, b) => { s.rel[relKey(a.id, b.id)] = 95; s.families.push(relKey(a.id, b.id)); a.personality = ['gentle']; b.personality = ['gentle']; };
test('v1.4 版本＋舊檔遷移補 gen 與年齡', () => {
  assert.ok(parseFloat(RULES_VERSION) >= 1.4); const s = mk(); const o = JSON.parse(JSON.stringify(s)); delete o.gen; for (const d of o.ds) delete d.age; o.rules = '1.35'; migrate(o);
  assert.equal(o.gen.n, 1); assert.ok(o.ds.every((d) => d.age > 0)); assert.equal(o.rules, RULES_VERSION);
});
test('成親要道侶＋雙向相容 ≥1；成親後跳收養卡', () => {
  const s = mk(); const a = other(s, 0), b = other(s, 1); wed(s, a, b); assert.ok(marriable(s, a, b)); s.gen.lastAdopt = -1e9; s.choices = []; day(s);
  assert.equal(s.gen.couples.length, 1); assert.equal(a.spouse, b.id); const ch = s.choices.find((c) => c.gen === 'adopt'); assert.ok(ch);
  const n = s.ds.length; resolveChoice(s, ch.id, 0); assert.equal(s.ds.length, n + 1);
});
test('收養的孩子承襲養父母性格、價值觀減半、悟性根骨部分承襲；拜師', () => {
  const s = mk(); const h = H(s), b = other(s); const k = adopt(s, h, b, () => 0);
  assert.equal(k.adult, false); assert.equal(k.age, GEN.adoptAge); assert.ok(k.personality.every((t) => h.personality.includes(t) || b.personality.includes(t)));
  assert.equal(k.values.xia, Math.round((h.values.xia + 0) / 2 / 2)); assert.ok(k.wu >= 1 && k.wu <= 5); assert.ok(k.master);
});
test('孩子每 3 天長 1 歲，14 歲成年', () => {
  const s = mk(); const k = adopt(s, H(s), null, () => 0); for (let i = 0; i < 40; i++) day(s); assert.ok(k.adult); assert.equal(k.child.grown, 24); assert.ok(k.age >= GEN.adultAge);
});
test('師承：師父大成以上的武學，徒弟練 ×1.2', () => {
  const s = mk(); const h = H(s), b = other(s); learnArt(h, 'pushPalm', s.t); h.arts.pushPalm.xp = 60; h.arts.pushPalm.bt1 = true; learnArt(b, 'pushPalm', s.t);
  const t0 = artMulParts(b, artById('pushPalm')).total; b.master = 'hero'; day(s); const t1 = artMulParts(b, artById('pushPalm')).total; assert.ok(t1 > t0);
});
test('衣缽：化境才可傳；傳人得 50% 熟練＋1 星，接掌 hero；老掌門退隱；門派延續；宿慧 +1', () => {
  const s = mk(); assert.equal(canSucceed(s).ok, false); const h = H(s); learnArt(h, 'pushPalm', s.t); Object.assign(h.arts.pushPalm, { xp: 100, bt1: true, bt2: true });
  const n = heirs(s)[0]; assert.ok(n, 'heir'); const nm = n.name, sect = s.sect.id; const r = succeed(s, n.id, 'pushPalm'); assert.ok(r.ok);
  const nh = H(s); assert.equal(nh.name, nm); assert.equal(nh.arts.pushPalm.xp, 50); assert.equal(nh.arts.pushPalm.stars, 1); assert.equal(s.gen.n, 2); assert.equal(s.gen.suhui, 1);
  assert.ok(!s.ds.some((d) => d.name === '郭靖')); assert.ok(s.gen.retired.includes('郭靖')); assert.equal(s.sect.id, sect); assert.equal(s.ds.filter((d) => d.id === 'hero').length, 1);
  for (let i = 0; i < 4; i++) { const x = H(s); learnArt(x, 'pushPalm', s.t); Object.assign(x.arts.pushPalm, { xp: 100, bt2: true }); if (heirs(s)[0]) succeed(s, heirs(s)[0].id); }
  assert.ok(s.gen.suhui <= GEN.suhuiMax); for (let i = 0; i < 20; i++) tick(s);
});
test('宿慧：自創點數 +bonus（最多 +3）', () => {
  assert.equal(budgetOf({ wu: 2 }, 2), 14); assert.equal(budgetOf({ wu: 2 }, 9), 15);
  const st = { wu: 3, gen: 3, li: 3, shen: 2, ding: 2, fu: 2 }; assert.ok(validStats(st, 3)); assert.ok(!validStats(st, 0));
  const s = createState(3, { kind: 'custom', name: '甲', stats: st, answers: Array(9).fill(0), bonus: 3 }); assert.equal(s.hero.suhui, 3);
});
test('逐出真的移除弟子（含好感鍵與隊伍）', () => {
  const s = createState(5, { kind: 'template', id: 'yuebuqun', companion: 'ningzhongze', askMajor: true }); tick(s); const d = other(s); const id = d.id;
  for (const a of ['kuihua', 'huagu', 'hama']) learnArt(d, a, s.t); s.day++; sectStep(s);
  assert.ok(!s.ds.some((x) => x.id === id)); assert.ok(!Object.keys(s.aff).some((k) => k.includes(id))); assert.ok(s.sect.expelled.length); for (let i = 0; i < 20; i++) tick(s);
});
test('removeDisciple 不能移掌門', () => { const s = mk(); assert.equal(removeDisciple(s, H(s), 'x'), false); });
