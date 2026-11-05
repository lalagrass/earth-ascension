import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, companionsFor, scorePois, release } from '../src/sim.mjs';
import { candidates } from '../src/ai.mjs';
import { visitSchedule, visitChance, appeal, reasonText, shouldApprentice, foundingPlan, titleOf, members } from '../src/recruit.mjs';
import { addAff } from '../src/social.mjs';
import { spawnEnemy } from '../src/raid.mjs';
import { seedHolder } from '../src/rng.mjs';
import { RECRUIT, SECT, ATTR_TOTAL, WORK_KINDS } from '../src/data.mjs';

const world = (seed = 4, tpl = 'qiaofeng') => createWorld({ seed, people: [{ template: tpl, name: '甲' }, ...companionsFor(seed, tpl)] });
const calm = (p) => { p.needs = { food: 95, energy: 95, social: 95, fun: 95 }; };
const busy = (p) => { p.act = 'do'; p.task = { kind: 'idle', left: 99999 }; };
const addBeds = (s, n) => { for (let i = 0; i < n; i++) s.objects.push({ id: `ob${i}`, kind: 'bed', label: '測試床', slots: [[40 + i, 16]], users: [null] }); };
// 讓第一位訪客在下一 tick 出現。
function guestNow(s) {
  s.raids = [];
  const v = s.visits[0];
  v.tick = s.tick + 1; v.roll = 0;
  step(s);
  return s.people.find((p) => p.guest);
}

test('M8-A1 來訪排程決定論、天賦合法；名望越高越常來', () => {
  const a = visitSchedule(5);
  assert.deepEqual(a, visitSchedule(5));
  for (const v of a) assert.equal(Object.values(v.attrs).reduce((x, y) => x + y, 0), ATTR_TOTAL);
  const s = world();
  const low = visitChance(s);
  s.people[0].skills.chop = 90;
  assert.ok(visitChance(s) > low);
});

test('M8-A2 去留：沒空床一定不留；只改名望或好感 appeal 上升；理由列出因素', () => {
  const s = world();
  const g = guestNow(s);
  assert.ok(g, '應該出現訪客');
  const base = appeal(s, g);
  assert.equal(base.bed, false, '三張地鋪三個人，沒有空床');
  assert.equal(base.join, false);
  assert.equal(reasonText(base), '沒有空床');
  addBeds(s, 1);
  s.people[0].skills = { ...s.people[0].skills, chop: 90, build: 90 };
  const strong = appeal(s, g);
  assert.ok(strong.score > base.score);
  addAff(s, g, s.people[0], 15);
  const liked = appeal(s, g);
  assert.ok(liked.score > strong.score);
  assert.equal(liked.join, true);
  assert.match(reasonText(liked), /高手|投緣/);
});

test('M8-A3 訪客不接活計、不迎敵', () => {
  const s = world();
  const g = guestNow(s);
  calm(g);
  s.stock.wood = 0;
  spawnEnemy(s, 'boar', 31);
  g.x = 31; g.y = 28;
  const { list } = candidates({ ...s, ...seedHolder(3) }, g, scorePois);
  assert.ok(!list.some((c) => WORK_KINDS.has(c.kind) || c.kind === 'fight'), list.map((c) => c.kind).join(','));
  assert.ok(list.some((c) => c.kind === 'hide'), '訪客應該會躲');
});

test('M8-A4 訪客沒空床就下山，離開後沒有殘留', () => {
  const s = world();
  const g = guestNow(s);
  const [a] = s.people;
  // a 正要找訪客聊天。
  a.task = { kind: 'chat', partner: g.id, chase: 80 }; a.act = 'walk'; a.path = [{ x: Math.round(a.x), y: Math.round(a.y) }];
  release(s, g); g.guest.until = s.tick; g.act = 'idle'; g.path = [];
  let gone = false;
  for (let t = 0; t < 600 && !gone; t++) { step(s); gone = !s.people.includes(g); }
  assert.ok(gone, '訪客應該走出地圖');
  assert.ok(s.events.some((e) => e.kind === 'leave' && /沒有空床/.test(e.text)));
  for (const p of s.people) assert.notEqual(p.task?.partner, g.id);
  for (const o of s.objects) assert.ok(!o.users.includes(g.id));
});

test('M8-A4 有空床、有高手、投緣就留下成為同門', () => {
  const s = world();
  addBeds(s, 1);
  const g = guestNow(s);
  s.people[0].skills = { ...s.people[0].skills, chop: 90, build: 90 };
  addAff(s, g, s.people[0], 15);
  release(s, g); g.guest.until = s.tick; g.act = 'idle'; g.path = [];
  step(s);
  assert.equal(g.guest, null);
  assert.ok(s.people.includes(g));
  assert.ok(s.events.some((e) => e.kind === 'join'));
});

test('M8-A5 拜師：朋友且名望差夠才拜；徒弟請教長得比較多', () => {
  const s = world();
  const [a, b] = s.people;
  b.skills = { ...b.skills, chop: 90, quarry: 90 };
  assert.equal(shouldApprentice(s, a, b), false, '陌生不拜');
  addAff(s, a, b, 40); addAff(s, b, a, 40);
  assert.equal(shouldApprentice(s, a, b), true);
  assert.equal(shouldApprentice(s, b, a), false, '名望低的不收徒');
  // 請教一次：師父與非師父比較。
  const learnOnce = (isMaster) => {
    const w = world();
    const [x, y, z] = w.people;
    for (const p of w.people) calm(p);
    busy(z);
    y.skills = { ...y.skills, chop: 80 };
    if (isMaster) x.master = y.id;
    w.tick = 12 * 60;
    x.needs.social = 10; y.act = 'idle'; y.task = null; y.wait = 400; y.needs.social = 40;
    x.x = y.x; x.y = y.y;
    w.objects = w.objects.filter((o) => o.kind !== 'dummy');
    for (let t = 0; t < 400 && x.skills.chop === 0; t++) { step(w); y.needs.social = 40; }
    return x.skills.chop;
  };
  const plain = learnOnce(false), master = learnOnce(true);
  assert.ok(plain > 0, '應該請教到伐木');
  assert.ok(Math.abs(master / plain - RECRUIT.MASTER_MUL) < 0.01, `${master} vs ${plain}`);
});

test('M8-A6 立派：人數與名望到門檻；門規依掌門個性；三種身分', () => {
  const s = world(4, 'guojing');      // 石敬：條理型
  addBeds(s, 1);
  assert.equal(foundingPlan(s), null, '三人不立派');
  const g = guestNow(s);
  g.guest = null;
  assert.equal(members(s).length, SECT.FOUND_MIN);
  const leader = s.people[0];
  leader.skills = { ...leader.skills, chop: 100, quarry: 100 };
  const plan = foundingPlan(s);
  assert.ok(plan && SECT.NAMES.includes(plan.name));
  assert.equal(plan.leader, leader.id);
  assert.equal(plan.rule, 'drill');
  s.sect = plan;
  const titles = s.people.map((p) => titleOf(s, p));
  assert.equal(titles.filter((t) => t === '掌門').length, 1);
  assert.equal(titles.filter((t) => t === '大弟子').length, 1);
  assert.ok(titles.includes('弟子'));
  // 門規勤練：練功分數上升。
  const p = s.people[1]; calm(p);
  const drill = () => candidates({ ...s, ...seedHolder(2) }, p, scorePois).list.find((c) => c.kind === 'drill').f.persona;
  const withRule = drill(); s.sect = null; const without = drill();
  assert.ok(Math.abs(withRule - without - SECT.RULE_DRILL) < 1e-9);
});
