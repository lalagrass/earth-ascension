/*
 * SG-05：培養與突破的純邏輯（資格、機率、一次邏輯抽樣、結果、世界一致性檢查）。
 *
 * 範圍界線（issue #95、D7）：
 * - 純函式：不讀時間、不用 Math.random；唯一的隨機來源是呼叫端傳入的 rngState（rng.js，rngVersion 1），回傳新狀態，不改輸入。
 * - 突破是 job（kind:'breakthrough'）：開工、原子預約（本人＋可選支援者＋可選一枚丹）與扣丹走 engine.js 的 job 仲裁；
 *   本檔只負責「開工後」的判定與結果，以及世界一致性檢查。
 * - 修為 0..100（D7-A，上限在 rules.js）。成功：修為保留 100、記一次提升（disciple.breakthroughs）；
 *   失敗：100→70、傷勢 +15（夾上限）。每人最多一次成功提升，不是最多一次嘗試。下一境條件未定，這裡沒有第二境。
 * - 每個真正開工的突破恰好一次邏輯抽樣：Rng.nextInt(state, ROLL_RANGE)（拒絕抽樣，底層可能消耗多個 uint32），
 *   roll < chanceBp 才成功。拒絕、重送、落選、預覽都不抽樣。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 rng.js、rules.js（其後任何位置，須早於 commands.js），
 *   掛在 globalThis.SectChronicle.Progression。
 */
