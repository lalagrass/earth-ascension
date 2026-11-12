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
// 11.（W3）life-diff A/B/C：關＝W2、開 3 日作息與預約／卡住／挨餓檢查、關掉沒有作息
// 12.（W4）dojo-diff A/B/C：關＝W3、關掉武館空著、第 1 日開／關只差練功相關的作息
// 13.（W4）30 日技能報告：阿青第 30 日拳腳 120–180、教頭在場時增長明顯較高（WUXIA_CHECK_SKILL_DAYS=0 可略過，CI 不略過）
//    W5 起用預設設定（w05-mind 開，武館由心念重開）仍須通過
// 14.（W5）mind-diff A/B/C/D：關＝W4、開 14 日練功多 30%／重開由事件決定、不同 seed 不同日、丟記憶心念延後
//    （WUXIA_CHECK_MIND_DAYS=0 可略過，CI 不略過）
// 15.（W6）spar-diff A/B/C：關＝W5、判定勝率（教頭對新手 > 90%、相近 40–60%）、30 日切磋報告（輸了 → 想變強，追得到記憶 id）
//    第 13 項 W6 起改用「關掉切磋」的世界量 W4 的練功曲線（切磋另有成長，見 docs/wuxia/W6.md），那個 run 在這裡當對照組共用
// 16.（W7）bond-diff A/B：關＝W6、seed 7 跑 45 日：發生拜師、報告列出拜師日與觸發記憶、拜師後練功增長高於拜師前、
//    bond-trace 重算＝引擎快取且列出 5 筆記憶（WUXIA_CHECK_BOND_DAYS=0 可略過，CI 不略過；seed 8、9 的多 seed 判定見 W7.md）
// 17.（W8）jianghu-diff A/B/C/D：關＝W7、山賊第 5 日 vs 第 40 日結局不同、--no-rumor-out 60 日沒有俠客與山賊、
//    seed 7 跑 60 日：俠客／山賊有來因、大事件後 5 日平靜、連續 10 日無事加倍、每則傳聞路徑可追溯、鎮誌有內容
//    （WUXIA_CHECK_JIANGHU_DAYS=0 可略過 C、D，CI 不略過；seed 7、8、9 合計 4 種事件的判定見 W8.md 的 jianghu-report）
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readJournal, replayJournal } from './replay';
import { skinDiff } from './skin-diff';
import { promptsInSync } from './gen-prompts';
import { folkDiff } from './folk-diff';
import { lifeDiff } from './life-diff';
import { dojoDiff } from './dojo-diff';
import { mindDiff } from './mind-diff';
import { sparDiffA, sparDiffB, sparDiffC } from './spar-diff';
import { bondDiffA, bondDiffB } from './bond-diff';
import { describeBandit, jianghuDiffA, jianghuDiffB, jianghuDiffC, jianghuDiffD } from './jianghu-diff';
import { W06_SPAR } from '../../convex/wuxia/w06_spar/data';
import { skillReport } from './skill-report';
import { runHeadless } from './headless';
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

// 11
{
  const r = lifeDiff(7, 3, Number(MINUTES));
  if (r.resultA.ok) ok(`life-diff A：w03-life 關＝W2 世界 hash ${r.resultA.hash}`);
  else fail(`life-diff A：w03-life 關的世界不是 W2 ${JSON.stringify(r.resultA)}`);
  if (r.resultB.ok)
    ok(
      `life-diff B：開 3 日 hash ${r.resultB.hash}，第 2、3 日作息全過、預約 ≤ capacity、最長選不到事做 ${r.resultB.stuck} 分、最長 hunger>90 ${r.resultB.hungry} 分`,
    );
  else fail(`life-diff B：${r.resultB.fails.join('；')}`);
  if (r.resultC.ok) ok(`life-diff C：關 3 日 hash ${r.resultC.hash}，沒有作息規律`);
  else fail(`life-diff C：關掉 w03-life 仍有睡覺／吃飯 ${r.resultC.rows.join('；')}`);
}

