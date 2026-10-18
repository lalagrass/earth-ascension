'use strict';
// SG-02A 第一章內容與事件契約測試。
// 本檔只證明「內容資料、引用、映射與宣告契約」：沒有 advance／存讀／去重／招募／戰鬥 runtime，
// 也不證明完整 AC-C10～C15；那些屬 SG-03／04A／06 等後續工作。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Rng = require('../js/rng.js');
const Rules = require('../js/rules.js');
const State = require('../js/state.js');
const SD = require('../js/story-data.js');

const clone = (x) => JSON.parse(JSON.stringify(x));
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};
const ev = (id) => SD.STORY_DATA.events.find((e) => e.id === id);
const facts = (o = {}) => ({
  slotIndex: 0, rescueCompleted: false, aidCompleted: false, triggeredEventIds: [], crisisOutcome: null,
  invitations: { 'cand-1': { status: 'locked' }, 'cand-2': { status: 'locked' } }, ...o,
});
const due = (o) => SD.dueEvents(facts(o));
const PERSONALITIES = [];
for (const risk of Rules.CHARACTER_OPTION_LIMITS.personality.risk) {
  for (const bond of Rules.CHARACTER_OPTION_LIMITS.personality.bond) PERSONALITIES.push({ risk, bond });
}

// ---------- 載入與純度 ----------

