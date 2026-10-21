/* BL-V03 第 2 步：空桶／負重走路的改前／改後（#177）。
   本檔不是獨立頁：由 ../render-walk.js 先開 bl-v03-board.html（#179 的 figure() 畫法），帶入 V1 姿勢表與 template/actions.json 的步距，再注入本檔。
   改前 = V1 姿勢表的 4 幀循環（V3 展示與 #181 模板目前用的就是這組），只換成 #179 的畫法，所以兩邊只差動作。
   改後 = 8 幀循環，腳的位置先定在地上，再用兩段腿長反推膝蓋角度：站著的那隻腳每換一幀就往後退一幀的前進量，換幀時落點對得上同一處地面。
   但播放時人物在兩幀之間仍連續前進、腿維持上一幀，所以幀與幀之間腳仍會滑最多一幀的前進量；連續鎖腳沒做。
   只是畫法與幀表，不改 demo／模板的模型、速度、路程或任何入帳時點。 */
'use strict';

const SCENE = 0.78;           // template/actions.json 的 sceneScale：人物單位 → 場景單位
const LEG = 21, REACH = 41.6; // figure() 的大腿、小腿長；REACH 是幾乎伸直時的髖到腳底距離
const N = 8;

// 改後的步態參數（人物單位）。E＝站立腳在一步裡相對髖部往後退的距離；beta＝一隻腳著地佔一個循環的比例。
// 一個循環身體前進 E / beta，所以換幀時著地腳落點對齊；負重時 E 短、beta 長（雙腳著地久）、膝蓋多彎（c 小）、腳抬得低。
const GAIT = {
  empty: { label: '空桶下山', speed: 60, E: 36, beta: .6, c: .975, lift: 5.5, accept: .7, lean: 6, leanAmp: .8,
    swingA: 9, lag: .5, tiltBase: 0, tiltAmp: 2, sagAmp: .3, fill: 0, back: false },
  load: { label: '負重上山', speed: 45, E: 28, beta: .66, c: .935, lift: 3.4, accept: 1.6, lean: 15, leanAmp: 1.6,
    swingA: 3.5, lag: .6, tiltBase: -2.5, tiltAmp: 1.6, sagAmp: 1.6, fill: .9, back: true }
};

// 兩段等長的腿：給腳底相對髖部的位置，回傳 figure() 用的大腿角 t 與膝彎 k（膝蓋朝前）
function ik(x, y) {
  let d = Math.hypot(x, y);
  if (d > REACH + .3) { x *= (REACH + .3) / d; y *= (REACH + .3) / d; d = REACH + .3; }
  const a = Math.atan2(x, y) * 180 / Math.PI, c = Math.acos(Math.min(1, d / (2 * LEG))) * 180 / Math.PI;
  return { t: a + c, k: 2 * c };
}
// 一隻腳在循環中的位置：u＝從腳跟落地起算的相位
function footAt(g, u) {
  if (u < g.beta) return { x: g.E / 2 - g.E * (u / g.beta), lift: 0, stance: true, since: u };
  const s = (u - g.beta) / (1 - g.beta), e = s * s * (3 - 2 * s);
  return { x: -g.E / 2 + g.E * e, lift: g.lift * Math.sin(Math.PI * s), stance: false };
}
function gaitPose(kind, phi) {
  const g = GAIT[kind];
  const feet = [footAt(g, phi % 1), footAt(g, (phi + .5) % 1)];
  const st = feet.filter(p => p.stance);
  // 髖高：由離髖最遠的站立腳決定（雙腳著地時最低、單腳經過時最高），落地瞬間膝蓋再吃一點重量
  let H = g.c * Math.sqrt(REACH * REACH - Math.max(...st.map(p => p.x * p.x)));
  const hit = st.reduce((s, p) => s + Math.exp(-((p.since / .1) ** 2)), 0);
  H -= g.accept * hit;
  const w = 4 * Math.PI * phi; // 每一步一個起伏，一個循環兩步
  return {
    load: 'pole', fill: g.fill, bob: 0,
    legs: feet.map(p => ik(p.x, H - p.lift)),
    lean: g.lean + g.leanAmp * hit,
    swing: g.swingA * Math.sin(w - g.lag * Math.PI), // 桶子擺動落後身體
    poleTilt: g.tiltBase + g.tiltAmp * Math.sin(2 * Math.PI * phi), // 左右肩換邊
    sag: g.sagAmp * hit // 落地時扁擔往下彎
  };
}

