// LP-11（#238）手動掌法清鼠：局部模型反例。用法（在 experiments/water-carry 下）：node --test checks/palm.test.mjs
// 只用公開的 step()／dispatch()／setPalm()／view() 與既有 app 同一份路長。少數幾何邊界反例（精確 28、≤50 察覺、目標先失效）
// 才直接改 state 的鼠／位置，並在名稱標明；瀏覽器真操作不注入。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, RULES, STEP_MS } from '../demo/model.mjs';
import { createRoutes } from '../demo/routes.mjs';
import { HOME, RATS, ZONE, EXIT, PALM, SKILLS, inZone, nearest, dist } from '../demo/palm.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: scene.path.length, herb: r1(geo.routes.herb.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength) };
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(1800)) => { for (let i = 0; i < limit; i++) { if (pred(m.view(), m.state)) return m.view(); m.step(); } throw new Error('沒有等到條件'); };
const game = () => createModel(LENGTHS);
const P = (m, id) => m.state.people[id];
const logOf = (m, kind, extra = () => true) => m.state.log.filter((e) => e.kind === kind && extra(e));
const frozen = (m) => JSON.stringify({ ...m.state, log: m.state.log.length });
const reject = (m, cmd, id, re) => {
  const before = frozen(m), r = m.dispatch(cmd, id);
  assert.equal(r.ok, false, `${cmd} 應被拒絕`);
  if (re) assert.match(r.reason, re);
  assert.equal(frozen(m), before, '拒絕不改任何狀態');
  return r;
};
const home = (p) => p.pos.x === HOME[0] && p.pos.y === HOME[1];
// 清理者每 tick 位移上限：當段鎖定的空手速度（不瞬移）。
function traceMax(m, id, until) {
  let max = 0, prev = { ...P(m, id).pos };
  for (let i = 0; i < ticks(600); i++) {
    if (until(m.view(), m.state)) return max;
    m.step();
    const p = P(m, id).pos;
    max = Math.max(max, Math.hypot(p.x - prev.x, p.y - prev.y)); prev = { ...p };
  }
  throw new Error('沒有等到條件');
}

// ---------- 0. 幾何（純函式） ----------
test('幾何：三鼠在有限區內、邊界算區內、出口終點在區外；最近有效者距離打平取小 ID', () => {
  for (const r of RATS) assert.ok(inZone(r.x, r.y), `鼠${r.id}在區內`);
  assert.ok(inZone(...ZONE[0]) && inZone((ZONE[0][0] + ZONE[1][0]) / 2, (ZONE[0][1] + ZONE[1][1]) / 2), '頂點與邊上算區內');
  assert.ok(!inZone(...EXIT.at(-1)), '出口終點在區外');
  assert.ok(!inZone(...HOME), '院中端點在區外（通道可在區外，不能因此拒絕出發）');
  const tie = [{ id: 2, x: 10, y: 0, mode: 'sniff' }, { id: 1, x: -10, y: 0, mode: 'sniff' }].map((r) => ({ ...r, x: r.x + 800, y: r.y + 480 }));
  assert.equal(nearest(tie, { x: 800, y: 480 }).id, 1, '距離打平用穩定 ID');
  assert.equal(nearest([{ ...tie[1], mode: 'down' }, tie[0]], { x: 800, y: 480 }).id, 2, 'down 不可選');
});

