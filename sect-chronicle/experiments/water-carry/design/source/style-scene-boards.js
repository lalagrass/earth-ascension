/* 《活俠傳》方向的整體畫風比較（#184，#195 補充的最小出口）：同一挑水場景的現況／新風格完整畫面，含 HUD 與對話框，另附 390px 裁切。
   本檔不是獨立頁：由 ../render-style-scene.js 先開 bl-v03-board.html（#179 場景與人物），注入 portrait-boards.js（#192／#193 立繪），再注入本檔。
   做法：先把 #179 的場景原樣存成「現況」，再換色盤、換掉環境的畫法（遠山、雲霧、植被、石頭、竹、前景），其餘（道館、石階、泉水、水缸、人物）沿用原幾何，
   套上紙紋、暈染與墨線濾鏡，存成「新風格」。站位、路線、鏡頭、人物尺寸、工作狀態兩張相同。
   全部原創 SVG；《活俠傳》只作方向參考，沒有描摹或取用原作素材。台詞只是示意，不是小說 canon。 */
'use strict';

/* ---------- 1. 現況：#179 場景原樣 ---------- */
const SS_HERO = pathAt(0.55);
const SS_CUR = sceneAfter();

/* ---------- 2. 新風格：色盤與畫法 ---------- */
const PAPER = { paper: '#efe4cc', paper2: '#e4d4b2', paperLit: '#f7f0de', ink: '#2b2620', ink2: '#4a4136', ink3: '#7a6e5e',
  far: '#a4aeb0', mid: '#7d8b8c', near: '#61716a', celadon: '#a8b48e', celadon2: '#869674', moss: '#5f7056',
  ochre: '#d8c193', ochre2: '#b99d6c', verm: '#b4442f', verm2: '#8f3324', water: '#86a9ad', water2: '#5e8389' };

// 環境改色：草地往青瓷綠、土路往赭黃、石頭往淡墨、屋頂往墨藍、水往灰青；人物只把飽和度收一點
Object.assign(C, {
  ink: PAPER.ink, line: '#b9a882',
  water: PAPER.water, waterLight: '#cfe0dc', waterDeep: PAPER.water2, foam: '#f3f1e6',
  grassLit: '#c4c8a0', grass: PAPER.celadon, grass2: PAPER.celadon2, grass3: '#6f8062', grassDark: PAPER.moss,
  earth: PAPER.ochre, earthEdge: PAPER.ochre2,
  slab: '#d9cfba', slabLit: '#efe7d6', slabDark: '#a99f8a', slabEdge: '#6f6556',
  stone: '#c9c1b0', stone2: '#a69d8c', stone3: '#5d554a', moss: '#6e7d58',
  roof: '#4a535b', roof2: '#363d44', roofLit: '#6c747b', wall: '#f2ead8', wall2: '#ddd0b4', pillar: '#9a3b2b', pillarLit: '#b4513b',
  wood: '#8f6a45', wood2: '#5a4129', woodLit: '#b48b5e',
  pine: '#4f5f4b', pine2: '#36433a', pineLit: '#6d7c62', trunk: '#4e3d2f',
  maple: '#bd5a3a', maple2: '#9b4630', mapleLit: '#d98a58', plum: '#efc9cf', plum2: '#dda3ae',
  hero: '#5a7ca6', hero2: '#3e5d82', heroLit: '#7e9cc2'
});

const SS_DEFS = `
  <filter id="wash" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".016" numOctaves="3" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".7"/></filter>
  <filter id="brush" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="5" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="paint" x="-4%" y="-4%" width="108%" height="108%"><feColorMatrix type="saturate" values=".78"/>
    <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="outline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="1" result="d"/>
    <feFlood flood-color="${PAPER.ink}" flood-opacity=".8"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="9"/>
    <feColorMatrix values="0 0 0 0 .32  0 0 0 0 .26  0 0 0 0 .18  0 0 0 .7 -.26"/></filter>
  <filter id="soft" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="10"/></filter>`;

