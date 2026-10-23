// LP-13 長挑水路南段場景渲染建構模組（PixiJS 原創幾何與分層）
// 涵蓋 1600×1350 延伸地面、長水路路面步石、竹林、溪流溪橋前後遮擋與谷底深潭新泉眼。
import { Graphics, Container } from '../../vendor/pixi.min.mjs';
import { WATER_POINTS, WORLD_SIZE } from '../../water-layout.mjs';

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

export function buildLongWaterScenery({ world, ground, sorted }) {
  // 1. 南段延伸地面底層 (y: 880 至 1350)
  const terrain = new Graphics();
  // 底色：山林草坡綠 (#98a870 與 #8c9c64 交替)
  terrain.rect(0, WORLD_SIZE.originalH - 20, WORLD_SIZE.w, WORLD_SIZE.extendedH + 20)
    .fill(0x94a46c);

  // 接縫自然草紋與過渡帶 (y: 880–920)
  for (let x = 0; x < WORLD_SIZE.w; x += 32) {
    const h = 14 + ((x * 7) % 18);
    terrain.poly([x, WORLD_SIZE.originalH - 10, x + 16, WORLD_SIZE.originalH - 10 - h, x + 32, WORLD_SIZE.originalH - 10])
      .fill({ color: 0x889860, alpha: 0.65 });
  }

  // 南部山崖石壁與深谷層次 (y: 1040–1350)
  terrain.poly([0, 1080, 240, 1060, 480, 1090, 720, 1050, 980, 1100, 1280, 1070, 1600, 1110, 1600, 1350, 0, 1350])
    .fill({ color: 0x82905e, alpha: 0.45 });

  // 谷底深潭周圍深色基底 (左下角區域)
  terrain.ellipse(360, 1250, 220, 95).fill({ color: 0x6e784e, alpha: 0.5 });

  world.addChildAt(terrain, 1); // 緊接在舊背景 bg 之後、ground 之前

  // 2. 長挑水路路面步道 (畫在 ground 層，人物踩在上方)
  const flatPts = WATER_POINTS.flat();
  // 外緣泥土拓寬
  ground.poly(flatPts, false).stroke({ width: 22, color: 0xb59e6c, join: 'round', cap: 'round' });
  // 內層常走實土
  ground.poly(flatPts, false).stroke({ width: 15, color: 0xd4c294, join: 'round', cap: 'round' });
  // 中心踏跡
  ground.poly(flatPts, false).stroke({ width: 9, color: 0xe6d6aa, join: 'round', cap: 'round' });

  // 坡段石階 (防滑鋪石)：
  // 院南斜坡段 (點 1 到 點 3)
  for (let i = 1; i <= 3; i++) {
    const [x, y] = WATER_POINTS[i];
    ground.ellipse(x, y, 14, 6).fill(0x8a8474).stroke({ width: 1.5, color: 0x686456 });
  }
  // 石階降坡段 (點 12 到 點 14，山崖石階鑿石階梯)
  for (let k = 0; k < 12; k++) {
    const u = k / 12;
    const [x1, y1] = WATER_POINTS[12], [x2, y2] = WATER_POINTS[14];
    const sx = x1 + (x2 - x1) * u, sy = y1 + (y2 - y1) * u;
    ground.roundRect(sx - 12, sy - 4, 24, 7, 2).fill(0x767468).stroke({ width: 1.2, color: 0x545248 });
  }

  // 3. 溪流與溪橋 (嚴格對齊水路：溪流穿過橋底，橋面完整覆蓋跨溪折線)
  // 溪流河床與水體 (畫在 ground)
  const stream = new Graphics();
  stream.poly(STREAM_POLY.flat()).fill({ color: 0x487994, alpha: 0.88 });

  // 溪流波紋
  for (const [wx, wy, l] of [[850, 910, 20], [845, 955, 24], [850, 1020, 26], [780, 1075, 30], [720, 1095, 25]]) {
    stream.ellipse(wx, wy, l, 2.8).fill({ color: 0x7eb5cc, alpha: 0.55 });
  }
  // 溪岸卵石
  for (const [rx, ry, s] of [[820, 915, 6], [880, 950, 7], [810, 1045, 8], [880, 1055, 7], [740, 1060, 9]]) {
    stream.ellipse(rx, ry, s, s * 0.65).fill(0x5c564c);
  }
  ground.addChild(stream);

  // 橫跨溪橋：木石溪橋 (位於點 9 與點 11 之間，跨越點 10: 850, 1000)
  // 橋墩石座 (ground，支撐橋身兩端與河床)
  const piers = new Graphics();
  piers.roundRect(805, 990, 16, 32, 3).fill(0x605e54).stroke({ width: 1.5, color: 0x44423a });
  piers.roundRect(875, 1015, 16, 32, 3).fill(0x605e54).stroke({ width: 1.5, color: 0x44423a });
  ground.addChild(piers);

  // 橋面主結構 (sorted，zIndex = 998，完整覆蓋跨水折線與兩端引道)
  // 幾何：左端 (775, 970)–(775, 1006)，右端 (925, 1022)–(925, 1058)
  const bridgeDeck = new Graphics();
  bridgeDeck.poly(BRIDGE_DECK_POLY.flat())
    .fill(0x94724e).stroke({ width: 2, color: 0x644c32 });
  // 橋面橫向防滑木條紋理
  for (let b = 0; b < 10; b++) {
    const u = b / 9;
    const px = 780 + (920 - 780) * u, py = 975 + (1027 - 975) * u;
    bridgeDeck.poly([px - 2, py, px + 2, py + 26]).stroke({ width: 1.5, color: 0x6e5034 });
  }
  bridgeDeck.zIndex = 998;
  sorted.addChild(bridgeDeck);

  // 橋身後欄杆 (zIndex = 972，人物在橋上時人物遮擋後欄杆)
  const backRailing = new Graphics();
  backRailing.poly([775, 968, 925, 1020]).stroke({ width: 3.5, color: 0x6a4e34, cap: 'round' });
  backRailing.poly([775, 960, 925, 1012]).stroke({ width: 2.5, color: 0x7a5a3c, cap: 'round' });
  for (let p = 0; p < 6; p++) {
    const u = p / 5;
    const rx = 780 + (920 - 780) * u, ry = 962 + (1014 - 962) * u;
    backRailing.poly([rx, ry - 8, rx, ry + 12]).stroke({ width: 3.5, color: 0x543c26 });
  }
  backRailing.zIndex = 972;
  sorted.addChild(backRailing);

  // 橋面前欄杆 (zIndex = 1060，人物在橋上時前欄杆遮擋人物腿部，形成真深度)
  const frontRailing = new Graphics();
  frontRailing.poly([775, 1004, 925, 1056]).stroke({ width: 3.5, color: 0x7a5a3c, cap: 'round' });
  frontRailing.poly([775, 996, 925, 1048]).stroke({ width: 2.5, color: 0x8a6644, cap: 'round' });
  for (let p = 0; p < 6; p++) {
    const u = p / 5;
    const rx = 780 + (920 - 780) * u, ry = 998 + (1050 - 998) * u;
    frontRailing.poly([rx, ry - 8, rx, ry + 14]).stroke({ width: 3.5, color: 0x543c26 });
  }
  frontRailing.zIndex = 1060;
  sorted.addChild(frontRailing);

  // 4. 竹林步道林木群 (點 3 到 點 7 周圍，x: 480–740, y: 640–920)
  const bambooPositions = [
    [700, 630], [745, 660], [615, 675], [660, 710],
    [530, 735], [585, 770], [475, 810], [530, 850],
    [485, 890], [550, 920], [600, 935]
  ];
  for (const [bx, by] of bambooPositions) {
    const b = new Graphics();
    b.ellipse(0, 0, 18, 5).fill({ color: 0x545238, alpha: 0.28 });
    const lean = ((bx * 3) % 7) - 3;
    b.poly([lean - 3, -110, 0, 0]).stroke({ width: 5, color: 0x55803a, cap: 'round' });
    b.poly([lean - 3, -110, 0, 0]).stroke({ width: 3, color: 0x6e9e4c, cap: 'round' });
    for (let j = 1; j <= 4; j++) {
      const jy = -j * 24, jx = (lean - 3) * (1 - j / 4.5);
      b.ellipse(jx, jy, 4.5, 1.6).fill(0x354e22);
    }
    for (const [lx, ly, rx, ry] of [[-10, -90, 12, 4], [8, -85, 13, 4], [-14, -65, 11, 3.5], [10, -60, 12, 4]]) {
      b.ellipse(lx, ly, rx, ry).fill(0x629244);
    }
    b.position.set(bx, by);
    b.zIndex = by;
    sorted.addChild(b);
  }

  // 5. 谷底深潭與新泉眼 (點 17 取水點：352, 1245)
  const pool = new Graphics();
  pool.ellipse(320, 1245, 120, 55).fill({ color: 0x1f4c5e, alpha: 0.95 });
  pool.ellipse(320, 1245, 108, 48).fill({ color: 0x367a92, alpha: 0.9 });
  pool.ellipse(310, 1240, 68, 24).stroke({ width: 2, color: 0x6dc0d6, alpha: 0.65 });
  pool.ellipse(305, 1238, 40, 14).stroke({ width: 1.5, color: 0x98e0f0, alpha: 0.75 });
  pool.circle(302, 1236, 4).fill({ color: 0xd2f5fc, alpha: 0.85 });
  ground.addChild(pool);

  for (const [rx, ry, rw, rh, c] of [
    [210, 1225, 28, 18, 0x5a584c],
    [230, 1265, 34, 22, 0x4e4c40],
    [285, 1290, 42, 24, 0x545246],
    [380, 1290, 48, 25, 0x4a483e],
    [435, 1255, 36, 20, 0x58564a],
    [410, 1215, 32, 18, 0x525044],
    [320, 1195, 45, 18, 0x5a584c],
    [250, 1200, 32, 16, 0x4c4a40],
  ]) {
    const rock = new Graphics();
    rock.ellipse(0, 0, rw, rh).fill(c).stroke({ width: 1.5, color: 0x38362e });
    rock.ellipse(-rw * 0.2, -rh * 0.3, rw * 0.6, rh * 0.4).fill({ color: 0x6e804a, alpha: 0.4 });
    rock.position.set(rx, ry);
    rock.zIndex = ry;
    sorted.addChild(rock);
  }

  const dippingPlatform = new Graphics();
  dippingPlatform.ellipse(0, 0, 34, 16).fill(0x72756a).stroke({ width: 2, color: 0x4c4e46 });
  dippingPlatform.ellipse(0, -3, 28, 12).fill(0x84887c);
  dippingPlatform.poly([-12, -4, 12, -4]).stroke({ width: 1.2, color: 0x5a5c54 });
  dippingPlatform.poly([-10, 0, 10, 0]).stroke({ width: 1.2, color: 0x5a5c54 });
  dippingPlatform.position.set(352, 1245);
  dippingPlatform.zIndex = 1245;
  sorted.addChild(dippingPlatform);
}
