#!/usr/bin/env node
// V3 補幀：用 V1 來源（design/source/v1-board.html）的 grownA～D 姿態輸出「成長後負重」4 幀與選取發光版，
// 框、錨點與解析度跟 spikes/shared/scene.json 的主角幀完全相同，換幀不會跳。其他素材直接沿用 spikes/shared/assets。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件，CHROMIUM 可指定瀏覽器。用法：node demo/tools/export-grown.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.resolve(__dirname, '../..');
const scene = JSON.parse(fs.readFileSync(path.join(ROOT, 'spikes/shared/scene.json'), 'utf8'));
const SRC = pathToFileURL(path.join(ROOT, 'design/source/v1-board.html')).href;
const OUT = path.join(ROOT, 'demo/assets');
const H = scene.hero, RES = scene.resolution;
const AX = 800, AY = 500, HERO_SCALE = 0.78; // 與 spikes/shared/export.js 相同
const clip = { x: AX - H.ax, y: AY - H.ay, width: H.w, height: H.h };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: RES });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${SRC}?board=observe`);
  await page.waitForSelector('#observe');
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
    document.body.innerHTML = '<svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" style="display:block"></svg>';
  });
  const frames = {};
  for (const [i, k] of ['A', 'B', 'C', 'D'].entries()) for (const glow of [false, true]) {
    const expr = `pose('grown${k}', { x: ${AX}, y: ${AY}, s: ${HERO_SCALE}, dir: 1, back: true${glow ? ", glow: '#f6d77a'" : ''} })`;
    const b = await page.evaluate((e) => { const s = document.getElementById('stage'); s.innerHTML = `<g id="it">${eval(e)}</g>`; const r = document.getElementById('it').getBBox(); return { x: r.x, y: r.y, x2: r.x + r.width, y2: r.y + r.height }; }, expr);
    if (b.x < clip.x || b.y < clip.y || b.x2 > clip.x + clip.width || b.y2 > clip.y + clip.height) errors.push(`grown${k} 超出共用主角框`);
    const name = `grown-${i}${glow ? '-sel' : ''}`;
    await page.screenshot({ path: path.join(OUT, `hero-${name}.png`), clip, omitBackground: true });
    frames[name] = `hero-${name}.png`;
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(frames, null, 1) + '\n');
  console.log(`grown frames: ${Object.keys(frames).length}`);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
