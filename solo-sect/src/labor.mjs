/* loop127 勞作練體 `laborgrow`（docs/DAXIA-EVAL.md §3）。d.lg 由 sim 依 s.laborgrow 設定；沒有 d.lg 時全部回傳中性值。
   借鏡：大俠立志傳臂力靠採集、敏捷每日有上限；RimWorld 技能每日軟上限後只拿 20%。 */
export const LABOR = { per: 400, powDiv: 10, cap: 3, over: 0.2, acts: ['chop', 'quarry', 'water', 'build', 'repair'] };
export const strMul = (d) => (d?.lg ? 1 + Math.max(0, d.skills?.strength || 0) / LABOR.per : 1); // 招式傷害倍率
export const laborPow = (d) => (d?.lg ? Math.max(0, d.skills?.strength || 0) / LABOR.powDiv : 0); // 門派戰力加項
export const isWorkAct = (act) => LABOR.acts.includes(act);
// 做活長的力氣：當日累計超過 cap 後只拿 over。回傳實際可加的量（delta ≥ 0）。
export function workStrCap(d, day, delta) {
  if (!d?.lg || !(delta > 0)) return delta; if (d.lgDay !== day) { d.lgDay = day; d.lgGot = 0; }
  const room = Math.max(0, LABOR.cap - d.lgGot), eff = Math.min(delta, room) + Math.max(0, delta - room) * LABOR.over; d.lgGot += eff; return eff;
}
export const laborToday = (d, day) => (d?.lg && d.lgDay === day ? d.lgGot || 0 : 0);
