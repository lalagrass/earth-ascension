import { AXES, ATTRS, ATTR_TOTAL, ATTR_MIN, ATTR_MAX, QUESTIONS, TEMPLATES, TRAIT_RULES, BASE_SPEED } from './data.mjs';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// answers[i] 是第 i 題選的選項索引（0/1）；未答的題不影響。
export function axesFromAnswers(answers) {
  const axes = { E: 0, N: 0, F: 0, P: 0 };
  QUESTIONS.forEach((q, i) => {
    const choice = answers[i];
    if (choice !== 0 && choice !== 1) return;
    for (const [k, v] of Object.entries(q.a[choice][1])) axes[k] += v;
  });
  for (const k of Object.keys(axes)) axes[k] = clamp(axes[k], -1, 1);
  return axes;
}

export function typeOf(axes) {
  return AXES.map((a) => (axes[a.id] > 0 ? a.pos : a.neg)).join('');
}

export function validateAttrs(attrs) {
  let sum = 0;
  for (const a of ATTRS) {
    const v = attrs[a.id];
    if (!Number.isInteger(v) || v < ATTR_MIN || v > ATTR_MAX) {
      return { ok: false, reason: `${a.label}必須是 ${ATTR_MIN}–${ATTR_MAX} 的整數` };
    }
    sum += v;
  }
  if (sum !== ATTR_TOTAL) return { ok: false, reason: `天賦總和必須是 ${ATTR_TOTAL}（現在 ${sum}）` };
  return { ok: true };
}

export function traitsOf(axes, attrs) {
  return TRAIT_RULES.filter((r) => r.when(axes, attrs)).map((r) => r.id);
}

export function speedOf(p) {
  return BASE_SPEED * (0.8 + 0.04 * p.attrs.shen);
}

// 建立人物；不合法天賦直接丟錯，讓呼叫端在 UI 先驗證。
export function makePerson({ id, name, axes, attrs, template = null, protagonist = false }) {
  const v = validateAttrs(attrs);
  if (!v.ok) throw new Error(v.reason);
  const ax = {};
  for (const a of AXES) ax[a.id] = clamp(Number(axes[a.id]) || 0, -1, 1);
  return {
    id, name, protagonist, template,
    axes: ax, type: typeOf(ax),
    attrs: { ...attrs },
    traits: traitsOf(ax, attrs),
    x: 0, y: 0,                 // 格子座標（浮點，代表格中心）
    path: [], goal: null, wait: 0,
    act: 'idle', actLabel: '發呆', why: [],
    visits: {},                 // poi id → 次數（熟悉度）
    routine: 0,                 // 條理型的輪替指標
  };
}

export function fromTemplate(id, overrides = {}) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`沒有模板 ${id}`);
  return makePerson({ name: t.name, axes: t.axes, attrs: t.attrs, template: t.id, ...overrides });
}
