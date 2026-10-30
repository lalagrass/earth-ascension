// Loop 32：Lehmer 亂數流的種子雜湊混合。舊寫法第 1 抽與 seed 成線性（小種子全擠在 0 附近）。
export const M = 2147483647;
export function seedMix(seed, salt) {
  let h = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt >>> 0, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
  return ((h >>> 0) % (M - 1)) + 1;
}