// ---------- 1. 人工任務與生活 ----------
test('自然新局：主角搬運中下令→只等原趟完整交付一次→院中出發；名額從等待到真返院；另一人照常；無 XP／趟次／物資', () => {
  const m = game();
  assert.deepEqual(m.view().rats.map((r) => r.mode), ['sniff', 'sniff', 'sniff']);
  assert.equal(P(m, 'hero').palm, 'novice'); assert.equal(P(m, 'cousin').palm, 'novice');
  m.step();
  assert.equal(P(m, 'hero').motion.mode, 'carry');
  const r = m.dispatch('clean', 'hero');
  assert.equal(r.ok, true); assert.equal(r.pending, true);
  assert.equal(m.state.clean.by, 'hero'); assert.equal(m.state.clean.phase, 'wait');
  reject(m, 'clean', 'hero', /重送不重新出發/);
  reject(m, 'clean', 'cousin', /主角已在清理/);
  const trips0 = P(m, 'hero').trips;
  run(m, (v) => v.people.hero.mode === 'toRat');
  assert.equal(P(m, 'hero').trips, trips0 + 1, '原趟交付一次');
  assert.equal(logOf(m, 'trip', (e) => e.person === 'hero').length, trips0 + 1);
  assert.ok(home(P(m, 'hero')) || dist(P(m, 'hero').pos, { x: HOME[0], y: HOME[1] }) < 3, '從院中端點出發');
  const hero0 = { ...P(m, 'hero') }, vat0 = m.state.vat, herbs0 = m.state.herbs, cousinTrips = P(m, 'cousin').trips;
  run(m, (v, s) => !s.clean);
  const h = P(m, 'hero');
  assert.ok(home(h), '真返院才釋放');
  assert.equal(h.trips, hero0.trips); assert.equal(h.xp, hero0.xp); assert.equal(h.level, hero0.level);
  assert.ok(m.state.vat <= vat0 + 1 && m.state.herbs === herbs0, '清理不給物資（水缸只會因熟手交付／用水變動）');
  assert.ok(P(m, 'cousin').trips >= cousinTrips, '熟手照常生活');
  assert.equal(logOf(m, 'palm:hit').length, 2, '自然流程：鼠1、鼠2各一掌擊倒');
  assert.deepEqual(m.view().rats.map((r) => r.mode), ['down', 'down', 'gone'], '警覺鼠目擊同伴受掌後逃出界');
  assert.equal(logOf(m, 'clean:clear').length, 1, '無有效目標結束');
  run(m, (v) => v.people.hero.mode === 'carry', ticks(60));
  assert.equal(m.state.clean, null, '不自動重接清理');
});

test('低精力：交付後 ≤30 先坐下恢復到 80，回院中才出發；停工／待停工拒絕', () => {
  const m = game();
  run(m, (v) => v.people.hero.mode === 'carry' && v.people.hero.energy < 31 && v.people.hero.phase.name === 'pour', ticks(3600));
  assert.equal(m.dispatch('clean', 'hero').ok, true);
  run(m, (v) => v.people.hero.mode === 'seated');
  assert.equal(m.state.clean.phase, 'wait', '恢復中仍只占等待名額');
  run(m, (v) => v.people.hero.mode === 'toRat');
  assert.ok(P(m, 'hero').energy >= RULES.energy.backAt, '恢復到 80 才出發');
  assert.ok(logOf(m, 'back', (e) => e.person === 'hero').length >= 1, '真走回院中');
  const m2 = game();
  m2.step();
  m2.dispatch('restAfterTrip', 'cousin');
  reject(m2, 'clean', 'cousin', /已排定本趟後停工/);
  run(m2, (v) => v.people.cousin.resting);
  reject(m2, 'clean', 'cousin', /已停工/);
});

test('互斥：清理（含返院）時同人不能派整理／驅離、同伴不能再開清理；自主護院不搶正式清理；持有整理者不能清理', () => {
  const m = game();
  m.setAuto('hero', { allow: true, react: 'early' });
  run(m, (v) => v.boar.mode === 'out', ticks(120));
  assert.equal(m.dispatch('clean', 'hero').ok, true);
  let wanted = false, checked = false;
  run(m, (v, s) => {
    if (s.people.hero.want != null || s.people.hero.guardOrder != null) wanted = true;
    if (!checked && s.clean && s.clean.phase === 'back') {
      checked = true;
      const fix = m.actions('hero').find((a) => a.id === 'fix'), c2 = m.actions('cousin').find((a) => a.id === 'clean');
      assert.equal(fix.enabled, false); assert.match(fix.reason, /清理測試鼠（含返院）/);
      assert.equal(c2.enabled, false); assert.match(c2.reason, /主角已在清理/);
    }
    return !s.clean;
  }, ticks(300));
  assert.ok(checked, '返院途中檢查過互斥');
  assert.equal(wanted, false, '清理名額期間主角不起自主護院意願／出發（野豬照來）');
  assert.ok(m.state.boar.visit >= 1);
  // 反向：熟手持有整理（自然損痕、野豬退到看不見後），同時拒絕清理。
  const n = game();
  run(n, (v) => v.boar.marks > 0 && v.boar.mode === 'flee' && !v.boar.seen, ticks(600));
  assert.equal(n.dispatch('fix', 'cousin').ok, true);
  reject(n, 'clean', 'cousin', /正在整理護欄/);
  assert.equal(n.dispatch('clean', 'hero').ok, true, '另一人可清理');
});

