// 武俠小鎮 W0：可序列化的種子亂數（mulberry32）。
// 引擎內（step 期間）一律用 game.rng()，狀態存在 world.wuxia.rng，跟著 step diff 存檔，重播時從存檔接續。

export type RngState = {
  algo: 'mulberry32';
  s: number; // uint32
};

export function seedRng(seed: number): RngState {
  if (!Number.isFinite(seed)) {
    throw new Error(`Invalid rng seed: ${seed}`);
  }
  // 先把種子打散一次，避免相鄰種子（7、8）開頭幾個值太像。
  let h = Math.trunc(seed) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return { algo: 'mulberry32', s: h };
}

/** 回傳 [0, 1) 的浮點數，並推進 state（就地修改）。 */
export function nextFloat(state: RngState): number {
  if (state.algo !== 'mulberry32') {
    throw new Error(`Unknown rng algo: ${(state as any).algo}`);
  }
  state.s = (state.s + 0x6d2b79f5) >>> 0;
  let t = state.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 回傳 uint32，並推進 state。 */
export function nextUint32(state: RngState): number {
  return Math.floor(nextFloat(state) * 4294967296) >>> 0;
}

/** 用 rng 產生 UUID v4 格式的字串（取代 crypto.randomUUID，可重播）。 */
export function rngUuid(next: () => number): string {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(next() * 256) & 0xff);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 工具用：獨立的亂數產生器（不碰 world 狀態），給無頭模擬的「規則替身」用。 */
export function makeRng(seed: number): () => number {
  const state = seedRng(seed);
  return () => nextFloat(state);
}
