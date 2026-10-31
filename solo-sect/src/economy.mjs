import { DAY, EXP, SEASONS, SEASON_DAYS, BREAK } from './data.mjs';
import { log, resAdd, pillNote } from './util.mjs';
import { FENCE, lvOf } from './threat.mjs';
// ==== （原 economy.mjs）====
// v1.85 錢有出口（ROADMAP I-1／I-8／A10，擁有人預設）：月俸＋建築維護、山下市集、丹藥販售與陳化、下山義學。
// 規則全在下面幾張表；sim.mjs 在換日時呼叫 econDaily(s, H)，H＝{ rand, cancelTask, think, removeDisciple }。

// 月俸：內門／首徒每 5 日領俸，外門半份；總額 c·N^exp（比人數長得快）但封頂。寬限：第 graceDay 日起才開始結算。
export const UPKEEP = { every: 5, graceDay: 10, wageC: 9, exp: 1.5, cap: 400, w: { head: 1.5, inner: 1, outer: 0.25 },
  facPer: 6, facHigh: { alchemy: 2, shrine: 2 }, facCap: 160, warnMax: 2, leaveMax: 1 };
export const salaried = (s) => s.ds.filter((d) => d.id !== 'hero' && d.adult !== false && UPKEEP.w[d.role]);
export const wageN = (s) => salaried(s).reduce((a, d) => a + UPKEEP.w[d.role], 0);
export const wageBill = (s) => Math.min(UPKEEP.cap, Math.round(UPKEEP.wageC * wageN(s) ** UPKEEP.exp));
export const facBill = (s) => Math.min(UPKEEP.facCap, Object.entries(s.fac || {}).reduce((a, [k, f]) => a + (f.stage || 0) * UPKEEP.facPer * (UPKEEP.facHigh[k] || 1), 0));
export const econInit = () => ({ warn: 0, left: 0, misses: 0, paid: 0, disrepair: false, lastBill: null, market: { cycle: -1, sold: {} }, school: null, schoolN: 0, pool: [] });
export const E = (s) => (s.econ ??= econInit());
export const billDue = (s, day = s.day) => day >= Math.max(UPKEEP.graceDay, E(s).graceUntil || 0) && day % UPKEEP.every === 0;
export function settle(s, H) {
  const X = E(s), w = wageBill(s), f = facBill(s);
  if (s.paypill) while (w && s.res.coin < w && !marketWhy(s, 'pill')) marketDo(s, 'pill'); /* loop71 欠俸先賣丹：月俸不夠時先把療傷丹賣給藥舖（照市價、受每期上限），不用亂數 */
  X.lastBill = { day: s.day, wage: w, fac: f, paidW: false, paidF: false };
  if (w && s.res.coin >= w) { resAdd(s, 'coin', -w); X.lastBill.paidW = true; X.warn = 0; X.paid++; log(s, `【月俸】發給 ${salaried(s).length} 人共 ${w} 香火錢。`); }
  else if (w) { X.warn++; X.misses++; for (const d of salaried(s)) H.think(s, d, 'unpaid');
    if (X.warn <= UPKEEP.warnMax) log(s, `【欠俸 ${X.warn}/${UPKEEP.warnMax}】月俸 ${w} 發不出來（只有 ${s.res.coin}）。${X.warn === UPKEEP.warnMax ? '再欠一次就會有人下山。' : '下次結算前想辦法：賣丹、少蓋、去市集變現。'}`, 'warn');
    else { const d = X.left < UPKEEP.leaveMax && leaver(s); X.warn = 0; if (d) { X.left++; log(s, `【離山】${d.name}三次領不到月俸，收拾包袱下山了。`, 'warn'); H.removeDisciple(s, d, '欠俸離山'); } } }
  if (f && s.res.coin >= f) { resAdd(s, 'coin', -f); X.lastBill.paidF = true; if (X.disrepair) log(s, '【維護】欠的修繕補上了，建築恢復。'); X.disrepair = false; }
  else if (f) { if (!X.disrepair) log(s, `【失修】付不出建築維護 ${f}，各處失修（全派心情受影響），付清就恢復。`, 'warn'); X.disrepair = true; }
}
const leaver = (s) => salaried(s).filter((d) => !d.xia && !d.classic && d.role !== 'head').sort((a, b) => (a.mood ?? 50) - (b.mood ?? 50))[0] || null;

