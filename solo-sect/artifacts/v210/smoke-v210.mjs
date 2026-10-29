// v2.1 收支列：開局點進去，讀「明晨預計」。
// 照舊 +6＝底數 2＋前十日早補 4。郭靖預設黃蓉 +4＝底數 2＋同伴 2，不是早補。
// 反例：郭靖改選穆念慈，同伴加成消失，變成 +2。種子是 Date.now()，只對這三個結構數字。
// PORT 19201。不碰 8800／8815。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const PWM = await import(process.env.PW || '/Users/chenyuying/workspace/LinkComment/linkcomment-chrome/node_modules/playwright-core/index.js');
const { chromium } = PWM.chromium ? PWM : PWM.default;
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../..');
const PORT = 19201;
const T = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript', '.webp': 'image/webp', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((ok) => srv.listen(PORT, '127.0.0.1', ok));
const errs = [];
const br = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await br.newPage({ viewport: { width: 1400, height: 900 } });
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text()));
async function boot(tab, comp) {
  await p.goto(`http://127.0.0.1:${PORT}/`);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#st-go');
  if (tab) await p.click(`[data-tab="${tab}"]`);
  if (comp) await p.click(`[data-comp="${comp}"]`);
  await p.click('#st-go');
  await p.waitForFunction(() => document.getElementById('ledger')?.textContent?.includes('明晨預計'));
  return p.evaluate(() => {
    const t = document.getElementById('ledger').textContent;
    const m = t.match(/明晨預計：香火 \+(\d+)/);
    const S = window.__sect.S;
    return { forecast: m ? +m[1] : null, hero: S.hero?.id || null, comp: S.hero?.companion || null, day: S.day, rep: S.rep, text: t.slice(t.indexOf('明晨預計'), t.indexOf('明晨預計') + 24) };
  });
}
const plain = await boot('plain');
const guojing = await boot(null);
const munianci = await boot(null, 'munianci');
const res = {
  plain, guojing, munianci, errs,
  pass: plain.forecast === 6 && plain.hero == null
    && guojing.forecast === 4 && guojing.hero === 'guojing' && guojing.comp === 'huangrong'
    && munianci.forecast === 2 && munianci.comp === 'munianci'
    && errs.length === 0,
};
fs.writeFileSync(`${here}/smoke-v210-result.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
await br.close();
srv.close();
