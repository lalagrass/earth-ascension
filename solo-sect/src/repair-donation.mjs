// 24g：具名村民依自己聽過的守護／善行傳聞，一次捐給正在修的設施。
import { RECRUIT_POOL } from './data.mjs';
import { publicRumors, RUMOR_KINDS } from './rumors.mjs';
import { book, log, resAdd } from './util.mjs';

export function donateRepairs(s) {
  if (s.hermitage?.active) return null;
  const used = s.repairDonations?.usedRumors || [];
  const site = Object.entries(s.fac || {}).find(([, row]) => row.site && !row.site.paused);
  if (!site) return null;
  const [facility, state] = site;
  for (const rumor of publicRumors(s)) {
    if (used.includes(rumor.id) || !RUMOR_KINDS[rumor.kind]?.tags.some(tag => ['safety', 'kindness'].includes(tag))) continue;
    const donor = RECRUIT_POOL.find(p => p.adult !== false && !s.ds.some(d => d.id === p.id)
      && (rumor.heard || []).some(heard => heard.site === p.situation?.where)
      && RUMOR_KINDS[rumor.kind].tags.includes(p.situation?.seek)
      && Object.entries(p.support || {}).some(([kind, amount]) => amount > 0 && (kind === 'coin' || (kind in state.site.need && state.site.delivered[kind] + state.site.reserved[kind] < state.site.need[kind]))));
    if (!donor) continue;
    const gift = Object.entries(donor.support).find(([kind, amount]) => amount > 0 && kind !== 'coin' && kind in state.site.need && state.site.delivered[kind] + state.site.reserved[kind] < state.site.need[kind])
      || Object.entries(donor.support).find(([kind, amount]) => kind === 'coin' && amount > 0);
    if (!gift) continue;
    const [kind, offered] = gift;
    const amount = kind === 'coin' ? offered : Math.min(offered, state.site.need[kind] - state.site.delivered[kind] - state.site.reserved[kind]);
    if (kind === 'coin') resAdd(s, kind, amount, 'donation');
    else { state.site.delivered[kind] += amount; book(s, 'in', kind, amount, 'donation'); }
    (s.repairDonations ??= { usedRumors: [], gifts: [] }).usedRumors.push(rumor.id);
    const record = { rumor: rumor.id, donor: donor.id, facility, kind, amount };
    s.repairDonations.gifts.push(record);
    log(s, `【修繕捐助】${donor.name}聽${rumor.witness}傳來第 ${rumor.id} 則見聞，帶 ${amount} ${kind === 'coin' ? '香火錢' : kind === 'wood' ? '木' : '石'}指定修${facility}。`);
    return record;
  }
  return null;
}
