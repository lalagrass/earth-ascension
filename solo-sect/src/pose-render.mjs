import {impactVisual} from './contact-view.mjs';
import { MOVES } from './data.mjs';
import { windOf, artTier } from './arts.mjs';
import { playbackParams, PLAYBACK } from './growth-playback.mjs';
import { POSTURES, COMBAT_POSES, WORK_POSES, routineFrame } from './routines.mjs';
import { isFemaleVisual } from './visual-gender.mjs';

// 同一個骨架與補間器套在每名人物，人物只提供外觀色與朝向。
const LEGS = {
  stand: [[-5, -8, -7, 0], [5, -8, 7, 0]],
  horse: [[-13, -12, -15, 0], [13, -12, 15, 0]],
  leftBow: [[-13, -12, -21, 0], [12, -14, 16, 0]],
  rightBow: [[-12, -14, -16, 0], [13, -12, 21, 0]],
  oneLeg: [[-6, -13, -9, 0], [13, -18, 18, -15]],
  crouch: [[-15, -8, -18, 0], [13, -8, 18, 0]],
  leftKick: [[-6, -13, -8, 0], [-20, -18, -28, -21]],
  rightKick: [[6, -13, 8, 0], [20, -18, 28, -21]],
};
const ARMS = {
  carry: [[-15,-25,-23,-17],[15,-25,23,-17]],
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
  if (d.task?.act === 'train' && d.task.phase === 'do') {
    const f = routineFrame(art,d,s.t,playback);
    return { poses:f.poses,u:f.phase,key:f.formName,frame:f,...extra };
  }
  const act=d.task?.act;
  if(WORK_POSES[act]) {
    const pause=act==='chop'?playback.chopPause:0, moving=act==='chop'?4*.7:2;
    const phase=Math.max(0,((s.t%(moving+pause))-pause)/moving);
    return {poses:WORK_POSES[act],u:phase,key:act,work:act,...extra};
  }
  return null;
}

export function drawPoseActor(g, d, view) {
  const n = view.poses.length, k = Math.min(n - 1, view.u * (n - 1)), i = Math.floor(k), u = k - i;
  const a = POSTURES[view.poses[i]] || POSTURES.ready, b = POSTURES[view.poses[Math.min(n - 1, i + 1)]] || POSTURES.ready;
  const p=view.playback||playbackParams(d), hip=p.hipHeight, sink=PLAYBACK.uprightHip-hip;
  const lean = mix(a.lean, b.lean, u)+Math.sin((view.clock||0)*Math.PI*2)*p.sway, legsA = LEGS[a.legs], legsB = LEGS[b.legs], armsA = ARMS[a.arms], armsB = ARMS[b.arms];
  const female = isFemaleVisual(d);
  const color = female ? '#806375' : d.sprite === 'senior' ? '#796d91' : d.sprite === 'cousin' ? '#718963' : d.sprite === 'hero' ? '#647f92' : '#6a755e';
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#332b25';
  for (let j = 0; j < 2; j++) {
    const [kx, ky, fx, fy] = mixArray(legsA[j], legsB[j], u);
    g.lineWidth = 6; g.beginPath(); g.moveTo(lean * 0.45 + (j ? 5 : -5), -hip); g.lineTo(kx, ky*hip/PLAYBACK.uprightHip); g.lineTo(fx, fy); g.stroke();
  }
  g.translate(0,sink);
  if (female) { g.fillStyle = color; g.strokeStyle = '#372e2b'; g.lineWidth = 2; g.beginPath(); g.moveTo(lean - 7, -28); g.lineTo(lean + 7, -28); g.lineTo(lean + 17, -4); g.lineTo(lean - 17, -4); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = color; g.strokeStyle = '#372e2b'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(lean - 9, -42); g.lineTo(lean + 9, -42); g.lineTo(lean * 0.5 + 8, -18); g.lineTo(lean * 0.5 - 8, -18); g.closePath(); g.fill(); g.stroke();
  for (let j = 0; j < 2; j++) {
    const [ex, ey, hx, hy] = mixArray(armsA[j], armsB[j], u);
    g.strokeStyle = '#46362c'; g.lineWidth = 7; g.beginPath(); g.moveTo(lean + (j ? 8 : -8), -39); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    g.fillStyle = '#e7bf91'; g.beginPath(); g.arc(hx, hy, 3, 0, Math.PI * 2); g.fill();
    if (j && (a.weapon || b.weapon)) {
      const weapon = b.weapon || a.weapon, reach = weapon === 'staff' ? 39 : weapon === 'sword' ? 25 : 20;
      g.strokeStyle = weapon === 'staff' ? '#7e4c24' : '#b8c5c9'; g.lineWidth = weapon === 'staff' ? 3 : 2;
      g.beginPath(); g.moveTo(hx - 4, hy + 6); g.lineTo(hx + 7, hy - reach); g.stroke();
      if(weapon==='axe'){g.fillStyle='#9babb0';g.fillRect(hx+4,hy-reach,12,8);}
    }
    if(view.work==='water') {
      g.save();g.translate(hx,hy+6);g.rotate(Math.sin((view.clock||0)*4)*p.waterTilt*Math.PI/180);
      g.strokeStyle='#694f36';g.fillStyle='#9b784e';g.lineWidth=2;g.strokeRect(-5,0,10,7);g.fillRect(-6,7,12,13);
      g.fillStyle='#8ab5c6';g.fillRect(-4,8,8,2);g.restore();
    }
  }
  g.fillStyle = '#e7bf91'; g.strokeStyle = '#372e2b'; g.lineWidth = 2; g.beginPath(); g.arc(lean, -49, 8, 0, Math.PI * 2); g.fill(); g.stroke();
  if (female) { g.fillStyle = '#292529'; g.beginPath(); g.arc(lean + 6, -57, 5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(lean - 7, -53); g.lineTo(lean - 9, -38); g.lineTo(lean - 4, -40); g.lineTo(lean - 3, -53); g.fill(); g.beginPath(); g.moveTo(lean + 6, -53); g.lineTo(lean + 9, -39); g.lineTo(lean + 13, -41); g.lineTo(lean + 10, -56); g.fill(); }
  g.fillStyle = '#2f2929'; g.beginPath(); g.arc(lean + 3, -50, 1, 0, Math.PI * 2); g.fill();
  g.restore();
}
