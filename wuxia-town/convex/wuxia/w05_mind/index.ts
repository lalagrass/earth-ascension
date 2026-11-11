// 武俠小鎮 W5（#557，元素 id `w05-mind`）：記憶 → 心念 → 改變日程（規則版反思）。
// 本元素的 tick 排在 w03-life、w04-dojo 之後，每遊戲分鐘：
//   1. 從 w03-life 的生活紀錄（log）把「有意義的事」寫進每人的事件記憶（環形 200 筆）：
//      聽書、聊天（跟誰、在哪；內容不進規則）、一起吃飯、第一次去某地、在武館外張望（周教頭記成「有人在武館外徘徊」）、
//      城門外張望、新人到鎮；另外累計今日練功分鐘、偵測技能升階（w04-dojo）。
//   2. 每遊戲日寅正（04:00）：記一筆昨日練功、所有記憶 weight ×0.9、依 data/wuxia/thoughts.json 評估心念；
//      周教頭有「想重開武館」就重開武館（寫 w04-dojo 的 openedAt，取代 W4 的固定第 1 日）。
// 心念的效果（日程時段、邀請倍率）由 w03-life 讀（w05_mind/data.ts 的純函式），本元素不直接指定動作。
// 只用規則與 tick 的 now，不耗 game.rng()、不等 LLM。狀態存在 world.wuxia.elements['w05-mind']。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE, LifeState, personPlace } from '../w03_life';
import { W04_DOJO, DojoState, trainingAct } from '../w04_dojo';
import { COACH_ID, SKILL_KEYS, SKILL_LABELS, TRAINING } from '../w04_dojo/data';
import {
  MIND,
  Memory,
  MemoryKind,
  MindPerson,
  MindState,
  THOUGHT_BY_ID,
  ThoughtChange,
  W05_MIND,
  evaluatePerson,
} from './data';

export { W05_MIND } from './data';

export function initMindState(): MindState {
  return { v: 1, minute: -1, evalDay: 0, seq: 1, people: {} };
}

export const mindElement: WuxiaElement = {
  id: W05_MIND,
  requires: [W03_LIFE],
  init: (state: WuxiaState) => {
    state.elements[W05_MIND] = initMindState();
  },
  tick: (game, now) => tickMind(game, now),
};

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

function tierIndex(level: number): number {
  let i = 0;
  TRAINING.tiers.forEach((t, k) => {
    if (level >= t.min) i = k;
  });
  return i;
}

/**
 * 寫一筆記憶。mergeSameDay 的種類同一遊戲日再發生就併進當天那一筆（n＋1，時間不變）。
 * 被 drop 的 id 照樣佔號（後面的 id 不會位移），當天併進它的後續同類事件一起不記。
 */
export function remember(
  state: MindState,
  pid: string,
  t: number,
  kind: MemoryKind,
  extra: Partial<Pick<Memory, 'other' | 'place' | 'n' | 'what'>> = {},
) {
  const person = state.people[pid];
  if (!person) return;
  const merge = MIND.mergeSameDay.includes(kind);
  const day = readClock(t).day;
  if (merge) {
    if (state.dropped?.[pid]?.[kind] === day) return;
    const last = [...person.memories].reverse().find((m) => m.kind === kind);
    if (last && readClock(last.t).day === day) {
      last.n = (last.n ?? 1) + 1;
      last.tEnd = t;
      return;
    }
  }
  const id = state.seq++;
  if (state.drop?.includes(id)) {
    if (merge) ((state.dropped ??= {})[pid] ??= {})[kind] = day;
    return;
  }
  const m: Memory = { id, t, kind, weight: MIND.weights[kind] ?? 1 };
  if (extra.other !== undefined) m.other = extra.other;
  if (extra.place !== undefined) m.place = extra.place;
  if (extra.n !== undefined) m.n = extra.n;
  if (extra.what !== undefined) m.what = extra.what;
  person.memories.push(m);
  if (person.memories.length > MIND.memorySize)
    person.memories.splice(0, person.memories.length - MIND.memorySize);
}

/** 最後一次評估的變化（給畫面與工具看；每次評估覆寫） */
export type MindStateWithLast = MindState & { last?: ThoughtChange[] };

