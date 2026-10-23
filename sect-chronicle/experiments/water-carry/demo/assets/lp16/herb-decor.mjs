// LP-16 採藥視覺整合：藥圃裝飾、兩層八份竹架、背簍與動作掛點模組
// 風格採用 Grok D32 暖灰石、木竹、苔綠土色色系；原創程序向量圖形，無第三方依賴。

/**
 * 繪製精修藥圃地景（土畦層次、18組藥草植株、精修竹籬、灌溉陶甕、靠放木鋤）
 * @param {import('../../vendor/pixi.min.mjs').Graphics} ground - 地面層 Graphics
 * @param {{ x: number, y: number }} patch - 藥圃中心坐標 (HERB.patch)
 * @param {number[][]} herbPoints - 採藥小路折線 (HERB.points)
 */
export function drawRefinedHerbPatch(ground, patch, herbPoints) {
  const pts = herbPoints.flat();
  // 1. 採藥小路（雙層自然泥土路面，邊緣柔和）
  ground.poly(pts, false).stroke({ width: 16, color: 0xbfa770, join: 'round', cap: 'round' });
  ground.poly(pts, false).stroke({ width: 12, color: 0xd6c292, join: 'round', cap: 'round' });
  ground.poly(pts, false).stroke({ width: 7, color: 0xe8d8ac, join: 'round', cap: 'round' });

  const { x, y } = patch;

  // 2. 藥圃台地深厚腐殖土基底（暖灰褐色卵石鑲邊＋深褐色腐殖土）
  ground.ellipse(x, y + 8, 78, 34).fill(0x52402c); // 深土底色
  ground.ellipse(x, y + 8, 76, 32).fill(0x765a3c).stroke({ width: 2.2, color: 0x443220 });

  // 藥圃下緣石塊包邊（暖灰石與苔蘚點綴，呼應 Grok 庭院砌石風格）
  const stones = [
    [-66, 18, 9, 5, 0x767468], [-44, 26, 12, 6, 0x828072],
    [-18, 31, 14, 6.5, 0x7a786c], [12, 32, 13, 6, 0x868478],
    [40, 27, 11, 5.5, 0x747266], [62, 19, 8, 4.5, 0x807e70]
  ];
  for (const [dx, dy, rx, ry, col] of stones) {
    ground.ellipse(x + dx, y + dy, rx, ry).fill(col).stroke({ width: 1, color: 0x48463c });
    // 微量苔綠
    ground.ellipse(x + dx - 2, y + dy - 1, rx * 0.5, ry * 0.5).fill({ color: 0x5a6e42, alpha: 0.6 });
  }

  // 3. 三道梯田式耕作土畦（深淺交疊溝壑）
  for (let r = 0; r < 3; r++) {
    const ry = y - 6 + r * 13;
    const rw = 62 - r * 5;
    // 溝陰影
    ground.ellipse(x, ry + 2, rw, 5.5).fill({ color: 0x3e2b1a, alpha: 0.65 });
    // 畦面隆起土色
    ground.ellipse(x, ry - 1, rw - 2, 4.2).fill(0x8a6c46);
  }

  // 4. 18組精修藥草植株（深綠、翠綠、嫩綠三層葉片，金黃與素白藥花草穗）
  for (let i = 0; i < 18; i++) {
    const r = i % 3;
    const c = Math.floor(i / 3);
    const tx = x - 52 + c * 20 + (r % 2) * 8;
    const ty = y - 7 + r * 13;

    // 根部小土包
    ground.ellipse(tx, ty + 1, 4.5, 2).fill({ color: 0x48321e, alpha: 0.6 });

    // 側生葉片（深綠與苔綠層次）
    ground.ellipse(tx - 4.5, ty - 4, 3, 6).fill(0x3e682e);
    ground.ellipse(tx + 4.5, ty - 4, 3, 6).fill(0x4a7a37);
    // 中心主葉（鮮活草藥綠）
    ground.ellipse(tx, ty - 7, 3.2, 7.5).fill(r === 1 ? 0x64a648 : 0x56923c);
    // 頂部草穗／藥花（黃藥花與嫩白草穗交錯）
    if (i % 2 === 0) {
      ground.circle(tx, ty - 13, 2).fill(0xebcf58).stroke({ width: 0.6, color: 0xb8982a });
    } else {
      ground.ellipse(tx, ty - 13, 1.8, 2.5).fill(0xf4ecd4).stroke({ width: 0.6, color: 0x9e987c });
    }
  }

  // 5. 東側竹籬（精修竹節、橫檔與綁繩）
  for (let i = 0; i < 7; i++) {
    const bx = x + 75 + (i % 2) * 2;
    const by = y - 24 + i * 8.5;
    // 豎直竹竿
    ground.rect(bx, by, 3.4, 13).fill(0xb8955a).stroke({ width: 0.8, color: 0x6e5228 });
    // 竹節凹槽
    ground.rect(bx, by + 4, 3.4, 1.2).fill(0x5c421e);
    ground.rect(bx, by + 9, 3.4, 1.2).fill(0x5c421e);
  }
  // 竹籬橫向綁竹
  ground.moveTo(x + 74, y - 18).lineTo(x + 77, y + 34).stroke({ width: 2, color: 0x9a7844 });
  ground.moveTo(x + 74, y - 10).lineTo(x + 77, y + 42).stroke({ width: 2, color: 0x8a6838 });

  // 6. 灌溉陶甕（置於藥圃西側邊緣 x: 1388, y: 778）
  // 陶甕陰影
  ground.ellipse(x - 52, y - 8, 8, 4).fill({ color: 0x3a2818, alpha: 0.55 });
  // 陶甕器身（紅陶暖土色，腹鼓口斂）
  ground.ellipse(x - 52, y - 14, 7.5, 8.5).fill(0x9e5238).stroke({ width: 1.2, color: 0x5e2a18 });
  // 甕頸與甕口
  ground.ellipse(x - 52, y - 21, 5, 2.2).fill(0xb86342).stroke({ width: 1, color: 0x4a1e10 });
  ground.ellipse(x - 52, y - 21.5, 3.8, 1.4).fill(0x32160c); // 甕內深暗水光
  ground.ellipse(x - 53, y - 16, 2.2, 5).fill({ color: 0xcc7b56, alpha: 0.45 }); // 高光

  // 7. 靠放木鋤（倚靠在竹籬邊 x: 1490, y: 804）
  // 鋤頭柄（木質長柄）
  ground.moveTo(x + 52, y + 18).lineTo(x + 46, y - 6).stroke({ width: 2.2, color: 0x82643c });
  // 鋤刃接環（暗鐵青銅色）
  ground.rect(x + 51, y + 16, 3, 2).fill(0x44464c);
  // 鋤刃（微扁弧形入地刃口）
  ground.poly([x + 51, y + 18, x + 56, y + 21, x + 53, y + 23, x + 49, y + 19]).fill(0x565a62).stroke({ width: 0.8, color: 0x2e3034 });
}

