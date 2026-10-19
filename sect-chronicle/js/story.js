/*
 * SG-04A：故事 runtime 的純邏輯（援村完成與一次性獎勵、固定招募、世界一致性檢查）。
 *
 * 範圍界線（issue #92、設計 0.2 "道館成為門派"）：
 * - 純函式：不讀時間、不用 RNG、不碰命令層或引擎；修改的只有呼叫端傳入的「工作複本」，並回傳事件草稿由呼叫端寫入 eventLog。
 *   相依方向固定為 rules／state／story-data → story → commands → engine，沒有反向引用。
 * - 援村是 job（kind:'aid'）：開工、扣費、體力與人員占用都走 SG-04 的 job／仲裁；本檔只負責「完成之後」
 *   的故事結算（記錄援村、一次性發獎）與「什麼事件在何時可提示」。
 * - 固定招募只有 cand-1、cand-2 兩名；候選在接受入隊前不是勞動力。入隊格＝接受當下尚未結算的 slotIndex，不補發之前的產出。
 * - 不寫 ending／立派／勝利：第 42 格危機待選以後屬 SG-06。
 * - 載入策略：Node 以 CommonJS；瀏覽器依序載入 rng.js、rules.js、state.js、story-data.js 再載入本檔，
 *   掛在 globalThis.SectChronicle.Story。
 */
