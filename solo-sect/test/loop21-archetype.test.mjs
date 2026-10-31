import test from 'node:test'; import assert from 'node:assert/strict';
import { ARCH, archLabel, archRecruit } from '../src/social.mjs';
import { createState } from '../src/sim.mjs';
test('每個原型點數合法且標註參考', () => { for (const [k, a] of Object.entries(ARCH)) { const sum = Object.values(a.stats).reduce((x, y) => x + y, 0); assert.equal(sum, a.stats.wu === 1 ? 13 : 12, k); assert.match(archLabel(k), /參考：/); } });
test('選原型的主角：點數與特質套用', () => { for (const k of Object.keys(ARCH)) { const s = createState(3, { kind: 'custom', answers: Array(9).fill(0), arch: k }); const h = s.ds.find((d) => d.id === 'hero'); assert.equal(h.arch, k); assert.equal(h.wu, ARCH[k].stats.wu); for (const t of ARCH[k].traits) assert.ok(h.personality.includes(t), k + t); } });
test('不選原型＝舊行為', () => { const s = createState(3, { kind: 'custom', answers: Array(9).fill(0) }); assert.equal(s.ds.find((d) => d.id === 'hero').arch, undefined); });
test('archRecruit 在 ±1 範圍', () => { let i = 0; const r = () => (i++ % 3) / 3; for (let n = 0; n < 9; n++) { const x = archRecruit(r); const a = ARCH[x.id]; assert.ok(Math.abs(x.wu - a.stats.wu) <= 1); } });
