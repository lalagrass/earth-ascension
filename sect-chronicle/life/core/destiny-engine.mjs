// destiny-engine.mjs
// 通用宿命樹評估器 (<150 行宣告式狀態機)

import defaultDestinyTrees from '../data/destiny-trees.json' with { type: 'json' };

export function evaluateDestinyMilestones(world, actor, customTrees = null) {
  const trees = customTrees || defaultDestinyTrees.trees;
  const treeId = actor.destinyTreeId;
  const tree = trees[treeId];
  if (!tree || !Array.isArray(tree.stages)) return [];

  if (!actor.unlockedStages) actor.unlockedStages = [];
  if (!actor.unlockedArts) actor.unlockedArts = [];
  if (!actor.artLevels) actor.artLevels = {};

  const newlyUnlocked = [];

  for (const stageDef of tree.stages) {
    if (actor.unlockedStages.includes(stageDef.stage)) {
      continue;
    }

    const req = stageDef.require;
    let meetsRequire = true;

    if (req) {
      if (req.dayMin != null && (world.day || 1) < req.dayMin) {
        meetsRequire = false;
      }

      if (meetsRequire && req.facilityCompleted) {
        const fac = world.facilities?.[req.facilityCompleted];
        const isDone = fac && (fac.phase === 'completed' || fac.stage === 'done' || fac.stage === 'completed');
        if (!isDone) meetsRequire = false;
      }

      if (meetsRequire && req.statMin) {
        for (const [statKey, minVal] of Object.entries(req.statMin)) {
          if ((actor.innateStats?.[statKey] ?? 0) < minVal) {
            meetsRequire = false;
            break;
          }
        }
      }

      if (meetsRequire && req.statMax) {
        for (const [statKey, maxVal] of Object.entries(req.statMax)) {
          if ((actor.innateStats?.[statKey] ?? 0) > maxVal) {
            meetsRequire = false;
            break;
          }
        }
      }

      if (meetsRequire && req.artLevel) {
        for (const [artId, minLv] of Object.entries(req.artLevel)) {
          if ((actor.artLevels?.[artId] ?? 0) < minLv) {
            meetsRequire = false;
            break;
          }
        }
      }
    }

    // 分歧判定 (如第四階心魔分歧)
    let chosenBranch = null;
    if (meetsRequire && stageDef.branches) {
      for (const [branchKey, branch] of Object.entries(stageDef.branches)) {
        let branchOk = true;
        const bReq = branch.require || {};
        if (bReq.composureMin != null && (actor.innateStats?.composure ?? 0) < bReq.composureMin) {
          branchOk = false;
        }
        if (bReq.currentSafeMin != null && (actor.persona?.current?.safe ?? 0.5) < bReq.currentSafeMin) {
          branchOk = false;
        }
        if (bReq.composureMax != null && (actor.innateStats?.composure ?? 0) > bReq.composureMax) {
          branchOk = false;
        }
        if (branchOk) {
          chosenBranch = { key: branchKey, ...branch };
          break;
        }
      }
      if (!chosenBranch) meetsRequire = false;
    }

    if (meetsRequire) {
      actor.unlockedStages.push(stageDef.stage);
      const unlockedInfo = {
        stage: stageDef.stage,
        name: stageDef.name,
        treeId,
        arts: [],
        title: null,
      };

      if (stageDef.unlockArt && !actor.unlockedArts.includes(stageDef.unlockArt)) {
        actor.unlockedArts.push(stageDef.unlockArt);
        actor.artLevels[stageDef.unlockArt] = actor.artLevels[stageDef.unlockArt] || 1;
        unlockedInfo.arts.push(stageDef.unlockArt);
      }
      if (stageDef.unlockInternal && !actor.unlockedArts.includes(stageDef.unlockInternal)) {
        actor.unlockedArts.push(stageDef.unlockInternal);
        actor.artLevels[stageDef.unlockInternal] = actor.artLevels[stageDef.unlockInternal] || 1;
        unlockedInfo.arts.push(stageDef.unlockInternal);
      }

      if (chosenBranch) {
        if (chosenBranch.unlockArt && !actor.unlockedArts.includes(chosenBranch.unlockArt)) {
          actor.unlockedArts.push(chosenBranch.unlockArt);
          actor.artLevels[chosenBranch.unlockArt] = actor.artLevels[chosenBranch.unlockArt] || 1;
          unlockedInfo.arts.push(chosenBranch.unlockArt);
        }
        if (chosenBranch.title && actor.persona) {
          actor.persona.daoTitle = chosenBranch.title;
          unlockedInfo.title = chosenBranch.title;
        }
        if (chosenBranch.applyPerk && actor.innateStats) {
          actor.innateStats.innatePerks.push(chosenBranch.applyPerk);
        }
      }

      newlyUnlocked.push(unlockedInfo);
    }
  }

  return newlyUnlocked;
}
