// 武俠小鎮 A5（#577 第 4 節、驗收 A3）長時間掛機：`npm run build:local && npm run wuxia:soak -- [--minutes 120] [--warm 10] [--out /tmp/soak.json]`
// 開 dist-local 自由玩，關掉「大事自動慢下來」、64× 掛機 minutes 實分鐘；每 5 分鐘量一次 Chrome renderer 行程的 RSS（引擎 Worker 也在這個行程）
// 與頁面 JS heap。判定：暖機 warm 分鐘之後的 RSS 到最後成長 < 10%；最後匯出存檔，Node 端 loadSave 讀得回來、hash 相符。
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parseArgs, quietConsole } from './sim';
import { serveDist } from './e2e';
import { loadSave } from '../../src/wuxia/engine/save';

const ROOT = new URL('../..', import.meta.url).pathname;
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p!)) as string | undefined;

/** 本行程（Playwright 直接 spawn Chrome）底下所有 --type=renderer 子孫行程的 RSS（KB）。Playwright 的 Browser 沒有 process()，所以從自己的 pid 往下找 */
function rendererRss(rootPid: number): number {
  const out = execFileSync('ps', ['-eo', 'pid,ppid,rss,args', '--no-headers'], { encoding: 'utf8' });
  const rows = out.split('\n').filter(Boolean).map((l) => {
    const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/)!;
    return { pid: +m[1], ppid: +m[2], rss: +m[3], args: m[4] };
  });
  const kids = new Set([rootPid]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) if (kids.has(r.ppid) && !kids.has(r.pid)) (kids.add(r.pid), (grew = true));
  }
  return rows.filter((r) => kids.has(r.pid) && r.args.includes('--type=renderer')).reduce((a, r) => a + r.rss, 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const minutes = Number(args.minutes ?? 120);
  const warm = Number(args.warm ?? 10);
  if (!existsSync(join(process.env.WUXIA_DIST ? resolve(process.env.WUXIA_DIST) : join(ROOT, 'dist-local'), 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  if (!CHROME) throw new Error('找不到 Chrome／Chromium');
  const srv = await serveDist();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heap = async () => {
    const r = await cdp.send('Performance.getMetrics');
    return Math.round((r.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0) / 1024);
  };
  const day = () => page.evaluate(() => {
    const w = (window as any).__WUXIA_WORLD__;
    const gm = w?.elements?.['w03-life']?.minute ?? -1;
    return Math.floor(gm / 1440) + 1;
  });
  await page.goto(`${srv.url}/ai-town/`);
  await page.getByTestId('wuxia-start').click();
  await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
  await page.locator('.wuxia-a1-auto input').uncheck();
  await page.getByTestId('wuxia-speed-64').click();
  const samples: Array<{ min: number; rssKB: number; heapKB: number; day: number }> = [];
  const t0 = Date.now();
  for (let m = 0; m <= minutes; m += 5) {
    while (Date.now() - t0 < m * 60_000) {
      await page.waitForTimeout(15_000);
      // 掛機中有東西把倍速降了（例如結算）就按回 64×
      if (!(await page.getByTestId('wuxia-speed-64').evaluate((e) => e.classList.contains('on')).catch(() => true)))
        await page.getByTestId('wuxia-speed-64').click().catch(() => undefined);
    }
    const s = { min: m, rssKB: rendererRss(process.pid), heapKB: await heap(), day: await day() };
    samples.push(s);
    process.stdout.write(`[${m} 分] 第 ${s.day} 日 renderer RSS ${(s.rssKB / 1024).toFixed(0)} MB、JS heap ${(s.heapKB / 1024).toFixed(1)} MB\n`);
  }
  // 存檔仍可讀
  await page.getByTestId('wuxia-speed-0').click();
  await page.getByTestId('wuxia-btn-save').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('wuxia-export').click()]);
  const file = join(tmpdir(), `wuxia-soak-${process.pid}.json`);
  await dl.saveAs(file);
  const save = JSON.parse(readFileSync(file, 'utf8'));
  const loaded = loadSave(save, 0);
  await ctx.close();
  await browser.close();
  srv.close();
  const base = samples.find((s) => s.min >= warm) ?? samples[0];
  const last = samples[samples.length - 1];
  const growth = base.rssKB ? last.rssKB / base.rssKB - 1 : 0;
  const heapGrowth = base.heapKB ? last.heapKB / base.heapKB - 1 : 0;
  let failures = 0;
  const v = (okv: boolean, m: string) => (okv ? process.stdout.write(`ok   ${m}\n`) : (failures++, process.stdout.write(`FAIL ${m}\n`)));
  v(growth < 0.1, `掛機 ${minutes} 分（64×，到第 ${last.day} 日）renderer RSS 第 ${base.min} 分 ${(base.rssKB / 1024).toFixed(0)} MB → ${(last.rssKB / 1024).toFixed(0)} MB，成長 ${(growth * 100).toFixed(1)}%（< 10%）；JS heap ${(heapGrowth * 100).toFixed(1)}%`);
  v(loaded.ok, `匯出的存檔（第 ${Math.floor(save.gameMinute / 1440) + 1} 日、${(readFileSync(file).length / 1024 / 1024).toFixed(1)} MB）Node 端讀得回來${loaded.ok ? '、hash 相符' : '：' + (loaded as any).reason}`);
  v(errors.length === 0, `console 沒有 error${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  if (args.out) writeFileSync(String(args.out), JSON.stringify({ tool: 'wuxia-town soak', minutes, warm, samples, growth, heapGrowth, saveOk: loaded.ok, failures }, null, 2));
  process.stdout.write(failures ? `wuxia:soak FAILED (${failures})\n` : 'wuxia:soak passed\n');
  process.exit(failures ? 1 : 0);
}
void main();
