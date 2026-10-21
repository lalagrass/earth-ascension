#!/usr/bin/env node
// 輸出立繪放進既有介面的合成示意（#184 第 2 項）：寬畫面臉型 A／B、390px 窄畫面 A／B、A／B 臉型並排。
// 先開 source/bl-v03-board.html（#179），注入 source/portrait-boards.js（#192 立繪），再注入 source/portrait-ui-boards.js。
// 背景是 v3/observe.png、v3/narrow.png（V3 展示實際截圖），由頁面以相對路徑讀入，所以要等圖片載完再截。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-portrait-ui.js [輸出資料夾，預設 portrait-ui/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'portrait-ui'));
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const portraits = path.join(__dirname, 'source', 'portrait-boards.js');
const boards = path.join(__dirname, 'source', 'portrait-ui-boards.js');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  for (const [board, w, h] of [['desk-a', 1440, 900], ['desk-b', 1440, 900], ['narrow', 1440, 900], ['faces', 1600, 1000]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${board}: ${m.text()}`); });
    page.on('requestfailed', (r) => errors.push(`${board}: failed ${r.url()}`));
    await page.goto(`${base}?board=after`);
    await page.evaluate((b) => { window.PORTRAIT_BOARD = 'sheet'; window.PORTRAIT_UI_BOARD = b; }, board);
    await page.addScriptTag({ path: portraits });
    await page.addScriptTag({ path: boards });
    await page.waitForSelector(`#${board}`);
    const bad = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('img')];
      await Promise.all(imgs.map((i) => i.decode().catch(() => null)));
      return imgs.filter((i) => !i.naturalWidth).map((i) => i.src);
    });
    if (bad.length) errors.push(`${board}: image not loaded ${bad.join(', ')}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, `${board}.png`) });
    console.log(`${board} -> ${board}.png`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
