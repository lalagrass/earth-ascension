// 武俠小鎮 W1：wuxia:shot（#553 驗收）。
// 用法：npm run wuxia:shot -- --seed 7 --at 0,600,1200 --out docs/wuxia/w01/
//        [--sizes 1400x820,390x844] [--focus 24,22,1.6]（以 tile 為單位的焦點與縮放，近景用；
//        --focus player,2.5 = 對準被選中的人物）
//        [--name 檔名前綴] [--off w01-skin]（對照：關掉換皮，需要先跑 fetch-upstream-assets.sh）
// 流程：每個 --at（遊戲分鐘）各跑一次無頭模擬到那個遊戲分鐘 → 匯出狀態 → 用 Vite 開截圖頁
//      （src/wuxia/shot/index.html，跟 live 同一批元件，不連 Convex）→ Playwright 截圖。1400 寬截可視範圍，390 寬截整頁。
// 需要本機有 Chrome／Chromium（預設 /usr/bin/google-chrome，或設 WUXIA_CHROME），不需要 Docker、Convex、LLM。
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { Descriptions } from '../../data/characters';
import { exportState, runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const CHROME_CANDIDATES = [
  process.env.WUXIA_CHROME,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const ats = String(args.at ?? '0').split(',').map(Number);
  const out = resolve(ROOT, String(args.out ?? 'docs/wuxia/w01/'));
  const sizes = String(args.sizes ?? '1400x820,390x844')
    .split(',')
    .map((s) => s.split('x').map(Number) as [number, number]);
  const focus = args.focus ? String(args.focus).split(',') : undefined;
  const prefix = String(args.name ?? `w01-seed${seed}`);
  const elements: Record<string, boolean> = {};
  for (const id of String(args.off ?? '').split(',').filter(Boolean)) elements[id] = false;
  mkdirSync(out, { recursive: true });

  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chrome) throw new Error('找不到 Chrome／Chromium，請設定 WUXIA_CHROME');

  const server = await createServer({
    root: ROOT,
    configFile: join(ROOT, 'vite.config.ts'),
    logLevel: 'error',
    server: { port: 0, host: '127.0.0.1', strictPort: false },
  });
  await server.listen();
  const addr = server.httpServer!.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}/ai-town/src/wuxia/shot/index.html`;
  const browser = await chromium.launch({
    executablePath: chrome,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
  });
  const index: any[] = [];
  try {
    for (const at of ats) {
      // 關掉換皮時沒有遊戲時鐘（W0 行為），改用等長的引擎時間：timeScale 60 → 遊戲 60 分鐘 = 引擎 1 分鐘
      const clockless = Object.values(elements).every((v) => !v) && Object.keys(elements).length > 0;
      const run = clockless
        ? runHeadless({ seed, minutes: Math.max(at, 1) / 60, agents: Descriptions.length, elements })
        : runHeadless({ seed, minutes: 0, agents: Descriptions.length, untilGameMinute: at, elements });
      const state = exportState(run);
      const clock = run.summary.clock;
      for (const [w, h] of sizes) {
        const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.addInitScript(
          ([s, o]) => {
            (window as any).__WUXIA_STATE__ = s;
            (window as any).__WUXIA_SHOT__ = o;
          },
          [state, shotOptions(state, focus)] as const,
        );
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => (window as any).__WUXIA_READY__ === true, null, { timeout: 60_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
        const tag = `g${String(at).padStart(4, '0')}`;
        const base = join(out, `${prefix}-${tag}-${w < 600 ? `${w}w` : `${w}x${h}`}`);
        const full = w < 600;
        let file = `${base}.png`;
        await page.screenshot({ path: file, fullPage: full });
        if (statSync(file).size > 1024 * 1024) {
          unlinkSync(file);
          file = `${base}.jpg`;
          await page.screenshot({ path: file, fullPage: full, type: 'jpeg', quality: 86 });
        }
        if (errors.length) throw new Error(`截圖頁有錯誤：\n${errors.join('\n')}`);
        const rel = relative(ROOT, file);
        process.stdout.write(
          `${rel}  ${clock?.label ?? '（無時鐘）'}  遊戲分鐘 ${clock?.gameMinute ?? '-'}  hash ${run.finalHash}  ${statSync(file).size} bytes\n`,
        );
        index.push({ file: rel, seed, at, size: [w, h], clock: clock?.label ?? null, gameMinute: clock?.gameMinute ?? null, hash: run.finalHash, steps: run.summary.steps });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  writeFileSync(join(out, `${prefix}-shots.json`), JSON.stringify(index, null, 2) + '\n');
}

function shotOptions(state: any, focus: string[] | undefined) {
  if (!focus) return {};
  if (focus[0] === 'player') {
    // 截圖頁預設選第一位人物；近景就對準他
    const p = state.world.players[0];
    return { focus: { x: p.position.x, y: p.position.y, scale: Number(focus[1] ?? 2.5) } };
  }
  return { focus: { x: Number(focus[0]), y: Number(focus[1]), scale: Number(focus[2] ?? 2) } };
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
