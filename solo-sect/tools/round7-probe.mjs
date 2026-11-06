// 第七輪固定分位數探針：100 個反應樣本，同一位化境弟子對鼠一隻、對四名同時起手的山賊。
// node tools/round7-probe.mjs [solo-sect 目錄]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = pathToFileURL(path.resolve(process.argv[2] || here)).href;
const { createState } = await import(root + '/src/sim.mjs');
const { resolveSwing } = await import(root + '/src/arts.mjs');
const master = (s) => {
  const d = s.ds[0]; d.arts.basicFist = { xp: 150, bt1: true, bt2: true, bt3: true, bt4: true };
  d.personality = ['quiet']; d.wu = 6; d.skills.agility = 60; d.qi = 100;
  return d;
};
let ratRead = 0, bandHit = 0;
for (let i = 0; i < 100; i++) {
  const q = (i + 0.5) / 100;
  { const s = createState(3), d = master(s), rat = { uid: 'rat', k: 'rat', hp: 10, pos: [d.pos[0] + 20, d.pos[1]] };
    if (resolveSwing(s, rat, d, () => q, { wind: 0.54 }).kind === 'read') ratRead++; }
  { const s = createState(3), d = master(s);
    for (let j = 0; j < 4; j++) { const b = { uid: `bandit${j}`, k: 'bandit', i: j, agi: [20, 30, 45, 55][j], hp: 50, pos: [d.pos[0] + 20, d.pos[1]] };
      if (resolveSwing(s, b, d, () => q, { wind: 1.125 }).kind === 'hit') bandHit++; } }
}
console.log(JSON.stringify({ ratIntercept: `${ratRead}/100`, fourBanditHit: `${bandHit}/400` }));
