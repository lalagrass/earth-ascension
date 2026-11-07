// 純顯示轉接：只讀N33手熟、既有身體／需求，不產生或回寫成長。
import { handUses, practiceResidual, practiceWindow, familiarUses, familiarReaction } from './practice.mjs';
import { bodyMove, FOE_ACTIONS } from './starter-combat.mjs';
import { opponents, allies, backToBackPartner, coverFor } from './tactics.mjs';
import { composure, assessLoad, postureMax, qiPow, topTier, hermitageStepActive } from './arts.mjs';
import { CLIFFS } from './data.mjs';

export const PLAYBACK = Object.freeze({ pause: .5, uprightHip: 17, deepHipRatio: .5, tilt: 30, sway: 4, bodyScale: 10, legacyStart: .5 });
// 出自 Phase 5 規格：12／16／18 對應生疏、漸熟、保健圓滿、藥膳破限四種雜務表現。
export function choreFluencyTier(d, act = 'water') {
  const strength = d?.skills?.strength || 0, agility = d?.skills?.agility || 0;
  const body = act === 'water' ? Math.min(strength, agility) : ['chop', 'quarry'].includes(act) ? strength : agility;
  return body < 12 ? 0 : body < 16 ? 1 : body <= 18 ? 2 : 3;
}
// 出自 Phase 6 規格：已悟金雁／少林身法者做活時的垂直軌跡，24px 對齊微距窗 220px 高度；只讀時間。
export function qinggongChoreBounds(d, s = {}, view = {}) {
  const act = view.work === 'walk' ? d?.task?.act : view.work || d?.task?.act;
  const active = hermitageStepActive(d) && ['water', 'chop', 'forage', 'deliver', 'cliffForage1', 'cliffWater', 'cliffTrain', 'waterfallTrain'].includes(act);
  const clock = view.clock ?? s.t ?? 0;
  const onCliff = !!(CLIFFS[d?.task?.node] || CLIFFS[d?.at]);
  const phase = onCliff ? ((clock % 3) + 3) % 3 : ((clock % 2) + 2) % 2;
  return { qinggongLeaping: active, leapArcY: active ? 24 * Math.sin(Math.PI * phase / (onCliff ? 3 : 2)) : 0 }; // 出自 Phase 6 規格：崖上三段動作的空中段最高，平地做活兩段往復。
}
export function cliffLeapStage(d, s = {}, view = {}) {
  const id = CLIFFS[d?.task?.node] ? d.task.node : CLIFFS[d?.at] ? d.at : null;
  if (!id) return null;
  const clock = view.clock ?? s.t ?? 0;
  return { id, phase: ['pushOff', 'air', 'land'][Math.floor(((clock % 3) + 3) % 3)] }; // 出自 Phase 6 規格：蹬壁、提縱、落松枝三段純畫面。
}
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

