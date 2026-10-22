// 宗門編年生活開發版：PixiJS＋HTML/CSS。場景（背景、可排序物件、兩人與影子、選取圈）畫在 Pixi；
// HUD、名冊、選單、面板、名牌、提示是 HTML/CSS。世界只有 model.mjs：畫面只讀 view()，下令只走 dispatch()，
// 推進只經 createClock() 換算的固定步進。暫停、背景、播放倍率與畫面幀率都不改結果。
import { Application, Assets, Container, Graphics, Sprite } from './vendor/pixi.min.mjs';
import { createModel, createClock, PEOPLE, JOBS, STEP_MS, RULES } from './model.mjs';
import { createAnimator } from '../template/animator.mjs';
import { createRoutes, HERB, SEATS, FUN, BOAR, GUARD } from './routes.mjs';

const SHARED = '../spikes/shared/';
const t0 = performance.now();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const template = await (await fetch('../template/actions.json')).json();
const IDS = PEOPLE.map((p) => p.id);
const sheets = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await Assets.load(`../template/out/${id}.json`)])));
const animators = Object.fromEntries(IDS.map((id) => [id, createAnimator(template, sheets[id].data)]));
const profiles = { hero: { name: scene.ui.hero.name, label: '主角', role: '初學者 · 起始腳力 Lv 1' }, cousin: { name: '熟手同伴', label: '熟手', role: '熟手 · 起始腳力 Lv 3' } };
const R = scene.resolution;
const $ = (id) => document.getElementById(id);

const app = new Application();
await app.init({ resizeTo: window, background: '#bdc791', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);

const sharedFiles = [scene.background, ...scene.props.map((p) => p.file), ...scene.vats.map((v) => v.file)];
await Assets.load(sharedFiles.map((f) => SHARED + 'assets/' + f));
const TS = (f) => Assets.get(SHARED + 'assets/' + f);

// ---------- 路線（只是畫面換算：模型給「走到第幾成」，這裡換成場景座標；算法在 routes.mjs） ----------
const geo = createRoutes(scene.path.points), { routes: ROUTES, place } = geo;
const path = ROUTES.water, herbPath = ROUTES.herb;
const places = {
  ...scene.places,
  herb: { label: '藥圃', x: HERB.patch.x, y: HERB.patch.y + 14, rx: 70, ry: 30, sub: '道館東側坡地 · 可重複採' },
  rack: { label: '藥架', x: HERB.rack.x, y: HERB.rack.y, rx: 30, ry: 22, sub: '道館院中 · 交藥處' },
  bench: { label: '休息石凳', x: SEATS.bench.x, y: SEATS.bench.y + 6, rx: 50, ry: 18, sub: '松樹下 · 兩人各一席' },
  view: { label: '觀景石', x: FUN.hero.stone.x, y: FUN.hero.stone.y, rx: 34, ry: 16, sub: '院子西側草坡 · 主角愛來看山（閒暇，不回精力）' },
  fence: { label: '西坡竹護欄', x: BOAR.fence.x, y: BOAR.fence.y2 - 10, rx: 46, ry: 46, sub: '非關鍵護欄 · 內側是防守點' },
  yard: { label: '院邊空地', x: FUN.cousin.points.at(-1)[0], y: FUN.cousin.points.at(-1)[1] + 6, rx: 34, ry: 14, sub: '道館門前院中 · 熟手愛來舒展筋骨（閒暇，不回精力）' },
};
const GROWN_FROM = 3; // 本趟腳力到 Lv 3 起換成長後步態

// 人物在畫面上的樣子：全部由模型的階段與步數推出，不另存狀態
function pose(ph, level, mode, resting = false, id = 'hero', job = 'water') {
  const phase = mode === 'carry' && ph ? ph.name : resting ? 'rest' : 'idle';
  const at = place(phase, ph?.k || 0, job);
  const view = { phase, k: ph?.k || 0, travelled: at.travelled };
  // 模型只提供階段與進度；共用動畫用實際走過的距離換幀，不另開 walker 或時鐘。
  const pick = animators[id].pick(view, { grown: level >= GROWN_FROM });
  return { x: at.x, y: at.y, face: at.face, ...pick, travelled: at.travelled, phase };
}
// LP-04：去／回座位用空手步態（同一份距離換幀），坐下用模板的「坐下歇」；主角 sheet 沒有坐姿，暫用採藥蹲姿並在面板標明。
// LP-05：去／回偏好點用空手步態（借採藥空手走路幀、不畫背簍）；活動中主角用「看山」背影、熟手用「舒展筋骨」循環（幀依模型活動步數換，不看真實時間）。
const FUN_TICKS_PER_POSE = 36;
// LP-08：往返護欄用空手步態；動手沒有專用幀，借「舒展筋骨」的前彎（綁竹／敲樁）與站直兩幀交替出節奏，面板如實標示借用。
const FIX_BEAT = 45, FIX_BEND = 30; // 每 45 tick 一拍：前彎 30 tick、站直 15 tick（只是畫面節奏，進度只看模型步數）
function poseOf(id, person) {
  if (person.fixing) {
    const at = geo.of(id, person), a = animators[id];
    const view = person.mode === 'fix' ? { phase: 'stretch', k: 0, travelled: person.fixWork.steps % FIX_BEAT < FIX_BEND ? 3 : 0 } : { phase: 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: person.mode, borrowed: person.mode === 'fix' };
  }
  // LP-06：往返防守點用空手步態；等候用空手站姿（舒展筋骨第一幀＝站直，不扛扁擔）；喝止無專用幀，用前彎那幀＋畫面另畫喝止波紋。
  if (person.guarding) {
    const at = geo.of(id, person), a = animators[id];
    const walk = person.mode === 'toGuard' || person.mode === 'fromGuard';
    const view = walk ? { phase: 'herbOut', k: 0, travelled: at.travelled } : { phase: 'stretch', k: 0, travelled: person.mode === 'shout' && person.shoutK > 0.3 ? 3 : 0 };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: person.mode };
  }
  if (person.leisure) {
    const at = geo.of(id, person), a = animators[id];
    // 往返用空手往藥圃的步態（不畫背簍），不扛扁擔。
    const view = person.mode === 'fun' ? { phase: FUN[id].act, k: 0, travelled: person.funSteps / FUN_TICKS_PER_POSE } : { phase: 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: person.mode };
  }
  if (person.mode !== 'toSeat' && person.mode !== 'back' && person.mode !== 'seated') return pose(person.phase, person.tripLevel, person.mode, false, id, person.job);
  const at = geo.of(id, person), a = animators[id];
  const view = { phase: person.mode === 'seated' ? 'rest' : 'down', k: 0, travelled: at.travelled };
  let pick = a.pick(view);
  if (person.mode === 'seated' && pick.fallback && a.has('herbGather')) pick = { ...a.pick({ phase: 'herbGather', k: 0, travelled: 0 }), requested: 'rest', fallback: true, chain: ['rest', 'herbGather'] };
  return { x: at.x, y: at.y, face: at.face, ...pick, travelled: at.travelled, phase: person.mode };
}

