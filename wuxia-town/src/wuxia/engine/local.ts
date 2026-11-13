// 武俠小鎮 A1：local 實作——在瀏覽器開一個 Web Worker（worker.ts）跑引擎。
import type { CoreInit } from './core';
import type { EngineView, KeyEvent, SaveFile, Speed, WuxiaEngine } from './index';
import type { FromWorker, ToWorker } from './protocol';

export class LocalEngine implements WuxiaEngine {
  readonly kind = 'local' as const;
  private worker: Worker;
  private nextId = 1;
  private waiting = new Map<number, (v: any) => void>();
  private subs = new Set<(v: EngineView, e: KeyEvent[]) => void>();
  private daySubs = new Set<(d: number) => void>();
  private descriptions?: EngineView['descriptions'];
  onError?: (message: string) => void;

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.t === 'reply') {
        this.waiting.get(m.id)?.(m.value);
        this.waiting.delete(m.id);
      } else if (m.t === 'view') {
        if (m.view.descriptions) this.descriptions = m.view.descriptions;
        const view = { ...m.view, descriptions: this.descriptions };
        for (const s of this.subs) s(view, m.events);
      } else if (m.t === 'newDay') {
        for (const s of this.daySubs) s(m.day);
      } else if (m.t === 'error') {
        console.error(m.message);
        this.onError?.(m.message);
      }
    };
  }

  private post(m: ToWorker) {
    this.worker.postMessage(m);
  }
  private call<T>(make: (id: number) => ToWorker): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve) => {
      this.waiting.set(id, resolve);
      this.post(make(id));
    });
  }

  init(init: CoreInit): Promise<{ ok: true } | { ok: false; reason: string }> {
    return this.call((id) => ({ t: 'init', init, id }));
  }
  subscribe(cb: (v: EngineView, e: KeyEvent[]) => void) {
    this.subs.add(cb);
    this.post({ t: 'resend' });
    return () => void this.subs.delete(cb);
  }
  onNewDay(cb: (d: number) => void) {
    this.daySubs.add(cb);
    return () => void this.daySubs.delete(cb);
  }
  sendInput(name: string, args: any): Promise<any> {
    return this.call((id) => ({ t: 'input', name, args, id }));
  }
  setSpeed(speed: Speed) {
    this.post({ t: 'speed', speed });
  }
  setAutoSlow(on: boolean) {
    this.post({ t: 'autoSlow', on });
  }
  skip(kind: 'morning' | 'next-event') {
    this.post({ t: 'skip', kind });
  }
  save(label?: string): Promise<SaveFile> {
    return this.call((id) => ({ t: 'save', label, id }));
  }
  hash(): Promise<{ hash: string; steps: number; gameMinute: number }> {
    return this.call((id) => ({ t: 'hash', id }));
  }
  /** 測試用：直接跑 n 步並回傳 hash */
  advance(steps: number): Promise<{ hash: string; steps: number; gameMinute: number }> {
    return this.call((id) => ({ t: 'advance', steps, id }));
  }
  dispose() {
    this.worker.terminate();
  }
}
