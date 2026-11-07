import test from 'node:test';
import assert from 'node:assert/strict';
import { crowdSynergyFrame, duelExchangeFrame, ergonomicFrame } from '../../../src/growth-playback.mjs';
import { renderMicroStage } from '../../../src/pose-render.mjs';

function createMockCtx() {
  const log = [];
  const calls = {};
  const record = (name, ...args) => {
    log.push({ name, args });
    calls[name] = (calls[name] || 0) + 1;
  };
  return {
    log,
    calls,
    save() { record('save'); },
    restore() { record('restore'); },
    beginPath() { record('beginPath'); },
    closePath() { record('closePath'); },
    moveTo(x, y) { record('moveTo', x, y); },
    lineTo(x, y) { record('lineTo', x, y); },
    stroke() { record('stroke'); },
    fill() { record('fill'); },
    fillRect(x, y, w, h) { record('fillRect', x, y, w, h); },
    strokeRect(x, y, w, h) { record('strokeRect', x, y, w, h); },
    arc(x, y, r, sa, ea) { record('arc', x, y, r, sa, ea); },
    ellipse(x, y, rx, ry, rot, sa, ea) { record('ellipse', x, y, rx, ry, rot, sa, ea); },
    fillText(text, x, y) { record('fillText', text, x, y); },
    quadraticCurveTo(cx, cy, x, y) { record('quadraticCurveTo', cx, cy, x, y); },
    scale(sx, sy) { record('scale', sx, sy); },
    translate(tx, ty) { record('translate', tx, ty); },
    rotate(rad) { record('rotate', rad); },
    setLineDash(dash) { record('setLineDash', dash); },
    measureText(text) { return { width: (text || '').length * 10 }; }
  };
}

