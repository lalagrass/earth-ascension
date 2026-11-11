// 武俠小鎮 W0：npm run wuxia:check 的第二段（第一段是 npm test）。
// 1. headless --seed 7 跑兩次（各自獨立的子行程），hash 必須相同；seed 8 必須不同
// 2. 重播 docs/wuxia/fixtures/*.jsonl，hash 必須等於檔案內記錄
// 3. convex/aiTown、convex/engine 內的 Math.random／randomUUID 只能出現在 action 檔 agentOperations.ts
// 4. git 追蹤的 public/assets 下沒有檔案（上游美術不進 repo）
// 5. public/wuxia/ 每個素材檔都登記在 CREDITS.md
// 6. docs/wuxia/ 單檔 ≤ 1 MB、GIF ≤ 3 MB
// 7.（W1）w01-skin 開關不改規則：skin-diff A/B/C（關＝W0、同地圖只差開關與時鐘起點、不同地圖只差地圖相關欄位）
// 8.（W2）convex/wuxia/w02_folk/prompts.gen.ts 跟 data/wuxia/prompts/*.txt、anachronisms.txt 同步
// 9.（W2）w02-folk 開關不改規則：folk-diff A/B（關＝W1、同樣 5 人開／關只差 enabled 旗標）
// 10.（W2）convex/ 底下的路徑只用英數、底線、句點（Convex 部署的限制；w01-skin 目錄曾因此無法部署）
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readJournal, replayJournal } from './replay';
import { skinDiff } from './skin-diff';
import { promptsInSync } from './gen-prompts';
import { folkDiff } from './folk-diff';
import { quietConsole } from './sim';

const ROOT = new URL('../..', import.meta.url).pathname;
const MINUTES = process.env.WUXIA_CHECK_MINUTES ?? '30';
let failures = 0;
const ok = (msg: string) => process.stdout.write(`ok   ${msg}\n`);
const fail = (msg: string) => {
  failures++;
  process.stdout.write(`FAIL ${msg}\n`);
};

function headlessHash(seed: number): string {
  const out = execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      join(ROOT, 'tools/wuxia/headless.ts'),
      '--seed',
      String(seed),
      '--minutes',
      MINUTES,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  const m = out.match(/^hash ([0-9a-f]{64})$/m);
  if (!m) throw new Error(`headless output has no hash:\n${out}`);
  return m[1];
}

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

// 1
const a = headlessHash(7);
const b = headlessHash(7);
const c = headlessHash(8);
if (a === b) ok(`headless seed 7 × 2 (${MINUTES} min) hash 相同 ${a}`);
else fail(`headless seed 7 兩次 hash 不同 ${a} vs ${b}`);
if (a !== c) ok(`headless seed 8 hash 與 seed 7 不同 ${c}`);
else fail(`headless seed 8 hash 與 seed 7 相同 ${c}`);

// 2
const fixtures = walk(join(ROOT, 'docs/wuxia/fixtures'))
  .filter((f) => f.endsWith('.jsonl'))
  .sort();
if (fixtures.length === 0) fail('docs/wuxia/fixtures/ 沒有 *.jsonl');
for (const f of fixtures) {
  const r = replayJournal(readJournal(f));
  const name = relative(ROOT, f);
  if (r.ok) ok(`replay ${name} steps=${r.steps} hash ${r.finalHash}`);
  else
    fail(
      `replay ${name} hash ${r.finalHash} ≠ 記錄 ${r.expectedHash}` +
        (r.firstMismatch ? `（第一個不符 generation ${r.firstMismatch.generation}）` : ''),
    );
}

// 3
const offenders: string[] = [];
for (const f of [...walk(join(ROOT, 'convex/aiTown')), ...walk(join(ROOT, 'convex/engine'))]) {
  if (!f.endsWith('.ts')) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/Math\.random|randomUUID/.test(line) && !f.endsWith('agentOperations.ts')) {
      offenders.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
    }
  });
}
if (offenders.length === 0)
  ok('convex/aiTown、convex/engine 的 Math.random／randomUUID 只剩 agentOperations.ts');
else fail(`引擎內仍有隨機：\n  ${offenders.join('\n  ')}`);

