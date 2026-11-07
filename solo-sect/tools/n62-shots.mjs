// N62: capture the actual playable policy and outing panels from the browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'artifacts/n62');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
});
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(String(error.stack || error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#st-go'); await page.click('#st-go');
  await page.waitForFunction(() => !!window.__sect?.S);
  await page.click('[data-rail=sect]');
  await page.evaluate(() => { document.querySelector('#rail-head').style.position = 'static'; });
  await page.locator('#routine').screenshot({ path: path.join(out, 'policy.png') });
  const proof = await page.evaluate(async () => {
    const { tick, scoreActs, canExpedition, setOrder } = await import('./src/sim.mjs');
    const { openExp } = await import('./src/world.mjs');
    const s = window.__sect.S; window.__sect.freeze = true; window.__sect.speed = 0;
    openExp(s); s.res.food = 0; s.res.veg = 0; s.plots.forEach(p => { p.st = 'grow'; });
    s.ds[0].needs = { energy: 100, hunger: 90, social: 100, fun: 65 };
    s.forayPolicy = 'allow'; setOrder(s, 'hero', null);
    const before = { scores: scoreActs(s, s.ds[0]).slice(0, 5).map(x => [x.act, x.score]), able: canExpedition(s, ['hero']), pop: s.pop?.foot?.n, boar: s.eco?.boar?.n };
    for (let i = 0; i < 20 && !s.exp; i++) tick(s, .25);
    window.__sect.panel();
    return { team: s.exp?.team, autonomous: s.exp?.autonomous, target: s.exp?.target, reason: s.ds[0].reason, expText: document.querySelector('#exp')?.innerText.slice(0, 170), before };
  });
  if (!proof.autonomous || !proof.team?.includes('hero')) throw Error(`畫面場景沒有真自主出獵：${JSON.stringify(proof)}`);
  await page.click('[data-rail=journey]');
  await page.evaluate(() => { document.querySelector('#rail-head').style.position = 'static'; const exp = document.querySelector('#exp'); exp.style.maxHeight = '185px'; exp.style.overflow = 'hidden'; });
  await page.locator('#exp').screenshot({ path: path.join(out, 'outing.png') });
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out, 'visual-check.json'), JSON.stringify({ proof, errors }, null, 2) + '\n');
  console.log(JSON.stringify(proof));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
