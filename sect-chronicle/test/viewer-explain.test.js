'use strict';
// SG-RT-03b：人物「正在做什麼、為什麼」與目標缺口。全部用正式引擎推得到的世界核對，describe 不得改世界。
const test = require('node:test');
const assert = require('node:assert/strict');
const Realtime = require('../js/realtime.js');
const Rules = require('../js/rules.js');
const StoryData = require('../js/story-data.js');
const View = require('../viewer/view.js');

const SEED = 'rt-dev-000';
const deps = { Rules, StoryData };
const KINDS = ['notJoined', 'queued', 'activity', 'recovery', 'wait', 'decide'];

function fresh(policy) {
  let world = Realtime.createWorld(SEED).state;
  if (policy) {
    const r = Realtime.dispatch(world, { id: 'test-policy', expectedRevision: world.revision, type: 'setPolicy', payload: { policy } });
    assert.equal(r.ok, true);
    world = r.state;
  }
  return world;
}

function step(world) {
  const r = Realtime.advanceTicks(world, 1);
  assert.equal(r.ok, true);
  assert.equal(r.advancedTicks, 1);
  return r.state;
}

// 突破會停住批次，剩下的 tick 接著跑完（同 viewer-controller 的參考推進）。
function advanceTo(world, tick) {
  while (world.clock.tick < tick) {
    const r = Realtime.advanceTicks(world, tick - world.clock.tick);
    assert.equal(r.ok, true);
    world = r.state;
  }
  return world;
}

function deepFreeze(v) {
  if (v && typeof v === 'object') {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze(v[k]);
  }
  return v;
}

// 世界裡的事實決定狀態類別；describe 給的類別必須一致。
function expectedKind(world, d) {
  if (d.joinTick > world.clock.tick) return 'notJoined';
  if (d.activityId !== null) {
    const act = world.activities.find((a) => a.id === d.activityId);
    return act.kind === 'rest' ? 'recovery' : 'activity';
  }
  if (d.manualOrder && d.manualOrder.status === 'pending') return 'queued';
  if (d.autonomy.wait) return 'wait';
  return 'decide';
}

function hasSources(why) {
  for (const part of [why.state, why.goal, why.next]) assert.ok(Array.isArray(part.source), JSON.stringify(part));
  for (const g of why.gaps) assert.ok(Array.isArray(g.source) && g.source.length > 0, JSON.stringify(g));
}

for (const [name, policy] of [['預設政策', null], ['詢問政策', Realtime.ASK_POLICY]]) {
  test(`${name}：整個觀察期每個人的狀態類別都對得上世界，預估結束 tick 等於實際完成 tick`, () => {
    let world = fresh(policy);
    const pending = [];
    const seenKinds = new Set();
    const seenWaits = new Set();
    let checked = 0;
    for (let t = 0; t < Rules.OBSERVATION_TICKS; t += 1) {
      const model = t % 3 === 0 ? View.describe(world, deps) : { people: [] };
      for (const p of model.people) {
        const d = world.disciples.find((x) => x.id === p.id);
        const kind = expectedKind(world, d);
        assert.equal(p.why.state.kind, kind, `tick ${t} ${p.id}`);
        assert.ok(KINDS.includes(kind));
        hasSources(p.why);
        seenKinds.add(kind);
        if (kind === 'wait') {
          seenWaits.add(d.autonomy.wait.reason);
          assert.equal(p.why.state.effect, d.autonomy.wait.reason === 'goals_done' ? 'none' : 'blocked');
        }
        // 只有 kind 能唯一對上目標時才說「為了」；採集只能列候選。
        if (kind === 'activity') {
          const act = world.activities.find((a) => a.id === d.activityId);
          if (act.kind.startsWith('gather-')) assert.equal(p.why.goal.basis, 'candidates');
          if (act.origin === 'manual') assert.equal(p.why.goal.basis, 'manual');
        }
        if (kind === 'recovery' && !world.activities.find((a) => a.id === d.activityId).fallback) {
          assert.equal(p.why.goal.basis, 'inferred');
        }
        const m = p.why.next.assumption ? /約 tick (\d+)/.exec(p.why.next.text) : null;
        if (m) pending.push({ id: d.activityId, end: Number(m[1]) });
      }
      world = step(world);
      for (const pr of pending.filter((x) => x.end === world.clock.tick)) {
        const act = world.activities.find((a) => a.id === pr.id);
        assert.equal(act.status, 'done', `${pr.id} 預估 tick ${pr.end}`);
        assert.equal(act.completedTick, pr.end);
        checked += 1;
      }
    }
    assert.ok(checked > 300, `核對了 ${checked} 筆預估`);
    // 候選人入隊前不在 disciples 裡，notJoined 只是防呆，這裡不要求出現。
    for (const k of ['activity', 'recovery', 'wait', 'decide']) assert.ok(seenKinds.has(k), k);
    if (policy) {
      assert.ok(seenWaits.has('breakthrough_ask_open'));
      assert.ok(seenWaits.has('breakthrough_later'));
    } else assert.ok(seenWaits.has('goals_done'));
  });
}

