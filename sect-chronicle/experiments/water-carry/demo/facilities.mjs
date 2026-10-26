// facilities.mjs
// 宗門實體地標與角色水墨飾品向量繪製庫
// 遵照公版 Facility 契約規範，使用 Pixi Graphics 繪製水墨水彩質感，零外置未經審計的點陣圖檔

// 公版四大設施定義清單
export const PUBLIC_FACILITIES = Object.freeze([
  {
    id: 'fac.kitchen',
    label: '膳房大陶灶',
    x: 1040,
    y: 480,
    entrance: { x: 1040, y: 480 },
    asset: 'kitchen_stove',
    desc: '雙口青磚柴灶 · 烹調名菜與乾糧',
  },
  {
    id: 'fac.garden',
    label: '四季菜畦',
    x: 1320,
    y: 680,
    entrance: { x: 1320, y: 680 },
    asset: 'vegetable_garden',
    desc: '東南翻土壟溝 · 澆水蔬菜生長',
  },
  {
    id: 'fac.yard',
    label: '雙脈演武坪',
    x: 860,
    y: 530,
    entrance: { x: 860, y: 530 },
    asset: 'martial_ground',
    desc: '青石壓實地坪 · 雙脈試劍樁',
  },
  {
    id: 'fac.patrol_gate',
    label: '後山巡山口界碑',
    x: 640,
    y: 410,
    entrance: { x: 640, y: 410 },
    asset: 'patrol_gate',
    desc: '西坡風化石碑 · 通往 S0-S5 哨卡',
  },
]);

export const FACILITIES_MAP = Object.fromEntries(PUBLIC_FACILITIES.map((f) => [f.id, f]));

// 1. 繪製膳房大陶灶 (雙口青磚柴灶 + 鐵鍋木蓋 + 煙道)
export function drawKitchenStove(g, isCooking = false) {
  g.clear();
  // 地面陰影
  g.ellipse(0, 2, 32, 12).fill({ color: 0x3b2f22, alpha: 0.28 });
  // 青磚灶台基座
  g.roundRect(-24, -36, 48, 36, 4).fill({ color: 0x7a6350 }).stroke({ color: 0x483a2d, width: 1.5 });
  // 灶台檯面（受光微亮）
  g.roundRect(-26, -38, 52, 10, 3).fill({ color: 0x937963 }).stroke({ color: 0x483a2d, width: 1.2 });
  // 雙口鐵鍋與木蓋 (左口、右口)
  for (const ox of [-13, 13]) {
    g.ellipse(ox, -33, 9, 4).fill({ color: 0x2b2b2b }); // 鐵鍋邊
    g.roundRect(ox - 7, -39, 14, 6, 2).fill({ color: 0xb08d68 }).stroke({ color: 0x5a422a, width: 1 }); // 木鍋蓋
    g.rect(ox - 2, -42, 4, 3).fill({ color: 0x483420 }); // 鍋蓋提把
  }
  // 柴火膛口 (下方拱形黑洞 + 微弱火光)
  g.roundRect(-9, -20, 18, 16, 4).fill({ color: 0x1f1712 });
  if (isCooking) {
    g.circle(0, -12, 5).fill({ color: 0xe67e22, alpha: 0.85 });
    g.circle(0, -11, 2.5).fill({ color: 0xf1c40f, alpha: 0.95 });
  }
}

// 2. 繪製四季菜畦 (翻土壟溝 + 綠葉新芽)
export function drawVegetableGarden(g, moisture = 0.5) {
  g.clear();
  // 泥土底色（越濕潤色調越深沉）
  const soilColor = moisture > 0.6 ? 0x443224 : 0x5e4835;
  g.roundRect(-36, -22, 72, 44, 8).fill({ color: soilColor }).stroke({ color: 0x332418, width: 1.5 });
  // 兩道隆起的菜壟
  for (const oy of [-10, 8]) {
    g.roundRect(-30, oy, 60, 12, 4).fill({ color: moisture > 0.6 ? 0x533f2f : 0x6e5640 });
    // 菜苗植株點綴
    for (const ox of [-20, -7, 6, 19]) {
      g.circle(ox - 3, oy + 5, 3.5).fill({ color: 0x529432 });
      g.circle(ox + 3, oy + 4, 3.5).fill({ color: 0x6db33f });
      g.circle(ox, oy + 2, 2.5).fill({ color: 0x8cd94e });
    }
  }
  // 水分光澤
  if (moisture > 0.6) {
    g.ellipse(15, -14, 6, 2.5).fill({ color: 0x85c1e9, alpha: 0.45 });
    g.ellipse(-12, 15, 8, 3).fill({ color: 0x85c1e9, alpha: 0.45 });
  }
}

// 3. 繪製雙脈演武坪 (青石石坪 + 雙脈木樁)
export function drawMartialGround(g, sparFlash = 0) {
  g.clear();
  // 壓實青石地坪陰影與石板
  g.ellipse(0, 2, 48, 24).fill({ color: 0x474a44, alpha: 0.28 });
  g.ellipse(0, 0, 44, 20).fill({ color: 0x7d827a }).stroke({ color: 0x4d524a, width: 1.8 });
  // 陰陽太極／雙脈石紋刻痕
  g.arc(0, 0, 12, 0, Math.PI).stroke({ color: 0x5c6159, width: 1.2 });
  g.circle(-5, -2, 2).fill({ color: 0x5c6159 });
  g.circle(5, 2, 2).fill({ color: 0x9ea39b });

  // 左右兩根試劍演武木樁
  for (const ox of [-22, 22]) {
    g.ellipse(ox, 2, 7, 3).fill({ color: 0x2d2419, alpha: 0.35 });
    g.roundRect(ox - 3.5, -34, 7, 34, 2).fill({ color: 0x8a6a45 }).stroke({ color: 0x4f3b26, width: 1.2 });
    // 纏繩與樁頂
    g.rect(ox - 4, -26, 8, 3).fill({ color: 0xc8b07a });
    g.rect(ox - 4, -16, 8, 3).fill({ color: 0xc8b07a });
  }

  // 切磋拳意激盪波紋 (flash > 0)
  if (sparFlash > 0) {
    g.ellipse(0, 0, 48 + 16 * (1 - sparFlash), 22 + 8 * (1 - sparFlash))
      .stroke({ color: 0xffe082, width: 2, alpha: sparFlash });
  }
}

