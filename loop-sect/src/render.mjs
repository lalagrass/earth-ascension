// 畫面只讀 state，不改規則狀態。
export const TILE = 20;

const TILE_COLOR = {
  '.': '#9db978', ':': '#c9b48a', '_': '#b89a72', '#': '#6b4f3a',
  'T': '#9db978', 'R': '#a7ad8f', 'W': '#5b9bc4', 'B': '#9db978', '=': '#8a6a45',
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
        ctx.fillStyle = '#c23b4a';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + 5 + ((i * 5 + r * 7) % 10), py + 6 + ((i * 3) % 9), 3, 3);
      } else if (t === 'W') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.moveTo(px + 3, py + 8 + r * 6); ctx.lineTo(px + 12, py + 6 + r * 6); ctx.stroke();
      } else if (t === '=') {
        ctx.fillStyle = '#6e5133';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 5, py, 2, TILE);
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
    ctx.font = 'bold 11px sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.strokeText(p.name, cx, cy - 16); ctx.fillStyle = '#2b2118'; ctx.fillText(p.name, cx, cy - 16);
    ctx.font = '10px sans-serif';
    ctx.strokeText(p.actLabel, cx, cy + 19); ctx.fillStyle = '#3d3326'; ctx.fillText(p.actLabel, cx, cy + 19);
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
