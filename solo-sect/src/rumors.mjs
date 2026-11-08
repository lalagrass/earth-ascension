// R8（#526／#507）：外人親見的事才成傳聞；人走到聚落才傳開。
import { SOCIAL_EVENTS } from './social-thoughts.mjs';

// 淡忘沿 N46「一起被圍／惱羞拉住」的 30 日記憶；山路走一日沿既有日節拍。
const MEMORY_DAYS = SOCIAL_EVENTS.surrounded.days;
export const RUMOR_SITES = Object.freeze({ gate: '山門', village: '村路', market: '市集', teahouse: '茶攤' });
// 山門接村路、村路接市集、市集接茶攤；沿現有日節拍每次只走一段。
const ROUTES = { gate: ['village'], village: ['gate', 'market'], market: ['village', 'teahouse'], teahouse: ['market'] };
export const RUMOR_KINDS = Object.freeze({
  rescue: { text: '山上有人救了受傷的樵夫', tags: ['safety', 'kindness'], target: 'village' },
  defend: { text: '山上有人打退了搶糧山賊', tags: ['safety', 'martial'], target: 'village' },
  trade: { text: '山門拿療傷丹到市集交易', tags: ['healing', 'wealth'], target: 'market' },
  banner: { text: '山上立起了門派牌匾', tags: ['teaching'], target: 'village' },
  school: { text: '門派弟子在村中教人，說明師門可收徒', tags: ['teaching'], target: 'village' },
  provisions: { text: '山門拿出菜蔬藥材與行商交易', tags: ['food', 'wealth'], target: 'teahouse' },
  tournament: { text: '門派在會武中勝出', tags: ['martial'], target: 'market' },
});
export const rumorsOf = s => (s.rumors ??= []);
export const sectNamed = s => !s.hermitage?.active;
export function recordRumor(s, kind, witness, site = 'gate', detail = '') {
  const type = RUMOR_KINDS[kind];
  if (!type || !witness || !RUMOR_SITES[site]) return null;
  const id = (s.rumorSerial = (s.rumorSerial || 0) + 1);
  const named = sectNamed(s);
  const entry = { id, kind, witness, seen: s.day, seenAt: site, site, where: RUMOR_SITES[site], target: type.target,
    heard: site === type.target ? [{ site, day: s.day }] : [], arrived: site === type.target ? s.day : null, expires: s.day + MEMORY_DAYS,
    name: named ? s.sect?.plaque || s.sect?.name || '山門' : null,
    text: `${named ? s.sect?.plaque || s.sect?.name || '山門' : '山上有個怪人'}：${detail || type.text}` };
  rumorsOf(s).push(entry);
  return entry;
}
export function spreadRumors(s) {
  const kept = [];
  for (const entry of rumorsOf(s)) {
    if (entry.expires <= s.day) continue;
    if (entry.arrived == null && s.day > entry.seen) {
      entry.site = entry.target; entry.where = RUMOR_SITES[entry.site]; entry.arrived = s.day;
      entry.heard = [{ site: entry.site, day: s.day }];
    } else if (entry.arrived != null) {
      const heard = entry.heard || [{ site: entry.site, day: entry.arrived }];
      const reached = new Set(heard.map(x => x.site));
      const next = new Set(heard.filter(x => x.day < s.day).flatMap(x => ROUTES[x.site] || []));
      for (const site of next) if (site !== 'gate' && !reached.has(site)) heard.push({ site, day: s.day });
      entry.heard = heard;
    }
    kept.push(entry);
  }
  s.rumors = kept;
  if (s.threat?.usedRumors) {
    const live = new Set(kept.map(r => r.id));
    s.threat.usedRumors = s.threat.usedRumors.filter(id => live.has(id));
  }
}
export const publicRumors = s => rumorsOf(s).filter(r => r.arrived != null && r.expires > s.day && r.name && sectNamed(s));
export const rumorReach = s => [...new Set(publicRumors(s).flatMap(r => (r.heard || [{ site: r.site }]).map(x => x.site)))];
// 只數可指認的傳話人；轉述聽眾沒有可查姓名，不假裝知道聚落總人數。
export const fameOf = s => new Set(publicRumors(s).map(r => r.witness)).size;
export function rumorForCandidate(s, candidate) {
  const seek = candidate.situation?.seek || 'teaching';
  const where = candidate.situation?.where || 'village';
  const rumor = publicRumors(s).find(r => (r.heard || [{ site: r.site }]).some(x => x.site === where) && RUMOR_KINDS[r.kind]?.tags.includes(seek));
  return rumor ? { ...rumor, where: RUMOR_SITES[where] } : null;
}
export function rumorForVisitor(s, tags = [], unused = false) {
  const used = unused ? new Set(s.threat?.usedRumors || []) : null;
  return publicRumors(s).find(r => (!used || !used.has(r.id)) && tags.some(tag => RUMOR_KINDS[r.kind]?.tags.includes(tag))) || null;
}
export function rumorForBandits(s) {
  const used = new Set(s.threat?.usedRumors || []);
  // 知道對方能打不足以構成掠奪理由；須有糧或財物線索。
  return publicRumors(s).filter(r => !used.has(r.id) && RUMOR_KINDS[r.kind]?.tags.some(tag => ['food', 'wealth'].includes(tag))).at(-1) || null;
}
export function rumorHtml(s) {
  const safe = x => String(x).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c]);
  const rows = rumorsOf(s).filter(r => r.expires > s.day);
  return `<h2>江湖傳聞</h2><div class="k">傳到：${rumorReach(s).map(site => RUMOR_SITES[site]).join('、') || '尚未傳到聚落'}；有名目擊者 ${fameOf(s)}</div>`
    + `<div class="rumor-map">${Object.entries(RUMOR_SITES).map(([site, label]) => `<span class="${rumorReach(s).includes(site) ? 'on' : ''}">${label}</span>`).join(' → ')}</div>`
    + (rows.map(r => `<div class="k">📜 第${r.seen}日・${safe(r.witness)}在${safe(RUMOR_SITES[r.seenAt] || r.where)}所見：${safe(r.text)}；${r.arrived == null ? `正往${safe(RUMOR_SITES[r.target])}傳` : `已到${safe((r.heard || [{ site: r.site }]).map(x => RUMOR_SITES[x.site]).join('、'))}`}；第${r.expires}日淡去</div>`).join('') || '<div class="k">尚無外人親見的傳聞。</div>');
}
