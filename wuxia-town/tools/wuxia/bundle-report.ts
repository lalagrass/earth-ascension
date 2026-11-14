// 武俠小鎮 A5（#577 第 1、5 節，驗收 A2 與 C）：`npm run build:local && npm run wuxia:bundle-report [-- --base /x/ai-town/] [--out /tmp/b.json]`
// 1. dist-local 每個檔案的大小、總量、最大的 10 個
// 2. 首次載入（Playwright）：首頁、進到小鎮畫面後 5 秒，伺服器實際送出的位元組；判定 ≤ 5 MB
// 3. 產物不含上游美術：沒有 assets/ 目錄、檔名不在 tools/wuxia/upstream-assets.txt、內容雜湊不等於本機 public/assets 的任何檔（有的話）
// 4. CREDITS：dist-local/ai-town/wuxia/ 每個檔都登記在 CREDITS.md
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseArgs } from './sim';
import { serveDist } from './e2e';

const ROOT = new URL('../..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist-local');
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p!)) as string | undefined;
const LIMIT = 5 * 1024 * 1024;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = String(args.base ?? '/ai-town/');
  if (!existsSync(join(DIST, 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  let failures = 0;
  const v = (ok: boolean, m: string) => (ok ? process.stdout.write(`ok   ${m}\n`) : (failures++, process.stdout.write(`FAIL ${m}\n`)));
  const files = walk(DIST).map((f) => ({ f: relative(DIST, f), size: statSync(f).size }));
  const total = files.reduce((a, x) => a + x.size, 0);
  process.stdout.write(`dist-local：${files.length} 個檔、共 ${(total / 1024 / 1024).toFixed(2)} MB\n`);
  for (const x of [...files].sort((a, b) => b.size - a.size).slice(0, 10)) process.stdout.write(`  ${(x.size / 1024).toFixed(0).padStart(6)} KB  ${x.f}\n`);
  // 2
  let homeBytes = 0;
  let townBytes = 0;
  if (CHROME) {
    const srv = await serveDist(base);
    const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const bad: string[] = [];
      page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
      await page.goto(`${srv.url}${base}`);
      await page.getByTestId('wuxia-a4-scenarios').waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1000);
      homeBytes = srv.bytes();
      await page.getByTestId('wuxia-start').click();
      await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
      await page.waitForTimeout(5000);
      townBytes = srv.bytes();
      v(townBytes <= LIMIT, `首次載入：首頁 ${(homeBytes / 1024 / 1024).toFixed(2)} MB、進到小鎮 5 秒後共 ${(townBytes / 1024 / 1024).toFixed(2)} MB（≤ 5 MB；base ${base}）`);
      v(bad.length === 0, `載入過程沒有 4xx／5xx${bad.length ? '：' + bad.slice(0, 5).join(' ') : ''}`);
    } finally {
      await browser.close();
      srv.close();
    }
  } else v(false, '找不到 Chrome，量不到首次載入');
  // 3
  const upstreamNames = new Set(readFileSync(join(ROOT, 'tools/wuxia/upstream-assets.txt'), 'utf8').split('\n').map((l) => basename(l.trim())).filter(Boolean));
  const assetsDir = files.filter((x) => /(^|\/)assets\//.test(x.f));
  v(assetsDir.length === 0, `產物沒有 assets/ 目錄（上游素材的位置）${assetsDir.length ? '：' + assetsDir.slice(0, 5).map((x) => x.f).join(', ') : ''}`);
  // 同名但放在 wuxia/ 底下、CREDITS 登記為自製的（例如自己畫的 ui/close.svg）不算；其他位置同名就算
  const creditsText = readFileSync(join(ROOT, 'public/wuxia/CREDITS.md'), 'utf8');
  const same = files.filter((x) => upstreamNames.has(basename(x.f)));
  const nameHits = same.filter((x) => !(x.f.startsWith('ai-town/wuxia/') && creditsText.includes(x.f.slice('ai-town/wuxia/'.length))));
  v(nameHits.length === 0, `產物沒有來路不明、跟上游素材同名的檔（${upstreamNames.size} 個名字；同名但自製且登記：${same.length - nameHits.length} 個）${nameHits.length ? '：' + nameHits.map((x) => x.f).join(', ') : ''}`);
  const localUp = walk(join(ROOT, 'public/assets'));
  if (localUp.length) {
    const up = new Set(localUp.map(sha));
    const hashHits = files.filter((x) => up.has(sha(join(DIST, x.f))));
    v(hashHits.length === 0, `產物沒有任何檔的內容等於本機 public/assets 的上游素材（比對 ${localUp.length} 個）${hashHits.length ? '：' + hashHits.map((x) => x.f).join(', ') : ''}`);
  } else process.stdout.write('（本機沒有 public/assets，略過內容雜湊比對；檔名比對照做）\n');
  // 4
  const credits = readFileSync(join(ROOT, 'public/wuxia/CREDITS.md'), 'utf8');
  const shipped = files.filter((x) => x.f.startsWith('ai-town/wuxia/') && !x.f.endsWith('CREDITS.md'));
  const missing = shipped.filter((x) => !credits.includes(x.f.slice('ai-town/wuxia/'.length)));
  v(missing.length === 0, `產物裡的 ${shipped.length} 個素材檔都登記在 CREDITS.md${missing.length ? '；漏：' + missing.map((x) => x.f).join(', ') : ''}`);
  v(files.some((x) => x.f === 'ai-town/wuxia/CREDITS.md'), '產物帶著 CREDITS.md（授權與署名頁讀這個檔）');
  if (args.out) writeFileSync(String(args.out), JSON.stringify({ tool: 'wuxia-town bundle-report', base, totalBytes: total, files: files.length, homeBytes, townBytes, failures }, null, 2));
  process.stdout.write(failures ? `wuxia:bundle-report FAILED (${failures})\n` : 'wuxia:bundle-report passed\n');
  process.exit(failures ? 1 : 0);
}
void main();
