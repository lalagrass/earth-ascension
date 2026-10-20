#!/usr/bin/env node
// V2 同場景比較：在同一個 Chromium 裡分別打開 PixiJS 與 Godot（Web 匯出）試作，用真的滑鼠與鍵盤做同一組操作，
// 記錄結果、截圖與少量實測。只讀頁面公開的唯讀狀態（PixiJS：window.spike.snapshot()；Godot：window.spikeState）。
// 用法（先在 experiments/water-carry 下 python3 -m http.server 8770，並完成 pixi 的 npm ci 與 godot 的匯出）：
//   NODE_PATH=$(npm root -g) node spikes/shared/compare.js /tmp/v2-compare
// 任何一項不成立就印 FAIL、結束碼 1。
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const OUT = path.resolve(process.argv[2] || '/tmp/v2-compare');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8770/spikes/';
const ROOT = path.resolve(__dirname, '..');
const ENGINES = [
  { id: 'pixi', url: BASE + 'pixi/', state: 'window.spike && window.spike.snapshot()' },
  { id: 'godot', url: BASE + 'godot/build/web/', state: 'window.spikeState' },
];
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const fails = [];
const check = (ok, msg) => { note(ok ? 'ok  ' : 'FAIL', msg); if (!ok) fails.push(msg); };

