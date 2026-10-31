import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { ARTS, RULES_VERSION, DAY } from '../src/data.mjs';
import { artMulParts, learnArt } from '../src/arts.mjs';
import { SECTS, SECT_K, sectBiasMul } from '../src/data.mjs';
import { sectStep, artKind, buildFac, canBuildFac, rivalGate, rivalWon, sectRecruit, favSort, sectResolve } from '../src/sect.mjs';
import { routeSeg } from '../src/world.mjs';
import { xiaPool, join } from '../src/wuxia.mjs';
import { migrate } from '../src/save.mjs';
import { resolveChoice } from '../src/hero.mjs';
const mk = (id, comp) => { const s = createState(7, { kind: 'template', id, companion: comp, askMajor: true }); tick(s); s.jh.morningOn = false; s.jh.comedyOn = false; return s; };
const day = (s) => { s.day++; sectStep(s); };
const hero = (s) => s.ds.find((d) => d.id === 'hero');
const A = (id) => ARTS.find((a) => a.id === id);
test('v1.35 版本；六位主角各有門派，自創＝無名小派', () => {
  assert.ok(parseFloat(RULES_VERSION) >= 1.35);
  const m = { guojing: 'gaibang', yuebuqun: 'qizong', linghuchong: 'jianzong', zhangwuji: 'mingjiao', weixiaobao: 'tiandihui', axing: 'zhulong' };
  for (const [h, sid] of Object.entries(m)) { const s = mk(h); assert.equal(s.sect.id, sid); assert.ok(s.sect.plaque && s.sect.color); }
  const c = createState(7, { kind: 'custom', name: '阿木', stats: { wu: 2, gen: 2, li: 2, shen: 2, ding: 2, fu: 2 }, answers: Array(9).fill(0) });
  assert.equal(c.sect.id, 'wuming'); assert.equal(c.sect.rules.length, 1); assert.equal(Object.values(c.sect.bias)[0], SECT_K.biasCap); assert.match(c.sect.plaque, /阿木派/);
});
test('剛柔巧拙偏向夾在 ±15%；外門武學 ×0.7；名俠招牌＝客傳不罰', () => {
  const s = mk('guojing'); const h = hero(s); sectStep(s);
  assert.deepEqual(sectBiasMul(h, A('xianglong')), [1.15, 1]);
  assert.equal(sectBiasMul(h, A('zixia'))[1], SECT_K.outside); assert.equal(artKind(s, h, 'zixia'), 'outside');
  assert.equal(sectBiasMul(h, A('anran'))[1], 1); assert.equal(artKind(s, h, 'anran'), 'guest');
  for (const sid of Object.keys(SECTS)) for (const a of ARTS) { h.sbias = SECTS[sid].bias; const [b] = sectBiasMul(h, a); assert.ok(b >= 0.85 && b <= 1.15); }
  sectStep(s); const t1 = artMulParts(h, A('zixia')).total; h.stree = null; const t0 = artMulParts(h, A('zixia')).total; assert.ok(Math.abs(t1 / t0 - SECT_K.outside) < 1e-9);
});
test('門規違反只加違心（不扣數值）；同條三天冷卻', () => {
  const s = mk('guojing'); const h = hero(s); s.res.food = 60; const w0 = h.wexin || 0, coin = s.res.coin; day(s);
  assert.equal(h.wexin, w0 + 1); assert.equal(s.res.food, 60); assert.equal(s.res.coin, coin); day(s); assert.equal(h.wexin, w0 + 1);
});
test('華山氣宗：收魔教中人違規；學辟邪不算叛派、學葵花算叛派', () => {
  const s = mk('yuebuqun'); const h = hero(s); const w0 = h.wexin || 0; s.ds.push({ ...s.ds[1], id: 'renyingying', name: '任盈盈' }); day(s); assert.ok(h.wexin > w0 || s.sect.violN > 0);
  learnArt(h, 'bixie', s.t); assert.equal(artKind(s, h, 'bixie'), 'outside');
  const r0 = s.sect.rep = 5; learnArt(h, 'kuihua', s.t); day(s); assert.ok(Object.keys(s.sect.defect).some((k) => k.endsWith('kuihua'))); assert.equal(s.sect.rep, r0 - SECT_K.defectRep);
});
test('外門武學練到大成 → 師門質疑卡；收手 −10', () => {
  const s = mk('guojing'); const h = hero(s); learnArt(h, 'zixia', s.t); h.arts.zixia.xp = 60; s.choices = []; day(s);
  const ch = s.choices.find((c) => c.sect === 'question'); assert.ok(ch); resolveChoice(s, ch.id, 1); assert.equal(h.arts.zixia.xp, 50);
});
test('鎮派設施：要門派聲望與材料；思過崖消違心、打狗棒堂每日糧', () => {
  const s = mk('guojing'); assert.equal(canBuildFac(s).ok, false); s.sect.rep = 5; Object.assign(s.res, { wood: 20, coin: 50 }); assert.ok(buildFac(s).ok);
  s.res.food = 10; day(s); assert.equal(s.res.food, 12);
  const y = mk('yuebuqun'); buildFac(y, true); const h = hero(y); h.wexin = 2; y.day = 2; for (let i = 0; i < 3; i++) day(y); assert.ok(h.wexin < 2);
});
test('招人風格：丐幫根骨 +1；天地會油嘴；明教帶傷', () => {
  const s = mk('guojing'); const d = { root: 3, wu: 3, hp: 100, mood: 50, personality: [], skills: { strength: 10 } }; sectRecruit(s, d); assert.equal(d.root, 4); assert.equal(d.wu, 2);
  const t = mk('weixiaobao'); const e = { root: 3, hp: 100, mood: 50, personality: [], skills: {} }; sectRecruit(t, e); assert.ok(e.personality.includes('glib'));
  const m = mk('zhangwuji'); const f = { root: 3, hp: 100, mood: 50, personality: [], skills: {} }; sectRecruit(m, f); assert.equal(f.hp, 60);
});
test('宿敵守第 2、4… 道關，打贏得門派聲望', () => {
  const s = mk('zhangwuji'); assert.equal(rivalGate(s, routeSeg(0), 0).rival, undefined);
  const G = rivalGate(s, routeSeg(1), 1); assert.equal(G.rival, '少林'); assert.ok(G.scale > (routeSeg(1).scale || 1)); rivalWon(s, G); assert.equal(s.sect.rep, SECT_K.rivalRep);
});
test('名俠加權：本派名俠排前面', () => {
  const s = mk('axing'); const p = xiaPool(s); const fav = SECTS.zhulong.fav.filter((k) => p.includes(k)); assert.deepEqual(p.slice(0, fav.length).sort(), fav.sort());
  assert.deepEqual(favSort(s, ['x', 'baozupo']), ['baozupo', 'x']);
});
test('舊存檔遷移 1.3 → 1.35 補上門派', () => {
  const s = mk('linghuchong'); const o = JSON.parse(JSON.stringify(s)); delete o.sect; o.rules = '1.3'; migrate(o); assert.equal(o.sect.id, 'jianzong'); assert.equal(o.rules, RULES_VERSION);
});
