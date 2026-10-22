// LP-10 掌法畫面稿：場景繪製（設計示意，未連遊戲）。
// 只用 2D canvas 把共用背景／道具 PNG、模板人物 sheet 與原創向量（護欄、藥架、石凳、測試鼠、掌法手臂疊繪）畫成一格靜態畫面。
// 不匯入 demo/model.mjs、不跑時鐘／RNG、不算 HP／傷害／精力：每格畫面的位置與姿勢都寫死在 states.js。
// 座標全部是場景單位（1600×900），與 demo/routes.mjs 同一張地圖；護欄／院中端點／防守路的數字從 routes.mjs 抄來，只讀不改。

export const ROOT = '../../';
export const FENCE = { x1: 640, y1: 386, x2: 720, y2: 480 }; // routes.mjs BOAR.fence
export const YARD_END = [962, 512]; // routes.mjs 院中端點
export const RACK = { x: 896, y: 474 }; // routes.mjs HERB.rack
export const BENCH = { x: 968, y: 420, w: 92 }; // routes.mjs SEATS.bench
export const VIEW_STONE = { x: 752, y: 456 }; // routes.mjs FUN.hero.stone
// 本稿新增（設計示意）：有限清理範圍＝護欄內側的西院草地。西界就是竹護欄；其他三邊是本稿畫的虛線。
export const RANGE = [[640, 386], [720, 480], [770, 556], [900, 568], [940, 524], [910, 462], [860, 418], [760, 380]];

const SCALE = 0.39; // sheet 像素 → 場景單位：sceneScale 0.78 ÷ resolution 2（template/actions.json）

export async function loadAssets() {
  const scene = await (await fetch(ROOT + 'spikes/shared/scene.json')).json();
  const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('載入失敗 ' + src)); i.src = src; });
  const files = [scene.background, ...scene.props.map((p) => p.file), scene.vats[1].file];
  const shared = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await img(ROOT + 'spikes/shared/assets/' + f)])));
  const sheets = {};
  for (const id of ['hero', 'cousin']) {
    const data = await (await fetch(ROOT + `template/out/${id}.json`)).json();
    sheets[id] = { data, image: await img(ROOT + `template/out/${id}.png`) };
  }
  return { scene, shared, sheets };
}

// ---------- 人物：sheet 幀＋（掌法格）向量手臂疊繪 ----------
// 朝右畫，face=-1 時整個水平翻面。lean 以腳底為軸前傾（度，正值往面朝方向傾）。
function frame(ctx, sheet, name, lean = 0) {
  const f = sheet.data.frames[name];
  if (!f) throw new Error('缺幀 ' + name);
  const { x, y, w, h } = f.frame, ax = f.anchor.x * w, ay = f.anchor.y * h;
  ctx.save();
  ctx.rotate(lean * Math.PI / 180);
  ctx.drawImage(sheet.image, x, y, w, h, -ax * SCALE, -ay * SCALE, w * SCALE, h * SCALE);
  ctx.restore();
}
const rot = ([x, y], deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };

// 掌法姿勢表（設計 fixture，非實作動畫）：base＝借用的模板幀；shoulder＝該幀肩點（場景單位，相對腳底，朝右）；
// elbow／hand＝手臂兩段終點；palm＝掌的朝向角。初學 b／熟練 e 只差在姿勢幅度與穩定度，不差腳力。
const PALM = {
  stance: { b: { base: 'herbHand-0', lean: -2, elbow: [2, -34], hand: [6, -30], palm: -90, wobble: true }, e: { base: 'herbHand-0', lean: 0, elbow: [4, -34], hand: [8, -31], palm: -90 } },
  windup: { b: { base: 'herbHand-0', lean: -12, elbow: [-8, -33], hand: [-14, -26], palm: -70, wobble: true }, e: { base: 'herbHand-0', lean: -3, elbow: [1, -36], hand: [-1, -31], palm: -85 } },
  strike: { b: { base: 'herbGather-0', lean: 0, shoulder: [10.5, -34], elbow: [18, -22], hand: [22, -10], palm: 10, off: true }, e: { base: 'herbGather-0', lean: 4, shoulder: [10.5, -34], elbow: [19, -21], hand: [24, -9], palm: 0 } },
  recover: { b: { base: 'herbWalk-0', lean: -6, elbow: [2, -30], hand: [8, -24], palm: -40, stumble: true }, e: { base: 'herbHand-0', lean: 0, elbow: [6, -34], hand: [12, -32], palm: -90 } },
  cancel: { b: { base: 'herbHand-0', lean: -4, elbow: [0, -34], hand: [2, -27], palm: -70 }, e: { base: 'herbHand-0', lean: -2, elbow: [0, -34], hand: [2, -27], palm: -70 } },
};
const SHOULDER = [6.6, -45.6]; // herbHand-0／herbWalk-0 的肩點（sheet 像素 (107,67)、腳底 (90,184)，×0.39）

