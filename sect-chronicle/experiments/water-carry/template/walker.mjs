// BL-V04 小樣的權威狀態（#181）：一個人挑水的階段與走了多遠，固定步進推進。
// 這是示意用的小模型（數值沿 spikes/shared/scene.json 的播放片段），不是正式世界，也不產水。
// 畫面只讀 view()，所以動畫、播放倍率、畫面幀率都不會改變何時到達或走多遠。
export const STEP_MS = 50;
export const PHASES = ['down', 'dip', 'up', 'pour', 'rest'];

export function createWalker({ pathLength, speedEmpty = 60, speedLoad = 45, dipMs = 4000, pourMs = 4000, restMs = 3000, restEvery = 2, start = 0 }) {
  const dur = { down: pathLength / speedEmpty * 1000, dip: dipMs, up: pathLength / speedLoad * 1000, pour: pourMs, rest: restMs };
  let s;
  const reset = () => { s = { phase: start, ms: 0, trips: 0, steps: 0 }; };
  const next = () => {
    const name = PHASES[s.phase];
    if (name === 'pour') { s.trips += 1; s.phase = restEvery && s.trips % restEvery === 0 ? 4 : 0; }
    else s.phase = name === 'rest' ? 0 : s.phase + 1;
    s.ms = 0;
  };
  reset();
  return {
    step() {
      s.steps += 1;
      s.ms += STEP_MS;
      while (s.ms >= dur[PHASES[s.phase]]) { const over = s.ms - dur[PHASES[s.phase]]; next(); s.ms = over; }
    },
    reset,
    view() {
      const phase = PHASES[s.phase];
      const k = Math.min(1, s.ms / dur[phase]);
      const speed = phase === 'down' ? speedEmpty : phase === 'up' ? speedLoad : 0;
      // travelled：本階段走了幾個場景單位；動畫用它換幀，腳步才跟得上真的位移
      return { phase, k, travelled: s.ms * speed / 1000, trips: s.trips, steps: s.steps };
    }
  };
}

// 固定步進時鐘：真實時間×倍率累積，每 STEP_MS 推一步；一幀最多補 250ms，切背景回來不會暴衝
export function createClock({ maxFrameMs = 250 } = {}) {
  let acc = 0;
  return {
    advance(realMs, speed, stepFn) {
      acc += Math.min(realMs, maxFrameMs) * speed;
      let n = 0;
      while (acc >= STEP_MS) { acc -= STEP_MS; stepFn(); n++; }
      return n;
    },
    reset() { acc = 0; }
  };
}