// 12
{
  const r = dojoDiff(7, Number(MINUTES));
  if (r.resultA.ok) ok(`dojo-diff A：w04-dojo 關＝W3 世界 hash ${r.resultA.hash}`);
  else fail(`dojo-diff A：w04-dojo 關的世界不是 W3 ${JSON.stringify(r.resultA)}`);
  if (r.resultB.ok)
    ok(`dojo-diff B：關掉時武館空著（第 1 日練功 ${r.resultB.offTraining} 分、進院子 ${r.resultB.offCourtyard} 次）；開時 ${r.resultB.onTraining} 人分鐘`);
  else fail(`dojo-diff B：${JSON.stringify(r.resultB)}`);
  const others = r.resultC.rows.filter((x) => !x.overlaid);
  if (r.resultC.ok)
    ok(`dojo-diff C：第 1 日開／關，日程沒改的 ${others.length} 人作息相同（${others.filter((x) => x.same).length} 人時間表完全相同）`);
  else fail(`dojo-diff C：${others.filter((x) => !x.routineSame).map((x) => `${x.name} ${x.routineDiff.join('；')}`).join('｜')}`);
}

// 13
let skillRunOff: any;
{
  const days = Number(process.env.WUXIA_CHECK_SKILL_DAYS ?? 30);
  if (days > 0) {
    // W6：W4 的驗收量的是「練功」的成長曲線；切磋另有成長（#558「雙方 fist + 打樁 2 小時的量」），所以關掉 w06-spar 量。
    // 開著切磋的 30 日拳腳寫在第 15 項（資訊）與 docs/wuxia/W6.md。
    const run = runHeadless({ seed: 7, minutes: 0, untilGameMinute: days * 1440, trace: true, elements: { [W06_SPAR]: false } });
    skillRunOff = run.summary;
    const r = skillReport(run.summary.dojo!, 'a-qing');
    for (const v of r.verdicts) (v.ok ? ok : fail)(`skill-report ${days} 日（--off w06-spar，hash ${run.finalHash.slice(0, 16)}…）${v.rule}：${v.value}`);
  } else ok('（WUXIA_CHECK_SKILL_DAYS=0，略過 30 日技能報告）');
}

// 14
{
  const days = Number(process.env.WUXIA_CHECK_MIND_DAYS ?? 14);
  if (days > 0) {
    const r = mindDiff(7, Number(MINUTES), days, [2, 3]);
    if (r.resultA.ok) ok(`mind-diff A：w05-mind 關＝W4 世界 hash ${r.resultA.hash}（3 日 ${r.resultA.hash3.slice(0, 16)}…）`);
    else fail(`mind-diff A：w05-mind 關的世界不是 W4 ${JSON.stringify(r.resultA)}`);
    for (const v of r.resultB.verdicts) (v.ok ? ok : fail)(`mind-diff B ${days} 日：${v.rule}：${v.value}`);
    if (r.resultB.opened !== null && r.resultB.before === 0 && r.resultB.after > 0)
      ok(`mind-diff B：武館第 ${r.resultB.opened} 日重開，之前沒人練功、之後 ${r.resultB.after} 人分鐘`);
    else fail(`mind-diff B：重開前後練功 ${JSON.stringify({ opened: r.resultB.opened, before: r.resultB.before, after: r.resultB.after })}`);
    (r.resultC.ok ? ok : fail)(`mind-diff C：武館重開的日子 ${JSON.stringify(r.resultC.openDays)}`);
    (r.resultD.ok ? ok : fail)(`mind-diff D：丟掉記憶 #${r.resultD.dropped}，阿青「想學武」第 ${r.resultD.firstDay} 日 → ${r.resultD.againDay ?? '沒出現'}`);
  } else ok('（WUXIA_CHECK_MIND_DAYS=0，略過 mind-diff）');
}

