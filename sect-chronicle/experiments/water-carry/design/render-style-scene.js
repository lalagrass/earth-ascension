#!/usr/bin/env node
// 輸出《活俠傳》方向的整體畫風比較（#184）：current（現況）、ink（新風格）、compare（並排＋局部）、narrow（390px）。
// 先開 source/bl-v03-board.html（#179），注入 source/portrait-boards.js（#192／#193 立繪），再注入 source/style-scene-boards.js。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-style-scene.js [輸出資料夾，預設 style-scene/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'style-scene'));
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const portraits = path.join(__dirname, 'source', 'portrait-boards.js');
const boards = path.join(__dirname, 'source', 'style-scene-boards.js');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  for (const [board, w, h] of [['current', 1600, 900], ['ink', 1600, 900], ['compare', 1600, 880], ['narrow', 1600, 960]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`${board}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${board}: ${m.text()}`); });
    await page.goto(`${base}?board=after`);
    await page.evaluate((b) => { window.PORTRAIT_BOARD = 'sheet'; window.STYLE_SCENE_BOARD = b; }, board);
    await page.addScriptTag({ path: portraits });
    await page.addScriptTag({ path: boards });
    await page.waitForSelector(`#${board}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, `${board}.png`) });
    console.log(`${board} -> ${board}.png`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
