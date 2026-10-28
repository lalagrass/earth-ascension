// 荒居：獨立生活狀態。設施階段宣告可提供的活動，任務只讀此登錄表。
export const SAVE_KEY = 'solo-sect.homestead.v1';
export const VERSION = 1;
export const DAY = 240;
export const HOME = [445, 345];
export const PLACES = { berries: [155, 340], wood: [730, 250], hut: [440, 225], garden: [270, 170], kitchen: [605, 365], store: [555, 470] };
export const FACILITIES = {
  hut: { label: '住處', stages: [
    { name: '空地', offers: ['rest'], rest: 3 },
    { name: '簡陋木屋', offers: ['rest'], rest: 6, cost: { wood: 5 }, work: 15 },
    { name: '修繕小屋', offers: ['rest'], rest: 9, cost: { wood: 7 }, work: 20 },
  ] },
  garden: { label: '菜園', stages: [
    { name: '荒地', offers: [] }, { name: '小菜園', offers: ['farm'], cost: { wood: 2 }, work: 8 },
  ] },
  kitchen: { label: '灶', stages: [
    { name: '冷灶地', offers: [] }, { name: '露天灶', offers: ['cook'], cost: { wood: 3 }, work: 10 },
  ] },
  store: { label: '儲物處', stages: [
    { name: '露天物堆', offers: [] }, { name: '儲物棚', offers: [], cost: { wood: 4 }, work: 10 },
  ] },
  berries: { label: '野果叢', stages: [{ name: '野果叢', offers: ['forage'] }] },
  wood: { label: '林緣枯木', stages: [{ name: '林緣枯木', offers: ['chop'] }] },
};
export const ACTIONS = {
  forage: { name: '採野果', place: 'berries', duration: 6, energy: 5 },
  chop: { name: '砍柴', place: 'wood', duration: 7, energy: 7 },
  eat: { name: '吃東西', place: 'home', duration: 2 },
  rest: { name: '歇息', place: 'hut' },
  build: { name: '造屋', place: 'hut' },
  leisure: { name: '閒坐看雲', place: 'home', duration: 8 },
  farm: { name: '照料菜園', place: 'garden', duration: 7, energy: 5 },
  cook: { name: '煮飯', place: 'kitchen', duration: 8, energy: 4 },
};
const clamp = (x) => Math.max(0, Math.min(100, x));
const pos = (place) => place === 'home' ? HOME : PLACES[place];
const stage = (s, id) => FACILITIES[id].stages[s.fac[id].stage];
export const offers = (s, id, act) => !!stage(s, id)?.offers.includes(act);
const note = (s, msg) => { s.log.unshift({ day: s.day, msg }); s.log.length = Math.min(s.log.length, 80); };

export function createHomestead({ name = '無名', personality = 'quiet' } = {}) {
  const s = { kind: 'homestead', version: VERSION, t: 0, day: 1, speed: 1,
    person: { name: String(name).trim().slice(0, 12) || '無名', personality: ['quiet', 'sociable', 'diligent'].includes(personality) ? personality : 'quiet', pos: [...HOME], hunger: 65, energy: 68, task: null, order: null, carry: null, work: 0, leisure: 0 },
    stock: { berries: 0, wood: 0, seeds: 2, veg: 0, meal: 0 }, cap: { berries: 8, wood: 8, seeds: 5, veg: 8, meal: 8 }, wild: { berries: 4, wood: 4 },
    fac: { hut: { stage: 0, site: null }, garden: { stage: 0, site: null }, kitchen: { stage: 0, site: null }, store: { stage: 0, site: null }, berries: { stage: 0 }, wood: { stage: 0 } }, plot: { state: 'empty', growth: 0 }, log: [] };
  note(s, `${s.person.name}來到荒地。先找吃的，再搭一間能安睡的木屋。`); return s;
}

export function startBlueprint(s, id) {
  const f = FACILITIES[id], st = s.fac[id], next = f?.stages[st?.stage + 1];
  if (!next || st.site || (id !== 'hut' && s.fac.hut.stage === 0)) return false;
  st.site = { need: { ...next.cost }, delivered: Object.fromEntries(Object.keys(next.cost).map((k) => [k, 0])), reserved: Object.fromEntries(Object.keys(next.cost).map((k) => [k, 0])), work: 0, workNeed: next.work };
  note(s, `立下「${next.name}」藍圖。`); return true;
}

export function cancelTask(s) {
  const p = s.person, t = p.task;
  if (t?.act === 'build' && t.phase === 'deliver' && p.carry?.origin === 'site') {
    const site = s.fac[t.place]?.site;
    if (site) site.reserved[p.carry.kind] -= p.carry.amount;
    p.carry.origin = 'wild';
  }
  p.task = null;
}
export function setOrder(s, act) {
  if (act !== null && !ACTIONS[act]) return false;
  if (s.person.order === act) return true;
  cancelTask(s); s.person.order = act; return true;
}

