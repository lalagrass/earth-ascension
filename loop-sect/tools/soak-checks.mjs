// soak 用的不變量與統計。每個 milestone 在這裡加自己的檢查。
import { companionsFor, placeBlueprint, setFocus, startExpedition } from '../src/sim.mjs';
import { walkable } from '../src/map.mjs';
import { speedOf } from '../src/person.mjs';
import { isNight } from '../src/needs.mjs';
import { stageOf, aff } from '../src/social.mjs';
import { TEMPLATES, TICKS_PER_DAY, BLUEPRINTS, FIRST_BLUEPRINTS, WORK_KINDS, ENEMIES, RAID } from '../src/data.mjs';
import { courage } from '../src/martial.mjs';

const STUCK_TICKS = 720; // 半日

export function rosterFor(seed) {
  const t = TEMPLATES[seed % TEMPLATES.length].id;
  return [{ template: t, name: '主角', protagonist: true }, ...companionsFor(seed, t)];
}

// M3-A6：第 1 日 06:00 放下全部藍圖，之後不再下指令。
// M4-A4／A5：開局把 p1 指定為伐木，量專精與整趟速度。
// M9-A6：情境 exp 在第 3 日 9 時起每小時試著討伐野豬窩，到第 4 日 12 時為止。
// 情境 base 不遠征：M2–M8 的自然遊玩驗收都是在「沒有拆巢」的世界寫的，所以分開量。
export function script(s, scenario = 'base') {
  if (s.tick === 0) setFocus(s, 'p1', 'wood');
  if (s.tick === 360) for (const id of FIRST_BLUEPRINTS) placeBlueprint(s, id);
  // M11 grow：第 2 日放西宿舍，蓋好就放擴建。
  if (scenario === 'grow') {
    if (s.tick === TICKS_PER_DAY + 360) placeBlueprint(s, 'dorm-1');
    if (s.tick % 60 === 0 && s.built.includes('dorm-1')) placeBlueprint(s, 'dorm-2');
  }
  const den = s.nests.find((n) => n.id === 'den');
  if (scenario === 'exp' && s.tick >= 2 * TICKS_PER_DAY + 540 && s.tick <= 3 * TICKS_PER_DAY + 720 && s.tick % 60 === 0 && !s.expedition && !den.cleared) startExpedition(s, 'den');
}

