// BL-V04 純邏輯檢查（#181）：模板、兩人 sheet、狀態→動作、缺幀退回、換幀只看距離、權威步進與倍率無關。
// 用法（在 experiments/water-carry 下）：node --test template/checks/template.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAnimator, pathTool } from '../animator.mjs';
import { createWalker, createClock, STEP_MS } from '../walker.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const T = read('../actions.json');
const S = { hero: read('../out/hero.json'), cousin: read('../out/cousin.json') };
const scene = read('../../spikes/shared/scene.json');

test('兩人 sheet 照同一份模板：動作齊全或明列 omit，幀數與模板相同', () => {
  for (const [id, ch] of Object.entries(T.characters)) {
    for (const [aid, a] of Object.entries(T.actions)) {
      if (ch.omit.includes(aid)) { assert.equal(S[id].animations[aid], undefined, `${id} 不該有 ${aid}`); continue; }
      assert.equal(S[id].animations[aid].length, a.poses.length, `${id}.${aid} 幀數`);
      for (const f of S[id].animations[aid]) assert.ok(S[id].frames[f], `${id} 缺幀 ${f}`);
    }
  }
});

test('兩人每一幀同框、同腳底錨點：換幀、換人都不跳', () => {
  const ref = S.hero.frames['idle-0'];
  for (const id of Object.keys(S)) for (const f of Object.values(S[id].frames)) {
    assert.deepEqual(f.sourceSize, ref.sourceSize);
    assert.deepEqual(f.anchor, ref.anchor);
  }
  assert.deepEqual(S.hero.meta.anchorPx, S.cousin.meta.anchorPx);
});

test('負重幀都有扁擔與兩桶掛點，位置在框內', () => {
  for (const id of Object.keys(S)) for (const aid of ['idle', 'walkEmpty', 'walkLoaded']) for (const f of S[id].animations[aid]) {
    const at = S[id].meta.attach[f];
    assert.ok(at, `${id} ${f} 沒有掛點`);
    for (const p of Object.values(at)) assert.ok(p[0] >= 0 && p[1] >= 0 && p[0] <= S[id].meta.frameSize.w && p[1] <= S[id].meta.frameSize.h, `${id} ${f} 掛點出框`);
  }
});

test('狀態→動作：同一 phase 條件多的先比；缺幀依 fallback 退回並標出', () => {
  const h = createAnimator(T, S.hero), c = createAnimator(T, S.cousin);
  const up = { phase: 'up', k: .3, travelled: 0 };
  assert.equal(h.pick(up).action, 'walkLoaded');
  assert.equal(h.pick(up, { grown: true }).action, 'walkGrown');
  const cg = c.pick(up, { grown: true });
  assert.deepEqual([cg.requested, cg.action, cg.fallback], ['walkGrown', 'walkLoaded', true]);
  const hr = h.pick({ phase: 'rest', k: 0, travelled: 0 });
  assert.deepEqual([hr.requested, hr.action, hr.fallback], ['rest', 'idle', true]);
  assert.equal(c.pick({ phase: 'rest', k: 0, travelled: 0 }).action, 'rest');
  assert.equal(h.pick({ phase: '不存在', k: 0, travelled: 0 }).action, 'idle');
});

test('循環動作的幀號只由走了多遠決定，兩人在同一距離顯示同一個幀號', () => {
  const h = createAnimator(T, S.hero), c = createAnimator(T, S.cousin);
  const stride = T.actions.walkEmpty.stride;
  for (let i = 0; i < 9; i++) {
    const v = { phase: 'down', k: 0, travelled: i * stride + 0.01 };
    assert.equal(h.pick(v).index, i % 4);
    assert.equal(c.pick(v).index, h.pick(v).index);
  }
  assert.equal(h.pick({ phase: 'dip', k: .7, travelled: 999 }).index, 0, '一次性動作停在第一幀');
});

test('權威步進與畫面幀率、倍率無關：同樣的遊戲時間得到同樣的狀態', () => {
  const path = pathTool(scene.path.points);
  const mk = () => createWalker({ pathLength: path.length });
  const a = mk(), b = mk(), c = mk();
  const ca = createClock({ maxFrameMs: 1e9 }), cb = createClock({ maxFrameMs: 1e9 }), cc = createClock({ maxFrameMs: 1e9 });
  for (let i = 0; i < 600; i++) ca.advance(1000 / 60, 1, () => a.step()); // 60fps×10 秒，1×
  for (let i = 0; i < 150; i++) cb.advance(1000 / 30, 2, () => b.step()); // 30fps×5 秒，2×
  cc.advance(10000, 1, () => c.step()); // 一次補 10 秒
  assert.deepEqual(a.view(), b.view());
  assert.deepEqual(a.view(), c.view());
  assert.equal(a.view().steps, 10000 / STEP_MS);
});

test('一趟走完：下山→取水→上山→倒水；每兩趟歇一次；重來回到起點', () => {
  const path = pathTool(scene.path.points);
  const w = createWalker({ pathLength: path.length });
  const seen = [];
  for (let i = 0; i < 20000; i++) { const p = w.view().phase; if (seen[seen.length - 1] !== p) seen.push(p); w.step(); }
  assert.deepEqual(seen.slice(0, 10), ['down', 'dip', 'up', 'pour', 'down', 'dip', 'up', 'pour', 'rest', 'down']);
  w.reset();
  assert.deepEqual(w.view(), { phase: 'down', k: 0, travelled: 0, trips: 0, steps: 0 });
});
