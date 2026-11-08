// 第二十六輪 #488：固定的靜態盤點，不執行遊戲程式、不消耗 RNG。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const doc = path.join(root, 'docs/systems/time-and-scale.md');
const start = '<!-- TIME CONSTANT INVENTORY START -->';
const end = '<!-- TIME CONSTANT INVENTORY END -->';
const timeKey = /(?:day|year|month|season|second|minute|hour|duration|^dur$|ttl|cool|wait|gap|interval|period|every|delay|tau|regen|decay|timeout|wind|reaction|cadence|tick|^cd$|^stay$|^session$|^PLOT_GROW$|^REVEAL_AT$|^PHASES$|^DAY$)/i;
const keyValue = /\b([A-Za-z_][\w]*)\s*:\s*(?:\[\s*)*(?:-?\d|DAY\b|DAYS_PER_YEAR\b|SEASON_DAYS\b|growthDaysFromRealDays\()/g;
const namedConstant = /\b(?:export\s+)?const\s+([A-Za-z_][\w]*)\s*=\s*(?:\[\s*)*(?:-?\d|DAY\b|DAYS_PER_YEAR\b|SEASON_DAYS\b|growthDaysFromRealDays\()/g;
const inlineDay = /(?:\b\d+(?:\.\d+)?\s*\*\s*DAY\b|\bDAY\s*[*/]\s*\d+(?:\.\d+)?|\bs\.t\s*[+-]\s*\d+(?:\.\d+)?\b)/;
const isTimeKey = key => timeKey.test(key) || key === 'age' || key.endsWith('Age');

function clock(key, line, file) {
  if (key === 'physical scale') return '地圖尺度';
  if (key === 'projection scale') return '示意距離';
  if (key === 'brewEvery') return '工作次數';
  if ((key === 'every' && /roster:/.test(line)) || (key === 'gap' && /BAND_MEMBER/.test(line))) return '巡山距離';
  if (key === 'every' && file === 'economy.mjs') return '生理日';
  if (key === 'cool' && file === 'jianghu.mjs') return '生理日';
  if (key === 'peaceGap') return '生理日';
  if (key === 'age' || key.endsWith('Age') || /growthDaysFromRealDays|gestat|pregnan|year|birth/i.test(key + ' ' + line)) return '成長年';
  if (/DAY|day|season/i.test(key + ' ' + line)) return '生理日';
  return '動作秒';
}
export function inventory() {
  const rows = [];
  for (const file of fs.readdirSync(src).filter(f => f.endsWith('.mjs')).sort()) {
    const lines = fs.readFileSync(path.join(src, file), 'utf8').split('\n');
    lines.forEach((original, index) => {
      const line = original.replace(/\/\/.*$/, '').trim();
      if (!line) return;
      const found = [];
      for (const regex of [keyValue, namedConstant]) {
        regex.lastIndex = 0;
        for (const match of line.matchAll(regex)) if (isTimeKey(match[1]) && !(file === 'start-ui.mjs' && match[1] === 'gap')) found.push(match[1]);
      }
      if (inlineDay.test(line) && !found.length) found.push('DAY literal');
      if (file === 'data.mjs' && line.includes('WAVE_GAP =')) found.push('WAVE_GAP');
      if (file === 'data.mjs' && line.includes('BASE_SPEED =')) found.push('BASE_SPEED');
      if (file === 'time-scale.mjs' && /METERS_PER_PIXEL|METERS_PER_ZHANG/.test(line)) found.push('physical scale');
      if (file === 'combat-space.mjs' && line.includes('step: 24')) found.push('physical scale');
      if (file === 'world.mjs' && line.includes('export const PX =')) found.push('projection scale');
      for (const [n, key] of found.entries()) {
        rows.push({ id: `src/${file}:${index + 1}:${key}:${n + 1}`, clock: clock(key, line, file),
          text: line.replaceAll('|', '\\|').replaceAll('`', "'").slice(0, 220) });
      }
    });
  }
  return rows;
}
export function inventoryMarkdown() {
  const rows = inventory();
  return [start, '| 來源：行：常數 | 時鐘 | 原式（該行） |', '|---|---|---|',
    ...rows.map(r => `| ${r.id} | ${r.clock} | ${r.text} |`), end].join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = fs.readFileSync(doc, 'utf8');
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < a) throw Error('time-and-scale.md 缺盤點標記');
  const generated = inventoryMarkdown();
  if (process.argv.includes('--write')) {
    fs.writeFileSync(doc, text.slice(0, a) + generated + text.slice(b + end.length));
    process.stdout.write(`時間常數 ${inventory().length} 列已寫入\n`);
  } else if (process.argv.includes('--check')) {
    if (text.slice(a, b + end.length) !== generated) throw Error('src/ 時間常數與表不符；執行 node tools/time-constant-inventory.mjs --write');
    process.stdout.write(`時間常數 ${inventory().length} 列與文件相符\n`);
  } else process.stdout.write(generated + '\n');
}
