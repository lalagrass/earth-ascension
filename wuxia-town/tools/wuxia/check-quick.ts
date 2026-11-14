// 武俠小鎮 A1：npm run wuxia:check:quick（#563「輕量驗收」快速關卡，目標整套 3 分鐘內）。
// 每次 push 的 CI 只跑這一份；完整的 W0–W9 檢查（原 wuxia:check）改名 wuxia:check:full，手動觸發。
// 項目：
//   q1 型別檢查 tsc --noEmit
//   q2 單元測試 npm test（jest，含各步 A 類規則測試）
//   q3 headless seed 7 跑 3 遊戲日兩次（兩個子行程）hash 相同；seed 8 不同；seed 7 的 3 日 hash 等於釘住的值；--off a5-robust,a6-spread 等於 A4 的值；--off a4-play,a5-robust 等於 A3 的值；--off a3-silent,a4-play,a5-robust 等於 A2 的值；--off a2-master,a3-silent,a4-play,a5-robust 等於 A1 的值；--off a1-base,a2-master,a3-silent,a4-play,a5-robust,a6-spread 等於 W9 的值
//   q4 引擎內不得用 Math.random／randomUUID／Date.now（convex/aiTown、convex/engine 只容許 action 檔；convex/wuxia、src/wuxia/engine 全禁）
//   q5 git 追蹤的 public/assets 為空（上游美術不進 repo）；public/wuxia/ 每個檔都登記在 CREDITS.md
//   q6 docs/wuxia/ 單檔 ≤1 MB、GIF ≤3 MB
//   q7 convex/ 路徑只用英數、底線、句點；prompts.gen.ts 同步
//   q8 wuxia:parity seed 7 1 遊戲日：headless ＝ LocalCore（Worker 同一份程式）直接跑、1×、4×、16×、64×（A1 #564）；A2 加一組大師第 1 日進鎮 7 日（A3 起含無言互動）；A4 加一組劇本三（兩個師父）3 日
//   q9 wuxia:const-audit：data/wuxia/**/*.json 每個數值都有 _src（A1 #564；A2 起含 arts/ 等子資料夾）
//   （之後的 commit 再加：單機 Worker 與無頭 hash 相同、常數盤點）
import { spawn, execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promptsInSync } from './gen-prompts';

const ROOT = new URL('../..', import.meta.url).pathname;
// seed 7、預設設定、3 遊戲日的 hash（W8／W9 起不變；W8.md「hash 與報告變化」）。引擎刻意改變 hash 時更新這裡並在 An.md 記一行
// A2（#575）刻意改變：a2-master 預設開（多 6 位鎮民＋大師），新值見 docs/wuxia/A2.md；A1 的值改由 --off a2-master 守住
// A3（#574）刻意改變：a3-silent 預設開（無言互動取代 AI 對話），新值見 docs/wuxia/A3.md；A2 的值改由 --off a3-silent 守住
// A4（#576）刻意改變：a4-play 預設開（緣分點、事件掃描進狀態），新值見 docs/wuxia/A4.md；A3 的值改由 --off a4-play 守住
// A5（#577）刻意改變：a5-robust 預設開（卡路讓步、紀錄上限），新值見 docs/wuxia/A5.md；A4 的值改由 --off a5-robust 守住
// A6（#581）刻意改變：a6-spread 預設開（看變稀有、教的門檻依難度、練招曲線、目標依序），新值見 docs/wuxia/A6.md；A5 的值改由 --off a6-spread 守住
export const QUICK_HASH_SEED7_3D = '7a49504208e1cbe47c11fdc99157e82fbc08fd42f8c117519d78c53653e7f5c2';
/** A5 的 seed 7 3 日 hash：--off a6-spread 必須還是這個值（a6-spread 關掉跟 A5 逐位元組相同） */
export const A5_HASH_SEED7_3D = 'bdb2107be9fc4908bf8ff15253da0d4e554725c5aef1c3c8def2c46b3596d5c0';
/** A4 的 seed 7 3 日 hash：--off a5-robust 必須還是這個值（a5-robust 關掉跟 A4 逐位元組相同） */
export const A4_HASH_SEED7_3D = '14abe2fcb0292a6f97b2351c3aa9cd7c688513927cfc29ff73b1ab2b8e7cec30';
/** A3 的 seed 7 3 日 hash：--off a4-play,a5-robust 必須還是這個值（a4-play 關掉跟 A3 逐位元組相同） */
export const A3_HASH_SEED7_3D = 'a1762e45d80e3901ef32545e31c03142805306001ee4bb6738342b43d42129c0';
/** A2 的 seed 7 3 日 hash：--off a3-silent,a4-play,a5-robust 必須還是這個值（a3-silent 關掉跟 A2 逐位元組相同） */
export const A2_HASH_SEED7_3D = '7699618bb488d27ce00552c469c332b6837bd9d4b51bd124b4d808fc87cc29b1';
/** A1 的 seed 7 3 日 hash：--off a2-master,a3-silent,a4-play,a5-robust 必須還是這個值（a2-master 關掉跟 A1 逐位元組相同） */
export const A1_HASH_SEED7_3D = '51df021fb6ee5c7835266bc814bea47e65162226e730ae51e9e0fcc4d7b5325a';

