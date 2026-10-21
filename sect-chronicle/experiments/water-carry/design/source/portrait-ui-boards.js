/* 立繪放進既有介面的合成示意（#184 最小出口第 2 項）。
   本檔不是獨立頁：由 ../render-portrait-ui.js 先開 bl-v03-board.html（#179），注入 portrait-boards.js（#192 立繪），再注入本檔。
   背景是 V3 展示的實際截圖（../v3/observe.png、../v3/narrow.png），只在上面疊一個對話框與立繪；沒有改 demo/ 的程式或 HUD。
   臉型 A 是 #192 原樣，B 是回應 #192 審查的「圓潤初學者」版本（SHAPES.B）。台詞只是示意，不是小說 canon。 */
'use strict';

const UI = { panel: '#fbf6ea', edge: '#d8c9a6', ink: '#2f2a24', ink2: '#6b6254', hero: '#4f78a8', gold: '#c8962e' };
const LINE = { name: '林遠', role: '主角', text: ['呼……第三擔了，腿在抖……', '水缸還差一擔，歇口氣再走。'] };
const SHAPE_NOTE = {
  A: '臉型 A（#192 原樣）：大眼、尖瀏海、下巴較尖',
  B: '臉型 B（圓潤初學者）：下臉寬、下巴短、眼小一號、圓瀏海、肩頸較厚'
};
const css = `<style>
  .shot { position: absolute; overflow: hidden; border-radius: 6px; box-shadow: 0 1px 0 #cdbb98; }
  .shot > img { position: absolute; left: 0; top: 0; display: block; }
  .shot > svg { position: absolute; inset: 0; }
  .cap { position: absolute; font-size: 14px; color: #3d362d; }
  .cap b { font-size: 18px; color: #2f2a24; margin-right: 10px; }
</style>`;

// 對話框：照 V3 面板的米色底、淺金邊、圓角；name 牌在左上
function dialog(x, y, w, h, o = {}) {
  const size = o.size || 20, pad = o.pad || 24, tx0 = x + (o.textX || pad);
  return `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="12" fill="#000" opacity=".12"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${UI.panel}" stroke="${UI.edge}" stroke-width="1.5" opacity=".97"/>
    <rect x="${tx0 - 6}" y="${y - 16}" width="${o.nameW || 116}" height="32" rx="8" fill="${UI.hero}" stroke="#3b5d85"/>
    <text x="${tx0 + 6}" y="${y + 6}" font-size="${o.nameSize || 17}" font-weight="700" fill="#fff">${LINE.name}<tspan font-size="${(o.nameSize || 17) - 4}" font-weight="400" dx="8">${LINE.role}</tspan></text>
    ${LINE.text.map((t, i) => `<text x="${tx0}" y="${y + 30 + size + i * (size * 1.6)}" font-size="${size}" fill="${UI.ink}">${t}</text>`).join('')}
    <text x="${x + w - 18}" y="${y + h - 14}" font-size="${o.hintSize || 13}" fill="${UI.ink2}" text-anchor="end">點一下繼續 ▾</text>`;
}

// 寬畫面：1400×820 截圖 1:1，立繪站在對話框左側、下半身被框蓋住（常見對話立繪擺法）
function desk(shape) {
  const W = 1400, H = 820, top = 64, left = 20;
  const pw = 270;
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    <rect width="${W}" height="${H}" fill="#2f2a24" opacity=".18"/>
    <svg x="18" y="${H - 228 - pw * 1.25 + 150}" width="${pw}" height="${pw * 1.25}" viewBox="0 0 400 500">${portrait('tired', { shape })}</svg>
    ${dialog(250, H - 228, 760, 132, { size: 21, textX: 30 })}
  </svg>`;
  return `<div class="board" id="desk-${shape.toLowerCase()}" style="width:1440px;height:${H + top + 16}px">${css}
    <div class="cap" style="left:${left}px;top:18px"><b>寬畫面 1400×820・${shape}</b>${SHAPE_NOTE[shape]}；背景是 V3 展示實際截圖，畫面暫時變暗、只疊對話框</div>
    <div class="shot" style="left:${left}px;top:${top}px;width:${W}px;height:${H}px"><img src="../v3/observe.png" width="${W}" height="${H}" alt="">${svg}</div>
  </div>`;
}

// 390 窄畫面：取 narrow.png 第一格（402×780），對話框貼底、立繪縮成框內左側的半身小圖
function phone(shape, x) {
  const W = 402, H = 780;
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    <rect width="${W}" height="${H}" fill="#2f2a24" opacity=".3"/>
    ${dialog(16, H - 168, W - 32, 150, { size: 15.5, textX: 112, nameW: 92, nameSize: 15, hintSize: 12 })}
    <rect x="28" y="${H - 146}" width="76" height="100" rx="8" fill="#efe4cc" stroke="${UI.edge}"/>
    <svg x="28" y="${H - 146}" width="76" height="100" viewBox="70 40 260 342">${portrait('tired', { shape })}</svg>
  </svg>`;
  return `<div class="shot" style="left:${x}px;top:64px;width:${W}px;height:${H}px"><img src="../v3/narrow.png" width="1206" height="${H}" alt="">${svg}</div>
    <div class="cap" style="left:${x}px;top:${64 + H + 10}px">${shape}：${SHAPE_NOTE[shape].split('：')[1]}</div>`;
}
function narrow() {
  return `<div class="board" id="narrow" style="width:1440px;height:900px">${css}
    <div class="cap" style="left:20px;top:18px"><b>390px 窄畫面・A／B</b>背景是 V3 展示實際窄畫面截圖第一格（原本開著人物面板，這裡只是蓋在上面）；對話框貼底，立繪縮成框內左側的小圖</div>
    ${phone('A', 20)}${phone('B', 442)}
    <svg style="position:absolute;left:880px;top:64px" width="540" height="780" viewBox="0 0 540 780" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
      <rect width="540" height="780" rx="12" fill="#fffaf0" stroke="${C.line}"/>
      ${hx(20, 34, '看這張時注意')}
      ${[
        '框內立繪 76×100px：A 的大眼在這個尺寸仍醒目；B 眼小一號，',
        '　但臉圓、肩寬，輪廓更接近場景裡圓滾滾的小人。',
        '文字 15.5px、兩行：390px 寬放得下，不必縮字。',
        '對話框蓋住的是人物面板下半與名冊卡；主角、水缸、',
        '　師兄仍在框上方看得到，玩家知道是誰在說話。',
        '',
        '沒驗的：',
        '　真手機觸控、深色模式、三行以上長台詞、',
        '　立繪與 V3 名冊卡同時出現時的層級。',
        '',
        '這是疊在截圖上的示意，不是 demo/ 的程式：',
        '　沒有改 HUD、暫停邏輯或任何事件觸發。'
      ].map((t, i) => tx(20, 70 + i * 26, t, 13.5)).join('')}
      ${hx(20, 420, '台詞與時機（示意）')}
      ${[
        '「呼……第三擔了，腿在抖……」配疲累表情。',
        '只是展示對話框的樣子；什麼時候跳對話、',
        '要不要暫停世界、誰能說話，都還沒定，',
        '也不是小說 canon。'
      ].map((t, i) => tx(20, 456 + i * 26, t, 13.5)).join('')}
    </svg>
  </div>`;
}

