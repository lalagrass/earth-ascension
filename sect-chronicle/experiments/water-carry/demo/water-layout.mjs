// LP-13 長挑水路唯一權威佈局與幾何來源
// 包含世界延伸邊界（1600×1350）、長挑水路折線 points（單程約 1700 場景單位）、新泉眼掛點與圖層定義。
// 供模型耗時、畫面取樣、腳底對齊、相機視圖與測試同源使用。
import { pathTool } from '../template/animator.mjs';

export const WORLD_SIZE = Object.freeze({
  w: 1600,
  h: 1350,
  originalH: 900,
  extendedH: 450,
});

// 長挑水路：院中端點 (962, 512) → 院西南坡口 → 院南斜坡 → 竹林步道 → 溪岸平緩段 → 橫跨溪橋 → 溪南山坳 → 石階降坡 → 谷底深潭新泉眼 (352, 1245)
// 精確折線長度為 1700.9 場景單位，符合 LP13_HANDOFF.md 之 1650–1750 範圍。
export const WATER_POINTS = Object.freeze([
  [962, 512],   // 0: 院中端點（HOME / 水缸倒水點）
  [880, 545],   // 1: 院西南坡口
  [805, 595],   // 2: 院南斜坡
  [722, 642],   // 3: 竹林步道入口
  [630, 692],   // 4: 竹林北徑
  [552, 755],   // 5: 竹林曲徑
  [505, 832],   // 6: 竹林南彎
  [535, 910],   // 7: 穿出竹林斜坡（跨越舊世界南界 y=900）
  [630, 955],   // 8: 溪岸平緩段
  [742, 980],   // 9: 溪橋西引道
  [850, 1000],  // 10: 橫跨溪橋（木石溪橋中心）
  [922, 1040],  // 11: 溪南山坳
  [888, 1108],  // 12: 石階轉折處
  [795, 1158],  // 13: 石階降坡
  [682, 1198],  // 14: 泉澗石徑
  [560, 1228],  // 15: 谷底水濱
  [440, 1244],  // 16: 泉台近處
  [352, 1245],  // 17: 谷底新泉眼（取水掛點）
]);

export const WATER_PATH = Object.freeze({
  points: WATER_POINTS,
  top: 'dojo',
  bottom: 'spring',
});

export const WATER_TOOL = pathTool(WATER_POINTS);
export const WATER_LENGTH = Math.round(WATER_TOOL.length * 10) / 10; // 1700.9

// LP-13 新泉眼掛點（取代舊谷底泉池取水熱區；舊泉池保留純景觀、移除取水標記）
export const SPRING_PLACE = Object.freeze({
  label: '谷底泉眼',
  x: 352,
  y: 1245,
  rx: 76,
  ry: 30,
  sub: '谷底深潭 · LP-13 新取水點（原路約 1700 回院）',
});

// 長水路主要地標節點（供鏡頭定位、場景渲染與測試核對）
export const WATER_LANDMARKS = Object.freeze({
  home: { label: '道館院中', pointIndex: 0, x: 962, y: 512 },
  bambooEntrance: { label: '竹林入口', pointIndex: 3, x: 722, y: 642 },
  bambooCurve: { label: '竹林南彎', pointIndex: 6, x: 505, y: 832 },
  bridge: { label: '溪橋', pointIndex: 10, x: 850, y: 1000 },
  stoneSteps: { label: '石階', pointIndex: 12, x: 888, y: 1108 },
  spring: { label: '谷底泉眼', pointIndex: 17, x: 352, y: 1245 },
});
