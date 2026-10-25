// 一次桌面走查（v0.96 主角建立、同門、抉擇卡；每版只留 3 張）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root = path.dirname(new URL(import.meta.url).pathname), PORT = 18931;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
let browser; const errs = [];
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await browser.newPage({ viewport: { width: 1700, height: 900 } });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && !/favicon|404/.test(m.text()) && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForTimeout(1500);

  await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const pause = (v) => E((v) => { window.__sect.speed = v; }, v);
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v096-')) fs.unlinkSync(`${root}/shots/${f}`);
  // 1 新局：經典人物模板（郭靖）＋開局同門（黃蓉／穆念慈）
  await p.waitForSelector('#start'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${root}/shots/v096-01-template-companion.png` });
  // 2 自創主角：12 點（悟性 1 退點＝笨功夫）＋九問問心
  await p.click('[data-tab=custom]'); await p.click('[data-st="wu|-1"]'); for (let i = 0; i < 3; i++) await p.click('[data-st="gen|1"]');
  await p.selectOption('[data-q9="3"]', '0'); await p.selectOption('[data-q9="1"]', '0'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${root}/shots/v096-02-custom-q9.png` });
  // 3 郭靖＋黃蓉開局，第 2 天：洪七公抉擇卡＋主角卡（本心、違心、默契）
  await p.click('[data-tab=classic]'); await p.click('[data-hero=guojing]'); await p.click('[data-comp=huangrong]'); await p.click('#st-go'); await pause(0);
  await E(() => { const S = window.__sect.S, m = window.__simMod; S.aff['hero>huangrong'] = 48; S.guide.on = false; let i = 0; while (!S.choices.length && i++ < 20000) m.tick(S); S.ds[0].wexin = 1; window.__sect.panel(); });
  await p.waitForTimeout(900); await p.screenshot({ path: `${root}/shots/v096-03-choice-herocard.png` });
  const st = await E(() => { const S = window.__sect.S; return { day: S.day, hero: S.hero?.name, comp: S.hero?.companion, choices: S.choices.map((c) => c.title), pair: S.ds[0].pairMul, rules: S.rules }; });
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
