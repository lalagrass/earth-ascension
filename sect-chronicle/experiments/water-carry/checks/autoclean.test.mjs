// LP-12（#241）自主清鼠與玩家覆寫：六組 DoD 驗收測試。
// 用法（在 experiments/water-carry 下）：node --test checks/autoclean.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, createClock, RULES, STEP_MS, speedsFor } from '../demo/model.mjs';
import { createRoutes } from '../demo/routes.mjs';
import { HOME, RATS, ZONE, EXIT, PALM, SKILLS, inZone, nearest, dist } from '../demo/palm.mjs';

const scene = JSON.parse(readFileSync(new URL('../spikes/shared/scene.json', import.meta.url)));
const geo = createRoutes(scene.path.points);
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = {
  water: scene.path.length,
  herb: r1(geo.routes.herb.length),
  seat: geo.seatLengths,
  fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD },
  guard: r1(geo.guardLength),
};
const ticks = (s) => Math.round(s * 60);
const run = (m, pred, limit = ticks(1800)) => {
  for (let i = 0; i < limit; i++) {
    if (pred(m.view(), m.state)) return m.view();
    m.step();
  }
  throw new Error('沒有等到條件');
};
const game = () => createModel(LENGTHS, undefined, undefined, undefined, { placeOf: geo.of });
const where = (m, id) => { const p = m.view().people[id]; return p.cleaning ? p.pos : geo.of(id, p); };
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

// ==========================================
// 1. 候補意願（L1）
// ==========================================
test('L1 候補：兩人預設關閉；有效鼠才有意願，忙碌／恢復中只候補不預占名額、不鎖 ID、不扣精力；無有效鼠撤意願', () => {
  const m = game();
  const v0 = m.view();
  assert.equal(v0.people.hero.autoClean.allow, false);
  assert.equal(v0.people.cousin.autoClean.allow, false);
  assert.equal(v0.people.hero.autoClean.wanting, false);
  assert.equal(v0.people.hero.autoClean.state, 'off');
  assert.equal(m.state.clean, null);

  // 主角出發挑水中
  m.step();
  assert.equal(m.view().people.hero.mode, 'carry');

  // 工作中允許自主清鼠
  m.setAutoClean('hero', { allow: true });
  assert.equal(m.view().people.hero.autoClean.allow, true);
  m.step();
  const v1 = m.view();
  // 有效鼠存在且正在 carry，形成候補意願，但不占名額、不扣精力
  assert.equal(v1.people.hero.autoClean.wanting, true);
  assert.equal(v1.people.hero.autoClean.state, 'wait');
  assert.equal(m.state.clean, null, '候補不占全場名額');
  assert.ok(m.state.people.hero.energy > 99, '候補不扣掌法 2 精力');

  // 模擬三隻鼠全部失效（down / gone），候補意願自動撤銷
  for (const r of m.state.rats) r.mode = 'down';
  m.step();
  const v2 = m.view();
  assert.equal(v2.people.hero.autoClean.wanting, false, '無有效鼠自動撤銷意願');
  assert.equal(v2.people.hero.autoClean.state, 'none');
  assert.equal(m.state.clean, null);
});

test('L1 候補：同伴正在清理（含返院）時，另一人候補不搶名額，理由顯示等待同伴', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  m.setAutoClean('cousin', { allow: true });
  // 主角手動派去清理
  m.dispatch('clean', 'hero');
  m.step();
  const v = m.view();
  assert.equal(v.people.hero.cleaning, true);
  // 熟手允許自主清鼠，但主角正在清理，熟手狀態顯示同伴處理，不搶名額
  assert.equal(v.people.cousin.autoClean.state, 'peer');
  assert.match(v.people.cousin.autoClean.text, /主角已在清理/);
});

// ==========================================
// 2. 受理與優先序（L2）
// ==========================================
test('L2 受理：原趟交付完成後在院中端點合法才正式受理；自動出發占名額到真返院', () => {
  const m = game();
  m.step();
  assert.equal(m.view().people.hero.mode, 'carry');
  m.setAutoClean('hero', { allow: true });
  // 等到主角交付完成並在院中端點被受理
  run(m, (v) => v.clean && v.clean.by === 'hero');
  const vClean = m.view();
  assert.equal(vClean.clean.src, 'auto', '標明 auto 來源');
  assert.equal(vClean.people.hero.autoClean.state, 'go', '狀態為自己出發清理');
  assert.equal(vClean.people.hero.mode, 'toRat');
  assert.equal(vClean.people.hero.job, 'water', '原工作挑水保留');

  // 一路走到擊倒並真返院
  run(m, (v) => v.clean === null);
  const vHome = m.view();
  assert.equal(vHome.people.hero.mode, 'carry', '真返院後接續原工作挑水');
  assert.equal(vHome.clean, null, '真返院後釋放名額');
  assert.ok(vHome.people.hero.cleanResult.downs >= 1, '保留擊倒結果');
});

