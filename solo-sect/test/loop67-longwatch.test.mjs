// loop67：哨崗久守（s.longwatch，預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/start-ui.mjs';
import { createState } from '../src/sim.mjs';
import { readFileSync } from 'node:fs';
const A = { kind: 'custom', answers: Array(9).fill(0) };
test('規則預設勾選', () => assert.equal(RULES.find((r) => r[0] === 'longwatch')?.[3], true));
test('開局 spec 接線', () => { assert.equal(createState(7, { ...A, longwatch: true }).longwatch, true); assert.ok(!createState(7, A).longwatch); });
test('示警窗只在開啟時加倍', () => assert.match(readFileSync(new URL('../src/sim.mjs', import.meta.url), 'utf8'), /WATCH_WARN \* \(s\.longwatch \? 2 : 1\)/));
