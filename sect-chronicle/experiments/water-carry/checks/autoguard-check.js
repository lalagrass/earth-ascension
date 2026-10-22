#!/usr/bin/env node
// LP-07（#218）：同一主入口的自主護院真操作。只用滑鼠點面板設定／取消，唯讀 snapshot 觀測；不改 D16 值、不注入狀態。
// 桌面：自然新局開熟手（主動）→意願→出發→結果；下一訪改開主角（受擾）→本訪碰撞後意願→晚到／過期／成功如實；再一訪熟手意願時玩家取消→本訪不搶回。
// 390px：只核新增的設定／原因／取消可用。先在 repo 根目錄 python3 -m http.server 8814 --directory sect-chronicle；無 X 時用 xvfb-run。
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = path.resolve(process.argv[2] || '/tmp/autoguard-check');
const ENTRY_URL = process.env.DEMO_URL || 'http://127.0.0.1:8814/';
fs.mkdirSync(OUT, { recursive: true });
const log = [], fails = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };
const snap = (page) => page.evaluate(() => window.demo.snapshot());
const wait = (page, fn, arg, timeout = 300000) => page.waitForFunction(fn, arg, { timeout, polling: 30 });
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetHeight) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
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
const autoText = async (page) => (await page.locator('#panel .auto').innerText()).replace(/\s+/g, ' ');
const shot = (page, name) => paused(page, async () => { await page.screenshot({ path: `${OUT}/${name}.png` }); return [await snap(page), await autoText(page)]; });

