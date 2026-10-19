'use strict';
// SG-04A：手工建立「中途世界」用的共用輔助（不是測試檔，node --test *.test.js 不會執行它）。
// 引擎層驗證現在要求：援村紀錄必須有對應的已完成援村工作與已登記的事件；邀請進度必須有對應事件；
// 固定學徒屬性必須取自 story.js 的候選來源。手工 fixture 一律走這裡，避免各測試檔各自偽造不一致的世界。
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const Story = require('../js/story.js');

// 把 w 變成「援村已在第 completedSlotIndex 格完成並已發獎」的一致狀態（只改記錄，不改資源）。
function withDoneAid(w, completedSlotIndex = 12, optionId = 'free', discipleId = State.PROTAGONIST_ID) {
  const prevQueued = w.jobs.length ? w.jobs[w.jobs.length - 1].queuedSlotIndex : 0;
  w.jobs.push({
    id: State.jobIdOf(w.jobs.length), kind: 'aid', discipleId, status: 'done', queuedSlotIndex: Math.max(prevQueued, completedSlotIndex),
    waited: 0, startSlotIndex: completedSlotIndex, slotsDone: 1, completedSlotIndex, cancelledSlotIndex: null,
    target: { aidId: Rules.AID_ID, optionId },
  });
  w.story.rescues = [{ id: Rules.AID_ID, completedSlotIndex, rewardClaimed: true }];
  if (!w.story.triggeredEventIds.includes(Story.AID_EVENT_ID)) w.story.triggeredEventIds.push(Story.AID_EVENT_ID);
  return w;
}

// 固定學徒（屬性取自 Story.profileAttributes）。
function apprentice(candidateId, joinSlotIndex) {
  return {
    id: candidateId, role: 'apprentice', attributes: Story.profileAttributes(candidateId),
    stamina: 100, mind: 60, cultivation: 0, injury: 0, joinSlotIndex, breakthroughs: 0,
  };
}

// 登記「候選已被邀請（含提示事件已觸發）」並視需要入隊。
function withInvitation(w, candidateId, status, joinSlotIndex = null) {
  const evId = Story.inviteEventId(candidateId);
  if (!w.story.triggeredEventIds.includes(evId)) w.story.triggeredEventIds.push(evId);
  w.story.invitations[candidateId] = { status, joinSlotIndex };
  if (status === 'accepted') w.disciples.push(apprentice(candidateId, joinSlotIndex));
  return w;
}

module.exports = { withDoneAid, apprentice, withInvitation };
