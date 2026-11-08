// R9 #529：隱居是唯一 golden。舊道館 quick/full/saves 已退休。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { casesOf, runCase } from '../golden/scenarios.mjs';
const G = new URL('../golden/', import.meta.url);
const runs = JSON.parse(fs.readFileSync(new URL('hermitage.json', G), 'utf8')).runs;
for (const c of casesOf('hermitage')) test(`golden 隱居：${c.key}`, () => assert.deepEqual(runCase(c), runs[c.key]));
test('隱居 golden 情境表完整', () => assert.deepEqual(Object.keys(runs).sort(), casesOf('hermitage').map(c => c.key).sort()));
