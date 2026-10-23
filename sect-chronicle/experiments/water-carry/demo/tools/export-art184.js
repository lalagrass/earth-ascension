#!/usr/bin/env node
// D35 階段B（#184）：把 design/art184-production 的手繪真 alpha 素材烘成 demo 可直接載入的資產，輸出到 demo/assets/art184-production/。
// - 人物：沿用 LP17 已接受 sheet 的幀名／幀數／幀框／腳底錨點／hitbox／掛點（JSON 原樣複製），只換每格畫面。
//   每格的動態取自 LP17 由 POSE 烘出的同名幀（身體頂點起伏 bob、步態相位），不另寫骨架或動畫引擎；
//   手繪關鍵姿態只是外觀來源，行走以 POSE 起伏＋下半身左右錯步（shear）表現。
// - 場景：重畫 bg（以 LP17 bg 為底，只把原道館建物範圍換成手繪灰瓦木構正堂；院坪／功能點不動），
//   另輸出竹叢／山石 2x 貼圖給 long-water/scenery.mjs 的材質替換（幾何不變）。
// 需要 Playwright＋Chromium：PLAYWRIGHT_PATH 指向 playwright 套件。用法：node demo/tools/export-art184.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.resolve(__dirname, '../..');
const LP17 = path.join(ROOT, 'demo/assets/lp17');
const SRC = path.join(ROOT, 'design/art184-production/sprites');
const OUT = path.join(ROOT, 'demo/assets/art184-production');
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

// 動作 → 手繪姿態（flip：原圖朝左者翻成朝右，與 LP17 sheet 同向；播放端再依 face 翻面）
const LOOK = {
  hero: { h: 112, idle: ['hero_front_idle', 0], side: ['hero_side_idle', 1], carry: ['hero_side_carry', 1], backCarry: ['hero_back_carry', 0], back: ['hero_back_idle', 0], herb: ['hero_side_herb', 0] },
  cousin: { h: 120, idle: ['senior_front_idle', 0], side: ['senior_side_idle', 1], carry: ['senior_side_carry', 1], backCarry: ['senior_back_carry', 0], back: ['senior_back_idle', 0], herb: ['senior_side_herb', 1] },
};
const ACTION = { idle: 'idle', walkEmpty: 'carry', dip: 'carry', walkLoaded: 'backCarry', walkGrown: 'backCarry', pour: 'carry', rest: 'herb',
  herbWalk: 'side', herbGather: 'herb', herbWalkBack: 'back', herbHand: 'herb', gaze: 'back', stretch: 'idle' };
