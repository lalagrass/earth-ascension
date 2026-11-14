// 武俠小鎮 A2（#575 審查補充第 1 項）：新增的 6 位鎮民依 seed 從候選池抽。
// 不耗 game.rng()（世界亂數不受影響）：用 seed 衍生的獨立亂數，同 seed 永遠抽到同樣 6 位、同樣順序。
import { nextFloat, seedRng } from '../rng';
import { DRAW_COUNT, POOL, Profile } from './data';

export function drawFolk(seed: number): Profile[] {
  const rng = seedRng(Math.trunc(seed) * 7919 + 575);
  const idx = POOL.map((_, i) => i);
  // Fisher–Yates 前 DRAW_COUNT 個
  for (let i = 0; i < DRAW_COUNT && i < idx.length; i++) {
    const j = i + Math.floor(nextFloat(rng) * (idx.length - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, DRAW_COUNT).map((i) => POOL[i]);
}