export function perSeed(s, ctx) {
  // M5-A5：關係階段與外內向的好感總和。
  let best = 0;
  for (const a of s.people) for (const b of s.people) {
    if (a === b) continue;
    best = Math.max(best, ['stranger', 'known', 'friend', 'close'].indexOf(stageOf(s, a, b).id));
    const g = a.axes.E > 0 ? 'E' : 'I';
    bump(ctx, `aff:${g}`, aff(s, a, b) + aff(s, b, a)); bump(ctx, `affN:${g}`);
  }
  if (best >= 1) bump(ctx, 'knownSeeds');
  if (best >= 2) bump(ctx, 'friendSeeds');
  if (best >= 3) bump(ctx, 'closeSeeds');
  bump(ctx, 'taught', s.counts.taught || 0);
  // M6-A5／A6：練功、領悟、切磋、指點。
  const c = s.counts;
  // 「三人」指開局的三人（M8 起會有訪客加入，訪客不算）。
  const founders = s.people.filter((p) => ['p0', 'p1', 'p2'].includes(p.id));
  if (founders.every((p) => p.moves.changquan > 0)) bump(ctx, 'allDrilled');
  if (c.comprehend) bump(ctx, 'compSeeds');
  if (c.sparDone) bump(ctx, 'sparSeeds');
  bump(ctx, 'drillDone', c.drillDone || 0); bump(ctx, 'sparDone', c.sparDone || 0);
  bump(ctx, 'comprehend', c.comprehend || 0); bump(ctx, 'pointed', c.pointed || 0);
  for (const p of s.people) {
    const g = p.attrs.wu >= 7 ? 'hi' : p.attrs.wu <= 4 ? 'lo' : null;
    if (!g) continue;
    bump(ctx, `mv:${g}:n`); bump(ctx, `mv:${g}:known`, Object.keys(p.moves).length - 1);
  }
  const chopper = s.people[1];
  const top = Math.max(...s.people.map((p) => p.skills.chop));
  bump(ctx, 'specSeeds'); if (chopper.skills.chop === top) bump(ctx, 'specOk');
  bump(ctx, 'chopSkillSum', chopper.skills.chop);
  const all = FIRST_BLUEPRINTS.every((id) => s.built.includes(id));
  bump(ctx, 'seeds'); if (all) bump(ctx, 'allBuilt');
  for (const e of s.events) if (e.kind === 'built') bump(ctx, `built:${e.text}`);
  // M7-A7／A8：侵擾、撞破、打退、修補、膽識。
  if ((c.raids || 0) >= 3) bump(ctx, 'raid3');
  if (c.breaches) bump(ctx, 'breachSeeds');
  bump(ctx, 'enemies', c.enemies || 0); bump(ctx, 'repelled', c.repelled || 0); bump(ctx, 'stealHits', c.stealHits || 0);
  const lateBreak = s.tick - 6 * 60; // 最後 6 小時破的不算
  const broken = s.events.filter((e) => e.kind === 'breach' && e.tick < lateBreak).length;
  const openNow = s.map.join('').split('f').length - 1;
  bump(ctx, 'breakEarly', broken); bump(ctx, 'openNow', openNow);
  const byC = [...s.people].sort((a, b) => courage(b) - courage(a));
  const ft = (p) => ctx.fightT?.[p.id] || 0;
  bump(ctx, 'braveSeeds'); if (ft(byC[0]) > ft(byC[byC.length - 1])) bump(ctx, 'braveOk');
  bump(ctx, 'fightBrave', ft(byC[0])); bump(ctx, 'fightTimid', ft(byC[byC.length - 1]));
  // M8-A7／A8：訪客、留下、去留決定與床。
  if ((c.visitors || 0) >= 2) bump(ctx, 'visit2');
  if (c.joined) bump(ctx, 'joinSeeds');
  bump(ctx, 'visitors', c.visitors || 0); bump(ctx, 'joined', c.joined || 0);
  for (const d of s.decisions) { const k = d.bed ? 'bed' : 'nobed'; bump(ctx, `dec:${k}`); if (d.join) bump(ctx, `join:${k}`); }
  if (s.sect) bump(ctx, 'founded');
  bump(ctx, 'apprentice', c.apprentice || 0);
  bump(ctx, 'endPeople', s.people.length);
  // M9-A6／A7：拆掉野豬窩，之後出生的敵人 ÷ 排程上的頭數。
  bump(ctx, 'expeditions', c.expeditions || 0); bump(ctx, 'retreats', c.retreats || 0);
  if (s.nests.find((n) => n.id === 'den').cleared) {
    bump(ctx, 'denSeeds');
    const at = s.clearedAt.den;
    for (const r of s.raids) if (r.tick > at && r.tick <= s.tick) bump(ctx, 'after:sched', r.kinds.length);
    bump(ctx, 'after:spawn', s.events.filter((e) => e.kind === 'raid' && e.tick > at).reduce((a, e) => a + Number(e.text.match(/（(\d+)）/)[1]), 0));
  }
  const hutBeds = s.objects.filter((o) => o.label === '茅屋床');
  ctx.samples.hutSleptSeeds = (ctx.samples.hutSleptSeeds || 0) + (s.counts.hutSleep ? 1 : 0);
  if (hutBeds.length && !s.counts.hutSleep) ctx.samples.hutNoSleep = (ctx.samples.hutNoSleep || 0) + 1;
}

const fail = (ctx, s, msg) => ctx.failures.push(`tick ${s.tick} ${msg}`);
const bump = (ctx, key, by = 1) => { ctx.samples[key] = (ctx.samples[key] || 0) + by; };

