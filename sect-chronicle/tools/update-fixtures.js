'use strict';
// 重新產生 test/fixtures/new-world.json。僅在「有意」改變 schema／ruleVersion／rngVersion 時執行，
// 並在 PR 說明每個 hash 為何改變；不可為了讓測試變綠而順手重產。
const fs = require('node:fs');
const path = require('node:path');
const S = require('../js/state.js');

const opt = (templateId, allocation, risk, bond) => ({ templateId, allocation, personality: { risk, bond } });
const specs = [
  { name: 'default-options', seed: 'sg-fixture-001', characterOptions: undefined },
  { name: 'herb-child-balanced-cautious-independent', seed: 'sg-fixture-002', characterOptions: opt('herb-child', { rootBone: 1, comprehension: 1, craft: 1 }, 'cautious', 'independent') },
  { name: 'farmer-child-root-heavy-bold-caring', seed: 'sg-fixture-003', characterOptions: opt('farmer-child', { rootBone: 2, comprehension: 1, craft: 0 }, 'bold', 'caring') },
  { name: 'dojo-apprentice-craft-heavy-cautious-caring', seed: 'sg-fixture-004', characterOptions: opt('dojo-apprentice', { rootBone: 0, comprehension: 0, craft: 3 }, 'cautious', 'caring') },
  { name: 'same-seed-other-personality', seed: 'sg-fixture-001', characterOptions: opt('dojo-apprentice', { rootBone: 1, comprehension: 1, craft: 1 }, 'bold', 'independent') },
  { name: 'non-ascii-seed', seed: 'é世界', characterOptions: undefined },
  { name: 'balance-seed-000', seed: 'sg-bal-000', characterOptions: undefined },
];

const cases = specs.map((s) => {
  const r = S.newWorld(s.seed, 'slice-14', s.characterOptions);
  if (!r.ok) throw new Error(`${s.name}: ${r.code} ${r.reason}`);
  const c = { name: s.name, seed: s.seed, scenarioId: 'slice-14' };
  if (s.characterOptions !== undefined) c.characterOptions = s.characterOptions;
  c.hash = S.hashWorld(r.state);
  c.rngState = r.state.rngState;
  c.canonical = S.canonicalize(r.state);
  return c;
});

const out = {
  note: '由 tools/update-fixtures.js 產生；改動須在 PR 說明原因（schema／ruleVersion／rngVersion 變更）。',
  schemaVersion: S.SCHEMA_VERSION,
  ruleVersion: S.RULE_VERSION,
  rngVersion: S.RNG_VERSION,
  cases,
};
const file = path.join(__dirname, '..', 'test', 'fixtures', 'new-world.json');
fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${file} (${cases.length} cases)`);
