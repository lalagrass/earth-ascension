/*
 * SG-RT-02V：唯讀生活 viewer 的畫面。
 *
 * describe() 把正式世界讀成畫面用的純資料，不改世界、不讀 RNG、不另算產出或編原因：
 * 進度、等待與 fallback 原因都直接取自世界裡的活動與 autonomy 欄位。render() 只把那份資料畫進 DOM。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    ns.ViewerView = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ELEMENT_LABELS = Object.freeze({ wood: '木', fire: '火', earth: '土', metal: '金', water: '水' });
  const ROLE_LABELS = Object.freeze({ master: '師父', protagonist: '主角', apprentice: '學徒' });
  const STATUS_LABELS = Object.freeze({ traveling: '移動中', working: '工作中', done: '已完成', cancelled: '已取消' });
  const RESOURCE_LABELS = Object.freeze({ spiritMaterial: '靈材', spiritHerb: '靈草', spiritStone: '靈石', reputation: '聲望' });
  const WAIT_LABELS = Object.freeze({
    goals_done: '目標都已完成，無效果等待',
    'blocked:herb_locked': '靈草還沒長出來，等待',
    breakthrough_ask_open: '突破詢問待回覆',
    breakthrough_later: '突破稍後再問',
    cultivation_full: '修為已滿，突破未開放，等待',
  });
  const FALLBACK_LABELS = Object.freeze({
    insufficient_resource: '資源不足',
    no_seat: '沒有空位',
    participant_busy: '參與者忙碌',
    facility_missing: '設施未建',
    facility_not_ready: '設施未完工',
    cultivation_full: '修為已滿',
    breakthrough_done: '已突破',
  });
  const POLICY_LABELS = Object.freeze({
    aid: { name: '援村', values: { 'auto-free': '自動徒手協助', 'auto-supplied': '自動備料協助', ask: '詢問', off: '關閉' } },
    recruit: { name: '收徒', values: { 'auto-accept': '自動接受', ask: '詢問', off: '關閉' } },
    breakthrough: { name: '突破', values: { auto: '自動', ask: '詢問', off: '關閉' } },
    breakthroughPill: { name: '突破用丹', values: { use: '使用', never: '不用' } },
    breakthroughSupport: { name: '突破支援', values: { auto: '自動找人', never: '不找' } },
  });
  const EVENT_TAIL = 40;

  function label(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : String(key);
  }

  function kindLabel(Rules, kind) {
    const a = Rules.ACTIONS[kind];
    return a ? a.label : String(kind);
  }

  function facilityLabel(Rules, type) {
    const f = Rules.FACILITIES[type];
    return f ? f.label : String(type);
  }

  function phaseOf(Rules, tick) {
    return Rules.phaseAtEq(Math.floor(tick / Rules.TICKS_PER_SLOT));
  }

  function goalText(Rules, g) {
    if (g.kind === 'buildFacility') return `建造${facilityLabel(Rules, g.facilityType)}`;
    if (g.kind === 'stockPills') return `存凝氣丹 ${g.count} 顆`;
    if (g.kind === 'aid') return '援村';
    if (g.kind === 'recruit') return '收徒';
    if (g.kind === 'cultivateTo100') return `修為到 100（${g.discipleId === 'all' ? '全員' : g.discipleId}）`;
    if (g.kind === 'breakthrough') return `突破（${g.discipleId === 'all' ? '全員' : g.discipleId}）`;
    return g.kind;
  }

  function nameTable(world, StoryData) {
    const templates = StoryData && StoryData.STORY_DATA ? StoryData.STORY_DATA.templates : {};
    const base = {};
    for (const d of world.disciples) {
      const t = d.templateId && templates[d.templateId] ? templates[d.templateId].label : null;
      if (d.role === 'master') base[d.id] = '師父';
      else if (d.role === 'protagonist') base[d.id] = t ? `主角・${t}` : '主角';
      else base[d.id] = t || label(ROLE_LABELS, d.role);
    }
    // 同名角色加上 id，畫面上仍可分辨。
    const count = {};
    for (const id of Object.keys(base)) count[base[id]] = (count[base[id]] || 0) + 1;
    const names = {};
    for (const id of Object.keys(base)) names[id] = count[base[id]] > 1 ? `${base[id]}（${id}）` : base[id];
    return names;
  }

  // 地圖格子很小，只放兩個字；同名學徒用候選序號分開。
  function shortName(d) {
    if (d.role === 'master') return '師父';
    if (d.role === 'protagonist') return '主角';
    const m = /(\d+)$/.exec(d.id);
    return m ? `徒${m[1]}` : d.id.slice(0, 2);
  }

  function activityStatus(Rules, world, d, act) {
    const unitTicks = Rules.TICKS_PER_SLOT;
    const kind = kindLabel(Rules, act.kind);
    const out = { kind: 'activity', activityId: act.id, label: kind, status: label(STATUS_LABELS, act.status), origin: act.origin };
    if (act.fallback) out.fallback = `由${kindLabel(Rules, act.fallback.from)}轉來：${label(FALLBACK_LABELS, act.fallback.reason)}`;
    if (act.status === 'traveling') {
      const steps = act.path.length;
      out.text = act.partnerWait
        ? `${kind}：已到場，等待同伴`
        : `${kind}：前往 (${act.dest.r},${act.dest.c})，已走 ${act.pathIndex}/${steps} 格`;
      out.progress = { done: act.pathIndex, total: Math.max(steps, 1), unit: '格' };
    } else {
      const total = act.units * unitTicks;
      out.text = `${kind}：第 ${Math.min(act.unitsDone + 1, act.units)}/${act.units} 單位，${act.workTicks % unitTicks}/${unitTicks} tick`;
      if (act.partnerWait) out.text += '（等待同伴）';
      out.progress = { done: act.workTicks, total, unit: 'tick' };
    }
    if (act.target && act.target.tileId) out.where = act.target.tileId;
    if (act.target && act.target.facilityType) out.label = `${kind}${facilityLabel(Rules, act.target.facilityType)}`;
    return out;
  }

  function personStatus(Rules, world, d) {
    if (d.joinTick > world.clock.tick) return { kind: 'notJoined', label: '未入隊', text: `預定 tick ${d.joinTick} 入隊` };
    if (d.activityId !== null) {
      const act = world.activities.find((a) => a.id === d.activityId);
      if (act) return activityStatus(Rules, world, d, act);
    }
    if (d.manualOrder && d.manualOrder.status === 'pending') {
      return { kind: 'queued', label: '排隊', text: `手動指令「${kindLabel(Rules, d.manualOrder.kind)}」已收到，下一 tick 出發` };
    }
    if (d.autonomy && d.autonomy.wait) {
      const w = d.autonomy.wait;
      return {
        kind: 'wait', label: '等待', code: w.reason,
        text: `${label(WAIT_LABELS, w.reason)}（自 tick ${w.sinceTick}，下次復查 tick ${w.recheckTick}）`,
      };
    }
    // 剛完成工作的人要到下一 tick 的階段 2 才決策（RT00 §1.3）：畫面只標示，不替角色安排。
    return { kind: 'decide', label: '待決策', text: '本 tick 剛空出來，下一 tick 由自主規劃決定' };
  }

  function describePeople(Rules, world, names) {
    return world.disciples.map((d) => ({
      id: d.id,
      name: names[d.id],
      short: shortName(d),
      role: label(ROLE_LABELS, d.role),
      joined: d.joinTick <= world.clock.tick,
      pos: { r: d.pos.r, c: d.pos.c },
      stamina: d.stamina,
      mind: d.mind,
      cultivation: d.cultivation,
      injury: d.injury,
      breakthroughs: d.breakthroughs,
      attributes: { rootBone: d.attributes.rootBone, comprehension: d.attributes.comprehension, craft: d.attributes.craft },
      manualOrder: d.manualOrder ? kindLabel(Rules, d.manualOrder.kind) : null,
      status: personStatus(Rules, world, d),
    }));
  }

  function describeFacilities(Rules, world) {
    const unitTicks = Rules.TICKS_PER_SLOT;
    return world.activities
      .filter((a) => a.kind === 'build' && a.status !== 'cancelled')
      .map((a) => ({
        activityId: a.id,
        type: a.target.facilityType,
        label: facilityLabel(Rules, a.target.facilityType),
        tileId: a.target.tileId,
        done: a.status === 'done',
        progress: { done: a.workTicks, total: a.units * unitTicks },
        completedTick: a.completedTick,
      }));
  }

  function describeMap(Rules, world, people, facilities) {
    const rows = [];
    const size = Rules.MAP_SIZE;
    const gate = Rules.VILLAGE_GATE;
    const dojo = Rules.DOJO;
    for (let r = 0; r < size; r += 1) {
      const cells = [];
      // 村口在地圖外一格（第 2 列左側）；其他列這一欄留空。
      cells.push(r === gate.r
        ? { kind: 'gate', r, c: gate.c, label: '村口', people: people.filter((p) => p.joined && p.pos.r === r && p.pos.c === gate.c).map((p) => p.id) }
        : { kind: 'void', r, c: gate.c });
      for (let c = 0; c < size; c += 1) {
        const tile = world.tiles.find((t) => t.row === r && t.col === c);
        const fac = facilities.filter((f) => f.tileId === tile.id);
        cells.push({
          kind: 'tile', r, c, id: tile.id,
          terrain: tile.terrain,
          terrainLabel: Rules.TERRAIN[tile.terrain] ? Rules.TERRAIN[tile.terrain].label : tile.terrain,
          element: label(ELEMENT_LABELS, tile.element),
          dojo: r === dojo.r && c === dojo.c,
          facilities: fac.map((f) => ({ label: f.label, done: f.done })),
          people: people.filter((p) => p.joined && p.pos.r === r && p.pos.c === c).map((p) => p.id),
        });
      }
      rows.push(cells);
    }
    return rows;
  }

  function signed(n) {
    return n > 0 ? `+${n}` : String(n);
  }

  function statDelta(before, after) {
    const parts = [];
    for (const k of ['stamina', 'mind', 'cultivation', 'injury']) {
      if (!before || !after || before[k] === after[k]) continue;
      const name = { stamina: '體力', mind: '心境', cultivation: '修為', injury: '傷勢' }[k];
      parts.push(`${name}${signed(after[k] - before[k])}`);
    }
    return parts.join(' ');
  }

  function eventText(Rules, names, e) {
    const who = e.discipleId ? names[e.discipleId] || e.discipleId : '';
    const kind = e.kind ? kindLabel(Rules, e.kind) : '';
    switch (e.type) {
      case 'activityDeparted': return `${who} 開始${kind}`;
      case 'unitCompleted': {
        const delta = statDelta(e.before, e.after);
        const fb = e.fallback ? `（由${kindLabel(Rules, e.fallback.from)}轉來：${label(FALLBACK_LABELS, e.fallback.reason)}）` : '';
        return `${who} 完成${kind}第 ${e.unit} 單位${fb}${delta ? `：${delta}` : ''}`;
      }
      case 'activityDone': return `${who} 結束${kind}`;
      case 'dayReport': {
        const res = Object.keys(RESOURCE_LABELS).map((k) => `${RESOURCE_LABELS[k]} ${e.resources[k]}`).join('、');
        return `第 ${e.day} 天結束：${res}，凝氣丹 ${e.inventory['breakthrough-pill']}`;
      }
      case 'phaseNotice': {
        const p = Rules.SPIRIT_PHASES.find((x) => x.id === e.phaseId);
        return `靈氣進入「${p ? p.label : e.phaseId}」`;
      }
      case 'candidateAccepted': return `${names[e.candidateId] || e.candidateId} 入隊`;
      case 'breakthroughResolved': {
        const o = e.outcome || {};
        const ok = o.result === 'success';
        const chance = typeof o.chanceBp === 'number' ? `，成功率 ${o.chanceBp / 100}%，擲 ${o.roll}` : '';
        return `${who} 突破${ok ? '成功' : '失敗'}${chance}`;
      }
      case 'autonomyWait': return `${who} 等待：${label(WAIT_LABELS, e.reason)}`;
      case 'autonomyResumed': return `${who} 恢復自主（${e.reason}）`;
      case 'breakthroughAskOpened': return `${who} 想突破，詢問待回覆`;
      case 'askExpired': return `詢問逾期：${e.eventId}`;
      default: {
        const rest = Object.keys(e).filter((k) => !['seq', 'tick', 'type'].includes(k))
          .map((k) => `${k}=${typeof e[k] === 'object' ? JSON.stringify(e[k]) : e[k]}`).join(' ');
        return `${e.type}${who ? ` ${who}` : ''}${rest ? ` ${rest}` : ''}`;
      }
    }
  }

  // ---------- SG-RT-03b：目標、工作與等待原因（唯讀） ----------
  //
  // 只讀世界裡已記錄的欄位與 rules.js 的公開表，不跑 plan()、不讀 RNG、不寫世界。
  // 每一條說明都附 source（世界或規則欄位）。引擎沒記錄的事（自主工作是為哪個目標、自主休養當下的數值）
  // 只標「推定」或「未記錄」，不替角色編動機。

  const RESOURCE_SHORT = Object.freeze({ spiritMaterial: '靈材', spiritHerb: '靈草' });
  const INVITE_LABELS = Object.freeze({ locked: '尚未觸發', invited: '邀請待回覆', deferred: '暫不收（已略過）', accepted: '已入隊' });
  const ASK_DISPOSITION = Object.freeze({ expired: '逾期沒回覆', later: '你選了稍後再說', agree_invalid: '同意了但當時開不了工', agree: '已同意', null: '原因未記錄' });
  const WAIT_EFFECT = Object.freeze({
    goals_done: 'none', 'blocked:herb_locked': 'blocked', breakthrough_ask_open: 'blocked',
    breakthrough_later: 'blocked', cultivation_full: 'blocked',
  });

  function dayOfTick(Rules, tick) {
    return Math.floor(tick / Rules.TICKS_PER_DAY) + 1;
  }

  function herbOpenTick(Rules) {
    const p = Rules.SPIRIT_PHASES.find((x) => x.herbYield > 0);
    return p ? p.startSlot * Rules.TICKS_PER_SLOT : null;
  }

  function doneFacility(world, type) {
    return world.activities.find((a) => a.kind === 'build' && a.status === 'done' && a.target.facilityType === type) || null;
  }

  function liveActivities(world) {
    return world.activities.filter((a) => a.status === 'traveling' || a.status === 'working');
  }

  function aidDone(Rules, world) {
    return world.story.rescues.find((r) => r.id === Rules.AID_ID) || null;
  }

  // 工作位容量與已預約數，和 realtime.js 的 seatPool 同一套來源（rules.js 容量、world.reservations）。
  function seatUse(Rules, world, key) {
    let cap = 0;
    const [kind, id] = key.split(':');
    if (key === 'aid:village') cap = Rules.AID_WORKERS;
    else if (kind === 'gather' || kind === 'build') {
      const tile = world.tiles.find((t) => t.id === id);
      const terrain = tile ? Rules.TERRAIN[tile.terrain] : null;
      if (terrain) cap = kind === 'gather' ? (terrain.workSlots || 0) : (terrain.buildable ? 1 : 0);
    } else if (kind === 'work' && doneFacility(world, id)) cap = Rules.FACILITIES[id].workSlots;
    else if (kind === 'rest' && id === 'residence' && doneFacility(world, 'residence')) cap = Rules.FACILITIES.residence.restSlots;
    let used = 0;
    for (const r of world.reservations) used += r.seats[key] || 0;
    return { key, cap, used, free: cap - used };
  }

  function costGaps(world, cost, why) {
    const out = [];
    for (const k of Object.keys(cost)) {
      const have = world.resources[k];
      if (have < cost[k]) out.push({ text: `${why}缺${RESOURCE_SHORT[k] || k}：有 ${have}，要 ${cost[k]}`, source: [`resources.${k}`, 'Rules.cost'] });
    }
    return out;
  }

  function goalFor(goal, id) {
    return goal.discipleId === 'all' || goal.discipleId === id;
  }

  // 宗門層級：每個目標現在做到哪、卡在哪。
  function goalStatus(Rules, world, names) {
    const tick = world.clock.tick;
    const slot = Math.floor(tick / Rules.TICKS_PER_SLOT);
    const live = liveActivities(world);
    const joined = world.disciples.filter((d) => d.joinTick <= tick);
    return world.goals.map((g) => {
      const row = { id: g.id, kind: g.kind, text: goalText(Rules, g), state: 'open', detail: '', gaps: [] };
      if (g.kind === 'buildFacility') {
        const spec = Rules.FACILITIES[g.facilityType];
        const done = doneFacility(world, g.facilityType);
        const doing = live.find((a) => a.kind === 'build' && a.target.facilityType === g.facilityType);
        if (done) Object.assign(row, { state: 'done', detail: `tick ${done.completedTick} 完工`, source: [`activities[${done.id}]`] });
        else if (doing) Object.assign(row, { state: 'active', detail: `${names[doing.discipleId]}建造中 ${doing.workTicks}/${doing.units * Rules.TICKS_PER_SLOT} tick`, source: [`activities[${doing.id}]`] });
        else if (spec) row.gaps.push(...costGaps(world, spec.cost, '開工'));
      } else if (g.kind === 'stockPills') {
        const pills = world.inventory['breakthrough-pill'];
        const recipe = Rules.RECIPES['breakthrough-pill'];
        row.detail = `凝氣丹 ${pills}/${g.count}`;
        row.source = ['inventory.breakthrough-pill'];
        const brewing = live.find((a) => a.kind === 'brew');
        if (pills >= g.count) row.state = 'done';
        else if (brewing) Object.assign(row, { state: 'active', detail: `${row.detail}，${names[brewing.discipleId]}煉丹中` });
        else {
          if (!doneFacility(world, 'alchemyRoom')) row.gaps.push({ text: '丹房還沒完工', source: ['activities(build alchemyRoom)'] });
          row.gaps.push(...costGaps(world, recipe.cost, '煉一爐'));
          const open = herbOpenTick(Rules);
          if (world.resources.spiritHerb < (recipe.cost.spiritHerb || 0) && open !== null && tick < open) {
            row.gaps.push({ text: `靈草 tick ${open}（第 ${dayOfTick(Rules, open)} 天）才長出來`, source: ['Rules.SPIRIT_PHASES.herbYield'] });
          }
          if (doneFacility(world, 'alchemyRoom')) {
            const seat = seatUse(Rules, world, 'work:alchemyRoom');
            if (seat.free < 1) row.gaps.push({ text: `丹房工作位已滿（${seat.used}/${seat.cap}）`, source: ['reservations', 'Rules.FACILITIES.alchemyRoom.workSlots'] });
          }
        }
      } else if (g.kind === 'aid') {
        const done = aidDone(Rules, world);
        const doing = live.find((a) => a.kind === 'aid');
        const pol = world.policy.aid;
        if (done) Object.assign(row, { state: 'done', detail: `tick ${done.completedTick} 完成`, source: ['story.rescues'] });
        else if (doing) Object.assign(row, { state: 'active', detail: `${names[doing.discipleId]}援村中`, source: [`activities[${doing.id}]`] });
        else {
          const from = Rules.AID_AVAILABLE_FROM_SLOT * Rules.TICKS_PER_SLOT;
          if (!Rules.aidAvailableEq(slot)) row.gaps.push({ text: `tick ${from}（第 ${dayOfTick(Rules, from)} 天）才有人求援`, source: ['Rules.AID_AVAILABLE_FROM_SLOT'] });
          if (pol === 'off') row.gaps.push({ text: '援村政策是「關閉」', source: ['policy.aid'] });
          if (pol === 'ask') {
            const plea = world.pendingEvents.find((e) => e.kind === 'plea');
            row.gaps.push(plea
              ? { text: `求援事件等你回覆，tick ${plea.expiresTick} 逾期`, source: [`pendingEvents[${plea.id}]`] }
              : { text: '援村政策是「詢問」，要等求援事件', source: ['policy.aid'] });
          }
          if (pol === 'auto-supplied') row.gaps.push(...costGaps(world, Rules.AID_OPTIONS.supplied.cost, '備料協助'));
        }
      } else if (g.kind === 'recruit') {
        const inv = world.story.invitations;
        const ids = Object.keys(inv).sort();
        row.detail = ids.map((id) => `${names[id] || id}：${label(INVITE_LABELS, inv[id].status)}`).join('、');
        row.source = ['story.invitations'];
        if (ids.every((id) => inv[id].status === 'accepted')) row.state = 'done';
        else if (ids.some((id) => inv[id].status === 'locked')) {
          if (!aidDone(Rules, world)) row.gaps.push({ text: '要先完成援村，才會有人來投靠', source: ['story.rescues'] });
          const manifest = Rules.SPIRIT_PHASES.find((p) => p.id === 'manifest');
          const at = manifest ? manifest.startSlot * Rules.TICKS_PER_SLOT : null;
          if (at !== null && tick < at) row.gaps.push({ text: `靈氣「${manifest.label}」（tick ${at}，第 ${dayOfTick(Rules, at)} 天）起才有人投靠`, source: ['Rules.SPIRIT_PHASES'] });
          if (world.policy.recruit === 'off') row.gaps.push({ text: '收徒政策是「關閉」', source: ['policy.recruit'] });
        }
      } else if (g.kind === 'cultivateTo100' || g.kind === 'breakthrough') {
        const who = joined.filter((d) => goalFor(g, d.id));
        const left = who.filter((d) => (g.kind === 'breakthrough'
          ? d.breakthroughs < Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE
          : d.breakthroughs < Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE && d.cultivation < Rules.CULTIVATION_CAP));
        row.detail = left.length === 0 ? `已入隊的 ${who.length} 人都達成` : left.map((d) => `${names[d.id]} 修為 ${d.cultivation}/${Rules.CULTIVATION_CAP}`).join('、');
        row.source = ['disciples[].cultivation', 'disciples[].breakthroughs'];
        if (left.length === 0) row.state = 'done';
        if (g.kind === 'breakthrough' && left.length > 0 && world.policy.breakthrough !== 'auto') {
          row.gaps.push({ text: `突破政策是「${label(POLICY_LABELS.breakthrough.values, world.policy.breakthrough)}」，不會自動突破`, source: ['policy.breakthrough'] });
        }
      }
      if (row.state === 'open' && row.gaps.length > 0) row.state = 'blocked';
      return row;
    });
  }

  // 自主工作對應哪個目標。只有 kind 能唯一對上時才說「為了」，否則列候選並註明引擎沒記錄。
  function goalOfActivity(Rules, world, d, act, names, goals) {
    const src = [`activities[${act.id}].kind`, `activities[${act.id}].origin`];
    if (act.origin === 'manual' && act.kind !== 'support') {
      return { basis: 'manual', text: '你下的手動指令，不在目標順序裡', goalIds: [], source: src.concat(['disciples[].manualOrder']) };
    }
    if (act.kind === 'rest') {
      if (act.fallback) return { basis: 'recovery', text: '不是目標：原本的工作開不了工，改成休養', goalIds: [], source: [`activities[${act.id}].fallback`] };
      return {
        basis: 'inferred',
        text: `推定：自主規劃在體力低於 ${Rules.REST_BELOW_STAMINA} 或傷勢達 ${Rules.REST_AT_INJURY} 時先休養（出發當下的數值引擎沒有記錄）`,
        goalIds: [],
        source: src.concat(['Rules.REST_BELOW_STAMINA', 'Rules.REST_AT_INJURY']),
      };
    }
    if (act.kind === 'support') {
      const main = world.activities.find((a) => a.id === act.target.breakthroughId);
      const who = main ? names[main.discipleId] : '（未知）';
      return { basis: 'kind', text: `護法：協助${who}突破`, goalIds: [], source: [`activities[${act.id}].target.breakthroughId`] };
    }
    const pick = (fn) => goals.filter((g) => world.goals.find((x) => x.id === g.id && fn(x)));
    let matched = [];
    if (act.kind === 'build') matched = pick((g) => g.kind === 'buildFacility' && g.facilityType === act.target.facilityType);
    else if (act.kind === 'brew') matched = pick((g) => g.kind === 'stockPills');
    else if (act.kind === 'aid') matched = pick((g) => g.kind === 'aid');
    else if (act.kind === 'breakthrough') matched = pick((g) => g.kind === 'breakthrough' && goalFor(g, d.id));
    else if (act.kind === 'cultivate') {
      matched = pick((g) => (g.kind === 'cultivateTo100' || g.kind === 'breakthrough') && goalFor(g, d.id)).slice(0, 1);
      if (matched.length === 0) return { basis: 'kind', text: '沒有適用的目標，空閒時預設修行', goalIds: [], source: src.concat(['goals']) };
    } else if (act.kind === 'gather-material' || act.kind === 'gather-herb') {
      const res = act.kind === 'gather-material' ? 'spiritMaterial' : 'spiritHerb';
      const needs = (g) => {
        if (g.kind === 'buildFacility') return res === 'spiritMaterial';
        if (g.kind === 'stockPills') return true;
        if (g.kind === 'aid') return res === 'spiritMaterial' && world.policy.aid === 'auto-supplied';
        return false;
      };
      const cands = goals.filter((g) => g.state !== 'done' && needs(world.goals.find((x) => x.id === g.id)));
      return {
        basis: 'candidates',
        text: cands.length > 0
          ? `可能為了：${cands.map((g) => g.text).join('、')}（引擎沒有記錄是哪一個目標）`
          : '對應的目標引擎沒有記錄',
        goalIds: cands.map((g) => g.id),
        source: src.concat(['goals']),
      };
    }
    if (matched.length === 0) return { basis: 'unknown', text: '目標順序裡找不到對應的目標（未知）', goalIds: [], source: src.concat(['goals']) };
    return { basis: 'kind', text: `為了：${matched.map((g) => g.text).join('、')}`, goalIds: matched.map((g) => g.id), source: src.concat(['goals']) };
  }

  // 若不被取消、改令或修行中途轉休養，這件事在哪個 tick 後空出來，下一次規劃在哪個 tick。純算術，不讀 RNG。
  function activityEnd(Rules, world, act) {
    if (act.partnerWait) return null;
    const now = world.clock.tick;
    const workLeft = act.units * Rules.TICKS_PER_SLOT - act.workTicks;
    if (act.status === 'working') return now + workLeft;
    const walk = Math.max(0, (act.path.length - act.pathIndex) * Rules.STEP_TICKS - act.stepTicks);
    return now + walk + workLeft;
  }

  function nextOfActivity(Rules, world, d, act) {
    const src = [`activities[${act.id}].path`, `activities[${act.id}].workTicks`, `activities[${act.id}].units`];
    const order = d.manualOrder;
    if (order && order.status === 'pending') {
      const kind = kindLabel(Rules, order.kind);
      if (act.status === 'traveling') return { text: `新指令「${kind}」排隊中：走完這一步就改做`, source: ['disciples[].manualOrder.status'] };
      return { text: `新指令「${kind}」排隊中：要等這件事做完（已開工的承諾不中斷）`, source: ['disciples[].manualOrder.status'] };
    }
    if (act.partnerWait) return { text: '等同伴到場才開工，什麼時候結束未知', source: [`activities[${act.id}].partnerWait`] };
    const end = activityEnd(Rules, world, act);
    const after = act.origin === 'manual' ? '手動指令完成後回到自主規劃' : '之後由自主規劃重新決定';
    return {
      text: `約 tick ${end}（第 ${dayOfTick(Rules, end)} 天）空出來，${after}`,
      assumption: '假設不被取消、改令，修行也沒有中途轉休養',
      source: src,
    };
  }

  function waitDetail(Rules, world, d, names) {
    const w = d.autonomy.wait;
    const gaps = [];
    const src = ['disciples[].autonomy.wait'];
    if (w.reason === 'blocked:herb_locked') {
      const open = herbOpenTick(Rules);
      gaps.push({ text: `靈草 tick ${open}（第 ${dayOfTick(Rules, open)} 天）長出；現有靈草 ${world.resources.spiritHerb}`, source: ['Rules.SPIRIT_PHASES.herbYield', 'resources.spiritHerb'] });
    } else if (w.reason === 'breakthrough_ask_open') {
      const ask = world.pendingEvents.find((e) => e.kind === 'breakthroughAsk' && e.discipleId === d.id);
      gaps.push(ask
        ? { text: `突破詢問等你回覆，tick ${ask.expiresTick} 逾期`, source: [`pendingEvents[${ask.id}]`] }
        : { text: '突破詢問待回覆', source: ['story.breakthroughAsks'] });
    } else if (w.reason === 'breakthrough_later') {
      const rec = world.story.breakthroughAsks[d.id];
      const why = rec ? label(ASK_DISPOSITION, rec.lastDisposition) : '原因未記錄';
      gaps.push({
        text: `上次突破詢問${why}，tick ${rec ? rec.cooldownUntilTick : '（未知）'} 後再問`,
        source: ['story.breakthroughAsks[].lastDisposition', 'story.breakthroughAsks[].cooldownUntilTick'],
      });
    } else if (w.reason === 'cultivation_full') {
      const pol = world.policy.breakthrough;
      gaps.push({ text: `修為已滿 ${Rules.CULTIVATION_CAP}，突破政策是「${label(POLICY_LABELS.breakthrough.values, pol)}」`, source: ['disciples[].cultivation', 'policy.breakthrough'] });
      const other = liveActivities(world).find((a) => a.kind === 'breakthrough' && a.discipleId !== d.id);
      if (other) gaps.push({ text: `同一時間只能一人突破，${names[other.discipleId]}正在突破`, source: [`activities[${other.id}]`] });
    }
    return {
      text: `最晚 tick ${w.recheckTick} 復查；世界有變化時會提早重新規劃`,
      gaps,
      source: src.concat(['Rules.WAIT_RECHECK_TICKS']),
    };
  }

  function explainPerson(Rules, world, d, names, goals) {
    const tick = world.clock.tick;
    if (d.joinTick > tick) {
      return {
        state: { kind: 'notJoined', text: `預定 tick ${d.joinTick} 入隊`, source: ['disciples[].joinTick'] },
        goal: { basis: 'none', text: '還沒入隊', goalIds: [], source: [] },
        next: { text: `tick ${d.joinTick} 入隊後開始自主規劃`, source: ['disciples[].joinTick'] },
        gaps: [],
      };
    }
    const act = d.activityId !== null ? world.activities.find((a) => a.id === d.activityId) : null;
    if (act) {
      const recovery = act.kind === 'rest';
      const goal = goalOfActivity(Rules, world, d, act, names, goals);
      const gaps = [];
      if (act.fallback) {
        gaps.push({
          text: `原本要${kindLabel(Rules, act.fallback.from)}，因${label(FALLBACK_LABELS, act.fallback.reason)}改成休養`,
          source: [`activities[${act.id}].fallback`],
        });
      }
      if (goal.basis === 'kind' || goal.basis === 'candidates') {
        for (const g of goals) if (goal.goalIds.includes(g.id)) gaps.push(...g.gaps);
      }
      return {
        state: {
          kind: recovery ? 'recovery' : 'activity',
          text: recovery ? '恢復：休養中' : `活動：${kindLabel(Rules, act.kind)}（${label(STATUS_LABELS, act.status)}）`,
          source: [`disciples[].activityId`, `activities[${act.id}].status`],
        },
        goal,
        next: nextOfActivity(Rules, world, d, act),
        gaps,
      };
    }
    if (d.manualOrder && d.manualOrder.status === 'pending') {
      const o = d.manualOrder;
      const gaps = [];
      const seatKey = o.kind === 'gather-material' || o.kind === 'gather-herb' ? `gather:${o.target.tileId}`
        : o.kind === 'build' ? `build:${o.target.tileId}` : o.kind === 'brew' ? 'work:alchemyRoom' : o.kind === 'aid' ? 'aid:village' : null;
      if (seatKey) {
        const seat = seatUse(Rules, world, seatKey);
        if (seat.free < 1) gaps.push({ text: `工作位已滿（${seat.used}/${seat.cap}），可能改成休養`, source: ['reservations', 'Rules 容量'] });
      }
      if (o.kind === 'build') gaps.push(...costGaps(world, Rules.FACILITIES[o.target.facilityType].cost, '開工'));
      if (o.kind === 'brew') gaps.push(...costGaps(world, Rules.RECIPES[o.target.recipeId].cost, '開爐'));
      return {
        state: { kind: 'queued', text: `排隊：手動指令「${kindLabel(Rules, o.kind)}」已收到，還沒出發`, source: ['disciples[].manualOrder.status'] },
        goal: { basis: 'manual', text: '你下的手動指令，不在目標順序裡', goalIds: [], source: ['disciples[].manualOrder'] },
        next: { text: `tick ${tick} 推進時出發；缺料或沒有工作位會改成休養並告訴你`, source: ['disciples[].manualOrder.requestedTick'] },
        gaps,
      };
    }
    if (d.autonomy && d.autonomy.wait) {
      const w = d.autonomy.wait;
      const detail = waitDetail(Rules, world, d, names);
      const none = WAIT_EFFECT[w.reason] === 'none';
      const gaps = detail.gaps.slice();
      if (none) {
        if (d.breakthroughs >= Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE) {
          gaps.push({ text: `已突破 ${d.breakthroughs} 次（上限 ${Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE}），修行與突破目標對這個人已經做完`, source: ['disciples[].breakthroughs', 'Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE'] });
        }
        for (const g of goals) if (g.state === 'blocked') gaps.push(...g.gaps.map((x) => ({ text: `${g.text}：${x.text}`, source: x.source })));
      }
      return {
        state: {
          kind: 'wait',
          effect: WAIT_EFFECT[w.reason] || 'unknown',
          text: `${none ? '無效果等待' : '有原因的等待'}：${label(WAIT_LABELS, w.reason)}（自 tick ${w.sinceTick}）`,
          source: ['disciples[].autonomy.wait.reason', 'disciples[].autonomy.wait.sinceTick'],
        },
        goal: none
          ? { basis: 'none', text: '目前目標順序裡沒有這個人做得到的事', goalIds: [], source: ['disciples[].autonomy.wait.reason'] }
          : { basis: 'unknown', text: '等這個條件解除', goalIds: [], source: ['disciples[].autonomy.wait.reason'] },
        next: { text: detail.text, source: detail.source },
        gaps,
      };
    }
    return {
      state: { kind: 'decide', text: '待決策：剛空出來，還沒規劃', source: ['disciples[].activityId', 'disciples[].autonomy.wait'] },
      goal: { basis: 'unknown', text: '下一次規劃才決定（現在不預測）', goalIds: [], source: [] },
      next: { text: `tick ${tick} 推進時由自主規劃決定`, source: ['RT00 §1.3'] },
      gaps: [],
    };
  }

  function describe(world, deps) {
    const Rules = deps.Rules;
    const names = nameTable(world, deps.StoryData);
    const tick = world.clock.tick;
    const phase = phaseOf(Rules, tick);
    const people = describePeople(Rules, world, names);
    const goals = goalStatus(Rules, world, names);
    for (const p of people) p.why = explainPerson(Rules, world, world.disciples.find((d) => d.id === p.id), names, goals);
    const facilities = describeFacilities(Rules, world);
    const slot = Math.floor(tick / Rules.TICKS_PER_SLOT);
    return {
      seed: world.seed,
      versions: { scenario: world.scenarioId, schema: world.schemaVersion, rule: world.ruleVersion, rng: world.rngVersion },
      clock: {
        tick,
        day: Math.floor(tick / Rules.TICKS_PER_DAY) + 1,
        slotOfDay: (slot % Rules.SLOTS_PER_DAY) + 1,
        slotsPerDay: Rules.SLOTS_PER_DAY,
        phase: phase.label,
        horizon: Rules.OBSERVATION_TICKS,
      },
      revision: world.revision,
      people,
      map: describeMap(Rules, world, people, facilities),
      facilities,
      resources: Object.keys(RESOURCE_LABELS).map((k) => ({ key: k, label: RESOURCE_LABELS[k], value: world.resources[k] })),
      pills: world.inventory['breakthrough-pill'],
      policy: Object.keys(POLICY_LABELS).map((k) => ({
        key: k, name: POLICY_LABELS[k].name, value: world.policy[k], text: label(POLICY_LABELS[k].values, world.policy[k]),
      })),
      goals: world.goals.map((g) => ({ id: g.id, text: goalText(Rules, g) })),
      goalStatus: goals,
      pending: world.pendingEvents.map((p) => ({ text: JSON.stringify(p) })),
      events: world.eventLog.slice(-EVENT_TAIL).reverse().map((e) => ({
        seq: e.seq, tick: e.tick, type: e.type, text: eventText(Rules, names, e),
      })),
      eventCount: world.eventLog.length,
    };
  }

  // ---------- DOM ----------

  function esc(v) {
    return String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function bar(value, max, cls) {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return `<span class="bar ${cls}"><span style="width:${pct}%"></span></span>`;
  }

  const MODE_LABELS = Object.freeze({ setup: '尚未開始', playing: '播放中', paused: '已暫停', error: '已停止（錯誤）' });

  function renderHud(model, ctl) {
    const c = model.clock;
    const mode = ctl.autoPaused && ctl.mode === 'paused' ? '已暫停（分頁在背景時自動暫停）' : label(MODE_LABELS, ctl.mode);
    const horizon = c.tick >= c.horizon ? `已過觀察期 ${c.horizon} tick，世界照常繼續` : `觀察期 ${c.tick}/${c.horizon} tick`;
    return `<div class="clock"><strong>第 ${c.day} 天・第 ${c.slotOfDay}/${c.slotsPerDay} 時段</strong>
      <span>tick ${c.tick}</span><span>靈氣：${esc(c.phase)}</span><span>${esc(horizon)}</span></div>
      <div class="mode" data-mode="${esc(ctl.mode)}">${esc(mode)}・${ctl.speed}×（每秒 ${4 * ctl.speed} tick）</div>`;
  }

  function renderMap(model, selected) {
    const rows = model.map.map((cells) => cells.map((cell) => {
      if (cell.kind === 'void') return '<div class="cell void"></div>';
      const tokens = cell.people.map((id) => {
        const p = model.people.find((x) => x.id === id);
        return `<button type="button" class="token${id === selected ? ' selected' : ''}" data-person="${esc(id)}" title="${esc(p.name)}：${esc(p.status.text)}">${esc(p.short)}</button>`;
      }).join('');
      if (cell.kind === 'gate') return `<div class="cell gate"><span class="terrain">村口</span><div class="tokens">${tokens}</div></div>`;
      const fac = cell.facilities.map((f) => `<span class="facility${f.done ? '' : ' building'}">${esc(f.label)}${f.done ? '' : '（建造中）'}</span>`).join('');
      return `<div class="cell t-${esc(cell.terrain)}${cell.dojo ? ' dojo' : ''}" title="${esc(cell.id)}">
        <span class="terrain">${cell.dojo ? '道館' : esc(cell.terrainLabel)}</span><span class="element">${esc(cell.element)}</span>
        ${fac}<div class="tokens">${tokens}</div></div>`;
    }).join('')).join('');
    return `<div class="grid">${rows}</div>`;
  }

  function renderPeople(model, selected) {
    return model.people.map((p) => {
      const s = p.status;
      const prog = s.progress ? `${bar(s.progress.done, s.progress.total, 'progress')}<small>${s.progress.done}/${s.progress.total} ${esc(s.progress.unit)}</small>` : '';
      return `<button type="button" class="person${p.id === selected ? ' selected' : ''}${p.joined ? '' : ' absent'}" data-person="${esc(p.id)}">
        <span class="who"><strong>${esc(p.name)}</strong><small>${esc(p.role)}・${esc(p.id)}・(${p.pos.r},${p.pos.c})</small></span>
        <span class="state state-${esc(s.kind)}">${esc(s.label)}${s.status ? `・${esc(s.status)}` : ''}</span>
        <span class="text">${esc(s.text)}</span>${s.fallback ? `<span class="fallback">${esc(s.fallback)}</span>` : ''}
        <span class="progressline">${prog}</span>
        <span class="stats">體力 ${p.stamina}${bar(p.stamina, 100, 'stamina')} 心境 ${p.mind}${bar(p.mind, 100, 'mind')}
          修為 ${p.cultivation}${bar(p.cultivation, 100, 'cultivation')} 傷勢 ${p.injury} 突破 ${p.breakthroughs}</span>
      </button>`;
    }).join('');
  }

  function renderDetail(model, selected) {
    const p = model.people.find((x) => x.id === selected);
    if (!p) return '<p class="hint">點地圖上的人物或左側名單查看細節（只改畫面選取，不影響世界）。</p>';
    const s = p.status;
    const rows = [
      ['身分', `${p.role}（${p.id}）`],
      ['位置', `(${p.pos.r},${p.pos.c})`],
      ['狀態', `${s.label}${s.status ? `・${s.status}` : ''}`],
      ['說明', s.text],
      ['來源', s.origin ? (s.origin === 'auto' ? '自主規劃' : '手動指令') : '—'],
      ['fallback', s.fallback || '—'],
      ['等待原因碼', s.code || '—'],
      ['手動指令', p.manualOrder || '無'],
      ['根骨／悟性／手藝', `${p.attributes.rootBone}／${p.attributes.comprehension}／${p.attributes.craft}`],
    ];
    return `<h3>${esc(p.name)}</h3><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${renderWhy(p.why)}`;
  }

  function sourceTag(source) {
    return source && source.length > 0 ? ` <code class="src">${esc(source.join('、'))}</code>` : '';
  }

  // SG-RT-03b：人物詳情裡的「為什麼」。每一行後面附來源欄位。
  function renderWhy(why) {
    if (!why) return '';
    const gaps = why.gaps.length === 0 ? '<li>沒有記錄到的缺口</li>'
      : why.gaps.map((g) => `<li>${esc(g.text)}${sourceTag(g.source)}</li>`).join('');
    const assume = why.next.assumption ? `<br><small>前提：${esc(why.next.assumption)}</small>` : '';
    return `<div class="why" data-state="${esc(why.state.kind)}"><h3>正在做什麼、為什麼</h3><dl>
      <dt>狀態</dt><dd>${esc(why.state.text)}${sourceTag(why.state.source)}</dd>
      <dt>目標</dt><dd data-basis="${esc(why.goal.basis)}">${esc(why.goal.text)}${sourceTag(why.goal.source)}</dd>
      <dt>接下來</dt><dd>${esc(why.next.text)}${sourceTag(why.next.source)}${assume}</dd>
      <dt>缺口</dt><dd><ul class="gaps">${gaps}</ul></dd></dl></div>`;
  }

  function renderStock(model) {
    const res = model.resources.map((r) => `<li>${esc(r.label)} <strong>${r.value}</strong></li>`).join('');
    const fac = model.facilities.length === 0 ? '<li>尚無</li>' : model.facilities.map((f) => `<li>${esc(f.label)}・${esc(f.tileId)}・${f.done ? `完工 tick ${f.completedTick}` : `建造中 ${f.progress.done}/${f.progress.total} tick`}</li>`).join('');
    return `<h3>庫存</h3><ul>${res}<li>凝氣丹 <strong>${model.pills}</strong></li></ul><h3>設施</h3><ul>${fac}</ul>`;
  }

  function renderSettings(model) {
    const pol = model.policy.map((p) => `<li>${esc(p.name)}：<strong>${esc(p.text)}</strong> <code>${esc(p.value)}</code></li>`).join('');
    const STATE = { done: '完成', active: '進行中', blocked: '卡住', open: '可做' };
    const goals = (model.goalStatus || model.goals).map((g, i) => {
      const tag = g.state ? `<span class="goal-${esc(g.state)}">${esc(STATE[g.state] || g.state)}</span>` : '';
      const detail = g.detail ? `：${esc(g.detail)}` : '';
      const gaps = g.gaps && g.gaps.length > 0 ? `<ul class="gaps">${g.gaps.map((x) => `<li>${esc(x.text)}${sourceTag(x.source)}</li>`).join('')}</ul>` : '';
      return `<li>${i + 1}. ${esc(g.text)} ${tag}${detail}${gaps}</li>`;
    }).join('');
    return `<h3>政策（安穩發展）</h3><ul>${pol}</ul><h3>目標順序</h3><ol class="plain">${goals}</ol>`;
  }

  function renderEvents(model) {
    const rows = model.events.map((e) => `<li data-type="${esc(e.type)}"><span class="tick">t${e.tick}</span> ${esc(e.text)}</li>`).join('');
    const pending = model.pending.length === 0 ? '' : `<h3>待處理事件（唯讀）</h3><ul>${model.pending.map((p) => `<li><code>${esc(p.text)}</code></li>`).join('')}</ul>`;
    return `${pending}<h3>最近事件（共 ${model.eventCount} 筆，顯示最新 ${model.events.length} 筆）</h3><ul class="events">${rows || '<li>尚無事件</li>'}</ul>`;
  }

  function render(dom, model, ctl, ui) {
    dom.hud.innerHTML = renderHud(model, ctl);
    dom.map.innerHTML = renderMap(model, ui.selected);
    dom.people.innerHTML = renderPeople(model, ui.selected);
    dom.detail.innerHTML = renderDetail(model, ui.selected);
    dom.stock.innerHTML = renderStock(model);
    dom.settings.innerHTML = renderSettings(model);
    dom.events.innerHTML = renderEvents(model);
    const err = ctl.error;
    dom.error.hidden = !err;
    const how = err && err.kind === 'rejected' ? '引擎拒絕推進，這一批沒有任何 tick' : `出錯前同一批已提交 ${err ? err.committedTicks : 0} tick，畫面保留到此`;
    dom.error.textContent = err ? `世界停在 tick ${err.tick}（${how}）：${err.code}：${err.reason}。不會繼續推進；可以保存這個最後合法的世界，或開新局。` : '';
  }

  // ---------- SG-RT-03a：保存狀態與存檔清單（純字串，不碰 storage） ----------

  const SLOT_LABELS = Object.freeze({ a: '槽 A', b: '槽 B' });

  // status 是 Storage.createSession().status(world) 的結果。
  function saveStatusText(status) {
    if (!status.canWrite) return { kind: 'unavailable', text: '本地保存不可用（此瀏覽器沒有 localStorage 或 Web Locks）：可以玩、匯入與匯出，但不會自動保存' };
    const saved = status.saved ? `已保存到 tick ${status.saved.tick}` : '這個世界還沒保存過';
    if (status.stopped) return { kind: 'stopped', text: `尚未保存（${saved}）。自動保存已停止：${status.stopped.reason}（${status.stopped.code}）` };
    if (status.busy) return { kind: 'busy', text: `保存中…（${saved}）` };
    if (status.dirty) return { kind: 'dirty', text: `尚未保存（${saved}）` };
    return { kind: 'saved', text: `已保存：tick ${status.saved.tick}` };
  }

  function slotSummary(slot) {
    if (slot.raw === null) return { ok: false, empty: true, text: '空' };
    const r = slot.result;
    if (!r.ok) return { ok: false, empty: false, text: `無法讀取：${r.code}：${r.reason}` };
    const e = r.envelope;
    return { ok: true, empty: false, text: `seed ${r.world.seed}・tick ${e.tick}（第 ${Math.floor(e.tick / 180) + 1} 天）・保存於 ${e.savedAt}`, tick: e.tick };
  }

  // 原始資料匯出按鈕：all 為 true 時列出所有非空 key，否則只列無法讀取的 key（壞指標、壞槽）。
  // 只讀 localStorage，沒有 Web Locks 也能用。
  function renderRawExports(inspection, all) {
    if (!inspection || !inspection.slots) return '';
    const keys = [['pointer', '指標'], ['a', SLOT_LABELS.a], ['b', SLOT_LABELS.b]].filter(([k]) => {
      const entry = k === 'pointer' ? inspection.pointer : inspection.slots[k];
      if (!entry || entry.raw === null) return false;
      return all || !entry.result.ok;
    });
    return keys.map(([k, l]) => `<button type="button" data-export-raw="${k}">匯出${esc(l)}原始資料</button>`).join('');
  }

  // inspection 是 store.inspect()／open() 的結果；canWrite 決定按鈕是「接續」還是「唯讀載入」。
  function renderSavePanel(inspection) {
    if (inspection.state === 'unavailable') return '<p class="hint">本地保存不可用：可以從檔案匯入。</p>';
    if (inspection.state === 'empty') return '<p class="hint">這個瀏覽器還沒有存檔。</p>';
    const rows = ['a', 'b'].map((s) => {
      const sum = slotSummary(inspection.slots[s]);
      const tag = inspection.active === s ? '（目前）' : '';
      return `<li>${esc(SLOT_LABELS[s])}${tag}：${esc(sum.text)}</li>`;
    }).join('');
    const ptr = inspection.pointer && inspection.pointer.result && !inspection.pointer.result.ok && inspection.pointer.raw !== null
      ? `<p class="error-inline">存檔指標損壞：${esc(inspection.pointer.result.reason)}</p>` : '';
    if (inspection.state === 'ok') {
      const how = inspection.canWrite ? '讀取並在此分頁接續保存' : '唯讀載入（不會保存）';
      const raws = renderRawExports(inspection, false);
      const warn = raws ? '<p class="error-inline">另一槽的資料損壞；覆寫前會再確認，可以先匯出原始資料。</p>' : '';
      return `<ul class="plain">${rows}</ul>${warn}<div class="buttons"><button type="button" id="load-saved">${how}</button>${raws}</div>`;
    }
    const restore = ['a', 'b'].filter((s) => slotSummary(inspection.slots[s]).ok)
      .map((s) => `<button type="button" data-restore="${s}">恢復${esc(SLOT_LABELS[s])}</button>`).join('');
    return `<p class="error-inline">存檔無法直接讀取，沒有改動任何資料。請先匯出原始資料，再選擇要恢復的槽。</p>${ptr}
      <ul class="plain">${rows}</ul><div class="buttons">${renderRawExports(inspection, true)}${inspection.canWrite ? restore : ''}</div>`;
  }

  return Object.freeze({ describe, render, eventText, renderSettings, renderWhy, saveStatusText, renderSavePanel, renderRawExports, WAIT_LABELS, FALLBACK_LABELS });
});
