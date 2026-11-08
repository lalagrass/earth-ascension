// 第二十六輪 #488：地圖俯視座標與山崖高度共用公尺。
// R1 量測／推導：既有近戰滑步 24 px 按約 0.6 m 的一小步解讀，
// 所以 1 px = 0.025 m；原有 55 px/s 腳程就是 1.375 m/s 的步行。
export const METERS_PER_PIXEL = 0.025;
// R1 量測：約一丈三公尺；崖高原本以整丈敘述，故只取整公尺近似。
export const METERS_PER_ZHANG = 3;
export const pixelsToMeters = pixels => pixels * METERS_PER_PIXEL;
export const zhangToMeters = zhang => zhang * METERS_PER_ZHANG;
export const speedMetersPerSecond = pixelsPerSecond => pixelsToMeters(pixelsPerSecond);
export const waterfallTrainingLoad = (fallZhang, referenceZhang) =>
  Math.sqrt(zhangToMeters(fallZhang) / zhangToMeters(referenceZhang));

// 成長與年歲共用 28 日壓縮年；生理需求仍依遊戲的一日結算。
export const DAYS_PER_YEAR = 28;
// R1 量測：陽曆平均年長，將現實訓練適應日數換算為遊戲中的成長年。
export const REAL_DAYS_PER_YEAR = 365.2425;
export const growthDaysFromRealDays = days => days * DAYS_PER_YEAR / REAL_DAYS_PER_YEAR;
