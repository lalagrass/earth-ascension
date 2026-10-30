import { FIRE, STRIKE, TRIAL } from './data.mjs';
import { shapeOf } from './forms.mjs';
// 畫面只讀 state，不改規則狀態。
export const TILE = 20;

const TILE_COLOR = {
  '.': '#9db978', ':': '#c9b48a', '_': '#b89a72', '#': '#6b4f3a',
  'T': '#9db978', 'R': '#a7ad8f', 'W': '#5b9bc4', 'B': '#9db978', '=': '#8a6a45',
  ',': '#a3b77c', ';': '#b3b39a', 'F': '#9db978', 'f': '#9db978', 'g': '#8a6a45', 'w': '#c4a77a',
};

// 依氣質分組上色：NF 綠、NT 紫、SJ 藍、SP 橙。
export function robeColor(type) {
  const n = type[1] === 'N';
  if (n && type[2] === 'F') return '#4f9a6a';
  if (n) return '#7a5ba8';
  if (type[3] === 'J') return '#3f6fb0';
  return '#d08a3a';
}

function hashXY(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function drawMap(ctx, map) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const t = map[y][x];
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = TILE_COLOR[t] || '#f0f';
      ctx.fillRect(px, py, TILE, TILE);
      const r = hashXY(x, y);
      if (t === '.' && r < 0.25) {
        ctx.fillStyle = '#8eab6a';
        ctx.fillRect(px + r * 14, py + 6 + r * 8, 3, 3);
      } else if (t === 'T') {
        ctx.fillStyle = '#5c4630';
        ctx.fillRect(px + 8, py + 11, 4, 8);
        ctx.fillStyle = r < 0.5 ? '#3f7a45' : '#4d8a4f';
        ctx.beginPath(); ctx.arc(px + 10, py + 9, 8 + r * 2, 0, Math.PI * 2); ctx.fill();
      } else if (t === 'R') {
        ctx.fillStyle = '#7d7f73';
        ctx.beginPath(); ctx.ellipse(px + 10, py + 12, 8, 6 + r * 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9a9c8e';
        ctx.beginPath(); ctx.ellipse(px + 8, py + 10, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      } else if (t === 'B') {
        ctx.fillStyle = '#5f8d4e';
        ctx.beginPath(); ctx.arc(px + 10, py + 11, 8, 0, Math.PI * 2); ctx.fill();
      } else if (t === 'W') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.moveTo(px + 3, py + 8 + r * 6); ctx.lineTo(px + 12, py + 6 + r * 6); ctx.stroke();
      } else if (t === '=') {
        ctx.fillStyle = '#6e5133';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 5, py, 2, TILE);
      } else if (t === ',') {
        ctx.fillStyle = '#7a5c3c'; ctx.beginPath(); ctx.ellipse(px + 10, py + 13, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      } else if (t === ';') {
        ctx.fillStyle = '#8d8f82';
        for (let i = 0; i < 3; i++) ctx.fillRect(px + 4 + i * 5, py + 9 + ((i * 3) % 5), 3, 3);
      } else if (t === 'F') {
        ctx.fillStyle = '#7a5631';
        ctx.fillRect(px + 2, py + 2, 3, 16); ctx.fillRect(px + 15, py + 2, 3, 16);
        ctx.fillRect(px, py + 6, TILE, 3); ctx.fillRect(px, py + 12, TILE, 3);
      } else if (t === 'f') {
        // 斷柵：倒下的木條。
        ctx.fillStyle = '#7a5631';
        ctx.fillRect(px + 2, py + 12, 3, 6); ctx.fillRect(px + 15, py + 10, 3, 8);
        ctx.save(); ctx.translate(px + 10, py + 14); ctx.rotate(0.5); ctx.fillRect(-9, -1.5, 18, 3); ctx.restore();
      } else if (t === 'w') {
        // 外功場：夯土地，邊上幾道踩痕。
        ctx.fillStyle = '#c4a77a'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#b09264'; ctx.fillRect(px + 3, py + 13, 5, 2); ctx.fillRect(px + 12, py + 5, 4, 2);
      } else if (t === 'g') {
        // 菜畦：翻過的土壟。
        ctx.fillStyle = '#6e5236';
        for (let i = 0; i < 3; i++) ctx.fillRect(px + 2, py + 3 + i * 6, TILE - 4, 2);
      } else if (t === '#') {
        ctx.fillStyle = '#58402e';
        ctx.fillRect(px, py + 8, TILE, 2);
      }
    }
  }
}

