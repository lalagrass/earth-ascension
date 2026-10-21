/* 主角半身立繪與表情差分（#184 最小出口第 1 項）。
   本檔不是獨立頁：由 ../render-portrait.js 先開 bl-v03-board.html（#179），再把本檔注入同一頁。
   所以配色直接用 #179 的 C（藍袍、朱紅髮帶、膚色、髮色），比較板裡的小人也是 #179 的 pose()，不另畫一套。
   這裡只加：半身立繪 portrait()、三種表情參數、兩張板的版面。
   全部是本作原創的 SVG；《活俠傳》只當視覺特徵參考（立繪＋表情差分＋清楚線稿＋兩階陰影），沒有描摹或取用原作素材。 */
'use strict';

const INK = '#3a2b25';                    // 線稿：深褐，不用純黑，和 #179 的 C.ink 同一路
const IRIS = ['#6b4430', '#3d2418'];      // 瞳色：上淺下深
const SHADE = { skin: '#e6b994', hair: '#1c1714', robe: '#46709f', inner: '#ddd3bf' };
const tx = (x, y, s, size = 13, extra = '') => `<text ${extra} x="${x}" y="${y}" font-size="${size}" fill="#3d362d">${s}</text>`;
const hx = (x, y, s, size = 15) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${C.ink}">${s}</text>`;

/* ---------- 表情：只換眉、眼、嘴與附加物；頭、髮、衣服共用 ---------- */
const FACES = {
  calm: { label: '日常', brow: 'calm', eye: 'open', mouth: 'smile', blush: .4, tilt: 0, dy: 0,
    note: ['眉平、眼睜開、嘴角微揚。', '對話預設，也可當名冊頭像。'] },
  brave: { label: '逞強', brow: 'firm', eye: 'firm', mouth: 'grin', blush: .55, tilt: -3, dy: -2, sweat: 1,
    note: ['眉壓低、咧嘴笑，太陽穴一滴汗：', '嘴上說「還行」，其實很吃力。'] },
  tired: { label: '疲累', brow: 'worry', eye: 'half', mouth: 'pant', blush: .85, tilt: 6, dy: 8, sweat: 3, lock: true, breath: true,
    note: ['眉尾下垂、半閉眼、張口喘氣；', '臉紅、多滴汗、一縷頭髮垂下、肩膀往下沉。'] }
};

