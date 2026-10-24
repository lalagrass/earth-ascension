'use strict';
// SG-PATROL-01（#290）西坡巡山：路線、耗能返程、鼠豬互動、召回、戰報與 save v2 的反例測試。
// 只用 demo 公開 API；常數讀 patrol-layout.mjs／model.rules，不在測試裡抄數值。
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEMO = path.join(__dirname, '..', 'experiments', 'water-carry', 'demo');
const load = (f) => import(pathToFileURL(path.join(DEMO, f)).href);

async function setup() {
  const M = await load('model.mjs'), R = await load('routes.mjs'), W = await load('water-layout.mjs'), S = await load('life-save.mjs'), L = await load('patrol-layout.mjs');
  const geo = R.createRoutes(W.WATER_POINTS);
  const r1 = (n) => Math.round(n * 10) / 10;
  const LEN = { water: W.WATER_LENGTH, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
    boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength),
    drink: r1(geo.drinkLengths.home), drinkSeat: { hero: r1(geo.drinkLengths.seat.hero), cousin: r1(geo.drinkLengths.seat.cousin) } };
  const fresh = () => M.createModel(LEN, undefined, undefined, undefined, { placeOf: geo.of, boarAt: geo.boarAt });
  const until = (m, pred, ticks = 60 * 300) => { for (let i = 0; i < ticks; i++) { if (pred(m)) return true; m.step(); } return pred(m); };
  const storage = () => { const st = new Map(); return { st, getItem: (k) => (st.has(k) ? st.get(k) : null), setItem: (k, v) => st.set(k, String(v)) }; };
  return { M, S, L, geo, fresh, until, storage };
}
const seen = (rep) => Object.fromEntries(rep.seen.map((x) => [x.id, x.res]));

test('路線：S0→S3 主路長度在 800–1200，四個路標依序、三隻林鼠在感知帶內', async () => {
  const { L } = await setup();
  assert.ok(L.MAIN_LENGTH >= 800 && L.MAIN_LENGTH <= 1200, `主路 ${L.MAIN_LENGTH}`);
  assert.deepEqual(L.WAYPOINTS.map((w) => w.id), ['S0', 'S1', 'S2', 'S3']);
  assert.equal(L.FOREST_RATS.length, 3);
  assert.equal(L.PATROL.sense, 180);
  for (const r of L.FOREST_RATS) assert.ok(L.inForest(r.x, r.y));
});

test('無野豬：整趟巡完 S3，擊倒普通鼠、警覺鼠逃走，返院後只給一份戰報且不自動再巡', async () => {
  const { fresh, until } = await setup();
  const m = fresh();
  assert.ok(m.dispatch('patrol', 'hero').ok !== false);
  assert.ok(until(m, (x) => x.state.patrolReport));
  const r = m.state.patrolReport;
  assert.equal(r.end, 'end'); assert.ok(r.far >= 842); assert.equal(r.home, true);
  const s = seen(r);
  assert.equal(s['patrol-rat-2'], 'down'); assert.equal(s['patrol-rat-3'], 'escaped');
  assert.equal(m.state.patrol, null); assert.equal(m.state.patrolLog.length, 1);
  for (let i = 0; i < 600; i++) m.step();
  assert.equal(m.state.patrol, null, '不自動再巡');
});

test('出發門檻：精力 < 40 不出發，先等回到 80 才走', async () => {
  const { fresh, M } = await setup();
  const m = fresh();
  m.state.people.hero.energy = 39;
  m.dispatch('patrol', 'hero');
  m.step();
  assert.ok(!M.PATROL_MODES.includes(m.state.people.hero.motion.mode));
});

test('野豬：靠近 ≤120 且可合法站到 ≤60 → 喝止驅離，記為本次驅離並佔同一來訪名額', async () => {
  const { fresh, until } = await setup();
  const m = fresh();
  m.state.boar.e = 80 * 240;
  for (let i = 0; i < 600; i++) m.step();
  const h = m.state.people.hero;
  h.motion = { mode: 'idle', job: null, phase: null, steps: 0, need: null, tripLevel: 1 }; m.state.inFlight = 0; m.state.shadow.active = false;
  m.dispatch('patrol', 'hero');
  assert.ok(until(m, (x) => x.state.patrolReport));
  assert.equal(seen(m.state.patrolReport).boar, 'drove');
});