export function tickMind(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return;
  let state = w.elements[W05_MIND] as MindStateWithLast | undefined;
  if (!state) {
    state = initMindState();
    w.elements[W05_MIND] = state;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= state.minute) return;
  const prevMinute = state.minute;
  const elapsed = prevMinute < 0 ? 0 : gm - prevMinute;
  state.minute = gm;
  const clock = readClock(gm);
  const dojo = w.enabled[W04_DOJO] ? (w.elements[W04_DOJO] as DojoState | undefined) : undefined;

  // pid ↔ cid
  const pids = Object.keys(life.people).sort();
  const pidOf: Record<string, string> = {};
  for (const pid of pids) pidOf[life.people[pid].cid] = pid;

  // 新加入的人（開局 newcomerAfter 分鐘後才進鎮的算新人，其他人記一筆「某某到鎮上」）
  for (const pid of pids) {
    if (state.people[pid]) continue;
    const cid = life.people[pid].cid;
    state.people[pid] = { cid, memories: [], thoughts: [], places: [], trainMin: 0 };
    if (gm > MIND.newcomerAfter) {
      for (const other of Object.keys(state.people).sort()) {
        if (other === pid) continue;
        remember(state, other, gm, 'newcomer', { other: cid });
      }
    }
  }

  // 1. 生活紀錄裡這一分鐘的事（w03-life 每個遊戲分鐘只處理一次，同一分鐘的紀錄都在這一次 tick 裡）
  for (const e of life.log) {
    if (e.t <= prevMinute || e.t > gm) continue;
    const pid = pidOf[e.who];
    const me = pid ? state.people[pid] : undefined;
    if (!me) continue;
    if (e.act === 'listen_story') remember(state, pid, e.t, 'listen', { place: 'teahouse' });
    else if (e.act === 'talk') {
      const player = game.world.players.get(pid as any);
      const conv = player ? game.world.playerConversation(player) : undefined;
      let other: string | undefined;
      if (conv) {
        for (const id of conv.participants.keys()) if (id !== pid) other = life.people[id]?.cid;
      }
      remember(state, pid, e.t, 'talk', { other, place: e.obj || undefined });
    } else if (e.act === 'eat') {
      for (const opid of pids) {
        if (opid === pid) continue;
        const cur = life.people[opid].cur;
        if (cur?.phase === 'do' && cur.act === 'eat' && cur.obj === e.obj) {
          const ocid = life.people[opid].cid;
          remember(state, pid, e.t, 'meal_with', { other: ocid });
          remember(state, opid, e.t, 'meal_with', { other: e.who });
        }
      }
    } else if (e.act === 'gaze_dojo') {
      remember(state, pid, e.t, 'gaze', { place: 'dojo-gate' });
      // #557「周教頭：有人在武館外徘徊」：武館門口就在他住處旁
      const coachPid = pidOf[COACH_ID];
      if (coachPid && coachPid !== pid && state.people[coachPid])
        remember(state, coachPid, e.t, 'loiter_seen', { other: e.who, place: 'dojo-gate' });
    } else if (e.act === 'gaze_home') remember(state, pid, e.t, 'gaze_home', { place: 'gate' });
  }

  // 第一次去某地、今日練功分鐘、升階
  for (const pid of pids) {
    const person = life.people[pid];
    const me = state.people[pid];
    const player = game.world.players.get(pid as any);
    if (!player) continue;
    const place = personPlace(person, player);
    if (place !== 'outside' && !me.places.includes(place)) {
      me.places.push(place);
      remember(state, pid, gm, 'first_visit', { place });
    }
    const act = trainingAct(person);
    if (act && elapsed > 0) me.trainMin += Math.max(0, Math.min(elapsed, gm - person.cur!.since));
    const skills = dojo?.skills[person.cid];
    if (skills) {
      const tiers = (me.tiers ??= {});
      for (const k of SKILL_KEYS) {
        const t = tierIndex(skills[k]);
        if (tiers[k] === undefined) tiers[k] = t;
        else if (t > tiers[k]) {
          tiers[k] = t;
          remember(state, pid, gm, 'tier_up', { what: `${SKILL_LABELS[k]}${TRAINING.tiers[t].name}`, n: skills[k] });
        }
      }
    }
  }

  // 2. 寅正評估（第 1 日從卯正開始，所以第一次評估在第 2 日寅正）
  if (state.evalDay === 0) state.evalDay = clock.day;
  if (clock.day > state.evalDay && clock.minuteOfDay >= MIND.evalMinuteOfDay) {
    state.evalDay = clock.day;
    const changes: ThoughtChange[] = [];
    for (const pid of pids) {
      const me = state.people[pid];
      if (me.trainMin > 0) {
        remember(state, pid, gm, 'trained', { n: me.trainMin });
        me.trainMin = 0;
      }
      for (const m of me.memories) if (m.t < gm) m.weight = round4(m.weight * MIND.decayPerDay);
      const skills = dojo?.skills[me.cid];
      changes.push(...evaluatePerson(me, { gm, skills: skills as any }, clock.day));
    }
    state.last = changes;
    // 想重開武館 → 重開
    const coachPid = pidOf[COACH_ID];
    const coach = coachPid ? state.people[coachPid] : undefined;
    if (
      dojo &&
      dojo.openedAt === undefined &&
      coach?.thoughts.some((t) => THOUGHT_BY_ID[t.id]?.effects.reopenDojo)
    ) {
      dojo.openedAt = gm;
    }
  }
}