function eye(cx, cy, side, kind, id, scale = 1.28) {
  // side=-1 是畫面左眼；外眼角朝 side 方向。高光固定在左上（光從左上），所以不跟著鏡像。
  const m = (x) => f(cx + x * side);
  const lidY = kind === 'half' ? 10 : kind === 'firm' ? 2 : 0;          // 上眼瞼下壓多少
  const tiltIn = kind === 'firm' ? 4 : 0;                             // 逞強：內眼角壓低
  const white = `M${m(-15)},${f(cy + 1 + tiltIn * .5)} C${m(-11)},${f(cy - 13 + lidY + tiltIn)} ${m(11)},${f(cy - 15 + lidY)} ${m(17)},${f(cy - 3 + lidY * .4)}
    C${m(14)},${f(cy + 11)} ${m(-10)},${f(cy + 13)} ${m(-15)},${f(cy + 1 + tiltIn * .5)} Z`;
  const lid = `M${m(-17)},${f(cy + 2 + tiltIn * .5)} C${m(-11)},${f(cy - 14 + lidY + tiltIn)} ${m(11)},${f(cy - 16 + lidY)} ${m(19)},${f(cy - 4 + lidY * .4)}`;
  const lash = `M${m(16)},${f(cy - 5 + lidY * .4)} l${f(6 * side)},${f(-4)} M${m(18)},${f(cy - 1 + lidY * .4)} l${f(6 * side)},${f(-1)}`;
  const ix = cx + side * 1, iy = cy + 2 + lidY * .3;
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})"><clipPath id="${id}"><path d="${white}"/></clipPath>
    <path d="${white}" fill="#fffdf8"/>
    <g clip-path="url(#${id})">
      <ellipse cx="${f(ix)}" cy="${f(iy)}" rx="10.5" ry="13" fill="url(#iris)"/>
      <ellipse cx="${f(ix)}" cy="${f(iy + 1)}" rx="4.6" ry="6.4" fill="#1d120d"/>
      <path d="M${f(cx - 20)},${f(cy - 18)} H${f(cx + 20)} V${f(cy - 4 + lidY)} Q${f(cx)},${f(cy - 9 + lidY)} ${f(cx - 20)},${f(cy - 4 + lidY)} Z" fill="#1d120d" opacity=".35" class="shade"/>
      <circle cx="${f(ix - 4)}" cy="${f(iy - 5)}" r="3.8" fill="#fff"/><circle cx="${f(ix + 4)}" cy="${f(iy + 5)}" r="1.7" fill="#fff" opacity=".9"/>
    </g>
    <path d="${lid}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>
    <path d="${lash}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M${m(-3)},${f(cy + 12.5)} Q${m(3)},${f(cy + 14)} ${m(9)},${f(cy + 11)}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".45"/>
    ${kind === 'half' ? `<path d="M${m(-9)},${f(cy + 18)} Q${m(2)},${f(cy + 21)} ${m(11)},${f(cy + 17)}" fill="none" stroke="${SHADE.skin}" stroke-width="2" opacity=".9" class="shade"/>` : ''}</g>`;
}
function brows(kind) {
  // 每條眉由內（近鼻樑）到外；內端 y、外端 y
  const set = { calm: [186, 182, 2], firm: [190, 178, 0], worry: [180, 189, 3] }[kind];
  const one = (side) => {
    const xi = 200 + side * 14, xo = 200 + side * 46;
    return `<path d="M${xi},${set[0]} Q${f((xi + xo) / 2)},${f(Math.min(set[0], set[1]) - set[2] - 3)} ${xo},${set[1]}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  };
  return one(-1) + one(1);
}
function mouth(kind) {
  if (kind === 'grin') return `<path d="M179,267 Q200,293 221,267 Q200,273 179,267 Z" fill="#8a3a33" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M182,268.5 Q200,274 218,268.5 L216.5,273 Q200,278 183.5,273 Z" fill="#fffdf8"/>
    <path d="M190,283 Q200,287 210,283" fill="none" stroke="#c2615a" stroke-width="2"/>
    <path d="M176,264 l-4,-3 M224,264 l4,-3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  if (kind === 'pant') return `<path d="M190,274 Q200,268 210,274 Q212,286 200,288 Q188,286 190,274 Z" fill="#8a3a33" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M193,283 Q200,279 207,283 Q204,287 200,287 Q196,287 193,283 Z" fill="#d86e64"/>`;
  return `<path d="M186,271 Q200,281 214,271" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M193,278 Q200,281 207,278" fill="none" stroke="#c97b6a" stroke-width="1.6" opacity=".8"/>`;
}
function sweat(x, y, s = 1) {
  return `<path d="M${x},${y} q${-6 * s},${11 * s} 0,${15 * s} q${6 * s},${-4 * s} 0,${-15 * s} z" fill="#d6eef7" stroke="#5d9bb8" stroke-width="1.6"/>
    <path d="M${f(x - 1.5 * s)},${f(y + 8 * s)} q0,${3 * s} ${2 * s},${4 * s}" stroke="#fff" stroke-width="1.4" fill="none"/>`;
}

