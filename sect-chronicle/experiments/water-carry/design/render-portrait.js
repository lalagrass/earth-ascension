#!/usr/bin/env node
// 輸出主角立繪與表情差分的兩張板（#184 第 1 項）：立繪三表情＋分層、與 #179 小人並排／縮小可讀性比較。
// 先開 source/bl-v03-board.html（#179），再注入 source/portrait-boards.js；配色與比較用的小人都直接取 #179 的函式。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-portrait.js [輸出資料夾，預設 portrait/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'portrait'));
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const boards = path.join(__dirname, 'source', 'portrait-boards.js');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  for (const board of ['sheet', 'compare']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${board}: ${m.text()}`); });
    await page.goto(`${base}?board=after`);
    await page.evaluate((b) => { window.PORTRAIT_BOARD = b; }, board);
    await page.addScriptTag({ path: boards });
    await page.waitForSelector(`#${board}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, `${board}.png`) });
    console.log(`${board} -> ${board}.png`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
