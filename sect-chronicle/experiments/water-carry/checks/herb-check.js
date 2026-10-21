#!/usr/bin/env node
// LP-03：同一主入口的採藥與工作切換；只用滑鼠／鍵盤下令，唯讀 snapshot 觀測模型。
// 先在 repo 根目錄 python3 -m http.server 8802 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/herb-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8802/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 90000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
async function open(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width <= 640 ? 2 : 1 });
  const page = await context.newPage(), errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(ENTRY_URL);
  await wait(page, () => window.demo && window.demo.snapshot().frames > 3);
  return { context, page, errors };
}
const select = (page, id) => page.click(`#roster [data-person="${id}"]`);
const cmd = (page, c) => page.click(`#panel [data-cmd="${c}"]`);
const panel = (page) => page.locator('#panel').innerText();

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(s.people.hero.job === 'water' && s.people.cousin.job === 'water' && s.inFlight === 2 && s.herbs === 0, '新局兩人自行挑水，藥架 0');

  // 暫停中下令：只改意圖，零進度
  await page.click('#play');
  await select(page, 'hero');
  const t0 = (await snap(page)).tick;
  await cmd(page, 'work:herb');
  s = await snap(page);
  check(s.people.hero.pending === 'herb' && s.people.hero.job === 'water' && s.people.hero.mode === 'carry' && s.herbInFlight === 0, '暫停時下「交付後改採藥」：只記待執行，當趟仍挑水，不預約藥架');
  check((await panel(page)).includes('交付後改去採藥'), '面板顯示待執行「交付後改去採藥」');
  await cmd(page, 'restAfterTrip');
  check((await snap(page)).people.hero.pending === 'rest', '再下本趟後休息：只保留最新意圖');
  await cmd(page, 'work:water');
  check((await snap(page)).people.hero.pending === null, '改回當趟工作＝取消待執行');
  await cmd(page, 'work:herb');
  await page.waitForTimeout(400);
  s = await snap(page);
  check(s.tick === t0 && s.people.hero.pending === 'herb', '暫停期間多次改令，世界零進度');
  await page.screenshot({ path: `${OUT}/desk-1-pending-herb.png` });

  // 播放：當趟挑水交付後才去採藥；熟手繼續挑水
  await page.click('#play'); await page.keyboard.press('4');
  await wait(page, () => window.demo.snapshot().people.hero.job === 'herb');
  s = await snap(page);
  check(s.people.hero.trips === 1 && s.people.hero.done.water === 1 && s.people.hero.mode === 'carry' && s.people.hero.phase === 'herbOut' && s.herbInFlight === 1,
    '主角挑完第一擔才改採藥，同一步出發並預約藥架');
  check(s.people.cousin.job === 'water' && s.people.cousin.mode === 'carry', '熟手同時繼續挑水');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.phase === 'herbOut' && h.phaseProgress > 0.55; });
  await page.click('#play'); s = await snap(page);
  check(s.people.hero.x > 1150 && s.people.hero.y > 600, `主角沿東側小路往藥圃（${s.people.hero.x.toFixed(0)}, ${s.people.hero.y.toFixed(0)}）`);
  await page.screenshot({ path: `${OUT}/desk-2-herb-out.png` });
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.phase === 'herbGather');
  await page.waitForTimeout(500); await page.click('#play');
  s = await snap(page);
  check(s.people.hero.action === 'herbGather' && !s.people.hero.fallback, '採集用蹲採動作（不拿桶）');
  await page.screenshot({ path: `${OUT}/desk-3-gather.png` });
  await page.click('#play');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.phase === 'herbBack' && h.phaseProgress > 0.3; });
  await page.click('#play'); s = await snap(page);
  check(s.people.hero.action === 'herbWalkBack' && s.herbs === 0, '背藥回道館，交付前藥架不入帳');
  await page.screenshot({ path: `${OUT}/desk-4-herb-back.png` });
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.done.herb === 1);
  s = await snap(page);
  check(s.herbs === 1 && s.herbInFlight === 1 && s.people.hero.mode === 'carry' && s.people.hero.job === 'herb', '交藥入帳一次，主角自己接下一趟採藥');
  const t1 = s.people.hero.lastTrip;

  // 成長：再兩趟（Lv2 需 2 趟），之後同路線更快
  await wait(page, () => window.demo.snapshot().people.hero.done.herb === 2);
  s = await snap(page);
  const t2 = s.people.hero.lastTrip;
  check(t2.job === 'herb' && t2.level === 2 && s.people.hero.level === 3, `第二趟採藥 Lv2 完成後升 Lv3`);
  await wait(page, () => window.demo.snapshot().people.hero.done.herb === 3);
  s = await snap(page);
  const t3 = s.people.hero.lastTrip;
  check(t3.level === 3 && t3.seconds < t2.seconds, `同一採藥路線下一趟真的更快：Lv2 ${t2.seconds.toFixed(2)}s → Lv3 ${t3.seconds.toFixed(2)}s（第一趟 ${t1.seconds.toFixed(2)}s）`);
  await page.click('#play');
  const p = await panel(page);
  check(p.includes('採藥') && p.includes('收穫') && p.includes('採藥 3 份') && p.includes('本趟採藥') && p.includes('下趟採藥'), '面板分清目前工作、收穫、本趟／下趟速度');
  await page.screenshot({ path: `${OUT}/desk-5-grown-panel.png` });

  // 切回挑水，再本趟後休息
  await cmd(page, 'work:water');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.job === 'water');
  s = await snap(page);
  check(s.people.hero.done.herb === 4 && s.people.hero.mode === 'carry' && s.people.hero.phase === 'down' && s.herbInFlight === 0, '採藥當趟交完才切回挑水，藥在途歸零');
  await cmd(page, 'restAfterTrip');
  await wait(page, () => window.demo.snapshot().people.hero.resting);
  s = await snap(page);
  check(s.people.hero.mode === 'idle' && !s.people.cousin.resting && s.people.cousin.pending === null && s.people.cousin.job === 'water',
    `本趟後休息只停主角，熟手仍在挑水工作（${s.people.cousin.status}，水缸 ${s.vat}／${s.vatCapacity}）`);
  await page.click('#play');
  await page.screenshot({ path: `${OUT}/desk-6-rest.png` });
  // 重來清意圖、藥架、預約
  await page.click('#reset');
  s = await snap(page);
  check(s.herbs === 0 && s.herbInFlight === 0 && Object.values(s.people).every((x) => x.job === 'water' && x.pending === null && !x.resting && x.trips === 0), '重來清除工作、意圖、藥架與預約');
  check(W.errors.length === 0, `桌面 console 零錯誤／警告${W.errors.length ? '：' + W.errors.join(' | ') : ''}`);
  await W.context.close();

  // 390px：選熟手、改採藥
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await select(np, 'cousin'); await np.waitForTimeout(600);
  await np.click('#panel [data-cmd="work:herb"]');
  s = await snap(np);
  check(s.people.cousin.pending === 'herb' && s.people.hero.pending === null, '390px 對熟手下「交付後改採藥」只改熟手');
  await np.waitForTimeout(300); // 名冊卡多一行待執行，等版面量測更新
  const boxes = { hud: await rect(np, '.hud'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster') };
  check(boxes.panel && !overlap(boxes.panel, boxes.hud) && !overlap(boxes.panel, boxes.roster), '390px 面板、HUD、名冊互不遮擋');
  await np.screenshot({ path: `${OUT}/narrow-1-pending.png` });
  await np.keyboard.press('4');
  await wait(np, () => { const c = window.demo.snapshot().people.cousin; return c.phase === 'herbOut' && c.phaseProgress > 0.5; });
  await np.click('#play');
  s = await snap(np);
  check(s.people.cousin.job === 'herb' && s.people.hero.job === 'water', '390px 熟手改去採藥，主角仍挑水');
  check(s.people.cousin.screen.y > boxes.hud.b && s.people.cousin.screen.y < (await rect(np, '#panel')).y, '390px 鏡頭跟著熟手到採藥小路');
  await np.screenshot({ path: `${OUT}/narrow-2-herb.png` });
  check(N.errors.length === 0, `390px console 零錯誤／警告${N.errors.length ? '：' + N.errors.join(' | ') : ''}`);
  await N.context.close(); await browser.close();
  note(fails.length ? `FAIL ${fails.length}項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n'); process.exit(1); });
