#!/usr/bin/env node
// 輸出 LP-10 畫稿 PNG（#220）：代表格的桌面 1400×820／窄 390×844 截圖、三條路徑的縮圖總覽、初學／熟練對照頁。
// 需要先在 water-carry/ 開靜態伺服器（例：python3 -m http.server 8830 --bind 127.0.0.1），因為頁面用 fetch 讀共用 scene.json。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render.js [基底網址，預設 http://127.0.0.1:8830/design/lp10/] [輸出資料夾，預設 out/]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const base = process.argv[2] || 'http://127.0.0.1:8830/design/lp10/';
const outDir = path.resolve(process.argv[3] || path.join(__dirname, 'out'));
// 代表格：[檔名, 路徑, 第幾格（0 起）, 熟練]
const DESK = [['desk-1-life', 'A', 0], ['desk-2-preview', 'A', 2], ['desk-3-approach', 'A', 3], ['desk-4-contact', 'A', 5], ['desk-5-flee', 'A', 9], ['desk-6-end', 'A', 10],
  ['desk-7-b-cancel', 'B', 6], ['desk-8-c-stop', 'C', 4]];
const NARROW = [['narrow-1-start', 'A', 1], ['narrow-2-contact', 'A', 5], ['narrow-3-c-stop', 'C', 3]];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  async function open(url, w, h) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${url}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${url}: ${m.text()}`); });
    await page.goto(base + url);
    await page.waitForSelector('body[data-ready="1"]');
    return page;
  }
  for (const [name, p, step, skill] of DESK.map((d) => [...d, 'b']).concat(NARROW.map((d) => [...d, 'b']))) {
    const narrow = name.startsWith('narrow');
    const page = await open(`index.html?path=${p}&step=${step}&skill=${skill}`, narrow ? 390 : 1400, narrow ? 844 : 820);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`${name}.png`);
    await page.close();
  }
  // 三條路徑總覽：每格桌面截圖縮成 280 寬，同一路徑一列（6 格換行）
  const page = await open('index.html', 1400, 820);
  const paths = await page.evaluate(async (u) => (await import(u)).PATHS, base + 'states.js');
  const thumbs = {};
  for (const [k, p] of Object.entries(paths)) {
    thumbs[k] = [];
    for (let i = 0; i < p.steps.length; i++) {
      await page.goto(`${base}index.html?path=${k}&step=${i}&skill=b`);
      await page.waitForSelector('body[data-ready="1"]');
      const label = await page.textContent('#step');
      thumbs[k].push({ label, src: 'data:image/png;base64,' + (await page.screenshot()).toString('base64') });
    }
  }
  const html = `<meta charset="utf-8"><body style="margin:0;padding:12px;background:#f8f2e4;font:13px sans-serif;color:#2f2a24">
    <h2 style="margin:0 0 4px">LP-10 掌法點選流程：三條路徑總覽 <span style="background:#b8432f;color:#fff;padding:1px 10px;border-radius:4px;font-size:13px">設計示意，未連遊戲</span></h2>
    ${Object.entries(paths).map(([k, p]) => `<h3 style="margin:10px 0 4px">${p.name}</h3><div style="display:grid;grid-template-columns:repeat(6,280px);gap:6px">${thumbs[k].map((t) => `<figure style="margin:0"><img src="${t.src}" style="width:280px;border:1px solid #cdbb98;border-radius:4px;display:block"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`).join('')}</body>`;
  await page.setViewportSize({ width: 1720, height: 900 });
  await page.setContent(html);
  await page.screenshot({ path: path.join(outDir, 'paths.png'), fullPage: true });
  console.log('paths.png');
  await page.close();
  const cmp = await open('compare.html', 1400, 820);
  await cmp.screenshot({ path: path.join(outDir, 'compare.png'), fullPage: true });
  console.log('compare.png');
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
