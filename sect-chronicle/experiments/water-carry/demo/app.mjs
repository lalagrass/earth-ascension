// 宗門編年生活開發版：PixiJS＋HTML/CSS。場景（背景、可排序物件、兩人與影子、選取圈）畫在 Pixi；
// HUD、名冊、選單、面板、名牌、提示是 HTML/CSS。世界只有 model.mjs：畫面只讀 view()，下令只走 dispatch()，
// 推進只經 createClock() 換算的固定步進。暫停、背景、播放倍率與畫面幀率都不改結果。
import { Application, Assets, Container, Graphics, Sprite } from './vendor/pixi.min.mjs';
import { createModel, createClock, PEOPLE, JOBS, STEP_MS, RULES } from './model.mjs';
import { createAnimator } from '../template/animator.mjs';
import { createSceneRenderer } from '../../../scene-shared/renderer.mjs';
import { createGeminiAdapter } from '../../../scene-shared/adapters/gemini.mjs';
import { createCamera } from '../../../scene-shared/camera.mjs';
import { bodyBox as actorBodyBox } from '../../../scene-shared/contract.mjs';
import { saveTo, loadFrom } from './life-save.mjs';
import { guardedSave, guardedLoad } from './life02.mjs'; // SG-LIFE-02 存讀邊界（SG-TRAIN-01 共用）
import { TRAIN_POSTS } from './routes.mjs';
import { drawStake } from './assets/train01/stake.mjs';
import { createRoutes, HERB, SEATS, FUN, BOAR, GUARD, WOOD_PATH, DORM } from './routes.mjs';
import { WATER_POINTS, WATER_LENGTH, WORLD_SIZE, SPRING_PLACE, WATER_LANDMARKS } from './water-layout.mjs';
import { buildWatercolorScene, ART_WC } from './scene/watercolor.mjs';
import { VIEWS } from './scene/layout.mjs';
import { ZONE, EXIT, PALM, SKILLS } from './palm.mjs';
import { CLEAN_END } from './model.mjs';
import { ROUTE, S0, PATROL_END } from './patrol.mjs';
import { WAYPOINTS as WP0, MAIN_LENGTH } from './patrol-layout.mjs';
const WAYPOINTS = WP0.map((w) => ({ ...w, x: ROUTE[S0 + w.node][0], y: ROUTE[S0 + w.node][1] }));
import { drawRefinedRack, drawRefinedBasket, getRefinedBasketPlacement } from './assets/lp16/herb-decor.mjs';

// SG-HOME-02：對外 JOBS 不含砍柴（舊存檔），畫面查名稱另補一份。
const JOBX = { ...JOBS, wood: { label: '砍柴', unit: '捆', place: '柴堆' } };
const SHARED = '../spikes/shared/';
const ART = 'assets/art184-production/'; // D35：Grok 手繪人物／道館／景物；sheet 契約與 LP17 相同
const t0 = performance.now();
const scene = await (await fetch(SHARED + 'scene.json')).json();
const template = await (await fetch('../template/actions.json')).json();
const IDS = PEOPLE.map((p) => p.id);
const sheets = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await Assets.load(`${ART}${id}.json`)])));
const animators = Object.fromEntries(IDS.map((id) => [id, createAnimator(template, sheets[id].data)]));
const profiles = { hero: { name: scene.ui.hero.name, label: '主角', role: '初學者 · 起始腳力 Lv 1' }, cousin: { name: '熟手同伴', label: '熟手', role: '熟手 · 起始腳力 Lv 3' } };
const $ = (id) => document.getElementById(id);

