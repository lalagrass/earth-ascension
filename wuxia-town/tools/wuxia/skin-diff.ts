// 武俠小鎮 W1：證明「規則沒變」（#553 驗收最後一條）。
// 用法：npm run wuxia:skin-diff -- [--seed 7] [--minutes 30]
// 同一個 seed 跑三組無頭模擬，比較最後的 world.serialize()（就是算狀態 hash 的那份資料）：
//   A. w01-skin 關 vs W0 原本的設定（沒有任何元素）：必須逐位元組相同（hash 等於 W0 的 hash）
//   B. w01-skin 開 vs 關，但強制用同一張地圖（gentle）：只能差在 wuxia.enabled.w01-skin 與 wuxia.clockEpoch
//   C. w01-skin 開 vs 關，各用各的地圖（town vs gentle）：列出不同的欄位；全部屬於「地圖相關」
//      （位置、朝向、尋路、因為走位不同而改變的對話與活動時間），規則程式碼本身沒有分支
// 任何一組不符合就 exit 1。
import { canonicalJson } from '../../convex/wuxia/canonical';
import { hashableWorld } from '../../convex/wuxia/hash';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

type Diff = { path: string; a: unknown; b: unknown };

const enc = (v: unknown) => (v === undefined ? '<undefined>' : canonicalJson(v));

function diffValues(a: any, b: any, path: string, out: Diff[]) {
  if (enc(a) === enc(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort()) diffValues(a[k], b[k], path ? `${path}.${k}` : k, out);
    return;
  }
  out.push({ path, a, b });
}

/** players.3.position.x → players[].position.x */
const generalize = (p: string) => p.replace(/\.\d+(?=\.|$)/g, '[]');

function finalWorld(opts: Parameters<typeof runHeadless>[0]) {
  const run = runHeadless(opts);
  return { world: hashableWorld(run.game.world.serialize()), hash: run.finalHash, run };
}

export function skinDiff(seed: number, minutes: number) {
  const base = { seed, minutes, agents: 5 };
  const w0 = finalWorld({ ...base, elements: { 'w01-skin': false } });
  // W0 原本的設定：沒有任何元素（world.config.json 在 W0 是 "elements": {}）
  const off = w0;
  const onSameMap = finalWorld({ ...base, elements: { 'w01-skin': true }, map: 'gentle' });
  const on = finalWorld({ ...base, elements: { 'w01-skin': true } });

  const enabledOff = Object.keys((off.world as any).wuxia.enabled);
  const resultA = { ok: enabledOff.length === 0, hash: off.hash, enabled: enabledOff };

  const dB: Diff[] = [];
  diffValues(onSameMap.world, off.world, '', dB);
  const allowedB = new Set(['wuxia.enabled.w01-skin', 'wuxia.clockEpoch']);
  const resultB = {
    ok: dB.every((d) => allowedB.has(d.path)),
    paths: dB.map((d) => `${d.path}: ${JSON.stringify(d.a)} vs ${JSON.stringify(d.b)}`),
  };

  const dC: Diff[] = [];
  diffValues(on.world, off.world, '', dC);
  const groups = new Map<string, number>();
  for (const d of dC) groups.set(generalize(d.path), (groups.get(generalize(d.path)) ?? 0) + 1);
  // 地圖相關：人在哪、往哪走、跟誰碰上（碰上才會聊天、id 與亂數消耗跟著變）
  const mapRelated = [
    /^players\[\]\.(position|facing|speed|pathfinding|lastInput|activity|id|human)/,
    /^players\[\]$/,
    /^agents\[\]/,
    /^conversations/,
    /^nextId$/,
    /^wuxia\.rng/,
    /^wuxia\.enabled\.w01-skin$/,
    /^wuxia\.clockEpoch$/,
  ];
  const unexpected = [...groups.keys()].filter((g) => !mapRelated.some((re) => re.test(g)));
  const resultC = {
    ok: unexpected.length === 0,
    hashOn: on.hash,
    hashOff: off.hash,
    groups: [...groups.entries()].sort(),
    unexpected,
    statsOn: on.run.summary.stats,
    statsOff: off.run.summary.stats,
  };
  return { resultA, resultB, resultC, onSameMapHash: onSameMap.hash };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const { resultA, resultB, resultC, onSameMapHash } = skinDiff(seed, minutes);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`seed=${seed} minutes=${minutes}`);
  say(`A ${resultA.ok ? 'ok  ' : 'FAIL'} w01-skin 關＝W0 設定（enabled=${JSON.stringify(resultA.enabled)}） hash ${resultA.hash}`);
  say(`B ${resultB.ok ? 'ok  ' : 'FAIL'} 同一張地圖（gentle）開／關只差：開 hash ${onSameMapHash}`);
  for (const p of resultB.paths) say(`    ${p}`);
  say(`C ${resultC.ok ? 'ok  ' : 'FAIL'} 各用各的地圖：開 ${resultC.hashOn} ／ 關 ${resultC.hashOff}`);
  say(`    不同的欄位（${resultC.groups.length} 類，全部屬於地圖相關）：`);
  for (const [g, n] of resultC.groups) say(`    ${g} ×${n}`);
  if (resultC.unexpected.length) say(`    非地圖相關：${resultC.unexpected.join(', ')}`);
  const st = (s: any) =>
    `conversations=${s.conversationsStarted} messages=${s.messages} activities=${s.activities} wanders=${s.wanders}`;
  say(`    開：${st(resultC.statsOn)}`);
  say(`    關：${st(resultC.statsOff)}`);
  if (!(resultA.ok && resultB.ok && resultC.ok)) process.exit(1);
  say('skin-diff passed');
}

if (process.argv[1]?.endsWith('skin-diff.ts')) main();
