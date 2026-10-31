/* loop129 門派勇名 `valor`（docs/DAXIA-EVAL.md §3）。借鏡大俠立志傳勇德（打贏上升、逃跑下降，兩端各有特性），只做門派一條軸。
   s.valor 只在開關開啟時存在；沒有時全部回中性值。 */
export const VALOR = { min: -100, max: 100, fight: 2, win: 2, pay: -3, accept: 2, refuse: -2, hi: 50, lo: -50, powMul: 1.05, threatMul: 1.1, mid: 25, midMul: 1.02 };
/* loop138 中段名號（決定 118）：s.valormid 開時，25≤勇名<50「小有勇名」戰力 ×1.02 */
const midOn = (s) => !!s?.valormid && hasValor(s) && s.valor >= VALOR.mid && s.valor < VALOR.hi;
export const hasValor = (s) => typeof s?.valor === 'number';
export function valorAdd(s, v) { if (!hasValor(s)) return; s.valor = Math.max(VALOR.min, Math.min(VALOR.max, s.valor + v)); }
export const valorPowMul = (s) => (hasValor(s) && s.valor >= VALOR.hi ? VALOR.powMul : midOn(s) ? VALOR.midMul : 1);
export const valorThreatMul = (s) => (hasValor(s) && s.valor <= VALOR.lo ? VALOR.threatMul : 1);
export const valorLabel = (s) => (!hasValor(s) ? '' : s.valor >= VALOR.hi ? '勇名在外（戰力 ×1.05）' : s.valor <= VALOR.lo ? '軟柿子（山賊威脅 ×1.1）' : midOn(s) ? '小有勇名（戰力 ×1.02）' : '尚無名號');
export const valorHtml = (s) => (hasValor(s) ? `・勇名 ${s.valor}（${valorLabel(s)}）` : '');