const app = new Application();
await app.init({ resizeTo: window, background: '#cfc8ad', antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
$('stage').appendChild(app.canvas);

// SCENE-03（#182／D41）：場景素材唯一來源 assets/scene03/manifest.json（新地面＋泉口／瀑／取水台／預留屋／晾架／西坡件；D35／D37 件沿用）
const WC = await (await fetch(ART_WC + 'manifest.json')).json();
await Assets.load(Object.values(WC).map((m) => ART_WC + m.file));
const WT = (name) => Assets.get(ART_WC + WC[name].file);
// SG-HOME-02 素材（design/home02/source 決定性水彩）：枯木、柴捆、院倉柴堆、寢舍三階段、床與被褥、木屑。
const H2_ART = 'assets/home02/', H2M = await (await fetch(H2_ART + 'manifest.json')).json();
await Assets.load(Object.values(H2M).map((m) => H2_ART + m.file));
const HT = (name) => Assets.get(H2_ART + H2M[name].file);

// ---------- 路線（只是畫面換算：模型給「走到第幾成」，這裡換成場景座標；算法在 routes.mjs） ----------
const geo = createRoutes(WATER_POINTS), { routes: ROUTES, place } = geo;
const path = ROUTES.water, herbPath = ROUTES.herb;
const places = {
  ...scene.places,
  spring: SPRING_PLACE, // LP-13: 谷底新泉眼取代舊取水點；舊泉池保留純景觀無取水熱區
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
  // LP-16 採藥動作：Gather (4s) 依進度 k 前後切換姿態：k < 0.5 採摘（herbGather 蹲身採草），k >= 0.5 裝簍（herbDeliver/herbHand 整理入簍）
  const animPhase = phase === 'herbGather' && (ph?.k || 0) >= 0.5 ? 'herbDeliver' : phase;
  // SG-HOME-02 砍柴：往返借採藥空手／負重步態；砍 8 秒借舒展前彎／站直兩拍（揮斧節奏，依階段步數）；堆柴借交藥站姿。
  const WOODA = { woodOut: 'herbOut', woodBack: 'herbBack', woodDeliver: 'herbDeliver' };
  const chop = phase === 'woodChop';
  const view = chop ? { phase: 'stretch', k: 0, travelled: ((ph?.steps || 0) % FIX_BEAT) < FIX_BEND ? 3 : 0 } : { phase: WOODA[phase] || animPhase, k: ph?.k || 0, travelled: at.travelled };
  // 模型只提供階段與進度；共用動畫用實際走過的距離換幀，不另開 walker 或時鐘。
  const pick = animators[id].pick(view, { grown: level >= GROWN_FROM });
  return { x: at.x, y: at.y, face: at.face, ...pick, travelled: at.travelled, phase };
}
// LP-04：去／回座位用空手步態（同一份距離換幀），坐下用模板的「坐下歇」；主角 sheet 沒有坐姿，暫用採藥蹲姿並在面板標明。
// LP-05：去／回偏好點用空手步態（借採藥空手走路幀、不畫背簍）；活動中主角用「看山」背影、熟手用「舒展筋骨」循環（幀依模型活動步數換，不看真實時間）。
const FUN_TICKS_PER_POSE = 36;
// LP-08：往返護欄用空手步態；動手沒有專用幀，借「舒展筋骨」的前彎（綁竹／敲樁）與站直兩幀交替出節奏，面板如實標示借用。
const FIX_BEAT = 45, FIX_BEND = 30; // 每 45 tick 一拍：前彎 30 tick、站直 15 tick（只是畫面節奏，進度只看模型步數）
// LP-11 掌法：沒有專用掌法幀。底圖借模板空手站姿（交藥站姿 herbHand）／蹲身（採藥 herbGather），身體依掌勢前後傾，
// 再由 armG 補一隻向量手臂與立掌（沿 LP10 畫稿姿勢表）；不畫背簍、扁擔等工具。接觸後收勢前 STRIKE_TICKS 顯示出掌定格，只是畫面。
const STRIKE_TICKS = 12;
const PALM_POSE = {
  windup: { novice: { base: 'herbHand', lean: -12, elbow: [-8, -33], hand: [-14, -26], palm: -70 }, adept: { base: 'herbHand', lean: -3, elbow: [1, -36], hand: [-1, -31], palm: -85 } },
  strike: { novice: { base: 'herbGather', lean: 0, shoulder: [10.5, -34], elbow: [18, -22], hand: [22, -10], palm: 10 }, adept: { base: 'herbGather', lean: 4, shoulder: [10.5, -34], elbow: [19, -21], hand: [24, -9], palm: 0 } },
  recover: { novice: { base: 'herbHand', lean: -6, elbow: [2, -30], hand: [8, -24], palm: -40 }, adept: { base: 'herbHand', lean: 0, elbow: [6, -34], hand: [12, -32], palm: -90 } },
};
const SHOULDER = [6.6, -45.6]; // herbHand-0 的肩點（場景單位，相對腳底，朝右）
function palmPose(person) {
  if (person.mode === 'windup' || person.mode === 'patrolWind') return PALM_POSE.windup[person.palm];
  if (person.mode === 'recover' || person.mode === 'patrolRec') return PALM_POSE[person.palmStep.steps < STRIKE_TICKS ? 'strike' : 'recover'][person.palm];
  return null;
}
// SG-LIFE-02 招呼：往返用空手步態；站位時輪到自己說話用「舒展筋骨」前彎那幀（拱手／點頭的借用姿勢），否則站直；面板如實標借用。
const SAY = { greet: { hero: '師兄辛苦了！', cousin: '師弟，腳力見長！' }, reply: { hero: '多謝師兄，一起加油！', cousin: '你也辛苦了！' } };
function meetTurn(person) { const m = person.life02 && person.life02.meet; if (!m || m.phase !== 'talk' || person.mode !== 'meet') return null; return (m.k < 0.5) === (m.role === 'greet') ? m.role : null; }
// SG-TRAIN-01 練掌：往返空手步態；站位上照模型給的節奏（起手／出掌收勢／調息）借清鼠掌法姿勢＋向量手臂，調息用站直幀。
function trainPose(person) {
  const c = person.train01 && person.train01.cyc;
  if (!c || c.phase === 'breath') return null;
  return palmPose({ mode: c.phase === 'windup' ? 'windup' : 'recover', palm: person.palm, palmStep: { steps: c.steps } });
}
function poseOf(id, person) {
  if (person.train01 && person.train01.training) {
    const at = geo.of(id, person), a = animators[id], pp = person.mode === 'train' ? trainPose(person) : null;
    const pick = pp ? a.pick({ phase: pp.base === 'herbGather' ? 'herbGather' : 'herbDeliver', k: 0, travelled: 0 })
      : person.mode === 'train' ? a.pick({ phase: 'stretch', k: 0, travelled: 0 }) : a.pick({ phase: 'herbOut', k: 0, travelled: at.travelled });
    return { x: at.x, y: at.y, face: at.face, ...pick, travelled: at.travelled, phase: person.mode, palm: pp, borrowed: person.mode === 'train' };
  }
  if (person.life02 && person.life02.meeting) {
    const at = geo.of(id, person), a = animators[id], turn = meetTurn(person);
    const view = person.mode === 'meet' ? { phase: 'stretch', k: 0, travelled: turn ? 3 : 0 } : { phase: 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: person.mode, borrowed: person.mode === 'meet', meet: true };
  }
  // SG-PATROL-01：巡山沿用清理的畫法（空手步態＋掌法姿勢）；觀察／喝止用站直那幀。
  if (person.cleaning || person.patrolling) {
    const at = geo.of(id, person), a = animators[id], pp = palmPose(person);
    const pick = pp ? a.pick({ phase: pp.base === 'herbGather' ? 'herbGather' : 'herbDeliver', k: 0, travelled: 0 }) : a.pick({ phase: 'herbOut', k: 0, travelled: at.travelled });
    return { x: at.x, y: at.y, face: at.face, ...pick, travelled: at.travelled, phase: person.mode, palm: pp, borrowed: !!pp };
  }
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
  // SG-LIFE-01：往返水缸用空手步態；喝水用空手站姿（交藥那組＝站直空手），杯子由 placeCup 另畫。
  if (person.drinking) {
    const at = geo.of(id, person), a = animators[id];
    const view = person.mode === 'drink' ? { phase: 'herbDeliver', k: 0.5, travelled: 0 } : { phase: 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: person.mode, cup: person.mode === 'drink' };
  }
  // HOME-01 茶座：往返空手步態；煮茶蹲身看爐（採藥蹲身幀借用），喝茶空手站姿＋杯子。
  if (person.tea && person.tea.mode) {
    const at = geo.of(id, person), a = animators[id], m = person.mode;
    const view = m === 'brew' ? { phase: 'herbGather', k: 0.5, travelled: 0 } : m === 'sip' ? { phase: 'herbDeliver', k: 0.5, travelled: 0 } : { phase: 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: m, cup: m === 'sip', borrowed: m === 'brew' };
  }
  // SG-HOME-02 修寢舍：往返空手（扛料時同負重步態）；施工借「舒展筋骨」前彎／站直兩拍（釘椽、綁茅），面板標明借用。
  if (person.home02 && person.home02.mode) {
    const at = geo.of(id, person), a = animators[id], m = person.mode;
    const view = m === 'build' ? { phase: 'stretch', k: 0, travelled: (v.tick % FIX_BEAT) < FIX_BEND ? 3 : 0 } : { phase: person.home02.carrying ? 'herbBack' : 'herbOut', k: 0, travelled: at.travelled };
    return { x: at.x, y: at.y, face: at.face, ...a.pick(view), travelled: at.travelled, phase: m, borrowed: m === 'build', build: m === 'build' };
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
// Core-neutral renderer owns actor sprites, foot anchors, depth and selection.
const sharedScene = createSceneRenderer({ stage: app.stage,
  definition: { id: 'gemini-home', width: WORLD_SIZE.w, height: WORLD_SIZE.h, layers: [] },
  bindings: { texture: (asset, frame) => sheets[asset].textures[frame] },
});
const { world, sorted } = sharedScene;
// D37：地面（草坡、院坪、全段長路、溪與深潭、石階泉台）是一張烘焙水彩底圖，見 scene/watercolor.mjs
const ground = new Graphics(); // 只剩介面提示（清理區虛線、出口箭頭）
// SG-PATROL-01：西坡巡山小徑（虛線）、四個路標與三隻林鼠的逃路；只是畫面提示，位置與判定只讀 patrol-layout.mjs。
const patrolG = new Graphics();
{
  const pts = ROUTE.slice(S0);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 9));
    for (let j = 0; j < n; j += 2) patrolG.moveTo(ax + (bx - ax) * j / n, ay + (by - ay) * j / n).lineTo(ax + (bx - ax) * (j + 1) / n, ay + (by - ay) * (j + 1) / n);
  }
  patrolG.stroke({ width: 2.2, color: 0x6b5233, alpha: 0.6 });
  for (const w of WAYPOINTS) patrolG.circle(w.x, w.y, 6).fill({ color: 0xf3e6c4, alpha: 0.9 }).stroke({ width: 1.6, color: 0x6b5233 });
  patrolG.poly([...ROUTE.slice(0, S0 + 1).flat()], false).stroke({ width: 1.2, color: 0x6b5233, alpha: 0.3 });
}
// LP-11 有限清理區（竹護欄內西院）：虛線外框與西側出口箭頭，只是地面提示。
{
  const pts = [...ZONE, ZONE[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / 12));
    for (let j = 0; j < n; j += 2) ground.moveTo(ax + (bx - ax) * j / n, ay + (by - ay) * j / n).lineTo(ax + (bx - ax) * (j + 1) / n, ay + (by - ay) * (j + 1) / n);
  }
  ground.stroke({ width: 1.6, color: 0x8a6a3e, alpha: 0.55 });
  const [ex, ey] = EXIT.at(-1), [px, py] = EXIT.at(-2);
  ground.poly(EXIT.flat(), false).stroke({ width: 1.2, color: 0x8a6a3e, alpha: 0.35 });
  const ang = Math.atan2(ey - py, ex - px);
  ground.poly([ex, ey, ex - 8 * Math.cos(ang - 0.5), ey - 8 * Math.sin(ang - 0.5), ex - 8 * Math.cos(ang + 0.5), ey - 8 * Math.sin(ang + 0.5)]).fill({ color: 0x8a6a3e, alpha: 0.45 });
}
world.addChild(ground);
world.addChild(patrolG);
// Shared sorted layer includes actors and the original watercolor foreground.
world.addChild(sorted);
// D37：烘焙地面、貼片（藥畦、溪岸、橋板）、依腳底排序的屋舍樹石、師父／師兄；溪橋前欄 z=1060 拆層
const wc = buildWatercolorScene({ world, sorted, tex: WT, manifest: WC });
// 石凳、觀景石、西林緣改為 layout.mjs 的手繪件（stone_bench／boulder_m／林緣樹叢）
const fence = new Graphics();
sorted.addChild(fence);
// SG-TRAIN-01 兩根練功木樁（向量道具，依腳底 y 排序）。
const stakes = Object.fromEntries(Object.entries(TRAIN_POSTS).map(([id, t]) => { const g = new Graphics(); drawStake(g); g.position.set(t.stake.x, t.stake.y); g.zIndex = t.stake.y; sorted.addChild(g); return [id, g]; }));
// 竹護欄：一段南北向的矮籬，損痕 0～3 只改外觀（裂紋→歪柱→斷橫桿），不擋路、不影響任何工作。
function drawFence(marks, hitFlash = 0) {
  const { x1, x2, y1, y2 } = BOAR.fence, n = 7;
  fence.clear();
  const post = (i) => ({ x: x1 + (x2 - x1) * i / (n - 1) - fence.x, y: y1 + (y2 - y1) * i / (n - 1) - fence.y });
  for (const h of [32, 16]) {
    const a = post(0), b = post(n - 1), m = post(3);
    if (marks >= 3 && h === 32) {
      // 斷橫桿：中段斷開垂下
      fence.moveTo(a.x, a.y - h).lineTo(m.x - 3, m.y - h).stroke({ width: 3.4, color: 0x8f8a4e });
      fence.moveTo(m.x + 3, m.y - h + 9).lineTo(b.x, b.y - h).stroke({ width: 3.4, color: 0x8f8a4e });
    } else fence.moveTo(a.x, a.y - h).lineTo(b.x, b.y - h).stroke({ width: 3.4, color: 0x8f8a4e });
  }
  for (let i = 0; i < n; i++) {
    const p = post(i), tilt = marks >= 2 && i === 3 ? 8 : 0;
    fence.ellipse(p.x, p.y + 1, 5, 1.8).fill({ color: 0x3a3424, alpha: 0.25 }); // D37：竹色＋墨線，與手繪竹叢同色系
    fence.moveTo(p.x, p.y).lineTo(p.x - tilt, p.y - 40).stroke({ width: 5.6, color: 0x4a4a2c, cap: 'round' });
    fence.moveTo(p.x, p.y).lineTo(p.x - tilt, p.y - 40).stroke({ width: 3.8, color: 0x8c9152, cap: 'round' });
    for (const k of [14, 28]) fence.moveTo(p.x - tilt * k / 40 - 2.2, p.y - k).lineTo(p.x - tilt * k / 40 + 2.2, p.y - k).stroke({ width: 1, color: 0x4a4a2c });
    fence.circle(p.x - tilt, p.y - 40, 2.4).fill(0xb7b27a).stroke({ width: 0.8, color: 0x4a4a2c });
  }
  if (marks >= 1) { const m = post(2); fence.moveTo(m.x - 4, m.y - 30).lineTo(m.x + 3, m.y - 22).lineTo(m.x - 3, m.y - 14).stroke({ width: 1.6, color: 0x4a3720 }); }
  if (hitFlash > 0) { const m = post(3); fence.circle(m.x - 8, m.y - 18, 10 + 10 * hitFlash).stroke({ width: 2.4, color: 0xd0702a, alpha: hitFlash }); }
}
fence.position.set(BOAR.fence.x, (BOAR.fence.y1 + BOAR.fence.y2) / 2);
fence.zIndex = fence.y;
drawFence(0);
// 防守點：護欄內側一塊踏平的草地（D37 烘進地面）。
// 野豬：原創向量圖，朝右畫、翻面朝左。腿依模型走過的距離換步，準備撞時後坐再前衝，逃跑時揚塵；全部只讀 view().boar。
const boarG = new Container(); // D37：手繪野豬（走／衝兩張），步態、後坐、嗅草、揚塵仍只讀 view().boar
boarG.visible = false;
const boarFx = new Graphics(), boarSp = new Sprite(WT('boar_walk'));
boarSp.anchor.set(0.5, 0.96);
boarG.addChild(boarFx, boarSp);
sorted.addChild(boarG);
const BOAR_H = 34; // 場景單位（含 boarG 的 1.3 倍後約 44）
function drawBoar(b, now) {
  const g = boarFx;
  g.clear();
  const walking = b.mode === 'out' || b.mode === 'approach' || b.mode === 'flee';
  const gait = walking ? Math.sin(b.d / (b.mode === 'flee' ? 7 : 5)) : 0;
  let lean = 0, head = 0;
  if (b.mode === 'prep') lean = b.prepK < 0.75 ? -7 * b.prepK / 0.75 : -7 + 19 * (b.prepK - 0.75) / 0.25;
  if (b.mode === 'sniff') head = 3 + 3 * Math.sin(b.sniffK * Math.PI * 6);
  const charge = b.mode === 'flee' || (b.mode === 'prep' && b.prepK >= 0.75);
  const t = WT(charge ? 'boar_charge' : 'boar_walk');
  if (boarSp.texture !== t) boarSp.texture = t;
  boarSp.scale.set(BOAR_H / t.height);
  boarSp.position.set(lean, -Math.abs(gait) * 1.4);
  boarSp.rotation = (head * 0.012) + (b.mode === 'prep' ? lean * 0.006 : 0) + gait * 0.02;
  g.ellipse(lean, 1, 26, 5).fill({ color: 0x3a3424, alpha: 0.25 });
  if (b.mode === 'flee') for (let i = 0; i < 3; i++) g.circle(-30 - i * 9, -4 - (i % 2) * 3, 4 - i).fill({ color: 0xc9b07a, alpha: 0.55 - i * 0.15 });
  if (b.mode === 'sniff') for (let i = 0; i < 3; i++) g.moveTo(26 + i * 5, 4).lineTo(24 + i * 5 + Math.sin(now / 90 + i) * 3, -6).stroke({ width: 2, color: 0x6f9a52 }); // 鼻前草動
}
const shoutG = new Graphics();
shoutG.visible = false;
sorted.addChild(shoutG);
// LP-11 測試弱鼠：原創向量（沿 LP10 畫稿畫法），朝右畫、翻面朝左。位置／狀態只讀 view().rats。
const ratGs = new Map(), pratGs = new Map();
// D37：手繪鼠（嗅／跑兩張），倒地＝側傾半透明、出界淡出；動作語意與位置只讀 view().rats
function makeRat() {
  const c = new Container(), fx = new Graphics(), sp = new Sprite(WT('rat_sniff'));
  sp.anchor.set(0.5, 0.95); c.addChild(fx, sp); c.fx = fx; c.sp = sp; return c;
}
function drawRat(c, r, now) {
  const g = c.fx, sp = c.sp;
  g.clear();
  g.ellipse(0, 1, 10, 3).fill({ color: 0x3a3424, alpha: 0.22 });
  const run = r.mode === 'flee' || r.mode === 'gone', t = WT(run ? 'rat_run' : 'rat_sniff');
  if (sp.texture !== t) sp.texture = t;
  sp.scale.set((r.kind === 'alert' ? 11 : 10) / t.height);
  sp.tint = r.kind === 'alert' ? 0xd8c8b4 : 0xffffff;
  if (r.mode === 'down') {
    sp.rotation = -0.5; sp.position.set(0, -1); c.alpha = 0.75;
    for (const [x, y] of [[8, -8], [11, -6]]) g.moveTo(x - 1.4, y - 1.4).lineTo(x + 1.4, y + 1.4).moveTo(x + 1.4, y - 1.4).lineTo(x - 1.4, y + 1.4).stroke({ width: 0.8, color: 0x3f342a });
    return;
  }
  c.alpha = r.mode === 'gone' ? 0.35 : 1;
  const bob = run ? Math.sin(now / 40) * 1.2 : 0;
  sp.rotation = 0; sp.position.set(0, bob);
  if (r.mode === 'sniff') { const w = Math.sin(now / 160 + r.id) * 1.5; for (let i = 0; i < 3; i++) g.moveTo(16 + i * 3, 2).lineTo(17 + i * 3 + w, -4).stroke({ width: 1.4, color: 0x6f9a52 }); }
  if (run) for (let i = 0; i < 3; i++) g.circle(-18 - i * 7, -2 - (i % 2) * 2, 3 - i * 0.6).fill({ color: 0xc9b07a, alpha: 0.55 - i * 0.15 });
}
// 掌法疊圖：一隻向量手臂＋立掌，畫在人物 sprite 上面（同一腳底原點、同一翻面）。
const armGs = Object.fromEntries(['hero', 'cousin'].map((id) => { const g = new Graphics(); g.visible = false; sorted.addChild(g); return [id, g]; }));
const rot = ([x, y], deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
function drawArm(g, p, id) {
  // LP-17：與 Grok D32 主角藍短衫／堂親橄欖褐村衣、膚色協調
  // D35：袖色對齊 Grok 手繪新皮（主角青藍短襖／熟手褐麻衣）
  const robe = id === 'hero' ? 0x3b5f85 : 0x7a6646, edge = id === 'hero' ? 0x264260 : 0x4e4030;
  const skin = id === 'hero' ? 0xf3c9a4 : 0xd6a77c, skinEdge = id === 'hero' ? 0xd6a47e : 0xb0805a;
  // 新皮肩點與舊 LP17 不同：sheet meta.palmShoulder 給實量肩點，整隻手臂（肩／肘／手）一起平移，掌法姿勢表與命中不動
  const sh0 = p.shoulder || SHOULDER, ns = sheets[id].data.meta.palmShoulder?.[p.base];
  const dv = ns ? [ns[0] - sh0[0], ns[1] - sh0[1]] : [0, 0], mv = ([x, y]) => [x + dv[0], y + dv[1]];
  const sh = rot(mv(sh0), p.lean), el = rot(mv(p.elbow), p.lean * 0.5), hd = rot(mv(p.hand), p.lean * 0.3);
  g.clear();
  g.moveTo(...sh).lineTo(...el).lineTo(...hd).stroke({ width: 8.4, color: edge, cap: 'round', join: 'round' });
  g.moveTo(...sh).lineTo(...el).lineTo(...hd).stroke({ width: 6.4, color: robe, cap: 'round', join: 'round' });
  const a = p.palm * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), pt = (x, y) => [hd[0] + x * c - y * s, hd[1] + x * s + y * c];
  g.poly([...pt(-0.5, -2.8), ...pt(7, -2.8), ...pt(7, 2.8), ...pt(-0.5, 2.8)]).fill(skin).stroke({ width: 0.9, color: skinEdge });
}

