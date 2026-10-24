// SG-LIFE-01 手動存讀（生活開發版 demo 專用）。自己的 localStorage key，不讀不寫舊 RT（sect-chronicle-save-v1*）或 viewer 資料。
// 只有玩家按「存檔／讀檔」才動：沒有自動讀、自動存、雲端、離線收益或舊版遷移。
// 讀檔流程：解析 → 版本與相容識別 → 結構 → 數值 → 資源／任務一致性，全部通過才交給 model.restore 整份替換；任何一步失敗都不動目前這局。
import { JOBS, DRINK_MODES, WATER_Q, BOAR_MODE, RAT_MODE } from './model.mjs';
import { RATS, SKILLS } from './palm.mjs';

export const SAVE_KEY = 'earth-ascension:life01-demo:save';
export const SAVE_VERSION = 1;
export const COMPAT_ID = 'sg-life-01/water-carry-demo';
export const LOG_KEEP = 200;

const MODES = new Set(['idle', 'carry', 'toSeat', 'seated', 'back', 'toFun', 'fun', 'fromFun',
  'toGuard', 'guardWait', 'shout', 'fromGuard', 'toFix', 'fix', 'fromFix', 'toRat', 'windup', 'recover', 'fromRat', ...DRINK_MODES]);
const WALK = new Set(['toSeat', 'back', 'toFun', 'fromFun', 'toGuard', 'fromGuard', 'toFix', 'fix', 'fromFix', 'shout', 'windup', 'recover', ...DRINK_MODES]);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
// 形狀比對時，這些欄位依模式而變，只查型別是物件或 null，內容另由數值檢查負責。
const LOOSE = new Set(['motion', 'leg', 'clean', 'last', 'want', 'upWant', 'suppress', 'upSuppress', 'tried', 'autoNote', 'upNote', 'cleanNote',
  'guardResult', 'fixResult', 'cleanResult', 'lastTrip', 'why', 'need', 'target', 'end', 'phase', 'job', 'pending', 'rest', 'fix', 'fixSrc', 'fixOpp',
  'guardOrder', 'guardSrc', 'drinkNote', 'fixBy']);

export class SaveError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (code, msg) => { throw new SaveError(code, msg); };

// 兩份物件要有完全相同的欄位、相同型別；只有新局模板本身就是 null 或列在 LOOSE 的可空欄位才接受 null，
// 模板中必須存在的物件／字串／數字（例如 shadow、boar、pos）被改成 null 一律拒絕。陣列長度與元素形狀也要相同（log 除外）。
function sameShape(tpl, c, path) {
  if (!isObj(c)) bad('structure', `${path} 不是物件`);
  const a = Object.keys(tpl).sort(), b = Object.keys(c).sort();
  if (a.join() !== b.join()) bad('structure', `${path} 欄位不符（缺：${a.filter((k) => !(k in c)).join('、') || '無'}；多：${b.filter((k) => !(k in tpl)).join('、') || '無'}）`);
  for (const k of a) {
    const t = tpl[k], v = c[k], p = `${path}.${k}`;
    if (k === 'log') { if (!Array.isArray(v)) bad('structure', `${p} 不是陣列`); continue; }
    if (LOOSE.has(k) || t === null) { if (typeof v === 'function' || v === undefined) bad('structure', `${p} 型別錯誤`); continue; }
    if (Array.isArray(t)) {
      if (!Array.isArray(v) || v.length !== t.length) bad('structure', `${p} 陣列長度不符`);
      t.forEach((x, i) => (isObj(x) ? sameShape(x, v[i], `${p}[${i}]`) : typeof v[i] !== typeof x && bad('structure', `${p}[${i}] 型別錯誤`)));
    } else if (isObj(t)) sameShape(t, v, p);
    else if (typeof v !== typeof t) bad('structure', `${p} 型別錯誤（要 ${typeof t}）`);
  }
}

