// 效用 AI：列出所有可做的事、打分、留下理由。只讀 state，不改。
import { FIRE, FARM, ACTS, FORCE, MEAL_TARGET, COOK_RAW, FOCUS, FOCUS_BONUS, DUTY, POST, STOCK_TARGET, PILE, WORK_KINDS, MARTIAL, DEFENSE, SECT } from './data.mjs';
import { activeEnemies } from './raid.mjs';
import { walkable } from './map.mjs';
import { nearestResources, remaining, stocked, workSpot, siteWorkersFree } from './build.mjs';
import { extraTake } from './skills.mjs';
import { aff, prestige } from './social.mjs';
import { drillMove, moveLabel, courage } from './martial.mjs';
import { reachable } from './build.mjs';
import { nextRand } from './rng.mjs';
import { urgency, isNight } from './needs.mjs';
import { dutyOf, pressure, reliability, ROLE_OF_KIND } from './duty.mjs';

const SLEEPS = new Set(['sleep', 'sleepGround']);
// loop 6：練功占去空檔後，指定伐木者在練功時需求冒出來，活被別人搶走（全隊砍樹時間中他的占比由 0.63 掉到 0.53）。
const DEFER = 0.6;
const LEISURE = new Set(['drill', 'spar', 'chat', 'sit', 'wander', 'idle']);
const FOCUS_KINDS = Object.fromEntries(FOCUS.filter((f) => f.id).map((f) => [f.id, new Set(f.kinds)]));
const EATS = new Set(['eat', 'eatRaw', 'eatCarried', 'forage']);
// 夜裡跟活計一樣壓低：練功、切磋。
const NIGHT_LOW = new Set([...WORK_KINDS, 'drill', 'spar'].filter((k) => k !== 'deliver' && k !== 'store'));
export const REFUSE_COOLDOWN = 240;

export function freeSlot(obj) {
  for (let i = 0; i < obj.slots.length; i++) if (!obj.users[i]) return i;
  return -1;
}

function spotOf(obj, i) {
  return { x: obj.slots[i][0], y: obj.slots[i][1] };
}

// 聊天對象是否能被打斷：在閒逛或發呆的人才行。
export function interruptible(o) {
  if (o.act === 'idle') return true;
  return o.act === 'walk' && o.task && o.task.kind === 'wander';
}

function score(state, p, c, { need = 0, persona = 0, work = 0 }, duty = null) {
  const night = isNight(state.tick);
  let sched = 1;
  if (SLEEPS.has(c.kind)) sched = night ? 1.6 + 0.4 * Math.max(0, -p.axes.P) : p.needs.energy > 30 ? 0.5 : 1;
  else if (night) sched = NIGHT_LOW.has(c.kind) ? 0.15 : 0.6;
  const d = c.spot ? Math.hypot(c.spot.x - p.x, c.spot.y - p.y) : 0;
  const dist = 1 / (1 + d / 40);
  const noise = nextRand(state) * 0.15;
  const focus = p.focus && FOCUS_KINDS[p.focus].has(c.kind) && (work > 0 || c.martial) ? FOCUS_BONUS : 0;
  // M18 值日：本職加分（迫切 × 可靠）。
  const mine = !!duty && work > 0 && ROLE_OF_KIND[c.kind] === duty.role;
  const dutyAdd = mine ? duty.bonus : 0;
  // 有別人專門負責這一行（而且醒著）時，其他人先讓給他做：活計因子打折。值日的人做本職不讓。
  if (work > 0 && !mine && !(p.focus && FOCUS_KINDS[p.focus].has(c.kind)) && state.people.some((o) => o !== p && o.focus && FOCUS_KINDS[o.focus].has(c.kind) && !(o.act === 'do' && SLEEPS.has(o.task?.kind)))) work *= DEFER;
  c.f = { need, persona, work, focus, sched, dist, noise };
  if (dutyAdd) c.f.duty = dutyAdd;
  c.score = (need + persona + work + focus + dutyAdd) * sched * dist + noise;
  c.label ??= ACTS[c.kind].label;
  return c;
}