// ---------- 2. 掌法與成本 ----------
function strikeTimes(skill) {
  const m = game();
  m.setPalm('hero', skill);
  m.step();
  m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'windup');
  const e0 = P(m, 'hero').energy, t0 = m.state.tick;
  run(m, (v) => v.people.hero.mode === 'recover');
  const t1 = m.state.tick;
  run(m, (v) => v.people.hero.mode !== 'recover');
  return { m, windup: t1 - t0, recover: m.state.tick - t1, spent: e0 };
}
test('兩 fixture 同位置／同腳力：初學起手 48／收勢 36，熟練 24／18；起手開始扣 2 一次，走路不扣', () => {
  const a = strikeTimes('novice'), b = strikeTimes('adept');
  assert.equal(a.windup, SKILLS.novice.windup); assert.equal(a.recover, SKILLS.novice.recover);
  assert.equal(b.windup, SKILLS.adept.windup); assert.equal(b.recover, SKILLS.adept.recover);
  assert.deepEqual([48, 36, 24, 18], [a.windup, a.recover, b.windup, b.recover]);
  // 起手 tick 才扣：windup 那 tick 前後精力差剛好 2；整個任務花費 = 2 × 起手次數
  const m = game();
  m.step();
  m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'toRat');
  const before = P(m, 'hero').energy;
  run(m, (v) => v.people.hero.mode === 'windup');
  assert.equal(before - P(m, 'hero').energy, PALM.cost, '走路不扣、起手扣 2');
  run(m, (v, s) => !s.clean);
  assert.equal(P(m, 'hero').cleanResult.spent, PALM.cost * logOf(m, 'palm:windup').length);
});

test('比較 fixture：任務存在（含等待與返院）時拒絕更換、無副作用；無任務才可改，且不是人工工作覆寫', () => {
  const m = game();
  m.step();
  m.dispatch('clean', 'hero');
  const before = frozen(m), r = m.setPalm('cousin', 'adept');
  assert.equal(r.ok, false); assert.equal(frozen(m), before);
  run(m, (v, s) => !s.clean);
  const sup = P(m, 'hero').suppress;
  assert.equal(m.setPalm('hero', 'adept').ok, true);
  assert.equal(P(m, 'hero').suppress, sup, '換 fixture 不寫 LP07 抑制');
  assert.equal(m.setPalm('hero', 'nope').ok, false);
});

test('精確 28（改 state 的邊界反例）：接觸 tick 以最新位置重驗，28 擊倒、28.01 不中；已花不退、不隔空補中', () => {
  for (const [gap, hit] of [[28, true], [28.01, false]]) {
    const m = game();
    m.step();
    m.dispatch('clean', 'hero');
    run(m, (v) => v.people.hero.mode === 'windup');
    const p = P(m, 'hero'), t = m.state.rats.find((r) => r.id === p.motion.target);
    t.x = p.pos.x - gap; t.y = p.pos.y; // 只移目標鼠；仍在區內
    assert.ok(inZone(t.x, t.y));
    const e = p.energy;
    run(m, (v) => v.people.hero.mode !== 'windup');
    assert.equal(t.mode === 'down', hit, `距離 ${gap}`);
    assert.equal(logOf(m, hit ? 'palm:hit' : 'palm:miss').length, 1);
    assert.equal(P(m, 'hero').energy, e, '接觸／失誤都不再扣也不退');
  }
});

