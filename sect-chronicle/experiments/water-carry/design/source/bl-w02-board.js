/* BL-W02 道館生活場景擴展：配置草圖（#182）。
   本檔不是獨立頁：由 ../render-bl-w02.js 先開 bl-v03-board.html（#179），再注入本檔。
   現況部分直接用 #179 的 sceneAfter()，座標、路徑點與 scene.json 相同；擴展部分是往東接一塊藥圃的草圖，
   用同一組點景函式（pine／maple／bush／rock／stoneLantern）畫，只為看配置，不是完成美術。
   圖上所有新座標、距離都是設計草圖，沒有接到任何模型或規則。 */
'use strict';

/* ---------- 擴展區的幾何（世界座標，現況是 0～1600，擴展到 2400） ---------- */
const W2 = {
  worldW: 2400,
  // 院落東緣 → 側門小徑 → 藥圃門；全程在道館同一層台地上，沒有上下坡
  side: [[1430, 516], [1520, 532], [1612, 522], [1690, 506]],
  fence: [[1700, 418], [2250, 400], [2296, 566], [1676, 584]],
  beds: [[1740, 448, 150, 40], [1920, 442, 150, 40], [2096, 436, 120, 40], [1730, 512, 160, 44], [1918, 506, 160, 44], [2104, 500, 140, 44]],
  points: [
    { n: 1, x: 1990, y: 486, label: '藥畦：採藥', use: '接既有「採靈草」能力的畫面化；先只看，不改產出' },
    { n: 2, x: 1712, y: 528, label: '水甕：澆水', use: '水缸的水有地方用（#176 候選），用不用另定規則' },
    { n: 3, x: 2190, y: 412, label: '曬藥架', use: '觀察日常：堂親翻曬、師兄收藥' },
    { n: 4, x: 1588, y: 548, label: '楓下石凳', use: '人物相遇與休息；挑水回程可順路坐下' }
  ],
  courtyard: [[960, 452], [1440, 452], [1404, 540], [918, 540]]
};
const lenOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