// 15
{
  const a = sparDiffA(7, Number(MINUTES));
  (a.ok ? ok : fail)(`spar-diff A：w06-spar 關＝W5 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  const b = sparDiffB(7);
  (b.strongOk ? ok : fail)(`spar-diff B：周教頭對阿青 200 場勝率 ${(b.strong * 100).toFixed(1)}% > 90%`);
  (b.closeOk ? ok : fail)(
    `spar-diff B：相近（拳腳差 0–49，其他相同）弱方勝率 ${b.rows.map((r) => `${r.gap}:${(r.lowAsA * 100).toFixed(0)}/${(r.lowAsB * 100).toFixed(0)}%`).join(' ')}（40–60%）`,
  );
  (b.strongRowsOk ? ok : fail)(
    `spar-diff B：強對弱（拳腳差 300／400／600，其他相同）強方勝率 ${b.strongRows.map((r) => `${r.gap}:${(r.highAsA * 100).toFixed(1)}/${(r.highAsB * 100).toFixed(1)}%`).join(' ')}（> 90%）`,
  );
  const days = Number(process.env.WUXIA_CHECK_SPAR_DAYS ?? 30);
  if (days > 0) {
    const on = runHeadless({ seed: 7, minutes: 0, untilGameMinute: days * 1440, trace: true });
    const off =
      skillRunOff && Number(process.env.WUXIA_CHECK_SKILL_DAYS ?? 30) === days
        ? skillRunOff
        : runHeadless({ seed: 7, minutes: 0, untilGameMinute: days * 1440, trace: true, elements: { [W06_SPAR]: false } }).summary;
    for (const v of sparDiffC(on.summary, off)) (v.ok ? ok : fail)(`spar-report ${days} 日（hash ${on.finalHash.slice(0, 16)}…）${v.rule}：${v.value}`);
    ok(`（資訊）切磋開著時阿青第 ${days} 日拳腳 ${on.summary.dojo?.final?.['a-qing']?.fist}，關掉 ${off.dojo?.final?.['a-qing']?.fist}`);
  } else ok('（WUXIA_CHECK_SPAR_DAYS=0，略過 30 日切磋報告）');
}

// 16
{
  const a = bondDiffA(7, Number(MINUTES));
  (a.ok ? ok : fail)(`bond-diff A：w07-bond 關＝W6 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  const days = Number(process.env.WUXIA_CHECK_BOND_DAYS ?? 45);
  if (days > 0) {
    const b = bondDiffB(7, days);
    for (const v of b.report.verdicts) (v.ok ? ok : fail)(`bond-report ${days} 日（hash ${b.hash.slice(0, 16)}…）${v.rule}：${v.value}`);
    (b.trace.ok ? ok : fail)(
      `bond-trace 第 ${days} 日 阿青→周教頭 敬重 ${b.trace.bond.respect}（引擎快取 ${b.trace.cached?.respect ?? '-'}），貢獻最大 ${b.trace.top.length} 筆：${b.trace.top.map((c) => `#${c.memory!.id}`).join(' ')}`,
    );
  } else ok('（WUXIA_CHECK_BOND_DAYS=0，略過 45 日關係報告）');
}

// 17
{
  const a = jianghuDiffA(7, Number(MINUTES));
  (a.ok ? ok : fail)(`jianghu-diff A：w08-jianghu 關＝W7 世界 hash ${a.hash}（3 日 ${a.hash3.slice(0, 16)}…）`);
  const b = jianghuDiffB(7);
  (b.ok ? ok : fail)(
    `jianghu-diff B：--force-event bandit 第 5 日「${describeBandit(b.a).slice(-2, -1)[0]}」vs 第 40 日「${describeBandit(b.b).slice(-2, -1)[0]}」`,
  );
  const days = Number(process.env.WUXIA_CHECK_JIANGHU_DAYS ?? 60);
  if (days > 0) {
    const c = jianghuDiffC(7, days);
    (c.ok ? ok : fail)(`jianghu-diff C：--no-rumor-out ${days} 日沒有俠客與山賊（事件：${c.kinds.join('、') || '無'}；hash ${c.hash.slice(0, 16)}…）`);
    const d = jianghuDiffD(7, days);
    for (const v of d.report.verdicts.slice(1)) (v.ok ? ok : fail)(`jianghu-report ${days} 日（hash ${d.hash.slice(0, 16)}…）${v.rule}：${v.value}`);
    (d.summary.jianghu.chronicle.length > 0 ? ok : fail)(`鎮誌 ${d.summary.jianghu.chronicle.length} 條；事件 ${d.report.verdicts[0].value}`);
  } else ok('（WUXIA_CHECK_JIANGHU_DAYS=0，略過 60 日江湖報告）');
}

if (failures) {
  process.stdout.write(`wuxia:check FAILED (${failures})\n`);
  process.exit(1);
}
process.stdout.write('wuxia:check passed\n');
