// 武俠小鎮 A5（#577 第 3、4、7 節，驗收 C「390 寬截圖組」）`npm run build:local && npm run wuxia:a5-shots -- [--out docs/wuxia/a05]`
// 390×844（手機寬）依序截：首頁、設定、授權與署名、進劇本一、傳承面板、人物詳情（底部抽屜）、64× 幾日後顯示太極（走樣＝橘＋虛線）、遊戲內設定、存檔選單；
// 並實測：「回報」下載一個 JSON（存檔＋最近 ≤200 筆事件，沒有任何上傳請求）、Worker 出錯時顯示提示且另存「出錯前」存檔（?test=1 才有的測試鉤）。
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs } from './sim';
import { serveDist } from './e2e';

const ROOT = new URL('../..', import.meta.url).pathname;
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p!)) as string | undefined;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = resolve(ROOT, String(args.out ?? 'docs/wuxia/a05'));
  mkdirSync(out, { recursive: true });
  if (!existsSync(join(process.env.WUXIA_DIST ? resolve(process.env.WUXIA_DIST) : join(ROOT, 'dist-local'), 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  if (!CHROME) throw new Error('找不到 Chrome／Chromium');
  let failures = 0;
  const ok = (m: string) => process.stdout.write(`ok   ${m}\n`);
  const fail = (m: string) => (failures++, process.stdout.write(`FAIL ${m}\n`));
  const srv = await serveDist();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, acceptDownloads: true });
  const external: string[] = [];
  ctx.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(srv.url) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  let crashed = false;
  page.on('pageerror', (e) => !crashed && errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !crashed && errors.push(m.text()));
  const shot = async (name: string) => {
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(out, `a05-390-${name}.png`) });
    // 390 寬時沒有東西超出畫面寬度（橫向捲動）
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    (sw <= 392 ? ok : fail)(`390 寬截圖 ${name}（scrollWidth ${sw}）`);
  };
  try {
    await page.goto(`${srv.url}/ai-town/?test=1`);
    await page.getByTestId('wuxia-a4-scenarios').waitFor({ timeout: 30_000 });
    await shot('home');
    await page.getByTestId('wuxia-home-settings').click();
    await page.getByTestId('wuxia-settings').waitFor();
    await shot('settings');
    await page.getByTestId('wuxia-home-settings').click();
    await page.getByTestId('wuxia-home-credits').click();
    await page.getByTestId('wuxia-credits-text').filter({ hasText: 'CREDITS' }).waitFor({ timeout: 10_000 }).catch(() => undefined);
    const credits = await page.getByTestId('wuxia-credits').innerText();
    (credits.includes('MIT') && credits.includes('a16z') ? ok : fail)('授權與署名頁有 AI Town MIT 全文與 CREDITS.md');
    await shot('credits');
    await page.getByTestId('wuxia-credits').locator('button.close').click();
    await page.getByTestId('wuxia-play-s1').click();
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await page.getByTestId('wuxia-a4-tutorial').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(3000);
    await shot('game');
    // 開場旁白：真人會點一下收起（不點也會自己收）
    await page.getByTestId('wuxia-a4-opening').click({ timeout: 2000 }).catch(() => undefined);
    await page.getByTestId('wuxia-speed-64').click();
    await page.getByTestId('wuxia-btn-lineage').click();
    await page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name').first().waitFor({ timeout: 120_000 });
    await shot('lineage');
    await page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name').first().click();
    await page.getByTestId('wuxia-btn-lineage').click().catch(() => undefined);
    await shot('detail');
    await page.getByTestId('wuxia-a1-detail-close').click().catch(() => undefined);
    // 64× 跑到有人學會走樣的招（最多 4 實分鐘），自動降速就按回
    await page.locator('.wuxia-a1-auto input').uncheck().catch(() => undefined);
    await page.getByTestId('wuxia-speed-64').click();
    const flawedNow = () =>
      page.evaluate(() => {
        const a2 = (window as any).__WUXIA_WORLD__?.elements?.['a2-master'];
        let n = 0;
        for (const k of Object.values(a2?.know ?? {}) as any[]) for (const m of Object.values(k) as any[]) if (m.flawed) n++;
        return { n, day: (window as any).__WUXIA_WORLD__?.elements?.['a4-play']?.day ?? 0 };
      });
    const t0 = Date.now();
    let f = await flawedNow();
    while (f.n === 0 && Date.now() - t0 < 240_000) {
      await page.waitForTimeout(2000);
      if (await page.getByTestId('wuxia-a4-settle').isVisible().catch(() => false)) break;
      f = await flawedNow();
    }
    ok(`64× 到第 ${f.day} 日：走樣的招 ${f.n} 筆`);
    await page.getByTestId('wuxia-speed-0').click().catch(() => undefined);
    await page.getByTestId('wuxia-a4-settle').locator('button').last().click().catch(() => undefined);
    await page.getByTestId('wuxia-taiji-toggle').click();
    await shot('taiji');
    await page.getByTestId('wuxia-taiji-toggle').click();
    await page.getByTestId('wuxia-btn-settings').click();
    await shot('settings-game');
    await page.getByTestId('wuxia-btn-settings').click();
    await page.getByTestId('wuxia-btn-save').click();
    await shot('savemenu');
    const before = external.length;
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('wuxia-report').click()]);
    const file = join(tmpdir(), `wuxia-report-${process.pid}.json`);
    await dl.saveAs(file);
    const rep = JSON.parse(readFileSync(file, 'utf8'));
    (rep.kind === 'wuxia-report' && rep.save && Array.isArray(rep.events) && rep.events.length > 0 && rep.events.length <= 200 && external.length === before ? ok : fail)(
      `回報檔 ${dl.suggestedFilename()}：存檔＋${rep.events?.length} 筆事件，${(readFileSync(file).length / 1024).toFixed(0)} KB，沒有上傳`,
    );
    await page.getByTestId('wuxia-btn-save').click();
    // Worker 出錯
    crashed = true;
    await page.getByTestId('wuxia-speed-1').click();
    await page.evaluate(() => (window as any).__WUXIA_TEST__.crash());
    await page.getByTestId('wuxia-crash').waitFor({ timeout: 15_000 });
    await shot('crash');
    await page.waitForTimeout(2500);
    await page.getByTestId('wuxia-crash-home').click();
    await page.getByTestId('wuxia-load').click().catch(() => undefined);
    const slots = await page.getByTestId('wuxia-slots').innerText().catch(() => '');
    (slots.includes('出錯前存檔') ? ok : fail)(`出錯後回首頁，存檔清單有「出錯前」那一格`);
  } catch (e) {
    fail(String((e as Error).message ?? e));
    await page.screenshot({ path: join(tmpdir(), 'wuxia-a5-shots-fail.png') }).catch(() => undefined);
  } finally {
    await browser.close();
    srv.close();
  }
  (errors.length === 0 ? ok : fail)(`出錯測試之前 console 沒有 error${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  (external.length === 0 ? ok : fail)('沒有任何對外請求');
  process.stdout.write(`${failures ? `wuxia:a5-shots FAILED (${failures})` : 'wuxia:a5-shots passed'}\n`);
  process.exit(failures ? 1 : 0);
}
void main();
