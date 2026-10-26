import { escape, valueText } from '../character-card/render.mjs';
const facts = {job:'工作',trips:'累計趟',level:'腳力Lv',grew:'腳力升級',skill:'掌法階段',units:'完成單位',steps:'已進行tick',downs:'擊退數',vat:'水缸實存',rest:'停工來源',src:'來源',U:'U',F:'F',I:'I',item:'物資',n:'數量',stage:'設施階段',returnTo:'回復安排',kind:'活動',art:'武學'};
const labels = {water:'挑水',herb:'採藥',wood:'砍柴',novice:'初學',adept:'熟練',manual:'玩家',auto:'自主',train:'練掌','activity-complete':'活動完成',growth:'武學成長',harvest:'採集完成', 'building-complete':'建物完成', returned:'已返院', 'temporary-return':'回復原安排','temporary-blocked':'原安排受阻'};
const title=e=>e.result.availability==='known'&&typeof e.result.value==='object' ? e.result.value.text||labels[e.kind]||e.kind : labels[e.kind]||e.kind||valueText(e.result);
const resultText=e=>e.result.availability!=='known'||typeof e.result.value!=='object'?valueText(e.result):Object.entries(e.result.value).filter(([k])=>facts[k]).map(([k,v])=>`${facts[k]}：${labels[v]||String(v)}`).join(' · ')||e.result.value.text||e.kind;
export function recentHtml(events, { category = 'all', names = {}, expanded = true, size = events.length } = {}) {
  // Defense for direct renderer consumers as well as the bounded store.
  const hiddenCount = events.filter(e => e.visibility === 'hidden').length;
  events = events.filter(e => e.visibility !== 'hidden');
  size = Math.max(0, size - hiddenCount);
  const namesByKind={all:'全部',work:'工作',martial:'武學',life:'生活'};
  return `<section class="public-events"><button class="btn toggle-adv" data-ui="toggleEvents" aria-expanded="${expanded}">${expanded?'▾':'▸'} 近期紀錄（此人 ${events.length}／快取 ${size}）</button>${expanded?`
    <div class="event-filters" role="group" aria-label="近期紀錄篩選">${Object.entries(namesByKind).map(([id,label])=>`<button class="btn mini ${category===id?'on':''}" data-event-filter="${id}" aria-pressed="${category===id}">${label}</button>`).join(' ')}</div>
    <ol>${events.map(e=>`<li data-event-id="${escape(e.id)}"><b>${escape(title(e))}</b> · <time>${escape(e.tick)} ${escape(e.unit)}</time>
      <p>${escape(resultText(e))}</p><small>可證原因：${escape(valueText(e.reason))}</small>
      <div>${e.actors.map(id=>`<button class="btn mini" data-event-actor="${escape(id)}">${escape(names[id]?.name||id)} 人物卡</button>`).join(' ')} ${e.facility?`<button class="btn mini" data-event-facility="${escape(e.facility)}">相關設施</button>`:''}</div>
      <details><summary>來源與原時間</summary><small>${escape(e.source)}<br>${escape(e.stream)} · ${escape(e.id)}<br>可見性 ${escape(e.visibility)} · 行動 ${escape(e.action||'unknown')}<br>來源未給原因即未知；時間相鄰不代表因果。</small></details></li>`).join('')||'<li class="muted">本局此篩選尚無已觀察紀錄</li>'}</ol>
    <small>只讀本局既有事件，最多顯示24筆、呈現快取120筆；舊核心紀錄不刪除，歷史不隨存檔新增保存。沒有事件不代表沒有活動。</small>`:''}</section>`;
}