// 4
try {
  const tracked = execFileSync('git', ['ls-files', 'public/assets'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  if (tracked === '') ok('git ls-files public/assets 為空（上游美術不在 repo）');
  else fail(`public/assets 仍有追蹤中的檔案：\n${tracked}`);
} catch {
  ok('（不是 git checkout，略過 public/assets 追蹤檢查）');
}

// 5
const creditsPath = join(ROOT, 'public/wuxia/CREDITS.md');
const credits = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8') : null;
if (credits === null) fail('缺 public/wuxia/CREDITS.md');
else {
  const missing = walk(join(ROOT, 'public/wuxia'))
    .map((f) => relative(join(ROOT, 'public/wuxia'), f))
    .filter((f) => f !== 'CREDITS.md' && !credits.includes(f));
  if (missing.length === 0) ok('public/wuxia/ 每個檔案都登記在 CREDITS.md');
  else fail(`CREDITS.md 漏登記：${missing.join(', ')}`);
}

// 6
const big = walk(join(ROOT, 'docs/wuxia')).filter((f) => {
  const size = statSync(f).size;
  return f.toLowerCase().endsWith('.gif') ? size > 3 * 1024 * 1024 : size > 1024 * 1024;
});
if (big.length === 0) ok('docs/wuxia/ 檔案大小在上限內（單檔 ≤1 MB，GIF ≤3 MB）');
else fail(`docs/wuxia/ 檔案過大：${big.map((f) => relative(ROOT, f)).join(', ')}`);

// 7
{
  const restore = console.log;
  console.log = () => {};
  const r = skinDiff(7, Number(MINUTES));
  console.log = restore;
  if (r.resultA.ok) ok(`skin-diff A：w01-skin 關＝W0 世界 hash ${r.resultA.hash}`);
  else fail(`skin-diff A：w01-skin 關的世界仍有開啟的元素 ${JSON.stringify(r.resultA.enabled)}`);
  if (r.resultB.ok)
    ok(
      `skin-diff B：同一張地圖開／關只差 ${r.resultB.paths.map((p) => p.split(':')[0]).join('、')}`,
    );
  else fail(`skin-diff B：同一張地圖開／關多出差異：\n  ${r.resultB.paths.join('\n  ')}`);
  if (r.resultC.ok)
    ok(
      `skin-diff C：開 ${r.resultC.hashOn} 與關的差異都在地圖相關欄位（${r.resultC.groups.length} 類）`,
    );
  else fail(`skin-diff C：非地圖相關的差異 ${r.resultC.unexpected.join(', ')}`);
}

// 8
if (promptsInSync()) ok('prompts.gen.ts 跟 data/wuxia/prompts、anachronisms.txt 同步');
else fail('prompts.gen.ts 不同步：請執行 npm run wuxia:gen-prompts');

// 9
{
  quietConsole(false); // 引擎 log 很吵，這段之後只用 stdout 輸出
  const r = folkDiff(7, Number(MINUTES));
  if (r.resultA.ok)
    ok(`folk-diff A：w02-folk 關＝W1 世界（${r.resultA.agents} 人）hash ${r.resultA.hash}`);
  else fail(`folk-diff A：w02-folk 關的世界不是 W1 設定 ${JSON.stringify(r.resultA)}`);
  if (r.resultB.ok) ok(`folk-diff B：同樣 5 人開／關只差 ${r.resultB.paths.join('、')}`);
  else fail(`folk-diff B：開／關多出差異 ${r.resultB.paths.join(', ')}`);
}

// 10
{
  const badPaths = walk(join(ROOT, 'convex'))
    .map((f) => relative(join(ROOT, 'convex'), f))
    .filter((f) => f.split('/').some((c) => !/^[A-Za-z0-9_.]+$/.test(c)));
  if (badPaths.length === 0) ok('convex/ 的路徑都符合 Convex 模組命名（英數、底線、句點）');
  else fail(`convex/ 有 Convex 不接受的路徑：${badPaths.join(', ')}`);
}

if (failures) {
  process.stdout.write(`wuxia:check FAILED (${failures})\n`);
  process.exit(1);
}
process.stdout.write('wuxia:check passed\n');