// ---------- 場景 ----------
const world = new Container();
app.stage.addChild(world);
const bg = new Sprite(TS(scene.background));
bg.scale.set(1 / R);
world.addChild(bg);
// 採藥小路與藥圃：簡單原創圖形，畫在地面層（人物一律在上面）。
const ground = new Graphics();
{
  const pts = HERB.points.flat();
  ground.poly(pts, false).stroke({ width: 15, color: 0xc9b07a, join: 'round', cap: 'round' });
  ground.poly(pts, false).stroke({ width: 11, color: 0xe2d1a2, join: 'round', cap: 'round' });
  const { x, y } = HERB.patch;
  ground.ellipse(x, y + 8, 74, 30).fill(0x8a6b45).stroke({ width: 2, color: 0x6e5434 });
  for (let r = 0; r < 3; r++) ground.ellipse(x, y - 4 + r * 12, 60 - r * 4, 4).fill({ color: 0x6e5434, alpha: 0.45 });
  for (let i = 0; i < 18; i++) {
    const r = i % 3, c = Math.floor(i / 3), tx = x - 50 + c * 20 + (r % 2) * 8, ty = y - 6 + r * 12;
    for (const [dx, a] of [[-4, -0.5], [0, 0], [4, 0.5]]) ground.ellipse(tx + dx, ty - 5, 2.6, 6).fill(r === 1 ? 0x5f9a4a : 0x4f8a3e);
    ground.circle(tx, ty - 11, 1.8).fill(0xe8d16a);
  }
  // 竹籬兩段
  for (let i = 0; i < 6; i++) ground.rect(x + 76 + (i % 2) * 2, y - 20 + i * 8, 3, 12).fill(0xa98a52);
}
world.addChild(ground);
const sorted = new Container();
sorted.sortableChildren = true; // 依腳底 y 排序：人物走到樹叢後面時被遮住
world.addChild(sorted);
const placeSprite = (file, ax, ay, w, h, x, y) => {
  const s = new Sprite(TS(file));
  s.scale.set(1 / R);
  s.anchor.set(ax / w, ay / h);
  s.position.set(x, y);
  s.zIndex = y;
  sorted.addChild(s);
  return s;
};
for (const p of scene.props) placeSprite(p.file, p.ax, p.ay, p.w, p.h, p.x, p.y);
// 休息區：原創簡單圖形的長石凳，兩個座位各鋪一塊蒲團；排在坐著的人後面。
{
  const b = new Graphics(), { x, y, w } = SEATS.bench;
  b.ellipse(0, 6, w / 2 + 8, 9).fill({ color: 0x5b5a3a, alpha: 0.25 });
  b.roundRect(-w / 2 + 6, -4, 10, 10, 2).fill(0x8f8f86).roundRect(w / 2 - 16, -4, 10, 10, 2).fill(0x8f8f86);
  b.roundRect(-w / 2, -12, w, 9, 4).fill(0xb9b8ad).stroke({ width: 1.2, color: 0x7b7a70 });
  for (const id of ['hero', 'cousin']) { const [sx] = SEATS[id].points.at(-1); b.ellipse(sx - x, -12, 11, 3.5).fill(id === 'hero' ? 0x9db0c8 : 0xa8bf9a); }
  b.position.set(x, y);
  b.zIndex = y - 2;
  sorted.addChild(b);
}
// 觀景石：原創簡單圖形，主角看山時站在它旁邊；只是地標，不是座位。
{
  const g = new Graphics(), { x, y } = FUN.hero.stone;
  g.ellipse(0, 4, 26, 7).fill({ color: 0x5b5a3a, alpha: 0.22 });
  g.poly([-22, 2, -18, -14, -6, -22, 10, -20, 22, -8, 22, 3]).fill(0xa9a89a).stroke({ width: 1.4, color: 0x75746a });
  g.poly([-14, -12, -4, -19, 8, -17]).stroke({ width: 1, color: 0xc9c8bc });
  g.position.set(x, y);
  g.zIndex = y;
  sorted.addChild(g);
}
// ---------- LP-06：林緣、竹護欄、防守點與野豬（原創簡單圖形，可編輯來源就是這段程式） ----------
{
  // 林緣：畫面西側幾株矮樹叢，野豬從這裡出來嗅探。
  const { x, y } = BOAR.edge;
  for (const [dx, dy, r, c] of [[-34, -6, 22, 0x4c7a3c], [-8, -14, 26, 0x5a8a44], [22, -4, 20, 0x4c7a3c], [-46, 10, 16, 0x5f9050], [10, 12, 15, 0x557f45]]) {
    const g = new Graphics();
    g.rect(-2, -4, 4, 12).fill(0x6e5434);
    g.ellipse(0, -r * 0.7, r, r * 0.8).fill(c).stroke({ width: 1.2, color: 0x3c5f30 });
    g.ellipse(-r * 0.3, -r, r * 0.45, r * 0.35).fill({ color: 0x8ab06a, alpha: 0.5 });
    g.position.set(x + dx, y + dy + 8); g.zIndex = y + dy + 8;
    sorted.addChild(g);
  }
}
const fence = new Graphics();
sorted.addChild(fence);
// 竹護欄：一段南北向的矮籬，損痕 0～3 只改外觀（裂紋→歪柱→斷橫桿），不擋路、不影響任何工作。
function drawFence(marks, hitFlash = 0) {
  const { x1, x2, y1, y2 } = BOAR.fence, n = 7;
  fence.clear();
  const post = (i) => ({ x: x1 + (x2 - x1) * i / (n - 1) - fence.x, y: y1 + (y2 - y1) * i / (n - 1) - fence.y });
  for (const h of [32, 16]) {
    const a = post(0), b = post(n - 1), m = post(3);
    if (marks >= 3 && h === 32) {
      // 斷橫桿：中段斷開垂下
      fence.moveTo(a.x, a.y - h).lineTo(m.x - 3, m.y - h).stroke({ width: 3.4, color: 0xb59a5c });
      fence.moveTo(m.x + 3, m.y - h + 9).lineTo(b.x, b.y - h).stroke({ width: 3.4, color: 0xb59a5c });
    } else fence.moveTo(a.x, a.y - h).lineTo(b.x, b.y - h).stroke({ width: 3.4, color: 0xb59a5c });
  }
  for (let i = 0; i < n; i++) {
    const p = post(i), tilt = marks >= 2 && i === 3 ? 8 : 0;
    fence.moveTo(p.x, p.y).lineTo(p.x - tilt, p.y - 40).stroke({ width: 4.5, color: 0x9c8048, cap: 'round' });
    fence.circle(p.x - tilt, p.y - 40, 2.6).fill(0xc2a666);
  }
  if (marks >= 1) { const m = post(2); fence.moveTo(m.x - 4, m.y - 30).lineTo(m.x + 3, m.y - 22).lineTo(m.x - 3, m.y - 14).stroke({ width: 1.6, color: 0x4a3720 }); }
  if (hitFlash > 0) { const m = post(3); fence.circle(m.x - 8, m.y - 18, 10 + 10 * hitFlash).stroke({ width: 2.4, color: 0xd0702a, alpha: hitFlash }); }
}
fence.position.set(BOAR.fence.x, (BOAR.fence.y1 + BOAR.fence.y2) / 2);
fence.zIndex = fence.y;
drawFence(0);
// 防守點：護欄內側一塊踏平的草地。
{
  const [gx, gy] = GUARD.points.at(-1);
  ground.ellipse(gx, gy + 2, 16, 5).fill({ color: 0xc9b07a, alpha: 0.75 }).stroke({ width: 1, color: 0x9a7a44, alpha: 0.6 });
}
// 野豬：原創向量圖，朝右畫、翻面朝左。腿依模型走過的距離換步，準備撞時後坐再前衝，逃跑時揚塵；全部只讀 view().boar。
const boarG = new Graphics();
boarG.visible = false;
sorted.addChild(boarG);
function drawBoar(b, now) {
  const g = boarG;
  g.clear();
  const walking = b.mode === 'out' || b.mode === 'approach' || b.mode === 'flee';
  const gait = walking ? Math.sin(b.d / (b.mode === 'flee' ? 7 : 5)) : 0;
  let lean = 0, head = 0;
  if (b.mode === 'prep') lean = b.prepK < 0.75 ? -7 * b.prepK / 0.75 : -7 + 19 * (b.prepK - 0.75) / 0.25;
  if (b.mode === 'sniff') head = 3 + 3 * Math.sin(b.sniffK * Math.PI * 6);
  g.ellipse(0, 1, 24, 5).fill({ color: 0x3a3424, alpha: 0.25 });
  const legs = [[-14, 1], [-7, -1], [8, 1], [14, -1]];
  for (const [lx, ph] of legs) g.rect(lean + lx - 2 + gait * 3 * ph, -10, 4, 10).fill(0x3b2a1e);
  g.ellipse(lean, -16, 22, 11).fill(0x5a4030).stroke({ width: 1.2, color: 0x2e2018 });
  for (let i = 0; i < 6; i++) g.moveTo(lean - 14 + i * 5, -26).lineTo(lean - 12 + i * 5, -31).stroke({ width: 1.6, color: 0x2e2018 }); // 鬃毛
  g.poly([lean + 14, -24, lean + 30, -14 + head, lean + 30, -8 + head, lean + 14, -8]).fill(0x4e382a).stroke({ width: 1.2, color: 0x2e2018 });
  g.ellipse(lean + 31, -11 + head, 3.2, 3.6).fill(0x8a6a5a);
  g.moveTo(lean + 26, -8 + head).lineTo(lean + 29, -14 + head).stroke({ width: 2, color: 0xf2ead8, cap: 'round' }); // 獠牙
  g.circle(lean + 22, -18 + head, 1.4).fill(0x111111);
  g.poly([lean + 16, -24, lean + 19, -31, lean + 21, -23]).fill(0x3b2a1e);
  g.moveTo(lean - 22, -18).lineTo(lean - 27, -14 + gait * 2).stroke({ width: 1.4, color: 0x2e2018 });
  if (b.mode === 'flee') for (let i = 0; i < 3; i++) g.circle(-28 - i * 9, -4 - (i % 2) * 3, 4 - i).fill({ color: 0xc9b07a, alpha: 0.55 - i * 0.15 });
  if (b.mode === 'sniff') for (let i = 0; i < 3; i++) g.moveTo(-30 + i * 6, 4).lineTo(-32 + i * 6 + Math.sin(now / 90 + i) * 3, -6).stroke({ width: 2, color: 0x6f9a52 }); // 草動
}
const shoutG = new Graphics();
shoutG.visible = false;
sorted.addChild(shoutG);

