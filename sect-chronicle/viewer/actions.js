/*
 * SG-RT-04：畫面上「可以做什麼」與「結果怎麼說」。純函式，不碰 DOM、不讀 RNG、不改世界，可以在 Node 測。
 *
 * - placeActions：點地點後主角能下的令，附不能做的原因。只列 orderActivity 支援的種類；能不能開工最後仍由引擎判斷。
 * - personActions：取消主角的手動指令。已開工的承諾工作取消後仍會做完（引擎回 manualLockReleased），不說成停工。
 * - pendingAsks：三類詢問（求援、收徒、突破）的選項。事件與選項 id 取自 world.pendingEvents、StoryData 模板與
 *   Realtime.BREAKTHROUGH_ASK，每個選項只對應一條正式命令（chooseEvent 或 acceptCandidate）。
 * - commandFeedback／rejectText／tickFeedback：把命令結果與新事件翻成玩家看得懂的話；只讀回傳的事件與世界。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    ns.ViewerActions = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RES_NAMES = Object.freeze({ spiritMaterial: '靈材', spiritHerb: '靈草', spiritStone: '靈石', reputation: '聲望', pills: '凝氣丹' });
  const ELEMENT_NAMES = Object.freeze({ wood: '木', fire: '火', earth: '土', metal: '金', water: '水' });
  const PROMISE_KINDS = Object.freeze(['build', 'brew', 'aid', 'breakthrough', 'support']);
  const FALLBACK_WHY = Object.freeze({
    insufficient_resource: '資源不足', no_seat: '沒有空位', participant_busy: '參與者忙碌', facility_missing: '設施未建',
    facility_not_ready: '設施未完工', cultivation_full: '修為已滿', breakthrough_done: '已突破過',
  });
  const INVALID_WHY = Object.freeze({
    blocked: '還沒開放', already_done: '已經完成', facility_exists: '已有這種設施', not_ready: '修為未滿',
    already_breakthrough: '已突破過', breakthrough_pending: '已有進行中的突破', unknown_disciple: '找不到支援者',
    not_eligible: '資格不符',
  });
  // 只有畫面自己的拒絕需要另寫；引擎拒絕的 reason 本來就是中文，直接顯示。
  const REJECT_LEAD = Object.freeze({
    stale_revision: '畫面已過時：打開選單之後世界又變了，這次沒有送出。選單已依現在的世界更新，請再選一次。',
    stale_generation: '世界已經換過（新局、讀檔或匯入），這個操作作廢。',
    intent_spent: '這個操作已經送出過一次，不會重複送。',
    world_stopped: '世界已因錯誤停止，不再接受命令。',
    not_started: '世界還沒開始。',
  });
  const PERSONALITY = Object.freeze({
    risk: Object.freeze({ cautious: '謹慎', bold: '果敢' }),
    bond: Object.freeze({ independent: '獨立', caring: '重情' }),
  });
  const ATTRIBUTE_NAMES = Object.freeze({ rootBone: '根骨', comprehension: '悟性', craft: '手藝' });

  const kindName = (Rules, kind) => (Rules.ACTIONS[kind] ? Rules.ACTIONS[kind].label : String(kind));
  const slotEq = (Rules, world) => Math.floor(world.clock.tick / Rules.TICKS_PER_SLOT);
  const disciple = (world, id) => world.disciples.find((d) => d.id === id) || null;
  const activityOf = (world, d) => (d && d.activityId ? world.activities.find((a) => a.id === d.activityId) || null : null);

  function costText(cost) {
    const parts = Object.keys(cost).filter((k) => cost[k]).map((k) => `${RES_NAMES[k] || k} ${cost[k]}`);
    return parts.length ? parts.join('、') : '不花資源';
  }
  function enough(world, cost) {
    return Object.keys(cost).every((k) => (k === 'pills' ? world.inventory['breakthrough-pill'] : world.resources[k] || 0) >= cost[k]);
  }

  function facilities(Rules, world) {
    const out = {};
    for (const a of world.activities) {
      if (a.kind !== 'build' || a.status === 'cancelled') continue;
      const f = Rules.FACILITIES[a.target.facilityType];
      out[a.target.tileId] = {
        type: a.target.facilityType, label: f ? f.label : a.target.facilityType, done: a.status === 'done',
        progress: { done: a.workTicks, total: a.units * Rules.TICKS_PER_SLOT },
      };
    }
    return out;
  }

  // 地點 key：村口是 'gate'，地塊用 tile id。
  function placeTitle(Rules, world, key) {
    if (key === 'gate') return '村口';
    const t = world.tiles.find((x) => x.id === key);
    if (!t) return key;
    if (t.row === Rules.DOJO.r && t.col === Rules.DOJO.c) return '道館';
    const f = facilities(Rules, world)[t.id];
    if (f) return `${f.label}${f.done ? '' : '（建造中）'}`;
    return `${Rules.TERRAIN[t.terrain] ? Rules.TERRAIN[t.terrain].label : t.terrain}（${t.row},${t.col}）`;
  }

  // 鍵盤用的地點清單：道館、村口在前，其餘依列、行。
  function places(Rules, world) {
    const dojo = world.tiles.find((t) => t.row === Rules.DOJO.r && t.col === Rules.DOJO.c);
    const keys = [dojo.id, 'gate'].concat(world.tiles.filter((t) => t !== dojo).map((t) => t.id));
    return keys.map((key) => ({ key, title: placeTitle(Rules, world, key) }));
  }

  function placeActions(deps, world, key, selectedId) {
    const Rules = deps.Rules;
    const pid = world.protagonistId;
    const prot = disciple(world, pid);
    const phase = Rules.phaseAtEq(slotEq(Rules, world));
    const info = [];
    const actions = [];
    const order = (kind, target, units, extra) => ({
      type: 'orderActivity', payload: Object.assign({ discipleId: pid, kind, target, units }, extra || {}),
    });
    const push = (a) => actions.push(Object.assign({ disabled: null, warn: null }, a));
    const dojoTile = world.tiles.find((t) => t.row === Rules.DOJO.r && t.col === Rules.DOJO.c);

    if (key === 'gate') {
      const done = world.story.rescues.some((x) => x.id === Rules.AID_ID);
      const open = Rules.aidAvailableEq(slotEq(Rules, world));
      info.push(done ? '村民的籬笆已經修好了。' : (open ? '村民在求援：修籬笆。' : '目前沒有人求援（第 4 天起）。'));
      for (const id of Object.keys(Rules.AID_OPTIONS)) {
        const o = Rules.AID_OPTIONS[id];
        push({
          key: `aid-${id}`, label: `援村：${o.label}`, why: `${costText(o.cost)}；謝禮 ${costText(o.reward)}`,
          disabled: done ? '援村已完成' : (!open ? '第 4 天（初兆）起才有人求援' : null),
          warn: enough(world, o.cost) ? null : '材料現在不夠，出發時會改成休養',
          command: order('aid', { optionId: id }, 1),
        });
      }
    } else if (dojoTile && key === dojoTile.id) {
      info.push('宗門的道館：修行、休養、調心與突破都在這裡（有聚靈台或居所時，引擎可能安排去那裡）。');
      push({ key: 'cultivate-1', label: '修行 1 單位', why: '修為上升，耗體力與心境', command: order('cultivate', {}, 1) });
      push({ key: 'cultivate-3', label: '修行 3 單位', why: '連續修行，中途可以取消', command: order('cultivate', {}, 3) });
      push({ key: 'rest-1', label: '休養 1 單位', why: '恢復體力', command: order('rest', {}, 1) });
      push({ key: 'tune-mind-1', label: '調心 1 單位', why: '恢復心境', command: order('tune-mind', {}, 1) });
      const e = deps.Progression.eligibility(prot);
      const notYet = e.ok ? null : `${INVALID_WHY[e.code] || e.reason}`;
      const pills = world.inventory['breakthrough-pill'];
      const master = disciple(world, world.masterId);
      const masterFree = master && master.activityId === null && master.manualOrder === null;
      push({
        key: 'breakthrough-pill', label: '突破：用丹，師父護法', why: `凝氣丹 ${pills} 顆；成敗只擲一次，同意不等於成功`,
        disabled: notYet || (pills < 1 ? '沒有凝氣丹' : null),
        warn: masterFree ? null : '師父正在忙，會等師父到場才開始',
        command: order('breakthrough', {}, 1, { usePill: true, supporterId: world.masterId }),
      });
      push({
        key: 'breakthrough-plain', label: '突破：不用丹，無人護法', why: '成功率較低；成敗只擲一次',
        disabled: notYet, command: order('breakthrough', {}, 1, { usePill: false, supporterId: null }),
      });
    } else {
      const t = world.tiles.find((x) => x.id === key);
      if (!t) return { key, title: key, info: ['沒有這個地點'], who: null, actions: [] };
      const f = facilities(Rules, world)[t.id];
      const el = ELEMENT_NAMES[t.element] || t.element;
      if (t.terrain === 'material') {
        info.push(`靈材點（${el}）。兩個工作位。`);
        for (const n of [1, 3]) {
          push({
            key: `gather-material-${n}`, label: `採集靈材 ${n} 單位`, why: `每單位耗體力 ${Rules.ACTIONS['gather-material'].staminaCost}`,
            command: order('gather-material', { tileId: t.id }, n),
          });
        }
      } else if (t.terrain === 'herb') {
        const grown = phase.herbYield > 0;
        info.push(grown ? `靈草點（${el}）。兩個工作位。` : '靈草還沒長出來：第 4 天（初兆）起才能採。');
        for (const n of [1, 3]) {
          push({
            key: `gather-herb-${n}`, label: `採集靈草 ${n} 單位`, why: `每單位耗體力 ${Rules.ACTIONS['gather-herb'].staminaCost}`,
            disabled: grown ? null : '靈草尚未長出（第 4 天起）', command: order('gather-herb', { tileId: t.id }, n),
          });
        }
      } else if (f && !f.done) {
        info.push(`${f.label}建造中：${Math.floor((f.progress.done / f.progress.total) * 100)}%。一次只能一人施工。`);
      } else if (f) {
        if (f.type === 'alchemyRoom') {
          const rc = Rules.RECIPES['breakthrough-pill'];
          info.push('丹房：可以煉凝氣丹。');
          push({
            key: 'brew-breakthrough-pill', label: `煉丹：${rc.label}`, why: `${costText(rc.cost)}，${rc.durationSlots} 單位`,
            warn: enough(world, rc.cost) ? null : '材料現在不夠，出發時會改成休養',
            command: order('brew', { recipeId: 'breakthrough-pill' }, rc.durationSlots),
          });
        } else if (f.type === 'spiritTerrace') {
          info.push('聚靈台：修行效率較好，一個座位。座位由引擎分配，滿了會回道館。');
          push({ key: 'cultivate-1', label: '修行 1 單位', why: '引擎優先安排到聚靈台', command: order('cultivate', {}, 1) });
        } else {
          info.push('居所：休養的地方，兩個床位。');
          push({ key: 'rest-1', label: '休養 1 單位', why: '引擎優先安排到居所', command: order('rest', {}, 1) });
        }
      } else {
        info.push(`空地（${el}）。可以蓋設施；五行相生相剋會影響效率。`);
        const built = facilities(Rules, world);
        for (const type of Object.keys(Rules.FACILITIES)) {
          const fd = Rules.FACILITIES[type];
          const place = Rules.evaluateFacilityPlacement(world.tiles, t.id, type);
          const exists = Object.keys(built).some((k) => built[k].type === type);
          push({
            key: `build-${type}`, label: `建造${fd.label}`,
            why: `${costText(fd.cost)}，${fd.durationSlots} 單位；此地效率 ×${(place.ok ? place.multiplierBp / 10000 : 1).toFixed(2)}`,
            disabled: exists ? '已有一座或正在建造' : (place.ok ? null : place.reason),
            warn: enough(world, fd.cost) ? null : '靈材現在不夠，出發時會改成休養',
            command: order('build', { facilityType: type, tileId: t.id }, fd.durationSlots),
          });
        }
      }
    }
    let who = null;
    if (selectedId && selectedId !== pid) {
      who = '這位依宗門目標自主行動；手動指令只能下給主角。下面是主角能在這裡做的事。';
      for (const a of actions) if (!a.disabled) a.disabled = '手動指令只給主角：先選主角';
    }
    if (prot && prot.joinTick > world.clock.tick) for (const a of actions) if (!a.disabled) a.disabled = '主角尚未入隊';
    return { key, title: placeTitle(Rules, world, key), info, who, actions };
  }

  // 取消主角的手動指令。說法依引擎 cancelManualOrder 的三種結果分開。
  function personActions(deps, world, id) {
    const Rules = deps.Rules;
    const d = disciple(world, id);
    if (!d) return { key: id, title: id, info: [], actions: [] };
    if (id !== world.protagonistId) {
      return { key: id, info: ['依宗門目標自主行動；手動指令只能下給主角。'], actions: [] };
    }
    if (!d.manualOrder) return { key: id, info: ['主角目前沒有手動指令，依宗門目標自主行動。點地點可以下令。'], actions: [] };
    const act = activityOf(world, d);
    const kind = kindName(Rules, d.manualOrder.kind);
    const command = { type: 'cancelManualOrder', payload: { discipleId: id } };
    // 排隊中的新指令（還沒變成活動）：取消它；目前的工作怎麼收尾仍照引擎 cancelManualOrder 的規則。
    const queued = d.manualOrder.status === 'pending' && d.manualOrder.activityId === null && act && d.manualOrder.seq !== act.manualSeq;
    const drop = queued ? `排隊的「${kind}」取消；` : '';
    let label;
    let why;
    if (act && PROMISE_KINDS.includes(act.kind) && act.status === 'working') {
      label = queued ? '取消排隊的新指令' : '解除手動指令';
      why = `${drop}「${kindName(Rules, act.kind)}」已開工，是承諾工作，仍會做完；之後回到自主`;
    } else if (act && act.status === 'traveling') {
      label = queued ? '取消排隊的新指令' : '取消手動指令';
      why = `${drop}目前的「${kindName(Rules, act.kind)}」走完這一步就停下，回到自主`;
    } else if (act && act.status === 'working') {
      label = queued ? '取消排隊的新指令' : '取消手動指令';
      why = `${drop}停下「${kindName(Rules, act.kind)}」：已完成的單位保留，做到一半的這個單位不算；之後回到自主`;
    } else {
      label = '取消排隊中的手動指令';
      why = '還沒出發，直接取消';
    }
    return { key: id, info: [`主角的手動指令：${kind}`], actions: [{ key: 'cancel', label, why, disabled: null, warn: null, command }] };
  }

  function candidateName(deps, id) {
    const p = deps.Story && deps.Story.CANDIDATE_PROFILES ? deps.Story.CANDIDATE_PROFILES[id] : null;
    const t = p && deps.StoryData.STORY_DATA.templates[p.templateId];
    return t ? t.label : id;
  }

  // 三類詢問。每個選項帶一條正式命令；收徒的「接受」走 acceptCandidate（chooseEvent 不會讓人入隊），「再想想」走 chooseEvent。
  function pendingAsks(deps, world) {
    const Rules = deps.Rules;
    const out = [];
    for (const ev of world.pendingEvents) {
      const left = ev.expiresTick - world.clock.tick;
      const base = { eventId: ev.id, kind: ev.kind, raisedTick: ev.raisedTick, expiresTick: ev.expiresTick, left };
      if (ev.kind === 'breakthroughAsk') {
        const t = deps.Realtime.BREAKTHROUGH_ASK;
        const who = ev.discipleId === world.protagonistId ? '主角' : (ev.discipleId === world.masterId ? '師父' : candidateName(deps, ev.discipleId));
        out.push(Object.assign(base, {
          title: `${who}：${t.text.title}`, body: t.text.body,
          options: t.options.map((o) => ({
            key: o.id, label: o.label,
            why: o.id === 'opt-breakthrough-agree' ? '同意後會排進突破；成敗要到突破結束才知道' : `${Rules.ASK_EXPIRY_TICKS} tick 內不再問`,
            command: { type: 'chooseEvent', payload: { eventId: ev.id, optionId: o.id } },
          })),
        }));
        continue;
      }
      const tpl = deps.StoryData.getEvent(ev.templateId);
      if (!tpl) continue;
      if (ev.kind === 'plea') {
        out.push(Object.assign(base, {
          title: tpl.text.title, body: tpl.text.body,
          options: tpl.options.map((o) => ({
            key: o.id, label: o.label,
            why: o.id.endsWith('-later') ? '先不去；之後仍可到村口自己下令援村' : '回覆村民；接著在村口選援村方式下令',
            command: { type: 'chooseEvent', payload: { eventId: ev.id, optionId: o.id } },
          })),
        }));
      } else if (ev.kind === 'invitation') {
        const name = candidateName(deps, ev.candidateId);
        out.push(Object.assign(base, {
          title: `${tpl.text.title}（${name}）`, body: tpl.text.body,
          options: tpl.options.map((o) => (o.id.endsWith('-later')
            ? { key: o.id, label: o.label, why: '暫不收；之後仍可在這裡收他', command: { type: 'chooseEvent', payload: { eventId: ev.id, optionId: o.id } } }
            : { key: 'accept', label: `${o.label}：收為弟子`, why: `${name}立刻入隊`, command: { type: 'acceptCandidate', payload: { candidateId: ev.candidateId } } })),
        }));
      }
    }
    // 暫不收的候選人沒有待選事件，仍可以直接收。
    for (const id of Object.keys(world.story.invitations)) {
      const inv = world.story.invitations[id];
      if (inv.status !== 'deferred') continue;
      const name = candidateName(deps, id);
      out.push({
        eventId: `deferred/${id}`, kind: 'deferred', title: `暫不收的候選人：${name}`, body: '之前沒有收他；現在仍可以收為弟子。',
        left: null, expiresTick: null,
        options: [{ key: 'accept', label: '收為弟子', why: `${name}立刻入隊`, command: { type: 'acceptCandidate', payload: { candidateId: id } } }],
      });
    }
    return out;
  }

  function rejectText(r) {
    const lead = REJECT_LEAD[r.code];
    if (lead) return lead;
    return `沒有接受：${INVALID_WHY[r.code] || r.reason || r.code}`;
  }

  // 命令成功後的回饋。只看回傳的事件；接受、開工與完成分開說，同意突破不說成成功。
  // nextText：呼叫端可以帶 #138 why.next 的說明（何時開工），這裡不另算時序。
  function commandFeedback(deps, before, after, command, events, nextText) {
    const Rules = deps.Rules;
    const ev = (type) => events.find((e) => e.type === type) || null;
    const tail = nextText ? `${nextText}。` : '';
    switch (command.type) {
      case 'orderActivity':
        return { tone: 'ok', text: `已接受：主角${kindName(Rules, command.payload.kind)}。${tail}開工或改成休養時會再告訴你。` };
      case 'cancelManualOrder': {
        if (ev('manualLockReleased')) return { tone: 'ok', text: '已解除手動指令，這項承諾工作仍會完成；之後回到自主。' };
        const armed = ev('cancelArmed');
        if (armed) return { tone: 'ok', text: armed.halt === 'step' ? '已取消：主角走完目前這一步就停下，回到自主。' : '已取消：主角停下目前工作（做到一半的單位不算），回到自主。' };
        return { tone: 'ok', text: '已取消排隊中的手動指令。' };
      }
      case 'setGoals': return { tone: 'ok', text: '已更新目標順序；空閒的人下次決策時照新順序。' };
      case 'setPolicy': return { tone: 'ok', text: '已更新政策。' };
      case 'acceptCandidate': {
        const id = command.payload.candidateId;
        return { tone: 'ok', text: `${candidateName(deps, id)}入隊了。` };
      }
      case 'chooseEvent': {
        const chosen = ev('eventChosen') || {};
        const opt = command.payload.optionId;
        if (chosen.disposition === 'agree') return { tone: 'ok', text: `已同意突破：會排進突破${chosen.usePill ? '（用丹）' : ''}。成敗要到突破結束才知道。` };
        if (chosen.disposition === 'agree_invalid') return { tone: 'bad', text: `同意了，但現在開不了工（${INVALID_WHY[chosen.reason] || chosen.reason}）；${Rules.ASK_EXPIRY_TICKS} tick 後會再問。` };
        if (chosen.disposition === 'later') return { tone: 'ok', text: `稍後再說：${Rules.ASK_EXPIRY_TICKS} tick 內不再問。` };
        if (opt === 'opt-aid-accept') return { tone: 'ok', text: '答應幫忙了。到村口選援村方式下令。', openPlace: 'gate' };
        if (opt.endsWith('-later')) return { tone: 'ok', text: '先放著。' };
        return { tone: 'ok', text: '已回覆。' };
      }
      default: return { tone: 'ok', text: '已接受。' };
    }
  }

  // 推進後的新事件 → 浮字、提示與橫幅。只讀事件與推進後的世界。
  function tickFeedback(deps, after, events, names) {
    const Rules = deps.Rules;
    const out = [];
    const STAT = { stamina: '體力', mind: '心境', cultivation: '修為', injury: '傷勢' };
    const actOf = (id) => after.activities.find((a) => a.id === id) || null;
    const who = (id) => (names && names[id]) || id;
    for (const e of events) {
      if (e.type === 'unitCompleted') {
        const parts = [];
        for (const k of Object.keys(STAT)) {
          const dlt = e.after && e.before ? e.after[k] - e.before[k] : 0;
          if (dlt) parts.push(`${STAT[k]}${dlt > 0 ? '+' : ''}${dlt}`);
        }
        const act = actOf(e.activityId);
        out.push({ kind: 'pulse', id: e.discipleId, text: `${kindName(Rules, e.kind)}完成${act && act.units > 1 ? ` ${e.unit}/${act.units}` : ''}`, tone: 'done' });
        if (parts.length) out.push({ kind: 'pulse', id: e.discipleId, text: parts.slice(0, 2).join(' '), tone: 'gain' });
      } else if (e.type === 'activityDeparted') {
        const act = actOf(e.activityId);
        if (!act) continue;
        if (act.fallback) {
          const why = FALLBACK_WHY[act.fallback.reason] || act.fallback.reason;
          out.push({ kind: 'pulse', id: e.discipleId, text: `${kindName(Rules, act.fallback.from)}改成休養：${why}`, tone: 'bad' });
          if (act.origin === 'manual') out.push({ kind: 'toast', tone: 'bad', text: `你下的「${kindName(Rules, act.fallback.from)}」開不了工（${why}），這次先改成休養；做完回到自主。` });
        } else if (act.origin === 'manual') {
          out.push({ kind: 'toast', tone: 'ok', text: `主角開始執行你下的令：${kindName(Rules, act.kind)}。` });
        }
      } else if (e.type === 'manualInvalid') {
        out.push({ kind: 'toast', tone: 'bad', text: `你下的令沒辦法執行（${FALLBACK_WHY[e.reason] || INVALID_WHY[e.reason] || '條件已經不成立'}），已取消，${e.discipleId ? who(e.discipleId) : '主角'}回到自主。` });
      } else if (e.type === 'activityDone' && e.kind === 'build') {
        const act = actOf(e.activityId);
        if (act && act.status === 'done' && act.unitsDone === act.units) out.push({ kind: 'banner', text: `${Rules.FACILITIES[act.target.facilityType].label}完工` });
      } else if (e.type === 'activityDone' && e.kind === 'aid') {
        out.push({ kind: 'banner', text: '援村完成，村民送來謝禮' });
      } else if (e.type === 'breakthroughResolved') {
        const ok = e.outcome && e.outcome.result === 'success';
        out.push({ kind: 'banner', text: `${who(e.discipleId)}${ok ? '突破成功！' : '突破失敗，傷勢加重'}` });
      } else if (e.type === 'candidateAccepted') {
        out.push({ kind: 'banner', text: `${who(e.candidateId)}入門` });
      } else if (e.type === 'phaseNotice') {
        const p = Rules.SPIRIT_PHASES.find((x) => x.id === e.phaseId);
        out.push({ kind: 'banner', text: `靈氣轉為「${p ? p.label : e.phaseId}」` });
      } else if (e.type === 'breakthroughAskOpened' || (e.type === 'askExpired')) {
        out.push({ kind: 'toast', tone: e.type === 'askExpired' ? 'bad' : 'ok', text: e.type === 'askExpired' ? '有一則詢問逾期沒回覆，已照規則處理。' : `${who(e.discipleId)}想突破，等你回覆（不回覆也不會停世界）。` });
      }
    }
    return out;
  }

  // 開局建角的選項，全部取自 Rules 與 StoryData；驗證交給 State.validateCharacterOptions。
  function characterChoices(Rules, StoryData) {
    const L = Rules.CHARACTER_OPTION_LIMITS;
    return {
      templates: Object.keys(L.templates).map((id) => ({
        id, label: StoryData.STORY_DATA.templates[id] ? StoryData.STORY_DATA.templates[id].label : id, base: Object.assign({}, L.templates[id]),
      })),
      attributes: Object.keys(ATTRIBUTE_NAMES).map((k) => ({ key: k, label: ATTRIBUTE_NAMES[k] })),
      freePoints: L.freePoints, min: L.attributeMin, max: L.attributeMax,
      personality: {
        risk: L.personality.risk.map((v) => ({ value: v, label: PERSONALITY.risk[v] || v })),
        bond: L.personality.bond.map((v) => ({ value: v, label: PERSONALITY.bond[v] || v })),
      },
    };
  }

  // 目標編輯器可加入的目標：預設目標加上其他設施。只是候選清單，合法性由引擎 setGoals 驗。
  function goalCatalog(Rules, defaults) {
    const out = defaults.map((g) => Object.assign({}, g));
    for (const type of Object.keys(Rules.FACILITIES)) {
      if (!out.some((g) => g.kind === 'buildFacility' && g.facilityType === type)) out.push({ id: `goal-build-${type}`, kind: 'buildFacility', facilityType: type });
    }
    return out;
  }

  return Object.freeze({
    PROMISE_KINDS, RES_NAMES, ATTRIBUTE_NAMES, PERSONALITY,
    places, placeTitle, placeActions, personActions, pendingAsks, rejectText, commandFeedback, tickFeedback,
    characterChoices, goalCatalog, costText,
  });
});
