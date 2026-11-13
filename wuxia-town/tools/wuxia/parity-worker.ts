// 武俠小鎮 A1：wuxia:parity 的 Node worker_threads 端——包的是瀏覽器 Worker 同一個 LocalCore（src/wuxia/engine/core.ts）。
import { parentPort, workerData } from 'node:worker_threads';
import { LocalCore, Speed } from '../../src/wuxia/engine/core';
import { quietConsole } from './sim';

quietConsole(false);

const { seed, steps, speed, frameMs } = workerData as { seed: number; steps: number; speed: Speed; frameMs: number };
const core = new LocalCore();
core.init({ kind: 'new', world: { seed } });
core.autoSlow = false;
if (speed === 0) core.advance(steps);
else {
  core.setSpeed(speed);
  // 用固定的假 dt 模擬畫面更新：每次 frame 依倍速跑幾步，直到剛好 steps 步（最後一段用 advance 補齊）
  while (core.session.k < steps) {
    const before = core.session.k;
    const left = steps - before;
    const perFrame = (frameMs / 1000) * speed;
    if (perFrame > left) core.advance(left);
    else core.frame(frameMs);
  }
}
parentPort!.postMessage({ hash: core.hash(), steps: core.session.k, gameMinute: core.session.gameMinute() });
