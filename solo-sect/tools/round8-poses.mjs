// N48 可見證據：第十日早課近鏡，以及同骨架的實戰三段。
// PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tools/round8-poses.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#start');
  await page.click('[data-tab=classic]'); await page.click('[data-hero=guojing]'); await page.click('[data-comp=huangrong]'); await page.click('#st-go');
  await page.waitForFunction(() => !!window.__sect?.S);
  const actor = await page.evaluate(async () => {
    const { createState, tick } = await import('/src/sim.mjs');
    const { ALL_ON, botDaily } = await import('/test/harness/bot.mjs');
    const s = window.__sect.S; window.__sect.speed = 0;
    const fresh = createState(1001, { kind: 'template', id: 'guojing', askMajor: false, ...ALL_ON });
    for (const k of Object.keys(s)) delete s[k]; Object.assign(s, fresh);
    let day = s.day, best = null, most = -1;
    for (let i = 0; i < 1200; i++) {
      tick(s, 6); if (s.alert) s.alert = null;
      if (s.day !== day) { day = s.day; botDaily(s); }
      if (s.day === 10 && s.t % 600 < 120) {
        const n = s.ds.filter((d) => d.task?.act === 'train' && d.task.phase === 'do').length;
        if (n > most) { most = n; best = structuredClone(s); }
      }
      if (s.day > 10 || (s.day === 10 && s.t % 600 >= 120)) break;
    }
    if (best) Object.assign(s, best);
    const d = s.ds.find((x) => x.task?.act === 'train' && x.task.phase === 'do');
    window.__sect.panel();
    return { id: d.id, name: d.name, day: s.day, t: s.t };
  });
  await page.evaluate((id) => window.__sect.focusOn(id), actor.id);
  await page.waitForTimeout(1500);
  const out = (name) => path.join(root, 'artifacts/round8', name);
  await page.screenshot({ path: out('n48-yard.png') });
  if (process.argv.includes('--gif')) {
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'round8-poses-'));
    try {
      for (let i = 0; i < 60; i++) {
        await page.evaluate((id) => {
          // 一格畫面對應 0.5 秒遊戲時間；只沿固定步長推進權威模擬。
          const s = window.__sect.S;
          return import('/src/sim.mjs').then(({ tick }) => {
            tick(s, 0.5); if (s.alert) s.alert = null;
            window.__sect.focusOn(id); window.__sect.panel();
            document.getElementById('panel').scrollTop = 0;
          });
        }, actor.id);
        await page.waitForTimeout(25);
        await page.screenshot({ path: path.join(frames, `frame-${String(i).padStart(3, '0')}.png`) });
      }
      const palette = path.join(frames, 'palette.png'), gif = out('round8-day10-morning.gif');
      const paletteRun = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '2', '-i', path.join(frames, 'frame-%03d.png'), '-vf', 'fps=2,scale=1280:-1:flags=lanczos,palettegen=stats_mode=diff', palette], { encoding: 'utf8' });
      if (paletteRun.status) throw new Error(paletteRun.stderr);
      const gifRun = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '2', '-i', path.join(frames, 'frame-%03d.png'), '-i', palette, '-lavfi', 'fps=2,scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3', gif], { encoding: 'utf8' });
      if (gifRun.status) throw new Error(gifRun.stderr);
      console.log(JSON.stringify({ gif: path.relative(root, gif), seconds: 30, frames: 60, fps: 2 }));
    } finally { fs.rmSync(frames, { recursive: true, force: true }); }
  }
  const combat = [];
  for (const [name, state] of [['wind', 'wind'], ['strike', 'strike'], ['defend', 'ring']]) {
    await page.evaluate(({ id, state }) => {
      const s = window.__sect.S, d = s.ds.find((x) => x.id === id);
      if (state === 'ring') { d.anim = null; d.swing = null; d.ring = { intercept: true, t: s.t, busy: 0.3 }; }
      else { d.ring = null; d.anim = state; d.swing = { mv: 'fist', tgt: 'demo', at: s.t + 1 }; }
      window.__sect.panel();
    }, { id: actor.id, state });
    await page.waitForTimeout(200);
    await page.screenshot({ path: out(`n48-${name}.png`) });
    combat.push(name);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ actor, images: ['n48-yard.png', ...combat.map((x) => `n48-${x}.png`)] }));
  await page.close();
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
