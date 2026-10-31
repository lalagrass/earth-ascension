/* v2.25（loop148–）：盲測五項修正，全部只在 v22 新局生效 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { MARKET, marketDo, marketWhy, left, econHtml } from '../src/economy.mjs';
const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const OLD = () => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false });

test('loop148 市集：鐵木 35×2、靈石 40×1，每集限量；買完補貨後可再買', () => {
  const s = V(); s.res.coin = 500; s.res.tiemu = 0; s.res.lingshi = 0;
  assert.equal(MARKET.rare.tiemu.price, 35); assert.equal(left(s, 'tiemu'), 2); assert.equal(left(s, 'lingshi'), 1);
  assert.ok(marketDo(s, 'tiemu').ok); assert.ok(marketDo(s, 'tiemu').ok); assert.equal(marketDo(s, 'tiemu').ok, false);
  assert.ok(marketDo(s, 'lingshi').ok); assert.match(marketWhy(s, 'lingshi'), /賣完/);
  assert.equal(s.res.tiemu, 2); assert.equal(s.res.lingshi, 1); assert.equal(s.res.coin, 500 - 70 - 40);
  s.day += MARKET.every; assert.equal(left(s, 'tiemu'), 2);
  const h = econHtml(s); assert.match(h, /買鐵木×1/); assert.match(h, /買靈石×1/);
});
test('loop148 市集：錢不夠不能買；舊局沒有稀有料', () => {
  const s = V(); s.res.coin = 30; assert.match(marketWhy(s, 'tiemu'), /錢不夠/);
  const o = OLD(); o.res.coin = 500; assert.ok(marketWhy(o, 'tiemu')); assert.equal(left(o, 'tiemu'), 0); assert.doesNotMatch(econHtml(o), /鐵木/);
});

import { stewardDaily, stewFallback } from '../src/economy.mjs';
const H0 = (s, built) => ({ siteOf: () => null, capacity: () => 99, startBuild: (s2, id) => { built.push(id); s2.fac[id].stage = 1; return true; } });
const ready = (s) => { s.fac.yard.stage = 1; s.fac.kitchen.stage = 1; while (s.ds.length < 6) s.ds.push({ ...s.ds[0], id: 'x' + s.ds.length }); s.res.wood = 20; s.res.stone = 3; s.steward = true; s.stewkit = false; s.stewyard = false; };
test('loop148 執事補位：基礎齊、人數 ≥6 → 先藏經閣再工寮；石料差 3 以內也立藍圖', () => {
  const s = V(); ready(s); const b = [];
  assert.equal(stewardDaily(s, H0(s, b)), 'library'); assert.equal(stewardDaily(s, H0(s, b)), 'shed'); assert.equal(stewardDaily(s, H0(s, b)), null);
  assert.deepEqual(b, ['library', 'shed']);
});
test('loop148 執事補位：膳房沒蓋、人不夠、石料差太多、舊局 → 不立', () => {
  let s = V(); ready(s); s.fac.kitchen.stage = 0; assert.equal(stewFallback(s), null);
  s = V(); ready(s); s.ds.length = 5; assert.equal(stewFallback(s), null);
  s = V(); ready(s); s.res.stone = 2; assert.equal(stewFallback(s), 'shed');
  s = OLD(); ready(s); assert.equal(stewFallback(s), null);
});

import { breakTier } from '../src/sim.mjs';
import { log } from '../src/util.mjs';
test('loop148 化境暫停：只有本門第一位化境、第一位返璞歸真、掌門本人化境', () => {
  const s = V(), hero = { id: 'hero' }, a = { id: 'a' }, b = { id: 'b' };
  assert.equal(breakTier(s, a, { stage: 1 }), null);
  assert.equal(breakTier(s, a, { stage: 2 }), 'top'); assert.equal(breakTier(s, b, { stage: 2 }), 'mid'); assert.equal(breakTier(s, hero, { stage: 2 }), 'top');
  assert.equal(breakTier(s, b, { stage: 3 }), 'top'); assert.equal(breakTier(s, a, { stage: 3 }), 'mid'); assert.equal(breakTier(s, hero, { stage: 3 }), 'mid');
  s.alert = null; log(s, '乙打坐衝關成功：「某拳」臻至化境！', 'mid'); assert.equal(s.alert, null); assert.equal(s.log[0].tier, 'mid');
  assert.equal(breakTier(OLD(), a, { stage: 2 }), null);
});

import { CARDS, villainOk, VILLAIN, jhInit } from '../src/jianghu.mjs';
test('loop148 東方不敗／火雲：閉門不出後冷卻 ≥8 日，最多再來 2 次', () => {
  for (const k of ['dfbb', 'hy']) { const s = V(); s.jh = jhInit(); s.res.coin = 999; const seen = [];
    for (let day = 8; day <= 60; day++) { s.day = day; if (s.jh[k + 'Day'] !== day && villainOk(s, k)) { s.jh[k + 'Day'] = day; seen.push(day); CARDS[k].opts[1][1](s, {}); } }
    assert.equal(seen.length, 1 + VILLAIN.more, k); for (let i = 1; i < seen.length; i++) assert.ok(seen[i] - seen[i - 1] >= VILLAIN.cool, k); }
});

import { settle, facBill, wageBill, E } from '../src/economy.mjs';
import { lairLine, threatHtml } from '../src/threat.mjs';
const HH = { think() {}, removeDisciple() {} };
const billed = (s, coin) => { s.fac.hall.stage = Math.max(1, s.fac.hall.stage); const w = wageBill(s), f = facBill(s); s.res.coin = w + coin; settle(s, HH); return f; };
test('loop148 維護寬限：差一點先欠款警告、不失修；下期付清補上，下期再付不清才失修', () => {
  let s = V(); const f = billed(s, 0); assert.ok(f > 0);
  s = V(); billed(s, f - 2); const X = E(s); assert.equal(X.disrepair, false); assert.equal(X.owed, 2); assert.match(s.log.map((e) => e.msg).join('|'), /【維護欠款】/); assert.equal(s.res.coin, 0);
  billed(s, f + 2); assert.equal(X.owed, 0); assert.equal(X.disrepair, false); assert.equal(s.res.coin, 0);
  billed(s, f - 2); billed(s, f - 2); assert.equal(X.disrepair, true);
  s = V(); billed(s, 0); assert.equal(E(s).disrepair, true, '差太多照舊失修');
  const o = OLD(); billed(o, f - 2); assert.equal(E(o).disrepair, true, '舊局照舊');
});
test('loop148 山寨狀態行：探明後才顯示，只寫出征中／破寨次數／太平', () => {
  const s = V(); assert.equal(lairLine(s), ''); s.lair = { found: 5, n: 0, won: 0, next: 0, trip: null };
  assert.match(threatHtml(s), /・後山山寨：已探明（待精銳與存糧齊備時出擊）/);
  s.lair.n = 3; s.lair.won = 2; assert.match(lairLine(s), /已破 2 次，失手 1 次/);
  s.lair.trip = { back: 1 }; assert.match(lairLine(s), /正在攻寨中/); s.lair.trip = null; s.threat.taiping = true; assert.match(lairLine(s), /山道永享太平/);
  const o = OLD(); o.lair = { n: 0, won: 0 }; assert.equal(lairLine(o), '');
});

import { marriable } from '../src/sect.mjs';
import { tick } from '../src/sim.mjs';
test('loop148 婚姻排他：成過親的人（配偶已離山）不再拜堂', () => {
  const s = V(), [a, b] = s.ds; const c = { ...JSON.parse(JSON.stringify(b)), id: 'c3', name: '丙' }; s.ds.push(c);
  for (const x of [a, c]) { x.adult = true; x.spouse = null; } a.sweet = c.id; c.sweet = a.id; s.rel[[a.id, c.id].sort().join('|')] = 99; a.wed = 'gone';
  assert.equal(marriable(s, a, c), false); a.wed = undefined; const ok = marriable(s, a, c); a.wed = 'gone'; assert.equal(marriable(s, c, a), false); void ok;
});
test('loop148 重現：郭靖模板 seed 1 林師姐欠俸離山後，郭靖不會再與令狐沖拜堂（v2.2 第 23 日重婚）', () => {
  const s = createState(1, { kind: 'template', id: 'guojing', askMajor: false, xiaStyle: 'all', v22: true, steward: true, stewkit: true, stewyard: true });
  const wed = {}; let last = null;
  for (let i = 0; i < 26 * 100; i++) { tick(s, 6); s.alert = null; for (const e of s.log) { if (e === last) break; const m = e.msg.match(/【成親】(.+?)與(.+?)在大廳/); if (m) for (const x of [m[1], m[2]]) wed[x] = (wed[x] || 0) + 1; } last = s.log[0]; }
  assert.ok(Object.keys(wed).length > 0, '有人成親'); for (const [k, v] of Object.entries(wed)) assert.equal(v, 1, `${k} 拜堂 ${v} 次`);
});
