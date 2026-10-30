// soak 用的不變量與統計。每個 milestone 在這裡加自己的檢查。
import { companionsFor, placeBlueprint, setFocus } from '../src/sim.mjs';
import { walkable } from '../src/map.mjs';
import { speedOf } from '../src/person.mjs';
import { isNight } from '../src/needs.mjs';
import { stageOf, aff } from '../src/social.mjs';
import { TEMPLATES, TICKS_PER_DAY, BLUEPRINTS, WORK_KINDS } from '../src/data.mjs';

const STUCK_TICKS = 720; // 半日

export function rosterFor(seed) {
  const t = TEMPLATES[seed % TEMPLATES.length].id;
  return [{ template: t, name: '主角', protagonist: true }, ...companionsFor(seed, t)];
}

// M3-A6：第 1 日 06:00 放下全部藍圖，之後不再下指令。
// M4-A4／A5：開局把 p1 指定為伐木，量專精與整趟速度。
export function script(s) {
  if (s.tick === 0) setFocus(s, 'p1', 'wood');
  if (s.tick === 360) for (const b of BLUEPRINTS) placeBlueprint(s, b.id);
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
  if (s.people.every((p) => p.moves.changquan > 0)) bump(ctx, 'allDrilled');
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
  const all = s.built.length === BLUEPRINTS.length;
  bump(ctx, 'seeds'); if (all) bump(ctx, 'allBuilt');
  for (const e of s.events) if (e.kind === 'built') bump(ctx, `built:${e.text}`);
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
      const q = ctx.prev.get(p.id);
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
    const heldMeal = s.people.reduce((a, p) => a + p.hold.meal, 0);
    const raw0 = 6, meal0 = 3;
    if (raw0 + L.picked !== L.rawEaten + L.rawCooked + s.stock.raw + carried + heldRaw) fail(ctx, s, `生莓不守恆 ${JSON.stringify(L)}`);
    if (meal0 + L.mealsMade !== L.mealsEaten + s.stock.meal + heldMeal) fail(ctx, s, `飯不守恆 ${JSON.stringify(L)}`);
  },
  // M3-A2／A3：木石守恆、搬料不超量。
  (s, ctx) => {
    const L = s.ledger;
    for (const [m, cut, used] of [['wood', 'woodCut', 'woodUsed'], ['stone', 'stoneCut', 'stoneUsed']]) {
      const onPeople = s.people.reduce((a, p) => a + p.load[m] + p.hold[m], 0);
      const atSites = s.sites.reduce((a, x) => a + x.have[m], 0);
      if (L[cut] !== s.stock[m] + onPeople + atSites + L[used]) fail(ctx, s, `${m} 不守恆 cut=${L[cut]} stock=${s.stock[m]} people=${onPeople} sites=${atSites} used=${L[used]}`);
      if (s.stock[m] < 0) fail(ctx, s, `${m} 庫存為負`);
      for (const x of s.sites) {
        if (x.have[m] + x.incoming[m] > x.need[m]) fail(ctx, s, `${x.label} ${m} 超量 ${x.have[m]}+${x.incoming[m]}>${x.need[m]}`);
        if (x.incoming[m] < 0) fail(ctx, s, `${x.label} ${m} 在途為負`);
      }
    }
    for (const x of s.sites) if (x.workers.length > 2) fail(ctx, s, `${x.label} 施工超過兩人`);
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
      if (p.act === 'do' && p.task.kind === 'sleep' && s.objects.find((o) => o.id === p.task.obj).label === '茅屋床') s.counts.hutSleep = (s.counts.hutSleep || 0) + 1;
      if (p.needs.food < 15) bump(ctx, 'lowFood');
      if (p.needs.energy < 12) bump(ctx, 'lowEnergy');
    }
  },
];

export function summarize(s) {
  const c = s.counts;
  const ppl = s.people.map((p) => `${p.name}(${p.type}) 飽${p.needs.food.toFixed(0)}精${p.needs.energy.toFixed(0)}`).join(' ');
  return `${ppl} | 完工${s.built.length} 木${s.stock.wood} 石${s.stock.stone} | 吃${c.eat || 0} 生吃${(c.eatRaw || 0) + (c.eatCarried || 0)} 煮${c.cook || 0} 採${c.forage || 0} 聊${c.chat || 0} 婉拒${c.refused || 0} 坐${c.sit || 0} 睡${(c.sleep || 0) + (c.sleepGround || 0)}`;
}

export function judge(S) {
  const lines = [];
  const failures = [];
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
  const all = (S['t:E'] || 0) + (S['t:I'] || 0);
  // 時間分布：調平衡前先看這張表（loop 3 retro 的改進）。
  const share = Object.entries(S).filter(([k]) => k.startsWith('act:')).sort((a, b) => b[1] - a[1]).slice(0, 10);
  lines.push(`（診斷）時間分布前十：${share.map(([k, v]) => `${k.slice(4)} ${(100 * v / all).toFixed(1)}%`).join('、')}`);
  lines.push(`（參考）處於自理門檻下的時間：飢餓 ${(100 * (S.lowFood || 0) / all).toFixed(1)}%，累垮 ${(100 * (S.lowEnergy || 0) / all).toFixed(1)}%`);
  return { lines, failures };
}
