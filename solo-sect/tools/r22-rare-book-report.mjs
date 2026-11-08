#!/usr/bin/env node
// 第二十二輪 #488 C：固定起局、主動打聽與搜尋；只列可達日，不拿 C 校準常數。
import { createState, tick } from '../src/sim.mjs';
import { DAY } from '../src/data.mjs';
import { foundHermitageSect } from '../src/sect.mjs';
import { rareBookState } from '../src/rare-arts.mjs';
import { askRareBookRumor, startRareBookSearch } from '../src/rare-search.mjs';

const onlySeed = process.argv.find(a => a.startsWith('--seed='));
const seeds = onlySeed ? [+onlySeed.slice(7)] : Array.from({ length: 12 }, (_, i) => 1001 + i);
const rows = seeds.map(seed => {
  const s = createState(seed, { hermitage: true }), hero = s.ds.find(d => d.id === 'hero');
  const founding = foundHermitageSect(s, 'single');
  const clue = founding.ok && askRareBookRumor(s);
  const depart = clue?.ok && startRareBookSearch(s, clue.book, hero);
  const departDay = s.day;
  if (depart?.ok) { s.t = s.rareSearch.until - .25; tick(s, .25); }
  return { seed, founding: !!founding.ok, heard: !!clue?.ok, book: clue?.book || null,
    departDay, returnDay: s.day, daysAway: (s.t / DAY),
    acquired: !!depart?.ok && rareBookState(s, clue.book).holder === hero.id };
});
console.log(JSON.stringify({ scope: 'controlled player ask once after founding, then search unheld book; no autonomous request',
  dt: .25, seeds, acquired: rows.filter(r => r.acquired).length, rows }, null, 2));
