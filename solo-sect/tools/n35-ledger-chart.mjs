// Offline visual summary for the N35 daily ledger. Requires a browser only to
// capture the HTML as a PNG; no browser dependency enters the game.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import http from 'node:http';
import { TECHNIQUES } from '../src/technique-data.mjs';
const { chromium } = await import(process.env.PW || 'playwright-core');
const arg = (name, fallback) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=')[1] || fallback;
const natural = JSON.parse(await readFile(resolve(arg('natural', 'artifacts/n35-natural/default-30.json'))));
const hunt = JSON.parse(await readFile(resolve(arg('hunt', 'artifacts/n35-natural/hunt-every-3-seed1001.json'))));
const out = resolve(arg('out', 'artifacts/n35-natural/ledger.png'));
const table = TECHNIQUES.map((row) => { const a = natural.contexts[row.id] || {}, b = hunt.contexts[row.id] || {};
  return `<tr><th>${row.name}</th><td>${a.seen || 0}</td><td>${a.lost || 0}</td><td>${a.heroLost || 0}</td><td>${b.seen || 0}</td><td>${b.heroLost || 0}</td></tr>`;
}).join('');
const max = natural.rows.flatMap((r) => r.daily.map((d) => d.peak).filter(Boolean)).sort((a, b) => b.ratio - a.ratio)[0];
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>body{margin:0;background:#e8ddc4;color:#352d24;font:20px/1.5 sans-serif}.sheet{padding:28px 38px;width:1100px;height:640px;box-sizing:border-box}h1{margin:0;font-size:30px}p{margin:8px 0 16px;color:#63543f}table{border-collapse:collapse;width:100%;background:#fff9ea}th,td{padding:9px 12px;border:1px solid #b7a483;text-align:right}th:first-child{text-align:left}thead{background:#795b3f;color:white}.note{display:flex;gap:16px;margin-top:18px}.box{flex:1;padding:13px 17px;background:#d7c3a0;border-left:5px solid #826144}.box b{display:block;font-size:23px}.small{font-size:15px;color:#5d513f}</style><div class="sheet"><h1>N35：情境有發生，卻沒有自然悟招</h1><p>Node 22 真實 30 日；左側 12 種子自然門規，右側 seed 1001 每三日合法派狩獵一次</p><table><thead><tr><th>招式情境</th><th>自然匹配</th><th>自然失手</th><th>主角失手</th><th>狩獵匹配</th><th>狩獵主角失手</th></tr></thead><tbody>${table}</tbody></table><div class="note"><div class="box"><b>自然首悟 0 / 12</b><span class="small">野豬衝撞 0；自然巡獵 0。30 日全門最高進度 ${Math.round(max.ratio * 100)}% 門檻。</span></div><div class="box"><b>狩獵：衝撞 ${hunt.rows[0].boarCharges} 次</b><span class="small">擲石開場情境 ${hunt.contexts.stoneOpening?.seen || 0} 次；第一招仍未悟出，不能把情境出現當作跨線。</span></div></div></div>`;
await mkdir(dirname(out), { recursive: true });
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try { await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await page.screenshot({ path: out });
} finally { await browser.close(); server.close(); }
console.log(out);
