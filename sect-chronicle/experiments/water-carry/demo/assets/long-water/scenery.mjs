// LP-13 長挑水路：溪流河道與溪橋橋面幾何（D37 起只留幾何，畫面在 demo/scene/）

// 匯出溪流與橋面幾何，供驗收測試與除錯同源驗證
export const STREAM_POLY = Object.freeze([
  [825, 870],
  [875, 870],
  [875, 960],
  [885, 1005],
  [875, 1045],
  [830, 1080],
  [760, 1100],
  [690, 1120],
  [680, 1070],
  [750, 1050],
  [815, 1030],
  [815, 1000],
  [820, 960],
]);

export const BRIDGE_DECK_POLY = Object.freeze([
  [775, 970],
  [925, 1022],
  [925, 1058],
  [775, 1006],
]);

// D37（#184）：舊 Graphics 建構器 buildLongWaterScenery 已由 demo/scene/watercolor.mjs（烘焙地面＋手繪件）取代並移除；
// 上面兩份幾何仍是溪流河道與橋面的權威對齊來源（checks/water13 與 D37 烘焙同源讀取）。
