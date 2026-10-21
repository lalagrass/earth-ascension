/* BL-L03 長住堂親設計圖（#180）。
   本檔不是獨立頁：由 ../render-bl-l03.js 先開 bl-v03-board.html（#179），再把本檔注入同一頁。
   所以人物直接用 BL-V03 的 figure()／POSE／pathAt()／sceneAfter()，骨架、腳底原點與路徑點都和 #179、scene.json 相同，不另畫一套。
   這裡只加：堂親的配色與小配件（汗巾、補丁）、三張板的版面。所有文字是設計稿；圖上的長度與停歇都是示意，不是模型數值。 */
'use strict';

/* ---------- 堂親（工作版外形；性別、姓名待遊戲 PO 確認） ---------- */
const COUSIN = {
  robe: '#6f8a6a', robe2: '#52694e', robeLit: '#93ab8a', sash: '#c9b98f', inner: '#ece3cf', ribbon: '#3e3a35', round: .3
};
const COUSIN_SKIN = ['#e8c29c', '#cfa37a'];
// 與 figure() 相同的腳底→肩算法，只用來放汗巾與補丁
function anchors(o) {
  const d = Object.assign({ lean: 0, bob: 0, legs: [{ t: 4, k: 0 }, { t: -4, k: 0 }], sit: false }, o);
  let low = 0;
  d.legs.forEach(l => {
    const knee = [21 * Math.sin(rad(l.t)), 21 * Math.cos(rad(l.t))];
    const sa = l.t - l.k;
    const foot = add(knee, [21 * Math.sin(rad(sa)), 21 * Math.cos(rad(sa))]);
    low = Math.max(low, foot[1] + 2, knee[1] + 3);
  });
  if (d.sit) low = 12;
  const hip = [0, -low + d.bob];
  const up = [Math.sin(rad(d.lean)), -Math.cos(rad(d.lean))];
  return { hip, sh: [hip[0] + up[0] * 29, hip[1] + up[1] * 29], head: [hip[0] + up[0] * 43.5, hip[1] + up[1] * 43.5] };
}
function cousin(name, extra = {}) {
  const o = Object.assign({}, POSE[name], COUSIN, extra);
  const saved = [C.skin, C.skin2];
  [C.skin, C.skin2] = COUSIN_SKIN; // 常在日頭下挑水，膚色曬深一點
  const body = figure(o);
  [C.skin, C.skin2] = saved;
  const a = anchors(o), s = o.s || 1, dir = o.dir || 1;
  // 汗巾搭在頸肩、袍子下擺一塊補丁：遠看是「做慣了活的舊衣」
  const towel = o.back
    ? `<path d="M${pt(a.sh[0] - 7, a.sh[1] - 1)} q7,-4 14,0 l-1,4 q-6,-2.4 -12,0 z" fill="#f4f0e4" stroke="#c9c0ad" stroke-width=".6"/>`
    : `<path d="M${pt(a.sh[0] - 7, a.sh[1] - 1)} q7,-4 14,0 l-1.5,13 l-3.4,-1 l.6,-9 q-4,-1 -8.6,.6 z" fill="#f4f0e4" stroke="#c9c0ad" stroke-width=".6"/>`;
  const patch = o.sit ? '' : `<rect x="${f(a.hip[0] - 9)}" y="${f(a.hip[1] + 6)}" width="5.6" height="5" fill="#8aa384" stroke="#52694e" stroke-width=".6" stroke-dasharray="1.2 1"/>`;
  return body + `<g transform="translate(${f(o.x || 0)},${f(o.y || 0)}) scale(${f(s * dir)},${f(s)})">${patch}${towel}</g>`;
}
// 主角（#179 改後造型）與兩個新加的姿勢：停下喘氣、扶著扁擔走
const HERO_POSE = {
  wobble: Object.assign({}, POSE.loadA, { lean: 18, swing: 13, poleTilt: -9, bob: 4 }),
  rest:   Object.assign({}, POSE.loadA, { lean: 24, legs: [{ t: 12, k: 24 }, { t: -6, k: 20 }], bob: 5, swing: 2, poleTilt: -3 }),
  steady: Object.assign({}, POSE.loadA, { lean: 14, swing: 4, poleTilt: -2 })
};
const COUSIN_POSE = {
  steady: Object.assign({}, POSE.grownA, { freeArm: false, swing: 3, lean: 9 }),
  wait:   Object.assign({}, POSE.idle, { fill: .9 }),
  stand:  Object.assign({}, POSE.idle, { load: 'none' }),
  tired:  Object.assign({}, POSE.meditate, COUSIN, { beard: false })
};
const heroAs = (k, extra) => figure(Object.assign({}, HERO_POSE[k] || POSE[k], extra));
function cousinFrom(p, extra) {
  const k = '__tmp'; POSE[k] = p; const out = cousin(k, extra); delete POSE[k]; return out;
}
// 喘氣：頭邊兩滴汗＋嘴前三道氣
function puff(o) {
  const a = anchors(Object.assign({}, HERO_POSE.rest, o)), s = o.s, d = o.dir || 1;
  const hx = o.x + a.head[0] * s * d, hy = o.y + a.head[1] * s;
  return `<g stroke="#7a95a8" stroke-width="${f(1.1 * s)}" fill="none" stroke-linecap="round" opacity=".85">
    <path d="M${pt(hx + 14 * s * d, hy + 2 * s)} q${f(4 * s * d)},-2 ${f(8 * s * d)},0"/><path d="M${pt(hx + 15 * s * d, hy + 6 * s)} q${f(4 * s * d)},-1 ${f(9 * s * d)},1"/></g>
    <path d="M${pt(hx - 8 * s * d, hy - 9 * s)} q${f(-2 * s)},${f(4 * s)} 0,${f(6 * s)} q${f(2 * s)},${f(-2 * s)} 0,${f(-6 * s)} z" fill="#9cc6dc"/>`;
}