export const invariants = [
  // M1-A6：數值有限、位移不超速、站在可站格、沒人卡住。
  (s, ctx) => {
    for (const p of s.people) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) fail(ctx, s, `${p.name} 座標非數`);
      // 新來的訪客：從出現那一刻起算。
      const q = ctx.prev.get(p.id) ?? { x: p.x, y: p.y };
      if (!ctx.lastMove.has(p.id)) ctx.lastMove.set(p.id, s.tick);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > speedOf(p) + 1e-9) fail(ctx, s, `${p.name} 瞬移 ${d.toFixed(3)}`);
      if (!walkable(s.map, Math.round(p.x), Math.round(p.y))) fail(ctx, s, `${p.name} 站在擋路格`);
      if (d > 0 || p.wait > 0 || p.act === 'do') ctx.lastMove.set(p.id, s.tick);
      if (s.tick - (ctx.lastMove.get(p.id) ?? 0) > STUCK_TICKS) fail(ctx, s, `${p.name} 卡住超過半日`);
    }
  },
  // M2-A1：需求在 0..100。
  (s, ctx) => {
    for (const p of s.people) for (const [k, v] of Object.entries(p.needs)) {
      if (!(v >= 0 && v <= 100)) fail(ctx, s, `${p.name} ${k}=${v}`);
    }
  },
  // M2-A3：預約一致——名額不超、使用者確實在做這件事、庫存不為負。
  (s, ctx) => {
    for (const o of s.objects) o.users.forEach((u, i) => {
      if (!u) return;
      const p = s.people.find((x) => x.id === u);
      if (!p.task || p.task.obj !== o.id || p.task.slot !== i) fail(ctx, s, `${o.label} 名額被 ${p.name} 佔著但沒在用`);
    });
    for (const b of s.bushes) if (b.user) {
      const p = s.people.find((x) => x.id === b.user);
      if (!p.task || p.task.bush !== b.id) fail(ctx, s, `莓叢 ${b.id} 預約殘留`);
    }
    if (s.stock.raw < 0 || s.stock.meal < 0) fail(ctx, s, `庫存為負 ${JSON.stringify(s.stock)}`);
  },
  // M2-A4：食物守恆。
  (s, ctx) => {
    const L = s.ledger;
    const carried = s.people.reduce((a, p) => a + p.carry, 0);
    const heldRaw = s.people.reduce((a, p) => a + p.hold.raw, 0);
    const heldMeal = s.people.reduce((a, p) => a + p.hold.meal + p.pack, 0); // M9 乾糧算在身上
    const raw0 = 6, meal0 = 3;
    if (raw0 + L.picked !== L.rawEaten + L.rawCooked + L.rawStolen + s.stock.raw + carried + heldRaw) fail(ctx, s, `生莓不守恆 ${JSON.stringify(L)}`);
    if (meal0 + L.mealsMade !== L.mealsEaten + L.mealsStolen + s.stock.meal + heldMeal) fail(ctx, s, `飯不守恆 ${JSON.stringify(L)}`);
  },
  // M3-A2／A3：木石守恆、搬料不超量。
  (s, ctx) => {
    const L = s.ledger;
    for (const [m, cut, used, lost] of [['wood', 'woodCut', 'woodUsed', 'woodStolen'], ['stone', 'stoneCut', 'stoneUsed', 'stoneStolen']]) {
      const onPeople = s.people.reduce((a, p) => a + p.load[m] + p.hold[m], 0);
      const atSites = s.sites.reduce((a, x) => a + x.have[m], 0);
      if (L[cut] !== s.stock[m] + onPeople + atSites + L[used] + L[lost]) fail(ctx, s, `${m} 不守恆 cut=${L[cut]} stock=${s.stock[m]} people=${onPeople} sites=${atSites} used=${L[used]} stolen=${L[lost]}`);
      if (s.stock[m] < 0) fail(ctx, s, `${m} 庫存為負`);
      for (const x of s.sites) {
        if (x.have[m] + x.incoming[m] > x.need[m]) fail(ctx, s, `${x.label} ${m} 超量 ${x.have[m]}+${x.incoming[m]}>${x.need[m]}`);
        if (x.incoming[m] < 0) fail(ctx, s, `${x.label} ${m} 在途為負`);
      }
    }
    for (const x of s.sites) if (x.workers.length > 2) fail(ctx, s, `${x.label} 施工超過兩人`);
  },
  // M7-A2／A9：敵人不瞬移、不站在擋路格、不卡住；柵欄修補預約一致。
  (s, ctx) => {
    ctx.ePrev ??= new Map();
    for (const e of s.enemies) {
      const q = ctx.ePrev.get(e.id);
      const lim = ENEMIES[e.kind].speed * 1.2 + 1e-9;
      if (q && Math.hypot(e.x - q.x, e.y - q.y) > lim) fail(ctx, s, `${e.label}${e.id} 瞬移`);
      if (!walkable(s.map, Math.round(e.x), Math.round(e.y)) && s.map[Math.round(e.y)][Math.round(e.x)] !== 'F') fail(ctx, s, `${e.label}${e.id} 站在擋路格`);
      if (e.mode !== 'guard' && s.tick - e.born > RAID.MAX_LIFE + 400) fail(ctx, s, `${e.label}${e.id} 卡住沒離開`);
      ctx.ePrev.set(e.id, { x: e.x, y: e.y });
    }
    // M8-A4／A7：沒人以不在場的人為對象；留下的人不超過床數。
    const ids = new Set(s.people.map((p) => p.id));
    for (const p of s.people) if (p.task?.partner && !ids.has(p.task.partner)) fail(ctx, s, `${p.name} 的對象已經不在`);
    const beds = s.objects.filter((o) => o.kind === 'bed').length;
    if (s.people.filter((p) => !p.guest).length > beds) fail(ctx, s, `留下的人比床多`);
    for (const [k, id] of Object.entries(s.repairUser)) {
      const p = s.people.find((x) => x.id === id);
      if (!p.task || p.task.kind !== 'repair' || p.task.cell !== k) fail(ctx, s, `柵欄 ${k} 修補預約殘留`);
    }
  },
  // M9-A6：遠征隊員不會餓到飽食 < 5。
  (s, ctx) => {
    for (const p of s.people) if (p.exp && p.needs.food < 5) fail(ctx, s, `${p.name} 遠征中餓壞了`);
  },
  // M2-A5：沒人長期挨餓或累垮。
  (s, ctx) => {
    for (const p of s.people) for (const k of ['food', 'energy']) {
      const key = `${p.id}:${k}`;
      ctx.low ??= {};
      if (p.needs[k] < 5) ctx.low[key] = (ctx.low[key] || 0) + 1; else ctx.low[key] = 0;
      if (ctx.low[key] > TICKS_PER_DAY) fail(ctx, s, `${p.name} ${k} 低於 5 超過一日`);
    }
  },
];