function canDo(s, act) {
  if (act === 'forage') return s.wild.berries >= 1 && offers(s, 'berries', 'forage') && s.stock.berries < s.cap.berries;
  if (act === 'chop') return s.wild.wood >= 1 && offers(s, 'wood', 'chop') && s.stock.wood < s.cap.wood;
  if (act === 'eat') return s.stock.berries + s.stock.meal >= 1 && s.person.hunger < 95;
  if (act === 'build') return Object.values(s.fac).some((st) => { const v = st.site; return !!v && (Object.keys(v.need).some((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0) || Object.keys(v.need).every((k) => v.delivered[k] >= v.need[k])); });
  if (act === 'farm') return offers(s, 'garden', 'farm') && (s.plot.state === 'ripe' && s.stock.veg <= s.cap.veg - 2 || s.plot.state === 'empty' && s.stock.seeds > 0);
  if (act === 'cook') return offers(s, 'kitchen', 'cook') && s.stock.veg >= 2 && s.stock.wood >= 1 && s.stock.meal <= s.cap.meal - 3;
  return act === 'rest' || act === 'leisure';
}
function pick(s) {
  const p = s.person;
  if (p.carry) return 'return';
  if (p.hunger < 38 && canDo(s, 'eat')) return 'eat';
  if (p.hunger < 38 && canDo(s, 'forage')) return 'forage';
  if (p.energy < 23) return 'rest';
  if (p.order && canDo(s, p.order)) return p.order;
  if (p.hunger < 56 && canDo(s, 'forage')) return 'forage';
  if (canDo(s, 'build')) return 'build';
  if (Object.values(s.fac).some((st) => st.site && st.site.delivered.wood + st.site.reserved.wood < st.site.need.wood) && canDo(s, 'chop')) return 'chop';
  if (s.stock.berries < 2 && canDo(s, 'forage')) return 'forage';
  if (s.fac.hut.stage === 0 && s.stock.wood < 5 && canDo(s, 'chop')) return 'chop';
  if (s.fac.kitchen.stage > 0 && s.stock.veg >= 2 && s.stock.wood < 2 && canDo(s, 'chop')) return 'chop';
  if (canDo(s, 'cook') && s.stock.meal < 4) return 'cook';
  if (canDo(s, 'farm') && (s.stock.veg < 4 || s.plot.state === 'ripe')) return 'farm';
  if (p.energy < 65) return 'rest';
  if (p.personality === 'diligent' && s.stock.wood < s.cap.wood && canDo(s, 'chop')) return 'chop';
  if (p.personality === 'sociable' && p.leisure % 2 === 0 && s.fac.kitchen.stage && canDo(s, 'cook')) return 'cook';
  return 'leisure';
}
function begin(s, act) {
  const p = s.person;
  if (act === 'return') { p.task = { act, phase: 'go', place: 'home', timer: 0 }; return; }
  const place = ACTIONS[act].place;
  if (act === 'build') {
    const target = Object.keys(s.fac).find((id) => { const v = s.fac[id].site; return v && (Object.keys(v.need).some((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0) || Object.keys(v.need).every((k) => v.delivered[k] >= v.need[k])); });
    if (!target) return;
    const v = s.fac[target].site;
    const mat = Object.keys(v.need).find((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0);
    if (mat) { p.task = { act, phase: 'fetch', place: target, mat, timer: 0 }; return; }
    p.task = { act, phase: 'go', place: target, timer: 0 }; return;
  }
  p.task = { act, phase: 'go', place, timer: 0 };
}
function travel(p, target, dt) {
  const dx = target[0] - p.pos[0], dy = target[1] - p.pos[1], len = Math.hypot(dx, dy);
  if (len <= 75 * dt) { p.pos = [...target]; return true; }
  p.pos[0] += dx / len * 75 * dt; p.pos[1] += dy / len * 75 * dt; return false;
}
function complete(s, t) {
  const p = s.person;
  if (t.act === 'forage' || t.act === 'chop') {
    const k = t.act === 'forage' ? 'berries' : 'wood';
    if (s.wild[k] >= 1) { s.wild[k] -= 1; p.carry = { kind: k, amount: 1, origin: 'wild', bonus: k === 'berries' && s.stock.seeds === 0 ? { seeds: 1 } : undefined }; p.energy = clamp(p.energy - ACTIONS[t.act].energy); p.work++; note(s, k === 'berries' ? '採到野果，帶回住處。' : '砍得一根木料，帶回住處。'); }
    p.task = null; return;
  }
  if (t.act === 'eat') { if (s.stock.meal > 0) { s.stock.meal--; p.hunger = clamp(p.hunger + 52); note(s, '吃了一份熱飯。'); } else if (s.stock.berries > 0) { s.stock.berries--; p.hunger = clamp(p.hunger + 26); note(s, '吃了野果。'); } }
  if (t.act === 'leisure') { p.leisure++; p.energy = clamp(p.energy + 5); }
  if (t.act === 'farm') {
    if (s.plot.state === 'empty' && s.stock.seeds > 0) { s.stock.seeds--; s.plot.state = 'growing'; s.plot.growth = 0; note(s, '在小菜園播下種子。'); }
    else if (s.plot.state === 'ripe' && s.stock.veg <= s.cap.veg - 2) { s.plot.state = 'empty'; p.carry = { kind: 'veg', amount: 2, origin: 'wild', bonus: { seeds: 2 } }; note(s, '收下青菜與種子，帶回住處。'); }
  }
  if (t.act === 'cook' && canDo(s, 'cook')) { s.stock.veg -= 2; s.stock.wood--; s.stock.meal += 3; note(s, '用兩份菜與一根柴煮出三份熱飯。'); }
  if (t.act === 'farm' || t.act === 'cook') { p.energy = clamp(p.energy - ACTIONS[t.act].energy); p.work++; }
  p.task = null;
}
export function tickHomestead(s, dt = 0.25) {
  if (!(dt > 0 && dt <= 1)) throw new Error('bad dt');
  s.t += dt; const oldDay = s.day; s.day = 1 + Math.floor(s.t / DAY);
  if (s.day !== oldDay) note(s, `第 ${s.day} 日。`);
  s.wild.berries = Math.min(4, s.wild.berries + dt / 18);
  s.wild.wood = Math.min(4, s.wild.wood + dt / 28);
  if (s.plot.state === 'growing') { s.plot.growth += dt; if (s.plot.growth >= 34) { s.plot.state = 'ripe'; note(s, '小菜園的菜熟了。'); } }
  const p = s.person; p.hunger = clamp(p.hunger - 0.14 * dt);
  if (!p.task) begin(s, pick(s));
  const t = p.task;
  if (t.phase === 'fetch') {
    if (travel(p, HOME, dt)) {
      const v = s.fac[t.place].site;
      if (!v || s.stock[t.mat] <= 0 || v.delivered[t.mat] + v.reserved[t.mat] >= v.need[t.mat]) { p.task = null; return; }
      s.stock[t.mat]--; v.reserved[t.mat]++; p.carry = { kind: t.mat, amount: 1, origin: 'site' }; t.phase = 'deliver';
    }
    return;
  }
  if (t.phase === 'deliver') {
    if (travel(p, pos(t.place), dt)) {
      const v = s.fac[t.place]?.site, c = p.carry;
      if (v && c) { v.reserved[c.kind]--; v.delivered[c.kind] += c.amount; p.carry = null; note(s, `木料搬到${FACILITIES[t.place].label}工地。`); }
      p.task = null;
    }
    return;
  }
  if (t.phase === 'go') { if (travel(p, pos(t.place), dt)) { t.phase = 'do'; t.timer = 0; } else return; }
  if (t.act === 'return') {
    const c = p.carry;
    if (c) { s.stock[c.kind] += c.amount; for (const [k, v] of Object.entries(c.bonus || {})) s.stock[k] = Math.min(s.cap[k], s.stock[k] + v); p.carry = null; note(s, '把身上的物資放回住處。'); }
    p.task = null; return;
  }
  if (t.act === 'rest') {
    p.energy = clamp(p.energy + stage(s, 'hut').rest * dt);
    if (p.energy >= (p.order === 'rest' ? 100 : 85)) p.task = null;
    return;
  }
  if (t.act === 'build') {
    const v = s.fac[t.place]?.site;
    if (!v || Object.keys(v.need).some((k) => v.delivered[k] < v.need[k])) { p.task = null; return; }
    v.work += dt; p.energy = clamp(p.energy - 0.5 * dt); p.work += dt / 7;
    if (v.work >= v.workNeed) { s.fac[t.place].stage++; s.fac[t.place].site = null; if (t.place === 'store') s.cap = { berries: 20, wood: 20, seeds: 10, veg: 16, meal: 15 }; note(s, `完工：${stage(s, t.place).name}。`); p.task = null; }
    return;
  }
  t.timer += dt;
  if (t.timer >= ACTIONS[t.act].duration) complete(s, t);
}

export function saveHomestead(s) { return JSON.stringify(s); }
export function loadHomestead(json) {
  try {
    const s = JSON.parse(json);
    if (s?.kind !== 'homestead' || s.version !== VERSION || !s.person || !s.stock || !s.cap || !s.fac?.hut || !s.wild || !Array.isArray(s.log)) return { ok: false, error: '不是支援的荒居存檔' };
    // H1 檔沒有 H2 的地塊與資源，補上後繼續原本的生活，不碰本篇存檔。
    const h2 = createHomestead();
    for (const k of ['seeds', 'veg', 'meal']) s.stock[k] ??= h2.stock[k];
    for (const k of ['seeds', 'veg', 'meal']) s.cap[k] ??= h2.cap[k];
    for (const k of ['garden', 'kitchen', 'store']) s.fac[k] ??= h2.fac[k];
    s.plot ??= h2.plot;
    const p = s.person, t = p.task, c = p.carry;
    if (!Number.isFinite(s.t) || s.t < 0 || s.day !== 1 + Math.floor(s.t / DAY) || !Array.isArray(p.pos) || p.pos.length !== 2 || p.pos.some((x) => !Number.isFinite(x)) || !Number.isFinite(p.hunger) || p.hunger < 0 || p.hunger > 100 || !Number.isFinite(p.energy) || p.energy < 0 || p.energy > 100 || typeof p.name !== 'string' || !['quiet', 'sociable', 'diligent'].includes(p.personality)) return { ok: false, error: '存檔狀態不合法' };
    if (['berries', 'wood', 'seeds', 'veg', 'meal'].some((k) => !Number.isInteger(s.stock[k]) || s.stock[k] < 0 || !Number.isInteger(s.cap[k]) || s.cap[k] < 1 || s.stock[k] > s.cap[k]) || ![0, 1, 2].includes(s.fac.hut.stage) || ['garden', 'kitchen', 'store'].some((k) => ![0, 1].includes(s.fac[k].stage)) || !['empty', 'growing', 'ripe'].includes(s.plot.state) || !Number.isFinite(s.plot.growth)) return { ok: false, error: '存檔資源不合法' };
    if (['berries', 'wood'].some((k) => !Number.isFinite(s.wild[k]) || s.wild[k] < 0 || s.wild[k] > 4 || s.fac[k]?.stage !== 0)) return { ok: false, error: '野外資源不合法' };
    for (const id of ['hut', 'garden', 'kitchen', 'store']) {
      const v = s.fac[id].site; if (!v) continue;
      if (!FACILITIES[id].stages[s.fac[id].stage + 1] || !Number.isFinite(v.work) || v.work < 0 || !Number.isFinite(v.workNeed) || v.workNeed <= 0 || ['need', 'delivered', 'reserved'].some((field) => !v[field] || !Number.isInteger(v[field].wood) || v[field].wood < 0) || v.delivered.wood + v.reserved.wood > v.need.wood) return { ok: false, error: '工地資料不合法' };
      const inTransit = t?.act === 'build' && t.phase === 'deliver' && t.place === id && c?.origin === 'site' && c.kind === 'wood' ? c.amount : 0;
      if (v.reserved.wood !== inTransit) return { ok: false, error: '工地預約與在途材料不符' };
    }
    if (c && (!['berries', 'wood', 'veg'].includes(c.kind) || !Number.isInteger(c.amount) || c.amount < 1 || !['wild', 'site'].includes(c.origin) || (c.bonus && (Object.keys(c.bonus).length !== 1 || ![1, 2].includes(c.bonus.seeds) || !['berries', 'veg'].includes(c.kind))))) return { ok: false, error: '背包資料不合法' };
    if (t) {
      if (!Number.isFinite(t.timer) || t.timer < 0 || !['go', 'do', 'fetch', 'deliver'].includes(t.phase)) return { ok: false, error: '任務資料不合法' };
      if (t.act === 'return') { if (t.phase !== 'go' || t.place !== 'home' || !c) return { ok: false, error: '返回任務不合法' }; }
      else if (t.act === 'build') {
        if (!['hut', 'garden', 'kitchen', 'store'].includes(t.place) || !s.fac[t.place].site || !['go', 'do', 'fetch', 'deliver'].includes(t.phase) || (['fetch', 'deliver'].includes(t.phase) && t.mat !== 'wood') || (t.phase === 'fetch' && c) || (t.phase === 'deliver' && !(c?.origin === 'site' && c.kind === 'wood'))) return { ok: false, error: '建造任務不合法' };
      } else {
        if (!ACTIONS[t.act] || t.place !== ACTIONS[t.act].place || !['go', 'do'].includes(t.phase) || (t.act === 'farm' && !offers(s, 'garden', 'farm')) || (t.act === 'cook' && !offers(s, 'kitchen', 'cook'))) return { ok: false, error: '活動任務不合法' };
      }
    }
    if (c?.origin === 'site' && !(t?.act === 'build' && t.phase === 'deliver' && s.fac[t.place]?.site?.reserved[c.kind] === c.amount)) return { ok: false, error: '在途材料不合法' };
    return { ok: true, state: s };
  } catch { return { ok: false, error: 'JSON 格式不合法' }; }
}
