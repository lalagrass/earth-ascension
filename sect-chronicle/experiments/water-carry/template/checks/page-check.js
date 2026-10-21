#!/usr/bin/env node
// BL-V04 頁面檢查（#181）：真的打開 template/ 小樣頁，驗兩人共用動作在畫面上成立，並輸出對照圖。
// 第 9～13 項驗第 4 項的遮擋與選取：點景與人物依腳底排序、點選與重疊選前、選取不改權威狀態、窄畫面點得到。
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

  // 9. 遮擋：點景與人物同層、依腳底 y 排序。走兩趟，每一步都核
  const ov = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  await click('#restart');
  const props = await page.evaluate(() => window.v04.props().filter((q) => q.label !== 'Sprite'));
  let sortedOk = true, wrong = 0;
  const best = { behind: { step: -1, depth: 0 }, front: { step: -1, depth: 0 } };
  const seen = {};
  for (let i = 0; i < 1400; i++) {
    await page.evaluate(() => window.v04.advance(100));
    const r = await page.evaluate(() => ({ order: window.v04.order(), hero: window.v04.worldBox('hero'), cousin: window.v04.worldBox('cousin'), s: window.v04.snapshot() }));
    const zs = r.order.filter((c) => c.label !== 'Sprite' || c.z !== 0).map((c) => c.z);
    if (zs.some((z, j) => j && z < zs[j - 1])) sortedOk = false;
    const idx = (l) => r.order.findIndex((c) => c.label === l);
    for (const id of ['hero', 'cousin']) for (const q of props) {
      if (!ov(r[id], q)) continue;
      const front = idx(id) > idx(q.label), shouldFront = r.s.people[id].y > q.z;
      if (front !== shouldFront) wrong++;
      const k = `${q.label}:${front ? '人在前' : '人在後'}`;
      seen[k] = (seen[k] || 0) + 1;
      // 記下重疊最深的一步，最後各留一張近照：主角在水缸後倒水、走在石頭前
      const depth = Math.min(r.hero.y + r.hero.h, q.y + q.h) - Math.max(r.hero.y, q.y);
      if (id === 'hero' && !front && q.label === 'vat' && depth > best.behind.depth) best.behind = { step: i + 1, depth };
      if (id === 'hero' && front && q.label === 'rock-a' && depth > best.front.depth) best.front = { step: i + 1, depth };
    }
  }
  check(sortedOk, '走兩趟共 1400 步：每一步畫面的繪製順序都依腳底 y 由後到前');
  for (const [k, file] of [['behind', 'occlude-behind.png'], ['front', 'occlude-front.png']]) {
    if (best[k].step < 0) continue;
    await click('#restart');
    await page.evaluate((n) => window.v04.advance(n * 100), best[k].step);
    const b = await page.evaluate(() => window.v04.screenBox('hero'));
    await page.screenshot({ path: path.join(OUT, file), clip: { x: Math.round(b.x + b.w / 2 - 160), y: Math.round(b.y + b.h / 2 - 100), width: 320, height: 200 } });
  }
  const kinds = Object.keys(seen).sort();
  check(wrong === 0 && kinds.some((k) => k.endsWith('人在前')) && kinds.some((k) => k.endsWith('人在後')),
    `人物和點景重疊時前後都對（錯 ${wrong} 次）：${kinds.map((k) => `${k} ${seen[k]}`).join('、')}`);

  // 10. 選取：點人物選到他、名牌加深、狀態欄顯示；點空白處取消
  await click('#restart');
  await page.evaluate(() => window.v04.advance(3000));
  const hb = await page.evaluate(() => window.v04.screenBox('hero'));
  await page.mouse.click(hb.x + hb.w / 2, hb.y + hb.h / 2);
  const sel1 = await snap();
  const panel = await page.evaluate(() => ({ shown: !document.getElementById('sel').hidden, text: document.getElementById('sel').textContent, tag: document.querySelector('.tag.hero').classList.contains('sel') }));
  check(sel1.ui.selected === 'hero' && panel.shown && panel.tag && /主角/.test(panel.text), `點主角身上：選到主角，名牌加深，狀態欄「${panel.text}」`);
  await page.screenshot({ path: path.join(OUT, 'select.png') });
  await page.mouse.click(800, 220);
  check((await snap()).ui.selected === null, '點天空空白處：取消選取，狀態欄收起');

  // 11. 重疊時選前面的人：兩人在路上交會時點在重疊處
  await click('#restart');
  let crossed = null;
  for (let i = 0; i < 1400 && !crossed; i++) {
    await page.evaluate(() => window.v04.advance(100));
    const r = await page.evaluate(() => ({ h: window.v04.screenBox('hero'), c: window.v04.screenBox('cousin'), s: window.v04.snapshot() }));
    if (ov(r.h, r.c) && Math.abs(r.s.people.hero.y - r.s.people.cousin.y) > 1) crossed = r;
  }
  if (crossed) {
    const x = (Math.max(crossed.h.x, crossed.c.x) + Math.min(crossed.h.x + crossed.h.w, crossed.c.x + crossed.c.w)) / 2;
    const y = (Math.max(crossed.h.y, crossed.c.y) + Math.min(crossed.h.y + crossed.h.h, crossed.c.y + crossed.c.h)) / 2;
    await page.mouse.click(x, y);
    const want = crossed.s.people.hero.y > crossed.s.people.cousin.y ? 'hero' : 'cousin';
    check((await snap()).ui.selected === want, `兩人交會、碰框重疊時點在重疊處：選到前面（腳底較低）的${want === 'hero' ? '主角' : '堂親'}`);
  } else check(false, '兩人交會、碰框重疊：兩趟內沒找到交會的時刻');

  // 12. 選取只改畫面：暫停、4×、重來後都還在，而且權威狀態和沒選時一樣
  await click('#restart');
  await page.evaluate(() => window.v04.advance(3000));
  const hb2 = await page.evaluate(() => window.v04.screenBox('cousin'));
  await page.mouse.click(hb2.x + hb2.w / 2, hb2.y + hb2.h / 2);
  await click('[data-speed="4"]'); await click('#play'); await page.waitForTimeout(500); await click('#play'); await click('[data-speed="1"]');
  const keep1 = (await snap()).ui.selected;
  await click('#restart');
  const keep2 = (await snap()).ui.selected;
  await page.evaluate(() => window.v04.advance(8000));
  const withSel = pick(await snap());
  await page.mouse.click(800, 220);
  await click('#restart');
  await page.evaluate(() => window.v04.advance(8000));
  const noSel = pick(await snap());
  check(keep1 === 'cousin' && keep2 === 'cousin' && withSel === noSel, '選堂親後暫停、4× 播放、重來：選取都還在；選與不選推 8 秒，兩人的權威狀態完全相同');

  // 13. 窄畫面 390px：人物只剩十幾 px 高，點選範圍仍有 44px
  const nar = await browser.newPage({ viewport: { width: 390, height: 844 } });
  nar.on('pageerror', (e) => errors.push(`narrow pageerror: ${e}`));
  await nar.goto(BASE);
  await nar.waitForFunction(() => window.v04 && window.v04.snapshot().ui.frames > 3, null, { timeout: 30000 });
  await nar.click('#play'); await nar.click('#restart');
  await nar.evaluate(() => window.v04.advance(3000));
  const nb = await nar.evaluate(() => window.v04.screenBox('hero'));
  await nar.mouse.click(nb.x + nb.w / 2, nb.y + nb.h + 12); // 腳底下方 12px：在身體碰框外、44px 範圍內
  const ns = await nar.evaluate(() => window.v04.snapshot().ui.selected);
  check(ns === 'hero', `390×844：主角碰框只有 ${nb.w.toFixed(0)}×${nb.h.toFixed(0)}px，點在腳底下方 12px 仍選到主角（點選範圍下限 44px）`);
  await nar.close();

  // 14. 對照板
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
