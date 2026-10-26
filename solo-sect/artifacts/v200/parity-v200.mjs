// v2.0 A8 parity: run identical seeds/templates on the pre-refactor src (argv[2]) and current src (argv[3]); compare full save hashes.
import crypto from 'node:crypto';
const run = async (dir, seed, id, days) => { const { createState, tick } = await import(dir + '/sim.mjs'); const { save } = await import(dir + '/save.mjs'); const { DAY } = await import(dir + '/data.mjs');
  const s = createState(seed, id ? { kind: 'template', id, askMajor: false } : null); for (let i = 0; s.t < days * DAY; i++) { tick(s); if (s.choices?.length && i % 7 === 0) { /* leave choices pending: same in both */ } }
  return [crypto.createHash('sha256').update(JSON.stringify(save(s))).digest('hex').slice(0, 16), s.hero?.arcStep ?? '-'];
};
const out = []; let bad = 0;
for (const id of [null, 'yuebuqun', 'linghuchong', 'zhangwuji', 'weixiaobao', 'axing', 'guojing']) for (const seed of [3, 7, 11]) {
  const a = await run(process.argv[2], seed, id, 30), b = await run(process.argv[3], seed, id, 30); if (a[0] !== b[0]) bad++;
  out.push(`${(id || 'plain').padEnd(12)} seed ${String(seed).padEnd(3)} before ${a[0]} after ${b[0]} arcStep ${a[1]}/${b[1]} ${a[0] === b[0] ? 'SAME' : 'DIFF'}`);
}
console.log(out.join('\n') + `\n${bad ? 'FAIL' : 'ALL SAME'} (${out.length} runs, 30 days each)`);