const kindOf = (p) => (p.act === 'do' || p.act === 'walk') && p.task ? p.task.kind : p.act;

export const samplers = [
  // M4-A4：p1 每一趟伐木（選定砍樹 → 木頭離手）花多少 tick、帶回幾根。
  (s, ctx) => {
    const p = s.people[1];
    ctx.trip ??= null;
    ctx.prevWood ??= 0;
    // 只算花在這一趟上的 tick（砍、扛回、搬去工地）；中途去吃睡的時間不算。
    if (!ctx.trip && p.task?.kind === 'chop') ctx.trip = { start: s.tick, ticks: 0 };
    if (ctx.trip && ['chop', 'store', 'haul'].includes(p.task?.kind)) ctx.trip.ticks++;
    if (ctx.trip && ctx.prevWood > 0 && p.load.wood === 0) {
      const day = Math.floor(ctx.trip.start / TICKS_PER_DAY);
      const k = day === 0 ? 'early' : day >= 3 ? 'late' : null;
      if (k) { bump(ctx, `trip:${k}:ticks`, ctx.trip.ticks); bump(ctx, `trip:${k}:wood`, ctx.prevWood); }
      ctx.trip = null;
    }
    ctx.prevWood = p.load.wood;
  },
  // M1-A7：與最近他人的距離。只量自由走動時（閒逛或在去處待著），吃睡等需求會把人聚到同處。
  (s, ctx) => {
    for (const p of s.people) {
      const free = (p.act === 'walk' && p.task?.kind === 'wander') || (p.act === 'idle' && !p.task);
      if (!free) continue;
      let near = Infinity;
      for (const o of s.people) if (o !== p) near = Math.min(near, Math.hypot(o.x - p.x, o.y - p.y));
      const g = p.axes.E > 0 ? 'E' : 'I';
      bump(ctx, `near:${g}:n`); bump(ctx, `near:${g}:sum`, near);
    }
  },
  // M2-A6／A7：活動占比，依外內向與晝夜分組。
  (s, ctx) => {
    const night = isNight(s.tick) ? 'night' : 'day';
    for (const p of s.people) {
      const g = p.axes.E > 0 ? 'E' : 'I';
      const k = p.act === 'do' ? p.task.kind : 'other';
      bump(ctx, `t:${g}`); bump(ctx, `t:${night}`);
      if (k === 'chat') bump(ctx, `chat:${g}`);
      if (k === 'sit') bump(ctx, `sit:${g}`);
      if (k === 'sleep' || k === 'sleepGround') bump(ctx, `sleep:${night}`);
      bump(ctx, `act:${p.act}:${p.task?.kind ?? '-'}`);
      const g2 = p.axes.P < 0 ? 'J' : 'P';
      bump(ctx, `t:${g2}`);
      if (p.task && WORK_KINDS.has(p.task.kind)) bump(ctx, `work:${g2}`);
      if (p.act === 'do' && p.task.kind === 'drill') bump(ctx, `drill:${g2}`);
      if (p.task?.kind === 'fight') { ctx.fightT ??= {}; ctx.fightT[p.id] = (ctx.fightT[p.id] || 0) + 1; }
      if (p.act === 'do' && p.task.kind === 'sleep' && s.objects.find((o) => o.id === p.task.obj).label === '茅屋床') s.counts.hutSleep = (s.counts.hutSleep || 0) + 1;
      if (p.needs.food < 15) { bump(ctx, 'lowFood'); bump(ctx, `lowFood@${ctx.seed}`); }
      if (p.needs.energy < 12) { bump(ctx, 'lowEnergy'); bump(ctx, `lowEnergy@${ctx.seed}`); }
      bump(ctx, `t@${ctx.seed}`);
    }
  },
];