const CROUCH = 0.6; // 蹲姿高度／站姿高度（與 design manifest 同）
const WALK = new Set(['walkEmpty', 'walkLoaded', 'walkGrown', 'herbWalk', 'herbWalkBack']);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let browser, code = 0;
  try {
    browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
    const page = await browser.newPage();
    await page.setContent('<canvas id="c"></canvas>');
    await page.evaluate(() => {
      window.img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      window.topOf = (im, fr) => { // LP17 幀的不透明區頂端（POSE 烘出的身體起伏）
        const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h;
        const g = c.getContext('2d'); g.drawImage(im, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
        const d = g.getImageData(0, 0, fr.w, fr.h).data;
        // 只看 hitbox 欄（身體），排除扁擔／桶
        for (let y = 0; y < fr.h; y++) for (let x = Math.round(fr.w * 0.38); x < Math.round(fr.w * 0.6); x++) if (d[(y * fr.w + x) * 4 + 3] > 64) return y;
        return fr.h;
      };
    });

    for (const id of ['hero', 'cousin']) {
      const sheet = JSON.parse(fs.readFileSync(path.join(LP17, `${id}.json`), 'utf8'));
      const L = LOOK[id], need = new Set(Object.values(ACTION).map((k) => L[k][0]));
      const srcs = Object.fromEntries([...need].map((n) => [n, uri(path.join(SRC, n + '.png'))]));
      const png = await page.evaluate(async ({ sheet, srcs, L, ACTION, CROUCH, WALK, lp }) => {
        const m = sheet.meta, R = Number(m.scale), ax = m.anchorPx.x, ay = m.anchorPx.y;
        const lpImg = await img(lp), art = {};
        for (const [k, s] of Object.entries(srcs)) art[k] = await img(s);
        const idleTop = topOf(lpImg, sheet.frames['idle-0'].frame);
        const c = document.getElementById('c'); c.width = m.size.w; c.height = m.size.h;
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high';
        for (const [name, f] of Object.entries(sheet.frames)) {
          const [act, idx] = [name.replace(/-\d+$/, ''), Number(name.split('-').pop())];
          const [src, flip] = L[ACTION[act]], im = art[src];
          const crouch = ACTION[act] === 'herb';
          const hgt = L.h * (crouch ? CROUCH : 1), s = hgt / im.height, w = im.width * s;
          // POSE 起伏：LP17 同名幀身體頂端相對 idle 的位移（蹲姿不套，限 ±8px）
          const bob = crouch ? 0 : Math.max(-8, Math.min(8, topOf(lpImg, f.frame) - idleTop));
          const sq = act === 'dip' ? 0.9 : act === 'stretch' && idx % 2 ? 1.04 : 1; // 取水下蹲／伸展：只做垂直伸縮
          const tilt = act === 'pour' ? -0.12 : 0;
          const fx = f.frame.x + ax, fy = f.frame.y + ay; // 腳底
          const top = fy - hgt * sq;
          g.save(); g.beginPath(); g.rect(f.frame.x, f.frame.y, f.frame.w, f.frame.h); g.clip();
          const draw = (sy, sh, shear) => { // 把原圖 [sy, sy+sh) 這段畫到對應位置，可左右錯步
            g.save(); g.translate(fx, top + bob + sy * s * sq);
            if (tilt) g.rotate(tilt);
            if (shear) g.transform(1, 0, shear, 1, 0, 0);
            if (flip) g.scale(-1, 1);
            g.drawImage(im, 0, sy, im.width, sh, -w / 2, 0, w, sh * s * sq); g.restore();
          };
          if (WALK.includes(act)) { // 步態相位：0 中立、1 前、2 中立、3 後；下 38% 腿部錯步
            const cut = Math.round(im.height * 0.62), sh = [0, 0.16, 0, -0.16][idx % 4];
            draw(cut - 3, im.height - cut + 3, sh); draw(0, cut, 0); // 腿先畫、上身覆蓋接縫，避免透明細縫
          } else draw(0, im.height, 0);
          g.restore();
        }
        return c.toDataURL('image/png');
      }, { sheet, srcs, L, ACTION, CROUCH, WALK: [...WALK], lp: uri(path.join(LP17, `${id}.png`)) });
      fs.writeFileSync(path.join(OUT, `${id}.png`), Buffer.from(png.split(',')[1], 'base64'));
      sheet.meta.app = 'earth-ascension demo/tools/export-art184.js';
      sheet.meta.source = 'design/art184-production（D35 Grok 手繪）＋LP17 POSE 動態／契約';
      fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(sheet, null, 1) + '\n');
      console.log(`${id}: ${Object.keys(sheet.frames).length} 幀，sheet ${sheet.meta.size.w}×${sheet.meta.size.h}，契約沿用 LP17`);
    }

    // 背景：先用既有 board 的 terrain()／bamboo()／spring()／pathSvg()（與 LP17 匯出同一組畫法，不含 lp17Dojo）烘一張無建物底，
    // 再以 LP17 bg 為底，只把原道館建物範圍（場景 990–1510 × 186–452）換回無建物底，放手繪正堂／側屋；院坪 y≥452 保留 LP17。
    const { pathToFileURL } = require('url');
    const bp = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
    await bp.goto(pathToFileURL(path.join(ROOT, 'design/source/bl-v03-board.html')).href + '?board=after');
    await bp.evaluate(() => { window.BL_L03_BOARD = 'card'; });
    await bp.addScriptTag({ path: path.join(ROOT, 'design/source/bl-l03-boards.js') });
    await bp.evaluate(() => {
      document.documentElement.style.background = 'transparent';
      document.body.style.cssText = 'margin:0;overflow:hidden';
      document.body.innerHTML = '<svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" style="display:block"></svg>';
      document.getElementById('stage').innerHTML = terrain() + bamboo(110, 660, 6) + spring() + pathSvg(); // eslint-disable-line no-undef
    });
    const clean = 'data:image/png;base64,' + (await bp.screenshot({ clip: { x: 0, y: 0, width: 1600, height: 900 } })).toString('base64');
    await bp.close();
    const bg = await page.evaluate(async ({ lp, hall, side, clean }) => {
      const base = await img(lp), H = await img(hall), S2 = await img(side), CL = await img(clean), R = base.width / 1600;
      const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
      const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      g.save(); g.scale(R, R);
      g.beginPath(); g.rect(990, 186, 520, 266); g.clip();
      g.drawImage(CL, 0, 0, CL.width, CL.height, 0, 0, 1600, 900);
      g.restore(); g.save(); g.scale(R, R);
      const put = (im, cx, footY, hh) => { const s = hh / im.height; g.drawImage(im, cx - im.width * s / 2, footY - hh, im.width * s, hh); };
      put(S2, 1450, 420, 150); // 側屋（東側，原柴垛位置後方）
      put(H, 1236, 476, 290);  // 正堂：門約在 x≈1236，石階落到院坪上緣
      g.restore();
      return c.toDataURL('image/png');
    }, { lp: uri(path.join(LP17, 'bg.png')), hall: uri(path.join(SRC, 'dojo_main_hall.png')), side: uri(path.join(SRC, 'dojo_side_house.png')), clean });
    fs.writeFileSync(path.join(OUT, 'bg.png'), Buffer.from(bg.split(',')[1], 'base64'));

    // 長路景物貼圖：2x 解析度、底邊中心＝落地點
    const KIT = { bamboo: ['bamboo_clump', 118], boulder_l: ['boulder_l', 30], boulder_m: ['boulder_m', 24], boulder_s: ['boulder_s', 18] };
    const kit = {};
    for (const [k, [n, hh]] of Object.entries(KIT)) {
      const out = await page.evaluate(async ({ s, hh }) => {
        const im = await img(s), R = 2, h = Math.round(hh * R), w = Math.round(im.width * h / im.height);
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
        return [c.toDataURL('image/png'), w, h];
      }, { s: uri(path.join(SRC, n + '.png')), hh });
      fs.writeFileSync(path.join(OUT, `${k}.png`), Buffer.from(out[0].split(',')[1], 'base64'));
      kit[k] = { file: `${k}.png`, w: out[1], h: out[2], anchor: [out[1] / 2, out[2] - 1], scale: 2 };
    }
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ package: 'D35-B', resolution: 2, characters: ['hero', 'cousin'], background: 'bg.png', scenery: kit }, null, 1) + '\n');
    console.log('bg.png＋景物貼圖完成');
  } catch (e) { console.error(e); code = 1; } finally { if (browser) await browser.close(); }
  process.exit(code);
})();
