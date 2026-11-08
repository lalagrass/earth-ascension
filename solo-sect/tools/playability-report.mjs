#!/usr/bin/env node
// 可玩性檢查（擁有人 2026-11-08 選定）：各開局 × 12 種子 × 30 日，看玩家在每一天有沒有事可做、卡在哪裡。
// 兩種玩法：
//   natural：不下任何指令，只清掉畫面暫停（alert）；待決卡片由既有執事自動決定。
//   guided：照畫面提示操作——能立匾就立、待決卡片取自動建議、能收徒就收、有藍圖就蓋（一次一處）、能下山義學就去、每期市集打聽奇書。
// 預設步長 1 秒、每拍清 alert，是受控觀察，不是 0.25 秒的自然可達性證明。6 秒步長會把聊天等長活動的佔比放大數倍（20–37% 對 4–6%），不要拿來下結論。
// 用法：node tools/playability-report.mjs [solo-sect 目錄] [--days=30|90] [--seed=1001] [--seeds=12] [--step=1] [--admissions] [--diagnose]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { aggregateSegments, median, segmentReport } from './playability-segments.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.split('=')[1] : d; };
const root = path.resolve(process.argv.slice(2).find((x) => !x.startsWith('--')) || path.resolve(import.meta.dirname, '..'));
const imp = (f) => import(pathToFileURL(path.join(root, 'src', f)));
const { createState, tick, clone, scoreActs, canRecruit, recruit, buildWhy, startBuild, startSchoolTrip } = await imp('sim.mjs');
const { DAY, FACILITIES } = await imp('data.mjs');
const { canFoundHermitageSect, foundHermitageSect } = await imp('sect.mjs');
const { resolveChoice, autoPick } = await imp('hero.mjs');
const { askRareBookRumor } = await imp('rare-search.mjs');
const DAYS = arg('days', 30), SEEDS = arg('seeds', 12), STEP = arg('step', 1), START_SEED = arg('seed', 1001);
const DIAGNOSE = process.argv.includes('--diagnose');
const ADMISSIONS = process.argv.includes('--admissions');
const { moodParts } = DIAGNOSE ? await imp('social.mjs') : { moodParts: null };
const { observeAchievementFacts, achievementRecord } = await imp('achievement-record.mjs');
const { milestoneRows, MILESTONES } = await imp('milestones.mjs');
const { achievementRows, ACHIEVEMENTS } = await imp('achievements.mjs');

// 行動分類：玩家看得出「在做事」的類別。
const CAT = {
  grow: ['train', 'study', 'meditate', 'readBook', 'readRare', 'invent', 'learn', 'spar', 'pass', 'cliffTrain', 'waterfallTrain', 'cliffComprehend', 'searchFragment'],
  work: ['farm', 'chop', 'quarry', 'build', 'cook', 'forage', 'herb', 'repair', 'deliver', 'cliffForage1', 'cliffWater', 'water', 'haul', 'feed', 'teach'],
  out: ['foray', 'patrol', 'hunt', 'trial', 'defend', 'school'],
  care: ['eat', 'rest'],
  social: ['chat', 'encourage'],
  idle: ['leisure'],
};
const catOf = (act) => (act ? Object.entries(CAT).find(([, v]) => v.includes(act))?.[0] || `other:${act}` : 'none');
const TAGS = ['大成', '拳譜', '成親', '有喜', '出生', '成年', '立匾', '拜入', '慕名', '山賊', '傳聞', '奇書', '自創', '名俠', '會武', '巡山', '突破', '傳授', '餓', '重傷', '逐出', '離開'];

