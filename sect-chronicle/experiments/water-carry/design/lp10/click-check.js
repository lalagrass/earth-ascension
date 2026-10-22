#!/usr/bin/env node
// LP-10 翻稿點選自查（只驗畫稿串得起來，不驗戰鬥）：桌面 1400×820 與 390×844 各從頭點完 A／B／C。
// 有熱區的格子只點熱區（金圈或面板脈動按鈕），其他格按「下一格」；每格核：唯一標記在、無水平溢出、熱區看得見。
// 另核「上一格」能回前一格、初學／熟練切換不改格子、console 無錯。用法同 render.js：node click-check.js [基底網址]
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.argv[2] || 'http://127.0.0.1:8830/design/lp10/';

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let fail = 0;
  const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) fail++; };
  for (const [w, h] of [[1400, 820], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); // 熱區脈動動畫會讓 Playwright 判定不穩定；人點不受影響
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + 'index.html');
    await page.waitForSelector('body[data-ready="1"]');
    const paths = await page.evaluate(async (u) => (await import(u)).PATHS, base + 'states.js');
    for (const [k, p] of Object.entries(paths)) {
      await page.click(`#paths [data-path="${k}"]`);
      const seen = [];
      for (let i = 0; i < p.steps.length; i++) {
        const st = await page.evaluate(() => document.body.dataset.state);
        seen.push(st);
        const info = await page.evaluate(() => ({
          seal: !!document.querySelector('.seal') && getComputedStyle(document.querySelector('.seal')).display !== 'none',
          overflow: document.documentElement.scrollWidth > innerWidth,
          hotAt: !document.getElementById('hot').hidden, hotBtn: document.querySelector('#panel [data-hot]') ? document.querySelector('#panel [data-hot]').dataset.hot : null,
        }));
        if (!info.seal || info.overflow) ok(false, `${w}px ${k}${i + 1} ${st}: 標記 ${info.seal} 溢出 ${info.overflow}`);
        if (i + 1 === p.steps.length) break;
        if (info.hotAt) {
          const box = await page.locator('#hot').boundingBox();
          const inView = box && box.x >= 0 && box.y >= 0 && box.x + box.width <= w && box.y + box.height <= h;
          if (!inView) ok(false, `${w}px ${k}${i + 1} 熱區在畫面外`);
          await page.click('#hot');
        } else if (info.hotBtn) {
          const btn = page.locator(`#panel [data-hot="${info.hotBtn}"]`);
          await btn.scrollIntoViewIfNeeded();
          if (!(await btn.isVisible())) ok(false, `${w}px ${k}${i + 1} 面板按鈕看不見`);
          await btn.click();
        } else await page.click('#next');
      }
      ok(seen.join() === p.steps.join(), `${w}px ${p.name}：${seen.length} 格依序點完（${seen.at(-1)}）`);
      await page.click('#prev');
      const back = await page.evaluate(() => document.body.dataset.state);
      ok(back === p.steps.at(-2), `${w}px ${p.name}：上一格回到 ${back}`);
    }
    // 初學／熟練切換：同一格只換姿勢
    await page.goto(base + 'index.html?path=A&step=5&skill=b');
    await page.waitForSelector('body[data-ready="1"]');
    await page.click('#skill [data-skill="e"]');
    const after = await page.evaluate(() => [document.body.dataset.state, location.search]);
    ok(after[0] === 'a_hit' && after[1].includes('skill=e'), `${w}px 初學→熟練切換停在同一格（${after.join(' ')}）`);
    // 叫停鍵在 390px 不用捲動就看得到
    await page.goto(base + 'index.html?path=C&step=3');
    await page.waitForSelector('body[data-ready="1"]');
    const stop = await page.locator('#panel [data-hot="stop"]').boundingBox();
    ok(stop && stop.y + stop.height <= h && stop.y >= 0, `${w}px 叫停鍵在可見範圍（y=${stop && Math.round(stop.y)}）`);
    ok(errors.length === 0, `${w}px console 無錯 ${errors.join(' | ')}`);
    await page.close();
  }
  const cmp = await browser.newPage({ viewport: { width: 1400, height: 820 } });
  const cerr = [];
  cmp.on('pageerror', (e) => cerr.push(String(e)));
  await cmp.goto(base + 'compare.html');
  await cmp.waitForSelector('body[data-ready="1"]');
  ok((await cmp.locator('canvas').count()) === 18 && cerr.length === 0, `對照頁 18 格畫完、無錯 ${cerr.join(' | ')}`);
  await browser.close();
  console.log(fail ? `${fail} FAIL` : 'all ok');
  process.exit(fail ? 1 : 0);
})();
