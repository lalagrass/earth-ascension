// N60: each body piece is a tiny, hand-painted bitmap on an offscreen canvas.
// The same joint coordinates animate everyone; only this appearance data changes.
const OUTFITS = Object.freeze({
  hero: { hair: 'topknot', cloth: '#6a8398', shade: '#43576e', light: '#a8b6b2', pants: '#455765', skin: '#e5bb8a' },
  senior: { hair: 'short', cloth: '#817895', shade: '#544e69', light: '#b1a5ae', pants: '#514c60', skin: '#d8ae80' },
  cousin: { hair: 'fringe', cloth: '#77916d', shade: '#4b654d', light: '#a7b491', pants: '#4d6046', skin: '#ebc59a' },
  bandit: { hair: 'messy', cloth: '#9a7259', shade: '#624631', light: '#b99a72', pants: '#584b3c', skin: '#c9966d' },
  elder: { hair: 'topknot', cloth: '#9a865c', shade: '#695b43', light: '#c2ad83', pants: '#625b51', skin: '#dfb58c' },
});
const VARIANTS = [OUTFITS.hero, OUTFITS.senior, OUTFITS.cousin, OUTFITS.bandit, OUTFITS.elder];
const HAIRS = ['short', 'fringe', 'topknot', 'messy', 'bun'];
const ACTOR_OUTFIT = Object.freeze({ hero:'hero', 'origin-1':'senior', 'origin-2':'cousin', senior:'senior', cousin:'cousin' });
const hash = (s) => [...String(s || '')].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);
export function dollProfile(d, female = false) {
  const fixed = OUTFITS[ACTOR_OUTFIT[d?.id] || (d?.sprite === 'bandit' || d?.sprite === 'elder' || !d?.id ? d?.sprite : '')];
  const identity = hash(d?.id || d?.name || d?.sprite), variant = fixed || VARIANTS[identity % VARIANTS.length];
  const hair = fixed ? variant.hair : HAIRS[(identity >>> 8) % HAIRS.length];
  return { ...variant, hair: female && hair === 'topknot' ? 'bun' : hair,
    hairColor: d?.sprite === 'elder' ? '#a69e8b' : '#302927',
    build: d?.child && !d.adult ? 'young' : d?.sprite === 'bandit' ? 'broad' : 'regular',
    weapon: d?.carry?.tool || null };
}
const cache = new Map();
const OUTLINE = '#322b29';
function bitmap(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; paint(g);
  return c;
}
function piece(kind, p) {
  const key = [kind, p.hair, p.hairColor, p.cloth, p.shade, p.light, p.pants, p.skin, p.build].join('|');
  if (cache.has(key)) return cache.get(key);
  const img = bitmap(kind === 'torso' ? 20 : kind === 'head' || kind === 'hair' ? 18 : 10,
    kind === 'torso' ? 25 : kind === 'head' || kind === 'hair' ? 19 : 18, (g) => {
      const r = (x,y,w,h,c) => { g.fillStyle = c; g.fillRect(x,y,w,h); };
      if (kind === 'torso') {
        r(2,1,16,22,OUTLINE); r(3,2,14,19,p.shade); r(4,3,12,17,p.cloth);
        if (p.build === 'broad') { r(0,3,4,8,OUTLINE);r(16,3,4,8,OUTLINE);r(1,4,3,6,p.cloth);r(16,4,3,6,p.cloth); }
        r(4,3,3,13,p.light); r(10,4,2,15,p.shade); r(3,18,14,3,'#544332');
        r(8,19,4,2,'#c7a76e'); r(5,22,11,2,p.shade);
      } else if (kind === 'head') {
        r(4,1,10,17,OUTLINE); r(2,4,14,12,OUTLINE); r(3,4,12,11,p.skin);
        r(4,6,2,8,'#b17e64'); r(12,5,2,9,'#f1d1a4');
        r(6,10,2,2,OUTLINE); r(11,10,2,2,OUTLINE); r(8,14,3,1,'#996c5c');
      } else if (kind === 'hair') {
        const c=p.hairColor; r(3,1,12,4,OUTLINE); r(4,2,10,3,c);
        if (p.hair === 'fringe') { r(2,3,14,3,c); r(3,6,4,4,c); r(13,5,3,5,c); }
        if (p.hair === 'short') { r(3,4,3,5,c); r(13,4,2,5,c); }
        if (p.hair === 'messy') { r(1,4,4,5,c); r(12,3,5,7,c); r(7,0,4,3,c); }
        if (p.hair === 'topknot' || p.hair === 'bun') { r(8,0,4,4,c); r(7,0,6,1,OUTLINE); }
        if (p.hair === 'bun') { r(1,5,4,6,c); r(13,5,4,6,c); r(3,10,3,7,c); r(12,10,3,7,c); }
      } else if (kind === 'upperArm' || kind === 'foreArm') {
        r(1,0,8,18,OUTLINE); r(2,1,6,15,p.shade); r(3,2,4,13,p.cloth);
        r(3,2,2,10,p.light); if (kind === 'foreArm') { r(2,13,6,3,p.skin); r(3,15,4,2,OUTLINE); }
      } else if (kind === 'thigh' || kind === 'shin') {
        r(1,0,8,18,OUTLINE); r(2,1,6,16,p.shade); r(3,2,4,13,p.pants);
        r(3,3,2,10,p.light); if (kind === 'shin') { r(2,14,7,3,'#3c342e'); r(1,16,9,2,OUTLINE); }
      }
    });
  cache.set(key,img); return img;
}
function segment(g, img, x0, y0, x1, y1, width) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  g.save(); g.translate(x0,y0); g.rotate(Math.atan2(y1-y0,x1-x0)-Math.PI/2);
  g.imageSmoothingEnabled = false; g.drawImage(img,-width/2,0,width,length+2); g.restore();
}
const heldCache = new Map();
function held(g, weapon, x, y) {
  if (!weapon) return;
  const reach = weapon === 'staff' ? 39 : weapon === 'sword' ? 25 : 20;
  if(!heldCache.has(weapon)) heldCache.set(weapon,bitmap(weapon === 'axe' ? 16 : 6,reach+10,(c) => {
    c.fillStyle = OUTLINE; c.fillRect(1,0,4,reach+9);
    c.fillStyle = weapon === 'staff' ? '#9b7146' : '#c5d0cc'; c.fillRect(2,1,2,reach+7);
    if (weapon === 'axe') { c.fillStyle='#839494'; c.fillRect(3,1,12,8); c.fillStyle='#c3cdca'; c.fillRect(4,1,10,2); }
  }));
  const img=heldCache.get(weapon);
  g.save();g.translate(x,y);g.rotate(.24);g.imageSmoothingEnabled=false;g.drawImage(img,0,-reach);g.restore();
}
export function drawPaperDoll(g, d, view, geometry) {
  const { hip, sink, lean, legs, arms, female, ergo } = geometry, p = dollProfile(d,female);
  const bp = ergo?.buildProfile;
  const duel = ergo?.combatDetail || ergo?.duel || view?.ergo?.combatDetail || view?.ergo?.duel;
  const synergy = ergo?.crowdDetail || ergo?.synergy || view?.ergo?.crowdDetail || view?.ergo?.synergy || duel;
  const isWalkPast = synergy?.crowdMode === 'walkPastKnockdown';
  const isGuardianShield = Boolean(synergy?.guardianShield);
  const waistDelta = bp?.waistDelta || 0;
  const shoulderDelta = bp?.shoulderDelta || 0;
  const isRaging = Boolean(duel?.isRaging);
  const effectiveLean = isRaging ? lean + 4 : lean;

  for (const [j,[kx,ky,fx,fy]] of legs.entries()) {
    const x=j?5:-5, y=-hip, kneeY=ky*hip/geometry.uprightHip;
    segment(g,piece('thigh',p),effectiveLean*.45+x,y,kx,kneeY,9);
    segment(g,piece('shin',p),kx,kneeY,fx,fy,8);
  }
  g.save();g.translate(0,sink);g.imageSmoothingEnabled=false;
  if (ergo?.qinggongLeaping || ergo?.cliffLeapStage) {
    // 出自 Phase 6 規格：紙偶衣襟隨輕功上揚，僅畫面效果。
    g.fillStyle = '#7bbdb1';
    g.beginPath(); g.moveTo(effectiveLean - 8, -35);
    g.lineTo(effectiveLean - 24, -43); g.lineTo(effectiveLean - 10, -25); g.fill();
  }

  if (isRaging && g.strokeRect) {
    g.strokeStyle = 'rgba(192, 57, 43, 0.45)';
    g.lineWidth = 3;
    g.strokeRect(effectiveLean - 18, -65, 36, 75);
  }

  if (waistDelta || shoulderDelta) {
    g.drawImage(piece('torso',p),effectiveLean-10-waistDelta/2,-43,20+waistDelta,25);
  } else {
    g.drawImage(piece('torso',p),effectiveLean-10,-43);
  }
  if (bp && bp.breathRate > 1.2) {
    const breath = Math.sin((view.clock || 0) * 5 * bp.breathRate) * 0.8;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(effectiveLean - 8, -40 + breath, 16, 8);
  }
  for (const [j,[ex,ey,hx,hy]] of arms.entries()) {
    const x=effectiveLean+(j?8:-8)+(j?shoulderDelta/2:-shoulderDelta/2);
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
    segment(g,piece('upperArm',p),x,-39,armEx,armEy,8);
    segment(g,piece('foreArm',p),armEx,armEy,armHx,armHy,7);
    if(j)held(g,geometry.weapon,armHx,armHy);
    if(view.work==='water') { g.fillStyle='#6b4d30';g.fillRect(armHx-5,armHy+6,11,15);g.fillStyle='#9cb8bd';g.fillRect(armHx-3,armHy+8,7,3); }

    if (duel?.instantCounterPalm && j === 1 && g.beginPath && g.arc && g.stroke) {
      g.strokeStyle = 'rgba(255, 235, 140, 0.85)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(armHx + 6, armHy, 9, -Math.PI / 2, Math.PI / 2);
      g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(armHx + 12, armHy, 14, -Math.PI / 2, Math.PI / 2);
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
  }
  if (view.work === 'water' && ergo?.laborDetail?.poleBend) {
    const bend = ergo.laborDetail.poleBend;
    g.strokeStyle = '#856d46';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(effectiveLean - 22, -38);
    g.quadraticCurveTo(effectiveLean, -38 + bend, effectiveLean + 22, -38);
    g.stroke();
  }

  const isHeadSlip = duel?.dodgeTier === 'headSlip' && Boolean(duel?.opponent);
  if (isHeadSlip && g.save && g.restore) {
    g.save();
    const rad = -((duel.headTiltDeg || 15) * Math.PI) / 180;
    if (g.translate) g.translate(effectiveLean - 4, -49);
    if (g.rotate) g.rotate(rad);
    g.drawImage(piece('head', p), -5, -10);
    g.drawImage(piece('hair', p), -5, -10);
    if (isRaging && g.fillRect) {
      g.fillStyle = '#c0392b';
      g.fillRect(0, -6, 2, 2);
      g.fillRect(4, -6, 2, 2);
    }
    g.restore();
  } else {
    g.drawImage(piece('head',p),effectiveLean-9,-59);
    g.drawImage(piece('hair',p),effectiveLean-9,-59);
    if (isRaging && g.fillRect) {
      g.fillStyle = '#c0392b';
      g.fillRect(effectiveLean - 3, -50, 2, 2);
      g.fillRect(effectiveLean + 2, -50, 2, 2);
      g.fillStyle = '#962d22';
      g.fillRect(effectiveLean - 1, -55, 3, 1);
      g.fillRect(effectiveLean, -56, 1, 3);
    }
  }

  if (bp && bp.sweatLevel > 0) {
    g.fillStyle = '#6cb7db';
    g.fillRect(effectiveLean + 8, -55, 2, 3);
    if (bp.sweatLevel > 0.3) g.fillRect(effectiveLean - 10, -52, 2, 2);
  }
  g.restore();
}

export { renderMicroStage } from './pose-render.mjs';
