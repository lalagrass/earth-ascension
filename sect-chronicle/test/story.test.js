'use strict';
// SG-04A：復甦、援村與固定招募流程。全部從正式 newWorld 與公開 dispatch／advance 出發；
// 不注入獎勵、不直接改 story 欄位冒充流程（只有「壞資料 validator」案例會改欄位，且明說是壞資料）。
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const C = require('../js/commands.js');
const Story = require('../js/story.js');
const E = require('../js/engine.js');
const cp = require('node:child_process');
const path = require('node:path');
const Smoke = require('../tools/smoke.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const M = State.MASTER_ID;
const P = State.PROTAGONIST_ID;
const C1 = 'cand-1';
const C2 = 'cand-2';
const AID = Rules.AID_ID;
// 命令 id 由 revision 決定（同一條路徑重跑會得到相同的 commandLog，才能比對 hash）。
const cmd = (w, type, payload, id) => ({ id: id || `s-${w.revision}`, expectedRevision: w.revision, type, payload });
const send = (w, type, payload) => {
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const reject = (w, type, payload, code) => {
  const before = State.hashWorld(w);
  const r = C.dispatch(w, cmd(w, type, payload));
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(r.code, code, JSON.stringify(r));
  assert.equal(State.hashWorld(w), before, '拒絕不改輸入');
  return r;
};
const adv = (w, n = 1) => {
  const r = E.advance(w, n);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
};
const step = (w, n = 1) => adv(w, n).state;
const world = (seed = 'story-seed', opts) => {
  const r = State.newWorld(seed, 'slice-14', opts);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.state;
};
const evs = (w, type) => w.eventLog.filter((e) => e.type === type);
const lastResolved = (w) => [...w.eventLog].reverse().find((e) => e.type === 'slotResolved');
const res = (w, id) => lastResolved(w).results.find((r) => r.discipleId === id);
const choose = (w, eventId, optionId) => send(w, 'chooseEvent', { eventId, optionId });
const disc = (w, id) => w.disciples.find((d) => d.id === id);
const queueAid = (w, who, optionId) => send(w, 'queueAid', { discipleId: who, optionId });
const roundTrip = (w) => {
  const back = State.parseState(State.serializeState(w));
  assert.equal(back.ok, true, JSON.stringify(back));
  assert.equal(State.hashWorld(back.state), State.hashWorld(w));
  return back.state;
};

// 師徒兩人預設休養到第 9 格（日 4 初兆）：第 8→9 格日末求援待選；選「稍後再說」回到 planning（只是提示，不發獎）。
function at9(seed, plea = 'opt-aid-later') {
  let w = world(seed);
  const r = adv(w, 9);
  assert.equal(r.stopReason, 'pendingEvent');
  w = r.state;
  assert.deepEqual(w.pendingEvents.map((e) => e.id), ['evt-village-plea']);
  w = choose(w, 'evt-village-plea', plea);
  assert.equal(w.phase, 'planning');
  assert.equal(w.slotIndex, 9);
  return w;
}
const sumRes = (w) => ({ ...w.resources });

// ---------- queueAid：援村是日課中的有限工作（job），不是即時發資源 API ----------

test('queueAid 驗證：形狀、階段、角色、選項、日 4 前鎖定；assignSlot／範本排 aid 一律指向 queueAid', () => {
  const w0 = world('qa');
  reject(w0, 'queueAid', { discipleId: M, optionId: 'free' }, 'aid_locked');
  const w = at9('qa');
  reject(w, 'queueAid', { discipleId: M }, 'bad_payload');
  reject(w, 'queueAid', { discipleId: M, optionId: 'free', extra: 1 }, 'bad_payload');
  reject(w, 'queueAid', { discipleId: 5, optionId: 'free' }, 'bad_payload');
  reject(w, 'queueAid', { discipleId: M, optionId: 'bribe' }, 'unknown_aid_option');
  reject(w, 'queueAid', { discipleId: 'nobody', optionId: 'free' }, 'unknown_disciple');
  reject(w, 'queueAid', { discipleId: C1, optionId: 'free' }, 'candidate_not_member');
  reject(w, 'assignSlot', { discipleId: M, slotIndex: 9, action: 'aid' }, 'use_job_command');
  reject(w, 'setDailyTemplate', { discipleId: M, parts: ['aid', 'rest', 'rest'] }, 'use_job_command');
  const ok = queueAid(w, P, 'free');
  assert.equal(ok.jobs.length, 1);
  assert.deepEqual(ok.jobs[0].target, { aidId: AID, optionId: 'free' });
  assert.equal(ok.jobs[0].kind, 'aid');
  assert.equal(evs(ok, 'jobQueued').length, 1);
  // 待選階段不可排
  let p = world('qa2');
  p = adv(p, 9).state;
  reject(p, 'queueAid', { discipleId: M, optionId: 'free' }, 'not_planning');
});

test('徒手援村（零材料）：一人一格、體力消耗、獎勵只領一次；提示本身不發獎', () => {
  const w = at9('free');
  assert.deepEqual(sumRes(w), { spiritMaterial: 0, spiritHerb: 0, spiritStone: 0, reputation: 0 }, '選「稍後」只是提示，不發任何東西');
  assert.equal(w.resources.spiritMaterial, 0);
  const q = queueAid(w, P, 'free');
  const before = disc(q, P).stamina;
  const n = step(q);
  const r = res(n, P);
  assert.equal(r.action, 'aid');
  assert.deepEqual(r.job, { id: 'job-0001', kind: 'aid', phase: 'completed' });
  assert.equal(disc(n, P).stamina, before + Rules.applyActionCost('aid', disc(q, P)).stamina - before);
  assert.equal(disc(n, P).stamina < before, true, '援村消耗體力');
  assert.equal(disc(n, P).cultivation, 0, '援村不修行');
  assert.equal(res(n, M).action, 'rest', '另一人照課表（預設休養），不被占用');
  assert.equal(n.jobs[0].status, 'done');
  assert.equal(n.jobs[0].completedSlotIndex, 9);
  assert.deepEqual(n.reservations, []);
  const reward = Rules.aidReward('free');
  assert.deepEqual(n.resources, { spiritMaterial: reward.spiritMaterial, spiritHerb: reward.spiritHerb, spiritStone: 0, reputation: reward.reputation });
  assert.deepEqual(n.story.rescues, [{ id: AID, completedSlotIndex: 9, rewardClaimed: true }]);
  assert.equal(n.story.triggeredEventIds.includes('evt-aid-complete'), true);
  const ac = evs(n, 'aidCompleted');
  assert.equal(ac.length, 1);
  assert.deepEqual(ac[0].reward, reward);
  assert.equal(ac[0].optionId, 'free');
  assert.equal(ac[0].dedupeKey, `reward:${AID}`);
  // 之後不再發第二份
  const later = step(n, 3);
  assert.equal(later.resources.spiritMaterial, n.resources.spiritMaterial);
  assert.equal(evs(later, 'aidCompleted').length, 1);
});

test('備料援村：費用在格初原子預約、只扣一次；同格別人的採集不能支付；材料恰好可成', () => {
  let w = at9('supplied');
  const cost = Rules.AID_OPTIONS.supplied.cost.spiritMaterial;
  // 材料 0：被拒（insufficient_resource），即使同格主角採集會產出材料，也不能拿來付
  let q = queueAid(w, M, 'supplied');
  q = send(q, 'setDailyTemplate', { discipleId: P, parts: ['gather-material', 'gather-material', 'gather-material'] });
  let n = step(q);
  assert.equal(n.jobs[0].status, 'queued');
  assert.equal(n.jobs[0].waited, 1);
  assert.equal(lastResolved(n).denied[0].code, 'insufficient_resource');
  assert.equal(res(n, M).action, 'rest');
  assert.equal(res(n, M).fallback.from, 'aid');
  assert.equal(res(n, M).fallback.reason, 'insufficient_resource');
  assert.equal(n.story.rescues.length, 0);
  const gathered = n.resources.spiritMaterial;
  // 材料夠的那一格：成本只扣一次、完成後領備料版獎勵（等待期間主角仍照課表採集）
  let m = n;
  while (m.jobs[0].status !== 'done') {
    assert.ok(m.slotIndex < 14, '應在幾格內因材料足夠而完成');
    m = step(m);
  }
  assert.equal(m.jobs[0].waited >= 1, true);
  const reward = Rules.aidReward('supplied');
  const gatheredAfter = evs(m, 'slotResolved').filter((e) => e.slotIndex > n.slotIndex - 1 && e.slotIndex >= n.slotIndex)
    .reduce((sum, e) => sum + e.results.find((r) => r.discipleId === P).delta.spiritMaterial, 0);
  assert.equal(m.resources.spiritMaterial, gathered + gatheredAfter - cost + reward.spiritMaterial);
  assert.equal(m.resources.spiritHerb, reward.spiritHerb);
  assert.equal(m.resources.reputation, reward.reputation);
  assert.equal(evs(m, 'jobStarted').filter((e) => e.jobId === 'job-0001').length, 1);
  assert.equal(evs(m, 'jobStarted').find((e) => e.jobId === 'job-0001').paid.spiritMaterial, cost);
  // 材料恰好 = cost 也成功
  let x = at9('supplied-exact');
  x.resources.spiritMaterial = cost;
  x = queueAid(x, M, 'supplied');
  x = step(x);
  assert.equal(x.jobs[0].status, 'done');
  assert.equal(x.resources.spiritMaterial, reward.spiritMaterial);
  // cost - 1 不足
  let y = at9('supplied-short');
  y.resources.spiritMaterial = cost - 1;
  y = queueAid(y, M, 'supplied');
  y = step(y);
  assert.equal(y.jobs[0].status, 'queued');
  assert.equal(y.resources.spiritMaterial, cost - 1, '被拒不部分扣費');
});

test('同格多人／兩種選項競爭：只有一個完成、只收一份費、只發一份獎；落選者取消，之後不能再援村', () => {
  let w = at9('compete');
  w.resources.spiritMaterial = 10;
  let q = queueAid(w, P, 'supplied'); // job-0001
  q = queueAid(q, M, 'free'); // job-0002
  const n = step(q);
  assert.equal(n.jobs[0].status, 'done', '先排隊（job ID 較小）者得到唯一的援村位');
  assert.equal(n.jobs[1].status, 'cancelled', '落選的另一個援村被取消（援村只完成一次）');
  assert.equal(n.jobs[1].cancelledSlotIndex, 9);
  assert.equal(evs(n, 'aidCompleted').length, 1);
  const supplied = Rules.AID_OPTIONS.supplied;
  assert.equal(n.resources.spiritMaterial, 10 - supplied.cost.spiritMaterial + supplied.reward.spiritMaterial, '只扣一份費、只發一份獎');
  assert.equal(res(n, M).action, 'rest', '落選者休養（明示備案），沒有援村效果');
  assert.equal(res(n, M).fallback.reason, 'no_seat');
  assert.equal(n.story.rescues.length, 1);
  reject(n, 'queueAid', { discipleId: M, optionId: 'free' }, 'aid_completed');
  // 原命令重送：回目前世界，不倒退；新 id 再援村被拒且 revision 不變
  const first = q.commandLog[q.commandLog.length - 1];
  const conflict = C.dispatch(n, { id: first.id, expectedRevision: first.revisionBefore, type: 'queueAid', payload: { discipleId: P, optionId: 'free' } });
  assert.equal(conflict.code, 'command_id_conflict', '同 id 但內容不同 → command_id_conflict');
  const rev = n.revision;
  reject(n, 'queueAid', { discipleId: P, optionId: 'supplied' }, 'aid_completed');
  assert.equal(n.revision, rev);
  const r2 = C.dispatch(n, { id: first.id, expectedRevision: first.revisionBefore, type: 'queueAid', payload: { discipleId: M, optionId: 'free' } });
  assert.equal(r2.ok, true);
  assert.equal(r2.duplicate, true, '同 id 同內容重送回已處理結果（不倒退、不重複排隊）');
  assert.equal(State.hashWorld(r2.state), State.hashWorld(n));
});

test('援村與其他工作互斥：忙於建造的人不能同格援村（participant_busy），一人一格只有一份效果', () => {
  let w = at9('busy');
  w.resources.spiritMaterial = 20;
  w = send(w, 'queueBuild', { discipleId: M, facilityType: 'spiritTerrace', tileId: 't-0-1' });
  w = step(w); // 師父開工建造（進行中）
  w = queueAid(w, M, 'free');
  const n = step(w);
  assert.equal(lastResolved(n).results.filter((r) => r.discipleId === M).length, 1);
  assert.equal(res(n, M).action, 'build');
  assert.equal(lastResolved(n).denied[0].code, 'participant_busy');
  assert.equal(n.jobs[1].status, 'queued');
  assert.equal(n.jobs[1].waited, 1);
  // 另派主角則成功；其他人不受影響
  const m = send(n, 'cancelQueuedJob', { jobId: 'job-0002' });
  const m2 = step(queueAid(m, P, 'free'));
  assert.equal(m2.jobs[2].status, 'done');
});

// ---------- 兩次固定邀請與事件優先序 ----------

function aidEarly(seed = 'invite') {
  let w = queueAid(at9(seed), P, 'free');
  w = step(w); // 第 9 格完成援村
  return w;
}

test('援村早於日 7：日 7 之前不邀請；第 17→18 格日末依資料順序 cand-1、cand-2 各提示一次（單次快照看不到前者也不漏）', () => {
  let w = aidEarly();
  for (const id of [C1, C2]) assert.equal(w.story.invitations[id].status, 'locked');
  const r = adv(w, 20);
  assert.equal(r.stopReason, 'pendingEvent');
  w = r.state;
  assert.equal(w.slotIndex, 18);
  assert.deepEqual(w.pendingEvents.map((e) => e.id), ['evt-invite-cand-1', 'evt-invite-cand-2']);
  assert.equal(w.phase, 'awaitingChoice');
  assert.equal(evs(w, 'eventRaised').filter((e) => e.eventId.startsWith('evt-invite')).length, 2);
  // 提示本身不入隊、不發資源
  assert.equal(w.disciples.length, 2);
  // 仍有待選時不能接受（awaitingChoice）
  reject(w, 'acceptCandidate', { candidateId: C1 }, 'not_planning');
  // 確認第一位後仍有第二位待選
  w = choose(w, 'evt-invite-cand-1', 'opt-invite-cand-1-accept');
  assert.equal(w.phase, 'awaitingChoice');
  assert.deepEqual(w.pendingEvents.map((e) => e.id), ['evt-invite-cand-2']);
  assert.equal(w.story.invitations[C1].status, 'invited');
  assert.equal(w.disciples.length, 2, '確認只改 invited，不直接入隊');
  w = choose(w, 'evt-invite-cand-2', 'opt-invite-cand-2-later');
  assert.equal(w.phase, 'planning');
  assert.equal(w.story.invitations[C2].status, 'deferred');
  assert.equal(w.disciples.length, 2);
});

test('援村晚於日 7（第 19 格）：邀請等到日末才提示，不在工作格內插隊；每名只提示一次', () => {
  let w = at9('late');
  w = adv(w, 10).state; // 休養到第 19 格（途中第 17→18 無邀請，因為尚未援村）
  assert.equal(w.slotIndex, 19);
  assert.equal(w.phase, 'planning');
  assert.equal(w.pendingEvents.length, 0);
  w = queueAid(w, M, 'free');
  w = step(w); // 第 19 格完成援村，非日末 → 只處理援村完成，不提示邀請
  assert.equal(w.phase, 'planning');
  assert.equal(w.story.rescues.length, 1);
  assert.equal(w.pendingEvents.length, 0);
  const r = adv(w, 5);
  assert.equal(r.stopReason, 'pendingEvent');
  assert.equal(r.state.slotIndex, 21, '日末（第 20 格結算後）才提示');
  assert.deepEqual(r.state.pendingEvents.map((e) => e.id), ['evt-invite-cand-1', 'evt-invite-cand-2']);
  // 選完後繼續到危機，不再重彈
  let x = choose(choose(r.state, 'evt-invite-cand-1', 'opt-invite-cand-1-later'), 'evt-invite-cand-2', 'opt-invite-cand-2-later');
  const crisis = adv(x, 42).state;
  assert.equal(crisis.slotIndex, 42);
  assert.equal(evs(crisis, 'eventRaised').filter((e) => e.eventId.startsWith('evt-invite')).length, 2, '各只提示一次');
});

test('援村在最後一格完成：獎勵正常發放，但危機優先——不提示邀請、不多推第 43 格、0 人也到危機待選', () => {
  let w = at9('last');
  w = adv(w, 32).state; // 第 41 格
  assert.equal(w.slotIndex, 41);
  w = queueAid(w, P, 'free');
  const r = adv(w, 5);
  assert.equal(r.advanced, 1);
  w = r.state;
  assert.equal(w.slotIndex, 42);
  assert.equal(w.phase, 'awaitingChoice');
  assert.deepEqual(w.pendingEvents.map((e) => e.id), ['evt-beast-crisis']);
  assert.equal(w.story.rescues.length, 1);
  assert.equal(w.story.invitations[C1].status, 'locked');
  assert.equal(w.story.triggeredEventIds.includes('evt-invite-cand-1'), false, '邀請沒有被標成已觸發（沒有提示過）');
  reject(w, 'acceptCandidate', { candidateId: C1 }, 'not_planning');
  assert.equal(E.advance(w, 1).code, 'awaiting_choice');
});

test('求援待選後選「我去幫忙」只是提示：不發獎、不鎖定援村選項；同一提示不重彈', () => {
  const w = at9('plea-accept', 'opt-aid-accept');
  assert.equal(evs(w, 'aidPromptShown').length, 1);
  assert.equal(w.resources.spiritMaterial, 0);
  const later = adv(w, 5).state;
  assert.equal(evs(later, 'eventRaised').filter((e) => e.eventId === 'evt-village-plea').length, 1);
});

// ---------- acceptCandidate ----------

function twoInvited(seed = 'accept') {
  const r = adv(aidEarly(seed), 20);
  let w = r.state;
  w = choose(w, 'evt-invite-cand-1', 'opt-invite-cand-1-accept');
  w = choose(w, 'evt-invite-cand-2', 'opt-invite-cand-2-later');
  return w; // 第 18 格 planning；cand-1 invited、cand-2 deferred
}

test('acceptCandidate 驗證：形狀、未知、未邀請（locked）、階段；成功只一次，沿用固定候選 ID', () => {
  const w = twoInvited();
  reject(w, 'acceptCandidate', {}, 'bad_payload');
  reject(w, 'acceptCandidate', { candidateId: C1, extra: 1 }, 'bad_payload');
  reject(w, 'acceptCandidate', { candidateId: 3 }, 'bad_payload');
  reject(w, 'acceptCandidate', { candidateId: 'cand-3' }, 'unknown_candidate');
  const early = at9('locked');
  reject(early, 'acceptCandidate', { candidateId: C1 }, 'candidate_not_invited');
  const rev = w.revision;
  const rngBefore = clone(w.rngState);
  const res1 = C.dispatch(w, cmd(w, 'acceptCandidate', { candidateId: C1 }, 'acc-1'));
  assert.equal(res1.ok, true, JSON.stringify(res1));
  const a = res1.state;
  assert.equal(a.revision, rev + 1);
  assert.deepEqual(a.rngState, rngBefore, '不耗 RNG');
  assert.equal(a.disciples.length, 3);
  const d = disc(a, C1);
  assert.equal(d.role, 'apprentice');
  assert.equal(d.joinSlotIndex, w.slotIndex, 'joinSlotIndex＝接受當下尚未結算的 slotIndex');
  assert.deepEqual(a.story.invitations[C1], { status: 'accepted', joinSlotIndex: w.slotIndex });
  assert.deepEqual(a.resources, w.resources, '不免費發材料／聲望');
  assert.equal(evs(a, 'candidateAccepted').length, 1);
  // 新 id 再接受同一人：拒絕、revision 不變
  reject(a, 'acceptCandidate', { candidateId: C1 }, 'already_accepted');
  // 同 id 重送：回目前世界與原結果（不倒退、不重複入隊）
  const dup = C.dispatch(a, { id: 'acc-1', expectedRevision: rev, type: 'acceptCandidate', payload: { candidateId: C1 } });
  assert.equal(dup.ok, true);
  assert.equal(dup.duplicate, true);
  assert.equal(dup.state.disciples.length, 3);
  // 延後的 cand-2 仍可接受 → 四人（上限）
  const b = send(a, 'acceptCandidate', { candidateId: C2 });
  assert.equal(b.disciples.length, 4);
  assert.equal(b.disciples.length <= State.MAX_ROSTER, true);
});

test('候選初值來源：固定學徒屬性取自 rules.js 既有模板（cand-1 偏生產＝採藥童、cand-2 偏護村＝農家子），初始狀態取 START_VALUES', () => {
  const w = send(send(twoInvited('profile'), 'acceptCandidate', { candidateId: C1 }), 'acceptCandidate', { candidateId: C2 });
  const T = Rules.CHARACTER_OPTION_LIMITS.templates;
  assert.deepEqual(Story.CANDIDATE_PROFILES, { 'cand-1': { templateId: 'herb-child' }, 'cand-2': { templateId: 'farmer-child' } });
  assert.deepEqual(disc(w, C1).attributes, T['herb-child']);
  assert.deepEqual(disc(w, C2).attributes, T['farmer-child']);
  for (const id of [C1, C2]) {
    const d = disc(w, id);
    assert.deepEqual({ stamina: d.stamina, mind: d.mind, cultivation: d.cultivation, injury: d.injury }, Rules.START_VALUES);
  }
});

test('入隊前不是勞動力；入隊格起才可排課／工作，不補發先前產出', () => {
  let w = twoInvited('join');
  reject(w, 'assignSlot', { discipleId: C1, slotIndex: w.slotIndex, action: 'gather-material' }, 'candidate_not_member');
  reject(w, 'queueBuild', { discipleId: C1, facilityType: 'spiritTerrace', tileId: 't-0-1' }, 'candidate_not_member');
  reject(w, 'queueAid', { discipleId: C1, optionId: 'free' }, 'candidate_not_member');
  const slot = w.slotIndex;
  const before = clone(w.resources);
  const past = step(w); // 未接受就推進：結果裡沒有學徒
  assert.deepEqual(lastResolved(past).results.map((r) => r.discipleId), [M, P]);
  w = send(w, 'acceptCandidate', { candidateId: C1 });
  w = send(w, 'setDailyTemplate', { discipleId: C1, parts: ['gather-material', 'gather-material', 'gather-material'] });
  const n = step(w);
  assert.deepEqual(lastResolved(n).results.map((r) => r.discipleId), [M, P, C1]);
  assert.equal(res(n, C1).action, 'gather-material');
  assert.ok(n.resources.spiritMaterial > before.spiritMaterial);
  assert.equal(lastResolved(n).slotIndex, slot, '入隊格就是下一個結算的格');
  // 不補發：入隊前已結算的格沒有任何 cand-1 結果
  for (const e of evs(n, 'slotResolved')) {
    if (e.slotIndex < slot) assert.equal(e.results.some((r) => r.discipleId === C1), false);
  }
});

test('0／1／2 人收徒都到第 42 格危機待選；危機待選時不可接受；只有兩名固定學徒', () => {
  for (const mode of [0, 1, 2]) {
    let w = twoInvited(`route-${mode}`);
    if (mode >= 1) w = send(w, 'acceptCandidate', { candidateId: C1 });
    if (mode === 2) w = send(w, 'acceptCandidate', { candidateId: C2 });
    const r = adv(w, 42);
    assert.equal(r.state.slotIndex, 42, `${mode} 人`);
    assert.equal(r.state.phase, 'awaitingChoice');
    assert.deepEqual(r.state.pendingEvents.map((e) => e.id), ['evt-beast-crisis']);
    assert.equal(r.state.disciples.length, 2 + mode);
    reject(r.state, 'acceptCandidate', { candidateId: C2 }, 'not_planning');
    assert.equal(E.advance(r.state, 1).code, 'awaiting_choice');
  }
});

// ---------- 復甦階段邊界 ----------

test('復甦邊界 8/9、17/18、29/30：修行收益逐格對照 rules.js，階段事件只一次；逐格、批次、每格存讀結果相同', () => {
  const mk = () => {
    let w = world('phases');
    for (const id of [M, P]) w = send(w, 'setDailyTemplate', { discipleId: id, parts: ['cultivate', 'cultivate', 'cultivate'] });
    return w;
  };
  // 修行會累積疲勞；只為取每格收益對照，直接逐格推進（求援／邀請待選以「稍後」處理）
  let w = mk();
  const seen = [];
  const onPending = (x) => {
    for (const pe of [...x.pendingEvents]) {
      if (pe.id === 'evt-village-plea') x = choose(x, pe.id, 'opt-aid-later');
      else if (pe.id === 'evt-beast-crisis') return x;
    }
    return x;
  };
  let cur = w;
  const expected = new Map();
  for (let s = 0; s < 36 && cur.slotIndex < 36; s += 1) {
    disc(cur, P).cultivation = 0; // SG-05 起修為封頂 100：每格歸零（合法狀態）才能逐格對照未封頂的階段收益
    const d = disc(cur, P);
    const at = cur.slotIndex;
    const input = { slotIndex: at, comprehension: d.attributes.comprehension, stamina: d.stamina, mind: d.mind, injury: d.injury };
    expected.set(at, Rules.cultivationGain(input).gain);
    const before = d.cultivation;
    cur = step(cur);
    seen.push([at, disc(cur, P).cultivation - before]);
    cur = onPending(cur);
  }
  for (const [at, gain] of seen) assert.equal(gain, expected.get(at), `第 ${at} 格修行收益`);
  const phaseEvents = evs(cur, 'story').map((e) => e.eventId);
  assert.deepEqual(phaseEvents, ['evt-phase-faint', 'evt-phase-omen', 'evt-phase-manifest', 'evt-phase-surge']);
  const slotsOf = Object.fromEntries(evs(cur, 'story').map((e) => [e.eventId, e.slotIndex]));
  assert.deepEqual(slotsOf, { 'evt-phase-faint': 0, 'evt-phase-omen': 9, 'evt-phase-manifest': 18, 'evt-phase-surge': 30 });
  // 邊界前後的倍率確實不同（8/9、17/18、29/30）
  for (const [a, b] of [[8, 9], [17, 18], [29, 30]]) {
    assert.notEqual(Rules.phaseAt(a).id, Rules.phaseAt(b).id);
  }
  // 存讀：每個邊界格前後往返，後續與不中斷路徑相同
  let a = mk();
  let b = mk();
  for (let i = 0; i < 30; i += 1) {
    a = onPending(step(a));
    b = onPending(step(roundTrip(b)));
  }
  assert.equal(State.hashWorld(a), State.hashWorld(b));
});

// ---------- 存讀：各待選／中途狀態 ----------

test('求援待選、援村完成、邀請待選、deferred、剛入隊、危機待選：serialize/parse 後的後續與不中斷路徑相同，不重發／不重彈／不重入隊', () => {
  const run = (rt) => {
    const R = rt ? roundTrip : (x) => x;
    let w = world('rt');
    w = R(w);
    const r = adv(w, 9);
    w = R(r.state); // 求援待選
    w = R(choose(w, 'evt-village-plea', 'opt-aid-accept'));
    w = R(queueAid(w, P, 'free'));
    w = R(step(w)); // 援村完成
    w = R(adv(w, 20).state); // 邀請待選
    w = R(choose(w, 'evt-invite-cand-1', 'opt-invite-cand-1-later'));
    w = R(choose(w, 'evt-invite-cand-2', 'opt-invite-cand-2-accept')); // cand-1 deferred、cand-2 invited
    w = R(send(w, 'acceptCandidate', { candidateId: C2 })); // 剛入隊
    w = R(step(w, 2));
    w = R(send(w, 'acceptCandidate', { candidateId: C1 })); // 稍後接受 deferred
    w = R(adv(w, 42).state); // 危機待選
    return w;
  };
  const a = run(false);
  const b = run(true);
  assert.equal(State.hashWorld(a), State.hashWorld(b));
  assert.equal(a.slotIndex, 42);
  assert.deepEqual(a.pendingEvents.map((e) => e.id), ['evt-beast-crisis']);
  assert.equal(a.disciples.length, 4);
  assert.equal(evs(a, 'aidCompleted').length, 1);
  assert.equal(evs(a, 'candidateAccepted').length, 2);
  assert.deepEqual(a.story.invitations[C2], { status: 'accepted', joinSlotIndex: 18 });
});

// ---------- validator：壞資料各自被拒 ----------

test('Story 純函式：重複結算與缺少前提都丟錯（不是靜默發第二份獎）；nextDueEvent 的優先序與抑制', () => {
  const done = aidEarly('pure');
  const again = clone(done);
  assert.throws(() => Story.settleAidCompletion(again), /已結算過/);
  assert.throws(() => Story.settleAidCompletion(world('pure2')), /已完成的援村工作/);
  // 未升起邀請前：日末（allowPending）才會回邀請；非日末只回援村完成（此處已結算，所以是 null）
  assert.equal(Story.nextDueEvent(done, false), null);
  assert.equal(Story.nextDueEvent(done, true), null, '第 12 格還沒到邀請時點');
  const at18 = adv(done, 20).state;
  assert.equal(at18.phase, 'awaitingChoice');
  // 以第 42 格的合法世界驗證抑制：邀請到期但 slotIndex ≥ 42 時不回邀請
  const probe = clone(at18);
  probe.pendingEvents = [];
  probe.story.triggeredEventIds = probe.story.triggeredEventIds.filter((i) => !i.startsWith('evt-invite'));
  assert.equal(Story.nextDueEvent(probe, true).event.id, 'evt-invite-cand-1');
  probe.slotIndex = 42;
  assert.equal(Story.nextDueEvent(probe, true).event.id, 'evt-beast-crisis', '第 42 格危機優先，邀請被抑制');
  probe.story.triggeredEventIds.push('evt-beast-crisis');
  assert.equal(Story.nextDueEvent(probe, true), null, '危機已升起後邀請仍不補提示');
});

test('validator：偽造的援村／邀請／入隊資料各自被拒絕', () => {
  const done = aidEarly('val');
  assert.deepEqual(C.validateEngineWorld(done), { ok: true });
  const inv = twoInvited('val2');
  const acc = send(inv, 'acceptCandidate', { candidateId: C1 });
  assert.deepEqual(C.validateEngineWorld(acc), { ok: true });
  const cases = [
    ['援村紀錄沒有對應的完成工作', done, (x) => { x.jobs = []; x.reservations = []; }],
    ['援村紀錄的完成格與工作不符', done, (x) => { x.story.rescues[0].completedSlotIndex = 3; }],
    ['援村獎勵尚未領取（與事件同一提交）', done, (x) => { x.story.rescues[0].rewardClaimed = false; }],
    ['援村 ID 不是正式 AID_ID', done, (x) => { x.story.rescues[0].id = 'rescue-1'; }],
    ['援村完成工作沒有紀錄', done, (x) => { x.story.rescues = []; x.story.triggeredEventIds = x.story.triggeredEventIds.filter((i) => i !== 'evt-aid-complete'); }],
    ['援村事件未登記為已觸發', done, (x) => { x.story.triggeredEventIds = x.story.triggeredEventIds.filter((i) => i !== 'evt-aid-complete'); }],
    ['兩個完成的援村工作', done, (x) => { x.jobs.push({ ...clone(x.jobs[0]), id: 'job-0002' }); }],
    ['援村 job 目標格式錯', done, (x) => { x.jobs[0].target.optionId = 'bribe'; }],
    ['援村 job 完成格錯', done, (x) => { x.jobs[0].completedSlotIndex += 1; }],
    ['邀請進度沒有對應事件', inv, (x) => { x.story.triggeredEventIds = x.story.triggeredEventIds.filter((i) => i !== 'evt-invite-cand-1'); }],
    ['援村完成後仍有排隊中的援村工作', done, (x) => { x.jobs.push({ ...clone(x.jobs[0]), id: 'job-0002', status: 'queued', startSlotIndex: null, slotsDone: 0, completedSlotIndex: null, waited: 0 }); }],
    ['援村 job 目標 aidId 錯', done, (x) => { x.jobs[0].target.aidId = 'other-village'; }],
    ['學徒屬性不是固定來源', acc, (x) => { x.disciples[2].attributes.craft += 1; }],
    ['入隊格晚於接受格（未來）', acc, (x) => { x.disciples[2].joinSlotIndex += 1; x.story.invitations[C1].joinSlotIndex += 1; }],
  ];
  for (const [name, base, mut] of cases) {
    const x = clone(base);
    mut(x);
    const v = C.validateEngineWorld(x);
    assert.equal(v.ok, false, name);
  }
});

// ---------- 競爭補充：等待較久者優先 ----------

test('不同選項競爭：先因材料不足而等待的備料援村（waited≥1），材料到位後勝過後排的徒手援村', () => {
  let w = at9('wait-priority');
  w = queueAid(w, P, 'supplied'); // job-0001：材料 0，被拒、累計等待
  w = step(w);
  assert.equal(w.jobs[0].waited, 1);
  w.resources.spiritMaterial = Rules.AID_OPTIONS.supplied.cost.spiritMaterial; // 合法 fixture：補足材料
  w = queueAid(w, M, 'free'); // job-0002（waited 0）
  const n = step(w);
  assert.equal(n.jobs[0].status, 'done');
  assert.equal(n.jobs[1].status, 'cancelled');
  assert.equal(n.jobs[1].waited, 0, '取消格內的落選不計入等待');
  assert.equal(n.story.rescues[0].completedSlotIndex, 10);
  assert.equal(n.resources.spiritMaterial, Rules.AID_OPTIONS.supplied.reward.spiritMaterial);
});

// ---------- 20+ seed × 42 格：故事路線矩陣 ----------

// 矩陣：援村種類(free/supplied) × 時機(early＝第 9 格、late＝第 19 格＝日 7 之後、last＝第 41 格＝最後一格) × 收徒人數(0/1/2)
// 全 18 個組合各一列（已含所有兩兩配對），延後接受（acceptDelay 0／3）在列間交替使兩種值都與每個因子配對；
// 再加 3 列不援村（收徒 0／1／2，邀請永不升起）。共 21 列，每列一個不同 seed 與不同主角設定。
const TIMING = { early: 9, late: 19, last: 41 };
function matrix() {
  const rows = [];
  for (const aid of ['free', 'supplied']) {
    for (const timing of ['early', 'late', 'last']) {
      for (const recruit of [0, 1, 2]) rows.push({ aid, timing, recruit, acceptDelay: (rows.length % 2) * 3 });
    }
  }
  for (const recruit of [0, 1, 2]) rows.push({ aid: 'none', timing: 'early', recruit, acceptDelay: (recruit % 2) * 3 });
  return rows;
}

test('矩陣覆蓋表：所有有效的兩兩配對（援村種類、時機、收徒人數、延後接受）都至少出現一次', () => {
  const rows = matrix();
  assert.equal(rows.length >= 20, true);
  const F = { aid: ['none', 'free', 'supplied'], timing: ['early', 'late', 'last'], recruit: [0, 1, 2], acceptDelay: [0, 3] };
  const names = Object.keys(F);
  const covered = new Set();
  for (const r of rows) {
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        if (r.aid === 'none' && (names[i] === 'timing' || names[j] === 'timing')) continue; // 不援村沒有時機
        covered.add(`${names[i]}=${r[names[i]]}|${names[j]}=${r[names[j]]}`);
      }
    }
  }
  const missing = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const a of F[names[i]]) {
        for (const b of F[names[j]]) {
          const noTiming = (names[i] === 'timing' || names[j] === 'timing');
          if (noTiming && ((names[i] === 'aid' && a === 'none') || (names[j] === 'aid' && b === 'none'))) continue;
          if (!covered.has(`${names[i]}=${a}|${names[j]}=${b}`)) missing.push(`${names[i]}=${a}|${names[j]}=${b}`);
        }
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('21 seed × 42 格故事矩陣：援村完成與獎勵一次、邀請只在可提示時升起、入隊格正確、單步／3 格／42 格批次 hash 相同、不耗 RNG、停在危機待選', () => {
  const templates = Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates);
  const hashes = new Set();
  const problems = [];
  matrix().forEach((row, i) => {
    const seed = `sg-story-${String(i).padStart(3, '0')}`;
    const characterOptions = Smoke.optionsForIndex(i, templates);
    const route = { aid: row.aid, aidFrom: TIMING[row.timing], recruit: row.recruit, acceptDelay: row.acceptDelay };
    const run = Smoke.runStrategy({ seed, characterOptions, route });
    const tag = `${seed} ${JSON.stringify(row)}`;
    if (!run.ok) { problems.push({ tag, error: run.summary.error }); return; }
    const w = run.finalWorld;
    assert.equal(w.slotIndex, 42, tag);
    assert.equal(w.phase, 'awaitingChoice', tag);
    assert.deepEqual(w.pendingEvents.map((e) => e.id), ['evt-beast-crisis'], tag);
    assert.deepEqual(w.rngState, State.newWorld(seed, 'slice-14', characterOptions).state.rngState, `${tag} 不耗 RNG`);
    assert.ok(w.inventory['breakthrough-pill'] >= 1, `${tag} 首爐丹仍在`);
    // 援村：一次、獎勵與選項一致、完成格＝要求的時機（或之後最近的可行格）
    const aids = evs(w, 'aidCompleted');
    assert.equal(aids.length, row.aid === 'none' ? 0 : 1, tag);
    if (row.aid !== 'none') {
      assert.deepEqual(aids[0].reward, Rules.aidReward(row.aid), tag);
      assert.equal(aids[0].optionId, row.aid, tag);
      assert.ok(w.story.rescues[0].completedSlotIndex >= TIMING[row.timing], tag);
      const at = lastResolvedAt(w, w.story.rescues[0].completedSlotIndex);
      assert.equal(at.results.find((r) => r.discipleId === aids[0].discipleId).action, 'aid', tag);
      assert.equal(w.jobs.filter((j) => j.kind === 'aid' && j.status === 'done').length, 1, tag);
    }
    // 邀請只在援村後的日末升起；最後一格完成的援村不升起邀請（危機優先）
    const raised = evs(w, 'eventRaised').filter((e) => e.eventId.startsWith('evt-invite'));
    const expectRaised = row.aid !== 'none' && row.timing !== 'last';
    assert.equal(raised.length, expectRaised ? 2 : 0, tag);
    const joined = w.disciples.filter((d) => d.role === 'apprentice');
    assert.equal(joined.length, expectRaised ? row.recruit : 0, tag);
    for (const d of joined) {
      const raisedAt = raised.find((e) => e.eventId === `evt-invite-${d.id}`).slotIndex;
      assert.equal(d.joinSlotIndex >= raisedAt + row.acceptDelay, true, `${tag} ${d.id} 入隊格`);
      assert.equal(d.joinSlotIndex < 42, true, tag);
      assert.deepEqual(w.story.invitations[d.id], { status: 'accepted', joinSlotIndex: d.joinSlotIndex }, tag);
    }
    assert.equal(w.disciples.length <= State.MAX_ROSTER, true, tag);
    // 沒入隊的候選沒有產出：事件紀錄裡沒有它的結果
    for (const id of State.CANDIDATE_IDS) {
      if (!joined.some((d) => d.id === id)) {
        assert.equal(evs(w, 'slotResolved').some((e) => e.results.some((r) => r.discipleId === id)), false, `${tag} ${id}`);
      }
    }
    for (const batch of [3, 42]) {
      const replayed = Smoke.replay({ seed, characterOptions }, run.script, batch);
      if (State.hashWorld(replayed) !== State.hashWorld(w)) problems.push({ tag, batch });
    }
    // 存讀往返不改變結果
    assert.equal(State.hashWorld(roundTrip(w)), State.hashWorld(w), tag);
    hashes.add(State.hashWorld(w));
  });
  assert.deepEqual(problems, []);
  assert.equal(hashes.size, matrix().length, '每列都是不同的世界');
});
function lastResolvedAt(w, slotIndex) {
  return evs(w, 'slotResolved').find((e) => e.slotIndex === slotIndex);
}

// ---------- smoke CLI：故事路線 ----------

const SMOKE = path.join(__dirname, '..', 'tools', 'smoke.js');
test('smoke CLI 故事路線：摘要含援村完成與獎勵、邀請選擇、入隊格、最終階段、hash、未驗證項；可重跑；與直接執行一致', () => {
  const args = ['--seed', 'story-cli', '--aid', 'supplied', '--recruit', '2'];
  const r = cp.spawnSync(process.execPath, [SMOKE, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.strategy, Smoke.STORY_STRATEGY_VERSION);
  assert.deepEqual(out.versions, { schema: 4, rule: 3, rng: 1 });
  assert.equal(out.story.aid.completed, true);
  assert.deepEqual(out.story.aid.reward, Rules.aidReward('supplied'));
  assert.equal(out.story.aid.completedSlotIndex, 9);
  assert.deepEqual(out.story.choices.filter((c) => c.eventId.startsWith('evt-invite')).map((c) => c.optionId),
    ['opt-invite-cand-1-accept', 'opt-invite-cand-2-accept']);
  assert.deepEqual(out.story.recruits.map((x) => x.id), ['cand-1', 'cand-2']);
  assert.deepEqual(out.story.recruits.map((x) => x.joinSlotIndex), [18, 18]);
  assert.equal(out.final.phase, 'awaitingChoice');
  assert.deepEqual(out.final.pending, ['evt-beast-crisis']);
  assert.match(out.hash, /^[0-9a-f]{64}$/);
  assert.ok(out.notImplemented.some((x) => x.includes('SG-06')));
  assert.equal(cp.spawnSync(process.execPath, [SMOKE, ...args], { encoding: 'utf8' }).stdout, r.stdout);
  const direct = Smoke.runStrategy({ seed: 'story-cli', route: { aid: 'supplied', aidFrom: 9, recruit: 2, acceptDelay: 0 } });
  assert.equal(out.hash, State.hashWorld(direct.finalWorld));
  // 沒帶故事旗標＝原本的 first-furnace-v1
  const base = JSON.parse(cp.spawnSync(process.execPath, [SMOKE, '--seed', 'story-cli'], { encoding: 'utf8' }).stdout);
  assert.equal(base.strategy, Smoke.STRATEGY_VERSION);
  assert.equal(base.story, undefined);
});

test('smoke CLI 故事路線的用法與失敗：壞旗標 2、故事路線未達成（援村來不及）非零並指出原因', () => {
  for (const bad of [['--aid', 'bribe'], ['--recruit', '3'], ['--aid-from', 'x'], ['--accept-delay', '-1'], ['--recruit']]) {
    assert.equal(cp.spawnSync(process.execPath, [SMOKE, '--seed', 'x', ...bad], { encoding: 'utf8' }).status, 2, bad.join(' '));
  }
  const late = cp.spawnSync(process.execPath, [SMOKE, '--seed', 'x', '--aid', 'free', '--aid-from', '42'], { encoding: 'utf8' });
  assert.equal(late.status, 1);
  assert.match(JSON.parse(late.stderr).error, /援村/);
});
