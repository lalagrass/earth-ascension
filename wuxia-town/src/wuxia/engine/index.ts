// 武俠小鎮 A1：畫面跟引擎之間的薄介面（#564 第 1 項）。兩個實作：
//   local  （local.ts）：瀏覽器 Web Worker 跑無頭模擬同一份引擎；不需要後端、不打 LLM。npm run build:local 的預設。
//   convex （convex.ts）：原本的 Convex 後端（多人、LLM 對話模式）；倍速與存檔不支援（引擎在伺服器上 1 step／秒）。
import type { CoreView, Speed } from './core';
import type { KeyEvent } from './events';
import type { SaveFile } from './save';

export type EngineView = CoreView;
export type { Speed, KeyEvent, SaveFile };

export interface WuxiaEngine {
  readonly kind: 'local' | 'convex';
  /** 有新狀態時呼叫；回傳取消訂閱 */
  subscribe(cb: (view: EngineView, events: KeyEvent[]) => void): () => void;
  sendInput(name: string, args: any): Promise<any>;
  /** 以下 convex 模式不支援（呼叫會丟錯） */
  setSpeed(speed: Speed): void;
  setAutoSlow(on: boolean): void;
  skip(kind: 'morning' | 'next-event'): void;
  save(label?: string): Promise<SaveFile>;
  hash(): Promise<{ hash: string; steps: number; gameMinute: number }>;
  onNewDay(cb: (day: number) => void): () => void;
  dispose(): void;
}
