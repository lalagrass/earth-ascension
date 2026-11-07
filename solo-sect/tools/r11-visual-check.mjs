// N45 reviewer 可離線重拍：真遊戲主畫布，第一段獸穴進場與山寨小地圖。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv.find(x => x.startsWith('--out='))?.slice(6) || path.join(home, 'artifacts/r11/n45'));
const seed = Number(process.argv.find(x => x.startsWith('--seed='))?.slice(7) || 17);
if (!Number.isSafeInteger(seed)) throw Error('--seed 要整數');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(home, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(home + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', err => errors.push(String(err.stack || err)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#st-go'); await page.click('#st-go'); await page.waitForFunction(() => !!window.__sect?.S);
  await page.evaluate(async seed => {
    const { tick, startExpedition } = await import('./src/sim.mjs');
    const { openExp } = await import('./src/world.mjs');
    const s = window.__sect.S; s.seed = seed; s.res.food = 20; window.__sect.speed = 0; window.__sect.freeze = true;
    openExp(s); if (!startExpedition(s, ['hero'], { target: 60, order: 'steady' }).ok) throw Error('不能出巡');
    for (let i = 0; i < 800 && !s.exp?.bout; i++) { tick(s, .25); s.alert = null; }
    if (!s.exp?.bout?.near) throw Error('山腳沒有啟動近段地圖交手');
    window.__setZoom('near'); window.__cam.follow = true;
  }, seed);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'foot-main-map.png') });
  await page.evaluate(async () => {
    const { lairStep } = await import('./src/threat.mjs');
    const s = window.__sect.S; s.exp = null; s.lair = { found: s.day, n: 1, won: 0, next: 0, trip: { ids: ['hero'], pts: 80, pow: 100, back: s.t, n: 1 } };
    lairStep(s);
    if (!s.lair.trip.bout || s.lair.trip.bout.near) throw Error('山寨沒有小地圖');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'lair-small-map.png') });
  if (process.argv.includes('--visitor')) {
    await page.evaluate(async () => {
      const { DAY } = await import('./src/data.mjs');
      const { jhStep } = await import('./src/jianghu.mjs');
      const s = window.__sect.S;
      s.exp = null; s.lair = null; s.band = null; s.choices = []; s.jh = { ...s.jh, dfbb: 0, dfbbNo: 0, dfbbDay: null, visitor: null, visitorPending: null };
      s.hero = { kind: 'bare', askMajor: true }; s.day = 8; s.t = 7 * DAY; s.rep = 60; s.res.coin = 2000;
      for (let i = s.ds.length; i < 4; i++) s.ds.push({ ...s.ds[0], id: `visitor-picture-${i}`, name: `同門${i}`, pos: [...s.ds[0].pos] });
      s.threat = { next: 8, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [], adapt: 1, rhythmCycle: null, rhythmStrikes: 0, lastBigDay: 0 };
      jhStep(s, .25, { rand: () => .5 });
      if (!s.choices.some(c => c.jh === 'dfbb')) throw Error('沒有帶理由的登門卡');
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, 'visitor-reason-card.png') });
    await page.evaluate(async () => {
      const { jhResolve } = await import('./src/jianghu.mjs');
      const s = window.__sect.S, ch = s.choices.find(c => c.jh === 'dfbb');
      jhResolve(s, ch, 0, { rand: () => .5 });
      if (!s.jh.visitor?.bout) throw Error('應戰後沒有地圖交手');
      const cam = window.__cam; cam.follow = false; cam.until = 0;
      cam.x = cam.ux = 1475; cam.y = cam.uy = 4700; cam.z = cam.uz = 2;
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, 'visitor-map-fight.png') });
  }
  if (errors.length) throw Error(errors.join('\n'));
  const report = { seed, screenshots: process.argv.includes('--visitor') ? ['visitor-reason-card.png', 'visitor-map-fight.png'] : ['foot-main-map.png', 'lair-small-map.png'], errors };
  fs.writeFileSync(path.join(out, 'visual-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
