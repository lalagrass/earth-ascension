// R11 #531：自創靠配方；奇書是世上只有一本的實物；自宮是永久的身體狀態。
// 參考：天下霸圖閉關研究的是「本門武學表的下一門」，不是憑空頓悟；太吾繪卷的書是實物、分篇章。
// 金庸原著：楊過學遍古墓、全真諸家，又與小龍女分離後才創出黯然銷魂掌；葵花寶典在日月神教教主手上，
// 辟邪劍譜寫在福州林家老宅的袈裟上，兩者都要先自宮。只借「配方」與「實物」的機制，不抄數值。
import { TIERS } from './data.mjs';
import { artById, artTier, learnArt } from './arts.mjs';
import { log } from './util.mjs';

// 人生事件：只看人身上已經發生的事，不擲骰、不設機率。
export const LIFE_EVENTS = Object.freeze({
  // 成過親（wed 一直留著），而那個人已不在身邊（離開、過世或遠行）。
  parted: { name: '與結髮之人分離', test: (s, d) => !!d.wed && !s.ds.some((o) => o.id === d.wed && !o.away) },
});

// 自創武學的配方：先會哪幾門、各到哪一層，外加哪個人生事件。沒有「悟性多少、機率多少」。
// 層級用 TIERS 的名稱寫，不另設數字。
export const ART_RECIPES = Object.freeze([
  // 原著：楊過的掌法根柢在古墓（天羅地網勢），心法兼學玉女心經與全真口訣，再加上與小龍女分離。
  { art: 'anran', needs: Object.freeze([{ art: 'tianluoPalm', tier: '大成' }, { art: 'yunv', tier: '小成' }, { art: 'quanzhenXinfa', tier: '小成' }]), event: 'parted' },
]);
const tierIndex = (name) => TIERS.findIndex(([, n]) => n === name);
export const recipeOf = (art) => ART_RECIPES.find((r) => r.art === art) || null;

export function recipeStatus(s, d, art) {
  const r = recipeOf(art);
  if (!r || !d) return { ok: false, missing: ['沒有這門自創武學的配方'] };
  if (d.arts?.[art]) return { ok: false, missing: ['已經會了'] };
  const missing = r.needs.filter((n) => artTier(d, n.art) < tierIndex(n.tier)).map((n) => `《${artById(n.art)?.name || n.art}》${n.tier}`);
  const ev = LIFE_EVENTS[r.event];
  if (ev && !ev.test(s, d)) missing.push(ev.name);
  return { ok: !missing.length, missing };
}
export const inventable = (s, d) => ART_RECIPES.find((r) => recipeStatus(s, d, r.art).ok) || null;

// 自創完成：配方仍齊才學會（期間配方失效就作罷）。
export function inventArt(s, d, art) {
  const st = recipeStatus(s, d, art); if (!st.ok) return { ok: false, why: st.missing };
  learnArt(d, art, s.t); d.arts[art].source = 'invented';
  log(s, `【自創】${d.name}把${recipeOf(art).needs.map((n) => `《${artById(n.art).name}》`).join('、')}融在一起，又因${LIFE_EVENTS[recipeOf(art).event].name}，自創出《${artById(art).name}》。`);
  return { ok: true, art };
}

// 奇書：世上只有一本的實物，有所在地與持有人；持有人不教，只能讀實物。
export const RARE_BOOKS = Object.freeze([
  { id: 'kuihua-book', art: 'kuihua', name: '葵花寶典', place: '黑木崖', holder: '日月神教教主', cost: 'castrated' },
  { id: 'bixie-robe', art: 'bixie', name: '辟邪劍譜', place: '福州林家老宅', holder: null, cost: 'castrated' },
]);
export const rareBookById = (id) => RARE_BOOKS.find((b) => b.id === id) || null;
// 只能讀實物的武學（持有人與會的人都不教；看人仍可得單招）。
export const bookOnlyArt = (art) => RARE_BOOKS.some((b) => b.art === art);
// 目前在哪、誰拿著；沒動過就是資料列的原處（不預先寫進狀態）。
export const rareBookState = (s, id) => s.rareBooks?.[id] || { at: rareBookById(id)?.place, holder: rareBookById(id)?.holder };
// 實物易手：唯一的取得入口。之後的傳聞（R8 #526）與搜尋、偷取都從這裡交手。
export function handRareBook(s, id, d, how = '取得') {
  const b = rareBookById(id); if (!b || !d) return false;
  (s.rareBooks ??= {})[id] = { at: 'sect', holder: d.id };
  log(s, `【奇書】${d.name}${how}《${b.name}》（原在${b.place}）。`);
  return true;
}
const COSTS = Object.freeze({ castrated: { name: '自宮', paid: (d) => d.castrated != null } });

export function rareBookStatus(s, d, id) {
  const b = rareBookById(id);
  if (!b || !d) return { ok: false, why: '無此書' };
  if (d.arts?.[b.art]) return { ok: false, why: '已會' };
  if (rareBookState(s, id).holder !== d.id) return { ok: false, why: `書在${rareBookState(s, id).at}，不在手上` };
  if (!COSTS[b.cost].paid(d)) return { ok: false, why: `要先${COSTS[b.cost].name}` };
  return { ok: true, why: '可研讀' };
}
export const readableRareBook = (s, d) => RARE_BOOKS.find((b) => rareBookStatus(s, d, b.id).ok) || null;
export function readRareBook(s, d, id) {
  const st = rareBookStatus(s, d, id); if (!st.ok) return { ...st, learned: false };
  const b = rareBookById(id); learnArt(d, b.art, s.t); d.arts[b.art].source = 'book';
  log(s, `【奇書】${d.name}讀完《${b.name}》，學會《${artById(b.art).name}》。`);
  return { ok: true, learned: true, art: b.art };
}

// 自宮：永久、不可逆，只能由玩家明確確認（confirm === true）。之後不能有後代（R7 #524）。
export function selfCastrate(s, d, confirm) {
  if (confirm !== true || !d || d.castrated != null) return false;
  d.castrated = s.t;
  log(s, `【自宮】${d.name}揮刀自宮。從此不能再有後代。`);
  return true;
}
export const canHaveChildren = (d) => d?.castrated == null;
