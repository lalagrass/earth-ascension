// One owned Cloud page/server. Ordinary UI commands and real clock only.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = new URL('../evidence/', import.meta.url), sect = new URL('../../', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const result = { checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sect, encoding: 'utf8' }).trim(), viewport: { width: 1440, height: 1000 }, checks: [], errors: [], screenshots: [] };
const port = Number(process.env.FACILITY_TEST_PORT || 8817), origin = `http://127.0.0.1:${port}`;
let browser, page, server;
const check = (ok, name) => { assert.ok(ok, name); result.checks.push(name); console.log('PASS', name); };
const snap = () => page.evaluate(() => window.demo.snapshot());
const wait = fn => page.waitForFunction(fn, undefined, { timeout: 100000, polling: 50 });
async function clickFacility(key) { await page.click('[data-view="yard"]'); const s = await snap(), p = s[key + 'Screen']; await page.mouse.click(p.x, p.y); await page.waitForSelector('#menu:not([hidden])'); }
async function shot(name) { await page.screenshot({ path: new URL(name, out).pathname }); result.screenshots.push(name); }
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  result.browser = browser.version();
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', sect], { stdio: 'ignore' });
  for (let n = 0; n < 30; n++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  if (server.exitCode !== null) throw new Error('Owned server failed to start');
  page = await browser.newPage({ viewport: result.viewport });
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
  await page.goto(origin); await wait(() => window.demo?.snapshot().frames > 3);
  check(new URL(page.url()).pathname === '/experiments/water-carry/demo/', 'single official entry');
  await page.click('#play'); await page.click('#reset');
  await page.click('#roster [data-person="hero"]');
  await page.click('#p-cmds [data-cmd="restAfterTrip"]');
  await page.click('[data-view="yard"]');
  let s = await snap();
  await page.mouse.move(s.vatScreen.x, s.vatScreen.y);
  await page.waitForSelector('#facility-tooltip:not([hidden])');
  check((await page.locator('#facility-tooltip').innerText()).includes('在途'), 'facility tooltip exposes real stock reservation');
  const before = await page.evaluate(() => demo.exportState());
  await page.mouse.click(s.vatScreen.x, s.vatScreen.y);
  await page.waitForSelector('[data-facility-id="official:facility:vat"]');
  await page.locator('#menu summary').click();
  check((await page.locator('#menu').innerText()).includes('站位預約 不支援'), 'stock reservations distinct from unsupported station reservation');
  assert.deepEqual(await page.evaluate(() => demo.exportState()), before); result.checks.push('paused inspect leaves whole authority unchanged');
  await shot('official-vat-detail.jpg');
  await page.click('#menu [data-cmd="work:water"]');
  await page.click('#roster [data-person="cousin"]');
  await clickFacility('rack');
  check(await page.locator('[data-facility-actor]').inputValue() === 'cousin', 'facility targets existing selected person');
  await page.selectOption('[data-facility-actor]', 'hero');
  await page.selectOption('[data-facility-actor]', 'cousin');
  check((await snap()).menuPerson === 'cousin', 'changing facility target updates the actual command actor');
  await page.click('#menu [data-cmd="work:herb"]');
  s = await snap(); check(s.tick === 0 && s.people.hero.done.water === 0 && s.people.cousin.done.herb === 0, 'two facility assignments at pause do not move or deliver');
  await page.click('[data-speed="4"]'); await page.click('#play');
  await wait(() => window.demo.snapshot().people.cousin.phase === 'herbGather');
  await page.click('#play'); s = await snap();
  check(s.people.cousin.x === 1398 && s.people.cousin.y === 772 && s.people.hero.done.water === 0, 'native herb entrance reached while longer water trip continues');
  result.herbGather = { tick: s.tick, people: s.people, herbs: s.herbs };
  await page.click('#play');
  await wait(() => window.demo.snapshot().people.cousin.phase === 'herbDeliver');
  await page.click('#play'); await clickFacility('rack');
  check((await page.locator('#menu').innerText()).includes('熟手同伴 ·'), 'real herb delivery user appears at original rack entrance');
  await shot('official-rack-user.jpg');
  await page.click('#menu [data-facility-card="cousin"]');
  check(await page.locator('#panel').isVisible() && (await snap()).selected === 'cousin' && (await snap()).menu === null, 'facility user opens existing character card');
  await page.click('#play');
  await wait(() => window.demo.snapshot().people.hero.phase === 'dip');
  await page.click('#play'); s = await snap();
  check(s.people.hero.x === 352 && s.people.hero.y === 1245 && s.people.cousin.done.herb >= 1, 'long water commute reaches original spring; herbs already delivered');
  await page.click('#play');
  await wait(() => { const s = window.demo.snapshot(); return s.people.hero.done.water >= 1 && s.people.cousin.done.herb >= 1; });
  await page.click('#play'); s = await snap();
  result.completed = { tick: s.tick, vat: s.vat, herbs: s.herbs, people: s.people };
  check(s.vat > 3 && s.herbs > 0, 'both original work loops update real resources');
  // Character selection wins over a facility behind a body; no foreground hit surface changed.
  await page.click('#roster [data-person="hero"]');
  s = await snap(); await page.mouse.click(s.people.hero.screen.x, s.people.hero.screen.y);
  check((await snap()).menu === null, 'actor click does not select a facility underneath');
  await clickFacility('vat'); await shot('official-delivered-vat.jpg');
  const final = await page.evaluate(() => demo.exportState()); await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(() => demo.exportState()), final); result.checks.push('final facility panel remains paused with unchanged full state');
  assert.deepEqual(result.errors, []); result.passed = true;
} catch (e) { result.passed = false; result.failure = e.stack || String(e); if (page) { result.snapshot = await snap().catch(() => null); await page.screenshot({ path: '/tmp/facility349-failure.jpg' }).catch(() => {}); } process.exitCode = 1; }
finally {
  if (page && !page.isClosed()) { await page.evaluate(() => { if (window.demo?.snapshot().playing) document.getElementById('play').click(); }).catch(() => {}); await page.setViewportSize(result.viewport).catch(() => {}); await page.close(); }
  await browser?.close();
  if (server && server.exitCode === null && server.signalCode === null) { server.kill('SIGTERM'); await new Promise(r => server.once('exit', r)); }
  result.cleanup = { pageClosed: !page || page.isClosed(), browserClosed: !browser || !browser.isConnected(), serverStopped: !server || server.exitCode !== null || server.signalCode !== null, viewport: 'owned viewport restored then browser closed' };
  await writeFile(new URL('desktop-results.json', out), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, checks: result.checks.length, failure: result.failure, cleanup: result.cleanup }));
}
