// A: PW=/path/to/playwright-core/index.mjs node tools/n59-visual-check.mjs --seed=17
// A bare-body day, every observed hero task/phase captured from the real map canvas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (key) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const root = path.resolve(option('root') || home);
const seed = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 17);
if (!Number.isSafeInteger(seed) || seed < 1) throw Error('--seed must be a positive integer');
const out = path.resolve(option('out') || path.join(home, 'artifacts/n59'));
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(path.join(out, 'states'), { recursive: true });
const mime = { '.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
let browser;
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (err) => errors.push(String(err.stack || err)));
  await page.addInitScript((fixedSeed) => {
    Date.now = () => fixedSeed;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    window.__wholeSpriteDraws = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const image = args[0], url = image?.src || '';
      if (this.canvas?.id === 'map' && /\/assets\/(hero|cousin)\.png(?:$|\?)/.test(url) && args.length !== 9)
        window.__wholeSpriteDraws.push({ url, args: args.length });
      return draw.apply(this, args);
    };
  }, seed);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#st-go'); await page.click('#st-go');
  await page.waitForFunction(() => !!window.__sect?.S);
  await page.evaluate(() => { window.__sect.speed = 0; window.__sect.freeze = true; window.__sect.focusOn('hero'); window.__setZoom('near'); window.__wholeSpriteDraws.length = 0; });
  const result = await page.evaluate(async ({ baseline }) => {
    const { tick } = await import('./src/sim.mjs');
    const { displayPose } = await import('./src/pose-render.mjs');
    const { HOME } = await import('./src/world.mjs');
    const s = window.__sect.S, map = document.querySelector('#map');
    const tiles = [], seen = new Set(); let checked = 0, missingPose = 0;
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    while (s.day === 1) {
      for (const d of s.ds.filter((d) => !d.away)) {
        const view = displayPose(s, d, null, null, s.t, false);
        if (!view?.poses?.length) { if (!baseline) throw Error(`${d.id} has no pose at ${d.task?.act}/${d.task?.phase}`); missingPose++; }
        checked++;
      }
      const hero = s.ds.find((d) => d.id === 'hero'), label = `${hero.task?.act || 'idle'}-${hero.task?.phase || 'none'}`;
      if (!seen.has(label)) {
        seen.add(label); await waitFrame();
        const cam = window.__cam, sx = 800 + (hero.pos[0] + HOME.x - cam.x) * cam.z, sy = 450 + (hero.pos[1] + HOME.y - cam.y) * cam.z;
        const left = Math.max(0, Math.min(map.width - 540, sx - 270)), top = Math.max(0, Math.min(map.height - 400, sy - 200));
        const crop = document.createElement('canvas'); crop.width = 440; crop.height = 280;
        crop.getContext('2d').drawImage(map, left, top, 540, 400, 0, 0, 440, 280);
        tiles.push({ label, time: s.t, image: crop.toDataURL('image/webp', .82) });
      }
      tick(s, .25); s.alert = null;
    }
    const board = document.createElement('canvas'); board.id = 'n59-board';
    board.width = 900; board.height = Math.ceil(tiles.length / 2) * 310;
    const g = board.getContext('2d'); g.fillStyle = '#e9ddc4'; g.fillRect(0,0,board.width,board.height);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i], image = new Image(); image.src = tile.image; await image.decode();
      const x = (i % 2) * 450, y = Math.floor(i / 2) * 310;
      g.drawImage(image, x + 5, y + 25); g.fillStyle = '#33251a'; g.font = '18px sans-serif'; g.fillText(`${tile.label} / ${Math.round(tile.time)}s`, x + 8, y + 20);
    }
    document.body.appendChild(board);
    return { seed: s.seed, observed: tiles.map(({ label, time }) => ({ label, time })), checked, missingPose, wholeSpriteDraws: window.__wholeSpriteDraws, tiles };
  }, { baseline });
  if (errors.length) throw Error(errors.join('\n'));
  if (!baseline && result.wholeSpriteDraws.length) throw Error(`whole hero/cousin sprite draws: ${JSON.stringify(result.wholeSpriteDraws.slice(0,5))}`);
  for (const tile of result.tiles) {
    const name = tile.label.replace(/[^a-z0-9-]/gi, '_');
    fs.writeFileSync(path.join(out, 'states', `${name}.webp`), Buffer.from(tile.image.split(',')[1], 'base64'));
  }
  await page.locator('#n59-board').screenshot({ path: path.join(out, 'contact-sheet.png') });
  const { tiles, ...report } = result;
  fs.writeFileSync(path.join(out, 'visual-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