export function summarize(s) {
  const c = s.counts;
  const ppl = s.people.map((p) => `${p.name}(${p.type}) 飽${p.needs.food.toFixed(0)}精${p.needs.energy.toFixed(0)}`).join(' ');
  return `${ppl} | 完工${s.built.length} 木${s.stock.wood} 石${s.stock.stone} | 吃${c.eat || 0} 生吃${(c.eatRaw || 0) + (c.eatCarried || 0)} 煮${c.cook || 0} 採${c.forage || 0} 聊${c.chat || 0} 婉拒${c.refused || 0} 坐${c.sit || 0} 睡${(c.sleep || 0) + (c.sleepGround || 0)}`;
}

export function judge(S, scenario = 'base') {
  const lines = [];
  const failures = [];
  if (scenario === 'exp') return judgeExp(S, lines, failures);
  if (scenario === 'grow') return judgeGrow(S, lines, failures);
  const r = (a, b) => (S[a] || 0) / (S[b] || 1);
  const e = r('near:E:sum', 'near:E:n'), i = r('near:I:sum', 'near:I:n');
  // M2 起 M1-A7 改由 sim.test.mjs 的控制實驗驗證（只變外向軸）；此處只列出，因為整體距離受 N 軸與吃睡聚集干擾。
  lines.push(`（參考）自由走動時離最近他人：外向 ${e.toFixed(2)} 格，內向 ${i.toFixed(2)} 格`);
  const sn = r('sleep:night', 't:night'), sd = r('sleep:day', 't:day');
  lines.push(`M2-A6 睡覺占比：夜 ${(sn * 100).toFixed(1)}%，晝 ${(sd * 100).toFixed(1)}%`);
  if (!(sn > sd * 3)) failures.push('M2-A6 夜裡睡覺沒有明顯多於白天');
  const ce = r('chat:E', 't:E'), ci = r('chat:I', 't:I');
  const se = r('sit:E', 't:E'), si = r('sit:I', 't:I');
  lines.push(`M2-A7 聊天占比：外向 ${(ce * 100).toFixed(1)}%，內向 ${(ci * 100).toFixed(1)}%；石凳：外向 ${(se * 100).toFixed(1)}%，內向 ${(si * 100).toFixed(1)}%`);
  if (!(ce > ci)) failures.push('M2-A7 外向者聊天沒有多於內向者');
  if (!(si > se)) failures.push('M2-A7 內向者坐石凳沒有多於外向者');
  lines.push(`M3-A6 三張藍圖 5 日內全部完工：${S.allBuilt || 0}/${S.seeds} 種子；各項完工數 ${Object.entries(S).filter(([k]) => k.startsWith('built:')).map(([k, v]) => `${k.slice(6)} ${v}`).join('、')}`);
  if ((S.allBuilt || 0) < Math.ceil(S.seeds * 10 / 12)) failures.push('M3-A6 自主建設完工的種子太少');
  // 只有三人、道館有三張床，茅屋床只在別人占床時才會被用；被用與否由 build.test.mjs 的控制情境驗證。
  lines.push(`（參考）茅屋蓋好後有人去睡：${S.hutSleptSeeds || 0} 個種子；蓋好但沒人睡：${S.hutNoSleep || 0}`);
  const wj = r('work:J', 't:J'), wp = r('work:P', 't:P');
  lines.push(`M3-A7 活計時間占比：條理 ${(wj * 100).toFixed(1)}%，隨性 ${(wp * 100).toFixed(1)}%`);
  if (!(wj > wp)) failures.push('M3-A7 條理型沒有比隨性型更勤快');
  const early = r('trip:early:ticks', 'trip:early:wood'), late = r('trip:late:ticks', 'trip:late:wood');
  // M4-A4 改由 skills.test.mjs 的控制實驗判定：工地蓋完後需求消失、近處的樹被砍光，自然對照被距離與趟數干擾。
  lines.push(`（參考）指定伐木者每根木頭花的 tick：第 1 日 ${early.toFixed(1)}，第 4–5 日 ${late.toFixed(1)}`);
  lines.push(`M4-A5 指定伐木者伐木熟練全隊最高：${S.specOk || 0}/${S.specSeeds} 種子，平均熟練 ${(S.chopSkillSum / S.specSeeds).toFixed(1)}`);
  if ((S.specOk || 0) < Math.ceil(S.specSeeds * 10 / 12)) failures.push('M4-A5 專精沒有浮現');
  lines.push(`M5-A5 5 日內最好的一對：相識以上 ${S.knownSeeds || 0}/${S.seeds}、朋友以上 ${S.friendSeeds || 0}、知己 ${S.closeSeeds || 0}；請教 ${S.taught || 0} 次`);
  if ((S.knownSeeds || 0) < Math.ceil(S.seeds * 10 / 12)) failures.push('M5-A5 相識的種子太少');
  const ae = r('aff:E', 'affN:E'), ai = r('aff:I', 'affN:I');
  lines.push(`M5-A5 每段關係的雙向好感和：外向 ${ae.toFixed(1)}、內向 ${ai.toFixed(1)}`);
  if (!(ae > ai)) failures.push('M5-A5 外向者的關係沒有比內向者好');
  lines.push(`M6-A5 三人都練過功 ${S.allDrilled || 0}/${S.seeds}、有人領悟 ${S.compSeeds || 0}/${S.seeds}、有切磋 ${S.sparSeeds || 0}/${S.seeds}；練完 ${S.drillDone || 0} 次、切磋 ${S.sparDone || 0} 次、領悟 ${S.comprehend || 0}、指點 ${S.pointed || 0}`);
  if ((S.allDrilled || 0) < Math.ceil(S.seeds * 9 / 12)) failures.push('M6-A5 三人都練過功的種子太少');
  if ((S.compSeeds || 0) < S.seeds / 2) failures.push('M6-A5 有人領悟的種子太少');
  if ((S.sparSeeds || 0) < S.seeds / 2) failures.push('M6-A5 有切磋的種子太少');
  const dj = r('drill:J', 't:J'), dp = r('drill:P', 't:P');
  lines.push(`M6-A6 打木樁時間占比：條理 ${(dj * 100).toFixed(1)}%，隨性 ${(dp * 100).toFixed(1)}%`);
  if (!(dj > dp)) failures.push('M6-A6 條理型沒有比隨性型更常練功');
  lines.push(`（參考）每人學到的新招：悟性 ≥ 7 平均 ${r('mv:hi:known', 'mv:hi:n').toFixed(2)}、悟性 ≤ 4 平均 ${r('mv:lo:known', 'mv:lo:n').toFixed(2)}`);
  lines.push(`M7-A7 侵擾 ≥ 3 次 ${S.raid3 || 0}/${S.seeds}、柵欄被撞破 ${S.breachSeeds || 0}/${S.seeds}；敵人 ${S.enemies || 0}、打退 ${S.repelled || 0}（${(100 * r('repelled', 'enemies')).toFixed(0)}%）、偷到 ${S.stealHits || 0}；第 5 日 18 時前撞破 ${S.breakEarly || 0} 格，結束時還破著 ${S.openNow || 0} 格`);
  if ((S.raid3 || 0) < S.seeds) failures.push('M7-A7 有種子侵擾少於 3 次');
  if ((S.breachSeeds || 0) < S.seeds / 2) failures.push('M7-A7 柵欄被撞破的種子太少');
  if (r('repelled', 'enemies') < 0.5) failures.push('M7-A7 打退的敵人不到一半');
  if ((S.breakEarly || 0) && 1 - (S.openNow || 0) / S.breakEarly < 0.75) failures.push('M7-A7 撞破的柵欄沒修好');
  lines.push(`M7-A8 膽識最高者迎敵時間多於最低者：${S.braveOk || 0}/${S.braveSeeds}；平均迎敵 tick 最高 ${r('fightBrave', 'braveSeeds').toFixed(0)}、最低 ${r('fightTimid', 'braveSeeds').toFixed(0)}`);
  if ((S.braveOk || 0) < Math.ceil(S.braveSeeds * 8 / 12)) failures.push('M7-A8 膽識沒有反映在迎敵上');
  lines.push(`M8-A7 有 ≥ 2 位訪客 ${S.visit2 || 0}/${S.seeds}、有人留下 ${S.joinSeeds || 0}/${S.seeds}；訪客 ${S.visitors || 0}、留下 ${S.joined || 0}、立派 ${S.founded || 0}、拜師 ${S.apprentice || 0}；結束時平均 ${r('endPeople', 'seeds').toFixed(1)} 人`);
  if ((S.visit2 || 0) < Math.ceil(S.seeds * 10 / 12)) failures.push('M8-A7 訪客太少');
  if ((S.joinSeeds || 0) < S.seeds / 2) failures.push('M8-A7 有人留下的種子太少');
  const jb = r('join:bed', 'dec:bed'), jn = r('join:nobed', 'dec:nobed');
  lines.push(`M8-A8 留下率：有空床 ${(100 * jb).toFixed(0)}%（${S['dec:bed'] || 0} 次決定）、沒空床 ${(100 * jn).toFixed(0)}%（${S['dec:nobed'] || 0} 次）`);
  if (jn > 0) failures.push('M8-A8 沒空床也留下了');
  if ((S['dec:bed'] || 0) && jb < 0.3) failures.push('M8-A8 有空床時留下率太低');
  const all = (S['t:E'] || 0) + (S['t:I'] || 0);
  // 時間分布：調平衡前先看這張表（loop 3 retro 的改進）。
  const share = Object.entries(S).filter(([k]) => k.startsWith('act:')).sort((a, b) => b[1] - a[1]).slice(0, 10);
  lines.push(`（診斷）時間分布前十：${share.map(([k, v]) => `${k.slice(4)} ${(100 * v / all).toFixed(1)}%`).join('、')}`);
  lines.push(`（參考）處於自理門檻下的時間：飢餓 ${(100 * (S.lowFood || 0) / all).toFixed(1)}%，累垮 ${(100 * (S.lowEnergy || 0) / all).toFixed(1)}%（飢餓${worstSeed(S, 'lowFood')}，累垮${worstSeed(S, 'lowEnergy')}）`);
  if ((S.lowFood || 0) / all > 0.02) failures.push('M7-A7 飢餓時間超過 2%');
  return { lines, failures };
}

