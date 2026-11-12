// 武俠小鎮 W6（#558 驗收）：切磋報告。
// 用法：npm run wuxia:headless -- --seed 7 --days 30 --out /tmp/s.json && npm run wuxia:spar-report -- /tmp/s.json
//        [--off /tmp/off.json]（同 seed、--off w06-spar 的 run：比較阿青「想變強」與練功）[--who 阿青] [--json out.json]
//   - 切磋次數、勝負、平手、平均回合數（全部與每一對）、每場明細（先手、回合、旁觀、記憶 id、成長、旁白）
//   - 阿青輸給周教頭之後：「想變強」每日強度與「因為」的記憶 id（對得上切磋紀錄裡寫入的記憶 id）
//   - 練功：阿青每日練功分鐘、「武館加練（想變強）」時段 11:00–12:00 的練功分鐘；給 --off 時比較開／關
// 判定不過 exit 1。
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from './sim';
import { cidOf, nameOf, memoryText, MindTrace } from './mind-trace';
import { thoughtTimeline, trainMinutes } from './mind-report';
import { DAY_START_MINUTE, readClock } from '../../convex/wuxia/clock';
import { THOUGHT_BY_ID } from '../../convex/wuxia/w05_mind/data';
import type { SparRecord } from '../../convex/wuxia/w06_spar/data';
import { COACH_ID } from '../../convex/wuxia/w04_dojo/data';

const STRONGER = THOUGHT_BY_ID['stronger'];
/** 想變強加的阿青日程時段（thoughts.json）：11:00–12:00 */
const SLOT = (STRONGER.effects.schedule as any)?.['a-qing']?.dojoOpen?.[0] as { from: number; to: number };
const TRAIN_ACTS = new Set(['hit_dummy', 'hit_sandbag', 'lift_stone', 'stand_post']);

const hhmm = (gm: number) => {
  const c = readClock(gm);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};

/** 某人某日在 [from,to)（當日分鐘）時段裡練功的分鐘（life timeline）。 */
export function slotTrainMinutes(run: any, cid: string, day: number, from: number, to: number): number {
  const segs: Array<[number, number, string, string]> = run.life?.timeline?.[cid] ?? [];
  const base = (day - 1) * 1440 - DAY_START_MINUTE;
  const a = base + from;
  const b = base + to;
  let t = 0;
  for (const [s, e, , act] of segs) {
    if (!TRAIN_ACTS.has(act)) continue;
    t += Math.max(0, Math.min(e, b) - Math.max(s, a));
  }
  return t;
}

