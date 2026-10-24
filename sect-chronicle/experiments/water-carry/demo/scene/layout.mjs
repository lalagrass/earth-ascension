// D37（#184）全場水彩統一 → SCENE-03（#182／D41）新山居同圖落地：純視覺佈局資料。只放「畫什麼、畫在哪、多大」；
// 權威路線／端點／世界尺寸一律從 water-layout.mjs、routes.mjs、palm.mjs 讀，這裡不另存第二份、不入存檔、不碰模型時鐘。
// 單位＝世界座標（1600×1350）；sprite 以底邊中心落地，h＝顯示高（w 依原圖比例），z 省略時＝腳底 y。
// fade：人物腳底在該物件「後方」且被它蓋住時，物件淡到 fade 透明度（只是畫面，不影響任何判定）。
import { WORLD_SIZE } from '../water-layout.mjs';

export const WORLD = WORLD_SIZE;
export const BAKE_SCALE = 2; // 地面底圖以 2× 烘焙（3200×2700）

// 院坪（石板）與院牆／門：院子只在主屋前一片，不壓到清理區與防守點。
export const YARD_POLY = Object.freeze([[872, 452], [1010, 432], [1100, 470], [1400, 470], [1520, 436], [1566, 520], [1552, 588], [1100, 590], [1010, 578], [912, 566], [880, 540]]);
// 溪流純視覺延伸（都不碰水路、不改 STREAM_POLY 權威段）：
// SCENE-03 上游：院南坡下的林谷山壁泉口（SPRING_MOUTH）出水→濕痕匯流→沿坡下切成溪，接上權威溪段頂（825–875,870），不再是孤石接截平河。
export const SPRING_MOUTH = Object.freeze({ x: 992, y: 752 });
export const STREAM_UP = Object.freeze([[984, 744], [946, 760], [904, 782], [862, 806], [836, 836], [825, 872], [875, 872], [884, 830], [912, 806], [954, 784], [994, 764]]);
// 下游：深潭西緣溢出，經一道石階小瀑往西出圖（純景觀；潭與取水端點不動）。
export const STREAM_OUT = Object.freeze([[206, 1240], [150, 1258], [90, 1276], [-30, 1286], [-30, 1322], [92, 1308], [154, 1290], [210, 1266]]);
// 西坡巡山踩出的淡徑：只讀 patrol-layout.mjs 的 LEAD／MAIN 烘進地面（不另存坐標）。
export const STREAM_DOWN = Object.freeze([[690, 1120], [680, 1070], [600, 1098], [500, 1118], [400, 1132], [306, 1156], [262, 1200], [282, 1214], [318, 1180], [404, 1150], [504, 1136], [604, 1118]]);
// 谷底深潭（純景觀水面；取水端點 SPRING_PLACE 在潭東緣的石台上）
export const POOL = Object.freeze({ x: 286, y: 1250, rx: 92, ry: 44 });
export const OLD_POND = Object.freeze({ x: 318, y: 716, rx: 64, ry: 24 }); // LP 舊泉池：只留景觀小水窪
// 林地鋪面（竹林與西林緣、南坡林下）
export const FOREST = Object.freeze([
  [[760, 600], [700, 590], [600, 620], [490, 690], [430, 800], [430, 900], [500, 960], [610, 960], [640, 900], [600, 820], [660, 730], [780, 660]],
  [[0, 330], [260, 340], [300, 400], [240, 480], [300, 560], [160, 600], [0, 590]],
  [[960, 1150], [1150, 1080], [1400, 1060], [1600, 1080], [1600, 1350], [940, 1350], [880, 1260]],
]);
// 石坡／崖面（暖灰石紋，水洗淡入）
export const ROCKY = Object.freeze([
  [[930, 1060], [990, 1080], [960, 1150], [860, 1200], [760, 1220], [700, 1180], [800, 1130], [880, 1090]],
  [[0, 1060], [200, 1040], [420, 1070], [600, 1060], [640, 1100], [400, 1110], [200, 1110], [0, 1130]],
]);
// 坡度明暗：[x, y, rx, ry, 明(+)/暗(-) 強度]
export const WASHES = Object.freeze([
  [1200, 640, 420, 90, -0.10], [700, 560, 300, 80, 0.06], [300, 740, 360, 120, -0.06], [1250, 900, 500, 140, -0.08],
  [700, 1010, 380, 90, -0.12], [1100, 1180, 500, 140, -0.14], [300, 1260, 360, 110, -0.16], [1300, 470, 360, 60, 0.07],
]);
// 院門外的一小段土路（純景觀）
export const DECOR_PATHS = Object.freeze({
  gate: [[1236, 592], [1238, 636], [1240, 676]], // 院門出來接上採藥小路
  // SCENE-03 預留地村路（純景觀，不是可走工作路）：採藥路分岔到預留宿舍地與坡下工坊棚地
  dorm: [[1160, 640], [1130, 680], [1108, 716]],
  shed: [[1240, 676], [1262, 760], [1280, 850], [1292, 930]],
});

