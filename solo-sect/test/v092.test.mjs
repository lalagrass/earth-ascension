import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, save, load } from '../src/sim.mjs';
import { DAY, BREAK, GUIZHEN, RULES_VERSION } from '../src/data.mjs';
import { seedArts, gainArt, artById, stuckAt, resolveBreak, curCap, guizhenOk, chooseVariant, variantOf, moveMul, cdMul, rustOf, artTier } from '../src/arts.mjs';
const mk = (root = 3, personality = []) => seedArts({ root, personality, style: 'palm', skills: { palm: 0, leg: 0 }, moves: ['fist'], mood: 70, needs: { energy: 80 } });
const fist = () => artById('basicFist');

test('每門三招：入門、小成、大成各開一招', () => {
  const d = mk(); assert.deepEqual(d.moves, ['fist']);
  d.arts.basicFist.xp = 30; gainArt(d, 0); assert.ok(d.moves.includes('fist2') && !d.moves.includes('fist3'));
  d.arts.basicFist.bt1 = true; d.arts.basicFist.xp = 56; gainArt(d, 0); assert.ok(d.moves.includes('fist3'));
});
test('瓶頸：未衝關前卡在 54.9 和 99.9', () => {
  const d = mk(); d.focus = 'basicFist'; for (let i = 0; i < 5000; i++) gainArt(d, 5);
  assert.equal(d.arts.basicFist.xp, BREAK.caps[0]); assert.equal(stuckAt(d, fist()), 1);
  d.arts.basicFist.bt1 = true; for (let i = 0; i < 5000; i++) gainArt(d, 5); assert.equal(d.arts.basicFist.xp, BREAK.caps[1]); assert.equal(stuckAt(d, fist()), 2);
});
test('衝關成功進大成並開新招；失敗只冷卻一天', () => {
  const d = mk(); d.arts.basicFist.xp = BREAK.caps[0];
  const f = resolveBreak(d, 'basicFist', 100, 0.99); assert.equal(f.ok, false); assert.equal(d.arts.basicFist.btCd, 100 + DAY); assert.equal(stuckAt(d, fist(), 200), 0); assert.equal(d.arts.basicFist.xp, BREAK.caps[0]);
  assert.equal(stuckAt(d, fist(), 100 + DAY), 1);
  const ok = resolveBreak(d, 'basicFist', 100 + DAY, 0); assert.equal(ok.ok, true); assert.equal(d.arts.basicFist.xp, 55); assert.equal(artTier(d, 'basicFist'), 2); assert.ok(d.moves.includes('fist3'));
});
test('悟性門檻的武學沒有瓶頸可衝（止於小成）', () => {
  const d = mk(2); d.arts.fengLei = { xp: 54.9 }; assert.equal(stuckAt(d, artById('fengLei')), 0); assert.equal(curCap(d, artById('fengLei')), 54.9);
});
test('地圖上打坐衝關：心情精力夠才會去，結果寫入日誌', () => {
  const s = createState(3); s.res.food = 99; const h = s.ds[0]; h.arts.basicFist.xp = BREAK.caps[0]; h.mood = 85; h.needs.energy = 95;
  let saw = false; for (let i = 0; i < 3000 && !s.log.some((l) => /衝關/.test(l.msg)); i++) { tick(s, 0.1); if (h.task?.act === 'meditate') saw = true; }
  assert.ok(saw); assert.ok(s.log.some((l) => /衝關/.test(l.msg)));
});
test('失敗想法只是小小扣心情', async () => { const { THOUGHTS } = await import('../src/data.mjs'); assert.ok(THOUGHTS.btFail.v < 0 && THOUGHTS.btFail.v >= -6); });
test('歸真：悟性低或勤奮、憨厚才能走；星數遞增成本、每星 +4%', () => {
  assert.equal(guizhenOk(mk(3), fist()), false); assert.ok(guizhenOk(mk(3, ['honest']), fist())); assert.ok(guizhenOk(mk(2), fist())); assert.equal(guizhenOk(mk(1), artById('wavePalm')), false);
  const d = mk(1); Object.assign(d.arts.basicFist, { xp: 100, bt1: true, bt2: true }); assert.equal(stuckAt(d, fist()), 3);
  resolveBreak(d, 'basicFist', 0, 0); assert.ok(d.arts.basicFist.guizhen); const m0 = moveMul(d, 'fist');
  d.focus = 'basicFist'; for (let i = 0; i < 3000; i++) gainArt(d, 5); const n = d.arts.basicFist.stars; assert.ok(n >= 3, String(n));
  assert.ok(Math.abs(moveMul(d, 'fist') / m0 - (1 + GUIZHEN.star * n)) < 1e-9);
});
test('大成變式：可選、可重選但要等半天', () => {
  const d = mk(); assert.equal(chooseVariant(d, 'basicFist', 'gang'), false);
  Object.assign(d.arts.basicFist, { xp: 60, bt1: true }); assert.ok(chooseVariant(d, 'basicFist', 'gang', 0)); assert.equal(variantOf(d, 'basicFist', 0).id, 'gang');
  chooseVariant(d, 'basicFist', 'ling', 10); assert.equal(variantOf(d, 'basicFist', 20), null); assert.equal(variantOf(d, 'basicFist', 10 + BREAK.rechoose).id, 'ling');
  assert.ok(cdMul(d, 'fist', 10 + BREAK.rechoose) < 0.8);
});
test('荒疏：久不練只減慢進度、不降階', () => {
  const a = mk(), b = mk(); a.arts.basicFist.xp = b.arts.basicFist.xp = 30; a.arts.basicFist.last = b.arts.basicFist.last = 0;
  gainArt(a, 5, 1, 10); gainArt(b, 5, 1, 6 * DAY); assert.ok(b.arts.basicFist.xp > 30 && b.arts.basicFist.xp - 30 < a.arts.basicFist.xp - 30); assert.equal(artTier(b, 'basicFist'), 1);
  assert.ok(rustOf({ last: 0 }, 6 * DAY) > 0);
});
test('v0.9 舊檔：補瓶頸旗標與三招，可續玩', () => {
  const s = createState(6); const o = JSON.parse(save(s)); o.rules = '0.9';
  for (const d of o.ds) { d.arts = { basicFist: { xp: 70 } }; d.moves = ['fist']; }
  const r = load(JSON.stringify(o)); assert.equal(r.ok, true); const h = r.state.ds[0]; assert.equal(r.state.rules, RULES_VERSION);
  assert.ok(h.arts.basicFist.bt1); assert.ok(h.moves.includes('fist3')); for (let i = 0; i < 400; i++) tick(r.state);
});