// ---------- 3. 三鼠與感知 ----------
test('目擊：只在鼠2真接觸那 tick 之後才逃；當 tick 不移動，下一 tick 起 120／秒；出界失效不追、不補滿、新局重設', () => {
  const m = game();
  m.step();
  m.dispatch('clean', 'hero');
  run(m, (v) => v.rats[1].mode === 'down');
  const hitTick = logOf(m, 'palm:hit', (e) => e.target === 2)[0].tick, r3 = m.state.rats[2];
  assert.equal(logOf(m, 'rat:flee')[0].tick, hitTick, '同 tick 接觸之後才觸發');
  assert.deepEqual([r3.x, r3.y], [RATS[2].x, RATS[2].y], '觸發當 tick 不先移動');
  assert.ok(dist(r3, m.state.rats[1]) <= PALM.witness);
  const x0 = { x: r3.x, y: r3.y };
  m.step();
  assert.ok(Math.abs(dist(r3, x0) - PALM.flee / 60) < 1e-9, '每 tick 2 單位');
  run(m, (v) => v.rats[2].mode === 'gone');
  assert.equal(inZone(r3.x, r3.y), false);
  assert.equal(m.state.clean.target === 3, false, '出界不追');
  run(m, (v, s) => !s.clean);
  assert.equal(m.state.rats.length, 3); assert.deepEqual(m.view().rats.map((r) => r.mode), ['down', 'down', 'gone']);
  for (let i = 0; i < ticks(120); i++) m.step();
  assert.deepEqual(m.view().rats.map((r) => r.mode), ['down', 'down', 'gone'], '不補滿、不復甦');
  assert.deepEqual(game().view().rats.map((r) => r.mode), ['sniff', 'sniff', 'sniff'], '只有新局重設');
});

test('察覺 ≤50（改 state：先讓鼠1、2擊倒）：清理者逼近到 ≤50 那 tick 警覺鼠才逃；逃出後無目標真返院', () => {
  const m = game();
  m.state.rats[0].mode = 'down'; m.state.rats[1].mode = 'down';
  m.step();
  m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'toRat');
  let prevD = Infinity;
  run(m, (v, s) => { const d = dist(s.rats[2], s.people.hero.pos); if (s.rats[2].mode === 'flee') return true; prevD = d; return false; });
  const d = dist(m.state.rats[2], P(m, 'hero').pos);
  assert.ok(prevD > PALM.see && d <= PALM.see + 1e-9, `觸發前 ${prevD.toFixed(2)} > 50，觸發時 ${d.toFixed(2)} ≤ 50`);
  assert.equal(logOf(m, 'palm:hit').length, 0);
  run(m, (v, s) => !s.clean);
  assert.equal(P(m, 'hero').cleanResult.kind, 'clear');
  assert.ok(home(P(m, 'hero')));
  assert.ok(m.actions('hero').find((a) => a.id === 'clean').reason.match(/沒有有效/), '沒有有效鼠就拒絕發起');
});

test('普通鼠原位嗅地；人物每 tick 位移不超過當段空手速度（不瞬移），返院走節點', () => {
  const m = game();
  m.step();
  m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'toRat');
  const max = traceMax(m, 'hero', (v, s) => !s.clean);
  assert.ok(max <= 84 / 60 + 1e-9, `每 tick 最大位移 ${max.toFixed(3)}`);
  assert.deepEqual(m.state.rats.slice(0, 2).map((r) => [r.x, r.y]), [[868, 528], [790, 490]]);
});

// ---------- 4. 取消與返回 ----------
test('取消：等待中立即釋放、原趟照舊；前往中走完當前短段才返院；返院重按拒絕；回院才釋放且不自動重接', () => {
  const m = game();
  m.step();
  m.dispatch('clean', 'hero');
  const r = m.dispatch('cleanCancel', 'hero');
  assert.equal(r.ok, true); assert.equal(m.state.clean, null);
  assert.equal(P(m, 'hero').motion.mode, 'carry');
  reject(m, 'cleanCancel', 'hero', /沒有清理任務/);
  m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'toRat' && v.people.hero.cleanLeg.steps === 3 && v.people.hero.cleanLeg.need > 6);
  const to = { ...P(m, 'hero').motion.to };
  m.dispatch('cleanCancel', 'hero');
  assert.equal(m.state.clean.phase, 'back');
  reject(m, 'cleanCancel', 'hero', /已在返院/);
  run(m, (v) => v.people.hero.mode === 'fromRat');
  assert.deepEqual(P(m, 'hero').motion.from, to, '走完當前段才從那裡返院');
  assert.ok(m.state.clean, '返院途中仍占名額');
  reject(m, 'clean', 'cousin', /主角已在清理/);
  run(m, (v, s) => !s.clean);
  assert.ok(home(P(m, 'hero')));
  for (let i = 0; i < 120; i++) m.step();
  assert.equal(m.state.clean, null);
});

