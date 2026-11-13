// 武俠小鎮 A1：npm run wuxia:check:quick（#563「輕量驗收」快速關卡，目標整套 3 分鐘內）。
// 每次 push 的 CI 只跑這一份；完整的 W0–W9 檢查（原 wuxia:check）改名 wuxia:check:full，手動觸發。
// 項目：
//   q1 型別檢查 tsc --noEmit
//   q2 單元測試 npm test（jest，含各步 A 類規則測試）
//   q3 headless seed 7 跑 3 遊戲日兩次（兩個子行程）hash 相同；seed 8 不同；seed 7 的 3 日 hash 等於釘住的值
//   q4 引擎內不得用 Math.random／randomUUID／Date.now（convex/aiTown、convex/engine 只容許 action 檔；convex/wuxia、src/wuxia/engine 全禁）
//   q5 git 追蹤的 public/assets 為空（上游美術不進 repo）；public/wuxia/ 每個檔都登記在 CREDITS.md
//   q6 docs/wuxia/ 單檔 ≤1 MB、GIF ≤3 MB
//   q7 convex/ 路徑只用英數、底線、句點；prompts.gen.ts 同步
//   q8 wuxia:parity seed 7 1 遊戲日：headless ＝ LocalCore（Worker 同一份程式）直接跑、1×、4×、16×、64×（A1 #564）
//   q9 wuxia:const-audit：data/wuxia/*.json 每個數值都有 _src（A1 #564）
//   （之後的 commit 再加：單機 Worker 與無頭 hash 相同、常數盤點）
import { spawn, execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promptsInSync } from './gen-prompts';

const ROOT = new URL('../..', import.meta.url).pathname;
// seed 7、預設設定、3 遊戲日的 hash（W8／W9 起不變；W8.md「hash 與報告變化」）。引擎刻意改變 hash 時更新這裡並在 An.md 記一行
export const QUICK_HASH_SEED7_3D = '4bc77029e423be2d377d12a2cab10ed5fc06ebcb28185258cf3ec07c5075d644';

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
const headless = (seed: number) => run(tsx, [join(ROOT, 'tools/wuxia/headless.ts'), '--seed', String(seed), '--days', '3']);
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
  const tsx = join(ROOT, 'node_modules/.bin/tsx');
  const [tsc, jest, h7a, h7b, h8, par, audit] = await Promise.all([
    run(join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', '.']),
    run('npm', ['test', '--', '--silent']),
    headless(7),
    headless(7),
    headless(8),
    run(tsx, ['tools/wuxia/parity.ts', '--seed', '7', '--days', '1']),
    run(tsx, ['tools/wuxia/const-audit.ts']),
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
  // q8
  if (par.code === 0 && /parity OK/.test(par.out)) ok(`q8 wuxia:parity seed 7 1 日 headless ＝ local 直接跑／1×／4×／16×／64×（${(par.ms / 1000).toFixed(1)} 秒）`);
  else fail(`q8 wuxia:parity 不一致或沒跑完\n${par.out.slice(-2000)}`);
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
