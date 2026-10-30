// H6：從已儲存的荒居檔，白名單轉出一份新的本篇存檔；不修改任何來源狀態。
import { loadHomestead,AUTONOMY_VERSION } from './homestead.mjs';
import { FACILITIES, TRAITS } from './data.mjs';
import { createState, save, load, tick } from './sim.mjs';

export const TRANSFER_KEY = 'solo-sect.homestead-transfer.v1';
export const TRANSFER_KEYS = [TRANSFER_KEY, TRANSFER_KEY + '.2'];
export const slotKey = (slot) => TRANSFER_KEYS[Number(slot) - 1] || null;
const SOURCE_KEY = 'solo-sect.homestead.v1';
const mainLoad = (candidate) => load(save(candidate));
const fail = (error) => ({ ok: false, error });

export function previewTransfer(raw) {
  const source = loadHomestead(raw);
  if (!source.ok) return fail(`荒居存檔無法讀取：${source.error}`);
  const h = source.state;
  if (!h.person.name.trim() || !/^[\p{L}\p{N} _·-]{1,12}$/u.test(h.person.name)) return fail('主角名字不合法；請改用文字、數字或空格。');
  if (!h.fac.hut.stage) return fail('請先建好小屋再接回本篇。');
  if (Object.values(h.fac).some((f) => f.site)) return fail('尚有未完工藍圖；請先完成施工再預演。');
  if (h.person.carry || h.helper?.carry) return fail('仍有物資在途；請先讓人物把背包送回住處。');
  if (h.helper?.leaving) return fail('幫手正在回村；請等她離開再預演。');
  if (h.person.herbalSkill > 10000 || (h.helper?.herbalSkill ?? 0) > 10000) return fail('識藥熟練超出本篇轉接上限 10000。');

  const originalVersion = JSON.parse(raw).version;
  const apprentice = h.visitor.role === 'apprentice' && !!h.helper && !h.helper.leaving;
  const s = createState(1);
  const hero = s.ds.find((d) => d.id === 'hero');
  const helper = s.ds.find((d) => d.id === 'senior');
  s.ds = [hero]; s.rel = {}; s.aff = {}; // 預設師姐、堂弟不在這條起源中；不得留下孤兒關係。
  hero.name = h.person.name;
  hero.personality = [h.person.personality]; hero.known = [...hero.personality];
  hero.traits = h.person.personality === 'diligent' ? { diligent: 1.2 } : {};
  hero.skills.herbal = h.person.herbalSkill;
  hero.needs.hunger = h.person.hunger; hero.needs.energy = h.person.energy;
  if (apprentice) {
    helper.id = 'homestead-apprentice'; helper.name = h.visitor.name;
    helper.role = 'outer'; helper.personality = []; helper.known = []; helper.traits = {};
    helper.root = 3; helper.rootKnown = false; helper.style = 'palm';
    helper.skills = { ...hero.skills, palm: 1, leg: 1, strength: 5, farming: 5, herbal: h.helper.herbalSkill, agility: 5, cooking: 3 };
    helper.needs.hunger = h.helper.hunger; helper.needs.energy = h.helper.energy;
    helper.reason = '從荒居同行，初入外門'; helper.portrait = null;
    s.ds.push(helper);
  }
  s.fac.dorm.stage = 1; // 住處可見；大廳仍依本篇新局是「破道館」。
  s.cap.wood = h.fac.store.stage ? 20 : 12;
  s.res.wood = h.stock.wood;
  s.res.food = h.stock.berries + h.stock.meal;
  s.res.veg = h.stock.veg;
  s.res.herb = h.stock.herbs;
  if (s.res.wood > s.cap.wood || s.res.food > 100 || s.res.veg > 100 || s.res.herb > 100) return fail('資源超出本篇接收上限；請先在荒居消耗或儲存。');
  s.homesteadOrigin = { version: originalVersion, day: h.day, hutStage: h.fac.hut.stage, garden: !!h.fac.garden.stage, herbGarden: !!h.fac.herbGarden.stage, kitchen: !!h.fac.kitchen.stage, store: !!h.fac.store.stage, apprentice, receipt: raw };
  s.log = [{ t: 0, msg: `${hero.name}${apprentice ? '與阿蓮' : ''}從荒居來到破道館；舊日小屋折作小寢舍。` }];
  const validated = mainLoad(s);
  if (!validated.ok) return fail(`本篇無法讀取候選檔：${validated.err}`);
  const carried = [
    `主角 ${hero.name}，性情 ${{ quiet: '喜靜', sociable: '好交往', diligent: '勤勞' }[h.person.personality]}，識藥 ${hero.skills.herbal}，飢餓／精力 ${Math.round(hero.needs.hunger)}／${Math.round(hero.needs.energy)}`,
    apprentice ? `已同意的學徒 ${helper.name}，外門，識藥 ${helper.skills.herbal}，飢餓／精力 ${Math.round(helper.needs.hunger)}／${Math.round(helper.needs.energy)}` : '沒有帶入學徒；訪客或短住幫手不等於已收徒',
    `小屋 stage ${h.fac.hut.stage} → 小寢舍 stage 1；大廳為破道館 stage 0`,
    `庫存：木 ${s.res.wood}、糧 ${s.res.food}（野果 ${h.stock.berries}＋熱飯 ${h.stock.meal}）、菜 ${s.res.veg}、藥 ${s.res.herb}`,
    `${h.fac.garden.stage ? '已建菜園；' : '未建菜園；'}本篇新局預設可作業的荒地菜畦。${h.fac.kitchen.stage ? '已建露天灶；' : '未建露天灶；'}本篇新局預設露天灶。${h.fac.herbGarden.stage ? '已建藥田折作野藥圃；' : '未建藥田；本篇新局預設野藥圃；'}木容量 ${s.cap.wood}`,
  ];
  const dropped = [
    '小家名稱與屋舍配色不成為本篇家園屬性；原荒居保留，轉接來源收據仍含原始資料。',
    '種子、田間生長、未完成工作、荒居遊戲天數、關係與信任、工作與休閒紀錄不帶入。木作台、改良灶具的燉菜能力、木床／舒適床、屋前長凳與庭院花叢也不帶入；只留在原荒居家園；四項新生活技能與短期感受也不帶入，本篇識藥沿既有映射。',
    `蔬果拌食 ${h.stock.salad||0}份、家常燉菜 ${h.stock.stew||0}份不折成基本熱飯或本篇糧；完整保留在原荒居。`,
    `${h.fac.hut.stage === 2 ? '修繕小屋休息率 9' : '簡陋木屋休息率 6'} → 本篇小寢舍休息率 8。${h.fac.herbGarden.stage ? '藥田栽種能力不保留；' : '荒居尚無藥田；'}本篇野藥圃僅可野採。`,
    '武學、根骨與其他技能採本篇新局值；阿蓮個性於荒居未定義，本篇保持未知。',
  ];
  return { ok: true, raw, candidate: save(s), carried, dropped, sourceVersion: originalVersion, apprentice, receipt: raw };
}