test('野豬：站不到合法喝止點 → 不追豬、記未處理、以近威脅返院', async () => {
  const { fresh, until } = await setup();
  const m = fresh();
  m.state.boar.e = 80 * 240;
  m.dispatch('patrol', 'hero');
  assert.ok(until(m, (x) => x.state.patrolReport));
  assert.equal(m.state.patrolReport.end, 'threat');
  assert.equal(seen(m.state.patrolReport).boar, 'unhandled');
});

test('召回：途中召回走完本段後返院，戰報理由為玩家', async () => {
  const { fresh, until } = await setup();
  const m = fresh();
  m.dispatch('patrol', 'hero');
  until(m, (x) => x.state.patrol && x.state.patrol.phase === 'go' && x.state.patrol.ri > 8);
  m.dispatch('patrolCancel', 'hero');
  assert.ok(until(m, (x) => x.state.patrolReport));
  assert.equal(m.state.patrolReport.end, 'player');
  assert.ok(m.state.patrolReport.far < 842);
});

test('save v2：巡山中存檔、讀回暫停且續跑逐欄相同', async () => {
  const { fresh, until, S, storage } = await setup();
  const a = fresh();
  a.dispatch('patrol', 'hero');
  until(a, (x) => x.state.patrol && x.state.patrol.ri > 9);
  const sto = storage();
  assert.ok(S.saveTo(sto, a).ok);
  const env = JSON.parse(sto.st.get(S.SAVE_KEY));
  assert.equal(env.saveVersion, 2);
  const b = fresh();
  const r = S.loadFrom(sto, b, fresh().exportState());
  assert.ok(r.ok, r.text);
  for (let i = 0; i < 1200; i++) { a.step(); b.step(); }
  assert.deepEqual(b.exportState(), a.exportState());
});

test('save v1→v2：嚴格驗證後只補 patrol／patrolReport／patrolLog／prats，其餘無損', async () => {
  const { fresh, S } = await setup(); const P = await load('patrol.mjs');
  const a = fresh();
  for (let i = 0; i < 3000; i++) a.step();
  const st = a.exportState(S.LOG_KEEP);
  for (const k of ['patrol', 'patrolReport', 'patrolLog', 'prats']) delete st[k];
  const s2 = new Map(); S.saveTo({ setItem: (k, v) => s2.set(k, v) }, a);
  const v1 = { saveVersion: 1, compat: S.COMPAT_ID, savedAt: 'x', geometry: JSON.parse([...s2.values()][0]).geometry, state: st };
  const b = fresh();
  const r = S.loadInto(b, JSON.stringify(v1), fresh().exportState());
  assert.ok(r.ok, r.text); assert.equal(r.migrated, true);
  const got = b.exportState(S.LOG_KEEP);
  assert.equal(got.patrol, null); assert.equal(got.patrolReport, null); assert.deepEqual(got.patrolLog, []);
  assert.deepEqual(got.prats, P.freshForestRats());
  for (const k of Object.keys(st)) assert.deepEqual(got[k], st[k], k);
  // v1 帶巡山欄位或巡山模式 → 拒絕，且原局不變
  const before = JSON.stringify(b.exportState());
  const bad1 = JSON.parse(JSON.stringify(v1)); bad1.state.patrol = null;
  assert.equal(S.loadInto(b, JSON.stringify(bad1), fresh().exportState()).ok, false);
  const bad2 = JSON.parse(JSON.stringify(v1)); bad2.state.people.hero.motion.mode = 'patrolGo';
  assert.equal(S.loadInto(b, JSON.stringify(bad2), fresh().exportState()).ok, false);
  const bad3 = JSON.parse(JSON.stringify(v1)); bad3.saveVersion = 3;
  assert.equal(S.loadInto(b, JSON.stringify(bad3), fresh().exportState()).ok, false);
  assert.equal(JSON.stringify(b.exportState()), before, '拒絕是原子的');
});