// A／B 臉型並排：三表情＋小尺寸頭像
function faces() {
  const keys = ['calm', 'brave', 'tired'];
  const row = (shape, y) => `${hx(30, y + 24, `臉型 ${shape}`, 18)}${SHAPE_NOTE[shape].split('：')[1].split('、').map((t, i) => tx(30, y + 50 + i * 20, t, 13)).join('')}
    ${keys.map((k, i) => `<rect x="${230 + i * 230}" y="${y}" width="210" height="262" rx="10" fill="#efe4cc"/>
      <svg x="${230 + i * 230}" y="${y}" width="210" height="262" viewBox="0 0 400 500">${portrait(k, { shape })}</svg>
      ${tx(230 + i * 230 + 8, y + 284, FACES[k].label, 13)}`).join('')}
    ${[64, 48].map((d, j) => keys.map((k, i) => avatarS(k, shape, 960 + i * 80, y + 40 + j * 100, d)).join('')).join('')}`;
  return `<div class="board tall" id="faces"><svg viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)">
    <rect width="1600" height="1000" fill="#f6efe0"/>
    <text x="30" y="40" font-size="24" font-weight="700" fill="${C.ink}" font-family="var(--serif)">臉型 A／B：同樣三種表情</text>
    ${tx(30, 64, '頭髮、衣服、表情參數都相同，只換臉型、眼睛大小與瀏海。右邊是 64px、48px 頭像。B 是回應 #192 審查「大眼瀏海偏秀氣、和胖胖初學主角辨識可再加強」做的候選。')}
    <rect x="20" y="82" width="1560" height="330" rx="12" fill="#fffaf0" stroke="${C.line}"/>${row('A', 102)}
    <rect x="20" y="430" width="1560" height="330" rx="12" fill="#fffaf0" stroke="${C.line}"/>${row('B', 450)}
    ${tx(960, 122, '64px', 12)}${tx(960, 222, '48px', 12)}${tx(960, 470, '64px', 12)}${tx(960, 570, '48px', 12)}
    <rect x="20" y="778" width="1560" height="200" rx="12" fill="#fffaf0" stroke="${C.line}"/>
    ${hx(40, 808, '差在哪裡')}
    ${[
      'B 的下臉寬、下巴短、雙頰紅暈大一圈，和場景小人「圓臉＋圓腰腹」的輪廓比較一致，看起來更像剛入門、還有點稚氣的胖胖學徒。',
      'B 的眼睛小一號，換來的是 48px 時表情稍難分：逞強主要靠咧嘴，疲累靠半閉眼與汗滴。A 的大眼在小圖較醒目，但整體偏秀氣。',
      '兩版共用同一份頭髮、衣服與表情參數；選哪一版只是 SHAPES 的一組數字，之後的立繪、頭像、對話框都跟著換，不必重畫。',
      '這裡不決定主角的體型能力或小說外貌；只比較「看起來像不像同一個圓潤初學者」。'
    ].map((t, i) => tx(40, 840 + i * 30, t, 14)).join('')}
  </svg></div>`;
}
function avatarS(key, shape, x, y, d) {
  const id = `avs${portraitN}`;
  return `<clipPath id="${id}"><circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}"/></clipPath>
    <circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}" fill="#e9dcc0"/>
    <g clip-path="url(#${id})"><svg x="${x}" y="${y}" width="${d}" height="${d}" viewBox="90 135 220 220">${portrait(key, { shape })}</svg></g>
    <circle cx="${f(x + d / 2)}" cy="${f(y + d / 2)}" r="${f(d / 2)}" fill="none" stroke="${C.hero2}" stroke-width="1.6"/>`;
}

/* ---------- mount：換掉 bl-v03／portrait 的板 ---------- */
(function mount() {
  const boards = { 'desk-a': () => desk('A'), 'desk-b': () => desk('B'), narrow, faces };
  const want = window.PORTRAIT_UI_BOARD;
  document.getElementById('root').innerHTML = (want ? [want] : Object.keys(boards)).map(k => boards[k]()).join('');
})();
