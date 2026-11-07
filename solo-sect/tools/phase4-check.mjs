#!/usr/bin/env node
// Phase 4 A 類驗收：任選 --seed，固定情境逐項檢查，不依賴抽樣比例。
import assert from 'node:assert/strict';
import { createState } from '../src/sim.mjs';
import { billDue } from '../src/economy.mjs';
import { checkPartnerAwakening } from '../src/arts.mjs';
import { affKey } from '../src/util.mjs';

const flag = process.argv.find((arg) => arg.startsWith('--seed='));
const seed = Number(flag?.slice(7) ?? 42);
if (!Number.isInteger(seed) || seed < 0) throw new Error('--seed 須為非負整數');
const old = createState(seed);
assert.deepEqual(old.ds.map((d) => d.id), ['hero', 'origin-1', 'origin-2']);
assert.equal(old.hermitage, undefined);
const x = createState(seed, { hermitage: true, partner: 'xiaolongnv' });
assert.deepEqual(x.ds.map((d) => d.id), ['hero', 'partner-xln']);
assert.ok(x.ds[0].arts.chunyangFist);
assert.deepEqual(Object.keys(x.ds[1].arts), ['stepFeather', 'basicSword']);
assert.equal(x.ds[1].arts.stepFeather.xp, 10);
assert.equal(x.ds[1].arts.basicSword.xp, 15);
assert.equal(x.aff[affKey('hero', 'partner-xln')], 55);
assert.equal(billDue(x, 10), false);
const h = createState(seed, { hermitage: true, partner: 'huangrong', starterArt: 'luohanHands' });
assert.deepEqual(h.ds.map((d) => d.id), ['hero', 'partner-hr']);
assert.ok(h.ds[0].arts.luohanHands);
assert.deepEqual(Object.keys(h.ds[1].arts), ['basicFist', 'xiaoyaoStep']);
x.hermitage.livedDays = 2;
const [hero, partner] = x.ds;
assert.deepEqual(checkPartnerAwakening(partner, hero, x), ['tianluoPalm']);
partner.arts.tianluoPalm.xp = 25;
assert.deepEqual(checkPartnerAwakening(partner, hero, x), ['yunvJian', 'meinvFist']);
partner.arts.yunvJian.xp = 25;
x.aff[affKey(partner.id, hero.id)] = 60;
assert.deepEqual(checkPartnerAwakening(partner, hero, x), ['yunvSword']);
partner.arts.yunvSword.xp = 25; hero.arts.quanzhenXinfa = { xp: 25 };
assert.deepEqual(checkPartnerAwakening(partner, hero, x), ['yunv']);
console.log(JSON.stringify({ seed, A: 'pass', oldActors: old.ds.length, hermitageActors: x.ds.length, xlnStage: x.hermitage.stage, billDue: billDue(x, 10) }));
