#!/usr/bin/env node
// 輸出 N1f 兩段生活流程的三張分鏡（#188）：做完再玩、半途分心、兩種偏好與中斷／恢復表。
// 先開 source/bl-v03-board.html（#179），注入 source/bl-l03-boards.js（#180 堂親與版面小工具），再注入 source/n1f-boards.js 換成本單的板。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-n1f.js [輸出資料夾，預設 n1f/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'n1f'));
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const kin = path.join(__dirname, 'source', 'bl-l03-boards.js');
const boards = path.join(__dirname, 'source', 'n1f-boards.js');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  for (const board of ['done', 'distract', 'prefs']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${board}: ${m.text()}`); });
    await page.goto(`${base}?board=after`);
    // bl-l03-boards.js 載入時會先掛自己的一張板；隨後 n1f-boards.js 整個換掉
    await page.evaluate((b) => { window.BL_L03_BOARD = 'card'; window.N1F_BOARD = b; }, board);
    await page.addScriptTag({ path: kin });
    await page.addScriptTag({ path: boards });
    await page.waitForSelector(`#${board}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, `${board}.png`) });
    console.log(`${board} -> ${board}.png`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