// 腿的正向計算（與 figure()／anchors() 同一套）：回傳兩腳底相對髖部的位置與髖高
function legsOf(p) {
  const feet = p.legs.map(l => {
    const r = Math.PI / 180, kx = LEG * Math.sin(l.t * r), ky = LEG * Math.cos(l.t * r);
    return [kx + LEG * Math.sin((l.t - l.k) * r), ky + LEG * Math.cos((l.t - l.k) * r)];
  });
  return { feet, low: Math.max(...feet.map(q => q[1])) };
}

const V1 = window.V1_POSE || {};
const STRIDE = window.TPL_STRIDE || { walkEmpty: 6.6, walkLoaded: 5.2 };
const VARIANTS = {
  beforeEmpty: { kind: 'empty', label: '改前', poses: ['emptyA', 'emptyB', 'emptyC', 'emptyD'].map(k => V1[k]), stride: STRIDE.walkEmpty },
  afterEmpty: { kind: 'empty', label: '改後', poses: [...Array(N).keys()].map(i => gaitPose('empty', i / N)), stride: GAIT.empty.E / GAIT.empty.beta * SCENE / N },
  beforeLoad: { kind: 'load', label: '改前', poses: ['loadA', 'loadB', 'loadC', 'loadD'].map(k => V1[k]), stride: STRIDE.walkLoaded },
  afterLoad: { kind: 'load', label: '改後', poses: [...Array(N).keys()].map(i => gaitPose('load', i / N)), stride: GAIT.load.E / GAIT.load.beta * SCENE / N }
};

// 量測：站立腳（最低的那隻）在相鄰兩幀都著地時，換幀那一刻它在地面上的落點差（離散幀邊界，不是連續播放的滑動量）；另記髖高起伏
function measure(v) {
  const n = v.poses.length, step = v.stride / SCENE; // 每幀身體前進的人物單位
  const L = v.poses.map(legsOf);
  let slip = 0, pairs = 0;
  for (let i = 0; i < n; i++) {
    const a = L[i], b = L[(i + 1) % n];
    for (let k = 0; k < 2; k++) {
      if (a.low - a.feet[k][1] < .6 && b.low - b.feet[k][1] < .6) {
        slip += Math.abs((step + b.feet[k][0]) - a.feet[k][0]); pairs++;
      }
    }
  }
  const hip = v.poses.map((p, i) => L[i].low - (p.bob || 0));
  return {
    slipPerCycle: slip, pairs, cycle: step * n * SCENE, framesPerSec: (GAIT[v.kind].speed / v.stride),
    hipRange: Math.max(...hip) - Math.min(...hip), stepLen: Math.max(...L.map(l => Math.abs(l.feet[0][0] - l.feet[1][0])))
  };
}