/* ---------- 半身立繪：畫布 400×500，頭心約 (200,215) ---------- */
let portraitN = 0;
const BANGS_D = 'M116,206 C108,136 150,104 200,104 C250,104 292,136 284,206 L274,220 L266,176 L254,210 L240,166 L228,200 L212,160 L202,198 L186,162 L176,202 L160,170 L150,210 L138,178 L128,224 Z';
// 臉型 B「圓潤初學者」（#184 第 2 項，回應 #192 審查：A 的大眼、尖瀏海、窄下臉偏秀氣）：
// 下臉更寬、下巴短、眼睛小一號、瀏海改成圓束、脖子與肩更厚。預設仍是 A，#192 的圖不變。
const SHAPES = {
  A: { face: 'M128,186 C124,238 144,286 178,304 Q200,316 222,304 C256,286 276,238 272,186 C270,132 130,132 128,186 Z',
    bangs: BANGS_D, eyeS: 1.28, eyeX: 35, eyeY: 232, earX: 72, blushR: 17, bodyX: 1, neck: [180, 220],
    strands: 'M200,108 Q197,140 202,198 M170,118 Q160,150 176,202 M230,118 Q240,150 228,200 M146,134 Q136,170 150,210 M254,134 Q264,170 254,210' },
  B: { face: 'M122,186 C114,250 140,300 184,312 Q200,316 216,312 C260,300 286,250 278,186 C276,126 124,126 122,186 Z',
    bangs: 'M116,206 C108,136 150,104 200,104 C250,104 292,136 284,206 L278,196 Q266,168 248,186 Q234,158 214,180 Q200,154 186,180 Q166,158 152,186 Q136,168 122,200 Z',
    eyeS: 1.06, eyeX: 38, eyeY: 238, earX: 77, blushR: 21, bodyX: 1.08, neck: [174, 226],
    strands: 'M200,108 Q198,130 200,158 M170,118 Q162,140 168,168 M230,118 Q238,140 232,168 M146,134 Q140,156 146,180 M254,134 Q260,156 254,180' }
};
function portrait(key, o = {}) {
  const F = FACES[key], id = `p${portraitN++}`, S = SHAPES[o.shape || 'A'];
  const flat = o.layer === 'flat', line = o.layer === 'line';
  const cls = line ? 'p-line' : flat ? 'p-flat' : '';
  // 頭部（含髮、臉、表情）一起依表情傾斜／下沉；身體只在疲累時往下沉一點
  const headT = `rotate(${F.tilt} 200 300) translate(0 ${F.dy + 12}) translate(200 318) scale(1.12) translate(-200 -318)`;
  const slump = F.dy > 4 ? 6 : 0;

  const body = `<g transform="translate(0 ${slump}) translate(200 0) scale(${S.bodyX} 1) translate(-200 0)">
    <path d="M44,500 C52,440 80,404 128,386 C150,378 168,366 180,346 L220,346 C232,366 250,378 272,386 C320,404 348,440 356,500 Z" fill="${C.hero}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M272,386 C320,404 348,440 356,500 L266,500 C280,456 278,414 262,382 Z" fill="${SHADE.robe}" class="shade"/>
    <path d="M70,446 C88,418 112,400 140,390" fill="none" stroke="${C.heroLit}" stroke-width="7" stroke-linecap="round" opacity=".8" class="shade"/>
    <path d="M100,500 C104,470 110,450 118,432 M300,500 C296,468 290,446 282,430" fill="none" stroke="${C.hero2}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M182,346 L200,404 L218,346 Z" fill="${C.skin}" stroke="${INK}" stroke-width="2"/>
    <path d="M236,344 L256,354 L206,436 L193,424 Z" fill="${C.heroInner}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M164,344 L146,354 L230,492 L250,480 Z" fill="${C.heroInner}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M150,360 L232,488" stroke="${SHADE.inner}" stroke-width="5" opacity=".9" class="shade"/>
    <path d="M118,500 L120,484 Q200,472 282,484 L284,500 Z" fill="${C.heroSash}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M226,484 q12,-10 22,-2 q-8,8 -22,2 z" fill="${C.heroSash}" stroke="${INK}" stroke-width="2"/>
  </g>`;

  const neck = `<path d="M${S.neck[0]},280 L${S.neck[0] - 2},352 Q200,364 ${S.neck[1] + 2},352 L${S.neck[1]},280 Z" fill="${C.skin}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M180,300 Q200,326 220,300 L221,330 Q200,342 179,330 Z" fill="${SHADE.skin}" class="shade"/>`;

  // 頭髮後層與髮髻
  const hairBack = `<ellipse cx="200" cy="200" rx="86" ry="94" fill="${C.hair}" stroke="${INK}" stroke-width="3"/>`;

  const bun = `<circle cx="200" cy="84" r="30" fill="${C.hair}" stroke="${INK}" stroke-width="3"/>
    <path d="M182,72 Q196,60 214,66" fill="none" stroke="${C.hairLit}" stroke-width="5" stroke-linecap="round" class="shade"/>
    <path d="M224,102 C246,96 268,104 282,124 C264,118 248,116 234,114 Z" fill="${C.ribbon}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M228,108 C244,118 254,134 258,154 C248,140 238,130 226,120 Z" fill="#b8473a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M172,108 Q200,120 228,108 L226,96 Q200,107 174,96 Z" fill="${C.ribbon}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  const ear = (side) => `<ellipse cx="${200 + side * S.earX}" cy="236" rx="11" ry="17" fill="${C.skin}" stroke="${INK}" stroke-width="2.6"/>
    <path d="M${200 + side * (S.earX + 2)},228 q${side * 4},6 0,14" fill="none" stroke="${C.skin2}" stroke-width="2"/>`;

  // 圓臉：顴骨寬、下巴圓
  const faceD = S.face;
  const face = `<path d="${faceD}" fill="${C.skin}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <clipPath id="${id}-face"><path d="${faceD}"/></clipPath>
    <g clip-path="url(#${id}-face)" class="shade">
      <path d="${S.bangs}" fill="${SHADE.skin}" transform="translate(2 9)"/>
      <path d="M248,230 C270,250 262,286 222,304 L280,320 L280,220 Z" fill="${SHADE.skin}" opacity=".7"/>
    </g>
    <ellipse cx="156" cy="264" rx="${S.blushR}" ry="7" fill="${C.blush}" opacity="${F.blush}"/>
    <ellipse cx="244" cy="264" rx="${S.blushR}" ry="7" fill="${C.blush}" opacity="${F.blush}"/>
    ${F.blush > .5 ? [148, 155, 162, 236, 243, 250].map(x => `<path d="M${x + 3},259 l-4,9" stroke="#d98a7a" stroke-width="1.5" stroke-linecap="round"/>`).join('') : ''}
    <path d="M203,246 l-4,10 l6,1" fill="none" stroke="${C.skin2}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  // 瀏海：上緣圓，下緣幾束尖髮；兩側鬢髮垂到耳前
  const bangs = `<path d="${S.bangs}"
      fill="${C.hair}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M118,196 C112,226 116,256 126,276 L134,250 L132,214 Z" fill="${C.hair}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M282,196 C288,226 284,256 274,276 L266,250 L268,214 Z" fill="${C.hair}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M146,140 Q200,116 254,140" fill="none" stroke="${C.hairLit}" stroke-width="8" stroke-linecap="round" stroke-dasharray="26 10" class="shade"/>
    <path d="${S.strands}" fill="none" stroke="#4a403a" stroke-width="1.4" opacity=".7"/>
    ${F.lock ? `<path d="M206,160 C214,190 204,214 214,236 C200,220 202,194 198,168 Z" fill="${C.hair}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` : ''}`;

  const extras = (F.sweat >= 1 ? sweat(276, 186, 1.1) : '') + (F.sweat >= 2 ? sweat(124, 202, .9) : '') + (F.sweat >= 3 ? sweat(258, 282, .8) : '')
    + (key === 'brave' ? `<path d="M290,214 q6,4 0,8 q-6,4 0,8 M300,206 q6,4 0,8 q-6,4 0,8" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>` : '')
    + (F.breath ? `<path d="M236,300 q10,-2 13,6 q8,-3 12,3 q-5,6 -13,3 q-8,4 -12,-5 z" fill="#fff" stroke="#b9c4c9" stroke-width="1.6" opacity=".9"/>` : '');

  return `<g class="${cls}" transform="translate(${o.x || 0},${o.y || 0}) scale(${o.s || 1})">
    <defs><linearGradient id="iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${IRIS[1]}"/><stop offset=".55" stop-color="${IRIS[0]}"/><stop offset="1" stop-color="#8a5a3c"/></linearGradient></defs>
    ${body}${neck}
    <g transform="${headT}">${hairBack}${ear(-1)}${ear(1)}${face}
      ${eye(200 - S.eyeX, S.eyeY, -1, F.eye, `${id}-el`, S.eyeS)}${eye(200 + S.eyeX, S.eyeY, 1, F.eye, `${id}-er`, S.eyeS)}
      ${mouth(F.mouth)}${bangs}${brows(F.brow)}${bun}${extras}</g>
  </g>`;
}

