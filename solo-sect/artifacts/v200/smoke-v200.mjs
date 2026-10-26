// v2.0 browser smoke (display evidence only): the game loads in Chrome with the JSON import of destiny-trees.json, the sim ticks, no page errors.
// Usage: PW=<playwright-core path> node artifacts/v200/smoke-v200.mjs. PORT 19200, never 8800.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 19200;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((ok) => srv.listen(PORT, ok)); const errs = [], json = [];
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true }); const p = await br.newPage({ viewport: { width: 1400, height: 900 } });
p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && !/status of 404/.test(m.text()) && errs.push(m.text())); p.on('response', (r) => { if (r.url().endsWith('.json')) json.push([r.url().split('/').pop(), r.status()]); if (r.status() === 404) errs.push('404 ' + r.url().split('/').pop()); });
await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); p.on('dialog', (d) => d.accept());
await p.click('[data-hero="weixiaobao"]'); await p.click('#st-go'); await p.waitForTimeout(1500);
for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } await p.waitForTimeout(500);
await p.click('[data-speed="16"]'); const t0 = await p.evaluate(() => window.__sect?.S?.t); await p.waitForTimeout(20000); const t1 = await p.evaluate(() => window.__sect?.S?.t);
const arcLine = await p.evaluate(() => { const t = document.body.textContent; const i = t.indexOf('📜 主線：'); return i < 0 ? null : t.slice(i, i + 60); }); const arcStep = await p.evaluate(() => window.__sect.S.hero?.arcStep);
await p.screenshot({ path: `${root}/shots/v200-01-load.png` });
const want = JSON.parse(fs.readFileSync(`${root}/src/destiny-trees.json`)).arcs.weixiaobao; const arcOk = !!arcLine && want.every((x) => arcLine.includes(x));
const res = { arcLine, arcStep, arcOk, destinyJson: json, t0, t1, ticks: t1 > t0, errs, pass: errs.filter((e) => e !== '404 favicon.ico').length === 0 && t1 > t0 && arcOk && json.some(([f, s]) => f === 'destiny-trees.json' && s === 200) };
fs.writeFileSync(`${here}/smoke-v200-result.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res)); await br.close(); srv.close();