// 進行中路徑的必要結構（review 5635905946）：motion 在形狀比對列 LOOSE，這裡依 mode 驗後續 tick 會讀的欄位，
// 包括清鼠分段行走的 from／to、queue 與每個路點、步數，以及起手／收勢鎖定的目標。同一個小驗證涵蓋所有可變路段。
const isPt = (q) => isObj(q) && num(q.x) && num(q.y);
const PATH = {
  toRat: ['from', 'to', 'queue'], fromRat: ['from', 'to', 'queue'],
  windup: ['target'], recover: ['target'],
};
function checkPath(h, at) {
  const need = PATH[h.mode];
  if (!need) return;
  if (!isInt(h.need) || h.need < 1 || !isInt(h.steps) || h.steps < 0 || h.steps > h.need) bad('value', `${at} 步數不合法`);
  for (const k of need) {
    if (k === 'target') { if (!RATS.some((r) => r.id === h.target)) bad('value', `${at}.target 不是已知測試鼠`); continue; }
    if (k === 'queue') { if (!Array.isArray(h.queue) || !h.queue.every(isPt)) bad('value', `${at}.queue 路點不合法`); continue; }
    if (!isPt(h[k])) bad('value', `${at}.${k} 座標不合法`);
  }
  if (h.hold !== undefined && !isInt(h.hold)) bad('value', `${at}.hold 不合法`);
}

