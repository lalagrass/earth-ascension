import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, RULES } from '../demo/model.mjs';
import { createRoutes } from '../demo/routes.mjs';
import { WATER_POINTS } from '../demo/water-layout.mjs';
import { guardedSave, guardedLoad } from '../demo/life02.mjs';
import { saveTo, loadFrom, SAVE_KEY } from '../demo/life-save.mjs';

const mk = () => {
  const geo = createRoutes(WATER_POINTS);
  return createModel(1700.9, RULES, undefined, undefined, { meetLengths: geo.meetLengths });
};
const stepUntil = (m, predicate, max = 60 * 60 * 30) => {
  for (let i = 0; i < max; i++) { m.step(); if (predicate()) return true; }
  return false;
};
const bothFun = (m) => ['hero', 'cousin'].every((id) => m.state.people[id].motion.mode === 'fun');
const storage = () => ({ v: new Map(), getItem(k) { return this.v.get(k) ?? null; }, setItem(k, x) { this.v.set(k, x); } });

test('S1/S2：手動邀女孩鼓勵，真走雙人站位才開始 2+2 秒；台詞讀來源，不加精力或能力', () => {
  const m = mk();
  assert.ok(stepUntil(m, () => bothFun(m)), '原工作完成後兩人真到院中空檔');
  const r = m.dispatch('invite:encourage', 'hero');
  assert.ok(r.ok, r.reason);
  assert.equal(m.life02.state.meet.speaker, 'cousin');
  assert.equal(m.life02.state.meet.cause.kind, 'delivery');
  assert.ok(stepUntil(m, () => ['hero', 'cousin'].every((id) => m.state.people[id].motion.mode === 'meet')));
  const before = Object.fromEntries(['hero', 'cousin'].map((id) => [id, { energy: m.state.people[id].energy, level: m.state.people[id].level, xp: m.state.people[id].xp }]));
  assert.match(m.life02.view(m.state.people.cousin).meet.say, /剛才那趟辛苦了/);
  for (let i = 0; i < 120; i++) m.step();
  assert.match(m.life02.view(m.state.people.hero).meet.say, /有妳在/);
  assert.equal(m.life02.events().length, 0, '回應未說完不提前記相處');
  assert.ok(stepUntil(m, () => m.life02.events().length === 1, 130));
  assert.deepEqual(Object.fromEntries(['hero', 'cousin'].map((id) => [id, { energy: m.state.people[id].energy, level: m.state.people[id].level, xp: m.state.people[id].xp }])), before);
  assert.equal(m.life02.view(m.state.people.hero).relation, '家人・多聊了一些');
  assert.equal(m.life02.events()[0].cause.kind, 'delivery');
  assert.ok(stepUntil(m, () => bothFun(m) && m.life02.view(m.state.people.hero).cooldown === 0));
  assert.ok(m.dispatch('invite:chat', 'hero').ok);
  assert.ok(stepUntil(m, () => m.life02.state.meet === null));
  assert.equal(m.life02.state.count, 1, '同一真生活片段改聊法不再刷關係');
  assert.equal(m.life02.events().length, 1, '未新增虛構第 2 筆結果');
});

test('S3：拒絕與取消不扣相處、不消耗 context 成功額度；冷卻重點不延長', () => {
  const m = mk();
  m.step();
  const rejected = m.dispatch('invite:chat', 'hero'); // 兩人仍在原挑水路上
  assert.equal(rejected.ok, false);
  const until = m.life02.state.cooldown;
  assert.equal(m.dispatch('invite:chat', 'hero').ok, false);
  assert.equal(m.life02.state.cooldown, until);
  assert.equal(m.life02.state.count, 0);
  assert.ok(stepUntil(m, () => bothFun(m) && m.life02.view(m.state.people.hero).cooldown === 0));
  const context = m.life02.state.context;
  assert.ok(m.dispatch('invite:chat', 'hero').ok);
  const h = m.state.people.hero.motion;
  assert.equal(h.mode, 'toMeet'); assert.equal(h.steps, 0);
  for (let i = 0; i < 30; i++) m.step();
  const progress = m.state.people.hero.motion.steps;
  assert.ok(m.dispatch('meetCancel', 'hero').ok);
  assert.equal(m.life02.state.meet, null);
  assert.equal(m.life02.state.credited, -1);
  assert.equal(m.life02.state.context, context);
  assert.equal(m.state.people.hero.motion.mode, 'fromMeet');
  assert.equal(m.state.people.hero.motion.steps, 0, '取消同 tick 不偷偷走回');
  assert.ok(progress > 0);
  assert.ok(stepUntil(m, () => bothFun(m) && m.life02.view(m.state.people.hero).cooldown === 0));
  assert.ok(m.dispatch('invite:chat', 'hero').ok, '同 context 可再邀');
  assert.ok(stepUntil(m, () => m.life02.state.count === 1));
  assert.equal(m.life02.state.credited, context);
  assert.equal(m.life02.events().length, 1);
});