export function duelExchangeFrame(d, s = {}, view = {}) {
  // 1. 基本對手與圍攻負載（Opponent & Spatial Angle Lock）
  let opponent = view.opponent !== undefined ? view.opponent : null;
  if (opponent === null && s && d) {
    try {
      const opps = opponents(s, d);
      if (opps && opps.length) opponent = opps[0];
    } catch {}
  }

  let allOpponents = [];
  if (view.opponents) {
    allOpponents = view.opponents;
  } else if (s && d) {
    try {
      const opps = opponents(s, d);
      allOpponents = opps && opps.length ? opps : (opponent ? [opponent] : []);
    } catch {
      allOpponents = opponent ? [opponent] : [];
    }
  } else if (opponent) {
    allOpponents = [opponent];
  }

  const angleLockCount = view.angleLockCount ?? allOpponents.length;

  let loadL = view.loadL ?? view.L;
  if (loadL == null) {
    if (s?.ds) {
      try {
        const al = assessLoad(s, d);
        loadL = al?.L != null ? al.L : Math.min(1.2, angleLockCount * 0.35);
      } catch {
        loadL = Math.min(1.2, angleLockCount * 0.35);
      }
    } else {
      loadL = Math.min(1.2, angleLockCount * 0.35);
    }
  }
  loadL = Math.max(0, Math.min(1.5, Number(loadL) || 0));

  // 2. 閃避代價與原地擺頭反擊（Dodge Cost & Head-Slip Counter）
  const agility = d?.skills?.agility || 0;
  let usedRatio = view.usedRatio;
  if (usedRatio == null) {
    if (opponent) {
      try {
        const foeWind = opponent?.swing?.wind || FOE_ACTIONS[opponent?.k]?.moves?.[0]?.wind || 0.45;
        const foeMove = opponent?.swing?.mv || 'bodyPunch';
        const reaction = familiarReaction(d, opponent, foeMove, s?.codex || {});
        usedRatio = reaction / (foeWind || 0.45);
      } catch {
        usedRatio = 0.5;
      }
    } else {
      usedRatio = 0.5;
    }
  }

  let dodgeTier;
  if (view.dodgeTier && loadL < 0.8) {
    dodgeTier = view.dodgeTier;
  } else if (loadL >= 0.8 || angleLockCount >= 3) {
    dodgeTier = 'scramble';
  } else if (loadL >= 0.4 || angleLockCount === 2) {
    dodgeTier = 'sideStep';
  } else if (loadL < 0.4 && (usedRatio < 0.4 || agility >= 25)) {
    dodgeTier = 'headSlip';
  } else {
    dodgeTier = 'sideStep';
  }

  const headTiltDeg = dodgeTier === 'headSlip' ? 15 : (dodgeTier === 'sideStep' ? 6 : -12);
  const footShiftPx = dodgeTier === 'headSlip' ? 0 : (dodgeTier === 'sideStep' ? -8 : -18);

  // 3. 四維武道遙測（Four-Dimensional Combat Telemetry）
  let postureRatio = view.postureRatio;
  if (postureRatio == null) {
    try {
      const pMax = postureMax(d);
      const pCur = d?.posture != null ? d.posture : pMax;
      postureRatio = pMax > 0 ? Math.max(0, Math.min(1, pCur / pMax)) : 1;
    } catch {
      postureRatio = 1;
    }
  }

  let oppPostureRatio = 1;
  if (opponent) {
    try {
      const oppPMax = postureMax(opponent);
      const oppPCur = opponent?.posture != null ? opponent.posture : oppPMax;
      oppPostureRatio = oppPMax > 0 ? Math.max(0, Math.min(1, oppPCur / oppPMax)) : 1;
    } catch {
      oppPostureRatio = 1;
    }
  }

  let qiRatio = view.qiRatio;
  if (qiRatio == null) {
    try {
      const qp = qiPow(d);
      qiRatio = Math.max(0, Math.min(1, (d?.neigong?.level || 0) / 10 + (qp > 1 ? (qp - 1) * 0.5 : 0)));
    } catch {
      qiRatio = 0;
    }
  }

  const contact = view.contact || null;
  const depth = view.depth ?? contact?.depth;
  const blocked = view.blocked ?? contact?.blocked ?? (d?.ring && !d.ring.intercept && s?.t && (s.t - d.ring.t < 1.5));
  const shallowOrBlocked = (blocked === true) || (depth !== undefined && depth < 0) || (contact && !contact.injured);

  let microShiverPx = 0;
  if (shallowOrBlocked) {
    microShiverPx = 3.0;
  }

  const reboundShock = Boolean(
    view.rebound === true ||
    (view.guard && view.force && view.guard > view.force * 1.4) ||
    (d?.arts?.jiuyang && (view.blocked || view.shallow)) ||
    (Array.isArray(s?.fx) && s.fx.some((fx) => (fx.word === '震' || (typeof fx.text === 'string' && fx.text.includes('震')))))
  );

  let composureMax = 1.0;
  try {
    composureMax = composure(d) || 1.0;
  } catch {
    composureMax = 1.0;
  }

  const rawFret = view.fret ?? d?.fret ?? 0;
  const fretRatio = Math.max(0, Math.min(1, rawFret / (composureMax || 1)));

  const isRaging = Boolean(
    view.isRaging ||
    d?.raging ||
    (d?.rageUntil && s?.t != null && d.rageUntil > s.t) ||
    fretRatio >= 1
  );

  const instantCounterPalm = !isRaging && Boolean(
    dodgeTier === 'headSlip' &&
    loadL < 0.5 &&
    view.canCounter !== false &&
    (view.canCounter === true || (Boolean(opponent) && (usedRatio < 0.35 || (view.usedRatio == null && agility >= 28 && (opponent?.skills?.agility || 0) < 20 && !opponent?.arts))))
  );

  let flawWindow;
  if (view.flawWindow) {
    flawWindow = { open: false, part: null, progress: 0, ...view.flawWindow };
  } else {
    let swingProgress = 0;
    const foeSwing = opponent?.swing || opponent?.bswing;
    if (foeSwing) {
      if (foeSwing.t != null && foeSwing.wind) {
        swingProgress = foeSwing.t / foeSwing.wind;
      } else if (foeSwing.at != null && foeSwing.wind && s?.t != null) {
        swingProgress = Math.max(0, Math.min(1, (s.t - (foeSwing.at - foeSwing.wind)) / foeSwing.wind));
      }
    }
    let agilityOk = false;
    try {
      agilityOk = agility >= 20 || (d?.arts ? topTier(d).t >= 2 : false) || (d?.dugu?.length || 0) > 0;
    } catch {
      agilityOk = agility >= 20;
    }
    const isOpen = Boolean(
      d?.sure ||
      d?.ring?.intercept ||
      view.flawOpen ||
      (foeSwing && (foeSwing.wind || 0) > 0 && swingProgress >= 0.7 && agilityOk)
    );
    const part = isOpen ? (view.flawPart || (d?.dugu?.length ? 'hand' : 'eye')) : null;
    const progress = isOpen ? (view.flawProgress ?? (swingProgress > 0 ? swingProgress : 1)) : 0;
    flawWindow = { open: isOpen, part, progress };
  }

  // 4. 五大交鋒模式與絕學異象分類（Exchange Mode & Signature Flair）
  const clashSparks = view.clashSparks != null ? Boolean(view.clashSparks) : Boolean(microShiverPx > 0 || view.blocked);

  let exchangeMode;
  if (view.exchangeMode) {
    exchangeMode = view.exchangeMode;
  } else if (!opponent) {
    exchangeMode = 'idle';
  } else if (isRaging) {
    exchangeMode = 'rageAllOut';
  } else if (dodgeTier === 'scramble') {
    exchangeMode = 'scrambleDefense';
  } else if (flawWindow.open) {
    exchangeMode = 'flawStrike';
  } else if (instantCounterPalm) {
    exchangeMode = 'headSlipCounter';
  } else {
    let isMaster = false;
    try {
      const selfTop = d?.arts ? topTier(d).t : -1;
      const oppTop = opponent?.arts ? topTier(opponent).t : -1;
      isMaster = selfTop >= 2 || agility >= 22 || oppTop >= 2 || ((opponent?.skills?.agility || 0) >= 22);
    } catch {
      isMaster = agility >= 22 || ((opponent?.skills?.agility || 0) >= 22);
    }
    if (isMaster) {
      exchangeMode = 'masterStandoff';
    } else {
      exchangeMode = 'rookiePecking';
    }
  }

  const witchSlowMo = Boolean(view.witch || (s?.witch && (Array.isArray(s.witch) ? s.witch.length > 0 : true)));

  let zjEffect;
  if (view.zjEffect) {
    zjEffect = view.zjEffect;
  } else if ((d?.dugu && d.dugu.length > 0) || Boolean(d?.arts?.dugu)) {
    zjEffect = 'dugu';
  } else if (Boolean(d?.arts?.kuihua || d?.arts?.bixie || s?.hs?.bixie === 3)) {
    zjEffect = 'kuihua';
  } else if (Boolean(d?.arts?.taiji || d?.arts?.taijiSword)) {
    zjEffect = 'taiji';
  } else if (Boolean(d?.arts?.jiuyang || reboundShock)) {
    zjEffect = 'jiuyang';
  } else {
    zjEffect = 'none';
  }

  return {
    opponent,
    allOpponents,
    angleLockCount,
    loadL,
    usedRatio,
    dodgeTier,
    headTiltDeg,
    footShiftPx,
    instantCounterPalm,
    postureRatio,
    oppPostureRatio,
    qiRatio,
    reboundShock,
    composureMax,
    fretRatio,
    isRaging,
    flawWindow,
    clashSparks,
    microShiverPx,
    exchangeMode,
    witchSlowMo,
    zjEffect
  };
}