function herbBed(x, y, w, h, seed) {
  const r = rng(seed);
  let s = `<path d="M${x},${y} l${w},-3 l4,${h} l-${w + 2},4 z" fill="#8a6b45" stroke="#6b5236" stroke-width="1.2"/>
    <path d="M${x + 3},${y + 3} l${w - 4},-3 l3,${h - 7} l-${w - 2},3 z" fill="#7a5c3a"/>`;
  for (let i = 0; i < w / 11; i++) for (let j = 0; j < 3; j++) {
    const px = x + 8 + i * 11 + r() * 3, py = y + 8 + j * (h / 3.2) - i * .2;
    s += `<path d="M${f(px)},${f(py + 5)} q-4,-6 -2,-10 M${f(px)},${f(py + 5)} q4,-6 2,-10 M${f(px)},${f(py + 5)} l0,-11" stroke="${j % 2 ? '#5f8a46' : '#79a352'}" stroke-width="1.6" fill="none"/>`;
    if (r() < .25) s += `<circle cx="${f(px)}" cy="${f(py - 6)}" r="1.8" fill="${r() < .5 ? '#f2e3a2' : '#e8b4c4'}"/>`;
  }
  return s;
}
function bambooFence(pts) {
  let s = '';
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (i === 3) { // 西側留門
      const g1 = lerp(a, b, .38), g2 = lerp(a, b, .62);
      s += fenceRun(a, g1) + fenceRun(g2, b);
      s += `<path d="M${pt(...g1)} l0,-34 M${pt(...g2)} l0,-34 M${pt(g1[0] - 4, g1[1] - 34)} L${pt(g2[0] + 4, g2[1] - 34)}" stroke="${C.wood2}" stroke-width="3.4"/>`;
      continue;
    }
    s += fenceRun(a, b);
  }
  return s;
}
function fenceRun(a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12);
  let s = `<path d="M${pt(a[0], a[1] - 14)} L${pt(b[0], b[1] - 14)} M${pt(a[0], a[1] - 6)} L${pt(b[0], b[1] - 6)}" stroke="#a3884f" stroke-width="2"/>`;
  for (let i = 0; i <= n; i++) { const p = lerp(a, b, i / n); s += `<path d="M${pt(...p)} l0,-20" stroke="#c4ab6a" stroke-width="2.6" stroke-linecap="round"/>`; }
  return s;
}
function dryingRack(x, y) {
  return `<path d="M${x - 34},${y} l0,-34 M${x + 34},${y - 2} l0,-34 M${x - 38},${y - 30} L${x + 38},${y - 32}" stroke="${C.wood2}" stroke-width="3"/>
    <path d="M${x - 30},${y - 26} h60 v6 h-60 z" fill="#c9b36a" opacity=".9"/><path d="M${x - 28},${y - 16} h56 v5 h-56 z" fill="#b3a35a" opacity=".9"/>`;
}
function shed(x, y) {
  return `<path d="M${x - 48},${y} L${x + 48},${y} L${x + 48},${y - 46} L${x - 48},${y - 46} Z" fill="${C.wall}" stroke="${C.wall2}" stroke-width="1.5"/>
    <path d="M${x - 60},${y - 42} L${x},${y - 74} L${x + 60},${y - 42} Z" fill="${C.roof}" stroke="${C.roof2}" stroke-width="1.5"/>
    <rect x="${x - 12}" y="${y - 30}" width="24" height="30" fill="${C.wood2}"/>`;
}
function bench(x, y) {
  return `<path d="M${x - 26},${y - 10} h52 v6 h-52 z" fill="${C.stone}" stroke="${C.stone3}" stroke-width="1"/>
    <path d="M${x - 20},${y - 4} v8 M${x + 20},${y - 4} v8" stroke="${C.stone3}" stroke-width="5"/>`;
}
function waterJar(x, y) {
  return `<ellipse cx="${x}" cy="${y}" rx="15" ry="5" fill="#3e4a3a" opacity=".2"/>
    <path d="M${x - 12},${y - 22} q-6,12 2,22 h20 q8,-10 2,-22 z" fill="#8a5a36" stroke="#5f3e24" stroke-width="1"/>
    <ellipse cx="${x}" cy="${y - 22}" rx="11" ry="3.4" fill="${C.water}" stroke="#5f3e24" stroke-width="1"/>`;
}
// 擴展區：台地往東延伸、側門小徑、藥圃、點景。依腳底 y 排序。
function extension() {
  const ground = `<g clip-path="url(#east)"><g transform="translate(800,0)">${terrain().replace(/<defs>[\s\S]*?<\/defs>/, '')}</g></g>
    <path d="M1600,282 Q1900,270 2400,262 L2400,600 Q2100,620 1880,606 Q1700,590 1600,560 Z" fill="url(#plateau)"/>
    <path d="M1600,560 Q1700,590 1880,606 Q2100,620 2400,600" stroke="#7e9356" stroke-width="3.4" fill="none" opacity=".65"/>`;
  const sideD = smoothD(W2.side, 30);
  const sidePath = `<path d="${sideD}" stroke="${C.earthEdge}" stroke-width="34" fill="none" stroke-linecap="round"/>
    <path d="${sideD}" stroke="${C.earth}" stroke-width="28" fill="none" stroke-linecap="round"/>
    ${[.1, .28, .46, .64, .82].map((t, i) => { const L = lenOf(W2.side); let r = t * L, k = 0; while (r > Math.hypot(W2.side[k + 1][0] - W2.side[k][0], W2.side[k + 1][1] - W2.side[k][1])) { r -= Math.hypot(W2.side[k + 1][0] - W2.side[k][0], W2.side[k + 1][1] - W2.side[k][1]); k++; }
      const p = lerp(W2.side[k], W2.side[k + 1], r / Math.hypot(W2.side[k + 1][0] - W2.side[k][0], W2.side[k + 1][1] - W2.side[k][1]));
      return `<path d="M${pt(p[0] - 12, p[1] - 8)} l22,-2 l3,15 l-22,2 z" fill="${i % 2 ? C.slab : C.slabLit}" stroke="${C.slabEdge}" stroke-width=".8"/>`; }).join('')}`;
  const inside = `<path d="M${W2.fence.map((p) => pt(...p)).join(' L')} Z" fill="#b9c584"/>
    <path d="M1700,506 L2280,486" stroke="${C.earth}" stroke-width="16" stroke-linecap="round"/>
    ${W2.beds.map(([x, y, w, h], i) => herbBed(x, y, w, h, 30 + i)).join('')}`;
  const objs = [
    { y: 360, s: pine(2330, 360, 1, 2) + pine(1760, 330, .8, 1) },
    { y: 372, s: shed(2290, 372) },
    { y: 410, s: dryingRack(2190, 412) },
    { y: 584, s: bambooFence(W2.fence) },
    { y: 530, s: waterJar(1712, 532) },
    { y: 556, s: bench(1588, 552) },
    { y: 560, s: maple(1560, 560, 1) },
    { y: 640, s: bush(1840, 640, 1.2, true) + rock(2100, 650, 1.3, C.stone, true) },
    { y: 720, s: pine(2250, 760, 1.4, 0) + bush(1700, 720, 1.3) }
  ].sort((a, b) => a.y - b.y).map((o) => o.s).join('');
  return `${ground}${sidePath}${inside}${objs}`;
}

