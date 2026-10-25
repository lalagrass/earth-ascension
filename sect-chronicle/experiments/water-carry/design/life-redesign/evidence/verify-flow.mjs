import assert from 'node:assert/strict';
import { createModel } from '../../../demo/model.mjs';
import { selectStarterDuo } from '../../../../../life/core/persona-creation.mjs';
import { ReservationBroker } from '../../../../../life/core/reservation.mjs';
import { resolveCreekPath } from '../../../../../life/core/martial-combat.mjs';
import { ChoreQuotaManager } from '../../../../../life/core/outreach-social.mjs';
import { simulateSegmentedPatrol } from '../../../../../life/core/patrol-defense.mjs';
import { advanceLuohanPractice } from '../../../../../life/core/martial-evolution.mjs';
import { WorldToneFilter } from '../../../../../life/core/legendary-clashes.mjs';
import { SaveSchemaV1Manager } from '../../../../../life/core/grand-founding-save.mjs';

const log = (msg) => console.log(`[VERIFY] ${msg}`);

// 1. v0.1-v0.2 Starter Duo & Sect Origin + Duplicate Partner Counterexample
const dupCheck = selectStarterDuo({
  heroMode: 'preset',
  heroTemplateId: 'guo_jing',
  fellowTemplateId: 'guo_jing',
});
assert.equal(dupCheck.ok, false);
assert.equal(dupCheck.reason, 'DUPLICATE_PARTNER_OR_STATS_OVERFLOW');
log('v0.1-v0.2 Counterexample 1 (Duplicate Partner Block): PASS');

const duo = selectStarterDuo({
  heroMode: 'preset',
  heroTemplateId: 'guo_jing',
  fellowTemplateId: 'wei_xiaobao',
});
assert.equal(duo.ok, true);
assert.equal(duo.sectOrigin.id, 'origin.beixia_palm');
assert.equal(duo.duoSynergy.id, 'duo_synergy.simple_and_slick');
log(`v0.1-v0.2 Starter Duo & Sect Origin (${duo.sectOrigin.sectName} + ${duo.duoSynergy.name}): PASS`);

// 2. Reservation Double-Spend Counterexample
const broker = new ReservationBroker();
const getStock = () => 1;
const r1 = broker.reserveMaterial('thatch', 1, 'disc.hero', getStock);
const r2 = broker.reserveMaterial('thatch', 1, 'disc.cousin', getStock);
assert.equal(r1.ok, true);
assert.equal(r2.ok, false);
assert.equal(r2.reason, 'LACK_OF_MATERIAL');
log('v0.1-v0.2 Counterexample 2 (Atomic Reservation Single Winner): PASS');

// 3. v0.4 Creek Shortcut Level Gate
const pathLv2 = resolveCreekPath('yard', 'tan_south', 2);
const pathLv3 = resolveCreekPath('yard', 'tan_south', 3);
assert.ok(pathLv2.path.includes('creek_bridge'));
assert.ok(pathLv3.path.includes('step_stones'));
log(`v0.4 Creek Shortcut (Lv2 via creek_bridge ${pathLv2.totalCost} steps vs Lv3 via step_stones ${pathLv3.totalCost} steps): PASS`);

// 4. v0.5-v0.6 Chore Quota & Wei Xiaobao vs Guo Jing Patrol
const quota = new ChoreQuotaManager();
quota.getOrCreateQuota({ id: 'disc.lazy_outer', rankTier: 'outer' });
quota.recordChoreCompletion('disc.lazy_outer', 'carry_water');
const skipAttempt = quota.attemptClaimMartialPractice('disc.lazy_outer');
assert.equal(skipAttempt.ok, false);
assert.equal(skipAttempt.reason, 'CHORE_QUOTA_INCOMPLETE');
log('v0.5 Counterexample (Outer Disciple Chore Skip Block): PASS');

const reportWei = simulateSegmentedPatrol(
  { id: 'disc.wei', name: '韋小寶', patrolStyle: 'stealth_looter', energy: 90, inventory: { limePouchCount: 3 } },
  { clearedStages: [] }
);
const reportGuo = simulateSegmentedPatrol(
  { id: 'disc.guo', name: '郭靖', patrolStyle: 'completionist_bulldozer', energy: 95, satiety: 24, inventory: { rationCount: 1 } },
  { forceEatAtS2: true }
);
assert.equal(reportWei.lootScentAlertTriggered, true);
assert.equal(reportGuo.summaryCounts.escaped, 0);
log(`v0.6 Patrol Styles (Wei Xiaobao scentAlert=${reportWei.lootScentAlertTriggered}, Guo Jing escaped=${reportGuo.summaryCounts.escaped}): PASS`);

// 5. v0.7 High Comprehension Capped at Lv5 Luohan
const highCompHero = { id: 'smart', stats: { comprehension: 8 }, traits: [], martialArts: { 'art.luohan_fist': 5 } };
const capped = advanceLuohanPractice(highCompHero, 10000);
assert.equal(capped.currentLevel, 5);
assert.equal(capped.cappedAtLv5, true);
log('v0.7 Counterexample (High Comprehension Capped at Lv5 Luohan): PASS');

// 6. v0.9-v1.0 Tone Filter & Save Schema v1 Determinism
const orthoBlock = WorldToneFilter.canSpawnCharacter('火雲邪神', 'orthodox');
assert.equal(orthoBlock.allowed, false);
assert.equal(orthoBlock.reason, 'BLOCKED_BY_ORTHODOX_TONE_FILTER');
log('v0.9 Counterexample (Orthodox Filter Blocks Stephen Chow Cast): PASS');

const wrongVer = SaveSchemaV1Manager.loadFromV1Json(JSON.stringify({ schemaVersion: 'sect-life-v0.5-beta' }));
assert.equal(wrongVer.ok, false);
assert.equal(wrongVer.reason, 'INVALID_SAVE_SCHEMA_VERSION');
const det = SaveSchemaV1Manager.verifySaveLoadDeterminism(8888, 60, 60);
assert.equal(det.deterministic, true);
assert.equal(det.hashDirect, det.hashSaveLoad);
log(`v1.0 Save Schema v1 Determinism (hash=${det.hashDirect}, deterministic=${det.deterministic}): PASS`);

// 7. Demo Model UI Action Dispatch & View Sync
const model = createModel();
model.life.initPersona({ mode: 'preset', presetKey: 'guo_jing', fellowTemplateId: 'linghu_chong' });
model.life.waterGardenPlot('veg_1');
model.life.cookSignatureDish('beggar_chicken');
model.life.dispatchSegmentedPatrol('stealth_looter');
model.life.breakthroughLuohanLv10();
model.life.brewSupremeTonicForHaiDafu();
model.life.triggerLegendaryClash('ahsing_cocoon_rulai');
assert.equal(model.view().life.v09.clashes.ahSingCocoonStage, 'mummy_cocoon');
model.life.triggerLegendaryClash('ahsing_cocoon_rulai');
model.life.holdGrandFoundingCeremony('《剛柔太清神掌》');
const view = model.view();
assert.equal(view.life.sectOrigin.sectName, '鎮北武館');
assert.equal(view.life.v07.trackBLuohan.level, 10);
assert.equal(view.life.v08.alchemy.haiDafuVisited, true);
assert.equal(view.life.v09.clashes.ahSingCocoonStage, 'rulai_awakened');
assert.equal(view.life.v10.grandFounding.ceremonyHeld, true);
log('Demo Model v0.1-v1.0 Action Dispatch & View Sync: PASS');
