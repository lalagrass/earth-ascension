// 武俠小鎮 A1：畫面 ↔ 單機引擎 Worker 的訊息格式。
import type { CoreInit, CoreView, Speed } from './core';
import type { KeyEvent } from './events';
import type { SaveFile } from './save';

export type ToWorker =
  | { t: 'init'; init: CoreInit; id: number }
  | { t: 'speed'; speed: Speed }
  | { t: 'autoSlow'; on: boolean }
  | { t: 'skip'; kind: 'morning' | 'next-event' }
  | { t: 'cancelSkip' }
  | { t: 'input'; name: string; args: any; id: number }
  | { t: 'save'; label?: string; id: number }
  | { t: 'hash'; id: number }
  | { t: 'resend' };

export type FromWorker =
  | { t: 'reply'; id: number; value: any }
  | { t: 'view'; view: CoreView; events: KeyEvent[] }
  | { t: 'newDay'; day: number }
  | { t: 'error'; message: string };

export type { SaveFile };