/* ---------- 版面 ---------- */
// 一張立繪放進任意框：nested svg，viewBox 用立繪自己的 400×500
const frame = (key, x, y, w, o = {}) => `<svg x="${x}" y="${y}" width="${w}" height="${f(w * 1.25)}" viewBox="0 0 400 500">${portrait(key, o)}</svg>`;
// 頭像：裁臉部 220×220，圓形
function avatar(key, x, y, d) {
  const id = `av${portraitN}`;
  return `<clipPath id="${id}"><circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}"/></clipPath>
    <circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}" fill="#e9dcc0"/>
    <g clip-path="url(#${id})"><svg x="${x}" y="${y}" width="${d}" height="${d}" viewBox="90 135 220 220">${portrait(key)}</svg></g>
    <circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}" fill="none" stroke="${C.hero2}" stroke-width="${d > 60 ? 2 : 1.4}"/>`;
}
const STYLE = `<style>
  .p-line path, .p-line ellipse, .p-line circle { fill: #fff; }
  .p-line .shade, .p-flat .shade { display: none; }
</style>`;
const svgOpen = (id, h) => `<div class="board tall" id="${id}"><svg viewBox="0 0 1600 ${h}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">${STYLE}<rect width="1600" height="${h}" fill="#f6efe0"/>`;

