/* loop128 加總 diag-ab 輸出：node test/harness/diag-ab-sum.mjs < file.jsonl */
import { readFileSync } from 'node:fs';
const rows = readFileSync(0, 'utf8').split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
const keys = ['n', 'fought', 'won', 'paid', 'homeHurt', 'lairN', 'lairWon', 'str', 'agi', 'pow', 'coin', 'rep', 'hp'];
for (const on of [true, false]) { const r = rows.filter((x) => x.on === on), m = (k) => (r.reduce((a, x) => a + x[k], 0) / r.length).toFixed(2);
  const fw = r.reduce((a, x) => a + x.won, 0) / Math.max(1, r.reduce((a, x) => a + x.fought, 0)), lw = r.reduce((a, x) => a + x.lairWon, 0) / Math.max(1, r.reduce((a, x) => a + x.lairN, 0));
  console.log(`${on ? '開' : '關'} 局數 ${r.length}｜` + keys.map((k) => `${k} ${m(k)}`).join('｜') + `｜迎戰勝率 ${(100 * fw).toFixed(1)}%｜剿寨勝率 ${(100 * lw).toFixed(1)}%`); }
