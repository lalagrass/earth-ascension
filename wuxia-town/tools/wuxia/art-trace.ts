// 武俠小鎮 A2（#575）`npm run wuxia:art-trace -- --who 阿青 --move 起勢`：某人某招一路追回開山的人（每一代的來源、管道、熟練度、上限、走樣），
// 以及這人這招的所有紀錄。追不回開山的人就 exit 1（A6 的工具版）。
// 用法：npm run wuxia:art-trace -- [run.json] --who 阿青 --move 起勢 [--seed 7 --days 30 --arrive-day 5 --scenario master-open]
import { MOVES, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import { artTrace } from '../../convex/wuxia/a2_master/lineage';
import { loadA2Run } from './a2-run';

const { st, nameOf, cidOf, args, label } = loadA2Run();
if (!args.who || !args.move) throw new Error('用法：wuxia:art-trace -- --who 阿青 --move 起勢');
const cid = cidOf(String(args.who));
const move = MOVE_BY_ID[String(args.move)] ?? MOVES.find((m) => m.name === String(args.move));
if (!move) throw new Error(`沒有這一招：${args.move}`);
const { chain, records, rootIsOrigin } = artTrace(st, cid, move.id);
const out = [`# ${nameOf(cid)}的『${move.name}』（${label}）`];
if (!chain.length) out.push(`${nameOf(cid)}不會『${move.name}』`);
chain.forEach((s, i) => {
  const via = s.via === 'origin' ? '開山' : s.via === 'teach' ? `跟${nameOf(s.from!)}學（教）` : `看${nameOf(s.from!)}打（看）`;
  out.push(`${i === 0 ? '　' : '　'.repeat(i) + '↑ '}${nameOf(s.cid)}：${via}，第 ${s.day} 日；熟練 ${Math.round(s.prof)}${s.cap !== undefined ? `／上限 ${s.cap}` : ''}${s.flawed ? '，走樣' : ''}`);
});
if (records.length) {
  out.push('', '紀錄：');
  for (const r of records)
    out.push(`　#${r.id} 第 ${r.day} 日 ${r.via === 'watch' ? '看' : '教'} ${nameOf(r.from)}（當時 ${Math.round(r.fromProf)}）→ 上限 ${r.cap}${r.flawed ? '，走樣' : ''}${r.again ? '，重教' : ''}`);
}
out.push('', chain.length ? (rootIsOrigin ? `追回開山：${nameOf(chain[chain.length - 1].cid)}` : '追不回開山的人（錯誤）') : '');
process.stdout.write(out.join('\n') + '\n');
if (chain.length && !rootIsOrigin) process.exit(1);
