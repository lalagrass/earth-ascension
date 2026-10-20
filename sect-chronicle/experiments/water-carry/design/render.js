#!/usr/bin/env node
// 把 source/v1-board.html 的四張畫面輸出成 PNG（#155 V1）。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），
// CHROMIUM 可指定瀏覽器執行檔。用法：node render.js [輸出資料夾，預設本資料夾]
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || __dirname);
const src = pathToFileURL(path.join(__dirname, 'source', 'v1-board.html')).href;
const BOARDS = [
  ['observe', 900], ['intervene', 900], ['characters', 1000], ['sceneui', 1000]
];
const NAMES = { observe: 'observe', intervene: 'intervene', characters: 'characters', sceneui: 'scene-ui' };

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let failed = 0;
  for (const [board, height] of BOARDS) {
    const page = await browser.newPage({ viewport: { width: 1600, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${src}?board=${board}`);
    await page.waitForSelector(`#${board}`);
    const file = path.join(outDir, `${NAMES[board]}.png`);
    await page.locator(`#${board}`).screenshot({ path: file });
    if (errors.length) { failed++; console.error(`${board}: ${errors.join('; ')}`); }
    else console.log(`${board} -> ${path.relative(process.cwd(), file)}`);
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
