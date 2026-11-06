/* 第四輪 #419 N15 敵人從哪來、交戰圈與應接、山賊拆成個人。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, srcOk, NODES, MONSTERS } from '../src/data.mjs';
import { RING, handleTake, handleThroughput } from '../src/arts.mjs';
import { bandMembers, syncMembers, newBand } from '../src/threat.mjs';
import { createState, tick, startHunt } from '../src/sim.mjs';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function onPost(seed = 11, n = 1) {
  const s = createState(seed); for (let i = 0; i < 40; i++) tick(s, 0.25);
  const ds = s.ds.filter((d) => d.role !== 'laborer').slice(0, n); assert.ok(startHunt(s, ds.map((d) => d.id))); tick(s, 0.25);
  for (const d of ds) { d.pos = [...NODES[s.hunt.post]]; d.at = s.hunt.post; d.path = []; d.hp = 100; }
  s.hunt.started = true; s.hunt.queue = []; return { s, ds };
}
const rat = (s, pos) => ({ uid: `t${s.rngN++}`, k: 'rat', hp: 999, max: 999, pos, path: [], cool: 0 });

test('N15：SOURCES 每一點都在地圖邊緣 80px 內、離大殿 400px 以上', () => {
  for (const [k, S] of Object.entries(SOURCES)) assert.ok(srcOk(S.pos), k);
  assert.equal(SOURCES.gate.for, 'bandit');
});

test('N15：狩獵、獸襲、試煉野豬、山賊都從 SOURCES 出來', () => {
  const s = createState(11), seen = new Set(), bad = [];
  const check = () => { for (const m of s.mons) if (!seen.has(m.uid)) { seen.add(m.uid); const S = SOURCES[m.src]; if (!S || dist(m.pos, S.pos) > MONSTERS[m.k].speed * 0.25 + 1) bad.push([m.uid, m.src, m.pos]); } };
  for (let i = 0; i < 2400; i++) { tick(s, 0.25); check(); } /* 第一天黃昏的試煉野豬 */
  startHunt(s, s.ds.filter((d) => d.role !== 'laborer').map((d) => d.id).slice(0, 3)); for (let i = 0; i < 2400 && s.hunt; i++) { tick(s, 0.25); check(); }
  assert.ok(seen.size >= 3, `見到 ${seen.size} 隻`); assert.deepEqual(bad, []);
  const b = newBand({ n: 1, pts: 120, day: 1 }, 'veg'); assert.deepEqual(b.pos, SOURCES.gate.pos);
});

test('N15：一波分 2–3 路，都從山那一側', () => {
  const s = createState(11); for (let i = 0; i < 40; i++) tick(s, 0.25); s.eco.rat.n = 8;
  startHunt(s, s.ds.filter((d) => d.role !== 'laborer').map((d) => d.id).slice(0, 3)); const src = new Set();
  for (let i = 0; i < 2400 && s.hunt; i++) { tick(s, 0.25); for (const m of s.mons) if (!m.trial && !m.raid) src.add(m.src); }
  assert.ok(src.size >= 2 && src.size <= 3, [...src].join()); for (const k of src) assert.equal(SOURCES[k].for, 'beast');
});

test('N15：第 5 隻不佔近戰位，在外圈繞', () => {
  const { s, ds: [d] } = onPost();
  for (let k = 0; k < 5; k++) s.mons.push(rat(s, [d.pos[0] + 10 + k, d.pos[1] + k]));
  tick(s, 0.25);
  const live = s.mons.filter((m) => !m.trial && !m.raid);
  assert.equal(live.filter((m) => m.slot === d.id).length, RING.slots);
  const out = live.filter((m) => m.orbit === d.id); assert.equal(out.length, 1);
  tick(s, 0.25); assert.ok(dist(out[0].pos, d.pos) > 26, '外圈的不貼身');
});

test('N28：應接次數只作紀錄，四敵仍佔四個貼身位', () => {
  const s = { t: 10 }, d = { id: 'x', arts: {}, skills: {} };
  assert.ok(handleThroughput(d) > 0);
  assert.equal(handleTake(s, d), true); assert.equal(handleTake(s, d), true);
  assert.equal(d.maxHandled, 2);
  s.t = 10 + RING.win + 0.01; assert.equal(handleTake(s, d), true);
  const { s: s2, ds: [d2] } = onPost(); d2.skills.agility = 0; d2.arts = { basicFist: { xp: 0, last: 0 } };
  for (let k = 0; k < 4; k++) s2.mons.push(rat(s2, [d2.pos[0] + 8, d2.pos[1] + k * 3]));
  for (let i = 0; i < 40; i++) tick(s2, 0.25);
  assert.ok(d2.maxHandled >= 2, '四隻同時咬時留下多招紀錄');
});

test('N15：山賊每人血量加總＝威脅點數換算', () => {
  for (const pts of [37, 80, 121, 260, 999]) { const ms = bandMembers(pts); assert.ok(ms.length >= 2 && ms.length <= 8); assert.ok(Math.abs(ms.reduce((a, m) => a + m.hp, 0) - pts) < 1e-9); }
  const b = newBand({ n: 1, pts: 200, day: 1 }, 'veg'); b.hp = 123.5; syncMembers(b);
  assert.ok(Math.abs(b.members.reduce((a, m) => a + m.hp, 0) - 123.5) < 1e-9);
  assert.equal(b.members.filter((m) => m.hp <= 0).length, 1, '前面的人先倒');
});
