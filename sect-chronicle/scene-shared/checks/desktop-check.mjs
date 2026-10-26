// One owned Cloud desktop page + one owned temporary server, always closed.
// Run from the repo root; evidence defaults to /tmp/scene342-desktop.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = process.env.SCENE_EVIDENCE_DIR || '/tmp/scene342-desktop';
const port = Number(process.env.SCENE_TEST_PORT || 8812), origin = `http://127.0.0.1:${port}`;
const sect = new URL('../../', import.meta.url).pathname, repo = new URL('../../../', import.meta.url).pathname;
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
await mkdir(out, { recursive: true });
const result = { head, viewport: { width: 1440, height: 1000 }, checks: [], consoleErrors: [], screenshots: [] };
const hash = (data) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const check = (ok, text) => { assert.ok(ok, text); result.checks.push(text); console.log(`PASS ${text}`); };
const short = (s) => ({ tick: s.tick, playing: s.playing, vat: s.vat, herbs: s.herbs, cam: s.cam, selected: s.selected,
  people: Object.fromEntries(Object.entries(s.people).map(([id, p]) => [id, { mode: p.mode, phase: p.phase, pending: p.pending, load: s.sceneActors.find((a) => a.id === id).load, x: p.x, y: p.y, done: p.done, speed: p.tripSpeeds, resting: p.resting }])) });
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', sect], { stdio: 'ignore' });
let browser, context, page;
async function screenshot(name) { await page.screenshot({ path: `${out}/${name}`, fullPage: false }); result.screenshots.push(name); }
async function officialSnap() { return page.evaluate(() => window.demo.snapshot()); }
async function wait(fn, timeout = 45000) { await page.waitForFunction(fn, undefined, { timeout, polling: 50 }); }
try {
  for (let n = 0; n < 30; n++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  if (server.exitCode !== null) throw new Error('Owned temporary server failed to start; choose a free SCENE_TEST_PORT');
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  result.browser = browser.version(); context = await browser.newContext({ viewport: result.viewport, deviceScaleFactor: 1 }); page = await context.newPage();
  page.on('pageerror', (e) => { result.consoleErrors.push(e.stack || String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') result.consoleErrors.push({ text: m.text(), location: m.location() }); });
  await page.goto(origin); await wait(() => window.demo?.snapshot().frames > 3);
  check(new URL(page.url()).pathname === '/experiments/water-carry/demo/', 'single official entry redirects to accepted demo');
  await page.click('#play'); await page.click('#reset');
  check((await officialSnap()).tick === 0, 'normal UI reset while paused has zero world progress');
  await page.click('#roster [data-person="hero"]'); await page.click('#panel [data-tab="martial"]');
  check((await page.locator('#panel').innerText()).includes('60.0') && (await page.locator('#panel').innerText()).includes('40.0'), 'original hero card displays actual empty 60 / loaded 40');
  await page.click('#roster [data-person="cousin"]');
  check((await page.locator('#panel').innerText()).includes('74.4') && (await page.locator('#panel').innerText()).includes('52.0'), 'original skilled-worker card displays actual empty 74.4 / loaded 52');
  await page.click('#panel [data-tab="life"]'); await page.click('[data-speed="4"]'); await page.click('#play');
  await wait(() => window.demo.snapshot().tick >= 600); await page.click('#play');
  let s = await officialSnap();
  check(s.people.hero.phase === 'down' && s.people.cousin.phase === 'down' && s.people.cousin.phaseProgress > s.people.hero.phaseProgress, 'same real route/time: skilled worker actually travels farther');
  result.initialSpeed = short(s);
  const worldBefore = await page.evaluate(() => window.demo.exportState());
  const pausedTick = s.tick, oldCam = s.cam;
  await page.mouse.move(450, 250); await page.mouse.down(); await page.mouse.move(510, 300); await page.mouse.up(); await page.mouse.wheel(0, -100);
  await page.waitForTimeout(250); s = await officialSnap();
  const worldAfter = await page.evaluate(() => window.demo.exportState());
  check(hash(worldBefore) === hash(worldAfter) && s.tick === pausedTick && s.cam.x !== oldCam.x && s.cam.zoom > oldCam.zoom, 'paused pan/zoom leaves complete world state unchanged');
  result.pauseHashes = { before: hash(worldBefore), after: hash(worldAfter), tick: pausedTick };
  await page.click('#roster [data-person="cousin"]'); await page.click('#p-cmds [data-cmd="work:herb"]');
  check((await officialSnap()).people.cousin.pending === 'herb', 'paused real command queues herb after original water delivery');
  await page.click('#roster [data-person="hero"]');
  await page.click('#p-cmds [data-cmd="restAfterTrip"]'); await page.click('#p-cmds [data-cmd="work:herb"]'); await page.click('#p-cmds [data-cmd="restAfterTrip"]');
  s = await officialSnap(); check(s.tick === pausedTick && s.people.hero.pending === 'rest', 'newest stop replaces earlier stop/work intent without advancing tick');
  await page.click('#play');
  await wait(() => { const p = window.demo.snapshot().people.hero; return p.phase === 'up' && p.y > 1000 && p.y < 1060; });
  await page.click('#play'); await page.click('[data-view="bridge"]');
  s = await officialSnap();
  check(s.sceneActors.find((a) => a.id === 'hero').load === 1 && s.sceneOcclusion.bridgeFrontDepth > s.people.hero.y, 'true loaded return passes behind original front bridge rail');
  // Click the actual body behind scenery, then show the original person card.
  await page.click('#roster [data-person="cousin"]'); await page.click('[data-view="bridge"]');
  s = await officialSnap(); const body = s.people.hero.bodyScreen;
  await page.mouse.click(body.x + body.w / 2, body.y + body.h * .85);
  await page.waitForTimeout(100); s = await officialSnap();
  check(s.selected === 'hero' && await page.locator('#panel').isVisible(), 'occluded world-body click selects original hero card');
  for (const p of Object.values(s.people)) {
    const b = p.sprite.bounds, a = p.sprite.anchor, x = b.x + b.w * (p.face > 0 ? a.x : 1 - a.x), y = b.y + b.h * a.y;
    check(Math.abs(x - p.footScreen.x) < .2 && Math.abs(y - p.footScreen.y) < .2, 'actual sprite anchor agrees with confirmed core foot position');
  }
  result.bridge = short(s); await screenshot('official-bridge-card.png');
  await page.click('#play');
  await wait(() => { const s = window.demo.snapshot(); return s.people.cousin.job === 'herb' && s.people.cousin.phase === 'herbOut' && s.people.hero.phase === 'up'; });
  await page.click('#play'); await page.click('[data-view="overview"]');
  s = await officialSnap(); result.twoJobs = short(s);
  check(s.people.hero.job === 'water' && s.people.cousin.job === 'herb', 'real two-worker water/herb loop visible together on original long map');
  await screenshot('official-water-herb.png');
  await page.click('#play');
  await wait(() => { const s = window.demo.snapshot(); return s.people.cousin.done.herb >= 1 && s.people.hero.resting && s.people.hero.mode === 'seated'; });
  await page.click('#play'); s = await officialSnap();
  check(s.people.hero.done.water === 1 && s.people.hero.done.herb === 0 && s.people.hero.resting && s.people.cousin.done.herb >= 1, 'original water and herb round trips deliver; newest stop remains in force');
  result.completed = short(s);
  const stopHash = hash(await page.evaluate(() => demo.exportState())); await page.waitForTimeout(250);
  check(hash(await page.evaluate(() => demo.exportState())) === stopHash, 'final paused world remains byte-identical');

  // Same owned page, genuine fixed Gemini source. Full round-trip is in targeted tests.
  await page.goto(`${origin}/scene-shared/harness/`); await wait(() => window.sceneHarness?.snapshot()?.tick > 20);
  await page.evaluate(() => sceneHarness.pause());
  let sourceSnap = await page.evaluate(() => sceneHarness.snapshot());
  check(sourceSnap.source === 'gemini:bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9' && sourceSnap.actors.length === 2, 'same renderer genuinely displays fixed Gemini core, not a fixture');
  result.fixedGemini = { source: sourceSnap.source, tick: sourceSnap.tick, actors: sourceSnap.actors };

  await page.goto(`${origin}/scene-shared/harness/?core=gpt`);
  await wait(() => window.sceneHarness?.state()?.journal.some((e) => e.type === 'transfer' && e.from === 'bag.leader' && e.to === 'store' && e.item === 'herb'));
  await page.evaluate(() => sceneHarness.pause()); await page.waitForTimeout(80);
  sourceSnap = await page.evaluate(() => sceneHarness.snapshot()); const w = await page.evaluate(() => sceneHarness.state());
  check(sourceSnap.source === 'gpt:6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc' && w.inventories.store.items.herb === 6, 'same renderer displays true GPT harvest→bag→store on native map');
  check(sourceSnap.actors.find((a) => a.id === 'leader').positionSource === 'core.fixedPointPosition', 'GPT foot positions come from real fixed-point core, not Gemini routes');
  result.fixedGPT = { source: sourceSnap.source, tick: sourceSnap.tick, seed: w.seed, worldHash: hash(w),
    delivery: w.journal.find((e) => e.type === 'transfer' && e.from === 'bag.leader' && e.to === 'store' && e.item === 'herb'),
    actors: sourceSnap.actors.filter((a) => ['leader', 'amu', 'child'].includes(a.id)) };
  await screenshot('gpt-native-map.png');
  check(result.consoleErrors.length === 0, 'Cloud desktop flow has no page or console errors');
  result.passed = true;
} catch (e) { result.failure = e.stack || String(e); console.error(result.failure); process.exitCode = 1;
} finally {
  if (page && !page.isClosed()) { try { await page.evaluate(() => { if (window.sceneHarness) window.sceneHarness.pause(); else if (window.demo?.snapshot().playing) document.getElementById('play').click(); }); await page.setViewportSize(result.viewport); } catch {} }
  try { await context?.close(); } catch (e) { result.contextCleanupError = String(e); }
  try { await browser?.close(); } catch (e) { result.browserCleanupError = String(e); }
  const exited = server.exitCode !== null || server.signalCode !== null;
  if (!exited) { server.kill('SIGTERM'); await once(server, 'exit'); }
  result.cleanup = { pages: context?.pages().length ?? 0, browserClosed: !browser?.isConnected(), serverStopped: server.exitCode !== null || server.signalCode !== null, serverPid: server.pid, viewport: 'owned context restored then closed' };
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed || false, checks: result.checks.length, cleanup: result.cleanup }));
}
