#!/usr/bin/env node
// BL-V04 頁面檢查（#181）：真的打開 template/ 小樣頁，驗兩人共用動作在畫面上成立，並輸出兩張對照圖。
// 只讀頁面公開的 window.v04；任何一項不成立就印 FAIL、結束碼 1。
// 用法（在 experiments/water-carry 下，先 python3 -m http.server 8771）：
//   NODE_PATH=$(npm root -g) node template/checks/page-check.js design/bl-v04
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = path.resolve(process.argv[2] || 'design/bl-v04');
const BASE = process.env.V04_URL || 'http://127.0.0.1:8771/template/';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const fails = [];
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}));
  note(`Chromium ${browser.version()}，WebGL 走 SwiftShader`);
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto(BASE);
  await page.waitForFunction(() => window.v04 && window.v04.snapshot().ui.frames > 3, null, { timeout: 30000 });
  const snap = () => page.evaluate(() => window.v04.snapshot());
  const click = (sel) => page.click(sel);

  // 1. 兩人都載入同一份模板的 sheet，同框、同錨點
  const meta = await page.evaluate(() => window.v04.sheets());
  check(meta.hero.template === 'actions.json' && meta.cousin.template === 'actions.json', '兩人的 sheet 都標明來自 actions.json');
  check(JSON.stringify(meta.hero.anchorPx) === JSON.stringify(meta.cousin.anchorPx) && JSON.stringify(meta.hero.frameSize) === JSON.stringify(meta.cousin.frameSize),
    `兩人幀框 ${meta.hero.frameSize.w}×${meta.hero.frameSize.h}px、腳底錨點 (${meta.hero.anchorPx.x}, ${meta.hero.anchorPx.y}) 相同`);

  // 2. 暫停：狀態與畫面都不動
  await click('#play');
  const p0 = await snap();
  await page.waitForTimeout(700);
  const p1 = await snap();
  check(!p1.ui.playing && p0.people.hero.steps === p1.people.hero.steps && p0.people.hero.texture === p1.people.hero.texture && p0.people.cousin.texture === p1.people.cousin.texture,
    `暫停 0.7 秒：權威步數 ${p0.people.hero.steps}→${p1.people.hero.steps}，兩人的幀不變`);

  // 3. 重來與確定性推進：一次推 12 秒＝分兩次各推 6 秒
  await click('#restart');
  const r0 = await snap();
  check(r0.people.hero.steps === 0 && r0.people.hero.phase === 'down' && r0.people.cousin.phase === 'up', '重來：主角回到下山起點，堂親回到上山起點');
  await page.evaluate(() => window.v04.advance(12000));
  const a = await snap();
  await click('#restart');
  await page.evaluate(() => { window.v04.advance(6000); window.v04.advance(6000); });
  const b = await snap();
  const pick = (s) => JSON.stringify(['hero', 'cousin'].map((id) => [s.people[id].phase, s.people[id].k, s.people[id].frame, s.people[id].x, s.people[id].y]));
  check(pick(a) === pick(b), '一次推 12 秒與分兩次推 6 秒：兩人階段、進度、幀、位置完全相同');

  // 4. 倍率：4× 播放約 1 秒，權威步數約 4 倍
  await click('#restart');
  await click('[data-speed="4"]');
  await click('#play');
  const s0 = await snap();
  await page.waitForTimeout(1000);
  await click('#play');
  const s1 = await snap();
  const steps = s1.people.hero.steps - s0.people.hero.steps;
  check(steps > 50 && steps < 110, `4× 播放約 1 秒，權威推進 ${steps} 步（1× 約 20 步）`);
  await click('[data-speed="1"]');

  // 5. 換幀跟著距離：下山途中，兩人的幀號都等於 floor(走了多遠／步幅) mod 4
  await click('#restart');
  let okIdx = true, seenFrames = new Set();
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.v04.advance(150));
    const s = await snap();
    for (const id of ['hero', 'cousin']) {
      const p = s.people[id];
      if (p.phase !== 'down' && p.phase !== 'up') continue;
      const stride = p.action === 'walkEmpty' ? 6.6 : p.action === 'walkLoaded' ? 5.2 : 5.46;
      if (p.index !== Math.floor(p.travelled / stride) % 4) okIdx = false;
      seenFrames.add(`${id}:${p.frame}`);
    }
  }
  check(okIdx && seenFrames.size >= 8, `走路時兩人的幀號都由走了多遠決定；6 秒內出現 ${seenFrames.size} 種人物×幀`);

  // 6. 同一組動作在兩人身上：主角下山、堂親上山時，各自顯示對應動作
  const s6 = await snap();
  check(s6.people.hero.action === 'walkEmpty' && s6.people.hero.texture.startsWith('walkEmpty') && s6.people.cousin.action === 'walkLoaded' && s6.people.cousin.texture.startsWith('walkLoaded'),
    `主角「${s6.people.hero.texture}」、堂親「${s6.people.cousin.texture}」：同一張狀態表換出各自外觀的同一組動作`);
  await page.evaluate(() => document.querySelectorAll('.tag').forEach((t) => t.style.visibility = 'visible'));
  await page.screenshot({ path: path.join(OUT, 'walk.png') });

  // 7. 缺幀退回：兩人都切成長後步態，堂親沒有這組幀 → 退回負重上山並標紅字
  await click('#grown');
  await click('#restart');
  await page.evaluate(() => window.v04.advance(2000));
  const g = await snap();
  const tagC = await page.evaluate(() => document.querySelector('.tag.cousin').textContent);
  check(g.people.cousin.requested === 'walkGrown' && g.people.cousin.action === 'walkLoaded' && g.people.cousin.fallback && /退回/.test(tagC),
    `堂親缺「成長後負重」：退回「負重上山」，名牌顯示「${tagC}」`);
  // 走到主角的上山段，主角用成長後步態
  for (let i = 0; i < 60 && (await snap()).people.hero.phase !== 'up'; i++) await page.evaluate(() => window.v04.advance(500));
  const g2 = await snap();
  check(g2.people.hero.action === 'walkGrown' && !g2.people.hero.fallback, `主角有這組幀：上山顯示「${g2.people.hero.texture}」`);
  await click('#grown');

  // 8. 主角沒有「坐下歇」：每兩趟的休息退回待機並標出；堂親有，就坐下
  await click('#restart');
  let hr = null, cr = null;
  for (let i = 0; i < 400 && !(hr && cr); i++) {
    await page.evaluate(() => window.v04.advance(500));
    const s = await snap();
    if (!hr && s.people.hero.phase === 'rest') hr = s.people.hero;
    if (!cr && s.people.cousin.phase === 'rest') cr = s.people.cousin;
  }
  check(hr && hr.action === 'idle' && hr.fallback, `主角休息：缺「坐下歇」→ 退回「待機」（${hr && hr.texture}）`);
  check(cr && cr.action === 'rest' && !cr.fallback, `堂親休息：顯示「坐下歇」（${cr && cr.texture}）`);

  // 9. 對照板
  const cmp = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  cmp.on('pageerror', (e) => errors.push(`compare pageerror: ${e}`));
  await cmp.goto(`${BASE}?board=compare`);
  await cmp.waitForFunction(() => window.v04 && window.v04.ready, null, { timeout: 30000 });
  await cmp.waitForTimeout(300);
  await cmp.screenshot({ path: path.join(OUT, 'compare.png') });

  check(errors.length === 0, `主控台錯誤／警告 ${errors.length} 則${errors.length ? '：' + errors.join(' | ') : ''}`);
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'page-check.log'), log.join('\n') + '\n');
  note(fails.length ? `FAIL ${fails.length} 項` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})();