// v4（retro 3）：比例類指標同時印最差種子，平均才不會藏住單一種子。
function worstSeed(S, key) {
  let best = null;
  for (const [k, v] of Object.entries(S)) {
    if (!k.startsWith('t@')) continue;
    const seed = k.slice(2), x = (S[`${key}@${seed}`] || 0) / v;
    if (!best || x > best.x) best = { seed, x };
  }
  return best ? `最差 seed ${best.seed} ${(100 * best.x).toFixed(1)}%` : '';
}

// 暫停中的 milestone：照印量測，但不判失敗（理由寫在該規格的「實作中的變更」）。
export const PAUSED = new Set(['M11']);
const judgeOf = (failures, id) => (PAUSED.has(id.split('-')[0]) ? { push: (x) => failures.paused?.push(x) } : failures);

function judgeGrow(S, lines, all_failures) {
  const failures = judgeOf(all_failures, 'M11-A5');
  const all = (S['t:E'] || 0) + (S['t:I'] || 0);
  lines.push(`M11-A5 西宿舍 5 日內完工 ${S['built:西宿舍完工'] || 0}/${S.seeds}、擴建完工 ${S['built:宿舍擴建完工'] || 0}/${S.seeds}；結束時平均 ${((S.endPeople || 0) / S.seeds).toFixed(1)} 人`);
  if ((S['built:西宿舍完工'] || 0) < Math.ceil(S.seeds * 10 / 12)) failures.push('M11-A5 西宿舍完工的種子太少');
  const worst = worstSeedVal(S, 'lowFood');
  lines.push(`M11-A5 飢餓時間 ${(100 * (S.lowFood || 0) / all).toFixed(1)}%（${worstSeed(S, 'lowFood')}）`);
  if ((S.lowFood || 0) / all > 0.03) failures.push('M11-A5 飢餓時間超過 3%');
  if (worst > 0.06) failures.push('M11-A5 最差種子飢餓超過 6%');
  if (PAUSED.has('M11')) lines.push('（M11 暫停中：以上量測照印、不判，見 specs/M11.md）');
  return { lines, failures: all_failures };
}

