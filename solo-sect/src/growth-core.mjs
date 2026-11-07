// N42: the combat substrate has three outputs: front time, reaction time, force.
// Physical skill sets a floor; art tier sets reachable force; hand/eye history
// moves the current timing toward those floors.
import { TIERS } from './data.mjs';
import { curveMulOf } from './artcard.mjs';

export const bodyFloor = (start, skill, tier, bodyScale, artReach = 1) => start / (1 + skill / bodyScale + Math.max(0, tier) * artReach);
export const approachedTime = (start, floor, residual) => floor + (start - floor) * residual;
export const reactionTime = (floor, span, half, seen, possibilities = 1) => floor + possibilities * span * half / (half + seen);
export const forceTarget = (art, xp) => curveMulOf(art?.curve, TIERS.reduce((tier, [at], i) => xp >= at ? i : tier, 0)) / (art?.bestDps || 1);