// Single-key writes only: verify bytes, restore previous bytes on failure.
export function writeVerified(store, key, value, expected = null) {
  try { if (store.getItem(key) !== expected) return fail('存檔已變更，請重新讀取。'); }
  catch { return fail('無法讀取本機存檔。'); }
  try { store.setItem(key, value); if (store.getItem(key) !== value) throw new Error('回讀不符'); }
  catch {
    try {
      if (expected === null) store.removeItem(key); else store.setItem(key, expected);
      if (store.getItem(key) !== expected) throw new Error('還原不符');
    } catch { return { ...fail('寫入失敗，還原結果不明；請保留回復檔。'), recovery: expected ?? value }; }
    return fail('新槽寫入失敗；原存檔未改動。');
  }
  return { ok: true, key };
}
export function validateTransferSave(raw) {
  try {
    const r = load(raw);
    if (!r.ok || !r.state.homesteadOrigin || ![1, 2, 3,AUTONOMY_VERSION].includes(r.state.homesteadOrigin.version)) return fail('不是荒居轉接備份。');
    const s = r.state;
    const o = s.homesteadOrigin;
    if(o.version===AUTONOMY_VERSION&&typeof o.receipt!=='string')return fail('自主模式來源必須保留來源收據。');
    if (s.ds?.some(d => ['senior', 'cousin'].includes(d.id)) || (s.t === 0 && !!s.ds?.some(d => d.id === 'homestead-apprentice') !== o.apprentice)) return fail('備份人物與荒居起源不符。');
    if (o.receipt !== undefined) {
      const origin = previewTransfer(o.receipt); if (!origin.ok) return fail('備份來源紀錄不合法。');
      const expected = JSON.parse(origin.candidate);
      if ((s.t === 0 && s.ds?.find(d => d.id === 'hero')?.name !== expected.ds[0].name) || ['version','day','hutStage','garden','herbGarden','kitchen','store','apprentice'].some(k => o[k] !== expected.homesteadOrigin[k])) return fail('備份與來源紀錄不符。');
    }
    if (![1, 2].includes(o.hutStage) || !Number.isInteger(o.day) || o.day < 1 || typeof o.apprentice !== 'boolean') return fail('備份起源資料不合法。');
    if (Object.values(s.res || {}).some(v => !Number.isFinite(v) || v < 0) || FACILITIES.some(f => !Number.isInteger(s.fac?.[f.id]?.stage) || !f.stages[s.fac[f.id].stage])) return fail('備份資源或設施不合法。');
    if (!Number.isFinite(s.t) || !s.res || !s.fac || !Array.isArray(s.log) || !s.ds.length || s.ds.length > 100 || !s.ds.some(d => d.id === 'hero') || new Set(s.ds.map(d => d.id)).size !== s.ds.length) return fail('備份狀態不完整。');
    for (const d of s.ds) if (!/^[\w-]+$/.test(d.id) || Object.values(d.needs || {}).some(v => !Number.isFinite(v) || v < 0 || v > 100) || Object.values(d.skills || {}).some(v => !Number.isFinite(v) || v < 0) || d.personality?.some(p => !TRAITS[p]) || !d.name?.trim() || !/^[\p{L}\p{N} _·-]{1,24}$/u.test(d.name) || !d.needs || !d.skills || !Array.isArray(d.personality) || !Array.isArray(d.path)) return fail('備份人物資料不合法。');
    if (s.log.some(x => typeof x.msg !== 'string' || /[<>]/.test(x.msg))) return fail('備份紀事不合法。');
    tick(structuredClone(s)); // Exercise the real consumer before importing.
    return { ok: true, state: s };
  } catch { return fail('備份損毀或版本不支援。'); }
}
export function transferSlots(store) {
  return TRANSFER_KEYS.map((key, i) => { const raw = store.getItem(key); const r = raw === null ? null : validateTransferSave(raw); return { key, slot: i + 1, raw, valid: !!r?.ok, name: r?.state?.ds[0]?.name || (raw === null ? '空槽' : '無法讀取，保留原檔') }; });
}
export function commitTransfer(store, preview, { allowLegacy = false } = {}) {
  if (!preview?.ok) return fail('請先完成有效預演。');
  let slots;
  try {
    if (store.getItem(SOURCE_KEY) !== preview.raw) return fail('荒居存檔在預演後變更；請重新預演。');
    slots = transferSlots(store);
  } catch { return fail('無法讀取本機存檔；未轉接。'); }
  const legacyCandidate = JSON.parse(preview.candidate); delete legacyCandidate.homesteadOrigin.receipt;
  const unknown = slots.filter(x => x.valid && !validateTransferSave(x.raw).state.homesteadOrigin.receipt);
  if (unknown.some(x => JSON.stringify(JSON.parse(x.raw)) === JSON.stringify(legacyCandidate))) return fail('已有這份荒居來源的舊 H6 轉接檔。');
  if (unknown.length && !allowLegacy) return fail('舊 H6 檔來源無法辨識，請確認另開的是不同來源。');
  if (slots.some(x => x.valid && validateTransferSave(x.raw).state.homesteadOrigin.receipt === preview.raw)) return fail('已有這份荒居來源的轉接檔。');
  const target = slots.find(x => x.raw === null);
  if (!target) return fail('兩個轉接槽已有存檔；請先匯出備份，保留現有資料。');
  const check = previewTransfer(preview.raw);
  if (!check.ok || check.candidate !== preview.candidate) return fail('候選檔驗證失敗；請重新預演。');
  return { ...writeVerified(store, target.key, preview.candidate), slot: target.slot };
}
export function exportTransferBackup(raw) {
  const r = validateTransferSave(raw);
  if (!r.ok) return r;
  return { ok: true, bytes: JSON.stringify({ kind: 'homestead-main-backup', version: 1, save: raw }) };
}
export function importTransferBackup(store, bytes) {
  try {
    const b = JSON.parse(bytes);
    if (b.kind !== 'homestead-main-backup' || b.version !== 1 || typeof b.save !== 'string') return fail('備份封套版本不支援。');
    const r = validateTransferSave(b.save); if (!r.ok) return r;
    const slots = transferSlots(store);
    if (slots.some(x => x.raw === b.save || (x.valid && r.state.homesteadOrigin.receipt && validateTransferSave(x.raw).state.homesteadOrigin.receipt === r.state.homesteadOrigin.receipt))) return fail('已有相同來源的備份；未重複匯入。');
    const target = slots.find(x => x.raw === null); if (!target) return fail('兩個轉接槽已滿；沒有覆寫。');
    return { ...writeVerified(store, target.key, b.save), slot: target.slot };
  } catch { return fail('備份讀取失敗；未改存檔。'); }
}
