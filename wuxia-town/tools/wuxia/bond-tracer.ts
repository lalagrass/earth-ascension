// 武俠小鎮 W7（#559）：無頭模擬的關係與拜師紀錄（只讀世界狀態，不改規則）。
// 每遊戲分鐘取樣：每日寅初重算後的關係快照、拜師事件當下的「因為」記憶全文、
// 練功時誰在武館（每分鐘拳腳增加與同等級折算量，給「拜師後增長高於拜師前（同師父在場時數下比較）」用）。
// 輸出放進 headless summary.bond，給 wuxia:bond-report／wuxia:bond-trace 用。
import type { Game } from '../../convex/aiTown/game';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { W03_LIFE, LifeState } from '../../convex/wuxia/w03_life';
import { DojoState, W04_DOJO, personAtDojo, trainingAct } from '../../convex/wuxia/w04_dojo';
import { TRAINING } from '../../convex/wuxia/w04_dojo/data';
import { MindState, Memory, W05_MIND } from '../../convex/wuxia/w05_mind/data';
import { Bond, BondState, W07_BOND } from '../../convex/wuxia/w07_bond/data';

/** 一分鐘的練功：[遊戲分鐘, 拳腳增加, 同等級折算量, 在武館的其他人（人物 id）] */
export type TrainMinute = [number, number, number, string[]];

export type BondTrace = {
  on: boolean;
  /** days[d-1]＝第 d 日寅初重算後的關係（還沒算過的日子是 null） */
  days: Array<Record<string, Record<string, Bond>> | null>;
  /** 拜師事件開始時，心念「想拜師」的「因為」（記憶全文，弟子身上） */
  causes: Record<number, Memory[]>;
  /** 每人練功的每分鐘（只記有練的分鐘） */
  train: Record<string, TrainMinute[]>;
  /** 最後狀態（報告與 trace 用） */
  final?: {
    gm: number;
    state: BondState;
    memories: Record<string, Memory[]>;
    skills: Record<string, Record<string, number>>;
  };
};

export class BondTracer {
  trace: BondTrace = { on: false, days: [], causes: {}, train: {} };
  private lastMinute = -1;
  private lastEval = 0;
  private prevFist: Record<string, number> = {};

  sample(game: Game, now: number) {
    const w = game.world.wuxia;
    if (!w || w.clockEpoch === undefined || !w.enabled[W07_BOND]) return;
    const life = w.elements[W03_LIFE] as LifeState | undefined;
    const dojo = w.elements[W04_DOJO] as DojoState | undefined;
    const mind = w.elements[W05_MIND] as MindState | undefined;
    const st = w.elements[W07_BOND] as BondState | undefined;
    if (!life || !dojo || !mind || !st) return;
    const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
    if (gm === this.lastMinute) return;
    this.lastMinute = gm;
    this.trace.on = true;
    const day = readClock(gm).day;
    while (this.trace.days.length < day) this.trace.days.push(null);
    if (st.evalDay !== this.lastEval && Object.keys(st.bonds).length) {
      this.lastEval = st.evalDay;
      this.trace.days[st.evalDay - 1] = JSON.parse(JSON.stringify(st.bonds));
    }
    if (st.active && !this.trace.causes[st.active.id]) {
      const mem = mind.people[st.active.a]?.memories ?? [];
      this.trace.causes[st.active.id] = st.active.causes
        .map((id) => mem.find((m) => m.id === id))
        .filter((m): m is Memory => !!m)
        .map((m) => ({ ...m }));
    }
    const present = Object.keys(life.people)
      .sort()
      .map((p) => life.people[p].cid)
      .filter((cid) => personAtDojo(game, life, cid));
    for (const pid of Object.keys(life.people).sort()) {
      const person = life.people[pid];
      const cid = person.cid;
      const s = dojo.skills[cid];
      if (!s) continue;
      const fist = s.fist + (dojo.frac[cid]?.fist ?? 0);
      const before = this.prevFist[cid] ?? fist;
      this.prevFist[cid] = fist;
      const act = trainingAct(person);
      if (!act) continue;
      const g = Math.round((fist - before) * 1e6) / 1e6;
      const wFist = TRAINING.activities[act]?.weight.fist ?? 0;
      const room = Math.pow(Math.max(1e-9, 1 - before / TRAINING.max), TRAINING.exponent);
      const e = wFist > 0 && g > 0 ? Math.round((g / room / wFist) * 1e6) / 1e6 : 0;
      (this.trace.train[cid] ??= []).push([gm, g, e, present.filter((c) => c !== cid)]);
    }
  }

  finish(game: Game) {
    const w = game.world.wuxia;
    if (!this.trace.on || !w) return;
    const mind = w.elements[W05_MIND] as MindState;
    const dojo = w.elements[W04_DOJO] as DojoState;
    const memories: Record<string, Memory[]> = {};
    for (const p of Object.values(mind.people)) memories[p.cid] = p.memories;
    this.trace.final = {
      gm: this.lastMinute,
      state: JSON.parse(JSON.stringify(w.elements[W07_BOND])),
      memories: JSON.parse(JSON.stringify(memories)),
      skills: JSON.parse(JSON.stringify(dojo.skills)),
    };
  }
}
