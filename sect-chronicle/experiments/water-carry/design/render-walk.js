#!/usr/bin/env node
// 輸出 BL-V03 第 2 步的走路對照（#177）：
//   walk/frames.png   改前 4 幀／改後 8 幀的膠捲對照（空桶、負重）
//   walk/preview.html 可直接開的動態對照頁（幀已內嵌，不需伺服器）
//   walk/compare.gif  動態對照頁放大區的 0.5 倍速錄影，給 PR 與 issue 直接看
// 先開 source/v1-board.html 取 V1 姿勢表（改前），讀 template/actions.json 的步距，再開 source/bl-v03-board.html（#179 畫法）注入 source/walk-boards.js。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件（預設 require('playwright')），CHROMIUM 可指定瀏覽器執行檔；GIF 需要 ffmpeg。
// 用法：node render-walk.js [輸出資料夾，預設 walk/]
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'walk'));
const v1 = pathToFileURL(path.join(__dirname, 'source', 'v1-board.html')).href;
const base = pathToFileURL(path.join(__dirname, 'source', 'bl-v03-board.html')).href;
const boards = path.join(__dirname, 'source', 'walk-boards.js');
const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'template', 'actions.json'), 'utf8'));
const GIF_FPS = 15, GIF_SECONDS = 4, GIF_SPEED = 0.5;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  const watch = (page, name) => {
    page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  };

  const p1 = await browser.newPage();
  watch(p1, 'v1');
  await p1.goto(`${v1}?board=observe`);
  const V1_POSE = await p1.evaluate(() => JSON.parse(JSON.stringify(POSE))); // eslint-disable-line no-undef
  await p1.close();
  const TPL_STRIDE = { walkEmpty: tpl.actions.walkEmpty.stride, walkLoaded: tpl.actions.walkLoaded.stride };

  // 1. 膠捲對照
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  watch(page, 'frames');
  await page.goto(`${base}?board=after`);
  await page.evaluate(({ V1_POSE, TPL_STRIDE }) => { window.V1_POSE = V1_POSE; window.TPL_STRIDE = TPL_STRIDE; }, { V1_POSE, TPL_STRIDE });
  await page.addScriptTag({ path: boards });
  await page.waitForSelector('#frames');
  await page.locator('#frames').screenshot({ path: path.join(outDir, 'frames.png') });
  console.log('frames -> frames.png');

  // 2. 動態對照頁：幀與量測直接寫進 HTML
  const data = await page.evaluate(() => window.WALK.export());
  for (const [id, v] of Object.entries(data)) {
    const m = v.metrics;
    console.log(`${id}: ${v.frames.length} 幀, 每幀 ${m.cycle / v.frames.length} 場景單位, 換幀落點差/循環 ${(m.slipPerCycle * 0.78).toFixed(2)}, 髖起伏 ${(m.hipRange * 0.78).toFixed(2)}, 每秒 ${m.framesPerSec.toFixed(1)} 幀`);
  }
  await page.close();
  const tplHtml = fs.readFileSync(path.join(__dirname, 'source', 'walk-preview.html'), 'utf8');
  const html = tplHtml.replace('/*WALK_DATA*/null', JSON.stringify(data));
  const previewPath = path.join(outDir, 'preview.html');
  fs.writeFileSync(previewPath, html);
  console.log('preview -> preview.html');

  // 3. GIF：固定時間點逐幀截圖再交給 ffmpeg，所以每次輸出相同
  const pv = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 1 });
  watch(pv, 'preview');
  await pv.goto(`${pathToFileURL(previewPath).href}?still=1`);
  await pv.waitForSelector('#big');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-'));
  const n = GIF_FPS * GIF_SECONDS;
  for (let i = 0; i < n; i++) {
    await pv.evaluate((t) => window.renderAt(t), (i / GIF_FPS) * GIF_SPEED);
    await pv.locator('#big').screenshot({ path: path.join(tmp, `f${String(i).padStart(3, '0')}.png`) });
  }
  await browser.close();
  const gif = path.join(outDir, 'compare.gif');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(GIF_FPS), '-i', path.join(tmp, 'f%03d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none', '-loop', '0', gif]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`gif -> compare.gif (${GIF_SECONDS}s, ${GIF_SPEED}x)`);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
