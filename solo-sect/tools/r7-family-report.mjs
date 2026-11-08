#!/usr/bin/env node
// R7（#524）C：兩種雙人隱居開局 × 12 種子 × 60 日，記錄結為道侶、成親、有喜、出生的日子，以及第 60 日兩人各自的想法。受控 6 秒步長、每拍清 alert，只作 C 觀察。
// 用法：node tools/r7-family-report.mjs [solo-sect 目錄]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(process.argv[2] || path.resolve(import.meta.dirname, '..'));
const { createState, tick } = await import(pathToFileURL(path.join(root, 'src/sim.mjs')));
const { DAY } = await import(pathToFileURL(path.join(root, 'src/data.mjs')));
const openings = ['xiaolongnv', 'huangrong'], rows = [];
for (const opening of openings) for (let seed = 1001; seed <= 1012; seed++) {
  const s = createState(seed, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, hermitage: true, opening }), first = {};
  for (let elapsed = 0; elapsed < 60 * DAY; elapsed += 6) {
    tick(s, 6); if (s.alert) s.alert = null;
    const mark = (k, ok) => { if (ok && first[k] == null) first[k] = s.day; };
    mark('sweet', (s.families || []).length); mark('wed', s.gen?.couples?.length); mark('pregnant', s.ds.some((d) => d.pregnant)); mark('born', s.ds.some((d) => d.child?.born != null));
  }
  rows.push({ opening, seed, first, food: Math.round(s.res.food || 0), wishes: s.ds.filter((d) => d.childWish).map((d) => ({ id: d.id, ...d.childWish })) });
}
const count = (o, k) => rows.filter((r) => r.opening === o && r.first[k] != null).length;
const summary = Object.fromEntries(openings.map((o) => [o, Object.fromEntries(['sweet', 'wed', 'pregnant', 'born'].map((k) => [k, `${count(o, k)}/12`]))]));
console.log(JSON.stringify({ days: 60, secondsPerTick: 6, alertPolicy: 'clear after each tick', scope: 'controlled C observation', summary, rows }, null, 1));
