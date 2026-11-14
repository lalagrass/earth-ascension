// 武俠小鎮 A4（#576 驗收 C，只報告）`npm run wuxia:scenario-report -- --scenario 1 --seeds 7,8,9,10,11 --policy none,script`
//   [--script docs/wuxia/fixtures/a4-s1-gold.json]（policy script 用的腳本；預設依劇本找 a4-sN-gold.json）[--days N]（覆寫天數，試跑用）
//   [--out /tmp/r.json]
// 每個 seed × policy 跑一局，列各級目標的達成日；最後列各級達成率（不干預時太容易＝金級 5/5、太難＝銅級 0/5 會標出來給 owner 看，不自行調數值）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs, quietConsole } from './sim';
import { runPlay, PlayScript } from './a4-play';
import { SCENARIOS, TIERS } from '../../convex/wuxia/a4_play/data';

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const say = (s: string) => process.stdout.write(s + '\n');
  const sid = String(args.scenario ?? '1');
  const sc = SCENARIOS.find((s) => s.id === sid || s.id === `s${sid}`);
  if (!sc) throw new Error(`unknown scenario ${sid}`);
  const seeds = String(args.seeds ?? '7,8,9,10,11').split(',').map(Number);
  const policies = String(args.policy ?? 'none,script').split(',') as Array<'none' | 'script'>;
  const scriptPath = String(args.script ?? `docs/wuxia/fixtures/a4-${sc.id}-gold.json`);
  const script: PlayScript = existsSync(scriptPath) ? JSON.parse(readFileSync(scriptPath, 'utf8')) : { scenario: sc.id };
  const days = args.days === undefined ? undefined : Number(args.days);
  const rows: Array<{ seed: number; policy: string; goals: Record<string, number | undefined>; used: number; ended?: unknown; ms: number }> = [];
  say(`${sc.name}（${sc.id}）${days ?? sc.days} 日；seeds ${seeds.join(',')}；policy ${policies.join(',')}`);
  for (const policy of policies)
    for (const seed of seeds) {
      const t0 = performance.now();
      const { report } = runPlay({ ...script, scenario: sc.id }, seed, { days, policy });
      const ms = performance.now() - t0;
      rows.push({ seed, policy, goals: report.goals, used: report.used, ended: report.ended, ms });
      say(`  ${policy.padEnd(6)} seed ${String(seed).padStart(3)}：${TIERS.map((t) => `${t} ${report.goals[t] ?? '—'}`).join('  ')}  干預 ${report.used}（${(ms / 1000).toFixed(0)} 秒）`);
    }
  say('達成率：');
  for (const policy of policies) {
    const rs = rows.filter((r) => r.policy === policy);
    const rate = (t: string) => rs.filter((r) => r.goals[t] !== undefined).length;
    const avg = (t: string) => {
      const d = rs.map((r) => r.goals[t]).filter((x): x is number => x !== undefined);
      return d.length ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) : '—';
    };
    say(`  ${policy}：${TIERS.map((t) => `${t} ${rate(t)}/${rs.length}（平均第 ${avg(t)} 日）`).join('；')}`);
    if (policy === 'none' && rate('gold') === rs.length) say('  ⚠ 不干預時金級全中（太容易），列給 owner 看');
    if (policy === 'none' && rate('bronze') === 0) say('  ⚠ 不干預時銅級全沒中（太難），列給 owner 看');
  }
  if (args.out) writeFileSync(String(args.out), JSON.stringify({ scenario: sc.id, rows }, null, 2) + '\n');
}

main();
