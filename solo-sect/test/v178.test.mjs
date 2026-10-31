// v1.78：資源總量不變式（每筆 s.res 寫入都來自白名單管道，且期末＝期初＋Σ異動、永不為負）與「閉關不見客」
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startBuild, canRecruit, recruit, startExpedition } from '../src/sim.mjs';
import { DAY, FACILITIES, ACTIVITIES } from '../src/data.mjs';
import { canExpedition } from '../src/world.mjs';

// 3 seeds × 7 開局 × 40 日 稽核得出的全部管道（artifacts/v178/BALANCE-v178.md 有對照帳本缺口）
// loop144：R2 搬檔後檔名前綴更新（gen→sect、expedition→world），管道本身不變
const WHITE = new Set(`coin - sect:checkCouples|coin - threat:raidResolve|food - threat:raidResolve|tiemu + world:finishExpedition|lingshi + world:finishExpedition|tiemu - sim:startBuild|lingshi - sim:startBuild|coin - sim:buyLot|coin - economy:settle|coin - economy:marketDo|coin + economy:marketDo|herb + economy:marketDo|pill - economy:marketDo|pill - economy:agePills|coin - economy:startSchool|coin + world:finishExpedition|coin + jianghu:FX.morning|coin + jianghu:jhStep|coin + sim:payday|coin - jianghu:FX.beggar|coin - sim:startBuild|food + world:finishExpedition|food + sim:doTask|food + sim:trialStep|food - world:startExpedition|food - sect:genResolve|food - jianghu:FX.diao|food - sim:doTask|food - sim:recruit|gall + world:finishExpedition|herb + world:finishExpedition|herb + sim:doTask|herb - jianghu:jhResolve|herb - sim:applyEff|herb - sim:doTask|hide + world:finishExpedition|page1 + world:finishExpedition|page2 + world:finishExpedition|pill + sim:applyEff|pill - sim:applyEff|stone + sim:doTask|stone - sim:doTask|veg + sim:doTask|veg - sim:doTask|water + sim:doTask|water - sim:doTask|wood + world:finishExpedition|wood + sim:doTask|wood - sim:doTask`.split('|'));
function who() { const fr = new Error().stack.split('\n').slice(3); for (const l of fr) { const m = l.match(/at (?:async )?([\w$.]+) \(.*\/src\/(\w+)\.mjs/); if (m && m[2] !== 'util' && !/^(Object|Proxy|Array)\./.test(m[1])) return `${m[2]}:${m[1]}`; } return '?'; }
function audited(seed, op, days) {
  const s = createState(seed, op ? { kind: 'template', id: op, askMajor: false } : null); const raw = s.res, init = { ...raw }, sum = {}, chans = new Set(), neg = [], booked = {}; let L = s.ledger; const L0 = JSON.parse(JSON.stringify(s.ledger)); const addL = (X) => { for (const [k, v] of Object.entries(X.in)) booked[k] = (booked[k] || 0) + v; for (const [k, v] of Object.entries(X.out)) booked[k] = (booked[k] || 0) - v; };
  s.res = new Proxy(raw, { set(t, k, v) { const d = v - (t[k] || 0); if (d) { chans.add(`${k} ${d > 0 ? '+' : '-'} ${who()}`); sum[k] = (sum[k] || 0) + d; } if (!(v >= 0)) neg.push(`${k}=${v}`); t[k] = v; return true; } });
  for (let i = 0; s.t < days * DAY; i++) { tick(s); if (s.ledger !== L) { addL(L); L = s.ledger; } if (i % 40 === 0) { if (!FACILITIES.some((f) => s.fac[f.id]?.site)) for (const f of FACILITIES) if (startBuild(s, f.id)) break; if (canRecruit(s).ok) recruit(s);
    const team = s.ds.filter((d) => d.role !== 'laborer' && d.adult && d.hp > 70).slice(0, 2).map((d) => d.id); if (!s.exp && team.length && canExpedition(s, team).ok && s.t % (3 * DAY) < 10) startExpedition(s, team, { target: 'inf' }); } }
  addL(s.ledger); for (const [k, v] of Object.entries(L0.in)) booked[k] -= v; for (const [k, v] of Object.entries(L0.out)) booked[k] += v; /* 開局前已記的帳 */ return { s, raw, init, sum, chans, neg, booked };
}
for (const [seed, op] of [[3, null], [7, 'weixiaobao'], [11, 'yuebuqun']]) test(`資源不變式：seed ${seed} ${op || 'plain'} 15 日`, () => {
  const { raw, init, sum, chans, neg, booked } = audited(seed, op, 15);
  assert.deepEqual(neg, [], '從未為負');
  const stray = [...chans].filter((c) => !WHITE.has(c)); assert.deepEqual(stray, [], '每筆異動都走白名單管道（新管道請先登記並說明）');
  for (const k of new Set([...Object.keys(init), ...Object.keys(raw)])) assert.ok(Math.abs((init[k] || 0) + (sum[k] || 0) - (raw[k] || 0)) < 1e-6, `${k}：期初＋Σ異動＝期末`);
  for (const k of Object.keys(sum)) assert.ok(Math.abs((booked[k] || 0) - sum[k]) < 1e-6, `${k}：每日帳本 Σ(入−出)＝實際異動（v1.8 補記帳） booked ${booked[k]} vs ${sum[k]}`);
});
test('閉關不見客：冥想中的人不會被拉去聊天／切磋／傳功（v1.78 岳不群修正）', () => {
  const s = createState(11, { kind: 'template', id: 'yuebuqun', askMajor: false }); let pulled = 0, med = 0;
  for (let i = 0; s.t < 12 * DAY; i++) { const before = new Map(s.ds.map((d) => [d.id, d.task])); tick(s);
    for (const d of s.ds) { const t0 = before.get(d.id); if (t0?.act !== 'meditate') continue; if (t0.timer >= ACTIVITIES.meditate.dur) continue; /* loop32：同 tick 打坐已做完再被邀，不算拉走 */ med++; if (d.task !== t0 && d.task?.partner && ['chat', 'spar', 'pass', 'encourage'].includes(d.task.act) && !d.task.lead) pulled++; } }
  assert.ok(med > 100, `med=${med}`); assert.equal(pulled, 0);
});