export function candidates(state, p, scorePois) {
  const u = Object.fromEntries(Object.entries(p.needs).map(([k, v]) => [k, urgency(v)]));
  const { E, N, F, P } = p.axes;
  const J = Math.max(0, -P);
  // 勤勉：條理型愛做事，隨性型較懶散。所有活計共用。
  const diligence = 0.3 * J - 0.15 * Math.max(0, P);
  const empty = p.carry === 0 && p.load.wood === 0 && p.load.stone === 0;
  const out = [];
  const role = p.guest ? null : dutyOf(state, p);
  const duty = role ? { role, bonus: DUTY.BONUS * pressure(state, role) * reliability(p) } : null;
  const add = (c, parts) => out.push(score(state, p, c, parts, duty));
  const stock = state.stock;

  for (const o of state.objects) {
    const i = freeSlot(o);
    if (i < 0) continue;
    const spot = spotOf(o, i);
    if (o.kind === 'bed') add({ kind: 'sleep', obj: o.id, slot: i, spot, label: `去${o.label}睡` }, { need: u.energy });
    if (o.kind === 'table' && stock.meal > 0) {
      const company = o.users.filter(Boolean).length;
      add({ kind: 'eat', obj: o.id, slot: i, spot }, { need: u.food * 2, persona: company ? u.social * 0.3 * (1 + 0.5 * E) : 0 });
    }
    if (o.kind === 'hearth') {
      if (stock.raw >= COOK_RAW && stock.wood >= FIRE.WOOD_PER_POT && stock.meal < MEAL_TARGET) {
        // 鍋裡沒飯而有人餓著時，煮飯就是急事。
        const demand = 1 - stock.meal / MEAL_TARGET;
        const hungry = state.people.filter((x) => x.needs.food < 40).length;
        const urgent = stock.meal === 0 ? 1 + 0.4 * hungry : 0;
        add({ kind: 'cook', obj: o.id, slot: i, spot }, { work: demand * 1.4 + urgent, persona: 0.3 * Math.max(0, F) * demand + diligence });
      }
    }
    if (o.kind === 'dummy' && p.needs.energy > MARTIAL.DRILL_MIN_ENERGY) {
      // 練功：定力高、有條理的人自己會去練；無聊時也想動一動。
      const move = drillMove(p);
      add({ kind: 'drill', obj: o.id, slot: i, spot, move, martial: true, label: `到${o.label}練${moveLabel(move)}` },
        { need: u.fun * MARTIAL.DRILL_FUN, persona: MARTIAL.DRILL_BASE + 0.08 * (p.attrs.ding - 5) + diligence + insight(p) + DEFENSE.THREAT_DRILL * Math.min(2, state.threat ?? 0) + (o.yard ? MARTIAL.YARD_PULL : 0) });
    }
    if (o.kind === 'bench') {
      add({ kind: 'sit', obj: o.id, slot: i, spot, label: `去${o.label}坐坐` },
        { need: u.fun * 0.8 * (1 - 0.4 * E) + u.energy * 0.1, persona: 0.2 * Math.max(0, -E) });
    }
  }
  // 送貨只是放下，不必占灶位，所以煮飯的人在用灶時也能送。
  if (p.carry > 0) {
    const h = state.objects.find((o) => o.kind === 'hearth');
    add({ kind: 'deliver', obj: h.id, slot: -1, spot: spotOf(h, 0), label: '把莓果送到灶邊' }, { work: 2.5 });
  }
  if (p.carry > 0) add({ kind: 'eatCarried' }, { need: u.food * 0.5 });

  const scarcity = Math.max(0, 1 - (stock.raw + stock.meal * 1.5) / 18);
  for (const b of state.bushes) {
    if (b.user || b.berries <= 0) continue;
    const spot = { x: b.sx, y: b.sy };
    if (p.needs.food < 60) add({ kind: 'eatRaw', bush: b.id, spot }, { need: u.food * 0.45 });
    if (empty) add({ kind: 'forage', bush: b.id, spot }, { need: u.food * 0.2, work: scarcity * 2, persona: 0.4 * J * scarcity + diligence * scarcity });
  }

  // ---------- M12 菜園 ----------
  if (empty) for (const g of state.plots) {
    if (g.user) continue;
    if (g.stage === 'empty') add({ kind: 'sow', plot: g.id, spot: { x: g.x, y: g.y }, label: '播種' }, { work: FARM.SOW_WORK, persona: diligence });
    if (g.stage === 'ripe') add({ kind: 'harvest', plot: g.id, spot: { x: g.x, y: g.y }, label: '收菜' }, { need: u.food * 0.2, work: FARM.HARVEST_WORK + scarcity, persona: diligence });
  }

  // ---------- M3 採集與營造 ----------
  const pile = { x: PILE.x, y: PILE.y };
  if (p.load.wood > 0 || p.load.stone > 0) add({ kind: 'store', spot: pile, label: '把木石扛回倉堆' }, { work: 2.5 });
  if (empty) {
    const strong = p.attrs.li >= 8 ? 1 : 0;
    for (const mat of ['wood', 'stone']) {
      const sitesWant = state.sites.reduce((a, s) => a + Math.max(0, remaining(s, mat)), 0);
      const inHand = state.people.reduce((a, x) => a + x.load[mat], 0);
      const want = Math.max(0, STOCK_TARGET[mat] + sitesWant - state.stock[mat] - inHand);
      if (want <= 0) continue;
      const demand = Math.min(1.5, want / 8);
      const kind = mat === 'wood' ? 'chop' : 'quarry';
      for (const r of nearestResources(state, mat, p, 3)) {
        add({ kind, res: `${r.x},${r.y}`, mat, rx: r.x, ry: r.y, spot: r.spot, take: 4 + strong + extraTake(p, kind) },
          { work: 0.6 + demand * 1.2, persona: diligence + 0.15 * ((p.attrs.li - 5) / 5) });
      }
    }
    for (const site of state.sites) {
      for (const mat of ['wood', 'stone']) {
        const n = Math.min(remaining(site, mat), state.stock[mat], 4 + strong);
        if (n <= 0) continue;
        add({ kind: 'haul', site: site.id, mat, n, spot: pile, label: `搬${mat === 'wood' ? '木' : '石'}到${site.label}` }, { work: 2.0, persona: diligence });
      }
      if (stocked(site) && siteWorkersFree(site)) {
        const spot = workSpot(state, site);
        if (spot) add({ kind: 'build', site: site.id, spot, label: `蓋${site.label}` }, { work: 2.2, persona: diligence });
      }
    }
  }

  if (p.needs.social < 90) {
    for (const o of state.people) {
      if (o === p || o.exp || o.act === 'do' || Math.hypot(o.x - p.x, o.y - p.y) > 18) continue;
      if ((p.refused[o.id] ?? -Infinity) > state.tick - REFUSE_COOLDOWN) continue;
      const like = aff(state, p, o);
      if (like < -10) continue;
      const admire = Math.max(0, prestige(o) - prestige(p)) / 100 * 1.5;
      add({ kind: 'chat', partner: o.id, spot: { x: Math.round(o.x), y: Math.round(o.y) }, label: `找${o.name}聊天` },
        { need: u.social * (1 + 0.5 * E), persona: 0.3 * E + 0.1 * F + like * 0.015 + admire });
    }
  }

  // M6 切磋：雙方都有力氣；好動外向的人愛找人過招。
  if (p.needs.energy > MARTIAL.SPAR_MIN_ENERGY) {
    for (const o of state.people) {
      if (o === p || o.exp || !sparInterruptible(o) || o.needs.energy <= MARTIAL.SPAR_MIN_ENERGY || Math.hypot(o.x - p.x, o.y - p.y) > 18) continue;
      if ((p.refused[o.id] ?? -Infinity) > state.tick - REFUSE_COOLDOWN) continue;
      // 以武會友：陌生人也能過招，但對他有成見（好感 < 0）就不找。
      const like = aff(state, p, o);
      if (like < MARTIAL.SPAR_MIN_AFF) continue;
      add({ kind: 'spar', partner: o.id, move: drillMove(p), martial: true, spot: { x: Math.round(o.x), y: Math.round(o.y) }, label: `找${o.name}切磋` },
        { need: u.fun * 0.5, persona: 0.2 + 0.15 * E + 0.05 * (p.attrs.li - 5) + like * 0.01 + DEFENSE.THREAT_DRILL * Math.min(2, state.threat ?? 0) });
    }
  }

  // ---------- M7 迎敵、躲、修柵欄 ----------
  const near = activeEnemies(state).filter((e) => Math.hypot(e.x - p.x, e.y - p.y) <= DEFENSE.ALERT_R);
  if (near.length) {
    const brave = courage(p);
    if (p.needs.energy > DEFENSE.FIGHT_MIN_ENERGY) {
      for (const e of near) {
        // 膽識決定願不願意上：膽小的人幾乎不上，膽大的人比做任何活都急。
        const willing = Math.max(0, Math.min(1.5, DEFENSE.WILLING_BASE + 1.5 * brave));
        add({ kind: 'fight', enemy: e.id, spot: { x: Math.round(e.x), y: Math.round(e.y) }, label: `迎戰${e.label}` },
          { work: DEFENSE.FIGHT_WORK * willing });
      }
    }
    const hall = state.pois.find((x) => x.id === 'hall');
    add({ kind: 'hide', spot: { x: hall.x, y: hall.y }, label: '躲進道館' },
      { persona: Math.max(0, DEFENSE.HIDE_BASE - brave) + 0.3 * Math.max(0, F) });
  }
  // M14 守哨：有活著的敵人、有空哨位時，站上去等敵人進範圍。
  if (p.needs.energy > DEFENSE.FIGHT_MIN_ENERGY && activeEnemies(state).length) {
    const willing = Math.max(0, Math.min(1.5, DEFENSE.WILLING_BASE + 1.5 * courage(p)));
    for (const o of state.objects) {
      if (o.kind !== 'post') continue;
      const i = freeSlot(o);
      if (i < 0) continue;
      add({ kind: 'watch', obj: o.id, slot: i, spot: spotOf(o, i), label: '上哨位守著' }, { work: DEFENSE.FIGHT_WORK * willing * POST.PREF });
    }
  }
  if (empty && state.stock.wood > 0) {
    for (const k of brokenFence(state)) {
      if (state.repairUser[k]) continue;
      const [x, y] = k.split(',').map(Number);
      const spot = [[x, y - 1], [x, y + 1]].map(([sx, sy]) => ({ x: sx, y: sy })).find((s) => walkable(state.map, s.x, s.y) && reachable(state, s.x, s.y));
      if (!spot) continue;
      add({ kind: 'repair', cell: k, cx: x, cy: y, spot, label: '修補南柵欄' }, { work: DEFENSE.REPAIR_WORK, persona: diligence });
    }
  }

  const poi = scorePois(state, p)[0];
  if (poi) {
    const target = state.pois.find((x) => x.id === poi.target);
    add({ kind: 'wander', poi: poi.target, spot: { x: target.x, y: target.y }, label: `閒逛：${poi.label}` },
      { need: u.fun * 0.6 * (1 + 0.5 * N), persona: 0.1 * Math.max(0, Math.min(2, poi.score)) });
  }

  // 床都滿了或撐不住時，可以席地而睡。
  if (!out.some((c) => c.kind === 'sleep') || p.needs.energy < FORCE.energy) add({ kind: 'sleepGround' }, { need: u.energy * 0.7 });
  add({ kind: 'idle' }, { persona: 0.05 });

  // 敵人在附近時沒心思玩：休閒類打折（loop 7 診斷：警報後仍有人回去練功、聊天，迎敵在 206 次候選裡只排第一 31 次）。
  if (near.length) for (const c of out) if (LEISURE.has(c.kind)) { c.score *= DEFENSE.ALARM_LEISURE; c.f.sched *= DEFENSE.ALARM_LEISURE; }

  // M8 訪客不接活計、不迎敵；門規的影響。
  if (p.guest) for (let i = out.length - 1; i >= 0; i--) if (WORK_KINDS.has(out[i].kind) || out[i].kind === 'fight' || out[i].kind === 'watch') out.splice(i, 1);
  const rule = state.sect && !p.guest ? state.sect.rule : null;
  if (rule === 'drill') for (const c of out) if (c.kind === 'drill') { c.f.persona += SECT.RULE_DRILL; c.score += SECT.RULE_DRILL * c.f.sched * c.f.dist; }
  if (rule === 'free') for (const c of out) if (c.kind === 'sit' || c.kind === 'wander') { c.f.persona += SECT.RULE_FREE; c.score += SECT.RULE_FREE * c.f.sched * c.f.dist; }

  let forced = null;
  let list = out;
  // 兩者都低時先顧比較缺的那個，避免「睡→餓醒→又睏」的死循環。
  const tired = p.needs.energy < FORCE.energy;
  const hungry = p.needs.food < FORCE.food;
  if (tired && (!hungry || p.needs.energy <= p.needs.food)) {
    forced = '太累了，先睡';
    list = out.filter((c) => SLEEPS.has(c.kind));
  } else if (hungry) {
    forced = '太餓了，先找吃的';
    // 鍋裡沒飯但生莓夠時，餓的人也可以先煮（loop 9 診斷：遠征時家裡人少，飢餓時間裡約一半是「沒飯、生莓夠」卻沒人煮）。
    const cookFirst = state.stock.meal === 0 && state.stock.raw >= COOK_RAW && state.stock.wood >= FIRE.WOOD_PER_POT;
    // M18：柴火值日的人在「燒柴、木不夠一鍋、沒飯、生莓夠」時也去砍柴、扛回倉堆。
    const woodFirst = role === 'wood' && FIRE.WOOD_PER_POT > 0 && state.stock.wood < FIRE.WOOD_PER_POT && state.stock.meal === 0 && state.stock.raw >= COOK_RAW;
    const eats = out.filter((c) => EATS.has(c.kind) || c.kind === 'deliver' || (cookFirst && c.kind === 'cook') || (woodFirst && (c.kind === 'chop' || c.kind === 'store')));
    if (eats.length) list = eats;
  }
  list.sort((a, b) => b.score - a.score);
  return { list, forced };
}

