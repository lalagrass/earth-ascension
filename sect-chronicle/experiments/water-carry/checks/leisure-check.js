#!/usr/bin/env node
// LP-05（#208）：同一主入口的滿庫偏好休閒、自主返院、叫回待命／恢復自主與停工；只用滑鼠／鍵盤下令，唯讀 snapshot 觀測模型。
// 先在 repo 根目錄 python3 -m http.server 8802 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/leisure-check');
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
const MODES = ['toFun', 'fun', 'fromFun'];
// 名冊再點同一人會取消選取，所以已選中時不再點。
const select = async (page, id) => { if ((await snap(page)).selected !== id) await page.click(`#roster [data-person="${id}"]`); };
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
  await trace(page);
  await page.keyboard.press('4');

  // 1. 自然跑到水缸實存滿：兩人各去喜好處，動作不同
  await wait(page, () => Object.values(window.demo.snapshot().people).every((p) => p.mode === 'fun'), null, 240000);
  await page.click('#play');
  await select(page, 'hero');
  let s = await snap(page), p = await panel(page);
  check(s.vat === s.vatCapacity && s.inFlight === 0, `水缸實存滿 ${s.vat}／${s.vatCapacity}、在途 0 才去休閒（${s.seconds.toFixed(0)} 秒）`);
  check(s.people.hero.action === 'gaze' && !s.people.hero.fallback && s.people.cousin.action === 'stretch' && !s.people.cousin.fallback, `兩種不同活動姿勢：主角 ${s.people.hero.action}、熟手 ${s.people.cousin.action}（不是同一待機加文字）`);
  check(p.includes('偏好：看山') && p.includes('閒暇：看山（原工作：挑水）') && p.includes('來源：閒暇') && p.includes('有空位就回去挑水') && p.includes('不回精力'), '點主角：面板寫偏好、閒暇活動、原工作與「有空位就回去；不回精力」');
  check(p.includes('叫回工作'), '面板有「叫回工作」');
  await page.screenshot({ path: `${OUT}/desk-1-leisure.png` });
  await page.click('#play');

  // 2. 用水後水缸有空位：輪到的人自己回院出發，另一人留在活動點
  await wait(page, () => Object.values(window.demo.snapshot().people).some((p) => p.mode === 'fromFun' && !p.recall), null, 120000);
  s = await snap(page);
  const back = Object.values(s.people).find((x) => x.mode === 'fromFun'), other = Object.values(s.people).find((x) => x !== back);
  check(s.vat === s.vatCapacity - 1 && other.mode === 'fun', `用掉一擔（${s.vat}／${s.vatCapacity}）：${back.id} 自己返院，${other.id} 繼續 ${other.status}（一個空位只回一人）`);
  await wait(page, (id) => window.demo.snapshot().people[id].mode === 'carry', back.id);
  s = await snap(page);
  check(s.people[back.id].job === 'water' && s.inFlight === 1, `${back.id} 到院重查後出發挑水、預約 1`);

  // 3. 主角在活動點時暫停叫回：位置／精力不動；返院後滿庫待命，同伴繼續生活
  await wait(page, () => { const v = window.demo.snapshot(); return v.people.hero.mode === 'fun' && v.vat === v.vatCapacity && v.inFlight === 0; }, null, 240000);
  await page.click('#play');
  await select(page, 'hero');
  const h0 = (await snap(page)).people.hero, t0 = (await snap(page)).tick;
  await cmd(page, 'recall');
  s = await snap(page);
  check(s.tick === t0 && s.people.hero.x === h0.x && s.people.hero.y === h0.y && s.people.hero.energy === h0.energy && s.people.hero.recall, '暫停時叫回：只記意圖，tick／位置／精力不動');
  await page.click('#play');
  await wait(page, () => { const h = window.demo.snapshot().people.hero; return h.mode === 'idle' && h.recall; });
  await page.click('#play');
  s = await snap(page); p = await panel(page);
  check(s.people.hero.status.includes('玩家叫回，等水缸空位') && p.includes('恢復自主') && p.includes('完成返院後的一趟才解除'), `返院後滿庫待命：「${s.people.hero.status}」，面板說明如何解除`);
  check(MODES.includes(s.people.cousin.mode) || s.people.cousin.mode === 'carry', `同伴照常生活（${s.people.cousin.status}）`);
  await page.screenshot({ path: `${OUT}/desk-2-recalled.png` });

  // 4. 改可用工作（採藥）：叫回中出發，完成一趟才解除
  await cmd(page, 'work:herb');
  s = await snap(page);
  check(s.people.hero.job === 'herb' && s.people.hero.recall, '改採藥：保留叫回');
  await page.click('#play');
  const trips = s.people.hero.trips;
  await wait(page, (n) => window.demo.snapshot().people.hero.trips > n, trips);
  s = await snap(page);
  check(!s.people.hero.recall && s.people.hero.done.herb === 1, '返院後新開始的採藥一趟完成：叫回解除');

  // 5. 熟手：叫回→待命→恢復自主（滿庫再去活動）；之後活動中停工→返院→座位，回滿仍停；明確開始才解除
  await wait(page, () => { const v = window.demo.snapshot(); return v.people.cousin.mode === 'fun' && v.vat === v.vatCapacity && v.inFlight === 0; }, null, 240000);
  await page.click('#play');
  await select(page, 'cousin');
  await cmd(page, 'recall');
  await page.click('#play');
  await wait(page, () => { const c = window.demo.snapshot().people.cousin; return c.mode === 'idle' && c.recall; });
  await page.click('#play');
  await cmd(page, 'resume');
  s = await snap(page);
  check(!s.people.cousin.recall && s.people.cousin.mode === 'idle', '恢復自主：只清叫回，暫停中不移動');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.cousin.mode === 'toFun');
  check(true, '恢復自主後滿庫再去舒展筋骨');
  await wait(page, () => window.demo.snapshot().people.cousin.mode === 'fun');
  await page.click('#play');
  await cmd(page, 'restAfterTrip');
  p = await panel(page);
  check(p.includes('回院中後去座位停工') && !p.includes('恢復自主'), '活動中停工：下一步寫「回院中後去座位停工」，沒有恢復自主可解停工');
  await page.click('#play');
  await wait(page, () => window.demo.snapshot().people.cousin.mode === 'seated');
  check(true, '停工：走完返院再去石凳坐下（不從活動點跳過去）');
  await wait(page, () => window.demo.snapshot().people.cousin.energy >= 100, null, 240000);
  await page.waitForTimeout(1500);
  await page.click('#play');
  s = await snap(page);
  check(s.people.cousin.mode === 'seated' && s.people.cousin.resting, '回滿 100 仍停工');
  await page.click('#panel .pending [data-cmd="start"]');
  s = await snap(page);
  check(s.people.cousin.mode === 'back' && !s.people.cousin.resting, '明確開始才解除停工');
  await page.click('#play');
  const tr = await page.evaluate(() => window.__trace);
  check(tr.max <= 84 / 60 + 0.01 && !tr.still, `整段逐幀連續：每 tick 最大位移 ${tr.max.toFixed(3)}（上限 1.40）${tr.at ? ' @' + JSON.stringify(tr.at) : ''}；同 tick 位置／精力不變${tr.still ? ' 失敗@' + JSON.stringify(tr.still) : ''}`);

  // 6. 重來清狀態
  await page.click('#reset');
  s = await snap(page);
  check(s.herbs === 0 && s.vat === 3 && s.inFlight === 0 && s.herbInFlight === 0 && Object.values(s.people).every((x) => x.energy === 100 && !x.recall && !x.leisure && !x.funLeg && x.rest === null && x.pending === null && x.job === 'water'),
    '重來：清休閒路程／叫回／停工／意圖／預約，精力 100、水 3／8、藥 0／8');
  check(W.errors.length === 0, `桌面 console 零錯誤／警告${W.errors.length ? '：' + W.errors.join(' | ') : ''}`);
  await W.context.close();

  // 7. 390px：選人、看原因、叫回
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.keyboard.press('4');
  await wait(np, () => window.demo.snapshot().people.hero.mode === 'fun', null, 240000);
  await np.click('#play');
  await select(np, 'hero'); await np.waitForTimeout(500);
  p = await panel(np);
  check(p.includes('閒暇：看山') && p.includes('叫回工作') && p.includes('下一步'), '390px 選主角看得到閒暇活動、下一步與叫回');
  const boxes = { hud: await rect(np, '.hud'), panel: await rect(np, '#panel'), roster: await rect(np, '#roster') };
  check(boxes.panel && !overlap(boxes.panel, boxes.hud) && !overlap(boxes.panel, boxes.roster), '390px 面板、HUD、名冊互不遮擋');
  s = await snap(np);
  check(s.people.hero.screen.y > boxes.hud.b && s.people.hero.screen.y < boxes.panel.y, '390px 鏡頭跟著主角到觀景石');
  await np.screenshot({ path: `${OUT}/narrow-1-gaze.png` });
  await np.click('#panel [data-cmd="recall"]');
  await select(np, 'cousin'); await np.waitForTimeout(400);
  s = await snap(np);
  check(s.people.hero.recall && !s.people.cousin.recall && s.selected === 'cousin', '390px 叫回主角只改主角，再點名冊選熟手');
  await np.screenshot({ path: `${OUT}/narrow-2-cousin.png` });
  check(N.errors.length === 0, `390px console 零錯誤／警告${N.errors.length ? '：' + N.errors.join(' | ') : ''}`);
  await N.context.close(); await browser.close();
  note(fails.length ? `FAIL ${fails.length}項：${fails.join('；')}` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { note('FAIL', e.stack || String(e)); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n'); process.exit(1); });
