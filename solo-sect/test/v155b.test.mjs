// v1.55b 山徑 dist 對應、山腳／林地素材、固定怪點、召回沿原路走回
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import { createState, tick, startExpedition } from '../src/sim.mjs'; import { save } from '../src/save.mjs'; import { openExp } from '../src/slice.mjs';
import { ROUTE, DAY } from '../src/data.mjs'; import * as W from '../src/world.mjs';
const hash = (s) => crypto.createHash('sha256').update(save(s)).digest('hex').slice(0, 16);
test('山徑：半徑＝dist×PX，所以每一步所在的環＝模擬的段', () => {
  for (let d = 20; d < W.TRAIL_END; d += 7) { const p = W.trailAt(d); assert.ok(Math.abs(Math.hypot(p[0] - W.DEN[0], p[1] - W.DEN[1]) - d * W.PX) < 4, String(d)); assert.equal(W.ringAt(p), ROUTE.find((g) => d < g.to).id, String(d)); }
  assert.deepEqual(W.trailAt(0), W.DEN); for (const p of W.TRAIL) assert.ok(p[0] >= 0 && p[0] <= W.WORLD.w && p[1] >= 0 && p[1] <= W.WORLD.h);
});
test('山徑是連續的（相鄰取樣點距離有上限，不跳）', () => { for (let i = 1; i < W.TRAIL.length; i++) { const a = W.TRAIL[i - 1], b = W.TRAIL[i]; assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 200, String(i)); } });
test('固定怪點＝模擬遭遇點（與 nextAt 同一串：段界前用前一段的 every），都在山腳／林地、不壓到門派', () => {
  assert.deepEqual(W.SPOTS.filter((s) => s.gate).map((s) => s.d), [100, 250]); assert.deepEqual(W.SPOTS.filter((s) => !s.gate).map((s) => s.d), [20, 40, 60, 80, 100, 120, 145, 170, 195, 220, 245]);
  for (const s of W.SPOTS) { assert.ok(['foot', 'wood'].includes(W.ringAt(s.pos)), String(s.d)); const G = ROUTE.find((g) => g.id === s.ring); assert.ok(s.gate ? G.gate === s.k : G.roster.some(([k]) => k === s.k)); }
});
test('實跑巡山：遭遇真的發生在怪點的 dist 上（同一串 nextAt）', () => {
  const s = openExp(createState(11)); tick(s); s.res.food = 20; startExpedition(s, s.ds.slice(0, 2).map((d) => d.id)); const at = [];
  let f = 0, ev = 0; for (let i = 0; i < 20000 && s.exp && s.exp.phase === 'out'; i++) { tick(s); const X = s.exp; if (!X) break; const e = Object.values(X.evaded).reduce((a, b) => a + b, 0); if (X.fights + e > f + ev) at.push(X.dist); f = X.fights; ev = e; }
  const want = W.SPOTS.map((x) => x.d); for (const d of at.filter((d) => d <= 250)) assert.ok(want.some((w) => Math.abs(w - d) < 2.5), `遭遇於 ${d}`);
  assert.ok(at.length > 0);
});
test('召回：回程沿同一條山徑往 den 走，位置單調變近、最後回到 den', async () => {
  const s = openExp(createState(12)); tick(s); s.res.food = 20; startExpedition(s, s.ds.slice(0, 2).map((d) => d.id));
  while (s.exp && s.exp.dist < 60) tick(s); assert.ok(s.exp); const E = await import('../src/expedition.mjs'); E.recallExpedition(s); for (let i = 0; i < 200 && s.exp.phase !== 'back'; i++) tick(s); assert.equal(s.exp.phase, 'back');
  let prev = Infinity, last; while (s.exp) { const p = W.partyPos(s), r = Math.hypot(p[0] - W.DEN[0], p[1] - W.DEN[1]); assert.ok(r <= prev + 1e-6); prev = r; last = p; const d = W.partyDist(s); assert.ok(Math.hypot(p[0] - W.trailAt(d)[0], p[1] - W.trailAt(d)[1]) < 1e-6); tick(s); }
  assert.ok(Math.hypot(last[0] - W.DEN[0], last[1] - W.DEN[1]) < 40);
});
test('山腳／林地區塊用素材：有給圖就貼地面＋草叢／松竹；沒給圖退回色塊；同座標同畫', () => {
  const rec = () => { const out = []; return { out, g: { drawImage: (im, ...a) => out.push([im.n, ...a.map(Math.round)]), fillRect: (...a) => out.push(['r', ...a]), arc() {}, ellipse() {}, beginPath() {}, fill() {}, set fillStyle(c) { out.push(c); } } }; };
  const art = Object.fromEntries(['ground', 'grass', 'pine', 'bamboo'].map((n) => [n, { n, width: n === 'ground' ? 512 : 100, height: n === 'ground' ? 432 : 120 }]));
  const [cx, cy] = [Math.floor(W.trailAt(170)[0] / W.CHUNK), Math.floor(W.trailAt(170)[1] / W.CHUNK)];
  const a = rec(); W.paintChunk(a.g, cx, cy, art); assert.ok(a.out.some((x) => x[0] === 'ground')); assert.ok(a.out.some((x) => x[0] === 'pine'));
  const b = rec(); W.paintChunk(b.g, cx, cy, art); assert.deepEqual(a.out, b.out);
  const c = rec(); W.paintChunk(c.g, cx, cy); assert.ok(!c.out.some((x) => x[0] === 'ground'));
});
test('golden 不變：v1.55b 全是畫面層', () => { const s = createState(42); for (let i = 0; i < 30 * DAY * 4; i++) tick(s); assert.equal(hash(s), fs.readFileSync(new URL('./fixtures/golden-30d.txt', import.meta.url), 'utf8').trim()); });
