// 武俠小鎮 A5（#577 第 2 節）三十分鐘體驗走查：`npm run build:local && npm run wuxia:e2e -- --scenario 1 [--video /tmp/v] [--gif docs/wuxia/a05] [--base /x/ai-town/]`
// 腳本玩家用 Playwright 開 dist-local：首頁 → 劇本一 → 說書人三步（點人、顯示太極、指路）→ 第一次干預 → 第一個人學會一招 → 銅級 → 結算卡（匯出 PNG）。
// 玩法跟真人一樣只按畫面上的鈕：平時 64×；「大事自動慢下來」降到 1× 時看 3 秒再按回 64×；亥時（22:00）以後按「跳到明早」。
// 每一段記錄實際秒數與當時的倍速。A1 判定：全程沒有 console error／頁面例外、沒有任何對外（後端）請求、沒有 4xx／5xx，結算卡出現。
// --gif：前五分鐘每 5 秒、全程每 20 秒截一張（640 寬），用 Pillow 編成兩個 GIF（各 ≤ 3 MB）。--video：Playwright 錄影（webm，不進 repo）。
import { chromium, type Page } from 'playwright-core';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { parseArgs } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist-local');
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p!)) as string | undefined;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.md': 'text/markdown; charset=utf-8',
};
const SCENARIOS: Record<string, string> = { '1': 's1', '2': 's2', '3': 's3' };

