// 侵擾：開局排好的排程、敵人出生、找路、撞柵欄、偷東西、逃走。人物的迎敵與修補在 ai／sim。
import { ENEMIES, RAID, DEFENSE, TICKS_PER_DAY, PILE } from './data.mjs';
import { seedHolder, nextRand, randInt } from './rng.mjs';
import { walkable, nearestWalkable } from './map.mjs';
import { findPath } from './path.mjs';
import { wound } from './injury.mjs';
import { setTile } from './build.mjs';
import { kindBlocked } from './expedition.mjs';

const THROUGH = { F: DEFENSE.FENCE_COST };

// 排程只看種子，不吃主 RNG，免得改了別的系統就改掉侵擾時刻。
export function raidSchedule(seed) {
  const h = seedHolder(seed * 31 + 5);
  const out = [];
  for (let d = RAID.START_DAY; d < RAID.DAYS; d++) {
    const minute = Math.floor((RAID.HOUR_FROM + nextRand(h) * (RAID.HOUR_TO - RAID.HOUR_FROM)) * 60);
    const n = 1 + Math.floor((d - RAID.START_DAY) / RAID.GROW_EVERY);
    const kinds = [];
    for (let i = 0; i < n; i++) kinds.push(d >= RAID.BANDIT_DAY && nextRand(h) < RAID.BANDIT_P ? 'bandit' : 'boar');
    const xs = kinds.map(() => RAID.SPAWN_X[0] + randInt(h, RAID.SPAWN_X[1] - RAID.SPAWN_X[0] + 1));
    out.push({ tick: d * TICKS_PER_DAY + minute, kinds, xs });
  }
  return out;
}

export const fenceHp = (state, x, y) => state.fenceHp[`${x},${y}`] ?? DEFENSE.FENCE_HP;

// 目標站位：野豬去灶邊，山賊去倉堆。
export function targetSpot(state, kind) {
  if (ENEMIES[kind].target === 'pile') return { x: PILE.x, y: PILE.y };
  const h = state.objects.find((o) => o.kind === 'hearth');
  return nearestWalkable(state.map, h.slots[0][0], h.slots[0][1] + 1);
}

function exitSpot(state, e) {
  return nearestWalkable(state.map, Math.round(e.x), RAID.SPAWN_Y);
}

export function spawnEnemy(state, kind, x) {
  const s = nearestWalkable(state.map, x, RAID.SPAWN_Y);
  const def = ENEMIES[kind];
  const e = { id: `e${state.enemySeq++}`, kind, label: def.label, x: s.x, y: s.y, hp: def.hp, hpMax: def.hp,
    mode: 'lurk', path: [], wait: RAID.LURK_TICKS, born: state.tick, hitBy: [], stolen: null };
  e.goal = targetSpot(state, kind);
  e.path = findPath(state.map, s.x, s.y, e.goal.x, e.goal.y, THROUGH) ?? [];
  state.enemies.push(e);
  state.counts.enemies = (state.counts.enemies || 0) + 1;
  return e;
}

// M9 守巢的敵人：站在巢旁不動，不算進侵擾統計。
export function spawnGuard(state, nest, kind, i) {
  const s = nearestWalkable(state.map, nest.x - 1 + i, nest.y + (nest.y > 20 ? -1 : 1));
  const def = ENEMIES[kind];
  const e = { id: `e${state.enemySeq++}`, kind, label: `守巢${def.label}`, x: s.x, y: s.y, hp: def.hp, hpMax: def.hp,
    mode: 'guard', nest: nest.id, path: [], wait: 0, born: state.tick, hitBy: [], stolen: null };
  state.enemies.push(e);
  nest.guards.push(e.id);
  return e;
}

