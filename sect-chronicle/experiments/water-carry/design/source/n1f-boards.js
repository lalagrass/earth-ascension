/* N1f「工作之後自己的生活」兩段流程分鏡（#188）。
   本檔不是獨立頁：由 ../render-n1f.js 先開 bl-v03-board.html（#179），注入 bl-l03-boards.js（#180 堂親與版面小工具），再注入本檔。
   所以人物用的是 #179 的 figure()／POSE 與 #180 的 cousinFrom()，版面沿用 T／H／panel／bubble／tag，不另畫一套。
   這裡只加：小院落場景（水缸、石凳、楓樹、曬藥架）、點選卡片的樣子、三張板的版面。
   全部是設計稿：挑水是 D11 展示的示意工作，「三擔」「聊一會兒」都不是模型數值。 */
'use strict';

/* ---------- 小院落：一格分鏡的場景 ---------- */
const PW = 375, PH = 290;
function bench(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">${shadow(2, 0, 30, .2)}
    <rect x="-24" y="-12" width="9" height="12" fill="${C.stone2}"/><rect x="15" y="-12" width="9" height="12" fill="${C.stone2}"/>
    <path d="M-32,-12 L32,-12 L29,-19 L-29,-19 Z" fill="${C.stone}" stroke="${C.stone3}" stroke-width=".9"/>
    <path d="M-27,-17 L22,-17" stroke="#ece6d8" stroke-width="1.6" opacity=".8"/></g>`;
}
const SEAT = 28; // 石凳面離地高（bench 放大 1.5 倍）
function rack(x, y, s = 1) {
  const tray = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="20" ry="5" fill="#b89a62" stroke="#8a7044" stroke-width=".8"/>
    <ellipse cx="${cx - 5}" cy="${cy - 1.5}" rx="6" ry="2" fill="#7d9a52"/><ellipse cx="${cx + 6}" cy="${cy - 1}" rx="5" ry="1.8" fill="#93ad62"/>`;
  return `<g transform="translate(${x},${y}) scale(${s})">${shadow(0, 0, 34, .16)}
    <path d="M-30,0 L-30,-46 M30,0 L30,-46 M-36,-44 L36,-44" stroke="${C.wood}" stroke-width="3" stroke-linecap="round"/>
    ${tray(-14, -30)}${tray(14, -14)}</g>`;
}
function yard(o = {}) {
  const r = rng(o.seed || 4);
  let tufts = '';
  for (let i = 0; i < 18; i++) tufts += `<path d="M${f(r() * PW)},${f(150 + r() * 140)} l2,-6 l2,6" stroke="${C.grass3}" stroke-width="1" fill="none" opacity=".6"/>`;
  return `<rect width="${PW}" height="${PH}" fill="#c5d08f"/>
    <path d="M0,0 H${PW} V70 Q${PW * .6},52 0,78 Z" fill="#dfe6cf"/>
    <path d="M0,78 Q${PW * .6},52 ${PW},70 V104 Q${PW * .5},92 0,112 Z" fill="${C.grass}" opacity=".5"/>
    <path d="M0,214 L${PW},176 L${PW},236 L0,276 Z" fill="${C.slab}" opacity=".55"/>
    <path d="M0,214 L${PW},176" stroke="${C.slabEdge}" stroke-width=".8" opacity=".5"/>${tufts}
    ${o.rack === false ? '' : rack(o.rackX || 205, o.rackY || 132, .9)}
    ${maple(o.mapleX || 318, 150, .78)}${bush(28, 122, .7, true)}
    ${vat(o.vatX || 62, o.vatY || 226, o.level == null ? .45 : o.level, .9)}
    ${o.bench === false ? '' : bench(o.benchX || 290, o.benchY || 206, 1.5)}`;
}
// 一格分鏡：標題帶＋裁切的小場景；content 是場景座標裡的人物與標記
function cell(x, y, head, content, o = {}) {
  const id = `c${x}-${y}`;
  return `<g transform="translate(${x},${y})">
    <clipPath id="${id}"><rect width="${PW}" height="${PH}" rx="8"/></clipPath>
    <g clip-path="url(#${id})">${yard(o)}${content}${o.dim ? `<rect width="${PW}" height="${PH}" fill="#2f2a24" opacity=".28"/>` : ''}${o.over || ''}</g>
    <rect width="${PW}" height="${PH}" rx="8" fill="none" stroke="${C.line}"/>
    <rect x="0" y="-30" width="${PW}" height="26" rx="6" fill="#efe4cc"/>
    <text x="12" y="-12" font-size="15" font-weight="700" fill="${C.ink}">${head}</text></g>`;
}

