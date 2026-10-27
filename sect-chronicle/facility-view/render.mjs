import { escape, valueText, publicValueHtml } from '../public-ui/values.mjs';
const val = publicValueHtml;
export function tooltipText(view) {
  return `${view.label} · ${view.activities.map(a => a.label).join('／') || '活動不支援'}${view.stock ? ` · 實存 ${valueText(view.stock.amount)}／容量 ${valueText(view.stock.capacity)} · 在途 ${valueText(view.stock.incoming)}` : ''}`;
}
export function facilityHtml(view, { actorId, actors }) {
  const users = view.users.availability === 'known' ? view.users.value : [];
  return `<section class="facility-detail" data-facility-id="${escape(view.id)}"><h3>${escape(view.label)}</h3>
    <p class="muted">${escape(view.interactionPoint.id)}</p>
    ${view.stock ? `<p>實存 ${val(view.stock.amount)}／容量 ${val(view.stock.capacity)}<br>在途 ${val(view.stock.incoming)}（原交付額度，非耗用預約／座位）</p>` : ''}
    <p${view.users.availability==='hidden'?'':` title="${escape(view.users.source)}"`}>正在此處：${view.users.availability !== 'known' ? val(view.users) : users.length ? users.map(p => `<button class="btn mini" data-facility-card="${escape(p.actorId)}">${escape(actors[p.actorId]?.name || p.actorId)} · ${escape(p.status)}</button>`).join(' ') : '目前無人在原地工作階段'}</p>
    <label>指派對象 <select data-facility-actor aria-label="設施指派對象">${Object.entries(actors).map(([id, p]) => `<option value="${escape(id)}" ${id === actorId ? 'selected' : ''}>${escape(p.name)}</option>`).join('')}</select></label>
    <button class="btn mini" data-facility-card="${escape(actorId)}">人物卡</button>
    ${view.actorStatus?.availability === 'known' ? `<p title="${escape(view.actorStatus.source)}">目前：${escape(view.actorStatus.value.current || '未知')}<br>核心原因：${escape(view.actorStatus.value.reason || '未知')}<br>下一步：${escape(view.actorStatus.value.next || '未知')}</p>` : ''}
    <h4>可做的工作</h4>${view.activities.map(a => `<button class="opt" data-cmd="${escape(a.id)}" ${a.enabled ? '' : 'disabled'} title="${escape(a.source)}"><b>${escape(a.label)}</b><span>${escape(valueText(a.reason))}</span></button>`).join('') || '<p>活動指派不支援</p>'}
    <details class="facility-sources"><summary>原生入口與能力來源</summary><p>入口 ${val(view.interactionPoint.entrance)}</p><p>設施階段 ${val(view.stage)}</p><p>站位容量 ${val(view.capabilities.stationCapacity)} · 站位預約 ${val(view.capabilities.stationReservations)} · 排隊 ${val(view.capabilities.queue)}</p><small>缺項不當作零空位；指派結果由原核心決定。</small></details>
    <div class="foot"><span>↑↓ 選擇 · Enter 下令</span><button class="btn mini" data-facility-close>關閉</button></div></section>`;
}
