// 武俠小鎮 W3（#555 驗收）：印出每人某一天的時間表與作息檢查。
// 用法：npm run wuxia:day-report -- /tmp/life.json --day 2 [--strict]（任一條 FAIL 就 exit 1）[--json out.json]
// 輸入是 `wuxia:headless -- --days N --out x.json` 的輸出（summary.life.timeline）。不需要 Convex、LLM。
// 一天＝當日 00:00–24:00（遊戲分鐘 0 是第 1 日 06:00）。
import { readFileSync, writeFileSync } from 'node:fs';
import { ACTIVITY_BY_ID, SCHEDULES, placeName } from '../../convex/wuxia/w03_life/data';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02_folk';
import { DAY_START_MINUTE } from '../../convex/wuxia/clock';
import { parseArgs } from './sim';
import type { Segment } from './life-trace';

export const RULES = {
  sleepHours: [6, 9] as [number, number],
  meals: [2, 3] as [number, number],
  workHours: 4,
  minMealMinutes: 15,
  maxNoChoiceMinutes: 120,
  maxHungerOver90Minutes: 360,
};

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const label = (act: string) =>
  ACTIVITY_BY_ID[act]?.label ??
  ({ walk: '走路', talk: '聊天', idle: '閒著' } as Record<string, string>)[act] ??
  act;

export function dayRange(day: number): [number, number] {
  const start = (day - 1) * 1440 - DAY_START_MINUTE;
  return [start, start + 1440];
}

/** 把時間表切到某一天（遊戲分鐘 [from,to)）。 */
export function clip(segs: Segment[], from: number, to: number): Segment[] {
  const out: Segment[] = [];
  for (const [a, b, place, act] of segs) {
    const s = Math.max(a, from);
    const e = Math.min(b, to);
    if (e > s) out.push([s, e, place, act]);
  }
  return out;
}

/** 合併：同一活動連續的段落（走路時地點會變，也合成一段）。 */
export function mergeByAct(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last[3] === s[3] && last[1] === s[0] && (s[3] === 'walk' || last[2] === s[2]))
      last[1] = s[1];
    else out.push([...s] as Segment);
  }
  return out;
}

export type PersonDay = {
  who: string;
  name: string;
  worker: boolean;
  workplace: string;
  sleepMinutes: number;
  meals: number;
  workplaceMinutes: number;
  signature: string;
  lines: string[];
  verdicts: Array<{ rule: string; ok: boolean; value: string }>;
};

