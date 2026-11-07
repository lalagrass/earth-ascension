import test from 'node:test';
import assert from 'node:assert/strict';
import { TREES, destinyStep } from '../../../src/data.mjs';
import { CARDS as huashanCards } from '../../../src/wuxia.mjs';
import { CARDS as jianghuCards } from '../../../src/jianghu.mjs';

// One data-row contract covers each named protagonist's declarative plot triggers.
test('all destiny rows have reachable triggers and their declared card or arc outcomes', () => {
  const cards = { ...huashanCards, ...jianghuCards };
  for (const [hero, steps] of Object.entries(TREES.arcs)) {
    assert.ok(steps.length > 0 && steps.every((step) => typeof step === 'string' && step.length), hero);
  }
  for (const [hero, rows] of Object.entries(TREES.checks)) {
    assert.ok(TREES.arcs[hero], `missing arc for ${hero}`);
    for (const [index, row] of rows.entries()) {
      const label = `${hero}[${index}]`;
      assert.ok(row.arc[0] < row.arc[1], `${label}: empty trigger window`);
      if (row.card) assert.ok(cards[row.card], `${label}: missing card ${row.card}`);
      for (const [step, title] of row.then || []) {
        assert.ok(TREES.arcs[hero][step - 1] && title, `${label}: missing arc outcome`);
      }
      const point = Array.from({ length: row.arc[1] - row.arc[0] }, (_, i) => row.arc[0] + i)
        .find((n) => !rows.slice(0, index).some((prior) => n >= prior.arc[0] && n < prior.arc[1]));
      assert.notEqual(point, undefined, `${label}: shadowed by earlier trigger`);
      const state = {
        day: row.day ?? 1,
        hero: { arcStep: point, ...(row.flag ? { [row.flag]: true } : {}) },
        jh: {},
      };
      const fired = [], advanced = [];
      const ctx = {
        d0: {},
        artTier: () => row.art?.[1] ?? 1,
        card: (_s, card, force) => { fired.push([card, !!force]); return true; },
        arc: (_s, id, step, title) => advanced.push([id, step, title]),
      };
      const result = destinyStep(state, hero, ctx);
      assert.equal(result, !!row.card, `${label}: trigger result`);
      assert.deepEqual(fired, row.card ? [[row.card, !!row.force]] : [], `${label}: card outcome`);
      assert.deepEqual(advanced, (row.then || []).map(([step, title]) => [hero, step, title]), `${label}: arc outcome`);
      if (row.day != null) {
        state.day = row.day - 1; fired.length = advanced.length = 0;
        destinyStep(state, hero, ctx);
        assert.deepEqual([fired, advanced], [[], []], `${label}: day gate`);
        state.day = row.day;
      }
      if (row.flag) {
        state.hero[row.flag] = false; fired.length = advanced.length = 0;
        destinyStep(state, hero, ctx);
        assert.deepEqual([fired, advanced], [[], []], `${label}: flag gate`);
        state.hero[row.flag] = true;
      }
      if (row.unless) {
        state.jh[row.unless] = true; fired.length = advanced.length = 0;
        destinyStep(state, hero, ctx);
        assert.deepEqual([fired, advanced], [[], []], `${label}: excluded by prior outcome`);
      }
    }
  }
  for (const [group, rows] of Object.entries(TREES.cards)) {
    for (const [id, row] of Object.entries(rows)) {
      const card = cards[id];
      assert.ok(card && card.title === row.title, `${group}.${id}: title`);
      assert.equal(card.opts.length, row.opts.length, `${group}.${id}: option count`);
      for (const [i, option] of row.opts.entries()) {
        assert.equal(card.opts[i][0], option.label, `${group}.${id}[${i}]: option`);
        assert.equal(typeof card.opts[i].at(-1), 'function', `${group}.${id}[${i}]: effect`);
      }
    }
  }
});
