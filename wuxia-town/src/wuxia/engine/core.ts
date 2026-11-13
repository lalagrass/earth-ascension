// 武俠小鎮 A1：單機引擎的控制核心（#564 第 1、2 項）。瀏覽器 Web Worker（worker.ts）與 Node 的 worker_threads
// （tools/wuxia/parity.ts）都包這一個類別：它擁有一個 Session，處理「送 input／變速／跳到明早／跳到下一件事／存讀檔」，
// 每一次 frame(dt) 依倍速跑幾個 step，回傳要給畫面的狀態。
// 倍速只決定「每個畫面更新跑幾個 step」，step 的內容（now、input）跟倍速無關，所以任何倍速跑同樣的遊戲時間，hash 相同。
// 這個檔不讀系統亂數或牆鐘：dt 由外面（Worker 的計時器）給。
import type { Snapshot } from '../../../tools/wuxia/sim';
import { Session, SessionOptions, WorldOptions, initialSnapshot, HeadlessMessage } from './session';
import { SaveFile, loadSave, makeSave } from './save';
import { EventMarks, KeyEvent, eventMarks, keyEventsBetween } from './events';

export const SPEEDS = [0, 1, 4, 16, 64] as const;
export type Speed = (typeof SPEEDS)[number];
/** 1× 時每實秒跑幾個 step（timeScale 60：1 step＝1 遊戲分＝1 實秒） */
const STEPS_PER_SECOND_AT_1X = 1;
/** 每次 frame 最多跑幾個 step（避免卡住 Worker） */
const MAX_STEPS_PER_FRAME = 400;
/** 「跳到下一件事」最多跳幾個遊戲日 */
const NEXT_EVENT_MAX_DAYS = 5;

export type Skip = { kind: 'morning' | 'next-event'; targetStep: number; marks: EventMarks };

export type CoreView = {
  world: any;
  /** 人物描述與地圖：第一次與有變動時才帶 */
  descriptions?: { playerDescriptions: any[]; agentDescriptions: any[]; worldMap: any };
  engineTime: number;
  gameMinute: number;
  steps: number;
  speed: Speed;
  skipping?: Skip['kind'];
  messages: HeadlessMessage[];
};

export type CoreOutput = {
  view?: CoreView;
  events: KeyEvent[];
  /** 這次 frame 跨過了遊戲日（自動存檔用）：新的一天的日數 */
  newDay?: number;
  inputResults: Array<{ token: number; value: any }>;
};

export type CoreInit =
  | { kind: 'new'; world: WorldOptions & SessionOptions }
  | { kind: 'load'; save: SaveFile };

export class LocalCore {
  session!: Session;
  initial!: Snapshot;
  speed: Speed = 0;
  autoSlow = true;
  private owed = 0;
  private skip?: Skip;
  private pending = new Map<object, number>();
  private descSent = -1;
  private lastDay = 0;
  private dirty = true;
  private agents?: number;

  init(init: CoreInit): { ok: true } | { ok: false; reason: string } {
    if (init.kind === 'new') {
      this.initial = initialSnapshot(init.world);
      this.session = new Session(this.initial, { ...init.world, keepMessages: 200 });
      this.agents = init.world.agents;
    } else {
      const r = loadSave(init.save, 200);
      if (!r.ok) return r;
      this.session = r.session;
      this.initial = r.initial;
      this.agents = init.save.agents;
    }
    this.owed = 0;
    this.skip = undefined;
    this.descSent = -1;
    this.lastDay = this.day();
    this.dirty = true;
    return { ok: true };
  }

  private day(): number {
    const gm = this.session.gameMinute();
    return gm < 0 ? 0 : Math.floor(gm / 1440) + 1;
  }

  setSpeed(s: Speed) {
    this.speed = s;
    this.owed = 0;
    this.dirty = true;
  }

  /** 玩家操作：排在下一個 step。token 給回傳值配對用。 */
  input(name: string, args: any, token: number) {
    const a = { ...args };
    this.pending.set(a, token);
    this.queued.push({ name, args: a });
  }
  private queued: Array<{ name: string; args: any }> = [];

