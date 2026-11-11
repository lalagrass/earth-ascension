// 武俠小鎮 W0：world 文件上的 `wuxia` 欄位（#549 第 2、4 節）。
import worldConfig from '../../data/wuxia/world.config.json';
import { RngState, seedRng } from './rng';
import { ELEMENTS } from './registry';

export type WuxiaConfig = {
  /** 元素開關，鍵是元素 id（例如 "w03-life"）。沒列到的元素視為關閉。 */
  elements: Record<string, boolean>;
  seed: number;
  /** 1 實秒 = timeScale 遊戲秒（W1 起用來算遊戲時鐘，見 convex/wuxia/clock.ts）。 */
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
  /** W1：遊戲時鐘起點（引擎時間 ms）。第一個有元素開啟的 tick 寫入；見 convex/wuxia/clock.ts。 */
  clockEpoch?: number;
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
    // W1：只記開啟的元素（沒列到＝關閉）。關掉 w01-skin 的世界因此跟 W0 的世界逐位元組相同。
    enabled: pruneUnmetRequires(
      Object.fromEntries(Object.entries(config.elements).filter(([, on]) => on === true)),
    ),
    rng: seedRng(config.seed),
    elements: {},
  };
}

/**
 * W2：只凍結「真的會生效」的元素。已登記的元素若 requires 沒開（例如關掉 w01-skin 時的 w02-folk），
 * 就不記進 enabled，這樣 `--off w01-skin` 的世界仍跟 W0 逐位元組相同。未登記的 id 原樣保留。
 */
export function pruneUnmetRequires(enabled: Record<string, boolean>): Record<string, boolean> {
  const out = { ...enabled };
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of Object.keys(out)) {
      const element = ELEMENTS.find((e) => e.id === id);
      if (element && !(element.requires ?? []).every((r) => out[r])) {
        delete out[id];
        changed = true;
      }
    }
  }
  return out;
}
