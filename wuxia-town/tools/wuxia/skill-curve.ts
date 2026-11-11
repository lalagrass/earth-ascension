// W4（#556）技能成長曲線：把無頭模擬的阿青每日拳腳值，和公式的解析解畫成一張 SVG（給 docs/wuxia/W4.md）。
// 用法：npx tsx tools/wuxia/skill-curve.ts <headless.json> [--days 365] [--who a-qing] [--key fist] --out docs/wuxia/w04/skill-curve.svg
// 解析解：dL/dt = base·w·bonus·(1−L/max)^exponent，exponent=2 時 1/(1−L/max) 隨練功分鐘線性增加。
import fs from 'node:fs';
import { TRAINING, initialSkills } from '../../convex/wuxia/w04_dojo/data';

type Args = { file: string; days: number; who: string; key: string; out: string };
function parseArgs(argv: string[]): Args {
  const a: Args = { file: '', days: 365, who: 'a-qing', key: 'fist', out: 'docs/wuxia/w04/skill-curve.svg' };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--days') a.days = Number(argv[++i]);
    else if (v === '--who') a.who = argv[++i];
    else if (v === '--key') a.key = argv[++i];
    else if (v === '--out') a.out = argv[++i];
    else a.file = v;
  }
  if (!a.file) throw new Error('skill-curve: 要給 headless 輸出的 json');
  return a;
}

