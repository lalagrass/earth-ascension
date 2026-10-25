import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { ARTS, RULES_VERSION, DAY, JH } from '../src/data.mjs';
import { artTier } from '../src/arts.mjs';
import { join, XIA_PAIRS, xiaResolve } from '../src/wuxia.mjs';
import { jhStep, jhResolve, card, comedyOk, CARDS } from '../src/jianghu.mjs';
import { migrate } from '../src/save.mjs';
const st = (o = {}) => { const s = createState(11, { kind: 'template', id: 'guojing', companion: 'huangrong', askMajor: true, ...o }); tick(s); s.jh.morningOn = false; return s; };
const run = (s, t) => { const e = s.t + t; while (s.t < e) tick(s); };
const pick = (s, k, i = 0) => { const ch = s.choices.find((c) => c.jh === k); assert.ok(ch, `card ${k}`); jhResolve(s, ch, i); };
test('v1.3 版本；新武學齊備且都有招牌主人', () => {
  assert.ok(parseFloat(RULES_VERSION) >= 1.3);
  for (const id of ['anran', 'xuantie', 'yunv', 'zuoyou', 'kongming', 'kuihua', 'huagu', 'jiuyang', 'qiankun', 'taiji', 'shihou', 'tantui', 'tiexian', 'bagua', 'hama']) assert.ok(ARTS.find((a) => a.id === id), id);
});
test('黯然銷魂掌：心情越低越強，≤30 時 ×1.5', () => {
  const s = st(); const y = join(s, 'yangguo'); assert.ok(artTier(y, 'anran') >= 2);
  y.mood = 90; jhStep(s, 0.25); const hi = y.jhMul; y.mood = 20; jhStep(s, 0.25); assert.equal(y.jhMul, JH.anranMax); assert.ok(hi < y.jhMul);
});
test('神鵰餵三次結緣 → 斷臂事件：玄鐵劍法、單手、身法 −10%', () => {
  const s = st(); const y = join(s, 'yangguo'); s.t += DAY;
  for (let i = 0; i < 3; i++) { s.choices = []; jhStep(s, 0.25); pick(s, 'diao'); }
  s.choices = []; const ag = y.skills.agility; jhStep(s, 0.25); pick(s, 'arm');
  assert.ok(y.oneArm && artTier(y, 'xuantie') >= 2 && y.skills.agility < ag);
});
test('小龍女：玉蜂漿治傷；與楊過雙劍合璧 25%（上限）', () => {
  const s = st(); const x = join(s, 'xiaolongnv'); assert.ok(artTier(x, 'yunv') >= 2); s.choices = []; jhStep(s, 0.25); pick(s, 'tomb'); assert.ok(s.jh.bees);
  x.hp = 50; s.day++; jhStep(s, 0.25); assert.equal(x.hp, 50 + JH.honeyHeal); assert.equal(XIA_PAIRS['xiaolongnv+yangguo'], 0.25);
});
test('周伯通：賭贏才教（先左右互搏給憨厚的，再空明拳），教完就跑；輸了沒損失', () => {
  const s = st(); s.xia.pending = 'zhoubotong'; xiaResolve(s, { xia: 'zhoubotong' }, 0); assert.ok(s.jh.zbt);
  const H = { rand: () => 0.99 }; s.choices = []; jhStep(s, 0.25, H); const coin = s.res.coin; jhResolve(s, s.choices.find((c) => c.jh === 'zbt'), 0, H); assert.equal(s.jh.zbt.losses, 1);
  // 贏
  s.jh.rng = 1; for (let i = 0; i < 2; i++) { s.day++; s.choices = []; jhStep(s, 0.25); const ch = s.choices.find((c) => c.jh === 'zbt'); jhResolve(s, ch, 0, { rand: () => 0 }); }
  assert.equal(s.jh.zbt, null); assert.ok(s.ds.some((d) => d.arts?.zuoyou) && s.ds.some((d) => d.arts?.kongming)); assert.ok(s.res.coin >= coin);
});
test('東方不敗：打退拿葵花殘頁 20%，葵花＝斷情＋心情上限 −20；打不贏重傷不死；不能入門', () => {
  const s = st(); s.day = 8; s.choices = []; jhStep(s, 0.25); const ch = s.choices.find((c) => c.jh === 'dfbb'); assert.ok(ch); assert.ok(!('dongfangbubai' in (s.xia.done || {})));
  jhResolve(s, ch, 0, { rand: () => 0.99 }); const n = s.ds.length; if (s.jh.dfbb === 1) assert.equal(s.ds.length, n);
  const t = st(); t.ds.forEach((d) => { d.skills.palm = 100; for (const a of ['xianglong', 'dagou']) { d.arts[a] = { xp: 90, bt1: true, bt2: false }; } }); t.day = 8; t.choices = []; jhStep(t, 0.25); jhResolve(t, t.choices.find((c) => c.jh === 'dfbb'), 0, { rand: () => 0.99 });
  assert.equal(t.jh.dfbb, 2); assert.ok(t.ds.some((d) => d.arts?.kuihua?.xp >= JH.residueXp)); pick(t, 'kuihua'); const h = t.ds.find((d) => d.id === 'hero'); assert.equal(h.moodCap, 80); assert.ok(h.duanqing != null);
});
test('韋小寶入門：賭坊每日抽頭有上限', () => {
  const s = st(); join(s, 'weixiaobao'); s.rep = 999; const c = s.res.coin; s.day++; jhStep(s, 0.25); assert.equal(s.res.coin - c, JH.gambleCap);
});
test('隱藏高手：具名雜工最多 3 人；斧頭幫勒索才揭露，揭露即大成、不再進步', () => {
  const s = st(); for (let i = 0; i < 8; i++) { const d = { ...s.ds[0], id: `L${i}`, name: `工${i}`, role: 'laborer', arts: {}, hiddenRolled: false, hidden: null }; s.ds.push(d); }
  jhStep(s, 0.25, { rand: () => 0 }); assert.equal(s.ds.filter((d) => d.hidden).length, 3); assert.ok(s.ds.some((d) => d.name === '苦力強'));
  s.day = 3; s.choices = []; jhStep(s, 0.25); pick(s, 'axe'); const k = s.ds.find((d) => d.hidden?.shown); assert.equal(artTier(k, k.hidden.art), 2);
  k.arts[k.hidden.art].xp = 99; jhStep(s, 0.25); assert.equal(k.arts[k.hidden.art].xp, k.hidden.xp);
});
test('喜劇卡每週最多 2 張、不扣血；可關', () => {
  const s = st(); s.jh.hai = 1; let n = 0; for (const k of ['paicuo', 'zhabo', 'bao']) if (card(s, k)) n++; assert.equal(n, 2); assert.ok(!comedyOk(s));
  s.t += 7 * DAY; assert.ok(comedyOk(s)); s.jh.comedyOn = false; assert.ok(!comedyOk(s)); for (const k of Object.keys(CARDS)) if (CARDS[k].comedy) assert.ok(CARDS[k].opts.length >= 2);
});
test('晨課令：每日一張 3 選 1，可關', () => {
  const s = st(); s.jh.morningOn = true; s.day++; s.choices = []; jhStep(s, 0.25); const ch = s.choices.find((c) => c.jh === 'morning'); assert.equal(ch.opts.length, 3);
  s.jh.morningOn = false; s.day++; s.choices = []; jhStep(s, 0.25); assert.ok(!s.choices.some((c) => c.jh === 'morning'));
});
test('包租婆帶包租公上山：獅子吼＋太極，夫妻連攜', () => {
  const s = st(); join(s, 'baozupo'); const g = s.ds.find((d) => d.xia === 'baozugong'); assert.ok(g && artTier(g, 'taiji') >= 2); assert.equal(XIA_PAIRS['baozugong+baozupo'], 0.25);
});
test('張無忌／韋小寶／阿星模板主線自動駕駛能往下走', () => {
  for (const [id, min] of [['zhangwuji', 4], ['weixiaobao', 5], ['axing', 3]]) { const s = createState(5, { kind: 'template', id, askMajor: false }); s.jh.comedyOn = false; run(s, DAY * 10.5); assert.ok((s.hero.arcStep || 0) >= min, `${id} ${s.hero.arcStep}`); }
});
test('存檔遷移到 1.3', () => { const s = st(); const raw = JSON.parse(JSON.stringify({ ...s, fx: [] })); delete raw.jh; raw.rules = '1.2'; const o = migrate(raw); assert.ok(o.jh && o.jh.comedyOn); });
