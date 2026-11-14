// 武俠小鎮 A2（#575）`npm run wuxia:lineage`：每門武學的傳承譜系樹（誰教誰、看來的、走樣、再傳）與會的人數曲線。
// 用法：npm run wuxia:lineage -- [run.json] [--seed 7 --days 30 --arrive-day 5 --scenario master-open] [--art taiji]
import { ARTS, ART_BY_ID, MOVE_BY_ID } from '../../convex/wuxia/a2_master/data';
import { generations, lineageTree } from '../../convex/wuxia/a2_master/lineage';
import { loadA2Run } from './a2-run';

const { st, nameOf, args, label } = loadA2Run();
const out: string[] = [`# 傳承譜系（${label}）`];
out.push(st.arrivedAt === undefined ? '大師沒有進鎮' : `大師第 ${Math.floor(st.arrivedAt / 1440) + 1} 日進鎮，教法 ${st.policy}`);
for (const art of ARTS) {
  if (args.art && args.art !== art.id) continue;
  out.push('', `## ${art.name}（開山：${nameOf(art.origin)}）`);
  const gens = generations(st, art.id);
  for (const l of lineageTree(st, art.id)) {
    const e = l.edge;
    const tag = e
      ? `　← ${e.teach ? '教' : ''}${e.teach && e.watch ? '＋' : ''}${e.watch ? '看' : ''}${e.reteach ? '（再傳）' : e.secondhand ? '（轉手）' : ''}${e.flawed ? `，走樣 ${e.flawed} 招` : ''}，第 ${e.firstDay} 日起：${e.moves.map((m) => MOVE_BY_ID[m].name).join('、')}`
      : '';
    out.push(`${'　'.repeat(l.depth)}${l.depth ? '└ ' : ''}${nameOf(l.cid)}（最深第 ${gens[l.cid] ?? 0} 代）${tag}`);
  }
  const curve = st.daily.map((d) => d.learners[art.id] ?? 0);
  if (curve.length) out.push(`會的人數（每日）：${st.daily.map((d) => `${d.day}:${d.learners[art.id] ?? 0}`).join(' ')}`);
}
if (!args.art || ART_BY_ID[args.art]) process.stdout.write(out.join('\n') + '\n');
else throw new Error(`沒有這門武學：${args.art}`);
