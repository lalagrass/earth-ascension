// V2 共用播放片段：依 scene.json 的 playback 推算主角位置、朝向與動作幀。不是正式模型，數值是示意。
// 只用固定步進（step 一次走 STEP_MS），畫面幀率不影響結果；Godot 版 playback.gd 照同一規則實作。
export const STEP_MS = 1000 / 60;

export function createPlayback(scene) {
  const pts = scene.path.points;
  const segLen = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segLen.reduce((a, b) => a + b, 0);
  const steps = scene.playback.steps;
  const s = { step: 0, ms: 0, tick: 0, trips: 0, vatLevel: 1, restAfterTrip: false, resting: false };

  // 路線上 0..1 的位置（0 = 道館端，1 = 泉水端）
  function at(u) {
    let r = Math.max(0, Math.min(1, u)) * total;
    for (let i = 0; i < segLen.length; i++) {
      if (r <= segLen[i] || i === segLen.length - 1) {
        const k = segLen[i] ? Math.min(1, r / segLen[i]) : 0;
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, dx: pts[i + 1][0] - pts[i][0] };
      }
      r -= segLen[i];
    }
  }
  const durOf = (st) => (st.kind === 'walk' ? Math.abs(st.to - st.from) * total / st.speed * 1000 : st.ms);

  function advance() {
    s.tick++;
    if (s.resting) return;
    s.ms += STEP_MS;
    const st = steps[s.step];
    if (s.ms >= durOf(st)) {
      s.ms -= durOf(st);
      if (st.vatLevelAfter != null) s.vatLevel = st.vatLevelAfter;
      if (s.step === steps.length - 1) {
        s.trips++;
        if (s.restAfterTrip) { s.resting = true; s.restAfterTrip = false; s.ms = 0; s.step = 0; return; }
      }
      s.step = (s.step + 1) % steps.length;
      if (s.step === 0) s.vatLevel = 1; // 示意：下一趟出發時水缸回到中等水位
    }
  }

  function view() {
    if (s.resting) {
      const p = at(0);
      return { x: p.x, y: p.y, face: -1, back: false, frame: 'idle', label: '休息（本趟後休息已生效）', progress: 1, vatLevel: s.vatLevel, trips: s.trips, resting: true };
    }
    const st = steps[s.step];
    const k = Math.min(1, s.ms / durOf(st));
    if (st.kind === 'walk') {
      const u = st.from + (st.to - st.from) * k;
      const p = at(u);
      const goingDown = st.to > st.from;
      const dx = goingDown ? p.dx : -p.dx;
      const n = Math.floor(s.ms / st.frameMs) % 4;
      return { x: p.x, y: p.y, face: dx >= 0 ? 1 : -1, back: !goingDown, frame: `${st.anim}-${n}`, label: st.label, progress: k, vatLevel: s.vatLevel, trips: s.trips, resting: false };
    }
    const p = at(s.step === 1 ? 1 : 0);
    return { x: p.x, y: p.y, face: s.step === 1 ? -1 : 1, back: false, frame: st.anim, label: st.label, progress: k, vatLevel: s.vatLevel, trips: s.trips, resting: false };
  }

  return {
    state: s,
    total,
    advance,
    view,
    order(kind) {
      if (kind === 'restAfterTrip') { s.restAfterTrip = true; return { ok: true, when: '本趟倒水完成時生效' }; }
      return { ok: false };
    },
    cancelOrder() { s.restAfterTrip = false; },
    resume() { if (s.resting) { s.resting = false; } },
  };
}
