// 荒居：獨立生活狀態。設施階段宣告可提供的活動，任務只讀此登錄表。
export const SAVE_KEY = 'solo-sect.homestead.v1';
export const VERSION = 1;
export const DAY = 240;
export const HOME = [445, 345];
export const PLACES = { berries: [155, 340], wood: [730, 250], hut: [440, 225] };
export const FACILITIES = {
  hut: { label: '住處', stages: [
    { name: '空地', offers: ['rest'], rest: 3 },
    { name: '簡陋木屋', offers: ['rest'], rest: 6, cost: { wood: 5 }, work: 15 },
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
};
const clamp = (x) => Math.max(0, Math.min(100, x));
const pos = (place) => place === 'home' ? HOME : PLACES[place];
const stage = (s, id) => FACILITIES[id].stages[s.fac[id].stage];
export const offers = (s, id, act) => !!stage(s, id)?.offers.includes(act);
const note = (s, msg) => { s.log.unshift({ day: s.day, msg }); s.log.length = Math.min(s.log.length, 80); };

export function createHomestead({ name = '無名', personality = 'quiet' } = {}) {
  const s = { kind: 'homestead', version: VERSION, t: 0, day: 1, speed: 1,
    person: { name: String(name).trim().slice(0, 12) || '無名', personality: ['quiet', 'sociable', 'diligent'].includes(personality) ? personality : 'quiet', pos: [...HOME], hunger: 65, energy: 68, task: null, order: null, carry: null, work: 0, leisure: 0 },
    stock: { berries: 0, wood: 0 }, cap: { berries: 8, wood: 8 }, wild: { berries: 4, wood: 4 },
    fac: { hut: { stage: 0, site: null }, berries: { stage: 0 }, wood: { stage: 0 } }, log: [] };
  note(s, `${s.person.name}來到荒地。先找吃的，再搭一間能安睡的木屋。`); return s;
}

export function startBlueprint(s, id) {
  const f = FACILITIES[id], st = s.fac[id], next = f?.stages[st?.stage + 1];
  if (!next || st.site) return false;
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
  if (act === 'eat') return s.stock.berries >= 1 && s.person.hunger < 95;
  if (act === 'build') { const v = s.fac.hut.site; return !!v && (Object.keys(v.need).some((k) => v.delivered[k] < v.need[k] && s.stock[k] > 0) || Object.keys(v.need).every((k) => v.delivered[k] >= v.need[k])); }
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
  if (s.fac.hut.site && canDo(s, 'build')) return 'build';
  if (s.stock.berries < 2 && canDo(s, 'forage')) return 'forage';
  if (s.fac.hut.stage === 0 && s.stock.wood < 5 && canDo(s, 'chop')) return 'chop';
  if (p.energy < 65) return 'rest';
  return p.personality === 'diligent' && s.stock.wood < s.cap.wood && canDo(s, 'chop') ? 'chop' : 'leisure';
}
function begin(s, act) {
  const p = s.person;
  if (act === 'return') { p.task = { act, phase: 'go', place: 'home', timer: 0 }; return; }
  const place = ACTIONS[act].place;
  if (act === 'build') {
    const v = s.fac.hut.site;
    const mat = Object.keys(v.need).find((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0);
    if (mat) { p.task = { act, phase: 'fetch', place: 'hut', mat, timer: 0 }; return; }
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
    if (s.wild[k] >= 1) { s.wild[k] -= 1; p.carry = { kind: k, amount: 1, origin: 'wild' }; p.energy = clamp(p.energy - ACTIONS[t.act].energy); p.work++; note(s, k === 'berries' ? '採到野果，帶回住處。' : '砍得一根木料，帶回住處。'); }
    p.task = null; return;
  }
  if (t.act === 'eat') { if (s.stock.berries > 0) { s.stock.berries--; p.hunger = clamp(p.hunger + 26); note(s, '吃了野果。'); } }
  if (t.act === 'leisure') { p.leisure++; p.energy = clamp(p.energy + 5); }
  p.task = null;
}
export function tickHomestead(s, dt = 0.25) {
  if (!(dt > 0 && dt <= 1)) throw new Error('bad dt');
  s.t += dt; const oldDay = s.day; s.day = 1 + Math.floor(s.t / DAY);
  if (s.day !== oldDay) note(s, `第 ${s.day} 日。`);
  s.wild.berries = Math.min(4, s.wild.berries + dt / 18);
  s.wild.wood = Math.min(4, s.wild.wood + dt / 28);
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
    if (c) { s.stock[c.kind] += c.amount; p.carry = null; note(s, '把身上的物資放回住處。'); }
    p.task = null; return;
  }
  if (t.act === 'rest') {
    p.energy = clamp(p.energy + stage(s, 'hut').rest * dt);
    if (p.energy >= (p.order === 'rest' ? 100 : 85)) p.task = null;
    return;
  }
  if (t.act === 'build') {
    const v = s.fac.hut.site;
    if (!v || Object.keys(v.need).some((k) => v.delivered[k] < v.need[k])) { p.task = null; return; }
    v.work += dt; p.energy = clamp(p.energy - 0.5 * dt); p.work++;
    if (v.work >= v.workNeed) { s.fac.hut.stage++; s.fac.hut.site = null; note(s, `完工：${stage(s, 'hut').name}。睡得更安穩了。`); p.task = null; }
    return;
  }
  t.timer += dt;
  if (t.timer >= ACTIONS[t.act].duration) complete(s, t);
}

export function saveHomestead(s) { return JSON.stringify(s); }
export function loadHomestead(json) {
  try {
    const s = JSON.parse(json);
    if (s?.kind !== 'homestead' || s.version !== VERSION || !s.person || !s.stock || !s.fac?.hut || !s.wild || !Array.isArray(s.log)) return { ok: false, error: '不是支援的荒居存檔' };
    if (!Number.isFinite(s.t) || s.t < 0 || s.day !== 1 + Math.floor(s.t / DAY) || !Array.isArray(s.person.pos) || s.person.pos.length !== 2 || s.person.pos.some((x) => !Number.isFinite(x)) || s.person.hunger < 0 || s.person.hunger > 100 || s.person.energy < 0 || s.person.energy > 100) return { ok: false, error: '存檔狀態不合法' };
    if (Object.values(s.stock).some((v) => !Number.isInteger(v) || v < 0) || ![0, 1].includes(s.fac.hut.stage)) return { ok: false, error: '存檔資源不合法' };
    return { ok: true, state: s };
  } catch { return { ok: false, error: 'JSON 格式不合法' }; }
}