test('取消：起手中收手已花不退無結果；收勢中（已接觸）保留一次擊倒；兩者都立刻真返院', () => {
  const a = game();
  a.step(); a.dispatch('clean', 'hero');
  run(a, (v) => v.people.hero.mode === 'windup' && v.people.hero.palmStep.steps === 10);
  const e = P(a, 'hero').energy;
  a.dispatch('cleanCancel', 'hero');
  assert.equal(P(a, 'hero').motion.mode, 'fromRat');
  run(a, (v, s) => !s.clean);
  assert.equal(P(a, 'hero').energy >= e, true); assert.equal(logOf(a, 'palm:hit').length, 0);
  assert.equal(P(a, 'hero').cleanResult.spent, PALM.cost, '已花 2 不退');
  const b = game();
  b.step(); b.dispatch('clean', 'hero');
  run(b, (v) => v.people.hero.mode === 'recover');
  b.dispatch('cleanCancel', 'hero');
  run(b, (v, s) => !s.clean);
  assert.equal(b.state.rats[0].mode, 'down'); assert.equal(logOf(b, 'palm:hit').length, 1);
  assert.equal(b.state.rats[1].mode, 'sniff');
});

test('有效改工／停工取消清理：改採藥回院後做採藥；停工回院後去座位；LP07／LP09 覆寫照人工指令記錄', () => {
  const m = game();
  m.step(); m.dispatch('clean', 'hero');
  run(m, (v) => v.people.hero.mode === 'toRat');
  assert.equal(m.dispatch('work:herb', 'hero').ok, true);
  assert.equal(m.state.clean.phase, 'back');
  run(m, (v, s) => !s.clean);
  run(m, (v) => v.people.hero.mode === 'carry', 60);
  assert.equal(P(m, 'hero').motion.job, 'herb');
  const n = game();
  n.step(); n.dispatch('clean', 'hero');
  run(n, (v) => v.people.hero.mode === 'windup');
  n.dispatch('restAfterTrip', 'hero');
  run(n, (v) => v.people.hero.mode === 'seated');
  assert.equal(P(n, 'hero').rest, 'manual'); assert.equal(n.state.clean, null);
  assert.equal(P(n, 'hero').upSuppress, n.state.contact, 'LP09 機會抑制照人工指令');
});

// ---------- 5. 單時間 ----------
test('暫停下令只寫零進度意圖與名額；1×／4× 分幀步數相同則世界相同', () => {
  const m = game();
  for (let i = 0; i < 400; i++) m.step();
  const tick = m.state.tick, e = P(m, 'hero').energy, rats = JSON.stringify(m.state.rats);
  m.dispatch('clean', 'hero');
  assert.equal(m.state.tick, tick); assert.equal(P(m, 'hero').energy, e); assert.equal(JSON.stringify(m.state.rats), rats);
  const a = game(), b = game(), ca = createClock(), cb = createClock();
  let na = 0, nb = 0;
  for (const g of [a, b]) { g.step(); g.dispatch('clean', 'hero'); }
  for (let f = 0; f < 4000; f++) { const n = ca.feed(STEP_MS, 1); for (let i = 0; i < n; i++) a.step(); na += n; }
  for (let f = 0; f < 1000; f++) { const n = cb.feed(STEP_MS * 1.000001, 4); for (let i = 0; i < n; i++) b.step(); nb += n; }
  while (nb < na) { b.step(); nb++; } while (na < nb) { a.step(); na++; }
  assert.equal(JSON.stringify(a.state), JSON.stringify(b.state));
});

test('LP05 叫回來源保留：休閒中叫回後派清理→離開休閒、清理完返院仍是叫回，清理不算解除叫回的那一趟', () => {
  const m = game();
  run(m, (v) => v.people.hero.mode === 'fun', ticks(1800));
  assert.equal(m.dispatch('recall', 'hero').ok, true);
  assert.equal(m.dispatch('clean', 'hero').ok, true);
  run(m, (v) => v.people.hero.mode === 'toRat');
  assert.equal(P(m, 'hero').recall, true);
  run(m, (v, s) => !s.clean);
  assert.equal(P(m, 'hero').recall, true, '清理不清叫回');
  assert.equal(logOf(m, 'recallDone').length, 0);
});
