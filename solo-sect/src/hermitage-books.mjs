// R3（#522）：隱居局的武學從實物卷或會的人傳來；卷、前置與出處都是資料列。
import { ACTIVITIES } from './data.mjs';
import { artById, learnArt } from './arts.mjs';
import { readStarterBook } from './luohan-book.mjs';
import { log } from './util.mjs';
import { BODY_MECHANICS } from './contact.mjs';
import { bodyCapOf } from './economy.mjs';

// 前一卷 XP25 與 XP55 沿用既有火候；入門卷按四段讀。原有三本崖卷只看前卷火候，沒有另加體能門檻。
// 入門每段用現有 study 工時的四分之一；低於成年平均體能時按平均／本人能力放慢。
export const HERMITAGE_VOLUMES = Object.freeze([
  { id: 'quanzhen-heart', art: 'quanzhenXinfa', from: 'chunyangFist', xp: 25, skill: 'strength', level: 'entry', source: 'opening', route: 'chunyangFist', lineage: 'quanzhen' },
  { id: 'quanzhen-step', art: 'jinyanStep', from: 'quanzhenXinfa', xp: 25, skill: 'agility', level: 'entry', source: 'opening', route: 'chunyangFist', lineage: 'quanzhen' },
  { id: 'shaolin-heart', art: 'shaolinXinfa', from: 'luohanHands', xp: 25, skill: 'strength', level: 'entry', source: 'opening', route: 'luohanHands', lineage: 'shaolin' },
  { id: 'shaolin-step', art: 'shaolinStep', from: 'shaolinXinfa', xp: 25, skill: 'agility', level: 'entry', source: 'opening', route: 'luohanHands', lineage: 'shaolin' },
  { id: 'quanzhen-sword', art: 'quanzhenSword', from: 'jinyanStep', xp: 25, level: 'advanced', source: 'cliff', route: 'chunyangFist', lineage: 'quanzhen' },
  { id: 'xiantian-heart', art: 'xiantianGong', from: 'quanzhenXinfa', xp: 55, level: 'advanced', source: 'cliff', route: 'chunyangFist', lineage: 'quanzhen' },
  { id: 'shaolin-arhat', art: 'shaolinArhat', from: 'shaolinStep', xp: 55, level: 'advanced', source: 'cliff', route: 'luohanHands', lineage: 'shaolin' },
  { id: 'gumu-palm', art: 'tianluoPalm', level: 'entry', source: 'opening', route: 'gumu', stage: 1, lineage: 'gumu' },
  { id: 'gumu-sword', art: 'yunvJian', from: 'tianluoPalm', xp: 25, level: 'entry', source: 'opening', route: 'gumu', stage: 2, lineage: 'gumu' },
  { id: 'gumu-fist', art: 'meinvFist', from: 'tianluoPalm', xp: 25, level: 'entry', source: 'opening', route: 'gumu', stage: 2, lineage: 'gumu' },
  { id: 'gumu-paired-sword', art: 'yunvSword', from: 'yunvJian', xp: 25, level: 'entry', source: 'opening', route: 'gumu', stage: 3, lineage: 'gumu' },
  { id: 'gumu-inner', art: 'yunv', from: 'yunvSword', xp: 25, level: 'entry', source: 'opening', route: 'gumu', stage: 4, lineage: 'gumu' },
  { id: 'taohua-palm', art: 'luoyingPalm', level: 'entry', source: 'opening', route: 'taohua', stage: 1, lineage: 'taohua' },
  { id: 'taohua-hand', art: 'lanhuaHand', from: 'luoyingPalm', xp: 25, level: 'entry', source: 'opening', route: 'taohua', stage: 2, lineage: 'taohua' },
  { id: 'taohua-sword', art: 'yuxiaoSword', from: 'lanhuaHand', xp: 25, level: 'entry', source: 'opening', route: 'taohua', stage: 3, lineage: 'taohua' },
  { id: 'taohua-inner', art: 'biboXinfa', from: 'yuxiaoSword', xp: 25, level: 'entry', source: 'opening', route: 'taohua', stage: 4, lineage: 'taohua' },
  { id: 'other-chunyang', art: 'chunyangFist', level: 'entry', source: 'fragment', route: 'luohanHands', lineage: 'quanzhen' },
  { id: 'other-luohan', art: 'luohanHands', level: 'entry', source: 'fragment', route: 'chunyangFist', lineage: 'shaolin' },
]);
export const volumeById = id => HERMITAGE_VOLUMES.find(v => v.id === id);
export const volumeLineage = v => v?.lineage; // R10：每列寫明傳承，不由程式推。
export const volumeName = id => `${artById(volumeById(id)?.art)?.name || id}・${volumeById(id)?.stage || (volumeById(id)?.source === 'fragment' ? '殘卷' : '卷')}`;
export const volumeBodyThreshold = (d, skill) => {
  const base = d.bodyBase?.[skill] ?? d.skills?.[skill] ?? 0;
  return base + (bodyCapOf(d, skill) - base) / 2;
};
export const entryReadSeconds = (d, v) => ACTIVITIES.study.dur *
  (v.skill ? BODY_MECHANICS.averageAdultSkill / Math.max(1, d.skills?.[v.skill] || 0) : 1);
