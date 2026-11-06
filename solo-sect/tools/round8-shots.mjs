// 第八輪 N53：固定 seed 第 10 日早課，瀏覽器實拍舊／新站位。
// PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tools/round8-shots.mjs <base solo-sect 目錄> <head solo-sect 目錄>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = process.argv.slice(2).map((p) => path.resolve(p));
if (roots.length !== 2) throw new Error('請提供 base 與 head 的 solo-sect 目錄');
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  for (let index = 0; index < 2; index++) {
    const root = roots[index];
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
    });
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const errors = []; page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
      await page.waitForSelector('#start');
      await page.click('[data-tab=classic]'); await page.click('[data-hero=guojing]'); await page.click('[data-comp=huangrong]'); await page.click('#st-go');
      await page.waitForFunction(() => !!window.__sect?.S);
      const summary = await page.evaluate(async () => {
        const { createState, tick } = await import('/src/sim.mjs');
        const { ALL_ON, botDaily } = await import('/test/harness/bot.mjs');
        const s = window.__sect.S; window.__sect.speed = 0;
        const fresh = createState(1001, { kind: 'template', id: 'guojing', askMajor: false, ...ALL_ON });
        for (const k of Object.keys(s)) delete s[k]; Object.assign(s, fresh);
        let day = s.day, best = null, most = -1;
        for (let i = 0; i < 1200; i++) {
          tick(s, 6); if (s.alert) s.alert = null;
          if (s.day !== day) { day = s.day; botDaily(s); }
          if (s.day === 10 && s.t % 600 < 120) { const n = s.ds.filter((d) => d.task?.act === 'train' && d.task.phase === 'do').length; if (n > most) { most = n; best = structuredClone(s); } }
          if (s.day > 10 || (s.day === 10 && s.t % 600 >= 120)) break;
        }
        if (best) Object.assign(s, best);
        window.__sect.panel();
        return { day: s.day, time: s.t % 600, training: s.ds.filter((d) => d.task?.act === 'train' && d.task.phase === 'do').map((d) => ({ name: d.name, pos: d.pos, spot: d.task.spot })) };
      });
      await page.waitForTimeout(500);
      const out = path.join(here, `artifacts/round8/n53-${index ? 'head' : 'base'}.png`);
      await page.screenshot({ path: out });
      await page.close();
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(JSON.stringify({ image: path.relative(here, out), ...summary }));
    } finally { await new Promise((resolve) => server.close(resolve)); }
  }
} finally { await browser?.close(); }
