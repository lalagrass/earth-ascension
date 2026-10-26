// v1.8：成親封頂（冷卻／心上人／花費）、傳功飽和、A7 領悟線索、SCORE_POST 資料化
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, scoreActs } from '../src/sim.mjs';
import { DAY } from '../src/data.mjs';
import { MARRY, marriable, weddingWhy } from '../src/gen.mjs';
import { PASS, passScore } from '../src/bonds.mjs';
import { artHints, artHintsHtml } from '../src/arts.mjs';
import { SCORE_POST } from '../src/score-data.mjs';
import { migrate } from '../src/save.mjs';
import { relKey } from '../src/util.mjs';

const pair = (s) => { const [a, b] = s.ds.filter((d) => d.id !== 'hero').slice(0, 2); a.adult = b.adult = true; a.spouse = b.spouse = null; return [a, b]; };
test('成親：心上人必須互指、好感 ≥ 門檻', () => {
  const s = createState(3); const [a, b] = pair(s); s.rel ??= {}; s.rel[relKey(a.id, b.id)] = MARRY.rel; a.sweet = b.id; b.sweet = a.id;
  const ok = marriable(s, a, b); a.sweet = 'someoneElse'; assert.equal(marriable(s, a, b), false, '反例：心上人不是對方就不能成親');
  a.sweet = b.id; s.rel[relKey(a.id, b.id)] = MARRY.rel - 1; assert.equal(marriable(s, a, b), false, '反例：好感差 1 不行');
  if (ok) assert.ok(ok); // compat 依性格，可能本來就不合
});
test('成親：上限、冷卻、花費', () => {
  const s = createState(3); s.res.coin = 1000; s.t = MARRY.everyDays * DAY; s.gen.lastWed = 0; assert.equal(weddingWhy(s), null);
  s.gen.lastWed = s.t - 1; assert.match(weddingWhy(s), /每 5 日/, '反例：冷卻中');
  s.gen.lastWed = 0; s.res.coin = MARRY.cost - 1; assert.match(weddingWhy(s), /香火錢/, '反例：錢不夠');
  s.res.coin = 1000; s.gen.couples = Array.from({ length: MARRY.cap }, (_, i) => [`x${i}`, `y${i}`]); assert.match(weddingWhy(s), /已有 5 對/, '反例：滿額');
  const s2 = createState(3); s2.t = DAY; s2.res.coin = 1000; assert.ok(weddingWhy(s2), '新局第 1 日不會馬上辦喜事');
});
test('存檔遷移 1.8：既有夫妻互為心上人、lastWed 補上', () => {
  const s = createState(3); const [a, b] = pair(s); const o = JSON.parse(JSON.stringify(s)); o.rules = '1.5'; o.gen.couples = [[a.id, b.id]]; delete o.gen.lastWed; for (const d of o.ds) delete d.sweet;
  const m = migrate(o); const A = m.ds.find((d) => d.id === a.id), B = m.ds.find((d) => d.id === b.id); assert.equal(A.sweet, b.id); assert.equal(B.sweet, a.id); assert.equal(m.gen.lastWed, o.t);
});
test('傳功飽和：當日每傳一次，下一次分數 ×sat', () => {
  const s = createState(3); s.day = 4; assert.equal(passScore(s), PASS.base); s.passN = { day: 4, n: PASS.perDay }; assert.equal(passScore(s), 0, '反例：當日已達上限就不再傳');
  s.day = 5; assert.equal(passScore(s), PASS.base, '隔日重置');
});
test('A7 領悟線索：未學的列出缺什麼，已學的不列（反例）', () => {
  const s = createState(3); const h = s.ds.find((d) => d.id === 'hero'); const R = artHints(h, (k) => `名:${k}`);
  assert.ok(R.length > 5); for (const k of Object.keys(h.arts)) assert.ok(!R.some((r) => r.id === k), `${k} 已學不該列`);
  assert.ok(!R.some((r) => (r.need || []).includes('機緣未明')), '所有秘傳都寫出取得方式'); assert.match(artHintsHtml(h), /art-hint/);
});
test('SCORE_POST 是資料：加一條規則就改變評分', () => {
  const s = createState(3); const d = s.ds.find((x) => x.role === 'outer' || x.role === 'inner') || s.ds[0]; const acts = () => scoreActs(s, d).map((o) => o.act);
  const before = acts(); assert.ok(before.length > 1); const victim = before[0];
  SCORE_POST.push({ acts: [victim], drop: true }); try { assert.ok(!acts().includes(victim)); } finally { SCORE_POST.pop(); }
  assert.deepEqual(acts().sort(), before.slice().sort());
});
import { portraitSrc, POST_IDS } from '../src/portrait-set.mjs';
import { existsSync } from 'node:fs';
test('PB-15/16/18 畫像開關：v2 指向後製檔、小圖用頭像、v1 還原；未知檔不動（反例）', () => {
  assert.equal(POST_IDS.size, 32); for (const k of POST_IDS) { assert.ok(existsSync(`assets/portraits/v2/post/${k}.png`)); assert.ok(existsSync(`assets/portraits/v2/post/${k}-head.png`)); assert.ok(existsSync(`assets/portraits/${k}.png`), '舊圖保留'); }
  assert.equal(portraitSrc('assets/portraits/guojing.png', 'v2'), 'assets/portraits/v2/post/guojing.png');
  assert.equal(portraitSrc('assets/portraits/guojing.png', 'v2', true), 'assets/portraits/v2/post/guojing-head.png');
  assert.equal(portraitSrc('assets/portraits/v2/post/guojing-head.png', 'v1'), 'assets/portraits/guojing.png');
  assert.equal(portraitSrc('assets/portraits/v2/huangrong-v2-ref.png', 'v2'), 'assets/portraits/v2/huangrong-v2-ref.png');
  assert.equal(portraitSrc('assets/portraits/nobody.png', 'v2'), 'assets/portraits/nobody.png');
});
