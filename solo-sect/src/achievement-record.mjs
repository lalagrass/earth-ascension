// 成就一 #488：只在記憶中觀察現有事蹟、日誌與傳聞；不寫 s、不抽 RNG。
// 每種事件留總數、首次日／當事人與同日最大次數。舊三種 UI 清單有長度上限，
// 因此旁帳須在事件發生時看見，不能等第 90 日才倒讀被裁掉的舊清單。
const records = new WeakMap();
const empty = () => ({ events: Object.create(null), initialPeople: null, observedArtPeople: Object.create(null) });
const of = s => { let r = records.get(s); if (!r) { r = empty(); records.set(s, r); } return r; };
export const restoreAchievementRecord = (s, snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    if (s.t > 0) { // 舊 UI 存檔沒有旁帳；不把第 30 日現況冒充「首次發生」。
      const r = empty(); r.incomplete = true; r.initialPeople = s.ds?.length ?? 0; r.canFoundUnknown = true;
      for (const d of s.ds || []) if (Object.keys(d.arts || {}).length) r.observedArtPeople[d.id] = true;
      records.set(s, r);
    }
    return;
  }
  const r = empty();
  r.initialPeople = Number.isInteger(snapshot.initialPeople) ? snapshot.initialPeople : null;
  r.observedArtPeople = snapshot.observedArtPeople || Object.create(null);
  r.incomplete = !!snapshot.incomplete;
  r.canFoundUnknown = !!snapshot.canFoundUnknown;
  for (const [id, event] of Object.entries(snapshot.events || {}))
    if (/^(deed|rumor|log|state|enemy|defeat)\.[\w]+$/.test(id) && Number.isInteger(event.count) && Number.isInteger(event.firstDay)) r.events[id] = event;
  records.set(s, r);
};
function tally(s, id, day, who = null, value = 1, actorId = null) {
  const r = of(s), e = (r.events[id] ??= { count: 0, firstDay: day, who, max: 0, maxValue: 0, days: Object.create(null), people: Object.create(null) });
  e.count++;
  e.days[day] = (e.days[day] || 0) + 1;
  e.max = Math.max(e.max, e.days[day]);
  e.maxValue = Math.max(e.maxValue, value);
  if (who) { const p = (e.people[actorId || who] ??= { count: 0, firstDay: day, who }); p.count++; }
  return e;
}
export function noteDeed(s, d, kind, e) { tally(s, `deed.${kind}`, e.day, d?.name ?? null, Number.isFinite(e.value) ? e.value : 1, d?.id); }
export function noteRumor(s, entry) { tally(s, `rumor.${entry.kind}`, entry.seen, entry.witness, entry.trade?.coin || 1); tally(s, 'rumor.any', entry.seen, entry.witness); }
export function noteEnemy(s, kind, how, d) { if (how === 'kill') { tally(s, `enemy.${kind}`, s.day ?? 1, d?.name ?? null, 1, d?.id); if (kind === 'boar' || kind === 'boars') tally(s, 'defeat.boar', s.day ?? 1, d?.name ?? null, 1, d?.id); if (kind === 'bandit' || kind === 'chief') tally(s, 'defeat.bandit', s.day ?? 1, d?.name ?? null, 1, d?.id); } }

// 只解析遊戲本來寫出的可辨事件，不憑臨時戰力／名聲反推已發生的事。
const LOG_EVENTS = Object.freeze([
  ['learnedMove', /把已學套路的.*練成了|在吃虧後悟出「/],
  ['learnedArt', /學會《/],
  ['cliff', /踏上(?:斷木試劍崖|飛瀑寒潭崖|終南絕頂)/],
  ['readVolume', /【拳譜】.*讀完/],
  ['founded', /【開山立宗】.*立匾/],
  ['heardRecruit', /慕名從村路上山.*拜入外門/],
  ['builtFacility', /^完工：/],
  ['graduated', /升入內門/],
  ['married', /成親/],
  ['pregnant', /有喜/],
  ['born', /出生|誕下/],
  ['heroVisitor', /名俠.*(?:上山|入門)/],
  ['banditDefense', /把山賊打退了|打退了山賊|迎戰山賊——打退了/],
]);
export function noteLog(s, entry) {
  const day = s.day ?? 1, match = s.ds?.find(d => d.id === entry.who);
  const actor = match && s.ds.filter(d => d.name === match.name).length === 1 ? match : null;
  const who = actor?.name ?? null;
  tally(s, `log.${entry.tier}`, day, who, 1, actor?.id);
  for (const [id, pattern] of LOG_EVENTS) if (pattern.test(entry.msg)) {
    tally(s, `log.${id}`, day, who, 1, actor?.id);
    if (id === 'banditDefense') tally(s, 'defeat.bandit', day, who, 1, actor?.id);
  }
}
export function observeAchievementFacts(s, facts = {}) {
  const r = of(s), day = s.day ?? 1;
  if (r.initialPeople == null && s.ds?.length) r.initialPeople = s.ds.length;
  for (const d of s.ds || []) if (Object.keys(d.arts || {}).length && !r.observedArtPeople[d.id]) {
    r.observedArtPeople[d.id] = true; tally(s, 'state.firstArt', day, d.name, 1, d.id);
  }
  if (s.ds?.length > r.initialPeople && !r.events['state.grew']) tally(s, 'state.grew', day);
  if (facts.canFound && !r.canFoundUnknown && !r.events['state.canFound']) { const hero = s.ds?.find(d => d.id === 'hero'); tally(s, 'state.canFound', day, hero?.name, 1, hero?.id); }
  return r;
}
export const achievementRecord = s => observeAchievementFacts(s);
