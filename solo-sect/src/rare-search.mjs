// 第二十二輪 #488：奇書線索須來自具名目擊；一人跟隨市集商路出門尋書。
import { DAY, NODES } from './data.mjs';
import { MARKET, cycleOf } from './economy.mjs';
import { RARE_BOOKS, rareBookState, handRareBook } from './rare-arts.mjs';
import { recordRumor, rumorForRareBook } from './rumors.mjs';
import { log } from './util.mjs';
import { cancelTask } from './core.mjs';

export function askRareBookRumor(s) {
  if (s.hermitage?.active) return { ok: false, why: '立匾開山後才能向市集行商打聽' };
  const cycle = cycleOf(s);
  if (s.rareAskedCycle === cycle) return { ok: false, why: '這期市集已問過行商' };
  const available = RARE_BOOKS.filter(b => rareBookState(s, b.id).at !== 'sect' && !rumorForRareBook(s, b.id));
  // 無主實物先問，讓玩家確實有可走的「搜」路；有主的書也能成傳聞，但不可在原處白拿。
  const book = available.find(b => !rareBookState(s, b.id).holder) || available[0];
  s.rareAskedCycle = cycle;
  if (!book) return { ok: false, why: '行商沒有新的親見線索' };
  const state = rareBookState(s, book.id);
  const detail = `${book.witness}親見《${book.name}》${state.holder ? `在${state.at}由${state.holder}帶在身邊` : `藏在${state.at}`}`;
  const rumor = recordRumor(s, 'rareBook', book.witness, 'market', detail,
    { bookId: book.id, at: state.at, holder: state.holder });
  log(s, `【奇書見聞】市集遇見${book.witness}，親口說起《${book.name}》的去向。`);
  return { ok: true, rumor, book: book.id };
}

export function rareBookSearchWhy(s, id, d) {
  const clue = rumorForRareBook(s, id);
  if (!clue) return '尚未聽到可追溯的奇書見聞';
  const book = RARE_BOOKS.find(b => b.id === id), state = book && rareBookState(s, id);
  if (!book || state.at !== clue.bookAt || state.holder !== clue.bookHolder) return '舊見聞已過時，原處沒有書';
  if (state.holder) return '書由人持有，不能在原處搜尋';
  if (!d || d.away || d.adult === false || d.hp <= 30) return '此人現在不能遠行';
  if (d.carry) return '先把手上物資送回院倉';
  if (s.rareSearch) return '已有一人循線索在外尋書';
  return null;
}

export function startRareBookSearch(s, id, d) {
  const why = rareBookSearchWhy(s, id, d); if (why) return { ok: false, why };
  const state = rareBookState(s, id);
  // 借既有市集每五日一趟的商路節拍；遠方尋書不是瞬間拾取，也沒有新日數旋鈕。
  s.rareSearch = { book: id, at: state.at, who: d.id, until: s.t + DAY * MARKET.every };
  cancelTask(s, d, '循見聞遠行');
  d.order = null; d.path = []; d.away = true; d.reason = `循見聞往${state.at}尋書`;
  log(s, `${d.name}跟著市集商路，往${state.at}尋《${RARE_BOOKS.find(b => b.id === id).name}》。`);
  return { ok: true, d };
}

export function rareBookSearchStep(s) {
  const trip = s.rareSearch; if (!trip || s.t < trip.until) return;
  s.rareSearch = null;
  const d = s.ds.find(x => x.id === trip.who); if (!d) return;
  d.away = false; d.at = 'gate'; d.pos = [...NODES.gate]; d.path = []; d.task = null;
  const state = rareBookState(s, trip.book);
  if (state.at !== trip.at || state.holder) { d.reason = '舊線索已過時'; log(s, `${d.name}到了舊址，書已不在原處，空手回山。`); return; }
  handRareBook(s, trip.book, d, '循見聞搜得');
  d.reason = '循見聞尋得奇書';
  // 同路商人親見搜書者帶書回山門，之後這個新持有人也能成為可追溯傳聞。
  const b = RARE_BOOKS.find(x => x.id === trip.book);
  recordRumor(s, 'rareBook', '同路行商', 'gate', `親見${d.name}帶《${b.name}》回山門`,
    { bookId: b.id, at: 'sect', holder: d.id });
}
