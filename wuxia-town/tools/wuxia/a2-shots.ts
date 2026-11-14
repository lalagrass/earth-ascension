// 武俠小鎮 A2（#575 驗收「build:local＋Playwright 看一眼」）。先 npm run build:local。
// 1. Node 裡用瀏覽器 Worker 同一個 LocalCore 開一局「大師第 1 日進鎮」，跑到第 N 日傍晚指點時段，匯出存檔檔案
// 2. Playwright（系統 Chromium）打開 dist-local →「讀取存檔」匯入 → hash 等於 Node 端（畫面 local 方＝無頭同一份程式）
// 3. 打開「顯示太極」、「傳承」面板、點一條傳承邊、點角落提示選人、看「武學」分頁；390 寬看一次
// 4. 全程沒有對外請求、沒有 4xx／5xx、console 沒有 error
// --shots docs/wuxia/a02 另存最多 3 張截圖（每張 ≤1 MB，超過就轉 JPEG）。
// 用法：npm run wuxia:a2-shots -- [--day 9] [--shots docs/wuxia/a02]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, Page } from 'playwright-core';
import { LocalCore } from '../../src/wuxia/engine/core';
import { parseArgs, quietConsole } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist-local');
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .filter(Boolean)
  .find((p) => existsSync(p!)) as string | undefined;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};
let failures = 0;
const ok = (m: string) => process.stdout.write(`ok   ${m}\n`);
const fail = (m: string) => {
  failures++;
  process.stdout.write(`FAIL ${m}\n`);
};

function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    let f = join(DIST, decodeURIComponent((req.url ?? '/').split('?')[0]));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return new Promise((r) =>
    server.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, close: () => server.close() })),
  );
}
const engine = (page: Page, fn: string, ...args: any[]) =>
  page.evaluate(([fn, args]) => (window as any).__WUXIA_ENGINE__[fn as string](...(args as any[])), [fn, args] as const);

async function shot(page: Page, path: string) {
  await page.screenshot({ path });
  if (statSync(path).size > 1_000_000) {
    const jpg = path.replace(/\.png$/, '.jpg');
    execFileSync('python3', ['-c', `from PIL import Image; Image.open('${path}').convert('RGB').save('${jpg}', quality=82)`]);
    unlinkSync(path);
    return jpg;
  }
  return path;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  if (!existsSync(join(DIST, 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  if (!CHROME) throw new Error('找不到 Chrome／Chromium，請設定 WUXIA_CHROME');
  const shots = args.shots ? resolve(ROOT, String(args.shots)) : undefined;
  if (shots) mkdirSync(shots, { recursive: true });
  const day = Number(args.day ?? 9);
  // 1. Node 端開局、跑到第 day 日 17:50（卯正＝遊戲分 0，17:50＝第 770 分），存檔
  const core = new LocalCore();
  core.init({ kind: 'new', world: { seed: 7, arriveDay: 1, scenario: 'master-open' } });
  core.autoSlow = false;
  const target = (day - 1) * 1440 + 770;
  while (core.session.gameMinute() < target) core.advance(Math.min(600, Math.max(1, target - core.session.gameMinute())));
  const save = core.save('A2 截圖');
  const file = join(tmpdir(), `wuxia-a2-save-${process.pid}.json`);
  writeFileSync(file, JSON.stringify(save));
  const nodeHash = core.hash();
  ok(`Node LocalCore：seed 7、大師第 1 日進鎮，跑到第 ${day} 日（遊戲分 ${core.session.gameMinute()}），hash ${nodeHash.slice(0, 16)}…`);

  const { url: origin, close } = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
  });
  const external: string[] = [];
  const bad: string[] = [];
  const errors: string[] = [];
  const out: string[] = [];
  try {
    for (const vp of [{ width: 1400, height: 820 }, { width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport: vp });
      ctx.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
      });
      ctx.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
      const page = await ctx.newPage();
      page.on('console', (m) => m.type() === 'error' && !/favicon\.ico/.test(m.location()?.url ?? '') && errors.push(`${m.text()} ${m.location()?.url ?? ''}`));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${origin}/`);
      await page.getByTestId('wuxia-load').click();
      await page.getByTestId('wuxia-import').setInputFiles(file);
      await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
      await page.getByTestId('wuxia-speed-0').click();
      const h = await engine(page, 'hash');
      if (vp.width > 400) {
        (h.steps === save.steps ? (h.hash === nodeHash ? ok : fail) : ok)(
          `瀏覽器匯入存檔 hash ${h.hash.slice(0, 16)}…${h.steps === save.steps ? ` ＝ Node ${nodeHash.slice(0, 16)}…` : `（讀檔後多跑到第 ${h.steps} 步，不比）`}`,
        );
        await page.getByTestId('wuxia-taiji-toggle').click();
        await page.getByTestId('wuxia-btn-lineage').click();
        await page.getByTestId('wuxia-a2-lineage').waitFor();
        // 點譜系裡的大師名字＝選中並把鏡頭移到大師（小廣場）；再用滾輪放大一點，關掉人物詳情
        await page.locator('.wuxia-a2-name').first().click();
        await page.waitForTimeout(900);
        await page.mouse.move(vp.width * 0.4, vp.height * 0.5);
        for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200), await page.waitForTimeout(150);
        await page.getByTestId('wuxia-btn-lineage').click();
        await page.getByLabel('關閉').click();
        await page.getByTestId('wuxia-btn-lineage').click();
        await page.getByTestId('wuxia-a2-edge').first().click();
        await page.getByTestId('wuxia-a2-trace').waitFor();
        ok('「顯示太極」、「傳承」面板、點傳承邊出現單招追溯');
        await page.waitForTimeout(800);
        if (shots) out.push(await shot(page, join(shots, 'a02-lineage.png')));
        await page.getByTestId('wuxia-btn-lineage').click();
        const hints = page.getByTestId('wuxia-a2-hints').locator('button');
        const nHints = await hints.count();
        (nHints > 0 ? ok : fail)(`角落提示 ${nHints} 則`);
        if (nHints) await hints.first().click();
        await page.getByTestId('wuxia-detail').waitFor();
        await page.getByTestId('wuxia-tab-art').click();
        await page.getByTestId('wuxia-a2-art').waitFor();
        ok('點提示選中那人、人物詳情「武學」分頁');
        await page.waitForTimeout(400);
        if (shots) out.push(await shot(page, join(shots, 'a02-art.png')));
      } else {
        await page.getByTestId('wuxia-taiji-toggle').click();
        await page.getByTestId('wuxia-btn-lineage').click();
        await page.getByTestId('wuxia-a2-lineage').waitFor();
        ok('390 寬：傳承面板');
        await page.waitForTimeout(500);
        if (shots) out.push(await shot(page, join(shots, 'a02-390.png')));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    close();
  }
  (external.length === 0 ? ok : fail)(`沒有任何對外請求${external.length ? '：' + [...new Set(external)].join(' ') : ''}`);
  (bad.length === 0 ? ok : fail)(`沒有 4xx／5xx${bad.length ? '：' + [...new Set(bad)].join(' ') : ''}`);
  (errors.length === 0 ? ok : fail)(`console 沒有 error${errors.length ? '：' + errors.slice(0, 5).join(' | ') : ''}`);
  for (const f of out) process.stdout.write(`shot ${f.replace(ROOT, '')} ${(statSync(f).size / 1024).toFixed(0)} KB\n`);
  if (failures) {
    process.stdout.write(`wuxia:a2-shots FAILED (${failures})\n`);
    process.exit(1);
  }
  process.stdout.write('wuxia:a2-shots passed\n');
}
void main();