// 4. 繪製後山巡山口界碑 (風化石碑 + 門柵)
export function drawPatrolGate(g) {
  g.clear();
  // 地面陰影
  g.ellipse(0, 3, 24, 8).fill({ color: 0x332f27, alpha: 0.3 });
  // 風化界碑石
  g.roundRect(-10, -42, 20, 42, 3).fill({ color: 0x888c85 }).stroke({ color: 0x4d524c, width: 1.5 });
  // 碑面暗紅刻字「後山重地」示意線
  g.rect(-5, -36, 10, 2).fill({ color: 0x992d22 });
  g.rect(-3, -30, 6, 2).fill({ color: 0x992d22 });
  g.rect(-4, -24, 8, 2).fill({ color: 0x992d22 });
  // 側邊竹柵欄樁
  g.roundRect(14, -28, 4, 28, 1).fill({ color: 0xa88457 }).stroke({ color: 0x5a422a, width: 1 });
  g.rect(10, -22, 12, 3).fill({ color: 0x8a6a45 });
  g.rect(10, -12, 12, 3).fill({ color: 0x8a6a45 });
}

// 5. 繪製 6 大經典角色專屬地圖特徵飾品 (掛載在角色 Sprite 上)
export function drawCharacterAccessory(g, templateId, face = 1) {
  g.clear();
  if (!templateId) return;

  switch (templateId) {
    case 'landlady': {
      // 包租婆：頭頂粉紅捲髮筒群飾 (3 個小圈圈) + 嘴邊長菸嘴
      g.circle(-5 * face, -58, 3.5).fill({ color: 0xf48fb1 }).stroke({ color: 0xad1457, width: 1 });
      g.circle(0, -60, 3.8).fill({ color: 0xf48fb1 }).stroke({ color: 0xad1457, width: 1 });
      g.circle(5 * face, -58, 3.5).fill({ color: 0xf48fb1 }).stroke({ color: 0xad1457, width: 1 });
      // 菸嘴 (嘴角伸出長白桿，端點帶火星)
      g.rect(3 * face, -48, 12 * face, 2).fill({ color: 0xffffff }).stroke({ color: 0x7f8c8d, width: 0.6 });
      g.rect(15 * face, -48, 2 * face, 2).fill({ color: 0xe74c3c });
      break;
    }

    case 'linghu_chong': {
      // 令狐沖：腰間青銅酒葫蘆 + 背後長劍劍柄
      // 背後斜負長劍
      g.rect(-14 * face, -62, 3 * face, 26).fill({ color: 0x95a5a6 }).stroke({ color: 0x34495e, width: 1 });
      g.rect(-17 * face, -56, 9 * face, 3).fill({ color: 0xd4ac0d }); // 劍格
      // 青銅酒葫蘆 (腰側下半球 + 上半球 + 紅繩)
      g.circle(12 * face, -22, 5).fill({ color: 0xa07855 }).stroke({ color: 0x5c4028, width: 1 });
      g.circle(12 * face, -30, 3.5).fill({ color: 0xa07855 }).stroke({ color: 0x5c4028, width: 1 });
      g.circle(12 * face, -26, 2).fill({ color: 0xc0392b }); // 紅線結
      break;
    }

    case 'wei_xiaobao': {
      // 韋小寶：黑紅六合瓜皮小帽 + 紅纓
      g.ellipse(0, -56, 8, 4).fill({ color: 0x212121 }).stroke({ color: 0x000000, width: 1 });
      g.circle(0, -59, 2.5).fill({ color: 0xd32f2f }); // 紅纓頂珠
      // 腰間暗藏金色匕首鞘
      g.rect(8 * face, -26, 8 * face, 3).fill({ color: 0xf39c12 }).stroke({ color: 0x7f6000, width: 0.8 });
      break;
    }

    case 'guo_jing': {
      // 郭靖：蒙古赤紅皮帶 + 雙肩毛領短披
      g.roundRect(-8, -32, 16, 4, 1).fill({ color: 0x992222 }).stroke({ color: 0x551111, width: 0.8 });
      g.ellipse(-7 * face, -46, 5, 3).fill({ color: 0xded6c5 }); // 左肩毛領
      g.ellipse(7 * face, -46, 5, 3).fill({ color: 0xded6c5 });  // 右肩毛領
      break;
    }

    case 'yue_buqun': {
      // 岳不群：華山青玉道冠 + 紫霞儒衫滾邊
      g.roundRect(-4, -60, 8, 6, 2).fill({ color: 0x48c9b0 }).stroke({ color: 0x117864, width: 1 });
      g.rect(-6, -34, 12, 3).fill({ color: 0x8e44ad, alpha: 0.85 }); // 紫霞腰帶
      break;
    }

    case 'ah_sing': {
      // 阿星：白汗衫條紋 + 雙手纏白繃帶
      g.rect(-7, -40, 14, 10).fill({ color: 0xfdfefe, alpha: 0.8 }); // 白背心
      g.circle(9 * face, -24, 2.5).fill({ color: 0xecf0f1 }).stroke({ color: 0xbdc3c7, width: 0.8 }); // 拳術繃帶
      break;
    }
  }
}
