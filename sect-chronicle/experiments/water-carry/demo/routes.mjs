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
// SG-LIFE-02 同門招呼站位：院中端點西南的院坪空地，兩人相距約 34、面對面。從各自休閒點沿原休閒路反走回院中端點，
// 再接這段院中短折線；固定折線、不尋路，不改原工作／休閒／巡山幾何。
export const MEET = {
  hero: { points: [[962, 512], [940, 532], [914, 548]], face: 1 },
  cousin: { points: [[962, 512], [956, 534], [948, 550]], face: -1 },
};
// SG-TRAIN-01 院中練功區：院坪東側石地，兩人各一固定站位、各一根木樁（樁在站位右前方，只是道具，不是敵人或設施）。
// 獨立短折線自院中端點出發，不動原工作／休閒／飲水／防衛／巡山／招呼路。
export const TRAIN_POSTS = {
  hero: { points: [[962, 512], [990, 540], [1036, 560], [1060, 566]], face: 1, stake: { x: 1086, y: 562 } },
  cousin: { points: [[962, 512], [990, 540], [1054, 572], [1112, 576]], face: 1, stake: { x: 1138, y: 572 } },
};
// HOME-01（D45）茶座：S0 院中端點東北、草亭旁一個石座與小爐（一個座位）。獨立短折線，不動任何原路線。
export const TEA_SEAT = { points: [[962, 512], [984, 494], [1004, 480]], face: 1, stove: { x: 1028, y: 476 } };
// SG-HOME-02（D49）：林緣枯木（砍柴）、寢舍工地（HOME01 預留位 dorm_reserved）與房內兩張床。全為自院中端點出發的獨立固定折線，不動舊路。
export const WOOD_PATH = { points: [[962, 512], [930, 496], [904, 470], [890, 430], [876, 392], [858, 360]], log: { x: 836, y: 350 } };
export const WOOD_ALIAS = { woodOut: 'down', woodChop: 'dip', woodBack: 'up', woodDeliver: 'pour' };
export const DORM = { points: [[962, 512], [990, 556], [1090, 598], [1160, 640], [1180, 700], [1150, 742], [1108, 744]], site: { x: 1104, y: 722 }, face: -1,
  beds: { 'bed-1': { points: [[1108, 744], [1092, 750], [1074, 756]], face: 1 }, 'bed-2': { points: [[1108, 744], [1124, 750], [1142, 756]], face: -1 } },
  woodpile: { x: 1050, y: 524 } };
export const GUARD = { points: [[962, 512], [930, 522], [880, 512], [820, 480], [782, 452], [748, 428], [706, 430]] };