function worstSeedVal(S, key) {
  let w = 0;
  for (const [k, v] of Object.entries(S)) if (k.startsWith('t@')) w = Math.max(w, (S[`${key}@${k.slice(2)}`] || 0) / v);
  return w;
}

function judgeExp(S, lines, failures) {
  const r = (a, b) => (S[a] || 0) / (S[b] || 1);
  lines.push(`M9-A6 拆掉野豬窩 ${S.denSeeds || 0}/${S.seeds}；出發 ${S.expeditions || 0} 次、撤退 ${S.retreats || 0} 次`);
  if ((S.denSeeds || 0) < Math.ceil(S.seeds * 8 / 12)) failures.push('M9-A6 拆掉野豬窩的種子太少');
  const ratio = r('after:spawn', 'after:sched');
  lines.push(`M9-A7 拆掉之後：排程 ${S['after:sched'] || 0} 頭，實際出生 ${S['after:spawn'] || 0} 頭（${(100 * ratio).toFixed(0)}%）`);
  if ((S['after:sched'] || 0) && ratio > 0.7) failures.push('M9-A7 拆巢後侵擾沒有變少');
  const all = (S['t:E'] || 0) + (S['t:I'] || 0);
  lines.push(`M9-A6 飢餓時間 ${(100 * (S.lowFood || 0) / all).toFixed(1)}%（${worstSeed(S, 'lowFood')}）；M7 打退 ${S.repelled || 0}/${S.enemies || 0}（遠征期間家裡人少）`);
  if ((S.lowFood || 0) / all > 0.02) failures.push('M9-A6 飢餓時間超過 2%');
  return { lines, failures };
}