function play(opening, starterArt, seed, mode) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening, starterArt });
  observeAchievementFacts(s);
  const seen = new Set(), days = [], first = {}, moodSnapshots = [];
  const countedAdmissions = new Set(s.ds.map(d => d.id)), bornHere = new Set(); let admissions = 0;
  let day = null, cur = null, lastAsk = -1, lastHpSnapshot = [], seenRaids = s.threat?.n || 0; const lastAct = {};
  // 6 秒一拍時，十秒上下的活動常在同一拍內做完、要到下一拍才排新活，取樣時 task 是空的；這段時間記在剛做完的活上。
  const actOf = (d) => (d.task?.act ? (lastAct[d.id] = d.task.act) : lastAct[d.id]);
  for (let el = 0; el < DAYS * DAY; el += STEP) {
    tick(s, STEP); if (s.alert) s.alert = null;
    // 最後一拍可能剛跨到第 DAYS+1 日；該拍不屬於要求的報告窗口。
    if (s.day > DAYS) break;
    observeAchievementFacts(s, { canFound: canFoundHermitageSect(s).ok });
    if (mode === 'guided') {
      if (canFoundHermitageSect(s).ok) foundHermitageSect(s);
      for (const ch of [...(s.choices || [])]) resolveChoice(s, ch.id, autoPick(s, ch));
      if (canRecruit(s).ok) recruit(s);
      if (!Object.values(s.fac).some((f) => f.site)) { const f = FACILITIES.find((x) => s.fac[x.id] && !buildWhy(s, x.id)); if (f) startBuild(s, f.id); }
      if (!s.hermitage?.active && s.day !== lastAsk) { lastAsk = s.day; askRareBookRumor(s); startSchoolTrip(s); }
    }
    if (ADMISSIONS) for (const d of s.ds) {
      if (d.adult === false) bornHere.add(d.id);
      // 雇工日後正式拜師要計入；在山上出生的人即使長大也不是拜入。
      if (!countedAdmissions.has(d.id) && !bornHere.has(d.id) && d.role !== 'laborer' && d.adult !== false) {
        countedAdmissions.add(d.id); admissions++;
      }
    }
    if (day !== s.day) { if (cur) cur.hpMedian = median(lastHpSnapshot); day = s.day; const site = Object.values(s.fac).find((f) => f.site)?.site; cur = { day, hero: {}, all: {}, events: {}, people: s.ds.length, top: 0, choicesWaiting: (s.choices || []).length, famished: 0, lowMood: 0, samples: 0, siteHave: site ? site.delivered.wood + site.delivered.stone + site.work : null, veg: s.res.veg || 0, food: s.res.food || 0, raids: [] }; days.push(cur); }
    cur.veg = s.res.veg || 0; cur.food = s.res.food || 0;
    if ((s.threat?.n || 0) > seenRaids) {
      const n = s.threat.n;
      const boss = !!s.threat.pending?.boss;
      const rumorId = boss ? null : s.threat.usedRumors?.at(-1) ?? null;
      const rumor = s.rumors?.find(row => row.id === rumorId);
      cur.raids.push({ day: s.day, n, kind: boss ? 'boss' : 'bandit', rumorId, rumorKind: rumor?.kind || null });
      seenRaids = n;
    }
    for (const d of s.ds) { cur.samples++; if (d.famished) cur.famished++; if (d.mood < 35) cur.lowMood++; }
    if (DIAGNOSE && s.day % 15 === 0 && Math.round(s.t % DAY) === DAY - STEP)
      moodSnapshots.push({ day: s.day, stock: { ...s.res },
        band: s.band ? { state: s.band.state, hp: s.band.hp, max: s.band.max, day: s.band.day } : null,
        pending: s.threat?.pending ? { day: s.threat.pending.day, pts: s.threat.pending.pts } : null,
        people: s.ds.map(d => {
        const copy = clone(s), actor = copy.ds.find(x => x.id === d.id);
        return { id: d.id, mood: d.mood, hp: d.hp, needs: d.needs, task: d.task?.act || null,
          order: d.order || null, reason: d.reason || null, downUntil: d.downUntil || null,
          parts: moodParts(d, s), top: scoreActs(copy, actor).slice(0, 4).map(x => ({ act: x.act, score: x.score, why: x.why })) };
      }) });
    lastHpSnapshot = s.ds.map(d => d.hp);
    const h = s.ds.find((d) => d.id === 'hero');
    if (h) { const c = catOf(actOf(h)); cur.hero[c] = (cur.hero[c] || 0) + 1; }
    for (const d of s.ds) { const c = catOf(d === h ? lastAct[d.id] : actOf(d)); cur.all[c] = (cur.all[c] || 0) + 1; }
    for (const e of s.log) {
      const key = `${e.t}|${e.msg}`; if (seen.has(key)) continue; seen.add(key);
      if (e.tier === 'top') cur.top++;
      for (const t of TAGS) if (e.msg.includes(t)) cur.events[t] = (cur.events[t] || 0) + 1;
    }
  }
  for (const row of milestoneRows(achievementRecord(s))) if (row.day != null) first[row.id] = row.day;
  const achievement = achievementRows(achievementRecord(s), { showHidden: true }).map(a => ({ id: a.id, kind: a.kind, done: a.done, day: a.day }));
  if (cur) cur.hpMedian = median(lastHpSnapshot);
  const h = s.ds.find((d) => d.id === 'hero');
  // 「沒事的日子」：這一天沒有任何一則有標記的事件，且主角超過一半時間在閒晃或沒事。
  const dull = days.filter((d) => !Object.keys(d.events).length && ((d.hero.idle || 0) + (d.hero.none || 0)) > 0.5 * Object.values(d.hero).reduce((a, b) => a + b, 0)).map((d) => d.day);
  // 工地停工日：有工地，且這一天和前一天的已到料＋已施工完全沒變。
  const stall = days.filter((d, i) => i > 0 && d.siteHave != null && d.siteHave === days[i - 1].siteHave).length;
  const frac = (k) => +(days.reduce((a, d) => a + d[k], 0) / Math.max(1, days.reduce((a, d) => a + d.samples, 0))).toFixed(3);
  const share = (k) => +(days.reduce((a, d) => a + (d.hero[k] || 0), 0) / days.reduce((a, d) => a + Object.values(d.hero).reduce((x, y) => x + y, 0), 0)).toFixed(3);
  return { opening, starterArt, seed, mode, first, achievement, dull, dullDays: dull.length, siteStallDays: stall, famishedShare: frac('famished'), lowMoodShare: frac('lowMood'),
    ...(ADMISSIONS ? { admissions } : {}),
    ...(DIAGNOSE ? { moodSnapshots } : {}),
    ...(DAYS >= 15 ? { segments: segmentReport(days) } : {}),
    heroShare: Object.fromEntries(['grow', 'work', 'out', 'care', 'social', 'idle', 'none'].map((k) => [k, share(k)])),
    end: { day: s.day, people: s.ds.length, heroArts: Object.keys(h?.arts || {}), founded: !s.hermitage?.active, coin: s.res.coin, food: s.res.food, rumors: (s.rumors || []).length,
      facilities: Object.fromEntries(Object.entries(s.fac).filter(([, f]) => f.stage > 0).map(([k, f]) => [k, f.stage])), choicesWaiting: (s.choices || []).length,
      raids: s.threat?.n || 0, deaths: s.threat?.deaths || 0 },
    eventTotals: days.reduce((a, d) => { for (const [k, v] of Object.entries(d.events)) a[k] = (a[k] || 0) + v; return a; }, {}) };
}