/** 靜態伺服器：把 dist-local/ai-town 掛在 base（預設 /ai-town/）底下，其他路徑 404 */
export function serveDist(base = '/ai-town/'): Promise<{ url: string; close: () => void; bytes: () => number; reset: () => void }> {
  let sent = 0;
  const server = createServer((req, res) => {
    const p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let f: string | undefined;
    if (p.startsWith(base)) f = join(DIST, 'ai-town', p.slice(base.length));
    else if (p === '/' || p === base.slice(0, -'ai-town/'.length)) f = join(DIST, 'index.html');
    if (f && existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!f || !existsSync(f)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const buf = readFileSync(f);
    sent += buf.length;
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
    res.end(buf);
  });
  return new Promise((r) =>
    server.listen(0, '127.0.0.1', () =>
      r({
        url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
        close: () => server.close(),
        bytes: () => sent,
        reset: () => (sent = 0),
      }),
    ),
  );
}

type Seg = { name: string; seconds: number; speed: string; day: number; note?: string };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const play = SCENARIOS[String(args.scenario ?? '1')] ?? 's1';
  const base = String(args.base ?? '/ai-town/');
  const limitMin = Number(args.limit ?? 40);
  if (!existsSync(join(DIST, 'ai-town/index.html'))) throw new Error('先執行 npm run build:local');
  if (!CHROME) throw new Error('找不到 Chrome／Chromium，請設定 WUXIA_CHROME');
  const gifDir = args.gif ? resolve(ROOT, String(args.gif)) : undefined;
  const frames5 = join(tmpdir(), `wuxia-e2e-f5-${process.pid}`);
  const framesAll = join(tmpdir(), `wuxia-e2e-fa-${process.pid}`);
  if (gifDir) for (const d of [gifDir, frames5, framesAll]) mkdirSync(d, { recursive: true });
  const srv = await serveDist(base);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'] });
  const external: string[] = [];
  const bad: string[] = [];
  const errors: string[] = [];
  const segs: Seg[] = [];
  let failures = 0;
  const ok = (m: string) => process.stdout.write(`ok   ${m}\n`);
  const fail = (m: string) => (failures++, process.stdout.write(`FAIL ${m}\n`));
  const t0 = Date.now();
  let tSeg = t0;
  const vp = { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true, ...(args.video ? { recordVideo: { dir: String(args.video), size: { width: 960, height: 540 } } } : {}) });
  ctx.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(srv.url) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  ctx.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} ${m.location()?.url ?? ''}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  const W = () => page.evaluate(() => {
    const w = (window as any).__WUXIA_WORLD__;
    const a4 = w?.elements?.['a4-play'];
    const a2 = w?.elements?.['a2-master'];
    return {
      gm: a4?.minute ?? -1,
      day: a4?.day ?? 0,
      goals: a4?.goals ?? {},
      ended: a4?.ended,
      learned: (a2?.records ?? []).filter((r: any) => r.via !== 'origin').length,
    };
  });
  const speedNow = () =>
    page.evaluate(() => {
      if (document.querySelector('[data-testid="wuxia-skip-morning"].on')) return '跳到明早';
      if (document.querySelector('[data-testid="wuxia-skip-event"].on')) return '跳到下一件事';
      const on = document.querySelector('[data-testid^="wuxia-speed-"].on');
      return on ? `${on.getAttribute('data-testid')!.slice('wuxia-speed-'.length)}×` : '—';
    });
  const seg = async (name: string, note?: string) => {
    const now = Date.now();
    const s = await W().catch(() => ({ day: 0 }) as any);
    const x = { name, seconds: Math.round((now - tSeg) / 100) / 10, speed: await speedNow(), day: s.day, note };
    segs.push(x);
    tSeg = now;
    ok(`[${((now - t0) / 1000).toFixed(0)} 秒] ${name}：${x.seconds} 秒（第 ${x.day} 日，${x.speed}）${note ? ' ' + note : ''}`);
  };
  let nFrame5 = 0;
  let nFrameAll = 0;
  let lastAll = 0;
  let last5 = 0;
  const capture = async (force = false) => {
    if (!gifDir) return;
    const el = Date.now() - t0;
    if (el < 5 * 60_000 && (force || el - last5 >= 5000)) {
      last5 = el;
      await page.screenshot({ path: join(frames5, `${String(nFrame5++).padStart(4, '0')}.png`) });
    }
    if (force || el - lastAll >= 20_000) {
      lastAll = el;
      await page.screenshot({ path: join(framesAll, `${String(nFrameAll++).padStart(4, '0')}.png`) });
    }
  };
  /** 一直玩到 cond 成立：64×；被自動降速就看 3 秒再按回；22 點後跳到明早 */
  const playUntil = async (cond: (s: Awaited<ReturnType<typeof W>>) => boolean, label: string) => {
    let slowSince = 0;
    while (true) {
      if (Date.now() - t0 > limitMin * 60_000) throw new Error(`${limitMin} 分鐘內沒走到「${label}」`);
      const s = await W();
      if (cond(s)) return s;
      if (await page.getByTestId('wuxia-a4-settle').isVisible().catch(() => false)) return s;
      const mod = ((s.gm % 1440) + 1440) % 1440; // 0＝06:00
      const sp = await speedNow();
      if (mod >= 16 * 60 && mod < 23 * 60 && sp !== '跳到明早') await page.getByTestId('wuxia-skip-morning').click();
      else if (sp === '1×' || sp === '4×' || sp === '16×') {
        if (!slowSince) slowSince = Date.now();
        if (Date.now() - slowSince > 3000) {
          await page.getByTestId('wuxia-speed-64').click();
          slowSince = 0;
        }
      } else if (sp === '0×') await page.getByTestId('wuxia-speed-64').click();
      await capture();
      await page.waitForTimeout(500);
    }
  };
  try {
    await page.goto(`${srv.url}${base}`);
    await page.getByTestId('wuxia-a4-scenarios').waitFor({ timeout: 30_000 });
    ok(`首次載入 ${(srv.bytes() / 1024 / 1024).toFixed(2)} MB（伺服器送出的位元組）`);
    await capture(true);
    await seg('首頁');
    await page.getByTestId(`wuxia-play-${play}`).click();
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await page.getByTestId('wuxia-a4-tutorial').waitFor({ timeout: 30_000 });
    await capture(true);
    await seg(`進劇本 ${play}（開場旁白、說書人出現）`);
    // 說書人 1：點一個人（從傳承面板點名字）
    await playUntil((s) => s.gm >= 0, '大師進鎮');
    await page.getByTestId('wuxia-speed-4').click();
    await page.getByTestId('wuxia-btn-lineage').click();
    await page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name').first().waitFor({ timeout: 120_000 });
    await page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name').first().click();
    await page.getByTestId('wuxia-btn-lineage').click();
    await capture(true);
    await seg('說書人第 1 步：點一個人');
    // 說書人 2：顯示太極
    await page.getByTestId('wuxia-taiji-toggle').click();
    await page.waitForTimeout(1500);
    await capture(true);
    await seg('說書人第 2 步：顯示太極');
    // 說書人 3＝第一次干預：選一個不是大師的人指路
    const names = page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name');
    await page.getByTestId('wuxia-btn-lineage').click();
    const n = await names.count();
    if (n > 1) await names.nth(1).click();
    else await names.first().click();
    await page.getByTestId('wuxia-btn-lineage').click();
    let menu = await page.getByTestId('wuxia-fate-guide').isEnabled().catch(() => false);
    if (!menu) {
      // 選到大師（只能引薦）：等鎮上有別人會一招再點
      await playUntil((s) => s.learned > 0, '有人會一招（好點別人）');
      await page.getByTestId('wuxia-btn-lineage').click();
      await names.nth(1).click();
      await page.getByTestId('wuxia-btn-lineage').click();
    }
    await page.getByTestId('wuxia-fate-guide').click();
    await page.getByTestId('wuxia-fate-go').click();
    await page.getByTestId('wuxia-a4-menu').locator('.wuxia-a1-note').last().waitFor({ timeout: 30_000 });
    const res = await page.getByTestId('wuxia-a4-menu').locator('.wuxia-a1-note').last().innerText();
    await capture(true);
    await seg('說書人第 3 步＝第一次干預（指路）', `「${res}」`);
    (await page.getByTestId('wuxia-a4-tutorial').isVisible().catch(() => false) ? fail : ok)('說書人三步做完就收起');
    await page.getByTestId('wuxia-a1-detail-close').click().catch(() => undefined);
    await page.getByTestId('wuxia-speed-64').click();
    await playUntil((s) => s.learned > 0, '第一個人學會一招');
    await capture(true);
    await seg('第一個人學會一招');
    await playUntil((s) => s.goals.bronze !== undefined, '銅級');
    await capture(true);
    await seg('銅級達成');
    await playUntil((s) => !!s.ended, '結算');
    await page.getByTestId('wuxia-a4-settle').waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await capture(true);
    const s = await W();
    await seg('結算卡', `（${s.ended.reason === 'gold' ? '金級' : '到期'}，第 ${s.ended.day} 日；銀 ${s.goals.silver ?? '—'}、金 ${s.goals.gold ?? '—'}）`);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('wuxia-a4-png').click()]);
    const png = join(tmpdir(), `wuxia-e2e-card-${process.pid}.png`);
    await dl.saveAs(png);
    ok(`結算卡 PNG ${(statSync(png).size / 1024).toFixed(0)} KB`);
    if (gifDir) writeFileSync(join(gifDir, 'a05-card-e2e.png'), readFileSync(png));
  } catch (e) {
    fail(String((e as Error).message ?? e));
    if (gifDir) await page.screenshot({ path: join(tmpdir(), 'wuxia-e2e-fail.png') }).catch(() => undefined);
  } finally {
    await ctx.close();
    await browser.close();
    srv.close();
  }
  const total = (Date.now() - t0) / 1000;
  (total <= 30 * 60 ? ok : fail)(`首頁到結算卡共 ${(total / 60).toFixed(1)} 實分鐘（目標 ≤ 30）`);
  (external.length === 0 ? ok : fail)(`沒有任何對外（後端）請求${external.length ? '：' + [...new Set(external)].slice(0, 5).join(' ') : ''}`);
  (bad.length === 0 ? ok : fail)(`沒有 4xx／5xx${bad.length ? '：' + [...new Set(bad)].slice(0, 5).join(' ') : ''}`);
  (errors.length === 0 ? ok : fail)(`console 沒有 error、頁面沒有例外${errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''}`);
  if (gifDir) {
    for (const [dir, name, ms] of [
      [frames5, 'a05-first5.gif', 700],
      [framesAll, 'a05-walk.gif', 500],
    ] as const) {
      const out = join(gifDir, name);
      execFileSync('python3', [
        '-c',
        `import glob,sys
from PIL import Image
fs=sorted(glob.glob('${dir}/*.png'))
w=int(sys.argv[1]) if len(sys.argv)>1 else 640
def go(w):
  ims=[Image.open(f).convert('RGB').resize((w,w*9//16)).quantize(colors=96,method=Image.Quantize.MEDIANCUT) for f in fs]
  ims[0].save('${out}',save_all=True,append_images=ims[1:],duration=${ms},loop=0,optimize=True)
import os
for w in (640,560,480,400):
  go(w)
  if os.path.getsize('${out}')<=3*1024*1024: break
`,
      ]);
      ok(`GIF ${name}：${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`);
    }
    rmSync(frames5, { recursive: true, force: true });
    rmSync(framesAll, { recursive: true, force: true });
  }
  const report = { tool: 'wuxia-town e2e', scenario: play, base, totalSeconds: Math.round(total), segments: segs, failures };
  if (args.out) writeFileSync(String(args.out), JSON.stringify(report, null, 2));
  process.stdout.write(`${failures ? `wuxia:e2e FAILED (${failures})` : 'wuxia:e2e passed'}\n`);
  process.exit(failures ? 1 : 0);
}
if (process.argv[1]?.endsWith('e2e.ts')) void main();