// 山：一串峰，每座峰由腳到頂再到腳的抖動折線；填色上濃下淡（山腳沒入雲霧）
function ridgeD(peaks, base, seed) {
  const r = rng(seed); let d = `M${peaks[0][0] - peaks[0][2]},${base}`;
  for (const [x, top, w] of peaks) {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, h = Math.pow(Math.sin(Math.PI * t), 1.5);
      d += ` L${f(x - w + 2 * w * t + (r() - .5) * 6)},${f(base - (base - top) * h + (r() - .5) * 10 * h)}`;
    }
  }
  const last = peaks[peaks.length - 1];
  return d + ` L${last[0] + last[2]},${base} Z`;
}
// 皴：峰頂往下的幾道短墨線
function cun(peaks, base, seed, op) {
  const r = rng(seed); let s = '';
  for (const [x, top, w] of peaks) for (let k = 0; k < 4; k++) {
    const sx = x + (r() - .5) * w * .5, sy = top + 8 + r() * (base - top) * .25;
    s += `<path d="M${f(sx)},${f(sy)} q${f(-8 - r() * 10)},${f(14 + r() * 10)} ${f(-6 - r() * 14)},${f(34 + r() * 26)}" stroke="${PAPER.ink}" stroke-width="${f(1.2 + r() * 1.4)}" fill="none" opacity="${op}" stroke-linecap="round"/>`;
  }
  return s;
}
terrain = function () {
  const r = rng(11); let strokes = '', dabs = '';
  // 乾筆草痕代替一撮撮的草
  for (let i = 0; i < 60; i++) { const x = r() * 1600, y = 470 + r() * 400; if (Math.abs(y - 520 - (x - 900) * -.05) < 10) continue;
    strokes += `<path d="M${f(x)},${f(y)} q${f(10 + r() * 14)},-2 ${f(24 + r() * 20)},${f(r() * 2)}" stroke="${y > 700 ? '#6c7a5a' : '#879573'}" stroke-width="${f(1 + r() * 1.4)}" fill="none" opacity=".45" stroke-linecap="round"/>`; }
  for (let i = 0; i < 40; i++) { const x = r() * 1600, y = 600 + r() * 280; dabs += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.6 + r() * 1.4)}" fill="${['#f4ead0', '#e9b7a8', '#e3e6cf'][i % 3]}" opacity=".85"/>`; }
  const farP = [[120, 196, 120], [330, 132, 150], [560, 206, 120], [1010, 170, 140], [1250, 120, 170], [1500, 188, 120]];
  const midP = [[60, 262, 110], [250, 214, 120], [470, 252, 110], [1130, 236, 130], [1360, 210, 140], [1570, 250, 100]];
  return `<defs>${SS_DEFS}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4dcc6"/><stop offset=".5" stop-color="${PAPER.paper}"/><stop offset="1" stop-color="#efe2c6"/></linearGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAPER.far}"/><stop offset=".55" stop-color="${PAPER.far}" stop-opacity=".55"/><stop offset="1" stop-color="${PAPER.paper}" stop-opacity="0"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAPER.mid}"/><stop offset=".6" stop-color="${PAPER.mid}" stop-opacity=".6"/><stop offset="1" stop-color="${PAPER.paper}" stop-opacity="0"/></linearGradient>
    <linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAPER.near}" stop-opacity=".85"/><stop offset="1" stop-color="${PAPER.celadon}" stop-opacity=".2"/></linearGradient>
    <linearGradient id="slope" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#cdcaa0"/><stop offset=".55" stop-color="${PAPER.celadon}"/><stop offset="1" stop-color="${PAPER.celadon2}"/></linearGradient>
    <linearGradient id="plateau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6d0a6"/><stop offset="1" stop-color="#b9bb93"/></linearGradient>
    <radialGradient id="vignette" cx=".5" cy=".45" r=".78"><stop offset=".62" stop-color="#5a4630" stop-opacity="0"/><stop offset="1" stop-color="#5a4630" stop-opacity=".32"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <circle cx="232" cy="118" r="40" fill="${PAPER.verm}" opacity=".22" filter="url(#wash)"/>
  <g filter="url(#wash)"><path d="${ridgeD(farP, 420, 3)}" fill="url(#far)"/></g>
  <g filter="url(#brush)">${cun(farP, 420, 4, .18)}</g>
  <g filter="url(#soft)" fill="${PAPER.paperLit}"><ellipse cx="390" cy="262" rx="380" ry="20" opacity=".9"/><ellipse cx="1180" cy="246" rx="360" ry="18" opacity=".85"/></g>
  <g filter="url(#wash)"><path d="${ridgeD(midP, 470, 6)}" fill="url(#mid)"/></g>
  <g filter="url(#brush)">${cun(midP, 470, 7, .3)}</g>
  <g filter="url(#soft)" fill="${PAPER.paperLit}"><ellipse cx="430" cy="352" rx="520" ry="22" opacity=".95"/><ellipse cx="1200" cy="322" rx="460" ry="18" opacity=".85"/></g>
  <g filter="url(#wash)">
    <path d="M-40,386 Q160,352 320,372 Q480,394 640,366 Q760,346 900,362 Q1000,372 1100,356 L1100,470 L-40,470 Z" fill="url(#near)"/>
    <path d="M-40,424 Q300,380 620,430 Q760,452 860,420 L960,360 Q1200,300 1640,276 L1640,940 L-40,940 Z" fill="url(#slope)"/>
    <path d="M0,560 Q240,520 480,560 Q620,584 700,640 Q620,700 500,760 Q300,840 0,860 Z" fill="${PAPER.moss}" opacity=".12"/>
    <path d="M820,440 Q860,390 960,352 Q1200,300 1640,280 L1640,562 Q1300,590 1080,566 Q900,550 820,500 Z" fill="url(#plateau)"/>
  </g>
  <path d="M820,500 Q900,550 1080,566 Q1300,590 1600,560" stroke="${PAPER.ink2}" stroke-width="2.2" fill="none" opacity=".45" stroke-dasharray="90 14 40 10" filter="url(#brush)"/>
  ${strokes}${dabs}`;
}

