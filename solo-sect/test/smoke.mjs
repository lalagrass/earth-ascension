// #402 玩法 PR 最小驗證：舊存檔 3 日、兩種子新局 10 日。步長 6 秒，與 test/harness 預設相同，讓這段在 30 秒內跑完。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState, tick } from '../src/sim.mjs';
import { load } from '../src/save.mjs';
import { DAY } from '../src/data.mjs';

const DT = 6;
const root = path.dirname(fileURLToPath(import.meta.url));
const saveDir = path.join(root, 'golden', 'saves');

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
const files = fs.readdirSync(saveDir).filter((f) => f.endsWith('.json')).sort();
if (!files.length) { console.error('test/golden/saves/ 沒有存檔'); process.exit(1); }
for (const f of files) {
  const r = load(fs.readFileSync(path.join(saveDir, f), 'utf8'));
  if (!r.ok) { console.error(`讀入失敗 ${f}：${r.err}`); bad++; continue; }
  try { runDays(r.state, 3); }
  catch (e) { console.error(`例外 ${f}：${e?.stack || e}`); bad++; continue; }
  const hit = []; nans(r.state, f, hit, new Set());
  if (hit.length) { console.error(`NaN ${f}：${hit.slice(0, 6).join(' ')}`); bad++; }
  else console.log(`save ${f} 3 日 ok`);
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