test('L2 受理：滿庫休閒中允許自主清鼠，沿 fromFun 返院後在院中端點重新查驗並正式受理', () => {
  const m = game();
  m.dispatch('work:herb', 'hero');
  m.dispatch('work:herb', 'cousin');
  // 推進直到藥架滿庫（8/8）且主角進入休閒（fun）
  run(m, (v, s) => s.herbs === 8 && s.people.hero.motion.mode === 'fun', ticks(600));
  assert.equal(m.state.people.hero.motion.mode, 'fun', '主角在休閒觀景石');
  assert.equal(m.state.clean, null);

  // 在休閒中開啟自主清鼠
  m.setAutoClean('hero', { allow: true });
  m.step();
  assert.equal(m.state.people.hero.cleanWant, true, 'step 結算意願成立');
  m.step();
  assert.equal(m.state.people.hero.motion.mode, 'fromFun', '休閒中有清鼠意願立即沿 fromFun 返院');
  assert.equal(m.state.clean, null, '返院途中不提早占名額');

  // 等待真返院並在院中端點合法正式受理
  run(m, (v, s) => s.clean && s.clean.by === 'hero', ticks(30));
  assert.equal(m.state.clean.src, 'auto', '由院中端點正式受理，來源為 auto');
  assert.equal(m.state.people.hero.motion.mode, 'toRat', '出發前往弱鼠');

  // 等待清理完成並真返院
  run(m, (v, s) => s.clean === null, ticks(60));
  assert.ok(m.state.people.hero.cleanResult.downs >= 1, '保留擊倒成果');
});

test('L2 優先序：停工、LP05 叫回、必要恢復優先於自主清鼠', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  // 玩家下令停工休息時，抑制自主清鼠，不自己出發
  m.dispatch('restAfterTrip', 'hero');
  m.step();
  assert.equal(m.view().people.hero.autoClean.state, 'player');
  assert.equal(m.view().people.hero.autoClean.wanting, false);

  // 停工狀態下重新確認允許：由於已停工，理由為 held
  m.setAutoClean('hero', { allow: true });
  assert.equal(m.view().people.hero.autoClean.state, 'held');
  assert.equal(m.view().people.hero.autoClean.wanting, false);

  const m2 = game();
  m2.setAutoClean('hero', { allow: true });
  // 消耗主角精力到 <= 30
  m2.state.people.hero.energy = 25;
  m2.step();
  assert.equal(m2.view().people.hero.resting, false);
  // 等主角去座位恢復
  run(m2, (v) => v.people.hero.mode === 'seated');
  // 恢復中不自主出發清鼠
  assert.equal(m2.state.clean, null);
  assert.equal(m2.view().people.hero.autoClean.state, 'wait');
  assert.match(m2.view().people.hero.autoClean.text, /先恢復到/);
  // 回復到 80 回院後才正式受理
  run(m2, (v) => v.clean && v.clean.by === 'hero');
  assert.ok(m2.view().people.hero.energy >= 78);
});

test('L2 優先序：自主護院 > 自主整理 > 自主清鼠 > 一般工作出發', () => {
  const m = game();
  // 兩人開啟全部自主
  m.setAuto('hero', { allow: true, react: 'early' });
  m.setUpkeep('hero', { allow: true, react: 'early' });
  m.setAutoClean('hero', { allow: true });

  // 同時給予野豬來訪（可見）、護欄損痕、老鼠
  m.state.boar.active = true;
  m.state.boar.mode = 'sniff';
  m.state.boar.marks = 2;
  m.state.contact = 1;

  // 主角在院中 idle
  m.state.people.hero.motion = { mode: 'idle', job: 'water', phase: null, steps: 0, need: null, tripLevel: 1 };
  m.step();

  // 驗證護院先於整理與清鼠
  assert.equal(m.state.people.hero.guardOrder, m.state.boar.visit, '護院最優先受理');
  assert.equal(m.state.clean, null);
});

test('L2 同 tick 多人準備好：依 AUTO_ORDER 只受理一位，不雙扣名額不改同伴工作', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  m.setAutoClean('cousin', { allow: true });

  // 兩人都在院中 idle
  m.state.people.hero.motion = { mode: 'idle', job: 'water', phase: null, steps: 0, need: null, tripLevel: 1 };
  m.state.people.cousin.motion = { mode: 'idle', job: 'water', phase: null, steps: 0, need: null, tripLevel: 3 };
  m.step();

  // hero 在 AUTO_ORDER 首位，由 hero 受理
  assert.equal(m.state.clean.by, 'hero', '依 AUTO_ORDER 只受理主角');
  assert.equal(m.state.clean.src, 'auto');
  // cousin 不受理，狀態顯示 peer，原工作挑水不受影響
  assert.equal(m.view().people.cousin.autoClean.state, 'peer');
  assert.equal(m.state.people.cousin.job, 'water');
});

