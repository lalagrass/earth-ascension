import { openExp } from "../src/slice.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition } from '../src/sim.mjs';
import { ARTS, MOVES, RULES_VERSION, DAY } from '../src/data.mjs';
import { learnArt, artTier } from '../src/arts.mjs';
import { XIA, xiaPool, xiaStep, xiaResolve, join, pickStudent, onCook, dragonFit, PAIR_CAP, xidOf } from '../src/wuxia.mjs';
import { pairBonus, applyHero, autoPick } from '../src/hero.mjs';
import { aff } from '../src/social.mjs';
import { migrate } from '../src/save.mjs';
import { guardOf } from '../src/expedition.mjs';

const st = (seed = 3) => { const s = createState(seed); tick(s); return s; };
test('v1.1 版本與招牌武學各三招、帶地圖特效、不入秘笈池', () => {
  assert.ok(parseFloat(RULES_VERSION) >= 1.1);
  for (const [id, fx] of [['xianglong', 'dragon'], ['dagou', 'staff']]) { const a = ARTS.find((x) => x.id === id); assert.ok(a.secret && a.classic); assert.equal(a.techs.length, 3);
    for (const m of a.techs) assert.equal(MOVES.find((x) => x.id === m).fx, fx); }
  assert.deepEqual(ARTS.find((a) => a.id === 'xianglong').techs.map((m) => MOVES.find((x) => x.id === m).name), ['見龍在田', '飛龍在天', '亢龍有悔']);
});
test('名俠池排除已選主角／同門與已在門中者', () => {
  const s = st(); s.encExclude = ['guojing']; assert.ok(!xiaPool(s).includes('guojing'));
  s.encExclude = []; join(s, 'guojing'); assert.ok(!xiaPool(s).includes('guojing'));
});
test('名聲觸發郭靖奇遇，一天最多一個；收入門下帶高手底子', () => {
  const s = st(); s.rep = 20; xiaStep(s); const ch = s.choices.find((c) => c.xia); assert.equal(ch.xia, 'guojing');
  const n = s.choices.length; xiaStep(s); assert.equal(s.choices.length, n);
  assert.equal(autoPick(s, ch), 0); xiaResolve(s, ch, 0); const g = s.ds.find((d) => d.xia === 'guojing');
  assert.ok(g && g.skills.palm >= 30 && dragonFit(g)); assert.ok(s.xia.done.guojing);
});
test('名俠弟子：郭靖、黃蓉、令狐沖（v1.2）；洪七公是師父', () => {
  assert.deepEqual(Object.keys(XIA).filter((k) => XIA[k].role === 'disciple').sort(), ['guojing', 'huangrong', 'linghuchong']); assert.equal(XIA.hongqigong.role, 'teacher');
});
test('婉拒三天內不再出現', () => {
  const s = st(); s.rep = 20; xiaStep(s); const ch = s.choices.find((c) => c.xia); xiaResolve(s, ch, 1); s.t += DAY * 1.5; xiaStep(s); assert.ok(!s.choices.some((c) => c.xia === ch.xia));
});
test('黃蓉下廚食誘→洪七公三段傳降龍，打狗棒法給黃蓉，傳完下山不死', () => {
  const s = st(); join(s, 'guojing'); join(s, 'huangrong'); const hr = s.ds.find((d) => d.xia === 'huangrong'), gj = s.ds.find((d) => d.xia === 'guojing');
  onCook(s, hr); onCook(s, hr); s.fac.kitchen = { stage: 1 }; s.xia.lastT = -1e9; xiaStep(s); const ch = s.choices.find((c) => c.xia === 'hongqigong'); assert.ok(ch);
  xiaResolve(s, ch, 0); assert.ok(s.xia.teacher); assert.equal(pickStudent(s), gj);
  for (let k = 1; k <= 3; k++) { onCook(s, hr); s.t += DAY; xiaStep(s); assert.equal(s.xia.teacher?.stage ?? 3, k); }
  assert.ok(artTier(gj, 'xianglong') >= 2 && artTier(hr, 'dagou') >= 2);
  s.t += 1; xiaStep(s); assert.equal(s.xia.teacher, null); assert.ok(s.xia.left.hongqigong); assert.ok(s.log.some((l) => /飄然下山/.test(l.msg || l)));
});
test('沒有吃到菜不傳功', () => {
  const s = st(); join(s, 'guojing'); join(s, 'huangrong'); s.xia.teacher = { id: 'hongqigong', name: '洪七公', stage: 0, meals: 0, since: s.t, lastStageT: -1e9 };
  s.t += DAY; xiaStep(s); assert.equal(s.xia.teacher.stage, 0);
});
test('郭靖＋黃蓉同門默契上限 25%', () => {
  const s = st(); const g = join(s, 'guojing'), h = join(s, 'huangrong'); s.hero ??= { id: 'x' };
  s.aff[`${g.id}>${h.id}`] = 100; s.aff[`${h.id}>${g.id}`] = 100; const b = pairBonus(s, g, aff); assert.ok(b > 0.2 && b <= PAIR_CAP);
});
test('名俠心情長期低落就下山（不死）', () => {
  const s = st(); const g = join(s, 'guojing'); for (let i = 0; i < DAY / 0.25 + 2; i++) { g.mood = 0; xiaStep(s); } assert.ok(!s.ds.includes(g)); assert.ok(s.xia.left.guojing);
});
test('郭靖模板主線推進到第 4 步', () => {
  const s = createState(5, { kind: 'template', id: 'guojing', companion: 'huangrong' }); s.hero.flags = { ...(s.hero.flags || {}), hong: true }; tick(s);
  s.xia.cooks = 0; const hr = s.ds.find((d) => xidOf(s, d) === 'huangrong'); assert.ok(hr); onCook(s, hr); s.xia.lastT = -1e9; xiaStep(s);
  const ch = s.choices.find((c) => c.xia === 'hongqigong'); assert.ok(ch); xiaResolve(s, ch, 0); assert.ok(s.hero.arcStep >= 2);
  for (let k = 0; k < 4; k++) { onCook(s, hr); s.t += DAY; xiaStep(s); } s.t += 1; xiaStep(s); assert.equal(s.hero.arcStep, 4);
});
function party(classic) { const s = createState(11); tick(s); const ids = s.ds.filter((d) => d.role !== 'laborer').slice(0, 4).map((d) => d.id);
  for (const d of s.ds) if (ids.includes(d.id)) { for (const k of Object.keys(d.skills)) d.skills[k] = 100; for (const a of ARTS) { if ((a.classic && !classic) || a.id === 'rulai') continue; learnArt(d, a.id, 0); Object.assign(d.arts[a.id], { xp: 1e6, bt1: true, bt2: true, bt3: true, last: 1e9 }); learnArt(d, a.id, 0); } d.mood = 95; }
  s.res.food = 200; startExpedition(openExp(s), ids, { thr: 0.3, target: 'inf', supplies: 24 }); let i = 0; while (s.exp && i++ < 900000) tick(s); return [s.lastExp, s.ds.find((d) => d.id === ids[0])]; }
test('平衡：一般武學練滿約止於 1600 內；招牌武學練滿可闖進無盡段', () => {
  const [n] = party(false); assert.ok(n.dist >= 900 && n.dist <= 1600, `normal ${n.dist}`); // v1.5：模擬核心改動 RNG 串流，種子間 950–1331，下限 1000→900
  const [c, d] = party(true); assert.ok(c.dist > 1600, `classic ${c.dist}`); assert.equal(guardOf(d), 0.6);
});
test('1.0 存檔遷移到 1.1 補上名俠狀態', () => {
  const s = st(); delete s.xia; s.rules = '1.0'; const r = migrate(JSON.parse(JSON.stringify(s))); const o = r.state || r; assert.ok(o.xia && o.xia.done);
});
