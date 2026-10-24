// 生活開發版的兩條工作路線與「模型狀態 → 場景位置」換算。純函式、不碰 Pixi，畫面與檢查共用同一份。
// 兩條路共用同一個院中端點（水缸旁），所以交付後改做另一份工作、或休息時改令，人都站在同一點出發，不會瞬移。
import { pathTool } from '../template/animator.mjs';
import { WATER_POINTS } from './water-layout.mjs';

// 採藥路：院中端點 → 沿院子下緣往東 → 坡地小路 → 藥圃。座標是本輪示意配置（方向沿 BL-W02 草圖），長度交給模型計時。
export const HERB = {
  points: [[962, 512], [990, 556], [1090, 598], [1160, 640], [1240, 676], [1320, 718], [1398, 772]],
  patch: { x: 1440, y: 788 },
  rack: { x: 896, y: 474 }, // 藥架在院中端點左上，交藥時面向它
};
// 採藥四段借用挑水路的位置算法：去程＝down、採集＝dip（停在路底）、回程＝up、交藥＝pour（停在路頭）。
export const ALIAS = { herbOut: 'down', herbGather: 'dip', herbBack: 'up', herbDeliver: 'pour' };

// LP-04 休息區：院中端點西北、松樹下一張長石凳，兩人各一個固定座位。路線先共用一小段再分到各自座位，長度交給模型計時。
export const SEATS = {
  bench: { x: 968, y: 420, w: 92 },
  hero: { points: [[962, 512], [952, 470], [944, 440], [940, 424]] },
  cousin: { points: [[962, 512], [952, 470], [976, 436], [994, 420]] },
};

// LP-05 偏好休閒點：主角走到院子西側草坡邊的觀景石看山（背對鏡頭朝西北群山），熟手到道館門前院中空地舒展筋骨。
// 都從同一院中端點出發，固定折線、不尋路；與石凳路線分開，避免看成「去休息」。長度交給模型計時。
export const FUN = {
  hero: { points: [[962, 512], [930, 522], [880, 512], [820, 480], [774, 448]], stone: { x: 752, y: 456 }, face: -1, act: 'gaze' },
  cousin: { points: [[962, 512], [1040, 492], [1120, 472], [1190, 462]], face: 1, act: 'stretch' },
};

// LP-06 野豬：院子西側草坡外一段非關鍵竹護欄。獸路從畫面西界外的棲地出來，到林緣（第 2 點）嗅探，再沿草坡靠近護欄外側。
// 防守點在護欄內側，人從同一院中端點沿看山那條路的方向走去（另一條獨立折線，不改舊路線）。長度交給模型計時。
export const BOAR = {
  points: [[-70, 448], [150, 446], [300, 432], [450, 440], [580, 432], [664, 432]], // 第 1 點＝棲地（畫面外），第 2 點＝林緣
  fence: { x: 680, y1: 386, y2: 480, x1: 640, x2: 720 }, // 西北→東南斜向一段，野豬接觸點在它西側、防守點在東側
  edge: { x: 150, y: 446 },
};
// LP-08：退走中的野豬只要還在這條固定世界界線東側（x > SEEN_X）就看得見；與鏡頭／縮放／視窗無關。
export const SEEN_X = -20;
// SG-LIFE-01 飲水站：現有水缸（scene 水缸 x1000,y520）前左側一個站點；從院中端點走一小段。停工坐著的人從座位沿原座位路回到院中端點再接這段。
export const DRINK = { points: [[962, 512], [958, 530], [972, 546]], face: 1, vat: { x: 1000, y: 520 } };
export const GUARD = { points: [[962, 512], [930, 522], [880, 512], [820, 480], [782, 452], [748, 428], [706, 430]] };

