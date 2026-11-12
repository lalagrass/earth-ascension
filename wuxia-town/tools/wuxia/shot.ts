// 武俠小鎮 W1：wuxia:shot（#553 驗收）。
// 用法：npm run wuxia:shot -- --seed 7 --at 0,600,1200 --out docs/wuxia/w01/
//        [--sizes 1400x820,390x844] [--focus 24,22,1.6]（以 tile 為單位的焦點與縮放，近景用；
//        --focus player,2.5 = 對準被選中的人物）
//        [--name 檔名前綴] [--off w01-skin]（對照：關掉換皮，需要先跑 fetch-upstream-assets.sh）
//   W4：--at 也可寫 dayN-HH:MM（第 N 日幾點，例如 day30-09:00）；--who 人名（例如 阿青）＝人物詳情選這個人，
//       沒給 --focus 時近景對準他（縮放 2.6）；--blind＝不顯示時辰與狀態 hash（盲測用）。
//       檔名前綴預設是「輸出資料夾名-seedN」（docs/wuxia/w04/ → w04-seed7）。
//   W6：--gif --match 周教頭,阿青 [--stage 石虎,林嫂]＝切磋短 GIF（見 tools/wuxia/shot-gif.ts）。
// 流程：每個 --at（遊戲分鐘）各跑一次無頭模擬到那個遊戲分鐘 → 匯出狀態 → 用 Vite 開截圖頁
//      （src/wuxia/shot/index.html，跟 live 同一批元件，不連 Convex）→ Playwright 截圖。1400 寬截可視範圍，390 寬截整頁。
// 需要本機有 Chrome／Chromium（預設 /usr/bin/google-chrome，或設 WUXIA_CHROME），不需要 Docker、Convex、LLM。
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { exportState, runHeadless } from './headless';
import { enabledElements } from '../../convex/wuxia/registry';
import { defaultWuxiaConfig, initWuxiaState } from '../../convex/wuxia/state';
import { parseArgs, quietConsole } from './sim';
import { DAY_START_MINUTE } from '../../convex/wuxia/clock';
import { basename } from 'node:path';

/** W4：遊戲分鐘，或 dayN-HH:MM（第 N 日 HH:MM；遊戲分鐘 0 是第 1 日 06:00）。 */
export function parseAt(token: string): { gm: number; tag: string } {
  const m = token.match(/^day(\d+)-(\d{1,2}):(\d{2})$/);
  if (m) {
    const day = Number(m[1]);
    const gm = (day - 1) * 1440 + Number(m[2]) * 60 + Number(m[3]) - DAY_START_MINUTE;
    if (gm < 0) throw new Error(`--at ${token} 早於第 1 日 06:00（遊戲時鐘起點）`);
    return { gm, tag: `d${String(day).padStart(2, '0')}-${m[2].padStart(2, '0')}${m[3]}` };
  }
  const gm = Number(token);
  if (!Number.isFinite(gm)) throw new Error(`--at 看不懂：${token}`);
  return { gm, tag: `g${String(gm).padStart(4, '0')}` };
}

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
  // W6：--gif＝一場切磋的短 GIF（tools/wuxia/shot-gif.ts）
  if (args.gif) return (await import('./shot-gif')).shotGif(args);
  const seed = Number(args.seed ?? 7);
  const ats = String(args.at ?? '0')
    .split(',')
    .map(parseAt);
  const out = resolve(ROOT, String(args.out ?? 'docs/wuxia/w01/'));
  const who = args.who === undefined ? undefined : String(args.who);
  const blind = !!args.blind;
  const sizes = String(args.sizes ?? '1400x820,390x844')
    .split(',')
    .map((s) => s.split('x').map(Number) as [number, number]);
  const focus = args.focus ? String(args.focus).split(',') : who ? ['player', '2.6'] : undefined;
  const prefix = String(args.name ?? `${basename(out)}-seed${seed}${blind ? '-blind' : ''}`);
  const elements: Record<string, boolean> = {};
  for (const id of String(args.off ?? '')
    .split(',')
    .filter(Boolean))
    elements[id] = false;
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
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--font-render-hinting=none',
    ],
  });
  const index: any[] = [];
  try {
    for (const { gm: at, tag } of ats) {
      // 關掉換皮時沒有遊戲時鐘（W0 行為），改用等長的引擎時間：timeScale 60 → 遊戲 60 分鐘 = 引擎 1 分鐘
      // W2：看「實際生效」的元素（--off w02-folk 時 w01-skin 仍開、仍有時鐘）
      const clockless =
        enabledElements(
          initWuxiaState({
            ...defaultWuxiaConfig,
            elements: { ...defaultWuxiaConfig.elements, ...elements },
          }),
        ).length === 0;
      const run = clockless
        ? runHeadless({ seed, minutes: Math.max(at, 1) / 60, elements })
        : runHeadless({ seed, minutes: 0, untilGameMinute: at, elements });
      const state = exportState(run);
      const clock = run.summary.clock;
      for (const [w, h] of sizes) {
        const page = await browser.newPage({
          viewport: { width: w, height: h },
          deviceScaleFactor: 1,
        });
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.addInitScript(
          ([s, o]) => {
            (window as any).__WUXIA_STATE__ = s;
            (window as any).__WUXIA_SHOT__ = o;
          },
          [state, shotOptions(state, focus, who, blind)] as const,
        );
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => (window as any).__WUXIA_READY__ === true, null, {
          timeout: 60_000,
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
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
        index.push({
          file: rel,
          seed,
          at,
          size: [w, h],
          clock: clock?.label ?? null,
          gameMinute: clock?.gameMinute ?? null,
          who: who ?? null,
          blind,
          hash: run.finalHash,
          steps: run.summary.steps,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  writeFileSync(join(out, `${prefix}-shots.json`), JSON.stringify(index, null, 2) + '\n');
}

function shotOptions(state: any, focus: string[] | undefined, who?: string, blind = false) {
  // W4：--who 選人（人物詳情顯示這個人；近景對準他）
  let selected: string | undefined;
  if (who) {
    const d = state.playerDescriptions.find((x: any) => x.name === who);
    if (!d) throw new Error(`--who ${who}：世界裡沒有這個人`);
    selected = d.playerId;
  }
  const base = { ...(selected ? { selected } : {}), ...(blind ? { blind } : {}) };
  if (!focus) return base;
  if (focus[0] === 'player') {
    // 截圖頁預設選第一位人物；近景就對準被選的人
    const p = state.world.players.find((x: any) => x.id === selected) ?? state.world.players[0];
    return { ...base, focus: { x: p.position.x, y: p.position.y, scale: Number(focus[1] ?? 2.5) } };
  }
  return { ...base, focus: { x: Number(focus[0]), y: Number(focus[1]), scale: Number(focus[2] ?? 2) } };
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
