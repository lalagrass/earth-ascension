#!/usr/bin/env node
// BL-V04 烘焙（#181）：讀 template/actions.json，把每個人物的每個動作畫成同一個框、同一個腳底錨點的幀，
// 每人輸出一張 sprite sheet（out/<人物>.png）與 PixiJS 原生讀得懂的 JSON hash（out/<人物>.json，含 anchor、animations）。
// 姿勢參數取 V1 來源（design/source/v1-board.html 的 POSE，V3 展示的幀也是這組），畫法取 #179 的 figure() 與 #180 的堂親外觀，
// 所以模板只描述「動作」，外觀由人物覆寫，兩人沒有各寫一套接線。
// 需要 Playwright 與 Chromium：PLAYWRIGHT_PATH 指向 playwright 套件，CHROMIUM 可指定瀏覽器。用法：node template/tools/bake.js
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.resolve(__dirname, '../..');
const TPL = JSON.parse(fs.readFileSync(path.join(ROOT, 'template/actions.json'), 'utf8'));
const OUT = path.join(ROOT, 'template/out');
const V1 = pathToFileURL(path.join(ROOT, 'design/source/v1-board.html')).href;
const V3 = pathToFileURL(path.join(ROOT, 'design/source/bl-v03-board.html')).href;
const BOARDS = path.join(ROOT, 'design/source/bl-l03-boards.js');
const RES = TPL.resolution, S = TPL.sceneScale, PAD = 3, COLS = 5;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  const watch = (page, name) => page.on('pageerror', (e) => errors.push(`${name}: ${e}`));

  // 1. 姿勢參數：V1 的 POSE 表（純資料），加上模板自己的 extraPoses
  const v1 = await browser.newPage();
  watch(v1, 'v1');
  await v1.goto(`${V1}?board=observe`);
  await v1.waitForSelector('#observe');
  const POSES = Object.assign(await v1.evaluate(() => JSON.parse(JSON.stringify(POSE))), TPL.extraPoses); // eslint-disable-line no-undef
  await v1.close();
  for (const [k, a] of Object.entries(TPL.actions)) for (const p of a.poses) if (!POSES[p]) errors.push(`動作 ${k} 的姿勢 ${p} 不存在`);

  // 2. 畫法：#179 的 figure()＋#180 的堂親外觀（cousinFrom、anchors），放在一頁裡
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: RES });
  watch(page, 'draw');
  await page.goto(`${V3}?board=after`);
  await page.evaluate(() => { window.BL_L03_BOARD = 'card'; });
  await page.addScriptTag({ path: BOARDS });
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
    document.body.innerHTML = '<svg id="stage" xmlns="http://www.w3.org/2000/svg" style="display:block"></svg>';
  });

  // 每一幀要畫的東西：人物 × 動作 × 姿勢；人物缺的動作（omit）不畫，留給播放端退回
  const jobs = [];
  for (const [cid, ch] of Object.entries(TPL.characters)) {
    for (const [aid, a] of Object.entries(TPL.actions)) {
      if (ch.omit.includes(aid)) continue;
      a.poses.forEach((p, i) => jobs.push({ cid, aid, i, name: `${aid}-${i}`, pose: POSES[p], draw: ch.draw, s: S * ch.scale, back: a.view === 'back', overrides: ch.overrides }));
    }
  }
  const markup = (j, x, y) => page.evaluate(({ j, x, y }) => {
    const o = Object.assign({}, j.pose, j.overrides, { x, y, s: j.s, dir: 1, back: j.back });
    return j.draw === 'cousin' ? cousinFrom(j.pose, Object.assign({}, j.overrides, { x, y, s: j.s, dir: 1, back: j.back })) : figure(o); // eslint-disable-line no-undef
  }, { j, x, y });
  const bbox = (svg) => page.evaluate((m) => {
    const s = document.getElementById('stage');
    s.setAttribute('viewBox', '-200 -200 400 400'); s.setAttribute('width', 400); s.setAttribute('height', 400);
    s.innerHTML = `<g id="it">${m}</g>`;
    const b = document.getElementById('it').getBBox();
    return { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height };
  }, svg);

  // 3. 共用框：所有人物、所有幀的聯集，所以錨點在框內位置處處相同
  let u = null;
  for (const j of jobs) {
    const b = await bbox(await markup(j, 0, 0));
    u = u ? { x: Math.min(u.x, b.x), y: Math.min(u.y, b.y), x2: Math.max(u.x2, b.x2), y2: Math.max(u.y2, b.y2) } : b;
  }
  const ax = Math.ceil(-u.x + PAD), ay = Math.ceil(-u.y + PAD);
  const W = ax + Math.ceil(u.x2 + PAD), H = ay + Math.ceil(u.y2 + PAD);

  // 4. 掛點：與 figure() 同一套算法（肩→扁擔中點→兩端→掛繩頂），以幀框左上為原點、像素
  const attachOf = (j) => page.evaluate(({ j, ax, ay, R }) => {
    const p = j.pose;
    if ((p.load || 'pole') !== 'pole') return null;
    const a = anchors(p); // eslint-disable-line no-undef
    const c = [a.sh[0], a.sh[1] - 3.4];
    const r = (v, deg) => { const t = deg * Math.PI / 180; return [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)]; };
    const sag = 1.5 + (p.fill || 0) * 3.5 + (p.sag || 0);
    const e1 = r([40, 0], p.poleTilt || 0), e2 = r([-40, 0], p.poleTilt || 0);
    const px = (v) => [Math.round((ax + v[0] * j.s) * R), Math.round((ay + v[1] * j.s) * R)];
    return { pole: px(c), bucketFront: px([c[0] + e1[0], c[1] + e1[1] + sag]), bucketBack: px([c[0] + e2[0], c[1] + e2[1] + sag]) };
  }, { j, ax, ay, R: RES });

  // 5. 每人一張 sheet：在舞台上排成格子、一次截圖
  for (const cid of Object.keys(TPL.characters)) {
    const mine = jobs.filter((j) => j.cid === cid);
    const rows = Math.ceil(mine.length / COLS);
    const sw = COLS * W, sh = rows * H;
    const cells = [];
    let svg = '';
    for (const [k, j] of mine.entries()) {
      const cx = (k % COLS) * W, cy = Math.floor(k / COLS) * H;
      svg += await markup(j, cx + ax, cy + ay);
      cells.push({ j, cx, cy });
    }
    await page.setViewportSize({ width: sw, height: sh });
    await page.evaluate(({ svg, sw, sh }) => {
      const s = document.getElementById('stage');
      s.setAttribute('viewBox', `0 0 ${sw} ${sh}`); s.setAttribute('width', sw); s.setAttribute('height', sh);
      s.innerHTML = svg;
    }, { svg, sw, sh });
    await page.screenshot({ path: path.join(OUT, `${cid}.png`), clip: { x: 0, y: 0, width: sw, height: sh }, omitBackground: true });

    const frames = {}, animations = {}, attach = {};
    for (const { j, cx, cy } of cells) {
      frames[j.name] = {
        frame: { x: cx * RES, y: cy * RES, w: W * RES, h: H * RES }, rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: W * RES, h: H * RES }, sourceSize: { w: W * RES, h: H * RES },
        anchor: { x: ax / W, y: ay / H }
      };
      (animations[j.aid] = animations[j.aid] || [])[j.i] = j.name;
      const at = await attachOf(j);
      if (at) attach[j.name] = at;
    }
    const ch = TPL.characters[cid];
    const sheet = {
      frames, animations,
      meta: {
        app: 'earth-ascension template/tools/bake.js', version: String(TPL.version), image: `${cid}.png`, format: 'RGBA8888',
        size: { w: sw * RES, h: sh * RES }, scale: String(RES),
        character: cid, label: ch.label, template: 'actions.json', omit: ch.omit,
        anchorPx: { x: ax * RES, y: ay * RES }, frameSize: { w: W * RES, h: H * RES },
        hitbox: { x: Math.round((ax + TPL.hitbox.x * S * ch.scale) * RES), y: Math.round((ay + TPL.hitbox.y * S * ch.scale) * RES), w: Math.round(TPL.hitbox.w * S * ch.scale * RES), h: Math.round(TPL.hitbox.h * S * ch.scale * RES) },
        attach
      }
    };
    fs.writeFileSync(path.join(OUT, `${cid}.json`), JSON.stringify(sheet, null, 1) + '\n');
    console.log(`${cid}: ${mine.length} 幀，sheet ${sw * RES}×${sh * RES}px，幀框 ${W * RES}×${H * RES}px，錨點 (${ax * RES}, ${ay * RES})`);
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