test('S1/S3：對方忙時自主只做資格檢查、不送假邀請；同 context 真成立後只一次', () => {
  const m = mk();
  assert.ok(stepUntil(m, () => bothFun(m)));
  assert.ok(m.dispatch('fill', 'hero').ok);
  assert.ok(m.dispatch('fill', 'cousin').ok);
  const t = m.life02.state, context = t.context;
  t.ready.hero = t.ready.cousin = true;
  m.state.people.cousin.pending = 'water'; // 定向忙碌 fixture；直接調 LIFE02 資格檢查，不讓核心 tick 消耗待令
  m.life02.step();
  assert.notEqual(t.autoTried, context, '雙方資格未齊，未送自主邀請');
  assert.equal(t.meet, null);
  assert.equal(t.cooldown, 0, '沒有建立／拒絕邀請，就不啟 30 秒冷卻');
  assert.equal(t.ready.hero, false, '原 LIFE02 發起者等新工作才再查');
  assert.equal(t.ready.cousin, true, '另一方可在有空時送出本 context 唯一真邀請');
  m.state.people.cousin.pending = null;
  m.life02.step();
  assert.ok(t.meet && t.meet.source === 'auto', '雙方都可用時才送出第一個真自主邀請');
  assert.equal(t.autoTried, context);
  assert.equal(t.context, context);
  assert.equal(t.count, 0);
  assert.ok(m.dispatch('meetCancel', 'hero').ok);
  m.state.tick = t.cooldown;
  t.ready.hero = t.ready.cousin = true; // 即使外部重新給 ready，同 context 也不能第二次自主邀
  m.state.people.hero.motion = { mode: 'fun', job: null };
  m.state.people.cousin.motion = { mode: 'fun', job: null };
  m.life02.step();
  assert.equal(t.meet, null);
});

test('S1/C：較新工作在發話中有效，兩人從真位置返院，不覆寫新命令或誤續停工', () => {
  const m = mk(); assert.ok(stepUntil(m, () => bothFun(m)));
  assert.ok(m.dispatch('invite:chat', 'cousin').ok);
  assert.ok(stepUntil(m, () => m.life02.state.meet?.phase === 'talk'));
  const r = m.dispatch('work:herb', 'hero');
  assert.ok(r.ok, r.reason);
  assert.equal(m.life02.state.meet, null);
  assert.equal(m.state.people.hero.job, 'herb');
  for (const id of ['hero', 'cousin']) { const h = m.state.people[id].motion; assert.equal(h.mode, 'fromMeet'); assert.equal(h.steps, 0); }
  assert.equal(m.life02.state.count, 0);
  assert.ok(stepUntil(m, () => m.state.people.hero.motion.mode === 'carry' && m.state.people.hero.motion.job === 'herb'));
});

test('S1/C：明確停工者安全坐滿後可接受手動邀聊；沿座位原路回院，聊完仍停工', () => {
  const m = mk(); assert.ok(stepUntil(m, () => bothFun(m)));
  assert.ok(m.dispatch('restAfterTrip', 'cousin').ok);
  assert.ok(stepUntil(m, () => m.state.people.cousin.motion.mode === 'seated' && m.state.people.cousin.energy >= RULES.energy.backAt));
  assert.equal(m.state.people.cousin.rest, 'manual');
  assert.ok(m.dispatch('invite:chat', 'hero').ok);
  assert.equal(m.state.people.cousin.motion.origin, 'seat');
  assert.ok(stepUntil(m, () => m.life02.state.count === 1));
  assert.ok(stepUntil(m, () => m.state.people.cousin.motion.mode === 'seated'));
  assert.equal(m.state.people.cousin.rest, 'manual');
  assert.equal(m.state.people.cousin.job, 'water');
});

test('S4：社交只本局；進行中不覆寫舊好檔，成功讀檔重設，失敗讀檔保暫態', () => {
  const m = mk(), st = storage(), tpl = mk().exportState();
  assert.ok(saveTo(st, m).ok); const original = st.getItem(SAVE_KEY);
  assert.ok(stepUntil(m, () => bothFun(m)));
  assert.ok(m.dispatch('invite:chat', 'hero').ok);
  const blocked = guardedSave(m, () => saveTo(st, m));
  assert.equal(blocked.ok, false); assert.equal(st.getItem(SAVE_KEY), original);
  const bad = storage(); bad.setItem(SAVE_KEY, '{bad');
  const keep = JSON.stringify(m.life02.state);
  assert.equal(guardedLoad(m, () => loadFrom(bad, m, tpl)).ok, false);
  assert.equal(JSON.stringify(m.life02.state), keep);
  assert.ok(guardedLoad(m, () => loadFrom(st, m, tpl)).ok);
  assert.equal(m.life02.state.meet, null); assert.equal(m.life02.state.count, 0);
  assert.equal(m.life02.view(m.state.people.hero).relation, '家人・平日相伴');
  assert.ok(!original.includes('social') && !original.includes('context'));
});

test('S3：真新交付解鎖不同 context；0／1／3 描述與最近六筆裁舊不倒退', () => {
  const m = createModel(1700.9, { ...RULES, thirst: true });
  assert.equal(m.life02.view(m.state.people.hero).relation, '家人・平日相伴');
  m.dispatch('fill', 'hero'); m.dispatch('fill', 'cousin');
  let last = 0, atOne = null, atThree = null;
  for (let i = 0; i < 60 * 60 * 80 && m.life02.state.count < 7; i++) {
    m.step();
    if (m.life02.state.count !== last) {
      last = m.life02.state.count;
      if (last === 1) atOne = m.life02.view(m.state.people.hero).relation;
      if (last === 3) atThree = m.life02.view(m.state.people.hero).relation;
    }
    if (!m.life02.state.meet && m.life02.view(m.state.people.hero).cooldown === 0 && bothFun(m)) m.dispatch('invite:chat', 'hero');
  }
  assert.ok(m.life02.state.count >= 7, '多趟真交付才有七個不同來源');
  assert.equal(atOne, '家人・多聊了一些');
  assert.equal(atThree, '家人・相處更自在');
  assert.equal(m.life02.events().length, 6);
  assert.equal(new Set(m.life02.events().map((e) => e.context)).size, 6);
  assert.equal(m.life02.view(m.state.people.hero).relation, '家人・相處更自在');
  assert.ok(m.life02.events().every((e) => e.cause.kind === 'delivery' && e.cause.tick <= e.tick));
});
