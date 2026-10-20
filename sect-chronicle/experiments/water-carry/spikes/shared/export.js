#!/usr/bin/env node
// V2 共用素材：用 V1 來源（design/source/v1-board.html）的同一組繪圖函式，把小場景拆成背景、可排序物件與人物各幀 PNG，
// 並寫出 scene.json（座標、錨點、路線、地點、播放片段與介面文字）。PixiJS 與 Godot 兩個試作都只讀這裡的輸出。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件，CHROMIUM 可指定瀏覽器。用法：node export.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const RES = 2; // 輸出解析度：場景座標 1 單位 = 2 像素，縮放到 1.6× 仍清楚
const HERO_SCALE = 0.78; // 與 V1 兩張完整畫面相同
const OUT = path.join(__dirname, 'assets');
const SRC = pathToFileURL(path.resolve(__dirname, '../../design/source/v1-board.html')).href;

// 可排序物件：與 V1 scene() 相同的位置與大小；y 是腳底（排序與錨點）
const PROPS = [
  ['pine-a', 'pine(1520, 470, 1.15, 1)', 1520, 470],
  ['pine-b', 'pine(980, 382, .9, 0)', 980, 382],
  ['pine-c', 'pine(1560, 330, .8, 2)', 1560, 330],
  ['pine-d', 'pine(560, 860, 1.6, 1)', 560, 860],
  ['master', "shadow(1300, 512, 18) + pose('meditate', { x: 1300, y: 512, s: .78 })", 1300, 512],
  ['senior', "shadow(1120, 528) + pose('sweep', { x: 1120, y: 528, s: .78, dir: -1 })", 1120, 528],
  ['bush-a', 'bush(706, 662, 1)', 706, 662],
  ['rock-a', 'rock(520, 610, 1.1)', 520, 610],
  ['bush-b', 'bush(1030, 596, .9)', 1030, 596],
  ['bush-c', 'bush(460, 800, 1.4)', 460, 800],
  ['rock-b', 'rock(860, 812, 1.8, C.stone2)', 860, 812],
  ['bush-d', 'bush(1220, 820, 1.6)', 1220, 820],
];
const VATS = [['vat-0', 0], ['vat-1', 0.55], ['vat-2', 1]];
// 人物幀：一律面向右（dir 1），引擎用水平翻轉表示往左。下山用正面、上山用背面。
const FRAMES = [
  ['idle', 'idle', false], ['empty-0', 'emptyA', false], ['empty-1', 'emptyB', false], ['empty-2', 'emptyC', false], ['empty-3', 'emptyD', false],
  ['load-0', 'loadA', true], ['load-1', 'loadB', true], ['load-2', 'loadC', true], ['load-3', 'loadD', true],
  ['dip', 'dip', false], ['pour', 'pour', false],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: RES });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${SRC}?board=observe`);
  await page.waitForSelector('#observe');
  // 清空頁面，只留一個透明的 1600×900 SVG 舞台
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
    document.body.innerHTML = '<svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" style="display:block"></svg>';
  });
  const shoot = async (file, clip) => {
    await page.screenshot({ path: path.join(OUT, file), clip, omitBackground: true });
    return file;
  };
  // 把一段 SVG 放上舞台；回傳 getBBox（場景座標）
  const place = (markup, defs = '') => page.evaluate(([m, d]) => {
    const s = document.getElementById('stage');
    s.innerHTML = `${d}<g id="it">${m}</g>`;
    const b = document.getElementById('it').getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, [markup, defs]);
  const frag = (expr) => page.evaluate((e) => eval(e), expr); // 只執行本檔列出的 V1 繪圖呼叫
  const box = (b, pad = 4) => {
    const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad));
    return { x, y, width: Math.min(1600, Math.ceil(b.x + b.w + pad)) - x, height: Math.min(900, Math.ceil(b.y + b.h + pad)) - y };
  };

  // 背景：地形、竹林、泉水、山路、道館（人物永遠在它們之前）
  await place(await frag("terrain() + bamboo(110, 660, 6) + spring() + pathSvg() + dojo()"));
  const bg = await shoot('bg.png', { x: 0, y: 0, width: 1600, height: 900 });

  const sprite = async (id, expr, ax, ay) => {
    const b = await place(await frag(expr));
    const c = box(b);
    const file = await shoot(`${id}.png`, c);
    return { id, file, w: c.width, h: c.height, ax: ax - c.x, ay: ay - c.y };
  };
  const props = [];
  for (const [id, expr, x, y] of PROPS) props.push(Object.assign(await sprite(id, expr, x, y), { x, y }));
  const vats = [];
  for (const [id, level] of VATS) vats.push(Object.assign(await sprite(id, `vat(1000, 520, ${level})`, 1000, 520), { level }));

  // 人物：所有幀共用同一個框，錨點在腳底，才不會換幀時跳動
  const AX = 800, AY = 500;
  const heroExpr = (p, back, glow) => `pose('${p}', { x: ${AX}, y: ${AY}, s: ${HERO_SCALE}, dir: 1, back: ${back}${glow ? ", glow: '#f6d77a'" : ''} })`;
  let u = null;
  for (const [, p, back] of FRAMES) for (const glow of [false, true]) {
    const b = await place(await frag(heroExpr(p, back, glow)));
    u = u ? { x: Math.min(u.x, b.x), y: Math.min(u.y, b.y), x2: Math.max(u.x2, b.x + b.w), y2: Math.max(u.y2, b.y + b.h) } : { x: b.x, y: b.y, x2: b.x + b.w, y2: b.y + b.h };
  }
  const hc = box({ x: u.x, y: u.y, w: u.x2 - u.x, h: u.y2 - u.y }, 6);
  const frames = {};
  for (const [name, p, back] of FRAMES) for (const glow of [false, true]) {
    await place(await frag(heroExpr(p, back, glow)));
    frames[name + (glow ? '-sel' : '')] = await shoot(`hero-${name}${glow ? '-sel' : ''}.png`, hc);
  }
  const PATH = await frag('PATH');
  await browser.close();

  const seg = (i) => Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]);
  const length = PATH.slice(1).reduce((s, _, i) => s + seg(i), 0);
  const scene = {
    note: '由 export.js 從 V1 來源產生，請勿手改。座標為 V1 場景座標（1600×900）；PNG 以 resolution 倍輸出，放進引擎時乘 1/resolution。',
    resolution: RES,
    size: { w: 1600, h: 900 },
    background: bg,
    path: { points: PATH, length: Math.round(length * 10) / 10, top: 'dojo', bottom: 'spring' },
    props, vats,
    hero: { w: hc.width, h: hc.height, ax: AX - hc.x, ay: AY - hc.y, frames, faceRightDefault: true },
    places: {
      vat: { label: '水缸', x: 1000, y: 520, rx: 44, ry: 26, sub: '道館院中' },
      spring: { label: '泉水', x: 328, y: 719, rx: 108, ry: 32, sub: '谷底' },
    },
    camera: { start: { x: 800, y: 450, zoom: 1 }, minZoom: 0.6, maxZoom: 1.6 },
    // 播放片段：兩個試作用同一份時間表，只有呈現不同；不是正式模型，數值是示意
    playback: {
      loop: true,
      steps: [
        { kind: 'walk', from: 0, to: 1, speed: 60, anim: 'empty', frameMs: 110, label: '下山（空桶）' },
        { kind: 'hold', ms: 4000, anim: 'dip', label: '取水' },
        { kind: 'walk', from: 1, to: 0, speed: 45, anim: 'load', frameMs: 130, label: '上山負重' },
        { kind: 'hold', ms: 4000, anim: 'pour', label: '倒水', vatLevelAfter: 2 },
      ],
    },
    ui: {
      hero: { name: '林遠', role: '主角 · 道館學徒', leg: 'Lv 3', work: '挑水（持續）' },
      menus: {
        vat: [
          { label: '本趟後休息', detail: '這趟挑完、倒進水缸後停手回道館休息', enabled: true },
          { label: '開始挑水（持續）', detail: '已在挑水中', enabled: false },
          { label: '立即倒水', detail: '肩上是空桶：要先到泉水裝水', enabled: false },
          { label: '派師兄一起挑', detail: '示範只開放主角下令', enabled: false },
        ],
        spring: [
          { label: '本趟後休息', detail: '這趟挑完、倒進水缸後停手回道館休息', enabled: true },
          { label: '在這裡多裝一桶', detail: '扁擔只掛得了兩桶', enabled: false },
        ],
      },
      people: [
        { id: 'hero', name: '主角 · 林遠' },
        { id: 'master', name: '師父 · 玄真', status: '打坐・道館院中' },
        { id: 'senior', name: '師兄 · 周衡', status: '掃地・道館院中' },
      ],
    },
  };
  fs.writeFileSync(path.join(__dirname, 'scene.json'), JSON.stringify(scene, null, 1) + '\n');
  const bytes = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`assets: ${fs.readdirSync(OUT).length} PNG, ${(bytes / 1024).toFixed(0)} KB; path length ${scene.path.length}`);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
