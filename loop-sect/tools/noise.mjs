// v7（retro 6）舊門檻雜訊帶：同一份程式，用四組種子各跑一次 soak（5 日）與 report（10 日），逐條列出過／不過與數字。
// 一條門檻在某幾組過、某幾組不過，就是落在雜訊帶裡：換一組種子結論就變。
// 用法：node loop-sect/tools/noise.mjs [--sets 1,13,25,37] [--jobs 4]  → 輸出 markdown 表到 stdout，原始輸出放 .evidence/noise/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.evidence', 'noise');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SETS = arg('sets', '1,13,25,37').split(',').map(Number);
const JOBS = Number(arg('jobs', 4));

const runs = SETS.flatMap((from) => ['soak', 'report'].map((tool) => ({ tool, from })));
function run({ tool, from }) {
  return new Promise((resolve) => {
    const file = path.join(OUT, `${tool}-${from}.txt`);
    const ch = spawn(process.execPath, [path.join(ROOT, 'tools', `${tool}.mjs`), '--from', String(from)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    ch.stdout.on('data', (d) => { text += d; }); ch.stderr.on('data', (d) => { text += d; });
    ch.on('close', () => { fs.writeFileSync(file, text); resolve({ tool, from, text }); });
  });
}
const results = [];
for (let i = 0; i < runs.length; i += JOBS) results.push(...await Promise.all(runs.slice(i, i + JOBS).map(run)));

// 指標 → 組 → { ok, text }
const table = new Map();
const put = (id, from, ok, text) => { if (!table.has(id)) table.set(id, new Map()); table.get(id).set(from, { ok, text }); };
for (const { tool, from, text } of results) {
  const lines = text.split('\n');
  if (tool === 'report') {
    for (const l of lines) {
      const m = l.match(/^(ok  |FAIL|暫停) (M\d+[a-z]?-A\d+(?:\[\w+\])?) (.*)$/);
      if (m && m[1] !== '暫停') put(`report ${m[2]}`, from, m[1] === 'ok  ', m[3]);
    }
  } else {
    let scenario = 'base';
    const failed = new Set(lines.map((l) => l.match(/^\[(\w+)\] (M\d+-A\d+)/)).filter(Boolean).map((m) => `${m[1]} ${m[2]}`));
    // soak 先印「--- 情境 x ---」再印該情境的指標行；沒過的列在最後「[x] Mx-Ay …」。
    for (const l of lines) {
      const h = l.match(/^--- 情境 (\w+) ---/);
      if (h) { scenario = h[1]; continue; }
      const m = l.match(/^(M\d+-A\d+) (.*)$/);
      if (m) put(`soak ${m[1]}[${scenario}]`, from, !failed.has(`${scenario} ${m[1]}`), m[2]);
    }
  }
}

const short = (t) => t.replace(/\s+/g, ' ').slice(0, 70);
console.log(`| 指標 | ${SETS.map((f) => `種子 ${f}–${f + 11}`).join(' | ')} | 判斷 |`);
console.log(`|---|${SETS.map(() => '---').join('|')}|---|`);
const order = [...table.keys()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const summary = { stable: 0, noise: 0, fail: 0 };
for (const id of order) {
  const row = table.get(id);
  const oks = SETS.map((f) => row.get(f)?.ok);
  const n = oks.filter(Boolean).length, seen = oks.filter((x) => x !== undefined).length;
  const verdict = n === seen ? '穩過' : n === 0 ? '穩不過' : '雜訊帶';
  summary[verdict === '穩過' ? 'stable' : verdict === '穩不過' ? 'fail' : 'noise']++;
  console.log(`| ${id} | ${SETS.map((f) => { const c = row.get(f); return c ? `${c.ok ? '過' : '**不過**'} ${short(c.text)}` : '—'; }).join(' | ')} | ${verdict} |`);
}
console.log(`\n穩過 ${summary.stable}、雜訊帶 ${summary.noise}、穩不過 ${summary.fail}（共 ${order.length} 條；原始輸出在 .evidence/noise/）`);