// 水缸：手繪 water_vat＋缸口水面（水位只讀 view().vat，三段與舊三張缸圖相同：≤2／<6／其餘）
const vatSprite = new Sprite(WT('water_vat'));
vatSprite.anchor.set(0.5, 1); vatSprite.scale.set(56 / vatSprite.texture.height);
vatSprite.position.set(scene.places.vat.x, scene.places.vat.y + 6); vatSprite.zIndex = scene.places.vat.y;
sorted.addChild(vatSprite);
const vatWater = new Graphics(); vatWater.zIndex = scene.places.vat.y + 0.01; sorted.addChild(vatWater);
function drawVatWater(n) {
  const lv = n <= 2 ? 0 : n < 6 ? 1 : 2, w = vatSprite.width, mx = scene.places.vat.x, my = scene.places.vat.y + 6 - 56 * 0.86;
  vatWater.clear();
  vatWater.ellipse(mx, my, w * 0.29, w * 0.085).fill({ color: 0x2c2a22, alpha: 0.85 });
  if (lv) vatWater.ellipse(mx, my + (lv === 1 ? 1.6 : 0.4), w * (lv === 1 ? 0.23 : 0.27), w * (lv === 1 ? 0.06 : 0.075)).fill({ color: lv === 1 ? 0x3e6a72 : 0x5a8e94 }).ellipse(mx - w * 0.06, my - 0.4, w * 0.08, w * 0.015).fill({ color: 0xd8ece6, alpha: 0.6 });
}
let vatShown = -1;
// 藥架：兩層竹篩，每份藥草畫一束（最多 8）。
const rack = new Graphics();
rack.position.set(places.rack.x, places.rack.y + 8);
rack.zIndex = places.rack.y + 8;
sorted.addChild(rack);
// 藥架：LP-16 精修兩層竹篩與竹柱斜撐，每份藥草畫一獨立束（最多 8 份）。
function drawRack(n) {
  drawRefinedRack(rack, n);
}
drawRack(0);
rack.n = 0;
// 背簍：LP-16 精修竹編篾條菱紋與背帶，load 0～1 決定冒出多少藥草。原點在簍底中央。
function drawBasket(g, load) {
  drawRefinedBasket(g, load);
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
const sprites = {}; // Populated by sharedScene.render at the initial snapshot.
// ---------- SG-HOME-02 場景件（只讀 view().home02 與人物 view；不另存狀態） ----------
const h2Sprite = (name, x, y, h, z = y) => { const s = new Sprite(HT(name)); s.anchor.set(0.5, 1); s.scale.set(h / s.texture.height); s.position.set(x, y); s.zIndex = z; sorted.addChild(s); return s; };
const deadLog = h2Sprite('dead_log', WOOD_PATH.log.x, WOOD_PATH.log.y + 8, 34);
const yardPile = h2Sprite('woodpile_0', DORM.woodpile.x, DORM.woodpile.y, 30);
// 寢舍：取代 HOME01 預留位 dorm_reserved 的同一位置；依工地階段換圖（破損→施工中→可用）。
const dormProp = wc.props.find((q) => q.p.id === 'dorm_reserved');
if (dormProp) dormProp.s.visible = false;
const dorm = h2Sprite('dorm_broken', DORM.site.x, DORM.site.y, 96);
const bedSprites = Object.fromEntries(Object.entries(DORM.beds).map(([id, b]) => { const e = b.points.at(-1); const s = h2Sprite('bed', e[0], e[1] + 6, 20, e[1] - 1); s.visible = false; return [id, s]; }));
const quilts = Object.fromEntries(IDS.map((id) => { const s = new Sprite(HT('quilt')); s.anchor.set(0.5, 0.5); s.scale.set(0.5); s.visible = false; sorted.addChild(s); return [id, s]; }));
const bundles = Object.fromEntries(IDS.map((id) => { const s = new Sprite(HT('wood_bundle')); s.anchor.set(0.5, 0.5); s.scale.set(0.5); s.visible = false; sorted.addChild(s); return [id, s]; }));
const chips = []; // 砍柴木屑（純畫面）
const LIE_TICKS = 24; // 躺下／起身的過渡幀數（只看模型步數）
function placeHome02(id, p, person) {
  const sp = sprites[id], h2 = person.home02, ph = person.mode === 'carry' && person.phase && person.phase.name;
  // 扛柴：回程與堆柴、或修繕扛料往返時肩上一捆。
  const carry = ph === 'woodBack' || ph === 'woodDeliver' || (h2 && h2.carrying);
  const b = bundles[id];
  b.visible = !!carry;
  if (carry) { b.position.set(p.x + 4 * p.face, p.y - 44); b.rotation = -0.25 * p.face; b.zIndex = p.y + 0.03; }
  // 躺下：到床才轉成平躺＋被褥；起身沿 back 前段漸直。
  const q = quilts[id];
  let lie = 0;
  if (person.mode !== 'seated') sp.lieAt = null;
  if (person.bed && person.mode === 'seated') { if (sp.lieAt == null) sp.lieAt = v.tick; lie = Math.min(1, (v.tick - sp.lieAt) / LIE_TICKS); } // 躺下：到床後漸平
  else if (person.bed && person.mode === 'back' && person.restLeg) lie = Math.max(0, 1 - person.restLeg.steps / LIE_TICKS); // 起身：離床前段漸直
  if (lie > 0) {
    // 躺在房內床上：身體中心對齊床心（腳底錨點往床腳側推半身長），屋內比例縮小，被褥蓋在床上。
    const bedAt = DORM.beds[person.bed].points.at(-1), k = 1 - 0.4 * lie;
    sp.scale.set(p.face * k, k); sp.rotation = -Math.PI / 2 * lie * p.face;
    const half = (sp.texture.height * k) / 2;
    sp.position.set(p.x + (bedAt[0] + half * p.face - p.x) * lie, p.y + (bedAt[1] - 4 - p.y) * lie);
  }
  q.visible = lie > 0.6;
  if (q.visible) { const bq = DORM.beds[person.bed].points.at(-1); q.position.set(bq[0] + 4 * p.face, bq[1] - 4); q.zIndex = p.y + 0.04; }
}
const baskets = Object.fromEntries(IDS.map((id) => { const g = new Graphics(); g.visible = false; sorted.addChild(g); return [id, g]; }));
// 背簍放哪：LP-16 掛點精修（去程身後微遮、採集身前置簍、回程背上、交藥身側）
function placeBasket(id, p, person) {
  const g = baskets[id], ph = person.mode === 'carry' && person.phase;
  g.visible = !!ph && person.job === 'herb';
  if (!g.visible) return;
  const s = id === 'cousin' ? 0.97 : 1, k = person.phase.k;
  const placement = getRefinedBasketPlacement(ph.name, p.x, p.y, p.face, s, k);
  const qLoad = Math.round(placement.load * 24) / 24;
  if (g.load !== qLoad) { drawBasket(g, qLoad); g.load = qLoad; }
  g.scale.set(s); g.position.set(placement.x, placement.y); g.zIndex = placement.zIndex;
}

// SG-LIFE-01 最小杯子：喝水時舉在嘴邊（木杯，向量畫，不是新素材）；只跟 poseOf 的 cup 旗標，不另判狀態。
const cups = Object.fromEntries(IDS.map((id) => {
  const g = new Graphics();
  g.roundRect(-3.2, -4.5, 6.4, 8, 1.4).fill(0x8a5a32).stroke({ width: 0.8, color: 0x3b2614 });
  g.rect(-2.6, -4.2, 5.2, 1.4).fill(0x9fc6d8);
  g.visible = false; sorted.addChild(g); return [id, g];
}));
function placeCup(id, p, person) {
  const g = cups[id];
  g.visible = !!p.cup;
  if (!g.visible) return;
  const tip = Math.min(1, (person.drinkLeg ? person.drinkLeg.k : person.tea ? person.tea.sipK : 1) * 3); // 先舉杯再就口
  g.position.set(p.x + p.face * (9 - tip * 3), p.y - 52 - tip * 8); g.rotation = -p.face * tip * 0.5; g.scale.set(1.7); g.zIndex = p.y + 0.03;
}

const placeMark = new Graphics();
world.addChild(placeMark);

// ---------- 鏡頭 ----------
const sceneCamera = createCamera(scene.camera.start, { width: WORLD_SIZE.w, height: WORLD_SIZE.h }, scene.camera);
const cam = sceneCamera.state;
const clampZoom = (z) => Math.min(scene.camera.maxZoom, Math.max(scene.camera.minZoom, z));
const toScreen = (x, y) => { sceneCamera.resize(app.screen.width, app.screen.height); return sceneCamera.toScreen(x, y); };
const toWorld = (x, y) => { sceneCamera.resize(app.screen.width, app.screen.height); return sceneCamera.toWorld(x, y); };
function applyCam() { sceneCamera.resize(app.screen.width, app.screen.height); sceneCamera.apply(world); }
function zoomAt(sx, sy, z) { sceneCamera.resize(app.screen.width, app.screen.height); sceneCamera.zoomAt(sx, sy, z); applyCam(); }
// 鏡頭跟隨：桌機與窄螢幕均跟隨選取人物（預設主角）；拖曳後停止跟隨，按 0 或點選人物／名冊恢復
const narrow = () => window.innerWidth <= 640;
if (narrow()) cam.zoom = 0.85;
function follow() {
  if (!ui.follow) return;
  const p = positions[selectedPerson()];
  if (!p) return;
  let ty;
  if (narrow()) {
    // 窄螢幕：上方遮擋包含 HUD、野豬卡與暫停橫幅，下方抽屜包含選單、人物面板與名冊；
    // 計算上下遮擋間的淨可視垂直區間，使跟隨人物位於兩者正中，避開野豬卡等上方遮擋
    const topEls = [document.querySelector('.hud'), $('boar'), $('banner')].filter((el) => {
      if (!el || el.hidden || !el.offsetHeight) return false;
      const s = window.getComputedStyle ? window.getComputedStyle(el) : null;
      return !s || (s.display !== 'none' && s.visibility !== 'hidden');
    });
    const top = Math.max(0, ...topEls.map((el) => el.getBoundingClientRect().bottom));
    const drawer = [$('menu'), $('panel'), $('roster')].filter((el) => {
      if (!el || el.hidden || !el.offsetHeight) return false;
      const s = window.getComputedStyle ? window.getComputedStyle(el) : null;
      return !s || (s.display !== 'none' && s.visibility !== 'hidden');
    }).map((el) => el.getBoundingClientRect().top);
    const bottom = Math.min(window.innerHeight, ...drawer);
    const targetY = bottom > top + 40 ? (top + bottom) / 2 : Math.max(top + 20, (top + bottom) / 2);
    ty = p.y - 30 - (targetY - app.screen.height / 2) / cam.zoom;
  } else {
    // 桌面版：人物居中偏上，留出名冊與場景下方視野
    const hud = document.querySelector('.hud');
    const top = hud ? hud.getBoundingClientRect().bottom : 56;
    const roster = $('roster');
    const bottom = roster && !roster.hidden ? roster.getBoundingClientRect().top : app.screen.height - 40;
    ty = p.y - 20 - ((top + bottom) / 2 - app.screen.height / 2) / cam.zoom;
  }
  cam.x += (p.x - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  applyCam();
}

// ---------- 狀態 ----------
const r1 = (n) => Math.round(n * 10) / 10;
const LENGTHS = { water: WATER_LENGTH, herb: r1(herbPath.length), seat: geo.seatLengths, fun: geo.funLengths,
  boar: { edge: r1(geo.boarLengths.edge), total: r1(geo.boarLengths.total), seen: geo.boarSeenD }, guard: r1(geo.guardLength),
  drink: r1(geo.drinkLengths.home), drinkSeat: { hero: r1(geo.drinkLengths.seat.hero), cousin: r1(geo.drinkLengths.seat.cousin) } };
// LP-11：警覺鼠察覺用同一份純幾何取樣兩人位置（模型在權威 tick 呼叫，不讀畫面座標）。
const SENSE = { placeOf: geo.of, boarAt: geo.boarAt, meetLengths: geo.meetLengths, trainLengths: geo.trainLengths, teaLength: geo.teaLength,
  woodLength: r1(geo.woodLength), siteLength: r1(geo.siteLength), bedLengths: Object.fromEntries(Object.entries(geo.bedLengths).map(([k, v]) => [k, r1(v)])) }; // SG-HOME-02 新路長也走 sense，不進 LENGTHS // SG-LIFE-02 招呼路長度不進 LENGTHS（存檔幾何識別不變）
let model = createModel(LENGTHS, undefined, undefined, undefined, SENSE);
const clock = createClock();
const ui = { follow: true, playing: true, speed: 1, autoPaused: false, pausedByMenu: false, selected: null, menu: null, menuPerson: null, rosterOpen: true, shadow: true, returnFocus: null, boarExpanded: false, advancedOpen: false, tab: 'life', eventsOpen: false };
let v = model.view();
let positions = Object.fromEntries(IDS.map((id) => [id, poseOf(id, v.people[id])]));
const fx = []; // 浮字（只是畫面效果）
const selectedPerson = () => IDS.includes(ui.selected) ? ui.selected : 'hero';

// Pixel hitboxes are bound once to the sheet's foot anchor, in map units.
const bodies = Object.fromEntries(IDS.map((id) => {
  const h = sheets[id].data.meta, r = Number(h.scale);
  return [id, { x: (h.hitbox.x - h.anchorPx.x) / r, y: (h.hitbox.y - h.anchorPx.y) / r, w: h.hitbox.w / r, h: h.hitbox.h / r }];
}));
const sceneAdapter = createGeminiAdapter({ getModel: () => model, geometry: geo,
  source: 'dev:9ef497e86a5837539cc8e461855695b0fe468dbd:gemini-derived',
  facilities: Object.entries(places).map(([id, p]) => ({ id, label: p.label, x: p.x, y: p.y })),
  appearance: (id, person, at) => {
    const p = poseOf(id, person), h = sheets[id].data.meta;
    return { asset: id, frame: p.frame, body: bodies[id], anchor: { x: h.anchorPx.x / h.frameSize.w, y: h.anchorPx.y / h.frameSize.h } };
  },
});
let sceneSnapshot;
function renderShared() {
  sceneSnapshot = sceneAdapter.snapshot({ view: v, paused: !ui.playing, rate: ui.speed });
  const events = sharedScene.render(sceneSnapshot);
  for (const actor of sceneSnapshot.actors) { sprites[actor.id] = sharedScene.sprite(actor.id); positions[actor.id] = { ...poseOf(actor.id, v.people[actor.id]), x: actor.x, y: actor.y, face: actor.face, travelled: actor.action.travelled }; }
  return events;
}
renderShared();
function bodyBox(id) { return actorBodyBox(sceneSnapshot.actors.find((a) => a.id === id)); }
function tapBox(id) {
  const b = bodyBox(id);
  const px = Math.max(0, (44 / cam.zoom - b.w) / 2), py = Math.max(0, (44 / cam.zoom - b.h) / 2);
  return { x: b.x - px, y: b.y - py, w: b.w + px * 2, h: b.h + py * 2 };
}
function screenBox(b) { return { ...toScreen(b.x, b.y), w: b.w * cam.zoom, h: b.h * cam.zoom }; }
function hitTest(sx, sy) {
  const w = toWorld(sx, sy);
  const front = sharedScene.pick(w.x, w.y, cam.zoom);
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
  else if (k === '0') { Object.assign(cam, scene.camera.start); if (narrow()) cam.zoom = 0.85; ui.follow = true; applyCam(); renderChrome(); }
  else if (k === 'o' || k === 'O') look('overview');
  else if (k.startsWith('Arrow')) { const s = 40 / cam.zoom; cam.x += k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0; cam.y += k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0; applyCam(); }
  else if (k === 'r' || k === 'R') toggleRoster();
  else if (k === 's' || k === 'S') toggleShadow();
  else if (k === 'Enter' && IDS.includes(ui.selected)) { e.preventDefault(); openMenu('vat'); } // 不讓同一次 Enter 落到剛拿到焦點的選項上
});
// D37 地標快看：只移鏡頭（停止跟隨），不推進世界、不改任何狀態；按 0 回到跟隨。
function look(name) {
  const vw = VIEWS[name];
  if (!vw) return false;
  ui.follow = false;
  cam.zoom = clampZoom(vw.zoom === 'fit' ? Math.min(app.screen.width / WORLD_SIZE.w, app.screen.height / WORLD_SIZE.h) : vw.zoom * (narrow() ? 0.7 : 1));
  const hw = app.screen.width / 2 / cam.zoom, hh = app.screen.height / 2 / cam.zoom; // 視窗比世界小時，別讓快看露出世界外
  cam.x = hw * 2 >= WORLD_SIZE.w ? WORLD_SIZE.w / 2 : Math.min(WORLD_SIZE.w - hw, Math.max(hw, vw.x));
  cam.y = hh * 2 >= WORLD_SIZE.h ? WORLD_SIZE.h / 2 : Math.min(WORLD_SIZE.h - hh, Math.max(hh, vw.y));
  applyCam(); renderChrome();
  return true;
}
{
  const nav = $('views');
  if (nav) {
    nav.innerHTML = Object.entries(VIEWS).map(([k, vw]) => `<button class="btn" data-view="${k}" title="${k === 'overview' ? 'O：' : ''}鏡頭移到${vw.label}（只看，不推進）">${vw.label}</button>`).join('');
    nav.addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) look(b.dataset.view); });
  }
}
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
$('follow-toggle').addEventListener('click', () => { ui.follow = !ui.follow; applyCam(); renderChrome(); });
$('reset').addEventListener('click', reset);
// SG-LIFE-01 手動存讀：只在按鈕時動；讀檔通過驗證才替換，讀後暫停、清時鐘、不補 tick、不重播交付特效。
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const SAVE_TEMPLATE = createModel(LENGTHS, undefined, undefined, undefined, SENSE).exportState();
// SG-LIFE-02：招呼（含走回院中）期間不存、不碰舊檔；方針與招呼只本局，存檔處明說不保存。
function saveGame() { const r = guardedSave(model, () => saveTo(storage, model)); toast(r.text); return r; }
function loadGame() {
  if (ui.menu) closeMenu(false);
  const r = guardedLoad(model, () => loadFrom(storage, model, SAVE_TEMPLATE)); // 失敗時暫態也不變（life-save 試跑一步可能推動暫態）
  if (r.ok) { ui.playing = false; ui.autoPaused = false; ui.pausedByMenu = false; clock.clear(); sceneAdapter.reset(); v = model.view(); renderShared(); fx.length = 0; }
  toast(r.text); renderChrome(); return r;
}
$('save').addEventListener('click', saveGame);
$('load').addEventListener('click', loadGame);
$('roster').addEventListener('click', (e) => { const b = e.target.closest('[data-person]'); if (b) select(b.dataset.person); });
$('panel').addEventListener('click', (e) => {
  // HOME-01：分頁／小事件只切顯示，不派令、不推 tick。
  const tab = e.target.closest('[data-tab]');
  if (tab) { ui.tab = tab.dataset.tab; renderChrome(); measure(); return; }
  const evt = e.target.closest('[data-ui="toggleEvents"]');
  if (evt) { ui.eventsOpen = !ui.eventsOpen; renderChrome(); measure(); return; }
  const adv = e.target.closest('[data-ui="toggleAdv"]');
  if (adv) { ui.advancedOpen = !ui.advancedOpen; renderChrome(); measure(); return; }
  const a = e.target.closest('[data-auto]');
  if (a) { autoSet(a.dataset.auto); return; }
  const u = e.target.closest('[data-up]');
  if (u) { upSet(u.dataset.up); return; }
  const ca = e.target.closest('[data-autoclean]');
  if (ca) { cleanAutoSet(ca.dataset.autoclean); return; }
  // SG-HOME-02 床牌：只改床主，不推進 tick、不派工。
  const bd = e.target.closest('[data-bed]');
  if (bd) { const r = model.assignBed(bd.dataset.bed, bd.dataset.owner || null); v = model.view(); toast(r.ok ? r.text : `做不到：${r.reason}`); renderChrome(); return; }
  const pm = e.target.closest('[data-palm]');
  if (pm) { palmSet(pm.dataset.palm); return; }
  const b = e.target.closest('[data-cmd]'); if (b) command(b.dataset.cmd);
});
$('boar').addEventListener('click', (e) => {
  const tb = e.target.closest('[data-ui="toggleBoar"]');
  if (tb) { ui.boarExpanded = !ui.boarExpanded; renderChrome(); measure(); return; }
  const b = e.target.closest('[data-cmd]'); if (b) command(b.dataset.cmd);
});

