// v1.45 弟子面板「現在／原因／下一步」（ADOPTION-PLAN A5）：標出是哪一層決定的（指令／巡山／生理／作息／性格）
import { ACTIVITIES, EXP_STYLES, EXP } from './data.mjs';
import { segAt } from './expedition.mjs';
const actName = (a) => (a === 'hunt' ? '狩獵' : a === 'trial' ? '試煉' : a === 'deliver' ? '送東西回院倉' : ACTIVITIES[a]?.name || a);
const NEED_RX = /精力|累|餓|吃|傷|歇|養傷|自理/;
const SCHED_RX = /入夜|晨課|日課|作息|雜務/;
export function statusOf(s, d) {
  if (d.away && s.exp?.team.includes(d.id)) { const X = s.exp;
    return { layer: '巡山', now: `巡山${X.phase === 'out' ? '前進' : '回程'}：${segAt(X.dist).name} ${Math.round(X.phase === 'out' ? X.dist : X.backPos ?? X.dist)} 步`, why: X.phase === 'out' ? `掌門派出（${EXP_STYLES[X.style]?.name || ''}）` : `回頭：${X.reason}`, next: X.phase === 'out' ? `到 ${X.target >= 1e9 ? '走不動為止' : X.target + ' 步'} 或觸發撤退線就回頭` : `回山門後歇 ${EXP.cool} 秒左右${X.ret?.left?.length ? `；還要經過 ${X.ret.left.length} 段未清段` : ''}` }; }
  const now = d.task ? actName(d.task.act) : '待命';
  const why = d.reason || '—';
  let layer = '性格';
  if (d.order) layer = '指令'; else if (why === '玩家指派' || why === '指派中先自理') layer = '指令'; else if (NEED_RX.test(why)) layer = '生理'; else if (SCHED_RX.test(why)) layer = '作息';
  const alt = (d.why || []).find((w) => w.act !== d.task?.act);
  const n = d.needs || {}, low = n.energy < 30 ? '精力見底就去睡' : n.hunger < 30 ? '肚子餓了先去吃' : null;
  const next = d.order ? `繼續「${actName(d.order)}」（指派中）` : low || (alt ? `做完可能去「${actName(alt.act)}」（${alt.why}）` : '做完再看');
  return { layer, now, why, next };
}
export const statusHtml = (s, d) => { const x = statusOf(s, d); return `<div class="status"><div><b>現在</b>：${x.now} <span class="tag">${x.layer}</span></div><div><b>原因</b>：${x.why}</div><div><b>下一步</b>：${x.next}</div></div>`; };
