#!/usr/bin/env node
// LP-04（#205）：同一主入口的精力、可見休息與自主續工；只用滑鼠／鍵盤下令，唯讀 snapshot 觀測模型。
// 先在 repo 根目錄 python3 -m http.server 8802 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/rest-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8802/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 120000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
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
const paused = async (page, fn) => { await page.click('#play'); const r = await fn(); await page.click('#play'); return r; };
// 每畫面幀記錄兩人位置與精力；同 tick 內位置或精力變了、或每 tick 位移超過最快空手速度都算失敗。
const trace = (page) => page.evaluate(() => {
  const tr = window.__trace = { max: 0, at: null, last: null, still: null };
  const loop = () => {
    const s = window.demo.snapshot();
    for (const id of Object.keys(s.people)) {
      const p = s.people[id], l = tr.last && tr.last[id];
      if (l && s.tick > l.tick) {
        const d = Math.hypot(p.x - l.x, p.y - l.y) / (s.tick - l.tick);
        if (d > tr.max) { tr.max = d; tr.at = { id, tick: s.tick, mode: p.mode, phase: p.phase }; }
      }
      if (l && s.tick === l.tick && (p.x !== l.x || p.y !== l.y || p.energy !== l.e)) tr.still = { id, tick: s.tick, mode: p.mode };
    }
    tr.last = Object.fromEntries(Object.entries(s.people).map(([id, p]) => [id, { x: p.x, y: p.y, e: p.energy, tick: s.tick }]));
    requestAnimationFrame(loop);
  };
  loop();
});

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(Object.values(s.people).every((p) => p.energy > 99 && p.rest === null && p.job === 'water') && s.inFlight === 2, `新局兩人精力 100 起、自行挑水（載入後已走 ${s.tick} tick）`);
  await trace(page);

  // 1. 4× 看主角交付後走去恢復，熟手繼續工作
  await page.keyboard.press('4');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.mode === 'toSeat' && h.restLeg.k > 0.5; });
  s = await paused(page, () => snap(page));
  check(s.people.hero.trips === 2 && (s.people.hero.mode !== 'toSeat' || s.people.hero.energy <= 30) && s.people.hero.rest === 'auto' && s.inFlight === 1, `主角兩趟後精力 ${s.people.hero.energy.toFixed(1)}≤30，交付後走去休息，不占預約（${s.people.hero.mode} 趟數 ${s.people.hero.trips} 來源 ${s.people.hero.rest} 在途 ${s.inFlight}）`);
  check(s.people.cousin.mode === 'carry', `熟手繼續工作（${s.people.cousin.status}）`);
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'seated');
  await page.click('#play');
  await select(page, 'hero');
  s = await snap(page);
  let p = await panel(page);
  check(p.includes('精力') && p.includes('來源：自主恢復') && p.includes('原因：精力') && p.includes('下一步：恢復至 80 後返回挑水'), '點主角：面板顯示精力、來源自主恢復、原因與下一步');
  check(s.people.hero.action === 'herbGather' && s.people.hero.fallback && p.includes('暫用蹲姿'), '主角坐下（無坐姿幀，暫用蹲姿並標明）');
  await page.screenshot({ path: `${OUT}/desk-1-hero-seated.png` });

  // 2. 暫停中改採藥：只改保留工作，tick／位置／精力不動
  const r0 = s.people.hero, t0 = s.tick;
  await cmd(page, 'work:herb');
  s = await snap(page);
  check(s.tick === t0 && s.people.hero.x === r0.x && s.people.hero.y === r0.y && s.people.hero.energy === r0.energy && s.people.hero.job === 'herb' && s.people.hero.rest === 'auto',
    '暫停時恢復中改採藥：工作改為採藥，tick、位置、精力不動，仍需恢復到 80');
  check((await panel(page)).includes('恢復至 80 後返回採藥'), '面板下一步改為「恢復至 80 後返回採藥」');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'back');
  s = await snap(page);
  check(s.people.hero.energy >= 80 && s.people.hero.energy < 80.2, `恢復到 80 自己起身返院（${s.people.hero.energy.toFixed(2)}）`);
  await wait(page, () => window.demo.snapshot().people.hero.mode === 'carry');
  s = await snap(page);
  check(s.people.hero.job === 'herb' && s.people.hero.phase === 'herbOut' && s.herbInFlight === 1 && s.people.hero.phaseProgress < 0.2, `回院中端點後按最新工作出發採藥（去程 ${(s.people.hero.phaseProgress * 100).toFixed(0)}%）`);

  // 3. 熟手自主恢復時明確叫停：回滿仍停工；明確開始後返院
  await wait(page, () => { const c = window.demo.snapshot().people.cousin; return c.mode === 'toSeat' || c.mode === 'seated'; });
  await page.click('#play');
  await select(page, 'cousin');
  s = await snap(page);
  check(s.people.cousin.rest === 'auto', `熟手精力低自主恢復（${s.people.cousin.energy.toFixed(1)}）`);
  await cmd(page, 'restAfterTrip');
  s = await snap(page);
  check(s.people.cousin.rest === 'manual' && s.people.cousin.resting, '對自主恢復者叫停：來源轉為玩家停工');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.cousin.energy >= 100);
  await page.waitForTimeout(1500);
  await page.click('#play');
  s = await snap(page);
  p = await panel(page);
  check(s.people.cousin.mode === 'seated' && s.people.cousin.energy === 100 && p.includes('已停工，需下令開始') && p.includes('來源：玩家停工'), '回滿 100 仍坐著停工，面板寫「已停工，需下令開始」');
  await page.screenshot({ path: `${OUT}/desk-2-cousin-stopped.png` });
  await page.click('#panel .pending [data-cmd="start"]');
  s = await snap(page);
  check(s.people.cousin.mode === 'back' && !s.people.cousin.resting, '明確開始：解除停工，起身返院');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.cousin.mode === 'carry');
  s = await snap(page);
  check(s.people.cousin.job === 'water', '熟手返院後繼續原工作挑水');
  const tr = await page.evaluate(() => window.__trace);
  check(tr.max <= 84 / 60 + 0.01 && !tr.still, `整段逐幀連續：每 tick 最大位移 ${tr.max.toFixed(3)}（上限 1.40）${tr.at ? ' @' + JSON.stringify(tr.at) : ''}；同 tick 位置／精力不變${tr.still ? ' 失敗@' + JSON.stringify(tr.still) : ''}`);
  await page.click('#play');
  await page.screenshot({ path: `${OUT}/desk-3-back-to-work.png` });

  // 4. 重來清狀態
  await page.click('#reset');
  s = await snap(page);
  check(s.herbs === 0 && s.vat === 3 && s.inFlight === 0 && s.herbInFlight === 0 && Object.values(s.people).every((x) => x.energy === 100 && x.rest === null && !x.restLeg && x.pending === null && x.job === 'water' && x.mode === 'idle'),
    '重來：精力 100、清休息來源／路程／意圖／預約，水 3／8、藥 0／8');
  check(W.errors.length === 0, `桌面 console 零錯誤／警告${W.errors.length ? '：' + W.errors.join(' | ') : ''}`);
  await W.context.close();

  // 5. 390px：選兩人、看精力／原因、下令
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.keyboard.press('4');
  await wait(np, () => window.demo.snapshot().people.hero.mode === 'seated');
  await np.click('#play');
  await select(np, 'hero'); await np.waitForTimeout(500);
  p = await panel(np);
  check(p.includes('精力') && p.includes('自主恢復') && p.includes('下一步'), '390px 選主角看得到精力、來源與下一步');
  const boxes = { hud: await rect(np, '.hud'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster') };
  check(boxes.panel && !overlap(boxes.panel, boxes.hud) && !overlap(boxes.panel, boxes.roster), '390px 面板、HUD、名冊互不遮擋');
  s = await snap(np);
  check(s.people.hero.screen.y > boxes.hud.b && s.people.hero.screen.y < boxes.panel.y, '390px 鏡頭跟著主角到石凳');
  await np.screenshot({ path: `${OUT}/narrow-1-seated.png` });
  await np.click('#panel [data-cmd="restAfterTrip"]');
  await select(np, 'cousin'); await np.waitForTimeout(400);
  s = await snap(np);
  check(s.people.hero.rest === 'manual' && s.people.cousin.rest !== 'manual' && s.selected === 'cousin', '390px 對主角叫停只改主角，再點名冊選熟手');
  p = await panel(np);
  check(p.includes('精力') && p.includes('下一步'), '390px 熟手面板同樣有精力與下一步');
  await np.screenshot({ path: `${OUT}/narrow-2-cousin.png` });
  check(N.errors.length === 0, `390px console 零錯誤／警告${N.errors.length ? '：' + N.errors.join(' | ') : ''}`);
  await N.context.close(); await browser.close();
  note(fails.length ? `FAIL ${fails.length}項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n'); process.exit(1); });
