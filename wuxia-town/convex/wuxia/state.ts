// 武俠小鎮 W0：world 文件上的 `wuxia` 欄位（#549 第 2、4 節）。
import worldConfig from '../../data/wuxia/world.config.json';
import { RngState, seedRng } from './rng';

export type WuxiaConfig = {
  /** 元素開關，鍵是元素 id（例如 "w03-life"）。沒列到的元素視為關閉。 */
  elements: Record<string, boolean>;
  seed: number;
  /** 1 實秒 = timeScale 遊戲秒（W0 只記錄，不用在規則裡）。 */
  timeScale: number;
};

export type WuxiaState = {
  v: 1;
  seed: number;
  timeScale: number;
  /** 建立世界時從設定檔凍結的元素開關；之後重播不依賴設定檔內容。 */
  enabled: Record<string, boolean>;
  rng: RngState;
  /** 各元素自己的狀態，鍵是元素 id。 */
  elements: Record<string, unknown>;
};

export const defaultWuxiaConfig: WuxiaConfig = worldConfig as WuxiaConfig;

export function initWuxiaState(config: WuxiaConfig = defaultWuxiaConfig): WuxiaState {
  return {
    v: 1,
    seed: config.seed,
    timeScale: config.timeScale,
    enabled: { ...config.elements },
    rng: seedRng(config.seed),
    elements: {},
  };
}
