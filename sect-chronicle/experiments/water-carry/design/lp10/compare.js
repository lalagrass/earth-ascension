// LP-10 初學／熟練分鏡對照（設計示意，未連遊戲）。同一鏡頭、同一路程、同一腳力，只換「掌法熟練」這個設計 fixture。
// 上半：同一時刻並排（t 是相對拍數，不是毫秒）；下半：同一動作分段的姿勢特寫。節奏表只用來排畫格，不是實作值。
import { loadAssets, drawScene, toScreen } from './scene.js';

const R1 = [868, 528], R2 = [790, 490], R3 = [712, 432];
const ST1 = [888, 528], ST2 = [812, 494]; // 兩個站位（與 states.js 同）
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// 相對節奏（拍）：移動段兩人等長（同腳力、同路程）；差在站定、起手、收勢、轉向。
export const BEATS = {
  b: [['站定', 1], ['起手', 2], ['接觸', 0.5], ['收勢', 1.5], ['轉向', 1], ['走到鼠2', 2], ['起手', 2], ['接觸', 0.5]],
  e: [['站定', 0.3], ['起手', 0.7], ['接觸', 0.5], ['收勢＋轉身', 0.5], ['走到鼠2', 2], ['起手', 0.7], ['接觸', 0.5], ['收勢', 0.5]],
};
const MOMENTS = [0.5, 1.2, 3.2, 4.8, 6.5];

// 某一拍時，人物與三鼠在哪、什麼姿勢（只為排畫格）
function at(skill, t) {
  let acc = 0, seg = null, k = 0;
  for (const [name, len] of BEATS[skill]) { if (t < acc + len) { seg = name; k = (t - acc) / len; break; } acc += len; }
  if (!seg) { seg = '返院'; k = Math.min(1, (t - acc) / 2); } // 節奏表跑完：範圍內無有效目標，開始返院
  const second = acc >= (skill === 'b' ? 8 : 4); // 已進入第二隻
  const r1 = second || ['收勢', '轉向', '收勢＋轉身', '走到鼠2'].includes(seg) ? 'down' : seg === '接觸' ? 'hit' : 'sniff';
  let r2 = 'sniff', r3 = 'sniff', r3p = R3, flee = null;
  let hero, fx = [];
  if (seg === '站定') hero = { x: ST1[0], y: ST1[1], face: -1, pose: 'stance' };
  else if (seg === '起手') hero = second ? { x: ST2[0], y: ST2[1], face: -1, pose: 'windup' } : { x: ST1[0], y: ST1[1], face: -1, pose: 'windup' };
  else if (seg === '接觸') { const s = second ? ST2 : ST1, r = second ? R2 : R1; hero = { x: s[0], y: s[1], face: -1, pose: 'strike' }; fx.push({ kind: 'contact', x: r[0] - 2, y: r[1] - 8, skill }); if (second) { r2 = 'hit'; r3 = 'alert'; } }
  else if (seg === '收勢' && !second) hero = { x: ST1[0], y: ST1[1], face: -1, pose: 'recover' };
  else if (seg === '收勢') { hero = { x: ST2[0], y: ST2[1], face: -1, pose: 'recover' }; r2 = 'down'; r3 = 'flee'; r3p = [670, 441]; flee = [R3, [684, 438], [636, 448]]; }
  else if (seg === '轉向') { hero = { x: ST1[0], y: ST1[1], face: -1, pose: 'stance' }; fx.push({ kind: 'turn', x: ST1[0], y: ST1[1] }); }
  else if (seg === '收勢＋轉身') { hero = { x: ST1[0] - 3, y: ST1[1] - 1, face: -1, pose: 'recover' }; fx.push({ kind: 'turn', x: ST1[0], y: ST1[1] }); }
  else if (seg === '返院') { const [x, y] = lerp(ST2, [880, 512], k); hero = { x, y, face: 1, frame: 'herbWalk-1' }; r2 = 'down'; r3 = 'gone'; r3p = [600, 466]; }
  else if (seg === '走到鼠2') { const [x, y] = lerp(ST1, ST2, k); hero = { x, y, face: -1, frame: `herbWalk-${Math.floor(k * 8) % 4}` }; }
  if (second && seg !== '接觸' && seg !== '收勢' && seg !== '返院') r2 = 'sniff';
  return { seg, hero: { id: 'hero', skill, ...hero }, fx, rats: [{ id: 1, x: R1[0], y: R1[1], mode: r1, face: 1 }, { id: 2, x: R2[0], y: R2[1], mode: r2, face: 1 }, { id: 3, x: r3p[0], y: r3p[1], mode: r3, face: r3 === 'flee' ? -1 : 1, alert: true }], flee };
}

