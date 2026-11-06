// N52 browser evidence, same viewport and day-one state on previous head and current head.
// PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tools/round8-n52-shots.mjs /tmp/earth-r8-n52-base/solo-sect .
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = process.argv.slice(2).map((p) => path.resolve(p));
if (roots.length !== 2) throw new Error('base and head solo-sect dirs required');
const serverFor = (root) => http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } const ext = path.extname(file); res.writeHead(200, { 'content-type': ({ '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json' })[ext] || 'text/html' }); res.end(bytes); });
});
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  for (let i = 0; i < 2; i++) {
    const server = serverFor(roots[i]); await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page.waitForSelector('#start');
      await page.screenshot({ path: path.join(here, `artifacts/round8/n52-${i ? 'head' : 'base'}-start.png`) });
      const start = await page.evaluate(() => ({ selects: document.querySelectorAll('#start select').length, buttons: document.querySelectorAll('#start button').length, inputs: document.querySelectorAll('#start input:not([type=hidden])').length }));
      await page.click('#st-go'); await page.waitForFunction(() => !!window.__sect?.S); await page.evaluate(() => { window.__sect.speed = 0; window.__sect.panel(); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(here, `artifacts/round8/n52-${i ? 'head' : 'base'}-rail.png`) });
      const rail = await page.evaluate(() => ({ selects: document.querySelectorAll('#panel select').length, visibleButtons: [...document.querySelectorAll('#panel button')].filter((x) => x.getClientRects().length).length, visibleInputs: [...document.querySelectorAll('#panel input')].filter((x) => x.getClientRects().length).length, routine: !!document.querySelector('#routine'), tabs: document.querySelectorAll('[data-rail]').length }));
      if (i) { await page.click('[data-rail=sect]'); await page.screenshot({ path: path.join(here, 'artifacts/round8/n52-head-schedule.png') }); }
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(JSON.stringify({ label: i ? 'head' : 'base', start, rail }));
      await page.close();
    } finally { await new Promise((r) => server.close(r)); }
  }
} finally { await browser.close(); }