const vatV = scene.vats[1];
const vatSprite = placeSprite(vatV.file, vatV.ax, vatV.ay, vatV.w, vatV.h, scene.places.vat.x, scene.places.vat.y);
// 藥架：兩層竹篩，每份藥草畫一束（最多 8）。
const rack = new Graphics();
rack.position.set(places.rack.x, places.rack.y + 8);
rack.zIndex = places.rack.y + 8;
sorted.addChild(rack);
function drawRack(n) {
  rack.clear();
  rack.rect(-26, -40, 3, 40).fill(0x8a6a3e).rect(23, -40, 3, 40).fill(0x8a6a3e);
  for (const sy of [-36, -18]) rack.ellipse(0, sy, 27, 5).fill(0xd8bf86).stroke({ width: 1.2, color: 0x9a7a44 });
  for (let i = 0; i < n; i++) {
    const row = i < 4 ? -36 : -18, cx = -16 + (i % 4) * 11;
    rack.ellipse(cx, row - 3, 4.5, 3).fill(0x5f9a4a).stroke({ width: 0.8, color: 0x3e6b30 });
  }
}
// 背簍：原創簡單圖形，load 0～1 決定冒出多少藥草。原點在簍底中央。
function drawBasket(g, load) {
  g.clear();
  if (load > 0) for (let i = 0; i < 5; i++) {
    const h = 5 + 7 * load * (i % 2 ? 0.8 : 1);
    g.ellipse(-6 + i * 3, -20 - h / 2, 2.4, h / 2 + 1).fill(i % 2 ? 0x5f9a4a : 0x4f8a3e);
  }
  g.poly([-9, -21, 9, -21, 6.5, 0, -6.5, 0]).fill(0xb08a4e).stroke({ width: 1.2, color: 0x6e5434 });
  for (const y of [-15, -9, -3]) g.moveTo(-8 + (y + 21) * 0.1, y).lineTo(8 - (y + 21) * 0.1, y).stroke({ width: 0.9, color: 0x7e6036 });
  g.rect(-9.5, -22.5, 19, 2.5).fill(0x8a6a3e);
}

const personSprite = (id, alpha = 1, tint) => {
  const sheet = sheets[id], h = sheet.data.meta;
  const s = new Sprite(sheet.textures[sheet.data.animations.idle[0]]);
  // Pixi 已依 meta.scale 換回場景單位；所有幀共用同一個腳底錨點。
  s.anchor.set(h.anchorPx.x / h.frameSize.w, h.anchorPx.y / h.frameSize.h);
  s.alpha = alpha;
  if (tint != null) s.tint = tint;
  sorted.addChild(s);
  return s;
};
const ghost = personSprite('hero', 0.38, 0x9aa7b4);
const ring = new Graphics().ellipse(0, 2, 18, 5.5).stroke({ width: 2.4, color: 0xc8962e });
ring.visible = false;
sorted.addChild(ring);
const sprites = Object.fromEntries(IDS.map((id) => [id, personSprite(id)]));
const baskets = Object.fromEntries(IDS.map((id) => { const g = new Graphics(); g.visible = false; sorted.addChild(g); return [id, g]; }));
// 背簍放哪：去程背在身後（被身體擋住一部分）；回程背對鏡頭，簍在背上看得見；採集與交藥時放在腳邊。
function placeBasket(id, p, person) {
  const g = baskets[id], ph = person.mode === 'carry' && person.phase;
  g.visible = !!ph && person.job === 'herb';
  if (!g.visible) return;
  const s = id === 'cousin' ? 0.97 : 1, k = person.phase.k;
  let load = 0, x = p.x, y = p.y, z = p.y - 0.03;
  if (ph.name === 'herbOut') { x = p.x - p.face * 8 * s; y = p.y - 19 * s; }
  else if (ph.name === 'herbBack') { x = p.x - p.face * 1.5 * s; y = p.y - 17 * s; z = p.y + 0.03; load = 1; }
  else if (ph.name === 'herbGather') { x = p.x - 16; load = k; z = p.y + 0.03; }
  else { x = p.x - 16; load = 1 - k; z = p.y + 0.03; } // 交藥：簍放在面向藥架的一側
  if (g.load !== load) { drawBasket(g, load); g.load = load; }
  g.scale.set(s); g.position.set(x, y); g.zIndex = z;
}

const placeMark = new Graphics();
world.addChild(placeMark);

// ---------- 鏡頭 ----------
const cam = Object.assign({}, scene.camera.start);
const clampZoom = (z) => Math.min(scene.camera.maxZoom, Math.max(scene.camera.minZoom, z));
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.zoom + app.screen.width / 2, y: (y - cam.y) * cam.zoom + app.screen.height / 2 });
const toWorld = (sx, sy) => ({ x: (sx - app.screen.width / 2) / cam.zoom + cam.x, y: (sy - app.screen.height / 2) / cam.zoom + cam.y });
function applyCam() {
  cam.x = Math.min(scene.size.w, Math.max(0, cam.x));
  cam.y = Math.min(scene.size.h, Math.max(0, cam.y));
  world.scale.set(cam.zoom);
  world.position.set(app.screen.width / 2 - cam.x * cam.zoom, app.screen.height / 2 - cam.y * cam.zoom);
}
function zoomAt(sx, sy, z) {
  const before = toWorld(sx, sy);
  cam.zoom = clampZoom(z);
  const after = toWorld(sx, sy);
  cam.x += before.x - after.x; cam.y += before.y - after.y;
  applyCam();
}
// 窄螢幕：鏡頭跟著主角，並把主角放在 HUD 與底部抽屜之間的空處；拖曳後停止跟隨，按 0 恢復
const narrow = () => window.innerWidth <= 640;
if (narrow()) cam.zoom = 0.85;
function follow() {
  const p = positions[selectedPerson()];
  const top = document.querySelector('.hud').getBoundingClientRect().bottom;
  const drawer = [$('menu'), $('panel'), $('roster')].filter((el) => !el.hidden && el.offsetHeight).map((el) => el.getBoundingClientRect().top);
  const bottom = Math.min(window.innerHeight, ...drawer);
  const ty = p.y - 30 - ((top + bottom) / 2 - app.screen.height / 2) / cam.zoom;
  cam.x += (p.x - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  applyCam();
}

// ---------- 狀態 ----------
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: scene.path.length, herb: r1(herbPath.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength) };
let model = createModel(LENGTHS);
const clock = createClock();
const ui = { follow: narrow(), playing: true, speed: 1, autoPaused: false, pausedByMenu: false, selected: null, menu: null, menuPerson: null, rosterOpen: true, shadow: true, returnFocus: null };
let v = model.view();
let positions = Object.fromEntries(IDS.map((id) => [id, poseOf(id, v.people[id])]));
const fx = []; // 浮字（只是畫面效果）
const selectedPerson = () => IDS.includes(ui.selected) ? ui.selected : 'hero';

