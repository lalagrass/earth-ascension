import { escape, publicValueHtml } from '../public-ui/values.mjs';
const labels={amount:'實存',capacity:'容量',incoming:'在途',reserved:'耗用預約',available:'可用（原查詢）'};
const val = publicValueHtml;
export function resourcesHtml(views,{interactive=false}={}) {
  views=views.filter(v=>v.availability!=='hidden');
  return `<h3>資源總覽</h3><p class="muted">在途未入實存；耗用預約另列。可用保留原核心查詢的作用範圍。</p>${views.map(v=>`<details class="resource-row" data-resource="${escape(v.nativeId)}" data-view-key="resource:${escape(v.nativeId)}"><summary><b>${escape(v.label)}</b> · 實存 ${val(v.fields.amount)}／容量 ${val(v.fields.capacity)}</summary>
    <dl>${Object.entries(labels).map(([key,label])=>`<div><dt>${label}</dt><dd data-resource-field="${key}">${val(v.fields[key])}</dd></div>`).join('')}</dl>
    <p>已有用途：${v.uses.availability==='known'?v.uses.value.map(escape).join('；'):val(v.uses)}</p>
    <div class="resource-links">${v.links.map((l,i)=>`<button id="resource-${escape(v.namespace)}-${escape(v.nativeId)}-${i}" class="btn mini" data-resource-link="${escape(l.id)}" data-resource-kind="${escape(l.kind)}" ${!interactive||l.kind==='native'?'disabled':''}>${escape(l.label)}</button>`).join(' ')}</div>
    ${v.commands.length?`<p class="muted">原人物可用指令：${v.commands.map(a=>`<span title="${escape(a.source)}">${escape(a.label)}${a.enabled?'':`（${escape(a.reason||'原核心拒絕')}）`}</span>`).join(' · ')}；請從原人物／設施操作。</p>`:''}
    <details data-view-key="resource:${escape(v.nativeId)}:sources"><summary>每欄來源／原單位與限制</summary><small>${escape(v.namespace)} · ${escape(v.sha)}<br>原生ID ${escape(v.nativeId)} · 單位 ${escape(v.unit)}<br>${escape(v.source)}</small><ul>${Object.entries(labels).map(([key,label])=>`<li>${label}：${escape(v.fields[key].availability)} · ${escape(v.fields[key].source)}</li>`).join('')}</ul><ul>${v.notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul></details></details>`).join('')}`;
}