export function sparReport(run: any, who: string, off?: any) {
  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  const verdicts: Array<{ rule: string; ok: boolean; value: string }> = [];
  const hist: SparRecord[] = run.spar?.history ?? [];
  const trace = run.mind as MindTrace;
  const days = run.life?.days ?? Math.ceil((run.clock?.gameMinute ?? 0) / 1440);
  say(`# 切磋報告（seed ${run.seed}，${days} 日，hash ${String(run.finalHash).slice(0, 16)}…）`);
  // 總表
  const per: Record<string, { w: number; l: number; d: number }> = {};
  const pairs: Record<string, { n: number; rounds: number; w: Record<string, number>; d: number }> = {};
  let rounds = 0;
  for (const h of hist) {
    rounds += h.rounds;
    for (const c of [h.a, h.b]) per[c] ??= { w: 0, l: 0, d: 0 };
    if (h.draw) {
      per[h.a].d++;
      per[h.b].d++;
    } else {
      per[h.winner!].w++;
      per[h.winner === h.a ? h.b : h.a].l++;
    }
    const key = [h.a, h.b].sort().join('|');
    const p = (pairs[key] ??= { n: 0, rounds: 0, w: {}, d: 0 });
    p.n++;
    p.rounds += h.rounds;
    if (h.draw) p.d++;
    else p.w[h.winner!] = (p.w[h.winner!] ?? 0) + 1;
  }
  say(`切磋 ${hist.length} 場，平均 ${hist.length ? (rounds / hist.length).toFixed(2) : '-'} 回合，平手 ${hist.filter((h) => h.draw).length} 場`);
  for (const [c, r] of Object.entries(per)) say(`- ${nameOf(c)}：勝 ${r.w}、負 ${r.l}、平 ${r.d}`);
  for (const [k, p] of Object.entries(pairs)) {
    const [x, y] = k.split('|');
    say(`- ${nameOf(x)} 對 ${nameOf(y)}：${p.n} 場，${nameOf(x)} 勝 ${p.w[x] ?? 0}、${nameOf(y)} 勝 ${p.w[y] ?? 0}、平 ${p.d}，平均 ${(p.rounds / p.n).toFixed(2)} 回合`);
  }
  verdicts.push({ rule: '30 日內有切磋', ok: hist.length > 0, value: `${hist.length} 場` });
  const perDay = new Map<string, number>();
  for (const h of hist) {
    const k = `${[h.a, h.b].sort().join('|')}@${h.day}`;
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const maxPerDay = Math.max(0, ...perDay.values());
  verdicts.push({ rule: '同一對人每遊戲日最多 1 次', ok: maxPerDay <= 1, value: `最多 ${maxPerDay} 次` });
  say('');
  say('## 每場');
  say('場 | 日 時刻 | 地點 | 發起 對 對方 | 先手 | 結果 | 回合 | 旁觀 | 記憶 id | 拳腳成長 | 旁白');
  for (const h of hist) {
    const res = h.draw ? '平手' : `${nameOf(h.winner!)}勝`;
    const mem = Object.entries(h.memories).map(([c, id]) => `${nameOf(c)}#${id}`).join(' ');
    const gr = Object.entries(h.growth).map(([c, g]) => `${nameOf(c)}+${g}`).join(' ');
    say(`${h.id} | 第 ${h.day} 日 ${hhmm(h.startGm)} | ${h.place} | ${nameOf(h.a)} 對 ${nameOf(h.b)} | ${nameOf(h.first)} | ${res} | ${h.rounds} | ${h.spectators.map(nameOf).join('、') || '—'} | ${mem} | ${gr} | ${h.narration?.text ?? ''}（${h.narration?.source ?? ''}）`);
  }

  // 阿青輸給教頭 → 想變強
  const cid = cidOf(who);
  say('');
  say(`## ${nameOf(cid)}輸給周教頭之後`);
  const losses = hist.filter((h) => !h.draw && h.winner === COACH_ID && (h.a === cid || h.b === cid));
  const lossIds = new Set(losses.map((h) => h.memories[cid]).filter((x) => x !== undefined));
  if (losses.length === 0) {
    verdicts.push({ rule: `${nameOf(cid)}輸給周教頭`, ok: false, value: '沒有' });
  } else {
    const first = losses[0];
    say(`第一次輸：第 ${first.day} 日 ${hhmm(first.startGm)}，記憶 #${first.memories[cid]}；之後共輸 ${losses.length} 次（記憶 ${[...lossIds].map((x) => `#${x}`).join(' ')}）`);
    const tl = thoughtTimeline(trace, cid)[STRONGER.name] ?? [];
    for (const r of tl) say(`- 第 ${r.day} 日寅正 想變強 ${r.kind}（強度 ${r.s}）因為 ${r.causes.map((id) => `#${id}${lossIds.has(id) ? '［切磋輸］' : ''}`).join(' ') || '—'}`);
    // 每日評估：輸過之後的評估裡，想變強在不在、因為裡有沒有切磋輸的記憶
    const evals = trace.evals.filter((e) => e.day > first.day);
    const present = evals.filter((e) => (e.people[cid] ?? []).some((t) => t.name === STRONGER.name));
    const cited = present.filter((e) =>
      (e.people[cid] ?? []).some((t) => t.name === STRONGER.name && t.causes.some((id) => lossIds.has(id))),
    );
    const firstCited = cited[0];
    verdicts.push({
      rule: `${nameOf(cid)}輸給周教頭後「想變強」在、而且「因為」追得到切磋輸的記憶 id`,
      ok: evals.length > 0 && present.length === evals.length && cited.length > 0,
      value: `輸後 ${evals.length} 次評估都有想變強：${present.length}/${evals.length}；第 ${firstCited?.day ?? '-'} 日起「因為」列出切磋輸 ${firstCited ? (firstCited.people[cid].find((t) => t.name === STRONGER.name)!.causes.filter((id) => lossIds.has(id)).map((id) => `#${id}`).join(' ')) : '-'}`,
    });
    if (firstCited) {
      for (const id of firstCited.people[cid].find((t) => t.name === STRONGER.name)!.causes) {
        const m = trace.memories[id];
        say(`  #${id} ${m ? memoryText(m) : '(不在紀錄)'}`);
      }
    }
    // 練功
    say('');
    say(`## ${nameOf(cid)}練功（「武館加練（想變強）」時段 ${hhmm(SLOT.from - DAY_START_MINUTE)}–${hhmm(SLOT.to - DAY_START_MINUTE)}）`);
    say(`日 | 想變強 | 全日練功分 | 想變強時段練功分${off ? ' | 關掉切磋：想變強 | 全日練功分 | 想變強時段練功分' : ''}`);
    const has = (r: any, d: number) => {
      const e = (r.mind as MindTrace).evals.find((x) => x.day === d);
      const t = e?.people[cid]?.find((x) => x.name === STRONGER.name);
      return t ? String(t.s) : '—';
    };
    let slotOn = 0;
    let slotOff = 0;
    let dayOn = 0;
    let dayOff = 0;
    const lastDay = Math.floor(days);
    for (let d = first.day; d <= lastDay; d++) {
      const so = slotTrainMinutes(run, cid, d, SLOT.from, SLOT.to);
      const to = trainMinutes(run.dojo, cid, [d, d]);
      slotOn += so;
      dayOn += to;
      let row = `${d} | ${has(run, d)} | ${to} | ${so}`;
      if (off) {
        const sf = slotTrainMinutes(off, cid, d, SLOT.from, SLOT.to);
        const tf = trainMinutes(off.dojo, cid, [d, d]);
        slotOff += sf;
        dayOff += tf;
        row += ` | ${has(off, d)} | ${tf} | ${sf}`;
      }
      say(row);
    }
    verdicts.push({
      rule: `輸給周教頭後「想變強」讓${nameOf(cid)}多練（想變強時段有練功）`,
      ok: slotOn > 0,
      value: `第 ${first.day}–${lastDay} 日想變強時段練功 ${slotOn} 分、全日 ${dayOn} 分`,
    });
    if (off) {
      // 因果：關掉切磋時「想變強」只靠升階，7 日後就開始減弱；開著時切磋輸讓它維持
      const sOn = Number(has(run, lastDay)) || 0;
      const sOff = Number(has(off, lastDay)) || 0;
      verdicts.push({
        rule: `對照關掉切磋（同 seed）：第 ${lastDay} 日「想變強」強度 開 > 關（輸了才維持得住）`,
        ok: sOn > sOff,
        value: `開 ${sOn} vs 關 ${sOff}`,
      });
      const fOn = run.dojo?.final?.[cid]?.fist;
      const fOff = off.dojo?.final?.[cid]?.fist;
      say('');
      say(`資訊：第 ${first.day}–${lastDay} 日練功 開 ${dayOn} 分 vs 關 ${dayOff} 分（想變強時段 開 ${slotOn} vs 關 ${slotOff}）。` +
        `切磋本身佔掉練功時間（每場 30 遊戲分鐘，多半在早上練功時段裡），所以總分鐘開比關少；` +
        `切磋的成長（每場拳腳 + 打樁 2 小時的量）補回來：第 ${lastDay} 日拳腳 開 ${fOn} vs 關 ${fOff}。`);
    }
  }
  say('');
  for (const v of verdicts) say(`${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}`);
  return { text: lines.join('\n') + '\n', verdicts };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: spar-report run.json [--off off.json] [--who 阿青]');
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const off = args.off ? JSON.parse(readFileSync(String(args.off), 'utf8')) : undefined;
  if (!run.spar) throw new Error('這份 run 沒有切磋紀錄（要用 --days 跑、且 w06-spar 開著）');
  const r = sparReport(run, String(args.who ?? '阿青'), off);
  process.stdout.write(r.text);
  if (args.json) writeFileSync(String(args.json), JSON.stringify(r.verdicts, null, 2) + '\n');
  if (r.verdicts.some((v) => !v.ok)) process.exit(1);
}

if (process.argv[1]?.endsWith('spar-report.ts')) main();