// 同一 tick 時主角在哪：直接用共用播放規則算（兩個試作都應該等於它）
async function expectedAt(tick) {
  const { createPlayback } = await import(path.join(__dirname, 'playback.mjs'));
  const scene = JSON.parse(fs.readFileSync(path.join(__dirname, 'scene.json'), 'utf8'));
  const p = createPlayback(scene);
  for (let i = 0; i < tick; i++) p.advance();
  return p.view();
}
// 遮擋時刻：主角與物件畫面框重疊最多的 tick。front＝物件腳底比主角低（物件應畫在前面），behind＝反之
async function occlusionTicks() {
  const { createPlayback } = await import(path.join(__dirname, 'playback.mjs'));
  const scene = JSON.parse(fs.readFileSync(path.join(__dirname, 'scene.json'), 'utf8'));
  const p = createPlayback(scene), H = scene.hero, best = {};
  for (let i = 0; i < 3000; i++) {
    p.advance();
    const v = p.view();
    if (!/^(empty|load)/.test(v.frame)) continue;
    const hl = v.x - H.ax, ht = v.y - H.ay;
    for (const q of scene.props) {
      const ql = q.x - q.ax, qt = q.y - q.ay;
      const area = Math.max(0, Math.min(hl + H.w, ql + q.w) - Math.max(hl, ql)) * Math.max(0, Math.min(ht + H.h, qt + q.h) - Math.max(ht, qt));
      const k = q.y > v.y ? 'front' : 'behind';
      if (area > (best[k] ? best[k].area : 0)) best[k] = { tick: p.state.tick, prop: q.id, area, v, propXY: [q.x, q.y] };
    }
  }
  return best;
}
const sizeOf = (files) => files.reduce((a, f) => { const b = fs.readFileSync(f); return { raw: a.raw + b.length, gz: a.gz + zlib.gzipSync(b, { level: 9 }).length }; }, { raw: 0, gz: 0 });
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function runEngine(browser, e, occ) {
  note(`\n== ${e.id} ==`);
  const page = await browser.newPage({ viewport: { width: 1400, height: 820 } });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  const snap = () => page.evaluate(e.state);
  const waitFor = async (what, pred, ms = 8000) => {
    const end = Date.now() + ms;
    for (;;) { const s = await snap(); if (s && pred(s)) return s; if (Date.now() > end) throw new Error(`${e.id}：等不到 ${what}：${JSON.stringify(s)}`); await page.waitForTimeout(50); }
  };
  const r = {};
  // 點擊到狀態更新的時間含輪詢與 Godot 每 3 幀才寫一次狀態，不是輸入延遲，所以不記
  // 1. 載入到第一幀
  const t0 = Date.now();
  await page.goto(e.url);
  await waitFor('第一幀', (s) => s.frames > 0, 120000);
  r.loadToFirstFrameMs = Date.now() - t0;
  note(`載入到第一幀 ${r.loadToFirstFrameMs} ms（含下載；本機 http.server，未壓縮）`);
  await page.waitForTimeout(1500);
  // 2. 動畫有在換幀、人物有在走
  const seen = new Set(); const a = await snap(); let b = a;
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(100); b = await snap(); seen.add(b.frame); }
  check(seen.size >= 3 && (a.x !== b.x || a.y !== b.y), `${e.id}：人物在走、1 秒內看到 ${seen.size} 種動作幀（${[...seen].join('、')}）`);
  // 3. 每幀時間（requestAnimationFrame 2 秒）
  r.frameMs = await page.evaluate(() => new Promise((ok) => { const t = []; const f = (x) => { t.push(x); if (t.length < 120) requestAnimationFrame(f); else ok(t.slice(1).map((v, i) => v - t[i])); }; requestAnimationFrame(f); }))
    .then((d) => { d.sort((x, y) => x - y); return { median: +d[d.length >> 1].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1) }; });
  note(`rAF 間隔 中位數 ${r.frameMs.median} ms、p95 ${r.frameMs.p95} ms（headless＋SwiftShader，只當相對參考）`);
  // 4. 點主角 → 選取；用真的滑鼠
  await page.keyboard.press('Space'); // 先暫停，避免點的瞬間人物走開
  let s = await waitFor('暫停', (x) => !x.playing);
  await page.mouse.click(s.heroScreen.x, s.heroScreen.y);
  s = await waitFor('選到主角', (x) => x.selected === 'hero');
  check(s.selected === 'hero', `${e.id}：點主角選取`);
  await page.screenshot({ path: `${OUT}/${e.id}-selected.png` });
  // 5. 播放中點水缸 → 自動暫停、開選單；Esc 關閉後恢復
  await page.keyboard.press('Space');
  s = await waitFor('播放', (x) => x.playing);
  await page.mouse.click(s.vatScreen.x, s.vatScreen.y);
  s = await waitFor('水缸選單', (x) => x.menu === 'vat');
  check(!s.playing, `${e.id}：點水缸開選單並自動暫停`);
  const t1 = s.tick; await page.waitForTimeout(800);
  check((await snap()).tick === t1, `${e.id}：選單開著時世界不前進（tick ${t1}）`);
  await page.screenshot({ path: `${OUT}/${e.id}-menu.png` });
  await page.keyboard.press('Escape');
  s = await waitFor('關選單', (x) => x.menu === null);
  check(s.playing, `${e.id}：Esc 關選單後恢復播放`);
  // 6. 再開選單，用鍵盤 Enter 下「本趟後休息」
  await page.mouse.click(s.vatScreen.x, s.vatScreen.y);
  await waitFor('水缸選單', (x) => x.menu === 'vat');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  s = await waitFor('待執行指令', (x) => x.pending && x.menu === null);
  check(s.pending.label === '本趟後休息' && s.playing, `${e.id}：鍵盤 Enter 下令，待執行「${s.pending.label}」，選單關閉並恢復`);
  await page.screenshot({ path: `${OUT}/${e.id}-ordered.png` });
  // 7. 平移、縮放、重設
  await page.keyboard.press('Space');
  s = await waitFor('暫停', (x) => !x.playing);
  const c0 = s.cam;
  await page.mouse.move(700, 300); await page.mouse.down(); await page.mouse.move(600, 260, { steps: 6 }); await page.mouse.up();
  s = await waitFor('平移', (x) => Math.abs(x.cam.x - (c0.x + 100 / c0.zoom)) < 2 && Math.abs(x.cam.y - (c0.y + 40 / c0.zoom)) < 2, 3000).catch(() => snap());
  check(Math.abs(s.cam.x - (c0.x + 100 / c0.zoom)) < 2 && Math.abs(s.cam.y - (c0.y + 40 / c0.zoom)) < 2, `${e.id}：拖曳平移 (${c0.x.toFixed(0)},${c0.y.toFixed(0)})→(${s.cam.x.toFixed(0)},${s.cam.y.toFixed(0)})`);
  await page.mouse.move(700, 400); await page.mouse.wheel(0, -300);
  s = await waitFor('放大', (x) => x.cam.zoom > c0.zoom, 3000).catch(() => snap());
  check(s.cam.zoom > c0.zoom && s.cam.zoom <= 1.6, `${e.id}：滾輪放大到 ${s.cam.zoom.toFixed(2)}（上限 1.6）`);
  for (let i = 0; i < 12; i++) await page.keyboard.press('-');
  s = await waitFor('縮到下限', (x) => Math.abs(x.cam.zoom - 0.6) < 0.01, 3000).catch(() => snap());
  check(Math.abs(s.cam.zoom - 0.6) < 0.01, `${e.id}：鍵盤縮小停在下限 ${s.cam.zoom.toFixed(2)}`);
  await page.keyboard.press('0');
  s = await waitFor('重設鏡頭', (x) => x.cam.zoom === 1 && x.cam.x === 800, 3000).catch(() => snap());
  check(s.cam.zoom === 1 && s.cam.x === 800 && s.cam.y === 450, `${e.id}：0 鍵重設鏡頭`);
  check(problems.length === 0, `${e.id}：console 沒有錯誤或警告${problems.length ? '：' + problems.join(' | ') : ''}`);
  await page.close();

  // 8. 同一 tick 的位置與遮擋截圖：?at=N 先推進再暫停，裁出主角附近
  for (const [k, o] of Object.entries(occ)) {
    const p2 = await browser.newPage({ viewport: { width: 1400, height: 820 } });
    await p2.goto(`${e.url}?at=${o.tick}`);
    let s2 = null;
    for (let i = 0; i < 2400 && !(s2 && s2.frames > 3); i++) { s2 = await p2.evaluate(e.state); await p2.waitForTimeout(50); }
    check(s2 && s2.tick === o.tick && Math.abs(s2.x - o.v.x) < 1e-6 && Math.abs(s2.y - o.v.y) < 1e-6 && s2.frame === o.v.frame,
      `${e.id}：tick ${o.tick} 主角在 (${s2 && s2.x.toFixed(2)}, ${s2 && s2.y.toFixed(2)})、${s2 && s2.frame}，與共用播放規則相同`);
    const c = s2.heroScreen;
    await p2.screenshot({ path: `${OUT}/${e.id}-occlude-${k}.png`, clip: { x: Math.round(c.x - 110), y: Math.round(c.y - 90), width: 220, height: 200 } });
    if (k === 'front') { await p2.setViewportSize({ width: 390, height: 780 }); await p2.waitForTimeout(500); await p2.screenshot({ path: `${OUT}/${e.id}-narrow.png` }); }
    await p2.close();
  }
  return r;
}