function shot(a, canvas, st, cam, labels = []) {
  const W = canvas.clientWidth, H = canvas.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(ctx, a, st, cam, W, H);
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  for (const [t, x, y] of labels) { const [sx, sy] = toScreen(cam, W, H, x, y); ctx.fillStyle = 'rgba(248,242,228,.9)'; const w = ctx.measureText(t).width + 8; ctx.fillRect(sx - w / 2, sy + 4, w, 15); ctx.fillStyle = '#2f2a24'; ctx.fillText(t, sx, sy + 15); }
}

const a = await loadAssets();
const momentCam = { x: 846, y: 498, zoom: 1.75 };
const SKILL = { b: '初學（fixture）', e: '熟練（fixture）' };
const grid = document.getElementById('moments');
grid.innerHTML = `<div></div>${MOMENTS.map((t) => `<div class="colh">t = ${t} 拍</div>`).join('')}` +
  ['b', 'e'].map((s) => `<div class="rowh">${SKILL[s]}</div>${MOMENTS.map((t, i) => `<figure><canvas id="m-${s}-${i}"></canvas><figcaption id="c-${s}-${i}"></figcaption></figure>`).join('')}`).join('');
for (const s of ['b', 'e']) MOMENTS.forEach((t, i) => {
  const m = at(s, t);
  shot(a, document.getElementById(`m-${s}-${i}`), { people: [m.hero], rats: m.rats, fx: m.fx, ground: m.flee ? { flee: m.flee } : {} }, momentCam,
    [['鼠1', R1[0], R1[1]], ['鼠2', R2[0], R2[1]], ['鼠3', m.rats[2].x, m.rats[2].y]]);
  document.getElementById(`c-${s}-${i}`).textContent = m.seg;
});

// 節奏條：每段寬度＝拍數；移動段（走到鼠2）兩列一樣長
const scale = 100 / 10.5;
document.getElementById('beats').innerHTML = ['b', 'e'].map((s) => `<div class="beat"><span class="bl">${SKILL[s]}</span><div class="track">${BEATS[s].map(([n, len]) => `<i class="seg ${n.startsWith('走') ? 'move' : n === '接觸' ? 'hit' : ''}" style="width:${len * scale}%" title="${n} ${len} 拍">${len >= 0.7 ? n : ''}</i>`).join('')}${MOMENTS.map((t) => `<b class="tick" style="left:${t * scale}%"></b>`).join('')}</div></div>`).join('');

// 分段特寫：同一動作、同一鏡頭
const PHASES = [['站定', 'stance'], ['起手', 'windup'], ['掌接觸', 'strike'], ['收勢', 'recover']];
const closeCam = { x: 880, y: 500, zoom: 2.5 };
const close = document.getElementById('close');
close.innerHTML = `<div></div>${PHASES.map(([n]) => `<div class="colh">${n}</div>`).join('')}` + ['b', 'e'].map((s) => `<div class="rowh">${SKILL[s]}</div>${PHASES.map((_, i) => `<figure><canvas id="p-${s}-${i}"></canvas></figure>`).join('')}`).join('');
for (const s of ['b', 'e']) PHASES.forEach(([n, pose], i) => {
  const fx = pose === 'strike' ? [{ kind: 'contact', x: R1[0] - 2, y: R1[1] - 8, skill: s }] : [];
  const mode = pose === 'strike' ? 'hit' : pose === 'recover' ? 'down' : 'sniff';
  shot(a, document.getElementById(`p-${s}-${i}`), { people: [{ id: 'hero', x: ST1[0], y: ST1[1], face: -1, pose, skill: s }], rats: [{ id: 1, x: R1[0], y: R1[1], mode, face: 1 }], fx }, closeCam);
});
document.body.dataset.ready = '1';