test('describe 不改世界：凍結的世界也能描述，hash 前後相同', () => {
  let world = fresh(null);
  for (const t of [0, 1, 330, 600, 1080, 1240, 2000]) {
    world = advanceTo(world, t);
    const before = Realtime.hashWorld(world);
    const frozen = deepFreeze(JSON.parse(JSON.stringify(world)));
    const a = View.describe(frozen, deps);
    const b = View.describe(world, deps);
    assert.deepEqual(a, b);
    assert.equal(Realtime.hashWorld(world), before);
  }
});

test('手動令：收到後顯示排隊和缺料，出發時缺料改成休養並說明原因', () => {
  let world = fresh(null);
  const tile = world.tiles.find((t) => Rules.TERRAIN[t.terrain].buildable);
  const id = world.protagonistId;
  const r = Realtime.dispatch(world, {
    id: 'test-build', expectedRevision: world.revision, type: 'orderActivity',
    payload: { discipleId: id, kind: 'build', target: { facilityType: 'alchemyRoom', tileId: tile.id }, units: Rules.FACILITIES.alchemyRoom.durationSlots },
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  world = r.state;
  let p = View.describe(world, deps).people.find((x) => x.id === id);
  assert.equal(p.status.kind, 'queued');
  assert.equal(p.why.state.kind, 'queued');
  assert.equal(p.why.goal.basis, 'manual');
  const gap = p.why.gaps.find((g) => g.text === '開工缺靈材：有 0，要 12');
  assert.ok(gap, JSON.stringify(p.why.gaps));
  assert.deepEqual(gap.source, ['resources.spiritMaterial', 'Rules.FACILITIES.alchemyRoom.cost.spiritMaterial']);

  world = step(world);
  p = View.describe(world, deps).people.find((x) => x.id === id);
  const act = world.activities.find((a) => a.id === world.disciples.find((d) => d.id === id).activityId);
  assert.deepEqual(act.fallback, { from: 'build', reason: 'insufficient_resource' });
  assert.equal(p.why.state.kind, 'recovery');
  assert.ok(p.why.gaps.some((g) => g.text === '原本要建造，因資源不足改成休養' && g.source.includes(`activities[${act.id}].fallback`)));
});

// 工作中又下手動令：預告的換手 tick 必須等於引擎實際讓新指令出發的 tick（RT00 §2.3、§2.5 三類）。
test('排隊手動令的換手時點：旅行走完當前一步、可打斷工作立即換、已開工承諾做完才換', () => {
  const id = 'disc-protagonist';
  const cases = [
    { tick: 1, kind: 'gather-material', status: 'traveling', words: '走完目前這一步' },
    { tick: 30, kind: 'gather-material', status: 'working', words: '可以打斷' },
    { tick: 700, kind: 'brew', status: 'working', words: '承諾不中斷' },
  ];
  for (const c of cases) {
    let world = advanceTo(fresh(null), c.tick);
    const before = world.activities.find((a) => a.id === world.disciples.find((d) => d.id === id).activityId);
    assert.equal(before.kind, c.kind);
    assert.equal(before.status, c.status);
    const r = Realtime.dispatch(world, {
      id: `test-rest-${c.tick}`, expectedRevision: world.revision, type: 'orderActivity',
      payload: { discipleId: id, kind: 'rest', target: {}, units: 1 },
    });
    assert.equal(r.ok, true);
    world = r.state;
    const why = View.describe(world, deps).people.find((p) => p.id === id).why;
    assert.equal(why.state.kind, 'activity');
    assert.ok(why.next.text.includes(c.words), why.next.text);
    const predicted = Number(/tick (\d+)/.exec(why.next.text)[1]);
    let rest = null;
    while (!rest) {
      world = step(world);
      const d = world.disciples.find((x) => x.id === id);
      const act = d.activityId && world.activities.find((a) => a.id === d.activityId);
      if (act && act.kind === 'rest' && act.origin === 'manual') rest = act;
      assert.ok(world.clock.tick < c.tick + 400, '新指令一直沒有出發');
    }
    assert.equal(rest.departTick, predicted, `${c.kind} ${c.status}`);
    assert.equal(world.activities.find((a) => a.id === before.id).status, c.kind === 'brew' ? 'done' : 'cancelled');
  }
});

test('目標狀態：缺口附來源；觀察期末的無效果等待說明已突破與卡住的目標', () => {
  let world = fresh(null);
  world = advanceTo(world, 600);
  let model = View.describe(world, deps);
  const byId = Object.fromEntries(model.goalStatus.map((g) => [g.id, g]));
  assert.equal(byId['goal-alchemy'].state, 'done');
  assert.equal(byId['goal-pills'].state, 'blocked');
  assert.ok(byId['goal-pills'].gaps.some((g) => g.source.includes('resources.spiritHerb')
    && g.source.includes('Rules.RECIPES.breakthrough-pill.cost.spiritHerb')));
  // 每個成本來源都要能在 rules.js 找到同一個數字。
  const opening = View.describe(fresh(null), deps);
  for (const g of opening.goalStatus) {
    for (const gap of g.gaps) {
      for (const src of gap.source.filter((x) => x.startsWith('Rules.') && x.includes('.cost.'))) {
        const value = src.split('.').slice(1).reduce((o, k) => o[k], Rules);
        assert.equal(typeof value, 'number', src);
        assert.match(gap.text, new RegExp(`要 ${value}$`), src);
      }
    }
  }
  assert.equal(byId['goal-recruit'].state, 'blocked');
  assert.ok(byId['goal-recruit'].gaps.some((g) => g.source.includes('story.rescues')));

  world = advanceTo(world, Rules.OBSERVATION_TICKS);
  model = View.describe(world, deps);
  const prot = model.people.find((x) => x.id === world.protagonistId);
  assert.equal(prot.why.state.kind, 'wait');
  assert.equal(prot.why.state.effect, 'none');
  assert.ok(prot.why.gaps.some((g) => g.source.includes('disciples[].breakthroughs')));
});

test('人物詳情畫出狀態、目標、下一步、缺口與來源，並跳脫 HTML', () => {
  let world = fresh(null);
  world = advanceTo(world, 100);
  const model = View.describe(world, deps);
  const html = View.renderWhy(model.people[0].why);
  assert.match(html, /正在做什麼、為什麼/);
  assert.match(html, /可能為了：建造丹房/);
  assert.match(html, /約 tick \d+/);
  assert.match(html, /class="src"/);
  const evil = View.renderWhy({
    state: { kind: 'x', text: '<b>', source: ['<i>'] }, goal: { basis: 'x', text: '', source: [] },
    next: { text: '', source: [] }, gaps: [],
  });
  assert.ok(!evil.includes('<b>') && !evil.includes('<i>'));
});
