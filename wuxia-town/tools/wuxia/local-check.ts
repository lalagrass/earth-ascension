// 武俠小鎮 A1：wuxia:local-check（#564 驗收 A1、A2、A3 的瀏覽器部分）。先 npm run build:local。
// 用 Node 內建 http 把 dist-local/ 當靜態網站放出來（等同 npx serve dist-local），Playwright（系統 Chromium）打開：
//   1. 首頁 →「開始」→ 遊戲畫面出現；瀏覽器裡的 Web Worker 跑 N 步的 hash＝無頭模擬同步數的 hash（三方 hash 的 local 方）
//   2. 64× 跑幾秒，量實際倍速；「跳到明早」停在卯正
//   3. 存到瀏覽器（IndexedDB）→ 重新整理 →「讀取存檔」→ hash 相同；匯出存檔檔案 → 新的瀏覽器設定檔匯入 → hash 相同
//   4. 規則版本不同的存檔被拒絕並顯示原因
//   5. 全程：沒有任何對外（非本機）請求、沒有 4xx／5xx、console 沒有 error
// --shots docs/wuxia/a01 另存最多 3 張截圖（首頁、遊戲＋時間列＋存檔選單、390 寬）。
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, Page, BrowserContext } from 'playwright-core';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist-local');
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .filter(Boolean)
  .find((p) => existsSync(p!)) as string | undefined;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.webp': 'image/webp',
};

let failures = 0;
const ok = (m: string) => process.stdout.write(`ok   ${m}\n`);
const fail = (m: string) => {
  failures++;
  process.stdout.write(`FAIL ${m}\n`);
};

function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let f = join(DIST, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
    void p;
  });
  return new Promise((r) =>
    server.listen(0, '127.0.0.1', () => {
      const a = server.address() as { port: number };
      r({ url: `http://127.0.0.1:${a.port}`, close: () => server.close() });
    }),
  );
}

type Probe = { external: string[]; bad: string[]; errors: string[] };
function watch(ctx: BrowserContext, origin: string, probe: Probe) {
  ctx.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) probe.external.push(u);
  });
  ctx.on('response', (r) => {
    if (r.status() >= 400) probe.bad.push(`${r.status()} ${r.url()}`);
  });
  ctx.on('requestfailed', (r) => probe.bad.push(`failed ${r.url()}`));
  ctx.on('page', (p) => attach(p, probe));
}
function attach(p: Page, probe: Probe) {
  p.on('console', (m) => {
    if (m.type() === 'error') probe.errors.push(`${m.text()} ${m.location()?.url ?? ''}`);
  });
  p.on('pageerror', (e) => probe.errors.push(String(e)));
}

const engine = (page: Page, fn: string, ...args: any[]) =>
  page.evaluate(([fn, args]) => (window as any).__WUXIA_ENGINE__[fn as string](...(args as any[])), [fn, args] as const);

