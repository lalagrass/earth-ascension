// MapLibre symbol collision 的概念（未複製程式）：優先標籤先佔框，其餘收起。
import { FACILITIES, NODES, RES_NAMES } from './data.mjs';
import { artById, focusOf } from './arts.mjs';
import { routineFrame } from './routines.mjs';
export const LABEL_PRIORITY = Object.freeze({ selected: 0, hero: 1, combat: 2, practice: 3, name: 4, facility: 5 });
// 13px 字高＋4px 描邊，14px 字格保守包住漢字與 emoji；不依賴系統字型量測。
export const LABEL_METRICS = Object.freeze({ glyph: 14, height: 22, pad: 4, actorLift: 74 });
export function practiceText(s, d) {
  if (d.task?.act !== 'train' || d.task.phase !== 'do') return '';
  const art = artById(focusOf(d) || 'basicFist'), f = routineFrame(art, d, s.t);
  return `${art?.name || '基礎拳'}・第 ${f.form} 式${f.routine.generic ? '（通用套路）' : ''}`;
}
export function homeLabelCandidates(s, { selected = null, hovered = null } = {}) {
  const rows = s.ds.filter((d) => !d.away).map((d) => {
    const practice = practiceText(s, d), combat = !!d.swing || ['strike', 'hunt', 'spar'].includes(d.anim);
    const kind = d.id === selected || d.id === hovered ? 'selected' : d.id === 'hero' ? 'hero' : combat ? 'combat' : practice ? 'practice' : 'name';
    const activity = practice || (combat ? '交手中' : d.task?.act === 'teach' ? d.reason : d.task?.act === 'meditate' ? '衝關' : '');
    return { id: d.id, kind, text: `${d.name}${activity ? `｜${activity}` : ''}`, x: d.pos[0], y: d.pos[1] - LABEL_METRICS.actorLift, color: '#222' };
  });
  for (const f of FACILITIES) {
    const fs = s.fac[f.id]; if (!fs || (f.sig && !fs.stage)) continue;
    const stage = f.stages[Math.min(fs.stage || 0, f.stages.length - 1)];
    const site = fs.site ? `｜${fs.site.paused ? '暫停' : '工地'} ${fs.site.work.toFixed(0)}/${fs.site.workNeed}s` : '';
    rows.push({ id: `facility:${f.id}`, kind: 'facility', text: `${f.name}・${stage.name}${site}`, x: NODES[f.node][0], y: NODES[f.node][1] + 22, color: '#3a2f24' });
  }
  for (const m of s.mons || []) if (m.raid) rows.push({ id: `enemy:${m.id}`, kind: 'combat', text: '下山拱菜', x: m.pos[0], y: m.pos[1] - 40, color: '#a33' });
  if (s.band) rows.push({ id: 'band', kind: 'combat', text: s.band.state === 'go' ? '山賊逼近' : '山賊撞柵', x: s.band.pos[0], y: s.band.pos[1] - 44, color: '#a33' });
  ['wood','stone','food','herb','coin'].forEach((key, i) => { if (s.res[key] > 0) rows.push({ id: `resource:${key}`, kind: 'facility', text: `${RES_NAMES[key]}${Math.floor(s.res[key])}`, x: NODES.court[0] - 120 + i * 30, y: NODES.court[1] + 66, color: '#333' }); });
  return rows;
}
export const boxesOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
export function layoutLabels(candidates) {
  const shown = [], hidden = [];
  const sorted = [...candidates].sort((a, b) => LABEL_PRIORITY[a.kind] - LABEL_PRIORITY[b.kind] || String(a.id).localeCompare(String(b.id), 'en'));
  for (const row of sorted) {
    const width = [...row.text].length * LABEL_METRICS.glyph + LABEL_METRICS.pad * 2;
    const box = { left: row.x - width / 2, right: row.x + width / 2, top: row.y - LABEL_METRICS.height + LABEL_METRICS.pad, bottom: row.y + LABEL_METRICS.pad };
    const label = { ...row, box };
    (shown.some((p) => boxesOverlap(p.box, box)) ? hidden : shown).push(label);
  }
  return { shown, hidden };
}
