import { affKey, relKey } from './util.mjs';

// N46: Every row names the person whose opinion changes, its lifetime in days,
// and the sentence shown on that person's card. null means an enduring memory.
// The 2-point spar scale comes from the existing spar relationship award;
// rescue/teaching are larger than a routine chat (4) because they change a life.
export const SOCIAL_EVENTS = {
  covered: { opinion: 8, days: null, where: '交手處', text: '{actor}替{target}攔住了來招' },
  surrounded: { opinion: 5, days: 30, where: '山門', text: '{actor}和{target}被圍時一起撐了過來' },
  sparLoss: { opinion: 2, days: 12, where: '外功場', text: '{target}切磋輸給了{actor}，記住了這一招' },
  rageHeld: { opinion: 6, days: 30, where: '山門', text: '{actor}在{target}惱羞時拉住了他' },
  taught: { opinion: 6, days: null, where: '練功處', text: '{actor}教會{target}「{detail}」' },
};

function setOpinion(s, from, to, delta) {
  const key = affKey(from, to), before = s.aff[key] ?? 0;
  const a = s.ds.find((d) => d.id === from), b = s.ds.find((d) => d.id === to);
  const cap = a?.adult && b?.adult ? 100 : 89;
  s.aff[key] = Math.max(0, Math.min(cap, before + delta));
  const pair = relKey(from, to);
  s.rel[pair] = ((s.aff[affKey(from, to)] ?? 0) + (s.aff[affKey(to, from)] ?? 0)) / 2;
  return s.aff[key] - before;
}

export function recordSocialEvent(s, kind, actor, target, detail = '') {
  const row = SOCIAL_EVENTS[kind];
  if (!row || !actor?.id || !target?.id || actor.id === target.id || !s.aff || !s.rel || !s.ds?.includes(actor) || !s.ds.includes(target)) return null;
  const entry = {
    kind, actor: actor.id, target: target.id, day: s.day,
    expires: row.days == null ? null : s.day + row.days,
    where: row.where, text: row.text.replaceAll('{actor}', actor.name).replaceAll('{target}', target.name).replaceAll('{detail}', detail),
    effect: setOpinion(s, target.id, actor.id, row.opinion),
  };
  (s.socialThoughts ??= []).push(entry);
  return entry;
}

export function fadeSocialThoughts(s) {
  const kept = [];
  for (const entry of s.socialThoughts || []) {
    if (entry.expires != null && entry.expires <= s.day) {
      if (s.ds.some((d) => d.id === entry.actor) && s.ds.some((d) => d.id === entry.target)) setOpinion(s, entry.target, entry.actor, -entry.effect);
    } else kept.push(entry);
  }
  s.socialThoughts = kept;
}

export const thoughtsFor = (s, person) => (s.socialThoughts || []).filter((entry) => entry.target === (person.id ?? person));
const htmlText = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
export const socialThoughtHtml = (s, person) => thoughtsFor(s, person).slice(-4).map((m) =>
  `<div class="k mem">📜 第${m.day}日・${htmlText(m.where)}：${htmlText(m.text)}（對${htmlText(s.ds.find((d) => d.id === m.actor)?.name || '同門')}好感 +${m.effect}${m.expires == null ? '・銘記' : `・至第${m.expires}日`}）</div>`).join('');