// 山下市集：每 5 日補貨，限量，同一期每買一次價格 ×rise；療傷丹可賣，每賣一顆價 ×fall
export const MARKET = { every: 5, stock: { herb: 12, weapon: 2 }, price: { herb: 5, weapon: 80 }, rise: 1.25, pill: { price: 14, fall: 0.85, max: 6 }, weaponMul: 1.08 };
export const cycleOf = (s) => Math.floor(((s.day || 1) - 1) / MARKET.every);
export function market(s) { const X = E(s), M = X.market, c = cycleOf(s); if (M.cycle !== c) { M.cycle = c; M.sold = {}; } return M; }
export const priceOf = (s, k) => (k === 'pill' ? Math.floor(MARKET.pill.price * MARKET.pill.fall ** (market(s).sold.pill || 0)) : Math.ceil(MARKET.price[k] * MARKET.rise ** (market(s).sold[k] || 0)));
export const left = (s, k) => (k === 'pill' ? MARKET.pill.max : MARKET.stock[k]) - (market(s).sold[k] || 0);
const armable = (s) => s.ds.filter((d) => d.role !== 'laborer' && d.adult !== false && !d.weapon).sort((a, b) => (b.best || 0) - (a.best || 0) || (a.id === 'hero' ? -1 : 1))[0];
export function marketWhy(s, k) {
  if (left(s, k) <= 0) return '這期賣完了，等下次補貨';
  if (k === 'pill') return (s.res.pill || 0) > 0 ? null : '沒有療傷丹可賣';
  if (k === 'weapon' && !armable(s)) return '人人都有兵器了';
  return (s.res.coin || 0) >= priceOf(s, k) ? null : `錢不夠（要 ${priceOf(s, k)}）`;
}
export function marketDo(s, k) {
  const why = marketWhy(s, k); if (why) return { ok: false, why }; const p = priceOf(s, k), M = market(s);
  if (k === 'pill') { resAdd(s, 'pill', -1); pillNote(s, 'sold', 1); resAdd(s, 'coin', p); M.sold.pill = (M.sold.pill || 0) + 1; log(s, `山下藥舖收了一顆療傷丹，得 ${p} 香火錢。`); return { ok: true, p }; }
  resAdd(s, 'coin', -p); M.sold[k] = (M.sold[k] || 0) + 1;
  if (k === 'herb') { resAdd(s, 'herb', 3); log(s, `在山下市集買了 3 份靈草，花 ${p}。`); }
  else { const d = armable(s); d.weapon = true; d.powMul = (d.powMul || 1) * MARKET.weaponMul; log(s, `在山下市集替${d.name}買了一把兵器（招式威力 ×${MARKET.weaponMul}），花 ${p}。`); }
  return { ok: true, p };
}
// 丹藥陳化：存丹超過 keep，每 5 日少 10%（至少 1 顆）
export const PILL_AGE = { keep: 10, every: 5, rate: 0.1 };
export function agePills(s) { const n = s.res.pill || 0; if (n <= PILL_AGE.keep || s.day % PILL_AGE.every) return 0; const lost = Math.max(1, Math.floor(n * PILL_AGE.rate)); resAdd(s, 'pill', -lost); pillNote(s, 'aged', lost); log(s, `丹房存丹太多，${lost} 顆療傷丹受潮失效。`); return lost; }

