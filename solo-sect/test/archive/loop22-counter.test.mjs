import test from 'node:test'; import assert from 'node:assert/strict';
import { createState, tick } from '../../src/sim.mjs';
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
