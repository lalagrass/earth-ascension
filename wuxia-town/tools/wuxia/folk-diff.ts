// 武俠小鎮 W2：w02-folk 開／關對照（#549「每步驗收都要並排開／關」，#554「規則不變」）。
// 用法：npm run wuxia:folk-diff -- [--seed 7] [--minutes 30]
//   A. w02-folk 關（w01-skin 開）＝W1 的預設世界：人物是上游 5 人，世界狀態沒有 w02-folk 的痕跡
//   B. 同樣 5 個人，w02-folk 開 vs 關：world.serialize()（狀態 hash 的那份資料）只能差在 wuxia.enabled.w02-folk
//      ——人物名字、身分、口吻、模板句都不在規則狀態裡，規則一行沒變
//   C. 開關各自的人物表與前幾句對話（給人看差別）
// 任何一組不符合就 exit 1。
import { canonicalJson } from '../../convex/wuxia/canonical';
import { hashableWorld } from '../../convex/wuxia/hash';
import { runHeadless } from './headless';
import { parseArgs, quietConsole } from './sim';

const enc = (v: unknown) => (v === undefined ? '<undefined>' : canonicalJson(v));

function diffPaths(a: any, b: any, path = '', out: string[] = []): string[] {
  if (enc(a) === enc(b)) return out;
  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort())
      diffPaths(a[k], b[k], path ? `${path}.${k}` : k, out);
    return out;
  }
  out.push(path);
  return out;
}

export function folkDiff(seed: number, minutes: number) {
  // W3：這是 W2 的隔離測試，w03-life 固定關（W3 自己的開關對照在 life-diff.ts）。
  // 關掉 w02-folk 時 w03-life 因 requires 也不會生效，A 不受影響；B 要兩邊都關 w03-life 才是「只差 w02-folk」。
  const W2 = { 'w03-life': false };
  const off = runHeadless({ seed, minutes, elements: { ...W2, 'w02-folk': false } });
  const offEnabled = Object.keys(off.game.world.wuxia!.enabled);
  const resultA = {
    ok: offEnabled.length === 1 && offEnabled[0] === 'w01-skin' && off.summary.agents === 5,
    hash: off.finalHash,
    enabled: offEnabled,
    agents: off.summary.agents,
  };
  const on5 = runHeadless({ seed, minutes, agents: 5, elements: W2 });
  const off5 = runHeadless({ seed, minutes, agents: 5, elements: { ...W2, 'w02-folk': false } });
  const paths = diffPaths(
    hashableWorld(on5.game.world.serialize()),
    hashableWorld(off5.game.world.serialize()),
  );
  const resultB = {
    ok: paths.length === 1 && paths[0] === 'wuxia.enabled.w02-folk',
    paths,
    hashOn: on5.finalHash,
    hashOff: off5.finalHash,
    statsOn: on5.summary.stats,
    statsOff: off5.summary.stats,
  };
  const on = runHeadless({ seed, minutes, elements: W2 });
  const people = (run: ReturnType<typeof runHeadless>) =>
    [...run.game.playerDescriptions.values()].map((d) => `${d.name}(${d.character})`);
  const resultC = {
    hashOn: on.finalHash,
    agentsOn: on.summary.agents,
    peopleOn: people(on),
    peopleOff: people(off),
    messagesOn: on.messages.slice(0, 6).map((m) => `${m.author}→${m.to}：${m.text}`),
    messagesOff: off.messages.slice(0, 6).map((m) => `${m.author}→${m.to}：${m.text}`),
  };
  return { resultA, resultB, resultC };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const seed = Number(args.seed ?? 7);
  const minutes = Number(args.minutes ?? 30);
  const { resultA, resultB, resultC } = folkDiff(seed, minutes);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(`seed=${seed} minutes=${minutes}`);
  say(
    `A ${resultA.ok ? 'ok  ' : 'FAIL'} w02-folk 關＝W1 設定（enabled=${JSON.stringify(resultA.enabled)}，${resultA.agents} 人） hash ${resultA.hash}`,
  );
  say(
    `B ${resultB.ok ? 'ok  ' : 'FAIL'} 同樣 5 人開／關，世界狀態只差：${resultB.paths.join(', ')}`,
  );
  say(`    開 ${resultB.hashOn}`);
  say(`    關 ${resultB.hashOff}`);
  const st = (s: any) =>
    `conversations=${s.conversationsStarted} messages=${s.messages} activities=${s.activities} wanders=${s.wanders}`;
  say(`    開：${st(resultB.statsOn)}`);
  say(`    關：${st(resultB.statsOff)}`);
  say(`C 預設（開，${resultC.agentsOn} 人） hash ${resultC.hashOn}`);
  say(`    開的人物：${resultC.peopleOn.join('、')}`);
  say(`    關的人物：${resultC.peopleOff.join('、')}`);
  say('    開的前 6 句：');
  for (const m of resultC.messagesOn) say(`      ${m}`);
  say('    關的前 6 句：');
  for (const m of resultC.messagesOff) say(`      ${m}`);
  if (!(resultA.ok && resultB.ok)) process.exit(1);
  say('folk-diff passed');
}

if (process.argv[1]?.endsWith('folk-diff.ts')) main();
