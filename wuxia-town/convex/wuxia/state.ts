// 武俠小鎮 W0：world 文件上的 `wuxia` 欄位（#549 第 2、4 節）。
import worldConfig from '../../data/wuxia/world.config.json';
import { RngState, seedRng } from './rng';

export type WuxiaConfig = {
  /** 元素開關，鍵是元素 id（例如 "w03-life"）。沒列到的元素視為關閉。 */
  elements: Record<string, boolean>;
  seed: number;
  /** 1 實秒 = timeScale 遊戲秒（W0 只記錄，不用在規則裡）。 */
  timeScale: number;
  /** #562 W0-2：true 時沒有瀏覽器連線也不會因閒置 5 分鐘被停（長時間實跑用）。預設 false。 */
  keepAlive?: boolean;
  /** #562 W0-1：embedding 維度，綁在 memoryEmbeddings 的向量索引上（Ollama mxbai 1024、OpenAI 1536、Together 768）。 */
  embeddingDimension?: number;
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

/** keepAlive：設定檔 keepAlive=true，或 Convex 環境變數 WUXIA_KEEP_ALIVE=1。 */
export function keepAliveEnabled(config: WuxiaConfig = defaultWuxiaConfig): boolean {
  return config.keepAlive === true || process.env.WUXIA_KEEP_ALIVE === '1';
}

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