export function startRaids(state) {
  while (state.raidAt < state.raids.length && state.raids[state.raidAt].tick <= state.tick) {
    const r = state.raids[state.raidAt++];
    // M9：巢被拆掉的敵人不再來。
    const kinds = r.kinds.filter((k) => !kindBlocked(state, k));
    state.counts.scheduled = (state.counts.scheduled || 0) + r.kinds.length;
    kinds.forEach((k) => spawnEnemy(state, k, r.xs[r.kinds.indexOf(k)]));
    if (!kinds.length) { state.events.push({ tick: state.tick, kind: 'calm', text: '今天山林很安靜' }); continue; }
    const names = [...new Set(kinds.map((k) => ENEMIES[k].label))].join('和');
    state.events.push({ tick: state.tick, kind: 'raid', text: `${names}從南邊山林來了（${kinds.length}）` });
    state.counts.raids = (state.counts.raids || 0) + 1;
    state.threat += DEFENSE.THREAT_RAID;
    alarm(state);
  }
}

// 警報：閒著、練功、聊天、坐著的人丟下手邊的事，馬上重新決定（迎敵或躲）。睡著、吃飯、扛東西的不叫。
// loop 7 診斷：沒有警報時，敵人在場期間大家只做了 269 次決定，多半在練功、閒逛、聊天裡等它做完。
function alarm(state) {
  for (const p of state.people) {
    if (p.exp) continue; // 遠征隊在外面，聽不到
    const k = p.task?.kind;
    const wandering = p.act === 'walk' && k === 'wander';
    if (!(wandering || (p.act === 'do' && DEFENSE.ALARM_BREAKS.includes(k)) || (p.act === 'idle' && !p.task))) continue;
    if (p.act === 'do' && (k === 'spar' || k === 'chat')) {
      const o = state.people.find((x) => x.id === p.task.partner);
      if (o?.task?.partner === p.id) { state.releaseFn(state, o); o.act = 'idle'; o.wait = 0; }
    }
    state.releaseFn(state, p);
    p.path = []; p.act = 'idle'; p.wait = 0;
    p.bubble = { text: '有敵人！', until: state.tick + 40 };
  }
}

// 誰正纏著這個敵人（站在旁邊、正在打）。
export function engaged(state, e) {
  return state.people.filter((p) => p.act === 'do' && p.task?.kind === 'fight' && p.task.enemy === e.id && Math.hypot(p.x - e.x, p.y - e.y) <= 1.6);
}

function steal(state, e) {
  const L = state.ledger, st = state.stock, def = ENEMIES[e.kind];
  let n = def.steal, got = [];
  const take = (k, lk, label) => { const m = Math.min(n, st[k]); if (m > 0) { st[k] -= m; L[lk] += m; n -= m; got.push(`${m}${label}`); } };
  if (def.target === 'hearth') { take('raw', 'rawStolen', '顆生莓'); take('meal', 'mealsStolen', '份飯'); }
  else { take('wood', 'woodStolen', '木'); take('stone', 'stoneStolen', '石'); }
  e.stolen = got.join('、') || '什麼也沒有';
  state.events.push({ tick: state.tick, kind: 'stolen', text: `${e.label}${got.length ? `偷走了${e.stolen}` : '撲了個空'}` });
  if (got.length) { state.counts.stealHits = (state.counts.stealHits || 0) + 1; state.threat += DEFENSE.THREAT_STEAL; }
}

function flee(state, e) {
  e.mode = 'flee';
  const out = exitSpot(state, e);
  e.goal = out;
  e.path = (out && findPath(state.map, Math.round(e.x), Math.round(e.y), out.x, out.y, THROUGH)) ?? [];
}

