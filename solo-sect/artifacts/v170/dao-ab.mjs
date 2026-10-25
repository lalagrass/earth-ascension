// v1.7 相剋 A/B：同種子巡山，DAO 正常 vs 中性（up=down=1），看戰果差多少（應小）
import { createState, tick, startExpedition } from '../../src/sim.mjs';
import { openExp } from '../../src/slice.mjs';
import { DAO, DAY } from '../../src/data.mjs';
const run = (seed) => { const s = openExp(createState(seed)); tick(s); s.res.food = 30; startExpedition(s, s.ds.slice(0, 3).map((d) => d.id)); for (let i = 0; i < DAY * 4 && (s.exp || i < 5); i++) tick(s);
  const ex = s.log.filter((l) => /巡山|戰報|歸來|回山/.test(l.msg)).slice(-1)[0]?.msg || ''; return { hp: s.ds.slice(0, 3).map((d) => Math.round(d.hp)), report: ex.slice(0, 80) }; };
const out = {}; for (const seed of [11, 21, 31, 41, 51]) { const a = run(seed); const [u, d] = [DAO.up, DAO.down]; DAO.up = DAO.down = 1; const b = run(seed); DAO.up = u; DAO.down = d; out[seed] = { dao: a, neutral: b }; }
console.log(JSON.stringify(out, null, 1));
