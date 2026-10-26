// BL-V04 共用動作播放（#181）：給「權威狀態＋人物的 sheet」，回答「這一刻該顯示哪一幀」。
// 所有人物都走這一個函式；人物之間只差 sheet（外觀）與 sheet 裡有哪些動作。純函式、不碰 Pixi，可在 Node 測。
export function createAnimator(template, sheet) {
  const have = new Set(Object.keys(sheet.animations || {}));
  // 狀態 → 動作：同一 phase 有多列時，條件越多的越先比（例如 up＋grown 先於 up）
  const wanted = (view, flags = {}) => {
    const rows = template.states.filter((r) => r.phase === view.phase).sort((a, b) => Object.keys(b).length - Object.keys(a).length);
    const row = rows.find((r) => Object.keys(r).every((k) => k === 'phase' || k === 'action' || r[k] === !!flags[k]));
    return (row || { action: 'idle' }).action;
  };
  // 缺的動作沿模板的 fallback 退回，最後一定落在 idle；退回過就標出來，讓畫面看得到
  const resolve = (action) => {
    const chain = [action];
    let a = action;
    while (!have.has(a)) {
      const fb = (template.actions[a] && template.actions[a].fallback) || 'idle';
      if (chain.includes(fb)) break;
      chain.push(fb);
      a = fb;
    }
    return { action: a, chain };
  };
  return {
    pick(view, flags = {}) {
      const requested = wanted(view, flags);
      const { action, chain } = resolve(requested);
      const def = template.actions[action];
      const frames = sheet.animations[action];
      // 循環動作用「走了多遠 ÷ 步幅」換幀；只播一次的動作停在第一幀。完全不看真實時間。
      const index = def.loop && def.stride ? Math.floor(view.travelled / def.stride) % frames.length : 0;
      return { requested, action, fallback: action !== requested, chain, index, frame: frames[index] };
    },
    has: (a) => have.has(a),
    resolve
  };
}

// 路線換算：u=0 在水缸（上），u=1 在泉水（下）。和 V3 展示同一個算法。
export function pathTool(points) {
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const length = seg.reduce((a, b) => a + b, 0);
  const at = (u) => {
    let r = Math.max(0, Math.min(1, u)) * length;
    for (let i = 0; i < seg.length; i++) {
      if (r <= seg[i] || i === seg.length - 1) {
        const k = seg[i] ? Math.min(1, r / seg[i]) : 0;
        return { x: points[i][0] + (points[i + 1][0] - points[i][0]) * k, y: points[i][1] + (points[i + 1][1] - points[i][1]) * k, dx: points[i + 1][0] - points[i][0] };
      }
      r -= seg[i];
    }
  };
  // 每個階段人在哪、面向哪：只由階段與進度決定
  const place = (view) => {
    if (view.phase === 'down') { const p = at(view.k); return { x: p.x, y: p.y, face: p.dx >= 0 ? 1 : -1 }; }
    if (view.phase === 'up') { const p = at(1 - view.k); return { x: p.x, y: p.y, face: -p.dx >= 0 ? 1 : -1 }; }
    if (view.phase === 'dip') { const p = at(1); return { x: p.x, y: p.y, face: -1 }; }
    const p = at(0);
    return { x: p.x, y: p.y, face: 1 };
  };
  return { length, at, place };
}