function boardSheet() {
  const keys = ['calm', 'brave', 'tired'];
  const cards = keys.map((k, i) => {
    const x = 30 + i * 400, F = FACES[k];
    return `<rect x="${x}" y="84" width="380" height="600" rx="12" fill="#fffaf0" stroke="${C.line}"/>
      <rect x="${x + 14}" y="98" width="352" height="440" rx="8" fill="${['#efe4cc', '#f2e2cf', '#e7e3d6'][i]}"/>
      ${frame(k, x + 14, 98, 352)}
      ${hx(x + 20, 568, `${F.label}`, 18)}
      ${F.note.map((t, j) => tx(x + 20, 596 + j * 22, t, 13.5)).join('')}`;
  }).join('');
  const layers = [['line', '1 線稿'], ['flat', '2 平塗'], ['full', '3 完成（兩階陰影＋高光）']].map(([l, t], i) =>
    `${frame('calm', 1250 + (i % 2) * 165, 112 + Math.floor(i / 2) * 250, 150, { layer: l })}${tx(1256 + (i % 2) * 165, 318 + Math.floor(i / 2) * 250, t, 12.5)}`).join('');
  return `${svgOpen('sheet', 1000)}
    <text x="30" y="40" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">主角立繪：日常＋兩種表情差分</text>
    ${tx(30, 64, '本作原創主角（#179 造型：圓臉、髻上朱紅髮帶、藍袍淺交領、米色腰帶）。頭、髮、衣服共用一份，只換眉、眼、嘴與附加符號，所以加一種表情只多幾條線。')}
    ${cards}
    <rect x="1230" y="84" width="350" height="600" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(1250, 106, '分層（可編輯來源）', 14)}${layers}
    ${tx(1416, 384, '線稿、色塊、陰影分組，', 12.5)}${tx(1416, 404, '以後要上色調整或換', 12.5)}${tx(1416, 424, '光向，只動一組。', 12.5)}
    ${tx(1250, 600, '每張立繪 400×500 SVG，沒有點陣圖。', 12.5)}${tx(1250, 622, '表情差分＝同一函式換參數（FACES）。', 12.5)}${tx(1250, 644, '輸出 PNG 只是預覽，來源是 SVG 函式。', 12.5)}
    <rect x="30" y="704" width="1550" height="276" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(50, 734, '參考了什麼、沒參考什麼')}
    ${[
      '參考《活俠傳》的是「做法」：對話用半身立繪、同一人物多張表情差分、清楚的深色線稿、平塗加一層陰影、汗滴等情緒符號。',
      '沒有參考的：原作人物外貌、構圖、服裝與任何素材；也沒有描摹。本作主角的臉型、髮型、配色全部沿用 #179 已在庫的造型。',
      '和原作的差距要說清楚：原作是手繪插畫，頭髮與衣紋細節多很多。這份是程式畫的 SVG，走「乾淨線稿＋兩階陰影」的簡化版，',
      '　好處是能改參數、能出差分、能放大縮小；要接近原作的手繪質感，需要人工繪師或另一套繪製流程，成本見比較板。',
      '線色用深褐 #3a2b25（不是純黑），和 #179 小人的描邊同一路；陰影統一往右下（光從左上），和 #179 的場景光向一致。'
    ].map((t, i) => tx(50, 764 + i * 26, t, 13.5)).join('')}
    ${tx(50, 900, '表情只是示意，不代表人物狀態系統已經有「逞強」「疲累」這些狀態；什麼時候顯示哪張，要等事件或對話介面另定。', 13.5, 'fill="#8a6a3a"')}
  </svg></div>`;
}