(function (root, factory) {
  'use strict';
  let Rng;
  let Rules;
  if (typeof module === 'object' && module && module.exports) {
    Rng = require('./rng.js');
    Rules = require('./rules.js');
    module.exports = factory(Rng, Rules);
  } else {
    Rng = root.SectChronicle && root.SectChronicle.Rng;
    if (!Rng) throw new Error('progression.js 需要先載入 js/rng.js');
    Rules = root.SectChronicle.Rules;
    if (!Rules) throw new Error('progression.js 需要先載入 js/rules.js（在 js/rng.js 之後、本檔之前）');
    root.SectChronicle.Progression = factory(Rng, Rules);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rng, Rules) {
  'use strict';

  const ROLL_RANGE = Rules.BASIS_POINTS; // roll 是 0..9999 的基點抽樣
  const isInt = (v) => typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0);
  const bad = (reason, path) => ({ ok: false, code: 'inconsistent_progression', reason, path });

  // 資格：修為滿 100 且尚未成功提升。已成功者與「只是滿 100」是不同狀態，不能只看修為。
  function eligibility(disciple) {
    if (disciple.breakthroughs >= Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE) {
      return { ok: false, code: 'already_breakthrough', reason: `${disciple.id} 已成功提升過一次，本切片不再突破` };
    }
    if (!Rules.canAttemptBreakthrough(disciple.cultivation)) {
      return { ok: false, code: 'not_ready', reason: `${disciple.id} 修為 ${disciple.cultivation} 未滿 ${Rules.BREAKTHROUGH_THRESHOLD}` };
    }
    return { ok: true };
  }

  // 修行意圖在格初為何無效（D7-C）：已成功提升優先，其次已滿上限；否則回傳 null（照常修行）。
  function cultivationBlock(disciple) {
    if (disciple.breakthroughs >= Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE) return 'breakthrough_done';
    if (disciple.cultivation >= Rules.CULTIVATION_CAP) return 'cultivation_full';
    return null;
  }

  function judge(roll, chanceBp) {
    if (!isInt(roll) || roll < 0 || roll >= ROLL_RANGE) throw new RangeError(`roll 必須是 0..${ROLL_RANGE - 1} 的整數`);
    return roll < chanceBp ? 'success' : 'failure';
  }

  function sample(rngState) {
    const r = Rng.nextInt(rngState, ROLL_RANGE);
    return { roll: r.value, rngState: r.state };
  }

  // snapshot：開工格格初的 { mind, cultivation, injury }（機率讀扣行動心境前的 mind）；options：{ pill, supporter }。
  function resolve(snapshot, options, rngState) {
    if (!Rules.canAttemptBreakthrough(snapshot.cultivation)) throw new RangeError('突破需要滿 100 修為');
    const chance = Rules.breakthroughChance({ mind: snapshot.mind, pill: options.pill, supporter: options.supporter });
    const s = sample(rngState);
    const result = judge(s.roll, chance.chanceBp);
    const outcome = {
      result, mindAtStart: snapshot.mind, chanceBp: chance.chanceBp, roll: s.roll,
      cultivationBefore: snapshot.cultivation, cultivationAfter: snapshot.cultivation,
      injuryBefore: snapshot.injury, injuryAfter: snapshot.injury,
    };
    if (result === 'failure') {
      const f = Rules.breakthroughFailure(snapshot.cultivation);
      outcome.cultivationAfter = f.cultivation;
      outcome.injuryAfter = Math.min(Rules.VALUE_LIMITS.injuryMax, snapshot.injury + f.injuryGain);
    }
    return { outcome, items: chance.items, rngState: s.rngState };
  }

  // 世界一致性（engine 層，Commands.validateEngineWorld 呼叫；結構性檢查在 state.js）。
  function validateWorld(world) {
    const wins = new Map();
    world.jobs.forEach((j) => {
      if (j.kind !== 'breakthrough') return;
      if (j.status === 'done') wins.set(j.discipleId, (wins.get(j.discipleId) || 0) + (j.outcome.result === 'success' ? 1 : 0));
    });
    for (let i = 0; i < world.jobs.length; i += 1) {
      const j = world.jobs[i];
      if (j.kind !== 'breakthrough') continue;
      const where = `jobs[${i}]`;
      if (j.status === 'queued') {
        const d = world.disciples.find((x) => x.id === j.discipleId);
        const e = eligibility(d);
        if (!e.ok) return bad(`${where} 排隊中的突破需要本人滿 100 且未成功提升：${e.reason}`, where);
        continue;
      }
      if (j.status !== 'done') continue;
      const o = j.outcome;
      if (o.mindAtStart > Rules.VALUE_LIMITS.mindMax || o.injuryBefore > Rules.VALUE_LIMITS.injuryMax || o.injuryAfter > Rules.VALUE_LIMITS.injuryMax) {
        return bad(`${where}.outcome 的心境／傷勢超出範圍`, where);
      }
      if (o.roll >= ROLL_RANGE) return bad(`${where}.outcome.roll 必須小於 ${ROLL_RANGE}`, where);
      const chance = Rules.breakthroughChance({ mind: o.mindAtStart, pill: j.target.usePill, supporter: j.target.supporterId !== null });
      if (o.chanceBp !== chance.chanceBp) return bad(`${where}.outcome.chanceBp 必須是 ${chance.chanceBp}（由 rules.js 重算）`, where);
      if (o.result !== judge(o.roll, o.chanceBp)) return bad(`${where}.outcome.result 與 roll／chanceBp 不一致`, where);
      if (o.cultivationBefore !== Rules.BREAKTHROUGH_THRESHOLD) return bad(`${where}.outcome.cultivationBefore 必須是 ${Rules.BREAKTHROUGH_THRESHOLD}`, where);
      const f = Rules.breakthroughFailure(o.cultivationBefore);
      const expectAfter = o.result === 'success' ? o.cultivationBefore : f.cultivation;
      const expectInjury = o.result === 'success' ? o.injuryBefore : Math.min(Rules.VALUE_LIMITS.injuryMax, o.injuryBefore + f.injuryGain);
      if (o.cultivationAfter !== expectAfter || o.injuryAfter !== expectInjury) return bad(`${where}.outcome 的修為／傷勢結果與規則不一致`, where);
    }
    for (const d of world.disciples) {
      const n = wins.get(d.id) || 0;
      // breakthroughs 只能是 0／1（state.js），所以「必須等於成功 job 數」同時保證每人至多一次成功提升。
      if (d.breakthroughs !== n) return bad(`${d.id}.breakthroughs（${d.breakthroughs}）必須等於成功突破 job 數（${n}）`, 'disciples');
    }
    return { ok: true };
  }

  return Object.freeze({ ROLL_RANGE, eligibility, cultivationBlock, judge, sample, resolve, validateWorld });
});