test('資料是深凍結、可 JSON 序列化、無函式的宣告式內容', () => {
  assert.equal(Object.isFrozen(SD.STORY_DATA), true);
  assert.equal(Object.isFrozen(SD.STORY_DATA.events[0]), true);
  assert.equal(Object.isFrozen(SD.STORY_DATA.events[0].options), true);
  const json = JSON.stringify(SD.STORY_DATA);
  assert.deepEqual(JSON.parse(json), clone(SD.STORY_DATA));
  const walk = (v) => {
    assert.notEqual(typeof v, 'function');
    assert.notEqual(typeof v, 'undefined');
    if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(SD.STORY_DATA);
});

test('story-data.js 不使用 RNG、Math.random、牆鐘、eval，只 require rules 與 state', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'story-data.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Math\.random|Date\.now|new Date|performance\.now|nextInt|nextUint32|eval\(|new Function/.test(src), false);
  const requires = [...src.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(requires, ['./rules.js', './state.js']);
});

test('瀏覽器一般 script 依序載入 rng→rules→state→story-data 後內容與 Node 相同；漏載有明確錯誤', () => {
  const load = (names) => {
    const ctx = vm.createContext({});
    for (const f of names) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load(['rng.js', 'rules.js', 'state.js', 'story-data.js']);
  const B = ctx.SectChronicle.StoryData;
  assert.ok(B);
  assert.deepEqual(clone(B.STORY_DATA), clone(SD.STORY_DATA));
  assert.deepEqual(clone(B.validateStoryData()), { ok: true });
  assert.deepEqual(clone(B.dueEvents(facts({ slotIndex: 9 }))), SD.dueEvents(facts({ slotIndex: 9 })));
  assert.throws(() => load(['rng.js', 'rules.js', 'story-data.js']), /state\.js/);
  assert.throws(() => load(['rng.js', 'story-data.js']), /rules\.js/);
});

test('內容版本綁定現行 ruleVersion；內容資料沒有複製規則數字', () => {
  assert.equal(SD.STORY_DATA.requiresRuleVersion, Rules.RULE_VERSION);
  assert.equal(SD.STORY_DATA.contentVersion, 1);
  // 除 priority／contentVersion／requiresRuleVersion 外，內容資料不得出現任何數字（避免複製 SG-02 的成本、階段、獎勵、格數）
  const numbers = [];
  const walk = (v, key) => {
    if (typeof v === 'number') { if (!['priority', 'contentVersion', 'requiresRuleVersion'].includes(key)) numbers.push(`${key}=${v}`); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
  };
  walk(SD.STORY_DATA, '');
  assert.deepEqual(numbers, []);
  // 文字欄位也不含數字（含全形）
  for (const t of SD.collectTexts()) assert.equal(/[0-9０-９]/.test(t.text), false, `${t.path}：${t.text}`);
});

// ---------- 驗證器：會抓到壞資料 ----------

test('正常資料通過驗證；驗證不修改輸入', () => {
  assert.deepEqual(SD.validateStoryData(), { ok: true });
  const frozen = deepFreeze(clone(SD.STORY_DATA));
  assert.deepEqual(SD.validateStoryData(frozen), { ok: true });
});

function mutated(fn) {
  const d = clone(SD.STORY_DATA);
  fn(d);
  return SD.validateStoryData(d);
}
const evOf = (d, id) => d.events.find((e) => e.id === id);

test('驗證器：重複事件／選項 ID、重複一次性鍵', () => {
  assert.equal(mutated((d) => { d.events[1].id = d.events[0].id; }).code, 'duplicate_id');
  assert.equal(mutated((d) => { evOf(d, 'evt-village-plea').options[1].id = evOf(d, 'evt-village-plea').options[0].id; }).code, 'duplicate_id');
  assert.equal(mutated((d) => { evOf(d, 'evt-village-plea').options[0].id = evOf(d, 'evt-beast-crisis').options[0].id; }).code, 'duplicate_id');
  assert.equal(mutated((d) => { d.events[1].onceKey = d.events[0].onceKey; }).code, 'duplicate_once_key');
});

test('驗證器：錯誤引用（階段、規則常數、援村選項、候選、事件）', () => {
  assert.equal(mutated((d) => { evOf(d, 'evt-phase-omen').trigger = { slotAtLeast: { phase: 'nope', field: 'startSlot' } }; }).code, 'bad_ref');
  assert.equal(mutated((d) => { evOf(d, 'evt-village-plea').trigger.all[0].slotAtLeast = { rule: 'NOPE' }; }).code, 'bad_ref');
  assert.equal(mutated((d) => { d.contracts.aid.aidId = 'other-aid'; }).code, 'bad_ref');
  assert.equal(mutated((d) => { evOf(d, 'evt-aid-complete').options = undefined; delete evOf(d, 'evt-aid-complete').options; evOf(d, 'evt-aid-complete').effects[0].rewardOptions = ['free', 'ghost']; }).code, 'bad_ref');
  assert.equal(mutated((d) => { evOf(d, 'evt-invite-cand-2').trigger.all[1].eventTriggered = 'evt-ghost'; }).code, 'bad_ref');
});

test('驗證器：不存在第三名候選，兩名固定候選都有且只有一個邀請事件', () => {
  assert.equal(mutated((d) => { evOf(d, 'evt-invite-cand-2').candidateId = 'cand-3'; }).code, 'unknown_candidate');
  assert.equal(mutated((d) => { d.contracts.recruitment.candidateIds = ['cand-1', 'cand-2', 'cand-3']; }).code, 'unknown_candidate');
  assert.equal(mutated((d) => { d.events = d.events.filter((e) => e.id !== 'evt-invite-cand-2'); }).code, 'candidate_coverage');
  assert.equal(mutated((d) => { evOf(d, 'evt-invite-cand-2').candidateId = 'cand-1'; }).code, 'candidate_coverage');
});

test('驗證器：缺文案、文字含數字、描述沒連到規則也沒標純敘事、宣告與規則不符', () => {
  assert.equal(mutated((d) => { delete evOf(d, 'evt-village-plea').text.body; }).code, 'missing_text');
  assert.equal(mutated((d) => { evOf(d, 'evt-village-plea').options[0].label = ''; }).code, 'missing_text');
  assert.equal(mutated((d) => { evOf(d, 'evt-phase-omen').text.body += '修行加成 20%'; }).code, 'number_in_text');
  assert.equal(mutated((d) => { delete evOf(d, 'evt-village-plea').narrativeOnly; }).code, 'unlinked_description');
  assert.equal(mutated((d) => { evOf(d, 'evt-phase-omen').claims = ['herbLocked']; }).code, 'claim_false');
  assert.equal(mutated((d) => { evOf(d, 'evt-phase-faint').claims = ['herbUnlocked']; }).code, 'claim_false');
  assert.equal(mutated((d) => { evOf(d, 'evt-phase-faint').claims = ['mystery']; }).code, 'bad_claim');
});

test('驗證器：未知效果、缺必要欄位、效果值不在 state 合法枚舉內', () => {
  assert.equal(mutated((d) => { evOf(d, 'evt-village-plea').options[0].effects[0].type = 'teleport'; }).code, 'unknown_effect');
  assert.equal(mutated((d) => { delete evOf(d, 'evt-ending-victory').effects[0].value; }).code, 'bad_effect');
  assert.equal(mutated((d) => { evOf(d, 'evt-ending-victory').effects[0].value = 'allied'; }).code, 'bad_effect');
  assert.equal(mutated((d) => { evOf(d, 'evt-invite-cand-1').options[0].effects[0].status = 'accepted'; }).code, 'bad_effect');
  assert.equal(mutated((d) => { evOf(d, 'evt-invite-cand-1').options[0].effects.push({ type: 'grantAidReward', aidId: 'village-fence', rewardOptions: ['free'], dedupeKey: 'reward:village-fence' }); }).code, 'reward_outside_aid');
});

test('驗證器：性格兩軸與四組合都必須有文案', () => {
  assert.equal(mutated((d) => { delete d.personality.byKind.plea.risk.bold; }).code, 'personality_incomplete');
  assert.equal(mutated((d) => { d.personality.byKind.crisis.bond.caring.line = ''; }).code, 'personality_incomplete');
  assert.equal(mutated((d) => { delete d.personality.combos['bold+caring']; }).code, 'personality_incomplete');
  assert.equal(mutated((d) => { delete d.personality.fallback; }).code, 'personality_incomplete');
  assert.equal(mutated((d) => { delete d.templates['herb-child']; }).code, 'template_mismatch');
  assert.equal(mutated((d) => { d.templates['dojo-apprentice'].origin = 'legacy-prototype'; }).code, 'template_mismatch');
});

test('驗證器：ruleVersion 不符與未知頂層欄位明確拒絕', () => {
  assert.equal(mutated((d) => { d.requiresRuleVersion = 1; }).code, 'rule_version_mismatch');
  assert.equal(mutated((d) => { d.defensePrepPoints = 3; }).code, 'unknown_field');
});

// ---------- 階段邊界：slot 8/9、17/18、29/30、41/42 ----------

test('復甦階段事件在 slot 8/9、17/18、29/30 的邊界精確觸發，且只觸發一次', () => {
  const phaseIds = ['evt-phase-faint', 'evt-phase-omen', 'evt-phase-manifest', 'evt-phase-surge'];
  const phaseDue = (slotIndex, triggeredEventIds = []) => due({ slotIndex, triggeredEventIds }).filter((id) => phaseIds.includes(id));
  assert.deepEqual(phaseDue(0), ['evt-phase-faint']);
  assert.deepEqual(phaseDue(8, ['evt-phase-faint']), []);
  assert.deepEqual(phaseDue(9, ['evt-phase-faint']), ['evt-phase-omen']);
  assert.deepEqual(phaseDue(17, phaseIds.slice(0, 2)), []);
  assert.deepEqual(phaseDue(18, phaseIds.slice(0, 2)), ['evt-phase-manifest']);
  assert.deepEqual(phaseDue(29, phaseIds.slice(0, 3)), []);
  assert.deepEqual(phaseDue(30, phaseIds.slice(0, 3)), ['evt-phase-surge']);
  assert.deepEqual(phaseDue(42, phaseIds), [], '已觸發者不重複');
  // 事件與規則表的 startSlot 一一對應
  for (const p of Rules.SPIRIT_PHASES) {
    const e = ev(`evt-phase-${p.id}`);
    assert.deepEqual(e.trigger, { slotAtLeast: { phase: p.id, field: 'startSlot' } });
    assert.equal(SD.resolveRef(e.trigger.slotAtLeast), p.startSlot);
  }
  // 階段事件不是待選事件，不會讓 advance 停下
  for (const id of phaseIds) assert.equal(ev(id).pending, false);
});

test('階段文字的宣告對得上 SG-02 規則表（草木與野獸變化只描述已存在的數值或純敘事）', () => {
  assert.deepEqual(ev('evt-phase-faint').claims, ['herbLocked']);
  assert.equal(Rules.SPIRIT_PHASES[0].herbYield, 0);
  assert.deepEqual(ev('evt-phase-omen').claims, ['herbUnlocked', 'cultivationBoost']);
  assert.ok(Rules.SPIRIT_PHASES[1].herbYield > 0);
  assert.ok(Rules.SPIRIT_PHASES[1].cultivationBp > Rules.SPIRIT_PHASES[0].cultivationBp);
  assert.ok(ev('evt-phase-surge').claims.includes('threatRises'));
  assert.ok(Rules.SPIRIT_PHASES[3].threatLevel > Rules.SPIRIT_PHASES[2].threatLevel);
});

// ---------- 援村：求援、完成、一次性物資 ----------

test('求援在援村開放格（slot 8/9）出現；接受提示本身不完成援村、不發物資', () => {
  assert.deepEqual(due({ slotIndex: 8, triggeredEventIds: ['evt-phase-faint'] }), []);
  assert.deepEqual(due({ slotIndex: 9, triggeredEventIds: ['evt-phase-faint'] }), ['evt-village-plea', 'evt-phase-omen'], '待選求援優先於階段通知');
  assert.equal(SD.resolveRef({ rule: 'AID_AVAILABLE_FROM_SLOT' }), Rules.AID_AVAILABLE_FROM_SLOT);
  const plea = ev('evt-village-plea');
  assert.equal(plea.pending, true);
  assert.deepEqual(plea.options.map((o) => o.id), ['opt-aid-accept', 'opt-aid-later']);
  for (const o of plea.options) {
    for (const e of o.effects) assert.equal(['grantAidReward', 'recordRescue'].includes(e.type), false, `${o.id} 不得完成援村或發獎`);
  }
  assert.deepEqual(plea.options[0].effects, [{ type: 'showAidPrompt', aidId: Rules.AID_ID }]);
  // 已完成援村後不再求援
  assert.equal(due({ slotIndex: 12, rescueCompleted: true, triggeredEventIds: ['evt-phase-faint', 'evt-phase-omen'] }).includes('evt-village-plea'), false);
});

test('一次性物資只在援村完成事件發放；兩種做法共用同一個去重鍵；招募通知不再發獎', () => {
  const done = ev('evt-aid-complete');
  assert.deepEqual(due({ slotIndex: 10, aidCompleted: true, triggeredEventIds: ['evt-phase-faint', 'evt-phase-omen', 'evt-village-plea'] }), ['evt-aid-complete']);
  assert.equal(due({ slotIndex: 10, aidCompleted: false }).includes('evt-aid-complete'), false);
  assert.equal(done.pending, false);
  const grants = done.effects.filter((e) => e.type === 'grantAidReward');
  assert.equal(grants.length, 1);
  assert.deepEqual([...grants[0].rewardOptions].sort(), Object.keys(Rules.AID_OPTIONS).sort());
  assert.equal(grants[0].dedupeKey, 'reward:village-fence');
  assert.equal(done.effects.find((e) => e.type === 'recordRescue').dedupeKey, 'reward:village-fence');
  assert.equal(done.onceKey, 'aid:village-fence');
  assert.equal(SD.STORY_DATA.contracts.aid.rewardOnce, true);
  assert.equal(SD.STORY_DATA.contracts.aid.recruitmentGrantsReward, false);
  // 全資料中只有這個事件含 grantAidReward／recordRescue
  const carriers = [];
  for (const e of SD.STORY_DATA.events) {
    const all = [...(e.effects || []), ...(e.options || []).flatMap((o) => o.effects)];
    if (all.some((x) => ['grantAidReward', 'recordRescue'].includes(x.type))) carriers.push(e.id);
  }
  assert.deepEqual(carriers, ['evt-aid-complete']);
  // 援村規格引用 SG-02：一人一格；成本與獎勵不在內容資料中
  const c = SD.STORY_DATA.contracts.aid;
  assert.equal(c.aidId, Rules.AID_ID);
  assert.deepEqual(c.durationSlots, { rule: 'AID_DURATION_SLOTS' });
  assert.equal(SD.resolveRef(c.durationSlots), 1);
  assert.equal(SD.resolveRef(c.workers), 1);
  assert.equal(JSON.stringify(SD.STORY_DATA).includes('spiritMaterial'), false, '成本／獎勵只由 rules.js 持有');
});

// ---------- 招募 ----------

const aidDone = ['evt-phase-faint', 'evt-phase-omen', 'evt-village-plea', 'evt-aid-complete'];
test('兩次固定招募：需已援村且日 7（slot 17/18）起；順序固定；各只出現一次', () => {
  assert.deepEqual(due({ slotIndex: 17, rescueCompleted: true, triggeredEventIds: aidDone }), []);
  assert.deepEqual(due({ slotIndex: 18, rescueCompleted: true, triggeredEventIds: [...aidDone] }), ['evt-invite-cand-1', 'evt-phase-manifest']);
  assert.equal(SD.resolveRef({ phase: 'manifest', field: 'startSlot' }), 18);
  // 未援村：日 7 之後也不會有邀請
  assert.equal(due({ slotIndex: 25, rescueCompleted: false, triggeredEventIds: ['evt-phase-faint', 'evt-phase-omen', 'evt-phase-manifest'] }).some((id) => id.startsWith('evt-invite')), false);
  // 第二位只在第一位事件觸發後才出現，固定順序
  const base = [...aidDone, 'evt-phase-manifest'];
  assert.equal(due({ slotIndex: 19, rescueCompleted: true, triggeredEventIds: base }).includes('evt-invite-cand-2'), false);
  assert.deepEqual(due({ slotIndex: 19, rescueCompleted: true, triggeredEventIds: [...base, 'evt-invite-cand-1'] }), ['evt-invite-cand-2']);
  // 每次邀請只出現一次：已觸發就不再重彈（稍後不每天重彈）
  const all = [...base, 'evt-invite-cand-1', 'evt-invite-cand-2'];
  for (let s = 19; s <= 41; s++) {
    const inv = { 'cand-1': { status: 'deferred' }, 'cand-2': { status: 'deferred' } };
    assert.deepEqual(due({ slotIndex: s, rescueCompleted: true, triggeredEventIds: ['evt-phase-surge', ...all], invitations: inv }), [], `slot ${s}`);
  }
  assert.ok(ev('evt-invite-cand-1').trigger.all.some((c) => c.candidateStatus), '邀請條件引用 state 的邀請狀態');
});

test('招募契約與 state 一致：候選 ID、人數上限、確認／稍後後都回 planning、加入前沒有勞動力', () => {
  const r = SD.STORY_DATA.contracts.recruitment;
  assert.deepEqual(r.candidateIds, [...State.CANDIDATE_IDS]);
  assert.equal('maxRoster' in r, false, '人數上限的唯一來源是 State.MAX_ROSTER，內容不複製');
  assert.equal(SD.resolveRef({ rule: 'MAX_SLOT_INDEX' }), 42);
  assert.equal(r.offerOnce, true);
  assert.equal(r.reprompt, 'never');
  assert.deepEqual(r.afterChoice, { phase: 'planning' });
  assert.deepEqual(r.acceptCommand, {
    name: 'acceptCandidate', allowedPhases: ['planning'], joinSlot: 'slotIndexAtAcceptance', backpay: false,
    rejectedWhenSlotAtLeast: { rule: 'MAX_SLOT_INDEX' },
  });
  assert.deepEqual(r.beforeJoin, { work: false, support: false, power: false });
  assert.equal(r.anyHeadcountReachesCrisis, true);
  for (const id of State.CANDIDATE_IDS) {
    const e = SD.STORY_DATA.events.find((x) => x.candidateId === id);
    assert.ok(e, id);
    assert.equal(e.kind, 'invitation');
    assert.equal(e.pending, true);
    assert.deepEqual(e.options.map((o) => o.effects[0].status).sort(), ['deferred', 'invited']);
    for (const o of e.options) {
      assert.equal(o.effects[0].type, 'setInvitationStatus');
      assert.equal(o.effects[0].candidateId, id);
      assert.equal(State.CANDIDATE_IDS.includes(o.effects[0].candidateId), true);
      assert.equal(o.effects.length, 1, '選擇只改邀請狀態；返回 planning 由契約規定');
    }
  }
  // 邀請事件不產出任何資源、屬性或角色（角色屬性不是敘事包可自定的）
  for (const e of SD.STORY_DATA.events.filter((x) => x.kind === 'invitation')) {
    for (const o of e.options) for (const x of o.effects) assert.equal(['grantAidReward', 'recordRescue', 'setAttributes', 'addDisciple'].includes(x.type), false);
  }
});

// ---------- 獸患、立派與師父 ----------

test('獸患待選在 slot 41/42 邊界出現，優先於所有可選招募；選布陣後才進 ending', () => {
  const pendingInvite = [...aidDone, 'evt-phase-manifest', 'evt-phase-surge', 'evt-invite-cand-1'];
  assert.equal(due({ slotIndex: 41, rescueCompleted: true, triggeredEventIds: pendingInvite }).includes('evt-beast-crisis'), false);
  const at42 = due({ slotIndex: 42, rescueCompleted: true, triggeredEventIds: pendingInvite });
  assert.deepEqual(at42, ['evt-beast-crisis', 'evt-invite-cand-2'], '危機優先於未處理的招募');
  const crisis = ev('evt-beast-crisis');
  assert.equal(crisis.pending, true);
  assert.equal(crisis.kind, 'crisis');
  assert.ok(crisis.priority > Math.max(...SD.STORY_DATA.events.filter((e) => e.kind === 'invitation').map((e) => e.priority)));
  assert.deepEqual(crisis.options.map((o) => o.id), ['opt-crisis-submit']);
  assert.deepEqual(crisis.options[0].effects.map((e) => e.type), ['submitFormation']);
  assert.deepEqual(crisis.options[0].effects[0], { type: 'submitFormation', payloadOwner: 'SG-06' });
  const c = SD.STORY_DATA.contracts.crisis;
  assert.deepEqual(c.slotAtLeast, { rule: 'MAX_SLOT_INDEX' });
  assert.equal(c.priorityOverInvitations, true);
  assert.equal(c.afterResolution, 'ending');
  assert.equal(c.noSlot43, true);
  assert.equal(c.resolveOnce, true);
  assert.deepEqual(c.outcomes, ['defeat', 'victory']);
});

test('結局只引用勝負結果：勝利才立派、失敗暫緩，值取自 state 合法枚舉；沒有自動成功', () => {
  const win = ev('evt-ending-victory');
  const lose = ev('evt-ending-defeat');
  const beforeEnding = SD.STORY_DATA.events.filter((e) => e.kind !== 'ending').map((e) => e.id);
  assert.deepEqual(due({ slotIndex: 42, crisisOutcome: 'victory', triggeredEventIds: beforeEnding, rescueCompleted: true }), ['evt-ending-victory']);
  assert.deepEqual(due({ slotIndex: 42, crisisOutcome: 'defeat', triggeredEventIds: beforeEnding, rescueCompleted: true }), ['evt-ending-defeat']);
  assert.deepEqual(due({ slotIndex: 42, crisisOutcome: null, triggeredEventIds: beforeEnding, rescueCompleted: true }), [], '沒有結果就沒有結局');
  assert.equal(win.effects.find((e) => e.type === 'setOrganisationStatus').value, 'sectFounded');
  assert.equal(lose.effects.find((e) => e.type === 'setOrganisationStatus').value, 'foundingDeferred');
  for (const v of [win, lose]) {
    assert.equal(State.ORGANISATION_STATUSES.includes(v.effects.find((e) => e.type === 'setOrganisationStatus').value), true);
    assert.equal(v.pending, false);
  }
  // 主角首席弟子只是顯示標籤，不改任何世界欄位
  const label = win.effects.find((e) => e.type === 'displayLabel');
  assert.deepEqual(label, { type: 'displayLabel', labelId: 'chief-disciple' });
  assert.equal(SD.EFFECT_TYPES.displayLabel.worldChange, false);
  assert.equal(lose.effects.some((e) => e.type === 'displayLabel'), false);
  // 不產生戰力、勝率、強制成功
  for (const e of SD.STORY_DATA.events) {
    for (const x of [...(e.effects || []), ...(e.options || []).flatMap((o) => o.effects)]) {
      assert.equal(['setPower', 'setWinChance', 'forceVictory'].includes(x.type), false);
    }
  }
});

test('師父維持館主：沒有死亡／失蹤／交棒效果或文字', () => {
  const m = SD.STORY_DATA.contracts.master;
  assert.deepEqual(m, { remainsMaster: true, scriptedDeath: false, scriptedDisappearance: false });
  for (const e of SD.STORY_DATA.events) {
    for (const x of [...(e.effects || []), ...(e.options || []).flatMap((o) => o.effects)]) {
      assert.equal(['removeDisciple', 'killDisciple', 'transferLeadership'].includes(x.type), false);
    }
  }
  for (const t of SD.collectTexts()) assert.equal(/身亡|去世|死去|失蹤|下落不明|傳位|交出掌門/.test(t.text), false, `${t.path}：${t.text}`);
});

// ---------- 性格文案映射 ----------

test('兩軸四組合都有文案；未知性格退回 fallback；文案只含文字', () => {
  const kinds = ['plea', 'invitation', 'crisis'];
  for (const p of PERSONALITIES) {
    for (const k of kinds) {
      const n = SD.personalityNote(k, p);
      assert.equal(n.fallback, false, `${k}/${p.risk}+${p.bond}`);
      assert.deepEqual(Object.keys(n).sort(), ['combo', 'fallback', 'lines', 'suggestions']);
      assert.equal(n.suggestions.length, 2);
      assert.equal(n.lines.length, 2);
      for (const s of [...n.suggestions, ...n.lines, n.combo]) assert.ok(typeof s === 'string' && s.length > 0);
      assert.notEqual(n.suggestions[0], n.suggestions[1]);
    }
  }
  // 四個組合彼此文案不同（不是複製同一段）
  for (const k of kinds) {
    const sets = new Set(PERSONALITIES.map((p) => JSON.stringify(SD.personalityNote(k, p))));
    assert.equal(sets.size, 4, k);
  }
  for (const bad of [undefined, null, {}, { risk: 'reckless', bond: 'caring' }, { risk: 'bold' }, 'bold']) {
    const n = SD.personalityNote('plea', bad);
    assert.equal(n.fallback, true, JSON.stringify(bad));
    assert.ok(n.suggestions.length === 1 && n.lines.length === 1);
  }
  assert.equal(SD.personalityNote('unknown-kind', PERSONALITIES[0]).fallback, true);
});

test('性格不能改變選項、條件、效果；描述事件的選項清單對四種性格完全相同', () => {
  for (const e of SD.STORY_DATA.events.filter((x) => x.pending)) {
    const baseline = JSON.stringify(SD.describeEvent(e.id, PERSONALITIES[0]).options);
    for (const p of PERSONALITIES) {
      const d = SD.describeEvent(e.id, p);
      assert.equal(JSON.stringify(d.options), baseline, `${e.id} ${p.risk}+${p.bond}`);
      assert.deepEqual(d.options.map((o) => o.id), e.options.map((o) => o.id), '不隱藏任何合法選項');
      assert.deepEqual(d.title, e.text.title);
    }
  }
  // 觸發條件的函式簽名沒有性格；傳入也不影響結果
  const f = facts({ slotIndex: 9, triggeredEventIds: ['evt-phase-faint'] });
  assert.deepEqual(SD.dueEvents({ ...f, personality: { risk: 'bold', bond: 'caring' } }), SD.dueEvents(f));
  // 事件 effects 內沒有任何性格欄位
  assert.equal(/cautious|bold|independent|caring/.test(JSON.stringify(SD.STORY_DATA.events)), false);
});

test('主角模板文案與 rules 的模板一一對應，且標明為本版新模板（不宣稱搬自舊原型）', () => {
  assert.deepEqual(Object.keys(SD.STORY_DATA.templates).sort(), Object.keys(Rules.CHARACTER_OPTION_LIMITS.templates).sort());
  for (const [id, t] of Object.entries(SD.STORY_DATA.templates)) {
    assert.equal(t.origin, 'new-in-this-version', id);
    assert.ok(t.label && t.blurb, id);
  }
});

// ---------- 讀取不改輸入與 RNG、未知 ID 明確拒絕 ----------

test('函式不修改輸入、不消耗 RNG；未知事件／選項 ID 明確拒絕', () => {
  const f = deepFreeze(facts({ slotIndex: 18, rescueCompleted: true, triggeredEventIds: [...aidDone] }));
  const rngBefore = Rng.create('story-seed');
  const snapshot = [...rngBefore];
  assert.doesNotThrow(() => SD.dueEvents(f));
  SD.describeEvent('evt-village-plea', PERSONALITIES[1]);
  SD.personalityNote('crisis', PERSONALITIES[2]);
  assert.deepEqual(rngBefore, snapshot);
  assert.equal(SD.getEvent('evt-ghost'), null);
  assert.deepEqual(SD.validateChoice('evt-ghost', 'opt-x'), { ok: false, code: 'unknown_event', reason: '未知事件：evt-ghost' });
  assert.deepEqual(SD.validateChoice('evt-village-plea', 'opt-x'), { ok: false, code: 'unknown_option', reason: '事件 evt-village-plea 沒有選項 opt-x' });
  assert.deepEqual(SD.validateChoice('evt-village-plea', 'opt-aid-later'), { ok: true });
  assert.deepEqual(SD.validateChoice('evt-phase-omen', 'opt-aid-later'), { ok: false, code: 'not_pending', reason: '事件 evt-phase-omen 不是待選事件' });
  assert.throws(() => SD.describeEvent('evt-ghost', PERSONALITIES[0]), RangeError);
  for (const bad of [{ ...facts(), slotIndex: 43 }, { ...facts(), slotIndex: 1.5 }, { ...facts(), crisisOutcome: 'draw' }, { ...facts(), triggeredEventIds: 'x' }, { ...facts(), invitations: {} }, null]) {
    assert.throws(() => SD.dueEvents(bad), /facts|slotIndex|crisisOutcome|triggeredEventIds|invitations/);
  }
});

test('不影響世界版本與 golden：state／rules 版本不變，新局不含任何故事資料欄位', () => {
  assert.equal(State.RULE_VERSION, 2);
  assert.equal(State.SCHEMA_VERSION, 1);
  const w = State.newWorld('sg-02a-check').state;
  assert.equal(JSON.stringify(w).includes('evt-'), false);
  assert.equal(JSON.stringify(w).includes('opt-'), false);
  assert.deepEqual(w.story.triggeredEventIds, []);
});
