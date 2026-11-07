// N61 offline blind cards. Answer is intentionally separate from the picture.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const { chromium } = await import(process.env.PW || 'playwright-core');
import { growthSnapshots } from './growth-scenario.mjs';
import { battleMetrics } from '../src/growth-adapter.mjs';
import { battleRadarSvg } from '../src/panel-ui.mjs';

const arg = (name, fallback) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1] || fallback;
const seed = Number(arg('seed', '17')), outArg = arg('out', 'artifacts/n61'), out = resolve(outArg);
const root = resolve(fileURLToPath(import.meta.url), '../..');
if (!out.startsWith(root + sep)) throw Error('--out must be inside solo-sect');
const snapshots = growthSnapshots(seed, [1, 60]).snapshots;
const order = seed % 3 ? [1, 0] : [0, 1];
await mkdir(out, { recursive: true });
const card = (s, letter) => `<section class="blind-card"><header><canvas width="64" height="72" aria-label="匿名角色肖像"></canvas><div><small>山門人物卡</small><h2>角色 ${letter}</h2><p>姓名與日期已遮蔽</p></div></header>${battleRadarSvg(battleMetrics(s.hero))}<footer>快・眼・勁・身・耐・招</footer></section>`;
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>body{background:#d0c4a9}.blind-board{display:flex;gap:28px;padding:28px;align-items:flex-start}.blind-card{box-sizing:border-box;width:310px;min-height:395px;padding:16px;border:13px solid transparent;border-image:url('/assets/ui/kenney/panel_beige.png') 16 fill / 13px / 0 stretch;background:#e5d0a5;color:#493820}.blind-card header{display:flex;align-items:center;gap:12px;border-bottom:1px solid #aa9169}.blind-card header canvas{width:64px;height:72px;image-rendering:pixelated}.blind-card h2{font:700 23px WenKaiSubset,serif;margin:0}.blind-card p,.blind-card small,.blind-card footer{font-size:12px;color:#6e5d44}.blind-card footer{text-align:center;padding-top:6px;border-top:1px solid #aa9169}.radar-info{display:none}</style></head><body><main class="blind-board">${order.map((i, j) => card(snapshots[i], j ? 'B' : 'A')).join('')}</main></body></html>`;
await writeFile(resolve(out, 'blind.html'), html);
await writeFile(resolve(out, 'blind-answer.json'), JSON.stringify({ seed, A: snapshots[order[0]].day, B: snapshots[order[1]].day, command: `node tools/n61-blind-card.mjs --seed=${seed} --out=${outArg}` }, null, 2) + '\n');
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer(async (req, res) => { const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try { const bytes = await readFile(file); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(bytes); }
  catch { res.writeHead(404); res.end(); }
});
try { await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const page = await browser.newPage({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/${relative(root, out).split(sep).join('/')}/blind.html`);
  await page.evaluate(async (actors) => { const { dailyPose, drawPoseActor } = await import('/src/pose-render.mjs');
    document.querySelectorAll('.blind-card canvas').forEach((c, i) => { const g = c.getContext('2d'); g.translate(32, 66); drawPoseActor(g, actors[i], dailyPose(actors[i])); });
  }, order.map((i) => snapshots[i].hero));
  await page.screenshot({ path: resolve(out, 'blind.png') });
  const live = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = []; live.on('pageerror', (e) => errors.push(String(e)));
  await live.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await live.waitForSelector('#st-go'); await live.click('#st-go');
  await live.waitForFunction(() => !!window.__sect?.S && !window.__sect.starting);
  await live.evaluate(() => { window.__sect.freeze = true; window.__sect.panel(); });
  await live.locator('#focuscard').screenshot({ path: resolve(out, 'live-card.png') });
  const compared = await live.evaluate(() => { const selected = window.__artsOf || 'hero';
    const other = [...document.querySelectorAll('[data-dcard]')].find((c) => c.dataset.dcard !== selected);
    if (!other) return false; other.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    window.__sect.panel(); return !!document.querySelector('#focuscard .radar-opponent');
  });
  if (!compared) throw new Error('hovering another disciple did not show the comparison layer');
  await live.locator('#focuscard').screenshot({ path: resolve(out, 'compare-card.png') });
  if (errors.length) throw new Error(`live card browser errors: ${errors.join('; ')}`);
} finally { await browser.close(); server.close(); }
console.log(`N61 blind seed=${seed} -> ${out}/blind.png; answer separate`);
