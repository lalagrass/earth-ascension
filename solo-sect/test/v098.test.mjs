import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../src/sim.mjs';
import { save, load, MIGRATIONS } from '../src/save.mjs';
import { RULES_VERSION, ROUTE } from '../src/data.mjs';
import { secOpen, UNLOCKS, CHAPTER1, autosave, autoList, autoGet, AUTO } from '../src/slice.mjs';
import { cuesFrom } from '../src/audio.mjs';
const run = (s, sec) => { for (let i = 0; i < sec * 4; i++) tick(s); };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('新局只開建造與弟子，10 分鐘內巡山面板必開', () => {
  const s = createState(7); tick(s);
  assert.ok(secOpen(s, 'build') && secOpen(s, 'ds')); assert.ok(!secOpen(s, 'exp') && !secOpen(s, 'ledger'));
  run(s, 480); assert.ok(secOpen(s, 'exp') && secOpen(s, 'codex')); assert.ok(s.log.some((l) => l.msg.includes('【新面板】')));
});
test('解鎖順序單調、不會再鎖回去', () => {
  const s = createState(3); let prev = 0;
  for (let k = 0; k < 10; k++) { run(s, 100); assert.ok(s.unlock.length >= prev); prev = s.unlock.length; }
  assert.equal(prev, UNLOCKS.length);
});
test('第一章三目標達成 → 章節完成、名聲 +5、可繼續', () => {
  const s = createState(5); tick(s); assert.equal(s.chapter.done, false);
  s.records.sect = ROUTE[1].to; const f = Object.values(s.fac); f[0].stage += 2;
  while (s.ds.filter((d) => d.role !== 'laborer').length < 4) s.ds.push({ ...structuredClone(s.ds.find((d) => d.role !== 'laborer')), id: 'x' + s.ds.length, name: '測' + s.ds.length });
  const rep = s.rep; tick(s);
  assert.equal(s.chapter.done, true); assert.equal(s.chapter.seen, false); assert.ok(s.rep >= rep + 5); assert.ok(s.log[0].msg.includes(CHAPTER1.name)); assert.ok(s.chapter.summary.people.length >= 4);
  const t = s.t; run(s, 10); assert.ok(s.t > t); assert.equal(s.rep >= rep + 5, true);
  assert.equal(CHAPTER1.goals.length, 3);
});
test('自動存檔 3 格輪替、可讀回', () => {
  const st = mem(), s = createState(9);
  for (let i = 0; i < 5; i++) { s.t = i * 60; autosave(st, save(s), { day: 1, at: 1000 + i }); }
  const L = autoList(st); assert.equal(L.length, AUTO.keys); assert.equal(L[0].at, 1004);
  const r = load(autoGet(st, L[0].i)); assert.ok(r.ok); assert.equal(r.state.t, 240);
});
test('匯出 JSON 再匯入 = 同一局', () => {
  const s = createState(11); run(s, 300); const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.t, s.t); assert.deepEqual(r.state.res, s.res); assert.deepEqual(r.state.unlock, s.unlock);
  assert.equal(load('{壞掉').ok, false);
});
test('0.97 存檔遷移到 0.98：舊局全面板開放', () => {
  const s = createState(1); const o = JSON.parse(save(s)); o.rules = '0.97'; delete o.unlock; delete o.chapter;
  const r = load(JSON.stringify(o)); assert.ok(r.ok); assert.equal(r.state.unlock.length, UNLOCKS.length); assert.equal(r.state.chapter.done, false);
  assert.equal(MIGRATIONS.at(-1).to, RULES_VERSION); assert.ok(['0.98', '1.0'].includes(RULES_VERSION));
});
test('音效提示由紀事推出', () => {
  const p = {}, s = { fx: [], log: [{ msg: 'x' }] }; cuesFrom(p, s);
  s.log.unshift({ msg: '【新面板】武學圖' }); s.log.unshift({ msg: '甲 衝關成功' }); s.fx.push({ kind: 'move', ttl: 0.6 });
  const c = cuesFrom(p, s); assert.ok(c.includes('hit') && c.includes('breakthrough') && c.includes('unlock'));
  assert.deepEqual(cuesFrom(p, { fx: [], log: s.log }), []);
});
