// Real committed models only. No hand-written state or synthetic resource loop.
import * as Official from '../../experiments/water-carry/demo/model.mjs';
import * as OfficialRoutes from '../../experiments/water-carry/demo/routes.mjs';
import * as OfficialWater from '../../experiments/water-carry/demo/water-layout.mjs';
import * as Gemini from '../sources/gemini/sect-chronicle/experiments/water-carry/demo/model.mjs';
import * as GeminiRoutes from '../sources/gemini/sect-chronicle/experiments/water-carry/demo/routes.mjs';
import * as GeminiWater from '../sources/gemini/sect-chronicle/experiments/water-carry/demo/water-layout.mjs';
export const GEMINI_SHA = 'bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9';
export function createGeminiCore(fixed = false) {
  const M = fixed ? Gemini : Official, R = fixed ? GeminiRoutes : OfficialRoutes, W = fixed ? GeminiWater : OfficialWater;
  const geometry = R.createRoutes(W.WATER_POINTS), r1 = (x) => Math.round(x * 10) / 10;
  const lengths = { water: W.WATER_LENGTH, herb: r1(geometry.routes.herb.length), seat: geometry.seatLengths, fun: geometry.funLengths,
    boar: { edge: r1(geometry.boarLengths.edge), total: r1(geometry.boarLengths.total), seen: geometry.boarSeenD }, guard: r1(geometry.guardLength),
    drink: r1(geometry.drinkLengths.home), drinkSeat: { hero: r1(geometry.drinkLengths.seat.hero), cousin: r1(geometry.drinkLengths.seat.cousin) } };
  const sense = { placeOf: geometry.of, boarAt: geometry.boarAt, meetLengths: geometry.meetLengths, trainLengths: geometry.trainLengths, teaLength: geometry.teaLength,
    woodLength: r1(geometry.woodLength), siteLength: r1(geometry.siteLength), bedLengths: Object.fromEntries(Object.entries(geometry.bedLengths).map(([id, x]) => [id, r1(x)])) };
  return { model: M.createModel(lengths, undefined, undefined, undefined, sense), geometry, lengths, stepMs: M.STEP_MS,
    source: fixed ? `gemini:${GEMINI_SHA}` : 'dev:9ef497e86a5837539cc8e461855695b0fe468dbd:gemini-derived',
    definition: { id: fixed ? 'gemini-fixed' : 'gemini-home', width: W.WORLD_SIZE.w, height: W.WORLD_SIZE.h, layers: [] } };
}