/* ---------- 標示層 ---------- */
function overlays() {
  const ptsD = (pts) => `M${pts.map((p) => pt(...p)).join(' L')}`;
  const walk = `<g fill="#f2c94c" fill-opacity=".28" stroke="#c99a12" stroke-width="3" stroke-dasharray="10 6">
      <path d="${smoothD(PATH, 26)}" fill="none" stroke-width="30" stroke-opacity=".35" stroke-dasharray="none" stroke="#f2c94c"/>
      <path d="${ptsD(W2.courtyard)} Z"/>
      <path d="${smoothD(W2.side, 30)}" fill="none" stroke-width="30" stroke-opacity=".35" stroke-dasharray="none" stroke="#f2c94c"/>
      <path d="M1700,506 L2280,486" fill="none" stroke-width="18" stroke-opacity=".45" stroke-dasharray="none" stroke="#f2c94c"/>
    </g>`;
  const occl = `<g fill="none" stroke="#8e5bbd" stroke-width="3" stroke-dasharray="4 5">
      <ellipse cx="1560" cy="500" rx="56" ry="58"/><path d="M1090,200 L1478,200 L1478,452 L1000,452 Z"/><ellipse cx="2290" cy="330" rx="66" ry="50"/>
    </g>`;
  const pts = W2.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="17" fill="#d65a4a" stroke="#fff" stroke-width="3"/>
      <text x="${p.x}" y="${p.y + 6}" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">${p.n}</text>`).join('') +
    [[1000, 520, '缸'], [328, 719, '泉']].map(([x, y, t]) => `<circle cx="${x}" cy="${y}" r="17" fill="#4f78a8" stroke="#fff" stroke-width="3"/><text x="${x}" y="${y + 6}" font-size="16" fill="#fff" text-anchor="middle">${t}</text>`).join('');
  const cam = `<rect x="4" y="4" width="1592" height="892" fill="none" stroke="#2f2a24" stroke-width="5"/>
    <rect x="800" y="6" width="1594" height="888" fill="none" stroke="#2f2a24" stroke-width="4" stroke-dasharray="18 10"/>
    <path d="M820,60 L1580,60" stroke="#2f2a24" stroke-width="3" marker-end="url(#arr)"/>`;
  const bgMark = `<g fill="#6b6254" opacity=".14"><rect x="0" y="0" width="2400" height="250"/><rect x="2252" y="250" width="148" height="140"/></g>`;
  return `${bgMark}${walk}${occl}${cam}${pts}`;
}