// sheet 碰框是像素；換成相對腳底的場景單位，翻面時身體碰框跟著翻。
const bodies = Object.fromEntries(IDS.map((id) => {
  const h = sheets[id].data.meta, r = Number(h.scale);
  return [id, { x: (h.hitbox.x - h.anchorPx.x) / r, y: (h.hitbox.y - h.anchorPx.y) / r, w: h.hitbox.w / r, h: h.hitbox.h / r }];
}));
function bodyBox(id) {
  const p = positions[id], body = bodies[id];
  return { x: p.x + (p.face > 0 ? body.x : -(body.x + body.w)), y: p.y + body.y, w: body.w, h: body.h };
}
function tapBox(id) {
  const b = bodyBox(id);
  const px = Math.max(0, (44 / cam.zoom - b.w) / 2), py = Math.max(0, (44 / cam.zoom - b.h) / 2);
  return { x: b.x - px, y: b.y - py, w: b.w + px * 2, h: b.h + py * 2 };
}
function screenBox(b) { return { ...toScreen(b.x, b.y), w: b.w * cam.zoom, h: b.h * cam.zoom }; }
function hitTest(sx, sy) {
  const w = toWorld(sx, sy);
  let front = null;
  for (const id of IDS) {
    const b = tapBox(id);
    if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h && (!front || positions[id].y >= positions[front].y)) front = id;
  }
  if (front) return { kind: 'person', id: front };
  for (const [id, pl] of Object.entries(places)) {
    const dx = (w.x - pl.x) / pl.rx, dy = (w.y - (pl.y - pl.ry * 0.6)) / (pl.ry * 1.6);
    if (dx * dx + dy * dy <= 1) return { kind: 'place', id };
  }
  return null;
}

// ---------- 輸入 ----------
let drag = null;
app.canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; app.canvas.setPointerCapture(e.pointerId); });
app.canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
  if (drag.moved) { ui.follow = false; cam.x = drag.cx - dx / cam.zoom; cam.y = drag.cy - dy / cam.zoom; applyCam(); }
});
app.canvas.addEventListener('pointerup', (e) => {
  const d = drag; drag = null;
  if (!d || d.moved) return;
  const hit = hitTest(e.offsetX, e.offsetY);
  if (!hit) { if (ui.menu) closeMenu(); return; }
  if (hit.kind === 'person') select(ui.selected === hit.id ? null : hit.id);
  else openMenu(hit.id);
});
app.canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, cam.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.menu) { e.preventDefault(); closeMenu(); return; }
  if (e.target.closest && e.target.closest('.menu')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveFocus(e.key === 'ArrowDown' ? 1 : -1); }
    if (e.key === 'Tab') { e.preventDefault(); moveFocus(e.shiftKey ? -1 : 1); } // 焦點留在選單裡
    return;
  }
  if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (e.target.closest && e.target.closest('button, a') && (e.key === ' ' || e.key === 'Enter')) return; // 交給按鈕／舊版連結本身
  const k = e.key;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === '1' || k === '2' || k === '4') setSpeed(Number(k));
  else if (k === '+' || k === '=') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom * 1.1);
  else if (k === '-') zoomAt(app.screen.width / 2, app.screen.height / 2, cam.zoom / 1.1);
  else if (k === '0') { Object.assign(cam, scene.camera.start); if (narrow()) cam.zoom = 0.85; ui.follow = narrow(); applyCam(); }
  else if (k.startsWith('Arrow')) { const s = 40 / cam.zoom; cam.x += k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0; cam.y += k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; applyCam(); }
  else if (k === 'r' || k === 'R') toggleRoster();
  else if (k === 's' || k === 'S') toggleShadow();
  else if (k === 'Enter' && IDS.includes(ui.selected)) { e.preventDefault(); openMenu('vat'); } // 不讓同一次 Enter 落到剛拿到焦點的選項上
});
// 背景：一律暫停並清掉待補時間；若原本是選單造成的暫停，回來後也不會因為關選單就自己恢復播放
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (ui.playing || ui.pausedByMenu)) { ui.playing = false; ui.autoPaused = true; ui.pausedByMenu = false; }
  clock.clear();
  renderChrome();
});
window.addEventListener('resize', () => { applyCam(); measure(); });
$('play').addEventListener('click', togglePlay);
for (const b of document.querySelectorAll('[data-speed]')) b.addEventListener('click', () => setSpeed(Number(b.dataset.speed)));
$('roster-toggle').addEventListener('click', toggleRoster);
$('shadow-toggle').addEventListener('click', toggleShadow);
$('reset').addEventListener('click', reset);
$('roster').addEventListener('click', (e) => { const b = e.target.closest('[data-person]'); if (b) select(ui.selected === b.dataset.person ? null : b.dataset.person); });
$('panel').addEventListener('click', (e) => {
  const a = e.target.closest('[data-auto]');
  if (a) { autoSet(a.dataset.auto); return; }
  const b = e.target.closest('[data-cmd]'); if (b) command(b.dataset.cmd);
});
$('boar').addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) command(b.dataset.cmd); });

function togglePlay() { if (ui.menu) closeMenu(false); ui.playing = !ui.playing; ui.autoPaused = false; ui.pausedByMenu = false; clock.clear(); renderChrome(); }
function setSpeed(s) { ui.speed = s; renderChrome(); }
function toggleRoster() { ui.rosterOpen = !ui.rosterOpen; renderChrome(); }
function toggleShadow() { ui.shadow = !ui.shadow; renderChrome(); }
function select(id) { ui.selected = id; if (narrow() && IDS.includes(id)) ui.follow = true; renderChrome(); }
function reset() {
  if (ui.menu) closeMenu(false);
  model = createModel(LENGTHS);
  clock.clear();
  v = model.view();
  fx.length = 0;
  toast('已重來：主角 Lv 1、熟手 Lv 3，兩人挑水、精力 100；水缸 3 擔、藥架 0 份；野豬回棲地精力 60、威脅 0，護欄損痕 0；休息、休閒、叫回、驅離、整理與待執行指令已清除；自主護院回到兩人未允許（熟手主動照看、主角受擾再處理）');
  renderChrome();
}