test('1. 場景 A（實力輾壓走過倒一片 & 令狐沖一劍盡奪敵目 & 橫掃千軍 Crowd Mow-Down）', () => {
  // 1.1 高手對弱敵（powerGapRatio >= 2.2）：walkPastKnockdown（錯身輕拂・走過倒一片）
  const dMaster = {
    id: 'hero',
    name: '化境高手',
    skills: { strength: 40, agility: 42 },
    arts: { taiji: { xp: 100 } },
    neigong: { level: 10 }
  };
  const oppRats = [
    { id: 'rat_1', name: '山鼠甲', k: 'rat', skills: { strength: 6, agility: 8 } },
    { id: 'rat_2', name: '山鼠乙', k: 'rat', skills: { strength: 5, agility: 7 } },
    { id: 'rat_3', name: '山鼠丙', k: 'rat', skills: { strength: 5, agility: 6 } }
  ];

  const fMow = crowdSynergyFrame(dMaster, {}, { opponent: oppRats[0], opponents: oppRats });
  assert.ok(fMow.powerGapRatio >= 2.2, `Power gap ratio ${fMow.powerGapRatio} should be >= 2.2`);
  assert.equal(fMow.crowdMode, 'walkPastKnockdown', 'Massive power gap triggers walkPastKnockdown');
  assert.ok(fMow.knockedDownCount >= 3, 'All 3 foes knocked down in walkPastKnockdown');

  const ctxMow = createMockCtx();
  renderMicroStage(ctxMow, {}, dMaster, { opponent: oppRats[0], opponents: oppRats });
  const hasMowText = ctxMow.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('錯身輕拂・走過倒一片'));
  assert.ok(hasMowText, 'Canvas should display walkPastKnockdown text');
  // Check extra foe tumbling rotation
  const hasRotate = ctxMow.log.some((c) => c.name === 'rotate' && Math.abs(c.args[0] - 0.65) < 0.01);
  assert.ok(hasRotate, 'Canvas should tumble extra foes with rotate(0.65)');

  // 1.2 獨孤九劍高手面對眾敵（multiFoeCount >= 2, powerGapRatio >= 1.8）：blindAllEyes（一劍破盡・盡奪敵目）
  const dDuguMaster = {
    id: 'hero',
    name: '令狐少俠',
    skills: { strength: 30, agility: 38 },
    arts: { dugu: { xp: 90 } },
    dugu: ['poJian', 'poDao', 'poQi']
  };
  const oppBandits = [
    { id: 'b1', name: '蒙面人甲', k: 'bandit', skills: { strength: 16, agility: 14 } },
    { id: 'b2', name: '蒙面人乙', k: 'bandit', skills: { strength: 15, agility: 15 } },
    { id: 'b3', name: '蒙面人丙', k: 'bandit', skills: { strength: 14, agility: 16 } }
  ];

  const fBlind = crowdSynergyFrame(dDuguMaster, {}, { opponent: oppBandits[0], opponents: oppBandits });
  assert.equal(fBlind.crowdMode, 'blindAllEyes', 'Dugu master facing multiple foes triggers blindAllEyes');
  assert.ok(fBlind.knockedDownCount >= 3, 'Knocked down count covers all foes');

  const ctxBlind = createMockCtx();
  renderMicroStage(ctxBlind, {}, dDuguMaster, { opponent: oppBandits[0], opponents: oppBandits });
  const hasBlindText = ctxBlind.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('一劍破盡・盡奪敵目'));
  assert.ok(hasBlindText, 'Canvas should display blindAllEyes sword sweep text');
  // Crosshairs arc calls on eyes
  assert.ok(ctxBlind.calls.arc >= 3, 'Canvas should draw eye crosshairs on all foes');

  // 1.3 橫掃千軍（whirlwindSweep）：以一敵多且實力領先（1.35 <= powerGapRatio < 2.2）
  const dSweep = {
    id: 'hero',
    name: '健壯弟子',
    skills: { strength: 26, agility: 24 },
    arts: { basicSword: { xp: 50 } }
  };
  const oppModerate = [
    { id: 'm1', name: '嘍囉甲', k: 'bandit', skills: { strength: 14, agility: 12 } },
    { id: 'm2', name: '嘍囉乙', k: 'bandit', skills: { strength: 13, agility: 13 } }
  ];
  const fSweep = crowdSynergyFrame(dSweep, {}, { opponent: oppModerate[0], opponents: oppModerate, powerGapRatio: 1.6 });
  assert.equal(fSweep.crowdMode, 'whirlwindSweep', 'Moderate gap with multi foes triggers whirlwindSweep');

  const ctxSweep = createMockCtx();
  renderMicroStage(ctxSweep, {}, dSweep, { opponent: oppModerate[0], opponents: oppModerate, powerGapRatio: 1.6 });
  const hasSweepText = ctxSweep.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('橫掃千軍・群戰破圍'));
  assert.ok(hasSweepText, 'Canvas should display whirlwindSweep text');
});