/* ---------- 板 ---------- */
function boardLayout() {
  const S = 1536 / W2.worldW;
  const scene = sceneAfter().replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace('<rect width="1600" height="900" fill="url(#vignette)"/>', '');
  const vatToGate = 420 + lenOf(W2.side);
  const L = (x, y, s, size = 13, extra = '') => `<text ${extra} x="${x}" y="${y}" font-size="${size}" fill="#3d362d">${s}</text>`;
  const sw = (x, y, kind) => ({
    walk: `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="#f2c94c" fill-opacity=".5" stroke="#c99a12" stroke-dasharray="4 3"/>`,
    bg: `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="#6b6254" opacity=".3"/>`,
    occ: `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="none" stroke="#8e5bbd" stroke-width="2" stroke-dasharray="3 3"/>`,
    pt: `<circle cx="${x + 13}" cy="${y - 4}" r="8" fill="#d65a4a"/>`,
    cam: `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="none" stroke="#2f2a24" stroke-width="2.4"/>`,
    cam2: `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="none" stroke="#2f2a24" stroke-width="2" stroke-dasharray="5 3"/>`
  })[kind];
  return `<div class="board tall" id="layout"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    <defs><clipPath id="east"><rect x="1600" y="0" width="800" height="900"/></clipPath><clipPath id="world"><rect width="2400" height="900"/></clipPath>
      <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2f2a24"/></marker></defs>
    <rect width="1600" height="1000" fill="#f6efe0"/>
    <text x="32" y="38" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">道館往東接一塊藥圃：配置草圖</text>
    <text x="32" y="62" font-size="13" fill="#6b6254">左邊實線框是現在的畫面（#179 改後場景，座標與 scene.json 相同）；右邊是擴展的一塊。只是配置，不是完成美術，也沒有接任何規則。</text>
    <g transform="translate(32,80) scale(${S})"><g clip-path="url(#world)">${scene}${extension()}${overlays()}</g></g>
    <rect x="32" y="80" width="1536" height="${f(900 * S)}" fill="none" stroke="${C.line}"/>
    ${[['現況畫面（1600×900）', 32 + 30 * S, 80 + 40 * S], ['擴展後鏡頭可平移到這裡', 32 + 1640 * S, 80 + 110 * S], ['新增：側門小徑＋藥圃', 32 + 1900 * S, 80 + 690 * S]]
      .map(([t, x, y]) => `<text x="${f(x)}" y="${f(y)}" font-size="14" font-weight="700" fill="#2f2a24" stroke="#f6efe0" stroke-width="4" paint-order="stroke">${t}</text>`).join('')}
    <rect x="32" y="${f(80 + 900 * S + 14)}" width="500" height="${f(1000 - 80 - 900 * S - 28)}" rx="10" fill="#fffaf0" stroke="${C.line}"/>
    ${L(50, f(80 + 900 * S + 42), '圖例', 15, 'font-weight="700"')}
    ${[['walk', '可走：山路、院落、側門小徑、藥圃中間走道'], ['bg', '純背景：遠山、藥圃外與小屋內，不能進'], ['occ', '會遮人：道館屋頂、楓樹樹冠、小屋'], ['pt', '互動點（編號見右）；藍點是既有的缸與泉'], ['cam', '現在的鏡頭範圍'], ['cam2', '擴展後：同樣大小的鏡頭可往東平移']]
      .map(([k, t], i) => sw(50, f(80 + 900 * S + 70 + i * 24), k) + L(86, f(80 + 900 * S + 70 + i * 24), t)).join('')}
    <rect x="548" y="${f(80 + 900 * S + 14)}" width="1020" height="${f(1000 - 80 - 900 * S - 28)}" rx="10" fill="#fffaf0" stroke="${C.line}"/>
    ${L(566, f(80 + 900 * S + 42), '四個互動點與用途（為什麼走過去）', 15, 'font-weight="700"')}
    ${W2.points.map((p, i) => L(566, f(80 + 900 * S + 70 + i * 24), `${p.n}　${p.label}：${p.use}`)).join('')}
    ${L(566, f(80 + 900 * S + 176), `距離草量：水缸→院落東緣約 420，東緣→藥圃門約 ${Math.round(lenOf(W2.side))}，合計約 ${Math.round(vatToGate)}；泉水單程是 ${Math.round(lenOf(PATH))}。`, 13, 'fill="#8a4a1a"')}
    ${L(566, f(80 + 900 * S + 198), '所以若真要「挑水澆藥圃」，等於再走一段和挑水差不多長的路：這是規則取捨，另定，不由配置圖決定。', 13, 'fill="#8a4a1a"')}
  </svg></div>`;
}

(function mount() {
  document.getElementById('root').innerHTML = boardLayout();
  window.W2_INFO = { side: Math.round(lenOf(W2.side)), path: Math.round(lenOf(PATH)), vatToGate: Math.round(420 + lenOf(W2.side)) };
})();