// A10 下山義學：派一名弟子下山一天，帶回一位想入門的年輕人（不看名聲，仍要床位與糧）；費用遞增
export const SCHOOL = { cost: 20, rise: 1.2, dur: DAY, poolMax: 2 };
const NAMES = ['王小虎', '李二丫', '趙大牛', '孫小蓮', '周木生', '吳青竹', '鄭鐵柱', '馮秋菊', '陳石根', '褚雲兒', '衛長生', '蔣小魚', '沈阿福', '韓春桃', '楊小滿', '朱大川'];
const STYLES = ['palm', 'leg'];
export const schoolCost = (s) => Math.ceil(SCHOOL.cost * SCHOOL.rise ** E(s).schoolN);
const goer = (s) => s.ds.filter((d) => d.id !== 'hero' && d.adult !== false && !d.away && d.role !== 'laborer' && !d.xia && d.hp > 60).sort((a, b) => (b.skills?.social || 0) - (a.skills?.social || 0) || (a.role === 'outer') - (b.role === 'outer'))[0];
export function schoolWhy(s) { const X = E(s); if (X.school) return `${s.ds.find((d) => d.id === X.school.who)?.name || '有人'}正在山下義學`; if (X.pool.length >= SCHOOL.poolMax) return '帶回來的人還沒收完'; if (!goer(s)) return '沒有人能下山'; if ((s.res.coin || 0) < schoolCost(s)) return `錢不夠（要 ${schoolCost(s)}）`; return null; }
export function startSchool(s, H) {
  const why = schoolWhy(s); if (why) return { ok: false, why }; const d = goer(s), c = schoolCost(s), X = E(s);
  resAdd(s, 'coin', -c); H.cancelTask(s, d, '下山義學'); d.order = null; d.away = true; d.path = []; d.reason = '下山義學'; X.school = { who: d.id, until: s.t + SCHOOL.dur }; X.schoolN++;
  log(s, `${d.name}帶著 ${c} 香火錢下山開義學，看看有沒有好苗子。`); return { ok: true, d };
}
export function schoolStep(s, H) {
  const X = E(s), T = X.school; if (!T || s.t < T.until) return; X.school = null; const d = s.ds.find((x) => x.id === T.who);
  if (d) { d.away = false; d.task = null; d.path = []; d.at = 'gate'; d.pos = [...(H.gate || d.pos || [0, 0])]; d.reason = '義學歸來'; }
  const n = X.schoolN, r = () => H.rand(s), st = STYLES[Math.floor(r() * 2)], k = (a, b) => a + Math.floor(r() * (b - a + 1));
  const c = { id: `sch${n}`, name: NAMES[(n - 1) % NAMES.length] + (n > NAMES.length ? Math.ceil(n / NAMES.length) : ''), adult: true, sprite: r() < 0.5 ? 'hero' : 'senior', style: st, school: true,
    skills: { leg: k(2, 7), palm: k(2, 7), strength: k(4, 12), farming: k(3, 10), herbal: k(2, 10), agility: k(5, 11), cooking: k(2, 10) }, traits: {}, personality: [['diligent', 'honest', 'brave', 'gentle', 'sociable'][Math.floor(r() * 5)]] };
  X.pool.push(c); log(s, `${d?.name || '下山的弟子'}從山下義學帶回${c.name}，想拜入門下（不看名聲，有床位就能收）。`);
}
export function econDaily(s, H) { if (billDue(s)) settle(s, H); if (E(s).disrepair) for (const d of salaried(s)) d.mood = Math.max(0, (d.mood ?? 50) - 3); agePills(s); market(s); }

// 面板：結算預告、欠俸警告、市集、義學（main.mjs 放在「每日收支」下面）
/* loop70：缺口與「再收一人」後的月俸，只用玩家看得到的錢與人數。 */
export function payHint(s, w = wageBill(s), f = facBill(s)) {
  const c = s.res?.coin || 0, gap = w + f - c, n1 = Math.min(UPKEEP.cap, Math.round(UPKEEP.wageC * (wageN(s) + UPKEEP.w.outer) ** UPKEEP.exp));
  return `<div class="k" data-payhint>${gap > 0 ? `還差 ${gap} 才付得清` : `付得清，結算後約剩 ${c - w - f}`}｜再收一名外門，月俸約 ${n1}</div>`;
}
export function econHtml(s) {
  const X = E(s), nd = s.day < UPKEEP.graceDay ? UPKEEP.graceDay : Math.ceil((s.day + 1) / UPKEEP.every) * UPKEEP.every, w = wageBill(s), f = facBill(s);
  const btn = (k, label) => { const why = marketWhy(s, k); return `<button data-mkt="${k}" ${why ? 'disabled' : ''} title="${why || ''}">${label}（${priceOf(s, k)}，剩 ${Math.max(0, left(s, k))}）</button>`; };
  const sw = schoolWhy(s);
  return `<div class="econ" data-econ><div class="k">月俸與維護：第 ${nd} 日結算 月俸 ${w}（${salaried(s).length} 人）＋維護 ${f}${s.day < UPKEEP.graceDay ? `（開山寬限到第 ${UPKEEP.graceDay} 日）` : ''}</div>`
    + (X.warn ? `<div class="k warn" data-warn="${X.warn}" style="color:#b33">⚠ 欠俸 ${X.warn}/${UPKEEP.warnMax}：再發不出就有人下山（最多走 ${UPKEEP.leaveMax} 人）</div>` : '')
    + (s.jhui ? payHint(s, w, f) : '') /* loop70：月俸缺口提示（隨江湖面板開關，純顯示） */
    + (X.disrepair ? `<div class="k warn" style="color:#b33">⚠ 建築失修：付清維護就恢復</div>` : '')
    + `<div class="row">山下市集：${btn('herb', '買靈草×3')}${btn('weapon', '買兵器')}${btn('pill', '賣療傷丹')}</div>`
    + `<div class="row"><button data-school ${sw ? 'disabled' : ''} title="${sw || ''}">下山義學（${schoolCost(s)} 香火錢，1 日）</button> <span class="k">${sw || `帶回的人：${X.pool.map((c) => c.name).join('、') || '—'}`}</span></div></div>`;
}

