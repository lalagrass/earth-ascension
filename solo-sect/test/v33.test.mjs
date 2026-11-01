/* v3.3 loop206：出手帳跟門派戰力並陳。power() 不改。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { strikeLedger33, power } from '../src/jianghu.mjs';
import { dpsOf } from '../src/world.mjs';
import { mitOf, qiMax, harmonyMul, HARMONY24 } from '../src/arts.mjs';

const disc = (id, extra = {}) => ({
  id, role: 'outer', away: false, v24: true, v23: true, ng2: 1, qi: 40, qiInjury: 0,
  skills: { palm: 40, leg: 0, strength: 0, sword: 0 }, powMul: 1, personality: [], values: {},
  moves: ['jd1'], arts: { breath: { xp: 55 }, jindingPalm: { xp: 55 } }, ...extra,
});
const sect = (ds) => ({ t: 0, ds });
const top3 = (s) => s.ds.filter((d) => d.role !== 'laborer' && !d.away).map((d) => ({ d, dps: dpsOf(s, d) })).sort((a, b) => b.dps - a.dps || (a.d.id < b.d.id ? -1 : 1)).slice(0, 3);

test('loop206 出手是同一批人的 dpsOf 前三名加總，減傷與內力不乘進去', () => {
  const s = sect([
    disc('a', { skills: { palm: 10, leg: 0, strength: 0, sword: 0 } }),
    disc('b', { skills: { palm: 80, leg: 0, strength: 0, sword: 0 } }),
    disc('c', { skills: { palm: 40, leg: 0, strength: 0, sword: 0 } }),
    disc('d', { skills: { palm: 20, leg: 0, strength: 0, sword: 0 } }),
    disc('labor', { role: 'laborer', skills: { palm: 100, leg: 0, strength: 0, sword: 0 }, moves: ['jd1'] }),
    disc('away', { away: true, skills: { palm: 100, leg: 0, strength: 0, sword: 0 } }),
  ]);
  const rows = top3(s);
  assert.deepEqual(rows.map((r) => r.d.id), ['b', 'c', 'd']);
  const L = strikeLedger33(s);
  assert.equal(L.power, power(s));
  assert.equal(L.n, 3);
  assert.equal(L.dps, rows.reduce((a, r) => a + r.dps, 0));
  assert.ok(L.dps < s.ds.filter((d) => d.role !== 'laborer' && !d.away).reduce((a, d) => a + dpsOf(s, d), 0));
  const mit = rows.reduce((a, r) => a + mitOf(r.d), 0) / 3;
  const qi = rows.reduce((a, r) => a + qiMax(r.d), 0) / 3;
  assert.equal(L.mit, mit);
  assert.equal(L.qi, qi);
  assert.ok(L.mit > 0 && L.qi > 0);
  const folded = L.dps / (1 - L.mit) * (1 + L.qi / 400);
  assert.ok(Math.abs(L.dps - folded) > 1);
  const bare = sect(s.ds.filter((d) => d.id !== 'labor' && d.id !== 'away'));
  assert.equal(strikeLedger33(bare).dps, L.dps);
  assert.equal(power(bare), L.power);
});

test('loop206 多一門入門武學會抬門派戰力；共鳴與造詣凍住時出手不變', () => {
  const base = sect([disc('a', { moves: ['jd1'] })]);
  const extra = sect([disc('a', { moves: ['jd1'], arts: { breath: { xp: 55 }, jindingPalm: { xp: 55 }, basicFist: { xp: 0 } } })]);
  assert.equal(harmonyMul(extra.ds[0]), harmonyMul(base.ds[0]));
  assert.equal(harmonyMul(base.ds[0]), 1);
  assert.ok(power(extra) > power(base));
  assert.equal(strikeLedger33(extra).dps, strikeLedger33(base).dps);
  const open = sect([disc('a', { moves: ['jd1'], arts: { breath: { xp: 55 }, jindingPalm: { xp: 55 }, pishiFist: { xp: 25 } } })]);
  assert.equal(harmonyMul(open.ds[0]), HARMONY24.all); /* 吐納已小成，陰陽再加「和」是三屬 */
  assert.ok(strikeLedger33(open).dps > strikeLedger33(base).dps);
});

test('loop206 診斷把出手記在 v33，pow 仍是 power()', () => {
  const out = execFileSync(process.execPath, [new URL('./harness/diag-v24-v25.mjs', import.meta.url).pathname, 'bot', '1', '1004', '2'], { env: { ...process.env, SS_DT: '6' } }).toString().trim();
  const r = JSON.parse(out);
  assert.equal(r.crash, 0, r.err);
  assert.equal(typeof r.pow, 'number');
  assert.equal(typeof r.v33.dps, 'number');
  assert.equal(typeof r.v33.mit, 'number');
  assert.equal(typeof r.v33.qi, 'number');
  assert.equal(r.v33.d10, null);
  assert.ok(r.v33.dps > 0);
});