const css = `<style>
  #frames text { font-family: var(--font); }
</style>`;
const T = (x, y, s, size = 13, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" ${/fill=/.test(extra) ? '' : 'fill="#3d362d"'} ${extra}>${s}</text>`;
const B = (x, y, s, size = 16) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${C.ink}">${s}</text>`;

// 一列膠捲：每格固定間距；格裡的地面石紋跟著身體前進往後捲，站著的腳若真的踩住地面，就會一直壓在同一道石紋上
function strip(id, y0) {
  const v = VARIANTS[id], m = measure(v), S = 1.4, CW = 168, X0 = 214, GY = y0 + 150;
  const step = v.stride / SCENE;
  let s = `<rect x="16" y="${y0}" width="1568" height="186" rx="10" fill="#fffaf0" stroke="${C.line}"/>
    ${B(30, y0 + 30, `${GAIT[v.kind].label}・${v.label}`)}
    ${T(30, y0 + 52, `${v.poses.length} 幀一循環`)}
    ${T(30, y0 + 72, `每幀前進 ${f(v.stride)} 場景單位`)}
    ${T(30, y0 + 98, `換幀落點差：每循環 ${f(m.slipPerCycle * SCENE)}`, 13, `font-weight="700" fill="${m.slipPerCycle * SCENE > 1 ? '#a8432e' : '#3f6d3a'}"`)}
    ${T(30, y0 + 118, `幀與幀之間仍滑：最多 ${f(v.stride)}`)}
    ${T(30, y0 + 140, `髖部起伏 ${f(m.hipRange * SCENE)}`)}
    ${T(30, y0 + 160, `跨步寬 ${f(m.stepLen * SCENE)}`)}`;
  v.poses.forEach((p, i) => {
    const cx = X0 + i * CW + CW / 2, L = legsOf(p);
    s += `<g><clipPath id="c-${id}-${i}"><rect x="${cx - CW / 2 + 3}" y="${y0 + 6}" width="${CW - 6}" height="174"/></clipPath><g clip-path="url(#c-${id}-${i})">
      <rect x="${cx - CW / 2 + 3}" y="${GY}" width="${CW - 6}" height="26" fill="${C.earth}"/>
      <path d="M${cx - CW / 2 + 3},${GY} h${CW - 6}" stroke="${C.earthEdge}" stroke-width="1.4"/>`;
    // 石紋：每 12 人物單位一道，往後捲 i×step
    for (let k = -12; k <= 12; k++) {
      const gx = cx + (k * 12 - ((i * step) % 12)) * S;
      s += `<path d="M${f(gx)},${GY + 3} l0,8" stroke="${C.slabDark}" stroke-width="1.3" opacity=".7"/>`;
    }
    // 站立腳的落點：紅點畫在腳底正下方
    L.feet.forEach(q => { if (L.low - q[1] < .6) s += `<circle cx="${f(cx + q[0] * S + 2 * S)}" cy="${GY + 16}" r="3.6" fill="#c8553f"/>`; });
    s += shadow(cx - 5, GY - 1, 26, .2) + figure(Object.assign({}, p, { x: cx, y: GY, s: S, dir: 1, back: GAIT[v.kind].back }));
    s += `</g></g>${T(cx - 8, y0 + 182, `${i + 1}`, 11, 'fill="#8a7f6c"')}`;
  });
  return s;
}

function framesBoard() {
  const notes = [
    '看法：每格地面上的直紋是地上的石板縫，跟著身體前進往後捲。紅點是著地那隻腳的腳底。',
    '改前：紅點在相鄰兩格之間對不上同一道紋，表示換幀時腳的落點就跳了；每循環前進的距離比兩步實際跨出的距離短很多。',
    '改後：換幀時紅點壓在同一道紋上，直到腳抬起（播放時兩幀之間人物仍連續前進，腳仍會滑最多一幀的前進量）；髖部在雙腳著地時最低、單腳經過時最高，負重時更低、雙腳著地更久、落地膝蓋再沉一點。',
    '桶子擺動比身體慢半拍，扁擔在落地時往下彎；負重桶擺幅小、空桶擺幅大。「換幀落點差」只比幀邊界，不是連續播放的滑動量；紅色 > 1 表示換幀時就看得出跳。',
    '速度、路程、何時到達都照舊；只換幀表與每幀步距（改後 8 幀）。是否換進 V3 展示或 #181 模板，留給第 3 步與審查決定。'
  ];
  return `<div class="board tall" id="frames">${css}<svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    <rect width="1600" height="1000" fill="#f6efe0"/>
    <text x="24" y="38" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">BL-V03 第 2 步：空桶／負重走路，改前 4 幀 vs 改後 8 幀</text>
    ${T(24, 62, '同一個主角、同一個畫法（#179），只換動作。放大 1.4 倍；空桶是正面下山、負重是背面上山，和 V3 展示一樣。')}
    ${strip('beforeEmpty', 76)}${strip('afterEmpty', 270)}${strip('beforeLoad', 464)}${strip('afterLoad', 658)}
    <rect x="16" y="852" width="1568" height="140" rx="10" fill="#fffaf0" stroke="${C.line}"/>
    ${notes.map((t, i) => T(30, 878 + i * 24, t, 13.5)).join('')}
  </svg></div>`;
}

// 給 render-walk.js 產生動態預覽：每個版本的幀（人物原點在腳底、未縮放）與步距
window.WALK = {
  GAIT, SCENE,
  export() {
    const out = {};
    for (const [id, v] of Object.entries(VARIANTS)) {
      out[id] = { kind: v.kind, label: v.label, stride: v.stride, back: GAIT[v.kind].back, metrics: measure(v),
        frames: v.poses.map(p => figure(Object.assign({}, p, { x: 0, y: 0, s: 1, dir: 1, back: GAIT[v.kind].back }))) };
    }
    return out;
  }
};

(function mount() {
  const want = window.WALK_BOARD;
  if (want === 'none') return;
  document.getElementById('root').innerHTML = framesBoard();
})();
