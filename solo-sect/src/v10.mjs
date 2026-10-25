// v1.0：秘笈殘章合成、喜好（飲食合一）、志向、頭頂單一狀態圖示
import { ARTS, TRAITS, DAY } from './data.mjs';
import { artById, reqMissing, learnArt, topTier } from './arts.mjs';
import { log } from './util.mjs';
// ---- 秘笈殘章 → 可學的武學 ----
export const MANUALS = { page1: { need: 5, grade: 1, name: '凡階秘笈' }, page2: { need: 3, grade: 2, name: '精階秘笈' } };
export const canAssemble = (s, k) => (s.res[k] || 0) >= MANUALS[k].need;
export function assemble(s, k) {
  if (!canAssemble(s, k)) return { ok: false, why: `殘頁不足 ${MANUALS[k].need} 張` };
  const pool = ARTS.filter((a) => !a.secret && a.grade === MANUALS[k].grade); if (!pool.length) return { ok: false, why: '無可對應武學' };
  const known = (a) => s.ds.filter((d) => d.arts?.[a.id]).length, art = pool.reduce((b, a) => (known(a) < known(b) ? a : b));
  s.res[k] -= MANUALS[k].need; (s.manuals ??= []).push({ k, art: art.id });
  log(s, `【秘笈】${MANUALS[k].need} 張${k === 'page1' ? '凡階' : '精階'}殘頁湊成《${art.name}》${MANUALS[k].name}，可指定弟子研讀`); return { ok: true, art: art.id };
}
export function learnManual(s, i, did, think) {
  const m = s.manuals?.[i], d = s.ds.find((x) => x.id === did); if (!m || !d) return { ok: false, why: '查無' };
  const a = artById(m.art); if (d.arts?.[a.id]) return { ok: false, why: `${d.name}已會${a.name}` };
  const miss = reqMissing(d, a); if (miss.length) return { ok: false, why: `${d.name}還差：${miss.join('、')}` };
  learnArt(d, a.id, s.t); s.manuals.splice(i, 1); think?.(s, d, 'learned'); log(s, `${d.name}研讀秘笈，學會了${a.name}`); return { ok: true };
}
// ---- 喜好：吃與喝合成一套；嗜酒者必好酒 ----
export const FOODS = ['紅燒肉', '叫化雞', '陽春麵', '饅頭鹹菜'], DRINKS = ['女兒紅', '竹葉青', '清茶'];
const h = (x) => [...String(x)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function likesOf(d) {
  if (!d.likes) { const k = h(d.id + d.name); d.likes = { food: FOODS[k % FOODS.length], drink: (d.personality || []).includes('drinker') ? '女兒紅' : DRINKS[(k >>> 3) % DRINKS.length] }; }
  return d.likes;
}
export const menuOf = (s) => { const day = Math.floor(s.t / DAY); return { food: FOODS[day % FOODS.length], drink: DRINKS[day % DRINKS.length] }; };
export function likeMeal(s, d, think) {
  const L = likesOf(d), m = menuOf(s), hit = []; if (L.food === m.food) { think(s, d, 'likeFood'); hit.push('food'); }
  if (L.drink === m.drink) { think(s, d, 'likeDrink'); hit.push('drink'); } return hit;
}
// ---- 志向：由主價值觀生出，達成給一個特質 ----
Object.assign(TRAITS, {
  focused: { name: '專注', desc: '志在武學，練功心無旁騖', mods: { train: 1.15, meditate: 1.1 } },
  loyal: { name: '忠心', desc: '門派興旺就心安', moodBase: 4 },
  righteous: { name: '俠骨', desc: '見不平就出手', mods: { spar: 1.15 } },
  warm: { name: '重情', desc: '有知己相伴，聊天更起勁', mods: { chat: 1.2 }, moodBase: 2 },
  wanderer: { name: '遊俠', desc: '走過的山多了，腳程更穩', moodBase: 3 },
  famed: { name: '揚名', desc: '江湖上有了名號', moodBase: 5 },
});
const kills = (s) => Object.values(s.codex || {}).reduce((a, c) => a + c.kills, 0);
export const ASPIRATIONS = {
  wu: { name: '武學登峰', goal: '任一武學練到第 4 層', ok: (s, d) => topTier(d).t >= 3, trait: 'focused' },
  sect: { name: '光大門楣', goal: '本門名聲達 30', ok: (s) => (s.rep || 0) >= 30, trait: 'loyal' },
  xia: { name: '行俠仗義', goal: '本門累計擊倒 30 個敵人', ok: (s) => kills(s) >= 30, trait: 'righteous' },
  qing: { name: '知己相伴', goal: '與任一人好感達 60', ok: (s, d) => Object.entries(s.aff || {}).some(([k, v]) => k.startsWith(d.id + '>') && v >= 60), trait: 'warm' },
  free: { name: '遊遍群山', goal: '親自巡山走到 700 步', ok: (s, d) => (d.best || 0) >= 700, trait: 'wanderer' },
  fame: { name: '名動江湖', goal: '本門巡山紀錄達 950 步（過斷崖）', ok: (s) => (s.records?.sect || 0) >= 950, trait: 'famed' },
};
export function aspOf(d) {
  if (!d.values) return null;
  if (!d.asp) { const top = Object.entries(d.values).sort((a, b) => b[1] - a[1])[0]?.[0]; if (!ASPIRATIONS[top]) return null; d.asp = { id: top, done: false }; }
  return d.asp;
}
export function aspStep(s, think) {
  for (const d of s.ds) { const a = aspOf(d); if (!a || a.done) continue; const A = ASPIRATIONS[a.id]; if (!A.ok(s, d)) continue;
    a.done = true; a.t = Math.round(s.t); if (!(d.personality || []).includes(A.trait)) d.personality.push(A.trait); if (d.known && !d.known.includes(A.trait)) d.known.push(A.trait);
    think(s, d, 'aspDone'); log(s, `【志向】${d.name}「${A.name}」得償，養成「${TRAITS[A.trait].name}」`); }
}
// ---- 地圖可讀性：每顆頭只放一個狀態圖示（優先序：傷 > 餓 > 累 > 心情差 > 違心 > 正在做的事） ----
export function statusIcon(d, actIcon = '') {
  if ((d.hp ?? 100) < 50) return '🩹'; if ((d.needs?.hunger ?? 100) < 20) return '🍚'; if ((d.needs?.energy ?? 100) < 15) return '💤';
  if ((d.mood ?? 50) < 25) return '☁'; if (d.wexin >= 2) return '😣'; return actIcon;
}
