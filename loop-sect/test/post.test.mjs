import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, placeBlueprint, release, setFocus, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { spawnEnemy } from '../src/raid.mjs';
import { POST, DEFENSE, TICKS_PER_DAY } from '../src/data.mjs';
import { walkable } from '../src/map.mjs';
import { bestMove } from '../src/forms.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
function withPosts(seed = 4) {
  const s = world(seed);
  s.raids = []; s.visits = [];
  s.stock.wood = 40;
  assert.ok(placeBlueprint(s, 'fence-s').ok);
  for (let i = 0; i < 3 * TICKS_PER_DAY && !s.built.includes('fence-s'); i++) { fed(s); step(s); }
  assert.ok(placeBlueprint(s, 'posts').ok);
  for (let i = 0; i < 2 * TICKS_PER_DAY && !s.built.includes('posts'); i++) { fed(s); step(s); }
  return s;
}

test('M14-A1 哨位：南柵欄沒蓋好時放不下去；完工加兩個哨位、站位可走', () => {
  const s = world();
  assert.match(placeBlueprint(s, 'posts').reason, /要先蓋好南柵欄/);
  const t = withPosts();
  assert.ok(t.built.includes('posts'));
  const posts = t.objects.filter((o) => o.kind === 'post');
  assert.equal(posts.length, 2);
  for (const o of posts) assert.ok(walkable(t.map, o.slots[0][0], o.slots[0][1]));
});

test('M14-A2 候選：有敵人、有空哨位時才有守哨；訪客沒有；專長守衛的人分數高', () => {
  const s = withPosts();
  const [a, b] = s.people;
  fed(s);
  const has = (p) => candidates(s, p, scorePois).list.some((c) => c.kind === 'watch');
  assert.ok(!has(a), '沒有敵人時不守');
  spawnEnemy(s, 'boar', 30);
  assert.ok(has(a));
  const score = (p) => Math.max(...candidates(s, p, scorePois).list.filter((c) => c.kind === 'watch').map((c) => c.f.work + c.f.focus));
  const before = score(b);
  setFocus(s, b.id, 'guard');
  assert.ok(score(b) > before, '專長守衛加分');
  b.guest = { arrived: 0, until: 999 };
  assert.ok(!has(b), '訪客不守');
  b.guest = null;
  for (const o of s.objects) if (o.kind === 'post') o.users[0] = 'x';
  assert.ok(!has(a), '哨位滿了就沒有');
});

// 把甲放上第一座哨位、其他人關起來，生一頭野豬放在指定位置。
function onPost(s, ex, ey) {
  const [a, ...rest] = s.people;
  for (const p of rest) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; }
  release(s, a);
  const post = s.objects.find((o) => o.kind === 'post');
  a.x = post.slots[0][0]; a.y = post.slots[0][1]; a.path = [];
  a.task = { kind: 'watch', obj: post.id, slot: 0, left: 9999, dealt: 0 }; a.act = 'do'; post.users[0] = a.id;
  a.needs = { food: 95, energy: 80, social: 95, fun: 95 };
  const e = spawnEnemy(s, 'boar', 30);
  e.x = ex; e.y = ey; e.mode = 'come'; e.path = [];
  return { a, e, post };
}

test('M14-A3 守哨：範圍內的敵人每 tick 扣血、守的人不動、精力只扣 DRAIN；範圍外不扣；敵人走了就下來', () => {
  const s = withPosts();
  const { a, e, post } = onPost(s, 0, 0);
  e.x = post.slots[0][0] + 2; e.y = post.slots[0][1] + 2;
  e.mode = 'steal'; e.wait = 999;
  // 對照：同一 tick 站著不動的人（自然消耗一樣），守哨的人只多扣 DRAIN，沒有被野豬反擊（hit 0.25）。
  const ref = s.people[1];
  ref.needs.energy = a.needs.energy;
  const hp = e.hp, x = a.x, y = a.y, en = a.needs.energy;
  step(s);
  assert.ok(e.hp < hp, '範圍內扣血');
  assert.equal(a.x, x); assert.equal(a.y, y);
  const extra = (en - a.needs.energy) - (en - ref.needs.energy);
  assert.ok(Math.abs(extra - POST.DRAIN) < 1e-9, `比站著的人多扣 ${extra}`);
  assert.ok(e.hitBy.includes(a.id));
  // 範圍外。
  e.x = post.slots[0][0] + POST.RANGE + 2; e.y = post.slots[0][1] + 3;
  const hp2 = e.hp;
  step(s);
  assert.equal(e.hp, hp2, '範圍外不扣');
  assert.equal(a.task.kind, 'watch');
  // 敵人都走了。
  s.enemies = [];
  step(s);
  assert.notEqual(a.task?.kind, 'watch');
  void DEFENSE;
});

test('M14-A4 台上出手：範圍內有敵人時出最強的招、朝向敵人；沒有敵人時不出手', () => {
  const s = withPosts();
  const { a, e, post } = onPost(s, 0, 0);
  e.x = post.slots[0][0] + 3; e.y = post.slots[0][1]; e.mode = 'steal'; e.wait = 999;
  a.strike = null;
  step(s);
  assert.ok(a.strike, '有出手');
  assert.equal(a.strike.kind, 'watch');
  assert.equal(a.strike.move, bestMove(a));
  assert.ok(Math.abs(a.strike.ang) < 0.3, `朝東邊的敵人（角度 ${a.strike.ang.toFixed(2)}）`);
  const at = a.strike.at;
  e.x = post.slots[0][0] + POST.RANGE + 3;
  for (let i = 0; i < 30; i++) step(s);
  assert.equal(a.strike.at, at, '範圍外不出手');
});
