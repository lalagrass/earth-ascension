// N62：從已走過的前三段追蹤真獵物，交手仍由 N45 地圖逐招決勝。
import { ENEMIES, ROUTE } from './data.mjs';

export function forayChoices(s, d, motive) {
  const rows = [];
  for (let index = 0; index < 3; index++) {
    const seg = ROUTE[index];
    if (index && (d.best || 0) < seg.from - seg.every) continue;
    if (motive === 'practice') {
      rows.push({ seg: seg.id, key: null, target: seg.to - seg.every, index });
      continue;
    }
    for (const [key] of seg.roster) {
      const foe = ENEMIES[key];
      if (!(foe.loot?.food > 0)) continue;
      rows.push({ seg: seg.id, key, target: seg.to - seg.every, effort: foe.hp * foe.dmg, index });
    }
  }
  // 缺糧時追較易取糧的動物；巡山只選路段，敵人依原路段群落權重自然出現。
  return rows.sort((a, b) => (motive === 'food' ? a.effort - b.effort || a.index - b.index || a.key.localeCompare(b.key) : b.index - a.index));
}

export const forayChoice = (s, d, motive) => forayChoices(s, d, motive)[0] || null;
