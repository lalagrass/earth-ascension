// 武俠小鎮 W6（#558）：wuxia:shot --gif——把一場切磋做成短 GIF（每回合 6 格、收勢後停 3 秒看旁白）。
// 用法：npm run wuxia:shot -- --gif --seed 7 --at day23-09:00 --match 周教頭,阿青 [--stage 石虎,林嫂]
//        [--size 960x600] [--scale 2.4] [--out docs/wuxia/w06/] [--name w06-spar]
// 流程：無頭模擬從 --at 起逐步跑，找到 --match 兩人的下一場切磋；走向場子時（--stage）把指定的人擺到武館灶邊
//      （真的佔灶的位子、真的「做事」中，開打時由引擎的旁觀規則把他們拉來看——轉身面向場子不是畫的），
//      每回合取一次狀態，截圖頁用「畫面時間」補出前衝／後退／白光的中間格，再用 gifenc 編成 GIF。
// 擺人只為了截圖（seed 7 的 30 日裡切磋時段武館沒有路人；見 DEVIATIONS W6-5），不影響任何 hash 驗收。
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { runHeadless } from './headless';
import { parseAt } from './shot';
import { gameMinutes } from '../../convex/wuxia/clock';
import { W03_LIFE, LifeState } from '../../convex/wuxia/w03_life/index';
import { OBJECT_BY_ID } from '../../convex/wuxia/w03_life/data';
import { W06_SPAR, SparState, SparMatch } from '../../convex/wuxia/w06_spar/data';
import { SPAR_ANIM_MS } from '../../src/wuxia/spar';

const ROOT = new URL('../..', import.meta.url).pathname;
const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(
  Boolean,
) as string[];

/** 每回合的中間格：相對最後一回合的毫秒數與這格停多久 */
const ROUND_FRAMES: Array<[number, number]> = [
  [0, 100],
  [100, 100],
  [200, 100],
  [300, 120],
  [450, 180],
  [SPAR_ANIM_MS + 100, 400],
];

type Capture = { state: any; match: SparMatch; time: number; kind: 'start' | 'round' | 'rest'; hit?: boolean };

function exportGame(game: any, hash: string, seed: number) {
  // serialize() 會共用 wuxia 狀態的物件，逐步取格要深拷貝，不然每一格都是最後的狀態
  return JSON.parse(JSON.stringify({
    tool: 'wuxia-town headless state',
    version: 1,
    seed,
    hash,
    engineTime: game.engine.currentTime,
    world: game.world.serialize(),
    playerDescriptions: [...game.playerDescriptions.values()].map((d: any) => d.serialize()),
    agentDescriptions: [...game.agentDescriptions.values()].map((d: any) => d.serialize()),
    worldMap: game.worldMap.serialize(),
  }));
}

/** 把 name 擺到 obj 的空位上，狀態是「在那裡做事」（跟生活規則自己選到的一樣）。 */
function stage(game: any, life: LifeState, pid: string, objId: string, gm: number): boolean {
  const obj = OBJECT_BY_ID[objId];
  const seats = life.res[objId];
  const slot = seats?.indexOf(null) ?? -1;
  const person = life.people[pid];
  const player = game.world.players.get(pid);
  if (slot < 0 || !person || !player || game.world.playerConversation(player)) return false;
  if (person.cur) {
    const cur = person.cur;
    const s = cur.obj ? life.res[cur.obj] : undefined;
    if (s && s[cur.slot] === pid) s[cur.slot] = null;
  }
  seats[slot] = pid;
  const [x, y] = obj.slots[slot];
  player.position = { x, y };
  player.facing = { dx: 0, dy: -1 };
  player.speed = 0;
  delete player.pathfinding;
  person.cur = { act: obj.activities[0].id, obj: objId, slot, phase: 'do', since: gm, retries: 0 };
  delete person.idleSince;
  return true;
}

/** 擺旁觀者的位置：武館院子裡場子兩側的器具（石鎖、木人樁） */
const STAGE_SPOTS = ['stone-locks', 'dummies'];