// ==== （原 labor.mjs）====
/* loop127 勞作練體 `laborgrow`（docs/DAXIA-EVAL.md §3）。d.lg 由 sim 依 s.laborgrow 設定；沒有 d.lg 時全部回傳中性值。
   借鏡：大俠立志傳臂力靠採集、敏捷每日有上限；RimWorld 技能每日軟上限後只拿 20%。 */
export const LABOR = { per: 400, powDiv: 10, cap: 3, over: 0.2, acts: ['chop', 'quarry', 'water', 'build', 'repair'] };
export const strMul = (d) => (d?.lg ? 1 + Math.max(0, d.skills?.strength || 0) / LABOR.per : 1); // 招式傷害倍率
export const laborPow = (d) => (d?.lg ? Math.max(0, d.skills?.strength || 0) / LABOR.powDiv : 0); // 門派戰力加項
export const isWorkAct = (act) => LABOR.acts.includes(act);
// 做活長的力氣：當日累計超過 cap 後只拿 over。回傳實際可加的量（delta ≥ 0）。
export function workStrCap(d, day, delta) {
  if (!d?.lg || !(delta > 0)) return delta; if (d.lgDay !== day) { d.lgDay = day; d.lgGot = 0; }
  const room = Math.max(0, LABOR.cap - d.lgGot), eff = Math.min(delta, room) + Math.max(0, delta - room) * LABOR.over; d.lgGot += eff; return eff;
}
export const laborToday = (d, day) => (d?.lg && d.lgDay === day ? d.lgGot || 0 : 0);

// ==== （原 steward.mjs）====
// loop30 執事自主（選用，s.steward）：每日一次，沒有工地時依序立藍圖——
// ① 有人睡地鋪 → 擴寢舍；② 野豬來過且尚無哨崗 → 蓋護山哨（有人上哨，野豬下山會被嚇回）。
export const STEW = { boarSeen: 1, yardAt: 4 };
export function stewardDaily(s, H) {
  if (!s.steward || H.siteOf(s)) return null;
  const pick = s.ds.length > H.capacity(s) ? 'dorm' : (s.stew?.boar || 0) >= STEW.boarSeen && (s.fac.watch?.stage || 0) === 0 ? 'watch' : s.stewkit && s.ds.length >= 8 && (s.fac.kitchen?.stage || 0) === 0 && (s.res.food || 0) < s.ds.length ? 'kitchen' : s.stewyard && s.ds.length >= STEW.yardAt && (s.fac.yard?.stage || 0) === 0 ? 'yard' : null; /* loop95「執事立樁」（s.stewyard）：外功場還是空地、人數夠 → 立木樁場（打樁不做離線補算，弟子照常自主去練） */ /* loop60「執事顧灶」（s.stewkit）：人多存飯不夠一人一頓、還是露天灶 → 蓋膳房 */
  if (pick && H.startBuild(s, pick) !== false) { (s.stew ??= {}).built = [...(s.stew.built || []), pick]; log(s, `【執事】${pick === 'dorm' ? '有人睡地鋪，執事立了擴建寢舍的藍圖' : pick === 'kitchen' ? '人多灶小，常常開飯不夠，執事立了膳房的藍圖' : pick === 'yard' ? '外功場還是一片空地，執事立了木樁場的藍圖，好讓大家打樁切磋' : '野豬屢屢下山，執事立了護山哨的藍圖'}。`); return pick; }
  return null;
}
export const stewBoar = (s) => { if (s.steward) (s.stew ??= {}).boar = (s.stew.boar || 0) + 1; };