function arm(ctx, p, robe, edge) {
  const sh = rot(p.shoulder || SHOULDER, p.lean), el = rot(p.elbow, p.lean * 0.5), hd = rot(p.hand, p.lean * 0.3);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = edge; ctx.lineWidth = 8.4;
  ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...hd); ctx.stroke();
  ctx.strokeStyle = robe; ctx.lineWidth = 6.4;
  ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...hd); ctx.stroke();
  // 掌：立掌（掌根朝前），膚色圓角塊
  ctx.save(); ctx.translate(...hd); ctx.rotate(p.palm * Math.PI / 180);
  ctx.fillStyle = '#f2cfa8'; ctx.strokeStyle = '#b98b62'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.roundRect(-0.5, -2.8, 7.5, 5.6, 2.2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function drawPerson(ctx, a, who) {
  const sheet = a.sheets[who.id];
  const robe = who.id === 'hero' ? '#4f78a8' : '#6c8a68', edge = who.id === 'hero' ? '#34567f' : '#455d43';
  ctx.save();
  ctx.translate(who.x, who.y);
  ctx.fillStyle = 'rgba(58,52,36,.22)'; ctx.beginPath(); ctx.ellipse(0, 1, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (who.sel) { ctx.strokeStyle = '#c8962e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 1, 18, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.scale(who.face || 1, 1);
  const p = PALM[who.pose]?.[who.skill || 'b'];
  if (p) {
    frame(ctx, sheet, p.base, p.lean);
    arm(ctx, p, robe, edge);
    if (p.wobble) for (const s of [-1, 1]) { ctx.strokeStyle = 'rgba(80,70,50,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-4 + s * 9, -2, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (p.stumble) { ctx.strokeStyle = 'rgba(80,70,50,.65)'; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 - i * 4, -6 - i * 6); ctx.lineTo(-20 - i * 4, -8 - i * 6); ctx.stroke(); } }
  } else frame(ctx, sheet, who.frame || 'stretch-1');
  ctx.restore();
}

// ---------- 測試弱鼠（原創向量，朝右畫） ----------
// mode：sniff 嗅、alert 警覺（豎耳＋！）、hit 受掌（壓扁＋衝擊線）、down 示意擊倒（側躺、半透明）、flee 逃（拉長＋揚塵）
export function drawRat(ctx, r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.globalAlpha = r.mode === 'down' ? 0.7 : r.mode === 'gone' ? 0.35 : 1;
  ctx.fillStyle = 'rgba(58,52,36,.22)'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(r.face || 1, 1);
  const body = r.alert ? '#7b6a5a' : '#8a7a68', dark = '#3f342a';
  if (r.mode === 'down') {
    ctx.rotate(-0.25);
    ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(0, -4, 9, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(-6, 3); ctx.moveTo(-1, 0); ctx.lineTo(-1, 3); ctx.stroke();
    ctx.lineWidth = 0.8; for (const [x, y] of [[8, -6], [10, -4]]) { ctx.beginPath(); ctx.moveTo(x - 1.4, y - 1.4); ctx.lineTo(x + 1.4, y + 1.4); ctx.moveTo(x + 1.4, y - 1.4); ctx.lineTo(x - 1.4, y + 1.4); ctx.stroke(); }
    ctx.restore(); return;
  }
  const sq = r.mode === 'hit' ? 0.62 : 1, st = r.mode === 'flee' ? 1.25 : 1;
  ctx.scale(st, sq);
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(-16, -2, -18, r.mode === 'flee' ? -8 : -5); ctx.stroke(); // 尾
  ctx.fillStyle = body; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(0, -5, 9.5, 5.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(13, -6, 14, -3); ctx.quadraticCurveTo(10, -1, 6, -2); ctx.fill(); ctx.stroke(); // 頭
  ctx.fillStyle = '#d9a59a'; ctx.beginPath(); ctx.arc(6, r.alert ? -12 : -10, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // 耳
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(10.5, -5.4, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(r.x, r.y);
  if (r.mode === 'sniff') { ctx.strokeStyle = '#6f9a52'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((r.face || 1) * (16 + i * 3), 2); ctx.lineTo((r.face || 1) * (17 + i * 3), -4); ctx.stroke(); } }
  if (r.mode === 'alert') { ctx.fillStyle = '#c0392b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -18); }
  if (r.mode === 'flee') for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(201,176,122,${0.55 - i * 0.15})`; ctx.beginPath(); ctx.arc(-(r.face || 1) * (18 + i * 7), -2 - (i % 2) * 2, 3 - i * 0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ---------- 場景物件 ----------
function fence(ctx, broken) {
  const { x1, y1, x2, y2 } = FENCE, n = 7, post = (i) => [x1 + (x2 - x1) * i / (n - 1), y1 + (y2 - y1) * i / (n - 1)];
  ctx.lineCap = 'round';
  for (const h of [32, 16]) { ctx.strokeStyle = '#b59a5c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(post(0)[0], post(0)[1] - h); ctx.lineTo(post(n - 1)[0], post(n - 1)[1] - h); ctx.stroke(); }
  for (let i = 0; i < n; i++) { const [x, y] = post(i); ctx.strokeStyle = '#9c8048'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke(); ctx.fillStyle = '#c2a666'; ctx.beginPath(); ctx.arc(x, y - 40, 2.6, 0, Math.PI * 2); ctx.fill(); }
}
function rack(ctx) {
  ctx.save(); ctx.translate(RACK.x, RACK.y + 8);
  ctx.fillStyle = '#8a6a3e'; ctx.fillRect(-26, -40, 3, 40); ctx.fillRect(23, -40, 3, 40);
  for (const sy of [-36, -18]) { ctx.fillStyle = '#d8bf86'; ctx.strokeStyle = '#9a7a44'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, sy, 27, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#5f9a4a'; ctx.beginPath(); ctx.ellipse(-16 + i * 11, -39, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function bench(ctx) {
  const { x, y, w } = BENCH;
  ctx.fillStyle = '#8f8d86'; ctx.fillRect(x - w / 2 + 8, y - 10, 10, 10); ctx.fillRect(x + w / 2 - 18, y - 10, 10, 10);
  ctx.fillStyle = '#b2afa5'; ctx.strokeStyle = '#77746c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 8, 3); ctx.fill(); ctx.stroke();
}
function viewStone(ctx) {
  const { x, y } = VIEW_STONE;
  ctx.fillStyle = '#a7a59d'; ctx.strokeStyle = '#6f6d66'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 20, y + 4); ctx.quadraticCurveTo(x - 18, y - 14, x, y - 16); ctx.quadraticCurveTo(x + 20, y - 12, x + 22, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// 一格畫面：背景 → 地面疊層（範圍、路線、感知圈）→ 依 y 排序的道具／人物／鼠 → 上層效果（接觸、逃逸箭頭）。
export function drawScene(ctx, a, st, cam, W, H) {
  ctx.save();
  ctx.fillStyle = '#bdc791'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
  const { scene, shared } = a;
  ctx.drawImage(shared[scene.background], 0, 0, scene.size.w, scene.size.h);
  const g = st.ground || {};
  if (g.range) {
    ctx.save();
    ctx.fillStyle = g.range === 'hot' ? 'rgba(200,150,46,.16)' : 'rgba(200,150,46,.08)'; ctx.strokeStyle = '#a0741e'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 5]);
    ctx.beginPath(); RANGE.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (g.route) {
    ctx.save(); ctx.strokeStyle = 'rgba(79,120,168,.85)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); g.route.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    const [ex, ey] = g.route.at(-1); ctx.setLineDash([]); ctx.fillStyle = 'rgba(79,120,168,.85)'; ctx.beginPath(); ctx.ellipse(ex, ey + 1, 9, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (g.home) {
    ctx.save(); ctx.strokeStyle = 'rgba(79,154,90,.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); g.home.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
  }
  if (g.sense) {
    const [x, y, r] = g.sense; ctx.save(); ctx.strokeStyle = 'rgba(192,57,43,.7)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (g.flee) {
    ctx.save(); ctx.strokeStyle = 'rgba(192,57,43,.85)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); g.flee.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    const [x1, y1] = g.flee.at(-2), [x2, y2] = g.flee.at(-1), ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.setLineDash([]); ctx.fillStyle = 'rgba(192,57,43,.85)'; ctx.translate(x2, y2); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // 依腳底 y 排序
  const items = [];
  for (const p of scene.props) items.push({ y: p.y, draw: () => ctx.drawImage(shared[p.file], p.x - p.ax, p.y - p.ay, p.w, p.h) });
  const v = scene.vats[1], vp = scene.places.vat;
  items.push({ y: vp.y, draw: () => ctx.drawImage(shared[v.file], vp.x - v.ax, vp.y - v.ay, v.w, v.h) });
  items.push({ y: (FENCE.y1 + FENCE.y2) / 2, draw: () => fence(ctx) });
  items.push({ y: RACK.y + 8, draw: () => rack(ctx) });
  items.push({ y: BENCH.y, draw: () => bench(ctx) });
  items.push({ y: VIEW_STONE.y + 4, draw: () => viewStone(ctx) });
  for (const p of st.people || []) items.push({ y: p.y, draw: () => drawPerson(ctx, a, p) });
  for (const r of st.rats || []) if (r.mode !== 'none') items.push({ y: r.y, draw: () => drawRat(ctx, r) });
  items.sort((p, q) => p.y - q.y).forEach((i) => i.draw());
  for (const fx of st.fx || []) {
    ctx.save(); ctx.translate(fx.x, fx.y);
    if (fx.kind === 'contact') {
      const crisp = fx.skill === 'e';
      ctx.strokeStyle = crisp ? '#f0b429' : 'rgba(240,180,41,.75)'; ctx.lineWidth = crisp ? 2.2 : 1.4;
      const n = crisp ? 8 : 5;
      for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2 + (crisp ? 0 : 0.4); ctx.beginPath(); ctx.moveTo(Math.cos(t) * 5, Math.sin(t) * 3.5); ctx.lineTo(Math.cos(t) * (crisp ? 13 : 9), Math.sin(t) * (crisp ? 9 : 6)); ctx.stroke(); }
      ctx.fillStyle = crisp ? 'rgba(255,240,190,.9)' : 'rgba(255,240,190,.6)'; ctx.beginPath(); ctx.ellipse(0, 0, crisp ? 5 : 4, crisp ? 3.5 : 2.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (fx.kind === 'swish') { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 * fx.face, -10, 14 + i * 4, fx.face > 0 ? -1.2 : Math.PI + 0.2, fx.face > 0 ? -0.2 : Math.PI + 1.2); ctx.stroke(); } }
    if (fx.kind === 'stop') { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke(); }
    if (fx.kind === 'turn') { ctx.strokeStyle = 'rgba(79,120,168,.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -30, 10, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(5, -44); ctx.moveTo(0, -40); ctx.lineTo(5, -36); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}

export function toScreen(cam, W, H, x, y) { return [W / 2 + (x - cam.x) * cam.zoom, H / 2 + (y - cam.y) * cam.zoom]; }
