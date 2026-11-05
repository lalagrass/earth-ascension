import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, release, scorePois } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { addAff, aff, withStage, bondLabel } from '../src/social.mjs';
import { FAMILY } from '../src/data.mjs';

const world = (seed = 4) => createWorld({ seed, people: [{ template: 'qiaofeng', name: '甲' }, ...companionsFor(seed, 'qiaofeng')] });
const fed = (s) => { for (const p of s.people) p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const park = (s, keep) => { for (const p of s.people) if (!keep.includes(p)) { release(s, p); p.task = { kind: 'idle', left: 99999 }; p.act = 'do'; } };

// 兩人在一起聊到完，回傳甲對乙這次加了多少好感。
function chatGain(start) {
  const s = world();
  s.raids = []; s.visits = [];
  const [a, b] = s.people;
  park(s, [a, b]);
  addAff(s, a, b, start); addAff(s, b, a, start);
  a.x = 30; a.y = 25; b.x = 31; b.y = 25; a.path = []; b.path = [];
  for (const p of [a, b]) { release(s, p); p.act = 'do'; }
  a.task = { kind: 'chat', partner: b.id, left: 1 }; b.task = { kind: 'chat', partner: a.id, left: 1 };
  const before = aff(s, a, b);
  fed(s); step(s);
  return aff(s, a, b) - before;
}

test('M17-A1 談心：朋友以上聊完好感是 DEEP 倍；相識不變', () => {
  const known = chatGain(15), friend = chatGain(35);
  assert.ok(known > 0);
  assert.ok(Math.abs(friend / known - FAMILY.DEEP) < 1e-9, `相識 ${known}、朋友 ${friend}`);
});

test('M17-A2 升到知己就成家；已有家人、訪客不再成家；道侶／金蘭看 F 軸', () => {
  const s = world();
  const [a, b, c] = s.people;
  withStage(s, a, b, () => { addAff(s, a, b, 70); addAff(s, b, a, 70); });
  assert.equal(a.kin, b.id); assert.equal(b.kin, a.id);
  const ev = s.events.find((e) => e.kind === 'family');
  assert.ok(ev && ev.who.includes(a.id) && ev.who.includes(b.id));
  assert.match(ev.text, /^甲與.+(結為道侶|結義為金蘭)$/);
  withStage(s, a, c, () => { addAff(s, a, c, 70); addAff(s, c, a, 70); });
  assert.equal(a.kin, b.id, '已有家人不會再成家');
  assert.equal(c.kin ?? null, null);
  assert.equal(s.events.filter((e) => e.kind === 'family').length, 1);
  const g = s.people[2]; g.guest = { arrived: 0, until: 1e9 };
  const d = createWorld({ seed: 5, people: [{ template: 'qiaofeng', name: '丁' }, ...companionsFor(5, 'qiaofeng')] });
  const [x, y] = d.people; y.guest = { arrived: 0, until: 1e9 };
  withStage(d, x, y, () => { addAff(d, x, y, 70); addAff(d, y, x, 70); });
  assert.equal(x.kin ?? null, null, '訪客不成家');
  assert.equal(bondLabel({ axes: { F: 0.5 } }, { axes: { F: 0.2 } }), '道侶');
  assert.equal(bondLabel({ axes: { F: 0.5 } }, { axes: { F: -0.2 } }), '金蘭');
});

test('M17-A3 家人在的桌、家人睡的床旁邊，分數較高', () => {
  const s = world();
  s.raids = []; s.visits = [];
  const [a, b] = s.people;
  park(s, [a, b]);
  release(s, a); a.task = null; a.act = 'idle'; a.wait = 0;
  a.kin = b.id; b.kin = a.id;
  a.needs = { food: 40, energy: 20, social: 60, fun: 60 };
  s.stock.meal = 5;
  const score = (kind, obj) => candidates(s, a, scorePois).list.find((c) => c.kind === kind && c.obj === obj)?.f.persona;
  const table = s.objects.find((o) => o.kind === 'table');
  // 乙沒在吃：桌的個性分；乙在那桌吃：多 EAT。
  const p0 = score('eat', table.id);
  release(s, b); b.task = { kind: 'eat', obj: table.id, slot: 0, left: 30 }; b.act = 'do'; table.users[0] = b.id;
  const p1 = score('eat', table.id);
  assert.ok(p1 - p0 >= FAMILY.EAT - 1e-9, `${p0} → ${p1}`);
  // 乙睡在第一張床：BED_R 內的床多 BED，遠的不加。
  release(s, b);
  const beds = s.objects.filter((o) => o.kind === 'bed');
  b.task = { kind: 'sleep', obj: beds[0].id, slot: 0, left: 400 }; b.act = 'do'; beds[0].users[0] = b.id;
  for (const bed of beds.slice(1)) {
    const near = Math.hypot(bed.slots[0][0] - beds[0].slots[0][0], bed.slots[0][1] - beds[0].slots[0][1]) <= FAMILY.BED_R;
    assert.equal(score('sleep', bed.id), near ? FAMILY.BED : 0, `${bed.slots[0]} ${near ? '近' : '遠'}`);
  }
});
