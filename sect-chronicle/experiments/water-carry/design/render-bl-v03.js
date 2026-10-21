#!/usr/bin/env node
// 輸出 BL-V03 第 1 步的圖（#177）：改前場景、改後場景、改前／改後對照、主角造型對照。
// 「改前」直接取 source/v1-board.html 的原函式（V3 展示用的也是這組圖），不在新檔重畫，所以對照一定是同一份來源。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔。
// 用法：node render-bl-v03.js [輸出資料夾，預設 bl-v03/]
'use strict';
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'bl-v03'));
const v1 = pathToFileURL(path.join(__dirname, 'source', 'v1-board.html')).href;
const src = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const POSES = ['idle', 'emptyA', 'loadA', 'grownA', 'pour'];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  const watch = (page, name) => {
    page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  };

  // 改前：V1 原函式
  const old = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  watch(old, 'v1');
  await old.goto(`${v1}?board=observe`);
  await old.waitForSelector('#observe');
  await old.evaluate(() => { for (const el of [...document.querySelector('#observe').children]) if (el.tagName !== 'svg') el.remove(); });
  await old.locator('#observe svg.scene').screenshot({ path: path.join(outDir, 'before.png') });
  const BEFORE = await old.evaluate((names) => ({
    scene: scene('observe'), // eslint-disable-line no-undef
    poses: Object.fromEntries(names.map((k) => [k, pose(k, { x: 0, y: 0, s: 1, dir: 1 })])) // eslint-disable-line no-undef
  }), POSES);
  await old.close();
  console.log('before -> before.png');

  for (const [board, height, file] of [['after', 900, 'after.png'], ['compare', 1000, 'compare.png'], ['hero', 1000, 'hero.png']]) {
    const page = await browser.newPage({ viewport: { width: 1600, height }, deviceScaleFactor: 1 });
    watch(page, board);
    await page.addInitScript((b) => { window.BEFORE = b; }, BEFORE);
    await page.goto(`${src}?board=${board}`);
    await page.waitForSelector(`#${board}`);
    await page.locator(`#${board}`).screenshot({ path: path.join(outDir, file) });
    console.log(`${board} -> ${file}`);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
