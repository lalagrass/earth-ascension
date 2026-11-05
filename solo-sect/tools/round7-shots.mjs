// 第七輪可重製畫面：在真實瀏覽器中開局後注入短暫浮字狀態，拍應接金/紅圈與惱羞。
// PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tools/round7-shots.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), port = 18937;
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body); });
});
let browser;
try {
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForSelector('#start');
  await page.click('[data-tab=classic]'); await page.click('[data-hero=guojing]'); await page.click('[data-comp=huangrong]'); await page.click('#st-go');
  await page.waitForFunction(() => !!window.__sect?.S);
  await page.evaluate(() => {
    window.__sect.speed = 0; const s = window.__sect.S, d = s.ds[0];
    d.pos = [650, 580]; d.path = []; s.log = [];
    d.ring = { intercept: true, t: s.t, busy: 0.2 }; s.fx.push({ kind: 'clash', word: '破', color: '#f2d06b', pos: [...d.pos], ttl: 0.7 });
  });
  async function shot(file) {
    const data = await page.evaluate(() => {
      const canvas = document.getElementById('map'), crop = document.createElement('canvas');
      crop.width = 1100; crop.height = 800;
      crop.getContext('2d').drawImage(canvas, 450, 390, 550, 400, 0, 0, crop.width, crop.height);
      return crop.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(root, `artifacts/round7/${file}`), Buffer.from(data, 'base64'));
  }
  await page.waitForTimeout(300); await shot('intercept.png');
  await page.evaluate(() => {
    const s = window.__sect.S, d = s.ds[0]; d.ring = { intercept: false, t: s.t, busy: 0.4 }; d.raging = true;
    s.fx = [{ kind: 'clash', word: '怒', color: '#d0302a', pos: [...d.pos], ttl: 0.7 }];
  });
  await page.waitForTimeout(300); await shot('rage.png');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('截擊與惱羞畫面已擷取');
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
