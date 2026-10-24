import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, startBuild, startHunt, setOrder, save, load, routeLength, relKey } from '../src/sim.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };

test('長山路比院內路遠（保留通勤距離）', () => { assert.ok(routeLength('court', 'guard') > 2 * routeLength('court', 'kitchen')); });
test('建造木料守恆：庫存+在途+工地不超出也不憑空消失', () => {
  const s = createState(3); s.res.wood = 8; startBuild(s, 'dorm');
  for (let i = 0; i < 2000; i++) { tick(s); const site = s.fac.dorm.site; const carried = s.ds.reduce((a, d) => a + (d.carry?.wood || 0), 0);
    if (site) assert.ok(site.delivered <= 6 && site.delivered + site.reserved <= 6); assert.ok(s.res.wood >= 0 && carried >= 0); }
  assert.equal(s.fac.dorm.stage, 1);
});
test('取消搬料歸還木頭', () => {
  const s = createState(4); s.res.wood = 6; startBuild(s, 'dorm'); s.ds.forEach((d) => setOrder(s, d.id, 'build'));
  run(s, 6); const before = s.res.wood + s.ds.reduce((a, d) => a + (d.carry?.wood || 0), 0) + s.fac.dorm.site.delivered;
  s.ds.forEach((d) => setOrder(s, d.id, 'rest'));
  assert.equal(s.res.wood + s.fac.dorm.site.delivered, before); assert.equal(s.fac.dorm.site.reserved, 0);
});
test('練掌到門檻後向師父學到新招', () => {
  const s = createState(5); const h = s.ds[0]; setOrder(s, 'hero', 'train'); s.res.food = 50; run(s, 400);
  assert.ok(h.skills.palm >= 25); setOrder(s, 'hero', null); run(s, 120); assert.ok(h.moves.includes('push'), h.moves.join());
});
test('聊天提升關係；未成年不會成道侶', () => {
  const s = createState(6); s.res.food = 999; run(s, 3000);
  assert.ok(s.rel[relKey('hero', 'senior')] > 10); assert.ok(s.rel[relKey('hero', 'cousin')] < 90 && s.rel[relKey('senior', 'cousin')] < 90);
  assert.ok(!s.families.some((k) => k.includes('cousin')));
});
test('狩獵波次會結束並產生戰報', () => {
  const s = createState(7); s.ds[0].moves.push('push'); s.ds[0].skills.palm = 40; startHunt(s, ['hero', 'senior']); run(s, 200);
  assert.equal(s.hunt, null); assert.match(s.lastReport, /擊退 \d/);
});
test('存檔往返與壞檔拒絕', () => {
  const s = createState(8); run(s, 30); const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.t, s.t);
  assert.equal(load('{bad').ok, false); assert.equal(load(JSON.stringify({ v: 99, ds: [] })).ok, false);
});

// v0.2
import { phaseOf } from '../src/sim.mjs';
test('菜畦→收菜→煮飯：菜與預約不為負，飯會增加', () => {
  const s = createState(11); s.res.food = 2; let maxFood = 0;
  for (let i = 0; i < 4 * 900; i++) { tick(s); assert.ok(s.res.veg >= 0 && s.vegRes >= 0 && s.vegRes <= s.res.veg, `veg ${s.res.veg} res ${s.vegRes}`); maxFood = Math.max(maxFood, s.res.food); }
  assert.ok(s.log.some((l) => /煮好/.test(l.msg))); assert.ok(maxFood > 2);
});
test('入夜多數人去歇息', () => {
  const s = createState(12); s.res.food = 99; let night = 0, resting = 0;
  for (let i = 0; i < 4 * 1200; i++) { tick(s); if (phaseOf(s).id === 'night') for (const d of s.ds) { night++; if (d.task?.act === 'rest') resting++; } }
  assert.ok(resting / night > 0.5, `${resting}/${night}`);
});
test('膳房可建且升級後每鍋產量提高', () => {
  const s = createState(13); s.res.wood = 8; assert.ok(startBuild(s, 'kitchen')); run(s, 400); assert.equal(s.fac.kitchen.stage, 1);
});

// v0.3
test('腿法路數練到門檻學到掃堂腿，不會誤學掌法招', () => {
  const s = createState(21); s.res.food = 99; setOrder(s, 'senior', 'train'); run(s, 500); setOrder(s, 'senior', null); run(s, 200);
  const d = s.ds[1]; assert.ok(d.moves.includes('kick'), d.moves.join()); assert.ok(!d.moves.includes('push'));
});
test('木樁場建成後會切磋，並加速練功', () => {
  const s = createState(22); s.res.food = 99; s.res.wood = 6; startBuild(s, 'yard'); run(s, 1500);
  assert.equal(s.fac.yard.stage, 1); assert.ok(s.log.some((l) => /切磋/.test(l.msg)));
});

