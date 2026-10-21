#!/usr/bin/env node
// LP-02：同一主入口的雙人生活流程；只用滑鼠／鍵盤下令，唯讀 snapshot 觀測模型。
// 先在 repo 根目錄 python3 -m http.server 8802 --directory sect-chronicle。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/life-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8802/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [], results = {};
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1 });
  const page = await context.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(ENTRY_URL);
  await wait(page, () => window.demo && window.demo.snapshot().frames > 3);
  check(new URL(page.url()).pathname.endsWith('/experiments/water-carry/demo/'), `${viewport.width}px：穩定主入口導向同一生活runtime`);
  return { context, page, errors };
}
const select = (page, id) => page.click(`#roster [data-person="${id}"]`);
function checkSheet(s, id, label) {
  const p = s.people[id], { bounds: b, anchor: a } = p.sprite;
  const x = b.x + b.w * (p.face > 0 ? a.x : 1 - a.x), y = b.y + b.h * a.y;
  check(p.sprite.resolution === 2 && p.sprite.scale.y === 1 && Math.abs(b.w - p.sprite.width * s.cam.zoom) < .1,
    `${label}：2×atlas尺寸正確`);
  check(Math.abs(x - p.footScreen.x) < .1 && Math.abs(y - p.footScreen.y) < .1, `${label}：實際sprite腳底與模型位置相同，face ${p.face}`);
  check(p.tapScreen.w >= 43.99 && p.tapScreen.h >= 43.99, `${label}：點選範圍至少44px`);
}
async function menu(page, id) {
  await select(page, id);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Enter');
  await wait(page, () => !!window.demo.snapshot().menu);
}

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(s.people.hero.mode === 'carry' && s.people.cousin.mode === 'carry' && s.inFlight === 2, '不下令兩人自行出發，各預約一擔');
  check(s.people.hero.initialLevel === 1 && s.people.cousin.initialLevel === 3, '初始腳力分別Lv1／Lv3，沿同一播放倍率');
  await page.click('#play');
  s = await snap(page);
  const a = s.people.hero.bodyScreen, b = s.people.cousin.bodyScreen;
  const left = Math.max(a.x, b.x), right = Math.min(a.x + a.w, b.x + b.w), top = Math.max(a.y, b.y), bottom = Math.min(a.y + a.h, b.y + b.h);
  check(left < right && top < bottom, '起步身體框確實重疊，具備前後選取反例');
  if (left < right && top < bottom) {
    const front = s.people.cousin.y >= s.people.hero.y ? 'cousin' : 'hero';
    await page.mouse.click((left + right) / 2, (top + bottom) / 2);
    check((await snap(page)).selected === front, `重疊點選前面的人（${front}）`);
  }
  const tick = s.tick, cam = s.cam;
  await page.mouse.move(400, 220); await page.mouse.down(); await page.mouse.move(450, 250); await page.mouse.up();
  await page.mouse.wheel(0, -100); await page.waitForTimeout(200);
  s = await snap(page);
  check(s.tick === tick && s.cam.x !== cam.x && s.cam.zoom > cam.zoom, '暫停時滑鼠平移／縮放只改鏡頭，不進工作');
  checkSheet(s, 'hero', '主角下山'); checkSheet(s, 'cousin', '熟手下山');
  await page.keyboard.press('0');
  await select(page, 'hero');
  check((await page.locator('#panel').innerText()).includes('60.0') && (await page.locator('#panel').innerText()).includes('40.0'), '主角面板顯示實際空桶60／負重40');
  await select(page, 'cousin');
  check((await page.locator('#panel').innerText()).includes('74.4') && (await page.locator('#panel').innerText()).includes('52.0'), '熟手面板顯示實際空桶74.4／負重52與起始來源');
  await page.click('#play'); await page.keyboard.press('4');
  await wait(page, () => window.demo.snapshot().tick >= 480);
  await page.click('#play');
  s = await snap(page);
  check(s.people.hero.phase === 'down' && s.people.cousin.phase === 'down' && s.people.cousin.phaseProgress > s.people.hero.phaseProgress, '同一世界時間，熟手在同路下山走得更遠');
  await page.screenshot({ path: `${OUT}/wide-two-workers.png` });

  await menu(page, 'hero');
  s = await snap(page);
  check(s.menuPerson === 'hero' && !s.playing, '選主角開選單，對象正確且世界暫停');
  const paused = s.tick;
  await page.waitForTimeout(400);
  check((await snap(page)).tick === paused, '選單期間兩人工作／成長零進度');
  await page.keyboard.press('Enter');
  s = await snap(page);
  check(s.people.hero.restOrder && !s.people.cousin.restOrder && !s.playing, '手動暫停時下主角休息令，只改該人，關選單仍保持暫停');
  await page.screenshot({ path: `${OUT}/wide-pending.png` });
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.resting);
  s = await snap(page);
  check(s.people.hero.trips === 1 && s.people.hero.level === 2 && s.people.hero.mode === 'idle', '主角倒完第一趟才入帳／升Lv2／停工');
  const first = s.people.hero.lastTrip.seconds, cousinTrips = s.people.cousin.trips;
  await wait(page, (n) => window.demo.snapshot().people.cousin.trips > n, cousinTrips);
  s = await snap(page);
  check(s.people.hero.trips === 1 && s.people.hero.resting && s.people.cousin.trips > cousinTrips, '主角停工時熟手仍繼續完成並入帳');
  await page.screenshot({ path: `${OUT}/wide-independent-rest.png` });
  await page.click('#panel [data-cmd="start"]');
  await wait(page, () => window.demo.snapshot().people.hero.trips >= 2);
  await page.click('#play');
  s = await snap(page);
  check(s.people.hero.lastTrip.level === 2 && s.people.hero.lastTrip.seconds < first, `主角再出發用Lv2，下一趟 ${s.people.hero.lastTrip.seconds.toFixed(2)}s < 初始 ${first.toFixed(2)}s`);
  checkSheet(s, 'cousin', '熟手後續工作');
  check(s.people.cousin.requestedAction !== 'walkGrown' || s.people.cousin.fallback, '熟手缺成長步態時如實fallback，不新增素材');
  check(s.vat + s.inFlight <= s.vatCapacity, '畫面水量加在途沒有超出水缸容量');
  results.wide = s;
  await page.screenshot({ path: `${OUT}/wide-growth.png` });
  check(await page.locator('.legacy-link').getAttribute('href') === '../../../viewer/', '生活版保留舊viewer／存檔入口');
  check((await page.locator('.hud').innerText()).includes('尚未存檔'), '介面明示生活版尚未存檔');
  await page.click('#reset'); await page.waitForTimeout(100);
  s = await snap(page);
  check(s.people.hero.level === 1 && s.people.cousin.level === 3 && Object.values(s.people).every((p) => p.trips === 0 && !p.restOrder && !p.resting) && s.inFlight === 0 && s.tick === 0, '暫停重來清除兩人進度／意圖／在途預約');
  check(W.errors.length === 0, `桌面console零錯誤／警告${W.errors.length ? '：' + W.errors.join(' | ') : ''}`);
  results.wideConsole = W.errors;
  await W.context.close();

  const N = await open(browser, { width: 390, height: 780 }), np = N.page;
  await select(np, 'cousin');
  await np.keyboard.press('4');
  await wait(np, () => window.demo.snapshot().tick >= 480);
  await np.click('#play'); await np.waitForTimeout(800);
  s = await snap(np);
  checkSheet(s, 'cousin', '390px／DPR2熟手');
  const boxes = { hud: await rect(np, '.hud'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster') };
  check(boxes.panel && !overlap(boxes.panel, boxes.hud) && !overlap(boxes.panel, boxes.roster), '390px熟手面板、HUD與兩人名冊互不遮擋');
  check(s.people.cousin.screen.y > boxes.hud.b && s.people.cousin.screen.y < boxes.panel.y, '390px選熟手後鏡頭跟隨熟手，人物可見');
  check(await np.locator('#roster [data-person="hero"]').isVisible() && await np.locator('#roster [data-person="cousin"]').isVisible(), '390px選人後兩張卡仍可切換');
  await np.screenshot({ path: `${OUT}/narrow-cousin.png` });
  await select(np, 'hero'); await np.waitForTimeout(800);
  s = await snap(np);
  const target = s.people.cousin.tapScreen;
  await np.mouse.click(target.x + 1, target.y + target.h / 2);
  check((await snap(np)).selected === 'cousin', '390px平移鏡頭後仍能從身體外44px範圍選熟手');
  await np.waitForTimeout(800);
  await np.evaluate(() => document.activeElement.blur()); await np.keyboard.press('Enter');
  s = await snap(np);
  check(s.menuPerson === 'cousin' && !s.playing, '390px Enter對選中的熟手開選單');
  check(!overlap(await rect(np, '#menu'), await rect(np, '#roster')) && !overlap(await rect(np, '#menu'), await rect(np, '#banner')), '390px選單不遮名冊／暫停橫幅');
  await np.screenshot({ path: `${OUT}/narrow-menu.png` });
  await np.keyboard.press('Tab');
  check(await np.evaluate(() => !!document.activeElement.closest('.menu')), '390px選單Tab焦點留在選單');
  await np.keyboard.press('Enter');
  s = await snap(np);
  check(s.people.cousin.restOrder && !s.people.hero.restOrder, '390px對熟手下本趟後休息，只改熟手意圖');
  await np.click('#play');
  await wait(np, () => window.demo.snapshot().people.cousin.resting);
  s = await snap(np);
  check(s.people.cousin.trips === 1 && s.people.hero.mode === 'carry', '390px熟手倒完停工，主角仍在工作');
  results.narrow = s;
  await np.screenshot({ path: `${OUT}/narrow-rest.png` });
  check(N.errors.length === 0, `390px console零錯誤／警告${N.errors.length ? '：' + N.errors.join(' | ') : ''}`);
  results.narrowConsole = N.errors;
  await N.context.close(); await browser.close();
  note(fails.length ? `FAIL ${fails.length}項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1) + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n'); process.exit(1); });
