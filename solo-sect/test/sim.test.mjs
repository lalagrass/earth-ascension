import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, startBuild, startHunt, setOrder, save, load, routeLength, relKey } from '../src/sim.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };

test('長山路比院內路遠（保留通勤距離）', () => { assert.ok(routeLength('court', 'guard') > 2 * routeLength('court', 'kitchen')); });
test('建造木料守恆：庫存+在途+工地不超出也不憑空消失', () => {
  const s = createState(3); s.res.wood = 8; startBuild(s, 'dorm');
  for (let i = 0; i < 2000; i++) { tick(s); const site = s.fac.dorm.site; const carried = s.ds.reduce((a, d) => a + (d.carry?.wood || 0), 0);
    if (site) assert.ok(site.delivered.wood <= 6 && site.delivered.wood + site.reserved.wood <= 6); assert.ok(s.res.wood >= 0 && carried >= 0); }
  assert.equal(s.fac.dorm.stage, 1);
});
test('取消搬料歸還木頭', () => {
  const s = createState(4); s.res.wood = 6; startBuild(s, 'dorm'); s.ds.forEach((d) => setOrder(s, d.id, 'build'));
  run(s, 6); const before = s.res.wood + s.ds.reduce((a, d) => a + (d.carry?.wood || 0), 0) + s.fac.dorm.site.delivered.wood;
  s.ds.forEach((d) => setOrder(s, d.id, 'rest'));
  assert.equal(s.res.wood + s.fac.dorm.site.delivered.wood, before); assert.equal(s.fac.dorm.site.reserved.wood, 0);
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
  s.rep = 20; s.res.stone = 6; s.res.coin = 6; assert.ok(startBuild(s, 'hall')); s.fac.yard.stage = 1; run(s, 600); assert.equal(s.fac.hall.stage, 1); assert.equal(mapStage(s), 'S2');
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

// v0.7 心智與社交
import { relAdd, compat, aff, seasonOf, defaultAnswers, personalityFrom, recruit as recruit7, canRecruit as canRec7, migrate, moodParts } from '../src/sim.mjs';
import { RULES_VERSION, RECRUIT_POOL, DAY, SEASON_DAYS } from '../src/data.mjs';
const run7 = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };
test('決策可解釋：最高分＝基礎×作息×性格×心情＋雜訊', () => {
  const s = createState(71); tick(s); const w = s.ds[0].why[0]; assert.ok(w && w.f);
  assert.ok(Math.abs(w.f.base * w.f.sched * w.f.trait * w.f.mood + w.f.noise - w.score) < 1);
});
test('雙向好感：對立性格的人好感長得慢，且兩方向可以不同', () => {
  const s = createState(72); const [hero, senior, cousin] = s.ds; // 勤奮×貪玩對立、多慮欣賞溫和
  assert.ok(compat(hero, cousin) < 1 && compat(hero, senior) > 1);
  relAdd(s, hero, senior, 10); relAdd(s, hero, cousin, 10);
  assert.ok(aff(s, hero, senior) > aff(s, hero, cousin)); assert.notEqual(aff(s, cousin, hero), aff(s, senior, hero));
});
test('鼓勵：心情低落者會被成年同門陪伴並得到「被鼓勵」', () => {
  const s = createState(73); s.res.food = 99; const c = s.ds[2]; let got = false;
  for (let i = 0; i < 4 * 300 && !got; i++) { c.mood = Math.min(c.mood, 20); tick(s); got = c.thoughts.some((t) => t.id === 'encouraged'); }
  assert.ok(got);
});
test('樂趣需求：會衰減，閒坐看雲補回', () => {
  // v1.45 review fix：煮飯/傳功耗力改按實際時長後，seed 74 少有閒坐；改看 74–77 四個種子合計（規則改變，非放寬語意）
  let leisure = 0; for (const seed of [74, 75, 76, 77]) { const s = createState(seed); s.res.food = 99; for (let i = 0; i < 4 * 1200; i++) { tick(s); for (const d of s.ds) if (d.task?.act === 'leisure') leisure++; } assert.ok(s.ds.every((d) => d.needs.fun > 0)); }
  assert.ok(leisure > 0);
});
test('三問心印：預設答案沿用天性；改答案改變明面性格，天性為暗', () => {
  const p = RECRUIT_POOL[0]; const def = personalityFrom(p); assert.ok(p.personality.every((t) => def.personality.includes(t)));
  const r = personalityFrom(p, [1, 2, 2]); assert.deepEqual(r.known, ['sociable', 'worrier']); assert.equal(r.personality.length, 3); assert.ok(!r.known.includes(r.personality[2]));
  const s = createState(75); s.rep = 99; s.res.food = 20; s.fac.dorm.stage = 2; const o = recruit7(s, [1, 2, 2]); assert.ok(o.ok); assert.deepEqual(o.d.known, ['sociable', 'worrier']);
});
test('特質揭露：初始三人第二特質相處 300 秒後才看得出來', () => {
  const s = createState(76); s.res.food = 99; assert.equal(s.ds[0].known.length, 1); run7(s, 320); assert.ok(s.ds.every((d) => d.known.length === 2));
});
test('季節：每季 7 日，冬天菜長得慢、春天心情加成', () => {
  const s = createState(77); assert.equal(seasonOf(s).id, 'spring'); s.t = DAY * SEASON_DAYS * 3 + 1; assert.equal(seasonOf(s).id, 'winter'); assert.ok(seasonOf(s).grow > 1);
  s.t = 1; assert.ok(moodParts(s.ds[0], s).some(([n]) => n === '春天'));
});
test('心情能回升：10 日平均心情 ≥ 40，低落時間 < 15%', () => {
  const s = createState(78); let sum = 0, n = 0, low = 0; for (let i = 0; i < 4 * 6000; i++) { tick(s); if (i % 40 === 0) for (const d of s.ds) { sum += d.mood; n++; if (d.mood < 30) low++; } }
  assert.ok(sum / n >= 40, `avg ${sum / n}`); assert.ok(low / n < 0.15, `low ${low / n}`);
});
test('存檔帶規則版本；v0.5 與 v0.6 形狀的舊檔都能讀入並遷移', () => {
  const s = createState(79); run7(s, 30); assert.equal(JSON.parse(save(s)).rules, RULES_VERSION);
  const v06 = JSON.parse(save(s)); delete v06.rules; delete v06.aff; for (const d of v06.ds) { delete d.known; delete d.together; delete d.needs.fun; delete d.why; }
  const r6 = load(JSON.stringify(v06)); assert.ok(r6.ok); assert.equal(r6.state.migratedFrom, '0.6'); assert.equal(r6.state.rules, RULES_VERSION); assert.ok(Object.keys(r6.state.aff).length === 6);
  const v05 = JSON.parse(JSON.stringify(v06)); for (const d of v05.ds) { delete d.mood; delete d.thoughts; delete d.personality; }
  const r5 = load(JSON.stringify(v05)); assert.ok(r5.ok); assert.equal(r5.state.migratedFrom, '0.5'); assert.deepEqual(r5.state.ds[0].personality, ['diligent', 'worrier']); tick(r5.state);
});
