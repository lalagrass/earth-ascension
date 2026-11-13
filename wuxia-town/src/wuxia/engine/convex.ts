// 武俠小鎮 A1：convex 實作——原本的 Convex 後端（保留給多人與 LLM 對話模式）。
// 狀態用 Convex 的即時查詢（worldState、gameDescriptions），input 走上游的 sendInput mutation。
// 引擎在伺服器上固定 1 step／秒，所以倍速、跳時間、存讀檔都不支援；存檔請用「匯出 journal」（W9）。
import type { ConvexReactClient } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { waitForInput } from '../../hooks/sendInput';
import type { EngineView, KeyEvent, SaveFile, Speed, WuxiaEngine } from './index';
import { eventMarks, keyEventsBetween, EventMarks } from './events';

export class ConvexEngine implements WuxiaEngine {
  readonly kind = 'convex' as const;
  private unsubs: Array<() => void> = [];
  constructor(
    private client: ConvexReactClient,
    private worldId: Id<'worlds'>,
    private engineId: Id<'engines'>,
  ) {}

  subscribe(cb: (v: EngineView, e: KeyEvent[]) => void) {
    const ws = this.client.watchQuery(api.world.worldState, { worldId: this.worldId });
    const ds = this.client.watchQuery(api.world.gameDescriptions, { worldId: this.worldId });
    let marks: EventMarks | undefined;
    const emit = () => {
      const w = ws.localQueryResult();
      const d = ds.localQueryResult();
      if (!w || !d) return;
      const world: any = w.world;
      const events = marks ? keyEventsBetween(marks, world, () => undefined) : [];
      marks = eventMarks(world);
      cb(
        {
          world,
          descriptions: d as any,
          engineTime: w.engine.currentTime ?? 0,
          gameMinute: -1,
          steps: w.engine.generationNumber ?? 0,
          speed: 1,
          messages: [],
        },
        events,
      );
    };
    const u1 = ws.onUpdate(emit);
    const u2 = ds.onUpdate(emit);
    emit();
    const off = () => {
      u1();
      u2();
    };
    this.unsubs.push(off);
    return off;
  }
  async sendInput(name: string, args: any): Promise<any> {
    const id = await this.client.mutation(api.world.sendWorldInput, { engineId: this.engineId, name: name as any, args });
    return waitForInput(this.client, id);
  }
  private unsupported(): never {
    throw new Error('convex 模式不支援倍速、跳時間與存讀檔（引擎在伺服器上 1 step／秒）');
  }
  setSpeed(_s: Speed) {
    this.unsupported();
  }
  setAutoSlow(_on: boolean) {}
  skip(_k: 'morning' | 'next-event') {
    this.unsupported();
  }
  save(): Promise<SaveFile> {
    return Promise.reject(new Error('convex 模式請用「匯出 journal」'));
  }
  hash(): Promise<{ hash: string; steps: number; gameMinute: number }> {
    return Promise.reject(new Error('convex 模式的 hash 在 wuxiaSteps 表（wuxia:journal export）'));
  }
  onNewDay() {
    return () => {};
  }
  dispose() {
    for (const u of this.unsubs) u();
  }
}