test('2. 場景 B（雙劍合璧、真武七截陣、背靠背與借樹卡位 Partner & Formation Synergy）', () => {
  const dHero = {
    id: 'yangguo',
    name: '楊過',
    skills: { strength: 35, agility: 35 },
    arts: { yunv: { xp: 80 } }
  };
  const dPartner = {
    id: 'xiaolongnv',
    name: '小龍女',
    hp: 100,
    max: 100,
    skills: { strength: 30, agility: 40 },
    arts: { yunv: { xp: 90 } },
    xia: 'xiaolongnv'
  };
  const opp = { id: 'jinlun', name: '金輪國師', skills: { strength: 40, agility: 32 } };

  // 2.1 雙劍合璧（twinSwordsCouple）
  const fCouple = crowdSynergyFrame(dHero, {}, {
    opponent: opp,
    partner: dPartner,
    isCouple: true,
    loadL: 1.0
  });
  assert.equal(fCouple.synergyMode, 'twinSwordsCouple', 'Couple partner triggers twinSwordsCouple');
  assert.equal(fCouple.combinedArtName, '雙劍合璧・玉女素心');
  assert.equal(fCouple.synergyBonus, 1.35, 'Couple synergy bonus should be 1.35');
  assert.equal(fCouple.effectiveLoadL, 0.65, 'Load reduced by twin swords synergy to 0.65');

  const ctxCouple = createMockCtx();
  renderMicroStage(ctxCouple, {}, dHero, {
    opponent: opp,
    partner: dPartner,
    isCouple: true,
    loadL: 1.0
  });
  const hasCoupleText = ctxCouple.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('雙劍合璧・玉女素心'));
  assert.ok(hasCoupleText, 'Canvas should display twinSwordsCouple text');
  assert.ok(ctxCouple.calls.quadraticCurveTo >= 2, 'Canvas should draw intertwined dual sword arcs');

  // 2.2 真武七截陣（zhenwuArray）
  const allies3 = [
    { id: 'ally_1', name: '宋遠橋', hp: 100 },
    { id: 'ally_2', name: '俞蓮舟', hp: 100 }
  ];
  const fZhenwu = crowdSynergyFrame(dHero, {}, {
    opponent: opp,
    allies: allies3,
    loadL: 1.0
  });
  assert.equal(fZhenwu.synergyMode, 'zhenwuArray', '3+ disciples triggers zhenwuArray');
  assert.equal(fZhenwu.combinedArtName, '真武七截陣・天罡合擊');
  assert.equal(fZhenwu.synergyBonus, 1.5, 'Zhenwu array bonus is 1.5');
  assert.equal(fZhenwu.effectiveLoadL, 0.5, 'Zhenwu array cuts effective load by half to 0.5');

  const ctxZhenwu = createMockCtx();
  renderMicroStage(ctxZhenwu, {}, dHero, {
    opponent: opp,
    allies: allies3,
    loadL: 1.0
  });
  const hasZhenwuText = ctxZhenwu.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('真武七截陣・天罡合擊'));
  assert.ok(hasZhenwuText, 'Canvas should display zhenwuArray text');
  assert.ok(ctxZhenwu.calls.ellipse >= 1, 'Canvas draws formation ellipse on ground');

  // 2.3 背靠背（backToBack）
  const dFellow = { id: 'fellow_1', name: '同門師弟', hp: 100 };
  const fBack = crowdSynergyFrame(dHero, {}, {
    opponent: opp,
    partner: dFellow,
    backToBack: true,
    loadL: 1.0
  });
  assert.equal(fBack.synergyMode, 'backToBack', 'backToBack flag triggers backToBack mode');
  assert.equal(fBack.combinedArtName, '背靠背・守望相助');
  assert.equal(fBack.synergyBonus, 1.2, 'Back-to-back bonus is 1.2');
  assert.equal(fBack.effectiveLoadL, 0.6, 'Back-to-back reduces load to 0.6');

  const ctxBack = createMockCtx();
  renderMicroStage(ctxBack, {}, dHero, {
    opponent: opp,
    partner: dFellow,
    backToBack: true,
    synergyMode: 'backToBack'
  });
  const hasBackText = ctxBack.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('背靠背禦敵・死角封鎖'));
  assert.ok(hasBackText, 'Canvas should display backToBack text');

  // 2.4 借樹／地形掩體（terrainCover）
  const fCover = crowdSynergyFrame(dHero, {}, {
    opponent: opp,
    cover: { id: 'guardTree', kind: 'tree', slots: 1 },
    loadL: 1.0
  });
  assert.equal(fCover.synergyMode, 'terrainCover', 'Cover presence triggers terrainCover');
  assert.equal(fCover.combinedArtName, '借勢卡位・一夫當關');
  assert.equal(fCover.synergyBonus, 1.15, 'Terrain cover bonus is 1.15');
  assert.equal(fCover.effectiveLoadL, 0.35, 'Terrain cover caps effective load to 0.35');

  const ctxCover = createMockCtx();
  renderMicroStage(ctxCover, {}, dHero, {
    opponent: opp,
    cover: { id: 'guardTree', kind: 'tree', slots: 1 }
  });
  const hasCoverText = ctxCover.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('借樹卡位・一夫當關'));
  assert.ok(hasCoverText, 'Canvas should display terrainCover text');
});