function menuOptions(id, person) {
  // 地點自己的工作排第一，其次本趟後休息，再來另一份工作。
  const here = id === 'herb' || id === 'rack' ? 'herb' : 'water', rank = id === 'fence' ? { fix: 0, fixCancel: 0, guard: 1 } : id === 'bench' ? { restAfterTrip: 0 } : id === 'view' || id === 'yard' ? { recall: 0, resume: 1 } : { [`work:${here}`]: 0, restAfterTrip: 1, guard: 3 };
  const opts = model.actions(person).filter((a) => !a.hidden && !(here === 'herb' && a.id === 'pourNow'))
    .sort((a, b) => (rank[a.id] ?? 2) - (rank[b.id] ?? 2));
  if (id === 'spring') return opts.filter((a) => a.id !== 'pourNow').concat([{ id: 'more', label: '在這裡多裝一桶', enabled: false, reason: '扁擔只掛得了兩桶' }]);
  return opts;
}
function openMenu(id) {
  if (ui.playing) { ui.playing = false; ui.pausedByMenu = true; clock.clear(); }
  ui.menu = id;
  ui.menuPerson = selectedPerson();
  ui.returnFocus = document.activeElement !== document.body ? document.activeElement : null;
  const pl = places[id];
  const m = $('menu');
  m.innerHTML = `<h3>${pl.label}<small>${pl.sub}</small></h3><div class="muted">對象：${profiles[ui.menuPerson].name}（腳力 Lv ${v.people[ui.menuPerson].level}）</div>` +
    menuOptions(id, ui.menuPerson).map((o) => `<button class="opt" data-cmd="${o.id}" ${o.enabled ? '' : 'disabled'}><b>${o.label}</b><span>${o.enabled ? o.detail : o.reason}</span></button>`).join('') +
    '<div class="foot"><span>↑↓ 選擇　Enter 下令</span><span>Esc 關閉</span></div>';
  for (const b of m.querySelectorAll('.opt:not([disabled])')) b.addEventListener('click', () => { command(b.dataset.cmd); });
  m.hidden = false;
  document.body.classList.add('menu-open');
  placeMenu();
  m.querySelector('.opt:not([disabled])')?.focus();
  renderChrome();
}
function placeMenu() {
  if (!ui.menu || narrow()) return;
  const pl = places[ui.menu], s = toScreen(pl.x, pl.y), m = $('menu');
  const w = m.offsetWidth, h = m.offsetHeight;
  // 右側有工作面板時，選單不能蓋住它：先放地點右邊；放不下就疊在面板正下方（不擋場景裡的人）；再不行才放地點左邊
  const pr = $('panel').hidden ? null : $('panel').getBoundingClientRect();
  const right = pr ? pr.left - 10 : window.innerWidth - 10;
  let x = s.x + 40, y = s.y - h / 2;
  if (x + w > right) {
    if (pr && pr.bottom + 10 + h <= window.innerHeight - 40) { x = pr.right - w; y = pr.bottom + 10; }
    else x = s.x - 40 - w;
  }
  m.style.left = `${Math.max(10, Math.min(window.innerWidth - w - 10, x))}px`;
  m.style.top = `${Math.max(60, Math.min(window.innerHeight - h - 40, y))}px`;
}
function moveFocus(d) {
  const opts = [...$('menu').querySelectorAll('.opt:not([disabled])')];
  const i = opts.indexOf(document.activeElement);
  opts[(i + d + opts.length) % opts.length]?.focus();
}
function closeMenu(resume = true) {
  ui.menu = null;
  ui.menuPerson = null;
  $('menu').hidden = true;
  document.body.classList.remove('menu-open');
  if (resume && ui.pausedByMenu) { ui.playing = true; clock.clear(); }
  ui.pausedByMenu = false;
  if (ui.returnFocus && document.contains(ui.returnFocus)) ui.returnFocus.focus();
  else if (document.activeElement && document.activeElement.closest('.menu')) document.activeElement.blur();
  ui.returnFocus = null;
  renderChrome();
}
function command(cmd) {
  const person = ui.menu ? ui.menuPerson : selectedPerson();
  const r = model.dispatch(cmd, person);
  v = model.view(); // 暫停下令也立即顯示最新意圖，不等待下一個畫面幀。
  toast(r.ok ? `${profiles[person].label}：${r.text}` : `做不到：${r.reason}`);
  ui.selected = person;
  if (ui.menu) closeMenu(); else renderChrome();
}
// LP-07 自主護院設定：允許開關與兩種傾向；暫停時也可改，只改設定不推進世界。
function autoSet(what) {
  const id = selectedPerson(), p = v.people[id];
  const r = model.setAuto(id, what === 'allow' ? { allow: !p.auto.allow } : { react: what });
  v = model.view();
  toast(r.ok ? `${profiles[id].label}：${r.text}` : `做不到：${r.reason}`);
  renderChrome();
}
let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800); }

// 窄螢幕版面靠這兩個高度排開：橫幅在 HUD 下面、抽屜在名冊上面
function measure() {
  const st = document.documentElement.style;
  st.setProperty('--hud-h', `${document.querySelector('.hud').offsetHeight}px`);
  st.setProperty('--roster-h', `${$('roster').offsetHeight}px`);
  st.setProperty('--boar-h', `${$('boar').offsetHeight}px`);
}
new ResizeObserver(measure).observe(document.querySelector('.hud'));
new ResizeObserver(measure).observe($('roster'));
new ResizeObserver(measure).observe($('boar'));

// ---------- HTML 介面：只在內容變了才寫 DOM，避免播放中吃掉點擊／焦點 ----------
const last = {};
// 內容變了要重寫時，若焦點在裡面的某個操作上，寫完後把焦點交回同一個操作（同 data-cmd／data-person）
const put = (key, el, html) => {
  if (last[key] === html) return;
  last[key] = html;
  const f = el.contains(document.activeElement) ? document.activeElement : null;
  const sel = f && (f.dataset.cmd ? `[data-cmd="${f.dataset.cmd}"]` : f.dataset.person ? `[data-person="${f.dataset.person}"]` : null);
  el.innerHTML = html;
  if (sel) el.querySelector(sel)?.focus();
};
// 面板按鈕：途中改另一份工作＝「交付後改…」；有待執行時再按當趟工作＝取消、繼續。
const cmdLabel = (a, p) => !a.id.startsWith('work:') || p.mode !== 'carry' ? a.label
  : a.id !== 'work:' + p.job ? `交付後改${JOBS[a.id.slice(5)].label}` : p.pending ? `繼續${p.jobLabel}` : a.label;
const pendText = (p) => p.pending === 'rest' ? '本趟後停工' : `交付後改去${JOBS[p.pending].label}`;
const en = (p) => Math.floor(p.energy);
const srcText = (p) => p.rest === 'manual' ? '玩家停工' : p.rest === 'auto' ? '自主恢復' : p.mode === 'back' ? '自主恢復完成' : p.leisure ? '閒暇（不扣不回）' : p.guarding ? '驅離往返（不扣不回）'
  : p.mode === 'fix' ? '整理護欄動手（每秒 −1，共 8）' : p.fixing ? '整理往返（不扣不回）' : null;
