// loop33 診斷（harness-only，不改遊戲）：
// (1) 錢的逐項收支：以 Proxy 攔截 s.res.coin 寫入，依呼叫鏈歸類（執事／玩家 bot／遊戲本身），比較 steward 開 vs 關。
// (2) 剿寨第 1 場：重建該場的勝負亂數 u，檢查 u 的分布與 u<p 的比率。
// 用法：node test/harness/diag-coin-first.mjs [種子數=40] [起始種子=1001] [日數=60]
import { run } from './bot.mjs';
import { seedMix } from '../../src/util.mjs';
const N = +(process.argv[2] || 40), S0 = +(process.argv[3] || 1001), DAYS = +(process.argv[4] || 60), M = 2147483647;
function who() { const fr = new Error().stack.split('\n').slice(3); const tag = fr.some((l) => /steward\.mjs/.test(l)) ? '執事:' : fr.some((l) => /harness\/bot\.mjs/.test(l)) ? 'bot:' : '';
  for (const l of fr) { const m = l.match(/at (?:async )?([\w$.]+) \(.*\/src\/(\w+)\.mjs/); if (m && m[2] !== 'util' && !/^(Object|Proxy|Array)\./.test(m[1])) return tag + `${m[2]}:${m[1]}`; } return tag + '?'; }
const out = {}, first = [];
for (const bot of [false, true]) for (const stew of [false, true]) { const K = `${bot ? 'bot' : 'idle'}/${stew ? '執事開' : '執事關'}`; const A = (out[K] = { ch: {}, end: 0, builds: {} });
  for (let seed = S0; seed < S0 + N; seed++) { let hooked = false, prev = 0, hl = 0;
    const s = run(seed, { steward: stew }, DAYS, bot, (s) => {
      if (!hooked) { hooked = true; const raw = s.res; s.res = new Proxy(raw, { set(t, k, v) { if (k === 'coin') { const d = v - (t[k] || 0); if (d) { const w = who(); A.ch[w] = (A.ch[w] || 0) + d; } } t[k] = v; return true; } }); }
      const L = s.lair; if (stew && bot === false && L) { const n = L.hist?.length || 0; if (n > hl && hl === 0) { const r = ((prev || seedMix(s.seed || 1, 4219)) * 16807) % M; const h = L.hist[0]; first.push({ seed, u: r / M, p: h.p, win: h.win ? 1 : 0, n: (L.rngN ?? null) }); } hl = n; prev = L.rng || 0; } });
    A.end += s.res.coin; }
  A.end /= N; for (const k in A.ch) A.ch[k] /= N; }
console.log(`### 錢逐項（每種子平均，${N} 種子 ${S0}–${S0 + N - 1}，${DAYS} 日）`);
for (const g of ['idle', 'bot']) { const a = out[`${g}/執事關`], b = out[`${g}/執事開`]; console.log(`\n${g}：期末錢 關 ${a.end.toFixed(1)} → 開 ${b.end.toFixed(1)}（${(b.end - a.end).toFixed(1)}）`);
  const ks = [...new Set([...Object.keys(a.ch), ...Object.keys(b.ch)])].sort((x, y) => Math.abs((b.ch[y] || 0) - (a.ch[y] || 0)) - Math.abs((b.ch[x] || 0) - (a.ch[x] || 0)));
  console.log('| 管道 | 關 | 開 | 差 |\n|---|---|---|---|'); for (const k of ks.slice(0, 14)) console.log(`| ${k} | ${(a.ch[k] || 0).toFixed(1)} | ${(b.ch[k] || 0).toFixed(1)} | ${((b.ch[k] || 0) - (a.ch[k] || 0)).toFixed(1)} |`); }
const f = first.filter((x) => x.p != null), mu = f.reduce((a, x) => a + x.u, 0) / f.length, mp = f.reduce((a, x) => a + x.p, 0) / f.length, w = f.reduce((a, x) => a + x.win, 0) / f.length;
const agree = f.filter((x) => (x.u < x.p) === !!x.win).length;
console.log(`\n### 第 1 場（idle、執事開）：${f.length} 場；重建 u 與記錄勝負一致 ${agree}/${f.length}；平均 u ${mu.toFixed(3)}（應≈0.5）；平均 p ${mp.toFixed(3)}；實際 ${w.toFixed(3)}`);
const bins = [0, 0.2, 0.4, 0.6, 0.8, 1].slice(0, 5).map((lo) => f.filter((x) => x.u >= lo && x.u < lo + 0.2).length); console.log('u 五分位計數：', bins.join(' '));