test('3. 場景 C（16 型人格 MBTI 戰鬥演繹與 F 型重情捨身護侶）', () => {
  // 3.1 性格推導 E vs I, S vs N, T vs F, J vs P
  const dExtrovert = {
    id: 'hero_e',
    name: '豪邁弟子',
    personality: ['social', 'nimble', 'brave', 'honest'] // E, N, F, J -> ENFJ
  };
  const fE = crowdSynergyFrame(dExtrovert, {}, { multiFoeCount: 3 });
  assert.equal(fE.mbtiCode, 'ENFJ', 'Personality traits mapped correctly to ENFJ');
  assert.equal(fE.personaStyle, 'crowdSurge', 'Extrovert in crowd triggers crowdSurge');
  assert.equal(fE.personaLabel, '人來瘋・戰意高昂');

  const dIntrovert = {
    id: 'hero_i',
    name: '冷峻孤狼',
    personality: ['quiet', 'steady', 'calm', 'aloof'] // I, S, T, P -> ISTP
  };
  const fI = crowdSynergyFrame(dIntrovert, {}, { opponent: { id: 'opp' }, multiFoeCount: 1 });
  assert.equal(fI.mbtiCode, 'ISTP', 'Quiet traits mapped to ISTP');
  assert.equal(fI.personaStyle, 'loneWolfFocus', 'Introvert solo duel triggers loneWolfFocus');
  assert.equal(fI.personaLabel, '孤狼・心如止水');

  // 3.2 F 型重情護侶：當伴侶受傷（partner.hp < 60%）時，觸發捨身擋刀（guardianShield: true）
  const dLover = {
    id: 'yangguo',
    name: '楊過',
    personality: ['brave', 'free', 'kind', 'stubborn'] // E/N/F/J -> F is present
  };
  const dWoundedPartner = {
    id: 'xiaolongnv',
    name: '小龍女',
    hp: 40,
    max: 100 // 40% < 60%
  };

  const fShield = crowdSynergyFrame(dLover, {}, {
    partner: dWoundedPartner,
    opponent: { id: 'foe' }
  });
  assert.equal(fShield.guardianShield, true, 'Wounded partner triggers guardianShield');
  assert.equal(fShield.personaStyle, 'bondGuardian', 'Guardian shield sets personaStyle to bondGuardian');
  assert.equal(fShield.personaLabel, '捨身護侶');

  const ctxShield = createMockCtx();
  renderMicroStage(ctxShield, {}, dLover, {
    partner: dWoundedPartner,
    opponent: { id: 'foe' }
  });
  const hasShieldText = ctxShield.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('捨身護侶・寸步不讓'));
  assert.ok(hasShieldText, 'Canvas should display guardian shield text');
  // Check MBTI persona badge text
  const hasMbtiBadge = ctxShield.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('【') && c.args[0]?.includes('捨身護侶】'));
  assert.ok(hasMbtiBadge, 'Canvas should render MBTI persona badge in duel');
});