// 松：墨色樹幹＋青灰暈染的松團，團下緣一道墨、上面一排短針
pine = function (x, y, s = 1, tone = 0) {
  const wash = [PAPER.celadon2, '#6f7d66', '#97a283'][tone], r = rng(x * 3 + y + tone);
  const pad = (cx, cy, rx, ry) => {
    let needles = '';
    for (let k = 0; k < 9; k++) { const nx = cx - rx * .8 + k * rx * .2; needles += `<path d="M${f(nx)},${f(cy + ry * .2)} l${f((r() - .5) * 4)},${f(-ry * (.6 + r() * .5))}" stroke="${PAPER.ink}" stroke-width="1.1" opacity=".55"/>`; }
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${wash}" opacity=".85"/>
      <path d="M${cx - rx},${cy + 1} Q${cx},${cy + ry * 1.3} ${cx + rx},${cy}" stroke="${PAPER.ink}" stroke-width="2.4" fill="none" opacity=".75"/>${needles}`;
  };
  return `<g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="14" cy="1" rx="40" ry="10" fill="#4a4030" opacity=".14"/>
    <g filter="url(#brush)">
      <path d="M-6,0 Q-1,-40 -5,-72 Q0,-98 5,-72 Q2,-40 7,0 Z" fill="${C.trunk}"/>
      <path d="M-4,-8 q-2,-14 1,-26 M2,-50 q2,-8 -1,-16" stroke="${PAPER.ink}" stroke-width="1.4" fill="none" opacity=".6"/>
      <path d="M-2,-40 Q-12,-46 -22,-52 M1,-60 Q10,-64 20,-70 M0,-84 Q-8,-90 -14,-94" stroke="${C.trunk}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      ${pad(-26, -56, 27, 11)}${pad(23, -74, 29, 12)}${pad(-14, -94, 24, 10)}${pad(8, -104, 26, 11)}${pad(-2, -122, 18, 8)}
    </g></g>`;
}
// 楓：朱赭暈染的葉團＋幾點墨
maple = function (x, y, s = 1) {
  const r = rng(x * 7 + y); let blobs = '', dots = '';
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 28;
    blobs += `<ellipse cx="${f(Math.cos(a) * d * 1.2)}" cy="${f(-78 + Math.sin(a) * d * .8)}" rx="${f(18 + r() * 8)}" ry="${f(13 + r() * 6)}" fill="${[C.maple, C.mapleLit, C.maple2][i % 3]}" opacity=".62"/>`; }
  for (let i = 0; i < 18; i++) dots += `<circle cx="${f((r() - .5) * 80)}" cy="${f(-78 + (r() - .5) * 56)}" r="${f(1.2 + r() * 1.4)}" fill="${PAPER.ink}" opacity=".5"/>`;
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="10" cy="1" rx="34" ry="8" fill="#4a4030" opacity=".14"/>
    <g filter="url(#brush)"><path d="M-4,0 Q-2,-30 -8,-56 M2,0 Q4,-34 14,-60 M-1,-30 Q-14,-46 -26,-58" stroke="${PAPER.ink2}" stroke-width="4.4" fill="none" stroke-linecap="round"/></g>
    <g filter="url(#wash)">${blobs}</g>${dots}</g>`;
}
plum = function (x, y, s = 1) {
  const r = rng(x + y * 3); let fl = '';
  for (let i = 0; i < 34; i++) { const lx = (r() - .5) * 70, ly = -52 - r() * 42; fl += `<circle cx="${f(lx)}" cy="${f(ly)}" r="${f(2 + r() * 2.2)}" fill="${i % 4 ? C.plum : PAPER.verm}" opacity="${i % 4 ? .95 : .7}"/>`; }
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="8" cy="1" rx="24" ry="6" fill="#4a4030" opacity=".12"/>
    <g filter="url(#brush)"><path d="M0,0 Q-4,-24 4,-40 Q12,-54 2,-70 M4,-40 Q-14,-52 -24,-66 M3,-46 Q20,-56 30,-74" stroke="${PAPER.ink}" stroke-width="3" fill="none" stroke-linecap="round"/></g>${fl}</g>`;
}
// 石：淡墨染＋墨線外框＋兩道皴
rock = function (x, y, s = 1, c = C.stone, mossy = false) {
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="2" cy="1" rx="22" ry="5" fill="#4a4030" opacity=".14"/>
    <path d="M-22,0 Q-25,-14 -11,-21 Q4,-29 16,-17 Q27,-8 22,0 Z" fill="${c}" opacity=".9" filter="url(#wash)"/>
    <g filter="url(#brush)"><path d="M-22,0 Q-25,-14 -11,-21 Q4,-29 16,-17 Q27,-8 22,0" fill="none" stroke="${PAPER.ink}" stroke-width="1.6" opacity=".8"/>
    <path d="M-8,-18 q-4,8 -2,16 M6,-20 q2,8 -1,14" stroke="${PAPER.ink}" stroke-width="1.1" fill="none" opacity=".45"/></g>
    ${mossy ? `<circle cx="-12" cy="-16" r="1.8" fill="${PAPER.ink}" opacity=".7"/><circle cx="-6" cy="-19" r="1.4" fill="${PAPER.ink}" opacity=".7"/><circle cx="2" cy="-21" r="1.6" fill="${PAPER.ink}" opacity=".7"/>` : ''}</g>`;
}
// 灌木：青瓷暈染＋苔點
bush = function (x, y, s = 1, flowers = false) {
  const r = rng(x * 3 + y); let dots = '';
  for (let i = 0; i < 10; i++) dots += `<circle cx="${f((r() - .5) * 46)}" cy="${f(-8 - r() * 24)}" r="${f(1.3 + r())}" fill="${flowers && i % 2 ? '#f1e3c4' : PAPER.ink}" opacity="${flowers && i % 2 ? .95 : .55}"/>`;
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="4" cy="1" rx="36" ry="7" fill="#4a4030" opacity=".12"/>
    <g filter="url(#wash)"><ellipse cx="-14" cy="-12" rx="20" ry="14" fill="${C.grass3}" opacity=".8"/><ellipse cx="12" cy="-14" rx="22" ry="16" fill="${C.grassDark}" opacity=".75"/>
    <ellipse cx="0" cy="-22" rx="18" ry="12" fill="${C.grass2}" opacity=".85"/></g>${dots}</g>`;
}
// 墨竹：深色竹竿、竹節、尖葉
bamboo = function (x, y, n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const bx = x + i * 10 - n * 4, h = 150 + (i * 37 % 60), tilt = i % 2 ? 5 : -4, col = i % 2 ? '#4c5a42' : '#3c4836';
    s += `<path d="M${bx},${y} L${bx + tilt},${y - h}" stroke="${col}" stroke-width="3.8" opacity=".85"/>`;
    for (let k = 22; k < h; k += 26) s += `<path d="M${bx + tilt * k / h - 2.6},${y - k} l5.2,0" stroke="${PAPER.ink}" stroke-width="1.8"/>`;
    for (let k = 0; k < 4; k++) {
      const ly = y - h + 12 + k * 22, sx = k % 2 ? 1 : -1;
      s += `<path d="M${bx + tilt},${ly} q${sx * 12},-8 ${sx * 30},-2 q${-sx * 16},5 ${-sx * 30},2 Z" fill="${PAPER.ink}" opacity="${k % 2 ? .7 : .55}"/>`;
    }
  }
  return `<g filter="url(#brush)">${s}</g>`;
}
// 前景：墨松枝與墨竹葉框住畫面
foreground = function () {
  return `<g filter="url(#brush)" opacity=".92">
    <path d="M-20,900 Q40,820 140,800 Q220,790 260,820" stroke="${PAPER.ink}" stroke-width="9" fill="none" stroke-linecap="round"/>
    ${[[30, 830, 46], [110, 806, 50], [190, 806, 40], [250, 826, 30]].map(([x, y, rx]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * .34}" fill="#55624c" opacity=".8"/>` +
      Array.from({ length: 10 }, (_, k) => `<path d="M${x - rx * .8 + k * rx * .17},${y + 3} l${(k % 3) - 1},${-rx * .4}" stroke="${PAPER.ink}" stroke-width="1.4" opacity=".7"/>`).join('') +
      `<path d="M${x - rx},${y + 2} Q${x},${y + rx * .5} ${x + rx},${y + 1}" stroke="${PAPER.ink}" stroke-width="3" fill="none"/>`).join('')}
    <path d="M1640,640 Q1560,740 1530,900" stroke="#3c4836" stroke-width="6" fill="none"/>
    ${[[1592, 700, 20], [1566, 742, -10], [1552, 786, 14], [1540, 830, -18], [1534, 872, 8]].map(([x, y, a], i) => [-1, 1].map(s => `<path d="M${x},${y} q${s * -24},${-14 + a * .3} ${s * -66},${a * .4} q${s * 34},${8 + a * .2} ${s * 66},${-a * .4} Z" fill="${PAPER.ink}" opacity="${(i + (s > 0 ? 1 : 0)) % 2 ? .78 : .6}"/>`).join('')).join('')}
  </g>`;
}
// 其餘沿用 #179 的幾何，只換色盤再套暈染：道館、泉水、石階路、水缸、石燈
const SS_WRAP = { dojo, spring, pathSvg, vat, stoneLantern };
dojo = () => `<g filter="url(#paint)">${SS_WRAP.dojo()}</g>`;
spring = () => `<g filter="url(#paint)">${SS_WRAP.spring()}</g>`;
pathSvg = () => `<g filter="url(#paint)">${SS_WRAP.pathSvg()}</g>`;
vat = (...a) => `<g filter="url(#paint)">${SS_WRAP.vat(...a)}</g>`;
stoneLantern = (...a) => `<g filter="url(#paint)">${SS_WRAP.stoneLantern(...a)}</g>`;
// 人物：同一個 figure()，外加一圈淡墨描邊，讓人物在暈染背景上仍跳得出來
const SS_FIGURE = figure;
figure = (o) => `<g filter="url(#outline)">${SS_FIGURE(o)}</g>`;

// 紙紋疊在最上層（只在新風格）
const SS_NEW = sceneAfter().replace(/<\/svg>\s*$/, `<rect width="1600" height="900" filter="url(#grain)" opacity=".55" style="mix-blend-mode:multiply"/></svg>`);

/* ---------- 3. HUD 與對話框：兩種樣式，同樣內容、同樣位置 ---------- */
const SS_LINE = { name: '林遠', role: '主角', text: ['呼……第三擔了，腿在抖……', '水缸還差一擔，歇口氣再走。'] };
const SS_CHIPS = ['辰時・第 3 天', '水缸 3／8 擔', '腳力 Lv 1', '已挑 2 趟'];
const ssScope = (svg, pre) => svg.replace(/id="([^"]+)"/g, `id="${pre}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}$1)`);
const ssInner = (svg) => svg.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const ssT = (x, y, s, size, fill, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${s}</text>`;

const UI_V3 = {
  bar(w) {
    let x = w - 16, chips = '';
    for (const c of SS_CHIPS.slice().reverse()) { const cw = c.length * 13 + 22; x -= cw + 8; chips += `<rect x="${x}" y="16" width="${cw}" height="24" rx="12" fill="#efe6d0"/>${ssT(x + cw / 2, 33, c, 13, '#3d362d', 'text-anchor="middle"')}`; }
    return `<rect x="10" y="8" width="${w - 20}" height="40" rx="8" fill="#fbf6ea" stroke="#d8c9a6" opacity=".96"/>
      ${ssT(24, 34, '宗門編年', 15, '#2f2a24', 'font-weight="700"')}
      <rect x="104" y="16" width="64" height="24" rx="6" fill="#fffaf0" stroke="#cdbb98"/>${ssT(136, 33, '❚❚ 暫停', 12, '#2f2a24', 'text-anchor="middle"')}
      <rect x="174" y="16" width="34" height="24" rx="6" fill="#2f2a24"/>${ssT(191, 33, '1×', 12, '#fff', 'text-anchor="middle"')}${chips}`;
  },
  tag(x, y, s, hero) {
    const w = s.length * 13 + 16;
    return `<rect x="${f(x - w / 2)}" y="${y}" width="${w}" height="20" rx="4" fill="${hero ? '#4f78a8' : 'rgba(251,246,234,.92)'}" stroke="${hero ? '#3b5d85' : '#cdbb98'}"/>${ssT(x, y + 14.5, s, 12, hero ? '#fff' : '#2f2a24', 'text-anchor="middle"')}`;
  },
  dialog(x, y, w, h, size) {
    return `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="12" fill="#000" opacity=".12"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fbf6ea" stroke="#d8c9a6" stroke-width="1.5" opacity=".97"/>
      <rect x="${x + 22}" y="${y - 16}" width="104" height="30" rx="8" fill="#4f78a8" stroke="#3b5d85"/>
      ${ssT(x + 34, y + 5, `${SS_LINE.name}<tspan font-size="12" font-weight="400" dx="8">${SS_LINE.role}</tspan>`, 16, '#fff', 'font-weight="700"')}
      ${SS_LINE.text.map((t, i) => ssT(x + 28, y + 30 + size + i * size * 1.6, t, size, '#2f2a24')).join('')}
      ${ssT(x + w - 18, y + h - 12, '點一下繼續 ▾', 12, '#6b6254', 'text-anchor="end"')}`;
  }
};
const UI_INK = {
  bar(w) {
    let x = w - 16, chips = '';
    for (const c of SS_CHIPS.slice().reverse()) { const cw = c.length * 13 + 24; x -= cw + 8;
      chips += `<rect x="${x}" y="17" width="${cw}" height="24" rx="3" fill="${PAPER.paperLit}" stroke="${PAPER.ink2}" stroke-width="1" opacity=".9"/>${ssT(x + cw / 2, 34, c, 13, PAPER.ink, 'text-anchor="middle" font-family="var(--serif)"')}`; }
    return `<g filter="url(#ui-brush)"><rect x="10" y="8" width="${w - 20}" height="42" fill="${PAPER.paper}" opacity=".95"/>
      <path d="M12,10 H${w - 12} M12,48 H${w - 12}" stroke="${PAPER.ink}" stroke-width="2.4"/><path d="M12,14 H${w - 12} M12,44 H${w - 12}" stroke="${PAPER.ink}" stroke-width=".8" opacity=".6"/></g>
      <rect x="20" y="16" width="26" height="26" fill="${PAPER.verm}"/>${ssT(33, 34, '宗', 15, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}
      ${ssT(54, 35, '宗門編年', 17, PAPER.ink, 'font-family="var(--serif)" font-weight="700" letter-spacing="2"')}
      <rect x="150" y="17" width="64" height="24" fill="none" stroke="${PAPER.ink}" stroke-width="1.2"/>${ssT(182, 34, '❚❚ 暫停', 12, PAPER.ink, 'text-anchor="middle"')}
      <rect x="220" y="17" width="34" height="24" fill="${PAPER.ink}"/>${ssT(237, 34, '1×', 12, PAPER.paperLit, 'text-anchor="middle"')}${chips}`;
  },
  tag(x, y, s, hero) {
    const w = s.length * 13 + 16;
    return hero
      ? `<rect x="${f(x - w / 2)}" y="${y}" width="${w}" height="21" fill="${PAPER.verm}" opacity=".95"/><rect x="${f(x - w / 2 + 2)}" y="${y + 2}" width="${w - 4}" height="17" fill="none" stroke="${PAPER.paperLit}" stroke-width=".8" opacity=".8"/>${ssT(x, y + 15, s, 12, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}`
      : `<rect x="${f(x - w / 2)}" y="${y}" width="${w}" height="20" fill="${PAPER.paperLit}" opacity=".9"/><path d="M${f(x - w / 2)},${y + 20} h${w}" stroke="${PAPER.ink}" stroke-width="1.6"/>${ssT(x, y + 14.5, s, 12, PAPER.ink, 'text-anchor="middle" font-family="var(--serif)"')}`;
  },
  dialog(x, y, w, h, size) {
    return `<g filter="url(#ui-brush)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER.paper}" opacity=".96"/>
      <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="${PAPER.ink}" stroke-width="2.6"/>
      <rect x="${x + 9}" y="${y + 9}" width="${w - 18}" height="${h - 18}" fill="none" stroke="${PAPER.ink}" stroke-width=".8" opacity=".55"/></g>
      <rect x="${x + 22}" y="${y - 18}" width="34" height="74" fill="${PAPER.verm}"/>
      ${ssT(x + 39, y + 4, '林', 17, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}${ssT(x + 39, y + 26, '遠', 17, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}
      ${ssT(x + 39, y + 46, '主角', 10, PAPER.paperLit, 'text-anchor="middle"')}
      ${SS_LINE.text.map((t, i) => ssT(x + 70, y + 26 + size + i * size * 1.7, t, size + 1, PAPER.ink, 'font-family="var(--serif)"')).join('')}
      ${ssT(x + w - 22, y + h - 16, '點一下繼續 ▾', 12, PAPER.ink3, 'text-anchor="end" font-family="var(--serif)"')}`;
  }
};
const SS_UI_DEFS = `<defs><filter id="ui-brush" x="-2%" y="-10%" width="104%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

// 一整張：場景＋HUD＋地點牌＋對話框（立繪用 #193 遊戲 PO 建議優先的圓臉 B）
function frameSvg(kind, pre) {
  const ui = kind === 'ink' ? UI_INK : UI_V3, scene = kind === 'ink' ? SS_NEW : SS_CUR;
  const portraitSvg = `<svg x="22" y="560" width="250" height="312" viewBox="0 0 400 500"><g${kind === 'ink' ? ' filter="url(#outline)"' : ''}>${portrait('tired', { shape: 'B' })}</g></svg>`;
  return `${ssInner(ssScope(scene, pre))}
    ${SS_UI_DEFS.replace(/ui-brush/g, pre + 'ui-brush')}
    ${ui.bar(1600).replace(/ui-brush/g, pre + 'ui-brush')}
    ${ui.tag(312, 620, '泉水')}${ui.tag(1000, 418, '水缸 3／8')}${ui.tag(f(SS_HERO.x), f(SS_HERO.y + 6), '主角 Lv 1', true)}
    ${kind === 'ink' ? portraitSvg.replace('url(#outline)', `url(#${pre}outline)`) : portraitSvg}
    ${ui.dialog(240, 740, 780, 130, 21).replace(/ui-brush/g, pre + 'ui-brush')}`;
}

/* ---------- 4. 板 ---------- */
const SS_CSS = `<style>.ssb text{font-family:var(--font)}</style>`;
const ssBoard = (id, w, h, body) => `<div class="board tall ssb" id="${id}" style="width:${w}px;height:${h}px">${SS_CSS}<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">${body}</svg></div>`;

function boardFull(kind) {
  return ssBoard(kind === 'ink' ? 'ink' : 'current', 1600, 900, frameSvg(kind, kind === 'ink' ? 'n-' : 'c-'));
}
function ssBoardCompare() {
  const half = (kind, x, y) => `<g transform="translate(${x},${y}) scale(.48)">${frameSvg(kind, kind === 'ink' ? 'hn-' : 'hc-')}</g>`;
  const crops = [['道館與院子', 1000, 190, 520], ['泉水與溪', 110, 590, 420], ['石階路與主角', 540, 470, 400]];
  let s = `<rect width="1600" height="1000" fill="#f6efe0"/>
    <text x="24" y="38" font-size="24" font-weight="700" fill="#2f2a24" font-family="var(--serif)">同一個挑水畫面：現況（#179）vs 新風格候選</text>
    ${ssT(24, 62, '鏡頭、站位、路線、人物大小、工作狀態（主角負重上山、水缸 3／8）兩張完全相同；只換畫法、色盤與 HUD／對話框樣式。', 13, '#3d362d')}
    ${ssT(24, 96, '現況', 16, '#2f2a24', 'font-weight="700"')}${ssT(816, 96, '新風格（紙底、暈染、墨線）', 16, '#2f2a24', 'font-weight="700"')}
    <clipPath id="hl"><rect x="24" y="106" width="768" height="432"/></clipPath><clipPath id="hr"><rect x="808" y="106" width="768" height="432"/></clipPath>
    <g clip-path="url(#hl)">${half('v3', 24, 106)}</g><g clip-path="url(#hr)">${half('ink', 808, 106)}</g>`;
  crops.forEach(([label, cx, cy, cw], i) => {
    const x0 = 24 + i * 522, w = 250, h = 190, sc = w / cw * 1.0, vy = 572;
    s += ssT(x0, vy - 8, label, 14, '#2f2a24', 'font-weight="700"');
    ['v3', 'ink'].forEach((k, j) => {
      const id = `cr${i}${j}`, xx = x0 + j * (w + 8);
      s += `<clipPath id="${id}"><rect x="${xx}" y="${vy}" width="${w}" height="${h}"/></clipPath>
        <g clip-path="url(#${id})"><g transform="translate(${xx - cx * sc},${vy - cy * sc}) scale(${sc})">${ssInner(ssScope(k === 'ink' ? SS_NEW : SS_CUR, `${id}-`))}</g></g>
        <rect x="${xx}" y="${vy}" width="${w}" height="${h}" fill="none" stroke="#cdbb98"/>${ssT(xx + 6, vy + h + 16, j ? '新風格' : '現況', 12, '#6b6254')}`;
    });
  });
  const notes = [
    '新風格實際重畫的：遠山改成上濃下淡、山腳沒入雲霧的暈染層，加皴線；松、楓、梅、灌木、竹、石、前景枝葉改成暈染加墨線；草地改乾筆痕；最上層一層紙紋。',
    '沿用幾何、只換色盤再套暈染的：道館、石階路、泉水、水缸、石燈。人物仍是 #179 的 figure()，外加一圈淡墨描邊。HUD／對話框換成紙底雙墨框、朱印名牌。',
    '可走路線、站位、遮擋排序都沒動；地點牌與主角牌兩張都在同一位置，用來確認新風格下仍認得出主角、泉水、水缸。'
  ];
  s += notes.map((t, i) => ssT(24, 800 + i * 24, t, 13.5, '#3d362d')).join('');
  return ssBoard('compare', 1600, 880, s);
}
// 390px：兩支手機並排，主要畫面裁在主角、石階、水缸一帶；HUD 摺成兩列、對話框貼底
function phone(kind, x) {
  const pre = kind === 'ink' ? 'pn-' : 'pc-', ui = kind === 'ink' ? UI_INK : UI_V3;
  const W = 390, H = 844, cx = 650, cy = 56, Z = 1;
  const scene = ssInner(ssScope(kind === 'ink' ? SS_NEW : SS_CUR, pre));
  const chips = SS_CHIPS.map((c, i) => {
    const cw = c.length * 12 + 18, xx = 12 + (i % 2) * 184, yy = 52 + Math.floor(i / 2) * 30;
    return kind === 'ink'
      ? `<rect x="${xx}" y="${yy}" width="${cw}" height="24" fill="${PAPER.paperLit}" stroke="${PAPER.ink2}"/>${ssT(xx + cw / 2, yy + 16.5, c, 12, PAPER.ink, 'text-anchor="middle" font-family="var(--serif)"')}`
      : `<rect x="${xx}" y="${yy}" width="${cw}" height="24" rx="12" fill="#efe6d0"/>${ssT(xx + cw / 2, yy + 16.5, c, 12, '#3d362d', 'text-anchor="middle"')}`;
  }).join('');
  const top = kind === 'ink'
    ? `<rect x="6" y="6" width="${W - 12}" height="110" fill="${PAPER.paper}" opacity=".96"/><path d="M8,8 H${W - 8} M8,114 H${W - 8}" stroke="${PAPER.ink}" stroke-width="2.2"/>
       <rect x="14" y="14" width="24" height="24" fill="${PAPER.verm}"/>${ssT(26, 31, '宗', 14, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}${ssT(46, 32, '宗門編年', 16, PAPER.ink, 'font-family="var(--serif)" font-weight="700"')}`
    : `<rect x="6" y="6" width="${W - 12}" height="110" rx="8" fill="#fbf6ea" stroke="#d8c9a6" opacity=".96"/>${ssT(16, 32, '宗門編年', 15, '#2f2a24', 'font-weight="700"')}`;
  const d = kind === 'ink'
    ? `<g filter="url(#${pre}ui-brush)"><rect x="8" y="${H - 168}" width="${W - 16}" height="156" fill="${PAPER.paper}" opacity=".96"/><rect x="12" y="${H - 164}" width="${W - 24}" height="148" fill="none" stroke="${PAPER.ink}" stroke-width="2.4"/></g>
       <rect x="22" y="${H - 150}" width="72" height="96" fill="${PAPER.paper2}"/><svg x="22" y="${H - 150}" width="72" height="96" viewBox="70 40 260 342"><g filter="url(#${pre}outline)">${portrait('tired', { shape: 'B' })}</g></svg>
       <rect x="104" y="${H - 180}" width="62" height="24" fill="${PAPER.verm}"/>${ssT(135, H - 163, '林遠', 14, PAPER.paperLit, 'text-anchor="middle" font-family="var(--serif)" font-weight="700"')}
       ${SS_LINE.text.map((t, i) => ssT(106, H - 118 + i * 26, t, 14.5, PAPER.ink, 'font-family="var(--serif)"')).join('')}${ssT(W - 24, H - 26, '點一下繼續 ▾', 11, PAPER.ink3, 'text-anchor="end"')}`
    : `<rect x="8" y="${H - 168}" width="${W - 16}" height="156" rx="12" fill="#fbf6ea" stroke="#d8c9a6" stroke-width="1.5"/>
       <rect x="22" y="${H - 150}" width="72" height="96" rx="8" fill="#efe4cc" stroke="#d8c9a6"/><svg x="22" y="${H - 150}" width="72" height="96" viewBox="70 40 260 342">${portrait('tired', { shape: 'B' })}</svg>
       <rect x="104" y="${H - 182}" width="86" height="28" rx="8" fill="#4f78a8"/>${ssT(116, H - 163, '林遠<tspan font-size="11" font-weight="400" dx="6">主角</tspan>', 14, '#fff', 'font-weight="700"')}
       ${SS_LINE.text.map((t, i) => ssT(106, H - 118 + i * 26, t, 14.5, '#2f2a24')).join('')}${ssT(W - 24, H - 26, '點一下繼續 ▾', 11, '#6b6254', 'text-anchor="end"')}`;
  return `<clipPath id="${pre}clip"><rect x="${x}" y="70" width="${W}" height="${H}" rx="18"/></clipPath>
    <g clip-path="url(#${pre}clip)"><g transform="translate(${x},70)">
      <g transform="translate(${-cx},${-cy}) scale(${Z})">${scene}</g>
      ${SS_UI_DEFS.replace(/ui-brush/g, pre + 'ui-brush')}
      ${ui.tag(f(SS_HERO.x * Z - cx + 40), f(SS_HERO.y * Z - cy + 8), '主角 Lv 1', true)}${ui.tag(f(1000 * Z - cx - 20), f(418 * Z - cy), '水缸 3／8')}
      ${top}${chips}${d}
    </g></g><rect x="${x}" y="70" width="${W}" height="${H}" rx="18" fill="none" stroke="#8a7f6c" stroke-width="2"/>
    ${ssT(x, 940, kind === 'ink' ? '新風格・390×844' : '現況・390×844', 14, '#2f2a24', 'font-weight="700"')}`;
}
function boardNarrow() {
  const notes = ['390px 主要畫面：裁在主角、石階路與水缸一帶，', '原尺寸不縮放，泉水與道館正門在畫面外（和 V3 窄畫面一樣）。', '',
    '看得出的：主角（朱印牌／藍牌）、水缸、', '　可走的石階路；兩行台詞 14.5px 放得下。', '',
    '新風格要注意的：', '　暈染背景比現況暗、細節多，', '　地點牌要有紙底才讀得清；', '　人物外圈墨線在小尺寸幫助很大。', '',
    '沒驗的：真手機觸控、深色模式、', '　選取框在暈染背景上的對比、', '　捲動中的面板、三行以上台詞。', '',
    '這是靜態示意，不是手機操作已驗。'];
  return ssBoard('narrow', 1600, 960, `<rect width="1600" height="960" fill="#f6efe0"/>
    <text x="24" y="38" font-size="24" font-weight="700" fill="#2f2a24" font-family="var(--serif)">390px 主要畫面：現況 vs 新風格</text>
    ${phone('v3', 24)}${phone('ink', 438)}
    <rect x="860" y="70" width="716" height="844" rx="12" fill="#fffaf0" stroke="#cdbb98"/>
    ${notes.map((t, i) => ssT(884, 110 + i * 30, t, 16, '#3d362d')).join('')}`);
}

/* ---------- mount ---------- */
(function mount() {
  const boards = { current: () => boardFull('v3'), ink: () => boardFull('ink'), compare: ssBoardCompare, narrow: boardNarrow };
  const want = window.STYLE_SCENE_BOARD;
  document.getElementById('root').innerHTML = (want ? [want] : Object.keys(boards)).map(k => boards[k]()).join('');
})();
