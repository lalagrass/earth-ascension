// LP-10 掌法點選流程的每一格（設計示意，未連遊戲）。全部是寫死的畫稿資料：位置、姿勢、面板文字、熱區。
// 不跑世界、不算結果；「示意擊倒」「逃出範圍」都是畫稿標記，不是判效。
// S0 生活 → S1 發起 → S2 接近 → S3 起手／接觸／收勢 → S4 換目標／逃離 → S5 叫停或結束返院。

const R1 = [868, 528], R2 = [790, 490], R3 = [712, 432]; // 三隻測試弱鼠（本稿 fixture 位置，護欄內西院草地）
const HOME = [962, 512];

const rat = (id, [x, y], mode = 'sniff', face = 1, extra = {}) => ({ id, x, y, mode, face, alert: id === 3, ...extra });
const ratsAt = (m1 = 'sniff', m2 = 'sniff', m3 = 'sniff', p3 = R3) => [rat(1, R1, m1), rat(2, R2, m2), rat(3, p3, m3, m3 === 'flee' ? -1 : 1)];
const hero = (x, y, face, pose, extra = {}) => ({ id: 'hero', x, y, face, pose, sel: true, ...extra });
const walk = (x, y, face, k = 1) => hero(x, y, face, null, { frame: `herbWalk-${k}` });
const cousin = { id: 'cousin', x: 1040, y: 577, face: 1, frame: 'herbWalk-2' }; // 熟手照常採藥（沿 herb 路），本稿不動他

// 測試鼠卡（左上）：每隻一行，寫明狀態與「示意」字樣
const RAT_TEXT = { sniff: '嗅地覓食', alert: '察覺 → 準備逃', hit: '受掌（示意）', down: '示意擊倒（結果待決）', flee: '逃離中', gone: '逃出範圍（未追）', none: '' };
function ratCard(m1, m2, m3) {
  const row = (n, kind, m) => `<div class="row"><span>鼠${n} · ${kind}</span><b class="r-${m}">${RAT_TEXT[m]}</b></div>`;
  return `<h3>測試弱鼠 × 3 <small>設計 fixture · 不補滿、不繁殖</small></h3>${row(1, '普通', m1)}${row(2, '普通', m2)}${row(3, '警覺', m3)}
  <p class="muted">警覺鼠只在「看得見的逼近」或「同伴遇襲」時逃；不會預知玩家。</p>`;
}

// 主角面板（右側）：沿生活面板的段落，只多一段「有限清理（設計示意）」
function panel({ work = '挑水（持續）· 第 3 趟', clear = 'idle', target = '', stop = false, note = '', end = '', skill = true, go = true }) {
  const btn = (label, cls = '', hot = '') => `<button class="btn ${cls}" ${hot ? `data-hot="${hot}"` : 'disabled'}>${label}</button>`;
  let body = '';
  if (clear === 'idle') body = `<p class="muted">西院有測試鼠在藥架附近。可由玩家明確發起一次有限清理。</p>${btn('清理鼠群（設計示意）', 'hot', 'start')}`;
  if (clear === 'preview') body = `<p>範圍：竹護欄內西院（虛線）。目標：<b>${target}</b></p><p class="muted">可點畫面上的鼠改選目標。合法出發條件<b>待決</b>：本稿假設「這趟倒完水再出發」。</p>
    <div class="group">${go ? btn('出發清理', 'hot', 'go') : btn('出發清理')}${btn('取消')}</div>`;
  if (clear === 'run') body = `<p>意圖：<b>${target}</b></p>${note ? `<p class="muted">${note}</p>` : ''}<div class="group">${btn('叫停清理', stop ? 'hot warn' : 'warn', stop ? 'stop' : '')}</div>`;
  if (clear === 'end') body = `<p>結束原因：<b>${end}</b></p>${note ? `<p class="muted">${note}</p>` : ''}`;
  return `<h2>林遠 <small>主角 · 起始腳力 Lv 1</small></h2>
    <div class="box"><div class="row"><b>有限清理（設計示意）</b>${skill ? '<span class="chip">掌法：一式基礎掌</span>' : ''}</div>${body}</div>
    <h4>目前工作</h4><p>${work}</p>
    <h4>精力</h4><div class="row"><span>沿生活現值顯示</span><b>62／100</b></div><div class="bar energy"><i style="width:62%"></i></div>
    <p class="muted">清理的精力成本<b>待決</b>，本稿不扣、不算。</p>`;
}

