// v1.9：I-2 三四階要名聲＋稀有料、v1.6 建築佔地＋擴地花錢；I-6 財富襲擊＋山賊勒索（<8 人不來、只重傷不死）；A9 因才派巡
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startBuild, buildWhy, buyLot, lotCost, lotsUsed, lotsOf } from '../src/sim.mjs';
import { DAY, FACILITIES, ROUTE, LOTS } from '../src/data.mjs';
import { RAID, T, points, wealth, threatDaily, threatStep, raidResolve, raidAuto, headcount, threatHtml } from '../src/threat.mjs';
import { suggestTeam } from '../src/expedition.mjs';
import { migrate } from '../src/save.mjs';

const H = { think: () => {} };
const grow = (s, n) => { const b = s.ds.find((d) => d.id !== 'hero'); while (s.ds.length < n) s.ds.push({ ...structuredClone(b), id: `p${s.ds.length}`, adult: true, role: 'inner' }); return s; };
test('三階大廳：先卡名聲、再卡稀有料；兩者都夠才立藍圖並扣料', () => {
  const s = createState(3); s.fac.hall.stage = 1; s.res.coin = 999; s.rep = 0; assert.match(buildWhy(s, 'hall'), /名聲/);
  s.rep = 99; assert.match(buildWhy(s, 'hall'), /鐵木不足/, '反例：名聲夠了沒有鐵木也不行'); assert.equal(startBuild(s, 'hall'), false);
  s.res.tiemu = 2; assert.equal(buildWhy(s, 'hall'), null); assert.ok(startBuild(s, 'hall')); assert.equal(s.res.tiemu, 0); assert.equal(s.res.coin, 999 - 60);
  const d = FACILITIES.find((f) => f.id === 'dorm'); assert.ok(d.stages.every((x) => !x.rare), '大通鋪不卡稀有料（v1.85 plain ≥10 人要靠它）');
});
test('稀有料只在巡山遠段：深谷起鐵木、古洞起靈石', () => {
  const has = (k) => ROUTE.filter((g) => g.find[k]).map((g) => g.id);
  assert.deepEqual(has('tiemu'), ['gorge', 'cliff']); assert.deepEqual(has('lingshi'), ['cave', 'peak']);
  for (const g of ROUTE.slice(0, 3)) assert.ok(!g.find.tiemu && !g.find.lingshi, `反例：${g.name}不掉稀有料`);
});
test('地塊：開山 4 塊，滿了第 5 座 v1.6 建築要先擴地；擴地每塊 ×1.5、上限 10', () => {
  const s = createState(3); s.res.coin = 99999; s.rep = 999; const v16 = FACILITIES.filter((f) => f.v16 && !f.sig);
  for (const f of v16.slice(0, 4)) s.fac[f.id].stage = 1; assert.equal(lotsUsed(s), 4);
  assert.match(buildWhy(s, v16[4].id), /沒有空地/); assert.equal(lotCost(s), 50); assert.ok(buyLot(s).ok); assert.equal(lotCost(s), 75); assert.equal(buildWhy(s, v16[4].id), null);
  s.fac.hall.stage = 0; assert.equal(buildWhy(s, 'hall'), null, '反例：核心設施不佔地');
  while (lotsOf(s).n < LOTS.max) buyLot(s); assert.equal(buyLot(s).ok, false);
});
test('山賊：全派 <8 人威脅為 0（不來）；≥8 人隨家底與天數漲、封頂', () => {
  const s = createState(3); s.day = 20; s.res.coin = 500; assert.ok(headcount(s) < 8); assert.equal(points(s), 0);
  for (let i = 0; i < 30; i++) threatDaily(s), s.day++; assert.equal(T(s).n, 0, '反例：人少一次都沒來');
  const a = grow(createState(3), 8); a.day = 20; a.res.coin = 100; const p1 = points(a); a.res.coin = 600; const p2 = points(a); assert.ok(p1 > 0 && p2 > p1);
  a.day = 2; assert.ok(points(a) < p2, '天數係數'); a.day = 60; a.res.coin = 1e6; assert.equal(points(a), RAID.cap);
});
test('勒索：付錢扣錢；迎戰勝負都只重傷不死、孩子不上陣；半日沒決定自動處置', () => {
  const s = grow(createState(3), 9); s.day = RAID.first; s.res.coin = 400; s.ds[1].adult = false; const P = threatDaily(s); assert.ok(P && P.demand > 0);
  assert.match(threatHtml(s), /付錢了事/); const c0 = s.res.coin; assert.ok(raidResolve(s, 0, H).paid); assert.equal(s.res.coin, c0 - P.demand); assert.equal(T(s).paid, 1);
  for (let k = 0; k < 40; k++) { T(s).next = s.day; threatDaily(s); raidResolve(s, 1, H); for (const d of s.ds) d.hp = 100; }
  assert.equal(s.ds.length, 9, '不死人'); assert.equal(T(s).deaths, 0); assert.ok(T(s).homeHurt > 0); assert.equal(s.ds[1].raidHurt || 0, 0, '反例：孩子不會被打傷');
  s.res.coin = 0; T(s).next = s.day; threatDaily(s); assert.equal(raidAuto(s), 1, '付不起只能迎戰'); s.t = T(s).pending.until; threatStep(s, H); assert.equal(T(s).pending, null, '過期自動處置');
});
test('A9 因才派巡：排除傷員／雜工；專長優先、附理由；老搭檔加分', () => {
  const s = createState(7); for (let i = 0; s.t < 2 * DAY; i++) tick(s); const g = suggestTeam(s, 2); assert.equal(g.ids.length, 2); assert.ok(g.why[0].includes('專長'));
  const hurt = s.ds.find((d) => d.id === g.ids[0]); hurt.hp = 40; assert.ok(!suggestTeam(s, 2).ids.includes(hurt.id), '反例：傷員不派'); hurt.hp = 100;
  s.lastExp = { ids: g.ids, style: 'clear' }; const g2 = suggestTeam(s, 2); assert.ok(g2.why[1].includes('老搭檔'));
  assert.ok(s.ds.filter((d) => d.role === 'laborer').every((d) => !g2.ids.includes(d.id)));
});
test('存檔遷移 1.9：補稀有料、地塊至少已蓋數、山賊從讀檔後第 8 日起', () => {
  const s = createState(3); const o = JSON.parse(JSON.stringify(s)); o.rules = '1.85'; delete o.lots; delete o.res.tiemu; delete o.threat; o.day = 30;
  for (const k of ['library', 'quiet', 'shrine', 'alchemy', 'clinic']) o.fac[k].stage = 1; const m = migrate(o);
  assert.equal(m.res.tiemu, 0); assert.equal(m.lots.n, 5); assert.equal(m.threat.next, 38);
});
