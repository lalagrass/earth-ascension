import {impactVisual} from './contact-view.mjs';
import { MOVES, ACTIVITIES } from './data.mjs';
import { windOf, artTier, artById, focusOf } from './arts.mjs';
import { playbackParams, PLAYBACK, ergonomicFrame } from './growth-playback.mjs';
import { POSTURES, COMBAT_POSES, DAILY_POSES, EXTRA_TASK_POSES, routineFrame } from './routines.mjs';
import { isFemaleVisual } from './visual-gender.mjs';
import { drawPaperDoll } from './paper-doll.mjs';
import { handUses } from './practice.mjs';

// 同一個骨架與補間器套在每名人物，人物只提供外觀色與朝向。
const LEGS = {
  stand: [[-5, -8, -7, 0], [5, -8, 7, 0]],
  horse: [[-13, -12, -15, 0], [13, -12, 15, 0]],
  leftBow: [[-13, -12, -21, 0], [12, -14, 16, 0]],
  rightBow: [[-12, -14, -16, 0], [13, -12, 21, 0]],
  oneLeg: [[-6, -13, -9, 0], [13, -18, 18, -15]],
  crouch: [[-15, -8, -18, 0], [13, -8, 18, 0]],
  sit: [[-10, -9, -15, 0], [10, -9, 15, 0]],
  leftKick: [[-6, -13, -8, 0], [-20, -18, -28, -21]],
  rightKick: [[6, -13, 8, 0], [20, -18, 28, -21]],
};
const ARMS = {
  carry: [[-15,-25,-23,-17],[15,-25,23,-17]],
  sit: [[-15,-29,-9,-18],[15,-29,9,-18]],
  pick: [[-13,-31,-5,-32],[19,-24,22,-4]],
  salute: [[-8, -31, -3, -27], [8, -31, 3, -27]],
  guard: [[-13, -31, -3, -34], [13, -31, 4, -32]],
  leftChop: [[-21, -38, -28, -20], [9, -31, 3, -30]],
  rightChop: [[-9, -31, -3, -30], [21, -38, 28, -20]],
  leftPalm: [[-19, -31, -29, -30], [10, -31, 4, -31]],
  rightPalm: [[-10, -31, -4, -31], [19, -31, 29, -30]],
  doublePalm: [[-20, -32, -30, -32], [20, -32, 30, -32]],
  highPalm: [[-20, -45, -24, -50], [14, -30, 8, -30]],
  lowPalm: [[-10, -30, -3, -31], [19, -22, 27, -13]],
  block: [[-12, -38, 1, -43], [10, -31, 2, -34]],
  leftElbow: [[-21, -34, -6, -37], [10, -29, 4, -30]],
  rightElbow: [[-10, -29, -4, -30], [21, -34, 6, -37]],
  leftFist: [[-19, -34, -29, -34], [10, -30, 4, -30]],
  rightFist: [[-10, -30, -4, -30], [19, -34, 29, -34]],
  doubleFist: [[-19, -34, -27, -34], [19, -34, 27, -34]],
  downFist: [[-10, -29, -2, -31], [19, -26, 25, -12]],
  backFist: [[-10, -29, -3, -30], [21, -33, 29, -35]],
  doubleUp: [[-21, -34, -27, -39], [21, -34, 27, -39]],
  doubleDownPalm: [[-21, -27, -28, -19], [21, -27, 28, -19]],
  tiger: [[-18, -26, -25, -12], [17, -42, 19, -52]],
  wing: [[-23, -42, -29, -43], [23, -42, 29, -43]],
  swordReady: [[-9, -31, 0, -32], [16, -40, 20, -46]],
  swordCut: [[-15, -30, -4, -33], [24, -24, 31, -14]],
  swordThrust: [[-12, -32, 1, -35], [19, -34, 31, -31]],
  bladeReady: [[-9, -31, 1, -35], [14, -42, 18, -48]],
  bladeCut: [[-12, -30, 1, -33], [21, -24, 29, -15]],
  staffReady: [[-20, -39, -27, -38], [19, -31, 26, -30]],
  staffThrust: [[-10, -36, -20, -35], [20, -34, 29, -34]],
};
const mix = (a, b, u) => a + (b - a) * u;
const mixArray = (a, b, u) => a.map((v, i) => mix(v, b[i], u));
export function dailyPose(d, action = 'stand', clock = 0, playback = playbackParams(d)) {
  const key=DAILY_POSES[action]?action:'stand', pause=key==='chop'?playback.chopPause:0, moving=key==='chop'?4*.7:2;
  const u=Math.max(0,((clock%(moving+pause))-pause)/moving);
  return { poses:DAILY_POSES[key],u,key,work:key,clock,playback };
}
export function displayPose(s, d, art, move, time=s.t, hitstop=true) {
  s={...s,t:impactVisual(s,d,time,hitstop).clock};
  // 不會的套路不因main的fallback而憑空顯示；白身即使無ARTS也可練身體招。
  if(!d.arts?.[art?.id])art=null;
  const movement=art?.tech||(d.bare?'bodyPunch':d.moves?.[0])||'bodyPunch';
  const playback=playbackParams(d,art,{wind:windOf(d,movement,MOVES.find(m=>m.id===movement)?.cd||1),tier:art?artTier(d,art.id):0}),extra={playback,clock:s.t};
  const recent = d.ring && s.t - d.ring.t < 1.5;
  if (recent) {
    const key = d.ring.intercept ? 'intercept' : (s.fx || []).some((fx) => fx.kind === 'clash' && fx.word === '閃' && Math.hypot(fx.pos[0] - d.pos[0], fx.pos[1] - d.pos[1]) < 18) ? 'entryDodge' : 'parry';
    return { poses: COMBAT_POSES[key], u: Math.min(0.999, (s.t - d.ring.t) / 1.5), key, ...extra };
  }
  if (d.anim === 'wind' || d.anim === 'strike') {
    const poses = move?.poses || ['ready', 'leftStep', 'rightFist'];
    const w=d.swing||d.bswing, phase=w?.wind?Math.max(0,Math.min(1,(s.t-(w.at-w.wind))/w.wind)):0.5;
    return { poses,u:d.anim==='wind'?phase*.6:.8,key:move?.id||'attack',...extra };
  }
  if (['train', 'cliffTrain', 'waterfallTrain'].includes(d.task?.act) && d.task.phase === 'do') {
    const f = routineFrame(art,d,s.t,playback);
    return { poses:f.poses,u:f.phase,key:f.formName,frame:f,...extra };
  }
  const task=d.task, travel=!!d.path?.length;
  const action=travel?'walk':(ACTIVITIES[task?.act]?.pose || EXTRA_TASK_POSES[task?.act] || 'stand');
  return dailyPose(d,action,s.t,playback);
}