test('4. 場景 D（塔防式闖關波次橫幅 Wave Gauntlet Telemetry）', () => {
  const d = { id: 'hero', name: '守山弟子', skills: { strength: 20, agility: 20 } };

  // 4.1 魔教圍山（siege27）
  const sSiege = {
    siege27: { wave: 2, totalWaves: 4, kills: 7 }
  };
  const fSiege = crowdSynergyFrame(d, sSiege, {});
  assert.equal(fSiege.waveGauntlet.active, true);
  assert.equal(fSiege.waveGauntlet.kind, 'demonSiege');
  assert.equal(fSiege.waveGauntlet.wave, 2);
  assert.equal(fSiege.waveGauntlet.totalWaves, 4);
  assert.equal(fSiege.waveGauntlet.bannerText, '🏯 迎戰魔教・第 2/4 波');

  const ctxSiege = createMockCtx();
  renderMicroStage(ctxSiege, sSiege, d);
  const hasSiegeBanner = ctxSiege.log.some((c) => c.name === 'fillText' && c.args[0]?.includes('迎戰魔教・第 2/4 波'));
  assert.ok(hasSiegeBanner, 'Micro stage displays demon siege wave banner');

  // 4.2 守山狩獵（hunt）
  const sHunt = {
    hunt: { wave: 2, waves: 3, kills: 5 }
  };
  const fHunt = crowdSynergyFrame(d, sHunt, {});
  assert.equal(fHunt.waveGauntlet.active, true);
  assert.equal(fHunt.waveGauntlet.kind, 'huntWave');
  assert.equal(fHunt.waveGauntlet.wave, 3);
  assert.equal(fHunt.waveGauntlet.bannerText, '🔥 守山迎戰・第 3/3 波（擊退 5）');

  // 4.3 巡山闖關（exp）
  const sExp = {
    exp: { fights: 3, kills: { wolf: 4, boar: 2 } }
  };
  const fExp = crowdSynergyFrame(d, sExp, {});
  assert.equal(fExp.waveGauntlet.active, true);
  assert.equal(fExp.waveGauntlet.kind, 'expeditionGauntlet');
  assert.equal(fExp.waveGauntlet.wave, 4);
  assert.equal(fExp.waveGauntlet.bannerText, '⛰ 巡山闖關・第 4 陣（連破 6 敵）');

  // 4.4 獨戰群雄（crowdBout）
  const fCrowd = crowdSynergyFrame(d, {}, { multiFoeCount: 4, opponent: { id: 'foe1' } });
  assert.equal(fCrowd.waveGauntlet.active, true);
  assert.equal(fCrowd.waveGauntlet.kind, 'crowdBout');
  assert.equal(fCrowd.waveGauntlet.bannerText, '⚔ 獨戰群雄・以一敵 4');
});

test('5. 零模擬污染鐵律（Zero Simulation Contamination）：純投影與無狀態副作用', () => {
  const disciple = {
    id: 'hero',
    name: '掌門親傳',
    hp: 100,
    max: 100,
    skills: { strength: 30, agility: 28 },
    arts: { taiji: { xp: 80 } },
    personality: ['brave', 'social', 'honest']
  };
  const opp = {
    id: 'boss',
    name: '魔教長老',
    hp: 200,
    max: 200,
    skills: { strength: 35, agility: 30 }
  };
  const state = {
    t: 120,
    rngN: 42,
    ds: [disciple],
    siege27: { wave: 3, totalWaves: 4, kills: 12 }
  };

  const discipleSnapshot = JSON.stringify(disciple);
  const oppSnapshot = JSON.stringify(opp);
  const stateSnapshot = JSON.stringify(state);

  const ctx = createMockCtx();
  for (let i = 0; i < 50; i++) {
    crowdSynergyFrame(disciple, state, { opponent: opp, multiFoeCount: 3 });
    ergonomicFrame(disciple, state, { opponent: opp, multiFoeCount: 3 });
    renderMicroStage(ctx, state, disciple, { opponent: opp, multiFoeCount: 3 });
  }

  assert.equal(JSON.stringify(disciple), discipleSnapshot, 'Disciple object must be 100% unmutated');
  assert.equal(JSON.stringify(opp), oppSnapshot, 'Opponent object must be 100% unmutated');
  assert.equal(JSON.stringify(state), stateSnapshot, 'Game state must be 100% unmutated');
  assert.equal(state.rngN, 42, 'RNG step counter must remain unchanged');
});
