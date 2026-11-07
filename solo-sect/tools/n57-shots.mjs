// Capture the game's actual resources panel after the day-10 bot itinerary.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
let browser;
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.click('[data-tab=classic]'); await page.click('[data-hero=guojing]'); await page.click('#st-go');
  await page.waitForFunction(() => !!window.__sect?.S);
  const values = await page.evaluate(async () => {
    const { tick } = await import('./src/sim.mjs');
    const { botDaily } = await import('./test/harness/bot.mjs');
    const s = window.__sect.S; window.__sect.freeze = true; window.__sect.speed = 0;
    while (s.day <= 10) { const day = s.day; while (s.day === day) { tick(s, .25); s.alert = null; } botDaily(s); }
    window.__sect.panel();
    return { day: s.day, food: s.res.food, previous: s.ledgerPrev?.foodBySource, ledger: document.querySelector('#ledger')?.innerText };
  });
  await page.click('[data-rail=sect]');
  await page.evaluate(() => {
    for (const id of ['choice', 'alert', 'chap']) document.getElementById(id)?.remove();
    const ledger = document.querySelector('#ledger');
    ledger.classList.remove('folded');
    const panel = document.querySelector('#panel');
    panel.scrollTop = ledger.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 140;
  });
  await page.locator('#ledger').screenshot({ path: path.join(root, 'artifacts/n57/ledger-ui.png') });
  fs.writeFileSync(path.join(root, 'artifacts/n57/ledger-ui.json'), JSON.stringify(values, null, 2) + '\n');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify(values));
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
