import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick, scoreActs, outers, skipsChores, emergency, payday, setDuty, setPrio, canPromote, startTrial, migrate, save, load, quotaOf } from '../src/sim.mjs';
import { CHORE_ACTS, QUOTA, PROMOTE, DAY, RULES_VERSION } from '../src/data.mjs';
const mkOuter = (s, id, root = 4) => { const base = s.ds.find((d) => d.id === 'cousin'); const d = JSON.parse(JSON.stringify(base)); Object.assign(d, { id, name: id, role: 'outer', root, rootKnown: true, adult: true, duties: [...CHORE_ACTS], prio: 'normal', chore: 0, choreDebt: 0, contrib: 0, task: null, path: [] }); s.ds.push(d); return d; };
const acts = (s, d) => scoreActs(s, d).map((o) => o.act);

test('創立弟子皆為內門；外門未滿 2 人時內門仍做雜務', () => {
  const s = createState(3); assert.deepEqual(s.ds.map((d) => d.role), ['inner', 'inner', 'inner']);
  s.res.food = 5; assert.equal(skipsChores(s, s.ds[0]), false); mkOuter(s, 'o1'); assert.equal(skipsChores(s, s.ds[0]), false);
});
test('外門 ≥2：內門免雜務，計分裡沒有雜務', () => {
  const s = createState(3); s.res.food = 5; mkOuter(s, 'o1'); mkOuter(s, 'o2');
  const hero = s.ds[0]; assert.equal(skipsChores(s, hero), true);
  for (const a of acts(s, hero)) assert.ok(!CHORE_ACTS.includes(a), a);
});
test('斷糧或野豬下山：內門暫時回來做雜務', () => {
  const s = createState(3); mkOuter(s, 'o1'); mkOuter(s, 'o2'); s.res.food = 0; assert.equal(emergency(s), true); assert.equal(skipsChores(s, s.ds[0]), false);
  s.res.food = 5; s.mons.push({ raid: 'go', k: 'boar' }); assert.equal(skipsChores(s, s.ds[0]), false);
});
test('職司勾選：外門只做勾選的雜務；優先度與未完成日課加權', () => {
  const s = createState(3); s.res.food = 5; s.res.wood = 0; const o = mkOuter(s, 'o1');
  for (const a of CHORE_ACTS) setDuty(s, 'o1', a, a === 'chop');
  const a1 = acts(s, o); assert.ok(a1.includes('chop')); for (const a of ['farm', 'forage', 'quarry']) assert.ok(!a1.includes(a));
  setPrio(s, 'o1', 'high'); const c = scoreActs(s, o).find((x) => x.act === 'chop'); assert.equal(c.f.duty, 1.5 * QUOTA.dutyMul);
  o.chore = quotaOf(o); const c2 = scoreActs(s, o).find((x) => x.act === 'chop'); assert.equal(c2.f.duty, 1.5);
});
test('日課結算：超額記貢獻、不足扣心情並順延（不罰其他）', () => {
  const s = createState(3); const a = mkOuter(s, 'a'), b = mkOuter(s, 'b'); a.chore = QUOTA.points + 3; b.chore = 1; const coin = s.res.coin;
  payday(s);
  assert.equal(a.contrib, 3); assert.equal(a.choreDebt, 0); assert.ok(a.thoughts.some((t) => t.id === 'quotaMet'));
  assert.equal(b.choreDebt, QUOTA.points - 1); assert.equal(quotaOf(b), 2 * QUOTA.points - 1); assert.ok(b.thoughts.some((t) => t.id === 'quotaMiss'));
  assert.ok(s.res.coin >= coin); assert.equal(a.chore, 0); assert.equal(s.choreRate, (QUOTA.points + 1) / (2 * QUOTA.points));
});
test('完成雜務會累計日課點數', () => {
  const s = createState(5); s.res.food = 30; const o = mkOuter(s, 'o1'); let got = 0;
  for (let i = 0; i < 4 * 400 && !got; i++) { tick(s); got = o.chore; }
  assert.ok(got > 0);
});
test('主角自動升首徒：外門 ≥2 且完成率 ≥80%；首徒練功加權', () => {
  const s = createState(3); const a = mkOuter(s, 'a'), b = mkOuter(s, 'b'); a.chore = QUOTA.points; b.chore = QUOTA.points - 1; payday(s);
  assert.equal(s.ds[0].role, 'head'); s.res.food = 5;
  const t = scoreActs(s, s.ds[0]).find((x) => x.act === 'train'); assert.equal(t.f.head, QUOTA.headTrain);
  const s2 = createState(3); const c = mkOuter(s2, 'a'), d = mkOuter(s2, 'b'); c.chore = 1; d.chore = 1; payday(s2); assert.equal(s2.ds[0].role, 'inner');
});
test('外門升內門：根骨＋貢獻條件，再經切磋考核', () => {
  const s = createState(3); const o = mkOuter(s, 'o1', 2);
  assert.match(canPromote(s, 'o1').why, /根骨/); o.root = 5; assert.match(canPromote(s, 'o1').why, /貢獻/); o.contrib = PROMOTE.contrib;
  o.rootKnown = false; assert.match(canPromote(s, 'o1').why, /未明/); o.rootKnown = true;
  assert.equal(startTrial(s, 'o1').ok, true); assert.equal(o.task.trial, true);
  for (let i = 0; i < 4 * 120 && o.role === 'outer' && !o.trialScore; i++) tick(s);
  assert.ok(o.trialScore > 0); assert.equal(o.role, o.trialScore >= PROMOTE.pass ? 'inner' : 'outer');
});
test('考核失敗：當日冷卻', () => {
  const s = createState(3); const o = mkOuter(s, 'o1', 3); o.contrib = PROMOTE.contrib; o.skills.leg = 0; o.skills.palm = 0; o.skills.strength = 0;
  startTrial(s, 'o1'); for (let i = 0; i < 4 * 120 && !o.trialScore; i++) tick(s);
  if (o.role === 'outer') { assert.match(canPromote(s, 'o1').why, /明日/); assert.ok(o.thoughts.some((t) => t.id === 'trialFail')); }
});
test('v0.8 舊檔可讀：disciple→inner、補日課欄位', () => {
  const s = createState(4); const o = JSON.parse(save(s)); o.rules = '0.8';
  for (const d of o.ds) { d.role = 'disciple'; delete d.duties; delete d.prio; delete d.chore; delete d.choreDebt; delete d.contrib; } delete o.choreRate;
  const r = load(JSON.stringify(o)); assert.equal(r.ok, true); const m = r.state;
  assert.ok(m.ds.every((d) => d.role === 'inner' && d.duties.length === CHORE_ACTS.length && d.contrib === 0)); assert.equal(m.rules, RULES_VERSION); assert.equal(m.migratedFrom, '0.8');
  for (let i = 0; i < 400; i++) tick(m);
});
test('20 日長跑：有外門時不斷糧卡死、數值無負', () => {
  const s = createState(9); mkOuter(s, 'a'); mkOuter(s, 'b'); s.res.food = 20;
  for (let i = 0; i < 4 * DAY * 20; i++) tick(s);
  for (const v of Object.values(s.res)) assert.ok(v >= 0); { const busy = new Set(); for (let i = 0; i < 8; i++) { tick(s); for (const d of s.ds) if (d.needs.hunger > 0 || d.task) busy.add(d.id); } assert.equal(busy.size, s.ds.length); } // 快照可能剛好落在兩件事之間，看接下來 2 秒
  assert.ok(s.choreRate !== null);
});
