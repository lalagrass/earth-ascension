#!/usr/bin/env node
// 輸出 BL-L03 長住堂親的三張設計圖（#180）：角色卡、同路對照、指點分鏡。
// 先開 source/bl-v03-board.html（#179 的人物與場景函式），再注入 source/bl-l03-boards.js 換成本單的板；人物骨架與路徑點因此和 #179 相同。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-bl-l03.js [輸出資料夾，預設 bl-l03/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'bl-l03'));
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const boards = path.join(__dirname, 'source', 'bl-l03-boards.js');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  for (const board of ['card', 'path', 'guide']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${board}: ${m.text()}`); });
    await page.goto(`${base}?board=after`);
    await page.evaluate((b) => { window.BL_L03_BOARD = b; }, board);
    await page.addScriptTag({ path: boards });
    await page.waitForSelector(`#${board}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, `${board}.png`) });
    console.log(`${board} -> ${board}.png`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