export function crowdSynergyFrame(d, s = {}, view = {}) {
  // 0. Base duel info
  const duel = view.duel || duelExchangeFrame(d, s, view);

  // 1. 實力差距與群攻割草（Power Gap & Crowd Mow-Down）
  let selfPower = view.selfPower;
  if (selfPower == null) {
    let tierBonus = 0;
    try {
      if (d?.arts) {
        const tt = topTier(d);
        if (tt && tt.t >= 0) tierBonus = (tt.t + 1) * 22;
      }
    } catch {}
    let qp = 0;
    try {
      qp = qiPow(d) || 0;
    } catch {}
    selfPower = (d?.skills?.strength || 10) + (d?.skills?.agility || 10) + tierBonus + qp;
  }

  const multiFoeCount = Math.max(
    duel.angleLockCount || 0,
    duel.allOpponents?.length || 0,
    view.multiFoeCount || 0
  );

  let avgFoePower = view.avgFoePower;
  if (avgFoePower == null) {
    const enemies = duel.allOpponents && duel.allOpponents.length > 0
      ? duel.allOpponents
      : (duel.opponent ? [duel.opponent] : []);
    if (enemies.length === 0) {
      avgFoePower = selfPower;
    } else {
      let sum = 0;
      for (const foe of enemies) {
        let foeTierBonus = 0;
        try {
          if (foe?.arts) {
            const tt = topTier(foe);
            if (tt && tt.t >= 0) foeTierBonus = (tt.t + 1) * 20;
          }
        } catch {}
        const defaultBase = foe?.k === 'rat' ? 8 : (foe?.k === 'bandit' ? 18 : 25);
        const artOrBase = foe?.arts ? foeTierBonus : defaultBase;
        sum += (foe?.skills?.strength || 10) + (foe?.skills?.agility || 10) + artOrBase;
      }
      avgFoePower = sum / enemies.length;
    }
  }

  const powerGapRatio = view.powerGapRatio ?? (avgFoePower > 0 ? selfPower / avgFoePower : 1);

  let crowdMode;
  if (view.crowdMode) {
    crowdMode = view.crowdMode;
  } else if (!duel.opponent && multiFoeCount === 0) {
    crowdMode = 'none';
  } else if (
    view.blindAllEyes === true ||
    (multiFoeCount >= 2 && powerGapRatio >= 1.8 && (duel.zjEffect === 'dugu' || duel.zjEffect === 'kuihua'))
  ) {
    crowdMode = 'blindAllEyes';
  } else if (view.mowDown === true || powerGapRatio >= 2.2) {
    crowdMode = 'walkPastKnockdown';
  } else if (multiFoeCount >= 2 && powerGapRatio >= 1.35) {
    crowdMode = 'whirlwindSweep';
  } else {
    crowdMode = 'none';
  }

  const knockedDownCount = (crowdMode === 'walkPastKnockdown' || crowdMode === 'blindAllEyes')
    ? Math.max(1, multiFoeCount || 3)
    : 0;

  // 2. 伴侶雙劍合璧、陣法合擊與地形掩體（Partner, Formation & Cover Synergy）
  let allyList = [];
  if (view.allies) {
    allyList = view.allies;
  } else if (s && d) {
    try {
      allyList = allies(s, d) || [];
    } catch {
      allyList = [];
    }
  }

  let partner = null;
  if (view.partner !== undefined) {
    partner = view.partner;
  } else {
    if (s?.gen?.couples && d?.id) {
      const couplePair = s.gen.couples.find((c) => Array.isArray(c) && c.includes(d.id));
      if (couplePair) {
        const otherId = couplePair.find((id) => id !== d.id);
        partner = allyList.find((a) => a.id === otherId)
          || (s.ds || []).find((x) => x.id === otherId && !x.gone && !x.away && (x.hp ?? 1) > 0)
          || null;
      }
    }
    if (!partner && d?.arts?.yunv) {
      partner = allyList.find((a) => a?.arts?.yunv) || null;
    }
    if (!partner && s && d) {
      try {
        partner = backToBackPartner(s, d) || null;
      } catch {}
    }
    if (!partner && allyList.length > 0) {
      partner = allyList[0];
    }
  }

  let cover = null;
  if (view.cover) {
    if (typeof view.cover === 'object') {
      cover = view.cover;
    } else {
      const coverStr = String(view.cover);
      cover = {
        id: coverStr,
        kind: coverStr.includes('Tree') || view.cover === 'tree' ? 'tree' : 'gate',
        slots: 1
      };
    }
  } else if (d) {
    try {
      cover = coverFor(d) || null;
    } catch {
      cover = null;
    }
  }

  let synergyMode;
  const isCoupleSynergy = s?.hermitage?.founded ? Boolean(
    s.sect?.doctrine === 'dualHall' && partner && !!d?.fem !== !!partner.fem &&
    ((d?.arts?.quanzhenSword && partner.arts?.yunvSword) || (d?.arts?.yunvSword && partner.arts?.quanzhenSword))
  ) : Boolean(
    view.isCouple ||
    (s?.gen?.couples || []).some((c) => Array.isArray(c) && c.includes(d?.id) && c.includes(partner?.id)) ||
    (d?.arts?.yunv && partner?.arts?.yunv) ||
    partner?.xia === 'xiaolongnv' ||
    d?.xia === 'xiaolongnv' ||
    partner?.xia === 'yangguo' ||
    d?.xia === 'yangguo'
  ); // 出自 Phase 7 規格：新合宗畫面須有兩脈雙劍，舊局沿原 Phase 3 展示條件。

  let isBackToBack = false;
  if (partner && (view.backToBack || view.synergyMode === 'backToBack')) {
    isBackToBack = true;
  } else if (partner && s && d) {
    try {
      isBackToBack = Boolean(backToBackPartner(s, d));
    } catch {
      isBackToBack = false;
    }
  }

  if (view.synergyMode) {
    synergyMode = view.synergyMode;
  } else if (partner && isCoupleSynergy) {
    synergyMode = 'twinSwordsCouple';
  } else if (allyList.length >= 2 || Boolean(view.formation)) {
    synergyMode = 'zhenwuArray';
  } else if (isBackToBack) {
    synergyMode = 'backToBack';
  } else if (Boolean(cover)) {
    synergyMode = 'terrainCover';
  } else {
    synergyMode = 'none';
  }

  let combinedArtName = null;
  if (synergyMode === 'twinSwordsCouple') {
    combinedArtName = '雙劍合璧・玉女素心';
  } else if (synergyMode === 'zhenwuArray') {
    combinedArtName = '真武七截陣・天罡合擊';
  } else if (synergyMode === 'backToBack') {
    combinedArtName = '背靠背・守望相助';
  } else if (synergyMode === 'terrainCover') {
    combinedArtName = '借勢卡位・一夫當關';
  }

  let synergyBonus = 1.0;
  if (synergyMode === 'twinSwordsCouple') {
    synergyBonus = 1.35;
  } else if (synergyMode === 'zhenwuArray') {
    synergyBonus = 1.5;
  } else if (synergyMode === 'backToBack') {
    synergyBonus = 1.2;
  } else if (synergyMode === 'terrainCover') {
    synergyBonus = 1.15;
  }

  const baseLoad = duel.loadL != null ? duel.loadL : 0;
  let effectiveLoadL = baseLoad;
  if (synergyMode === 'zhenwuArray') {
    effectiveLoadL = baseLoad * 0.5;
  } else if (synergyMode === 'backToBack') {
    effectiveLoadL = baseLoad * 0.6;
  } else if (synergyMode === 'terrainCover') {
    effectiveLoadL = Math.min(baseLoad, 0.35);
  } else if (synergyMode === 'twinSwordsCouple') {
    effectiveLoadL = baseLoad * 0.65;
  }

  // 3. 16 型人格（MBTI）自主戰鬥演繹（MBTI Combat Persona）
  let mbtiCode = view.mbti || d?.mbti;
  if (!mbtiCode) {
    const rawP = d?.personality;
    const traits = Array.isArray(rawP) ? rawP : (typeof rawP === 'string' ? [rawP] : []);
    const e = traits.some((t) => ['social', 'bold', 'playful'].includes(t)) ? 'E' : 'I';
    const n = traits.some((t) => ['clever', 'free', 'nimble'].includes(t)) ? 'N' : 'S';
    const f = traits.some((t) => ['kind', 'gentle', 'chi', 'brave'].includes(t)) ? 'F' : 'T';
    const j = traits.some((t) => ['diligent', 'rigid', 'honest', 'stubborn'].includes(t)) ? 'J' : 'P';
    mbtiCode = `${e}${n}${f}${j}`;
  }

  const rawTraits = Array.isArray(d?.personality) ? d.personality : (typeof d?.personality === 'string' ? [d.personality] : []);
  const isF = mbtiCode.includes('F') || rawTraits.some((t) => ['brave', 'chi', 'kind'].includes(t));
  const isPartnerHurt = Boolean(
    view.partnerHurt === true ||
    (partner && partner.hp != null && (partner.hp / (partner.max || 100)) < 0.6)
  );
  const guardianShield = Boolean(isF && partner && isPartnerHurt);

  let personaStyle;
  if (guardianShield) {
    personaStyle = 'bondGuardian';
  } else if (mbtiCode.startsWith('E') && (multiFoeCount >= 2 || partner)) {
    personaStyle = 'crowdSurge';
  } else if (mbtiCode.startsWith('I') && !partner && multiFoeCount <= 1) {
    personaStyle = 'loneWolfFocus';
  } else if (mbtiCode.includes('N')) {
    personaStyle = 'intuitiveFlash';
  } else if (mbtiCode.includes('T')) {
    personaStyle = 'tacticalCull';
  } else {
    personaStyle = 'solidStance';
  }

  let personaLabel;
  if (personaStyle === 'bondGuardian') {
    personaLabel = '捨身護侶';
  } else if (personaStyle === 'crowdSurge') {
    personaLabel = '人來瘋・戰意高昂';
  } else if (personaStyle === 'loneWolfFocus') {
    personaLabel = '孤狼・心如止水';
  } else if (personaStyle === 'intuitiveFlash') {
    personaLabel = '頓悟・靈光破招';
  } else if (personaStyle === 'tacticalCull') {
    personaLabel = '冷靜・專攻弱點';
  } else {
    personaLabel = '沉穩・硬橋硬馬';
  }

  // 4. 闖關波次進度（Wave Gauntlet Telemetry）
  let waveGauntlet;
  if (view.waveGauntlet) {
    waveGauntlet = {
      active: true,
      kind: 'none',
      wave: 1,
      totalWaves: 1,
      defeatedCount: 0,
      bannerText: '',
      ...view.waveGauntlet
    };
  } else if (s?.siege27 || s?.crusade27 || view.waveKind === 'demonSiege') {
    const wave = s?.siege27?.wave || s?.crusade27?.wave || view.wave || 1;
    const totalWaves = s?.siege27?.totalWaves || s?.crusade27?.totalWaves || view.totalWaves || 4;
    const defeatedCount = s?.siege27?.kills || s?.crusade27?.kills || view.defeatedCount || 0;
    waveGauntlet = {
      active: true,
      kind: 'demonSiege',
      wave,
      totalWaves,
      defeatedCount,
      bannerText: `🏯 迎戰魔教・第 ${wave}/${totalWaves} 波`
    };
  } else if (s?.hunt || view.waveKind === 'huntWave') {
    const wave = s?.hunt?.wave != null ? s.hunt.wave + 1 : (view.wave || 1);
    const totalWaves = s?.hunt?.waves || view.totalWaves || 3;
    const defeatedCount = s?.hunt?.kills || view.defeatedCount || 0;
    waveGauntlet = {
      active: true,
      kind: 'huntWave',
      wave,
      totalWaves,
      defeatedCount,
      bannerText: `🔥 守山迎戰・第 ${wave}/${totalWaves} 波（擊退 ${defeatedCount}）`
    };
  } else if (s?.exp || view.waveKind === 'expeditionGauntlet') {
    const wave = s?.exp?.fights != null ? s.exp.fights + 1 : (view.wave || 1);
    const totalWaves = Math.max(wave, view.totalWaves || 5);
    const defeatedCount = s?.exp?.kills
      ? Object.values(s.exp.kills).reduce((a, b) => a + b, 0)
      : (view.defeatedCount || 0);
    waveGauntlet = {
      active: true,
      kind: 'expeditionGauntlet',
      wave,
      totalWaves,
      defeatedCount,
      bannerText: `⛰ 巡山闖關・第 ${wave} 陣（連破 ${defeatedCount} 敵）`
    };
  } else if (multiFoeCount >= 2) {
    waveGauntlet = {
      active: true,
      kind: 'crowdBout',
      wave: 1,
      totalWaves: 1,
      defeatedCount: view.defeatedCount || 0,
      bannerText: `⚔ 獨戰群雄・以一敵 ${multiFoeCount}`
    };
  } else {
    waveGauntlet = {
      active: false,
      kind: 'none',
      wave: 0,
      totalWaves: 0,
      defeatedCount: 0,
      bannerText: ''
    };
  }

  return {
    selfPower,
    avgFoePower,
    powerGapRatio,
    multiFoeCount,
    crowdMode,
    knockedDownCount,
    allyList,
    partner,
    cover,
    synergyMode,
    combinedArtName,
    synergyBonus,
    effectiveLoadL,
    mbtiCode,
    guardianShield,
    personaStyle,
    personaLabel,
    waveGauntlet
  };
}

