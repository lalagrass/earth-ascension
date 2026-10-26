import { escape, valueText } from '../character-card/render.mjs';
const NAMES = { entry: '入門／理解', capacity: '承載', control: '控制', special: '特殊前提' };
const val = f => `<span title="${escape(f?.source)}">${escape(valueText(f))}</span>`;
export function martialHtml(c) {
  return `<section class="public-martial"><h4>所學與可施展</h4>${c.martial.map(m => `<article data-martial-id="${escape(m.id)}"><b>${escape(m.name)}</b>
    <p>所學：${val(m.learned)}</p><p>熟練：${val(m.proficiency)}</p><p>此刻可施展：${val(m.execution)}</p>
    <details data-view-key="martial:${escape(m.id)}"><summary>入門／承載／控制／特殊前提與來源</summary>${m.conditions.map(r => `<p><b>${NAMES[r.id]}</b> · ${escape(r.appliesTo)}<br>${val(r.result)}<br><small>${escape(r.policy)}</small></p>`).join('')}
    <p>風險評估：${val(m.risk)}；未知不表示安全。</p><small>來源：${escape(m.source)}</small></details></article>`).join('') || '<p>此版尚無可證的所學記錄。</p>'}</section>`;
}