(function (root, factory) {
  'use strict';
  let Rules;
  let State;
  let StoryData;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    State = require('./state.js');
    StoryData = require('./story-data.js');
    module.exports = factory(Rules, State, StoryData);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('story.js 需要先載入 js/rules.js（以及 js/rng.js）');
    State = root.SectChronicle.State;
    if (!State) throw new Error('story.js 需要先載入 js/state.js（在 js/rules.js 之後）');
    StoryData = root.SectChronicle.StoryData;
    if (!StoryData) throw new Error('story.js 需要先載入 js/story-data.js（在 js/state.js 之後、本檔之前）');
    root.SectChronicle.Story = factory(Rules, State, StoryData);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules, State, StoryData) {
  'use strict';

  const AID_EVENT_ID = 'evt-aid-complete';
  const AID_SEAT = `aid:${Rules.AID_ID}`; // 援村工作位（容量 Rules.AID_WORKERS）
  const MAX_STORY_ITERATIONS = 16;
  const inviteEventId = (candidateId) => `evt-invite-${candidateId}`;

  // 候選初始屬性來源（待遊戲 PO 核對）：最終 dev 沒有凍結的學徒屬性表，這裡只引用 rules.js 既有的三個角色模板，
  // 不新增任何數值。cand-1 偏生產 → 採藥童；cand-2 偏護村 → 農家子。初始體力／心境／修為／傷勢取 START_VALUES。
  const CANDIDATE_PROFILES = Object.freeze({
    'cand-1': Object.freeze({ templateId: 'herb-child' }),
    'cand-2': Object.freeze({ templateId: 'farmer-child' }),
  });
  const profileAttributes = (candidateId) => ({ ...Rules.CHARACTER_OPTION_LIMITS.templates[CANDIDATE_PROFILES[candidateId].templateId] });

  const cloneJson = (v) => JSON.parse(JSON.stringify(v));

  const completedAidJob = (world) => world.jobs.find((j) => j.kind === 'aid' && j.status === 'done') || null;

  // 故事 facts：只由世界狀態推導。rescueCompleted＝援村「已記錄」；aidCompleted＝有完成的援村工作（可能尚未記錄）。
  const OUTCOME_BY_STATUS = { dojo: null, sectFounded: 'victory', foundingDeferred: 'defeat' };
  function factsFor(world) {
    return {
      slotIndex: world.slotIndex,
      rescueCompleted: world.story.rescues.length > 0,
      aidCompleted: completedAidJob(world) !== null,
      triggeredEventIds: [...world.story.triggeredEventIds],
      crisisOutcome: OUTCOME_BY_STATUS[world.story.organisationStatus],
      invitations: Object.fromEntries(State.CANDIDATE_IDS.map((id) => [id, { status: world.story.invitations[id].status }])),
    };
  }

  // 一格結算提交後、下一個要處理的故事事件。回傳 { event } | { unsupported: event } | null。
  // 優先序：援村完成（結算已發生的事）先於所有待選提示；待選提示只在 allowPending（日末／最後一格）才會升起，
  // 依 story-data 的優先序（危機 > 邀請 > 求援），一次一個、處理後重新推導（所以 cand-2 會緊接 cand-1，且看得到前者的結果）。
  // 第 MAX_SLOT_INDEX 格危機優先：邀請不再提示（也不標記為已觸發）。階段事件只在格初處理，這裡略過。
  function nextDueEvent(world, allowPending) {
    const due = StoryData.dueEvents(factsFor(world)).map((id) => StoryData.getEvent(id));
    const aid = due.find((e) => e.kind === 'aidCompletion');
    if (aid) return { event: aid };
    for (const e of due) {
      if (e.kind === 'phase') continue;
      if (e.pending) {
        if (!allowPending) continue;
        if (e.kind === 'invitation' && world.slotIndex >= Rules.MAX_SLOT_INDEX) continue;
        return { event: e };
      }
      return { unsupported: e };
    }
    return null;
  }

  // 援村完成的故事結算：記錄援村並一次性發獎（以 triggeredEventIds 與 rescues 雙重去重）。回傳事件草稿。
  function settleAidCompletion(world) {
    const job = completedAidJob(world);
    if (!job) throw new Error('settleAidCompletion 需要已完成的援村工作');
    if (world.story.triggeredEventIds.includes(AID_EVENT_ID) || world.story.rescues.length > 0) {
      throw new Error('援村已結算過，不得重複發獎');
    }
    const reward = Rules.aidReward(job.target.optionId);
    world.story.triggeredEventIds.push(AID_EVENT_ID);
    world.story.rescues.push({ id: Rules.AID_ID, completedSlotIndex: job.completedSlotIndex, rewardClaimed: true });
    for (const k of Object.keys(reward)) world.resources[k] = (world.resources[k] || 0) + reward[k];
    return [{
      type: 'aidCompleted', slotIndex: job.completedSlotIndex, eventId: AID_EVENT_ID, jobId: job.id, discipleId: job.discipleId,
      optionId: job.target.optionId, reward: cloneJson(reward), dedupeKey: StoryData.STORY_DATA.contracts.aid.rewardDedupeKey,
    }];
  }

  // 同一個援村只完成一次：完成後其餘排隊中的援村工作取消（同一提交）。
  // deniedJobIds：本格剛被拒絕而累計了 waited 的工作——取消格內的這一次落選不計入等待。
  function cancelOtherAidJobs(world, slotIndex, deniedJobIds) {
    const out = [];
    for (const j of world.jobs) {
      if (j.kind === 'aid' && j.status === 'queued') {
        if (deniedJobIds.has(j.id) && j.waited > 0) j.waited -= 1;
        j.status = 'cancelled';
        j.cancelledSlotIndex = slotIndex;
        out.push({ type: 'jobCancelled', slotIndex, jobId: j.id, reason: 'aid_taken' });
      }
    }
    return out;
  }

  // 接受入隊：把已邀請／延後的候選加入隊伍。呼叫端先驗證階段與狀態；這裡只做不可失敗的套用。
  function addApprentice(world, candidateId) {
    const joinSlotIndex = world.slotIndex;
    world.story.invitations[candidateId] = { status: 'accepted', joinSlotIndex };
    world.disciples.push({
      id: candidateId, role: 'apprentice', attributes: profileAttributes(candidateId),
      stamina: Rules.START_VALUES.stamina, mind: Rules.START_VALUES.mind,
      cultivation: Rules.START_VALUES.cultivation, injury: Rules.START_VALUES.injury, joinSlotIndex, breakthroughs: 0,
    });
    world.disciples.sort((a, b) => {
      const rank = { master: 0, protagonist: 1, apprentice: 2 };
      return rank[a.role] - rank[b.role] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    return { type: 'candidateAccepted', candidateId, joinSlotIndex };
  }

  // 引擎層一致性（State.validateWorld 之外）：援村紀錄 ↔ 工作 ↔ 事件登記、邀請進度 ↔ 事件登記、固定學徒屬性。
  function validateWorld(world) {
    const fail = (code, reason, path) => ({ ok: false, code, reason, path });
    const triggered = new Set(world.story.triggeredEventIds);
    const aidJobs = world.jobs.filter((j) => j.kind === 'aid');
    const done = aidJobs.filter((j) => j.status === 'done');
    const rescues = world.story.rescues;
    if (rescues.length > 1) return fail('inconsistent_story', '只有一個援村', 'story.rescues');
    if (rescues.length === 1) {
      const r = rescues[0];
      if (r.id !== Rules.AID_ID) return fail('inconsistent_story', `援村紀錄 ID 必須是 ${Rules.AID_ID}`, 'story.rescues');
      if (done.length !== 1) return fail('inconsistent_story', '援村紀錄必須恰好對應一個已完成的援村工作（援村只能完成一次）', 'story.rescues');
      if (r.completedSlotIndex !== done[0].completedSlotIndex) return fail('inconsistent_story', '援村紀錄的完成格必須等於工作的完成格', 'story.rescues');
      if (r.rewardClaimed !== true) return fail('inconsistent_story', '援村完成與獎勵領取在同一提交，rewardClaimed 必須為 true', 'story.rescues');
      if (!triggered.has(AID_EVENT_ID)) return fail('inconsistent_story', `援村完成必須登記 ${AID_EVENT_ID}`, 'story.triggeredEventIds');
    } else {
      if (done.length > 0) return fail('inconsistent_story', '已完成的援村工作必須有援村紀錄', 'jobs');
      if (triggered.has(AID_EVENT_ID)) return fail('inconsistent_story', `${AID_EVENT_ID} 已登記但沒有援村紀錄`, 'story.triggeredEventIds');
    }
    if (done.length === 1 && aidJobs.some((j) => j.status === 'queued')) {
      return fail('inconsistent_story', '援村完成後不得再有排隊中的援村工作', 'jobs');
    }
    for (const id of State.CANDIDATE_IDS) {
      const inv = world.story.invitations[id];
      if (inv.status !== 'locked' && !triggered.has(inviteEventId(id))) {
        return fail('inconsistent_story', `${id} 有邀請進度但 ${inviteEventId(id)} 未登記為已觸發`, 'story.invitations');
      }
      if (inv.status === 'accepted') {
        const d = world.disciples.find((x) => x.id === id);
        const want = profileAttributes(id);
        if (Object.keys(want).some((a) => d.attributes[a] !== want[a])) {
          return fail('inconsistent_roster', `${id} 的屬性必須取自固定來源 ${CANDIDATE_PROFILES[id].templateId}`, 'disciples');
        }
      }
    }
    return { ok: true };
  }

  return Object.freeze({
    AID_EVENT_ID, AID_SEAT, MAX_STORY_ITERATIONS, CANDIDATE_PROFILES, inviteEventId, profileAttributes, completedAidJob,
    factsFor, nextDueEvent, settleAidCompletion, cancelOtherAidJobs, addApprentice, validateWorld,
  });
});
