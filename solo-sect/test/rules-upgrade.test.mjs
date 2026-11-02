// #390：舊存檔讀入即升到現行規則（擁有人 2026-11-02 選 A）。樣本是各版 commit 實際產生的存檔（test/golden/saves/）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createState, tick, BASELINE_V22 } from '../src/sim.mjs';
import { load, save } from '../src/save.mjs';
import { DAY, RULES_VERSION } from '../src/data.mjs';
import { botDaily } from './harness/bot.mjs';

const DIR = new URL('./golden/saves/', import.meta.url);
const FROM = { 'v1.0.json': 'legacy', 'v1.5.json': 'legacy', 'v1.95.json': 'legacy', 'v2.2.json': 'v2.2', 'v2.3.json': 'v2.3', 'v2.4.json': null };
// 存讀比對：比內容不比鍵順序（讀檔遷移會改鍵的插入順序）；migSteps 是「這次讀檔做了哪幾步」，第二次讀本來就是空的。
const noSteps = (s) => { const o = JSON.parse(save(s)); delete o.migSteps; return o; };
const STATE_KEY = { comprehend: 'wu7', peace: 'm9' };
// 開局畫面新局（v22 spec）在狀態頂層打開的規則旗標＝升級後必須也打開的集合
const fresh = createState(1, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true });
const RULE_FLAGS = Object.keys(BASELINE_V22).map((k) => STATE_KEY[k] || k);
// 世代旗標收進規則版本 2.4（#390），狀態上不留
const noGenFlags = (s) => !['v22', 'v23', 'v24'].some((k) => k in s) && s.ds.every((d) => !('v23' in d) && !('v24' in d));

test('新局本身就有全部規則旗標（對照組）', () => {
  for (const k of RULE_FLAGS) assert.ok(k === 'valor' ? typeof fresh.valor === 'number' : !!fresh[k], k);
  assert.equal(fresh.rules, RULES_VERSION); assert.ok(noGenFlags(fresh));
});

for (const [f, from] of Object.entries(FROM)) test(`舊存檔 ${f} 讀入後是現行規則，跑 20 日不出錯`, () => {
  const r = load(fs.readFileSync(new URL(f, DIR), 'utf8')); assert.ok(r.ok, r.err); const s = r.state;
  for (const k of RULE_FLAGS) assert.ok(k === 'valor' ? typeof s.valor === 'number' : !!s[k], `${f} ${k}`); // jhev 開後會變成狀態物件
  assert.equal(s.rulesUpgradedFrom ?? null, from); assert.equal(s.rules, RULES_VERSION); assert.ok(noGenFlags(s), `${f} 世代旗標已刪`);
  let day = s.day; for (let i = 0; i < 20 * DAY; i++) { tick(s, 1); if (s.alert) s.alert = null; if (s.day !== day) { day = s.day; botDaily(s); } }
  assert.ok(s.ds.length > 0); for (const d of s.ds) { assert.ok(Number.isFinite(d.mood), `${f} ${d.id} mood`); assert.ok(d.pf >= 1 && d.ng >= 1, `${f} ${d.id} 補位`); }
  const again = load(save(s)); assert.ok(again.ok, again.err); assert.equal(again.state.rulesUpgradedFrom ?? null, from, `${f} 再讀不重複升級`); assert.deepEqual(again.state.migSteps, []);
});

test('現行規則存檔不重複升級', () => {
  const s = createState(3, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true }); for (let i = 0; i < 600; i++) tick(s, 1);
  const r = load(save(s)); assert.ok(r.ok); assert.equal(r.state.rulesUpgradedFrom, undefined); assert.deepStrictEqual(noSteps(r.state), noSteps(s));
});
