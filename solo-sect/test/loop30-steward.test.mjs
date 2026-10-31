import test from 'node:test'; import assert from 'node:assert/strict';
import { stewardDaily } from '../src/economy.mjs';
const H = (cap, site = null) => { const calls = []; return { calls, siteOf: () => site, capacity: () => cap, startBuild: (s, id) => { calls.push(id); return true; } }; };
const S = (o) => ({ steward: true, ds: [1, 2, 3, 4], fac: { watch: { stage: 0 } }, log: [], t: 0, ...o });
test('有人睡地鋪 → 先擴寢舍', () => { const h = H(3); assert.equal(stewardDaily(S({}), h), 'dorm'); });
test('床夠＋野豬來過 → 蓋哨崗；已有工地或未開啟 → 不動', () => { assert.equal(stewardDaily(S({ stew: { boar: 1 } }), H(6)), 'watch'); assert.equal(stewardDaily(S({ stew: { boar: 1 } }), H(3, ['x', {}])), null); assert.equal(stewardDaily(S({ steward: false }), H(3)), null); });
