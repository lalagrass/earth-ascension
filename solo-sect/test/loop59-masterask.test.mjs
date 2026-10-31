// loop59：高人指點誰由我定（s.masterask，預設勾選，僅在「重大抉擇問我」時生效）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { jhevDaily, JHEV } from '../src/jhevents.mjs';
import { resolveChoice, autoPick } from '../src/hero.mjs';
import { RULES } from '../src/start-ui.mjs';
const mk = (x) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, ...x }); s.day = 30; s.choices ??= []; return s; };
const force = (s) => { const P = JHEV.master.p, L = JHEV.letter.p; JHEV.master.p = 1; JHEV.letter.p = 0; try { jhevDaily(s); } finally { JHEV.master.p = P; JHEV.letter.p = L; } };
const xpSum = (d) => Object.values(d.arts || {}).reduce((a, r) => a + r.xp, 0);
test('規則預設勾選', () => assert.equal(RULES.find((r) => r[0] === 'masterask')?.[3], true));
test('開＋問我：出抉擇卡（只列名字與正在練的武學），選誰就指點誰；亂數流與自動版相同', () => {
  const s = mk({ masterask: true }); s.hero.askMajor = true; force(s); const ch = s.choices.find((c) => c.mvisit);
  assert.ok(ch); assert.ok(ch.opts.length >= 1 && ch.opts.length <= 3); assert.match(ch.opts[0], /高人看中/); assert.equal(s.jhev.m, 1);
  const a = mk({ masterask: true }); a.hero.askMajor = false; force(a); assert.ok(!a.choices.some((c) => c.mvisit)); assert.equal(a.jhev.rng, s.jhev.rng);
  const k = ch.opts.length - 1, who = s.ds.find((d) => d.id === ch.who[k]), before = xpSum(who); resolveChoice(s, ch.id, k);
  assert.ok(xpSum(who) > before); assert.ok(!s.choices.some((c) => c.mvisit)); assert.equal(autoPick(s, { mvisit: true }), 0);
});
test('選到的人已下山：退回高人看中的人；都不在就作罷', () => {
  const s = mk({ masterask: true }); s.hero.askMajor = true; force(s); const ch = s.choices.find((c) => c.mvisit);
  for (const id of ch.who) s.ds.find((d) => d.id === id).away = true; const n = s.log.length; resolveChoice(s, ch.id, 0);
  assert.ok(s.log.slice(0, s.log.length - n + 1).some((l) => l.msg.includes('後會有期')));
});
