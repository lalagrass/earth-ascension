import { openExp } from "../src/slice.mjs";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition, save, load } from '../src/sim.mjs';
import { RULES_VERSION, EXP, ROUTE } from '../src/data.mjs';
import { returnPlan, returnStep, unclearedSegs, milestones, reportText } from '../src/expedition.mjs';
import { tierOf, sideCards, bubbles, whoOf } from '../src/events.mjs';
import { statusOf } from '../src/status.mjs';
import { migrate } from '../src/save.mjs';
import { log } from '../src/util.mjs';
const mk = () => { const s = createState(7); tick(s); return s; };
// 走到 X.dist、seg 紀錄可自訂的回程情境
const backX = (s, seg, loot, sta = 100, dist = 500) => { s.exp = { team: [], dist, phase: 'back', backPos: dist, seg, loot: { ...loot }, sta, events: [], records: {} }; s.exp.ret = returnPlan(s, s.exp); return s.exp; };
test('v1.45 版本號＋舊檔一步遷移（log 標級、回程隊伍補 ret）', () => {
  assert.ok(['1.45', '1.5'].includes(RULES_VERSION)); const s = mk(); const o = JSON.parse(save(s)); o.rules = '1.4'; for (const e of o.log) delete e.tier; delete o.alert;
  o.exp = { phase: 'back', dist: 120, team: [], seg: {}, loot: {}, events: [] }; migrate(o);
  assert.deepEqual(o.migSteps, ['1.45', '1.5']); assert.ok(o.log.every((e) => e.tier)); assert.ok(o.exp.ret && o.exp.backPos === 120); assert.equal(o.alert, null);
});
test('A1 返程驚獸：每段未清段扣耐力 6，固定值', () => {
  const s = mk(); const X = backX(s, { foot: { enc: 3, kill: 3 }, wood: { enc: 4, kill: 2 }, [ROUTE[2].id]: { enc: 2, kill: 0 } }, { herb: 4 });
  assert.deepEqual(X.ret.left.map((g) => g.id), [ROUTE[2].id, 'wood']); // 深處先、全清段不算
  X.backPos = 0; returnStep(s, X); assert.equal(X.sta, 100 - 2 * EXP.retSta); assert.equal(X.ret.hits.length, 2); assert.equal(X.loot.herb, 4); assert.equal(X.ret.lost, null);
});
test('A1 反例：沒帶戰利品不引獸；全清場 0 損耗', () => {
  const s = mk(); let X = backX(s, { wood: { enc: 4, kill: 1 } }, {}); assert.equal(X.ret.left.length, 0);
  X = backX(s, { foot: { enc: 3, kill: 3 }, wood: { enc: 4, kill: 4 } }, { herb: 3 }); X.backPos = 0; returnStep(s, X); assert.equal(X.sta, 100); assert.deepEqual(X.ret.hits, []);
});
test('A1 耐力見底才掉一半戰利品（只掉一次、不受傷）', () => {
  const s = mk(); const X = backX(s, { foot: { enc: 3, kill: 0 }, wood: { enc: 4, kill: 1 } }, { herb: 5, hide: 2, food: 1 }, 8);
  returnStep(s, X); assert.equal(X.ret.hits.length, 0, '還沒走到未清段');
  X.backPos = 150; returnStep(s, X); assert.equal(X.sta, 2); assert.equal(X.ret.lost, null);
  X.backPos = 0; returnStep(s, X); assert.ok(X.sta <= 0); assert.deepEqual(X.ret.lost, { herb: 2, hide: 1 }); assert.deepEqual(X.loot, { herb: 3, hide: 1, food: 1 });
});
test('A1 已平靖段不算未清', () => {
  const s = mk(); s.records.qing = { wood: EXP.peaceQing }; const X = { dist: 300, seg: { wood: { enc: 4, kill: 1 } }, loot: { herb: 1 } }; assert.equal(unclearedSegs(s, X).length, 0);
});
test('A1 整趟巡山端到端：戰報含返程欄位、決定性', () => {
  const run = () => { const s = mk(); for (const d of s.ds) { d.hp = 100; d.mood = 80; } const ids = s.ds.filter((d) => d.role !== 'laborer').slice(0, 2).map((d) => d.id); const r = startExpedition(openExp(s), ids, { order: 'slip', target: ROUTE[3].to }); assert.ok(r.ok, r.why); for (let i = 0; i < 40000 && s.exp; i++) tick(s); return s.lastExp; };
  const a = run(), b = run(); assert.ok(a && 'ret' in a); assert.deepEqual(a.ret, b.ret); assert.equal(typeof reportText(a), 'string');
  if (a.ret?.hits.length) assert.match(reportText(a), /返程驚獸/);
});
test('A3 三級分流：top／mid／low', () => {
  assert.equal(tierOf('名俠洪七公來訪'), 'top'); assert.equal(tierOf('巡山戰報 #1：走到山腳'), 'mid'); assert.equal(tierOf('阿二去吃飯'), 'low');
  const s = mk(); const n = s.ds[1].name; log(s, `${n}伸了個懶腰`); log(s, '巡山隊出發：測試'); assert.equal(bubbles(s)[s.ds[1].id], `${n}伸了個懶腰`);
  assert.ok(sideCards(s).every((e) => e.tier !== 'low')); assert.equal(whoOf(s, `${n}伸了個懶腰`), s.ds[1].id);
});
test('A3 top 事件設 alert（UI 暫停推鏡）；已有 alert 不覆蓋', () => {
  const s = mk(); s.alert = null; log(s, '★ 測試大事一'); assert.equal(s.alert.msg, '★ 測試大事一'); log(s, '★ 測試大事二'); assert.equal(s.alert.msg, '★ 測試大事一');
});
test('A3 氣泡過期（8 秒）後消失', () => { const s = mk(); const n = s.ds[1].name; log(s, `${n}打了個呵欠`); s.t += 9; assert.equal(bubbles(s)[s.ds[1].id], undefined); });
test('A3/A16 里程軸：✔/⚠/▶/·', () => {
  const s = mk(); s.exp = { dist: ROUTE[2].from + 5, phase: 'out', seg: { foot: { enc: 2, kill: 2 }, wood: { enc: 3, kill: 1 } } };
  const m = milestones(s); assert.deepEqual(m.slice(0, 4).map((x) => x.st), ['clear', 'open', 'now', 'todo']);
});
test('A5 現在／原因／下一步，標出決策層', () => {
  const s = mk(); for (let i = 0; i < 200; i++) tick(s); const d = s.ds.find((x) => x.task) || s.ds[0]; const x = statusOf(s, d);
  assert.ok(x.now && x.why && x.next); assert.ok(['指令', '生理', '作息', '性格', '巡山', '職司', '工序', '待命'].includes(x.layer));
  d.order = 'train'; assert.equal(statusOf(s, d).layer, '指令'); d.order = null; d.task ??= { act: 'rest', phase: 'go' }; d.decision = { layer: 'need', act: 'rest' }; d.reason = '隨便寫的文字'; assert.equal(statusOf(s, d).layer, '生理'); // v1.5：層級來自結構化 decision
  s.exp = { team: [d.id], phase: 'out', dist: 30, target: 300, style: 'clear', reason: null }; d.away = true; assert.equal(statusOf(s, d).layer, '巡山');
});
test('v1.45 存讀檔保留 ret 與 alert', () => { const s = mk(); s.alert = { msg: 'x', who: null, t: 0 }; const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.alert.msg, 'x'); });
