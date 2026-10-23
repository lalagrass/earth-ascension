// LP-13 長挑水路南段場景渲染建構模組（PixiJS 原創幾何與分層）
// 涵蓋 1600×1350 延伸地面、長水路路面步石、竹林、溪流溪橋前後遮擋與谷底深潭新泉眼。
import { Graphics, Container } from '../vendor/pixi.min.mjs';
import { WATER_POINTS, WORLD_SIZE } from '../water-layout.mjs';

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

  // 3. 溪流與溪橋 (點 9 ~ 點 11 附近)
  // 溪流河床與水體 (畫在 ground)
  const stream = new Graphics();
  stream.poly([
    620, 910,
    760, 950,
    880, 990,
    1020, 1040,
    1180, 1090,
    1150, 1140,
    980, 1080,
    840, 1030,
    710, 990,
    580, 950,
  ]).fill({ color: 0x487994, alpha: 0.88 });

  // 溪流波紋
  for (const [wx, wy, l] of [[680, 940, 40], [780, 975, 45], [920, 1020, 50], [1060, 1070, 42]]) {
    stream.ellipse(wx, wy, l, 3).fill({ color: 0x7eb5cc, alpha: 0.55 });
  }
  // 溪岸鵝卵石
  for (const [rx, ry, s] of [[650, 925, 8], [740, 960, 10], [950, 1050, 9], [1120, 1110, 11]]) {
    stream.ellipse(rx, ry, s, s * 0.65).fill(0x5c564c);
  }
  ground.addChild(stream);

  // 橫跨溪橋：木石溪橋 (位於點 10: 850, 1000 橫跨溪流)
  // 橋面主結構 (sorted，zIndex = 998)
  const bridgeDeck = new Graphics();
  bridgeDeck.poly([790, 982, 910, 1018, 910, 1038, 790, 1002]).fill(0x94724e).stroke({ width: 2, color: 0x644c32 });
  for (let b = 0; b < 7; b++) {
    const u = b / 6;
    const px = 795 + (905 - 795) * u, py = 985 + (1020 - 985) * u;
    bridgeDeck.poly([px - 2, py, px + 2, py + 18]).stroke({ width: 1.5, color: 0x6e5034 });
  }
  bridgeDeck.zIndex = 998;
  sorted.addChild(bridgeDeck);

  // 橋身後欄杆 (zIndex = 980，人物在橋上時人物遮擋後欄杆)
  const backRailing = new Graphics();
  backRailing.poly([790, 980, 910, 1016]).stroke({ width: 3.5, color: 0x6a4e34, cap: 'round' });
  backRailing.poly([790, 972, 910, 1008]).stroke({ width: 2.5, color: 0x7a5a3c, cap: 'round' });
  for (let p = 0; p < 5; p++) {
    const u = p / 4;
    const rx = 794 + (906 - 794) * u, ry = 974 + (1010 - 974) * u;
    backRailing.poly([rx, ry - 8, rx, ry + 10]).stroke({ width: 3.5, color: 0x543c26 });
  }
  backRailing.zIndex = 980;
  sorted.addChild(backRailing);

  // 橋面前欄杆 (zIndex = 1015，人物在橋上時前欄杆遮擋人物腿部，形成真深度)
  const frontRailing = new Graphics();
  frontRailing.poly([790, 1004, 910, 1040]).stroke({ width: 3.5, color: 0x7a5a3c, cap: 'round' });
  frontRailing.poly([790, 996, 910, 1032]).stroke({ width: 2.5, color: 0x8a6644, cap: 'round' });
  for (let p = 0; p < 5; p++) {
    const u = p / 4;
    const rx = 794 + (906 - 794) * u, ry = 998 + (1034 - 998) * u;
    frontRailing.poly([rx, ry - 8, rx, ry + 12]).stroke({ width: 3.5, color: 0x543c26 });
  }
  frontRailing.zIndex = 1015;
  sorted.addChild(frontRailing);

  // 4. 竹林步道林木群 (點 3 到 點 7 周圍，x: 480–740, y: 640–920)
  // 分批置入 sorted，以 y 軸動態排序，實現人物穿梭竹林時的真遮擋
  const bambooPositions = [
    [700, 630], [745, 660], [615, 675], [660, 710],
    [530, 735], [585, 770], [475, 810], [530, 850],
    [485, 890], [550, 920], [600, 935]
  ];
  for (const [bx, by] of bambooPositions) {
    const b = new Graphics();
    // 陰影
    b.ellipse(0, 0, 18, 5).fill({ color: 0x545238, alpha: 0.28 });
    // 竹竿主幹 (修長微斜)
    const lean = ((bx * 3) % 7) - 3;
    b.poly([lean - 3, -110, 0, 0]).stroke({ width: 5, color: 0x55803a, cap: 'round' });
    b.poly([lean - 3, -110, 0, 0]).stroke({ width: 3, color: 0x6e9e4c, cap: 'round' });
    // 竹節
    for (let j = 1; j <= 4; j++) {
      const jy = -j * 24, jx = (lean - 3) * (1 - j / 4.5);
      b.ellipse(jx, jy, 4.5, 1.6).fill(0x354e22);
    }
    // 竹葉群
    for (const [lx, ly, rx, ry, ang] of [[-10, -90, 12, 4, -0.4], [8, -85, 13, 4, 0.3], [-14, -65, 11, 3.5, -0.5], [10, -60, 12, 4, 0.4]]) {
      b.ellipse(lx, ly, rx, ry).fill(0x629244);
    }
    b.position.set(bx, by);
    b.zIndex = by;
    sorted.addChild(b);
  }

  // 5. 谷底深潭與新泉眼 (點 17 取水點：352, 1245)
  // 泉池 (畫在 ground)
  const pool = new Graphics();
  // 潭底深水與清潭
  pool.ellipse(320, 1245, 120, 55).fill({ color: 0x1f4c5e, alpha: 0.95 });
  pool.ellipse(320, 1245, 108, 48).fill({ color: 0x367a92, alpha: 0.9 });
  // 水面波光與漣漪
  pool.ellipse(310, 1240, 68, 24).stroke({ width: 2, color: 0x6dc0d6, alpha: 0.65 });
  pool.ellipse(305, 1238, 40, 14).stroke({ width: 1.5, color: 0x98e0f0, alpha: 0.75 });
  pool.circle(302, 1236, 4).fill({ color: 0xd2f5fc, alpha: 0.85 });
  ground.addChild(pool);

  // 泉潭周圍青苔石岩 (sorted)
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
    rock.ellipse(-rw * 0.2, -rh * 0.3, rw * 0.6, rh * 0.4).fill({ color: 0x6e804a, alpha: 0.4 }); // 青苔
    rock.position.set(rx, ry);
    rock.zIndex = ry;
    sorted.addChild(rock);
  }

  // 取水青石台 (人站在 (352, 1245) 處面西取水)
  const dippingPlatform = new Graphics();
  dippingPlatform.ellipse(0, 0, 34, 16).fill(0x72756a).stroke({ width: 2, color: 0x4c4e46 });
  dippingPlatform.ellipse(0, -3, 28, 12).fill(0x84887c);
  // 石台防滑鑿痕
  dippingPlatform.poly([-12, -4, 12, -4]).stroke({ width: 1.2, color: 0x5a5c54 });
  dippingPlatform.poly([-10, 0, 10, 0]).stroke({ width: 1.2, color: 0x5a5c54 });
  dippingPlatform.position.set(352, 1245);
  dippingPlatform.zIndex = 1245;
  sorted.addChild(dippingPlatform);
}
