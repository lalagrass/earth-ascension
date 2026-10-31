// 一次桌面走查（v1.0 無盡巡山與營地、派遣面板與秘笈、地圖可讀性；每版只留 3 張）：臨時靜態服務 port 18931 + 無頭 Chrome；finally 清理。
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

  console.log("early errs", errs);
  await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  const E = (fn, arg) => p.evaluate(fn, arg);
  const pause = (v) => E((v) => { window.__sect.speed = v; }, v);
  for (const f of fs.readdirSync(`${root}/shots`)) if (f.startsWith('v140-')) fs.unlinkSync(`${root}/shots/${f}`);
  const clipExp = async (name) => { await p.locator('#panel').evaluate((el) => { el.scrollTop = document.getElementById('exp').offsetTop - 40; }); await p.waitForTimeout(300);
    const c1 = await p.locator('#exp').boundingBox(); await p.screenshot({ path: `${root}/shots/${name}`, clip: { x: c1.x - 8, y: Math.max(0, c1.y - 30), width: c1.width + 16, height: Math.min(880, c1.height + 40) } }); };
  await p.evaluate(() => localStorage.removeItem('solo-sect-suhui')); await p.reload(); await p.waitForTimeout(1200); await p.evaluate(async () => { window.__simMod = await import('./src/sim.mjs'); });
  // 1 郭靖＋黃蓉成親、收養兩個孩子；孩子在地圖上（小一號、標年齡）
  await p.waitForSelector('#start'); await p.click('[data-tab=classic]'); await p.click('[data-hero=guojing]'); await p.click('[data-comp=huangrong]'); await p.click('#st-go'); await pause(0);
  const r1 = await E(async () => { const S = window.__sect.S, m = window.__simMod, G = await import('./src/sect.mjs'), U = await import('./src/util.mjs'); S.guide.on = false; S.unlock = ['base', 'arts', 'hunt', 'exp', 'social', 'econ']; m.tick(S); S.jh.morningOn = false; S.jh.comedyOn = false;
    const h = S.ds.find((d) => d.id === 'hero'), hr = S.ds.find((d) => d.id !== 'hero' && d.name === '黃蓉'); S.rel[U.relKey(h.id, hr.id)] = 95; S.families.push(U.relKey(h.id, hr.id)); hr.personality = ['clever', 'honest']; S.day++; G.genStep(S);
    const ch = S.choices.find((c) => c.gen); if (ch) G.genResolve(S, ch, 0); S.choices = []; G.adopt(S, h, hr, () => 0.6); S.choices = [];
    const ks = S.ds.filter((d) => d.child); for (const d of S.ds) if (!d.child && d !== h && d !== hr) d.pos = [d.pos[0] + 200, d.pos[1] - 120]; [h, hr, ...ks].forEach((k, i) => { k.pos = [1000 + i * 60, 520]; k.path = []; k.task = null; k.order = { act: 'idle' }; }); if (ks[1]) ks[1].age = 11; window.__sect.panel(); return { kids: ks.map((k) => k.name + k.age), couples: S.gen.couples }; });
  console.log('r1', JSON.stringify(r1)); await p.waitForTimeout(600); { const b = await p.locator('#map').boundingBox(), k = b.width / 1600; await p.evaluate(() => { window.__sect.speed = 0; }); await p.screenshot({ path: `${root}/shots/v140-01-family-kids-map.png`, clip: { x: b.x + 900 * k, y: b.y + 380 * k, width: 420 * k, height: 220 * k }, scale: 'device' }); }
  // 2 衣缽：郭靖降龍化境，傳給成年的孩子；面板顯示第 2 代、衣缽譜、師承、宿慧
  const r2 = await E(async () => { const S = window.__sect.S, G = await import('./src/sect.mjs'), A = await import('./src/arts.mjs'); const h = S.ds.find((d) => d.id === 'hero'); A.learnArt(h, 'xianglong', S.t); Object.assign(h.arts.xianglong, { xp: 100, bt1: true, bt2: true });
    const k = S.ds.find((d) => d.child); k.adult = true; k.age = 18; k.sprite = 'hero'; const r = G.succeed(S, k.id, 'xianglong'); localStorage.setItem('solo-sect-suhui', String(S.gen.suhui)); S.gen.day = -1; G.genStep(S); window.__sect.panel(); return { ok: r.ok, why: r.why, gen: S.gen.n, hero: S.hero.name }; });
  console.log('r2', JSON.stringify(r2)); await clipExp('v140-02-lineage-panel.png');
  // 3 新局自創：宿慧 +1（12→13 點，標「宿慧開局」）
  await p.reload(); await p.waitForSelector('#start'); await p.click('[data-tab=custom]'); await p.waitForTimeout(400); await p.screenshot({ path: `${root}/shots/v140-03-suhui-start.png` });
  const st = await E(() => ({ suhui: localStorage.getItem('solo-sect-suhui') }));
  console.log(JSON.stringify(st)); console.log('page errors:', errs.length, errs.slice(0, 3));
} finally { await browser?.close(); await new Promise((r) => srv.close(r)); console.log('cleanup: browser closed, server closed'); }
