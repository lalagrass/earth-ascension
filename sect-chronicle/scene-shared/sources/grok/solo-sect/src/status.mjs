// v1.45 弟子面板「現在／原因／下一步」（ADOPTION-PLAN A5）：標出是哪一層決定的（指令／巡山／生理／作息／性格）
import { ACTIVITIES, EXP_STYLES, EXP } from './data.mjs';
import { segAt } from './expedition.mjs';
import { nextStep } from './core.mjs';
const actName = (a) => (a === 'hunt' ? '狩獵' : a === 'trial' ? '試煉' : a === 'deliver' ? '送東西回院倉' : ACTIVITIES[a]?.name || a);
export const LAYER = { order: '指令', need: '生理', sched: '作息', duty: '職司', trait: '性格', carry: '工序' };
export function statusOf(s, d) {
  if (d.away && s.exp?.team.includes(d.id)) { const X = s.exp;
    return { layer: '巡山', now: `巡山${X.phase === 'out' ? '前進' : '回程'}：${segAt(X.dist).name} ${Math.round(X.phase === 'out' ? X.dist : X.backPos ?? X.dist)} 步`, why: X.recalled && X.phase === 'out' ? '掌門傳令召回，下一拍回頭' : X.phase === 'out' ? `掌門派出（${EXP_STYLES[X.style]?.name || ''}）` : `回頭：${X.reason}`, next: X.phase === 'out' ? `到 ${X.target >= 1e9 ? '走不動為止' : X.target + ' 步'} 或觸發撤退線就回頭` : `回山門後歇 ${EXP.cool} 秒左右${X.ret?.left?.length ? `；還要經過 ${X.ret.left.length} 段未清段` : ''}` }; }
  // v1.5：層級讀 d.decision（決策當下寫入的結構），不再用 reason 文字猜；下一步＝目前任務工序裡排著的下一步
  const now = d.task ? actName(d.task.act) : '待命';
  const why = d.reason || '—';
  const dec = d.task ? d.decision : null;
  const layer = d.order ? '指令' : !d.task ? '待命' : LAYER[dec?.layer] || '性格';
  const step = d.task ? nextStep(d.task) : null;
  const next = step ? `${step}（${actName(d.task.act)}的下一道工序）` : d.order ? `繼續「${actName(d.order)}」（指派中）` : d.task ? `做完「${actName(d.task.act)}」再重新評估` : '馬上重新評估要做什麼';
  return { layer, now, why, next };
}
export const statusHtml = (s, d) => { const x = statusOf(s, d); return `<div class="status"><div><b>現在</b>：${x.now} <span class="tag">${x.layer}</span></div><div><b>原因</b>：${x.why}</div><div><b>下一步</b>：${x.next}</div></div>`; };
