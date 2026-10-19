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
      if (act) {
        const out = activityStatus(Rules, world, d, act);
        if (d.manualOrder && d.manualOrder.status === 'pending') {
          const nextKind = kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action);
          out.pendingOrder = {
            kind: d.manualOrder.kind || d.manualOrder.action,
            label: nextKind,
            text: `手動指令排隊中（${nextKind}），待目前活動單位完成後接續`,
          };
          out.text = `${out.text}（下一手動令：${nextKind} 排隊中）`;
        }
        return out;
      }
    }
    if (d.manualOrder && d.manualOrder.status === 'pending') {
      const kind = kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action);
      return { kind: 'pendingOrder', label: '排隊中', text: `手動指令排隊中（${kind}），下個規劃 tick 出發` };
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

  function describePersonWhy(Rules, world, d, names) {
    let goal = '—';
    let estimatedEnd = null;
    let reason = '—';

    if (d.joinTick > world.clock.tick) {
      goal = '未入隊';
      reason = `預定 tick ${d.joinTick} 入隊`;
    } else if (d.activityId !== null) {
      const act = world.activities.find((a) => a.id === d.activityId);
      if (act) {
        if (act.origin === 'manual') {
          goal = '手動指令，不屬於任何目標';
        } else if (act.kind === 'build') {
          goal = `建造${facilityLabel(Rules, act.target.facilityType)}`;
        } else if (act.kind === 'brew') {
          goal = '存凝氣丹';
        } else if (act.kind === 'aid') {
          goal = '援村';
        } else if (act.kind === 'cultivate') {
          goal = '修為到 100';
        } else if (act.kind === 'breakthrough') {
          goal = '突破';
        } else if (act.kind === 'support') {
          goal = '突破支援';
        } else if (act.kind === 'gather-material') {
          goal = '候選：建造、存丹或備料援村（引擎未記錄）';
        } else if (act.kind === 'gather-herb') {
          goal = '候選：存丹或備料援村（引擎未記錄）';
        } else if (act.kind === 'rest') {
          if (act.fallback) {
            goal = `休養（由${kindLabel(Rules, act.fallback.from)}轉來：${label(FALLBACK_LABELS, act.fallback.reason)}）`;
          } else if (d.injury >= Rules.REST_AT_INJURY) {
            goal = `推定：休養（傷勢 ${d.injury}，門檻 ≥ ${Rules.REST_AT_INJURY}）`;
          } else if (d.stamina < Rules.REST_BELOW_STAMINA) {
            goal = `推定：休養（體力 ${d.stamina}，門檻 < ${Rules.REST_BELOW_STAMINA}）`;
          } else {
            goal = '休養';
          }
        } else {
          goal = kindLabel(Rules, act.kind);
        }

        if (act.fallback) {
          reason = `由${kindLabel(Rules, act.fallback.from)}轉來：${label(FALLBACK_LABELS, act.fallback.reason)}`;
        } else if (act.partnerWait) {
          reason = '已就位，等待同伴到達';
        } else if (act.status === 'traveling') {
          reason = `前往 (${act.dest.r},${act.dest.c})`;
        } else {
          reason = `執行中（${kindLabel(Rules, act.kind)}）`;
        }

        if (d.manualOrder && d.manualOrder.status === 'pending') {
          const nextKind = kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action);
          reason = `${reason}；手動指令排隊中（${nextKind}），待目前活動單位完成後接續`;
        }

        if (act.partnerWait) {
          estimatedEnd = '未知（等待同伴）';
        } else {
          const unitTicks = Rules.TICKS_PER_SLOT;
          const totalWork = act.units * unitTicks;
          const remWork = Math.max(0, totalWork - act.workTicks);
          let remTravel = 0;
          if (act.status === 'traveling') {
            const stepTicks = act.stepTicks || 0;
            remTravel = Math.max(0, (act.path.length - act.pathIndex) * Rules.STEP_TICKS - stepTicks);
          }
          const remTotal = remTravel + remWork;
          estimatedEnd = `若不中斷，約 tick ${world.clock.tick + remTotal} 結束`;
        }
      }
    } else if (d.manualOrder && d.manualOrder.status === 'pending') {
      const orderKind = d.manualOrder.kind || d.manualOrder.action;
      goal = '手動指令，不屬於任何目標';
      reason = `手動指令已排隊（${kindLabel(Rules, orderKind)}），下個規劃 tick 出發`;
    } else if (d.autonomy && d.autonomy.wait) {
      const w = d.autonomy.wait;
      if (w.reason === 'goals_done') {
        goal = '目標都已完成，無效果等待';
      } else if (w.reason === 'blocked:herb_locked') {
        goal = '存凝氣丹（靈草尚未解鎖）';
      } else if (w.reason === 'breakthrough_ask_open') {
        goal = '突破（詢問待回覆）';
      } else if (w.reason === 'breakthrough_later') {
        goal = '突破（稍後再問冷卻中）';
      } else if (w.reason === 'cultivation_full') {
        goal = '修為到 100／突破（修為已滿，等待突破）';
      } else {
        goal = label(WAIT_LABELS, w.reason);
      }
      reason = `${label(WAIT_LABELS, w.reason)}（自 tick ${w.sinceTick}，下次復查 tick ${w.recheckTick}）`;
    } else {
      goal = '待決策';
      reason = '本 tick 剛空出來，下一 tick 由自主規劃決定';
    }

    return { goal, estimatedEnd, reason };
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
      manualOrder: d.manualOrder ? {
        kind: d.manualOrder.kind || d.manualOrder.action,
        label: kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action),
        status: d.manualOrder.status,
        text: d.manualOrder.status === 'pending'
          ? `${kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action)}（排隊中，待當前活動完成後接續）`
          : kindLabel(Rules, d.manualOrder.kind || d.manualOrder.action),
      } : null,
      status: personStatus(Rules, world, d),
      why: describePersonWhy(Rules, world, d, names),
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

  function describeGoalStatus(Rules, world, names) {
    const tick = world.clock.tick;
    const slotEq = Math.floor(tick / Rules.TICKS_PER_SLOT);
    const herbUnlocked = Rules.phaseAtEq(slotEq).herbYield > 0;
    const items = [];

    for (const g of world.goals) {
      if (g.kind === 'buildFacility') {
        const spec = Rules.FACILITIES[g.facilityType];
        const costMat = spec && spec.cost ? (spec.cost.spiritMaterial || 0) : 0;
        const currentMat = world.resources.spiritMaterial;
        const deficit = Math.max(0, costMat - currentMat);
        const done = world.activities.some((a) => a.kind === 'build' && a.target.facilityType === g.facilityType && a.status === 'done');
        const inFlight = world.activities.find((a) => a.kind === 'build' && a.target.facilityType === g.facilityType && a.status !== 'done' && a.status !== 'cancelled');
        let statusText = '';
        if (done) {
          statusText = '已完工';
        } else if (inFlight) {
          const total = inFlight.units * Rules.TICKS_PER_SLOT;
          statusText = `建造中（${inFlight.workTicks}/${total} tick）`;
        } else if (deficit > 0) {
          statusText = `缺靈材 ${deficit}（現有 ${currentMat} / 需 ${costMat}）`;
        } else {
          statusText = `材料已齊備（現有 ${currentMat}），等待開工`;
        }
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done,
          deficit: !done && deficit > 0,
          statusText,
        });
      } else if (g.kind === 'stockPills') {
        const curPills = world.inventory['breakthrough-pill'] || 0;
        const targetPills = g.count;
        const done = curPills >= targetPills;
        const alchemyDone = world.activities.some((a) => a.kind === 'build' && a.target.facilityType === 'alchemyRoom' && a.status === 'done');
        const inFlight = world.activities.find((a) => a.kind === 'brew' && a.status !== 'done' && a.status !== 'cancelled');
        const recipe = Rules.RECIPES['breakthrough-pill'] || { cost: { spiritMaterial: 4, spiritHerb: 4 } };
        const curMat = world.resources.spiritMaterial;
        const curHerb = world.resources.spiritHerb;
        const needMat = recipe.cost.spiritMaterial || 0;
        const needHerb = recipe.cost.spiritHerb || 0;
        let statusText = '';
        let deficit = false;
        if (done) {
          statusText = `已達成（現有 ${curPills} / 目標 ${targetPills} 顆）`;
        } else if (!alchemyDone) {
          statusText = `丹房尚未完工（現有 ${curPills}/${targetPills} 顆）`;
          deficit = true;
        } else if (inFlight) {
          const total = inFlight.units * Rules.TICKS_PER_SLOT;
          statusText = `煉丹中（${inFlight.workTicks}/${total} tick，現有 ${curPills}/${targetPills} 顆）`;
        } else if (!herbUnlocked && curHerb < needHerb) {
          statusText = `靈草尚未解鎖生長（現有靈草 ${curHerb}/${needHerb}）`;
          deficit = true;
        } else if (curMat < needMat || curHerb < needHerb) {
          const lack = [];
          if (curMat < needMat) lack.push(`缺靈材 ${needMat - curMat}`);
          if (curHerb < needHerb) lack.push(`缺靈草 ${needHerb - curHerb}`);
          statusText = `${lack.join('、')}（現有 ${curPills}/${targetPills} 顆）`;
          deficit = true;
        } else {
          statusText = `材料齊備，等待開爐（現有 ${curPills}/${targetPills} 顆）`;
        }
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done,
          deficit,
          statusText,
        });
      } else if (g.kind === 'aid') {
        const available = Rules.aidAvailableEq(slotEq);
        const openTick = Rules.AID_AVAILABLE_FROM_SLOT * Rules.TICKS_PER_SLOT;
        const done = Boolean(world.story && (world.story.rescues > 0 || (Array.isArray(world.story.rescues) && world.story.rescues.length > 0)));
        const inFlight = world.activities.find((a) => a.kind === 'aid' && a.status !== 'done' && a.status !== 'cancelled');
        let statusText = '';
        if (done) {
          statusText = '已完成援助村落';
        } else if (inFlight) {
          statusText = '援助村落進行中';
        } else if (!available) {
          statusText = `尚未開放（第 4 天 / tick ${openTick} 開放）`;
        } else if (world.policy.aid === 'off') {
          statusText = '政策已關閉';
        } else {
          statusText = `已開放，等待執行（政策：${label(POLICY_LABELS.aid.values, world.policy.aid)}）`;
        }
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done,
          deficit: false,
          statusText,
        });
      } else if (g.kind === 'recruit') {
        const manifestPhase = (Rules.SPIRIT_PHASES && Rules.SPIRIT_PHASES.find((p) => p.id === 'manifest')) || { startSlot: 18 };
        const openTick = manifestPhase.startSlot * Rules.TICKS_PER_SLOT;
        const apprentices = world.disciples.filter((d) => d.role === 'apprentice');
        const done = apprentices.length >= 2;
        let statusText = '';
        let deficit = false;

        const hasRescues = Boolean(world.story && world.story.rescues && (
          Array.isArray(world.story.rescues) ? world.story.rescues.length > 0 : world.story.rescues > 0
        ));
        const invitations = (world.story && world.story.invitations) || {};
        const pendingEvents = world.pendingEvents || [];
        const pendingInvites = pendingEvents.filter((e) => e.id && String(e.id).startsWith('evt-invite-cand-'));
        const invitedCount = Object.values(invitations).filter((inv) => inv.status === 'invited').length;
        const deferredCount = Object.values(invitations).filter((inv) => inv.status === 'deferred').length;
        const acceptedWaiting = Object.values(invitations).filter((inv) => inv.status === 'accepted' && inv.joinTick > world.clock.tick);

        if (done) {
          statusText = `已招募 ${apprentices.length} 名學徒（名額已滿）`;
        } else if (!hasRescues) {
          statusText = `尚未開放收徒：需先完成援助村落（前置未達成，已招募 ${apprentices.length}/2）`;
          deficit = true;
        } else if (slotEq < manifestPhase.startSlot) {
          statusText = `尚未開放（第 7 天 / tick ${openTick} 開放，已招募 ${apprentices.length}/2）`;
        } else if (pendingInvites.length > 0 || invitedCount > 0) {
          const count = Math.max(pendingInvites.length, invitedCount);
          statusText = `已發出邀請，待回覆（${count} 位候選待回覆，已招募 ${apprentices.length}/2）`;
          deficit = true;
        } else if (acceptedWaiting.length > 0) {
          const ticks = acceptedWaiting.map((inv) => `tick ${inv.joinTick}`).join('、');
          statusText = `已接受邀請（預定 ${ticks} 入隊，已招募 ${apprentices.length}/2）`;
        } else if (deferredCount > 0) {
          statusText = `邀請已延後（稍後再問，已招募 ${apprentices.length}/2）`;
        } else if (world.policy.recruit === 'off') {
          statusText = `政策已關閉（已招募 ${apprentices.length}/2）`;
        } else {
          statusText = `已開放收徒（已招募 ${apprentices.length}/2，政策：${label(POLICY_LABELS.recruit.values, world.policy.recruit)}）`;
        }
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done,
          deficit,
          statusText,
        });
      } else if (g.kind === 'cultivateTo100') {
        const targets = world.disciples.filter((d) => g.discipleId === 'all' || d.id === g.discipleId);
        const allDone = targets.length > 0 && targets.every((d) => d.cultivation >= 100);
        const details = targets.map((d) => `${names[d.id] || d.id} ${d.cultivation}/100`).join('、');
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done: allDone,
          deficit: false,
          statusText: allDone ? '修為均已達 100' : `進度：${details}`,
        });
      } else if (g.kind === 'breakthrough') {
        const targets = world.disciples.filter((d) => g.discipleId === 'all' || d.id === g.discipleId);
        const allDone = targets.length > 0 && targets.every((d) => d.breakthroughs >= 1);
        if (allDone) {
          items.push({
            id: g.id,
            kind: g.kind,
            text: goalText(Rules, g),
            done: true,
            deficit: false,
            statusText: '全員已完成突破',
          });
        } else {
          const inFlight = world.activities.find((a) => a.kind === 'breakthrough' && a.status !== 'done' && a.status !== 'cancelled');
          const details = targets.map((d) => {
            const who = names[d.id] || d.id;
            if (d.breakthroughs >= 1) return `${who} 已突破`;
            if (inFlight && inFlight.discipleId === d.id) return `${who} 突破進行中`;
            if (d.cultivation >= 100) {
              const ask = world.story && world.story.breakthroughAsks && world.story.breakthroughAsks[d.id];
              if (world.policy.breakthrough === 'off') return `${who} 修為已滿（突破政策已關閉）`;
              if (ask && ask.openEventId) return `${who} 修為已滿（突破詢問待回覆）`;
              if (ask && ask.cooldownUntilTick !== null && world.clock.tick < ask.cooldownUntilTick) {
                return `${who} 修為已滿（稍後再問，冷卻至 tick ${ask.cooldownUntilTick}）`;
              }
              const unreservedPills = (world.inventory['breakthrough-pill'] || 0) - (inFlight && inFlight.usePill ? 1 : 0);
              if (world.policy.breakthroughPill === 'use' && unreservedPills < 1) {
                return `${who} 修為已滿（缺凝氣丹）`;
              }
              return `${who} 修為已滿（可突破）`;
            }
            return `${who} 修為 ${d.cultivation}/100`;
          }).join('、');

          items.push({
            id: g.id,
            kind: g.kind,
            text: goalText(Rules, g),
            done: false,
            deficit: false,
            statusText: `進度：${details}`,
          });
        }
      } else {
        items.push({
          id: g.id,
          kind: g.kind,
          text: goalText(Rules, g),
          done: false,
          deficit: false,
          statusText: '進行中',
        });
      }
    }

    const seats = [];
    const reservedCounts = {};
    for (const rsv of world.reservations) {
      if (!rsv || !rsv.seats) continue;
      for (const k of Object.keys(rsv.seats)) {
        reservedCounts[k] = (reservedCounts[k] || 0) + rsv.seats[k];
      }
    }

    let matCap = 0;
    let matOcc = 0;
    let herbCap = 0;
    let herbOcc = 0;
    for (const tile of world.tiles) {
      const terrain = Rules.TERRAIN[tile.terrain];
      if (terrain && terrain.workSlots) {
        const occ = reservedCounts[`gather:${tile.id}`] || 0;
        if (tile.terrain === 'material') {
          matCap += terrain.workSlots;
          matOcc += occ;
        } else if (tile.terrain === 'herb') {
          herbCap += terrain.workSlots;
          herbOcc += occ;
        }
      }
    }
    if (matCap > 0) seats.push({ name: '採靈材位', capacity: matCap, occupied: matOcc });
    if (herbCap > 0) seats.push({ name: '採靈草位', capacity: herbCap, occupied: herbOcc });

    const alchemyDone = world.activities.some((a) => a.kind === 'build' && a.target.facilityType === 'alchemyRoom' && a.status === 'done');
    if (alchemyDone) {
      const occ = reservedCounts['work:alchemyRoom'] || 0;
      seats.push({ name: '煉丹位', capacity: Rules.FACILITIES.alchemyRoom.workSlots, occupied: occ });
    }

    const aidAvailable = Rules.aidAvailableEq(slotEq);
    if (aidAvailable) {
      const occ = reservedCounts['aid:village'] || 0;
      seats.push({ name: '援村位', capacity: Rules.AID_WORKERS, occupied: occ });
    }

    return { items, seats };
  }

  function describe(world, deps) {
    const Rules = deps.Rules;
    const names = nameTable(world, deps.StoryData);
    const tick = world.clock.tick;
    const phase = phaseOf(Rules, tick);
    const people = describePeople(Rules, world, names);
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
      goalStatus: describeGoalStatus(Rules, world, names),
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
    const why = p.why || {};
    const rows = [
      ['身分', `${p.role}（${p.id}）`],
      ['位置', `(${p.pos.r},${p.pos.c})`],
      ['狀態', `${s.label}${s.status ? `・${s.status}` : ''}`],
      ['說明', s.text],
      ['為了哪個目標', why.goal || '—'],
      ['動機／理由', why.reason || '—'],
      ['預估結束', why.estimatedEnd || '—'],
      ['來源', s.origin ? (s.origin === 'auto' ? '自主規劃' : '手動指令') : '—'],
      ['fallback', s.fallback || '—'],
      ['等待原因碼', s.code || '—'],
      ['手動指令', p.manualOrder ? (p.manualOrder.text || p.manualOrder.label || p.manualOrder) : '無'],
      ['根骨／悟性／手藝', `${p.attributes.rootBone}／${p.attributes.comprehension}／${p.attributes.craft}`],
    ];
    return `<h3>${esc(p.name)}</h3><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  }

  function renderStock(model) {
    const res = model.resources.map((r) => `<li>${esc(r.label)} <strong>${r.value}</strong></li>`).join('');
    const fac = model.facilities.length === 0 ? '<li>尚無</li>' : model.facilities.map((f) => `<li>${esc(f.label)}・${esc(f.tileId)}・${f.done ? `完工 tick ${f.completedTick}` : `建造中 ${f.progress.done}/${f.progress.total} tick`}</li>`).join('');
    return `<h3>庫存</h3><ul>${res}<li>凝氣丹 <strong>${model.pills}</strong></li></ul><h3>設施</h3><ul>${fac}</ul>`;
  }

  function renderSettings(model) {
    const pol = model.policy.map((p) => `<li>${esc(p.name)}：<strong>${esc(p.text)}</strong> <code>${esc(p.value)}</code></li>`).join('');
    const goals = model.goals.map((g, i) => `<li>${i + 1}. ${esc(g.text)}</li>`).join('');
    const statusItems = (model.goalStatus && model.goalStatus.items) ? model.goalStatus.items.map((item, i) => {
      const cls = item.done ? 'done' : (item.deficit ? 'deficit' : 'ongoing');
      return `<li class="goal-item ${cls}"><strong>${i + 1}. ${esc(item.text)}</strong><br><span class="goal-desc">${esc(item.statusText)}</span></li>`;
    }).join('') : '';
    const seats = (model.goalStatus && model.goalStatus.seats) ? model.goalStatus.seats.map((s) => {
      const full = s.occupied >= s.capacity ? '（滿員）' : '';
      return `<li>${esc(s.name)}：<strong>${s.occupied}/${s.capacity}</strong>${full}</li>`;
    }).join('') : '';

    return `<h3>政策（安穩發展）</h3><ul>${pol}</ul>
      <h3>目標狀態與缺口</h3><ul class="goal-status-list">${statusItems || '<li>尚無目標</li>'}</ul>
      ${seats ? `<h3>工作位容量</h3><ul class="seat-list">${seats}</ul>` : ''}
      <h3>目標順序</h3><ol class="plain">${goals}</ol>`;
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

  return Object.freeze({
    describe, render, renderDetail, renderPeople, renderSettings, eventText,
    saveStatusText, renderSavePanel, renderRawExports, WAIT_LABELS, FALLBACK_LABELS,
  });
});
