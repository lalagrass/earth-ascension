// Source: lalagrass/earth-ascension@ef823ac277f48d9426cc3806f74468126a9cf91d sect-chronicle/character-card/render.mjs — only 'labels', 'escape' and 'valueText' are taken (portrait/DOM listeners are not); local change: a 'notApplicable' label.
const labels = { known:'已知', unknown:'未知', hidden:'隱藏', unsupported:'不支援', notApplicable:'不適用' };
export const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const valueText = f => f?.availability === 'known' ? `${typeof f.value === 'number' ? (Number.isInteger(f.value) ? f.value : Math.round(f.value*100)/100) : typeof f.value === 'object' ? JSON.stringify(f.value) : f.value}${f.unit ? ` ${f.unit}` : ''}` : labels[f?.availability] || '未知';
