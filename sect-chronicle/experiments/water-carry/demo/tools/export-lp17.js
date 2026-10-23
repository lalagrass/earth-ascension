#!/usr/bin/env node
// LP-17 美術與雙人場景整合匯出工具
// 依據 LP17_HANDOFF.md / D31 / D34：
// 讀取 template/actions.json 與既有 POSE，採用 Grok D32 暖灰石、木竹、苔綠土色色系與三人設定重繪主角與堂親，
// 並重繪同坐標道館石院背景，輸出至 demo/assets/lp17/。
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.resolve(__dirname, '../..');
const TPL = JSON.parse(fs.readFileSync(path.join(ROOT, 'template/actions.json'), 'utf8'));
const OUT = path.join(ROOT, 'demo/assets/lp17');
const V1 = pathToFileURL(path.join(ROOT, 'design/source/v1-board.html')).href;
const V3 = pathToFileURL(path.join(ROOT, 'design/source/bl-v03-board.html')).href;
const BOARDS = path.join(ROOT, 'design/source/bl-l03-boards.js');
const RES = TPL.resolution, S = TPL.sceneScale, PAD = 3, COLS = 5;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  const watch = (page, name) => page.on('pageerror', (e) => errors.push(`${name}: ${e}`));

  // 1. 姿勢參數：V1 的 POSE 表加上 actions.json 的 extraPoses
  const v1 = await browser.newPage();
  watch(v1, 'v1');
  await v1.goto(`${V1}?board=observe`);
  await v1.waitForSelector('#observe');
  const POSES = Object.assign(await v1.evaluate(() => JSON.parse(JSON.stringify(POSE))), TPL.extraPoses);
  await v1.close();
  for (const [k, a] of Object.entries(TPL.actions)) {
    for (const p of a.poses) {
      if (!POSES[p]) errors.push(`動作 ${k} 的姿勢 ${p} 不存在`);
    }
  }

  // 2. 準備繪圖頁面（載入 V3 與 BOARDS 提供基礎幾何與工具函式）
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: RES });
  watch(page, 'draw');
  await page.goto(`${V3}?board=after`);
  await page.evaluate(() => { window.BL_L03_BOARD = 'card'; });
  await page.addScriptTag({ path: BOARDS });

  // 注入 LP-17 角色繪製模組
  await page.evaluate(() => {
    // Grok D32 主角（周小滿，圓潤勤懇初學者，藍短衫朱紅結）
    window.lp17HeroPainter = function(o) {
      const heroConfig = {
        robe: '#3b5f85', robe2: '#264260', robeLit: '#6286ae',
        sash: '#b83c28', inner: '#eee6d4', ribbon: '#b83c28',
        round: 1.0
      };
      const d = Object.assign({}, o, heroConfig);
      // 呼叫基礎 figure 取得骨架路徑
      const baseSvg = figure(d);
      return baseSvg;
    };

    // Grok D32 堂親（周阿祁，村居訪客少年，瘦長俐落，橄欖褐村衣、暗頭巾、擦汗巾、補丁）
    window.lp17CousinPainter = function(p, extra) {
      const cousinConfig = {
        robe: '#5a6245', robe2: '#3e462e', robeLit: '#7a845e',
        sash: '#8a7852', inner: '#e4dccc', ribbon: '#36322c',
        round: 0.3
      };
      const savedSkin = [C.skin, C.skin2];
      C.skin = '#dbb085'; C.skin2 = '#bd8e64'; // 日頭下健康的微黑膚色
      const o = Object.assign({}, p, cousinConfig, extra);
      const k = '__tmp'; POSE[k] = p;
      const body = figure(Object.assign({}, POSE[k], cousinConfig, extra));
      delete POSE[k];
      C.skin = savedSkin[0]; C.skin2 = savedSkin[1];

      const a = anchors(o), s = o.s || 1, dir = o.dir || 1;
      // 擦汗白汗巾搭在肩頭
      const towel = o.back
        ? `<path d="M${pt(a.sh[0] - 7, a.sh[1] - 1)} q7,-4 14,0 l-1,4 q-6,-2.4 -12,0 z" fill="#f2eee4" stroke="#c4baa8" stroke-width=".7"/>`
        : `<path d="M${pt(a.sh[0] - 7, a.sh[1] - 1)} q7,-4 14,0 l-1.5,13 l-3.4,-1 l.6,-9 q-4,-1 -8.6,.6 z" fill="#f2eee4" stroke="#c4baa8" stroke-width=".7"/>`;
      // 衣服下擺深藍補丁
      const patch = o.sit ? '' : `<rect x="${f(a.hip[0] - 9)}" y="${f(a.hip[1] + 6)}" width="5.8" height="5.2" fill="#3e5264" stroke="#2a3846" stroke-width=".6" stroke-dasharray="1.2 1"/>`;
      return body + `<g transform="translate(${f(o.x || 0)},${f(o.y || 0)}) scale(${f(s * dir)},${f(s)})">${patch}${towel}</g>`;
    };

    // 清空 body，建立透明 SVG 舞台
    document.documentElement.style.background = 'transparent';
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
    document.body.innerHTML = '<svg id="stage" xmlns="http://www.w3.org/2000/svg" style="display:block"></svg>';
  });

  // 每一幀的任務清單
  const jobs = [];
  for (const [cid, ch] of Object.entries(TPL.characters)) {
    for (const [aid, a] of Object.entries(TPL.actions)) {
      if (ch.omit.includes(aid)) continue;
      a.poses.forEach((p, i) => jobs.push({
        cid, aid, i, name: `${aid}-${i}`,
        pose: POSES[p], draw: ch.draw,
        s: S * ch.scale, back: a.view === 'back',
        overrides: ch.overrides
      }));
    }
  }

  const markup = (j, x, y) => page.evaluate(({ j, x, y }) => {
    const o = Object.assign({}, j.pose, j.overrides, { x, y, s: j.s, dir: 1, back: j.back });
    return j.draw === 'cousin' ? window.lp17CousinPainter(j.pose, o) : window.lp17HeroPainter(o);
  }, { j, x, y });

  const bbox = (svg) => page.evaluate((m) => {
    const s = document.getElementById('stage');
    s.setAttribute('viewBox', '-200 -200 400 400');
    s.setAttribute('width', 400); s.setAttribute('height', 400);
    s.innerHTML = `<g id="it">${m}</g>`;
    const b = document.getElementById('it').getBBox();
    return { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height };
  }, svg);

  // 3. 共用框尺寸（嚴格維持原 frameSize 190×214、anchor 90, 184）
  let u = null;
  for (const j of jobs) {
    const b = await bbox(await markup(j, 0, 0));
    u = u ? { x: Math.min(u.x, b.x), y: Math.min(u.y, b.y), x2: Math.max(u.x2, b.x2), y2: Math.max(u.y2, b.y2) } : b;
  }
  // 固定保持對齊標準
  const ax = 45, ay = 92;
  const W = 95, H = 107;

  // 4. 掛點演算法（嚴格對齊原 figure/anchors 契約）
  const attachOf = (j) => page.evaluate(({ j, ax, ay, R }) => {
    const p = j.pose;
    if ((p.load || 'pole') !== 'pole') return null;
    const a = anchors(p);
    const c = [a.sh[0], a.sh[1] - 3.4];
    const r = (v, deg) => {
      const t = deg * Math.PI / 180;
      return [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
    };
    const sag = 1.5 + (p.fill || 0) * 3.5 + (p.sag || 0);
    const e1 = r([40, 0], p.poleTilt || 0), e2 = r([-40, 0], p.poleTilt || 0);
    const px = (v) => [Math.round((ax + v[0] * j.s) * R), Math.round((ay + v[1] * j.s) * R)];
    return {
      pole: px(c),
      bucketFront: px([c[0] + e1[0], c[1] + e1[1] + sag]),
      bucketBack: px([c[0] + e2[0], c[1] + e2[1] + sag])
    };
  }, { j, ax, ay, R: RES });

  // 5. 烘焙兩人 Sprite Sheet
  for (const cid of Object.keys(TPL.characters)) {
    const mine = jobs.filter((j) => j.cid === cid);
    const rows = Math.ceil(mine.length / COLS);
    const sw = COLS * W, sh = rows * H;
    const cells = [];
    let svg = '';
    for (const [k, j] of mine.entries()) {
      const cx = (k % COLS) * W, cy = Math.floor(k / COLS) * H;
      svg += await markup(j, cx + ax, cy + ay);
      cells.push({ j, cx, cy });
    }
    await page.setViewportSize({ width: sw, height: sh });
    await page.evaluate(({ svg, sw, sh }) => {
      const s = document.getElementById('stage');
      s.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
      s.setAttribute('width', sw); s.setAttribute('height', sh);
      s.innerHTML = svg;
    }, { svg, sw, sh });

    const pngPath = path.join(OUT, `${cid}.png`);
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: sw, height: sh }, omitBackground: true });

    const frames = {}, animations = {}, attach = {};
    for (const { j, cx, cy } of cells) {
      frames[j.name] = {
        frame: { x: cx * RES, y: cy * RES, w: W * RES, h: H * RES },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: W * RES, h: H * RES },
        sourceSize: { w: W * RES, h: H * RES },
        anchor: { x: (ax * RES) / (W * RES), y: (ay * RES) / (H * RES) }
      };
      (animations[j.aid] = animations[j.aid] || [])[j.i] = j.name;
      const at = await attachOf(j);
      if (at) attach[j.name] = at;
    }
    const ch = TPL.characters[cid];
    const sheet = {
      frames, animations,
      meta: {
        app: 'earth-ascension demo/tools/export-lp17.js',
        version: String(TPL.version),
        image: `${cid}.png`, format: 'RGBA8888',
        size: { w: sw * RES, h: sh * RES }, scale: String(RES),
        character: cid, label: ch.label, template: 'actions.json', omit: ch.omit,
        anchorPx: { x: ax * RES, y: ay * RES },
        frameSize: { w: W * RES, h: H * RES },
        hitbox: {
          x: Math.round((ax + TPL.hitbox.x * S * ch.scale) * RES),
          y: Math.round((ay + TPL.hitbox.y * S * ch.scale) * RES),
          w: Math.round(TPL.hitbox.w * S * ch.scale * RES),
          h: Math.round(TPL.hitbox.h * S * ch.scale * RES)
        },
        attach
      }
    };
    fs.writeFileSync(path.join(OUT, `${cid}.json`), JSON.stringify(sheet, null, 1) + '\n');
    console.log(`[LP-17 Export] ${cid}: ${mine.length} 幀，sheet ${sw * RES}×${sh * RES}px，幀框 ${W * RES}×${H * RES}px，錨點 (${ax * RES}, ${ay * RES})`);
  }

  // 6. 重繪並輸出 Grok D32 風格道館場景底圖 bg.png (1600×900, RES 2)
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => {
    // Grok D32 青灰瓦、深木柱、灰赭土牆、石板院落與山居生活細節
    function lp17Dojo() {
      // 瓦面紋理 (26 道凹凸瓦槽陰影)
      const tiles = Array.from({ length: 26 }, (_, i) => {
        const x0 = 1056 + i * 15.5;
        const x1 = 1124 + i * 11.2;
        return `<path d="M${x0},304 L${x1},228" stroke="#252b33" stroke-width="1.6" opacity=".65"/><path d="M${x0 + 1.2},304 L${x1 + 1.2},228" stroke="#525d6b" stroke-width="0.8" opacity=".5"/>`;
      }).join('');

      return `
      <!-- 道館台地基底與石階 (暖灰山石粗鑿基座) -->
      <path d="M996,436 L1444,436 L1482,410 L1482,428 L1444,454 L996,454 Z" fill="#58564e"/>
      <path d="M996,436 L1058,402 L1482,402 L1444,436 Z" fill="#78766c"/>
      <!-- 石板院坪 (鋪設暖灰石板與苔蘚石縫) -->
      <path d="M956,452 L1444,452 L1408,542 L914,542 Z" fill="#807e74"/>
      <!-- 石板橫向橫縫 -->
      ${Array.from({ length: 6 }, (_, i) => `<path d="M${956 - i * 7.5},${452 + i * 18} L${1444 - i * 7.5},${452 + i * 18}" stroke="#525048" stroke-width="1.2"/>`).join('')}
      <!-- 石板縱向縫隙與青苔 -->
      ${Array.from({ length: 13 }, (_, i) => `<path d="M${956 + i * 38},452 L${914 + i * 38.5},542" stroke="#525048" stroke-width="1.2"/>`).join('')}
      ${[ [980, 480], [1060, 510], [1140, 470], [1280, 520], [1350, 490] ].map(([mx, my]) => `<ellipse cx="${mx}" cy="${my}" rx="8" ry="3.5" fill="#54683c" opacity=".55"/>`).join('')}
      <path d="M914,542 L1408,542 L1408,550 L914,550 Z" fill="#4c4a42"/>

      <!-- 側牆 (灰赭夯土粉刷，深木構包邊) -->
      <path d="M1404,306 L1452,276 L1452,392 L1404,420 Z" fill="#b0a796"/>
      <path d="M1404,306 L1452,276" stroke="#4a3628" stroke-width="6"/>
      <path d="M1452,276 L1452,392" stroke="#4a3628" stroke-width="4"/>

      <!-- 正堂前牆 (灰赭土牆＋老木柱樑與窗櫺) -->
      <rect x="1084" y="306" width="322" height="114" fill="#c8bfae"/>
      <rect x="1084" y="306" width="322" height="11" fill="#4a3628"/>
      <!-- 深木柱子 (6 根大立柱，帶柱礎石) -->
      ${[1088, 1160, 1228, 1264, 1332, 1398].map(x => `
        <rect x="${x - 4}" y="415" width="11" height="5" fill="#6e6c62"/>
        <rect x="${x - 3}" y="306" width="9" height="110" fill="#563f2e"/><path d="M${x - 2},306 L${x - 2},416" stroke="#6e523c" stroke-width="1.5" opacity=".7"/>
      `).join('')}

      <!-- 正門 (深色原木雙開厚門，帶門檻與銅環) -->
      <rect x="1204" y="328" width="84" height="92" fill="#2c2016"/>
      <rect x="1208" y="332" width="36" height="86" fill="#3a2c1e"/>
      <rect x="1248" y="332" width="36" height="86" fill="#3a2c1e"/>
      <circle cx="1238" cy="378" r="3" fill="#c8a052" stroke="#443216" stroke-width="1"/>
      <circle cx="1254" cy="378" r="3" fill="#c8a052" stroke="#443216" stroke-width="1"/>
      <rect x="1202" y="418" width="88" height="4" fill="#644834"/>

      <!-- 花窗櫺格 (左右兩側萬字格木花窗，溫潤透光) -->
      ${[[1104, 1148], [1344, 1388]].map(([a, b]) => `
        <rect x="${a}" y="332" width="${b - a}" height="52" fill="#f0e6cc" stroke="#4a3628" stroke-width="2.5"/>
        ${Array.from({ length: 4 }, (_, i) => `<path d="M${a + (i + 1) * (b - a) / 5},332 L${a + (i + 1) * (b - a) / 5},384" stroke="#6e523c" stroke-width="1.4"/>`).join('')}
        ${Array.from({ length: 4 }, (_, i) => `<path d="M${a},${332 + (i + 1) * 10.4} L${b},${332 + (i + 1) * 10.4}" stroke="#6e523c" stroke-width="1.4"/>`).join('')}
      `).join('')}

      <!-- 門前踏步石階 (三層石級) -->
      <path d="M1194,420 L1298,420 L1302,434 L1190,434 Z" fill="#7a786c"/>
      <path d="M1190,434 L1302,434 L1306,446 L1186,446 Z" fill="#6c6a5e"/>
      <path d="M1186,446 L1306,446 L1310,454 L1182,454 Z" fill="#58564c"/>

      <!-- 青灰瓦坡屋頂與飛簷起翹 (Grok 沉著深灰瓦) -->
      <path d="M1165,196 L1449,196 L1504,266 L1452,282 L1405,226 L1125,226 Z" fill="#2d343e"/>
      <path d="M1038,296 Q1060,309 1086,305 L1404,305 Q1442,309 1464,286 L1405,226 L1125,226 Z" fill="#3a424d"/>
      ${tiles}
      <!-- 屋脊與正脊吻獸 (青灰厚重瓦脊) -->
      <path d="M1125,226 L1405,226 L1449,196 L1165,196 Z" fill="#464f5c"/>
      <path d="M1125,226 L1405,226" stroke="#22272e" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M1116,230 q-7,-16 7,-20 M1414,230 q7,-16 -7,-20" stroke="#22272e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M1038,296 Q1060,309 1086,305 L1404,305 Q1442,309 1464,286" stroke="#22272e" stroke-width="3.5" fill="none"/>
      <path d="M1038,296 q-9,-9 -2,-16 M1464,286 q11,-7 9,-16" stroke="#22272e" stroke-width="3.5" fill="none" stroke-linecap="round"/>

      <!-- 匾額 (黑底古樸金字「道館」) -->
      <rect x="1212" y="308" width="68" height="22" rx="2" fill="#22201d" stroke="#b08a38" stroke-width="1.8"/>
      <text x="1246" y="324.5" text-anchor="middle" font-size="13" fill="#e8c258" font-family="serif" letter-spacing="6" font-weight="700">道館</text>

      <!-- 簷下燈籠 (內斂朱紅古燈) -->
      <ellipse cx="1148" cy="324" rx="7" ry="9" fill="#9e3626"/>
      <ellipse cx="1148" cy="324" rx="3" ry="5" fill="#f8cf58" opacity=".6"/>
      <ellipse cx="1344" cy="324" rx="7" ry="9" fill="#9e3626"/>
      <ellipse cx="1344" cy="324" rx="3" ry="5" fill="#f8cf58" opacity=".6"/>

      <!-- 生活細節：院中柴垛 (東側牆邊整齊碼放的松木柴火) -->
      <path d="M1416,420 L1448,402 L1448,432 L1416,446 Z" fill="#6a5032"/>
      ${Array.from({ length: 4 }, (_, i) => `<circle cx="${1424 + (i % 2) * 10}" cy="${426 + Math.floor(i / 2) * 8}" r="4" fill="#8c6c48" stroke="#4a3620" stroke-width="1"/>`).join('')}

      <!-- 生活細節：院中香爐與青煙 -->
      <path d="M1234,484 L1258,484 L1262,498 L1230,498 Z" fill="#44423c"/>
      <ellipse cx="1246" cy="484" rx="13" ry="4.5" fill="#646258"/>
      <path d="M1245,482 q-4,-14 3,-22 q5,-9 0,-18" stroke="#dcd6c8" stroke-width="1.6" fill="none" opacity=".65"/>
      `;
    }

    // 結合 terrain, bamboo, spring, pathSvg 與 lp17Dojo
    const s = document.getElementById('stage');
    s.setAttribute('viewBox', '0 0 1600 900');
    s.setAttribute('width', 1600); s.setAttribute('height', 900);
    s.innerHTML = terrain() + bamboo(110, 660, 6) + spring() + pathSvg() + lp17Dojo();
  });

  const bgPngPath = path.join(OUT, 'bg.png');
  await page.screenshot({ path: bgPngPath, clip: { x: 0, y: 0, width: 1600, height: 900 } });
  console.log(`[LP-17 Export] 背景圖匯出完成: ${bgPngPath} (1600×900, scale ${RES} = 3200×1800)`);

  // 7. 寫出 manifest.json
  const manifest = {
    package: 'LP-17',
    description: '道館場景與雙人美術整合（Grok D32 色系與造型）',
    created_at: new Date().toISOString(),
    resolution: RES,
    assets: {
      background: 'bg.png',
      characters: {
        hero: { json: 'hero.json', png: 'hero.png', frames: 30, frameSize: [190, 214], anchorPx: [90, 184] },
        cousin: { json: 'cousin.json', png: 'cousin.png', frames: 27, frameSize: [190, 214], anchorPx: [90, 184] }
      }
    }
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[LP-17 Export] Manifest 寫入完成: ${path.join(OUT, 'manifest.json')}`);

  await browser.close();
  if (errors.length) {
    console.error('Errors encountered:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('[LP-17 Export] 全部素材匯出成功！');
})();