function togglePlay() { if (ui.menu) closeMenu(false); ui.playing = !ui.playing; ui.autoPaused = false; ui.pausedByMenu = false; clock.clear(); renderChrome(); }
function setSpeed(s) { ui.speed = s; renderChrome(); }
function toggleRoster() { ui.rosterOpen = !ui.rosterOpen; renderChrome(); }
function toggleShadow() { ui.shadow = !ui.shadow; renderChrome(); }
function select(id) { ui.selected = id; if (IDS.includes(id)) ui.follow = true; renderChrome(); }
function reset() {
  if (ui.menu) closeMenu(false);
  model = createModel(LENGTHS, undefined, undefined, undefined, SENSE);
  clock.clear();
  sceneAdapter.reset();
  v = model.view();
  renderShared();
  fx.length = 0;
  toast('已重來：主角 Lv 1、熟手 Lv 3，兩人挑水、精力 100；水缸 3 擔、藥架 0 份；野豬回棲地精力 60、威脅 0，護欄損痕 0；休息、休閒、叫回、驅離、整理與待執行指令已清除；自主護院回到兩人未允許（熟手主動照看、主角受擾再處理）；三隻測試鼠回原位、清理名額清空、掌法比較回初學');
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
  const r = sceneAdapter.command({ actorId: person, action: cmd });
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
// LP-09 自主整理設定：與護院分開的允許開關與兩種傾向；暫停時也可改，只改設定不推進世界。
function upSet(what) {
  const id = selectedPerson(), p = v.people[id];
  const r = model.setUpkeep(id, what === 'allow' ? { allow: !p.up.allow } : { react: what });
  v = model.view();
  toast(r.ok ? `${profiles[id].label}：${r.text}` : `做不到：${r.reason}`);
  renderChrome();
}
// LP-11 掌法比較 fixture：初學／熟練；只在全場沒有清理任務時可換，暫停時也可改（只改設定）。
function palmSet(skill) {
  const id = selectedPerson(), r = model.setPalm(id, skill);
  v = model.view();
  toast(r.ok ? `${profiles[id].label}：${r.text}` : `做不到：${r.reason}`);
  renderChrome();
}
// LP-12 自主清鼠設定：允許開關與重新允許；暫停時也可改，只改設定不推進世界。
function cleanAutoSet(what) {
  const id = selectedPerson(), p = v.people[id];
  const r = model.setAutoClean(id, { allow: what === 'reallow' ? true : !p.autoClean.allow });
  v = model.view();
  toast(r.ok ? `${profiles[id].label}：${r.text}` : `做不到：${r.reason}`);
  renderChrome();
}
let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800); }

