// v1.55d 雲海循環圖（無盡段）＋三段縮放 LOD
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import { createState, tick, startExpedition } from '../src/sim.mjs'; import { save } from '../src/save.mjs'; import { openExp } from '../src/world.mjs';
import { ENDLESS, DAY } from '../src/data.mjs'; import { segAt } from '../src/world.mjs'; import * as W from '../src/world.mjs';
const buff = (s, ids, lvl) => { for (const d of s.ds) if (ids.includes(d.id)) { d.skills.palm = d.skills.leg = lvl; d.skills.agility = d.skills.strength = lvl / 2; d.hp = 100; d.mood = 80; } };
test('雲海：絕頂之前不算，之後每 200 步一重，重數＝模擬的段', () => {
  assert.equal(W.cloudAt(W.TRAIL_END - 0.1), null); assert.equal(W.cloudAt(null), null);
  for (const d of [1600, 1700, 1799, 1800, 2050, 2399]) { const c = W.cloudAt(d); assert.equal('end' + c.k, segAt(d).id, String(d)); assert.ok(c.f >= 0 && c.f < 1); }
});
test('雲海圈：頭尾接得上（下一重從同一個入口接著繞），位置在圖內', () => {
  for (const k of [1, 2, 3]) { const a = W.cloudPos(0.9999, k), b = W.cloudPos(0, k + 1); assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1); }
  for (let f = 0; f < 1; f += 0.05) { const [x, y] = W.cloudPos(f, 2); assert.ok(x > 0 && x < W.CLOUD_MAP.w && y > 0 && y < W.CLOUD_MAP.h); }
  let mx = 0; for (let d = 1600; d < 2200; d += 1) { const c = W.cloudAt(d), n = W.cloudAt(d + 1), p = W.cloudPos(c.f, c.k), q = W.cloudPos(n.f, n.k); mx = Math.max(mx, Math.hypot(p[0] - q[0], p[1] - q[1])); }
  assert.ok(mx < 30, `每步位移 ${mx}`);
});
test('每重固定 3 個遭遇點＋段末守關（every 50／len 200）', () => { const sp = W.cloudSpots(1); assert.equal(sp.length, ENDLESS.len / 50); assert.equal(sp.filter((x) => x.gate).length, 1); });
test('強隊可在雲海連續跑完 3 重（模擬沒有斷點、沒有轉場）', () => {
  const s = createState(11); tick(s); const ids = s.ds.slice(0, 4).map((d) => d.id); buff(s, ids, 3000); s.res.food = 60;
  startExpedition(openExp(s), ids, { thr: 0.1, target: W.TRAIL_END + 650 }); const ks = []; let last = null, i = 0;
  while (s.exp && i++ < 200000) { tick(s); const c = W.cloudAt(s.exp?.dist); if (c && c.k !== ks[ks.length - 1]) ks.push(c.k); if (c && last) assert.ok(c.d >= last.d || s.exp.phase === 'back'); last = c; }
  assert.deepEqual(ks.slice(0, 3), [1, 2, 3]);
});
test('三段縮放：近／中／遠門檻', () => { assert.equal(W.lodOf(W.ZOOMS.near), 'near'); assert.equal(W.lodOf(W.ZOOMS.mid), 'mid'); assert.equal(W.lodOf(W.ZOOMS.far), 'far'); assert.ok(W.ZOOMS.far * W.WORLD.w <= 1600 * 1.25, '最遠幾乎看得到整個世界'); });
test('golden 不變：v1.55d 全是畫面層', () => { const s = createState(42); for (let i = 0; i < 30 * DAY * 4; i++) tick(s);
  assert.equal(crypto.createHash('sha256').update(save(s)).digest('hex').slice(0, 16), fs.readFileSync(new URL('./fixtures/golden-30d.txt', import.meta.url), 'utf8').trim()); });
