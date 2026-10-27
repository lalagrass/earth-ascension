// Source: lalagrass/earth-ascension@6f959f534e9a00994f1cea7c230b4110e60db8c6 sect-chronicle/public-ui/values.mjs (see ../../SOURCES.md)
// Local changes: a 'notApplicable' label; known booleans read 是／否 and known lists are joined (M35).
const labels = { known:'已知', unknown:'未知', hidden:'隱藏', unsupported:'不支援', notApplicable:'不適用' };
export const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const valueText = f => f?.availability === 'known' ? `${typeof f.value === 'number' ? (Number.isInteger(f.value) ? f.value : Math.round(f.value*100)/100) : typeof f.value === 'boolean' ? (f.value ? '是' : '否') : Array.isArray(f.value) ? (f.value.length ? f.value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('、') : '無') : typeof f.value === 'object' ? JSON.stringify(f.value) : f.value}${f.unit ? ` ${f.unit}` : ''}` : labels[f?.availability] || '未知';
// All panels use the same value/state markup. A hidden value has no tooltip.
export function publicValueHtml(f, { raw = false } = {}) {
 const availability = Object.hasOwn(labels, f?.availability) ? f.availability : 'unknown';
 const source = availability === 'hidden' ? '' : f?.source;
 const title = source ? `${source}${raw && availability === 'known' ? ` · 原值 ${JSON.stringify(f.value)}` : ''}` : '';
 return `<span data-availability="${availability}"${title ? ` title="${escape(title)}"` : ''}>${escape(valueText(f))}</span>`;
}