/* ---------- 版面小工具 ---------- */
// extra 放在前面：同名屬性以第一個為準，這樣 extra 的 fill 可以蓋過預設色
const T = (x, y, s, size = 13, extra = '') => `<text ${extra} x="${x}" y="${y}" font-size="${size}" fill="#3d362d">${s}</text>`;
const H = (x, y, s, size = 15) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${C.ink}">${s}</text>`;
const lines = (x, y, arr, size = 13, gap = 21) => arr.map((s, i) => T(x, y + i * gap, s, size)).join('');
const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fffaf0" stroke="${C.line}"/>`;
const title = (a, b) => `<rect width="1600" height="1000" fill="#f6efe0"/>
  <text x="30" y="40" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">${a}</text>
  <text x="30" y="62" font-size="13" fill="#6b6254">${b}</text>`;
const tag = (x, y, s, bg = '#fffaf0', fg = C.ink) => {
  const w = s.length * 13 + 14;
  return `<rect x="${f(x - w / 2)}" y="${y - 15}" width="${w}" height="20" rx="4" fill="${bg}" stroke="${C.line}"/><text x="${x}" y="${y}" font-size="12" text-anchor="middle" fill="${fg}">${s}</text>`;
};
function bubble(x, y, w, h, tx, ty, textLines) {
  // 尾巴從框的右緣伸向說話的人
  const tail = `<path d="M${x + w - 1},${y + h - 36} L${f(tx)},${f(ty)} L${x + w - 1},${y + h - 12} Z" fill="#fffdf6" stroke="#8a7d66" stroke-width="1.2" stroke-linejoin="round"/>`;
  return tail + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fffdf6" stroke="#8a7d66" stroke-width="1.2"/>
    <path d="M${x + w - 1},${y + h - 35} V${y + h - 13}" stroke="#fffdf6" stroke-width="2.6"/>` + lines(x + 14, y + 24, textLines, 14, 22);
}
// 簡化山坡：一條往右上的石階帶，給分鏡用
function slope(x, y, w, h, seed = 3) {
  const r = rng(seed);
  let steps = '';
  for (let i = 0; i < 14; i++) {
    const t = i / 13, sx = x + 20 + t * (w - 40), sy = y + h - 40 - t * (h * .45);
    steps += `<path d="M${f(sx - 22)},${f(sy)} l44,-3 l2,7 l-44,3 z" fill="${i % 2 ? C.slab : C.slabLit}" stroke="${C.slabEdge}" stroke-width=".8"/>`;
    if (r() < .35) steps += `<ellipse cx="${f(sx - 24)}" cy="${f(sy + 4)}" rx="6" ry="2.4" fill="${C.moss}" opacity=".8"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#c5d08f"/>
    <path d="M${x},${y + h * .42} Q${x + w * .5},${y + h * .2} ${x + w},${y + h * .12} L${x + w},${y} L${x},${y} Z" fill="#dfe6cf"/>
    <path d="M${x},${y + h} L${x + 10},${y + h - 30} L${x + w - 40},${y + h * .44} L${x + w},${y + h * .4} L${x + w},${y + h} Z" fill="${C.grass}" opacity=".55"/>${steps}`;
}
const stepAt = (x, y, w, h, t) => [x + 20 + t * (w - 40), y + h - 40 - t * (h * .45)];

/* ---------- 板 1：角色卡 ---------- */
function boardCard() {
  let cardY = 144;
  const lineup = [
    ['主角', s => figure(Object.assign({}, POSE.loadA, { x: 1150, y: 935, s }))],
    ['堂親', s => cousinFrom(COUSIN_POSE.steady, { x: 1265, y: 935, s: s * .97 })],
    ['師兄', s => pose('sweep', { x: 1380, y: 935, s, dir: -1 })],
    ['師父', s => pose('meditate', { x: 1495, y: 935, s })]
  ];
  return `<div class="board tall" id="card"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('長住道館的堂親：角色卡（工作版）', '小說《挑水的暑假》的周阿祁是堂弟工作版本；遊戲先用「堂親」稱呼，性別、姓名、正式入隊待遊戲 PO 確認。外形沿用 #179 同一套骨架。')}
    ${panel(20, 80, 640, 640)}
    ${H(40, 110, '外形（放大 2.8×）')}
    ${shadow(185, 640, 30, .2)}${cousinFrom(COUSIN_POSE.wait, { x: 185, y: 640, s: 2.8 * .97 })}
    ${shadow(490, 640, 30, .2)}${cousinFrom(POSE.emptyA, { x: 490, y: 640, s: 2.8 * .97, back: true })}
    ${T(185, 690, '正面：等人時把桶放穩', 13, 'text-anchor="middle"')}${T(490, 690, '背面：空桶下山', 13, 'text-anchor="middle"')}
    ${panel(680, 80, 900, 640)}
    ${H(700, 110, '一頁角色卡')}
    ${[['長住多久、為何', ['約三年（約十歲起）。工作假設：父母在外地做工，把他託給道館長輩照顧。', '是「一直住在這裡」，不是像主角那樣暑假才來；原因待定，不寫成被拋棄。']],
       ['與主角、長輩', ['主角的堂親，同姓、小一歲。兩人以前很少見面，算不上熟。', '和道館長輩（小說是爺爺周伯山）是祖孫，也是館裡最常幫忙的手。', '遊戲師父是否就是這位長輩，跟著 D6 與 #123 另定。']],
       ['日常想做什麼', ['想被當成真正能幫忙的人，而不只是被誇一句「乖」。', '每天挑水、掃院，熟到不用想；想學正式功夫，還沒等到長輩開口。']],
       ['個性與不擅長', ['話少、說話直，提醒常被聽成嫌棄；不太會安慰人。', '主角逞強時，他會先在前面等，不會硬拉。']],
       ['他知道／不知道', ['知道：山路哪一級有青苔、扁擔怎麼放、呼吸怎麼配步子、哪裡可以歇。', '不知道：主角的前世、恢復變快的原因；沒有隱藏劇情知識。']],
       ['可辨識的外形與習慣', ['比主角瘦一圈、略矮；膚色曬深。灰綠舊布衣，下擺一塊補丁，頸上搭汗巾。', '一手扶扁擔、眼睛看下一級石階；停下時先把桶放穩再說話。']],
       ['熟手也會累', ['挑熟了不等於不會累：連趟之後一樣要坐下歇。他的穩來自長期練習，', '不是天生體質或劇情加成；也不是用來一直追著主角嘲笑的標尺。']]]
      .map(([k, v]) => { const y = cardY; cardY += 34 + v.length * 20; return `${T(700, y, k, 14, 'font-weight="700" fill="#4f6a4a"')}${lines(700, y + 22, v, 13, 20)}`; }).join('')}
    ${panel(20, 740, 1040, 240)}
    ${H(40, 772, '分開看的三件事（不讓體型決定能力）')}
    ${[['外形／體型', '主角較圓、堂親較瘦', '只是造型與辨識，不改速度、根骨或數值；不要求減重。'],
       ['當下體力', '兩人都會喘、會累', '連趟後都要休息；堂親也不能無限工作。'],
       ['長期熟練', '堂親練了三年', '差在姿勢、步子、停歇次數；主角練習後可追近自己的起點。']]
      .map(([a, b, c], i) => `${T(40, 812 + i * 52, a, 14, 'font-weight="700"')}${T(170, 812 + i * 52, b, 14, 'fill="#4f6a4a"')}${T(40, 834 + i * 52, c)}`).join('')}
    ${T(40, 966, '這張卡是設計稿：沒有新增正式角色、社交、親屬系統或效率加成。', 12, 'fill="#8a6a3a"')}
    ${panel(1080, 740, 500, 240)}
    ${H(1100, 772, '實際遊玩大小（1×）：四人輪廓')}
    <rect x="1100" y="788" width="460" height="168" rx="8" fill="#b8c681"/>
    ${lineup.map(([, g], i) => shadow(1150 + i * 115, 935, 17) + g(.78)).join('')}
    ${lineup.map(([l], i) => tag(1150 + i * 115, 972, l, i === 0 ? C.hero : '#fffaf0', i === 0 ? '#fff' : C.ink)).join('')}
  </svg></div>`;
}

/* ---------- 板 2：同路挑水對照 ---------- */
function boardPath() {
  const p = pathAt(.55), q = pathAt(.3);
  // 在 #179 改後場景裡加入堂親：在前面一段等，面向主角
  const k = shadow(q.x, q.y) + cousinFrom(COUSIN_POSE.wait, { x: q.x, y: q.y, s: .78 * .97, dir: -1 });
  const scene = sceneAfter().replace('<rect width="1600" height="900" fill="url(#vignette)"/>', `${k}<rect width="1600" height="900" fill="url(#vignette)"/>`);
  const inner = scene.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2 - 30, S = 1.45;
  // 兩條示意時間軸：走／歇／灑水，同一條路、同樣半桶
  const lane = (y, name, color, segs, figs) => {
    let x = 230, out = `${T(40, y + 4, name, 14, 'font-weight="700"')}`;
    segs.forEach(([kind, w]) => {
      const fill = kind === 'walk' ? '#9fb87a' : kind === 'rest' ? '#e2b65a' : '#7fb3cf';
      out += `<rect x="${x}" y="${y - 10}" width="${w}" height="18" rx="3" fill="${fill}" stroke="#fffaf0"/>`;
      x += w;
    });
    out += T(x + 12, y + 4, color, 12, 'fill="#6b6254"');
    return out + figs;
  };
  return `<div class="board tall" id="path"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('同一條山路：初學主角與熟手堂親', '同路線、同樣兩個半桶、同一播放速度；場景與路徑點沿 #179／scene.json。小說裡堂弟的桶裝得多些，遊戲對照時要明示負重，否則不算公平比較。')}
    <clipPath id="cut"><rect x="20" y="80" width="780" height="420" rx="10"/></clipPath>
    <g clip-path="url(#cut)"><g transform="translate(${f(410 - cx * S)},${f(290 - cy * S)}) scale(${S})">${inner}</g></g>
    <rect x="20" y="80" width="780" height="420" rx="10" fill="none" stroke="${C.line}"/>
    ${tag(410 + (p.x - cx) * S, 290 + (p.y - cy) * S + 22, '主角', C.hero, '#fff')}${tag(410 + (q.x - cx) * S, 290 + (q.y - cy) * S + 22, '堂親')}
    ${panel(820, 80, 760, 420)}
    ${H(840, 110, '看得出的差別（同一時刻、放大 2.1×）')}
    ${shadow(950, 420, 30, .2)}${heroAs('wobble', { x: 950, y: 420, s: 2.1 })}
    ${shadow(1190, 420, 30, .2)}${heroAs('rest', { x: 1190, y: 420, s: 2.1 })}${puff({ x: 1190, y: 420, s: 2.1 })}
    ${shadow(1430, 420, 30, .2)}${cousinFrom(COUSIN_POSE.steady, { x: 1430, y: 420, s: 2.1 * .97 })}
    ${T(950, 458, '主角：桶晃、扁擔斜', 13, 'text-anchor="middle"')}${T(1190, 458, '主角：第 19 級停下喘', 13, 'text-anchor="middle"')}${T(1430, 458, '堂親：步子穩、手扶扁擔', 13, 'text-anchor="middle"')}
    ${T(950, 478, '步子小、眼睛盯水面', 12, 'text-anchor="middle" fill="#6b6254"')}${T(1190, 478, '彎腰、汗、喘氣', 12, 'text-anchor="middle" fill="#6b6254"')}${T(1430, 478, '腳先看下一級、桶幾乎不晃', 12, 'text-anchor="middle" fill="#6b6254"')}
    ${panel(20, 520, 1560, 460)}
    ${H(40, 552, '一趟上山的示意時間軸（長度只是示意，不是模型數值；兩人同負重、同倍率）')}
    ${T(40, 576, '■ 走　', 12, 'fill="#5f7a3e"')}${T(90, 576, '■ 歇', 12, 'fill="#a87a1a"')}${T(140, 576, '■ 灑水', 12, 'fill="#3f7fa0"')}
    ${lane(616, '主角・第一天', '停兩次，灑一點水', [['walk', 150], ['spill', 16], ['walk', 120], ['rest', 110], ['walk', 160], ['spill', 16], ['rest', 90], ['walk', 170]], '')}
    ${lane(666, '主角・練習後', '停一次；和自己的第一天比', [['walk', 190], ['walk', 160], ['rest', 60], ['walk', 200], ['walk', 160]], '')}
    ${lane(716, '堂親・平常', '不停；但這是第一趟', [['walk', 170], ['walk', 160], ['walk', 160], ['walk', 160]], '')}
    ${lane(766, '堂親・連挑之後', '熟手也會累：一樣要坐下歇', [['walk', 180], ['walk', 170], ['rest', 120], ['walk', 180]], '')}
    ${shadow(1440, 760, 22, .2)}${cousinFrom(COUSIN_POSE.tired, { x: 1440, y: 760, s: 1.6 })}${bucket(1490, 728, 0, .9, 1.2)}${bucket(1516, 732, 0, .9, 1.2)}
    ${lines(40, 822, [
      '· 玩家要看得懂的是：主角比自己的第一天進步了（停歇變少、桶不晃），堂親好在姿勢與步子，而不是走得飛快或偷少裝水。',
      '· 每一條都分清走、歇、灑水的時間；換負重或換路線時要標出來，不能只放一快一慢兩個人當公平比較。',
      '· 主角的成長面板與時間軸要說同一件事；堂親的「平常」也不是固定標尺，連挑幾趟後一樣慢下來。',
      '· 先做兩個視覺 fixture（主角＋堂親）照同一份示意時間軸走，明示沒有產出；不是自主 NPC，也不偷偷多產水。',
      '· 動作套用要等 #181 共用模板：同一組 走／歇／倒水 套到兩個外形，這張圖只先定要看到的差別。'], 13, 24)}
  </svg></div>`;
}

/* ---------- 板 3：一次指點的短情境 ---------- */
function boardGuide() {
  const W = 500, Hh = 340, X = [20, 550, 1080], Y = 110;
  const st = (i, t) => stepAt(X[i], Y, W, Hh, t);
  const a0 = st(0, .3), b0 = st(0, .8), a1 = st(1, .3), b1 = st(1, .62), a2 = st(2, .5), b2 = st(2, .8);
  const S = 1.3, sh = anchors(HERO_POSE.rest).sh;
  const headOf = (p, dir = 1) => [p[0] - 4 * dir * S, p[1] - 92 * S];
  const ring = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="none" stroke="#d65a4a" stroke-width="2.4" stroke-dasharray="5 4"/>`;
  return `<div class="board tall" id="guide"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('一次指點：「別用脖子夾扁擔」', '三格分鏡，取自小說第一章的同一個時刻，改成遊戲裡玩家看得到的回饋。只是設計；不加社交系統、傳授加成或效率 buff。')}
    ${[0, 1, 2].map(i => `<clipPath id="g${i}"><rect x="${X[i]}" y="${Y}" width="${W}" height="${Hh}" rx="8"/></clipPath><g clip-path="url(#g${i})">${slope(X[i], Y, W, Hh, 3 + i)}</g><rect x="${X[i]}" y="${Y}" width="${W}" height="${Hh}" rx="8" fill="none" stroke="${C.line}"/>`).join('')}
    ${H(30, 100, '① 停在第 19 級')}${H(560, 100, '② 堂親走回來指給他看')}${H(1090, 100, '③ 照做之後')}
    ${shadow(a0[0], a0[1], 20, .2)}${heroAs('rest', { x: a0[0], y: a0[1], s: S })}${puff({ x: a0[0], y: a0[1], s: S })}
    ${shadow(b0[0], b0[1], 20, .2)}${cousinFrom(COUSIN_POSE.wait, { x: b0[0], y: b0[1], s: S * .97, dir: -1 })}
    ${bubble(X[0] + 16, Y + 14, 200, 56, ...headOf(b0, -1).map((v, i) => v + (i ? 0 : -16)), ['你肩膀用錯地方了。'])}
    ${shadow(a1[0], a1[1], 20, .2)}${heroAs('rest', { x: a1[0], y: a1[1], s: S })}
    ${shadow(b1[0], b1[1], 20, .2)}${cousinFrom(COUSIN_POSE.stand, { x: b1[0], y: b1[1], s: S * .97, dir: -1 })}
    ${ring(a1[0] + sh[0] * S, a1[1] + sh[1] * S + 4, 15)}
    ${bubble(X[1] + 12, Y + 14, 270, 78, ...headOf(b1, -1).map((v, i) => v + (i ? 0 : -16)), ['別用脖子夾扁擔。手扶著，', '腳先看下一級，不要盯水面。'])}
    ${shadow(a2[0], a2[1], 20, .2)}${heroAs('steady', { x: a2[0], y: a2[1], s: S })}
    ${shadow(b2[0], b2[1], 20, .2)}${cousinFrom(COUSIN_POSE.steady, { x: b2[0], y: b2[1], s: S * .97 })}
    ${tag(a2[0], a2[1] + 24, '手扶扁擔：桶比較穩', '#fffaf0', '#4f6a4a')}
    ${T(X[2] + 16, Y + Hh - 14, '仍然慢；只是水不再每步撞桶沿', 13, 'fill="#3d362d"')}
    ${panel(20, 470, 1040, 510)}
    ${H(40, 502, '玩家看得到的回饋（全部是呈現，不是數值）')}
    ${lines(40, 534, [
      '1. 主角在同一級石階停下超過一會兒時，堂親在前面停下等，轉身面向主角（不是自動拉走或代挑）。',
      '2. 一句短台詞泡泡，最多兩行；主角肩頸處閃一圈提示，指出「哪裡」錯，而不是跳出教學視窗。',
      '3. 玩家選擇：',
      '　 「請他教」→ 下一段改用扶扁擔的走法：桶晃動變小、灑水標記少一些，速度與停歇不變。',
      '　 「自己再試」→ 堂親說「那我在前面等」，先走；主角之後也能自己摸到同一個走法，只是晚一點。',
      '4. 事件紀錄一行：「堂親提醒：別用脖子夾扁擔。」可在原因面板看到是誰、在哪裡、為什麼提醒。',
      '5. 兩條路都不懲罰：沒有好感度、沒有加速，也不讓堂親因主角拒絕而變差；只有台詞與等候方式不同。'], 14, 30)}
    ${T(40, 760, '不在這次設計裡（留給後續、需另批）：', 14, 'font-weight="700" fill="#8a6a3a"')}
    ${lines(40, 790, [
      '· 姿勢提示是否真的影響灑水量／體力，屬於 BL-L01 做中成長的規則；這裡只畫出動作與台詞。',
      '· 好感、師徒傳授加成、堂親自主排班或搶工作，都不是本單內容。',
      '· 提醒的觸發條件（停多久、哪幾級）是示意；接正式世界要讀權威狀態，不另開計時器。',
      '· 台詞取小說第一章原句當工作稿；遊戲正式採用時再由遊戲 PO 定稿與命名。'], 13, 26)}
    ${panel(1080, 470, 500, 510)}
    ${H(1100, 502, '同一幕在小說與遊戲')}
    ${lines(1100, 534, [
      '小說（#124 第一章）：',
      '　c1-ask／c1-solo 兩條路；選項推動',
      '　故事，兩條都能正常進步。',
      '',
      '遊戲（本設計）：',
      '　同一句提醒，玩家選要不要聽；',
      '　回饋只在動作、台詞、紀錄。',
      '',
      '共用：熟手指出肩膀、手、腳三件事；',
      '　主角仍然慢；堂親也會等、會累。',
      '各自：小說的面子心理、事件後果與',
      '　姓名；遊戲的觸發與 UI 呈現。'], 13, 26)}
  </svg></div>`;
}

/* ---------- mount：換掉 bl-v03 的板 ---------- */
(function mount() {
  const boards = { card: boardCard, path: boardPath, guide: boardGuide };
  const want = window.BL_L03_BOARD;
  document.getElementById('root').innerHTML = (want ? [want] : Object.keys(boards)).map(k => boards[k]()).join('');
})();
