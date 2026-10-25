// v1.55a 同圖延伸：世界、區塊、鏡頭邊界、合併敵人表、各環族群、獸襲下山演出
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import { createState, tick } from '../src/sim.mjs'; import { save, load } from '../src/save.mjs';
import { DAY, ENEMIES, MONSTERS, ROUTE, NODES, RAID_EVERY } from '../src/data.mjs';
import * as W from '../src/world.mjs';
const runDays = (s, n) => { for (let i = 0; i < n * DAY * 4; i++) tick(s); };
const core = (s) => { const o = JSON.parse(save(s)); delete o.pop; delete o.fog; /* v1.7 菜／倉預留改入預約表、宿慧 legacy、famished 遲滯旗：剝掉後應一字不差 */ delete o.vegRes; delete o.legacy; for (const d of o.ds || []) delete d.famished; for (const k of Object.keys(o.resv || {})) if (k.startsWith('stock:')) delete o.resv[k]; for (const d of o.ds || []) if (d.task?.resv) { d.task.resv = d.task.resv.filter((k) => !k.startsWith('stock:')); if (!d.task.resv.length && d.task.act === 'build') delete d.task.resv; } /* v1.6 新增欄位（未建時不影響行為）剝掉後應與 v1.5 一字不差 */ for (const k of ['water', 'pill']) { delete o.res[k]; delete o.cap[k]; } for (const k of ['library', 'quiet', 'shrine', 'alchemy', 'clinic', 'guest', 'well', 'bell', 'watch', 'sig']) delete o.fac[k]; delete o.daily; delete o.watch; delete o.watched; return crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16); };

