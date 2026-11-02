// loop67：哨崗久守（s.longwatch，預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../src/start-ui.mjs';
import { createState } from '../../src/sim.mjs';
import { readFileSync } from 'node:fs';
const A = { kind: 'custom', answers: Array(9).fill(0) };
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
// #390 退役：規則開關已刪（擁有人 2026-11-02），所有局都是現行規則