const S = {};
// ---------- 共用開頭（A／B／C 都從這裡出發） ----------
S.life = { s: 'S0', title: '生活中', cam: [860, 500],
  people: [hero(905, 530, 1, null, { frame: 'walkLoaded-1', sel: false }), cousin], rats: ratsAt(),
  tags: [['hero', '主角 Lv 2 · 精力 62', 905, 456], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('sniff', 'sniff', 'sniff'), panel: null,
  hot: { kind: 'at', x: 905, y: 505, label: '點主角', to: 'pick' },
  cap: 'S0 生活：同一個生活入口畫面，兩人照常工作。三隻測試弱鼠在西院藥架附近嗅地，各有編號；鼠3 是警覺鼠。畫面不顯示武技等級。' };
S.pick = { s: 'S1', title: '點主角 → 面板出現發起入口', cam: [860, 500],
  people: [hero(905, 530, 1, null, { frame: 'walkLoaded-1' }), cousin], rats: ratsAt(),
  tags: S.life.tags, card: S.life.card, panel: panel({}),
  hot: { kind: 'btn', id: 'start', label: '點「清理鼠群」' },
  cap: 'S1 發起①：面板沿生活版（精力、目前工作），只多一段「有限清理」。按鈕是玩家明確發起；沒有自動清理、也不會自己出門。' };
S.preview = { s: 'S1', title: '範圍預覽與目標', cam: [860, 500], ground: { range: 'hot' },
  people: [hero(905, 530, 1, null, { frame: 'walkLoaded-1' }), cousin], rats: ratsAt(),
  tags: [...S.life.tags.slice(0, 1), ['rat sel', '鼠1 · 目標', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3], ['place', '有限清理範圍（竹護欄內）', 820, 400]],
  card: S.life.card, panel: panel({ clear: 'preview', target: '鼠1（最近）' }),
  hot: { kind: 'btn', id: 'go', label: '點「出發清理」' },
  cap: 'S1 發起②：虛線＝有限範圍，西界就是竹護欄；預設目標是最近的鼠1。主角肩上還有水：本稿畫成「倒完這趟才出發」，正式的合法出發／交付規則待決。' };

// ---------- A 連續處理 ----------
S.a_go = { s: 'S2', title: '接近鼠1', cam: [880, 510], ground: { range: true, route: [HOME, [930, 522], [888, 528]] },
  people: [walk(930, 522, -1, 1), cousin], rats: ratsAt(),
  tags: [['pill', '清理鼠群 · 前往鼠1', 930, 470], ['rat sel', '鼠1 · 目標', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: S.life.card, panel: panel({ work: '挑水（持續）· 本趟已交付，暫離', clear: 'run', target: '清理鼠群 · 前往鼠1（接近中）', note: '沿固定路線走到站位，不瞬移、不全圖追。走路快慢只看腳力。' }),
  cap: 'S2 接近：倒完水放下扁擔，空手沿路走向鼠1 東側站位（藍點）。腳力只管這段移動；掌法熟練不影響走多快。叫停隨時可按。' };
S.a_wind = { s: 'S3', title: '站定起手', cam: [875, 505, 1.5], ground: { range: true },
  people: [hero(888, 528, -1, 'windup'), cousin], rats: ratsAt(),
  tags: [['pill', '起手 · 鼠1', 888, 462], ['rat sel', '鼠1 · 目標', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: S.life.card, panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '起手 · 鼠1', note: '初學：起手幅度大、重心後坐，站定也要調整（圖中晃動線）。' }),
  cap: 'S3 起手：站定、收掌到腰側。初學起手大而慢；熟練起手小而穩（見分鏡對照）。起手前目標若失效，進入 S4 取消／換目標（路徑 B）。' };
S.a_hit = { s: 'S3', title: '掌接觸', cam: [875, 505, 1.5], ground: { range: true },
  people: [hero(888, 528, -1, 'strike'), cousin], rats: ratsAt('hit'), fx: [{ kind: 'contact', x: 866, y: 520, skill: 'b' }],
  tags: [['pill', '掌 · 示意命中（非權威判效）', 888, 470], ['rat sel', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('hit', 'sniff', 'sniff'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '出掌 · 鼠1', note: '低身下按掌，掌根落在鼠背。這是畫稿：命中距離、接觸時點與一次結果都待下一包定案。' }),
  cap: 'S3 接觸：借採藥蹲姿當低身，手臂與立掌是本稿疊繪。接觸點畫在鼠身上（不是隔空）。初學掌落偏鼠側、衝擊小；熟練落正中、衝擊清楚。' };
S.a_rec = { s: 'S3', title: '收勢 · 鼠1 示意擊倒', cam: [860, 505, 1.4], ground: { range: true },
  people: [hero(888, 528, -1, 'recover'), cousin], rats: ratsAt('down'),
  tags: [['pill', '收勢 · 找下一隻', 888, 466], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat sel', '鼠2 · 下一目標', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('down', 'sniff', 'sniff'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '收勢 · 下一有效目標：鼠2（最近）', note: '弱鼠一掌示意擊倒。HP／傷害／擊倒後去向（昏倒、退走或移除）待決，本稿只畫側躺標記。' }),
  cap: 'S3 收勢：初學收勢踉蹌一步才站穩；熟練收勢直接接轉身。鼠1 側躺＝示意擊倒，不是已驗擊殺。接著自動挑「範圍內最近、仍有效」的鼠2。' };
S.a_turn = { s: 'S4', title: '轉向鼠2', cam: [850, 500], ground: { range: true, route: [[888, 528], [850, 510], [812, 494]] },
  people: [walk(850, 510, -1, 2), cousin], rats: ratsAt('down'), fx: [{ kind: 'turn', x: 888, y: 528 }],
  tags: [['pill', '清理鼠群 · 前往鼠2', 850, 456], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat sel', '鼠2 · 目標', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('down', 'sniff', 'sniff'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '清理鼠群 · 前往鼠2', note: '換目標也要走過去；走路速度與第一段相同（同腳力）。' }),
  cap: 'S4 逐隻轉向：轉身→走到鼠2 東側站位。初學要先站穩再轉（多半拍），熟練收勢就帶轉身。移動那段兩人一樣快。' };
S.a_hit2 = { s: 'S3', title: '鼠2 接觸 · 鼠3 察覺', cam: [790, 485, 1.4], ground: { range: true, sense: [...R3, 100] },
  people: [hero(812, 494, -1, 'strike'), cousin], rats: ratsAt('down', 'hit', 'alert'), fx: [{ kind: 'contact', x: 789, y: 485, skill: 'b' }],
  tags: [['pill', '掌 · 示意命中', 812, 438], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat sel', '鼠2', ...R2], ['rat warn', '鼠3 · 看見同伴遇襲！', ...R3]],
  card: ratCard('down', 'hit', 'alert'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '出掌 · 鼠2' }),
  cap: 'S3 第二掌：鼠2 受掌。鼠3 的紅虛線＝本稿畫的察覺範圍；它看見同伴遇襲，進入「準備逃」。這是警覺鼠的固定設定，不是讀到玩家指令。' };
S.a_flee = { s: 'S4', title: '鼠3 逃出範圍 · 不追', cam: [760, 480], ground: { range: true, flee: [R3, [684, 438], [636, 448], [586, 456]] },
  people: [hero(812, 494, -1, 'recover'), cousin], rats: [rat(1, R1, 'down'), rat(2, R2, 'down'), rat(3, [662, 444], 'flee', -1)],
  tags: [['pill', '收勢 · 範圍內已無有效目標', 812, 432], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat', '鼠2 · 示意擊倒', ...R2], ['rat warn', '鼠3 · 逃出護欄＝出範圍', 652, 446], ['place', '出界不追', 600, 430]],
  card: ratCard('down', 'down', 'flee'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '無有效目標 → 結束', note: '鼠3 鑽過竹護欄離開範圍：不追、不隔空補中，也不算擊殺或遷徙。' }),
  cap: 'S4 逃離：鼠3 沿紅箭頭鑽過竹護欄。出了範圍就不是有效目標；範圍內也沒有別的有效目標，所以本次清理結束。不保證全滅。' };
S.a_end = { s: 'S5', title: '結束 · 返院', cam: [880, 505], ground: { home: [[812, 494], [820, 480], [880, 512], [930, 522], HOME] },
  people: [walk(880, 512, 1, 1), cousin], rats: [rat(1, R1, 'down'), rat(2, R2, 'down')],
  tags: [['pill', '返院 · 回到挑水', 880, 456], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat', '鼠2 · 示意擊倒', ...R2], ['place', '鼠3 已逃出範圍', 600, 430]],
  card: ratCard('down', 'down', 'gone'), panel: panel({ work: '挑水（持續）· 返院中', clear: 'end', end: '範圍內已無有效目標', note: '結果：鼠1、鼠2 示意擊倒；鼠3 逃出範圍（未追）。回院後接續原工作；精確接續與必要恢復待決。' }),
  endCard: { why: '範圍內已無有效目標', rows: ['鼠1 · 示意擊倒', '鼠2 · 示意擊倒', '鼠3 · 逃出範圍（未追）'], next: '返院 → 挑水（持續）' },
  cap: 'S5 結束：綠虛線是回院路線。結束原因明寫在畫面中央小卡與面板；結果只列一次，不重算。測試鼠不自動補滿。' };
S.a_back = { s: 'S0', title: '回到生活', cam: [880, 505],
  people: [hero(...HOME, -1, null, { frame: 'idle-0' }), cousin], rats: [rat(1, R1, 'down'), rat(2, R2, 'down')],
  tags: [['hero', '主角 Lv 2 · 精力 62', HOME[0], HOME[1] - 74], ['rat', '鼠1 · 示意擊倒', ...R1], ['rat', '鼠2 · 示意擊倒', ...R2]],
  card: ratCard('down', 'down', 'gone'), panel: panel({ work: '挑水（持續）· 第 4 趟' }),
  cap: '回生活：主角回院中端點拿起扁擔，接續挑水。擊倒鼠留在原地只是示意，之後如何處理／重設測試鼠待決。' };

// ---------- B 目標先逃 ----------
S.b_pick = { ...S.preview, title: '改選警覺鼠3', cam: [810, 485], tags: [...S.life.tags.slice(0, 1), ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3], ['place', '有限清理範圍（竹護欄內）', 820, 400]],
  panel: panel({ clear: 'preview', target: '鼠1（最近）', go: false }), hot: { kind: 'at', x: R3[0], y: R3[1] - 8, label: '點鼠3 改選目標', to: 'next' },
  cap: 'S1 改選：玩家在範圍預覽裡直接點鼠3，把目標換成警覺鼠。只能選範圍內、看得見的鼠。' };
S.b_conf = { ...S.preview, title: '目標：鼠3', cam: [810, 485], tags: [...S.life.tags.slice(0, 1), ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat sel', '鼠3 · 目標', ...R3], ['place', '有限清理範圍（竹護欄內）', 820, 400]],
  panel: panel({ clear: 'preview', target: '鼠3（警覺）' }), hot: { kind: 'btn', id: 'go', label: '點「出發清理」' },
  cap: 'S1 確認：目標鼠3（警覺）。其他步驟與 A 相同。' };
S.b_go = { s: 'S2', title: '接近鼠3', cam: [800, 480], ground: { range: true, route: [HOME, [930, 522], [880, 512], [820, 480], [782, 452], [738, 432]], sense: [...R3, 50] },
  people: [walk(820, 480, -1, 1), cousin], rats: ratsAt(),
  tags: [['pill', '清理鼠群 · 前往鼠3', 820, 424], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat sel', '鼠3 · 目標', ...R3]],
  card: S.life.card, panel: panel({ work: '挑水（持續）· 本趟已交付，暫離', clear: 'run', target: '清理鼠群 · 前往鼠3（接近中）' }),
  cap: 'S2 接近：沿防守路走向鼠3 東側站位。鼠1、鼠2 是普通鼠，從旁經過不會驚走（本稿設定）。紅虛線＝鼠3 察覺範圍，主角還在外面。' };
S.b_wind = { s: 'S3', title: '起手 · 鼠3 察覺逼近', cam: [740, 445, 1.5], ground: { range: true, sense: [...R3, 50] },
  people: [hero(738, 432, -1, 'windup'), cousin], rats: ratsAt('sniff', 'sniff', 'alert'),
  tags: [['pill', '起手 · 鼠3', 738, 368], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat warn', '鼠3 · 察覺逼近！', ...R3]],
  card: ratCard('sniff', 'sniff', 'alert'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '起手 · 鼠3' }),
  cap: 'S3 起手：主角進到察覺範圍、站定起手。鼠3 看得見逼近，豎耳準備逃——掌還沒出。' };
S.b_miss = { s: 'S4', title: '目標失效 · 收手', cam: [720, 445, 1.4], ground: { range: true, flee: [R3, [684, 438], [640, 446], [596, 452]] },
  people: [hero(738, 432, -1, 'cancel'), cousin], rats: [rat(1, R1), rat(2, R2), rat(3, [668, 442], 'flee', -1)], fx: [{ kind: 'stop', x: 714, y: 426 }],
  tags: [['pill', '收手 · 取消這次接觸', 738, 372], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat warn', '鼠3 · 逃出範圍', 656, 444], ['place', '出界不追', 610, 430]],
  card: ratCard('sniff', 'sniff', 'flee'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '目標失效 → 找下一有效目標', note: '起手後目標失效：取消這次接觸（不出掌、不隔空補中），已花的起手不退、也不另算。' }),
  cap: 'S4 失效：鼠3 在出掌前逃過護欄。原接觸點畫紅 ×：這掌取消。鼠3 出了範圍就不追。接著找範圍內最近的有效目標。' };
S.b_next = { s: 'S4', title: '換目標鼠2', cam: [780, 480], ground: { range: true, route: [[738, 432], [792, 456], [812, 494]] },
  people: [walk(792, 456, 1, 2), cousin], rats: [rat(1, R1), rat(2, R2)], fx: [{ kind: 'turn', x: 738, y: 432 }],
  tags: [['pill', '清理鼠群 · 換目標：鼠2', 792, 398], ['rat', '鼠1', ...R1], ['rat sel', '鼠2 · 新目標', ...R2], ['place', '鼠3 已逃出範圍', 600, 430]],
  card: ratCard('sniff', 'sniff', 'gone'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '換目標 · 前往鼠2', note: '若此時範圍內已沒有有效目標，直接跳到 S5 結束返院。' }),
  cap: 'S4 換目標：轉身繞過觀景石，走到鼠2 東側站位。若範圍內已無有效目標，就不換、直接 S5。' };
S.b_hit = { s: 'S3', title: '鼠2 接觸', cam: [790, 485, 1.5], ground: { range: true },
  people: [hero(812, 494, -1, 'strike'), cousin], rats: [rat(1, R1), rat(2, R2, 'hit')], fx: [{ kind: 'contact', x: 789, y: 485, skill: 'b' }],
  tags: [['pill', '掌 · 示意命中', 812, 438], ['rat', '鼠1', ...R1], ['rat sel', '鼠2', ...R2]],
  card: ratCard('sniff', 'hit', 'gone'), panel: panel({ work: '挑水（持續）· 暫離', clear: 'run', target: '出掌 · 鼠2' }),
  cap: 'S3 接觸：同 A 的第二掌（同站位、同姿勢）。之後鼠1（普通鼠）照 A 的步驟處理（略）。' };
S.b_end = { ...S.a_end, title: '結束 · 返院（後段同 A）', rats: [rat(1, R1, 'down'), rat(2, R2, 'down')],
  panel: panel({ work: '挑水（持續）· 返院中', clear: 'end', end: '範圍內已無有效目標', note: '結果：鼠3 逃出範圍（未追）；鼠2、鼠1 示意擊倒（鼠1 那段同 A，略）。' }),
  endCard: { why: '範圍內已無有效目標', rows: ['鼠3 · 起手前逃出範圍（未追）', '鼠2 · 示意擊倒', '鼠1 · 示意擊倒（同 A，略）'], next: '返院 → 挑水（持續）' },
  cap: 'S5 結束：B 的重點是「接觸前失效 → 取消 → 換有效目標」。後段處理鼠1 與 A 相同，這裡直接畫結束。' };

// ---------- C 玩家叫停 ----------
S.c_go = { ...S.a_go, title: '接近中 → 玩家叫停', hot: { kind: 'btn', id: 'stop', label: '點「叫停清理」' },
  panel: panel({ work: '挑水（持續）· 本趟已交付，暫離', clear: 'run', target: '清理鼠群 · 前往鼠1（接近中）', stop: true }),
  cap: 'S2 接近途中，玩家按「叫停清理」。叫停入口一直在面板上（390px 時在底部面板最上方）。' };
S.c_stop = { s: 'S5', title: '叫停生效', cam: [880, 510], ground: { range: true, route: [[930, 522], [888, 528]] },
  people: [hero(924, 523, 1, null, { frame: 'herbWalk-0' }), cousin], rats: ratsAt(), fx: [{ kind: 'stop', x: 888, y: 528 }],
  tags: [['pill', '叫停 · 本次清理取消（未出手）', 924, 468], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('sniff', 'sniff', 'sniff'), panel: panel({ work: '挑水（持續）· 返院中', clear: 'end', end: '玩家叫停（接近途中，未出手）', note: '接近途中叫停：當場轉身返院，不補做。起手後才叫停何時生效（收勢後才停／立即收手）待決，本稿不定。' }),
  cap: 'S5 叫停：主角當場轉身，原站位畫紅 ×。還沒出手，所以沒有任何結果要結算；已發生的結果（若有）也不會重算。' };
S.c_end = { ...S.a_end, title: '返院', ground: { home: [[924, 523], [940, 518], HOME] }, people: [walk(940, 518, 1, 1), cousin], rats: ratsAt(),
  tags: [['pill', '返院 · 回到挑水', 940, 462], ['rat', '鼠1', ...R1], ['rat', '鼠2', ...R2], ['rat', '鼠3 · 警覺', ...R3]],
  card: ratCard('sniff', 'sniff', 'sniff'), panel: panel({ work: '挑水（持續）· 返院中', clear: 'end', end: '玩家叫停', note: '三隻鼠都還在：不自動補滿，也不會因叫停而消失。' }),
  endCard: { why: '玩家叫停（未出手）', rows: ['鼠1、鼠2、鼠3 · 都還在範圍內'], next: '返院 → 挑水（持續）' },
  cap: 'S5 返院：沿綠虛線回院中端點。結束原因「玩家叫停」，與 A／B 的「無有效目標」分開寫。' };
S.c_back = { ...S.a_back, rats: ratsAt(), tags: S.life.tags.map((t) => t[0] === 'hero' ? ['hero', '主角 Lv 2 · 精力 62', HOME[0], HOME[1] - 74] : t), card: ratCard('sniff', 'sniff', 'sniff'),
  cap: '回生活：接續挑水。玩家之後可以再發起一次清理；測試鼠重設方式待決。' };

export const STATES = S;
export const PATHS = {
  A: { name: 'A 連續處理', steps: ['life', 'pick', 'preview', 'a_go', 'a_wind', 'a_hit', 'a_rec', 'a_turn', 'a_hit2', 'a_flee', 'a_end', 'a_back'] },
  B: { name: 'B 目標先逃', steps: ['life', 'pick', 'b_pick', 'b_conf', 'b_go', 'b_wind', 'b_miss', 'b_next', 'b_hit', 'b_end', 'a_back'] },
  C: { name: 'C 玩家叫停', steps: ['life', 'pick', 'preview', 'c_go', 'c_stop', 'c_end', 'c_back'] },
};