function checkValues(st, model) {
  const r = model.rules, E = r.energy, D = r.drink, ids = Object.keys(model.state.people);
  const range = (v, lo, hi, p, int = false) => { if (!num(v) || v < lo || v > hi || (int && !isInt(v))) bad('value', `${p} 超出範圍（${lo}–${hi}）`); };
  range(st.tick, 0, Number.MAX_SAFE_INTEGER, 'tick', true);
  range(st.vat, 0, r.vatCapacity, 'vat', true);
  range(st.herbs, 0, r.herbCapacity, 'herbs', true);
  range(st.inFlight, 0, r.vatCapacity, 'inFlight', true);
  range(st.herbInFlight, 0, r.herbCapacity, 'herbInFlight', true);
  range(st.nextPerson, 0, ids.length - 1, 'nextPerson', true);
  if (st.log.length > LOG_KEEP) bad('value', `log 超過 ${LOG_KEEP} 筆`);
  let carryW = 0, carryH = 0;
  for (const id of ids) {
    const p = st.people[id], h = p.motion, at = `people.${id}`;
    if (p.id !== id) bad('value', `${at}.id 不符`);
    range(p.level, 1, r.maxLevel, `${at}.level`, true);
    range(p.energy, 0, E.max, `${at}.energy`);
    if (D) range(p.waterQ, 0, D.max * WATER_Q, `${at}.waterQ`, true);
    if (!JOBS[p.job]) bad('value', `${at}.job 不是已知工作`);
    if (p.pending != null && p.pending !== 'rest' && !JOBS[p.pending]) bad('value', `${at}.pending 不合法`);
    if (![null, 'auto', 'manual'].includes(p.rest)) bad('value', `${at}.rest 不合法`);
    if (!isObj(h) || !MODES.has(h.mode)) bad('value', `${at}.motion.mode 不是已知模式`);
    range(h.tripLevel, 1, r.maxLevel, `${at}.motion.tripLevel`, true);
    if (h.mode === 'carry') {
      if (!JOBS[h.job] || !isInt(h.phase) || h.phase < 0 || h.phase > 3 || !Array.isArray(h.need) || h.need.length !== 4 || !h.need.every((n) => isInt(n) && n >= 1)) bad('value', `${at} 挑擔狀態不完整`);
      range(h.steps, 0, h.need[h.phase] - 1, `${at}.motion.steps`, true);
      if (h.job === 'herb') carryH += 1; else carryW += 1;
    } else if (WALK.has(h.mode)) {
      if (!isInt(h.need) || h.need < 1) bad('value', `${at}.motion.need 不合法`);
      range(h.steps, 0, h.need, `${at}.motion.steps`, true);
      if (DRINK_MODES.includes(h.mode) && !['home', 'seat'].includes(h.from)) bad('value', `${at} 喝水出發點不合法`);
      if (h.mode === 'fromDrink' && !(num(h.span) && h.span > 0 && h.span <= 1)) bad('value', `${at} 喝水返回比例不合法`);
    } else if (!isInt(h.steps) || h.steps < 0) bad('value', `${at}.motion.steps 不合法`);
    checkPath(h, `${at}.motion`);
    for (const j of Object.keys(JOBS)) range(p.done[j], 0, Number.MAX_SAFE_INTEGER, `${at}.done.${j}`, true);
    range(p.trips, 0, Number.MAX_SAFE_INTEGER, `${at}.trips`, true);
    if (p.fix != null && !['wait', 'go'].includes(p.fix)) bad('value', `${at}.fix 不合法`);
    // 規則定義的人物 enum／範圍：掌法、反應快慢、面向、成長經驗與初始等級。
    if (!Object.hasOwn(SKILLS, p.palm)) bad('value', `${at}.palm 不是已知掌法`);
    for (const k of ['react', 'upReact']) if (!['early', 'late'].includes(p[k])) bad('value', `${at}.${k} 不合法`);
    if (p.cface !== -1 && p.cface !== 1) bad('value', `${at}.cface 不合法`);
    range(p.initialLevel, 1, r.maxLevel, `${at}.initialLevel`, true);
    range(p.xp, 0, p.level < r.maxLevel ? r.tripsToNext[p.level - 1] - 1 : Math.max(...r.tripsToNext), `${at}.xp`, true);
    range(p.walked, 0, Number.MAX_VALUE, `${at}.walked`);
  }
  for (const k of ['useMs', 'contact', 'upUsed']) range(st[k], 0, Number.MAX_SAFE_INTEGER, k, true);
  // 資源／任務一致：在途預約＝正在挑擔的人數；實存＋在途不超過容量；唯一名額指向真的持有者。
  if (st.inFlight !== carryW || st.herbInFlight !== carryH) bad('consistency', '在途預約與正在挑擔的人數不符');
  if (st.vat + st.inFlight > r.vatCapacity || st.herbs + st.herbInFlight > r.herbCapacity) bad('consistency', '實存＋在途超過容量');
  const fixers = ids.filter((id) => st.people[id].fix);
  if (fixers.length > 1 || (st.fixBy ?? null) !== (fixers[0] ?? null)) bad('consistency', '護欄整理名額與持有者不符');
  if (st.clean != null && (!isObj(st.clean) || !ids.includes(st.clean.by))) bad('consistency', '清理名額指向不存在的人');
  for (const id of ids) {
    const m = st.people[id].motion.mode;
    if (['toRat', 'windup', 'recover', 'fromRat'].includes(m) && (!st.clean || st.clean.by !== id)) bad('consistency', `${id} 在清理卻沒有清理名額`);
    if (['toFix', 'fix'].includes(m) && st.fixBy !== id && st.people[id].fix) bad('consistency', `${id} 整理名額不符`);
  }
  // 野豬／鼠／影子：已知 enum 與基本範圍，避免未知狀態值寫進目前這局。
  const b = st.boar;
  if (!Object.hasOwn(BOAR_MODE, b.mode)) bad('value', `boar.mode 不是已知狀態：${JSON.stringify(b.mode)}`);
  range(b.marks, 0, r.boar.maxMarks, 'boar.marks', true);
  for (const k of ['steps', 'need', 'visit', 'hits']) range(b[k], 0, Number.MAX_SAFE_INTEGER, `boar.${k}`, true);
  for (const k of ['e', 't', 'd']) range(b[k], 0, Number.MAX_VALUE, `boar.${k}`);
  if (b.leg != null && !isObj(b.leg)) bad('value', 'boar.leg 型別錯誤');
  st.rats.forEach((rt, i) => {
    if (!Object.hasOwn(RAT_MODE, rt.mode)) bad('value', `rats[${i}].mode 不是已知狀態`);
    if (rt.id !== RATS[i].id || rt.kind !== RATS[i].kind) bad('value', `rats[${i}] 身份不符（id／種類須與本試玩固定名單相同）`);
    range(rt.exit, 0, Number.MAX_SAFE_INTEGER, `rats[${i}].exit`, true);
    if (!num(rt.x) || !num(rt.y)) bad('value', `rats[${i}] 位置不合法`);
  });
  const sh = st.shadow;
  if (sh.job != null && !JOBS[sh.job]) bad('value', 'shadow.job 不是已知工作');
  if (sh.active && (!JOBS[sh.job] || !Array.isArray(sh.need) || sh.need.length !== 4 || !sh.need.every((n) => isInt(n) && n >= 1)
    || !isInt(sh.phase) || sh.phase < 0 || sh.phase > 3)) bad('value', 'shadow 進行中狀態不完整');
  if (sh.active) range(sh.steps, 0, sh.need[sh.phase], 'shadow.steps', true);
  for (const id of ids) { const q = st.people[id].pos; if (!num(q.x) || !num(q.y)) bad('value', `people.${id}.pos 不合法`); }
}

