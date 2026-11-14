// 武俠小鎮 W4（#556，元素 id `w04-dojo`）：周教頭重開武館、有人去練功、練久了看得出變強。
// - 武館物件（objects.json 裡 element=w04-dojo）與三人的日程覆蓋（schedules.json overlays）由 w03-life 讀：
//   本元素開啟時才存在，關閉時世界跟 W3 逐位元組相同。
// - 本元素的 tick 在 w03-life 之後：每遊戲分鐘替正在練功的人加技能（data/wuxia/training.json），
//   周教頭在武館（醒著、不在對話中）時乘教頭加成；打樁時頭上的 emoji 依拳腳分階、標籤顯示每分鐘打樁數。
// - 只用規則與 tick 的 now，不用亂數（不耗 game.rng()）、不等 LLM。
// 狀態存在 world.wuxia.elements['w04-dojo']。
import type { Game } from '../../aiTown/game';
import type { WuxiaElement } from '../registry';
import type { WuxiaState } from '../state';
import { gameMinutes, readClock } from '../clock';
import { W03_LIFE, LifeState, Person } from '../w03_life';
import { OBJECT_BY_ID, placeAt } from '../w03_life/data';
import {
  COACH_ID,
  SKILL_KEYS,
  Skills,
  TRAINING_ACTS,
  dummyLabel,
  gainPerMinute,
  initialSkills,
  tierOf,
} from './data';
import { masterBonusFor } from '../w07_bond/data';

export const W04_DOJO = 'w04-dojo';

export type DojoState = {
  v: 1;
  /** 最後處理過的遊戲分鐘 */
  minute: number;
  /** 武館重開的遊戲分鐘（W4 固定第 1 日；W5 起改由心念觸發） */
  openedAt?: number;
  /** 技能值（整數 0–1000），鍵是人物 id */
  skills: Record<string, Skills>;
  /** 還沒滿 1 的小數成長，鍵是人物 id */
  frac: Record<string, Skills>;
  /** 上一個遊戲分鐘周教頭是否在武館（給畫面與報告看） */
  coachHere: boolean;
};

export function initDojoState(): DojoState {
  return { v: 1, minute: -1, skills: {}, frac: {}, coachHere: false };
}

export const dojoElement: WuxiaElement = {
  id: W04_DOJO,
  requires: [W03_LIFE],
  init: (state: WuxiaState) => {
    state.elements[W04_DOJO] = initDojoState();
  },
  tick: (game, now) => tickDojo(game, now),
};

export function dojoState(world: { wuxia?: WuxiaState } | undefined): DojoState | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[W04_DOJO]) return undefined;
  return w.elements[W04_DOJO] as DojoState | undefined;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** 這個人此刻在武館練功嗎（做練功活動、不是走路）。 */
export function trainingAct(person: Person | undefined): string | undefined {
  const cur = person?.cur;
  if (!cur || cur.phase !== 'do' || !TRAINING_ACTS.has(cur.act)) return undefined;
  return cur.act;
}

/**
 * #556「教頭加成」：周教頭同時在武館且不在對話中。另外睡覺不算（他的床在武館門口）。
 * 「在武館」＝在做武館物件的活動，或站在武館範圍內。
 */
export function coachPresent(game: Game, life: LifeState): boolean {
  return personAtDojo(game, life, COACH_ID);
}

/** W7：某人此刻「在武館」（同教頭在場的判定：醒著、不在對話、在做武館物件的活動或站在武館範圍內）。 */
export function personAtDojo(game: Game, life: LifeState, cid: string): boolean {
  for (const [pid, person] of Object.entries(life.people)) {
    if (person.cid !== cid) continue;
    const player = game.world.players.get(pid as any);
    if (!player) return false;
    if (game.world.playerConversation(player)) return false;
    const cur = person.cur;
    if (cur?.phase === 'talk') return false;
    if (cur?.phase === 'do') {
      if (cur.act === 'sleep') return false;
      return OBJECT_BY_ID[cur.obj]?.place === 'dojo';
    }
    return placeAt(player.position.x, player.position.y) === 'dojo';
  }
  return false;
}

export function ensure(state: DojoState, cid: string) {
  if (!state.skills[cid]) {
    state.skills[cid] = initialSkills(cid);
    const z = {} as Skills;
    for (const k of SKILL_KEYS) z[k] = 0;
    state.frac[cid] = z;
  }
}

/** 把一筆（可有小數的）成長加到某人某技能上；小數累積在 frac。回傳整數技能值實際加了多少。W6 切磋的成長也走這裡。 */
export function addGain(state: DojoState, cid: string, k: (typeof SKILL_KEYS)[number], g: number): number {
  ensure(state, cid);
  if (g <= 0) return 0;
  const skills = state.skills[cid];
  const frac = state.frac[cid];
  const before = skills[k];
  const total = round6(frac[k] + g);
  const whole = Math.floor(total);
  skills[k] = Math.min(1000, skills[k] + whole);
  frac[k] = skills[k] >= 1000 ? 0 : round6(total - whole);
  return skills[k] - before;
}

export function tickDojo(game: Game, now: number) {
  const w = game.world.wuxia!;
  if (w.clockEpoch === undefined) return;
  const life = w.elements[W03_LIFE] as LifeState | undefined;
  if (!life) return;
  let state = w.elements[W04_DOJO] as DojoState | undefined;
  if (!state) {
    state = initDojoState();
    w.elements[W04_DOJO] = state;
  }
  const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
  if (gm <= state.minute) return;
  const elapsed = state.minute < 0 ? 0 : gm - state.minute;
  state.minute = gm;
  // W4：第 1 日固定重開。W5：w05-mind 開著時改由周教頭的心念「想重開武館」觸發（w05_mind 寫 openedAt），這裡不自動開
  if (state.openedAt === undefined && !w.enabled['w05-mind'] && readClock(gm).day >= 1) state.openedAt = gm;

  const coach = coachPresent(game, life);
  state.coachHere = coach;
  // 固定排序（Convex 存回物件時欄位會重排）
  for (const pid of Object.keys(life.people).sort()) {
    const person = life.people[pid];
    ensure(state, person.cid);
    const act = trainingAct(person);
    if (!act || elapsed <= 0) continue;
    // 這一分鐘才開始的不算（startDoing 在本 tick 剛發生）
    const minutes = Math.min(elapsed, gm - person.cur!.since);
    if (minutes <= 0) continue;
    const skills = state.skills[person.cid];
    const withCoach = coach && person.cid !== COACH_ID;
    // W7：師父在場時用師父加成（#559「1.5 → 2.0」）；w07-bond 關閉或沒拜師時 undefined，跟 W6 相同
    const master = masterBonusFor(w, person.cid, (m) => (m === COACH_ID ? coach : personAtDojo(game, life, m)));
    for (const k of SKILL_KEYS) {
      const g = gainPerMinute(act, k, skills[k], master ?? withCoach, person.needs.fatigue) * minutes;
      addGain(state, person.cid, k, g);
    }
  }
  // 打樁：頭上 emoji 依拳腳分階、標籤是每分鐘打樁數（數字跟著成長變）
  for (const pid of Object.keys(life.people).sort()) {
    const person = life.people[pid];
    if (trainingAct(person) !== 'hit_dummy') continue;
    const player = game.world.players.get(pid as any);
    if (!player || !player.activity) continue;
    const fist = state.skills[person.cid].fist;
    const emoji = tierOf(fist).emoji;
    const description = dummyLabel(fist);
    if (player.activity.emoji !== emoji || player.activity.description !== description) {
      player.activity = { ...player.activity, emoji, description };
    }
  }
}
