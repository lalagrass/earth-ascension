/* loop93 加總 diag-toggle 輸出：node diag-toggle-sum.mjs files... */
import { readFileSync } from 'node:fs';
const rows = process.argv.slice(2).flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const keys = Object.keys(rows[0]).filter((k) => !['seed', 'on'].includes(k));
const av = (g, k) => { const v = rows.filter((r) => r.on === g).map((r) => +r[k]); return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3); };
const on = rows.filter((r) => r.on), off = rows.filter((r) => !r.on);
console.log(JSON.stringify({ seeds: on.length, on: Object.fromEntries(keys.map((k) => [k, av(true, k)])), off: Object.fromEntries(keys.map((k) => [k, av(false, k)])), identical: on.filter((r) => { const o = off.find((x) => x.seed === r.seed); return keys.every((k) => r[k] === o[k]); }).length }));