// 序列化目前這局：版本、相容識別、幾何長度（不同路線長度的檔不能套用）與完整權威狀態。
export function makeSave(model, savedAt = new Date().toISOString()) {
  return { saveVersion: SAVE_VERSION, compat: COMPAT_ID, savedAt, geometry: geometryOf(model), state: model.exportState(LOG_KEEP) };
}
const geometryOf = (model) => JSON.parse(JSON.stringify(model.lengths));

// 驗證候選檔（字串或物件）；成功回傳可交給 restore 的狀態，失敗丟 SaveError。不碰 model 狀態。
export function validateSave(raw, model, template) {
  let env = raw;
  if (typeof raw === 'string') { try { env = JSON.parse(raw); } catch { bad('parse', '存檔不是有效的 JSON'); } }
  if (!isObj(env)) bad('structure', '存檔不是物件');
  if (env.saveVersion !== SAVE_VERSION) bad('version', `不認得的存檔版本：${JSON.stringify(env.saveVersion)}（只接受 ${SAVE_VERSION}）`);
  if (env.compat !== COMPAT_ID) bad('compat', '這不是本試玩頁的存檔');
  if (JSON.stringify(env.geometry) !== JSON.stringify(geometryOf(model))) bad('compat', '路線長度與目前試玩頁不同，不能套用');
  sameShape(template, env.state, 'state');
  if (JSON.stringify(Object.keys(env.state.people)) !== JSON.stringify(Object.keys(template.people))) bad('structure', '人物名單不符');
  checkValues(env.state, model);
  return env.state;
}

// 讀檔：候選完全通過才整份替換；回傳 { ok, text }。
export function loadInto(model, raw, template) {
  try {
    const st = validateSave(raw, model, template);
    // 上面的 schema／enum／範圍／ID 驗證才是主防線；這裡只是保險：套候選後讀一次 view 並試跑一步再讀 view，
    // 任何例外都先還原原局再拒絕；成功則重新整份套用候選（試跑的那一步不保留）。
    const live = model.exportState(Infinity);
    try { model.restore(st); model.view(); model.step(); model.view(); } catch (e) { model.restore(live); bad('structure', `存檔內容無法運行（${e.message}）`); }
    model.restore(st);
    return { ok: true, text: `已讀檔（第 ${(st.tick / 60).toFixed(1)} 遊戲秒）；已暫停` };
  } catch (e) {
    if (e instanceof SaveError) return { ok: false, code: e.code, text: `讀檔失敗：${e.message}；目前這局不變` };
    throw e;
  }
}

// 瀏覽器存讀（storage 可注入假物件）。寫入失敗（額度等）不刪舊檔：localStorage.setItem 失敗時舊值保留。
export function saveTo(storage, model) {
  if (!storage) return { ok: false, code: 'unavailable', text: '此瀏覽器不能使用本地保存' };
  const text = JSON.stringify(makeSave(model));
  try { storage.setItem(SAVE_KEY, text); } catch (e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, code: quota ? 'quota' : 'write', text: quota ? '存檔失敗：瀏覽器儲存空間不足；舊存檔保留不變' : '存檔失敗：瀏覽器拒絕寫入；舊存檔保留不變' };
  }
  return { ok: true, text: `已存檔（第 ${(model.state.tick / 60).toFixed(1)} 遊戲秒，紀錄保留最近 ${LOG_KEEP} 筆）`, bytes: text.length };
}
export function loadFrom(storage, model, template) {
  if (!storage) return { ok: false, code: 'unavailable', text: '此瀏覽器不能使用本地保存' };
  let raw = null;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { ok: false, code: 'read', text: '讀檔失敗：瀏覽器拒絕讀取；目前這局不變' }; }
  if (raw == null) return { ok: false, code: 'none', text: '還沒有存檔' };
  return loadInto(model, raw, template);
}
