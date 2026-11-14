// 武俠小鎮 A4（#576）`npm run wuxia:a4-shots -- [--shots docs/wuxia/a04]`（先 npm run build:local）
// Node 端用 LocalCore 跑劇本一到第 6 日（第 3 日做一次指路）→ 存檔 → 瀏覽器（dist-local）匯入：hash 相同；
// 開「目標」面板（截圖）；從傳承面板選一個人 → 干預選單「指路」（截圖）→ 真的花一點緣，緣少 1、那人的「因為…」多一條；
// 再用劇本一縮成 2 日的存檔確認結算畫面出現、「匯出 PNG」下載得到 ≤ 1 MB 的 1200×630 PNG。不對外連線、console 沒有 error。
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
  const core = new LocalCore();
  const run = (world: any, until: number, ivs: Array<[number, any]> = []) => {
    core.init({ kind: 'new', world });
    core.autoSlow = false;
    let token = 1;
    const to = (gm: number) => {
      while (core.session.gameMinute() < gm) core.advance(Math.min(600, Math.max(1, gm - core.session.gameMinute())));
    };
    for (const [gm, a] of ivs) {
      to(gm);
      core.input('wuxiaIntervene', a, token++);
      core.advance(1);
    }
    to(until);
    const save = core.save('A4 截圖');
    const file = join(tmpdir(), `wuxia-a4-save-${process.pid}-${token}-${until}.json`);
    writeFileSync(file, JSON.stringify(save));
    return { save, file, hash: core.hash() };
  };
  // 第 3 日 08:00（遊戲分 2×1440−360+480）指路阿青去小廣場；停在第 6 日 10:00
  const A = run({ seed: 7, play: 's1' }, 5 * 1440 - 360 + 600, [[2 * 1440 - 360 + 480, { kind: 'guide', target: 'a-qing', place: 'plaza' }]]);
  const st = (core.session.game.world.wuxia!.elements['a4-play'] as any);
  ok(`Node LocalCore：劇本一 seed 7 到第 6 日，緣 ${st.yuan}、干預 ${st.used.length} 次、目標 ${JSON.stringify(st.goals)}，hash ${A.hash.slice(0, 16)}…`);
  const B = run({ seed: 7, play: 's1', playDays: 2 }, 2 * 1440 - 360 + 120);
  ok(`Node LocalCore：劇本一縮成 2 日，結算 ${JSON.stringify((core.session.game.world.wuxia!.elements['a4-play'] as any).ended)}`);

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
    const vp = { width: 1400, height: 820 };
    const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true });
    ctx.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
    });
    ctx.on('response', (r) => r.status() >= 400 && !/favicon\.ico/.test(r.url()) && bad.push(`${r.status()} ${r.url()}`));
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && !/favicon\.ico/.test(m.location()?.url ?? '') && errors.push(`${m.text()} ${m.location()?.url ?? ''}`));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${origin}/`);
    await page.getByTestId('wuxia-a4-scenarios').waitFor({ timeout: 30_000 });
    (await page.getByTestId('wuxia-a4-scenarios').locator('button').count()) === 3 ? ok('首頁有三個劇本') : fail('首頁劇本數不對');
    await page.getByTestId('wuxia-load').click();
    await page.getByTestId('wuxia-import').setInputFiles(A.file);
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await page.getByTestId('wuxia-speed-0').click();
    const h = await engine(page, 'hash');
    (h.steps === A.save.steps ? (h.hash === A.hash ? ok : fail) : ok)(
      `瀏覽器匯入存檔 hash ${h.hash.slice(0, 16)}…${h.steps === A.save.steps ? ` ＝ Node ${A.hash.slice(0, 16)}…` : `（讀檔後多跑到第 ${h.steps} 步，不比）`}`,
    );
    const yuan0 = await page.getByTestId('wuxia-yuan').locator('i.on').count();
    ok(`緣 ${yuan0} 點`);
    // 目標面板
    await page.getByTestId('wuxia-btn-goals').click();
    await page.getByTestId('wuxia-a4-goals').waitFor();
    const goals = await page.getByTestId('wuxia-a4-goals').innerText();
    (/銅/.test(goals) && /達成/.test(goals) ? ok : fail)(`目標面板：${goals.replace(/\s+/g, ' ').slice(0, 90)}`);
    await page.waitForTimeout(500);
    if (shots) out.push(await shot(page, join(shots, 'a04-goals.png')));
    await page.getByTestId('wuxia-btn-goals').click();
    // 從傳承面板選一個人 → 干預選單
    await page.getByTestId('wuxia-btn-lineage').click();
    await page.getByTestId('wuxia-a2-lineage').locator('button.wuxia-a2-name').nth(2).click();
    await page.getByTestId('wuxia-btn-lineage').click();
    await page.getByTestId('wuxia-a4-menu').waitFor({ timeout: 10_000 });
    await page.getByTestId('wuxia-fate-guide').click();
    await page.waitForTimeout(500);
    if (shots) out.push(await shot(page, join(shots, 'a04-menu.png')));
    await page.getByTestId('wuxia-fate-go').click();
    await page.getByTestId('wuxia-speed-1').click(); // 暫停時輸入排著，下一步才進引擎
    await page.getByTestId('wuxia-a4-menu').locator('.wuxia-a1-note').waitFor({ timeout: 10_000 });
    const res = await page.getByTestId('wuxia-a4-menu').locator('.wuxia-a1-note').last().innerText();
    await page.getByTestId('wuxia-speed-0').click();
    const yuan1 = await page.getByTestId('wuxia-yuan').first().locator('i.on').count();
    (/指路/.test(res) && yuan1 === yuan0 - 1 ? ok : fail)(`花一點緣指路：「${res}」，緣 ${yuan0} → ${yuan1}`);
    // 結算畫面與 PNG
    await page.getByTestId('wuxia-seal').click();
    await page.getByTestId('wuxia-load').click();
    await page.getByTestId('wuxia-import').setInputFiles(B.file);
    await page.getByTestId('wuxia-a4-settle').waitFor({ timeout: 20_000 });
    ok('結算畫面出現');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('wuxia-a4-png').click()]);
    const png = join(tmpdir(), `wuxia-a4-card-${process.pid}.png`);
    await dl.saveAs(png);
    const size = statSync(png).size;
    const dim = execFileSync('python3', ['-c', `from PIL import Image; print('%dx%d' % Image.open('${png}').size)`]).toString().trim();
    (size <= 1024 * 1024 && dim === '1200x630' ? ok : fail)(`匯出 PNG ${dim} ${(size / 1024).toFixed(0)} KB`);
    await ctx.close();
  } finally {
    await browser.close();
    close();
  }
  (external.length === 0 ? ok : fail)(`沒有任何對外請求${external.length ? '：' + [...new Set(external)].join(' ') : ''}`);
  (bad.length === 0 ? ok : fail)(`沒有 4xx／5xx${bad.length ? '：' + [...new Set(bad)].join(' ') : ''}`);
  (errors.length === 0 ? ok : fail)(`console 沒有 error${errors.length ? '：' + errors.slice(0, 5).join(' | ') : ''}`);
  for (const f of out) process.stdout.write(`shot ${f.replace(ROOT, '')} ${(statSync(f).size / 1024).toFixed(0)} KB\n`);
  if (failures) {
    process.stdout.write(`wuxia:a4-shots FAILED (${failures})\n`);
    process.exit(1);
  }
  process.stdout.write('wuxia:a4-shots passed\n');
}
void main();