/**
 * 繪製精修兩層八份竹藥架（竹柱榫接、斜撐、雙層編織竹篩、清晰獨立藥草束）
 * @param {import('../../vendor/pixi.min.mjs').Graphics} rack - 藥架 Graphics
 * @param {number} n - 當前草藥束數量 (0～8)
 */
export function drawRefinedRack(rack, n) {
  rack.clear();

  // 1. 地面投影
  rack.ellipse(0, 1, 28, 6).fill({ color: 0x362818, alpha: 0.4 });

  // 2. 主木架結構（左右兩根粗竹柱，帶竹節與頂端封口）
  for (const bx of [-26, 23]) {
    rack.roundRect(bx, -42, 3.8, 42, 1).fill(0x9a7544).stroke({ width: 1, color: 0x5a3e1e });
    // 竹節刻劃
    for (const j of [-33, -21, -9]) {
      rack.rect(bx, j, 3.8, 1.2).fill(0x4a3216);
    }
  }
  // 人字斜撐加固（柱底向中心支撐）
  rack.moveTo(-24, -10).lineTo(-10, -2).stroke({ width: 1.6, color: 0x6e502a });
  rack.moveTo(23, -10).lineTo(9, -2).stroke({ width: 1.6, color: 0x6e502a });

  // 3. 兩層大竹篩（上層 sy: -36，下層 sy: -18）
  for (const sy of [-36, -18]) {
    // 竹篩底部托木
    rack.rect(-25, sy + 3, 50, 2.4).fill(0x6e4e2a);

    // 竹篩主圓盤（暖黃竹編色）
    rack.ellipse(0, sy, 28, 6).fill(0xdac48e).stroke({ width: 1.5, color: 0x8a6a38 });
    // 竹篩內緣編織經緯線紋理
    rack.ellipse(0, sy, 25, 4.5).stroke({ width: 0.8, color: 0xbfa468, alpha: 0.8 });
    for (let wx = -18; wx <= 18; wx += 6) {
      rack.moveTo(wx, sy - 2.8).lineTo(wx, sy + 2.8).stroke({ width: 0.7, color: 0xb09252, alpha: 0.6 });
    }
  }

  // 4. 草藥束（最多 8 份：上層 4 份，下層 4 份）
  // 每份有深淺捆紮草葉與束腰綁帶，清晰可辨
  for (let i = 0; i < n; i++) {
    const row = i < 4 ? -36 : -18;
    const cx = -18 + (i % 4) * 12;

    // 草藥束底層暗葉
    rack.ellipse(cx, row - 3.2, 5.2, 3.2).fill(0x386626).stroke({ width: 0.6, color: 0x224214 });
    // 草藥束鮮亮主葉
    rack.ellipse(cx, row - 4.5, 4.2, 2.6).fill(0x56963c);
    // 束腰棕黃綁繩（藥農晾曬捆紮痕跡）
    rack.rect(cx - 1.2, row - 4.2, 2.4, 1.4).fill(0xd2b260);
    // 微小葉尖突出
    rack.ellipse(cx + 2.5, row - 5.5, 1.8, 1.2).fill(0x7ec652);
    rack.ellipse(cx - 2.5, row - 5.5, 1.8, 1.2).fill(0x427c2e);
  }
}