export function drawPoseActor(g, d, view) {
  const poses = view?.poses || ['ready', 'ready'];
  const n = poses.length, k = Math.min(n - 1, (view?.u || 0) * (n - 1)), i = Math.floor(k), u = k - i;
  const a = POSTURES[poses[i]] || POSTURES.ready, b = POSTURES[poses[Math.min(n - 1, i + 1)]] || POSTURES.ready;
  const p=view.playback||playbackParams(d), hip=p.hipHeight, sink=PLAYBACK.uprightHip-hip;
  const lean = mix(a.lean, b.lean, u)+Math.sin((view.clock||0)*Math.PI*2)*p.sway, legsA = LEGS[a.legs], legsB = LEGS[b.legs], armsA = ARMS[a.arms], armsB = ARMS[b.arms];
  const female = isFemaleVisual(d);
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    drawPaperDoll(g,d,view,{hip,sink,lean,legs:[0,1].map(j=>mixArray(legsA[j],legsB[j],u)),arms:[0,1].map(j=>mixArray(armsA[j],armsB[j],u)),female,uprightHip:PLAYBACK.uprightHip,weapon:b.weapon||a.weapon,ergo:view.ergo});
    return;
  }
  const color = female ? '#806375' : d.sprite === 'senior' ? '#796d91' : d.sprite === 'cousin' ? '#718963' : d.sprite === 'hero' ? '#647f92' : '#6a755e';
  const duel = view?.ergo?.combatDetail || view?.ergo?.duel;
  const synergy = view?.ergo?.crowdDetail || view?.ergo?.synergy || duel;
  const isWalkPast = synergy?.crowdMode === 'walkPastKnockdown';
  const isGuardianShield = Boolean(synergy?.guardianShield);
  const isHeadSlip = duel?.dodgeTier === 'headSlip' && Boolean(duel?.opponent);
  const isRaging = Boolean(duel?.isRaging);
  const effectiveLean = isRaging ? lean + 4 : lean;

  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#332b25';
  if (isRaging && g.strokeRect) {
    g.strokeStyle = 'rgba(192, 57, 43, 0.45)';
    g.lineWidth = 3;
    g.strokeRect(effectiveLean - 18, -65, 36, 75);
    g.strokeStyle = '#332b25';
  }
  for (let j = 0; j < 2; j++) {
    const [kx, ky, fx, fy] = mixArray(legsA[j], legsB[j], u);
    g.lineWidth = 6; g.beginPath(); g.moveTo(effectiveLean * 0.45 + (j ? 5 : -5), -hip); g.lineTo(kx, ky*hip/PLAYBACK.uprightHip); g.lineTo(fx, fy); g.stroke();
  }
  g.translate(0,sink);
  if (female) { g.fillStyle = color; g.strokeStyle = '#372e2b'; g.lineWidth = 2; g.beginPath(); g.moveTo(effectiveLean - 7, -28); g.lineTo(effectiveLean + 7, -28); g.lineTo(effectiveLean + 17, -4); g.lineTo(effectiveLean - 17, -4); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = color; g.strokeStyle = '#372e2b'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(effectiveLean - 9, -42); g.lineTo(effectiveLean + 9, -42); g.lineTo(effectiveLean * 0.5 + 8, -18); g.lineTo(effectiveLean * 0.5 - 8, -18); g.closePath(); g.fill(); g.stroke();
  for (let j = 0; j < 2; j++) {
    const [ex, ey, hx, hy] = mixArray(armsA[j], armsB[j], u);
    let armEx = ex, armEy = ey, armHx = hx, armHy = hy;
    if (duel?.instantCounterPalm && j === 1) {
      armEx = effectiveLean + 16;
      armEy = -32;
      armHx = effectiveLean + 28;
      armHy = -32;
    } else if (isGuardianShield && j === 1) {
      armEx = effectiveLean + 18;
      armEy = -34;
      armHx = effectiveLean + 28;
      armHy = -34;
    } else if (isWalkPast) {
      if (j === 0) {
        armEx = effectiveLean - 16;
        armEy = -28;
        armHx = effectiveLean - 24;
        armHy = -24;
      } else {
        armEx = effectiveLean + 14;
        armEy = -32;
        armHx = effectiveLean + 24;
        armHy = -26;
      }
    }
    g.strokeStyle = '#46362c'; g.lineWidth = 7; g.beginPath(); g.moveTo(effectiveLean + (j ? 8 : -8), -39); g.lineTo(armEx, armEy); g.lineTo(armHx, armHy); g.stroke();
    g.fillStyle = '#e7bf91'; g.beginPath(); g.arc(armHx, armHy, 3, 0, Math.PI * 2); g.fill();
    if (duel?.instantCounterPalm && j === 1 && g.beginPath && g.arc && g.stroke) {
      g.strokeStyle = 'rgba(255, 235, 140, 0.85)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(armHx + 6, armHy, 9, -Math.PI / 2, Math.PI / 2);
      g.stroke();
    }
    if (isGuardianShield && j === 1 && g.beginPath && g.stroke) {
      g.strokeStyle = 'rgba(231, 76, 60, 0.9)';
      g.lineWidth = 3;
      if (g.arc) {
        g.beginPath();
        g.arc(armHx + 8, armHy, 18, -Math.PI / 2, Math.PI / 2);
        g.stroke();
        g.strokeStyle = 'rgba(241, 196, 15, 0.95)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(armHx + 12, armHy, 22, -Math.PI / 2, Math.PI / 2);
        g.stroke();
      }
    }
    if (isWalkPast && j === 1 && g.beginPath && g.stroke) {
      g.strokeStyle = 'rgba(255, 235, 140, 0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(armHx, armHy);
      if (g.quadraticCurveTo) g.quadraticCurveTo(armHx - 15, armHy - 12, armHx - 30, armHy - 6);
      else g.lineTo(armHx - 30, armHy - 6);
      g.stroke();
    }
    if (j && (a.weapon || b.weapon)) {
      const weapon = b.weapon || a.weapon, reach = weapon === 'staff' ? 39 : weapon === 'sword' ? 25 : 20;
      g.strokeStyle = weapon === 'staff' ? '#7e4c24' : '#b8c5c9'; g.lineWidth = weapon === 'staff' ? 3 : 2;
      g.beginPath(); g.moveTo(armHx - 4, armHy + 6); g.lineTo(armHx + 7, armHy - reach); g.stroke();
      if(weapon==='axe'){g.fillStyle='#9babb0';g.fillRect(armHx+4,armHy-reach,12,8);}
    }
    if(view.work==='water') {
      g.save();g.translate(armHx,armHy+6);g.rotate(Math.sin((view.clock||0)*4)*p.waterTilt*Math.PI/180);
      g.strokeStyle='#694f36';g.fillStyle='#9b784e';g.lineWidth=2;g.strokeRect(-5,0,10,7);g.fillRect(-6,7,12,13);
      g.fillStyle='#8ab5c6';g.fillRect(-4,8,8,2);g.restore();
    }
  }
  const headX = isHeadSlip ? effectiveLean - 4 : effectiveLean;
  const headY = isHeadSlip ? -49 : -49;
  g.fillStyle = '#e7bf91'; g.strokeStyle = '#372e2b'; g.lineWidth = 2; g.beginPath(); g.arc(headX, headY, 8, 0, Math.PI * 2); g.fill(); g.stroke();
  if (female) { g.fillStyle = '#292529'; g.beginPath(); g.arc(headX + 6, headY - 8, 5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(headX - 7, headY - 4); g.lineTo(headX - 9, headY + 11); g.lineTo(headX - 4, headY + 9); g.lineTo(headX - 3, headY - 4); g.fill(); g.beginPath(); g.moveTo(headX + 6, headY - 4); g.lineTo(headX + 9, headY + 10); g.lineTo(headX + 13, headY + 8); g.lineTo(headX + 10, headY - 7); g.fill(); }
  g.fillStyle = isRaging ? '#c0392b' : '#2f2929'; g.beginPath(); g.arc(headX + 3, headY - 1, 1, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function selectMicroStageFocal(S, preferredId = null, pinned = false) {
  if (!S?.ds || !S.ds.length) return { actor: null, autoDirected: false };
  const preferred = (preferredId && S.ds.find((d) => d.id === preferredId)) || S.ds.find((d) => d.id === 'hero') || S.ds[0];
  const isCombatant = (d) => !d.away && Boolean(d.swing || d.bswing || d.raging || (d.ring && S.t != null && S.t - d.ring.t < 1.5));
  if (pinned) {
    return { actor: preferred, autoDirected: false };
  }
  if (isCombatant(preferred)) {
    return { actor: preferred, autoDirected: false };
  }
  const combatDisciple = S.ds.find(isCombatant);
  if (combatDisciple) {
    return { actor: combatDisciple, autoDirected: true };
  }
  return { actor: preferred, autoDirected: false };
}

export function renderMicroStage(g, s = {}, focalActor = null, customView = null) {
  if (!g) return null;
  if (!focalActor && s?.ds?.length) {
    focalActor = s.ds.find((d) => d.id === 'hero') || s.ds[0];
  }
  if (!focalActor) return null;

  const focalArt = artById(focusOf(focalActor) || Object.keys(focalActor.arts || {})[0]);
  const focalMove = MOVES.find((m) => m.id === (focalActor.swing?.mv || focalArt?.tech));
  const defaultView = displayPose(s, focalActor, focalArt, focalMove);
  const baseView = customView ? { ...defaultView, ...customView } : defaultView;
  const view = (focalActor?.carry?.water || focalActor?.carry?.coldWater || ['water', 'cliffWater'].includes(focalActor?.task?.act)) && baseView.work !== 'water'
    ? { ...baseView, work: 'water' }
    : baseView;
  const ergo = ergonomicFrame(focalActor, s, { ...view, art: focalArt, move: focalMove?.id });
  const p = ergo.playback;
  const strength = focalActor?.skills?.strength || 0;
  const agility = focalActor?.skills?.agility || 0;
  const opponent = ergo.combatDetail.opponent;

  if (g.save) g.save();

  // 1. Clear background
  if (g.fillRect) {
    g.fillStyle = '#ebdcc0';
    g.fillRect(0, 0, 360, 220);
  }

  // 出自 Phase 6 規格：崖上縱躍時讓人物頭頂仍留在 220px 微距窗內；舊局維持 175px 地線。
  const groundY = ergo.cliffLeapStage ? 190 : 175;
  if (g.fillRect) {
    g.fillStyle = '#d8c7a6';
    g.fillRect(0, groundY, 360, 220 - groundY);
  }
  if (ergo.cliffLeapStage && g.fillRect) {
    // 出自 Phase 6 規格：三階絕壁、飛瀑與雲霧只畫在崖上特寫，不影響舊局地圖。
    g.fillStyle = '#7e8580'; g.fillRect(0, 42, 76, groundY - 42);
    g.fillStyle = '#a1a8a3'; g.fillRect(56, 32, 38, groundY - 32);
    g.fillStyle = '#62776b'; g.fillRect(284, 58, 76, groundY - 58);
    g.fillStyle = '#94b9bd'; g.fillRect(306, 64, 14, groundY - 64);
    g.fillStyle = '#d9e2db'; g.fillRect(94, 79, 84, 12); g.fillRect(168, 53, 116, 10);
    g.fillStyle = '#3e684b'; g.fillRect(232, 109, 67, 6);
  }
  if (g.beginPath && g.stroke) {
    g.strokeStyle = '#b49f78';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, groundY);
    g.lineTo(360, groundY);
    g.stroke();
  }

  // Phase 4：玉女心經初悟時兩人對坐合參；這段只讀存檔時間，不改戰鬥或日程。
  const contemplators = s.hermitage?.contemplateActors || [];
  const contemplating = s.hermitage?.contemplateUntil > s.t && contemplators.includes(focalActor.id);
  if (contemplating && g.save && g.restore) {
    const [first, second] = contemplators.map((id) => s.ds.find((d) => d.id === id));
    if (first && second) {
      for (const [actor, x, face] of [[first, 110, 1], [second, 250, -1]]) {
        g.save();
        if (g.translate) g.translate(x, groundY);
        if (g.scale) g.scale(face * 0.8, 0.8);
        drawPoseActor(g, actor, dailyPose(actor, 'sit', s.t));
        g.restore();
      }
      if (g.fillText) {
        g.fillStyle = '#66438a'; g.font = 'bold 16px serif'; g.textAlign = 'center';
        g.fillText('陰陽合參・玉女心經', 180, 34);
      }
      g.restore();
      return ergo;
    }
  }

  // 2. Micro-environment Props
  if ((view.work === 'water' || focalActor?.task?.act === 'water') && !ergo.cliffLeapStage) {
    // Stone steps
    if (g.fillRect) {
      g.fillStyle = '#baa380';
      g.fillRect(20, groundY - 12, 60, 12);
      g.fillRect(50, groundY - 24, 60, 12);
      g.fillRect(80, groundY - 36, 60, 12);
      // Well
      g.fillStyle = '#8f7756';
      g.fillRect(10, groundY - 60, 35, 60);
    }
    if (g.strokeRect) {
      g.strokeStyle = '#5a462f';
      g.strokeRect(10, groundY - 60, 35, 60);
    }
  } else if (view.work === 'chop' || focalActor?.task?.act === 'chop') {
    // Chopping stump
    if (g.ellipse && g.fill) {
      g.fillStyle = '#6e4f30';
      g.beginPath();
      g.ellipse(250, groundY - 10, 22, 10, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (g.fillRect) {
      g.fillStyle = '#6e4f30';
      g.fillRect(228, groundY - 28, 44, 20);
    }
    if (g.ellipse && g.fill) {
      g.fillStyle = '#876541';
      g.beginPath();
      g.ellipse(250, groundY - 28, 22, 8, 0, 0, Math.PI * 2);
      g.fill();
    }

    if (ergo.laborDetail.isAxeStuck) {
      // Stuck timber log & axe
      if (g.fillRect) {
        g.fillStyle = '#a6855b';
        g.fillRect(240, groundY - 58, 20, 32);
        g.fillStyle = '#839494';
        g.fillRect(246, groundY - 50, 14, 8);
      }
      if (g.strokeRect) {
        g.strokeStyle = '#322b29';
        g.strokeRect(246, groundY - 50, 14, 8);
      }
      if (g.beginPath && g.stroke) {
        g.strokeStyle = '#624631';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(250, groundY - 46);
        g.lineTo(220, groundY - 65);
        g.stroke();
      }
      if (g.fillText) {
        g.fillStyle = '#8a3a2b';
        g.font = '10px sans-serif';
        g.fillText('卡斧・拔斧甩手中', 215, groundY - 68);
      }
    } else if (ergo.laborDetail.woodSplit) {
      // Two split halves
      if (g.fillRect) {
        if (g.save && g.restore) {
          g.save();
          if (g.translate && g.rotate) {
            g.translate(225, groundY - 25);
            g.rotate(-0.35);
          }
          g.fillStyle = '#bda078';
          g.fillRect(-8, -15, 16, 28);
          g.restore();

          g.save();
          if (g.translate && g.rotate) {
            g.translate(275, groundY - 25);
            g.rotate(0.35);
          }
          g.fillStyle = '#bda078';
          g.fillRect(-8, -15, 16, 28);
          g.restore();
        }
        // Chips
        g.fillStyle = '#dfc499';
        for (let k = 0; k < 6; k++) {
          g.fillRect(240 + (k % 3) * 8 - 8, groundY - 45 - k * 5, 3, 2);
        }
      }
    } else {
      if (g.fillRect) {
        g.fillStyle = '#a6855b';
        g.fillRect(240, groundY - 58, 20, 32);
      }
    }
  } else if (view.frame?.routine || focalActor?.task?.act === 'train') {
    // Wooden dummy
    if (g.fillRect) {
      g.fillStyle = '#835a34';
      g.fillRect(266, groundY - 80, 12, 80);
      g.fillRect(252, groundY - 62, 40, 6);
      g.fillRect(256, groundY - 46, 32, 6);
      g.fillRect(250, groundY - 25, 20, 6);
    }
  }

  const scale = 2.4;
  const duel = ergo.combatDetail || ergo.duel;
  const synergy = ergo.crowdDetail || ergo.synergy || duel;
  let focalActorX = opponent ? 110 : 180;
  if (opponent) {
    focalActorX = 110 + (duel.footShiftPx || 0);
    if (duel.dodgeTier === 'sideStep') {
      focalActorX += Math.sin((view.clock || 0) * 4) * 2;
    }
  }
  if (synergy?.guardianShield && synergy?.partner) {
    focalActorX += 18;
  }
  if (duel.microShiverPx > 0) {
    focalActorX += Math.sin((view.clock || 0) * 50) * duel.microShiverPx;
  }
  if (duel.dodgeTier === 'scramble' && g.beginPath && g.fill) {
    g.fillStyle = '#6cb7db';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      if (g.arc) g.arc(focalActorX - 8 + k * 8, groundY - 80 - k * 5, 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Terrain Cover (synergyMode === 'terrainCover' || synergy.cover)
  if (synergy?.synergyMode === 'terrainCover' || synergy?.cover) {
    const coverKind = synergy?.cover?.kind || 'tree';
    if (g.save && g.restore) {
      g.save();
      if (coverKind === 'gate') {
        if (g.fillRect) {
          g.fillStyle = '#7a6855';
          g.fillRect(focalActorX + 18, groundY - 85, 12, 85);
          g.fillStyle = '#4a3825';
          g.fillRect(focalActorX + 16, groundY - 88, 16, 6);
        }
        if (g.strokeRect) {
          g.strokeStyle = '#32251a';
          g.lineWidth = 1.5;
          g.strokeRect(focalActorX + 18, groundY - 85, 12, 85);
        }
      } else {
        if (g.fillRect) {
          g.fillStyle = '#5c4028';
          g.fillRect(focalActorX + 18, groundY - 75, 10, 75);
        }
        if (g.beginPath && g.fill) {
          g.fillStyle = '#2d5a27';
          g.beginPath();
          g.moveTo(focalActorX + 8, groundY - 50);
          g.lineTo(focalActorX + 23, groundY - 95);
          g.lineTo(focalActorX + 38, groundY - 50);
          g.fill();
          g.beginPath();
          g.moveTo(focalActorX + 11, groundY - 30);
          g.lineTo(focalActorX + 23, groundY - 65);
          g.lineTo(focalActorX + 35, groundY - 30);
          g.fill();
        }
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#1e5a22';
      g.font = 'bold 11px sans-serif';
      g.fillText('🌲 借樹卡位・一夫當關', focalActorX + 32, groundY - 80);
    }
  }

  // Partner rendering (partnerX = focalActorX - 32)
  const partnerX = focalActorX - 32;
  if (synergy?.partner && g.save && g.restore) {
    g.save();
    if (g.translate) g.translate(partnerX, groundY);
    if (synergy.synergyMode === 'backToBack') {
      if (g.scale) g.scale(-scale, scale);
    } else {
      if (g.scale) g.scale(scale, scale);
    }
    const partnerPose = displayPose(s, synergy.partner, null, null, s?.t || 0, false);
    drawPoseActor(g, synergy.partner, partnerPose);
    g.restore();
  }
  if (ergo.cliffLeapStage && s.hermitage?.active && g.save && g.restore) {
    const companion = s.ds?.find(d => d.id !== focalActor.id && d.at === focalActor.at && d.task?.node === focalActor.task?.node && !d.away);
    if (companion && companion !== synergy?.partner) {
      g.save(); g.translate(focalActorX - 64, groundY - ergo.leapArcY * .7);
      g.scale(scale * .8, scale * .8);
      drawPoseActor(g, companion, displayPose(s, companion, null, null, s.t, false));
      g.restore();
    }
  }

  // 出自 Phase 5 規格：藥膳溫養只在微距窗畫琥珀氣暈；45×80 對齊此窗人物輪廓，不改角色位置或碰撞。
  if (ergo.laborDetail.herbalBuffActive && g.save && g.restore && g.ellipse && g.fill) {
    g.save(); g.globalAlpha = 0.25; g.fillStyle = '#d99a45';
    g.beginPath(); g.ellipse(focalActorX, groundY - 70, 45, 80, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }

  // 3. Ghost Silhouette (宗師淡墨重影)
  if (view.frame?.routine || focalActor?.task?.act === 'train' || view.poses) {
    if (g.save && g.restore) {
      g.save();
      if (g.translate) g.translate(focalActorX, groundY);
      if (g.scale) g.scale(scale, scale);
      g.globalAlpha = 0.15;
      const masterPlayback = {
        ...p,
        hipHeight: PLAYBACK.uprightHip * PLAYBACK.deepHipRatio,
        sway: 0,
        waterTilt: 0
      };
      const ghostView = { ...view, playback: masterPlayback, lean: 0 };
      drawPoseActor(g, focalActor, ghostView);
      g.restore();
    }
  }

  // 4. Focal Actor
  if (g.save && g.restore) {
    g.save();
    if (g.translate) g.translate(focalActorX, groundY - ergo.leapArcY);
    if (g.scale) g.scale(scale, scale);
    const actorView = { ...view, ergo, playback: p };
    drawPoseActor(g, focalActor, actorView);
    g.restore();
  }
  if ((ergo.qinggongLeaping || ergo.cliffLeapStage) && g.beginPath && g.stroke) {
    // 出自 Phase 6 規格：身法軌跡取角色當前位置，畫面殘影不回寫任何物理座標。
    g.strokeStyle = '#6ab8ad'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(focalActorX - 28, groundY - 9);
    g.quadraticCurveTo(focalActorX - 35, groundY - 32 - ergo.leapArcY, focalActorX - 11, groundY - 22 - ergo.leapArcY);
    g.stroke();
  }

  // Water Splash droplets
  if (ergo.laborDetail.waterSplash && g.beginPath && g.fill) {
    g.fillStyle = '#5d9ec7';
    const bx1 = focalActorX - 25, bx2 = focalActorX + 25, by = groundY - 40;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      if (g.arc) g.arc(bx1 - 5 + i * 4, by - 6 - i * 3, 2, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      if (g.arc) g.arc(bx2 - 2 + i * 4, by - 5 - i * 4, 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 5. Opponent in Duel
  const oppX = 250;
  if (opponent && g.save && g.restore) {
    g.save();
    if (g.translate) g.translate(oppX, groundY);
    if (synergy?.crowdMode === 'walkPastKnockdown' && g.rotate) g.rotate(0.65);
    if (g.scale) g.scale(-scale, scale); // face left
    const oppPose = displayPose(s, opponent, null, null, s?.t || 0, false);
    drawPoseActor(g, opponent, oppPose);
    g.restore();
  }

  // Multi-Foe Crowd Silhouettes (multiFoeCount >= 2)
  if (synergy?.multiFoeCount >= 2 || (duel.allOpponents && duel.allOpponents.length >= 2)) {
    const extraOppXs = [282, 312];
    const extraCount = Math.min(2, Math.max(1, (synergy?.multiFoeCount || 2) - 1));
    for (let k = 0; k < extraCount; k++) {
      const extraX = extraOppXs[k];
      const extraFoe = duel.allOpponents?.[k + 1] || opponent || { name: '敵眾', k: 'bandit' };
      if (g.save && g.restore) {
        g.save();
        if (g.translate) g.translate(extraX, groundY);
        if (synergy?.crowdMode === 'walkPastKnockdown') {
          if (g.rotate) g.rotate(0.65);
        }
        if (g.scale) g.scale(-scale * 0.9, scale * 0.9);
        g.globalAlpha = 0.75 - k * 0.2;
        const extraPose = displayPose(s, extraFoe, null, null, s?.t || 0, false);
        drawPoseActor(g, extraFoe, extraPose);
        g.restore();
      }
    }
  }

  // 6. Signature Combat Scenarios Canvas Overlays
  // Scenario A: Rookie Pecking & Clash Sparks
  if (opponent && (duel.exchangeMode === 'rookiePecking' || duel.clashSparks)) {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#f39c12';
      g.lineWidth = 1.8;
      const sparkX = 180, sparkY = groundY - 75;
      const angles = [0.2, 1.1, 2.3, 3.6, 4.8];
      for (const a of angles) {
        g.beginPath();
        g.moveTo(sparkX, sparkY);
        g.lineTo(sparkX + Math.cos(a) * 12, sparkY + Math.sin(a) * 12);
        g.stroke();
      }
      g.strokeStyle = '#ffe27a';
      g.lineWidth = 1;
      for (const a of [0.6, 1.8, 3.0, 4.2]) {
        g.beginPath();
        g.moveTo(sparkX, sparkY);
        g.lineTo(sparkX + Math.cos(a) * 7, sparkY + Math.sin(a) * 7);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#d35400';
      g.font = 'bold 11px sans-serif';
      g.fillText('噹！兵刃交擊・毫髮無傷', 130, groundY - 95);
    }
  }

  // Scenario B: Master Standoff & Flaw Strike
  if (opponent && duel.exchangeMode === 'masterStandoff') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#5dade2';
      g.lineWidth = 1.2;
      if (g.setLineDash) g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(focalActorX + 15, groundY - 95);
      g.lineTo(oppX - 15, groundY - 95);
      g.stroke();
      if (g.setLineDash) g.setLineDash([]);
      if (g.restore) g.restore();
    }
    if (g.fillRect) {
      g.fillStyle = '#6b8e23';
      g.fillRect(160, groundY - 30, 6, 2);
      g.fillRect(195, groundY - 50, 5, 2);
      g.fillRect(220, groundY - 25, 6, 2);
    }
    if (g.fillText) {
      g.fillStyle = '#2980b9';
      g.font = 'bold 11px sans-serif';
      g.fillText('⚡ 凝神對峙・意在劍先', 135, groundY - 110);
    }
  }

  if (opponent && (duel.exchangeMode === 'flawStrike' || duel.flawWindow?.open)) {
    const part = duel.flawWindow?.part || 'body';
    const flawY = part === 'eye' ? groundY - 95 : (part === 'hand' ? groundY - 68 : groundY - 75);
    const targetX = oppX;
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#e74c3c';
      g.lineWidth = 2;
      if (g.arc) {
        g.beginPath();
        g.arc(targetX, flawY, 8, 0, Math.PI * 2);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(targetX - 12, flawY);
      g.lineTo(targetX + 12, flawY);
      g.moveTo(targetX, flawY - 12);
      g.lineTo(targetX, flawY + 12);
      g.stroke();

      g.strokeStyle = '#ffffff';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(focalActorX + 25, groundY - 75);
      g.lineTo(targetX - 8, flawY);
      g.stroke();
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#c0392b';
      g.font = 'bold 12px sans-serif';
      g.fillText('⚡ 看破破綻・一擊必殺！', 130, groundY - 115);
    }
  }

  // Scenario C: Head-slip & Instant Counter Palm
  if (opponent && duel.dodgeTier === 'headSlip' && g.beginPath && g.stroke) {
    g.strokeStyle = '#c0392b88';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(210, groundY - 95);
    g.lineTo(135, groundY - 105);
    g.stroke();
    if (g.fillText) {
      g.fillStyle = '#c0392b';
      g.font = 'bold 11px sans-serif';
      g.fillText('原地擺頭避刃！', focalActorX - 20, groundY - 120);
    }

    if (duel.instantCounterPalm) {
      if (g.save) g.save();
      g.strokeStyle = '#f1c40f';
      g.lineWidth = 3;
      if (g.arc) {
        g.beginPath();
        g.arc(focalActorX + 35, groundY - 75, 14, -Math.PI / 3, Math.PI / 3);
        g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(focalActorX + 42, groundY - 75, 20, -Math.PI / 3, Math.PI / 3);
        g.stroke();
      }
      if (g.restore) g.restore();
      if (g.fillText) {
        g.fillStyle = '#b7950b';
        g.font = 'bold 11px sans-serif';
        g.fillText('✋ 隨手一掌反震！', focalActorX + 45, groundY - 90);
      }
    }
  }

  // Scenario D: Multi-attacker Threat Arcs & Composure Rage
  if (duel.angleLockCount >= 2 || duel.loadL >= 0.4) {
    const threats = Math.min(4, duel.angleLockCount || 2);
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(231, 76, 60, 0.7)';
      g.lineWidth = 2.5;
      for (let k = 0; k < threats; k++) {
        const yArc = 50 + k * 30;
        g.beginPath();
        if (g.arc) g.arc(350, yArc, 18, Math.PI * 0.75, Math.PI * 1.25);
        g.stroke();
        g.beginPath();
        g.moveTo(335, yArc);
        g.lineTo(325, yArc);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#c0392b';
      g.font = 'bold 11px sans-serif';
      g.fillText(`⚠ 眾敵鎖角 ×${duel.angleLockCount}`, 265, 24);
    }
  }

  if (duel.isRaging) {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(192, 57, 43, 0.6)';
      g.lineWidth = 3;
      if (g.ellipse) {
        g.beginPath();
        g.ellipse(focalActorX, groundY - 50, 26, 46, 0, 0, Math.PI * 2);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#962d22';
      g.font = 'bold 12px sans-serif';
      g.fillText('💢 久守心浮・惱羞硬拼！', focalActorX - 45, groundY - 110);
    }
  }

  // Scenario E: Witch Time Slow-Mo & Signature Art Flair
  if (duel.witchSlowMo) {
    if (g.strokeRect) {
      g.strokeStyle = '#e2b53c';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, 357, 217);
    }
    if (g.fillText) {
      g.fillStyle = '#e2b53c';
      g.font = 'bold 11px sans-serif';
      g.fillText('⚡ 林克時間・慢動作特寫', 12, 16);
    }
  }

  if (duel.zjEffect === 'jiuyang' || duel.reboundShock) {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(242, 194, 58, 0.85)';
      g.lineWidth = 3;
      if (g.ellipse) {
        g.beginPath();
        g.ellipse(focalActorX, groundY - 50, 32, 52, 0, 0, Math.PI * 2);
        g.stroke();
      }
      if (g.arc) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(focalActorX + 30, groundY - 50, 16, -Math.PI / 2, Math.PI / 2);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#b7950b';
      g.font = 'bold 11px sans-serif';
      g.fillText('🔔 九陽護體・反震敵手', focalActorX - 35, groundY - 108);
    }
  } else if (duel.zjEffect === 'taiji') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#16a085';
      g.lineWidth = 2;
      if (g.arc) {
        g.beginPath();
        g.arc(focalActorX + 28, groundY - 55, 18, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#7f8c8d';
        g.beginPath();
        g.arc(focalActorX + 28, groundY - 45, 9, 0, Math.PI);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#117864';
      g.font = 'bold 11px sans-serif';
      g.fillText('☯ 四兩撥千斤', focalActorX + 15, groundY - 80);
    }
  } else if (duel.zjEffect === 'kuihua') {
    if (g.beginPath && g.fill) {
      if (g.save) g.save();
      g.fillStyle = 'rgba(208, 64, 112, 0.6)';
      for (let k = 1; k <= 3; k++) {
        const px = focalActorX + (oppX - focalActorX) * (k / 4);
        const py = groundY - 50 - (k % 2) * 12;
        g.beginPath();
        if (g.arc) g.arc(px, py, 6, 0, Math.PI * 2);
        g.fill();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#a52852';
      g.font = 'bold 11px sans-serif';
      g.fillText('🪡 來去無蹤', 170, groundY - 70);
    }
  } else if (duel.zjEffect === 'dugu') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#5dade2';
      g.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.moveTo(focalActorX + 10 + k * 18, groundY - 85 + k * 8);
        g.lineTo(oppX - 30 + k * 10, groundY - 60 - k * 8);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#2471a3';
      g.font = 'bold 11px sans-serif';
      g.fillText('🗡 無招勝有招', 165, groundY - 85);
    }
  }

  // Phase 3 Scenario: Partner & Formation Synergy Overlays
  if (synergy?.synergyMode === 'twinSwordsCouple') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(focalActorX + 10, groundY - 60);
      if (g.quadraticCurveTo) {
        g.quadraticCurveTo(180, groundY - 95, oppX - 10, groundY - 65);
      } else {
        g.lineTo(oppX - 10, groundY - 65);
      }
      g.stroke();

      g.strokeStyle = '#5dade2';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(partnerX + 10, groundY - 55);
      if (g.quadraticCurveTo) {
        g.quadraticCurveTo(180, groundY - 35, oppX - 10, groundY - 65);
      } else {
        g.lineTo(oppX - 10, groundY - 65);
      }
      g.stroke();
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#2980b9';
      g.font = 'bold 12px sans-serif';
      g.fillText('☯ 雙劍合璧・玉女素心！', 120, groundY - 120);
    }
  }

  if (synergy?.synergyMode === 'zhenwuArray') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(241, 196, 15, 0.85)';
      g.lineWidth = 2;
      if (g.ellipse) {
        g.beginPath();
        g.ellipse(focalActorX + 20, groundY - 6, 65, 18, 0, 0, Math.PI * 2);
        g.stroke();
      }
      const stars = [
        [focalActorX - 25, groundY - 8],
        [focalActorX - 10, groundY - 14],
        [focalActorX + 8, groundY - 12],
        [focalActorX + 25, groundY - 5],
        [focalActorX + 42, groundY - 10],
        [focalActorX + 60, groundY - 7]
      ];
      g.strokeStyle = '#f9e79f';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(stars[0][0], stars[0][1]);
      for (let k = 1; k < stars.length; k++) {
        g.lineTo(stars[k][0], stars[k][1]);
      }
      g.stroke();
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#b7950b';
      g.font = 'bold 12px sans-serif';
      g.fillText('⚔ 真武七截陣・天罡合擊！', 115, groundY - 120);
    }
  }

  if (synergy?.synergyMode === 'backToBack' && g.fillText) {
    g.fillStyle = '#2c3e50';
    g.font = 'bold 12px sans-serif';
    g.fillText('🛡 背靠背禦敵・死角封鎖', focalActorX - 35, groundY - 110);
  }

  if (synergy?.guardianShield) {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(231, 76, 60, 0.9)';
      g.lineWidth = 3.5;
      if (g.arc) {
        g.beginPath();
        g.arc(focalActorX + 20, groundY - 50, 24, -Math.PI / 2, Math.PI / 2);
        g.stroke();
        g.strokeStyle = '#f1c40f';
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(focalActorX + 24, groundY - 50, 28, -Math.PI / 2, Math.PI / 2);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#c0392b';
      g.font = 'bold 12px sans-serif';
      g.fillText('❤️ 捨身護侶・寸步不讓！', focalActorX - 25, groundY - 115);
    }
  }

  // Phase 3 Scenario: Crowd Mow-Down & Blind-All-Eyes Overlays
  if (synergy?.crowdMode === 'walkPastKnockdown') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = 'rgba(255, 235, 140, 0.85)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(focalActorX - 25, groundY - 60);
      if (g.quadraticCurveTo) {
        g.quadraticCurveTo(focalActorX + 40, groundY - 75, 290, groundY - 50);
      } else {
        g.lineTo(290, groundY - 50);
      }
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(focalActorX - 15, groundY - 45);
      if (g.quadraticCurveTo) {
        g.quadraticCurveTo(focalActorX + 50, groundY - 60, 310, groundY - 40);
      } else {
        g.lineTo(310, groundY - 40);
      }
      g.stroke();
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#b7950b';
      g.font = 'bold 12px sans-serif';
      g.fillText('🍃 錯身輕拂・走過倒一片！', 120, groundY - 110);
    }
  }

  if (synergy?.crowdMode === 'blindAllEyes') {
    const eyeXs = [oppX, 282, 312];
    const eyeY = groundY - 95;
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#e74c3c';
      g.lineWidth = 2;
      for (const ex of eyeXs) {
        if (g.arc) {
          g.beginPath();
          g.arc(ex, eyeY, 6, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(ex - 8, eyeY);
        g.lineTo(ex + 8, eyeY);
        g.moveTo(ex, eyeY - 8);
        g.lineTo(ex + 8, eyeY);
        g.stroke();
      }
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(focalActorX + 20, eyeY);
      for (const ex of eyeXs) {
        g.lineTo(ex, eyeY);
      }
      g.stroke();
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#c0392b';
      g.font = 'bold 12px sans-serif';
      g.fillText('🗡 一劍破盡・盡奪敵目！', 125, groundY - 120);
    }
  }

  if (synergy?.crowdMode === 'whirlwindSweep') {
    if (g.beginPath && g.stroke) {
      if (g.save) g.save();
      g.strokeStyle = '#5dade2';
      g.lineWidth = 3.5;
      if (g.arc) {
        g.beginPath();
        g.arc(focalActorX + 30, groundY - 60, 45, -Math.PI * 0.45, Math.PI * 0.45);
        g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(focalActorX + 35, groundY - 60, 48, -Math.PI * 0.4, Math.PI * 0.4);
        g.stroke();
      }
      if (g.restore) g.restore();
    }
    if (g.fillText) {
      g.fillStyle = '#2980b9';
      g.font = 'bold 12px sans-serif';
      g.fillText('🌪 橫掃千軍・群戰破圍！', 125, groundY - 115);
    }
  }

  // 7. Top-Left Stance Stamp / Labor Status Badge
  let headerText = '';
  let subText = '';
  if (view.frame?.routine) {
    headerText = `《${view.frame.routine.name}》第 ${view.frame.form} 式：${view.frame.formName}`;
    const uses = handUses(focalActor, view.move || 'bodyPunch');
    subText = `手熟 ${uses} 次・前搖 ${(p.wind || 0.45).toFixed(2)}s・馬步深淺 ${p.hipHeight.toFixed(1)}px`;
  } else if (view.work === 'water' || focalActor?.task?.act === 'water') {
    headerText = `日課・挑水（水桶傾角 ${p.waterTilt.toFixed(1)}°）`;
    subText = ergo.laborDetail.waterSplash ? '步伐晃動・水花飛濺・好沉…' : '四平八穩・扁擔共振・滴水不灑';
  } else if (view.work === 'chop' || focalActor?.task?.act === 'chop') {
    headerText = `日課・砍柴（停頓 ${p.chopPause.toFixed(2)}s）`;
    subText = ergo.laborDetail.isAxeStuck ? '手生砍偏・卡斧拔斧甩手中' : (ergo.laborDetail.woodSplit ? '腰馬合一・一斧兩斷！' : '劈柴修整');
  } else if (opponent) {
    headerText = `微距對決・${focalActor.name || '弟子'} vs ${opponent.name || '敵人'}`;
    if (duel.exchangeMode === 'flawStrike') {
      subText = '看破破綻・瞬息截擊！';
    } else if (duel.exchangeMode === 'headSlipCounter') {
      subText = '原地擺頭避刃・隨手一掌反震';
    } else if (duel.exchangeMode === 'rageAllOut') {
      subText = '久守心浮・惱羞硬拼！';
    } else if (duel.exchangeMode === 'masterStandoff') {
      subText = '宗師對峙・虛實莫測';
    } else if (duel.exchangeMode === 'scrambleDefense') {
      subText = '眾敵合圍・狼狽避閃';
    } else if (duel.exchangeMode === 'rookiePecking') {
      subText = '菜雞互啄・毫髮無傷';
    } else {
      subText = duel.dodgeTier === 'headSlip' ? '眼疾手快・原地擺頭避刃' : (duel.dodgeTier === 'scramble' ? '眾敵合圍・狼狽避閃' : '靈巧身法・側步避讓');
    }
  } else {
    headerText = `弟子日常・${focalActor.name || '弟子'}`;
    subText = `力氣 ${strength.toFixed(0)}・身法 ${agility.toFixed(0)}・氣息 ${ergo.buildProfile.breathRate.toFixed(1)}×`;
  }

  if (ergo.laborDetail.muscleFatigue >= 100) {
    headerText = '💪 肌肉疲勞已滿';
    subText = `今日成長週期 ${ergo.laborDetail.recoveryCycleLabel}・需歇息或藥膳調養`;
  } else if (ergo.laborDetail.herbalBuffActive) {
    headerText = `🍵 ${focalActor.herbalBuffName || '藥膳'}溫養中`;
    subText = `疲勞消退・今日超量恢復週期 ${ergo.laborDetail.recoveryCycleLabel}`;
  }

  if (g.fillRect && g.fillText) {
    g.fillStyle = '#8a2b1c';
    g.fillRect(10, 8, 4, 15);
    g.font = 'bold 13px sans-serif';
    g.fillStyle = '#422a18';
    g.fillText(headerText, 18, 20);
    g.font = '11px sans-serif';
    g.fillStyle = '#6e5239';
    g.fillText(subText, 12, 36);
  }

  // Wave Gauntlet banner (top-right at x = 200, y = 16)
  if (synergy?.waveGauntlet?.active && synergy.waveGauntlet.bannerText && g.fillText) {
    if (g.save) g.save();
    if (g.fillRect) {
      g.fillStyle = 'rgba(40, 30, 20, 0.65)';
      g.fillRect(195, 4, 155, 18);
    }
    g.fillStyle = '#f39c12';
    g.font = 'bold 11px sans-serif';
    g.fillText(synergy.waveGauntlet.bannerText, 200, 16);
    if (g.restore) g.restore();
  }

  // MBTI Persona badge when in combat
  const inDuel = opponent != null || duel.isRaging || duel.reboundShock || ((synergy?.multiFoeCount || 0) >= 2);
  if (inDuel && synergy?.mbtiCode && synergy?.personaLabel && g.fillText) {
    g.fillStyle = '#8e44ad';
    g.font = 'bold 10px sans-serif';
    g.fillText(`【${synergy.mbtiCode}・${synergy.personaLabel}】`, 12, 50);
  }

  // 8. Dual Combat Telemetry Bar (定力真氣護體條 + 重心平衡儀)
  if (inDuel) {
    const cBarX = 80, cBarY = 180, cBarW = 200, cBarH = 8;
    if (g.fillText) {
      g.font = '10px sans-serif';
      g.fillStyle = '#5c4532';
      g.fillText('定力真氣', 12, 187);
    }
    if (g.fillRect) {
      g.fillStyle = '#d1c0a0';
      g.fillRect(cBarX, cBarY, cBarW, cBarH);
      const fretFillW = Math.max(0, Math.min(cBarW, cBarW * (duel.fretRatio || 0)));
      g.fillStyle = duel.isRaging ? '#c0392b' : (duel.fretRatio > 0.6 ? '#e67e22' : '#27ae60');
      g.fillRect(cBarX, cBarY, fretFillW, cBarH);
    }
    if (g.strokeRect) {
      g.strokeStyle = '#624b33';
      g.lineWidth = 1;
      g.strokeRect(cBarX, cBarY, cBarW, cBarH);
    }
    if (g.fillText) {
      const fretStatus = duel.isRaging
        ? '怒火硬拼！'
        : (duel.fretRatio > 0.6 ? '心浮氣躁' : `定力穩健 (${((1 - duel.fretRatio) * 100).toFixed(0)}%)`);
      g.fillStyle = duel.isRaging ? '#c0392b' : '#3b6140';
      g.font = 'bold 10px sans-serif';
      g.fillText(fretStatus, cBarX + cBarW + 8, 187);
    }
  }

  // 9. Balance & Posture Bar (重心平衡儀)
  const barX = 80, barY = 194, barW = 200, barH = 10;
  if (g.fillText) {
    g.font = '11px sans-serif';
    g.fillStyle = '#5c4532';
    g.fillText('重心平衡儀', 12, 203);
  }
  if (g.fillRect) {
    g.fillStyle = '#d1c0a0';
    g.fillRect(barX, barY, barW, barH);
    const safeHalf = (barW / 2) * 0.75;
    g.fillStyle = '#b7cca8';
    g.fillRect(barX + barW / 2 - safeHalf, barY, safeHalf * 2, barH);
  }
  if (g.beginPath && g.stroke) {
    g.strokeStyle = '#624b33';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(barX + barW / 2, barY - 2);
    g.lineTo(barX + barW / 2, barY + barH + 2);
    g.stroke();
  }
  const knobX = barX + barW / 2 + (ergo.jointSpring.comOffset || 0) * (barW / 2);
  if (g.beginPath && g.fill) {
    g.fillStyle = ergo.jointSpring.isStumbling ? '#d0302a' : '#396b8e';
    g.beginPath();
    if (g.arc) g.arc(knobX, barY + barH / 2, 5, 0, Math.PI * 2);
    g.fill();
    if (g.stroke) {
      g.strokeStyle = '#fff';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  if (g.fillText) {
    g.fillStyle = ergo.jointSpring.isStumbling ? '#c0392b' : '#3b6140';
    g.font = 'bold 11px sans-serif';
    g.fillText(ergo.jointSpring.isStumbling ? '失衡踉蹌！' : '平衡穩健', barX + barW + 8, 203);
  }

  if (g.restore) g.restore();
  return ergo;
}
