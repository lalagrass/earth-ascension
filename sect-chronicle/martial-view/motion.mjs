// #181's existing clips and palm overlay, now selected by a small public semantic map.
// Pure projection: phase steps / distance come from the original core. No clock or hit test.
export const STRIKE_TICKS = 12; // existing presentation hold; part of core recovery, never an extra phase
export const SHOULDER = [6.6, -45.6];
export const PALM_POSE = {
  windup: { novice: { base: 'herbHand', lean: -12, elbow: [-8, -33], hand: [-14, -26], palm: -70 }, adept: { base: 'herbHand', lean: -3, elbow: [1, -36], hand: [-1, -31], palm: -85 } },
  strike: { novice: { base: 'herbGather', lean: 0, shoulder: [10.5, -34], elbow: [18, -22], hand: [22, -10], palm: 10 }, adept: { base: 'herbGather', lean: 4, shoulder: [10.5, -34], elbow: [19, -21], hand: [24, -9], palm: 0 } },
  recover: { novice: { base: 'herbHand', lean: -6, elbow: [2, -30], hand: [8, -24], palm: -40 }, adept: { base: 'herbHand', lean: 0, elbow: [6, -34], hand: [12, -32], palm: -90 } },
};
export const ACTIONS = {
  'life.walk': { travel: { clip: 'herbOut' } },
  'life.water': { down: { clip: 'down' }, up: { clip: 'up' } },
  'life.load': { travel: { clip: 'herbBack' } },
  'martial.basic-palm': { windup: { clip: 'herbDeliver', fx: 'vector-palm' }, strike: { clip: 'herbGather', fx: 'vector-palm' }, recover: { clip: 'herbDeliver', fx: 'vector-palm' }, breath: { clip: 'stretch' } },
};
export function motionIntent(p) {
  const c = p.mode === 'train' ? p.train01?.cyc : null;
  const wind = ['windup', 'patrolWind'].includes(p.mode), rec = ['recover', 'patrolRec'].includes(p.mode);
  if (c || wind || rec) {
    const corePhase = c?.phase || (wind ? 'windup' : 'recover'), steps = c?.steps ?? p.palmStep?.steps;
    if (steps == null) return { actionId: 'unsupported', phase: 'static', corePhase };
    return { actionId: 'martial.basic-palm', phase: corePhase === 'recover' && steps < STRIKE_TICKS ? 'strike' : corePhase, corePhase, steps };
  }
  if (p.mode === 'carry') {
    const ph = p.phase?.name;
    if (['down', 'up'].includes(ph)) return { actionId: 'life.water', phase: ph, corePhase: ph };
    if (['herbOut', 'woodOut'].includes(ph)) return { actionId: 'life.walk', phase: 'travel', corePhase: ph };
    if (['herbBack', 'woodBack'].includes(ph)) return { actionId: 'life.load', phase: 'travel', corePhase: ph };
  }
  if (['toTrain', 'fromTrain', 'toRat', 'fromRat', 'patrolGo', 'patrolBack', 'patrolStep'].includes(p.mode)) return { actionId: 'life.walk', phase: 'travel', corePhase: p.mode };
  return null; // unrelated existing poses retain their own path
}
export function resolveMotion(p, { animator, skin = {}, at, anchor = { x: .5, y: 1 }, intent = motionIntent(p) } = {}) {
  if (!intent) return null;
  const binding = skin.clips?.[intent.actionId]?.[intent.phase] || ACTIONS[intent.actionId]?.[intent.phase];
  const palm = intent.actionId === 'martial.basic-palm' && intent.phase !== 'breath' ? PALM_POSE[intent.phase]?.[p.palm] : null;
  const missingSkill = intent.actionId === 'martial.basic-palm' && !Object.hasOwn(PALM_POSE.windup, p.palm);
  const clip = !binding || missingSkill ? 'idle' : binding.clip;
  const pick = animator.pick({ phase: clip, k: p.phase?.k || 0, travelled: intent.actionId === 'martial.basic-palm' ? 0 : at.travelled || 0 }, { grown: p.tripLevel >= 3 });
  const fallback = !binding || missingSkill || pick.fallback;
  const sockets = skin.attach?.[pick.frame];
  const held = sockets && skin.anchorPx ? Object.fromEntries(Object.entries(sockets).map(([id, xy]) => [id,
    [(xy[0] - skin.anchorPx.x) / Number(skin.scale || 1), (xy[1] - skin.anchorPx.y) / Number(skin.scale || 1)]])) : {};
  return { x: at.x, y: at.y, face: at.face, ...pick, phase: p.mode, travelled: at.travelled || 0,
    palm: missingSkill ? null : palm, borrowed: !!palm,
    motion: { ...intent, clip: pick.action, requestedClip: clip, fx: !missingSkill && palm ? binding.fx : null,
      face: at.face, anchor: { ...anchor },
      attachments: { foot: [0, 0], shoulder: palm ? [...(skin.palmShoulder?.[palm.base] || palm.shoulder || SHOULDER)] : null,
        ...held },
      availability: fallback ? 'unsupported' : 'known', fallback: fallback ? '使用靜態／通用動作；缺技能不授予，缺圖不推定命中' : palm ? '掌法借既有底圖＋向量手臂；strike 是核心收勢內的出掌定格' : null,
    } };
}