(async () => {
  const browser = await chromium.launch({ headless: false, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，非headless（${process.platform}），SwiftShader`);
  const W = await open(browser, { width: 1400, height: 820 }), page = W.page;

  // 0. 預設：兩人未允許；暫停中開熟手允許，tick 不動
  await page.click('#roster [data-person="cousin"]');
  let t = await autoText(page);
  check(/未允許/.test(t) && /尚未允許/.test(t), `熟手面板：預設未允許（${t}）`);
  let s = await snap(page);
  check(!s.people.hero.auto.allow && s.people.hero.auto.react === 'late' && s.people.cousin.auto.react === 'early', '新局兩人未允許；預選熟手主動、主角受擾');
  await page.click('#play');
  const t0 = (await snap(page)).tick;
  await page.click('#panel [data-auto="allow"]');
  s = await snap(page);
  t = await autoText(page);
  check(s.people.cousin.auto.allow && s.tick === t0 && /允許中/.test(t) && /觀察中/.test(t), `暫停中允許熟手：tick ${t0}→${s.tick}；${t}`);
  await page.click('#play');
  await page.keyboard.press('4');

  // 1. 第一訪：熟手看見野豬靠近就有意願 → 院中合法時才出發 → 結果
  await wait(page, () => window.demo.snapshot().people.cousin.auto.wanting);
  [s, t] = await shot(page, 'desk-1-want');
  check(s.boar.visit === 1 && ['sniff', 'approach', 'prep'].includes(s.boar.mode) && s.boar.assignee == null && s.people.cousin.guardOrder == null,
    `第一訪 ${s.boar.label}：熟手（${s.people.cousin.status}）有意願、未占名額；${t}`);
  // 挑水中有意願：交付前野豬可能已走（意願過期）；自然繼續跑到熟手真的自己出發的那一訪（不改值、不注入）。
  await wait(page, () => window.demo.snapshot().people.cousin.guardSrc === 'auto', null, 900000);
  [s, t] = await shot(page, 'desk-2-go');
  const went = true;
  const before = (await page.evaluate(() => window.demo.snapshot().boar.visit)) - 1;
  check(s.boar.assignee === 'cousin' && s.people.cousin.mode === 'toGuard', `第 ${s.boar.visit} 訪熟手回到院中後自己出發（唯一處理者；之前 ${before} 訪未出發）；${t}`);
  {
    await wait(page, () => ['success', 'late'].includes(window.demo.snapshot().people.cousin.auto.state));
    [s, t] = await shot(page, 'desk-3-result');
    const k = s.people.cousin.auto.state;
    check(k === 'success' ? s.boar.mode === 'flee' && s.boar.threat >= 80 : s.boar.mode !== 'prep', `第 ${s.boar.visit} 訪結果：${k}，野豬 ${s.boar.label} 威脅 ${s.boar.threat.toFixed(0)}；${t}`);
    await wait(page, () => !window.demo.snapshot().people.cousin.guarding);
    s = await snap(page);
    check(s.people.cousin.guardOrder == null, `熟手回生活：${s.people.cousin.status}`);
  }

  // 2. 下一訪：關熟手、開主角（受擾）；本訪第一撞前不動，撞後才有意願；晚到／過期如實
  await page.click('#panel [data-auto="allow"]');
  await page.click('#roster [data-person="hero"]');
  await page.click('#panel [data-auto="allow"]');
  s = await snap(page);
  check(!s.people.cousin.auto.allow && s.people.hero.auto.allow && s.people.hero.auto.react === 'late', '改由主角受擾再處理');
  const v2 = s.boar.visit + 1;
  await wait(page, (v) => { const b = window.demo.snapshot().boar; return b.visit === v && ['approach', 'prep'].includes(b.mode) && b.hits === 0; }, v2);
  s = await snap(page);
  check(!s.people.hero.auto.wanting, `第 ${v2} 訪靠近／撞前：主角不動（${s.people.hero.auto.text}）`);
  await wait(page, () => { const s = window.demo.snapshot(); return s.people.hero.auto.wanting || !s.boar.active; });
  [s, t] = await shot(page, 'desk-4-late-want');
  check(s.boar.hits >= 1 || !s.boar.active, `主角在本訪第 ${s.boar.hits} 撞後才有意願；${t}`);
  await wait(page, (v) => { const s = window.demo.snapshot(); return !s.boar.active && s.boar.visit === v && !s.people.hero.guarding; }, v2);
  [s, t] = await shot(page, 'desk-5-late-result');
  check(['late', 'expired', 'success'].includes(s.people.hero.auto.state), `主角第 ${v2} 訪結果：${s.people.hero.auto.state}（${t}）`);

  // 3. 再下一訪：重開熟手，有意願時玩家按「取消意願」→本訪不搶回
  await page.click('#panel [data-auto="allow"]');
  await page.click('#roster [data-person="cousin"]');
  await page.click('#panel [data-auto="allow"]');
  // 挑水／採藥前半段才按：留給真人反應時間（交付即出發，太晚按就已出發）
  const early = () => { const p = window.demo.snapshot().people.cousin; return p.auto.wanting && p.mode === 'carry' && ['down', 'dip', 'herbOut', 'herbGather'].includes(p.phase); };
  await wait(page, early, null, 900000);
  await page.click('#play');
  const v3 = (await snap(page)).boar.visit;
  await page.click('#panel .auto [data-cmd="cancel"]');
  s = await snap(page);
  t = await autoText(page);
  check(s.people.cousin.auto.state === 'player' && !s.people.cousin.auto.wanting, `第 ${v3} 訪：玩家取消熟手意願；${t}`);
  await page.screenshot({ path: `${OUT}/desk-6-canceled.png` });
  await page.click('#play');
  await wait(page, (v) => { const b = window.demo.snapshot().boar; return !b.active || b.visit !== v; }, v3);
  s = await snap(page);
  check(s.people.cousin.guardSrc !== 'auto' && !['go', 'success', 'late', 'canceled'].includes(s.people.cousin.auto.state), `第 ${v3} 訪熟手沒有搶回（${s.people.cousin.auto.text}）`);
  check(W.errors.length === 0, `桌面 console 錯誤／警告：${W.errors.length ? W.errors.join(' | ') : '無'}`);

  // 4. 390px：新增設定／原因／取消可用
  const N = await open(browser, { width: 390, height: 844 }), np = N.page;
  await np.click('#play');
  await np.click('#roster [data-person="cousin"]');
  const nt = (await snap(np)).tick;
  await np.click('#panel [data-auto="allow"]');
  await np.click('#panel [data-auto="late"]');
  await np.click('#panel [data-auto="early"]');
  s = await snap(np);
  const ar = await rect(np, '#panel .auto');
  check(s.tick === nt && s.people.cousin.auto.allow && s.people.cousin.auto.react === 'early' && ar && ar.r <= 390 && ar.x >= 0, `390px：暫停中可切允許與傾向，tick 不動；設定區在畫面內 ${JSON.stringify(ar)}`);
  await np.screenshot({ path: `${OUT}/narrow-1-settings.png` });
  await np.click('#play');
  await np.keyboard.press('4');
  await wait(np, () => { const p = window.demo.snapshot().people.cousin; return p.auto.wanting && p.mode === 'carry' && ['down', 'dip', 'herbOut', 'herbGather'].includes(p.phase); }, null, 900000);
  await np.click('#play');
  const cb = np.locator('#panel .auto [data-cmd="cancel"]');
  check(await cb.isVisible(), `390px：有意願時面板出現「取消意願」（${await autoText(np)}）`);
  await np.screenshot({ path: `${OUT}/narrow-2-want.png` });
  await cb.click();
  s = await snap(np);
  check(s.people.cousin.auto.state === 'player', `390px：取消後原因「${s.people.cousin.auto.text}」`);
  await np.screenshot({ path: `${OUT}/narrow-3-canceled.png` });
  check(N.errors.length === 0, `390px console 錯誤／警告：${N.errors.length ? N.errors.join(' | ') : '無'}`);

  fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + '\n');
  await browser.close();
  console.log(fails.length ? `FAIL ${fails.length}` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); fs.writeFileSync(`${OUT}/check.log`, log.join('\n') + `\nERROR ${e.stack}\n`); process.exit(2); });
