import {RECIPES,hasRecipe,recipeReason,recipeAccess,buildAccess,availableUnlocks,preparedCount,edibleEnergy,autoRecipe,chooseFood} from './homestead-content.mjs';
import {at,feel,FEELINGS,restRate} from './homestead-living.mjs';
import { freshSkills, workCost, gainWork, SKILLS } from './homestead-skills.mjs';
// 荒居：獨立生活狀態。設施階段宣告可提供的活動，任務只讀此登錄表。
export const SAVE_KEY = 'solo-sect.homestead.v1';
export const VERSION = 3;
export const DAY = 240;
export const HOME = [445, 345];
export const PLACES = { berries: [155, 340], wood: [730, 250], herbs: [145, 185], herbGarden: [135, 90], visitor: [825, 450], hut: [440, 225], garden: [270, 170], kitchen: [605, 365], store: [555, 470], bench: [352, 412], flowers: [340, 300], bed: [440, 225], workbench: [675, 470] };
export const FACILITIES = {
  hut: { label: '住處', stages: [
    { name: '空地', offers: ['rest'], rest: 3 },
    { name: '簡陋木屋', offers: ['rest'], rest: 6, cost: { wood: 5 }, work: 15 },
    { name: '修繕小屋', offers: ['rest'], rest: 9, cost: { wood: 7 }, work: 20 },
  ] },
  garden: { label: '菜園', stages: [
    { name: '荒地', offers: [] }, { name: '小菜園', offers: ['farm'], cost: { wood: 2 }, work: 8 },
  ] },
  herbGarden: { label: '藥田', stages: [
    { name: '荒草地', offers: [] }, { name: '小藥田', offers: ['herbFarm'], cost: { wood: 2 }, work: 8 },
  ] },
  kitchen: { label: '灶', stages: [
    { name: '冷灶地', offers: [] }, { name: '露天灶', offers: ['cook'], cost: { wood: 3 }, work: 10 }, { name:'改良灶具', offers:['cook'], cost:{wood:4},work:12 },
  ] },
  store: { label: '儲物處', stages: [
    { name: '露天物堆', offers: [] }, { name: '儲物棚', offers: [], cost: { wood: 4 }, work: 10 },
  ] },
  workbench: {label:'木作處',stages:[{name:'空木作地',offers:[]},{name:'木作台',offers:['craft'],cost:{wood:3},work:10}]},
  bed: { label: '屋內床鋪', stages: [{name:'席地鋪蓋',offers:[]},{name:'木床鋪',offers:[],cost:{wood:3},work:10},{name:'舒適床鋪',offers:[],cost:{wood:4},craft:12,work:6}] },
  bench: { label: '屋前座位', stages: [{ name: '空屋前', offers: [] }, { name: '屋前長凳', offers: ['leisure'], cost: {wood: 2}, work: 8 }] },
  flowers: { label: '庭院植栽', stages: [{ name: '空庭院', offers: [] }, { name: '庭院花叢', offers: [], cost: {wood: 3}, work: 10 }] },
  berries: { label: '野果叢', stages: [{ name: '野果叢', offers: ['forage'] }] },
  wood: { label: '林緣枯木', stages: [{ name: '林緣枯木', offers: ['chop'] }] },
  herbs: { label: '草藥坡', stages: [{ name: '草藥坡', offers: ['herbal'] }] },
};
export const BUILDABLE = ['hut', 'garden', 'herbGarden', 'kitchen', 'store', 'bench', 'flowers', 'bed','workbench'];
export const ACTIONS = {
  forage: { skill: 'gather', name: '採野果', place: 'berries', duration: 6, energy: 5 },
  chop: { skill: 'gather', name: '砍柴', place: 'wood', duration: 7, energy: 7 },
  eat: { name: '吃東西', place: 'home', duration: 2 },
  rest: { name: '歇息', place: 'hut' },
  build: { skill: 'build', name: '搬料與施工', place: 'hut' },
  leisure: { name: '閒坐看雲', place: 'home', duration: 8 },
  farm: { skill: 'farm', name: '照料菜園', place: 'garden', duration: 7, energy: 5 },
  cook: { skill: 'cook', name: '煮飯', place: 'kitchen', duration: 8, energy: 4 },
  herbal: { name: '採草藥', place: 'herbs', duration: 7, energy: 5 },
  herbFarm: { name: '照料藥田', place: 'herbGarden', duration: 7, energy: 5 },
  selfCare: { name: '草藥調養自己', place: 'home', duration: 3 },
  helperCare: { name: '草藥調養幫手', place: 'home', duration: 3 },
  chat: { name: '談天', place: 'visitor', duration: 5 },
  talkHelper: { name: '與幫手談天', place: 'home', duration: 5 },
  gift: { name: '送熱飯', place: 'visitor', duration: 4 },
  care: { name: '照料扭傷', place: 'visitor', duration: 6 },
};
const clamp = (x) => Math.max(0, Math.min(100, x));
const pos = (place) => place === 'home' ? HOME : PLACES[place];
const jobPoint=(s,id)=>{const f=s.fac[id],r=FACILITIES[id].stages[f.stage+1];return r?.craft&&f.site?.crafted<r.craft?PLACES.workbench:PLACES[id];};
const stage = (s, id) => FACILITIES[id].stages[s.fac[id].stage];
export const offers = (s, id, act) => !!stage(s, id)?.offers.includes(act);
const note = (s, msg) => { s.log.unshift({ day: s.day, msg }); s.log.length = Math.min(s.log.length, 80); };
export const visitorHere = (s) => s.mode !== 'solo' && s.visitor.role === 'visitor' && s.t % DAY >= 60 && s.t % DAY < 170;
const leaseOf = (act) => act === 'chop' ? 'wood' : act === 'farm' ? 'garden' : act === 'herbFarm' ? 'herbGarden' : null;
const freeLease = (s, p, owner) => { const key = leaseOf(p.task?.act); if (key && s.leases[key] === owner) s.leases[key] = null; };
const inbound = (s, k) => [s.person, s.helper].reduce((n, p) => n + (p?.carry?.origin === 'wild' && p.carry.kind === k ? p.carry.amount : 0), 0);

export function createHomestead({ name = '無名', personality = 'quiet', mode = 'legacy' } = {}) {
  const s = { kind: 'homestead', version: VERSION, mode: mode === 'solo' ? 'solo' : 'legacy', t: 0, subtick: 0, day: 1, speed: 1,
    person: { name: String(name).trim().slice(0, 12) || '無名', personality: ['quiet', 'sociable', 'diligent'].includes(personality) ? personality : 'quiet', pos: [...HOME], hunger: 65, energy: 68, herbalSkill: 0, careDay: 0, skills: freshSkills(), feelings: {}, cookRequest: null, task: null, order: null, carry: null, work: 0, leisure: 0 },
    stock: { berries: 0, wood: 0, seeds: 2, veg: 0, meal: 0, salad: 0, stew: 0, herbs: 0 }, cap: { berries: 8, wood: 8, seeds: 5, veg: 8, meal: 8, herbs: 6 }, wild: { berries: 4, wood: 4, herbs: 3 },
    fac: { hut: { stage: 0, site: null }, garden: { stage: 0, site: null }, herbGarden: { stage: 0, site: null }, workbench:{stage:0,site:null}, bed: { stage: 0, site: null }, bench: { stage: 0, site: null }, flowers: { stage: 0, site: null }, kitchen: { stage: 0, site: null }, store: { stage: 0, site: null }, berries: { stage: 0 }, wood: { stage: 0 }, herbs: { stage: 0 } }, plot: { state: 'empty', growth: 0 }, herbPlot: { state: 'empty', growth: 0 },
    visitor: { name: '阿蓮', role: 'visitor', trust: 0, lastChat: 0, lastGift: 0, cared: false, willing: false, inviteDay: 0, inviteTime: 0, apprenticeDay: 0, injury: false, hunger: 68, energy: 72, herbalSkill: 0, careDay: 0 }, helper: null,
    leases: { wood: null, garden: null, herbGarden: null }, unlocked: [], log: [] };
  note(s, `${s.person.name}來到荒地。先找吃的，再搭一間能安睡的木屋。`); return s;
}