// 窄螢幕版面靠高度排開：橫幅在 HUD 下面、野豬卡在橫幅下面、抽屜在名冊上面
function measure() {
  const st = document.documentElement.style;
  const hud = document.querySelector('.hud');
  const roster = $('roster');
  const boar = $('boar');
  const banner = $('banner');
  if (hud) st.setProperty('--hud-h', `${hud.offsetHeight}px`);
  if (roster) st.setProperty('--roster-h', `${roster.offsetHeight}px`);
  if (boar) st.setProperty('--boar-h', `${boar.offsetHeight}px`);
  if (banner) st.setProperty('--banner-h', banner.hidden ? '0px' : `${banner.offsetHeight}px`);
}
new ResizeObserver(measure).observe(document.querySelector('.hud'));
new ResizeObserver(measure).observe($('roster'));
new ResizeObserver(measure).observe($('boar'));
new ResizeObserver(measure).observe($('panel'));
new ResizeObserver(measure).observe($('banner'));

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
  : a.id !== 'work:' + p.job ? `交付後改${JOBX[a.id.slice(5)].label}` : p.pending ? `繼續${p.jobLabel}` : a.label;
const pendText = (p) => p.pending === 'rest' ? '本趟後停工' : `交付後改去${JOBX[p.pending].label}`;
const en = (p) => Math.floor(p.energy);
const srcText = (p) => p.rest === 'manual' ? '玩家停工' : p.rest === 'auto' ? '自主恢復' : p.mode === 'back' ? '自主恢復完成' : p.leisure ? '閒暇（不扣不回）' : p.guarding ? '驅離往返（不扣不回）'
  : p.mode === 'fix' ? '整理護欄動手（每秒 −1，共 8）' : p.fixing ? '整理往返（不扣不回）' : p.cleaning ? `清理（每次起手 −${PALM.cost}，走路不扣）` : null;
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
// 自主整理：允許（預設關，與護院分開）＋可交換傾向＋目前原因；有候補時給「取消整理意願」（只抑制這一輪）。
function upHtml(p) {
  const a = p.up;
  const react = (r, label) => `<button class="btn ${a.react === r ? 'on' : ''}" data-up="${r}" aria-pressed="${a.react === r}">${label}</button>`;
  return `<div class="auto up ${a.state}"><div class="row"><b>自主整理護欄</b><button class="btn ${a.allow ? 'on' : ''}" data-up="allow" aria-pressed="${a.allow}">${a.allow ? '允許中' : '未允許'}</button></div>
    <div class="row"><span class="group">${react('early', '順手照看')}${react('late', '累積再整理')}</span>${a.wanting ? '<button class="btn" data-cmd="upCancel" title="只取消這輪自己去整理的意願；下一次護欄被撞才再想">取消整理意願</button>' : ''}</div>
    <div class="muted">${a.text}</div></div>`;
}
// LP-11 清理：目前目標、等待交付／恢復、前往、起手／收勢、取消返回、結束原因與成本；比較 fixture 明標且任務中鎖定。
// LP-12 自主清鼠：允許開關、短理由與來源標籤。
const PHASE_TEXT = { wait: '等待出發', go: '清理中', back: '返院中' };
function cleanHtml(p, id) {
  const c = p.clean, r = p.cleanResult, locked = !!v.clean, ac = p.autoClean;
  let line = '';
  if (c) {
    const srcTag = c.src === 'auto' ? '（自主）' : '（手動）';
    const what = p.mode === 'windup' ? `起手 → 鼠${c.target}（${p.palmStep.steps}／${p.palmStep.need} tick）` : p.mode === 'recover' ? `收勢（${p.palmStep.steps}／${p.palmStep.need} tick）`
      : p.mode === 'toRat' ? (c.phase === 'back' ? '已取消：走完這段後返院' : `走向鼠${c.target}`) : p.mode === 'fromRat' ? `返院：${CLEAN_END[c.end] || ''}` : `待出發：${p.next}`;
    line = `<div class="fixline"><span>${PHASE_TEXT[c.phase]} ${srcTag} · ${what}</span>${c.phase !== 'back' ? '<button class="btn" data-cmd="cleanCancel">取消清理</button>' : ''}</div>
      ${p.palmStep ? `<div class="bar palm"><i style="width:${Math.round(p.palmStep.k * 100)}%"></i></div>` : ''}
      <div class="muted">本次擊倒 ${c.downs} · 起手已花精力 ${c.spent}（中止不退）</div>`;
  } else if (r) {
    const srcTag = r.src === 'auto' ? '（自主）' : '（手動）';
    line = `<div class="muted">上次清理 ${srcTag}：${CLEAN_END[r.kind]} · 擊倒 ${r.downs} · 花精力 ${r.spent}</div>`;
  }
  const other = v.clean && v.clean.by !== id ? `<div class="muted">${profiles[v.clean.by].label}正在清理（全場只一份）</div>` : '';
  const reallowBtn = ac && ac.suppressed ? '<button class="btn" data-autoclean="reallow" title="清除玩家改派抑制，重新允許自主清鼠">重新允許</button>' : '';
  // SG-TRAIN-01：一般玩家不再直接切初學／熟練（比較 fixture 只留測試 API）；這裡只讀真結果。
  return `<div class="palmbox ${ac ? ac.state : ''}"><div class="row"><b>有限清理 · 掌法</b><span class="tag-chip">${SKILLS[p.palm].label}</span></div>
    <div class="muted">起手 ${SKILLS[p.palm].windup}／收勢 ${SKILLS[p.palm].recover} tick · 掌距 ≤${PALM.reach}，起手開始扣 ${PALM.cost} 精力（練熟靠「練掌到熟練」）</div>
    <div class="row"><span>自主清鼠</span><span>${reallowBtn}<button class="btn ${ac && ac.allow ? 'on' : ''}" data-autoclean="allow" aria-pressed="${ac && ac.allow}">${ac && ac.allow ? '允許中' : '未允許'}</button></span></div>
    <div class="muted autoclean-text">${ac ? ac.text : ''}</div>
    ${line}${other}</div>`;
}
const RAT_KIND = { normal: '普通', alert: '警覺' };
// SG-PATROL-01：巡山列＋最近一次戰報（只顯示最新一份，舊的只留有界摘要）。
const PRES = { down: '擊倒', drove: '喝退', escaped: '逃走', avoided: '避開', unhandled: '未處理' };
function patrolHtml() {
  const sel = selectedPerson(), pa = v.patrol, r = v.patrolReport;
  const opt = model.actions(sel).find((a) => a.id === 'patrol');
  const head = pa ? `<span class="muted">${profiles[pa.by].label}巡山${pa.phase === 'wait' ? '（等精力／等出發）' : pa.phase === 'back' ? '：返院中' : '中'}</span>`
    : opt ? `<button class="btn" data-cmd="patrol" ${opt.enabled ? '' : 'disabled'} title="${opt.enabled ? opt.detail : opt.reason}">派${profiles[sel].label}巡山</button>` : '';
  // 只顯可合理知道的：本趟已觀察到的個體，否則最近戰報記錄；未巡山先顯「尚未探查」，不列 fixture 總數／種類。
  const known = (pa && pa.seen.length ? pa.seen : r ? r.seen : []).filter((x) => x.id !== 'boar');
  const rats = known.length ? known.map((x) => `<span class="rat">林鼠${x.id.slice(-1)}<i>·${RAT_KIND[x.kind]}·${PRES[x.res]}</i></span>`).join('')
    : `<span class="muted">${pa && pa.phase !== 'wait' ? '尚未發現林鼠' : r ? '上次沒遇到林鼠' : '尚未探查'}</span>`;
  const rep = r ? `<div class="patrolrep" data-report="1"><b>戰報</b> ${profiles[r.by].label} · ${PATROL_END[r.end]} · 最遠 ${Math.round(r.far)}／${Math.round(MAIN_LENGTH)} · 路標 ${r.obs.join('→') || '—'} · 精力 ${Math.round(r.e0)}→${Math.round(r.e1)}（扣 ${r.spent.toFixed(1)}） · ${(r.total / 60).toFixed(1)} 秒<br>${r.seen.map((x) => `${x.id === 'boar' ? '野豬' : '林鼠' + x.id.slice(-1)}：${PRES[x.res]}`).join('、') || '沒遇到'}</div>
    <div class="muted">往次摘要（最多 ${v.patrolLog.length} 筆）：${v.patrolLog.slice(0, -1).slice(-4).map((x) => `${PATROL_END[x.end]}·${Math.round(x.far)}`).join('；') || '—'}</div>` : '<div class="muted">還沒有巡山戰報</div>';
  return `<div class="ratrow"><b>西坡巡山<i> S0→S3</i></b><span class="rats">${rats}</span>${head}</div>${rep}`;
}
function ratsHtml() {
  const sel = selectedPerson(), opt = model.actions(sel).find((a) => a.id === 'clean'), c = v.clean;
  const rows = v.rats.map((r) => `<span class="rat r-${r.mode}${c && c.target === r.id && c.phase !== 'back' ? ' tgt' : ''}" title="${r.why || ''}">鼠${r.id}<i>·${RAT_KIND[r.kind]}</i> ${r.label}</span>`).join('');
  const btn = c ? `<span class="muted">${profiles[c.by].label}${PHASE_TEXT[c.phase]}${c.phase !== 'wait' && c.phase !== 'back' ? `：目標鼠${c.target}` : ''}</span>`
    : `<button class="btn" data-cmd="clean" ${opt.enabled ? '' : 'disabled'} title="${opt.enabled ? opt.detail : opt.reason}">派${profiles[sel].label}清理</button>`;
  return `<div class="ratrow"><b>測試弱鼠<i> ×3</i></b><span class="rats">${rows}</span>${btn}</div>
    <div class="muted ratnote">新局固定 fixture，不補滿／不繁殖；只按距離感知（無遮擋視線），不保證清光或每掌必中</div>`;
}
const UP_FX = { want: '想去整理', go: '自己去整理', done: '自己整理完一階' };
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

  if (!ui.boarExpanded) {
    const statusTxt = b.mode === 'habitat' ? '棲地休息' : b.mode === 'approach' ? '逼近護欄' : b.mode === 'prep' ? '撞擊中' : b.mode === 'flee' ? '退走中' : b.label;
    const cleanTxt = v.clean ? `${profiles[v.clean.by].label}${PHASE_TEXT[v.clean.phase] || '清理中'}` : '平靜';
    const alert = b.mode === 'approach' || b.mode === 'prep' || b.marks > 0;
    return `<div class="boar-summary" data-ui="toggleBoar" role="button" aria-expanded="false" title="點擊展開院落近況與派遣">
      <div class="summary-line">
        <span class="tag-chip ${alert ? 'alert' : ''}">🐗 野豬 · ${statusTxt}</span>
        <span class="tag-chip ${b.marks > 0 ? 'alert' : ''}">損痕 ${b.marks}／${b.maxMarks}</span>
        <span class="tag-chip">🐭 鼠群 · ${cleanTxt}</span>
        <span class="tag-chip">🧭 巡山 · ${v.patrol ? (v.patrol.phase === 'back' ? '返院中' : v.patrol.phase === 'wait' ? '待出發' : '巡山中') : v.patrolReport ? '有戰報' : '未巡'}</span>
        <button class="btn toggle-boar" data-ui="toggleBoar">明細 ▾</button>
      </div>
    </div>`;
  }

  return `<div class="boar-expanded">
    <div class="row"><b>院落近況 · 野豬 ${b.label}</b><button class="btn toggle-boar" data-ui="toggleBoar" aria-label="收起近況">收起 ▴</button></div>
    <div class="muted why">${reason}</div>
    <div class="bars"><div>${bar('benergy', b.energy, [B.tiredAt, B.goEnergy], '精力（不是血量）')}</div><div>${bar('threat', b.threat, [B.goThreat, B.scaredAt], '威脅記憶')}</div></div>
    <div class="row"><span>護欄損痕 ${b.marks}／${b.maxMarks}</span>${fixBtn(b, sel)}</div>
    ${ratsHtml()}
    ${patrolHtml()}
    ${b.active ? `<div class="row"><span>${who ? `${who}正在處理` : '沒人處理也能繼續生活'}</span>${opt ? `<button class="btn" data-cmd="guard" ${opt.enabled ? '' : 'disabled'} title="${opt.enabled ? opt.detail : opt.reason}">派${profiles[sel].label}驅離</button>` : ''}</div>`
      : b.last ? `<div class="muted">上次：撞了 ${b.last.hits} 下，${b.last.why}</div>` : ''}
  </div>`;
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
  const bannerWasHidden = $('banner').hidden;
  $('banner').hidden = !bt;
  if ($('banner').textContent !== bt) $('banner').textContent = bt;
  if (bannerWasHidden !== $('banner').hidden) measure();
  $('clock').textContent = fmt(v.seconds);
  $('vat').textContent = `水缸 ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`;
  $('herbs').textContent = `藥架 ${v.herbs}／${v.herbCapacity} · 在途 ${v.herbInFlight}`;
  $('leg').textContent = `${profile.label} Lv ${person.level}`;
  $('trips').textContent = `共完成 ${IDS.reduce((n, who) => n + v.people[who].trips, 0)} 趟`;
  $('follow-toggle').classList.toggle('on', ui.follow);
  $('follow-toggle').textContent = ui.follow ? '🎥 跟隨中' : '👁 自由視野';
  const cards = IDS.map((who) => {
    const p = v.people[who], info = profiles[who];
    return `<button class="card ${ui.selected === who ? 'sel' : ''} ${p.resting ? 'stopped' : ''}" data-person="${who}"><b>${info.name} · Lv ${p.level}</b><small><span class="emini"><i style="width:${en(p)}%"></i></span>精力 ${en(p)} · ${p.resting ? '' : p.jobLabel + ' · '}${p.status}</small>${p.pending ? `<small class="due">${pendText(p)}</small>` : ''}${p.auto.allow || p.auto.wanting ? `<small class="autoline">護院：${p.auto.text}</small>` : ''}${p.up.allow || p.up.wanting ? `<small class="autoline">整理：${p.up.text}</small>` : ''}${p.autoClean && (p.autoClean.allow || p.autoClean.wanting) ? `<small class="autoline">清鼠：${p.autoClean.text}</small>` : ''}</button>`;
  }).join('');
  put('roster', $('roster'), cards);
  $('boar').classList.toggle('collapsed', !ui.boarExpanded);
  put('boar', $('boar'), boarHtml(v.boar));
  $('roster').classList.toggle('collapsed', !ui.rosterOpen);
  const panel = $('panel');
  panel.hidden = !IDS.includes(ui.selected);
  if (!panel.hidden) {
    const si = person.speedsInitial, sn = person.mode === 'carry' ? person.tripSpeeds : person.speeds;
    const work = person.cleaning ? `清理測試鼠（回來${person.jobLabel}）` : person.fixing ? `整理護欄（回來${person.jobLabel}）` : person.guarding ? `驅離野豬（回來${person.jobLabel}）` : person.mode === 'carry' ? `${person.jobLabel}（持續）· 第 ${person.trips + 1} 趟` : person.resting ? `停工（原工作：${person.jobLabel}）`
      : person.leisure ? `閒暇：${person.pref.doing}（原工作：${person.jobLabel}）` : person.recall ? `${person.jobLabel}（玩家叫回）` : `${person.jobLabel}（持續）`;
    const other = person.job === 'water' ? 'herb' : 'water';
    const pend = person.pending
      ? `<div class="pending"><span><b>${pendText(person)}</b><br><small>本趟${person.jobLabel}交付時生效；再下指令只保留最新一個</small></span><button class="btn" data-cmd="cancel">取消</button></div>`
      : person.resting ? `<div class="pending"><span><b>已停工</b><br><small>回滿也不會自己出發；下令開始才解除</small></span><span><button class="btn" data-cmd="start">開始${person.jobLabel}</button> <button class="btn" data-cmd="work:${other}">改${JOBX[other].label}</button></span></div>`
        : person.recall ? `<div class="pending"><span><b>玩家叫回</b><br><small>回院中${person.jobLabel}；滿了就待命，完成返院後的一趟才解除</small></span><button class="btn" data-cmd="resume">恢復自主</button></div>`
          : '<div class="muted">沒有</div>';
    const cmds = model.actions(id).filter((a) => !a.hidden && a.id !== 'pourNow' && a.id !== 'fixCancel' && a.id !== 'upCancel' && a.id !== 'cleanCancel') // 取消整理／整理意願／清理放在各自狀態列旁
      .map((a) => `<button class="btn" data-cmd="${a.id}" ${a.enabled ? '' : 'disabled'} title="${a.enabled ? a.detail : a.reason}">${cmdLabel(a, person)}</button>`).join(' ');
    if (!panel.firstElementChild) panel.innerHTML = '<div id="p-core"></div><div id="p-tabs" class="ptabs" role="tablist"></div><div id="p-life"></div><div id="p-martial"></div>';
    // HOME-01 固定人物資訊：名字、身分、精力、院中存量（都讀模型 view；沒有血量／內力／總戰力）。
    put('p-core', $('p-core'), `<h2>${profile.name}<small>${profile.role}</small></h2>
      <h4>精力</h4><div class="row"><b>${en(person)}／${person.energyMax}</b><span class="muted">${srcText(person) ? `來源：${srcText(person)}` : '工作每秒 −1 · 坐下每秒 +5 · 喝茶 +40'}</span></div>
      <div class="bar energy ${person.energy <= 30 ? 'low' : ''}"><i style="width:${person.energy / person.energyMax * 100}%"></i><s style="left:30%"></s><s style="left:80%"></s></div>
      <div class="row stock" id="stock-${id}"><span>水缸 ${v.vat}／${v.vatCapacity}${v.inFlight ? `（在途 ${v.inFlight}）` : ''}</span><span>藥草 ${v.herbs}／${v.herbCapacity}${v.herbInFlight ? `（在途 ${v.herbInFlight}）` : ''}</span><span class="muted">茶可用：水 ${Math.max(0, v.teaAvail.water)}・藥草 ${Math.max(0, v.teaAvail.herb)}</span></div>`);
    put('p-tabs', $('p-tabs'), `<button class="btn tab ${ui.tab === 'life' ? 'on' : ''}" role="tab" aria-selected="${ui.tab === 'life'}" data-tab="life">生活總覽</button><button class="btn tab ${ui.tab === 'martial' ? 'on' : ''}" role="tab" aria-selected="${ui.tab === 'martial'}" data-tab="martial">武學成長</button>`);
    $('p-life').hidden = ui.tab !== 'life';
    $('p-martial').hidden = ui.tab !== 'martial';
    if (ui.tab === 'life') put('p-life', $('p-life'), `<div class="job-card">
        <div class="row"><b>現在：${person.tea && person.tea.now ? person.tea.now : person.status}</b><span>${work}</span></div>
        <div class="bar"><i style="width:${Math.round((person.mode === 'carry' ? person.tripProgress : person.tea && person.tea.mode === 'brew' ? person.tea.brewK : person.tea && person.tea.mode === 'sip' ? person.tea.sipK : person.restLeg ? person.restLeg.k : person.funLeg ? person.funLeg.k : person.fixLeg ? person.fixLeg.k : person.fixWork ? person.fixWork.k : person.drinkLeg ? person.drinkLeg.k : 0) * 100)}%"></i></div>
        <div class="muted">來源：${sourceText(person)}</div>
        <div class="next-box"><b>下一步：</b>${person.next}</div>
        ${person.why ? `<div class="muted stop-reason">狀態原因：${person.why}</div>` : ''}
        ${teaHtml(person)}
        ${home02Html(person)}
        ${life02Html(person)}
      </div>
      <div id="p-pend">${pend}</div>
      <div id="p-cmds" class="cmds">${cmds}</div>
      ${eventsHtml(id)}
      <div class="adv-section">
      <button class="btn toggle-adv" data-ui="toggleAdv">${ui.advancedOpen ? '▾ 收起進階設定' : '▸ 進階設定（自主政策）'}</button>
      <div class="adv-body" ${ui.advancedOpen ? '' : 'hidden'}>
        ${guardText(person) ? `<div class="guardline">${guardText(person)}</div>` : person.guardResult ? `<div class="muted">驅離結果：${RESULT_TEXT[person.guardResult.kind]}</div>` : ''}
        ${fixHtml(person)}
        ${cleanHtml(person, id)}
        ${autoHtml(person)}
        ${upHtml(person)}
        <div class="muted">偏好：${person.pref ? `${person.pref.label}（${person.pref.place}）· ${person.job === 'herb' ? '藥架' : '水缸'}實存滿才去，有空位就回` : '無'}</div>
        <h4>收穫（此人交付）</h4><div class="row"><span>挑水 ${person.done.water} 擔</span><span>採藥 ${person.done.herb} 份</span></div>
        ${positions[id].borrowed ? `<div class="muted">${positions[id].palm ? '動作借用：掌法沒有專用幀，暫用空手站姿／蹲身底圖＋向量手臂立掌疊圖（專用 atlas 另案）' : '動作借用：整理護欄沒有專用幀，暫用「舒展筋骨」前彎／站直兩幀交替'}</div>` : ''}
        ${positions[id].fallback ? `<div class="muted">動作沿用：${positions[id].requested === 'rest' ? '坐下歇（此人尚無坐姿幀，暫用蹲姿）' : template.actions[positions[id].action].label}</div>` : ''}
      </div></div>`);
    else put('p-martial', $('p-martial'), `<div class="leg-badge"><b>腳力 Lv ${person.level}／${person.maxLevel}</b><span class="muted">${person.nextNeed ? `（再 ${person.nextNeed - person.xp} 趟升 Lv ${person.level + 1}）` : '（已封頂）'}</span></div>
        <div class="bar xp"><i style="width:${person.nextNeed ? Math.round(person.xp / person.nextNeed * 100) : 100}%"></i></div>
        <table class="cmp"><tr><td>場景單位／秒</td><td class="now">${person.mode === 'carry' ? `本趟 Lv ${person.tripLevel}` : `現在 Lv ${person.level}`}</td><td class="init">起始 Lv ${person.initialLevel}</td></tr>
          <tr><td>去程（空手／空桶）</td><td class="now">${sn.empty.toFixed(1)}</td><td class="init">${si.empty.toFixed(1)}</td></tr>
          <tr><td>回程（負重）</td><td class="now">${sn.load.toFixed(1)}</td><td class="init">${si.load.toFixed(1)}</td></tr>
          <tr><td>下趟${JOBX[person.nextJob].label}（Lv ${person.level}）</td><td class="now">${sec(person.tripSeconds)}</td><td class="init">${sec(person.tripSecondsInitial)}</td></tr></table>
        <h4>掌法</h4><div class="row"><b>${person.palmLabel}</b><span class="muted">起手 ${person.palmTicks.windup}・收勢 ${person.palmTicks.recover} tick</span></div>
        ${trainHtml(person)}
        <h4>巡山戰報（本局真實紀錄）</h4>${martialPatrol(v, id)}`);
  }
}

