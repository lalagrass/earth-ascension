// One Cloud desktop flow for #337. One local HTTP server, one Chromium context/page;
// no test-only world commands. The public window.demo API is read-only.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.resolve(here, '../evidence/social01');
const mime = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(root, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end(); }
});
let browser, context, page;
const errors = [];
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  context = await browser.newContext({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}/experiments/water-carry/demo/`);
  await page.waitForFunction(() => window.demo?.snapshot().frames > 2, { timeout: 30000 });
  await page.click('#play');
  await page.click('#reset');
  await page.click('#roster [data-person="hero"]');
  const first = await page.evaluate(() => window.demo.snapshot());
  assert.equal(first.tick, 0, 'paused new game has zero progress');
  assert.equal(first.sceneActors.find((a) => a.id === 'cousin').asset, 'social-girl', 'girl art is the actual scene actor');
  // Real player controls: both explicitly stop, walk to their existing seats, then invite from a safe yard pause.
  await page.click('[data-intent-command="dispatch:restAfterTrip"]');
  await page.click('#roster [data-person="cousin"]');
  await page.click('[data-intent-command="dispatch:restAfterTrip"]');
  await page.click('[data-speed="4"]');
  await page.click('#play');
  await page.waitForFunction(() => ['hero', 'cousin'].every((id) => window.demo?.snapshot().people[id].mode === 'seated'), null, { timeout: 30000 });
  await page.click('#play');
  await page.click('#roster [data-person="hero"]');
  const ready = await page.evaluate(() => window.demo.snapshot());
  assert.equal(ready.playing, false);
  await page.click('[data-intent-command="dispatch:invite:encourage"]');
  const invited = await page.evaluate(() => window.demo.snapshot());
  assert.equal(invited.tick, ready.tick, 'paused invitation records intent without progressing');
  assert.equal(invited.people.hero.mode, 'toMeet');
  assert.equal(invited.people.cousin.mode, 'toMeet');
  await page.click('#play');
  await page.waitForFunction(() => window.demo?.snapshot().people.cousin.life02?.meet?.say, null, { timeout: 30000 });
  const talk = await page.evaluate(() => window.demo.snapshot());
  assert.match(talk.people.cousin.life02.meet.say, /我陪你/);
  await fs.mkdir(out, { recursive: true });
  await page.screenshot({ path: path.join(out, 'girl-encourages.png') });
  await page.waitForFunction(() => window.demo?.snapshot().people.hero.life02?.relationCount === 1, null, { timeout: 30000 });
  await page.click('#play');
  const done = await page.evaluate(() => window.demo.snapshot());
  assert.equal(done.playing, false);
  assert.equal(done.people.hero.life02.relation, '家人・多聊了一些');
  assert.equal(done.people.hero.life02.events.length, 1);
  assert.match(await page.locator('#p-life').innerText(), /我陪你/);
  await page.screenshot({ path: path.join(out, 'relationship-source.png') });
  assert.deepEqual(errors, []);
  const evidence = { entry: '/experiments/water-carry/demo/', browser: browser.version(), viewport: { width: 1400, height: 820 },
    firstTick: first.tick, readyTick: ready.tick, invitedTick: invited.tick, talkTick: talk.tick, doneTick: done.tick,
    actorAsset: 'social-girl', relation: done.people.hero.life02.relation,
    source: done.people.hero.life02.events[0].cause, eventCount: done.people.hero.life02.events.length,
    pageErrors: errors, screenshots: ['girl-encourages.png', 'relationship-source.png'] };
  await fs.writeFile(path.join(out, 'desktop-results.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
} finally {
  if (page) await page.close().catch(() => {});
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