// ==========================================
// 3. 人工覆寫與來源（L3）
// ==========================================
test('L3 人工覆寫：改工作、停工、取消清理等有效改令抑制自主清鼠，不因下一趟完成而解開', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  // 等主角自主出發清理
  run(m, (v) => v.clean && v.clean.by === 'hero');
  assert.equal(m.view().clean.src, 'auto');

  // 玩家改令：改去採藥
  m.dispatch('work:herb', 'hero');
  assert.equal(m.view().people.hero.autoClean.suppressed, true);
  assert.equal(m.view().people.hero.autoClean.state, 'player');

  // 主角中止清理返院，改去採藥
  run(m, (v) => v.people.hero.mode === 'carry' && v.people.hero.job === 'herb');
  // 完成一趟採藥後，抑制仍未解開
  run(m, (v) => v.people.hero.done.herb >= 1);
  assert.equal(m.view().people.hero.autoClean.suppressed, true, '交付完成一趟後不偷解除抑制');
  assert.equal(m.view().people.hero.autoClean.state, 'player');

  // 明確重新允許：解除抑制
  m.setAutoClean('hero', { allow: true });
  assert.equal(m.view().people.hero.autoClean.suppressed, false, '重新允許解除抑制');
  m.step();
  assert.equal(m.view().people.hero.autoClean.wanting, true);
});

test('L3 拒絕的指令無副作用，不抑制自主清鼠', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  // 主角本來就在持續挑水中，重複下同一挑水指令被拒絕
  reject(m, 'work:water', 'hero', /已在持續/);
  assert.equal(m.view().people.hero.autoClean.suppressed, false, '被拒絕的指令不產生抑制');
});

test('L3 關閉允許只取消 auto 來源、保留 manual 來源；關某人不取消另一人', () => {
  const m = game();
  // 手動派遣主角清理
  m.dispatch('clean', 'hero');
  m.step();
  assert.equal(m.view().clean.src, 'manual');

  // 關閉主角的自主清鼠開關
  m.setAutoClean('hero', { allow: false });
  // 手動派遣的任務保留，不被取消！
  assert.equal(m.view().clean.src, 'manual', '關閉自主不取消手動派遣');
  assert.equal(m.view().people.hero.cleaning, true);

  // 另一人 cousin 不受影響
  m.setAutoClean('cousin', { allow: true });
  assert.equal(m.view().people.cousin.autoClean.allow, true);
});

test('L3 resume 只解 LP05 叫回，不解自主清鼠抑制、不解停工', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  // 玩家改令產生抑制
  m.dispatch('work:herb', 'hero');
  assert.equal(m.view().people.hero.autoClean.suppressed, true);

  // 模擬叫回
  m.state.people.hero.recall = true;
  m.dispatch('resume', 'hero');
  assert.equal(m.state.people.hero.recall, false, '叫回解除');
  assert.equal(m.view().people.hero.autoClean.suppressed, true, 'resume 不解除清鼠抑制');
});

// ==========================================
// 4. 行動相容與邊界（L4 & LP11 相容）
// ==========================================
test('L4 邊界不瞬移：自主清理受理出發時，每 tick 位移不超過空手上限', () => {
  const m = game();
  m.setAutoClean('hero', { allow: true });
  run(m, (v) => v.people.hero.mode === 'carry' && v.people.hero.phase.name === 'pour', ticks(3600));

  let maxOver = 0, prev = where(m, 'hero'), started = null;
  for (let i = 0; i < ticks(600); i++) {
    m.step();
    const now = where(m, 'hero');
    const d = Math.hypot(now.x - prev.x, now.y - prev.y);
    const cap = speedsFor(m.view().people.hero.level).empty / 60;
    if (d - cap > maxOver) maxOver = d - cap;
    prev = now;
    const h = m.state.people.hero.motion;
    if (h.mode === 'toRat' && started == null) started = m.state.tick;
    if (started != null && m.state.tick - started > 5) break;
  }
  assert.ok(maxOver <= 1e-9, `自主受理出發每 tick 位移不超空手上限，超出量: ${maxOver}`);
});

// ==========================================
// 5. 時間、重設與理由（L4）
// ==========================================
test('L5 暫停改設定零進度，新局重設清允許／候補／抑制', () => {
  const m = game();
  const tick0 = m.state.tick;
  // 暫停改設定不前進世界
  m.setAutoClean('hero', { allow: true });
  assert.equal(m.state.tick, tick0);
  assert.equal(m.state.people.hero.cleanAllow, true);

  // 重新建立模型（新局）
  const m2 = game();
  assert.equal(m2.view().people.hero.autoClean.allow, false);
  assert.equal(m2.view().people.hero.autoClean.wanting, false);
  assert.equal(m2.view().people.hero.autoClean.suppressed, false);
  assert.equal(m2.state.clean, null);
  assert.equal(m2.state.rats.length, 3);
});