const CASES = [['solo', 'chunyangFist'], ['solo', 'none'], ['xiaolongnv', 'chunyangFist'], ['huangrong', 'luohanHands']];
const rows = [];
for (const [opening, starter] of CASES) for (const mode of ['natural', 'guided']) for (let seed = START_SEED; seed < START_SEED + SEEDS; seed++) rows.push(play(opening, starter, seed, mode));
const med = median;
const reached = (g, k) => `${g.filter((r) => r.first[k] != null).length}/${g.length}`;
const summary = CASES.flatMap(([o, st]) => ['natural', 'guided'].map((m) => {
  const g = rows.filter((r) => r.opening === o && r.starterArt === st && r.mode === m);
  const keys = MILESTONES.map(m => m.id);
  return { case: `${o}/${st}/${m}`, dullDaysMedian: med(g.map((r) => r.dullDays)), siteStallDaysMedian: med(g.map((r) => r.siteStallDays)), famishedShareMedian: med(g.map((r) => r.famishedShare)), lowMoodShareMedian: med(g.map((r) => r.lowMoodShare)), heroShareMedian: Object.fromEntries(['grow', 'work', 'out', 'care', 'social', 'idle', 'none'].map((k) => [k, med(g.map((r) => r.heroShare[k]))])),
    ...(ADMISSIONS ? { admissionsMedian: med(g.map(r => r.admissions)) } : {}),
    reached: Object.fromEntries(keys.map((k) => [k, `${reached(g, k)}（中位第 ${med(g.map((r) => r.first[k])) ?? '—'} 日）`])),
    achievementRate: Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, `${g.filter(r => r.achievement.find(x => x.id === a.id)?.done).length}/${g.length}`])),
    endPeopleMedian: med(g.map((r) => r.end.people)), endArtsMedian: med(g.map((r) => r.end.heroArts.length)), choicesWaitingMax: Math.max(...g.map((r) => r.end.choicesWaiting)),
    ...(DAYS >= 15 ? { segments: aggregateSegments(g) } : {}) };
}));
console.log(JSON.stringify({ days: DAYS, seeds: SEEDS, secondsPerTick: STEP, alertPolicy: 'clear after each tick', scope: 'controlled C observation', summary, rows }, null, 1));
