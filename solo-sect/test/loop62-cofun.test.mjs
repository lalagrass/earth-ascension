// loop62：有伴解悶（s.cofun，預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState } from '../src/sim.mjs';
test('規則預設勾選', () => assert.equal(RULES.find((r) => r[0] === 'cofun')?.[3], true));
test('開局 spec 接線', () => { assert.equal(createState(7, { kind: 'custom', answers: Array(9).fill(0), cofun: true }).cofun, true); assert.ok(!createState(7, { kind: 'custom', answers: Array(9).fill(0) }).cofun); });