export function startBlueprint(s, id) {
  if(typeof id!=='string'||!Object.hasOwn(FACILITIES,id)||!Object.hasOwn(s.fac,id))return false;
  const f = FACILITIES[id], st = s.fac[id], next = f?.stages[st?.stage + 1];
  if(buildAccess(s,id,st?.stage+1))return false;
  if (id==='bed' && s.mode!=='solo')return false;
  if (!next || st.site || (id !== 'hut' && s.fac.hut.stage === 0)) return false;
  st.site = { need: { ...next.cost }, delivered: Object.fromEntries(Object.keys(next.cost).map((k) => [k, 0])), reserved: Object.fromEntries(Object.keys(next.cost).map((k) => [k, 0])), work: 0, workNeed: next.work, crafted:0, assemblyAt:null, paused: false };
  note(s, `立下「${next.name}」藍圖。`); return true;
}

export function pauseProject(s,id,paused=true){
  const site=s.fac[id]?.site;if(!site||typeof paused!=='boolean')return false;
  site.paused=paused;
  if(paused&&s.person.task?.act==='build'&&s.person.task.place===id){cancelTask(s);if(s.person.order==='build')s.person.order=null;}
  note(s,`${paused?'暫停':'繼續'}「${FACILITIES[id].stages[s.fac[id].stage+1].name}」工程，材料與已施工進度保留。`);return true;
}

export function cancelTask(s, p = s.person, owner = 'person') {
  const t = p.task;
  if (t?.act === 'build' && t.phase === 'deliver' && p.carry?.origin === 'site') {
    const site = s.fac[t.place]?.site;
    if (site) site.reserved[p.carry.kind] -= p.carry.amount;
    p.carry.origin = 'wild';
  }
  freeLease(s, p, owner); p.task = null;
}
export function setOrder(s, act) {
  if (act !== null && (typeof act!=='string'||!Object.hasOwn(ACTIONS,act) || s.mode === 'solo' && ['chat','talkHelper','gift','care','helperCare'].includes(act))) return false;
  if (s.person.order === act) return true;
  cancelTask(s); s.person.order = act; s.person.cookRequest=s.mode==='solo'&&act==='cook'?'basic':null; return true;
}
export function requestRecipe(s,id){
  if(s.mode!=='solo'||recipeReason(s,id))return false;
  const p=s.person;if(p.order==='cook'&&p.cookRequest===id)return true;
  cancelTask(s);p.order='cook';p.cookRequest=id;return true;
}
export function setHelperOrder(s, act) {
  if (!s.helper || ![null, 'chop', 'farm', 'herbFarm'].includes(act) || (act === 'herbFarm' && s.visitor.role !== 'apprentice')) return false;
  if (s.helper.order === act) return true;
  cancelTask(s, s.helper, 'helper'); s.helper.order = act; return true;
}
export function inviteHelper(s) {
  const v = s.visitor;
  if (!visitorHere(s) || v.trust < 2 || !v.willing || s.helper || s.fac.hut.stage === 0 || v.inviteDay === s.day) return false;
  v.role = v.apprenticeDay ? 'apprentice' : 'helper'; v.inviteDay = s.day; v.inviteTime = s.t;
  s.helper = { name: v.name, pos: [...PLACES.visitor], hunger: v.hunger, energy: v.energy, herbalSkill: v.herbalSkill, careDay: v.careDay, task: null, order: null, carry: null, work: 0, leisure: 0, leaving: false };
  note(s, v.role === 'apprentice' ? `${v.name}回來幫忙了。` : `${v.name}願意先短住，幫忙照料這塊地。`); return true;
}
export function acceptApprentice(s) {
  const v = s.visitor;
  if (s.mode === 'solo') return false;
  if (!s.helper || v.role !== 'helper' || v.trust < 4 || s.t - v.inviteTime < DAY || s.helper.hunger < 30 || s.helper.leaving) return false;
  v.role = 'apprentice'; v.apprenticeDay = s.day; note(s, `彼此同意後，${v.name}成為學徒。`); return true;
}
export function askHelperLeave(s) {
  if (!s.helper || s.helper.leaving) return false;
  s.helper.leaving = true; cancelTask(s, s.helper, 'helper'); note(s, `${s.helper.name}收拾行囊，先把手上物資送回。`); return true;
}

