// 純顯示轉接：只讀N33手熟、既有身體／需求，不產生或回寫成長。
import { handUses, practiceResidual, practiceWindow } from './practice.mjs';
import { bodyMove } from './starter-combat.mjs';
export const PLAYBACK = Object.freeze({ pause: .5, uprightHip: 17, deepHipRatio: .5, tilt: 30, sway: 4, bodyScale: 10, legacyStart: .5 });
export function playbackParams(d, art=null, timing={}) {
  const move=art?.tech || (d?.bare?'bodyPunch':d?.moves?.[0]) || 'bodyPunch';
  const start=bodyMove(move)?.wind || PLAYBACK.legacyStart;
  const window=practiceWindow(d,move,start,{tier:timing.tier||0,skill:bodyMove(move)?.skill==='strength'?'strength':'agility'});
  const wind=timing.wind??window.wind;
  const residual=practiceResidual(handUses(d,move));
  const stance=practiceResidual(handUses(d,'bodyPush'));
  const agility=d?.skills?.agility||0;
  const pause=PLAYBACK.pause*residual;
  return {move,wind,pause,formSeconds:4*wind+pause,
    hipHeight:PLAYBACK.uprightHip*(PLAYBACK.deepHipRatio+(1-PLAYBACK.deepHipRatio)*stance),
    sway:PLAYBACK.sway*stance/(1+agility/PLAYBACK.bodyScale),
    chopPause:PLAYBACK.pause*practiceResidual(handUses(d,'work:chop')),
    waterTilt:PLAYBACK.tilt*practiceResidual(handUses(d,'work:water'))/(1+agility/PLAYBACK.bodyScale)};
}