// 被找聊天的人是否願意：交流越缺越願意，外向的人幾乎都願意。
// 切磋可以打斷的事：閒著、閒逛，以及打木樁、坐著發呆（換成跟人過招）。
// loop 6 診斷：只准打斷閒著的人時，12 個種子選了切磋 85 次，只開打 25 場，多半是走到時對方已在忙別的。
const SPAR_BREAKS = new Set(['drill', 'sit', 'idle']);
export function sparInterruptible(o) {
  return interruptible(o) || (o.act === 'do' && SPAR_BREAKS.has(o.task?.kind));
}

// 斷掉的柵欄格（只有蓋好過的柵欄會斷）。
export function brokenFence(state) {
  const out = [];
  for (let y = 0; y < state.map.length; y++) {
    const row = state.map[y];
    for (let x = row.indexOf('f'); x >= 0; x = row.indexOf('f', x + 1)) out.push(`${x},${y}`);
  }
  return out;
}

// 琢磨：悟性高、直覺型的人自己會想練（loop 8 為了 openIssue 加：自然遊玩中悟性 ≥ 7 的人平均只學到 0.16 招、≤ 4 的人 1.08 招，
// 因為練功動機原本只來自定力與條理，高悟性的模板多半隨性）。
export function insight(p) {
  return MARTIAL.INSIGHT_WU * (p.attrs.wu - 5) + MARTIAL.INSIGHT_N * Math.max(0, p.axes.N);
}

export function willingToSpar(o) {
  return o.needs.energy > MARTIAL.SPAR_MIN_ENERGY;
}

export function willingToChat(o) {
  return urgency(o.needs.social) * (1 + 0.5 * o.axes.E) + 0.4 + 0.3 * o.axes.E >= 0.5;
}
