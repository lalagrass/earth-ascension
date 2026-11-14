// 武俠小鎮 A3（#574 截圖：茶館多人泡泡、玩家互動選單、翻成一句話）。先 npm run build:local。
// 1. Node 裡用瀏覽器 Worker 同一個 LocalCore 開一局（大師第 1 日進鎮），第 2 日早上玩家進鎮、去茶館喝茶，
//    往後找茶館同時進行的互動最多的那一分鐘，匯出存檔
// 2. Playwright 匯入 → hash 等於 Node 端；暫停；開「動靜」面板、點一行（選中那人、鏡頭移過去）＝泡泡＋翻成一句話小窗
//    （沒設 LLM 時用文法模板並註明）；選另一個人看互動選單
// 3. 全程沒有對外請求、沒有 4xx／5xx、console 沒有 error
// --shots docs/wuxia/a03 另存最多 3 張截圖（每張 ≤1 MB，超過就轉 JPEG）。
// 用法：npm run wuxia:a3-shots -- [--shots docs/wuxia/a03]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, Page } from 'playwright-core';
import { LocalCore } from '../../src/wuxia/engine/core';
import { parseArgs, quietConsole } from './sim';
import { OBJECT_BY_ID } from '../../convex/wuxia/w03_life/data';
import { PLAYER_ROLES } from '../../convex/wuxia/w09_player/data';
import { activeEntries } from '../../src/wuxia/a3';

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
  // 1. Node 端
  const core = new LocalCore();
  core.init({ kind: 'new', world: { seed: 7, arriveDay: 1, scenario: 'master-open' } });
  core.autoSlow = false;
  const to = (gm: number) => {
    while (core.session.gameMinute() < gm) core.advance(Math.min(600, Math.max(1, gm - core.session.gameMinute())));
  };
  to(1440 + 120);
  const role = PLAYER_ROLES[0];
  core.input('join', { name: role.label, character: role.sprite, description: role.identity, tokenIdentifier: 'local-player', wuxiaRole: role.id }, 1);
  core.advance(2);
  core.input('wuxiaPlayerAct', { human: 'local-player', kind: 'activity', obj: 'tea-table-3', act: 'drink_tea' }, 2);
  core.advance(30);
  const w = () => core.session.game.world.wuxia!;
  const atTea = () => {
    const st = w().elements['a3-silent'] as any;
    const life = w().elements['w03-life'] as any;
    const place = (cid: string) => {
      const p = Object.values(life.people).find((x: any) => x.cid === cid) as any;
      return p?.cur?.obj ? OBJECT_BY_ID[p.cur.obj]?.place : undefined;
    };
    const es = activeEntries(st, st.minute).filter((e) => place(e.a) === 'teahouse');
    return es.length * 10 + new Set(es.map((e) => e.kind)).size;
  };
  let best = { gm: core.session.gameMinute(), score: -1 };
  const end = 1440 + 13 * 60;
  for (let gm = core.session.gameMinute(); gm < end; gm++) {
    to(gm);
    const s = atTea();
    if (s > best.score) best = { gm, score: s };
  }
  core.init({ kind: 'new', world: { seed: 7, arriveDay: 1, scenario: 'master-open' } });
  core.autoSlow = false;
  to(1440 + 120);
  core.input('join', { name: role.label, character: role.sprite, description: role.identity, tokenIdentifier: 'local-player', wuxiaRole: role.id }, 1);
  core.advance(2);
  core.input('wuxiaPlayerAct', { human: 'local-player', kind: 'activity', obj: 'tea-table-3', act: 'drink_tea' }, 2);
  core.advance(30);
  to(best.gm);
  const save = core.save('A3 截圖');
  const file = join(tmpdir(), `wuxia-a3-save-${process.pid}.json`);
  writeFileSync(file, JSON.stringify(save));
  const nodeHash = core.hash();
  ok(`Node LocalCore：seed 7、玩家第 2 日進鎮喝茶，茶館互動最多在遊戲分 ${best.gm}（分數 ${best.score}），hash ${nodeHash.slice(0, 16)}…`);

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
    const ctx = await browser.newContext({ viewport: vp });
    ctx.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
    });
    ctx.on('response', (r) => r.status() >= 400 && !/favicon\.ico/.test(r.url()) && bad.push(`${r.status()} ${r.url()}`));
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && !/favicon\.ico/.test(m.location()?.url ?? '') && errors.push(`${m.text()} ${m.location()?.url ?? ''}`));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${origin}/`);
    await page.getByTestId('wuxia-load').click();
    await page.getByTestId('wuxia-import').setInputFiles(file);
    await page.getByTestId('wuxia-timebar').waitFor({ timeout: 60_000 });
    await page.getByTestId('wuxia-speed-0').click();
    const h = await engine(page, 'hash');
    (h.steps === save.steps ? (h.hash === nodeHash ? ok : fail) : ok)(
      `瀏覽器匯入存檔 hash ${h.hash.slice(0, 16)}…${h.steps === save.steps ? ` ＝ Node ${nodeHash.slice(0, 16)}…` : `（讀檔後多跑到第 ${h.steps} 步，不比）`}`,
    );
    // 動靜面板 → 點最新一行：選中發起的人、鏡頭移過去、翻成一句話
    await page.getByTestId('wuxia-btn-social').click();
    await page.getByTestId('wuxia-a3-feed').waitFor();
    const lines = page.getByTestId('wuxia-a3-feed').locator('button');
    const n = await lines.count();
    (n > 0 ? ok : fail)(`鎮上動靜 ${n} 行`);
    await lines.first().click();
    await page.waitForTimeout(900);
    await page.mouse.move(vp.width * 0.42, vp.height * 0.5);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -200), await page.waitForTimeout(150);
    await page.getByTestId('wuxia-a3-translate').waitFor();
    const say = await page.getByTestId('wuxia-a3-translate').innerText();
    (say.includes('模板') || say.includes('句庫') || say.includes('LLM') ? ok : fail)(`翻成一句話：${say.replace(/\s+/g, ' ').slice(0, 80)}`);
    await page.waitForTimeout(600);
    if (shots) out.push(await shot(page, join(shots, 'a03-teahouse.png')));
    // 關掉動靜面板，點翻譯小窗裡的名字選中那人（不是玩家的那一個）→ 人物詳情裡的互動選單
    await page.getByTestId('wuxia-btn-social').click();
    await page.getByTestId('wuxia-a3-who-a').click();
    const menu = page.getByTestId('wuxia-a3-menu');
    await page.waitForTimeout(300);
    if (!(await menu.count())) await page.getByTestId('wuxia-a3-who-b').click();
    await page.getByTestId('wuxia-a3-translate').getByLabel('關閉').click();
    await menu.waitFor({ timeout: 10_000 });
    const opts = await menu.locator('button').count();
    (opts > 0 ? ok : fail)(`玩家互動選單 ${opts} 項（同一套規則、標難度）`);
    await page.waitForTimeout(400);
    if (shots) out.push(await shot(page, join(shots, 'a03-menu.png')));
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
    process.stdout.write(`wuxia:a3-shots FAILED (${failures})\n`);
    process.exit(1);
  }
  process.stdout.write('wuxia:a3-shots passed\n');
}
void main();