export function createRoutes(waterPoints = WATER_POINTS) {
  const routes = { water: pathTool(waterPoints), herb: pathTool(HERB.points) };
  const seats = { hero: pathTool(SEATS.hero.points), cousin: pathTool(SEATS.cousin.points) };
  const funs = { hero: pathTool(FUN.hero.points), cousin: pathTool(FUN.cousin.points) };
  // SG-LIFE-02：休閒點 → 院中端點 → 招呼站位（u=0 休閒點、u=1 站位；院中端點在 meetHome[id]）。
  const meets = Object.fromEntries(['hero', 'cousin'].map((id) => [id, pathTool([...FUN[id].points].reverse().concat(MEET[id].points.slice(1)))]));
  const meetHome = Object.fromEntries(['hero', 'cousin'].map((id) => [id, pathTool(FUN[id].points).length]));
  function meetPlace(id, l) {
    const r = meets[id], p = r.at(Math.max(0, Math.min(1, l.u)));
    const back = l.b < l.a;
    const face = l.mode === 'meet' ? MEET[id].face : (back ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: l.mode, travelled: l.mode === 'meet' ? 0 : Math.abs(l.u - l.a) * r.length };
  }
  const trains = Object.fromEntries(['hero', 'cousin'].map((id) => [id, pathTool(TRAIN_POSTS[id].points)]));
  function trainPlace(id, l) {
    const r = trains[id], p = r.at(Math.max(0, Math.min(1, l.u)));
    const face = l.mode === 'train' ? TRAIN_POSTS[id].face : (l.b < l.a ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: l.mode, travelled: l.mode === 'train' ? 0 : Math.abs(l.u - l.a) * r.length };
  }
  routes.wood = pathTool(WOOD_PATH.points);
  const sitePath = pathTool(DORM.points);
  const beds = Object.fromEntries(Object.entries(DORM.beds).map(([id, b]) => [id, pathTool(DORM.points.concat(b.points.slice(1)))]));
  // 工地往返：u=0 院中端點、u=1 工地門口；施工時面向工地。
  function sitePlace(l) {
    const p = sitePath.at(Math.max(0, Math.min(1, l.u)));
    const still = l.mode === 'build';
    const face = still ? DORM.face : (l.b < l.a ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: sitePath, geo: l.mode, travelled: still ? 0 : Math.abs(l.u - l.a) * sitePath.length };
  }
  // 去床／躺／起身：u=0 院中端點、u=1 床位；躺下面向床頭。
  function bedPlace(bed, mode, k) {
    const r = beds[bed], u = mode === 'toSeat' ? k : mode === 'back' ? 1 - k : 1, p = r.at(u);
    const face = mode === 'seated' ? DORM.beds[bed].face : (mode === 'back' ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: r, geo: mode === 'seated' ? 'lie' : mode, bed, travelled: mode === 'seated' ? 0 : k * r.length };
  }
  const teaPath = pathTool(TEA_SEAT.points);
  function teaPlace(l) {
    const p = teaPath.at(Math.max(0, Math.min(1, l.u)));
    const still = l.mode === 'brew' || l.mode === 'sip';
    const face = still ? TEA_SEAT.face : (l.b < l.a ? -p.dx : p.dx) >= 0 ? 1 : -1;
    return { x: p.x, y: p.y, face, route: teaPath, geo: l.mode, travelled: still ? 0 : Math.abs(l.u - l.a) * teaPath.length };
  }
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
    const onWood = WOOD_ALIAS[phase] || (!(phase in WATER) && !ALIAS[phase] && job === 'wood');
    const onHerb = !onWood && (ALIAS[phase] || (!(phase in WATER) && job === 'herb'));
    const route = routes[onWood ? 'wood' : onHerb ? 'herb' : 'water'];
    const geo = WOOD_ALIAS[phase] || ALIAS[phase] || phase;
    const at = route.place({ phase: geo, k });
    if (phase === 'herbGather') at.face = 1; // 藥圃在路底右側
    if (phase === 'herbDeliver') at.face = -1; // 藥架在左上
    if (phase === 'woodChop') at.face = -1; // 枯木在路底左側
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
    if (p.life02 && p.life02.leg) return meetPlace(id, { ...p.life02.leg, mode: p.mode });
    if (p.home02 && p.home02.leg) return sitePlace({ ...p.home02.leg, mode: p.mode });
    if (p.bed && (p.mode === 'toSeat' || p.mode === 'back')) return bedPlace(p.bed, p.mode, p.restLeg.k);
    if (p.bed && p.mode === 'seated') return bedPlace(p.bed, 'seated', 1);
    if (p.tea && p.tea.leg) return teaPlace({ ...p.tea.leg, mode: p.mode });
    if (p.train01 && p.train01.leg) return trainPlace(id, { ...p.train01.leg, mode: p.mode });
    if (p.patrolling) return { x: p.pos.x, y: p.pos.y, face: p.cface, route: null, geo: p.mode, travelled: p.walked }; // SG-PATROL-01：巡山同用模型 pos
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
    teaPath, teaPlace, teaLength: teaPath.length,
    sitePath, sitePlace, bedPlace, beds, woodLength: routes.wood.length, siteLength: sitePath.length, bedLengths: Object.fromEntries(Object.entries(beds).map(([id, r]) => [id, r.length])),
    trains, trainPlace, trainLengths: Object.fromEntries(['hero', 'cousin'].map((id) => [id, trains[id].length])),
    meets, meetPlace, meetLengths: Object.fromEntries(['hero', 'cousin'].map((id) => [id, { total: meets[id].length, home: meetHome[id] }])),
    drinks, drinkPlace, drinkLengths: { home: drinks.home.length, seat: { hero: drinks.hero.length, cousin: drinks.cousin.length } } };
}
const WATER = { down: 1, dip: 1, up: 1, pour: 1 };
