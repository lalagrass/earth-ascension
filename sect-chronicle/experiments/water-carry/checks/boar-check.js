#!/usr/bin/env node
// LP-06（#213）：同一主入口的野豬自然來訪／未處理逃離／棲地恢復，與一次真操作派遣驅離；只用滑鼠／鍵盤下令，唯讀 snapshot 觀測。
// 先在 repo 根目錄 python3 -m http.server 8812 --directory sect-chronicle；無 X 時用 xvfb-run。
// PLAYWRIGHT_PATH、CHROMIUM 可指定本機套件／瀏覽器；DEMO_URL 預設主入口。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/boar-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8812/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 180000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
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
const paused = async (page, fn) => { await page.click('#play'); const r = await fn(); await page.click('#play'); return r; };
// 每畫面幀記錄兩人與野豬位置：每 tick 位移超過各自上限、或同 tick 內位置變了都算失敗。
const trace = (page) => page.evaluate(() => {
  const tr = window.__trace = { max: 0, boarMax: 0, at: null, still: null, last: null };
  const loop = () => {
    const s = window.demo.snapshot(), l = tr.last;
    if (l && s.tick > l.tick) {
      for (const id of Object.keys(s.people)) {
        const p = s.people[id], d = Math.hypot(p.x - l[id].x, p.y - l[id].y) / (s.tick - l.tick);
        if (d > tr.max) { tr.max = d; tr.at = { id, tick: s.tick, mode: p.mode }; }
      }
      if (s.boar.visible && l.boar.visible) tr.boarMax = Math.max(tr.boarMax, Math.hypot(s.boar.x - l.boar.x, s.boar.y - l.boar.y) / (s.tick - l.tick));
    }
    if (l && s.tick === l.tick && Object.keys(s.people).some((id) => s.people[id].x !== l[id].x || s.people[id].y !== l[id].y)) tr.still = { tick: s.tick };
    tr.last = { tick: s.tick, boar: { x: s.boar.x, y: s.boar.y, visible: s.boar.visible }, ...Object.fromEntries(Object.entries(s.people).map(([id, p]) => [id, { x: p.x, y: p.y }])) };
    requestAnimationFrame(loop);
  };
  loop();
});

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;
  let s = await snap(page);
  check(s.boar.mode === 'habitat' && s.boar.energy >= 60 && s.boar.threat === 0 && s.boar.marks === 0 && !s.boar.visible, `新局野豬在棲地（畫面外）E${s.boar.energy.toFixed(1)}／威脅 0／損痕 0`);
  let card = await page.locator('#boar').innerText();
  check(card.includes('棲地恢復') && card.includes('精力未到 80') && !/倒數|下次襲擊/.test(card), '野豬卡說明為何留在棲地，沒有襲擊倒數');
  await trace(page);
  await page.keyboard.press('4');

  // 1. 自然來訪：沒有注入，等精力恢復到 80
  await wait(page, () => window.demo.snapshot().boar.mode === 'sniff');
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-1-sniff.png` }); return snap(page); });
  check(s.boar.visible && s.boar.visit === 1 && s.boar.x > 100 && s.boar.x < 200, `第一次自然來訪：遊戲 ${s.seconds.toFixed(1)} 秒在林緣嗅探（x=${s.boar.x.toFixed(0)}），E${s.boar.energy.toFixed(1)}`);
  await wait(page, () => window.demo.snapshot().boar.hits >= 1);
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-2-hit.png` }); return snap(page); });
  card = await page.locator('#boar').innerText();
  check(s.boar.marks === 1 && card.includes('護欄損痕 1／3') && card.includes('不是血量'), `撞到護欄：損痕 1／3，卡上標明精力不是血量（E${s.boar.energy.toFixed(1)}）`);

  // 2. 不處理：累了自己逃，回棲地才恢復
  await wait(page, () => window.demo.snapshot().boar.mode === 'flee');
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-3-flee-tired.png` }); return snap(page); });
  check(/累了/.test(s.boar.why) && s.boar.energy <= 30 && s.boar.hits >= 2, `沒人處理：撞 ${s.boar.hits} 下後 ${s.boar.why}，逃回棲地`);
  await wait(page, () => window.demo.snapshot().boar.mode === 'habitat');
  s = await snap(page);
  card = await page.locator('#boar').innerText();
  check(!s.boar.visible && card.includes('精力未到 80') && card.includes('上次：撞了'), `到棲地才消失並恢復；卡片說明留在棲地的原因與上次經過（E${s.boar.energy.toFixed(1)}）`);
  await page.screenshot({ path: `${OUT}/desk-4-habitat.png` });
  const workTrips = Object.values(s.people).reduce((n, p) => n + p.trips, 0);
  check(workTrips >= 2 && Object.values(s.people).every((p) => p.trips >= 1), `野豬來去期間兩人照常工作（共 ${workTrips} 趟）`);

  // 3. 第二次來訪：選一人（優先不在挑水／採藥途中的人）點野豬卡的派遣按鈕
  await wait(page, () => window.demo.snapshot().boar.mode === 'out', null, 240000);
  s = await snap(page);
  const free = Object.values(s.people).find((p) => p.mode !== 'carry') || s.people.cousin;
  const who = free.id;
  await page.click(`#roster [data-person="${who}"]`);
  const before = await snap(page);
  await page.click('#boar [data-cmd="guard"]');
  s = await snap(page);
  const toast = await page.locator('#toast').innerText();
  check(s.boar.assignee === who && /驅離/.test(toast), `第二次來訪（遊戲 ${s.seconds.toFixed(1)} 秒）：點野豬卡派${who}，當時 ${before.people[who].mode}，提示「${toast}」`);
  const other = who === 'hero' ? 'cousin' : 'hero';
  await page.click(`#roster [data-person="${other}"]`);
  const btn = page.locator('#boar [data-cmd="guard"]');
  check(await btn.isDisabled() && /已在處理/.test(await btn.getAttribute('title')), `另一人的派遣按鈕停用並說明誰在處理（${await btn.getAttribute('title')}）`);
  await page.click(`#roster [data-person="${who}"]`);
  const e0 = before.people[who].energy;
  await wait(page, (id) => ['guardWait', 'shout'].includes(window.demo.snapshot().people[id].mode) || window.demo.snapshot().people[id].guardResult, who);
  await wait(page, (id) => { const s = window.demo.snapshot(); return s.people[id].mode === 'shout' || s.people[id].guardResult; }, who);
  s = await paused(page, async () => { await page.screenshot({ path: `${OUT}/desk-5-shout.png` }); return snap(page); });
  const shouted = s.people[who].mode === 'shout';
  const p = s.people[who], gp = s.guardScreen;
  check(!shouted || Math.hypot(p.footScreen.x - gp.x, p.footScreen.y - gp.y) < 3, `${who} 真的站在防守點${shouted ? '喝止' : ''}（腳底與防守點相距 ${Math.hypot(p.footScreen.x - gp.x, p.footScreen.y - gp.y).toFixed(1)}px）`);
  await wait(page, (id) => window.demo.snapshot().people[id].guardResult, who);
  s = await snap(page);
  const res = s.people[who].guardResult.kind;
  check(res === 'success' ? s.boar.mode === 'flee' && s.boar.threat >= 80 : res === 'late', `結果：${res}；野豬 ${s.boar.label}，威脅 ${s.boar.threat.toFixed(1)}`);
  await page.screenshot({ path: `${OUT}/desk-6-result.png` });
  await wait(page, (id) => !window.demo.snapshot().people[id].guarding, who);
  s = await snap(page);
  check(Math.abs(s.people[who].energy - e0) < 1e-9 || before.people[who].mode === 'carry', `驅離往返精力不變（${e0.toFixed(1)} → ${s.people[who].energy.toFixed(1)}）`);
  const pan = await page.locator('#panel').innerText();
  check(pan.includes('驅離結果') && pan.includes('腳力'), '面板顯示驅離結果，腳力（速度）表仍在');
  await page.screenshot({ path: `${OUT}/desk-7-back.png` });
  if (res === 'success') {
    await wait(page, () => window.demo.snapshot().boar.mode === 'habitat');
    card = await page.locator('#boar').innerText();
    check(card.includes('還記得威脅'), '喝止後回到棲地：卡片說明還記得威脅才不來');
  }
  const tr = await page.evaluate(() => window.__trace);
  check(tr.max <= 84 / 60 + 1e-6 && tr.boarMax <= 120 / 60 + 1e-6 && !tr.still, `連續位置：人每 tick 最大 ${tr.max.toFixed(3)}（上限 1.4）、野豬 ${tr.boarMax.toFixed(3)}（上限 2）；同 tick 不動 ${!tr.still}`);
  check(W.errors.length === 0, `桌面 console 錯誤／警告：${W.errors.length ? W.errors.join(' | ') : '無'}`);

  // 4. 390px：只驗受影響的野豬卡、原因與派遣操作
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.keyboard.press('4');
  await wait(np, () => window.demo.snapshot().boar.active);
  await np.click('#play');
  await np.click('#roster [data-person="cousin"]');
  const nt = (await snap(np)).tick;
  const cr = await rect(np, '#boar'), pr = await rect(np, '#panel'), hr = await rect(np, '.hud');
  check(cr && cr.r <= 390 && !overlap(cr, pr) && !overlap(cr, hr), `390px：野豬卡在 HUD 下、不疊面板（${JSON.stringify(cr)}）`);
  await np.screenshot({ path: `${OUT}/narrow-1-card.png` });
  const nb = np.locator('#panel [data-cmd="guard"]');
  check(await nb.isVisible(), '390px：熟手面板有「驅離野豬」按鈕');
  await nb.click();
  s = await snap(np);
  check(s.boar.assignee === 'cousin' && s.tick === nt, `390px：暫停中點面板派熟手，tick 不動（${nt}→${s.tick}）`);
  const tr2 = await rect(np, '#toast'), br = await rect(np, '#boar'), bn = await rect(np, '#banner');
  check(!overlap(tr2, br) && !overlap(bn, br), `390px：提示與暫停橫幅不蓋野豬卡（toast ${JSON.stringify(tr2)}）`);
  await np.screenshot({ path: `${OUT}/narrow-2-dispatched.png` });
  // 熟手當時在挑水途中：交付後野豬多半已走→第二種結果（未出發即過期或到點晚到），都要回原工作
  await np.click('#play');
  await wait(np, () => window.demo.snapshot().people.cousin.guardResult);
  s = await snap(np);
  const k2 = s.people.cousin.guardResult.kind;
  check(['expired', 'late', 'success'].includes(k2) && s.boar.threat < 80 === (k2 !== 'success'), `390px：熟手派遣結果 ${k2}（野豬威脅 ${s.boar.threat.toFixed(1)}，沒有遠端命中）`);
  await np.click('#play');
  await np.screenshot({ path: `${OUT}/narrow-3-result.png` });
  const np2 = await np.locator('#panel').innerText();
  check(np2.includes('驅離結果'), `390px：面板寫出驅離結果（${(np2.match(/驅離結果：[^\n]*/) || [''])[0]}）`);
  await np.click('#play');
  await wait(np, () => { const p = window.demo.snapshot().people.cousin; return !p.guarding && (p.mode === 'carry' || p.mode === 'toSeat' || p.mode === 'idle' || p.mode === 'toFun'); });
  s = await snap(np);
  check(s.people.cousin.guardOrder == null, `390px：熟手回原生活（${s.people.cousin.status}）`);
  check(N.errors.length === 0, `390px console 錯誤／警告：${N.errors.length ? N.errors.join(' | ') : '無'}`);

  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  await browser.close();
  console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + `\nERROR ${e.stack}\n`); process.exit(2); });