export function createRoutes(waterPoints = WATER_POINTS) {
  const routes = { water: pathTool(waterPoints), herb: pathTool(HERB.points) };
  const seats = { hero: pathTool(SEATS.hero.points), cousin: pathTool(SEATS.cousin.points) };
  const funs = { hero: pathTool(FUN.hero.points), cousin: pathTool(FUN.cousin.points) };
  const boarPath = pathTool(BOAR.points), guardPath = pathTool(GUARD.points);
  const drinks = { home: pathTool(DRINK.points), hero: pathTool([...SEATS.hero.points].reverse().concat(DRINK.points.slice(1))), cousin: pathTool([...SEATS.cousin.points].reverse().concat(DRINK.points.slice(1))) };
  // 去／喝／回：u=0 出發點、u=1 飲水站；回程只走 span（取消去程時走回已走的那段）。喝水時面向水缸。
  function drinkPlace(id, d) {
    const r = d.from === 'seat' ? drinks[id] : drinks.home, m = d.mode;
    const u = m === 'toDrink' ? d.k : m === 'fromDrink' ? d.span * (1 - d.k) : 1, p = r.at(u);
    const face = m === 'drink' ? DRINK.face : (m === 'fromDrink' ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: m, travelled: m === 'drink' ? 0 : d.k * r.length * (m === 'fromDrink' ? d.span : 1) };
  }
  const [h0, h1] = BOAR.points, boarEdge = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
  // 獸路 x 由西往東單調增加，所以「x > SEEN_X」等於「離棲地距離 d > boarSeenD」；模型用這個距離判斷，畫面用 x，同一來源。
  const boarSeenD = (SEEN_X - h0[0]) / (h1[0] - h0[0]) * boarEdge;
  // 野豬位置只看模型的距離 d（離棲地多遠）與模式；退走朝棲地（西）。
  function boarAt(b) {
    const p = boarPath.at(b.d / boarPath.length);
    const face = b.mode === 'flee' ? -1 : b.mode === 'habitat' ? -1 : 1;
    return { x: p.x, y: p.y, face, visible: b.mode !== 'habitat' && p.x > SEEN_X };
  }
  // 去／等／喝止／回防守點：u=0 院中端點、u=1 防守點；等候與喝止面向護欄（西）。
  function guardPlace(mode, k) {
    const u = mode === 'toGuard' ? k : mode === 'fromGuard' ? 1 - k : 1, p = guardPath.at(u);
    const face = mode === 'guardWait' || mode === 'shout' ? -1 : (mode === 'fromGuard' ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: guardPath, geo: mode, travelled: mode === 'toGuard' || mode === 'fromGuard' ? k * guardPath.length : 0 };
  }
  // phase：模型的階段名，或 idle／rest；job：不在路上時，人站在哪份工作的路頭（兩者相同）。
  function place(phase, k, job = 'water') {
    const onHerb = ALIAS[phase] || (!(phase in WATER) && job === 'herb');
    const route = routes[onHerb ? 'herb' : 'water'];
    const geo = ALIAS[phase] || phase;
    const at = route.place({ phase: geo, k });
    if (phase === 'herbGather') at.face = 1; // 藥圃在路底右側
    if (phase === 'herbDeliver') at.face = -1; // 藥架在左上
    return { ...at, route, geo, travelled: geo === 'down' || geo === 'up' ? k * route.length : 0 };
  }
  // 去／坐／回座位：u=0 院中端點、u=1 座位。坐下面向鏡頭右側（朝院子）。
  function seatPlace(id, mode, k) {
    const r = seats[id], u = mode === 'toSeat' ? k : mode === 'back' ? 1 - k : 1, p = r.at(u);
    const face = mode === 'seated' ? 1 : (mode === 'back' ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: mode, travelled: mode === 'seated' ? 0 : k * r.length };
  }
  // 去／做／回偏好活動：u=0 院中端點、u=1 活動點；活動中朝固定方向（主角朝群山、熟手朝院子）。
  function funPlace(id, mode, k) {
    const r = funs[id], u = mode === 'toFun' ? k : mode === 'fromFun' ? 1 - k : 1, p = r.at(u);
    const face = mode === 'fun' ? FUN[id].face : (mode === 'fromFun' ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: mode, travelled: mode === 'fun' ? 0 : k * r.length };
  }
  // 由 view() 的人物欄位決定位置：畫面與檢查共用，避免各自猜狀態。
  // LP-08 整理護欄：沿同一條防守路往返，到點在防守點面向護欄動手。
  const FIX_AS = { toFix: 'toGuard', fromFix: 'fromGuard', fix: 'guardWait' };
  function of(id, p) {
    // LP-11：清理中直接用模型在權威 tick 取樣的場景位置（palm.mjs 同一幾何），畫面不另算。
    if (p.drinkLeg) return drinkPlace(id, { ...p.drinkLeg, mode: p.mode });
    if (p.cleaning) return { x: p.pos.x, y: p.pos.y, face: p.cface, route: null, geo: p.mode, travelled: p.walked };
    if (p.mode === 'toFix' || p.mode === 'fromFix') return { ...guardPlace(FIX_AS[p.mode], p.fixLeg.k), geo: p.mode };
    if (p.mode === 'fix') return { ...guardPlace('guardWait', 1), geo: 'fix' };
    if (p.mode === 'toGuard' || p.mode === 'fromGuard') return guardPlace(p.mode, p.guardLeg.k);
    if (p.mode === 'guardWait' || p.mode === 'shout') return guardPlace(p.mode, 1);
    if (p.mode === 'toFun' || p.mode === 'fromFun') return funPlace(id, p.mode, p.funLeg.k);
    if (p.mode === 'fun') return funPlace(id, 'fun', 1);
    if (p.mode === 'toSeat' || p.mode === 'back') return seatPlace(id, p.mode, p.restLeg.k);
    if (p.mode === 'seated') return seatPlace(id, 'seated', 1);
    return place(p.mode === 'carry' && p.phase ? p.phase.name : 'idle', p.phase?.k || 0, p.job);
  }
  return { routes, seats, funs, place, of, seatLengths: { hero: seats.hero.length, cousin: seats.cousin.length }, funLengths: { hero: funs.hero.length, cousin: funs.cousin.length },
    boarPath, guardPath, boarAt, guardPlace, boarLengths: { edge: boarEdge, total: boarPath.length, seen: boarSeenD }, boarSeenD, guardLength: guardPath.length,
    drinks, drinkPlace, drinkLengths: { home: drinks.home.length, seat: { hero: drinks.hero.length, cousin: drinks.cousin.length } } };
}
const WATER = { down: 1, dip: 1, up: 1, pour: 1 };
