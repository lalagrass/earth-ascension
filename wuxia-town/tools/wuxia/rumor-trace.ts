// 武俠小鎮 W8（#560）：傳聞傳播路徑與走樣。
// 用法：npm run wuxia:rumor-trace -- /tmp/j.json --rumor <id>   （不給 --rumor：列出所有傳聞與傳了幾手）
// 每一手：哪天哪個時辰、誰從誰那裡聽到（親眼／聊天／聽書／說給行商＝出鎮）、第幾手、這一手有沒有走樣、聽到的版本。
// 驗證（不符 exit 1）：每一手的「從誰」在那之前已經知道這則傳聞；hop＝上一手 +1；沒走樣的那一手文字跟上一手相同。
import { readFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { readClock } from '../../convex/wuxia/clock';
import { cidName, JianghuState, TrailEntry } from '../../convex/wuxia/w08_jianghu/data';

const VIA: Record<string, string> = { saw: '親眼看到', talk: '聊天聽來', story: '聽老韓說書', merchant: '說給行商（出鎮）' };

export function rumorTrace(st: JianghuState, rid: number) {
  const rumor = st.rumors.find((r) => r.id === rid);
  if (!rumor) throw new Error(`沒有傳聞 #${rid}`);
  const trail = st.trail.filter((t) => t.rid === rid);
  const problems: string[] = [];
  const knownAt = new Map<string, TrailEntry>();
  for (const t of trail) {
    if (t.via !== 'saw') {
      const src = t.from ? knownAt.get(t.from) : undefined;
      if (!src) problems.push(`第 ${t.day} 日 ${cidName(t.to)} 從 ${cidName(t.from)} 聽到，但 ${cidName(t.from)} 那時還不知道`);
      else {
        if (t.hop !== src.hop + 1) problems.push(`第 ${t.day} 日 ${cidName(t.to)} 第 ${t.hop} 手，上一手是第 ${src.hop} 手`);
        if (!t.distorted && t.text !== src.text) problems.push(`第 ${t.day} 日 ${cidName(t.to)} 沒走樣但文字不同`);
      }
    }
    if (t.via !== 'merchant' && !knownAt.has(t.to)) knownAt.set(t.to, t);
  }
  return { rumor, trail, problems, ok: problems.length === 0 };
}

export function rumorTraceText(st: JianghuState, rid: number): string {
  const { rumor, trail, problems } = rumorTrace(st, rid);
  const lines = [
    `傳聞 #${rumor.id}（${rumor.about}，第 ${rumor.day} 日 ${readClock(rumor.gm).label}${rumor.event ? `，事件 #${rumor.event}` : ''}）`,
    `真版本：${rumor.text}`,
    '',
  ];
  for (const t of trail) {
    const who = t.via === 'merchant' ? '行商' : cidName(t.to);
    const from = t.from ? `從${cidName(t.from)}` : '';
    lines.push(
      `${readClock(t.gm).label.padEnd(10, '　')} 第${t.hop}手 ${who}${from}${VIA[t.via]}${t.distorted ? '【走樣】' : ''}：${t.text}`,
    );
  }
  const distorted = trail.filter((t) => t.distorted).length;
  const out = trail.filter((t) => t.via === 'merchant').length;
  lines.push('', `共 ${trail.length} 手，走樣 ${distorted} 手，出鎮 ${out} 次；${problems.length ? `檢查不符：${problems.join('；')}` : '路徑檢查：每一手的來源在那之前都已知道、手數連續、沒走樣的手文字不變'}`);
  return lines.join('\n') + '\n';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: wuxia:rumor-trace -- run.json --rumor <id>');
  const st = JSON.parse(readFileSync(file, 'utf8')).jianghu as JianghuState;
  if (!st) throw new Error('rumor-trace：這份輸出沒有 jianghu');
  if (args.rumor === undefined || args.rumor === true) {
    for (const r of st.rumors) {
      const tr = st.trail.filter((t) => t.rid === r.id);
      process.stdout.write(`#${r.id} 第 ${r.day} 日 ${r.about}：${r.text}（${tr.length} 手、走樣 ${tr.filter((t) => t.distorted).length}）\n`);
    }
    return;
  }
  const rid = Number(args.rumor);
  process.stdout.write(rumorTraceText(st, rid));
  if (!rumorTrace(st, rid).ok) process.exit(1);
}

if (process.argv[1] && /rumor-trace\.ts$/.test(process.argv[1])) main();
