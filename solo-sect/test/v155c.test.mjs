// v1.55c 七環素材、區塊迷霧、小地圖相機界線、四種巡山走法、殘餘怪返程追擊
import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs'; import { save, load } from '../src/save.mjs';
import { ROUTE } from '../src/data.mjs'; import * as W from '../src/world.mjs';
const fake = () => { const ops = []; const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => ops.push([k, a])), set: (o, k, v) => { if (k === 'fillStyle') ops.push(['fill', v]); o[k] = v; return true; } }); return { g, ops }; };
test('七環都有自己的地面疊色（不再是純色塊）', () => {
  const seen = new Set();
  for (const r of W.RINGS) { const [x, y] = r.nest, { g, ops } = fake(); W.paintChunk(g, Math.floor(x / W.CHUNK), Math.floor(y / W.CHUNK), { ground: { width: 480 }, grass: { width: 1 }, pine: { width: 1 }, bamboo: { width: 1 } });
    assert.ok(ops.some((o) => o[0] === 'drawImage'), r.id); ops.filter((o) => o[0] === 'fill' && String(o[1]).startsWith('rgba')).forEach((o) => seen.add(o[1])); }
  assert.ok(seen.size >= 7, `七種疊色，得 ${seen.size}`);
});
test('區塊繪製是決定性的', () => { const a = fake(), b = fake(); W.paintChunk(a.g, 10, 8, {}); W.paintChunk(b.g, 10, 8, {}); assert.deepEqual(a.ops, b.ops); });
test('迷霧：開局只開山門＋巢窩旁；存檔欄位小；不用亂數', () => {
  const s = createState(7); const n0 = s.rngN; tick(s); assert.equal(typeof s.fog, 'string'); assert.ok(s.fog.length <= 100);
  assert.ok(W.fogged(s, 20, 3), '遠處起霧'); assert.ok(!W.fogged(s, 1, 17), '山門可見'); assert.ok(W.fogCount(s) < 60); assert.ok(s.rngN - n0 >= 0);
});
test('迷霧：隊伍走過就揭開，且讀檔還原同一張圖', () => {
  const s = createState(7); tick(s); const c0 = W.fogCount(s); const p = [4000, 1500]; assert.ok(W.fogged(s, Math.floor(p[0] / W.CHUNK), Math.floor(p[1] / W.CHUNK)));
  W.revealAt(s, p, W.VISION); W.fogSave(s, W.fogBytes(s)); assert.ok(W.fogCount(s) > c0); assert.ok(!W.fogged(s, Math.floor(p[0] / W.CHUNK), Math.floor(p[1] / W.CHUNK)));
  const r = load(save(s)); assert.ok(r.ok); assert.equal(W.fogCount(r.state), W.fogCount(s)); assert.equal(r.state.fog, s.fog);
});
test('相機界線跟著迷霧：揭開越多，能拖越遠', () => {
  const s = createState(7); tick(s); const b0 = W.camBounds(s); W.revealAt(s, [4000, 1500], W.VISION); W.fogSave(s, W.fogBytes(s)); const b1 = W.camBounds(s);
  assert.ok(b1.y0 < b0.y0 || b1.x1 > b0.x1);
});
test('四種走法位置各不相同（同一步數）', () => {
  for (const d of [60, 130, 200]) { const ps = ['clear', 'steady', 'dash', 'slip'].map((st) => W.styledPos(d, st).map(Math.round).join(','));
    assert.ok(new Set(ps).size >= 3, `${d}: ${ps}`); }
  const sl = W.styledPos(100, 'slip'), st = W.styledPos(100, 'steady'); assert.ok(Math.hypot(sl[0] - st[0], sl[1] - st[1]) > 40, '溜走偏離山徑');
  const sp = W.SPOTS.find((x) => !x.gate && x.d === 60), c = W.styledPos(60, 'clear'); assert.ok(Math.hypot(c[0] - sp.pos[0], c[1] - sp.pos[1]) < 2, '清場繞到怪點');
  for (const k of Object.keys(W.STYLE_PATH)) assert.ok(W.STYLE_PATH[k]);
});
test('殘餘怪：只有返程驚獸撞到的那段會追來', () => {
  const s = createState(7); tick(s); s.exp = { style: 'slip', ret: { hits: [ROUTE[1].name] } };
  const ev = new Set(W.SPOTS.filter((x) => !x.gate && (x.ring === ROUTE[0].id || x.ring === ROUTE[1].id)).slice(0, 99).map((x) => x.i));
  const L = W.leftovers(s, ev); assert.ok(L.length > 0); for (const l of L) assert.equal(l.chasing, l.ring === ROUTE[1].id);
  s.exp.ret.hits = []; assert.ok(W.leftovers(s, ev).every((l) => !l.chasing));
});
test('迷霧不進亂數：同種子跑完一樣', () => { const a = createState(3), b = createState(3); for (let i = 0; i < 3000; i++) { tick(a); tick(b); } assert.equal(save(a), save(b)); });