test('核心雜湊＝v1.5 黃金值（新欄位 pop 以外的模擬結果一字不差）', () => {
  const s = createState(42); runDays(s, 30);
  assert.equal(core(s), fs.readFileSync(new URL('./fixtures/golden-30d-core.txt', import.meta.url), 'utf8').trim());
});
test('世界 6400×4800、門派在左下、山徑往右上', () => {
  assert.deepEqual(W.WORLD, { w: 6400, h: 4800 }); assert.equal(W.HOME.x, 0); assert.equal(W.HOME.y + W.HOME.h, W.WORLD.h);
  assert.deepEqual(W.DEN, [NODES.den[0], NODES.den[1] + W.HOME.y]);
  for (const r of W.RINGS) { assert.ok(r.nest[0] > W.DEN[0] && r.nest[1] < W.DEN[1], r.id); assert.ok(r.nest[0] < W.WORLD.w && r.nest[1] > 0); assert.equal(W.ringAt(r.nest), r.id); }
  assert.equal(W.ringAt([800, 4400]), 'home'); assert.equal(W.RINGS.length, 7);
});
test('區塊：256px、視窗內塊數合理、同座標同畫', () => {
  const v = W.chunksInView(W.HOME_VIEW); assert.ok(v.length >= 6 && v.length <= 40, String(v.length));
  const calls = () => { const out = []; const g = { fillRect: (...a) => out.push(['r', ...a]), arc: (...a) => out.push(['a', ...a]), beginPath() {}, fill() {}, set fillStyle(c) { out.push(c); } }; W.paintChunk(g, 9, 10); return JSON.stringify(out); };
  assert.equal(calls(), calls());
});
test('鏡頭邊界：沒巡過只看門派＋第一環；走到深谷可捲到斷崖', () => {
  const s = createState(1); const b0 = W.camBounds(s); assert.ok(b0.x1 <= W.DEN[0] + W.RINGS[0].r1 + 1);
  const far = W.clampCam({ x: 6000, y: 0, z: 1 }, b0); assert.ok(far.x <= b0.x1 - 800 + 1e-6 || b0.x1 - b0.x0 <= 1600);
  s.records.clear = { foot: 1, wood: 1, slope: 0.5, gorge: 0.2 }; const b = W.camBounds(s); assert.equal(b.x1, Math.min(W.WORLD.w, W.DEN[0] + W.RINGS[4].r1));
  const c = W.clampCam({ x: 1e9, y: -1e9, z: 1 }, b); assert.ok(c.x + 800 <= b.x1 + 1e-6 && c.y - 450 >= b.y0 - 1e-6);
  assert.deepEqual(W.clampCam({ ...W.HOME_VIEW }, b), { ...W.HOME_VIEW });
});
test('合併敵人表：MONSTERS 由 ENEMIES 產生，數值與舊表一致；每種敵人有所屬環', () => {
  assert.deepEqual([MONSTERS.rat.hp, MONSTERS.rat.speed, MONSTERS.rat.dmg, MONSTERS.boar.hp, MONSTERS.boar.speed, MONSTERS.boar.dmg], [10, 40, 2, 40, 28, 6]);
  assert.equal(MONSTERS.boar.name, ENEMIES.boar.name); assert.equal(ENEMIES.boar.ring, 'foot'); assert.equal(ENEMIES.bear.ring, 'gorge');
  for (const g of ROUTE) for (const [k] of g.roster) assert.ok(ENEMIES[k].ring, k);
});
test('各環族群：無亂數回補、巡山擊倒會扣、存檔增量 < 1KB、舊檔讀入自動補', () => {
  const s = createState(5); tick(s); assert.deepEqual(Object.keys(s.pop), ROUTE.map((g) => g.id)); const n0 = s.rngN;
  s.pop.foot.n = 0; W.popStep(s, W.POP.foot.regen); assert.equal(s.pop.foot.n, 1); assert.equal(s.rngN, n0);
  W.popKill(s, 'wood', 2); assert.equal(s.pop.wood.n, W.POP.wood.start - 2);
  assert.ok(JSON.stringify(s.pop).length < 1024);
  const o = JSON.parse(save(s)); delete o.pop; const r = load(JSON.stringify(o)); assert.ok(r.ok); tick(r.state); assert.ok(r.state.pop.peak.n > 0);
});
test('巡山實跑：擊倒數從所屬環族群扣掉', async () => {
  const M = await import('../src/sim.mjs'), { openExp } = await import('../src/slice.mjs'); const s = openExp(createState(7)); tick(s); s.res.food = 20; for (const d of s.ds) { Object.assign(d.skills, { palm: 80, leg: 80, agility: 5 }); d.mood = 90; d.hp = 100; }
  M.startExpedition(s, s.ds.slice(0, 2).map((d) => d.id)); assert.ok(s.exp, '出發');
  const p0 = JSON.parse(JSON.stringify(s.pop)); let k = 0;
  for (let i = 0; i < 4000 && s.exp && !k; i++) { tick(s); k = Object.values(s.exp?.seg || {}).reduce((a, g) => a + g.kill, 0); }
  assert.ok(k > 0, '有擊倒'); const lost = ROUTE.reduce((a, g) => a + p0[g.id].n - s.pop[g.id].n, 0); assert.equal(lost, k);
});
test('獸襲下山演出：到點前 20 秒從山腳巢點沿山徑走到 den；不寫狀態', () => {
  const s = createState(3); tick(s); s.raidT = RAID_EVERY - W.DESC - 1; assert.equal(W.raidDescent(s), null);
  s.raidT = RAID_EVERY - W.DESC; const a = W.raidDescent(s); assert.equal(a.ring, 'foot'); assert.deepEqual(a.pos.map(Math.round), W.RINGS[0].nest);
  s.raidT = RAID_EVERY - 0.001; const b = W.raidDescent(s); assert.ok(Math.hypot(b.pos[0] - W.DEN[0], b.pos[1] - W.DEN[1]) < 1);
  const h = save(s); W.raidDescent(s); assert.equal(save(s), h);
  s.mons.push({ raid: 'go' }); assert.equal(W.raidDescent(s), null);
});
test('巡山隊世界座標沿山徑往外、回程往回', () => {
  const s = createState(2); assert.equal(W.partyPos(s), null);
  s.exp = { dist: 0, phase: 'out' }; assert.deepEqual(W.partyPos(s), W.DEN);
  s.exp.dist = 300; const p = W.partyPos(s); assert.ok(p[0] > W.DEN[0] || p[1] < W.DEN[1]);
  s.exp = { dist: 300, backPos: 50, phase: 'back' }; const q = W.partyPos(s); assert.ok(Math.hypot(q[0] - W.DEN[0], q[1] - W.DEN[1]) < Math.hypot(p[0] - W.DEN[0], p[1] - W.DEN[1]));
});
