// The construction explanation observes the existing choices; it never scores
// actions again, since scoreActs consumes simulation RNG.
import { ACTIVITIES, DAY, RES_NAMES } from './data.mjs';

export function stalledSiteHtml(s, site, seen) {
  if (!site || site.paused) return '';
  const progress = JSON.stringify([site.delivered, site.work]);
  const prior = seen.get(site);
  if (!prior || prior.progress !== progress || s.t < prior.at) {
    seen.set(site, { progress, at: s.t });
    return '';
  }
  if (s.t - prior.at < DAY) return '';
  const missing = Object.entries(site.need).filter(([k, n]) => n > (site.delivered[k] || 0) + (site.reserved[k] || 0))
    .map(([k, n]) => `${RES_NAMES[k] || k} ${n - (site.delivered[k] || 0) - (site.reserved[k] || 0)}`);
  const workers = s.ds.filter(d => d.adult !== false && !d.away && (d.hp ?? 1) > 0 && d.role !== 'baby');
  const rows = workers.map(d => {
    const top = d.why?.[0];
    const doing = ACTIVITIES[d.task?.act]?.name || d.task?.act || '待命';
    return `<div class="k">${d.name}：正在${doing}；首選理由：${top?.why || d.reason || '尚未決策'}</div>`;
  }).join('');
  return `<div class="k stalled-site">工地停工一日：${missing.length ? `缺${missing.join('、')}` : '料已到齊，工時未增加'}。${rows || '目前沒有能做工的人。'}可用現有職責／優先設定指派。</div>`;
}
