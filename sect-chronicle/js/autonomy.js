/*
 * SG-RT-02：自主生活的純決策。
 *
 * plan(snapshot) 只讀呼叫端給的快照與 rules.js 的公開表，不讀 RNG、不寫世界。
 * 輸出是正式請求或有原因的等待。預約、扣料與移動仍由 realtime.js 走 RT-01 的同一條路。
 */
(function (root, factory) {
  'use strict';
  let Rules;
  if (typeof module === 'object' && module && module.exports) {
    Rules = require('./rules.js');
    module.exports = factory(Rules);
  } else {
    Rules = root.SectChronicle && root.SectChronicle.Rules;
    if (!Rules) throw new Error('autonomy.js 需要先載入 js/rules.js');
    const ns = root.SectChronicle;
    ns.Autonomy = factory(Rules);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Rules) {
  'use strict';

  const PILL = 'breakthrough-pill';
  const WAIT_REASONS = Object.freeze([
    'goals_done', 'blocked:herb_locked', 'breakthrough_ask_open', 'breakthrough_later', 'cultivation_full',
  ]);

  function pathBetween(from, to) {
    if (from.r === to.r && from.c === to.c) return [];
    const gate = Rules.VILLAGE_GATE;
    const mouth = { r: 2, c: 0 };
    if (from.r === gate.r && from.c === gate.c) return [mouth].concat(pathBetween(mouth, to));
    if (to.r === gate.r && to.c === gate.c) return pathBetween(from, mouth).concat([gate]);
    const steps = [];
    let r = from.r;
    let c = from.c;
    const dr = Math.sign(to.r - r);
    while (r !== to.r) {
      r += dr;
      steps.push({ r, c });
    }
    const dc = Math.sign(to.c - c);
    while (c !== to.c) {
      c += dc;
      steps.push({ r, c });
    }
    return steps;
  }

  function byId(a, b) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  function goalFor(goal, discipleId) {
    return goal.discipleId === 'all' || goal.discipleId === discipleId;
  }

  function bestBuildTile(tiles, facilityType) {
    let best = null;
    for (const tile of tiles) {
      const place = Rules.evaluateFacilityPlacement(tiles, tile.id, facilityType);
      if (!place.ok) continue;
      if (!best || place.multiplierBp > best.bp || (place.multiplierBp === best.bp && tile.id < best.id)) {
        best = { id: tile.id, bp: place.multiplierBp };
      }
    }
    return best ? best.id : null;
  }

  function nearestTile(from, tiles, terrain, seats) {
    let best = null;
    for (const tile of tiles) {
      if (tile.terrain !== terrain) continue;
      const key = `gather:${tile.id}`;
      if ((seats[key] || 0) < 1) continue;
      const dist = pathBetween(from, { r: tile.row, c: tile.col }).length;
      if (!best || dist < best.dist || (dist === best.dist && tile.id < best.id)) {
        best = { id: tile.id, dist };
      }
    }
    return best ? best.id : null;
  }

  function unitYield(disciple, resource, slotEq) {
    return Rules.gatherYieldAtEq({
      slotEq, resource, craft: disciple.attributes.craft, stamina: disciple.stamina,
    }).amount;
  }

  function needsRest(disciple) {
    return disciple.stamina < Rules.REST_BELOW_STAMINA || disciple.injury >= Rules.REST_AT_INJURY;
  }

  function canCultivate(disciple) {
    return disciple.breakthroughs < Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE
      && disciple.cultivation < Rules.CULTIVATION_CAP;
  }

  function canBreak(disciple) {
    return disciple.breakthroughs < Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE
      && Rules.canAttemptBreakthrough(disciple.cultivation);
  }

  function pickSupporter(disciples, selfId, taken) {
    const ids = disciples
      .filter((d) => d.joined && d.idle && !d.manualLock && d.id !== selfId && !taken.has(d.id))
      .map((d) => d.id)
      .sort();
    return ids.length > 0 ? ids[0] : null;
  }

  function request(discipleId, kind, target, units, extra) {
    return Object.assign({ discipleId, type: 'request', kind, target, units }, extra || {});
  }

  function waitReason(disciple, ctx) {
    if (disciple.askOpen) return 'breakthrough_ask_open';
    if (disciple.askCooldownUntil !== null && ctx.tick < disciple.askCooldownUntil) return 'breakthrough_later';
    if (ctx.herbBlocked) return 'blocked:herb_locked';
    if (disciple.breakthroughs < Rules.MAX_BREAKTHROUGHS_PER_DISCIPLE && disciple.cultivation >= Rules.CULTIVATION_CAP) {
      return 'cultivation_full';
    }
    return 'goals_done';
  }

  // snapshot：{ tick, tiles, resources, pillsFree, inbound:{spiritMaterial,spiritHerb},
  //   seats, facilitiesDone, buildOpen, brewInFlight, aidInFlight, aidDone, openBreakthrough,
  //   goals, policy, disciples:[{ id, attributes:{craft}, stamina, injury, cultivation, breakthroughs,
  //     pos:{r,c}, joined, idle, manualLock, decide, askOpen, askCooldownUntil }] }
  function plan(snapshot) {
    const tick = snapshot.tick;
    const slotEq = Math.floor(tick / Rules.TICKS_PER_SLOT);
    const herbUnlocked = Rules.phaseAtEq(slotEq).herbYield > 0;
    const tiles = snapshot.tiles;
    const seats = Object.assign({}, snapshot.seats);
    let material = snapshot.resources.spiritMaterial + (snapshot.inbound.spiritMaterial || 0);
    let herb = snapshot.resources.spiritHerb + (snapshot.inbound.spiritHerb || 0);
    let pills = snapshot.pills + (snapshot.inbound.pills || 0);
    let pillsFree = snapshot.pillsFree;
    let breakthroughOpen = !!snapshot.openBreakthrough;
    const policy = snapshot.policy;
    const buildClaimed = {};
    let brewClaimed = false;
    let aidClaimed = false;
    let pledgedMat = 0;
    let pledgedHerb = 0;
    let heldMat = 0;
    let herbBlocked = false;
    let alchemyReady = !!snapshot.facilitiesDone.alchemyRoom;
    const taken = new Set();
    const assignments = [];

    function freeMat() {
      return material - heldMat;
    }
    function takeSeat(key) {
      if ((seats[key] || 0) < 1) return false;
      seats[key] -= 1;
      return true;
    }
    function gather(disciple, resource) {
      const terrain = resource === 'spiritMaterial' ? 'material' : 'herb';
      const tileId = nearestTile(disciple.pos, tiles, terrain, seats);
      const amount = tileId ? unitYield(disciple, resource, slotEq) : 0;
      if (!tileId || amount <= 0) return null;
      seats[`gather:${tileId}`] -= 1;
      const kind = resource === 'spiritMaterial' ? 'gather-material' : 'gather-herb';
      return { made: request(disciple.id, kind, { tileId }, 1), amount };
    }
    // 依目標順序找這個人現在做得到的第一件事。前面的目標被進行中的工作覆蓋、或被靈草鎖住時，才往後看。
    function serve(disciple) {
      for (const goal of snapshot.goals) {
        if (goal.kind === 'buildFacility') {
          const spec = Rules.FACILITIES[goal.facilityType];
          if (!spec) continue;
          const open = (snapshot.buildOpen[goal.facilityType] || 0) + (buildClaimed[goal.facilityType] || 0);
          if (open >= spec.maxCount) continue;
          const cost = spec.cost.spiritMaterial || 0;
          const tileId = bestBuildTile(tiles, goal.facilityType);
          if (!tileId) continue;
          if (freeMat() >= cost && takeSeat(`build:${tileId}`)) {
            material -= cost;
            buildClaimed[goal.facilityType] = (buildClaimed[goal.facilityType] || 0) + 1;
            if (goal.facilityType === 'alchemyRoom') alchemyReady = false;
            return request(disciple.id, 'build', { facilityType: goal.facilityType, tileId }, spec.durationSlots);
          }
          if (material + pledgedMat < cost) {
            heldMat = Math.max(heldMat, Math.min(cost, material));
            const got = gather(disciple, 'spiritMaterial');
            if (got) {
              pledgedMat += got.amount;
              return got.made;
            }
          }
          continue;
        }
        if (goal.kind === 'stockPills') {
          if (pills >= goal.count) continue;
          if (!snapshot.facilitiesDone.alchemyRoom || !alchemyReady) continue;
          const recipe = Rules.RECIPES[PILL];
          const needMat = recipe.cost.spiritMaterial || 0;
          const needHerb = recipe.cost.spiritHerb || 0;
          const flying = snapshot.brewInFlight || brewClaimed;
          const matCovered = freeMat() + pledgedMat >= needMat;
          const herbCovered = herb + pledgedHerb >= needHerb;
          if (flying && pills + Rules.BREW_MIN_OUTPUT >= goal.count && matCovered && (herbCovered || !herbUnlocked)) continue;
          if (!flying && (seats['work:alchemyRoom'] || 0) >= 1 && freeMat() >= needMat && herb >= needHerb) {
            takeSeat('work:alchemyRoom');
            material -= needMat;
            herb -= needHerb;
            pills += Rules.BREW_MIN_OUTPUT;
            brewClaimed = true;
            return request(disciple.id, 'brew', { recipeId: PILL }, recipe.durationSlots);
          }
          if (herb < needHerb && !herbUnlocked) {
            herbBlocked = true;
            continue;
          }
          if (!herbCovered) {
            const got = gather(disciple, 'spiritHerb');
            if (got) {
              pledgedHerb += got.amount;
              if (heldMat < needMat) heldMat = needMat;
              return got.made;
            }
          }
          if (!matCovered) {
            const got = gather(disciple, 'spiritMaterial');
            if (got) {
              pledgedMat += got.amount;
              return got.made;
            }
          }
          continue;
        }
        if (goal.kind === 'aid') {
          if (snapshot.aidDone || snapshot.aidInFlight || aidClaimed) continue;
          if (!Rules.aidAvailableEq(slotEq)) continue;
          if (policy.aid !== 'auto-free' && policy.aid !== 'auto-supplied') continue;
          const cost = policy.aid === 'auto-supplied' ? (Rules.AID_OPTIONS.supplied.cost.spiritMaterial || 0) : 0;
          if (policy.aid === 'auto-supplied' && freeMat() < cost) {
            if (freeMat() + pledgedMat < cost) {
              const got = gather(disciple, 'spiritMaterial');
              if (got) {
                pledgedMat += got.amount;
                return got.made;
              }
            }
            continue;
          }
          if (!takeSeat('aid:village')) continue;
          if (cost > 0) material -= cost;
          aidClaimed = true;
          return request(disciple.id, 'aid', { optionId: policy.aid === 'auto-free' ? 'free' : 'supplied' }, 1);
        }
        if ((goal.kind === 'cultivateTo100' || goal.kind === 'breakthrough') && goalFor(goal, disciple.id)) {
          // 未滿且未提升時，突破目標的前置就是修行，後面的建造不能插隊（§3.3 R2）。
          if (canCultivate(disciple)) return request(disciple.id, 'cultivate', {}, 1);
          if (!breakthroughOpen && goal.kind === 'breakthrough' && policy.breakthrough === 'auto' && canBreak(disciple)) {
            const usePill = policy.breakthroughPill === 'use' && pillsFree >= 1;
            const supporterId = policy.breakthroughSupport === 'auto'
              ? pickSupporter(snapshot.disciples, disciple.id, taken)
              : null;
            if (usePill) pillsFree -= 1;
            if (supporterId) taken.add(supporterId);
            breakthroughOpen = true;
            return request(disciple.id, 'breakthrough', {}, 1, { usePill, supporterId });
          }
        }
      }
      return null;
    }

    const candidates = snapshot.disciples.filter((d) => d.decide).slice().sort(byId);
    for (const disciple of candidates) {
      if (taken.has(disciple.id)) continue;
      if (needsRest(disciple)) {
        assignments.push(request(disciple.id, 'rest', {}, 1));
        taken.add(disciple.id);
        continue;
      }
      let made = serve(disciple);
      if (!made && canCultivate(disciple)) made = request(disciple.id, 'cultivate', {}, 1);
      if (made) {
        assignments.push(made);
        taken.add(disciple.id);
      } else {
        assignments.push({
          discipleId: disciple.id,
          type: 'wait',
          reason: waitReason(disciple, { tick, herbBlocked }),
        });
        taken.add(disciple.id);
      }
    }
    return { assignments, reasons: WAIT_REASONS };
  }

  return Object.freeze({
    WAIT_REASONS, plan, pathBetween,
  });
});
