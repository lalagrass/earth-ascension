/* loop69 診斷：月俸發不出（工錢沒著落）。用法：SS_DT=0.25 node test/harness/diag-wage.mjs [count] [days] [start] [bot|idle] [spec-json] */
/* 每次結算（econ.lastBill 換日）記：人數、月俸、維護費、是否付出、結算後的錢；欠俸離山次數；冬天天數比例。輸出 JSON 一行。 */
import { run, seedRange } from './bot.mjs';
import { seasonOf } from '../../src/economy.mjs';
const [n = 5, days = 60, start = 1001] = process.argv.slice(2, 5).map(Number), bot = process.argv[5] !== 'idle', SPEC = JSON.parse(process.argv[6] || '{}');
const A = { bills: 0, paid: 0, wage: 0, fac: 0, coinAfter: 0, ppl: 0, left: 0, disrepairBills: 0, smp: 0, winter: 0, byN: {} };
for (const seed of seedRange(n, start)) { let last = null, tk = 0;
  const s = run(seed, SPEC, days, bot, (s) => { const b = s.econ?.lastBill;
    if (b && b !== last) { last = b; A.bills++; A.wage += b.wage; A.fac += b.fac; A.coinAfter += s.res.coin; A.ppl += s.ds.length; if (b.paidW) A.paid++; if (!b.paidF && b.fac) A.disrepairBills++;
      const k = s.ds.length < 8 ? '<8' : s.ds.length < 12 ? '8-11' : s.ds.length < 16 ? '12-15' : '16+'; const t = (A.byN[k] ||= { bills: 0, paid: 0, wage: 0 }); t.bills++; t.wage += b.wage; if (b.paidW) t.paid++; }
    if (++tk % 10) return; A.smp++; if (/冬/.test(seasonOf(s).name)) A.winter++; });
  A.left += s.econ?.left || 0; }
console.log('JSON ' + JSON.stringify(A));
