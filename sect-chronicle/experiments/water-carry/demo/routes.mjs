// 生活開發版的兩條工作路線與「模型狀態 → 場景位置」換算。純函式、不碰 Pixi，畫面與檢查共用同一份。
// 兩條路共用同一個院中端點（水缸旁），所以交付後改做另一份工作、或休息時改令，人都站在同一點出發，不會瞬移。
import { pathTool } from '../template/animator.mjs';

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

export function createRoutes(waterPoints) {
  const routes = { water: pathTool(waterPoints), herb: pathTool(HERB.points) };
  const seats = { hero: pathTool(SEATS.hero.points), cousin: pathTool(SEATS.cousin.points) };
  const funs = { hero: pathTool(FUN.hero.points), cousin: pathTool(FUN.cousin.points) };
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
  function of(id, p) {
    if (p.mode === 'toFun' || p.mode === 'fromFun') return funPlace(id, p.mode, p.funLeg.k);
    if (p.mode === 'fun') return funPlace(id, 'fun', 1);
    if (p.mode === 'toSeat' || p.mode === 'back') return seatPlace(id, p.mode, p.restLeg.k);
    if (p.mode === 'seated') return seatPlace(id, 'seated', 1);
    return place(p.mode === 'carry' && p.phase ? p.phase.name : 'idle', p.phase?.k || 0, p.job);
  }
  return { routes, seats, funs, place, of, seatLengths: { hero: seats.hero.length, cousin: seats.cousin.length }, funLengths: { hero: funs.hero.length, cousin: funs.cousin.length } };
}
const WATER = { down: 1, dip: 1, up: 1, pour: 1 };