const FIX_RESULT = { done: '整理完成：護欄損痕 −1', threat: '看得見野豬：整理中止，這一階未清', canceled: '已取消整理（未完成，不清痕）', clean: '護欄已沒有損痕，取消' };
// 整理狀態一行：待原趟／恢復／返院、前往、動手進度與取消入口。
function fixHtml(p) {
  if (!p.fix && !p.fixing) return p.fixResult ? `<div class="muted">整理結果：${FIX_RESULT[p.fixResult.kind]}</div>` : '';
  const what = p.mode === 'fix' ? `整理護欄 ${Math.round(p.fixWork.k * 100)}%（${(p.fixWork.steps / 60).toFixed(1)}／${(p.fixWork.need / 60).toFixed(0)} 秒）`
    : p.mode === 'toFix' ? (p.fix ? '走去整理護欄' : '整理已取消，走到護欄後返院') : p.mode === 'fromFix' ? '從護欄返院' : `待整理護欄：${p.next}`;
  return `<div class="fixline"><span>${what}</span>${p.fix ? '<button class="btn" data-cmd="fixCancel">取消本次整理</button>' : ''}</div>${p.mode === 'fix' ? `<div class="bar fix"><i style="width:${Math.round(p.fixWork.k * 100)}%"></i></div>` : ''}`;
}
const RESULT_TEXT = { success: '喝止成功，野豬逃走', late: '晚到：野豬已經走了', expired: '還沒出發野豬就走了，取消', canceled: '已改令，取消驅離' };
const guardText = (p) => p.guardOrder != null ? (p.guarding ? `驅離野豬：${p.status}` : '待驅離野豬（交付／恢復後野豬還在才去）') : null;
const B = RULES.boar;
// 自主護院：允許（預設關）＋可交換傾向＋目前原因；有候補時給「取消這次意願」（＝取消待執行，本訪不再自己去）。
function autoHtml(p) {
  const a = p.auto;
  const react = (r, label) => `<button class="btn ${a.react === r ? 'on' : ''}" data-auto="${r}" aria-pressed="${a.react === r}">${label}</button>`;
  return `<div class="auto ${a.state}"><div class="row"><b>自主護院</b><button class="btn ${a.allow ? 'on' : ''}" data-auto="allow" aria-pressed="${a.allow}">${a.allow ? '允許中' : '未允許'}</button></div>
    <div class="row"><span class="group">${react('early', '主動照看')}${react('late', '受擾再處理')}</span>${a.wanting ? '<button class="btn" data-cmd="cancel" title="取消這次自己去護院的意願；本訪不再自己去">取消意願</button>' : ''}</div>
    <div class="muted">${a.text}</div></div>`;
}
const AUTO_FX = { want: '想去護院', go: '自己去護院', expired: '意願過期', peer: '同伴處理', late: '到場晚到' };
// 野豬卡上的整理入口：誰在整理、或派選中的人去（停用時 title 說原因）。
function fixBtn(b, sel) {
  if (b.fixBy) return `<span class="muted">${profiles[b.fixBy].label}整理中</span>`;
  const opt = model.actions(sel).find((a) => a.id === 'fix');
  if (!opt || opt.hidden) return '<span class="muted">只是外觀，不擋路不停工</span>';
  return `<button class="btn" data-cmd="fix" ${opt.enabled ? '' : 'disabled'} title="${opt.enabled ? opt.detail : opt.reason}">派${profiles[sel].label}整理</button>`;
}
function boarHtml(b) {
  const who = b.assignee ? profiles[b.assignee].label : null;
  const sel = selectedPerson(), opt = model.actions(sel).find((a) => a.id === 'guard');
  const reason = b.mode === 'habitat' ? b.why : b.mode === 'flee' ? `退走原因：${b.why}` : `來的原因：${b.why}`;
  const bar = (cls, val, marks, label) => `<div class="row"><span>${label}</span><b>${Math.floor(val)}／${b.max}</b></div><div class="bar ${cls}"><i style="width:${val / b.max * 100}%"></i>${marks.map((m) => `<s style="left:${m}%"></s>`).join('')}</div>`;
  return `<div class="row"><b>野豬 · ${b.label}</b><span class="muted">第 ${b.visit} 次來訪${b.mode === 'habitat' ? '（已回棲地）' : ''}</span></div>
    <div class="muted why">${reason}</div>
    <div class="bars"><div>${bar('benergy', b.energy, [B.tiredAt, B.goEnergy], '精力（不是血量）')}</div><div>${bar('threat', b.threat, [B.goThreat, B.scaredAt], '威脅記憶')}</div></div>
    <div class="row"><span>護欄損痕 ${b.marks}／${b.maxMarks}</span>${fixBtn(b, sel)}</div>
    ${b.active ? `<div class="row"><span>${who ? `${who}正在處理` : '沒人處理也能繼續生活'}</span>${opt ? `<button class="btn" data-cmd="guard" ${opt.enabled ? '' : 'disabled'} title="${opt.enabled ? opt.detail : opt.reason}">派${profiles[sel].label}驅離</button>` : ''}</div>`
      : b.last ? `<div class="muted">上次：撞了 ${b.last.hits} 下，${b.last.why}</div>` : ''}`;
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sec = (s) => `${s.toFixed(1)} 秒`;
function bannerText() {
  if (ui.menu) return '❚❚ 已暫停　選單開著時世界不前進；下令或按 Esc 關閉';
  if (ui.autoPaused) return '❚❚ 切到背景時已自動暫停；按「繼續」或空白鍵恢復';
  if (!ui.playing) return '❚❚ 已暫停';
  return '';
}
function renderChrome() {
  const id = selectedPerson(), person = v.people[id], profile = profiles[id];
  $('play').textContent = ui.playing ? '❚❚ 暫停' : '▶ 繼續';
  for (const b of document.querySelectorAll('[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === ui.speed);
  $('shadow-toggle').classList.toggle('on', ui.shadow);
  const bt = bannerText();
  $('banner').hidden = !bt;
  if ($('banner').textContent !== bt) $('banner').textContent = bt;
  $('clock').textContent = fmt(v.seconds);
  $('vat').textContent = `水缸 ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`;
  $('herbs').textContent = `藥架 ${v.herbs}／${v.herbCapacity} · 在途 ${v.herbInFlight}`;
  $('leg').textContent = `${profile.label} Lv ${person.level}`;
  $('trips').textContent = `共完成 ${IDS.reduce((n, who) => n + v.people[who].trips, 0)} 趟`;
  const cards = IDS.map((who) => {
    const p = v.people[who], info = profiles[who];
    return `<button class="card ${ui.selected === who ? 'sel' : ''} ${p.resting ? 'stopped' : ''}" data-person="${who}"><b>${info.name} · Lv ${p.level}</b><small><span class="emini"><i style="width:${en(p)}%"></i></span>精力 ${en(p)} · ${p.resting ? '' : p.jobLabel + ' · '}${p.status}</small>${p.pending ? `<small class="due">${pendText(p)}</small>` : ''}${p.auto.allow || p.auto.wanting ? `<small class="autoline">護院：${p.auto.text}</small>` : ''}</button>`;
  }).join('');
  put('roster', $('roster'), cards);
  put('boar', $('boar'), boarHtml(v.boar));
  $('roster').classList.toggle('collapsed', !ui.rosterOpen);
  const panel = $('panel');
  panel.hidden = !IDS.includes(ui.selected);
  if (!panel.hidden) {
    const si = person.speedsInitial, sn = person.mode === 'carry' ? person.tripSpeeds : person.speeds;
    const work = person.fixing ? `整理護欄（回來${person.jobLabel}）` : person.guarding ? `驅離野豬（回來${person.jobLabel}）` : person.mode === 'carry' ? `${person.jobLabel}（持續）· 第 ${person.trips + 1} 趟` : person.resting ? `停工（原工作：${person.jobLabel}）`
      : person.leisure ? `閒暇：${person.pref.doing}（原工作：${person.jobLabel}）` : person.recall ? `${person.jobLabel}（玩家叫回）` : `${person.jobLabel}（持續）`;
    const other = person.job === 'water' ? 'herb' : 'water';
    const pend = person.pending
      ? `<div class="pending"><span><b>${pendText(person)}</b><br><small>本趟${person.jobLabel}交付時生效；再下指令只保留最新一個</small></span><button class="btn" data-cmd="cancel">取消</button></div>`
      : person.resting ? `<div class="pending"><span><b>已停工</b><br><small>回滿也不會自己出發；下令開始才解除</small></span><span><button class="btn" data-cmd="start">開始${person.jobLabel}</button> <button class="btn" data-cmd="work:${other}">改${JOBS[other].label}</button></span></div>`
        : person.recall ? `<div class="pending"><span><b>玩家叫回</b><br><small>回院中${person.jobLabel}；滿了就待命，完成返院後的一趟才解除</small></span><button class="btn" data-cmd="resume">恢復自主</button></div>`
          : '<div class="muted">沒有</div>';
    const cmds = model.actions(id).filter((a) => !a.hidden && a.id !== 'pourNow' && a.id !== 'fixCancel') // 取消整理放在整理狀態列旁
      .map((a) => `<button class="btn" data-cmd="${a.id}" ${a.enabled ? '' : 'disabled'} title="${a.enabled ? a.detail : a.reason}">${cmdLabel(a, person)}</button>`).join(' ');
    if (!panel.firstElementChild) panel.innerHTML = '<div id="p-work"></div><h4>待執行指令</h4><div id="p-pend"></div><div id="p-cmds" class="cmds"></div><div id="p-gain"></div><div id="p-leg"></div>';
    put('p-work', $('p-work'), `<h2>${profile.name}<small>${profile.role}</small></h2>
      <h4>精力</h4><div class="row"><b>${en(person)}／${person.energyMax}</b><span class="muted">${srcText(person) ? `來源：${srcText(person)}` : '工作每秒 −1 · 坐下每秒 +5'}</span></div>
      <div class="bar energy ${person.energy <= 30 ? 'low' : ''}"><i style="width:${person.energy / person.energyMax * 100}%"></i><s style="left:30%"></s><s style="left:80%"></s></div>
      ${person.why ? `<div class="muted">原因：${person.why}</div>` : ''}
      ${guardText(person) ? `<div class="guardline">${guardText(person)}</div>` : person.guardResult ? `<div class="muted">驅離結果：${RESULT_TEXT[person.guardResult.kind]}</div>` : ''}
      ${fixHtml(person)}
      ${autoHtml(person)}
      <div class="muted">偏好：${person.pref ? `${person.pref.label}（${person.pref.place}）· ${person.job === 'herb' ? '藥架' : '水缸'}實存滿才去，有空位就回` : '無'}</div>
      <h4>目前工作</h4><div>${work}</div><div class="row"><span>${person.status}</span>${person.mode === 'carry' ? `<span class="muted">本趟用 Lv ${person.tripLevel}</span>` : ''}</div>
      <div class="bar"><i style="width:${Math.round((person.mode === 'carry' ? person.tripProgress : person.restLeg ? person.restLeg.k : person.funLeg ? person.funLeg.k : person.fixLeg ? person.fixLeg.k : person.fixWork ? person.fixWork.k : 0) * 100)}%"></i></div>
      <div class="next">下一步：${person.next}</div>`);
    put('p-pend', $('p-pend'), pend);
    put('p-cmds', $('p-cmds'), cmds);
    put('p-gain', $('p-gain'), `<h4>收穫（此人交付）</h4><div class="row"><span>挑水 ${person.done.water} 擔</span><span>採藥 ${person.done.herb} 份</span></div>`);
    put('p-leg', $('p-leg'), `<h4>腳力</h4><div class="row"><b>Lv ${person.level}／${person.maxLevel}</b><span class="muted">${person.nextNeed ? `再 ${person.nextNeed - person.xp} 趟升 Lv ${person.level + 1}` : '已到上限，不會再變快'}</span></div>
      <div class="bar xp"><i style="width:${person.nextNeed ? Math.round(person.xp / person.nextNeed * 100) : 100}%"></i></div>
      <table class="cmp"><tr><td>場景單位／秒</td><td class="now">${person.mode === 'carry' ? `本趟 Lv ${person.tripLevel}` : `現在 Lv ${person.level}`}</td><td class="init">起始 Lv ${person.initialLevel}</td></tr>
        <tr><td>去程（空手／空桶）</td><td class="now">${sn.empty.toFixed(1)}</td><td class="init">${si.empty.toFixed(1)}</td></tr>
        <tr><td>回程（負重）</td><td class="now">${sn.load.toFixed(1)}</td><td class="init">${si.load.toFixed(1)}</td></tr>
        ${person.mode === 'carry' ? `<tr><td>本趟${person.jobLabel}（已鎖定）</td><td class="now">${sec(person.tripSecondsNow)}</td><td class="init"></td></tr>` : ''}
        <tr><td>下趟${JOBS[person.nextJob].label}（Lv ${person.level}）</td><td class="now">${sec(person.tripSeconds)}</td><td class="init">${sec(person.tripSecondsInitial)}</td></tr></table>
      <div class="muted">${person.lastTrip ? `上一趟${JOBS[person.lastTrip.job].label}實際 ${sec(person.lastTrip.seconds)}（出發時 Lv ${person.lastTrip.level}）` : '還沒完成第一趟'}；挑水、採藥共用腳力，升級只影響下一趟，倍率只改播放快慢</div>
      ${positions[id].borrowed ? '<div class="muted">動作借用：整理護欄沒有專用幀，暫用「舒展筋骨」前彎／站直兩幀交替</div>' : ''}
      ${positions[id].fallback ? `<div class="muted">動作沿用：${positions[id].requested === 'rest' ? '坐下歇（此人尚無坐姿幀，暫用蹲姿）' : template.actions[positions[id].action].label}</div>` : ''}`);
  }
}

const tagEls = {};
function tag(id, cls, text, x, y, dy = 0) {
  let el = tagEls[id];
  if (!el) { el = tagEls[id] = document.createElement('div'); $('tags').appendChild(el); }
  if (text == null) { el.hidden = true; return; }
  el.hidden = false;
  if (el.className !== `tag ${cls}`) el.className = `tag ${cls}`;
  if (el.textContent !== text) el.textContent = text;
  const s = toScreen(x, y);
  el.style.left = `${Math.round(s.x)}px`; el.style.top = `${Math.round(s.y + dy)}px`;
}

// ---------- 每幀 ----------
let frames = 0, firstFrameMs = null, fenceHit = -1e9;
app.ticker.add((t) => {
  if (ui.playing) { const n = clock.feed(t.deltaMS, ui.speed); for (let i = 0; i < n; i++) model.step(); }
  const prev = v;
  v = model.view();
  for (const id of IDS) {
    const person = v.people[id], p = poseOf(id, person);
    positions[id] = p;
    const sprite = sprites[id];
    sprite.texture = sheets[id].textures[p.frame];
    sprite.scale.x = p.face;
    sprite.position.set(p.x, p.y);
    sprite.zIndex = p.y;
    placeBasket(id, p, person);
    if (person.trips > prev.people[id].trips) {
      const herb = person.lastTrip.job === 'herb', at = places[herb ? 'rack' : 'vat'];
      fx.push({ text: `${profiles[id].label} +1 ${herb ? '份藥' : '擔'}`, x: at.x, y: at.y - 70, until: performance.now() + 1600 });
      if (person.level > prev.people[id].level) fx.push({ text: `${profiles[id].label}腳力 Lv ${person.level}`, x: p.x, y: p.y - 100, until: performance.now() + 2200 });
    }
    const as = person.auto.state, ap = prev.people[id].auto.state;
    if (as !== ap && AUTO_FX[as]) fx.push({ text: `${profiles[id].label}：${AUTO_FX[as]}`, x: p.x, y: p.y - 112, until: performance.now() + 2000 });
    const gr = person.guardResult, pg = prev.people[id].guardResult;
    const fr = person.fixResult, pf = prev.people[id].fixResult;
    if (fr && (!pf || fr.tick !== pf.tick)) fx.push({ text: `${profiles[id].label}：${FIX_RESULT[fr.kind]}`, x: BOAR.fence.x + 30, y: BOAR.fence.y1 - 4, until: performance.now() + 2400 });
    if (gr && gr !== pg && (!pg || gr.tick !== pg.tick)) fx.push({ text: `${profiles[id].label}：${RESULT_TEXT[gr.kind]}`, x: p.x, y: p.y - 96, until: performance.now() + 2200 });
    tag(id, `hero ${ui.selected === id ? 'sel' : ''}`, `${profiles[id].label} Lv ${person.level} · 精力 ${en(person)}`, p.x, p.y, 6);
    tag(`${id}-pill`, `pill ${person.resting ? 'stop' : person.rest || person.mode === 'back' ? 'rest' : person.guarding || person.fixing ? 'guard' : person.leisure ? 'fun' : person.recall ? 'recall' : ''}`, person.mode === 'carry' ? `${person.status} ${Math.round(person.phase.k * 100)}%` : person.mode === 'fix' ? `${person.status} ${Math.round(person.fixWork.k * 100)}%` : person.status, p.x, p.y - (person.mode === 'seated' ? 64 : 80));
  }
  // 野豬與護欄：只讀 view().boar；畫面效果（撞擊閃光、喝止波紋）不入帳。
  const b = v.boar, bp = geo.boarAt(b), now = performance.now();
  if (b.visit === prev.boar.visit && b.hits > prev.boar.hits) { fenceHit = now; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].boar) fx.splice(i, 1); fx.push({ boar: true, text: b.marks > prev.boar.marks ? `砰！護欄損痕 ${b.marks}／${b.maxMarks}` : '砰！（損痕已到頂，不再惡化）', x: BOAR.fence.x - 40, y: BOAR.fence.y1 + 10, until: now + 1600 }); }
  const flash = Math.max(0, 1 - (now - fenceHit) / 400);
  if (fence.marks !== b.marks || flash > 0 || fence.flash) { drawFence(b.marks, flash); fence.marks = b.marks; fence.flash = flash > 0; }
  boarG.visible = bp.visible;
  if (bp.visible) { drawBoar(b, now); boarG.scale.set(1.3 * bp.face, 1.3); boarG.position.set(bp.x, bp.y); boarG.zIndex = bp.y; }
  tag('boar', 'pill boar', bp.visible ? `野豬 · ${b.label}` : null, bp.x + 12, bp.y - 50);
  const shouter = IDS.find((id) => v.people[id].mode === 'shout');
  shoutG.visible = !!shouter;
  if (shouter) {
    const sp = positions[shouter], k = v.people[shouter].shoutK;
    shoutG.clear();
    for (let i = 0; i < 3; i++) shoutG.arc(0, 0, 14 + i * 9 + k * 8, Math.PI * 0.75, Math.PI * 1.25).stroke({ width: 2.4, color: 0xc8962e, alpha: 0.9 - i * 0.25 });
    shoutG.position.set(sp.x - 14, sp.y - 58); shoutG.zIndex = sp.y + 0.05;
  }
  tag('shout', 'gain shout', shouter ? (v.people[shouter].shoutK < 0.5 ? '喝！' : '啪啪！') : null, shouter ? positions[shouter].x - 30 : 0, shouter ? positions[shouter].y - 86 : 0);
  // 整理中：護欄旁每拍跳一下「綁」／「叩」，只是畫面效果，進度與清痕只看模型。
  const fixer = IDS.find((id) => v.people[id].mode === 'fix');
  tag('fixbeat', 'gain shout', fixer ? (v.people[fixer].fixWork.steps % FIX_BEAT < FIX_BEND ? (Math.floor(v.people[fixer].fixWork.steps / FIX_BEAT) % 2 ? '叩' : '綁') : null) : null, fixer ? BOAR.fence.x + 10 : 0, fixer ? BOAR.fence.y1 + 6 : 0);
  tag('fence', 'place', `${places.fence.label} · 損痕 ${b.marks}／${b.maxMarks}`, BOAR.fence.x2 + 34, BOAR.fence.y2 + 22);
  const h = v.people.hero;
  const showGhost = ui.shadow && v.shadow && h.mode === 'carry' && h.tripLevel > h.initialLevel;
  ghost.visible = !!showGhost;
  let g = null;
  if (showGhost) {
    g = pose(v.shadow, h.initialLevel, 'carry');
    ghost.texture = sheets.hero.textures[g.frame];
    ghost.scale.x = g.face;
    ghost.position.set(g.x, g.y);
    ghost.zIndex = g.y - 0.02;
  }
  const selected = IDS.includes(ui.selected) && positions[ui.selected];
  ring.visible = !!selected;
  if (selected) { ring.position.set(selected.x, selected.y); ring.zIndex = selected.y - 0.01; }
  vatSprite.texture = TS(scene.vats[v.vat <= 2 ? 0 : v.vat < 6 ? 1 : 2].file);
  placeMark.clear();
  if (ui.menu) { const pl = places[ui.menu]; placeMark.ellipse(pl.x, pl.y - pl.ry * 0.6, pl.rx + 6, pl.ry + 4).stroke({ width: 3, color: 0xc8962e, alpha: 0.9 }); }
  tag('vat', 'place', `${scene.places.vat.label} ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`, scene.places.vat.x, scene.places.vat.y - 60);
  tag('spring', 'place', scene.places.spring.label, scene.places.spring.x, scene.places.spring.y - 40);
  if (rack.n !== v.herbs) { drawRack(v.herbs); rack.n = v.herbs; }
  tag('rack', 'place', `${places.rack.label} ${v.herbs}／${v.herbCapacity} · 在途 ${v.herbInFlight}`, places.rack.x - 30, places.rack.y + 36); // 名牌放在藥架左下，避開院中出發點上的人物狀態
  tag('herb', 'place', places.herb.label, places.herb.x, places.herb.y - 46);
  tag('bench', 'place', places.bench.label, places.bench.x + 92, places.bench.y + 4);
  tag('view', 'place', places.view.label, places.view.x - 6, places.view.y + 40); // 名牌放在石頭下方：左側是 LP-06 防守點，腳下留給人物名牌
  tag('yard', 'place', places.yard.label, places.yard.x + 66, places.yard.y - 6); // 名牌放石凳右側，頭頂留給坐著的人的狀態
  tag('ghost', 'ghost', showGhost ? '主角初始影子・不入帳' : null, g ? g.x : 0, g ? g.y : 0, 6);
  tag('master', '', '師父 · 打坐', 1300, 512, 6);
  tag('senior', '', '師兄 · 掃地', 1120, 528, 6);
  // now 已在上方取得
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].until < now) fx.splice(i, 1);
  for (let i = 0; i < 3; i++) { const f = fx[i]; tag(`fx${i}`, 'gain', f ? f.text : null, f ? f.x : 0, f ? f.y - (1 - (f.until - now) / 1600) * 14 : 0); }
  if (ui.follow) follow();
  placeMenu();
  if (prev.boar.mode !== v.boar.mode || prev.boar.why !== v.boar.why || IDS.some((id) => prev.people[id].trips !== v.people[id].trips || prev.people[id].guardOrder !== v.people[id].guardOrder || prev.people[id].status !== v.people[id].status || prev.people[id].restOrder !== v.people[id].restOrder || prev.people[id].resting !== v.people[id].resting || prev.people[id].next !== v.people[id].next || prev.people[id].auto.text !== v.people[id].auto.text || prev.people[id].fix !== v.people[id].fix || prev.people[id].fixResult !== v.people[id].fixResult) || prev.boar.marks !== v.boar.marks || prev.boar.seen !== v.boar.seen || frames % 15 === 0) renderChrome();
  frames++;
  if (firstFrameMs == null) firstFrameMs = performance.now() - t0;
});
applyCam();
measure();
renderChrome();