/**
 * 繪製精修背簍（竹編菱紋經緯、簍口竹圈、雙肩背帶、按 load 冒出的翠綠草藥）
 * 原點在簍底中央
 * @param {import('../../vendor/pixi.min.mjs').Graphics} g - 背簍 Graphics
 * @param {number} load - 負載比例 (0～1)
 */
export function drawRefinedBasket(g, load) {
  g.clear();

  // 1. 若有藥草（load > 0），在簍身背後與簍口繪製鮮活探出的藥草束
  if (load > 0) {
    const herbCount = Math.max(2, Math.round(load * 7));
    for (let i = 0; i < herbCount; i++) {
      const u = i / (herbCount - 1 || 1);
      const bx = -7.5 + u * 15;
      const leafH = (6 + 8 * load) * (0.85 + 0.3 * ((i % 3) * 0.5));
      const col = i % 2 === 0 ? 0x4a8434 : 0x62a842;
      // 挺拔葉片
      g.ellipse(bx, -21 - leafH * 0.45, 2.5, leafH * 0.55).fill(col).stroke({ width: 0.6, color: 0x2e5620 });
      // 嫩芽葉心
      g.ellipse(bx, -21 - leafH * 0.7, 1.4, leafH * 0.25).fill(0x84d458);
    }
  }

  // 2. 雙肩背帶（自然垂搭或跨肩）
  g.moveTo(-6, -18).lineTo(-4.5, -1).stroke({ width: 1.2, color: 0x5a3e20 });
  g.moveTo(6, -18).lineTo(4.5, -1).stroke({ width: 1.2, color: 0x5a3e20 });

  // 3. 背簍主體（上寬下斂圓筒梯形，竹編溫潤黃褐色）
  // 簍底: w=14, 簍頂: w=20, 高: 22
  g.poly([-10, -22, 10, -22, 7, 0, -7, 0]).fill(0xbfa060).stroke({ width: 1.4, color: 0x6e4e24 });

  // 4. 簍身精緻竹編紋理（多道橫向經緯篾條與暗紋）
  for (const y of [-16, -11, -6]) {
    const w = 7.5 + (y + 22) * 0.12;
    g.moveTo(-w, y).lineTo(w, y).stroke({ width: 1.1, color: 0x826232 });
    // 斜向竹編交錯刻痕
    for (let x = -w + 2; x < w - 1; x += 4) {
      g.moveTo(x, y - 2).lineTo(x + 2, y + 2).stroke({ width: 0.7, color: 0x9e7b42, alpha: 0.75 });
    }
  }

  // 5. 簍口厚竹圈口沿（加固邊框與深色內口）
  g.roundRect(-10.5, -23.5, 21, 3.2, 1).fill(0x946e3a).stroke({ width: 1, color: 0x5a3c1c });
  g.ellipse(0, -22.5, 9, 1.6).fill(0x422c16); // 簍內深邃陰影

  // 6. 簍底加固腳座
  g.roundRect(-7.5, -0.5, 15, 2, 0.8).fill(0x74522a);
}

/**
 * 依階段、人物朝向與進度計算背簍的場景座標、層級與草藥負載
 * @param {string} phName - 階段名 (herbOut, herbGather, herbBack, herbDeliver)
 * @param {number} px - 人物當前 x
 * @param {number} py - 人物當前 y
 * @param {number} face - 人物朝向 (1 右, -1 左)
 * @param {number} scale - 人物縮放 (hero: 1, cousin: 0.97)
 * @param {number} k - 當前階段進度 (0～1)
 * @returns {{ x: number, y: number, zIndex: number, load: number }}
 */
export function getRefinedBasketPlacement(phName, px, py, face, scale, k) {
  let load = 0;
  let x = px;
  let y = py;
  let zIndex = py - 0.03;

  if (phName === 'herbOut') {
    // 去程：空背簍背在身後（背對鏡頭內側，被身體微遮）
    x = px - face * 8 * scale;
    y = py - 19 * scale;
    zIndex = py - 0.03;
    load = 0;
  } else if (phName === 'herbBack') {
    // 負重回程：滿簍背於身後上方，清晰顯露
    x = px - face * 2 * scale;
    y = py - 20 * scale;
    zIndex = py + 0.03;
    load = 1;
  } else if (phName === 'herbGather') {
    // 採集與裝簍：簍具卸在身前腳邊 (-18, 0)，load 隨 k 累積（k < 0.5 採摘, k >= 0.5 裝簍）
    x = px - 18;
    y = py;
    zIndex = py + 0.03;
    load = k;
  } else {
    // 交藥 (herbDeliver)：簍放在身側 (+16 * face, 0)，隨交付進度草藥轉移至藥架 (load = 1 - k)
    x = px + 16 * face;
    y = py;
    zIndex = py + 0.03;
    load = Math.max(0, 1 - k);
  }

  return { x, y, zIndex, load };
}