const lastHit = (m: SparMatch) => m.bout?.log[m.bout.log.length - 1]?.hit ?? false;

export async function shotGif(args: Record<string, any>) {
  const seed = Number(args.seed ?? 7);
  const at = parseAt(String(args.at ?? 'day21-06:00'));
  const [na, nb] = String(args.match ?? '周教頭,阿青').split(',');
  const stageNames = args.stage ? String(args.stage).split(',').filter(Boolean) : [];
  const [W, H] = String(args.size ?? '640x440').split('x').map(Number);
  const scale = Number(args.scale ?? 2.0);
  const out = resolve(ROOT, String(args.out ?? 'docs/wuxia/w06/'));
  const name = String(args.name ?? 'w06-spar');
  mkdirSync(out, { recursive: true });

  const caps: Capture[] = [];
  let target: number | undefined;
  let staged: string[] = [];
  let restSteps = 0;
  let lastRound = -1;
  let startGm: number | undefined;
  const run = runHeadless({
    seed,
    minutes: 0,
    untilGameMinute: at.gm + 15 * 1440,
    onStep: (game, now, hash) => {
      const w = game.world.wuxia!;
      if (w.clockEpoch === undefined) return;
      const gm = gameMinutes(now, w.clockEpoch, w.timeScale);
      if (gm < at.gm) return;
      if (startGm === undefined) startGm = gm;
      const st = w.elements[W06_SPAR] as SparState | undefined;
      const life = w.elements[W03_LIFE] as LifeState | undefined;
      if (!st || !life) return;
      const nameOf = (pid: string) => game.playerDescriptions.get(pid as any)?.name;
      const m =
        target === undefined
          ? st.active.find((x) => {
              const ns = [nameOf(x.a), nameOf(x.b)];
              return ns.includes(na) && ns.includes(nb);
            })
          : st.active.find((x) => x.id === target);
      if (!m) return target !== undefined; // 打完了
      target = m.id;
      if (m.phase === 'approach') {
        if (staged.length === 0 && stageNames.length) {
          for (const n of stageNames) {
            const pid = [...game.playerDescriptions.values()].find((d: any) => d.name === n)?.playerId;
            if (pid && STAGE_SPOTS.some((o) => stage(game, life, pid, o, gm))) staged.push(n);
          }
        }
        return;
      }
      const state = exportGame(game, hash, seed);
      if (m.phase === 'fight') {
        const rounds = m.times.length;
        if (rounds === 0 && lastRound < 0) {
          caps.push({ state, match: m, time: now, kind: 'start' });
          lastRound = 0;
        } else if (rounds > lastRound) {
          caps.push({ state, match: m, time: m.times[rounds - 1], kind: 'round', hit: lastHit(m) });
          lastRound = rounds;
        }
        return;
      }
      if (m.phase === 'rest') {
        // 最後一回合跟收勢常在同一步：先補這回合的動畫格，再停在收勢
        if (restSteps === 0 && m.times.length > lastRound) {
          caps.push({ state, match: m, time: m.times[m.times.length - 1], kind: 'round', hit: lastHit(m) });
          lastRound = m.times.length;
        }
        if (restSteps === 0) caps.push({ state, match: m, time: now, kind: 'rest' });
        restSteps++;
        return restSteps >= 2;
      }
    },
  });
  if (!caps.length) throw new Error(`從 ${String(args.at)} 起 15 日內找不到 ${na} 與 ${nb} 的切磋`);
  const m0 = caps[caps.length - 1].match;
  process.stdout.write(
    `找到切磋 #${m0.id}（${m0.place}）：${caps.filter((c) => c.kind === 'round').length} 回合，` +
      `結果 ${m0.result?.draw ? '平手' : `${m0.result?.winner} 勝`}；擺上旁觀：${staged.join('、') || '無'}；旁觀者 ${m0.spectators.length} 人\n`,
  );

  // 畫面焦點：場子中間
  const [[x1, y1], [x2, y2]] = m0.ring;
  const focus = { x: (x1 + x2) / 2 + 0.5, y: (y1 + y2) / 2 + 0.9, scale };
  const frames: Array<{ state: any | null; time: number; delay: number; hit?: boolean }> = [];
  for (const c of caps) {
    if (c.kind === 'start') frames.push({ state: c.state, time: c.time, delay: 900 });
    else if (c.kind === 'round') ROUND_FRAMES.forEach(([dt, d], i) => frames.push({ state: i === 0 ? c.state : null, time: c.time + dt, delay: d, hit: c.hit && dt === 200 }));
    else frames.push({ state: c.state, time: c.time, delay: 3200 });
  }

  const chrome = CHROME.find((p) => existsSync(p));
  if (!chrome) throw new Error('找不到 Chrome／Chromium，請設定 WUXIA_CHROME');
  const server = await createServer({
    root: ROOT,
    configFile: join(ROOT, 'vite.config.ts'),
    logLevel: 'error',
    server: { port: 0, host: '127.0.0.1', strictPort: false },
  });
  await server.listen();
  const port = (server.httpServer!.address() as { port: number }).port;
  const browser = await chromium.launch({
    executablePath: chrome,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
  });
  const files: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const sel = caps[0].state.playerDescriptions.find((d: any) => d.name === nb)?.playerId;
    await page.addInitScript(
      ([s, o]) => {
        (window as any).__WUXIA_STATE__ = s;
        (window as any).__WUXIA_SHOT__ = o;
      },
      [caps[0].state, { focus, selected: sel, gif: true }] as const,
    );
    await page.goto(`http://127.0.0.1:${port}/ai-town/src/wuxia/shot/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (window as any).__WUXIA_READY__ === true, null, { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const canvas = await page.$('canvas');
    if (!canvas) throw new Error('截圖頁沒有 canvas');
    const gif = GIFEncoder();
    let n = 0;
    const stills: Record<string, number> = { start: 0, hit: -1, rest: frames.length - 1 };
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      await page.evaluate(([s, t]) => (window as any).__WUXIA_FRAME__(s, t), [f.state, f.time] as const);
      n++;
      await page.waitForFunction((k) => (window as any).__WUXIA_FRAME_DONE__ >= k, n, { timeout: 20_000 });
      await page.waitForTimeout(f.state ? 120 : 40);
      const buf = await canvas.screenshot({ type: 'png' });
      const png = PNG.sync.read(buf);
      const palette = quantize(png.data, 64);
      gif.writeFrame(applyPalette(png.data, palette), png.width, png.height, { palette, delay: f.delay });
      if (i === 0 || i === frames.length - 1) {
        const file = join(out, `${name}-${i === 0 ? 'start' : 'end'}.png`);
        writeFileSync(file, buf);
        files.push(file);
      }
      // 第一個擊中的白光格也留一張靜態圖
      if (stills.hit < 0 && f.hit) {
        {
          stills.hit = i;
          const file = join(out, `${name}-hit.png`);
          writeFileSync(file, buf);
          files.push(file);
        }
      }
    }
    gif.finish();
    const gifFile = join(out, `${name}.gif`);
    writeFileSync(gifFile, gif.bytes());
    files.unshift(gifFile);
    if (errors.length) throw new Error(`截圖頁有錯誤：\n${errors.join('\n')}`);
    for (const f of files) process.stdout.write(`${relative(ROOT, f)}  ${statSync(f).size} bytes\n`);
    if (statSync(gifFile).size > 3 * 1024 * 1024) throw new Error('GIF 超過 3 MB');
    writeFileSync(
      join(out, `${name}.json`),
      JSON.stringify(
        {
          seed,
          at: String(args.at),
          match: { id: m0.id, place: m0.place, a: na, b: nb, result: m0.result, spectators: m0.spectators.length },
          staged,
          frames: frames.length,
          files: files.map((f) => relative(ROOT, f)),
          finalHash: run.finalHash,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