function canDo(s, act, recipeId='basic') {
  if (s.mode === 'solo' && ['chat','talkHelper','gift','care','helperCare'].includes(act)) return false;
  if (leaseOf(act) && s.leases[leaseOf(act)]) return false;
  if (act === 'forage') return s.wild.berries >= 1 && offers(s, 'berries', 'forage') && s.stock.berries + inbound(s, 'berries') < s.cap.berries;
  if (act === 'chop') return s.wild.wood >= 1 && offers(s, 'wood', 'chop') && s.stock.wood + inbound(s, 'wood') < s.cap.wood;
  if (act === 'eat') return s.stock.berries + preparedCount(s) >= 1 && s.person.hunger < 95;
  if (act === 'build') return Object.values(s.fac).some((st) => { const v = st.site; return !!v && !v.paused && (Object.keys(v.need).some((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0) || Object.keys(v.need).every((k) => v.delivered[k] >= v.need[k])); });
  if (act === 'farm') return offers(s, 'garden', 'farm') && (s.plot.state === 'ripe' && s.stock.veg + inbound(s, 'veg') <= s.cap.veg - 2 || s.plot.state === 'empty' && s.stock.seeds > 0);
  if (act === 'herbFarm') {
    const amount = s.person.herbalSkill >= 3 ? 3 : 2;
    return offers(s, 'herbGarden', 'herbFarm') && (s.herbPlot.state === 'ripe' && s.stock.herbs + inbound(s, 'herbs') <= s.cap.herbs - amount || s.herbPlot.state === 'empty' && s.stock.herbs > 0);
  }
  if (act === 'cook') return !recipeReason(s,recipeId);
  if (act === 'herbal') return s.wild.herbs >= 1 && s.stock.herbs + inbound(s, 'herbs') < s.cap.herbs;
  if (act === 'selfCare') return s.stock.herbs > 0 && s.person.energy <= 55 && s.person.careDay !== s.day;
  if (act === 'helperCare') return !!s.helper && !s.helper.leaving && s.stock.herbs > 0 && s.helper.energy <= 55 && s.helper.careDay !== s.day;
  if (act === 'chat') return visitorHere(s) && s.visitor.lastChat !== s.day;
  if (act === 'talkHelper') return !!s.helper && !s.helper.leaving && s.visitor.lastChat !== s.day;
  if (act === 'gift') return visitorHere(s) && s.visitor.lastGift !== s.day && s.stock.meal > 0;
  if (act === 'care') return visitorHere(s) && s.visitor.injury && !s.visitor.cared && s.stock.herbs > 0;
  return act === 'rest' || act === 'leisure';
}
export function blockReason(s, act, who = 'person') {
  const p = who === 'helper' ? s.helper : s.person;
  if (!p) return '目前沒有人可指派';
  if (['helperCare', 'talkHelper'].includes(act) && s.helper?.leaving) return '幫手正在回村';
  if (p.carry) return '先把手上物資搬回住處';
  if (p.hunger < 38) return s.stock.berries + preparedCount(s) ? '先吃東西' : '缺糧，先採野果';
  if (p.energy < 24 && !(act === 'selfCare' && canDo(s, 'selfCare'))) return '先休息恢復精力';
  const key = leaseOf(act);
  if (key && s.leases[key] && s.leases[key] !== who) return '地塊正由另一人使用';
  if (act === 'farm' || act === 'herbFarm') {
    const medicinal = act === 'herbFarm', id = medicinal ? 'herbGarden' : 'garden';
    if (medicinal && who === 'helper' && s.visitor.role !== 'apprentice') return '先成為學徒才能照料藥田';
    if (!offers(s, id, act)) return medicinal ? '藥田尚未建成' : '菜園尚未建成';
    const plot = medicinal ? s.herbPlot : s.plot, seed = medicinal ? 'herbs' : 'seeds';
    if (plot.state === 'growing') return medicinal ? '草藥尚在生長' : '青菜尚在生長';
    if (plot.state === 'empty' && !s.stock[seed]) return medicinal ? '缺一份草藥作插穗' : '缺菜種';
    const amount = medicinal ? (p.herbalSkill >= 3 ? 3 : 2) : 2, crop = medicinal ? 'herbs' : 'veg';
    if (plot.state === 'ripe' && s.stock[crop] + inbound(s, crop) > s.cap[crop] - amount) return `${medicinal ? '藥田' : '菜園'}收穫需空位 ${amount} 格，現有 ${s.cap[crop] - s.stock[crop] - inbound(s, crop)} 格`;
  }
  if (act === 'chop') {
    if (s.stock.wood + inbound(s, 'wood') >= s.cap.wood) return '木料倉已滿';
    if (s.wild.wood < 1) return '枯木正在再生';
  }
  if (act === 'forage') {
    if (s.stock.berries + inbound(s, 'berries') >= s.cap.berries) return '野果倉已滿';
    if (s.wild.berries < 1) return '野果正在再生';
  }
  if (act === 'herbal') {
    if (s.stock.herbs + inbound(s, 'herbs') >= s.cap.herbs) return '草藥倉已滿';
    if (s.wild.herbs < 1) return '野草藥正在再生';
  }
  if(act==='cook')return recipeReason(s,p.cookRequest||'basic');
  if (act === 'build') {
    const sites = Object.values(s.fac).map((f) => f.site).filter(Boolean);
    if(sites.length&&sites.every(site=>site.paused))return '工程已由你暫停，材料與進度保留';
    if (!sites.length) return '還沒有藍圖';
    if (!canDo(s, 'build')) return sites.some((site) => site.reserved.wood) ? '材料正在搬往工地' : '缺建材，先砍柴';
  }
  if (act === 'eat') {
    if (!preparedCount(s) && !s.stock.berries) return '還沒有搬回可吃的食物';
    if (p.hunger >= 95) return '目前已經吃飽';
  }
  if (['chat','gift','care'].includes(act)) {
    if (!visitorHere(s)) return '阿蓮目前不在村路；白天會再來';
    if (act === 'chat' && s.visitor.lastChat === s.day) return '今天已經談過天';
    if (act === 'gift' && s.visitor.lastGift === s.day) return '今天已經送過飯';
    if (act === 'gift' && !s.stock.meal) return '缺熱飯1份';
    if (act === 'care' && (!s.visitor.injury || s.visitor.cared)) return '目前沒有需要照料的扭傷';
    if (act === 'care' && !s.stock.herbs) return '缺草藥1份';
  }
  if (act === 'talkHelper') {
    if (!s.helper) return '目前沒有同住幫手';
    if (s.visitor.lastChat === s.day) return '今天已經談過天';
  }
  if (act === 'selfCare' || act === 'helperCare') {
    const target = act === 'selfCare' ? s.person : s.helper;
    if (!target) return '目前沒有幫手';
    if (!s.stock.herbs) return '缺草藥 1 份';
    if (target.careDay === s.day) return '今日已調養過';
    if (target.energy > 55) return '目前不需調養';
  }
  return null;
}
// 自主夠用目標（試玩值）；不是容量上限，手動指派仍可補到實際容量。
export function supplyTargets(s) {
  return { meal: (s.helper ? 2 : 1) * 2, berries: 2, veg: 4, herbs: 3, wood: s.person.personality === 'diligent' ? 5 : s.helper ? 3 : 2 };
}
function pick(s) {
  const p = s.person, target = supplyTargets(s);
  if (p.carry) return 'return';
  if (p.hunger < 38 && canDo(s, 'eat')) return 'eat';
  if (p.hunger < 38 && canDo(s, 'forage')) return 'forage';
  if (s.helper?.hunger < 35 && !s.stock.berries && !preparedCount(s) && canDo(s, 'forage')) return 'forage';
  if (p.order === 'selfCare' && canDo(s, 'selfCare')) return 'selfCare';
  if (p.energy < 23) return 'rest';
  if (p.order && canDo(s, p.order,p.order==='cook'?p.cookRequest||'basic':undefined)) return p.order;
  if (p.personality === 'sociable' && canDo(s, 'chat') && p.hunger > 50 && p.energy > 45) return 'chat';
  if (p.personality === 'sociable' && canDo(s, 'talkHelper') && p.hunger > 50 && p.energy > 45) return 'talkHelper';
  if (p.personality === 'diligent' && canDo(s, 'care') && p.energy > 40) return 'care';
  // 有現成菜時先補夠用熱飯，施工不拿走唯一的下一餐燃料。
  if (preparedCount(s) < target.meal && autoRecipe(s)) return 'cook';
  if (s.fac.kitchen.stage && preparedCount(s) < target.meal && s.stock.veg >= 2 && !s.stock.wood && canDo(s, 'chop')) return 'chop';
  if (canDo(s, 'build')) return 'build';
  if (Object.values(s.fac).some((st) => st.site && !st.site.paused && st.site.delivered.wood + st.site.reserved.wood < st.site.need.wood) && canDo(s, 'chop')) return 'chop';
  if (s.stock.berries < target.berries && canDo(s, 'forage')) return 'forage';
  if (s.fac.hut.stage === 0 && s.stock.wood < 5 && canDo(s, 'chop')) return 'chop';
  if (canDo(s, 'farm') && s.stock.veg < target.veg) return 'farm';
  if (canDo(s, 'herbFarm') && s.stock.herbs < target.herbs) return 'herbFarm';
  if (p.energy < 65) return 'rest';
  if (s.stock.wood < target.wood && canDo(s, 'chop')) return 'chop';
  return 'leisure';
}
function begin(s, act) {
  const p = s.person;
  if (act === 'return') { p.task = { act, phase: 'go', place: 'home', timer: 0 }; return; }
  const place = act === 'leisure' && offers(s, 'bench', 'leisure') ? 'bench' : ACTIONS[act].place;
  const key = leaseOf(act);
  if (key) { if (s.leases[key]) return; s.leases[key] = 'person'; }
  if (act === 'build') {
    const target = Object.keys(s.fac).find((id) => { const v = s.fac[id].site; return v && !v.paused && (Object.keys(v.need).some((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0) || Object.keys(v.need).every((k) => v.delivered[k] >= v.need[k])); });
    if (!target) return;
    const v = s.fac[target].site;
    const mat = Object.keys(v.need).find((k) => v.delivered[k] + v.reserved[k] < v.need[k] && s.stock[k] > 0);
    if (mat) { p.task = { act, phase: 'fetch', place: target, mat, timer: 0 }; return; }
    p.task = { act, phase: 'go', place: target, timer: 0 };
    const recipe=FACILITIES[target].stages[s.fac[target].stage+1];
    if(recipe.craft){if(v.crafted<recipe.craft)p.task.step='craft';else p.task.step=v.assemblyAt&&Math.hypot(v.assemblyAt[0]-PLACES[target][0],v.assemblyAt[1]-PLACES[target][1])>=1?'pickup':'install';}
    return;
  }
  p.task = { act, phase: 'go', place, timer: 0 };
  if(act==='cook'&&s.mode==='solo'){const manual=!!p.cookRequest&&!recipeReason(s,p.cookRequest);p.task.recipe=manual?p.cookRequest:autoRecipe(s)||'basic';p.task.manual=manual;}
  if(act==='eat'&&s.mode==='solo')p.task.foodId=chooseFood(s);
}
function travel(p, target, dt) {
  const dx = target[0] - p.pos[0], dy = target[1] - p.pos[1], len = Math.hypot(dx, dy);
  if (len <= 75 * dt) { p.pos = [...target]; return true; }
  p.pos[0] += dx / len * 75 * dt; p.pos[1] += dy / len * 75 * dt; return false;
}
function complete(s, t) {
  const p = s.person;
  let skilledWork = false;
  if (t.act === 'forage' || t.act === 'chop' || t.act === 'herbal') {
    const k = t.act === 'forage' ? 'berries' : t.act === 'chop' ? 'wood' : 'herbs';
    if (s.wild[k] >= 1 && s.stock[k] + inbound(s, k) < s.cap[k]) { s.wild[k] -= 1; p.carry = { kind: k, amount: 1, origin: 'wild', ...(k === 'berries' && s.stock.seeds === 0 ? { bonus: { seeds: 1 } } : {}) }; p.energy = clamp(p.energy - (ACTIONS[t.act].skill ? workCost(s,ACTIONS[t.act].skill,ACTIONS[t.act].energy) : ACTIONS[t.act].energy)); gainWork(s,ACTIONS[t.act].skill); p.work++; if (k === 'herbs') p.herbalSkill++; note(s, { berries: '採到野果，帶回住處。', wood: '砍得一根木料，帶回住處。', herbs: '採到一份虛構草藥，帶回住處。' }[k]); }
    freeLease(s, p, 'person'); p.task = null; return;
  }
  if(t.act==='eat'){
    if(s.mode==='solo'){
      const id=t.foodId&&s.stock[RECIPES[t.foodId]?.output]>0?t.foodId:chooseFood(s),r=RECIPES[id];
      if(r){s.stock[r.output]--;p.hunger=clamp(p.hunger+r.hunger);p.energy=clamp(p.energy+r.energy);if(at(p,HOME))feel(s,r.feeling);note(s,id==='basic'?'吃了一份熱飯。':`吃下${r.name}一份，飽腹+${r.hunger}${r.energy?`、精力+${r.energy}`:''}。`);}
      else if(s.stock.berries){s.stock.berries--;p.hunger=clamp(p.hunger+26);note(s,'吃了野果。');}
    }else if(s.stock.meal>0){s.stock.meal--;p.hunger=clamp(p.hunger+52);note(s,'吃了一份熱飯。');}else if(s.stock.berries>0){s.stock.berries--;p.hunger=clamp(p.hunger+26);note(s,'吃了野果。');}
  }
  if (t.act === 'leisure') { p.leisure++; p.energy = clamp(p.energy + 5); if(t.place==='bench'&&s.fac.bench.stage&&at(p,PLACES.bench)){feel(s,'seated');if(s.fac.flowers.stage)feel(s,'flowers');} }
  if (t.act === 'farm') {
    if (s.plot.state === 'empty' && s.stock.seeds > 0) { s.stock.seeds--; s.plot.state = 'growing'; s.plot.growth = 0; skilledWork=true; note(s, '在小菜園播下種子。'); }
    else if (s.plot.state === 'ripe' && s.stock.veg + inbound(s, 'veg') <= s.cap.veg - 2) { s.plot.state = 'empty'; p.carry = { kind: 'veg', amount: 2, origin: 'wild', bonus: { seeds: 2 } }; skilledWork=true; note(s, '收下青菜與種子，帶回住處。'); }
  }
  if (t.act === 'herbFarm') {
    if (s.herbPlot.state === 'empty' && s.stock.herbs > 0) { s.stock.herbs--; s.herbPlot.state = 'growing'; s.herbPlot.growth = 0; p.herbalSkill++; note(s, '用一份草藥在藥田插穗。'); }
    else if (s.herbPlot.state === 'ripe') { const amount = p.herbalSkill >= 3 ? 3 : 2; if (s.stock.herbs + inbound(s, 'herbs') <= s.cap.herbs - amount) { s.herbPlot.state = 'empty'; p.carry = { kind: 'herbs', amount, origin: 'wild' }; p.herbalSkill++; note(s, `收下 ${amount} 份藥田草藥，正帶回住處。`); } }
  }
  if(t.act==='cook'){const id=t.recipe||'basic',r=RECIPES[id];if(r&&!recipeReason(s,id)){for(const[k,n]of Object.entries(r.ingredients))s.stock[k]-=n;s.stock[r.output]=(s.stock[r.output]||0)+r.servings;skilledWork=true;note(s,id==='basic'?'用兩份菜與一根柴煮出三份熱飯。':`做成${r.name}${r.servings}份。`);}if(s.mode==='solo'&&t.manual&&p.cookRequest===id){p.cookRequest=null;p.order=null;}}
  if (t.act === 'chat' && canDo(s, 'chat')) { s.visitor.lastChat = s.day; s.visitor.trust++; note(s, `與${s.visitor.name}談了些日常。`); }
  if (t.act === 'talkHelper' && canDo(s, 'talkHelper')) { s.visitor.lastChat = s.day; s.visitor.trust++; note(s, `與短住的${s.visitor.name}談了談往後的日子。`); }
  if (t.act === 'gift' && canDo(s, 'gift')) { s.stock.meal--; s.visitor.lastGift = s.day; s.visitor.trust++; s.visitor.willing = true; note(s, `送${s.visitor.name}一份熱飯，對方也願意日後幫忙。`); }
  if (t.act === 'care' && canDo(s, 'care')) { s.stock.herbs--; s.visitor.cared = true; s.visitor.trust += 2; s.visitor.willing = true; note(s, `用虛構草藥照料${s.visitor.name}的扭傷。`); }
  if (t.act === 'selfCare' && canDo(s, 'selfCare')) { s.stock.herbs--; p.energy = clamp(p.energy + 45); p.careDay = s.day; p.herbalSkill++; note(s, '用一份草藥調養自己，減輕疲勞。'); }
  if (t.act === 'helperCare' && canDo(s, 'helperCare')) { s.stock.herbs--; s.helper.energy = clamp(s.helper.energy + 45); s.helper.careDay = s.day; p.herbalSkill++; note(s, `用一份草藥替${s.helper.name}調養，減輕疲勞。`); }
  if (t.act === 'farm' || t.act === 'cook' || t.act === 'herbFarm') {
    if(s.mode!=='solo'||skilledWork||t.act==='herbFarm'){p.energy=clamp(p.energy-(ACTIONS[t.act].skill?workCost(s,ACTIONS[t.act].skill,ACTIONS[t.act].energy):ACTIONS[t.act].energy));p.work++;}
    if(skilledWork)gainWork(s,ACTIONS[t.act].skill,t.act==='cook'?RECIPES[t.recipe||'basic'].xp:1);
  }
  freeLease(s, p, 'person'); p.task = null;
}
function tickHelper(s, dt) {
  const p = s.helper;
  if (!p) return;
  p.hunger = clamp(p.hunger - 0.14 * dt);
  if (!p.task) {
    let act = null;
    if (p.carry) act = 'return';
    else if (p.leaving) act = 'leave';
    else if (p.hunger < 38 && s.stock.berries + s.stock.meal) act = 'eat';
    else if (p.hunger < 38 && s.wild.berries >= 1 && s.stock.berries + inbound(s, 'berries') < s.cap.berries) act = 'forage';
    else if (p.energy < 24) act = 'rest';
    else if (p.order === 'chop' && !s.leases.wood && s.stock.wood + inbound(s, 'wood') < s.cap.wood) act = 'chop';
    else if (p.order === 'farm' && !s.leases.garden && offers(s, 'garden', 'farm') && (s.plot.state === 'ripe' && s.stock.veg + inbound(s, 'veg') <= s.cap.veg - 2 || s.plot.state === 'empty' && s.stock.seeds > 0)) act = 'farm';
    else if (p.order === 'herbFarm' && s.visitor.role === 'apprentice' && !s.leases.herbGarden && offers(s, 'herbGarden', 'herbFarm') && (s.herbPlot.state === 'ripe' && s.stock.herbs + inbound(s, 'herbs') <= s.cap.herbs - (p.herbalSkill >= 3 ? 3 : 2) || s.herbPlot.state === 'empty' && s.stock.herbs > 0)) act = 'herbFarm';
    else if (!s.leases.garden && offers(s, 'garden', 'farm') && s.stock.veg < supplyTargets(s).veg && (s.plot.state === 'ripe' && s.stock.veg + inbound(s, 'veg') <= s.cap.veg - 2 || s.plot.state === 'empty' && s.stock.seeds > 0)) act = 'farm';
    else if (!s.leases.wood && s.stock.wood + inbound(s, 'wood') < 3) act = 'chop';
    else if (p.energy < 70) act = 'rest';
    else act = 'leisure';
    const place = act === 'leisure' && offers(s, 'bench', 'leisure') ? 'bench' : act === 'return' || act === 'eat' || act === 'leisure' ? 'home' : act === 'leave' ? 'visitor' : ACTIONS[act].place;
    p.task = { act, phase: 'go', place, timer: 0 };
    const key = leaseOf(act); if (key) s.leases[key] = 'helper';
  }
  const t = p.task;
  if (t.phase === 'go') { if (!travel(p, pos(t.place), dt)) return; t.phase = 'do'; t.timer = 0; }
  if (t.act === 'return') {
    if (p.carry) { const c = p.carry; s.stock[c.kind] = Math.min(s.cap[c.kind], s.stock[c.kind] + c.amount); for (const [k, v] of Object.entries(c.bonus || {})) s.stock[k] = Math.min(s.cap[k], s.stock[k] + v); p.carry = null; }
    p.task = null; return;
  }
  if (t.act === 'leave') { s.visitor.hunger = p.hunger; s.visitor.energy = p.energy; s.visitor.herbalSkill = p.herbalSkill; s.visitor.careDay = p.careDay; s.helper = null; s.visitor.role = 'visitor'; note(s, `${p.name}回村了，日後仍會來訪。`); return; }
  if (t.act === 'rest') { p.energy = clamp(p.energy + stage(s, 'hut').rest * dt); if (p.energy >= 85) p.task = null; return; }
  t.timer += dt;
  if (t.timer < ACTIONS[t.act].duration) return;
  if (t.act === 'eat') { if (s.stock.meal) { s.stock.meal--; p.hunger = clamp(p.hunger + 52); note(s, `${p.name}吃了一份熱飯。`); } else if (s.stock.berries) { s.stock.berries--; p.hunger = clamp(p.hunger + 26); note(s, `${p.name}吃了野果。`); } }
  if (t.act === 'forage' || t.act === 'chop') {
    const k = t.act === 'chop' ? 'wood' : 'berries';
    if (s.wild[k] >= 1 && s.stock[k] + inbound(s, k) < s.cap[k]) { s.wild[k]--; p.carry = { kind: k, amount: 1, origin: 'wild' }; p.energy = clamp(p.energy - ACTIONS[t.act].energy); p.work++; note(s, `${p.name}${k === 'wood' ? '砍柴' : '採果'}後正搬回物資。`); }
  }
  if (t.act === 'farm' && offers(s, 'garden', 'farm')) {
    if (s.plot.state === 'empty' && s.stock.seeds > 0) { s.stock.seeds--; s.plot.state = 'growing'; s.plot.growth = 0; p.work++; note(s, `${p.name}播下菜種。`); }
    else if (s.plot.state === 'ripe' && s.stock.veg + inbound(s, 'veg') <= s.cap.veg - 2) { s.plot.state = 'empty'; p.carry = { kind: 'veg', amount: 2, origin: 'wild', bonus: { seeds: 2 } }; p.work++; note(s, `${p.name}收菜後正搬回。`); }
    p.energy = clamp(p.energy - ACTIONS.farm.energy);
  }
  if (t.act === 'herbFarm' && offers(s, 'herbGarden', 'herbFarm')) {
    if (s.herbPlot.state === 'empty' && s.stock.herbs > 0) { s.stock.herbs--; s.herbPlot.state = 'growing'; s.herbPlot.growth = 0; p.herbalSkill++; p.work++; note(s, `${p.name}在藥田插穗。`); }
    else if (s.herbPlot.state === 'ripe') { const amount = p.herbalSkill >= 3 ? 3 : 2; if (s.stock.herbs + inbound(s, 'herbs') <= s.cap.herbs - amount) { s.herbPlot.state = 'empty'; p.carry = { kind: 'herbs', amount, origin: 'wild' }; p.herbalSkill++; p.work++; note(s, `${p.name}收下 ${amount} 份藥田草藥，正搬回。`); } }
    p.energy = clamp(p.energy - ACTIONS.herbFarm.energy);
  }
  if (t.act === 'leisure') { p.leisure++; p.energy = clamp(p.energy + 5); }
  freeLease(s, p, 'helper'); p.task = null;
}
export function tickHomestead(s, dt = 0.25) {
  if (!(dt > 0 && dt <= 1)) throw new Error('bad dt');
  const total=(s.subtick||0)+dt, count=Math.floor((total+1e-10)/.25);
  s.subtick=Math.max(0,Number((total-count*.25).toFixed(12)));
  for(let i=0;i<count;i++){tickQuarter(s,.25);for(const key of availableUnlocks(s)){if(!s.unlocked.includes(key)){s.unlocked.push(key);note(s,`學會新做法：${key}。`);}}}
}
function tickQuarter(s,dt) {
  s.t += dt; const oldDay = s.day; s.day = 1 + Math.floor(s.t / DAY);
  if (s.day !== oldDay) note(s, `第 ${s.day} 日。`);
  if (s.mode !== 'solo' && s.day >= 2 && s.visitor.role === 'visitor' && !s.visitor.cared && !s.visitor.injury) { s.visitor.injury = true; note(s, `${s.visitor.name}在村路扭傷，或許可採草藥照料。`); }
  if (s.mode !== 'solo' && s.visitor.role === 'visitor' && s.t % DAY >= 170 && (s.t - dt) % DAY < 170) note(s, `${s.visitor.name}沿村路回去了。`);
  s.wild.berries = Math.min(4, s.wild.berries + dt / 18);
  s.wild.wood = Math.min(4, s.wild.wood + dt / 28);
  s.wild.herbs = Math.min(3, s.wild.herbs + dt / 40);
  if (s.plot.state === 'growing') { s.plot.growth += dt; if (s.plot.growth >= 34) { s.plot.state = 'ripe'; note(s, '小菜園的菜熟了。'); } }
  if (s.herbPlot.state === 'growing') { s.herbPlot.growth += dt; if (s.herbPlot.growth >= 50) { s.herbPlot.state = 'ripe'; note(s, '藥田的草藥可收了。'); } }
  tickHelper(s, dt);
  const p = s.person; p.hunger = clamp(p.hunger - 0.14 * dt);
  if (!p.task) begin(s, pick(s));
  const t = p.task;
  if (!t) return;
  if (t.phase === 'fetch') {
    if (travel(p, HOME, dt)) {
      const v = s.fac[t.place].site;
      if (!v || s.stock[t.mat] <= 0 || v.delivered[t.mat] + v.reserved[t.mat] >= v.need[t.mat]) { p.task = null; return; }
      s.stock[t.mat]--; v.reserved[t.mat]++; p.carry = { kind: t.mat, amount: 1, origin: 'site' }; t.phase = 'deliver';
    }
    return;
  }
  if (t.phase === 'deliver') {
    if (travel(p, jobPoint(s,t.place), dt)) {
      const v = s.fac[t.place]?.site, c = p.carry;
      if (v && c) { v.reserved[c.kind]--; v.delivered[c.kind] += c.amount; p.carry = null; note(s, `木料搬到${FACILITIES[t.place].label}工地。`); }
      p.task = null;
    }
    return;
  }
  if(t.phase==='go'){
    const v=t.act==='build'?s.fac[t.place]?.site:null;
    const destination=t.act==='build'?(t.step==='craft'?PLACES.workbench:t.step==='pickup'?v.assemblyAt:t.step==='install'?PLACES[t.place]:jobPoint(s,t.place)):pos(t.place);
    const arrived=travel(p,destination,dt);if(t.step==='install')v.assemblyAt=[...p.pos];if(!arrived)return;
    if(t.step==='pickup'){t.step='install';return;}t.phase='do';t.timer=0;
  }
  if (['chat', 'gift', 'care'].includes(t.act) && !visitorHere(s)) { p.task = null; return; }
  if (t.act === 'return') {
    const c = p.carry;
    if (c) { s.stock[c.kind] += c.amount; for (const [k, v] of Object.entries(c.bonus || {})) s.stock[k] = Math.min(s.cap[k], s.stock[k] + v); p.carry = null; note(s, '把身上的物資放回住處。'); }
    p.task = null; return;
  }
  if (t.act === 'rest') {
    const before=p.energy, target=p.order==='rest'?100:85;
    p.energy = clamp(p.energy + restRate(s) * dt);
    if (p.energy >= target){if(before<target&&s.fac.bed.stage&&at(p,PLACES.hut))feel(s,'rested');p.task=null;}
    return;
  }
  if (t.act === 'build') {
    const v = s.fac[t.place]?.site;
    if (!v || Object.keys(v.need).some((k) => v.delivered[k] < v.need[k])) { p.task = null; return; }
    if(t.step==='craft'){const recipe=FACILITIES[t.place].stages[s.fac[t.place].stage+1],effort=Math.min(dt,recipe.craft-v.crafted);v.crafted+=effort;p.energy=clamp(p.energy-workCost(s,'build',.5*effort));p.work+=effort/7;gainWork(s,'build',effort);if(v.crafted>=recipe.craft){v.assemblyAt=[...PLACES.workbench];note(s,'在木作台做好舒適床部件，接著搬回屋內安裝。');p.task=null;}return;}
    const effort=Math.min(dt,v.workNeed-v.work);v.work += effort; p.energy = clamp(p.energy - workCost(s,'build',0.5*effort)); p.work += effort / 7; gainWork(s,'build',effort);
    if (v.work >= v.workNeed) { s.fac[t.place].stage++; s.fac[t.place].site = null; if (t.place === 'store') s.cap = { ...s.cap, berries: 20, wood: 20, seeds: 10, veg: 16, meal: 15, herbs: 10 }; note(s, `完工：${stage(s, t.place).name}。`); p.task = null; }
    return;
  }
  t.timer += dt;
  if (t.timer >= (t.act==='cook'?RECIPES[t.recipe||'basic'].duration:ACTIONS[t.act].duration)) complete(s, t);
}

export function saveHomestead(s) { return JSON.stringify(s); }
export function loadHomestead(json) {
  try {
    const s = JSON.parse(json);
    if (s?.kind !== 'homestead' || ![1, 2, VERSION].includes(s.version) || !s.person || !s.stock || !s.cap || !s.fac?.hut || !s.wild || !Array.isArray(s.log)) return { ok: false, error: '不是支援的荒居存檔' };
    // H1 檔沒有 H2 的地塊與資源，補上後繼續原本的生活，不碰本篇存檔。
    const h2 = createHomestead();
    s.mode ??= 'legacy';
    s.subtick ??=0;
    if(!Number.isFinite(s.subtick)||s.subtick<0||s.subtick>=.25)return {ok:false,error:'時間餘量不合法'};
    if (!['solo','legacy'].includes(s.mode) || s.mode === 'solo' && (s.helper || s.visitor?.role && s.visitor.role !== 'visitor' || ['chat','talkHelper','gift','care','helperCare'].includes(s.person.order) || ['chat','talkHelper','gift','care','helperCare'].includes(s.person.task?.act))) return {ok:false,error:'生活模式不合法'};
    for(const k of ['salad','stew'])s.stock[k]??=0;
    s.person.cookRequest??=null;
    if(['salad','stew'].some(k=>!Number.isInteger(s.stock[k])||s.stock[k]<0)||preparedCount(s)>s.cap.meal||s.mode!=='solo'&&(s.stock.salad||s.stock.stew)||s.person.cookRequest!==null&&(!hasRecipe(s.person.cookRequest)||s.mode!=='solo'||s.person.order!=='cook'))return {ok:false,error:'料理資料不合法'};
    for (const k of ['seeds', 'veg', 'meal']) s.stock[k] ??= h2.stock[k];
    for (const k of ['seeds', 'veg', 'meal']) s.cap[k] ??= h2.cap[k];
    for (const k of ['garden', 'kitchen', 'store']) s.fac[k] ??= h2.fac[k];
    s.plot ??= h2.plot;
    if (s.version === 1) {
      s.version = 2;
      s.stock.herbs = 0; s.cap.herbs = 6; s.wild.herbs = 3; s.fac.herbs = { stage: 0 };
      s.visitor = structuredClone(h2.visitor); s.helper = null;
      s.leases = { wood: s.person.task?.act === 'chop' ? 'person' : null, garden: s.person.task?.act === 'farm' ? 'person' : null };
    }
    if (s.version === 2) {
      s.version = VERSION;
      s.fac.herbGarden = structuredClone(h2.fac.herbGarden); s.herbPlot = structuredClone(h2.herbPlot);
      s.person.herbalSkill = 0; s.person.careDay = 0;
      s.visitor.herbalSkill = 0; s.visitor.careDay = 0;
      if (s.helper) { s.helper.herbalSkill = 0; s.helper.careDay = 0; }
      s.leases.herbGarden = null;
    }
    for (const id of ['bench','flowers','bed','workbench']) s.fac[id] ??= structuredClone(h2.fac[id]);
    if(s.person.feelings===undefined)s.person.feelings={};
    if(!s.person.feelings || typeof s.person.feelings!=='object' || Array.isArray(s.person.feelings) || Object.entries(s.person.feelings).some(([id,until])=>!FEELINGS[id]||!Number.isFinite(until)||until<0||until>s.t+FEELINGS[id].duration))return {ok:false,error:'感受資料不合法'};
    if(s.person.skills===undefined)s.person.skills=freshSkills();
    if(!s.person.skills || Array.isArray(s.person.skills) || Object.keys(SKILLS).some(id=>!Number.isFinite(s.person.skills[id]) || s.person.skills[id]<0 || s.person.skills[id]>(SKILLS[id].cap??SKILLS[id].thresholds.at(-1))))return {ok:false,error:'技能資料不合法'};
    const p = s.person, t = p.task, c = p.carry;
    if(p.order!==null&&(typeof p.order!=='string'||!Object.hasOwn(ACTIONS,p.order)))return {ok:false,error:'人物指派不合法'};
    if(s.mode==='solo'&&(!Array.isArray(p.pos)||p.pos[0]<0||p.pos[0]>900||p.pos[1]<0||p.pos[1]>560))return {ok:false,error:'人物位置超出家園範圍'};
    if (!Number.isFinite(s.t) || s.t < 0 || s.day !== 1 + Math.floor(s.t / DAY) || !Array.isArray(p.pos) || p.pos.length !== 2 || p.pos.some((x) => !Number.isFinite(x)) || !Number.isFinite(p.hunger) || p.hunger < 0 || p.hunger > 100 || !Number.isFinite(p.energy) || p.energy < 0 || p.energy > 100 || !Number.isInteger(p.herbalSkill) || p.herbalSkill < 0 || !Number.isInteger(p.careDay) || p.careDay < 0 || p.careDay > s.day || typeof p.name !== 'string' || !['quiet', 'sociable', 'diligent'].includes(p.personality)) return { ok: false, error: '存檔狀態不合法' };
    if (['berries', 'wood', 'seeds', 'veg', 'meal', 'herbs'].some((k) => !Number.isInteger(s.stock[k]) || s.stock[k] < 0 || !Number.isInteger(s.cap[k]) || s.cap[k] < 1 || s.stock[k] > s.cap[k]) || ![0, 1, 2].includes(s.fac.hut.stage) || BUILDABLE.filter(k=>k!=='hut').some((k) => !Number.isInteger(s.fac[k]?.stage)||!FACILITIES[k].stages[s.fac[k]?.stage]) || !['empty', 'growing', 'ripe'].includes(s.plot.state) || !Number.isFinite(s.plot.growth) || !['empty', 'growing', 'ripe'].includes(s.herbPlot?.state) || !Number.isFinite(s.herbPlot.growth) || (s.fac.herbGarden.stage === 0 && s.herbPlot.state !== 'empty')) return { ok: false, error: '存檔資源不合法' };
    if (['berries', 'wood', 'herbs'].some((k) => !Number.isFinite(s.wild[k]) || s.wild[k] < 0 || s.wild[k] > (k === 'herbs' ? 3 : 4) || s.fac[k]?.stage !== 0)) return { ok: false, error: '野外資源不合法' };
    for(const[id,n]of Object.entries({workbench:1,kitchen:2,bed:2}))if(s.fac[id].stage>=n&&buildAccess(s,id,n))return {ok:false,error:'新設施前置不合法'};
    const v = s.visitor, h = s.helper;
    if (!v || v.name !== '阿蓮' || !['visitor', 'helper', 'apprentice'].includes(v.role) || !Number.isInteger(v.trust) || v.trust < 0 || ['lastChat', 'lastGift', 'inviteDay', 'apprenticeDay', 'careDay'].some((k) => !Number.isInteger(v[k]) || v[k] < 0 || v[k] > s.day) || !Number.isInteger(v.herbalSkill) || v.herbalSkill < 0 || !Number.isFinite(v.inviteTime) || v.inviteTime < 0 || v.inviteTime > s.t || [v.hunger, v.energy].some((x) => !Number.isFinite(x) || x < 0 || x > 100) || typeof v.cared !== 'boolean' || typeof v.injury !== 'boolean' || typeof v.willing !== 'boolean' || !s.leases || !['wood', 'garden', 'herbGarden'].every((k) => [null, 'person', 'helper'].includes(s.leases[k])) || (!!h !== (v.role !== 'visitor'))) return { ok: false, error: '訪客與共居狀態不合法' };
    if (h && (h.name !== v.name || !Array.isArray(h.pos) || h.pos.length !== 2 || h.pos.some((x) => !Number.isFinite(x)) || !Number.isFinite(h.hunger) || h.hunger < 0 || h.hunger > 100 || !Number.isFinite(h.energy) || h.energy < 0 || h.energy > 100 || !Number.isInteger(h.herbalSkill) || h.herbalSkill < 0 || !Number.isInteger(h.careDay) || h.careDay < 0 || h.careDay > s.day || ![null, 'chop', 'farm', 'herbFarm'].includes(h.order) || (h.order === 'herbFarm' && v.role !== 'apprentice') || typeof h.leaving !== 'boolean' || !Number.isFinite(h.work) || h.work < 0 || !Number.isInteger(h.leisure) || h.leisure < 0)) return { ok: false, error: '幫手狀態不合法' };
    for (const key of ['wood', 'garden', 'herbGarden']) {
      const act = key === 'wood' ? 'chop' : key === 'garden' ? 'farm' : 'herbFarm';
      if (s.leases[key] !== (p.task?.act === act ? 'person' : h?.task?.act === act ? 'helper' : null) || (p.task?.act === act && h?.task?.act === act)) return { ok: false, error: '地塊預約不合法' };
    }
    if (['berries', 'wood', 'veg', 'herbs'].some((k) => s.stock[k] + inbound(s, k) > s.cap[k])) return { ok: false, error: '在途物資超過容量' };
    for (const id of BUILDABLE) {
      const v = s.fac[id].site; if (!v) continue;
      v.paused ??= false;if(typeof v.paused!=='boolean')return {ok:false,error:'工程暫停狀態不合法'};
      const recipe = FACILITIES[id].stages[s.fac[id].stage + 1];
      v.crafted??=0;v.assemblyAt??=null;
      if(!Number.isFinite(v.crafted)||v.crafted<0||v.crafted>(recipe?.craft||0)||v.work>v.workNeed||buildAccess(s,id,s.fac[id].stage+1)||(v.assemblyAt!==null&&(!Array.isArray(v.assemblyAt)||v.assemblyAt.length!==2||v.assemblyAt.some(x=>!Number.isFinite(x))||v.assemblyAt[0]<0||v.assemblyAt[0]>900||v.assemblyAt[1]<0||v.assemblyAt[1]>560))||!!(recipe?.craft&&v.crafted===recipe.craft)!==(v.assemblyAt!==null))return {ok:false,error:'加工工程資料不合法'};
      if (!recipe || v.need?.wood !== recipe.cost.wood || v.workNeed !== recipe.work || !Number.isFinite(v.work) || v.work < 0 || !Number.isFinite(v.workNeed) || v.workNeed <= 0 || ['need', 'delivered', 'reserved'].some((field) => !v[field] || !Number.isInteger(v[field].wood) || v[field].wood < 0) || v.delivered.wood + v.reserved.wood > v.need.wood) return { ok: false, error: '工地資料不合法' };
      const inTransit = t?.act === 'build' && t.phase === 'deliver' && t.place === id && c?.origin === 'site' && c.kind === 'wood' ? c.amount : 0;
      if (v.reserved.wood !== inTransit) return { ok: false, error: '工地預約與在途材料不符' };
    }
    if (c && (!['berries', 'wood', 'veg', 'herbs'].includes(c.kind) || !Number.isInteger(c.amount) || c.amount < 1 || !['wild', 'site'].includes(c.origin) || (c.bonus && (Object.keys(c.bonus).length !== 1 || ![1, 2].includes(c.bonus.seeds) || !['berries', 'veg'].includes(c.kind))))) return { ok: false, error: '背包資料不合法' };
    if (t) {
      if (!Number.isFinite(t.timer) || t.timer < 0 || !['go', 'do', 'fetch', 'deliver'].includes(t.phase)) return { ok: false, error: '任務資料不合法' };
      if (t.act === 'return') { if (t.phase !== 'go' || t.place !== 'home' || !c) return { ok: false, error: '返回任務不合法' }; }
      else if (t.act === 'build') {
        if (!BUILDABLE.includes(t.place) || !s.fac[t.place].site || s.fac[t.place].site.paused || !['go', 'do', 'fetch', 'deliver'].includes(t.phase) || (['fetch', 'deliver'].includes(t.phase) && t.mat !== 'wood') || (t.phase === 'fetch' && c) || (t.phase === 'deliver' && !(c?.origin === 'site' && c.kind === 'wood'))) return { ok: false, error: '建造任務不合法' };
      } else {
        if (!ACTIONS[t.act] || (t.act === 'leisure' ? !(t.place === 'home' || t.place === 'bench' && s.fac.bench.stage === 1) : t.place !== ACTIONS[t.act].place) || !['go', 'do'].includes(t.phase) || (t.act === 'farm' && !offers(s, 'garden', 'farm')) || (t.act === 'herbFarm' && !offers(s, 'herbGarden', 'herbFarm')) || (t.act === 'cook' && !offers(s, 'kitchen', 'cook'))) return { ok: false, error: '活動任務不合法' };
      }
    }
    if(t?.act==='build'&&t.step!==undefined&&(t.place!=='bed'||s.fac.bed.stage!==1||!['craft','pickup','install'].includes(t.step)||!['go','do'].includes(t.phase)||t.step==='craft'&&s.fac.bed.site.crafted>=12||t.step!=='craft'&&!s.fac.bed.site.assemblyAt))return {ok:false,error:'床鋪加工任務不合法'};
    if(t?.act==='build'&&t.place==='bed'&&s.fac.bed.stage===1){
      const v=s.fac.bed.site;
      if(v.crafted>0&&v.delivered.wood!==v.need.wood||v.work>0&&(v.crafted!==12||!at({pos:v.assemblyAt||[]},PLACES.bed)))return {ok:false,error:'床部件與安裝進度不符'};
      if(['go','do'].includes(t.phase)&&(!t.step||v.delivered.wood!==v.need.wood||t.step==='pickup'&&t.phase==='do'||t.step==='craft'&&t.phase==='do'&&!at(p,PLACES.workbench)||t.step==='install'&&(!at({pos:v.assemblyAt},p.pos)||t.phase==='do'&&!at(p,PLACES.bed))))return {ok:false,error:'床鋪加工位置不合法'};
    }
    if(t?.act==='cook'&&((t.recipe!==undefined&&recipeAccess(s,t.recipe))||(t.manual!==undefined&&typeof t.manual!=='boolean')||t.manual&&s.person.cookRequest!==t.recipe))return {ok:false,error:'料理任務不合法'};
    if(t?.act==='eat'&&t.foodId!==undefined&&t.foodId!==null&&!hasRecipe(t.foodId))return {ok:false,error:'用餐種類不合法'};
    if (c?.origin === 'site' && !(t?.act === 'build' && t.phase === 'deliver' && s.fac[t.place]?.site?.reserved[c.kind] === c.amount)) return { ok: false, error: '在途材料不合法' };
    if (h) {
      const ht = h.task, hc = h.carry;
      if (hc && (!['wood', 'berries', 'veg', 'herbs'].includes(hc.kind) || hc.origin !== 'wild' || (hc.kind === 'herbs' ? ![2, 3].includes(hc.amount) : hc.amount !== (hc.kind === 'veg' ? 2 : 1)) || (hc.bonus && (hc.kind !== 'veg' || Object.keys(hc.bonus).length !== 1 || hc.bonus.seeds !== 2)))) return { ok: false, error: '幫手背包不合法' };
      if (ht && (!['return', 'leave', 'eat', 'forage', 'chop', 'farm', 'herbFarm', 'rest', 'leisure'].includes(ht.act) || !['go', 'do'].includes(ht.phase) || !Number.isFinite(ht.timer) || ht.timer < 0 || (ht.act === 'leisure' ? !(ht.place === 'home' || ht.place === 'bench' && s.fac.bench.stage === 1) : ht.place !== (ht.act === 'return' || ht.act === 'eat' ? 'home' : ht.act === 'leave' ? 'visitor' : ACTIONS[ht.act]?.place)) || (ht.act === 'return' && !hc) || (ht.act === 'leave' && (!h.leaving || hc)) || (hc && ht.act !== 'return') || (ht.act === 'farm' && !offers(s, 'garden', 'farm')) || (ht.act === 'herbFarm' && (v.role !== 'apprentice' || !offers(s, 'herbGarden', 'herbFarm'))))) return { ok: false, error: '幫手任務不合法' };
    }
    s.unlocked ??= availableUnlocks(s);
    if(!Array.isArray(s.unlocked)||new Set(s.unlocked).size!==s.unlocked.length||s.unlocked.some(x=>!['食譜：蔬果拌食','食譜：家常燉菜','木作台','改良灶具','舒適床鋪'].includes(x)))return {ok:false,error:'解鎖紀錄不合法'};
    return { ok: true, state: s };
  } catch { return { ok: false, error: 'JSON 格式不合法' }; }
}
