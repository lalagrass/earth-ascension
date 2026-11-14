// 武俠小鎮 A7（#584）：由「工價」一個旋鈕推導出的錢——飯錢、各人初始錢袋、束脩、雜務產量、武館每日用量。
// 只讀 W3 的資料（活動、日程）；全部是純函式／模組載入時算好的常數，不碰世界狀態。數值與推導寫在 docs/wuxia/A7.md。
import { ACTIVITY_BY_ID, SCHEDULES, SCHEDULE_OVERLAYS, ScheduleBlock } from '../w03_life/data';
import { COACH_CID, MASTER_CID } from '../a2_master/data';
import a7Json from '../../../data/wuxia/a7.json';
import { A7 } from './data';

const J = a7Json as unknown as { jobActs: string[]; gigActs: string[] };

/** 做一頓飯要幾個工時：煮飯（45 分鐘做 4 餐）＋ 1 水（挑水 3 水／30 分鐘）＋ 1 柴（砍竹 3 柴／60 分鐘），除以 4 餐 */
export function mealHours(): number {
  const cook = ACTIVITY_BY_ID.cook;
  const draw = ACTIVITY_BY_ID.draw_water;
  const chop = ACTIVITY_BY_ID.chop_bamboo;
  const meals = cook.gives!.meal!;
  const minutes =
    cook.minutes + (cook.consumes!.water! * draw.minutes) / draw.gives!.water! + (cook.consumes!.wood! * chop.minutes) / chop.gives!.wood!;
  return minutes / meals / 60;
}
/** 飯錢（文／餐）＝工價 × 做一頓飯的工時，四捨五入成整數 */
export const MEAL_PRICE = Math.round(A7.wage * mealHours());

/** 這人排給「本業」的日程時段（w04-dojo 的日程覆蓋算進去，跟預設世界一樣）；零工活動只在標「零工」的時段、或日程 worker＝true 時才算 */
export function jobBlocks(cid: string): ScheduleBlock[] {
  const sch = SCHEDULE_OVERLAYS['w04-dojo']?.[cid] ?? SCHEDULES[cid];
  if (!sch) return [];
  return sch.blocks.filter((b) =>
    b.do.some((a) => J.jobActs.includes(a) && (!J.gigActs.includes(a) || sch.worker || b.label.includes('零工'))),
  );
}
export function jobActsOf(cid: string): Set<string> {
  const sch = SCHEDULE_OVERLAYS['w04-dojo']?.[cid] ?? SCHEDULES[cid];
  const out = new Set<string>();
  for (const b of jobBlocks(cid)) for (const a of b.do) if (J.jobActs.includes(a) && (!J.gigActs.includes(a) || sch?.worker || b.label.includes('零工'))) out.add(a);
  return out;
}
/** 每日預期工時＝本業時段總長 × 實際在做的比例（uptime） */
export function hoursPerDay(cid: string): number {
  let min = 0;
  for (const b of jobBlocks(cid)) min += (b.to - b.from + 1440) % 1440;
  return (min / 60) * A7.uptime;
}
/** 每日預期（收入−飯錢） */
export function netPerDay(cid: string): number {
  return hoursPerDay(cid) * A7.wage - A7.mealsPerDay * MEAL_PRICE;
}
/** 初始錢袋＝7 日的（收入−飯錢），不為負 */
export function endowment(cid: string): number {
  return Math.max(0, Math.round(A7.endowDays * netPerDay(cid)));
}

/** 「普通鎮民」＝日程裡有本業或零工的人（兩位師父除外） */
export function ordinaryCids(): string[] {
  return Object.keys(SCHEDULES)
    .filter((c) => c !== MASTER_CID && c !== COACH_CID && hoursPerDay(c) > 0)
    .sort();
}
export function ordinaryNetPerDay(): number {
  const l = ordinaryCids();
  return l.reduce((a, c) => a + netPerDay(c), 0) / l.length;
}
/** 束脩（文／30 日）＝一位普通鎮民 30 日可存下的錢 × 0.5 */
export const TUITION_PRICE = Math.round(A7.tuition.share * A7.tuition.days * ordinaryNetPerDay());

/** 雜務一次的產量：跟挑水（3 水／30 分鐘）、砍竹（3 柴／60 分鐘）同樣的速率 */
export function choreYield(actId: string): { water?: number; wood?: number } {
  const act = ACTIVITY_BY_ID[actId];
  if (actId === 'dojo_haul') return { water: (ACTIVITY_BY_ID.draw_water.gives!.water! * act.minutes) / ACTIVITY_BY_ID.draw_water.minutes };
  return { wood: (ACTIVITY_BY_ID.chop_bamboo.gives!.wood! * act.minutes) / ACTIVITY_BY_ID.chop_bamboo.minutes };
}
/** 武館每人每日用掉的水與柴＝三餐 × 煮飯每次耗 1 水 1 柴 ÷ 4 餐（燒茶、煮飯、洗） */
export function dojoUse(): { water: number; wood: number } {
  const cook = ACTIVITY_BY_ID.cook;
  const meals = cook.gives!.meal!;
  return { water: (A7.mealsPerDay * cook.consumes!.water!) / meals, wood: (A7.mealsPerDay * cook.consumes!.wood!) / meals };
}
