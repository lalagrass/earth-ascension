// v0.95 統一倍率管線：天賦／狀態／外部三組；組內相加（各項 v-1 加總），組間相乘，每組夾在 0.3–2.0
export const MUL_GROUPS = ['talent', 'state', 'ext'];
export const MUL_CLAMP = [0.3, 2.0];
export const MUL_NAMES = { talent: '天賦', state: '狀態', ext: '外部' };
// parts: { talent: [[名稱, 倍率], ...], state: [...], ext: [...] }
export function pipeline(parts) {
  const out = { total: 1, parts };
  for (const g of MUL_GROUPS) { const sum = 1 + (parts[g] || []).reduce((a, [, v]) => a + (v - 1), 0); out[g] = Math.min(MUL_CLAMP[1], Math.max(MUL_CLAMP[0], sum)); out.total *= out[g]; }
  return out;
}
export const mulText = (p) => MUL_GROUPS.map((g) => `${MUL_NAMES[g]}×${p[g].toFixed(2)}${(p.parts[g] || []).length ? `（${p.parts[g].map(([n, v]) => `${n}${v >= 1 ? '+' : ''}${(v - 1).toFixed(2)}`).join(' ')}）` : ''}`).join(' · ');
