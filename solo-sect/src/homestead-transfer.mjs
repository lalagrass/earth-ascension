// H6：從已儲存的荒居檔，白名單轉出一份新的本篇存檔；不修改任何來源狀態。
import { loadHomestead } from './homestead.mjs';
import { createState, save, load } from './sim.mjs';

export const TRANSFER_KEY = 'solo-sect.homestead-transfer.v1';
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
  s.homesteadOrigin = { version: originalVersion, day: h.day, hutStage: h.fac.hut.stage, garden: !!h.fac.garden.stage, herbGarden: !!h.fac.herbGarden.stage, kitchen: !!h.fac.kitchen.stage, store: !!h.fac.store.stage, apprentice };
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
    '種子、田間生長、未完成工作、荒居遊戲天數、關係與信任、工作與休閒紀錄不帶入。',
    `${h.fac.hut.stage === 2 ? '修繕小屋休息率 9' : '簡陋木屋休息率 6'} → 本篇小寢舍休息率 8。${h.fac.herbGarden.stage ? '藥田栽種能力不保留；' : '荒居尚無藥田；'}本篇野藥圃僅可野採。`,
    '武學、根骨與其他技能採本篇新局值；阿蓮個性於荒居未定義，本篇保持未知。',
  ];
  return { ok: true, raw, candidate: save(s), carried, dropped, sourceVersion: originalVersion, apprentice };
}

export function commitTransfer(store, preview) {
  if (!preview?.ok) return fail('請先完成有效預演。');
  let source, occupied;
  try { source = store.getItem(SOURCE_KEY); occupied = store.getItem(TRANSFER_KEY); }
  catch { return fail('無法讀取本機存檔；未轉接。'); }
  if (source !== preview.raw) return fail('荒居存檔在預演後變更；請重新預演。');
  if (occupied !== null) return fail('已有荒居轉接的新本篇檔；請先到本篇讀取。');
  const check = previewTransfer(source);
  if (!check.ok || check.candidate !== preview.candidate || !load(preview.candidate).ok) return fail('候選檔驗證失敗；請重新預演。');
  try {
    store.setItem(TRANSFER_KEY, preview.candidate);
    if (store.getItem(TRANSFER_KEY) !== preview.candidate) throw new Error('回讀不符');
  } catch {
    try { store.removeItem(TRANSFER_KEY); }
    catch { return fail('寫入失敗，且新槽清理結果不明；請檢查本機存檔。'); }
    return fail('新槽寫入失敗；原存檔未改動。');
  }
  return { ok: true, key: TRANSFER_KEY };
}
