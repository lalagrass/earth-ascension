// 人際：雙向好感、相合度、關係階段、名望、請教話題。
import { SOCIAL, SKILLS, MARTIAL } from './data.mjs';

export const kinOf = (state, p) => (p.kin ? state.people.find((x) => x.id === p.kin) ?? null : null);
// 道侶或金蘭：兩人都偏心軟（F > 0）是道侶。
export const bondLabel = (a, b) => (a.axes.F > 0 && b.axes.F > 0 ? '道侶' : '金蘭');

// M17 成家：升到知己、兩人都是同門、都還沒有家人。
function maybeFamily(state, a, b) {
  if (a.guest || b.guest || a.kin || b.kin) return;
  a.kin = b.id; b.kin = a.id;
  const label = bondLabel(a, b);
  const verb = label === '道侶' ? '結為道侶' : '結義為金蘭';
  state.events.push({ tick: state.tick, kind: 'family', text: `${a.name}與${b.name}${verb}`, who: [a.id, b.id] });
  a.bubble = b.bubble = { text: verb, until: state.tick + 90 };
  state.counts.families = (state.counts.families || 0) + 1;
}
import { prowess } from './martial.mjs';

const clamp = (v) => Math.max(-100, Math.min(100, v));
const key = (a, b) => `${a.id}>${b.id}`;

export function aff(state, a, b) {
  return state.aff[key(a, b)] ?? 0;
}

export function addAff(state, a, b, amt) {
  state.aff[key(a, b)] = clamp(aff(state, a, b) + amt);
}

export function compat(a, b) {
  return 0.7 + 0.3 * (1 - Math.abs(a.axes.N - b.axes.N) / 2) + 0.3 * (1 - Math.abs(a.axes.F - b.axes.F) / 2);
}

export function stageOf(state, a, b) {
  const v = (aff(state, a, b) + aff(state, b, a)) / 2;
  let s = SOCIAL.STAGES[0];
  for (const st of SOCIAL.STAGES) if (v >= st.min) s = st;
  return s;
}

// M6：武力也算名望，強的人會吸引人來找。
export function prestige(p) {
  return SKILLS.reduce((a, s) => a + p.skills[s.id], 0) / SKILLS.length + prowess(p) * MARTIAL.PRESTIGE_PER_POWER;
}

export function atLeast(state, a, b, stageId) {
  const st = SOCIAL.STAGES;
  return st.indexOf(stageOf(state, a, b)) >= st.findIndex((x) => x.id === stageId);
}

// 對方比我高最多、且差距 ≥ TEACH_GAP 的技能；沒有就是閒聊。
export function teachTopic(learner, teacher) {
  let best = null, gap = SOCIAL.TEACH_GAP - 1e-9;
  for (const s of SKILLS) {
    const d = teacher.skills[s.id] - learner.skills[s.id];
    if (d > gap) { gap = d; best = s.id; }
  }
  return best;
}

// 呼叫端在事件發生前後各叫一次 stageOf，就能知道有沒有升級；這裡統一處理紀事與氣泡。
export function withStage(state, a, b, fn) {
  const before = stageOf(state, a, b);
  fn();
  const after = stageOf(state, a, b);
  if (after !== before && SOCIAL.STAGES.indexOf(after) > SOCIAL.STAGES.indexOf(before)) {
    state.events.push({ tick: state.tick, kind: 'rel', text: `${a.name}與${b.name}成了${after.label}`, who: [a.id, b.id] });
    a.bubble = b.bubble = { text: after.label, until: state.tick + 60 };
    if (after.id === 'close') maybeFamily(state, a, b);
  }
}