// HOME-01：來源只說真的原因（玩家指派／自主政策／必要自理）。
function sourceText(p) {
  if (p.tea && p.tea.active) return '玩家指派：泡茶';
  if (p.home02 && p.home02.active) return '玩家指派：修寢舍';
  if (p.bed && (p.mode === 'toSeat' || p.mode === 'seated')) return p.rest === 'manual' ? '玩家停工：回自己的床' : '必要自理：回床恢復';
  if (p.train01 && p.train01.src) return p.train01.src;
  if (p.life02 && p.life02.src) return p.life02.src;
  if (p.rest === 'auto') return '必要自理：精力低先恢復';
  if (p.rest === 'manual') return '玩家停工／待命';
  if (p.recall) return '玩家叫回';
  if (p.guardSrc || p.fixSrc || p.cleanSrc) return (p.guardSrc || p.fixSrc || p.cleanSrc) === 'auto' ? '自主政策' : '玩家指派';
  return p.leisure ? '自由活動（存放處已滿）' : '持續工作';
}
// SG-HOME-02 生活面板：木料、工地進度、床位（床主／使用中／預約）與床牌；全只本局、不存檔（明示）。
function home02Html(p) {
  const w = v.home02, h = p.home02, nm = (x) => (x ? profiles[x].label : '—');
  const beds = w.beds.map((b) => `<div class="row bedrow" id="bed-${b.id}"><span><b>${b.id}</b> 床主 ${nm(b.owner)}${b.user ? ` · 使用中 ${nm(b.user)}` : b.resv ? ` · 正走去 ${nm(b.resv)}` : ''}</span>
    <span>${b.open ? IDS.map((who) => `<button class="btn mini" data-bed="${b.id}" data-owner="${who}" ${b.idle && b.owner !== who ? '' : 'disabled'} title="${b.idle ? '指派床主（不推進時間、不派工）' : '有人使用或正走去：不能改'}">給${profiles[who].label}</button>`).join('') + `<button class="btn mini" data-bed="${b.id}" data-owner="" ${b.idle && b.owner ? '' : 'disabled'}>解除</button>` : '<small class="muted">寢舍未修好</small>'}</span></div>`).join('');
  return `<div class="home02" id="home02-${p.id}">
    <div class="row"><b>院倉木料</b><span>${w.wood}／${w.cap}${w.woodIn ? `（砍柴在途 ${w.woodIn}）` : ''}${w.resv ? ` · 工地預約 ${w.resv}` : ''}${w.bundle ? ` · 扛往工地 ${w.bundle.n}` : ''}</span></div>
    <div class="row"><b>寢舍（${w.roomId}）</b><span>${w.site.label} · 木 ${w.site.at}／${w.site.need} · 工時 ${w.site.work}／${w.site.workMs / 1000} 秒${w.site.by ? ` · 工位：${nm(w.site.by)}` : ''}</span></div>
    <div class="bar site"><i style="width:${Math.round(w.site.k * 100)}%"></i></div>
    ${h && h.now ? `<div><b>修繕：</b>${h.now}</div><div class="muted">下一步：${h.next}</div>` : ''}${h && h.note ? `<div class="muted">最近：${h.note}</div>` : ''}
    ${p.bed ? `<div class="muted">床位：${p.bed}${p.mode === 'seated' ? '（躺下恢復，每秒 +5）' : ''}</div>` : p.bedWhy ? `<div class="muted">床位：${p.bedWhy}</div>` : ''}
    ${beds}
    <div class="muted unsaved">木料、寢舍工地與床位只本局，<b>不存檔</b>；讀檔／重來後回到破損、木 0。</div></div>`;
}
function teaHtml(p) {
  const t = p.tea;
  if (!t || (!t.active && !t.note)) return '';
  return `<div class="tea" id="tea-${p.id}">${t.now ? `<div><b>茶座：</b>${t.now}</div>` : ''}${t.note ? `<div class="muted">最近：${t.note}</div>` : ''}${t.active ? `<div class="muted">預約：水 ${t.resv.water}・藥草 ${t.resv.herb}${t.seat ? `・座位 ${profiles[t.seat].name}` : ''}</div>` : ''}</div>`;
}
function eventsHtml(id) {
  const evs = v.teaEvents.filter((e) => e.person === id).slice(-8).reverse();
  return `<div class="events"><button class="btn toggle-adv" data-ui="toggleEvents">${ui.eventsOpen ? '▾' : '▸'} 小事件（本局 ${evs.length}）</button>${ui.eventsOpen ? `<ul>${evs.map((e) => `<li>${(e.tick / 60).toFixed(0)}s ${e.text}</li>`).join('') || '<li class="muted">本局還沒有</li>'}</ul>` : ''}</div>`;
}
function martialPatrol(v, id) {
  const r = v.patrolReport;
  if (!r || r.by !== id) return '<div class="muted">此人本局還沒有巡山戰報</div>';
  return `<div class="patrolrep">${PATROL_END[r.end]} · 最遠 ${Math.round(r.far)} · 路標 ${r.obs.join('→') || '—'} · 精力 ${Math.round(r.e0)}→${Math.round(r.e1)}</div>`;
}
// SG-LIFE-02 人物卡：只補「現在／來源／原因／下一步」，不重排 HUD。
function life02Html(person) {
  const l = person.life02;
  if (!l || (!l.fill && !l.meeting && !l.why)) return '';
  return `<div class="life02" id="life02-${person.id}">${l.now ? `<div><b>現在：</b>${l.now}</div>` : ''}<div class="muted">來源：${l.src}</div>${l.why ? `<div class="muted">原因：${l.why}</div>` : ''}${l.next && l.next !== person.next ? `<div class="muted">下一步：${l.next}</div>` : ''}${l.meeting ? '<div class="muted">動作借用：招呼用「舒展筋骨」前彎／站直幀；這段互動不存檔</div>' : ''}</div>`;
}
// SG-TRAIN-01 人物卡：腳力與這一式進度分開；現在／來源／原因／下一步讀模型，動畫只呈現。
function trainHtml(person) {
  const t = person.train01;
  if (!t) return '';
  const cells = Array.from({ length: t.max }, (_, i) => `<i class="${i < t.units ? 'on' : i === t.units && t.training && person.mode === 'train' ? 'cur' : ''}"></i>`).join('');
  const rhythm = `起手 ${t.palm.from.windup}→${t.palm.to.windup}・收勢 ${t.palm.from.recover}→${t.palm.to.recover} tick（現：${t.palm.windup}／${t.palm.recover}）`;
  return `<div class="train01" id="train01-${person.id}"><div class="row"><b>掌法進度</b><span class="tcells">${cells}</span><span class="muted">${t.adept ? '已練熟（本包上限）' : `${t.units}／${t.max} 單位`}</span></div>
    ${person.mode === 'train' ? `<div class="bar palm"><i style="width:${Math.round(t.unitK * 100)}%"></i></div>` : ''}
    <div class="muted">${rhythm}</div>
    ${t.now ? `<div><b>現在：</b>${t.now}</div><div class="muted">來源：${t.src}</div>` : ''}${t.why ? `<div class="muted">原因：${t.why}</div>` : ''}${t.next ? `<div class="muted">下一步：${t.next}</div>` : ''}
    ${t.goal || t.training ? '<div class="muted">練習進度只本局、不保存；練熟結果沿原掌法欄位保存</div>' : ''}</div>`;
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
  if (ui.playing) { const n = clock.feed(t.deltaMS, ui.speed); for (let i = 0; i < n; i++) sceneAdapter.observeStep(); }
  const prev = v;
  v = model.view();
  const sceneEvents = renderShared();
  for (const id of IDS) {
    const person = v.people[id], p = positions[id];
    const sprite = sprites[id];
    placeBasket(id, p, person);
    placeCup(id, p, person);
    const arm = armGs[id];
    arm.visible = !!p.palm;
    if (p.palm) {
      if (arm.pose !== p.palm) { drawArm(arm, p.palm, id); arm.pose = p.palm; }
      sprite.rotation = p.palm.lean * Math.PI / 180 * p.face;
      arm.scale.x = p.face; arm.position.set(p.x, p.y); arm.zIndex = p.y + 0.02;
    } else sprite.rotation = 0;
    placeHome02(id, p, person); // SG-HOME-02：扛柴、躺下／起身與被褥
    if (p.phase === 'woodChop' && person.phase && person.phase.steps % FIX_BEAT === FIX_BEND) chips.push({ x: WOOD_PATH.log.x + 6, y: WOOD_PATH.log.y - 10, t: 0 });
    // Consume every core trip event once, including several authoritative ticks
    // batched at 4×. The old frame-to-frame counter comparison could coalesce them.
    for (const event of sceneEvents.filter((e) => e.actorId === id && e.kind === 'trip')) {
      const done = event.data, herb = done.job === 'herb', wood = done.job === 'wood', at = wood ? DORM.woodpile : places[herb ? 'rack' : 'vat'];
      fx.push({ text: `${profiles[id].label} +1 ${wood ? '捆柴' : herb ? '份藥' : '擔'}`, x: at.x, y: at.y - 70, until: performance.now() + 1600 });
      if (done.grew) fx.push({ text: `${profiles[id].label}腳力 Lv ${done.level}`, x: p.x, y: p.y - 100, until: performance.now() + 2200 });
    }
    const as = person.auto.state, ap = prev.people[id].auto.state;
    if (as !== ap && AUTO_FX[as]) fx.push({ text: `${profiles[id].label}：${AUTO_FX[as]}`, x: p.x, y: p.y - 112, until: performance.now() + 2000 });
    const us = person.up.state, up0 = prev.people[id].up.state;
    if (us !== up0 && UP_FX[us]) fx.push({ text: `${profiles[id].label}：${UP_FX[us]}`, x: p.x, y: p.y - 124, until: performance.now() + 2000 });
    const gr = person.guardResult, pg = prev.people[id].guardResult;
    const fr = person.fixResult, pf = prev.people[id].fixResult;
    if (fr && (!pf || fr.tick !== pf.tick)) fx.push({ text: `${profiles[id].label}：${FIX_RESULT[fr.kind]}`, x: BOAR.fence.x + 30, y: BOAR.fence.y1 - 4, until: performance.now() + 2400 });
    if (gr && gr !== pg && (!pg || gr.tick !== pg.tick)) fx.push({ text: `${profiles[id].label}：${RESULT_TEXT[gr.kind]}`, x: p.x, y: p.y - 96, until: performance.now() + 2200 });
    if (stakes[id]) { const c = person.train01 && person.train01.cyc, hit = c && c.phase === 'recover' && c.steps < 12 ? 1 - c.steps / 12 : 0; if (hit || stakes[id].hit) { drawStake(stakes[id], hit); stakes[id].hit = hit > 0; } }
    const turn = meetTurn(person);
    tag(`${id}-say`, 'say', turn ? SAY[turn][id] : null, p.x, p.y - 96);
    tag(id, `hero ${ui.selected === id ? 'sel' : ''}`, `${profiles[id].label} Lv ${person.level} · 精力 ${en(person)}`, p.x, p.y, 6);
    tag(`${id}-pill`, `pill ${person.resting ? 'stop' : person.rest || person.mode === 'back' ? 'rest' : person.guarding || person.fixing ? 'guard' : person.leisure ? 'fun' : person.recall ? 'recall' : ''}`, person.mode === 'carry' ? `${person.status} ${Math.round(person.phase.k * 100)}%` : person.mode === 'fix' ? `${person.status} ${Math.round(person.fixWork.k * 100)}%` : person.status, p.x, p.y - (person.mode === 'seated' ? 64 : 80));
  }
  // SG-HOME-02 世界件：柴堆分級、寢舍階段、床（修好才出現）、木屑、名牌。
  {
    const w = v.home02, lv = w.wood <= 0 ? 0 : w.wood <= 4 ? 1 : w.wood <= 8 ? 2 : 3;
    if (yardPile.lv !== lv) { yardPile.texture = HT('woodpile_' + lv); yardPile.lv = lv; }
    const st = 'dorm_' + w.site.stage;
    if (dorm.st !== st) { dorm.texture = HT(st); dorm.scale.set(96 / dorm.texture.height); dorm.st = st; }
    for (const b of w.beds) bedSprites[b.id].visible = w.site.stage === 'done';
    // 房內剖視：修好後寢舍退到屋內件之後並半透（剖面），兩床與走向／躺在／起身的人物畫在屋內、可辨認在房裡。
    const inside = w.site.stage === 'done';
    dorm.zIndex = inside ? DORM.site.y - 140 : DORM.site.y; dorm.alpha = inside ? 0.72 : 1;
    for (const id in bedSprites) bedSprites[id].zIndex = inside ? DORM.site.y - 120 : bedSprites[id].y - 7;
    for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; if (!c.g) { c.g = new Sprite(HT('chip')); c.g.anchor.set(0.5); c.g.scale.set(0.5); sorted.addChild(c.g); } c.t += t.deltaMS / 1000; c.g.position.set(c.x + c.t * 30, c.y - 20 * c.t + 40 * c.t * c.t); c.g.zIndex = WOOD_PATH.log.y + 10; c.g.alpha = Math.max(0, 1 - c.t * 1.6); if (c.t > 0.7) { c.g.destroy(); chips.splice(i, 1); } }
    tag('h2-pile', 'place', `院倉柴堆 ${w.wood}／${w.cap}${w.woodIn ? ` · 在途 ${w.woodIn}` : ''}${w.resv ? ` · 預約 ${w.resv}` : ''}`, DORM.woodpile.x, DORM.woodpile.y + 14);
    tag('h2-site', 'place', `寢舍 ${w.site.label} · 木 ${w.site.at}／${w.site.need} · ${w.site.work}／${w.site.workMs / 1000} 秒`, DORM.site.x, DORM.site.y + 26);
    tag('h2-log', 'place', '林緣枯木（砍柴）', WOOD_PATH.log.x, WOOD_PATH.log.y + 14);
  }
  // SG-PATROL-01 林鼠：同一套鼠畫法，只讀 view().prats。
  for (const w of WAYPOINTS) tag(`wp${w.id}`, 'pill wp', `${w.id} ${w.label}`, w.x, w.y, 14);
  for (const r of v.prats) {
    let g = pratGs.get(r.id);
    if (!g) { g = makeRat(); sorted.addChild(g); pratGs.set(r.id, g); }
    const out = r.mode === 'gone';
    g.visible = !out;
    if (!out) { drawRat(g, r, performance.now()); g.scale.set(1.25 * (r.mode === 'flee' ? -1 : 1), 1.25); g.position.set(r.x, r.y); g.zIndex = r.y; }
    const pr = prev.prats.find((q) => q.id === r.id);
    if (pr && pr.mode !== r.mode && r.mode === 'down') fx.push({ text: '啪！林鼠擊倒', x: r.x, y: r.y - 30, until: performance.now() + 1600 });
    if (pr && pr.mode !== r.mode && r.mode === 'flee') fx.push({ text: '林鼠逃！', x: r.x, y: r.y - 30, until: performance.now() + 1400 });
  }
  if (v.patrolReport && v.patrolReport !== prev.patrolReport && (!prev.patrolReport || prev.patrolReport.endTick !== v.patrolReport.endTick)) { const hp = positions[v.patrolReport.by]; fx.push({ text: `巡山回院：${PATROL_END[v.patrolReport.end]}`, x: hp.x, y: hp.y - 110, until: performance.now() + 2400 }); }
  // LP-11 三鼠與接觸：只讀 view().rats／clean；接觸閃光與浮字只是畫面，不入帳。
  for (const r of v.rats) {
    let g = ratGs.get(r.id);
    if (!g) { g = makeRat(); sorted.addChild(g); ratGs.set(r.id, g); }
    const out = r.mode === 'gone' && (r.x <= EXIT.at(-1)[0] + 0.01);
    g.visible = !out;
    if (!out) { drawRat(g, r, performance.now()); g.scale.set(1.25 * (r.mode === 'flee' || r.mode === 'gone' ? -1 : 1), 1.25); g.position.set(r.x, r.y); g.zIndex = r.y; }
    const pr = prev.rats.find((q) => q.id === r.id);
    if (pr && pr.mode !== r.mode && r.mode === 'down') fx.push({ text: `啪！鼠${r.id}擊倒`, x: r.x, y: r.y - 30, until: performance.now() + 1600 });
    if (pr && pr.mode !== r.mode && r.mode === 'flee') fx.push({ text: `鼠${r.id}逃！`, x: r.x, y: r.y - 30, until: performance.now() + 1400 });
    if (pr && pr.mode !== r.mode && r.mode === 'gone') fx.push({ text: `鼠${r.id}出界，不追`, x: r.x, y: r.y - 30, until: performance.now() + 1800 });
    tag(`rat${r.id}`, `pill rat ${r.mode}`, out ? null : `鼠${r.id}${r.kind === 'alert' ? '（警覺）' : ''}`, r.x - 34, r.y + 2); // 名牌放鼠左側：上方是藥架名牌、右側是清理者
  }
  if (v.clean && prev.clean && v.clean.target !== prev.clean.target && v.clean.target != null && prev.clean.target != null) {
    const cp = positions[v.clean.by]; fx.push({ text: `換目標 → 鼠${v.clean.target}`, x: cp.x, y: cp.y - 110, until: performance.now() + 1600 });
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
  if (vatShown !== v.vat) { drawVatWater(v.vat); vatShown = v.vat; }
  placeMark.clear();
  if (ui.menu) { const pl = places[ui.menu]; placeMark.ellipse(pl.x, pl.y - pl.ry * 0.6, pl.rx + 6, pl.ry + 4).stroke({ width: 3, color: 0xc8962e, alpha: 0.9 }); }
  tag('vat', 'place', `${scene.places.vat.label} ${v.vat}／${v.vatCapacity} · 在途 ${v.inFlight}`, scene.places.vat.x, scene.places.vat.y - 60);
  tag('spring', 'place', places.spring.label, places.spring.x, places.spring.y - 40);
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
  wc.tick(sceneSnapshot.timeMs, IDS.map((id) => positions[id]).filter(Boolean)); // D37：遮擋淡出／竹影／水光，只是畫面
  if (ui.follow) follow();
  placeMenu();
  if (prev.boar.mode !== v.boar.mode || prev.boar.why !== v.boar.why || IDS.some((id) => prev.people[id].trips !== v.people[id].trips || prev.people[id].guardOrder !== v.people[id].guardOrder || prev.people[id].status !== v.people[id].status || prev.people[id].restOrder !== v.people[id].restOrder || prev.people[id].resting !== v.people[id].resting || prev.people[id].next !== v.people[id].next || prev.people[id].auto.text !== v.people[id].auto.text || prev.people[id].up.text !== v.people[id].up.text || prev.people[id].fix !== v.people[id].fix || prev.people[id].fixResult !== v.people[id].fixResult || prev.people[id].cleanResult !== v.people[id].cleanResult) || JSON.stringify(prev.clean) !== JSON.stringify(v.clean) || prev.rats.some((r, i) => r.mode !== v.rats[i].mode) || prev.prats.some((r, i) => r.mode !== v.prats[i].mode) || JSON.stringify(prev.patrol) !== JSON.stringify(v.patrol) || (prev.patrolReport && prev.patrolReport.endTick) !== (v.patrolReport && v.patrolReport.endTick) || prev.boar.marks !== v.boar.marks || prev.boar.seen !== v.boar.seen || frames % 15 === 0) renderChrome();
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
      rats: v.rats.map((r) => ({ ...r, screen: toScreen(r.x, r.y - 6) })), clean: v.clean,
      prats: v.prats.map((r) => ({ ...r, screen: toScreen(r.x, r.y - 6) })), patrol: v.patrol, patrolReport: v.patrolReport, patrolLog: v.patrolLog.length,
      waypoints: WAYPOINTS.map((w) => ({ ...w, screen: toScreen(w.x, w.y) })), palmArm: Object.fromEntries(IDS.map((id) => [id, armGs[id].visible])),
      playing: ui.playing, autoPaused: ui.autoPaused, pausedByMenu: ui.pausedByMenu, speed: ui.speed,
      selected: ui.selected, menu: ui.menu, menuPerson: ui.menuPerson, cam: { ...cam }, hidden: document.hidden,
      heroScreen: people.hero.screen,
      vatScreen: toScreen(scene.places.vat.x, scene.places.vat.y - 20), springScreen: toScreen(places.spring.x, places.spring.y - 10),
      sceneSource: sceneSnapshot.source, sceneEvents: sceneSnapshot.events, sceneActors: sceneSnapshot.actors,
      sceneOcclusion: { bridgeFrontDepth: wc.front.zIndex, fadedProps: wc.props.filter((q) => q.s.alpha < 1).map((q) => ({ id: q.p.id, x: q.p.x, y: q.p.y, alpha: q.s.alpha })) },
      firstFrameMs, frames, stepMs: STEP_MS, cups: Object.fromEntries(IDS.map((id) => [id, cups[id].visible])),
      home02: v.home02, h2: Object.fromEntries(IDS.map((id) => [id, { mode: v.people[id].mode, bed: v.people[id].bed, bundle: bundles[id].visible, quilt: quilts[id].visible, rot: sprites[id].rotation, phase: v.people[id].phase && v.people[id].phase.name }])),
    };
  },
  // D37：鏡頭快看（只動鏡頭；截圖與手動導覽共用同一條路徑）
  look,
  // 權威狀態深拷貝（只讀；存讀等價檢查用）。
  exportState: () => model.exportState(),
  // SG-TRAIN-01：一般玩家已無掌法 fixture 按鈕；舊比較檢查改走同一 model.setPalm 測試 API（任務中照樣拒絕）。
  setPalm: (id, skill) => model.setPalm(id, skill),
};
