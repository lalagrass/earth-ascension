// N41: lifetime form and exchange history belongs to the art, not to a character rank.
import { ACTIVITIES, ARTS } from './data.mjs';

export const LUOHAN_STAGES = ['十八手', '小羅漢拳', '大羅漢拳', '十八羅漢拳', '一百零八打', '三百六十打'];
const artForMove = (move) => ARTS.find((a) => a.tech === move || a.techs?.includes(move));
const study = (d, id) => (d.arts[id].life ??= { exchanges: 0, forms: 0 });

export function recordLifeExchange(d, move, weight = 1) {
  const art = artForMove(move);
  if (art && d.arts?.[art.id]) {
    const r = d.arts[art.id];
    r.lifetime = (r.lifetime || 0) + weight;
    if (art.lifeStages) study(d, art.id).exchanges += weight;
    unlockLifeMove(d, art);
  }
}

export function recordLifeRoutine(d, seconds) {
  const id = d.focus;
  const art = ARTS.find((a) => a.id === id);
  if (!art?.routine || !d.arts?.[id]) return;
  // A training session can traverse the 22 poses; form count is time, not XP.
  const forms = seconds * 22 / ACTIVITIES.train.dur;
  d.arts[id].lifetime = (d.arts[id].lifetime || 0) + forms;
  study(d, id).forms += forms;
  unlockLifeMove(d, art);
}

function unlockLifeMove(d, art) {
  if (!art.lifeMove || lifeStage(d, art.id) < art.lifeMove.stage) return;
  d.moves ??= [];
  if (!d.moves.includes(art.lifeMove.move)) d.moves.push(art.lifeMove.move);
}

export function lifeStage(d, id) {
  const art = ARTS.find((a) => a.id === id);
  const r = d.arts?.[id];
  if (!art?.lifeStages || !r) return -1;
  const life = r.life || { exchanges: 0, forms: 0 };
  // Both sparring with resistance and repeated full routines are necessary.
  const pairs = Math.min(life.exchanges, life.forms) / 22;
  return Math.min(art.lifeStages.length - 1, Math.floor(Math.log2(1 + pairs)));
}

export function lifeLabel(d, id) {
  const art = ARTS.find((a) => a.id === id);
  const stage = lifeStage(d, id);
  return stage < 0 ? '' : `${art.lifeStages[stage]}：實戰 ${Math.floor(d.arts[id].life?.exchanges || 0)}，套路 ${Math.floor(d.arts[id].life?.forms || 0)} 式`;
}
