/* v2.2（loop143）：規則轉正為底層、開局三選項、新基準 golden-30d-v22。#390 起照舊開局與舊檔也一律現行規則 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createState, tick, save } from '../src/sim.mjs';
import { load, BASELINE_V22 } from '../src/save.mjs';
import { RULES, buildSpec } from '../src/start-ui.mjs';
import { defaultStats } from '../src/hero.mjs';
import { DAY, RULES_VERSION } from '../src/data.mjs';
const FIX = new URL('./fixtures/', import.meta.url);
const FLAG = { comprehend: 'wu7', peace: 'm9' };
const base = (tab) => ({ tab, hero: 'guojing', comp: null, name: '測', stats: defaultStats(), ans: Array(9).fill(0), ask: true });
export const V22_GOLDEN_SPEC = { kind: 'template', id: 'guojing', askMajor: false, xiaStyle: 'all', v22: true, steward: true, stewkit: true, stewyard: true };
// #390：世代旗標 v22／v23／v24 收進規則版本 2.4；狀態上不再有這三個鍵
// #390 part 2：30 個規則開關（2.5）也不在狀態上；勇名 valor 是數值狀態
const noSwitch = (s) => Object.keys(BASELINE_V22).every((k) => k === 'valor' ? typeof s.valor === 'number' : k === 'jhev' ? s.jhev !== true : !((FLAG[k] || k) in s));
const curRules = (s) => s.rules === RULES_VERSION && noSwitch(s) && !['v22', 'v23', 'v24'].some((k) => k in s) && s.ds.every((d) => !('v23' in d) && !('v24' in d));
const hash = (s) => crypto.createHash('sha256').update(save(s)).digest('hex').slice(0, 16);

test('BASELINE_V22 涵蓋擁有人點名的 30 條規則', () => {
  const want = 'grow growdr neigong ngshield prof laborgrow valor valormid rumor readwu comprehend mentor mpool cotrain cofun paypill longwatch masterask letterask cropcare mfit jhrefuse qshare jhui jhev peace lairpow lift bt25 draw'.split(' ');
  assert.deepEqual(Object.keys(BASELINE_V22).sort(), want.sort());
});
test('開局江湖規則只剩 1 個勾選框（執事自動營建）＋重大抉擇＋名俠池畫風', () => {
  assert.equal(RULES.length, 1); assert.equal(RULES[0][0], 'steward'); assert.match(RULES[0][4], /執事自動營建/);
  const src = fs.readFileSync(new URL('../src/start-ui.mjs', import.meta.url), 'utf8');
  const fs0 = src.slice(src.indexOf('<fieldset class="rules">'), src.indexOf('</fieldset>'));
  assert.match(fs0, /st-xia/); assert.match(fs0, /st-ask/); assert.match(fs0, /RULES\.map/);
});
for (const tab of ['classic', 'custom']) {
  test(`${tab}：新局底層規則全開、執事三項全開`, () => {
    const s = createState(7, buildSpec(base(tab))); assert.ok(curRules(s));
    for (const k of ['steward', 'stewkit', 'stewyard']) assert.ok(s[k], k); assert.equal(s.askMajor ?? true, true);
  });
  test(`${tab}：取消執事自動營建 → 執事三項全關，底層照開`, () => {
    const s = createState(7, buildSpec({ ...base(tab), steward: false }));
    for (const k of ['steward', 'stewkit', 'stewyard']) assert.ok(!s[k], k);
  });
}
test('照舊分頁、不帶 spec 也套用現行規則（#390，擁有人 2026-11-02）', () => {
  assert.equal(buildSpec({ ...base('plain') }), null);
  for (const s of [createState(7), createState(7, null)]) { assert.ok(curRules(s)); assert.equal(s.hero, null); }
});
// #390 退役：「A/B 用：明寫 false 可關單條」— 擁有人 2026-11-02 決定規則開關全刪
const files = fs.readdirSync(FIX).filter((f) => /^v[\d.]+\.json$/.test(f));
for (const f of files) test(`${f}：舊檔讀入升到現行規則（#390）`, () => {
  const r = load(fs.readFileSync(new URL(f, FIX), 'utf8')); assert.ok(r.ok, f); const s = r.state; for (let i = 0; i < 600 * 4; i++) tick(s, 0.25);
  assert.ok(curRules(s));
});
test('新基準 golden-30d-v22（全開規則、郭靖模板、自動抉擇）', () => {
  const a = createState(42, V22_GOLDEN_SPEC); for (let i = 0; i < 30 * DAY * 4; i++) tick(a);
  const g = new URL('golden-30d-v22.txt', FIX); const want = fs.existsSync(g) ? fs.readFileSync(g, 'utf8').trim() : null;
  if (process.env.UPDATE_GOLDEN_V22 || !want) fs.writeFileSync(g, hash(a) + '\n'); else assert.equal(hash(a), want, '規則有意改變時以 UPDATE_GOLDEN_V22=1 重產（舊 golden-30d.txt 不動）');
});