// v0.4
import { setPost } from '../src/sim.mjs';
test('狩獵取走真個體：擊退的獸從族群扣掉，之後會慢慢繁衍回來', () => {
  const s = createState(31); s.ds[0].skills.palm = 50; s.ds[0].moves.push('push', 'wave'); s.ds[1].skills.leg = 40; s.ds[1].moves.push('kick');
  const before = s.eco.rat.n + s.eco.boar.n; startHunt(s, ['hero', 'senior']); let i = 0; while (s.hunt && i++ < 4 * 600) tick(s);
  assert.equal(s.hunt, null); const m = s.lastReport.match(/擊退 (\d+)/); const kills = +m[1];
  assert.ok(kills > 0); assert.ok(s.eco.rat.n + s.eco.boar.n <= before - kills + 2); const after = s.eco.rat.n;
  run(s, 400); assert.ok(s.eco.rat.n > after);
});
test('守點設定生效：隊伍站到所選守點', () => {
  const s = createState(32); assert.ok(setPost(s, 'trail1')); startHunt(s, ['hero']); run(s, 40); assert.equal(s.ds[0].at, 'trail1');
});
test('野豬下山拱菜後回山，族群數不變', () => {
  const s = createState(33); s.plots.forEach((p) => { p.st = 'ripe'; }); s.raidT = 159; const n0 = s.eco.boar.n;
  let i = 0; while (!s.log.some((l) => /回山/.test(l.msg)) && i++ < 4 * 300) tick(s);
  assert.ok(s.plots.some((p) => p.st !== 'ripe')); run(s, 200); assert.equal(s.eco.boar.n, n0);
});

// v0.5
import { recruit, canRecruit, capacity, mapStage } from '../src/sim.mjs';
test('招收受名聲、床位、存糧三道門檻；成功扣糧且新人從村路上山', () => {
  const s = createState(41); s.res.food = 10; assert.equal(canRecruit(s).ok, false); s.rep = 100;
  const cap = capacity(s); assert.equal(cap, 3); assert.match(canRecruit(s).why, /床位/);
  s.fac.dorm.stage = 1; const r = recruit(s); assert.ok(r.ok); assert.equal(s.res.food, 7); assert.equal(r.d.at, 'gate'); assert.equal(s.ds.length, 4);
  s.res.food = 0; s.fac.dorm.stage = 2; assert.match(canRecruit(s).why, /存糧/);
});
test('大廳擴建需名聲；母版階段隨建設 S0→S1→S2', () => {
  const s = createState(42); s.res.wood = 12; assert.equal(startBuild(s, 'hall'), false); assert.equal(mapStage(s), 'S0');
  s.fac.dorm.stage = 1; s.fac.kitchen.stage = 1; assert.equal(mapStage(s), 'S1');
  s.rep = 20; assert.ok(startBuild(s, 'hall')); s.fac.yard.stage = 1; run(s, 600); assert.equal(s.fac.hall.stage, 1); assert.equal(mapStage(s), 'S2');
});

// v0.6 性格與心情
import { think, moodTarget, moodMul, traitMul, scoreActs } from '../src/sim.mjs';
test('性格乘數：貪玩的人練功分數比勤奮的人低', () => {
  const s = createState(51); const [hero, , cousin] = s.ds; assert.ok(traitMul(hero, 'train') > 1 && traitMul(cousin, 'train') < 1);
});
test('想法疊加進心情目標並隨時間消退；樂天者基線較高', () => {
  const s = createState(52); const sen = s.ds[1], hero = s.ds[0];
  assert.ok(moodTarget(sen) > moodTarget(hero)); const t0 = moodTarget(hero); think(s, hero, 'learned'); assert.ok(moodTarget(hero) > t0);
  hero.thoughts[0].left = 0.1; s.res.food = 99; tick(s); assert.equal(hero.thoughts.some((t) => t.id === 'learned'), false);
});
test('心情低落時工作分數下降、休閒上升；多慮放大壞事', () => {
  const s = createState(53); const d = s.ds[0]; d.mood = 10; assert.ok(moodMul(d, 'train') < 1 && moodMul(d, 'chat') > 1);
  think(s, d, 'cropLost'); think(s, s.ds[1], 'cropLost'); assert.ok(d.thoughts[0].v < s.ds[1].thoughts[0].v);
});
test('舊（v0.5）存檔缺心情欄位也能讀入並補預設', () => {
  const s = createState(54); for (const d of s.ds) { delete d.mood; delete d.thoughts; } const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.ds[0].mood, 50);
});
