import { COMPANIONS, DISCIPLES } from './data.mjs';
import { XIA_T } from './wuxia.mjs';

// N49: visual identity is metadata. Saved actor sprite values stay as before, so art changes do not alter golden.
const femaleIds = new Set([
  ...Object.entries(COMPANIONS).filter(([, def]) => def.fem).map(([id]) => id),
  ...DISCIPLES.filter((def) => def.fem).map((def) => def.id),
  ...Object.entries(XIA_T).filter(([, def]) => def.fem).map(([id]) => id),
]);
export const visualSpriteOf = (d) => femaleIds.has(d.id) ? 'sister' : d.sprite;
export const isFemaleVisual = (d) => femaleIds.has(d.id);