(async () => {
  const occ = await occlusionTicks();
  for (const [k, o] of Object.entries(occ)) note(`共用播放：tick ${o.tick} 主角腳底 y=${o.v.y.toFixed(1)}，與 ${o.prop}（腳底 y=${o.propXY[1]}）重疊最多 → ${k === 'front' ? `${o.prop} 應畫在主角前面` : `主角應畫在 ${o.prop} 前面`}`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  note(`Chromium ${browser.version()}，headless，WebGL 走 SwiftShader（軟體算圖）`);
  const results = {};
  for (const e of ENGINES) {
    try { results[e.id] = await runEngine(browser, e, occ); } catch (err) { check(false, err.message); }
  }
  await browser.close();
  // 下載體積：瀏覽器實際要抓的檔案（共用素材兩邊相同；Godot 的素材在 .pck 內）
  const shared = fs.readdirSync(path.join(__dirname, 'assets')).map((f) => path.join(__dirname, 'assets', f)).concat(path.join(__dirname, 'scene.json'));
  const pixiFiles = ['pixi/index.html', 'pixi/style.css', 'pixi/main.mjs', 'shared/playback.mjs', 'pixi/node_modules/pixi.js/dist/pixi.min.mjs'].map((f) => path.join(ROOT, f));
  const gweb = path.join(ROOT, 'godot/build/web');
  const godotFiles = fs.readdirSync(gweb).filter((f) => /\.(html|js|wasm|pck)$/.test(f)).map((f) => path.join(gweb, f));
  const sz = { pixiCode: sizeOf(pixiFiles), pixiAssets: sizeOf(shared), godotAll: sizeOf(godotFiles), godotWasm: sizeOf(godotFiles.filter((f) => f.endsWith('.wasm'))), godotPck: sizeOf(godotFiles.filter((f) => f.endsWith('.pck'))) };
  note(`\n下載體積（原始／gzip -9）：PixiJS 程式 ${kb(sz.pixiCode.raw)}／${kb(sz.pixiCode.gz)}＋素材 ${kb(sz.pixiAssets.raw)}／${kb(sz.pixiAssets.gz)}；` +
    `Godot 合計 ${kb(sz.godotAll.raw)}／${kb(sz.godotAll.gz)}（wasm ${kb(sz.godotWasm.raw)}／${kb(sz.godotWasm.gz)}，pck ${kb(sz.godotPck.raw)}／${kb(sz.godotPck.gz)}）`);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ occlusion: occ, results, sizes: sz }, null, 1));
  note(fails.length ? `FAIL ${fails.length} 項` : 'PASS 全部條件成立');
  fs.writeFileSync(`${OUT}/compare.log`, log.join('\n') + '\n');
  process.exit(fails.length ? 1 : 0);
})();