// ==== （原 peace.mjs）====
// loop9 M9 遠征帶來太平＋防禦經濟收尾。只在 s.m9 開啟時生效（golden 不變）。
// ① 巡山掃清山腳或林邊（既有 peaceOf 條件）→ 山賊下次來犯延後；② 派隊偏好練功搭子；③ 柵缺料時弟子主動砍柴／採石。
export const PEACE = {
  banditDelay: 2,     // 太平時山賊來犯再延後幾天
  mateK: 2, mateCap: 10, // 派隊：每次同修 +2 分，上限 10（既有默契分同量級）
  demandMul: 1.3,     // 缺料時砍柴／採石意願
  damagedAt: 0.8,    // 柵耐久低於八成才為修補備料
  repairCalm: 0.7,   // loop10：柵還有四成以上時，修柵意願減半（降低練功代價）
  repairCalmAt: 0.4,
  demandExtra: 4,     // 料少於「底線＋這麼多」就算缺
};
const MAT_ACT = { wood: 'chop', stone: 'quarry' };
export const peaceful = (s) => ['foot', 'wood'].some((id) => (s.records?.qing?.[id] || 0) >= EXP.peaceQing);
export const peaceDelay = (s) => (s.m9 && peaceful(s) ? PEACE.banditDelay : 0);
export function mateBonus(s, a, b) { if (!s.m9 || !a || !b) return 0; return Math.min(PEACE.mateCap, ((a.mates?.[b.id] || 0) + (b.mates?.[a.id] || 0)) * PEACE.mateK); }
// 柵需要什麼料：修補用料；木柵且石不夠升級 → 也要石
export function fenceNeeds(s) {
  const F = s.fence; if (!s.m9 || !F) return [];
  const need = [], L = lvOf(F), lim = FENCE.floor + PEACE.demandExtra;
  if ((s.res[L.mat] || 0) < lim && F.hp < F.max * PEACE.damagedAt) need.push(L.mat);
  const up = FENCE.levels[(F.lv || 1) + 1]; if (up?.cost) for (const [m, c] of Object.entries(up.cost)) if ((s.res[m] || 0) < c && !need.includes(m)) need.push(m);
  return need;
}
export function demandBoost(s, d, out) {
  const need = fenceNeeds(s); if (!need.length) return;
  for (const m of need) for (const o of out) if (o.act === MAT_ACT[m]) { o.score *= PEACE.demandMul; o.why = `柵要用${m === 'wood' ? '木料' : '石料'}，倉裡不夠了`; }
}
// loop10：柵還撐得住時不急著修
export function repairDamp(s, out) {
  const F = s.fence; if (!s.m9 || !F || F.hp < F.max * PEACE.repairCalmAt) return;
  for (const o of out) if (o.act === 'repair') o.score *= PEACE.repairCalm;
}

// ==== （原 season.mjs）====
// 季節（v0.7）：一日 600 秒不變，每季 SEASON_DAYS 日
export function seasonOf(s) { const day = Math.floor(s.t / DAY); const i = Math.floor(day / SEASON_DAYS) % SEASONS.length; return { ...SEASONS[i], i, year: Math.floor(day / (SEASON_DAYS * SEASONS.length)) + 1, dayOf: (day % SEASON_DAYS) + 1 }; }
/* loop73：季節說明（純顯示）：本季剩幾日、心情與飯量的季節修正、下一季是什麼 */
export function seasonHint(s) {
  const se = seasonOf(s), left = SEASON_DAYS - se.dayOf + 1, nx = SEASONS[(se.i + 1) % SEASONS.length], fx = [];
  if (se.mood) fx.push(`心情 ${se.mood > 0 ? '+' : ''}${se.mood}`); if (se.hunger !== 1) fx.push(`飯量 ×${se.hunger}`); if (se.grow !== 1) fx.push(`作物生長時間 ×${se.grow}`);
  return `${se.name}季還有 ${left} 日${fx.length ? `（${fx.join('、')}）` : ''}，之後是${nx.name}`;
}

// ==== （原 lift.mjs）====
// loop28 心情自救（選用，s.lift）：心情低於衝關門檻（沿用 BREAK.moodMin，不改門檻）時，
// 依最缺的需求抬高對應活動：悶→閒坐看雲、寂寞→聊天、累→歇息。
export const LIFT = { k: 1.6, need: 50, map: { fun: 'leisure', social: 'chat', energy: 'rest' } };
export function liftBoost(s, d, out) {
  if (!s.lift || d.mood >= BREAK.moodMin) return; const n = d.needs;
  const low = Object.keys(LIFT.map).filter((k) => (n[k] ?? 100) < LIFT.need).sort((a, b) => (n[a] ?? 100) - (n[b] ?? 100));
  for (const k of low) { const o = out.find((x) => x.act === LIFT.map[k]); if (o) { o.score *= LIFT.k; o.why = `心情低落，${o.why}`; o.lift = true; return; } }
}
