// loop47：誰種誰心疼（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, cropMood } from '../../src/sim.mjs';
const mk = (on) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), ...(on ? { cropcare: true } : {}) }); return s; };
const th = (d) => d.thoughts.find((t) => t.id.startsWith('cropLost'))?.id;
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
