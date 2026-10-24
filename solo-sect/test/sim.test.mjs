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
