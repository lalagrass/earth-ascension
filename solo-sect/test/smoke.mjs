// #402 玩法 PR 最小驗證：隱居存檔 3 日、兩種子新局 10 日。步長 6 秒，與 test/harness 預設相同，讓這段在 30 秒內跑完。
import { createState, tick } from '../src/sim.mjs';
import { load, save } from '../src/save.mjs';
import { DAY } from '../src/data.mjs';

const DT = 6;
function nans(v, p, out, seen) {
  if (v && typeof v === 'object') {
    if (seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach((x, i) => nans(x, `${p}[${i}]`, out, seen)); return; }
    for (const k of Object.keys(v)) nans(v[k], `${p}.${k}`, out, seen);
    return;
  }
  if (typeof v === 'number' && Number.isNaN(v)) out.push(p);
}

function runDays(s, days) {
  const n = days * Math.round(DAY / DT);
  for (let i = 0; i < n; i++) { tick(s, DT); if (s.alert) s.alert = null; }
}

let bad = 0;
const saved = createState(42, { kind: 'custom', hermitage: true, opening: 'solo' });
const loaded = load(save(saved));
if (!loaded.ok) { console.error(`隱居存檔讀入失敗：${loaded.err}`); bad++; }
else {
  try { runDays(loaded.state, 3); console.log('隱居存檔讀回 3 日 ok'); }
  catch (e) { console.error(`隱居存檔例外：${e?.stack || e}`); bad++; }
}
for (const seed of [1001, 1002]) {
  const s = createState(seed);
  try { runDays(s, 10); }
  catch (e) { console.error(`例外 種子 ${seed}：${e?.stack || e}`); bad++; continue; }
  const hit = []; nans(s, `seed${seed}`, hit, new Set());
  if (hit.length) { console.error(`NaN 種子 ${seed}：${hit.slice(0, 6).join(' ')}`); bad++; }
  else console.log(`seed ${seed} 10 日 ok（第 ${s.day} 日）`);
}
if (bad) { console.error(`smoke 失敗 ${bad}`); process.exit(1); }
console.log('smoke 模擬 ok');