function moveEnemy(state, e, speed) {
  let budget = speed;
  while (budget > 0 && e.path.length) {
    const n = e.path[0];
    // 路上新蓋了牆：照原目標重找。
    if (!walkable(state.map, n.x, n.y) && state.map[n.y][n.x] !== 'F') {
      e.path = (e.goal && findPath(state.map, Math.round(e.x), Math.round(e.y), e.goal.x, e.goal.y, THROUGH)) ?? [];
      return;
    }
    // 前面是柵欄：停下來撞。
    if (state.map[n.y][n.x] === 'F') {
      const k = `${n.x},${n.y}`;
      state.fenceHp[k] = fenceHp(state, n.x, n.y) - ENEMIES[e.kind].bash;
      e.bashing = k;
      if (state.fenceHp[k] <= 0) {
        delete state.fenceHp[k];
        setTile(state, n.x, n.y, 'f');
        e.bashing = null;
        state.events.push({ tick: state.tick, kind: 'breach', text: `${e.label}撞破了南柵欄` });
        state.counts.breaches = (state.counts.breaches || 0) + 1;
        state.threat += DEFENSE.THREAT_BREACH;
      }
      return;
    }
    e.bashing = null;
    const d = Math.hypot(n.x - e.x, n.y - e.y);
    if (d <= budget) { e.x = n.x; e.y = n.y; budget -= d; e.path.shift(); }
    else { e.x += ((n.x - e.x) / d) * budget; e.y += ((n.y - e.y) / d) * budget; budget = 0; }
  }
}

export function stepEnemies(state) {
  state.threat *= DEFENSE.THREAT_DECAY;
  for (const e of state.enemies) {
    if (e.mode === 'guard') {
      if (e.hp <= 0) { e.gone = true; state.events.push({ tick: state.tick, kind: 'guard', text: `${e.label}倒下了` }); continue; }
      const foes = engaged(state, e);
      for (const p of foes) { p.needs.energy = Math.max(0, p.needs.energy - ENEMIES[e.kind].hit / foes.length); wound(state, p, ENEMIES[e.kind].hit / foes.length, e.label); }
      continue;
    }
    if (e.mode !== 'flee' && e.hp <= 0) {
      e.mode = 'beaten';
      // M14：打退時有人站在哨位上，紀事寫出來。
      const onPost = state.people.some((p) => e.hitBy.includes(p.id) && p.task?.kind === 'watch');
      if (onPost) state.counts.repelledPost = (state.counts.repelledPost || 0) + 1;
      state.events.push({ tick: state.tick, kind: 'repel', text: `${e.hitBy.map((id) => state.people.find((p) => p.id === id)?.name ?? '路人').join('、')}${onPost ? '在哨位上' : ''}打退了${e.label}`, who: [...e.hitBy] });
      state.counts.repelled = (state.counts.repelled || 0) + 1;
      flee(state, e);
    }
    if (e.mode !== 'flee' && e.mode !== 'beaten' && state.tick - e.born > RAID.MAX_LIFE) flee(state, e);
    const def = ENEMIES[e.kind];
    if (e.mode === 'come' || e.mode === 'steal' || e.mode === 'lurk') {
      const foes = engaged(state, e);
      if (foes.length) {
        // 被纏住：原地反擊，扣迎戰者精力。
        for (const p of foes) { p.needs.energy = Math.max(0, p.needs.energy - def.hit / foes.length); wound(state, p, def.hit / foes.length, e.label); }
        continue;
      }
    }
    if (e.mode === 'lurk') {
      if (--e.wait <= 0) e.mode = 'come';
    } else if (e.mode === 'come') {
      moveEnemy(state, e, def.speed);
      if (!e.path.length) { e.mode = 'steal'; e.wait = RAID.STEAL_TICKS; }
    } else if (e.mode === 'steal') {
      if (--e.wait <= 0) { steal(state, e); flee(state, e); }
    } else {
      moveEnemy(state, e, def.speed * 1.2);
      if (!e.path.length) e.gone = true;
    }
  }
  state.enemies = state.enemies.filter((e) => !e.gone);
}

export function activeEnemies(state) {
  return state.enemies.filter((e) => (e.mode === 'lurk' || e.mode === 'come' || e.mode === 'steal') && e.hp > 0);
}