test('save v2 反例：返程不可行、名額不一致、林鼠身份錯、路標錯 → 拒絕', async () => {
  const { fresh, until, S, storage } = await setup();
  const a = fresh();
  a.dispatch('patrol', 'hero');
  until(a, (x) => x.state.patrol && x.state.patrol.ri > 9 && x.state.people.hero.motion.mode === 'patrolGo');
  const sto = storage(); S.saveTo(sto, a);
  const base = JSON.parse(sto.st.get(S.SAVE_KEY));
  const cases = {
    returnInfeasible: (e) => { e.state.people.hero.energy = 0.5; },
    noHolder: (e) => { e.state.patrol = null; },
    ratId: (e) => { e.state.prats[0].id = 'x'; },
    wp: (e) => { e.state.patrol.obs.push('S9'); },
    geo: (e) => { e.patrolGeo = 'other'; },
    chase: (e) => { e.state.patrol.off = { from: { x: 0, y: 0 }, ri: e.state.patrol.ri, ticks: 999, target: 'boar' }; },
  };
  const b = fresh(), before = JSON.stringify(b.exportState());
  for (const [name, f] of Object.entries(cases)) {
    const e = JSON.parse(JSON.stringify(base)); f(e);
    assert.equal(S.loadInto(b, JSON.stringify(e), fresh().exportState()).ok, false, name);
  }
  assert.equal(JSON.stringify(b.exportState()), before);
});

test('review P2-1：返程存檔按目前短段＋剩餘 queue 驗真實耗能；正常返程可續玩，0 精力原子拒絕', async () => {
  const { fresh, until, S, storage } = await setup();
  const a = fresh();
  a.dispatch('patrol', 'hero');
  assert.ok(until(a, (x) => x.state.patrol && x.state.patrol.phase === 'back' && x.state.people.hero.motion.queue.length > 5));
  const sto = storage(); S.saveTo(sto, a);
  const base = JSON.parse(sto.st.get(S.SAVE_KEY));
  const ok = fresh();
  assert.equal(S.loadInto(ok, JSON.stringify(base), fresh().exportState()).ok, true);
  assert.ok(until(ok, (x) => x.state.patrolReport));
  const b = fresh(), before = JSON.stringify(b.exportState());
  for (const f of [(e) => { e.state.people.hero.energy = 0; }, (e) => { e.state.people.hero.motion.queue = 'x'; }]) {
    const e = JSON.parse(JSON.stringify(base)); f(e);
    assert.equal(S.loadInto(b, JSON.stringify(e), fresh().exportState()).ok, false);
  }
  assert.equal(JSON.stringify(b.exportState()), before);
});

test('review P2-2：戰報缺 UI 必讀欄位（obs／spent）或個體錯 → 替換前拒絕；正常戰報保留', async () => {
  const { fresh, until, S, storage } = await setup();
  const a = fresh();
  a.dispatch('patrol', 'hero');
  assert.ok(until(a, (x) => x.state.patrolReport));
  const sto = storage(); S.saveTo(sto, a);
  const base = JSON.parse(sto.st.get(S.SAVE_KEY));
  const ok = fresh();
  assert.equal(S.loadInto(ok, JSON.stringify(base), fresh().exportState()).ok, true);
  assert.deepEqual(ok.state.patrolReport, a.state.patrolReport);
  const b = fresh(), before = JSON.stringify(b.exportState());
  const cases = {
    minimal: (e) => { e.state.patrolReport = { by: 'hero', home: true, end: 'end', far: 0, seen: [] }; },
    noSpent: (e) => { delete e.state.patrolReport.spent; },
    badSeen: (e) => { e.state.patrolReport.seen.push({ id: 'rat9', kind: 'normal', res: 'down' }); },
    badLog: (e) => { e.state.patrolLog.push({ by: 'hero' }); },
  };
  for (const [name, f] of Object.entries(cases)) {
    const e = JSON.parse(JSON.stringify(base)); f(e);
    assert.equal(S.loadInto(b, JSON.stringify(e), fresh().exportState()).ok, false, name);
  }
  assert.equal(JSON.stringify(b.exportState()), before);
});
