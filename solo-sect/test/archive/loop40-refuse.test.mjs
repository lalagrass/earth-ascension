// loop40：挑戰帖量力而為（預設勾選）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/sim.mjs';
import { jhevDaily, JHEV } from '../../src/jianghu.mjs';
import { jhevPanel } from '../../src/panel-ui.mjs';
const mk = (on) => { const s = createState(1, { kind: 'custom', answers: Array(9).fill(0), jhev: true, jhui: true, ...(on ? { jhrefuse: true } : {}) }); s.rep = 10; s.day = 200; return s; };
const force = (s) => { const P = { ...JHEV.master }, L = JHEV.letter.p; JHEV.master.p = 0; JHEV.letter.p = 1; try { jhevDaily(s); } finally { Object.assign(JHEV.master, P); JHEV.letter.p = L; } };
// #390 退役：舊規則（規則關閉）分支已刪，所有局都是現行規則
