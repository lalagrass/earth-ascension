// v1.8 A7 領悟線索 瀏覽器實點：開局→武學面板出現「領悟線索」；切換弟子（反例：已學的武學不列、秘傳只露剪影＋取得方式）；
// 練到前置（狀態修改：直接改熟練）後該條線索消失。用法：PW=<playwright-core 路徑> node artifacts/v180/flow-v180.mjs。PORT 18980，不碰 8800。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PWM = await import(process.env.PW || 'playwright-core'); const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../..'), PORT = 18980;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
const res = { steps: [], errs: [] }; const ok = (n, c, d) => { res.steps.push({ n, pass: !!c, d }); console.log(c ? 'PASS' : 'FAIL', n, JSON.stringify(d ?? '')); };
const clear = async (p) => { for (const sel of ['#g-off', '[data-pick="0"]', '#chap-go', '#alert-ok']) { const b = await p.$(sel); if (b && await b.isVisible()) await b.click().catch(() => {}); } };
const shot = async (p, n) => { await p.$eval('#arts', (e) => e.scrollIntoView()); await p.waitForTimeout(300); await p.screenshot({ path: `${root}/shots/v180-${n}.png` }); };
const hints = (p) => p.$$eval('#arts .art-hint', (xs) => xs.map((x) => ({ id: x.dataset.hint, t: x.textContent })));
let br;
try {
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const p = await br.newPage({ viewport: { width: 1440, height: 1000 } }); p.on('pageerror', (e) => res.errs.push(String(e)));
  p.on('dialog', async (d) => { await d.accept(); });
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  await p.click('[data-hero="guojing"]'); await p.click('[data-comp="huangrong"]').catch(() => {}); await p.click('#st-go'); await p.waitForTimeout(1500); await clear(p);
  await p.click('[data-speed="4"]'); for (let i = 0; i < 120 && !(await p.$eval('#arts', (e) => e.offsetParent !== null && !!e.querySelector('.art-hint')).catch(() => false)); i++) { await clear(p); await p.waitForTimeout(500); } await p.click('[data-speed="0"]'); await clear(p); // 武學圖第 120 拍才開放（自然解鎖）
  let h = await hints(p); const who0 = await p.$eval('[data-artsof]', (e) => e.selectedOptions[0].textContent);
  ok('武學面板出現「領悟線索」，鎖住的武學寫出還差什麼', h.length > 0 && h.some((x) => /練到/.test(x.t)), { who: who0, sample: h.slice(0, 3).map((x) => x.t) });
  ok('秘傳武學只露剪影＋取得方式', h.some((x) => x.t.includes('？？？') && /洪七公|岳不群|阿星|風清揚/.test(x.t)), h.filter((x) => x.t.includes('？？？')).map((x) => x.t));
  await shot(p, '01-art-hints');
  // 反例：已學的武學不出現在線索裡
  const learned = await p.evaluate(() => { const S = window.__sect.S; const id = document.querySelector('[data-artsof]').value; return Object.keys(S.ds.find((d) => d.id === id).arts); });
  ok('反例：已學的武學不列在線索', !h.some((x) => learned.includes(x.id)), { learned });
  // 切換弟子（實點下拉）
  const opts = await p.$$eval('[data-artsof] option', (os) => os.map((o) => o.value)); const other = opts.find((v, i) => i > 0);
  await p.click('[data-speed="0"]'); await p.$eval('#arts', (e) => e.scrollIntoView()); await p.selectOption('#arts [data-artsof]', other, { timeout: 8000 }); await p.waitForTimeout(800); const h2 = await hints(p); const who1 = await p.$eval('[data-artsof]', (e) => e.selectedOptions[0].textContent);
  const learned2 = await p.evaluate((id) => Object.keys(window.__sect.S.ds.find((d) => d.id === id).arts), other);
  ok('切換弟子：線索跟著換人重算，已學的仍不列', who1 !== who0 && !h2.some((x) => learned2.includes(x.id)), { who: who1, learned2, n: h2.length });
  await shot(p, '02-art-hints-other');
  // 狀態修改：把此人基礎拳練到大成 → 「基礎拳練到小成」那條前置消失
  const before = h2.filter((x) => x.t.includes('基礎拳練到')).length;
  await p.evaluate((id) => { const d = window.__sect.S.ds.find((o) => o.id === id); d.arts.basicFist ??= { xp: 0, last: 0 }; d.arts.basicFist.xp = 80; d.arts.basicFist.bt1 = d.arts.basicFist.bt2 = true; }, other);
  await p.waitForTimeout(1500); const h3 = await hints(p); const after = h3.filter((x) => x.t.includes('基礎拳練到')).length;
  ok('（狀態修改）練到前置後，那條線索消失', before > 0 && after === 0, { before, after });
  await shot(p, '03-art-hints-after-req');
  { // PB-15/16/18 畫像開關：點按鈕切 v2，圖片換成後製版；小圖用頭像；再點還原（反例）
    const srcs = () => p.$$eval('img[src*="assets/portraits/"]', (L) => L.map((i) => [i.getAttribute('src'), i.clientWidth]));
    const s0 = await srcs(); await p.click('#pset'); await p.waitForTimeout(400); const s1 = await srcs();
    await p.$eval('#hero', (e) => e.scrollIntoView()); await p.screenshot({ path: `${root}/shots/v180-04-portraits-v2.png` });
    const v2 = s1.filter(([s]) => s.includes('/v2/post/')); const smallHead = s1.filter(([s, w]) => w > 0 && w <= 72).every(([s]) => s.endsWith('-head.png'));
    await p.click('#pset'); await p.waitForTimeout(400); const s2 = await srcs();
    ok('畫像開關：v2 換成後製圖、小圖用頭像；再點還原舊圖', s0.length && s0.every(([s]) => !s.includes('/post/')) && v2.length === s1.length && smallHead && s2.every(([s]) => !s.includes('/post/')), { n: s0.length, v2: v2.slice(0, 3), back: s2.slice(0, 2) });
    const bad = await p.$$eval('img[src*="assets/portraits/"]', (L) => L.filter((i) => i.complete && !i.naturalWidth).length); ok('（反例）沒有破圖', bad === 0, { bad });
  }
  ok('無頁面錯誤', !res.errs.length, res.errs);
} catch (e) { res.errs.push(String(e.stack || e)); console.log('ERR', e); }
finally { await br?.close(); srv.close(); fs.writeFileSync(`${here}/flow-v180-result.json`, JSON.stringify(res, null, 1)); }