  skipTo(kind: Skip['kind']) {
    const k = this.session.k;
    const gm = this.session.gameMinute();
    let target: number;
    if (kind === 'morning') {
      // 一天從卯正（遊戲分 0、1440、…）開始；跳到下一個卯正
      const next = gm < 0 ? 0 : (Math.floor(gm / 1440) + 1) * 1440;
      target = k + Math.max(1, next - Math.max(gm, 0));
    } else target = k + NEXT_EVENT_MAX_DAYS * 1440;
    this.skip = { kind, targetStep: target, marks: eventMarks(this.session.game.world) };
    this.dirty = true;
  }

  cancelSkip() {
    this.skip = undefined;
    this.dirty = true;
  }

  /** 跑 n 步（不看倍速；工具與測試用）。 */
  advance(n: number): CoreOutput {
    return this.run(n);
  }

  /** 經過 dtMs 實際毫秒：依倍速（或跳躍中）跑 step。 */
  frame(dtMs: number): CoreOutput {
    if (this.skip) return this.run(Math.min(MAX_STEPS_PER_FRAME, this.skip.targetStep - this.session.k));
    if (this.speed === 0) {
      // 暫停中仍處理玩家操作（排到下一步，不跑）
      return this.run(0);
    }
    this.owed += (dtMs / 1000) * this.speed * STEPS_PER_SECOND_AT_1X;
    const n = Math.min(MAX_STEPS_PER_FRAME, Math.floor(this.owed));
    this.owed -= n;
    if (this.owed > MAX_STEPS_PER_FRAME) this.owed = 0; // 跟不上就丟掉欠的（實際倍速會低於設定）
    return this.run(n);
  }

  private run(n: number): CoreOutput {
    const out: CoreOutput = { events: [], inputResults: [] };
    const s = this.session;
    const posOf = (id: string) => {
      const p = s.game.world.players.get(id as any);
      return p ? { x: p.position.x, y: p.position.y } : undefined;
    };
    for (let i = 0; i < n; i++) {
      const marks = eventMarks(s.game.world);
      const extra = this.queued.splice(0);
      const { inputs, result } = s.step(extra);
      for (const c of result.completedInputs) {
        const input = inputs.find((x) => (x._id ?? `input:${x.number}`) === c.inputId);
        const token = input && this.pending.get(input.args);
        if (token !== undefined) {
          this.pending.delete(input!.args);
          out.inputResults.push({ token, value: c.returnValue });
        }
      }
      const evs = keyEventsBetween(marks, s.game.world, posOf);
      out.events.push(...evs);
      const day = this.day();
      if (day !== this.lastDay) {
        this.lastDay = day;
        out.newDay = day;
      }
      this.dirty = true;
      if (this.skip) {
        if (this.skip.kind === 'next-event' && evs.length) this.skip = undefined;
        else if (s.k >= this.skip.targetStep) this.skip = undefined;
        if (!this.skip) break;
      } else if (evs.length && this.autoSlow && this.speed > 4) {
        // 重要事件：自動降到 1× 並聚焦（畫面看 events[].at）
        this.speed = 1;
        this.owed = 0;
        break;
      }
    }
    if (this.dirty) {
      out.view = this.view();
      this.dirty = false;
    }
    return out;
  }

  view(): CoreView {
    const g = this.session.game;
    const v: CoreView = {
      world: g.world.serialize(),
      engineTime: g.engine.currentTime ?? 0,
      gameMinute: this.session.gameMinute(),
      steps: this.session.k,
      speed: this.speed,
      skipping: this.skip?.kind,
      messages: this.session.messages.slice(-30),
    };
    const descKey = g.playerDescriptions.size * 1000 + g.agentDescriptions.size;
    if (descKey !== this.descSent) {
      this.descSent = descKey;
      v.descriptions = {
        playerDescriptions: [...g.playerDescriptions.values()].map((d) => d.serialize()),
        agentDescriptions: [...g.agentDescriptions.values()].map((d) => d.serialize()),
        worldMap: g.worldMap.serialize(),
      };
    }
    return v;
  }

  /** 下一次 view 重新帶人物描述（畫面重新整理後要）。 */
  resendDescriptions() {
    this.descSent = -1;
    this.dirty = true;
  }

  hash(): string {
    return this.session.game.wuxiaHash();
  }

  save(label?: string): SaveFile {
    return makeSave(this.session, this.initial, { agents: this.agents, label });
  }
}
