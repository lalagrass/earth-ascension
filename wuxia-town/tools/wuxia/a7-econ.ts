// 武俠小鎮 A7（#584）`npm run wuxia:a7-econ`：印出由工價推導的全部數字（給 A7.md 與 a7.json 的 _src 對照）。
import { A7 } from '../../convex/wuxia/a7_tuition/data';
import { MEAL_PRICE, TUITION_PRICE, dojoUse, endowment, hoursPerDay, mealHours, netPerDay, ordinaryCids, ordinaryNetPerDay, choreYield } from '../../convex/wuxia/a7_tuition/econ';

const say = (s: string) => process.stdout.write(s + '\n');
say(`工價 ${A7.wage} 文／小時；做一頓飯 ${mealHours().toFixed(4)} 工時 → 飯錢 ${MEAL_PRICE} 文；每人每日吃 ${A7.mealsPerDay} 餐 → 日飯錢 ${(A7.mealsPerDay * MEAL_PRICE).toFixed(1)}`);
say(`普通鎮民（${ordinaryCids().length} 人）每日（收入−飯錢）平均 ${ordinaryNetPerDay().toFixed(2)} 文 → 束脩＝${A7.tuition.share}×${A7.tuition.days}×${ordinaryNetPerDay().toFixed(2)}＝${TUITION_PRICE} 文`);
say(`雜務產量：挑水 60 分鐘 ${JSON.stringify(choreYield('dojo_haul'))}、砍柴 60 分鐘 ${JSON.stringify(choreYield('dojo_chop'))}；武館每人每日用 ${JSON.stringify(dojoUse())}`);
say('每人：id\t工時/日\t日淨收入\t初始錢袋\t幾日存夠一份束脩');
for (const c of ordinaryCids()) say(`${c}\t${hoursPerDay(c).toFixed(2)}\t${netPerDay(c).toFixed(1)}\t${endowment(c)}\t${Math.max(0, Math.ceil((TUITION_PRICE - endowment(c)) / netPerDay(c)))}`);