function boardCompare() {
  const sprite = (x, y, s, name = 'idle') => shadow(x, y, 20 * s / 1.6, .2) + pose(name, { x, y, s, dir: 1 });
  const pairs = ['calm', 'brave', 'tired'];
  return `${svgOpen('compare', 1000)}
    <text x="30" y="40" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">立繪與 #179 小人放在一起</text>
    ${tx(30, 64, '同一個人：立繪負責對話與事件的表情，小人負責在場景裡做事。先看兩者是否認得出是同一人，再看縮小後表情還分不分得出。')}
    <rect x="20" y="80" width="1000" height="470" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(40, 108, '同一高度並排（#179 小人放大 2.6×，和立繪等高）')}
    ${sprite(150, 500, 2.6)}${tx(100, 532, '#179 小人 2.6×', 12.5)}
    ${pairs.map((k, i) => `${frame(k, 290 + i * 240, 170, 230)}${tx(390 + i * 240, 532, FACES[k].label, 13)}`).join('')}
    <rect x="1040" y="80" width="540" height="470" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(1060, 108, '對得上的特徵')}
    ${[
      '圓臉、雙頰紅：小人頭半徑 10.6，立繪臉寬約 160；',
      '　兩者都是下巴圓、顴骨寬，不是瓜子臉。',
      '髮型：頭頂一個髻，髻底一圈朱紅髮帶，帶尾往右飄；',
      '　小人遠看靠這個紅點找主角，立繪也保留同一個紅點。',
      '衣著：藍袍、淺色交領、米色寬腰帶，顏色直接取 #179 的',
      '　C.hero／C.heroInner／C.heroSash，不另調一套。',
      '光向：左上來光，袍子左肩亮、右側一層暗面，和小人一致。',
      '',
      '刻意不同的：',
      '　立繪眼睛比例大很多（1× 小人的眼只是一個小點），',
      '　這是對話立繪的慣例，換來表情的辨識度。'
    ].map((t, i) => tx(1060, 140 + i * 25, t, 13.5)).join('')}
    <rect x="20" y="570" width="1000" height="410" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(40, 598, '縮小後還認不認得（名冊頭像、對話框小圖）')}
    ${[96, 64, 48].map((d, r) => `${tx(40, 650 + r * 110 + d / 2 - 40, `${d}px`, 13, 'font-weight="700"')}` +
      pairs.map((k, i) => avatar(k, 110 + i * 150, 616 + r * 110 + (96 - d) / 2, d)).join('')).join('')}
    ${pairs.map((k, i) => tx(110 + i * 150 + 30, 960, FACES[k].label, 12.5)).join('')}
    <rect x="590" y="616" width="410" height="330" rx="8" fill="#b8c681"/>
    <path d="M590,860 Q790,830 1000,850" stroke="${C.earth}" stroke-width="30" fill="none"/>
    ${sprite(700, 852, 1, 'loadA')}${sprite(880, 848, 1, 'idle')}
    ${avatar('tired', 676, 700, 48)}${avatar('calm', 856, 696, 48)}
    ${tx(606, 640, '場景裡 1×（約 60px 高）的小人，頭上配 48px 頭像：', 12.5)}
    ${tx(606, 660, '小人看動作，頭像看情緒。', 12.5)}
    ${tx(606, 930, '示意擺法，不是 HUD 設計（第 2 項才做介面合成）。', 12, 'fill="#8a6a3a"')}
    <rect x="1040" y="570" width="540" height="410" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(1060, 598, '保留／調整／延後，與成本')}
    ${[
      ['保留', '#179 的配色、髮帶、圓臉與光向；表情差分用參數'],
      ['', '出圖，加一張表情約是改幾條線，不必重畫整張。'],
      ['調整', '若擁有人要更接近原作的手繪感：頭髮分束、'],
      ['', '衣紋與上色層次要加很多；程式繪製會越來越難維護，'],
      ['', '那時改成人工繪製（分層 PSD／Krita 檔）較合理。'],
      ['延後', '其他人物立繪、第 2 項事件圖或介面合成、'],
      ['', '動畫（眨眼、口型）都還沒做，也沒有預占。'],
      ['來源', '全部原創 SVG，存在本 repo；無第三方素材、字型或'],
      ['', '授權問題。PNG 只是輸出預覽，可隨時重產。'],
      ['未驗', '只在 Chromium 輸出；手機實機、深色背景、'],
      ['', '和真正對話框文字並排的可讀性都還沒驗。']
    ].map(([a, b], i) => (a ? tx(1060, 632 + i * 28, a, 13.5, 'font-weight="700"') : '') + tx(1110, 632 + i * 28, b, 13.5)).join('')}
  </svg></div>`;
}

/* ---------- mount：換掉 bl-v03 的板 ---------- */
(function mount() {
  const boards = { sheet: boardSheet, compare: boardCompare };
  const want = window.PORTRAIT_BOARD;
  document.getElementById('root').innerHTML = (want ? [want] : Object.keys(boards)).map(k => boards[k]()).join('');
})();