export function ergonomicFrame(d, s = {}, view = {}) {
  const bodyMode = !!(s?.hermitage?.active || s?.herbalDiet), fluencyTier = choreFluencyTier(d, view.work || d?.task?.act || 'water');
  const originalPlayback = view.playback || playbackParams(d, view.art, view.timing || {});
  const p = bodyMode && fluencyTier >= 2 ? { ...originalPlayback, waterTilt: originalPlayback.waterTilt / (fluencyTier + 1), chopPause: originalPlayback.chopPause / (fluencyTier + 1) } : originalPlayback; // 出自 Phase 5 規格：熟練後動作幅度收斂，分母直接用四階級數。
  const strength = d?.skills?.strength || 0;
  const agility = d?.skills?.agility || 0;
  const move = view.move || p.move || 'bodyPunch';
  const residual = practiceResidual(handUses(d, move));
  const stance = practiceResidual(handUses(d, 'bodyPush'));

  // 1. Somatotype & Build Profile
  const isFatWeak = agility < 15 && strength < 15;
  const isSlenderWeak = strength < 10;
  const isMasterFit = strength >= 30 && agility >= 30;

  const shoulderDelta = isMasterFit ? 2 : (isSlenderWeak ? -2 : 0);
  const waistDelta = isFatWeak ? 4 : (isMasterFit ? -2 : 0);
  const fatRatio = isFatWeak ? Math.max(0.1, (30 - strength - agility) / 30) : 0;
  const breathRate = isFatWeak ? 1.6 : (d?.needs?.energy != null && d.needs.energy < 40 ? 1.4 : 1.0);
  const fatigue = Math.max(0, 1 - (d?.needs?.energy ?? 100) / 100);
  const sweatLevel = isFatWeak ? Math.min(1, fatigue + 0.35) : fatigue;

  const buildProfile = {
    shoulderDelta,
    waistDelta,
    fatRatio,
    breathRate,
    sweatLevel
  };

  // 2. Joint Spring Dynamics & COM Offset
  const clock = view.clock ?? s?.t ?? 0;
  const poses = view.poses || (view.frame ? view.frame.poses : null);
  const formName = view.formName || (view.frame ? view.frame.formName : null) || view.key;
  const isSingleLeg = (formName === '白鶴亮翅') ||
    (poses && (poses.includes('wing') || poses.includes('doubleUp') || poses.includes('leftKick') || poses.includes('rightKick'))) ||
    (view.key === 'wing') ||
    (view.oneLeg === true);

  const isWater = (view.work === 'water' || d?.task?.act === 'water' || view.action === 'water' || d?.task?.pose === 'water' || !!d?.carry?.water);
  const isChop = (view.work === 'chop' || d?.task?.act === 'chop' || view.action === 'chop');

  let comOffset = 0;
  if (isSingleLeg) {
    const stability = (0.25 + 0.75 * stance) / (1 + agility / 25);
    comOffset = 0.95 * stability;
  } else if (isWater) {
    const stepPhase = Math.sin(clock * 4);
    comOffset = (p.waterTilt / 30) * stepPhase * ((0.3 + 0.7 * stance) / (1 + agility / 30));
  } else {
    const baseLean = (view.lean || 0) / 10;
    comOffset = baseLean * (0.4 + 0.6 * stance) / (1 + agility / 30);
  }
  comOffset = Math.max(-1, Math.min(1, comOffset));
  const isStumbling = Math.abs(comOffset) > 0.75;

  const overshoot = residual > 0.5 || strength < 15;
  const wobblePx = residual > 0.25 ? Math.min(3.5, 3.5 * residual) / (bodyMode ? fluencyTier + 1 : 1) : 0;
  const hitstopAlpha = residual < 0.25 ? Math.min(1, (0.25 - residual) / 0.25) : 0;

  const jointSpring = {
    overshoot,
    wobblePx,
    hitstopAlpha,
    comOffset,
    isStumbling
  };

  // 3. Labor Detail
  const strFactor = Math.max(0, Math.min(1, (strength || 10) / 40));
  const poleBend = 6 * (1 - 0.5 * strFactor);
  const isFootfall = view.isFootfall ?? (Math.abs(Math.sin(clock * 4)) >= 0.7);
  const waterSplash = isWater && (bodyMode ? fluencyTier === 0 && isFootfall : (p.waterTilt > 18) && isFootfall);

  const chopResidual = practiceResidual(handUses(d, 'work:chop'));
  const isImpact = view.isImpact ?? (view.u == null || (view.u >= 0.5 && view.u <= 0.85));
  const chopOffset = isChop && chopResidual > 0.7 ? (chopResidual - 0.7) * 12 : 0;
  const isAxeStuck = isChop && (bodyMode ? fluencyTier === 0 : chopResidual > 0.7) && isImpact;
  const woodSplit = isChop && (bodyMode ? fluencyTier >= 2 : chopResidual <= 0.7) && isImpact;
  const herbalBuffActive = bodyMode && (d?.herbalDietUntil || 0) > (s?.t || 0);
  const recoveryCycleLabel = bodyMode ? `${Math.min(d?.maxCyclesToday || 1, (d?.recoveryCyclesToday || 0) + 1)}/${d?.maxCyclesToday || 1}` : null;
  const qinggong = qinggongChoreBounds(d, s, view), cliffStage = cliffLeapStage(d, s, view);

  const laborDetail = {
    poleBend,
    waterSplash,
    chopOffset,
    isAxeStuck,
    woodSplit,
    choreFluencyTier: bodyMode ? fluencyTier : null,
    muscleFatigue: bodyMode ? d?.muscleFatigue || 0 : null,
    herbalBuffActive,
    recoveryCycleLabel,
    ...qinggong,
    cliffLeapStage: cliffStage
  };

  // 4. Combat Detail
  const combatDetail = duelExchangeFrame(d, s, {
    ...view,
    move,
    playback: p
  });

  // 5. Crowd & Synergy Detail
  const crowdDetail = crowdSynergyFrame(d, s, {
    ...view,
    duel: combatDetail,
    opponent: combatDetail.opponent,
    opponents: combatDetail.allOpponents
  });

  // Merge crowd & synergy fields onto combatDetail without overwriting existing Phase 1 / Phase 2 fields
  Object.assign(combatDetail, {
    selfPower: crowdDetail.selfPower,
    avgFoePower: crowdDetail.avgFoePower,
    powerGapRatio: crowdDetail.powerGapRatio,
    multiFoeCount: crowdDetail.multiFoeCount,
    crowdMode: crowdDetail.crowdMode,
    knockedDownCount: crowdDetail.knockedDownCount,
    allyList: crowdDetail.allyList,
    partner: crowdDetail.partner,
    cover: crowdDetail.cover,
    synergyMode: crowdDetail.synergyMode,
    combinedArtName: crowdDetail.combinedArtName,
    synergyBonus: crowdDetail.synergyBonus,
    effectiveLoadL: crowdDetail.effectiveLoadL,
    mbtiCode: crowdDetail.mbtiCode,
    guardianShield: crowdDetail.guardianShield,
    personaStyle: crowdDetail.personaStyle,
    personaLabel: crowdDetail.personaLabel,
    waveGauntlet: crowdDetail.waveGauntlet
  });

  return {
    buildProfile,
    jointSpring,
    laborDetail,
    choreFluencyTier: laborDetail.choreFluencyTier,
    muscleFatigue: laborDetail.muscleFatigue,
    herbalBuffActive,
    recoveryCycleLabel,
    ...qinggong,
    cliffLeapStage: cliffStage,
    combatDetail,
    duel: combatDetail,
    crowdDetail,
    synergy: crowdDetail,
    playback: p
  };
}