/** 解析解：從 L0 起，每日練 minutesPerDay 分、加成 bonus，第 d 日結束時的值。 */
export function analytic(L0: number, d: number, minutesPerDay: number, bonus: number): number {
  const max = TRAINING.max;
  const n = TRAINING.exponent;
  const k = (TRAINING.base * bonus * minutesPerDay * d) / max;
  // (1−x)^(1−n)/(n−1) 隨時間線性增加 k
  const x0 = L0 / max;
  const u = Math.pow(1 - x0, 1 - n) / (n - 1) + k;
  return max * (1 - Math.pow(u * (n - 1), 1 / (1 - n)));
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const d = JSON.parse(fs.readFileSync(a.file, 'utf8'));
  // 只取完整的日子（最後一列可能是剛開始的下一日）
  const days: Array<Record<string, any>> = d.dojo.days.slice(0, Math.floor(d.clock.gameMinute / 1440));
  const sim = days.map((row) => row[a.who].end[a.key] as number);
  const trainMin = days.map((row) => row[a.who].trainMinutes as number);
  const avgTrain = trainMin.reduce((s, x) => s + x, 0) / Math.max(1, trainMin.length);
  const L0 = (initialSkills(a.who) as Record<string, number>)[a.key];
  const D = Math.max(a.days, sim.length);

  const W = 900, H = 520, ml = 60, mr = 20, mt = 40, mb = 50;
  const X = (day: number) => ml + ((W - ml - mr) * day) / D;
  const Y = (v: number) => mt + (H - mt - mb) * (1 - v / 1000);
  const line = (pts: Array<[number, number]>) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const curve = (mpd: number, bonus: number) => {
    const pts: Array<[number, number]> = [[0, L0]];
    for (let i = 1; i <= D; i++) pts.push([i, analytic(L0, i, mpd, bonus)]);
    return pts;
  };
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" font-size="12">`);
  out.push(`<rect width="${W}" height="${H}" fill="#faf6ec"/>`);
  out.push(`<text x="${ml}" y="22" font-size="15" fill="#3c2a1e">阿青 ${a.key} 成長（seed ${d.seed}，${sim.length} 日模擬；base ${TRAINING.base}、指數 ${TRAINING.exponent}、教頭 ×${TRAINING.coachBonus}）</text>`);
  for (const t of TRAINING.tiers) {
    out.push(`<line x1="${ml}" x2="${W - mr}" y1="${Y(t.min)}" y2="${Y(t.min)}" stroke="#c9b99a" stroke-dasharray="4 4"/>`);
    out.push(`<text x="${W - mr - 4}" y="${Y(t.min) - 4}" text-anchor="end" fill="#8a7458">${t.name} ${t.emoji} ≥${t.min / TRAINING.display}</text>`);
  }
  for (let v = 0; v <= 1000; v += 200) out.push(`<text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#555">${v / 10}</text>`);
  for (const day of [0, 30, 90, 180, 270, 365].filter((x) => x <= D)) {
    out.push(`<line x1="${X(day)}" x2="${X(day)}" y1="${mt}" y2="${H - mb}" stroke="#e4d9c4"/>`);
    out.push(`<text x="${X(day)}" y="${H - mb + 16}" text-anchor="middle" fill="#555">${day}</text>`);
  }
  out.push(`<text x="${(W + ml) / 2}" y="${H - 12}" text-anchor="middle" fill="#555">日</text>`);
  out.push(`<rect x="${X(0)}" y="${Y(180)}" width="${X(30) - X(0)}" height="${Y(120) - Y(180)}" fill="#7fb07f" opacity="0.25"/>`);
  out.push(`<path d="${line(curve(120, 1))}" fill="none" stroke="#999" stroke-width="1.5" stroke-dasharray="6 3"/>`);
  out.push(`<path d="${line(curve(120, TRAINING.coachBonus))}" fill="none" stroke="#c07a3a" stroke-width="1.5" stroke-dasharray="6 3"/>`);
  out.push(`<path d="${line(curve(avgTrain, TRAINING.coachBonus))}" fill="none" stroke="#3a6ea5" stroke-width="1.2" stroke-dasharray="2 2"/>`);
  out.push(`<path d="${line(sim.map((v, i) => [i + 1, v] as [number, number]))}" fill="none" stroke="#b22222" stroke-width="2.5"/>`);
  for (const [day, v] of [[30, 150], [365, 450]] as Array<[number, number]>) {
    if (day > D) continue;
    out.push(`<circle cx="${X(day)}" cy="${Y(v)}" r="5" fill="none" stroke="#000" stroke-width="1.5"/>`);
    out.push(`<text x="${X(day) - 8}" y="${Y(v) + (day > 100 ? -10 : 18)}" text-anchor="end">#556 目標 ${day} 日≈${v / 10}</text>`);
  }
  const lg: Array<[string, string, string]> = [
    ['#b22222', '', `模擬（實際每日平均練 ${avgTrain.toFixed(0)} 分）`],
    ['#3a6ea5', '2 2', `公式：每日 ${avgTrain.toFixed(0)} 分、教頭全程在`],
    ['#c07a3a', '6 3', '公式：每日 120 分、教頭全程在（×1.5）'],
    ['#999', '6 3', '公式：每日 120 分、沒有教頭'],
  ];
  lg.forEach(([c, dash, t], i) => {
    const y = mt + 14 + i * 18;
    out.push(`<line x1="${ml + 10}" x2="${ml + 40}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
    out.push(`<text x="${ml + 46}" y="${y + 4}">${t}</text>`);
  });
  out.push(`<text x="${ml + 10}" y="${mt + 14 + 4 * 18 + 4}" fill="#4a7a4a">綠框：驗收範圍（第 30 日 12.0–18.0）</text>`);
  out.push('</svg>');
  fs.writeFileSync(a.out, out.join('\n') + '\n');
  const pick = (i: number) => (i <= sim.length ? sim[i - 1] : undefined);
  console.log(JSON.stringify({ out: a.out, L0, avgTrain: Number(avgTrain.toFixed(1)), simDay30: pick(30), simDay365: pick(365),
    analytic120coach: { d30: Math.round(analytic(L0, 30, 120, 1.5)), d365: Math.round(analytic(L0, 365, 120, 1.5)) },
    analytic120solo: { d30: Math.round(analytic(L0, 30, 120, 1)), d365: Math.round(analytic(L0, 365, 120, 1)) },
    analyticAvgCoach: { d30: Math.round(analytic(L0, 30, avgTrain, 1.5)), d365: Math.round(analytic(L0, 365, avgTrain, 1.5)) } }));
}
main();
