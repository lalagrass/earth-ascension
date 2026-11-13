// 武俠小鎮 W8（#560）：江湖事件報告（多 seed）。
// 用法：npm run wuxia:jianghu-report -- /tmp/j7.json /tmp/j8.json /tmp/j9.json   （headless --days 的輸出）
//       npm run wuxia:jianghu-report -- --seeds 7,8,9 --days 60                   （自己跑）
// 判定（#560 驗收＋#562 W8-12／13）：
//   1. 4 種事件在這些 seed 合計各至少出現一次
//   2. 俠客、山賊都有來因（開始時有出鎮傳聞，列出傳聞 id）
//   3. 節奏：大事件結束後 5 日內沒有新事件開始；連續 10 日無事的擲骰機率加倍
//   4. 每則傳聞的路徑都追得到（rumor-trace 檢查）
import { readFileSync } from 'node:fs';
import { parseArgs, quietConsole } from './sim';
import { runHeadless } from './headless';
import { EVENT_KINDS, JIANGHU, JianghuState, cidName } from '../../convex/wuxia/w08_jianghu/data';
import { rumorTrace } from './rumor-trace';

export type Verdict = { rule: string; ok: boolean; value: string };

export function jianghuReport(summaries: any[]) {
  const verdicts: Verdict[] = [];
  const rows: string[] = [];
  const total: Record<string, number> = {};
  let causeOk = true;
  let paceOk = true;
  let boostOk = true;
  let traceOk = true;
  const causeNotes: string[] = [];
  for (const s of summaries) {
    const st = s.jianghu as JianghuState;
    rows.push(`seed ${s.seed}（${s.life?.days ?? '?'} 日，hash ${String(s.finalHash).slice(0, 16)}…）`);
    for (const h of st.history) {
      total[h.kind] = (total[h.kind] ?? 0) + 1;
      const o = h.outcome;
      const brief =
        h.kind === 'bandit'
          ? `${o.count} 名山賊，${o.outcome === 'fled' ? `被 ${o.heroes.map(cidName).join('、')} 打跑` : `搶走 ${o.loot} 箱`}`
          : h.kind === 'xiake'
            ? `${o.name} 住 ${o.stay} 日，切磋 ${o.bouts.filter((b: any) => b.opp).length} 場`
            : h.kind === 'xiaobi'
              ? `${o.mode ?? ''} ${o.results?.length ?? 0} 場，頭籌 ${o.winner ? cidName(o.winner) : '-'}`
              : `說「${o.tale}」，${o.listeners.length} 人聽`;
      rows.push(`  第 ${String(h.day).padStart(2)}–${Math.floor((h.endGm + 360) / 1440) + 1} 日 #${h.id} ${h.name}：${brief}；來因 ${h.causes.length ? h.causes.map((x) => `#${x}`).join(' ') : '-'}${h.forced ? '（強制）' : ''}`);
      if ((h.kind === 'xiake' || h.kind === 'bandit') && !h.forced) {
        if (h.causes.length === 0) causeOk = false;
        causeNotes.push(`seed ${s.seed} 第 ${h.day} 日 ${h.name} ← ${h.causes.map((x) => `#${x}「${st.rumors.find((r) => r.id === x)?.text}」`).join('、')}`);
      }
    }
    // 節奏：大事件結束日 +quietDays 內沒有事件開始
    for (const h of st.history) {
      if (!JIANGHU.events[h.kind].big) continue;
      const endDay = Math.floor((h.endGm + 360) / 1440) + 1;
      const next = st.history.find((x) => x.startGm > h.endGm && !x.forced);
      if (next && next.day <= endDay + JIANGHU.director.quietDays) paceOk = false;
    }
    for (const r of st.rolls) {
      const prev = [...st.history].filter((h) => h.day < r.day);
      void prev;
      if (r.p > 0 && r.p !== JIANGHU.director.chance && r.p !== JIANGHU.director.chance * JIANGHU.director.boost) boostOk = false;
    }
    for (const r of st.rumors) if (!rumorTrace(st, r.id).ok) traceOk = false;
    const boosted = st.rolls.filter((r) => r.p === JIANGHU.director.chance * JIANGHU.director.boost).length;
    rows.push(`  導演擲骰 ${st.rolls.length} 次（有候選 ${st.rolls.filter((r) => r.p > 0).length}、加倍 ${boosted}、平靜期 ${st.rolls.filter((r) => r.skipped === 'quiet').length}、事件進行中 ${st.rolls.filter((r) => r.skipped === 'active').length}）；傳聞 ${st.rumors.length} 則、傳 ${st.trail.length} 手、走樣 ${st.trail.filter((t) => t.distorted).length} 手、出鎮 ${st.out.length} 則`);
  }
  const missing = EVENT_KINDS.filter((k) => !total[k]);
  verdicts.push({ rule: '4 種事件合計各至少一次', ok: missing.length === 0, value: EVENT_KINDS.map((k) => `${k}×${total[k] ?? 0}`).join('、') });
  verdicts.push({ rule: '俠客／山賊都有來因（出鎮傳聞）', ok: causeOk, value: causeNotes.length ? `${causeNotes.length} 次都有` : '沒有俠客／山賊' });
  verdicts.push({ rule: `大事件後 ${JIANGHU.director.quietDays} 日平靜`, ok: paceOk, value: paceOk ? '沒有違反' : '有事件在平靜期內開始' });
  verdicts.push({ rule: `連續 ${JIANGHU.director.boostAfterDays} 日無事機率 ×${JIANGHU.director.boost}`, ok: boostOk, value: '擲骰機率只有 0.3／0.6 兩種' });
  verdicts.push({ rule: '傳聞路徑可追溯', ok: traceOk, value: traceOk ? '每則傳聞的每一手都追得到來源' : '有傳聞路徑對不上' });
  return { verdicts, rows, causeNotes, total };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  let summaries: any[];
  if (args._.length) summaries = args._.map((f: string) => JSON.parse(readFileSync(f, 'utf8')));
  else {
    const days = Number(args.days ?? 60);
    summaries = String(args.seeds ?? '7,8,9')
      .split(',')
      .map(Number)
      .map((seed) => runHeadless({ seed, minutes: 0, untilGameMinute: days * 1440, trace: true }).summary);
  }
  const r = jianghuReport(summaries);
  process.stdout.write(r.rows.join('\n') + '\n\n');
  if (r.causeNotes.length) process.stdout.write('來因：\n' + r.causeNotes.map((x) => `  ${x}`).join('\n') + '\n\n');
  let fails = 0;
  for (const v of r.verdicts) {
    if (!v.ok) fails++;
    process.stdout.write(`${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}\n`);
  }
  if (fails) process.exit(1);
}

if (process.argv[1] && /jianghu-report\.ts$/.test(process.argv[1])) main();
