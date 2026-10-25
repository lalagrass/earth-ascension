// 真實點擊開局（郭靖＋黃蓉）→ 16× 跑約 60 秒實際時間 → 截目前場景圖與量測。用法：PW=<playwright-core> node artifacts/design-review/shoot-map.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const out = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(out, '../..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.mjs': 'text/javascript', '.png': 'image/png', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(18933, '127.0.0.1', r));
const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const p = await br.newPage({ viewport: { width: 1700, height: 900 } }); p.on('dialog', (d) => d.accept());
await p.goto('http://127.0.0.1:18933/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.click('[data-speed="16"]');
for (let i = 0; i < 60; i++) { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } await p.waitForTimeout(1000); }
const m = await p.evaluate(() => { const S = window.__sect.S, c = document.getElementById('map'); return { canvas: [c.width, c.height], t: Math.round(S.t), ds: S.ds.length, fac: Object.fromEntries(Object.entries(S.fac).map(([k, v]) => [k, v.stage ?? v])), mons: S.mons.length }; });
await (await p.$('#map')).screenshot({ path: path.join(out, 'current-map.png') });
fs.writeFileSync(path.join(out, 'current-map.json'), JSON.stringify(m, null, 1)); console.log(JSON.stringify(m));
await br.close(); srv.close();