export function drawPois(ctx, pois) {
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (const p of pois) {
    ctx.fillStyle = 'rgba(40,30,20,0.45)';
    ctx.fillText(p.label, p.x * TILE + TILE / 2, p.y * TILE + TILE + 10);
  }
}

export function drawPeople(ctx, state, selectedId) {
  const sorted = [...state.people].sort((a, b) => a.y - b.y);
  ctx.textAlign = 'center';
  for (const p of sorted) {
    const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
    if (p.id === selectedId) {
      ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 7, 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 7, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = robeColor(p.type);
    ctx.beginPath(); ctx.moveTo(cx - 7, cy + 7); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy - 4); ctx.fill();
    ctx.fillStyle = '#f1d3b0';
    ctx.beginPath(); ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(cx, cy - 10, 5, Math.PI, 0); ctx.fill();
    if (p.protagonist) { ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - 5, cy - 11, 10, 2); }
    if (p.guest) {
      // 訪客：背上的包袱與名字前的「客」。
      ctx.fillStyle = '#8c6d46'; ctx.beginPath(); ctx.arc(cx - 6, cy - 1, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// 頭頂字一起排：巢名、人名、行動字依優先序放，跟已放好的框重疊就往上挪（人名）或不畫（行動字）。
// loop 10：原本每種字各自判斷擠不擠，三人同行時行動字疊在一起、山寨的名字被守衛蓋住（retro 3）。
let placed = [];
export const labelBoxes = () => placed;
export function drawLabels(ctx, state, selectedId) {
  placed = [];
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  const hit = (b) => placed.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
  const put = (text, cx, cy, font, color, kind, nudge, dir = -1) => {
    ctx.font = font;
    const w = ctx.measureText(text).width + 4, h = 12;
    for (let k = 0; k <= nudge; k++) {
      const b = { x: cx - w / 2, y: cy - 10 + dir * k * 12, w, h, text, kind };
      if (hit(b)) continue;
      placed.push(b);
      ctx.strokeText(text, cx, b.y + 10); ctx.fillStyle = color; ctx.fillText(text, cx, b.y + 10);
      return true;
    }
    return false;
  };
  for (const n of state.nests ?? []) {
    const cx = n.x * TILE + TILE / 2, cy = n.y * TILE + TILE / 2;
    put(n.cleared ? `${n.label}（已拆）` : n.label, cx, cy + 26, '11px sans-serif', n.cleared ? 'rgba(40,30,20,0.6)' : '#3a2a1a', 'nest', 0);
  }
  const order = [...state.people].sort((a, b) => (b.id === selectedId) - (a.id === selectedId) || (a.id < b.id ? -1 : 1));
  for (const p of order) {
    const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
    put(p.guest ? `客·${p.name}` : p.name, cx, cy - 16, 'bold 11px sans-serif', p.guest ? '#7a4b1c' : '#2b2118', 'name', 2);
  }
  for (const p of order) {
    const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
    put(p.actLabel, cx, cy + 19, '10px sans-serif', '#3d3326', p.id === selectedId ? 'act-selected' : 'act', 1, 1);
  }
}

// 日夜色調：夜深最暗。
export function drawDaylight(ctx, w, h, hour, minute) {
  const t = hour + minute / 60;
  const dark = t < 5 ? 0.45 : t < 7 ? 0.45 * (7 - t) / 2 : t < 18 ? 0 : t < 20 ? 0.45 * (t - 18) / 2 : 0.45;
  if (dark <= 0) return;
  ctx.fillStyle = `rgba(20,25,60,${dark.toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
}

// ---------- M2 物件、莓果、存糧、氣泡 ----------
export function drawObjects(ctx, state) {
  for (const o of state.objects) {
    for (const [x, y] of o.slots) {
      const px = x * TILE, py = y * TILE;
      if (o.kind === 'bed') {
        ctx.fillStyle = '#d9c9a3'; ctx.fillRect(px + 2, py + 3, 16, 14);
        ctx.fillStyle = '#efe5cc'; ctx.fillRect(px + 3, py + 4, 6, 5);
      } else if (o.kind === 'table') {
        ctx.fillStyle = '#7a5a3a'; ctx.fillRect(px + 1, py + 1, 18, 18);
      } else if (o.kind === 'hearth') {
        ctx.fillStyle = '#5b5148'; ctx.beginPath(); ctx.arc(px + 10, py + 12, 9, 0, Math.PI * 2); ctx.fill();
        const cooking = o.users.some(Boolean);
        ctx.fillStyle = cooking ? '#f08a24' : '#3a3029';
        ctx.beginPath(); ctx.arc(px + 10, py + 12, 5, 0, Math.PI * 2); ctx.fill();
      } else if (o.kind === 'dummy') {
        // 樁立在站位右邊一格；人站在站位上對著樁出招。
        const qx = px + TILE;
        ctx.fillStyle = '#6e5133'; ctx.fillRect(qx + 7, py - 4, 6, 22);
        ctx.fillRect(qx + 2, py + 2, 16, 3); ctx.fillRect(qx + 4, py + 9, 12, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(qx + 10, py + 18, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      } else if (o.kind === 'post') {
        // 哨位：四腳木台＋欄杆，人站在台上。
        ctx.fillStyle = '#6e5133';
        ctx.fillRect(px + 1, py + 14, 3, 6); ctx.fillRect(px + 16, py + 14, 3, 6);
        ctx.fillStyle = '#9a7448'; ctx.fillRect(px - 2, py + 9, TILE + 4, 6);
        ctx.fillStyle = '#6e5133'; ctx.fillRect(px - 2, py + 2, 2, 8); ctx.fillRect(px + TILE, py + 2, 2, 8); ctx.fillRect(px - 2, py + 2, TILE + 4, 2);
      } else if (o.kind === 'bench') {
        ctx.fillStyle = '#8f9188'; ctx.fillRect(px + 1, py + 8, 18, 6);
        ctx.fillRect(px + 3, py + 14, 3, 4); ctx.fillRect(px + 14, py + 14, 3, 4);
      }
    }
  }
  drawTrial(ctx, state);
  const h = state.objects.find((o) => o.kind === 'hearth');
  const [hx, hy] = h.slots[0];
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  const label = `生莓 ${state.stock.raw}　熟飯 ${state.stock.meal}${FIRE.WOOD_PER_POT > 0 && state.stock.wood < FIRE.WOOD_PER_POT ? '　沒柴' : ''}`;
  ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.fillRect(hx * TILE + 22, hy * TILE - 2, ctx.measureText(label).width + 8, 16);
  ctx.fillStyle = '#5b2a1a'; ctx.fillText(label, hx * TILE + 26, hy * TILE + 10);
  for (const b of state.bushes) {
    ctx.fillStyle = '#c23b4a';
    for (let i = 0; i < b.berries; i++) ctx.fillRect(b.x * TILE + 5 + (i % 2) * 7, b.y * TILE + 5 + Math.floor(i / 2) * 7, 4, 4);
  }
}

export function drawBubbles(ctx, state) {
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  for (const p of state.people) {
    const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2;
    if (p.carry > 0) {
      ctx.fillStyle = '#c23b4a';
      for (let i = 0; i < p.carry; i++) ctx.fillRect(cx + 6 + i * 3, cy - 2, 3, 3);
    }
    if (p.load.wood > 0) { ctx.fillStyle = '#7a5631'; ctx.fillRect(cx - 9, cy - 14, 18, 4); }
    if (p.load.stone > 0) { ctx.fillStyle = '#8d8f82'; ctx.fillRect(cx - 5, cy - 16, 10, 6); }
    if (!p.bubble) continue;
    const w = ctx.measureText(p.bubble.text).width + 10;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8a7b66'; ctx.lineWidth = 1;
    ctx.fillRect(cx - w / 2, cy - 40, w, 16); ctx.strokeRect(cx - w / 2, cy - 40, w, 16);
    ctx.fillStyle = '#5b2a1a'; ctx.fillText(p.bubble.text, cx, cy - 28);
  }
}

// ---------- M3 倉堆、工地 ----------
export function drawBuild(ctx, state, PILE, blueprintOf) {
  const px = PILE.x * TILE, py = PILE.y * TILE;
  ctx.fillStyle = '#8a6a45';
  for (let i = 0; i < Math.min(6, Math.ceil(state.stock.wood / 3)); i++) ctx.fillRect(px - 8 + (i % 3) * 7, py + 10 - Math.floor(i / 3) * 4, 6, 4);
  ctx.fillStyle = '#8d8f82';
  for (let i = 0; i < Math.min(4, Math.ceil(state.stock.stone / 3)); i++) ctx.fillRect(px + 14 + (i % 2) * 6, py + 8 - Math.floor(i / 2) * 5, 5, 5);
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  const label = `倉堆 木${state.stock.wood} 石${state.stock.stone}`;
  const w = ctx.measureText(label).width + 8;
  ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.fillRect(px + 10 - w / 2, py + 18, w, 15);
  ctx.fillStyle = '#3d2b1a'; ctx.fillText(label, px + 10, py + 29);
  for (const site of state.sites) {
    const bp = blueprintOf(site.bp);
    let x0, y0, x1, y1;
    if (site.cells.length) {
      ctx.strokeStyle = 'rgba(120,70,30,0.9)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
      site.cells.forEach((c, i) => {
        if (site.kind === 'fence' && i < site.cellsDone) return;
        if (c.to === '#' || c.to === 'F') ctx.strokeRect(c.x * TILE + 2, c.y * TILE + 2, TILE - 4, TILE - 4);
      });
      ctx.setLineDash([]);
      x0 = Math.min(...site.cells.map((c) => c.x)); y0 = Math.min(...site.cells.map((c) => c.y));
      x1 = Math.max(...site.cells.map((c) => c.x));
    } else {
      const h = state.objects.find((o) => o.kind === 'hearth');
      [x0, y0] = h.slots[0]; x1 = x0;
    }
    const cx = ((x0 + x1 + 1) / 2) * TILE, cy = y0 * TILE - 6;
    const mat = ['wood', 'stone'].filter((m) => site.need[m]).map((m) => `${m === 'wood' ? '木' : '石'}${site.have[m]}/${site.need[m]}`).join(' ');
    const text = `${site.label} ${mat} 工${Math.floor(site.work)}/${site.workTotal}`;
    const tw = ctx.measureText(text).width + 8;
    ctx.fillStyle = 'rgba(255,250,240,0.9)'; ctx.fillRect(cx - tw / 2, cy - 13, tw, 18);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(cx - tw / 2, cy + 3, tw, 3);
    ctx.fillStyle = '#a8432f'; ctx.fillRect(cx - tw / 2, cy + 3, tw * (site.work / site.workTotal), 3);
    ctx.fillStyle = '#3d2b1a'; ctx.fillText(text, cx, cy);
  }
}

// ---------- M6／M13 同圖出招 ----------
// M13：每次出手（p.strike）依那一招的形狀畫：拳一道直線、掌一片扇形、手繞身一圈、腿遠處一道窄弧並前踏。熟練越高越大；畫面停留 LIFE tick 淡出。
export function drawForm(ctx, cx, cy, ang, sh, color, alpha, px = TILE) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  const R = sh.reach * px;
  if (sh.shape === 'line') {
    const ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
    ctx.lineWidth = Math.max(3, sh.width * px); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * px * 0.3, cy + Math.sin(ang) * px * 0.3); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(4, sh.width * px * 1.4), 0, Math.PI * 2); ctx.fill();
  } else if (sh.shape === 'sector') {
    ctx.globalAlpha = alpha * 0.45;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, ang - sh.spread / 2, ang + sh.spread / 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, ang - sh.spread / 2, ang + sh.spread / 2); ctx.stroke();
  } else if (sh.shape === 'ring') {
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, ang - sh.spread / 2, ang + sh.spread / 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.65, ang + sh.spread / 2, ang - sh.spread / 2 + Math.PI * 2 * 0.6, false); ctx.stroke();
  } else if (sh.shape === 'sweep') {
    const sx = cx + Math.cos(ang) * sh.step * px, sy = cy + Math.sin(ang) * sh.step * px;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(sx, sy, R, ang - sh.spread / 2, ang + sh.spread / 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx + Math.cos(ang) * R * 0.8, sy + Math.sin(ang) * R * 0.8); ctx.stroke();
  }
  ctx.restore();
}

// M15 演武：還站著的木人在人左右，頭上一條血。
function drawTrial(ctx, state) {
  for (const p of state.people) {
    const tr = p.act === 'do' && p.task?.kind === 'trial' ? p.task.trial : null;
    if (!tr) continue;
    for (const m of tr.men) {
      if (m.hp <= 0) continue;
      const cx = (p.x + m.dx) * TILE + TILE / 2, cy = (p.y + m.dy) * TILE + TILE / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy + 8, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(cx - 2, cy - 8, 4, 16); ctx.fillRect(cx - 7, cy - 3, 14, 3);
      ctx.fillStyle = '#a7835a'; ctx.beginPath(); ctx.arc(cx, cy - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx - 7, cy - 18, 14, 2);
      ctx.fillStyle = '#c23b2a'; ctx.fillRect(cx - 7, cy - 18, 14 * Math.max(0, m.hp) / TRIAL.HP, 2);
    }
  }
}

export function drawStrikes(ctx, state) {
  for (const p of state.people) {
    const st = p.strike;
    if (!st) continue;
    const age = state.tick - st.at;
    if (age >= STRIKE.LIFE) continue;
    const cx = p.x * TILE + TILE / 2, cy = p.y * TILE + TILE / 2 - 2;
    const color = st.kind === 'drill' ? 'rgb(255,248,210)' : 'rgb(190,40,30)';
    drawForm(ctx, cx, cy, st.ang, shapeOf(st.form, st.size), color, 1 - age / STRIKE.LIFE);
  }
}

// ---------- M7 敵人 ----------
// 柵欄格耐久不滿時畫裂痕；敵人畫身形與血條，徘徊時頭上打驚嘆號。
export function drawEnemies(ctx, state, FENCE_HP) {
  for (const [k, hp] of Object.entries(state.fenceHp)) {
    const [x, y] = k.split(',').map(Number);
    ctx.strokeStyle = 'rgba(60,30,10,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x * TILE + 4, y * TILE + 4); ctx.lineTo(x * TILE + 10, y * TILE + 11); ctx.lineTo(x * TILE + 16, y * TILE + 7); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x * TILE, y * TILE - 3, TILE * hp / FENCE_HP, 2);
  }
  ctx.textAlign = 'center';
  for (const e of state.enemies) {
    const cx = e.x * TILE + TILE / 2, cy = e.y * TILE + TILE / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 7, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (e.kind === 'boar') {
      ctx.fillStyle = '#5a3d27';
      ctx.beginPath(); ctx.ellipse(cx, cy + 1, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 8, cy - 1, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3ead8'; ctx.fillRect(cx + 11, cy + 1, 4, 1.5);
      ctx.fillStyle = '#2b1d12'; ctx.fillRect(cx - 7, cy + 5, 2, 3); ctx.fillRect(cx + 4, cy + 5, 2, 3);
    } else {
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath(); ctx.moveTo(cx - 7, cy + 7); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy - 4); ctx.fill();
      ctx.fillStyle = '#d9b48f'; ctx.beginPath(); ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8322a'; ctx.fillRect(cx - 6, cy - 12, 12, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 10, cy - 20, 20, 3);
    ctx.fillStyle = '#d94a3a'; ctx.fillRect(cx - 10, cy - 20, 20 * Math.max(0, e.hp) / e.hpMax, 3);
    if (e.mode === 'lurk' || e.bashing) {
      ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#b8322a';
      ctx.fillText(e.bashing ? '撞！' : '!', cx, cy - 23);
    }
  }
}

// M9 巢穴：野豬窩是土丘、山賊寨是木柵；拆掉後剩殘跡。
export function drawNests(ctx, state) {
  ctx.textAlign = 'center';
  for (const n of state.nests ?? []) {
    const cx = n.x * TILE + TILE / 2, cy = n.y * TILE + TILE / 2;
    if (n.cleared) {
      ctx.fillStyle = 'rgba(90,70,50,0.45)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,20,0.7)'; ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 5, cy + 6); ctx.lineTo(cx + i * 5 + 4, cy - 1); ctx.stroke(); }
    } else if (n.kind === 'boar') {
      ctx.fillStyle = '#6b5236';
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 18, 11, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2b1d12';
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6, 5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#8a9a4a'; for (const dx of [-14, -6, 9, 15]) ctx.fillRect(cx + dx, cy - 6 + Math.abs(dx) / 3, 2, 4);
    } else {
      ctx.fillStyle = '#7a5a36';
      for (let i = -3; i <= 3; i++) { ctx.fillRect(cx + i * 5 - 1.5, cy - 12, 3, 18); ctx.beginPath(); ctx.moveTo(cx + i * 5 - 2, cy - 12); ctx.lineTo(cx + i * 5, cy - 16); ctx.lineTo(cx + i * 5 + 2, cy - 12); ctx.fill(); }
      ctx.fillStyle = '#b8322a'; ctx.fillRect(cx + 12, cy - 26, 9, 6);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx + 11, cy - 26, 1.5, 16);
    }
    if (!n.cleared && n.hp < n.hpMax) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 14, cy + 10, 28, 3);
      ctx.fillStyle = '#d68a2e'; ctx.fillRect(cx - 14, cy + 10, 28 * n.hp / n.hpMax, 3);
    }
  }
}

// M12 菜畦：長著的苗越長越高，熟了有菜。
export function drawPlots(ctx, state, GROW) {
  for (const g of state.plots ?? []) {
    const px = g.x * TILE, py = g.y * TILE;
    if (g.stage === 'growing') {
      const k = Math.min(1, (state.tick - g.at) / GROW);
      ctx.fillStyle = '#5f9a4a';
      for (let i = 0; i < 3; i++) ctx.fillRect(px + 4 + i * 5, py + 16 - 10 * k, 2, 2 + 10 * k);
    } else if (g.stage === 'ripe') {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#4f8d3e'; ctx.beginPath(); ctx.arc(px + 5 + i * 5, py + 10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d9c25a'; ctx.beginPath(); ctx.arc(px + 5 + i * 5, py + 9, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