export function seedHermitageBooks(s, opening, starter) {
  const routes = new Set([starter, ...(opening.people || []).map(p => p.awakeningPath).filter(Boolean)]);
  s.hermitage.books ??= HERMITAGE_VOLUMES.filter(v => v.source === 'opening' && routes.has(v.route)).map(v => v.id);
}
export function grantHermitageBook(s, id, source) {
  if (!volumeById(id)) return false;
  const books = s.hermitage.books ??= [];
  if (books.includes(id)) return false;
  books.push(id); log(s, `【拳譜】從${source}取得《${volumeName(id)}》。`); return true;
}
export function bookStatus(s, d, id, teacher = null) {
  const v = volumeById(id);
  if (!v || !d || d.arts?.[v.art]) return { ok: false, why: '已會或無此卷' };
  if (!teacher && !s.hermitage.books?.includes(id)) return { ok: false, why: '尚未取得此卷' };
  if (teacher && (teacher === d || !teacher.arts?.[v.art] || teacher.away || teacher.hp <= 0)) return { ok: false, why: '師者尚不會此藝' };
  if (v.from && (d.arts?.[v.from]?.xp || 0) < v.xp) return { ok: false, why: `須先把《${artById(v.from).name}》練到 ${v.xp} 熟練` };
  if (v.level === 'advanced' && v.skill && (d.skills?.[v.skill] || 0) < volumeBodyThreshold(d, v.skill)) return { ok: false, why: `身體功底 ${v.skill} 尚須 ${volumeBodyThreshold(d, v.skill)}` };
  return { ok: true, why: teacher ? '可由會的人傳授' : v.level === 'entry' && v.skill && (d.skills?.[v.skill] || 0) < BODY_MECHANICS.averageAdultSkill ? '可研讀，但身體功底較弱，讀得較慢' : '可研讀' };
}
export function readHermitageBook(s, d, id, seconds = ACTIVITIES.study.dur) {
  const status = bookStatus(s, d, id); if (!status.ok) return { ...status, learned: false };
  const v = volumeById(id);
  if (v.source === 'fragment') {
    const result = readStarterBook(d, v.art, seconds, s.t);
    if (!result.learned) return { ok: true, learned: false, progress: result.index };
  } else if (v.level === 'entry') {
    const progress = (d.hermitageRead ??= {})[id] ??= { index: 0, credit: 0 };
    const segment = entryReadSeconds(d, v) / 4;
    let time = seconds;
    while (time > 0 && progress.index < 4) {
      const left = segment - progress.credit;
      if (time < left) { progress.credit += time; break; }
      time -= left; progress.index++; progress.credit = 0;
    }
    if (progress.index < 4) return { ok: true, learned: false, progress: progress.index };
    learnArt(d, v.art, s.t); d.arts[v.art].source = 'book';
    delete d.hermitageRead[id];
  } else { learnArt(d, v.art, s.t); d.arts[v.art].source = 'book'; }
  if (d.hermitageStarter === null && HERMITAGE_VOLUMES.some(x => x.route === v.art)) d.hermitageStarter = v.art; // R10：白身讀會第一門入門拳，從此走這條路的崖上卷
  if (v.stage) { d.awakeningStage = Math.max(d.awakeningStage || 0, v.stage); s.hermitage.stage = Math.max(s.hermitage.stage || 0, v.stage); }
  log(s, `【拳譜】${d.name}讀完《${volumeName(id)}》，學會《${artById(v.art).name}》。`);
  return { ok: true, learned: true, art: v.art };
}
export function teachableHermitageBook(s, teacher, pupil) {
  if (!teacher || !pupil || teacher === pupil) return null;
  return HERMITAGE_VOLUMES.find(v => teacher.arts?.[v.art] && !pupil.arts?.[v.art] && bookStatus(s, pupil, v.id, teacher).ok) || null;
}
export function cliffBook(s, d) {
  const v = HERMITAGE_VOLUMES.find(v => v.source === 'cliff' && v.route === d.hermitageStarter && !s.hermitage.books?.includes(v.id));
  return v && grantHermitageBook(s, v.id, '絕頂石刻') ? v : null;
}
export function forestFragment(s, d) {
  if (s.ds.some(p => p !== d && !p.away)) return null;
  const v = HERMITAGE_VOLUMES.find(v => v.source === 'fragment' && !d.arts?.[v.art]); // R10：洞裡找到的是自己還不會的那份殘卷（白身也找得到）
  return v && grantHermitageBook(s, v.id, '林中山洞') ? v : null;
}