export function analyzeDay(timeline: Record<string, Segment[]>, day: number): PersonDay[] {
  const [from, to] = dayRange(day);
  const out: PersonDay[] = [];
  for (const [who, segs] of Object.entries(timeline)) {
    const profile = FOLK_CHARACTERS.find((c) => c.id === who);
    const name = profile?.name ?? who;
    const worker = SCHEDULES[who]?.worker ?? false;
    const workplace = profile?.workplace ?? '';
    const day = clip(segs, from, to);
    const merged = mergeByAct(day);
    let sleepMinutes = 0;
    let workplaceMinutes = 0;
    for (const [a, b, place, act] of day) {
      if (act === 'sleep') sleepMinutes += b - a;
      if (place === workplace && act !== 'sleep') workplaceMinutes += b - a;
    }
    const meals = merged.filter(([a, b, , act]) => act === 'eat' && b - a >= RULES.minMealMinutes)
      .length;
    const lines = merged.map(
      ([a, b, place, act]) =>
        `${hhmm(a - from)}–${hhmm(b - from)} ${label(act)}${act === 'walk' ? '' : ` @ ${placeName(place)}`}`,
    );
    const verdicts = [
      {
        rule: `睡 ${RULES.sleepHours[0]}–${RULES.sleepHours[1]} 小時`,
        ok: sleepMinutes >= RULES.sleepHours[0] * 60 && sleepMinutes <= RULES.sleepHours[1] * 60,
        value: `${(sleepMinutes / 60).toFixed(1)} 小時`,
      },
      {
        rule: `吃 ${RULES.meals[0]}–${RULES.meals[1]} 餐`,
        ok: meals >= RULES.meals[0] && meals <= RULES.meals[1],
        value: `${meals} 餐`,
      },
    ];
    if (worker)
      verdicts.push({
        rule: `工作者 ≥ ${RULES.workHours} 小時在 ${placeName(workplace)}（不含睡覺）`,
        ok: workplaceMinutes >= RULES.workHours * 60,
        value: `${(workplaceMinutes / 60).toFixed(1)} 小時`,
      });
    const signature = merged
      .filter(([, , , act]) => act !== 'walk')
      .map(([a, , place, act]) => `${hhmm(a - from)}${act}@${place}`)
      .join(',');
    out.push({ who, name, worker, workplace, sleepMinutes, meals, workplaceMinutes, signature, lines, verdicts });
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) throw new Error('usage: day-report run.json --day 2 [--strict]');
  const day = Number(args.day ?? 2);
  const summary = JSON.parse(readFileSync(file, 'utf8'));
  const life = summary.life;
  if (!life) throw new Error(`${file} 沒有生活時間表：請用 wuxia:headless -- --days N 產生`);
  const say = (s: string) => process.stdout.write(s + '\n');
  say(
    `# 第 ${day} 日時間表（seed ${summary.seed}，w03-life ${life.on ? '開' : '關'}，hash ${summary.finalHash.slice(0, 16)}…）`,
  );
  const people = analyzeDay(life.timeline, day);
  let fails = 0;
  for (const p of people) {
    say('');
    say(`## ${p.name}（${p.who}${p.worker ? `，工作地點 ${placeName(p.workplace)}` : ''}）`);
    for (const l of p.lines) say(`  ${l}`);
    for (const v of p.verdicts) {
      if (!v.ok) fails++;
      say(`  ${v.ok ? 'PASS' : 'FAIL'} ${v.rule}：${v.value}`);
    }
  }
  // 跟隔天比：同一人兩天的時間表不完全相同（#562 W3-5）
  const days = Math.floor((life.days ?? 0) as number);
  const other = day + 1 <= days ? day + 1 : day - 1;
  say('');
  say('## 全程檢查');
  if (other >= 2 && other <= days) {
    const next = analyzeDay(life.timeline, other);
    for (const p of people) {
      const q = next.find((x) => x.who === p.who)!;
      const differ = q.signature !== p.signature;
      if (!differ) fails++;
      say(`  ${differ ? 'PASS' : 'FAIL'} ${p.name} 第 ${day} 日與第 ${other} 日時間表不完全相同`);
    }
  }
  const c = life.checks;
  if (life.on) {
    const capOk = c.reservationOverCapacity === 0 && c.usingOverCapacity === 0 && c.doubleBooked === 0;
    if (!capOk) fails++;
    say(
      `  ${capOk ? 'PASS' : 'FAIL'} 預約 ≤ capacity（${c.minutes} 個遊戲分鐘逐分檢查：超額預約 ${c.reservationOverCapacity}、超額使用 ${c.usingOverCapacity}、重複預約 ${c.doubleBooked}）`,
    );
    const stuck = Math.max(0, ...Object.values(c.maxNoChoiceMinutes as Record<string, number>));
    const stuckOk = stuck < RULES.maxNoChoiceMinutes;
    if (!stuckOk) fails++;
    say(`  ${stuckOk ? 'PASS' : 'FAIL'} 沒有人連續 2 遊戲小時選不到事做（最長 ${stuck} 分）`);
    const hungry = Math.max(0, ...Object.values(c.maxHungerOver90Minutes as Record<string, number>));
    const hungryOk = hungry < RULES.maxHungerOver90Minutes;
    if (!hungryOk) fails++;
    say(`  ${hungryOk ? 'PASS' : 'FAIL'} 沒有人 hunger 連續 6 小時 > 90（最長 ${hungry} 分）`);
    say(`  INFO 對話最長 ${c.maxConversationMinutes} 遊戲分鐘（上限 90）`);
  } else {
    say('  INFO w03-life 關：沒有預約、需求與物資，只看時間表');
  }
  const conv = life.conversations;
  if (conv)
    say(
      `  INFO 對話 ${conv.total} 段，開始地點 ${JSON.stringify(conv.byPlace)}，說話地點 ${JSON.stringify(conv.byTalkPlace)}；說話在茶館／飯桌／河邊 ${conv.social}/${conv.total}${conv.ratio === null ? '' : `（${(conv.ratio * 100).toFixed(0)}%）`}`,
    );
  say('');
  say(fails ? `day-report: ${fails} 項 FAIL` : 'day-report: 全部 PASS');
  if (args.json) writeFileSync(args.json, JSON.stringify({ day, people, checks: c, conversations: conv }, null, 2) + '\n');
  if (args.strict && fails) process.exit(1);
}

if (process.argv[1]?.endsWith('day-report.ts')) main();