// 唯讀觀測；沒有測試專用世界推進或寫入接口。
function personSnapshot(id) {
  const person = v.people[id], p = positions[id], sprite = sprites[id], b = bodyBox(id);
  return { ...person, phase: person.phase && person.phase.name, phaseProgress: person.phase?.k || 0,
    frame: p.frame, action: p.action, requestedAction: p.requested, fallback: p.fallback, face: p.face, travelled: p.travelled, x: p.x, y: p.y,
    screen: toScreen(b.x + b.w / 2, b.y + b.h / 2), bodyScreen: screenBox(b), tapScreen: screenBox(tapBox(id)), footScreen: toScreen(p.x, p.y),
    sprite: { resolution: sprite.texture.source.resolution, width: sprite.texture.orig.width, height: sprite.texture.orig.height,
      anchor: { x: sprite.anchor.x, y: sprite.anchor.y }, scale: { x: sprite.scale.x, y: sprite.scale.y }, z: sprite.zIndex,
      bounds: ((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height }))(sprite.getBounds()) },
  };
}
window.demo = {
  snapshot: () => {
    const people = Object.fromEntries(IDS.map((id) => [id, personSnapshot(id)]));
    return { ...people.hero, people, tick: v.tick, seconds: v.seconds, vat: v.vat, vatCapacity: v.vatCapacity, inFlight: v.inFlight,
      boar: { ...v.boar, ...geo.boarAt(v.boar), screen: toScreen(geo.boarAt(v.boar).x, geo.boarAt(v.boar).y - 16) },
      fenceScreen: toScreen(places.fence.x, places.fence.y - places.fence.ry * 0.6), guardScreen: toScreen(...GUARD.points.at(-1)), lengths: LENGTHS,
      herbs: v.herbs, herbCapacity: v.herbCapacity, herbInFlight: v.herbInFlight, herbScreen: toScreen(places.herb.x, places.herb.y - 10), rackScreen: toScreen(places.rack.x, places.rack.y - 10),
      shadow: v.shadow && v.shadow.name, ghostVisible: ghost.visible,
      playing: ui.playing, autoPaused: ui.autoPaused, pausedByMenu: ui.pausedByMenu, speed: ui.speed,
      selected: ui.selected, menu: ui.menu, menuPerson: ui.menuPerson, cam: { ...cam }, hidden: document.hidden,
      heroScreen: people.hero.screen,
      vatScreen: toScreen(scene.places.vat.x, scene.places.vat.y - 20), springScreen: toScreen(scene.places.spring.x, scene.places.spring.y - 10),
      firstFrameMs, frames, stepMs: STEP_MS,
    };
  },
};
