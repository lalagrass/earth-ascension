import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANIONS, DISCIPLES } from '../../../src/data.mjs';
import { XIA_T } from '../../../src/wuxia.mjs';
import { visualSpriteOf } from '../../../src/visual-gender.mjs';

test('N49 所有明寫 fem 的既有女角畫面都用女角小人', () => {
  const defs = [
    ...Object.entries(COMPANIONS).map(([id, def]) => ({ id, ...def })),
    ...DISCIPLES,
    ...Object.entries(XIA_T).map(([id, def]) => ({ id, ...def })),
  ];
  for (const d of defs.filter((x) => x.fem)) assert.equal(visualSpriteOf({ id: d.id, sprite: 'senior' }), 'sister', d.id);
  assert.equal(visualSpriteOf({ id: 'guojing', sprite: 'hero' }), 'hero');
});
