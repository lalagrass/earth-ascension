/* v3.2 loop201：練法／打法寫在武學上。門派不再改戰鬥倍率。只在 v24。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { artsGrowHtml } from '../src/panel-ui.mjs';
import { MOVES, SECTS } from '../src/data.mjs';
import * as A from '../src/arts.mjs';

const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const dps = (d, mv) => {
  const m = MOVES.find((x) => x.id === mv);
  return m.dmg * A.moveMul(d, mv, 0) / (m.cd * A.cdMul(d, mv, 0));
};

test('loop201 內力低時打法秒傷更高，內力高時練法反超，交叉在 90–130', () => {
  const jd = MOVES.find((m) => m.id === 'jd1'), cs = MOVES.find((m) => m.id === 'cs1');
  assert.equal(jd.dmg, cs.dmg); assert.equal(jd.cd, cs.cd);
  assert.equal(A.artById('jindingPalm').mode, 'lian'); assert.equal(A.artById('chousuiPalm').mode, 'da');
  const d = {
    v24: true, v23: true, sectId: 'wudang', qi: 25, ng: 1, skills: { palm: 0 }, personality: [], values: {}, qiInjury: 0,
    arts: { breath: { xp: 100 }, zixia: { xp: 100 }, jindingPalm: { xp: 55 }, chousuiPalm: { xp: 55 } },
  };
  assert.ok(A.qiMax(d) >= 180, String(A.qiMax(d)));
  assert.equal(A.innerDrive28(d, A.artById('jindingPalm')).tier, 2);
  assert.equal(A.innerDrive28(d, A.artById('chousuiPalm')).tier, 2);
  assert.equal(A.innerDrive28(d, A.artById('jindingPalm')).mul, 1);
  assert.equal(A.innerDrive28(d, A.artById('chousuiPalm')).mul, 1);
  assert.ok(dps(d, 'cs1') > dps(d, 'jd1'), `qi25 da ${dps(d, 'cs1')} lian ${dps(d, 'jd1')}`);
  d.qi = 180;
  assert.ok(dps(d, 'jd1') > dps(d, 'cs1'), `qi180 lian ${dps(d, 'jd1')} da ${dps(d, 'cs1')}`);
  let cross = null;
  for (let q = 1; q <= 200; q++) { d.qi = q; if (dps(d, 'jd1') >= dps(d, 'cs1')) { cross = q; break; } }
  assert.ok(cross >= 90 && cross <= 130, `交叉在內力 ${cross}`);
});

test('loop201 吐納催三陰蜈蚣爪幾乎不掉威力', () => {
  const d = { v24: true, v23: true, sectId: 'xingxiu', qi: 10, arts: { breath: { xp: 60 }, sanyinClaw: { xp: 30 } } };
  const drv = A.innerDrive28(d, A.artById('sanyinClaw'));
  assert.equal(drv.tier, 3);
  assert.ok(drv.mul >= 0.95, String(drv.mul));
  assert.ok(Math.abs(drv.mul - A.floatMul31(A.artById('sanyinClaw'))) < 1e-9);
});

test('loop201 同武學同數值，氣宗、劍宗、無名派倍率相同', () => {
  const mk = (sectId) => ({
    v24: true, v23: true, sectId, qi: 40, ng: 1, ng2: 1, skills: { palm: 0, agility: 0 }, personality: [], qiInjury: 0,
    arts: { breath: { xp: 55 }, basicSword: { xp: 55 }, bixie: { xp: 55 } },
  });
  const ds = ['qizong', 'jianzong', 'wuming'].map(mk);
  for (const mv of ['bs1', 'bx1']) {
    const moves = ds.map((d) => A.moveMul(d, mv, 0));
    const cds = ds.map((d) => A.cdMul(d, mv, 0));
    assert.equal(moves[1], moves[0], mv); assert.equal(moves[2], moves[0], mv);
    assert.equal(cds[1], cds[0], mv); assert.equal(cds[2], cds[0], mv);
  }
  assert.equal(A.swordCdMul(ds[0], 'bx1'), 1);
  assert.equal(A.swordDmgMul(ds[1], 'bx1'), 1);
});

test('loop201 內力先乘造詣再封頂 260', () => {
  const bare = { v24: true, arts: { breath: { xp: 100 }, zixia: { xp: 100 } } };
  const raw = 100 * A.GRADE_NG24[1] + 100 * A.GRADE_NG24[3];
  assert.ok(Math.abs(A.qiMax2(bare) - raw) < 1e-6);
  assert.ok(raw < A.NG2.total24);
  const topped = { v24: true, arts: { breath: { xp: 100, gm: { e: 20 } }, zixia: { xp: 100, gm: { e: 55 } } } };
  assert.equal(A.mastery(topped, 'neigong'), 75);
  const product = raw * (1 + 0.004 * 75);
  assert.ok(product > A.NG2.total24, String(product));
  assert.equal(A.qiMax2(topped), A.NG2.total24);
});

test('loop201 神木毒功退出學習池，已學會的舊檔仍讀得到', () => {
  const a = A.artById('shenmuGong');
  assert.equal(a.deprecated, true); assert.equal(a.secret, true); assert.equal(a.grade, 2);
  assert.ok(!SECTS.xingxiu.tree.includes('shenmuGong'));
  const s = V({ sect24: 'xingxiu' }); tick(s, 0.1); const d = other(s);
  assert.ok(!A.artHints(d).some((r) => r.id === 'shenmuGong'));
  assert.ok(!A.artsSvg(d).includes('data-art="shenmuGong"'));
  assert.notEqual(A.selfTarget(d), 'shenmuGong');
  d.arts.shenmuGong = { xp: 30, last: 0 };
  assert.equal(A.artById('shenmuGong').name, '神木毒功');
  assert.match(artsGrowHtml(d, 0, false), /神木毒功/);
  assert.ok(!A.artsSvg(d).includes('data-art="shenmuGong"'));
});