/* ---------- 人物與標記 ---------- */
const S = 1.12; // 分鏡裡人物放大倍率
const hero = (p, extra) => figure(Object.assign({}, POSE[p] || p, { s: S }, extra));
const kin = (p, extra) => cousinFrom(POSE[p] || p, Object.assign({ s: S * .97 }, extra));
const senior = (extra) => pose('sweep', Object.assign({ s: S }, extra));
const STAND = Object.assign({}, POSE.idle, { load: 'none' });
// 坐在石凳上：大腿朝前、小腿垂下。不用 sit（那是盤腿坐地、不畫腿），改用彎腿，髖約在腳底原點上方 24
const SIT = Object.assign({}, POSE.meditate, { sit: false, beard: false, legs: [{ t: 86, k: 86 }, { t: 94, k: 98 }], robe: C.hero, robe2: C.hero2, robeLit: C.heroLit, sash: C.heroSash, inner: C.heroInner, ribbon: C.ribbon, round: 1 });
const sitOn = (x, y) => ({ x, y: y - SEAT + 24 });
// 兩個桶放在地上（扁擔橫在旁邊）
const setDown = (x, y) => `${bucket(x, y, 0, .2, 1.05)}${bucket(x + 22, y + 3, 0, .2, 1.05)}<path d="M${x - 10},${y + 9} L${x + 40},${y + 4}" stroke="${C.wood}" stroke-width="3" stroke-linecap="round"/>`;
function chat(x, y, flip = 1) {
  return `<g transform="translate(${x},${y})"><path d="M${-6 * flip},12 L${-12 * flip},22 L${2 * flip},12 Z" fill="#fffdf6" stroke="#8a7d66"/>
    <rect x="-18" y="-6" width="36" height="20" rx="9" fill="#fffdf6" stroke="#8a7d66"/>
    <circle cx="-8" cy="4" r="2.2" fill="#8a7d66"/><circle cx="0" cy="4" r="2.2" fill="#8a7d66"/><circle cx="8" cy="4" r="2.2" fill="#8a7d66"/></g>`;
}
function think(x, y, w, textLines, tx, ty) {
  const h = 16 + textLines.length * 19;
  const dots = [.55, .78].map((k, i) => `<circle cx="${f(x + w * .3 + (tx - x - w * .3) * k)}" cy="${f(y + h + (ty - y - h) * k)}" r="${4 - i * 1.4}" fill="#fffdf6" stroke="#8a7d66"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fffdf6" stroke="#8a7d66"/>${dots}` + lines(x + 10, y + 21, textLines, 13, 19);
}
const badge = (x, y, s, bg = C.hero, fg = '#fff') => tag(x, y, s, bg, fg);
// 點選人物後的卡片（只是版面示意，不是正式 UI）
function infoCard(x, y, w, name, rows, buttons = []) {
  const h = 44 + rows.length * 38 + (buttons.length ? 44 : 0);
  let out = `<g transform="translate(${x},${y})"><rect width="${w}" height="${h}" rx="10" fill="#fffaf0" stroke="#8a7d66" stroke-width="1.4"/>
    <rect width="${w}" height="32" rx="10" fill="${C.hero}"/><rect y="20" width="${w}" height="12" fill="${C.hero}"/>
    <text x="12" y="22" font-size="14" font-weight="700" fill="#fff">${name}</text>`;
  rows.forEach(([k, v], i) => { out += `<text x="12" y="${58 + i * 38}" font-size="11" fill="#6b6254">${k}</text><text x="12" y="${75 + i * 38}" font-size="13" fill="${C.ink}">${v}</text>`; });
  let bx = 12;
  buttons.forEach(([label, primary]) => {
    const bw = label.length * 13 + 20;
    out += `<rect x="${bx}" y="${h - 38}" width="${bw}" height="26" rx="6" fill="${primary ? C.ink : '#fffdf6'}" stroke="${C.line}"/><text x="${bx + bw / 2}" y="${h - 20}" font-size="13" text-anchor="middle" fill="${primary ? '#fff' : C.ink}">${label}</text>`;
    bx += bw + 8;
  });
  return out + '</g>';
}
const log = (s) => `<rect x="8" y="${PH - 30}" width="${PW - 16}" height="22" rx="5" fill="#2f2a24" opacity=".72"/><text x="16" y="${PH - 14}" font-size="12" fill="#f6efe0">${s}</text>`;
const CX = [20, 413, 806, 1199], CY = 112;
const caption = (i, arr) => lines(CX[i] + 4, CY + PH + 26, arr, 13, 20);

/* ---------- 板 1：做完再玩 ---------- */
function boardDone() {
  const benchSeat = [290, 206];
  const kinSit = kin(SIT, Object.assign({}, sitOn(benchSeat[0] + 32, benchSeat[1]), { robe: COUSIN.robe, robe2: COUSIN.robe2, robeLit: COUSIN.robeLit, sash: COUSIN.sash, inner: COUSIN.inner, ribbon: COUSIN.ribbon, round: COUSIN.round, dir: -1 }));
  const heroSit = hero(SIT, Object.assign({}, sitOn(benchSeat[0] - 32, benchSeat[1])));
  return `<div class="board tall" id="done"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('流程一：做完再玩', '主角照玩家的交辦挑完三擔 → 交辦結算、手動鎖結束 → 下一個自主決策點，他選了喜歡的事：去找堂親說話。全部是分鏡；三擔、聊多久都是示意。')}
    ${cell(CX[0], CY, '① 倒下第三擔：交辦完成', `${hero('pour', { x: 18, y: 236 })}${kinSit}${badge(70, 104, '挑水 3/3 ✓')}${log('紀錄：主角完成交辦「挑水 3 擔」')}`)}
    ${cell(CX[1], CY, '② 回到自己作主', `${setDown(24, 244)}${hero(STAND, { x: 104, y: 236 })}${kinSit}${think(120, 70, 190, ['沒有急著要做的事，', '去找堂親說說話。'], 112, 118)}${log('紀錄：主角恢復自主（交辦已完成）')}`)}
    ${cell(CX[2], CY, '③ 走到石凳邊坐下聊', `${setDown(24, 244)}${heroSit}${kinSit}${chat(250, 92, 1)}${chat(330, 96, -1)}${badge(286, 252, '閒聊中', '#fffaf0', C.ink)}`)}
    ${cell(CX[3], CY, '④ 點他：看原因與接下來', `${setDown(24, 244)}${heroSit}${kinSit}`, {
      dim: true,
      over: infoCard(14, 18, 250, '主角　正在：和堂親閒聊', [
        ['剛完成', '挑水 3 擔（你交辦的，已結算）'],
        ['為什麼在這裡', '喜歡和堂親說話；現在沒有急事'],
        ['接下來', '聊一會兒，之後重新看要做什麼']], [['叫他去做…', false]])
    })}
    ${caption(0, ['完成的是「這次交辦」：三擔都已結算。', '只完成一擔時不算，不會提早去玩。'])}
    ${caption(1, ['手動鎖照現有規則結束（RT00 §2.5），', '紀錄一行；之後才輪到他自己挑事做。'])}
    ${caption(2, ['看得到在做什麼：走過去、坐下、', '兩人輪流冒聊天泡泡，不是只跳一行字。'])}
    ${caption(3, ['卡片回答三件事：剛做完什麼、為何在這、', '何時回去。有界：不會一直閒逛下去。'])}
    ${panel(20, 500, 760, 480)}
    ${H(40, 532, '對象在忙時：不拉人，改去別處，並說原因')}
    <g transform="translate(40,556)"><clipPath id="busy"><rect width="${PW}" height="${PH}" rx="8"/></clipPath>
      <g clip-path="url(#busy)">${yard({ rackX: 210, rackY: 150 })}${kin(STAND, { x: 236, y: 172, dir: -1 })}${badge(236, 70, '堂親：翻曬中', '#fffaf0', '#4f6a4a')}
        ${setDown(24, 244)}${heroSit}${think(130, 196, 150, ['堂親在忙，', '自己坐一下。'], 282, 214)}</g>
      <rect width="${PW}" height="${PH}" rx="8" fill="none" stroke="${C.line}"/></g>
    ${lines(432, 576, [
      '· 想找的人正在做事：不打斷、不把人拉走。',
      '· 改做自己能做的休閒（石凳歇一下），',
      '　原因寫出來：「堂親在忙」。',
      '· 路不通、對象不在：同樣說原因與去向，',
      '　不瞬移、不原地乾等。',
      '· 若有急事（體力太低、受傷），',
      '　先照現有 R1 休養，不去玩。',
      '· 正式做時，兩人是否「有空」要在',
      '　權威仲裁裡決定，畫面不能自己配對。'], 13, 23)}
    ${panel(800, 500, 780, 480)}
    ${H(820, 532, '這段接在現有規則哪裡')}
    ${[['玩家交辦', '對主角下「挑水 3 擔」', '#dbe6f3'], ['交辦結算', '3 擔都完成；成果不回收', '#dbe6f3'], ['手動鎖結束', 'autonomyResumed（現有）', '#dbe6f3'],
       ['自主決策點', '先看 R1 恢復、R2 需求', '#efe4cc'], ['新：選休閒', '沒有急需時，依喜好挑一件', '#f6dcc8'], ['新：有界結束', '聊完回到下一個決策點', '#f6dcc8']]
      .map(([a, b, c], i) => { const x = 820 + (i % 3) * 250, y = 556 + Math.floor(i / 3) * 96;
        return `<rect x="${x}" y="${y}" width="232" height="72" rx="8" fill="${c}" stroke="${C.line}"/>${T(x + 12, y + 28, a, 14, 'font-weight="700"')}${T(x + 12, y + 52, b, 12)}` +
          (i % 3 < 2 ? `<path d="M${x + 234},${y + 36} l12,0" stroke="#8a7d66" stroke-width="2" marker-end="url(#arr)"/>` : ''); }).join('')}
    <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8a7d66"/></marker></defs>
    ${T(820, 776, '■ 藍：現有契約已有　■ 米：現有決策順序　■ 橘：本題新增，要另定規則', 12, 'fill="#6b6254"')}
    ${lines(820, 808, [
      '· 休閒是一種新活動，不是把現在的「等待（goals_done）」改成會走動、會回體力。',
      '　現有等待照舊：不移動、不改體力心境。',
      '· 休閒插在哪一層（R2 之後、R4 之前？）、會不會回體力或心境，',
      '　都要擁有人選；這張圖只定玩家要看到什麼。',
      '· 兩人同時休閒、坐同一張石凳，正式做時要像工作位一樣預約。',
      '· 不需要每次行動叫 LLM，也不先做完整的飢餓／生理需求。'], 13, 24)}
  </svg></div>`;
}

/* ---------- 板 2：半途分心 ---------- */
function boardDistract() {
  return `<div class="board tall" id="distract"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('流程二：工作沒做完就分心', '主角自己作主在挑水（沒有玩家交辦），倒完一擔、準備下一擔時遇見師兄 → 放下桶去聊 → 玩家暫停點他，可以允許或叫回 → 回去前先重新確認還要不要做。')}
    ${cell(CX[0], CY, '① 自主挑水：倒完一擔', `${hero('pour', { x: 18, y: 236 })}${senior({ x: 250, y: 214, dir: -1 })}${badge(70, 104, '自主・水缸還差 3 擔')}${log('倒完一擔＝單位邊界：只在這種時候考慮分心')}`, { bench: false, level: .3 })}
    ${cell(CX[1], CY, '② 遇見師兄，放下桶去聊', `${setDown(24, 244)}${hero(STAND, { x: 186, y: 222 })}${senior({ x: 250, y: 214, dir: -1 })}${chat(174, 100, 1)}${chat(262, 92, -1)}${badge(186, 252, '閒聊中・水缸還差 2 擔')}`, { bench: false, level: .38 })}
    ${cell(CX[2], CY, '③ 暫停、點他', `${setDown(24, 244)}${hero(STAND, { x: 186, y: 222 })}${senior({ x: 250, y: 214, dir: -1 })}`, {
      bench: false, level: .38, dim: true,
      over: infoCard(14, 14, 300, '主角　正在：和師兄閒聊', [
        ['原本在做', '挑水（自主）：水缸還差 2 擔'],
        ['為什麼停下', '倒完一擔時遇見師兄，想聊兩句'],
        ['接下來', '聊一會兒，之後回去挑水']], [['允許這次', false], ['叫他回去挑水', true]])
    })}
    ${cell(CX[3], CY, '④ 叫回：先確認，再繼續', `${hero('emptyA', { x: 120, y: 236, dir: -1 })}${senior({ x: 250, y: 214, dir: -1 })}${think(170, 24, 170, ['水缸還差 2 擔，', '回去挑。'], 140, 112)}${badge(214, 244, '你的指令：挑水 2 擔')}${log('紀錄：主角結束閒聊，回去挑水（你的指令）')}`, { bench: false, level: .38 })}
    ${caption(0, ['只在倒完一擔、準備下一擔時考慮；', '走在路上、倒水途中不會丟下桶走掉。'])}
    ${caption(1, ['頭上寫清楚：正在聊天、原工作還差多少。', '已倒進缸裡的那擔照算，不倒帶。'])}
    ${caption(2, ['只有主角能叫回（首輪契約）；', '其他人物點了只看原因，沒有按鈕。'])}
    ${caption(3, ['叫回＝對主角下手動指令；到指令做完前', '不會再分心（手動鎖，不被個性覆寫）。'])}
    ${panel(20, 500, 1040, 480)}
    ${H(40, 532, '回去之前先重新確認：舊任務不盲目補做')}
    ${[['A　還需要', '水缸還差 2 擔', '照常繼續剩下的 2 擔。', '#dbe6c8'],
       ['B　已經不需要', '聊天時堂親把水缸挑滿了', '不補做舊任務；說「水缸已滿」，改做下一件或歇。', '#efe4cc'],
       ['C　允許這次', '玩家按「允許這次」', '聊完（有上限）自己回去；不會每擔都停一次。', '#e6dff0']]
      .map(([a, b, c, bg], i) => { const y = 556 + i * 120;
        return `<rect x="40" y="${y}" width="1000" height="104" rx="10" fill="${bg}" stroke="${C.line}"/>${T(60, y + 34, a, 16, 'font-weight="700"')}${T(250, y + 34, b, 14, 'fill="#4f6a4a"')}${T(250, y + 66, c, 14)}`; }).join('')}
    ${T(40, 948, '「還差幾擔」由當下世界重新算（缸裡缺多少），不是聊天前記下的數字；所以 B 不需要額外的「過期」規則。', 13, 'fill="#8a6a3a"')}
    ${panel(1080, 500, 500, 480)}
    ${H(1100, 532, '不在這張圖裡（要另批）')}
    ${lines(1100, 566, [
      '· 分心多常發生、會不會用亂數。',
      '　用亂數就要定用哪條亂數串流，',
      '　並更新既有種子的回放基準（#118）。',
      '· 分心有沒有後果（心情、關係、效率）。',
      '　首稿建議：沒有懲罰、沒有好感數值。',
      '· 急事、危險工作能不能分心。',
      '　首稿建議：恢復與承諾型工作不分心。',
      '· 能不能逐人關掉自主或分心。',
      '· 走到一半就停下的版本：',
      '　要比較進行中那擔的捨棄或保存，',
      '　這張圖不默認。',
      '· 叫回其他人物：首輪契約只能指揮主角，',
      '　開放全隊手動要另批。'], 13, 26)}
  </svg></div>`;
}

/* ---------- 板 3：同情境兩種偏好＋中斷／恢復表 ---------- */
function boardPrefs() {
  const sit = (who, x, y, dir = 1) => who === 'hero' ? hero(SIT, Object.assign(sitOn(x, y), { dir }))
    : kin(SIT, Object.assign(sitOn(x, y), { robe: COUSIN.robe, robe2: COUSIN.robe2, robeLit: COUSIN.robeLit, sash: COUSIN.sash, inner: COUSIN.inner, ribbon: COUSIN.ribbon, round: COUSIN.round, dir }));
  const W2 = 370, cellAt = (x, y, head, content, o) => cell(x, y, head, content, o);
  const rows = [
    ['問題', '建議（待評估）', '為什麼這樣選', '要擁有人選的'],
    ['叫回後會不會又立刻跑掉？', '沿用手動鎖：保護這次指令的剩餘擔數，做完才回到自主', '已有規則、玩家看得懂；不另加「幾秒內不分心」', '要不要允許人物違抗玩家'],
    ['分心時原工作怎麼辦？', '已完成的擔照算；剩下的不另存，回來時由需求重新算', '自主工作本來一次只請求一單位，沒有「剩幾擔」可保存', '想要另存意圖時，舊意圖何時過期'],
    ['什麼時候考慮分心？', '只在單位邊界（倒完一擔、採完一份）', '正好是現在重新判斷的時機；不用打斷走路或做到一半', '要不要加「走一半就停」'],
    ['什麼時候回去？', '一次有界的休閒；聊完或被叫回就重新看需求', '不無限聊、不每刻重抽；目標變了就不補做舊事', '一次多長、多久才能再分心'],
    ['誰可以被叫回？', '首輪只有主角；其他人物看原因', 'RT00 §2.5 只開主角手動', '開放全隊手動'],
    ['做完的單位與目標', '分開顯示：這一擔／這次交辦／長期目標', '不把一擔說成目標完成，也不要求所有目標清空才准休閒', '休閒插在決策順序哪一層']
  ];
  const colX = [40, 300, 760, 1200], colW = [250, 450, 430, 340];
  return `<div class="board tall" id="prefs"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    ${title('同一情境、兩種偏好；中斷與恢復怎麼定', '堂親偏安靜、傾向先做完；主角愛聊天、容易被熟人吸引。只是兩個視覺 fixture 的喜好，不是好壞人格、效率差或人格測驗結論。')}
    ${H(40, 100, '情境甲：做完一擔，熟人在旁邊')}${H(820, 100, '情境乙：交辦全部做完')}
    ${cellAt(40, 136, '堂親：點個頭，繼續挑', `${kin('loadA', { x: 120, y: 236, dir: -1, back: true })}${senior({ x: 250, y: 214, dir: -1 })}${think(150, 40, 170, ['先挑完再說。'], 130, 120)}`, { bench: false, level: .3, seed: 7 })}
    ${cellAt(425, 136, '主角：放下桶去聊', `${setDown(24, 244)}${hero(STAND, { x: 186, y: 222 })}${senior({ x: 250, y: 214, dir: -1 })}${chat(174, 100, 1)}${chat(262, 92, -1)}`, { bench: false, level: .3, seed: 7 })}
    ${cellAt(820, 136, '堂親：一個人坐著看藥', `${sit('kin', 300, 206, -1)}${think(110, 44, 160, ['歇一下，', '看看藥曬得怎樣。'], 290, 116)}`, { seed: 9 })}
    ${cellAt(1205, 136, '主角：去找人說話', `${hero(STAND, { x: 150, y: 226 })}${senior({ x: 236, y: 212, dir: -1 })}${chat(140, 104, 1)}${chat(250, 96, -1)}`, { seed: 9 })}
    ${T(40, 452, '同一情境放在一起看，玩家才分得出「這是他的喜好」；兩人都會做完工作，也都會休息，差別只在什麼時候、跟誰。不給任何一方效率加成或懲罰。', 13, 'fill="#4f6a4a"')}
    ${panel(20, 470, 1560, 510)}
    ${H(40, 502, '中斷、保留與恢復（建議都待評估；數值都不定）')}
    ${rows.map((r, i) => { const y = 530 + i * 62;
      return (i ? `<rect x="30" y="${y - 6}" width="1540" height="58" rx="6" fill="${i % 2 ? '#fffdf6' : '#f6efe0'}"/>` : '') +
        r.map((c, j) => {
          const parts = c.length * 13.5 > colW[j] ? [c.slice(0, Math.ceil(c.length / 2)), c.slice(Math.ceil(c.length / 2))] : [c];
          return parts.map((s, k) => T(colX[j], y + (parts.length > 1 ? 16 : 28) + k * 20, s, i ? 13 : 14, i ? (j === 3 ? 'fill="#8a6a3a"' : '') : 'font-weight="700"')).join('');
        }).join(''); }).join('')}
  </svg></div>`;
}

/* ---------- mount：換掉 bl-v03／bl-l03 的板 ---------- */
(function mount() {
  const boards = { done: boardDone, distract: boardDistract, prefs: boardPrefs };
  const want = window.N1F_BOARD;
  document.getElementById('root').innerHTML = (want ? [want] : Object.keys(boards)).map(k => boards[k]()).join('');
})();
