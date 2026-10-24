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
const DESIGN_OUT = path.join(ROOT, 'design/lp17-integration');
const V1 = pathToFileURL(path.join(ROOT, 'design/source/v1-board.html')).href;
const V3 = pathToFileURL(path.join(ROOT, 'design/source/bl-v03-board.html')).href;
const BOARDS = path.join(ROOT, 'design/source/bl-l03-boards.js');
const RES = TPL.resolution, S = TPL.sceneScale, PAD = 3, COLS = 5;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DESIGN_OUT, { recursive: true });

  let browser;
  let exitCode = 0;
  const errors = [];

  try {
    browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
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

    // 注入 LP-17 角色繪製模組（落實 Grok D32 造型結構改善）
    await page.evaluate(() => {
      // Grok D32 主角（周小滿，圓潤勤懇初學者，藍短衫、白邊交領、衣褶、硃砂大蝴蝶結、紅潤圓頰、前額碎髮）
      window.lp17HeroPainter = function(o) {
        const heroConfig = {
          robe: '#345479', robe2: '#20344d', robeLit: '#52749d',
          sash: '#b83c28', inner: '#eee6d4', ribbon: '#b83c28',
          round: 1.0
        };
        const d = Object.assign({}, o, heroConfig);
        const baseSvg = figure(d);
        const a = anchors(d), s = d.s || 1, dir = d.dir || 1;
        const sh = a.sh, hip = a.hip, head = a.head;
        const hx = head[0], hy = head[1];
        const L = d.lean || 0;
        const up = [Math.sin(rad(L)), -Math.cos(rad(L))];
        const perp = [Math.cos(rad(L)), Math.sin(rad(L))];
        const P = (base, k) => [base[0] + perp[0] * k, base[1] + perp[1] * k];
        const along = (base, k) => [base[0] + up[0] * k, base[1] + up[1] * k];

        // 1. 額前碎髮劉海、圓潤雙頰紅暈、亮點眼神與髮髻硃砂雙飄帶
        let faceExtra = '';
        if (!d.back) {
          faceExtra = `
            <!-- 額前碎髮劉海 -->
            <path d="M${pt(hx - 5, hy - 6.5)} Q${pt(hx + 1, hy - 3.2)} ${pt(hx + 7.5, hy - 5.8)}" stroke="#1e2226" stroke-width="2.6" fill="none" stroke-linecap="round"/>
            <path d="M${pt(hx - 4, hy - 7.2)} Q${pt(hx + 1, hy - 4.2)} ${pt(hx + 6.5, hy - 6.4)}" stroke="#424c56" stroke-width="1.1" fill="none"/>
            <!-- 少年紅潤圓頰 -->
            <ellipse cx="${f(hx + 3.4)}" cy="${f(hy + 4.6)}" rx="3.2" ry="2.0" fill="#f09682" opacity=".55"/>
            <!-- 明亮眼神高光 -->
            <circle cx="${f(hx + 5)}" cy="${f(hy - .3)}" r=".55" fill="#ffffff"/>
            <!-- 髮髻紅結與飄帶 -->
            <path d="M${pt(hx - 5.5, hy - 11.5)} q-5,3 -8,11 M${pt(hx - 5.1, hy - 11.1)} q-2,6 -2,13" stroke="#b83c28" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M${pt(hx - 5.5, hy - 11.5)} q-5,3 -8,11" stroke="#8a2214" stroke-width=".8" fill="none" stroke-linecap="round"/>
          `;
        } else {
          faceExtra = `
            <!-- 身後飄逸紅髮帶 -->
            <path d="M${pt(hx - 5.5, hy - 11.5)} q-6,3 -9,12 M${pt(hx - 5.1, hy - 11.1)} q-3,6 -3,14" stroke="#b83c28" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          `;
        }

        // 2. 白邊夾領、布料衣褶陰影、腰間硃砂大蝴蝶結
        let robeExtra = '';
        if (!d.back) {
          // 白邊夾領
          robeExtra += `<path d="M${pt(...P(sh, -2))} L${pt(...P(along(hip, 13), 6.5))}" stroke="#fff6ea" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M${pt(...P(sh, 4))} L${pt(...P(along(hip, 13), 7.2))}" stroke="#fff6ea" stroke-width="1.4" stroke-linecap="round"/>`;
          // 腹部衣褶自然陰影線
          robeExtra += `<path d="M${pt(...P(along(hip, 19), -8))} Q${pt(...P(along(hip, 15), 1))} ${pt(...P(along(hip, 10), 10))}" stroke="#20344d" stroke-width="1.2" fill="none" opacity=".5"/>
            <path d="M${pt(...P(along(hip, 23), -7))} Q${pt(...P(along(hip, 18), 3))} ${pt(...P(along(hip, 14), 11))}" stroke="#52749d" stroke-width="1.0" fill="none" opacity=".4"/>`;
          // 硃砂大結（腰帶上的雙耳大蝴蝶結與下垂飄帶）
          const knotPos = P(along(hip, 4.5), 11);
          robeExtra += `
            <ellipse cx="${f(knotPos[0] - 2.8)}" cy="${f(knotPos[1] - 1.2)}" rx="3.0" ry="1.8" transform="rotate(-20 ${f(knotPos[0] - 2.8)} ${f(knotPos[1] - 1.2)})" fill="#b83c28" stroke="#8a2214" stroke-width=".7"/>
            <ellipse cx="${f(knotPos[0] + 2.2)}" cy="${f(knotPos[1] - 0.8)}" rx="2.8" ry="1.7" transform="rotate(25 ${f(knotPos[0] + 2.2)} ${f(knotPos[1] - 0.8)})" fill="#b83c28" stroke="#8a2214" stroke-width=".7"/>
            <circle cx="${f(knotPos[0])}" cy="${f(knotPos[1])}" r="2.2" fill="#d44830" stroke="#8a2214" stroke-width=".7"/>
            <path d="M${pt(knotPos[0] - 1, knotPos[1] + 1)} q-1.5,7 -3,13 M${pt(knotPos[0] + 1, knotPos[1] + 1)} q2,6 2,12" stroke="#b83c28" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M${pt(knotPos[0] - 1, knotPos[1] + 1)} q-1.5,7 -3,13" stroke="#8a2214" stroke-width=".7" fill="none" stroke-linecap="round"/>
          `;
        }

        const overlay = `<g transform="translate(${f(d.x || 0)},${f(d.y || 0)}) scale(${f(s * dir)},${f(s)})">${robeExtra}${faceExtra}</g>`;
        return baseSvg + overlay;
      };

      // Grok D32 堂親（周阿祁，村居訪客少年，瘦長俐落，橄欖褐村衣、暗青抹額、粗麻汗巾、補丁與麻繩帶）
      window.lp17CousinPainter = function(p, extra) {
        const cousinConfig = {
          robe: '#5a6245', robe2: '#3a422a', robeLit: '#78825c',
          sash: '#887854', inner: '#303828', ribbon: '#263438',
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
        const sh = a.sh, hip = a.hip, head = a.head;
        const hx = head[0], hy = head[1];

        // 1. 抹額（暗青石板色頭巾）、額角碎髮、稍削的下頜修容與堅毅眉眼
        let headExtra = '';
        if (!o.back) {
          headExtra = `
            <!-- 暗青抹額帶 -->
            <path d="M${pt(hx - 10.5, hy - 3.2)} Q${pt(hx, hy - 4.6)} ${pt(hx + 10.2, hy - 2.6)} L${pt(hx + 10, hy + 0.6)} Q${pt(hx, hy - 1.4)} ${pt(hx - 10.3, hy + 0.0)} Z" fill="#243236" stroke="#162022" stroke-width=".7"/>
            <path d="M${pt(hx - 9.5, hy - 2.1)} Q${pt(hx, hy - 3.3)} ${pt(hx + 9.2, hy - 1.6)}" stroke="#3e5258" stroke-width=".8" fill="none"/>
            <!-- 額角碎髮 -->
            <path d="M${pt(hx - 5, hy - 10.5)} l2,-3.5 l2.5,2.5 l2.5,-3.5 l2,4" stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <!-- 稍削的下頜修容線 -->
            <path d="M${pt(hx - 7, hy + 7)} Q${pt(hx - 0.5, hy + 11.2)} ${pt(hx + 7.5, hy + 5.5)}" stroke="#bd8e64" stroke-width="1.6" fill="none" opacity=".6"/>
            <!-- 堅毅沉穩眉眼 -->
            <path d="M${pt(hx + 2.2, hy - 3.2)} l4.8,-.5" stroke="#1c1c1c" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="${f(hx + 5.1)}" cy="${f(hy - .1)}" r=".4" fill="#ffffff"/>
          `;
        } else {
          headExtra = `
            <!-- 腦後抹額結 -->
            <path d="M${pt(hx - 10.4, hy + 0.5)} Q${pt(hx, hy - 1.5)} ${pt(hx + 10.4, hy + 0.5)} L${pt(hx + 10.2, hy - 2.8)} Q${pt(hx, hy - 4.5)} ${pt(hx - 10.2, hy - 2.8)} Z" fill="#243236" stroke="#162022" stroke-width=".7"/>
            <path d="M${pt(hx - 1.5, hy - 1)} l-3,7.5 m3,-7.5 l1.5,8.5" stroke="#243236" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <circle cx="${f(hx - 1.5)}" cy="${f(hy - 1)}" r="2.2" fill="#243236"/>
          `;
        }

        // 2. 擦汗白汗巾搭在肩頭（帶麻布經緯織痕與自然垂褶）
        const towel = o.back
          ? `<path d="M${pt(sh[0] - 7.5, sh[1] - 1.5)} q7.5,-4.5 15,0 l-1.2,4.5 q-6.5,-2.6 -13,0 z" fill="#ede8dc" stroke="#b6ac98" stroke-width=".8"/>`
          : `<path d="M${pt(sh[0] - 7.5, sh[1] - 1.5)} q7.5,-4.5 15,0 l-1.6,14.5 l-3.6,-1 l.7,-10.2 q-4.5,-1.2 -9.2,.6 z" fill="#ede8dc" stroke="#b6ac98" stroke-width=".8"/>
             <path d="M${pt(sh[0] + 5, sh[1] + 3)} l-1,8.5" stroke="#bfb5a2" stroke-width=".7" stroke-dasharray="1.5 1"/>`;

        // 3. 衣服下擺深藍補丁＋十字針腳＋粗麻繩腰帶絞線
        let robeExtra = '';
        if (!o.sit) {
          robeExtra += `
            <!-- 補丁與十字針腳 -->
            <rect x="${f(hip[0] - 9)}" y="${f(hip[1] + 5)}" width="6.2" height="5.6" fill="#364654" stroke="#222e38" stroke-width=".7"/>
            <path d="M${f(hip[0] - 7.8)},${f(hip[1] + 6.4)} l3.8,2.8 M${f(hip[0] - 4)},${f(hip[1] + 6.4)} l-3.8,2.8" stroke="#dedad0" stroke-width=".7"/>
            <!-- 粗麻繩腰帶絞線 -->
            <path d="M${pt(hip[0] - 7, hip[1] - 3.5)} L${pt(hip[0] + 8, hip[1] - 4.5)}" stroke="#b0a074" stroke-width="1.1" stroke-dasharray="2 1.5" opacity=".8"/>
          `;
        }

        const overlay = `<g transform="translate(${f(o.x || 0)},${f(o.y || 0)}) scale(${f(s * dir)},${f(s)})">${towel}${headExtra}${robeExtra}</g>`;
        return body + overlay;
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

    // 固定保持原對齊標準與共框尺寸
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
      function lp17Dojo() {
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
        ${Array.from({ length: 6 }, (_, i) => `<path d="M${956 - i * 7.5},${452 + i * 18} L${1444 - i * 7.5},${452 + i * 18}" stroke="#525048" stroke-width="1.2"/>`).join('')}
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

      const s = document.getElementById('stage');
      s.setAttribute('viewBox', '0 0 1600 900');
      s.setAttribute('width', 1600); s.setAttribute('height', 900);
      s.innerHTML = terrain() + bamboo(110, 660, 6) + spring() + pathSvg() + lp17Dojo();
    });

    const bgPngPath = path.join(OUT, 'bg.png');
    await page.screenshot({ path: bgPngPath, clip: { x: 0, y: 0, width: 1600, height: 900 } });
    console.log(`[LP-17 Export] 背景圖匯出完成: ${bgPngPath} (1600×900, scale ${RES} = 3200×1800)`);

    // 7. 匯出雙人造型細節對比卡 (design/lp17-integration/character-details.png)
    await page.setViewportSize({ width: 640, height: 320 });
    await page.evaluate(() => {
      const s = document.getElementById('stage');
      s.setAttribute('viewBox', '0 0 640 320');
      s.setAttribute('width', 640); s.setAttribute('height', 320);

      // 背景底卡
      const cardBg = `
        <rect x="0" y="0" width="640" height="320" fill="#222426"/>
        <rect x="12" y="12" width="616" height="296" rx="8" fill="#2a2e33" stroke="#3e444c" stroke-width="1.5"/>
        <text x="320" y="42" text-anchor="middle" font-size="16" fill="#e8eaed" font-family="sans-serif" font-weight="bold">LP-17 雙人新造型特徵改善與動作適配（同尺度展示）</text>
        <line x1="28" y1="56" x2="612" y2="56" stroke="#3e444c" stroke-width="1"/>

        <!-- 角色標籤與特徵說明 -->
        <text x="160" y="80" text-anchor="middle" font-size="14" fill="#8ab4f8" font-family="sans-serif" font-weight="bold">主角（周小滿）初學少年</text>
        <text x="160" y="98" text-anchor="middle" font-size="11" fill="#9aa0a6" font-family="sans-serif">靛青短衫 · 白邊夾領 · 硃砂大結 · 圓臉紅潤碎髮</text>

        <text x="480" y="80" text-anchor="middle" font-size="14" fill="#a8dab5" font-family="sans-serif" font-weight="bold">熟手（周阿祁）鄉村少年</text>
        <text x="480" y="98" text-anchor="middle" font-size="11" fill="#9aa0a6" font-family="sans-serif">橄欖褐短褂 · 暗青抹額 · 粗布肩巾 · 下擺補丁</text>
      `;

      // 放置四個站立與挑水動作實例 (scale 1.5 展示細節)
      const heroIdle = window.lp17HeroPainter(Object.assign({}, POSE.idle, { x: 90, y: 250, s: 1.4 }));
      const heroWalk = window.lp17HeroPainter(Object.assign({}, POSE.loadA, { x: 220, y: 250, s: 1.4 }));
      const cousinIdle = window.lp17CousinPainter(POSE.idle, { x: 410, y: 250, s: 1.4 });
      const cousinWalk = window.lp17CousinPainter(POSE.grownA, { x: 540, y: 250, s: 1.4 });

      s.innerHTML = cardBg + heroIdle + heroWalk + cousinIdle + cousinWalk;
    });

    const detailPngPath = path.join(DESIGN_OUT, 'character-details.png');
    await page.screenshot({ path: detailPngPath, clip: { x: 0, y: 0, width: 640, height: 320 } });
    console.log(`[LP-17 Export] 雙人特徵對比圖匯出完成: ${detailPngPath}`);

    // 8. 寫出 manifest.json
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

    if (errors.length) {
      console.error('Errors encountered during export:\n' + errors.join('\n'));
      exitCode = 1;
    } else {
      console.log('[LP-17 Export] 全部素材匯出成功！');
    }
  } catch (err) {
    console.error('[LP-17 Export Fatal Error]', err);
    exitCode = 1;
  } finally {
    // 嚴格保證瀏覽器行程釋放，無論成功、失敗或中途異常
    if (browser) {
      await browser.close().catch(() => {});
      console.log('[LP-17 Export] 瀏覽器行程已於 finally 區塊乾淨關閉釋放。');
    }
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
})();