let failures = 0;
const lines: string[] = [];
const ok = (m: string) => lines.push(`ok   ${m}`);
const fail = (m: string) => {
  failures++;
  lines.push(`FAIL ${m}`);
};

function run(cmd: string, args: string[]): Promise<{ code: number | null; out: string; ms: number }> {
  const outPath = join(mkdtempSync(join(tmpdir(), 'wuxia-quick-')), 'out.txt');
  const fd = openSync(outPath, 'w');
  const t0 = performance.now(); // 只在檢查工具計時用，不在引擎內
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', fd, fd], env: process.env });
    child.on('close', (code) => {
      closeSync(fd);
      resolve({ code, out: readFileSync(outPath, 'utf8'), ms: performance.now() - t0 });
    });
  });
}
const tsx = join(ROOT, 'node_modules/.bin/tsx');
const headless = (seed: number, ...extra: string[]) => run(tsx, [join(ROOT, 'tools/wuxia/headless.ts'), '--seed', String(seed), '--days', '3', ...extra]);
/** W9 的 seed 7 3 日 hash（A1 之前）：--off a1-base,a2-master,a3-silent,a4-play,a5-robust,a6-spread 必須還是這個值（A1–A5 都關掉跟 W9 逐位元組相同） */
export const W9_HASH_SEED7_3D = '4bc77029e423be2d377d12a2cab10ed5fc06ebcb28185258cf3ec07c5075d644';
const hashOf = (out: string) => out.match(/^hash ([0-9a-f]{64})$/m)?.[1];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export function staticChecks(): void {
  // q4
  const offenders: string[] = [];
  const scan = (files: string[], allow: (f: string) => boolean, re: RegExp) => {
    for (const f of files) {
      if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f) || allow(f)) continue;
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const t = line.trim();
          if (t.startsWith('*') || t.startsWith('/*') || t.startsWith('//')) return; // 註解
          const code = line.replace(/\/\/.*$/, '');
          if (re.test(code)) offenders.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
        });
    }
  };
  // 上游引擎：Math.random／randomUUID 只容許 action 檔（W0 起的規則）；Date.now 在上游的 action／mutation 邊界本來就有，不在這裡禁
  scan(
    [...walk(join(ROOT, 'convex/aiTown')), ...walk(join(ROOT, 'convex/engine'))],
    (f) => f.endsWith('agentOperations.ts'),
    /Math\.random|randomUUID/,
  );
  // 武俠引擎（tick 內跑的規則）與單機引擎：三個都禁。action／UI 邊界檔（journal 匯出、LLM 預算的牆鐘日界）列在允許清單
  const ALLOW_WALLCLOCK = ['convex/wuxia/journal.ts', 'convex/wuxia/llmBudget.ts'];
  scan(
    [...walk(join(ROOT, 'convex/wuxia')), ...walk(join(ROOT, 'src/wuxia/engine'))],
    (f) => ALLOW_WALLCLOCK.some((a) => f.endsWith(a)),
    /Math\.random|randomUUID|Date\.now/,
  );
  if (offenders.length === 0) ok('q4 引擎內沒有 Math.random／randomUUID／Date.now（上游只剩 action 檔）');
  else fail(`q4 引擎內有系統亂數或牆鐘：\n  ${offenders.join('\n  ')}`);

  // q5
  try {
    const tracked = execFileSync('git', ['ls-files', 'public/assets'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (tracked === '') ok('q5 git ls-files public/assets 為空（上游美術不在 repo）');
    else fail(`q5 public/assets 仍有追蹤中的檔案：\n${tracked}`);
  } catch {
    ok('q5（不是 git checkout，略過 public/assets 追蹤檢查）');
  }
  const creditsPath = join(ROOT, 'public/wuxia/CREDITS.md');
  if (!existsSync(creditsPath)) fail('q5 缺 public/wuxia/CREDITS.md');
  else {
    const credits = readFileSync(creditsPath, 'utf8');
    const missing = walk(join(ROOT, 'public/wuxia'))
      .map((f) => relative(join(ROOT, 'public/wuxia'), f))
      .filter((f) => f !== 'CREDITS.md' && !credits.includes(f));
    if (missing.length === 0) ok('q5 public/wuxia/ 每個檔案都登記在 CREDITS.md');
    else fail(`q5 CREDITS.md 漏登記：${missing.join(', ')}`);
  }

  // q6
  const big = walk(join(ROOT, 'docs/wuxia')).filter((f) => {
    const size = statSync(f).size;
    return f.toLowerCase().endsWith('.gif') ? size > 3 * 1024 * 1024 : size > 1024 * 1024;
  });
  if (big.length === 0) ok('q6 docs/wuxia/ 檔案大小在上限內（單檔 ≤1 MB，GIF ≤3 MB）');
  else fail(`q6 docs/wuxia/ 檔案過大：${big.map((f) => relative(ROOT, f)).join(', ')}`);

  // q7
  const badPaths = walk(join(ROOT, 'convex'))
    .map((f) => relative(join(ROOT, 'convex'), f))
    .filter((f) => f.split('/').some((c) => !/^[A-Za-z0-9_.]+$/.test(c)));
  if (badPaths.length === 0) ok('q7 convex/ 的路徑都符合 Convex 模組命名（英數、底線、句點）');
  else fail(`q7 convex/ 有 Convex 不接受的路徑：${badPaths.join(', ')}`);
  if (promptsInSync()) ok('q7 prompts.gen.ts 跟 data/wuxia/prompts、anachronisms.txt 同步');
  else fail('q7 prompts.gen.ts 不同步：請執行 npm run wuxia:gen-prompts');
}

async function main() {
  const t0 = performance.now();
  // 重的子行程同時起跑
  const [tsc, jest, h7a, h7b, h8, par, audit, h7off, h7offA2, parA2, h7offA3, h7offA4, h7offA5, h7offA6, parA4] = await Promise.all([
    run(join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', '.']),
    run('npm', ['test', '--', '--silent']),
    headless(7),
    headless(7),
    headless(8),
    run(tsx, ['tools/wuxia/parity.ts', '--seed', '7', '--days', '1']),
    run(tsx, ['tools/wuxia/const-audit.ts']),
    headless(7, '--off', 'a1-base,a2-master,a3-silent,a4-play,a5-robust,a6-spread'),
    headless(7, '--off', 'a2-master,a3-silent,a4-play,a5-robust,a6-spread'),
    run(tsx, ['tools/wuxia/parity.ts', '--seed', '7', '--days', '7', '--arrive-day', '1', '--scenario', 'master-open']),
    headless(7, '--off', 'a3-silent,a4-play,a5-robust,a6-spread'),
    headless(7, '--off', 'a4-play,a5-robust,a6-spread'),
    headless(7, '--off', 'a5-robust,a6-spread'),
    headless(7, '--off', 'a6-spread'),
    run(tsx, ['tools/wuxia/parity.ts', '--seed', '7', '--days', '3', '--play', 's3']),
  ]);
  staticChecks();
  // q1
  if (tsc.code === 0) ok(`q1 tsc --noEmit 通過（${(tsc.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q1 tsc --noEmit 失敗：\n${tsc.out.slice(-4000)}`);
  // q2
  const tests = jest.out.match(/^Tests:.*$/m)?.[0] ?? '(沒有 Tests: 行)';
  if (jest.code === 0) ok(`q2 單元測試通過 ${tests}（${(jest.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q2 單元測試失敗 ${tests}\n${jest.out.slice(-6000)}`);
  // q3
  const a = hashOf(h7a.out);
  const b = hashOf(h7b.out);
  const c = hashOf(h8.out);
  if (a && a === b) ok(`q3 headless seed 7 3 日 × 2 hash 相同 ${a}（${(h7a.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q3 headless seed 7 兩次 hash 不同或沒跑完 ${a} vs ${b}\n${h7a.out.slice(-2000)}`);
  if (c && c !== a) ok(`q3 headless seed 8 hash 與 seed 7 不同 ${c}`);
  else fail(`q3 headless seed 8 hash 與 seed 7 相同或沒跑完 ${c}`);
  if (a === QUICK_HASH_SEED7_3D) ok('q3 seed 7 3 日 hash 等於釘住的值（tools/wuxia/check-quick.ts QUICK_HASH_SEED7_3D）');
  else fail(`q3 seed 7 3 日 hash ${a} ≠ 釘住的 ${QUICK_HASH_SEED7_3D}（刻意改變請更新並在 An.md 記錄）`);
  const off = hashOf(h7off.out);
  if (off === W9_HASH_SEED7_3D) ok(`q3 --off a1-base,a2-master,a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ＝ W9 的 ${W9_HASH_SEED7_3D.slice(0, 16)}…（A1 修補可關）`);
  else fail(`q3 --off a1-base,a2-master,a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ${off} ≠ W9 的 ${W9_HASH_SEED7_3D}`);
  const offA2 = hashOf(h7offA2.out);
  if (offA2 === A1_HASH_SEED7_3D) ok(`q3 --off a2-master,a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ＝ A1 的 ${A1_HASH_SEED7_3D.slice(0, 16)}…（大師元素可關）`);
  else fail(`q3 --off a2-master,a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ${offA2} ≠ A1 的 ${A1_HASH_SEED7_3D}`);
  const offA3 = hashOf(h7offA3.out);
  if (offA3 === A2_HASH_SEED7_3D) ok(`q3 --off a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ＝ A2 的 ${A2_HASH_SEED7_3D.slice(0, 16)}…（無言互動可關）`);
  else fail(`q3 --off a3-silent,a4-play,a5-robust,a6-spread seed 7 3 日 hash ${offA3} ≠ A2 的 ${A2_HASH_SEED7_3D}`);
  const offA5 = hashOf(h7offA5.out);
  if (offA5 === A4_HASH_SEED7_3D) ok(`q3 --off a5-robust,a6-spread seed 7 3 日 hash ＝ A4 的 ${A4_HASH_SEED7_3D.slice(0, 16)}…（長跑修補可關）`);
  else fail(`q3 --off a5-robust,a6-spread seed 7 3 日 hash ${offA5} ≠ A4 的 ${A4_HASH_SEED7_3D}`);
  const offA6 = hashOf(h7offA6.out);
  if (offA6 === A5_HASH_SEED7_3D) ok(`q3 --off a6-spread seed 7 3 日 hash ＝ A5 的 ${A5_HASH_SEED7_3D.slice(0, 16)}…（傳得開元素可關）`);
  else fail(`q3 --off a6-spread seed 7 3 日 hash ${offA6} ≠ A5 的 ${A5_HASH_SEED7_3D}`);
  const offA4 = hashOf(h7offA4.out);
  if (offA4 === A3_HASH_SEED7_3D) ok(`q3 --off a4-play,a5-robust,a6-spread seed 7 3 日 hash ＝ A3 的 ${A3_HASH_SEED7_3D.slice(0, 16)}…（玩家干預可關）`);
  else fail(`q3 --off a4-play,a5-robust,a6-spread seed 7 3 日 hash ${offA4} ≠ A3 的 ${A3_HASH_SEED7_3D}`);
  // q8
  if (par.code === 0 && /parity OK/.test(par.out)) ok(`q8 wuxia:parity seed 7 1 日 headless ＝ local 直接跑／1×／4×／16×／64×（${(par.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q8 wuxia:parity 不一致或沒跑完\n${par.out.slice(-2000)}`);
  if (parA2.code === 0 && /parity OK/.test(parA2.out)) ok(`q8 wuxia:parity seed 7 7 日、大師第 1 日進鎮（看、教都發生）headless ＝ local（${(parA2.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q8 wuxia:parity（大師第 1 日進鎮 7 日）不一致或沒跑完\n${parA2.out.slice(-2000)}`);
  if (parA4.code === 0 && /parity OK/.test(parA4.out)) ok(`q8 wuxia:parity seed 7 3 日、劇本三（兩個師父）headless ＝ local（${(parA4.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q8 wuxia:parity（劇本三 3 日）不一致或沒跑完\n${parA4.out.slice(-2000)}`);
  // q9
  if (audit.code === 0) ok(`q9 ${audit.out.trim().split('\n').pop()}`);
  else fail(`q9 wuxia:const-audit 失敗\n${audit.out.slice(-3000)}`);

  process.stdout.write(lines.join('\n') + '\n');
  const sec = ((performance.now() - t0) / 1000).toFixed(1);
  if (failures) {
    process.stdout.write(`wuxia:check:quick FAILED (${failures}) ${sec} 秒\n`);
    process.exit(1);
  }
  process.stdout.write(`wuxia:check:quick passed ${sec} 秒\n`);
}

if (process.argv[1]?.endsWith('check-quick.ts')) void main();
