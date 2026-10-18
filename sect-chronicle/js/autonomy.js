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
    const buildJob = { taken: false, facilityType: null, tileId: null, units: 0 };
    const brewJob = { taken: false };
    const aidJob = { taken: false, optionId: null };
    let gatherMaterial = 0;
    let gatherHerb = 0;
    let herbBlocked = false;
    let alchemyReady = !!snapshot.facilitiesDone.alchemyRoom;

    for (const goal of snapshot.goals) {
      if (goal.kind === 'buildFacility') {
        const spec = Rules.FACILITIES[goal.facilityType];
        const open = snapshot.buildOpen[goal.facilityType] || 0;
        if (open >= spec.maxCount || buildJob.facilityType) continue;
        const cost = spec.cost.spiritMaterial || 0;
        const tileId = bestBuildTile(tiles, goal.facilityType);
        if (!tileId) continue;
        if (material >= cost) {
          buildJob.facilityType = goal.facilityType;
          buildJob.tileId = tileId;
          buildJob.units = spec.durationSlots;
          material -= cost;
          if (goal.facilityType === 'alchemyRoom') alchemyReady = false;
        } else {
          gatherMaterial += cost - material;
          material = 0;
        }
      } else if (goal.kind === 'stockPills') {
        if (pills >= goal.count) continue;
        const recipe = Rules.RECIPES[PILL];
        const needMat = recipe.cost.spiritMaterial || 0;
        const needHerb = recipe.cost.spiritHerb || 0;
        const seatFree = !snapshot.brewInFlight && (seats['work:alchemyRoom'] || 0) > 0;
        if (!snapshot.facilitiesDone.alchemyRoom) {
          // 丹房未完工時，缺的是前面的建造，不把靈草未解鎖當成這個人無路可走。
        } else if (alchemyReady && seatFree && material >= needMat && herb >= needHerb && !brewJob.pending) {
          brewJob.pending = true;
          material -= needMat;
          herb -= needHerb;
          pills += Rules.BREW_MIN_OUTPUT;
        } else if (seatFree || !snapshot.brewInFlight) {
          if (herb < needHerb) {
            if (herbUnlocked) {
              gatherHerb += needHerb - herb;
              herb = 0;
            } else herbBlocked = true;
          }
          if (material < needMat) {
            gatherMaterial += needMat - material;
            material = 0;
          }
        } else if (material >= needMat && (herb >= needHerb || !herbUnlocked)) {
          // 進行中的爐已占丹房。材料夠下一爐就先做後面的目標；不夠才補採。
        } else {
          if (herb < needHerb) {
            if (herbUnlocked) {
              gatherHerb += needHerb - herb;
              herb = 0;
            } else herbBlocked = true;
          }
          if (material < needMat) {
            gatherMaterial += needMat - material;
            material = 0;
          }
        }
      } else if (goal.kind === 'aid') {
        if (snapshot.aidDone || snapshot.aidInFlight || aidJob.optionId) continue;
        if (!Rules.aidAvailableEq(slotEq)) continue;
        if (policy.aid === 'auto-free') aidJob.optionId = 'free';
        else if (policy.aid === 'auto-supplied') {
          const cost = Rules.AID_OPTIONS.supplied.cost.spiritMaterial || 0;
          if (material >= cost) {
            aidJob.optionId = 'supplied';
            material -= cost;
          } else {
            gatherMaterial += cost - material;
            material = 0;
          }
        }
      }
    }

    const taken = new Set();
    const assignments = [];
    const candidates = snapshot.disciples.filter((d) => d.decide).slice().sort(byId);
    for (const disciple of candidates) {
      if (taken.has(disciple.id)) continue;
      if (needsRest(disciple)) {
        assignments.push(request(disciple.id, 'rest', {}, 1));
        taken.add(disciple.id);
        continue;
      }
      let made = null;
      if (buildJob.facilityType && !buildJob.taken) {
        const key = `build:${buildJob.tileId}`;
        if ((seats[key] || 0) >= 1) {
          made = request(disciple.id, 'build', { facilityType: buildJob.facilityType, tileId: buildJob.tileId }, buildJob.units);
          buildJob.taken = true;
          seats[key] -= 1;
        }
      } else if (brewJob.pending && !brewJob.taken && (seats['work:alchemyRoom'] || 0) >= 1) {
        made = request(disciple.id, 'brew', { recipeId: PILL }, Rules.RECIPES[PILL].durationSlots);
        brewJob.taken = true;
        seats['work:alchemyRoom'] -= 1;
      } else if (aidJob.optionId && !aidJob.taken && (seats['aid:village'] || 0) >= 1) {
        made = request(disciple.id, 'aid', { optionId: aidJob.optionId }, 1);
        aidJob.taken = true;
        seats['aid:village'] -= 1;
      } else if (gatherMaterial > 0) {
        const tileId = nearestTile(disciple.pos, tiles, 'material', seats);
        const amount = tileId ? unitYield(disciple, 'spiritMaterial', slotEq) : 0;
        if (tileId && amount > 0) {
          made = request(disciple.id, 'gather-material', { tileId }, 1);
          seats[`gather:${tileId}`] -= 1;
          gatherMaterial -= amount;
        }
      } else if (gatherHerb > 0 && herbUnlocked) {
        const tileId = nearestTile(disciple.pos, tiles, 'herb', seats);
        const amount = tileId ? unitYield(disciple, 'spiritHerb', slotEq) : 0;
        if (tileId && amount > 0) {
          made = request(disciple.id, 'gather-herb', { tileId }, 1);
          seats[`gather:${tileId}`] -= 1;
          gatherHerb -= amount;
        }
      }
      if (!made && !breakthroughOpen) {
        const wantsBreak = snapshot.goals.some((g) => g.kind === 'breakthrough' && goalFor(g, disciple.id));
        if (wantsBreak && policy.breakthrough === 'auto' && canBreak(disciple)) {
          const usePill = policy.breakthroughPill === 'use' && pillsFree >= 1;
          const supporterId = policy.breakthroughSupport === 'auto'
            ? pickSupporter(snapshot.disciples, disciple.id, taken)
            : null;
          made = request(disciple.id, 'breakthrough', {}, 1, { usePill, supporterId });
          if (usePill) pillsFree -= 1;
          if (supporterId) taken.add(supporterId);
          breakthroughOpen = true;
        }
      }
      if (!made && canCultivate(disciple)) {
        made = request(disciple.id, 'cultivate', {}, 1);
      }
      if (made) {
        assignments.push(made);
        taken.add(disciple.id);
      } else {
        assignments.push({
          discipleId: disciple.id,
          type: 'wait',
          reason: waitReason(disciple, { tick, herbBlocked: herbBlocked && (gatherHerb > 0 || herbBlocked) }),
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
