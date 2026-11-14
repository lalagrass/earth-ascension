// 武俠小鎮 W4（#556）：無頭模擬的練功紀錄（只讀世界狀態，不改規則）。
// 每遊戲分鐘取樣：誰在練什麼、周教頭在不在武館、技能（含小數）增加多少；每日結束時記一次技能值。
// 輸出放進 headless summary.dojo，給 wuxia:skill-report 用。
import type { Game } from '../../convex/aiTown/game';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { W03_LIFE, LifeState } from '../../convex/wuxia/w03_life';
import { DojoState, W04_DOJO, coachPresent, trainingAct } from '../../convex/wuxia/w04_dojo';
import { COACH_ID, SKILL_KEYS, Skills, TRAINING } from '../../convex/wuxia/w04_dojo/data';

export type DojoDayRow = {
  /** 當日練功分鐘（do 階段） */
  trainMinutes: number;
  /** 其中周教頭在武館的分鐘 */
  coachMinutes: number;
  /** 各練法分鐘 */
  acts: Record<string, number>;
  /** 當日技能增加（含小數） */
  gain: Skills;
  /** 當日在教頭在場時練出的技能增加（含小數）；gain − coachGain ＝ 教頭不在時練出的 */
  coachGain: Skills;
  /**
   * 當日「同等級折算」的拳腳練功量：每分鐘 gain ÷ (1−level/1000)^2 ÷ weight 的總和，
   * 等於 base × 教頭加成 × 疲累係數 的總和。用來比較教頭在／不在（扣掉等級越高越難練的影響）。
   */
  effort: { coach: number; solo: number };
  /** 當日結束時的技能值（整數） */
  end: Skills;
};

export type DojoTrace = {
  on: boolean;
  openedAt: number | null;
  /** days[d-1][cid] */
  days: Array<Record<string, DojoDayRow>>;
  /** 周教頭每日在武館（醒著、不在對話）的分鐘 */
  coachDayMinutes: number[];
  final: Record<string, Skills>;
};

const zero = (): Skills => ({ fist: 0, power: 0, stance: 0, stamina: 0 });

export class DojoTracer {
  trace: DojoTrace = { on: false, openedAt: null, days: [], coachDayMinutes: [], final: {} };
  private lastMinute = -1;
  private prev: Record<string, Skills> = {};

  private total(d: DojoState, cid: string): Skills {
    const out = zero();
    for (const k of SKILL_KEYS) out[k] = d.skills[cid][k] + d.frac[cid][k];
    return out;
  }

  sample(game: Game, now: number) {
    const w = game.world.wuxia;
    if (!w || w.clockEpoch === undefined || !w.enabled[W04_DOJO]) return;
    const life = w.elements[W03_LIFE] as LifeState | undefined;
    const dojo = w.elements[W04_DOJO] as DojoState | undefined;
    if (!life || !dojo) return;
    const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
    if (gm === this.lastMinute) return;
    this.lastMinute = gm;
    this.trace.on = true;
    this.trace.openedAt = dojo.openedAt ?? null;
    const day = readClock(gm).day;
    while (this.trace.days.length < day) {
      this.trace.days.push({});
      this.trace.coachDayMinutes.push(0);
    }
    const rows = this.trace.days[day - 1];
    const coach = coachPresent(game, life);
    if (coach) this.trace.coachDayMinutes[day - 1]++;
    for (const pid of Object.keys(life.people).sort()) {
      const person = life.people[pid];
      const cid = person.cid;
      if (!dojo.skills[cid]) continue;
      const row = (rows[cid] ??= {
        trainMinutes: 0,
        coachMinutes: 0,
        acts: {},
        gain: zero(),
        coachGain: zero(),
        effort: { coach: 0, solo: 0 },
        end: { ...dojo.skills[cid] },
      });
      const now_ = this.total(dojo, cid);
      const before = this.prev[cid] ?? now_;
      const act = trainingAct(person);
      const withCoach = !!act && coach && cid !== COACH_ID;
      for (const k of SKILL_KEYS) {
        const g = now_[k] - before[k];
        row.gain[k] = Math.round((row.gain[k] + g) * 1e6) / 1e6;
        if (withCoach) row.coachGain[k] = Math.round((row.coachGain[k] + g) * 1e6) / 1e6;
      }
      if (act) {
        const wFist = TRAINING.activities[act]?.weight.fist ?? 0;
        const g = now_.fist - before.fist;
        if (wFist > 0 && g > 0) {
          const room = Math.pow(Math.max(1e-9, 1 - before.fist / TRAINING.max), TRAINING.exponent);
          const e = g / room / wFist;
          if (withCoach) row.effort.coach = Math.round((row.effort.coach + e) * 1e6) / 1e6;
          else row.effort.solo = Math.round((row.effort.solo + e) * 1e6) / 1e6;
        }
      }
      this.prev[cid] = now_;
      row.end = { ...dojo.skills[cid] };
      if (act) {
        row.trainMinutes++;
        row.acts[act] = (row.acts[act] ?? 0) + 1;
        if (withCoach) row.coachMinutes++;
      }
      this.trace.final[cid] = { ...dojo.skills[cid] };
    }
  }
}