const T = (id, x, y, h, extra = {}) => ({ id, x, y, h, ...extra });
// 依原圖取用（art184-production＝D35 素材；art184-watercolor＝本輪補畫）
export const PROPS = Object.freeze([
  // 院落：正堂、側屋、院牆、院門、功能物
  T('dojo_side_house', 1450, 420, 150),
  T('dojo_main_hall', 1236, 476, 290),
  T('court_wall', 1150, 590, 50), T('court_wall', 1322, 590, 50), T('court_wall', 1414, 590, 50), T('court_wall', 1506, 586, 50),
  T('dojo_gate', 1236, 594, 96),
  T('stone_mill', 1410, 548, 46),
  T('woodpile', 1534, 492, 52),
  T('stone_bench', 968, 424, 32, { w: 104, z: 416 }),
  // 松竹樹石：院北與屋後
  T('pine_b', 985, 384, 170, { fade: 0.45 }),
  T('pine_a', 1540, 474, 190, { fade: 0.45 }),
  T('pine_a', 1585, 336, 150, { flip: true }),
  T('bamboo_clump', 1046, 300, 170), T('bamboo_clump', 1420, 270, 150, { flip: true }),
  T('broadleaf_tree', 880, 330, 150),
  // 西坡、觀景石、林緣（野豬從這裡出來）
  T('boulder_m', 752, 458, 30, { w: 60 }),
  T('broadleaf_tree', 120, 412, 170), T('pine_b', 228, 404, 150), T('broadleaf_tree', 40, 470, 140, { flip: true }),
  T('shrub_fern', 186, 470, 36), T('shrub_fern', 92, 520, 44, { flip: true }), T('bamboo_clump', 300, 380, 140, { flip: true }),
  T('pine_a', 420, 360, 140), T('wild_grass', 560, 470, 22), T('boulder_s', 470, 470, 20),
  // 舊泉池邊
  T('boulder_m', 338, 712, 26), T('fern', 262, 720, 26), T('wild_grass', 340, 740, 20),
  // 院南坡與採藥小路
  T('shrub_fern', 1030, 612, 32), T('wild_grass', 1180, 612, 20), T('boulder_s', 1290, 650, 20),
  T('broadleaf_tree', 1580, 690, 160, { fade: 0.45 }), T('pine_b', 1160, 790, 140, { fade: 0.45 }), T('shrub_fern', 1230, 820, 40),
  T('wild_grass', 1300, 760, 20), T('boulder_m', 978, 668, 30),
  // 藥圃與晾架（晾架純景觀；交藥藥架仍是 LP-16 動態份數）
  T('herb_rack', 1556, 826, 74),
  T('drying_rack', 1336, 838, 42, { fade: 0.5 }), T('drying_rack', 1430, 884, 42, { flip: true, fade: 0.5 }),
  // SCENE-03 泉口山壁（崖坡支撐、出水口在左下）與濕岸植被
  T('spring_cliff', 982, 772, 118, { fade: 0.55 }), T('fern', 968, 778, 22), T('shrub_fern', 1030, 776, 34),
  // SCENE-03 預留地（只是景觀與用地，不可點、不宣稱可用）：新宿舍、工坊／食堂棚
  T('dorm_reserved', 1104, 722, 92, { fade: 0.45 }),
  T('shed_reserved', 1300, 944, 80, { fade: 0.45 }),
  // SCENE-03 西坡巡山段：路標木樁（S1–S3 旁，不擋路）、石坳岩台、林緣
  T('trail_marker', 492, 668, 26), T('trail_marker', 340, 734, 26, { flip: true }), T('trail_marker', 176, 486, 26),
  T('rock_ledge', 408, 806, 30), T('rock_ledge', 238, 812, 26, { flip: true }), T('boulder_m', 300, 660, 24),
  T('shrub_fern', 260, 700, 30), T('wild_grass', 200, 760, 20), T('fern', 120, 600, 24), T('pine_b', 66, 640, 150, { fade: 0.45 }),
  // 竹林（沿用 LP-13 竹叢落點；原 550,920／600,935 兩叢根部壓在水路上，南移避路）
  ...[[700, 630], [745, 660], [615, 675], [660, 710], [530, 735], [585, 770], [475, 810], [530, 850], [485, 890], [530, 958], [598, 992]]
    .map(([x, y]) => T('bamboo_clump', x, y, 170, { flip: !!((x * 3) % 2), fade: 0.5, sway: true })),
  T('pine_a', 440, 940, 180, { fade: 0.45 }), T('fern', 640, 760, 26), T('fern', 470, 760, 24),
  // 溪岸與溪橋
  T('boulder_s', 812, 852, 20), T('fern', 896, 858, 24), T('reeds', 846, 806, 22), T('reeds', 930, 812, 20, { flip: true }),
  T('boulder_m', 905, 960, 28), T('boulder_s', 790, 1060, 20), T('fern', 740, 1110, 22), T('shrub_fern', 960, 990, 34),
  T('wild_grass', 1010, 1030, 20), T('broadleaf_tree', 1130, 1000, 170, { fade: 0.45 }),
  // 南坡、石階、谷底
  T('pine_a', 1240, 1150, 210), T('pine_b', 1440, 1110, 170), T('pine_a', 1560, 1260, 220, { flip: true }), T('bamboo_clump', 1350, 1300, 160),
  T('broadleaf_tree', 1020, 1270, 170, { fade: 0.45 }), T('boulder_l', 960, 1140, 40, { w: 76 }), T('boulder_m', 720, 1240, 26),
  T('shrub_fern', 610, 1280, 40), T('wild_grass', 520, 1270, 20),
  T('boulder_l', 205, 1222, 46, { w: 90 }), T('boulder_m', 250, 1300, 32), T('fern', 380, 1290, 26), T('boulder_s', 410, 1214, 18),
  T('bamboo_clump', 120, 1210, 170), T('reeds', 96, 1268, 22), T('reeds', 236, 1282, 20, { flip: true }), T('pine_b', 150, 1050, 160),
  T('wild_grass', 820, 1260, 20), T('boulder_s', 640, 1170, 18),
  // SCENE-03 下游出圖小瀑
  T('cascade', 128, 1310, 34, { w: 64 }),
]);
// 地面貼片（畫在地面層、人物腳下；不參與排序）
export const DECALS = Object.freeze([
  T('herb_bed', 1462, 806, 70, { w: 160 }), T('herb_bed', 1530, 758, 56, { w: 120 }),
  T('creek_bank', 900, 930, 40, { w: 70 }), T('creek_bank', 700, 1136, 36, { w: 64, flip: true }),
  // SCENE-03：取水石台（人站在上面、桶落潭邊）、西坡踏石
  T('intake_platform', 378, 1268, 40, { w: 70 }),
  T('step_stones', 444, 676, 18, { w: 32 }), T('step_stones', 318, 772, 16, { w: 28, flip: true }),
]);
// 溪橋：橋身一張圖，前／後欄沿用 LP-13 的前後層位（後欄 972、橋面 998、前欄 1060）
export const BRIDGE = Object.freeze({ deck: [[775, 970], [925, 1022], [925, 1058], [775, 1006]], back: 972, deckZ: 998, front: 1060 });
// 師父／師兄（固定 NPC 位置沿用 scene.json）
export const NPCS = Object.freeze([
  { id: 'master', img: 'master_meditate', x: 1300, y: 512, h: 56 },
  { id: 'senior', img: 'senior_sweep', x: 1120, y: 528, h: 88 },
]);
// 地標快看（只動鏡頭、不推進世界）
export const VIEWS = Object.freeze({
  overview: { label: '總覽', x: 800, y: 675, zoom: 'fit' },
  yard: { label: '院落', x: 1150, y: 470, zoom: 1.3 },
  west: { label: '西坡', x: 640, y: 460, zoom: 1.5 },
  herb: { label: '藥圃', x: 1360, y: 740, zoom: 1.3 },
  road: { label: '長路', x: 640, y: 800, zoom: 0.9 },
  source: { label: '泉口', x: 930, y: 800, zoom: 1.5 },
  bridge: { label: '溪橋', x: 850, y: 1010, zoom: 1.5 },
  spring: { label: '泉眼', x: 400, y: 1225, zoom: 1.4 },
});