async function startGame(page: Page, url: string) {
  await page.goto(url);
  await page.getByTestId('wuxia-start').click();
  await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  if (!existsSync(join(DIST, 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  if (!CHROME) throw new Error('找不到 Chrome／Chromium，請設定 WUXIA_CHROME');
  const shots = args.shots ? resolve(ROOT, String(args.shots)) : undefined;
  if (shots) mkdirSync(shots, { recursive: true });
  const N = Number(args.steps ?? 1440);
  const { url: origin, close } = await serve();
  const url = `${origin}/`;
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
  });
  const probe: Probe = { external: [], bad: [], errors: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 820 }, acceptDownloads: true });
    watch(ctx, origin, probe);
    const page = await ctx.newPage();
    attach(page, probe);
    await page.goto(url);
    await page.getByTestId('wuxia-home').waitFor();
    if (shots) await page.screenshot({ path: join(shots, 'a01-home.png') });
    await page.getByTestId('wuxia-start').click();
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    ok('dist-local 首頁 →「開始」→ 遊戲畫面（時間控制列出現）');

    // 1. 瀏覽器 Worker 跑 N 步的 hash ＝ 無頭
    await page.getByTestId('wuxia-speed-0').click();
    const h0 = await engine(page, 'hash');
    const r = await engine(page, 'advance', N - h0.steps);
    const headless = runHeadless({ seed: 7, minutes: N / 60 }).finalHash;
    (r.hash === headless && r.steps === N ? ok : fail)(`瀏覽器 Web Worker seed 7 ${N} 步 hash ${r.hash.slice(0, 16)}… ＝ 無頭 ${headless.slice(0, 16)}…`);

    // 2. 64× 實際倍速、跳到明早
    const a = await engine(page, 'hash');
    await page.getByTestId('wuxia-speed-64').click();
    const t0 = performance.now(); // 檢查工具計時用
    await page.waitForTimeout(5000);
    await page.getByTestId('wuxia-speed-0').click();
    const b = await engine(page, 'hash');
    const sec = (performance.now() - t0) / 1000;
    const real = (b.steps - a.steps) / sec;
    (real > 20 ? ok : fail)(`64× 實際倍速 ${real.toFixed(1)}×（${b.steps - a.steps} 步／${sec.toFixed(1)} 秒；自動降速遇到大事會降到 1×）`);
    await page.getByTestId('wuxia-skip-morning').click();
    let m = await engine(page, 'hash');
    for (let i = 0; i < 300 && (m.skipping || m.steps === b.steps); i++) {
      await page.waitForTimeout(200);
      m = await engine(page, 'hash');
    }
    (m.gameMinute % 1440 <= 1 ? ok : fail)(`跳到明早：停在遊戲分 ${m.gameMinute}（第 ${Math.floor(m.gameMinute / 1440) + 1} 日卯正）`);
    // 選一個人、開鎮誌，給截圖
    await page.getByTestId('wuxia-btn-save').click();
    if (shots) await page.screenshot({ path: join(shots, 'a01-game.png') });

    // 3. 存到瀏覽器 → 重新整理 → 讀取存檔
    await page.getByTestId('wuxia-save-now').click();
    await page.waitForTimeout(500);
    const saved = await engine(page, 'hash');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('wuxia-export').click()]);
    const file = join(tmpdir(), `wuxia-a1-save-${process.pid}.json`);
    await dl.saveAs(file);
    await page.reload();
    await page.getByTestId('wuxia-load').click();
    await page.getByTestId('wuxia-slots').waitFor();
    await page.getByTestId('wuxia-slots').getByText('手動存檔').first().click();
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await page.getByTestId('wuxia-speed-0').click();
    const loaded = await engine(page, 'hash');
    const loadRef = loaded.steps === saved.steps ? saved.hash : runHeadless({ seed: 7, minutes: loaded.steps / 60 }).finalHash;
    (loaded.hash === loadRef && loaded.steps >= saved.steps ? ok : fail)(
      `IndexedDB 存檔（第 ${saved.steps} 步）→ 重新整理 → 讀檔（第 ${loaded.steps} 步）hash ${loaded.hash.slice(0, 16)}… ＝ 對照 ${loadRef.slice(0, 16)}…`,
    );
    // 續跑對照：讀檔後再跑 300 步 ＝ 無頭不中斷跑同步數
    const cont = await engine(page, 'advance', 300);
    const ref = runHeadless({ seed: 7, minutes: cont.steps / 60 }).finalHash;
    (cont.hash === ref ? ok : fail)(`讀檔後續跑到第 ${cont.steps} 步 hash ＝ 不中斷的無頭對照 ${ref.slice(0, 16)}…`);

    // 匯出檔在另一個瀏覽器設定檔匯入
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    watch(ctx2, origin, probe);
    const p2 = await ctx2.newPage();
    attach(p2, probe);
    await p2.goto(url);
    await p2.getByTestId('wuxia-load').click();
    await p2.getByTestId('wuxia-import').setInputFiles(file);
    await p2.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await p2.getByTestId('wuxia-speed-0').click();
    const imported = await engine(p2, 'hash');
    // 讀檔後畫面以 1× 開始，按暫停前可能多跑了幾步：跟無頭不中斷跑到同一步比
    const impRef = imported.steps === saved.steps ? saved.hash : runHeadless({ seed: 7, minutes: imported.steps / 60 }).finalHash;
    (imported.hash === impRef && imported.steps >= saved.steps ? ok : fail)(
      `匯出的存檔在另一個瀏覽器設定檔匯入（第 ${saved.steps} 步存、讀檔後第 ${imported.steps} 步）hash ${imported.hash.slice(0, 16)}… ＝ 對照 ${impRef.slice(0, 16)}…`,
    );
    if (shots) await p2.screenshot({ path: join(shots, 'a01-390.png') });

    // 4. 規則版本不同
    const bad = JSON.parse(readFileSync(file, 'utf8'));
    bad.ruleVersion = 'w9-0';
    const badFile = file.replace('.json', '-badver.json');
    writeFileSync(badFile, JSON.stringify(bad));
    await p2.goto(url);
    await p2.getByTestId('wuxia-load').click();
    await p2.getByTestId('wuxia-import').setInputFiles(badFile);
    const msg = await p2.getByTestId('wuxia-error').innerText({ timeout: 30_000 });
    (/規則版本/.test(msg) ? ok : fail)(`規則版本不同的存檔被拒絕：「${msg.slice(0, 60)}…」`);
    await ctx2.close();
    await ctx.close();
  } finally {
    await browser.close();
    close();
  }
  // 5.
  (probe.external.length === 0 ? ok : fail)(
    `沒有任何對外請求（後端、LLM、CDN）${probe.external.length ? '：\n  ' + [...new Set(probe.external)].join('\n  ') : ''}`,
  );
  (probe.bad.length === 0 ? ok : fail)(`沒有 4xx／5xx 回應${probe.bad.length ? '：\n  ' + [...new Set(probe.bad)].join('\n  ') : ''}`);
  (probe.errors.length === 0 ? ok : fail)(`console 沒有 error${probe.errors.length ? '：\n  ' + probe.errors.slice(0, 8).join('\n  ') : ''}`);
  if (failures) {
    process.stdout.write(`wuxia:local-check FAILED (${failures})\n`);
    process.exit(1);
  }
  process.stdout.write('wuxia:local-check passed\n');
}

void main();
