// loop47：誰種誰心疼（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, cropMood } from '../src/sim.mjs';
const mk = (on) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), ...(on ? { cropcare: true } : {}) }); return s; };
const th = (d) => d.thoughts.find((t) => t.id.startsWith('cropLost'))?.id;
test('關：全派 cropLost；開：農事前二全額、其餘聽說、外出不知', () => {
  const a = mk(false); cropMood(a); for (const d of a.ds) assert.equal(th(d), 'cropLost');
  const s = mk(true); while (s.ds.length < 4) s.ds.push({ ...structuredClone(s.ds[0]), id: 'x' + s.ds.length, thoughts: [] });
  s.ds.forEach((d, i) => { d.skills.farming = i; d.thoughts = []; d.away = false; }); s.ds[3].away = true; cropMood(s);
  assert.deepEqual(s.ds.map(th), ['cropLostLite', 'cropLost', 'cropLost', undefined]);
});
